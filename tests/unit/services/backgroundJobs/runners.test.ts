jest.mock('../../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../../server/src/services/backupService', () => ({
  runPostgresBackup: jest.fn(),
}));

jest.mock('../../../../server/src/services/ml/repository', () => ({
  getNetworksForBehavioralScoring: jest.fn(),
  bulkUpsertThreatScores: jest.fn(),
  getNetworksNeedingRecompute: jest.fn(),
}));

jest.mock('../../../../server/src/services/networkTagService', () => ({
  getManualThreatTags: jest.fn(),
}));

jest.mock('../../../../server/src/services/ouiGroupingService', () => ({
  generateOUIGroups: jest.fn(),
  detectMACRandomization: jest.fn(),
}));

jest.mock('../../../../server/src/services/adminDbService', () => ({
  adminQuery: jest.fn(),
}));

jest.mock('../../../../server/src/services/backgroundJobs/mlBehavioralScoring', () => ({
  scoreBehavioralThreats: jest.fn(),
}));

jest.mock('../../../../server/src/services/admin/siblingDetectionAdminService', () => ({
  runSiblingRefreshJob: jest.fn(),
}));

import {
  runBackupJob,
  runBehavioralMlScoringJob,
  runSiblingDetectionJob,
} from '../../../../server/src/services/backgroundJobs/runners';
const mockLogger = require('../../../../server/src/logging/logger');
const mockBackupService = require('../../../../server/src/services/backupService');
const mockMlScoringRepository = require('../../../../server/src/services/ml/repository');
const mockNetworkTagService = require('../../../../server/src/services/networkTagService');
const mockOUIGroupingService = require('../../../../server/src/services/ouiGroupingService');
const mockAdminDbService = require('../../../../server/src/services/adminDbService');
const mockMlBehavioralScoring = require('../../../../server/src/services/backgroundJobs/mlBehavioralScoring');
const mockSiblingDetectionAdminService = require('../../../../server/src/services/admin/siblingDetectionAdminService');

describe('runners service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runBackupJob', () => {
    it('should run backup successfully and report S3 upload', async () => {
      mockBackupService.runPostgresBackup.mockResolvedValue({
        files: [{ type: 'database', name: 'db.sql', bytes: 1000 }],
        s3: [{ type: 'database', url: 'https://s3/db.sql' }],
        fileName: 'db.sql',
        bytes: 1000,
      });

      const result = await runBackupJob();

      expect(result.fileName).toBe('db.sql');
      expect(result.s3Url).toBe('https://s3/db.sql');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Complete: db.sql (1000 bytes) uploaded to https://s3/db.sql')
      );
    });

    it('should handle backup with no files or S3 result', async () => {
      mockBackupService.runPostgresBackup.mockResolvedValue({
        files: null,
        s3: null,
      });

      const result = await runBackupJob();

      expect(result.fileName).toBeNull();
      expect(result.bytes).toBeNull();
      expect(result.s3Url).toBeNull();
    });

    it('should use first file if no database type found', async () => {
      mockBackupService.runPostgresBackup.mockResolvedValue({
        files: [{ type: 'other', name: 'other.sql', bytes: 500 }],
        s3: [{ type: 'other', url: 'https://s3/other.sql' }],
      });

      const result = await runBackupJob();

      expect(result.fileName).toBe('other.sql');
      expect(result.s3Url).toBe('https://s3/other.sql');
    });

    it('should handle S3 upload failure', async () => {
      mockBackupService.runPostgresBackup.mockResolvedValue({
        files: [{ type: 'database', name: 'db.sql', bytes: 1000 }],
        fileName: 'db.sql',
        bytes: 1000,
        s3Error: 'S3 Error',
      });

      const result = await runBackupJob();

      expect(result.s3Error).toBe('S3 Error');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Backup created locally (db.sql) but S3 upload failed: S3 Error')
      );
    });
  });

  describe('runBehavioralMlScoringJob', () => {
    it('should run ML scoring job successfully', async () => {
      const mockNetworks = [{ bssid: '11:22:33:44:55:66' }];
      const mockTags = [{ bssid: '11:22:33:44:55:66', tag: 'threat' }];
      const mockScores = [{ bssid: '11:22:33:44:55:66', score: 0.8 }];
      const mockTagMap = new Map([['11:22:33:44:55:66', 'threat']]);

      mockMlScoringRepository.getNetworksNeedingRecompute.mockResolvedValue([]);
      mockMlScoringRepository.getNetworksForBehavioralScoring.mockResolvedValue(mockNetworks);
      mockNetworkTagService.getManualThreatTags.mockResolvedValue(mockTags);
      mockMlBehavioralScoring.scoreBehavioralThreats.mockReturnValue({
        scores: mockScores,
        tagMap: mockTagMap,
      });
      mockMlScoringRepository.bulkUpsertThreatScores.mockResolvedValue(1);

      const result = await runBehavioralMlScoringJob();

      expect(result.analyzedNetworks).toBe(1);
      expect(result.insertedScores).toBe(1);
      expect(result.feedbackTaggedNetworks).toBe(1);
      expect(mockOUIGroupingService.generateOUIGroups).toHaveBeenCalled();
      expect(mockOUIGroupingService.detectMACRandomization).toHaveBeenCalled();
    });

    it('uses recompute path when pending networks exist and resets needs_recompute', async () => {
      const pendingNetworks = [{ bssid: 'AA:BB:CC:DD:EE:FF' }, { bssid: '11:22:33:44:55:66' }];
      const mockScores = pendingNetworks.map((n) => ({ bssid: n.bssid, score: 0.5 }));
      const mockTagMap = new Map<string, string>();

      mockMlScoringRepository.getNetworksNeedingRecompute.mockResolvedValue(pendingNetworks);
      mockNetworkTagService.getManualThreatTags.mockResolvedValue([]);
      mockMlBehavioralScoring.scoreBehavioralThreats.mockReturnValue({
        scores: mockScores,
        tagMap: mockTagMap,
      });
      mockMlScoringRepository.bulkUpsertThreatScores.mockResolvedValue(2);
      mockMlScoringRepository.resetNeedsRecompute = jest.fn().mockResolvedValue(undefined);

      const result = await runBehavioralMlScoringJob();

      // Should NOT call getNetworksForBehavioralScoring when recompute list is non-empty
      expect(mockMlScoringRepository.getNetworksForBehavioralScoring).not.toHaveBeenCalled();
      expect(result.analyzedNetworks).toBe(2);
      expect(mockMlScoringRepository.resetNeedsRecompute).toHaveBeenCalledWith([
        'AA:BB:CC:DD:EE:FF',
        '11:22:33:44:55:66',
      ]);
    });
  });

  describe('runSiblingDetectionJob', () => {
    it('should run sibling detection with default options', async () => {
      mockAdminDbService.adminQuery.mockResolvedValueOnce({}); // SET LOCAL
      mockSiblingDetectionAdminService.runSiblingRefreshJob.mockResolvedValue({
        rowsUpserted: 5,
        seedsProcessed: 7,
        batchesRun: 1,
        executionTimeMs: 123,
        completed: true,
      });

      const result = await runSiblingDetectionJob();

      expect(result.pairsProcessed).toBe(5);
      expect(mockSiblingDetectionAdminService.runSiblingRefreshJob).toHaveBeenCalledWith({
        batchSize: 250,
        maxOctetDelta: 6,
        maxDistanceM: 1500,
        minCandidateConf: 0.9,
        maxBatches: null,
        incremental: true,
      });
    });

    it('should run sibling detection with custom options', async () => {
      mockAdminDbService.adminQuery.mockResolvedValueOnce({}); // SET LOCAL
      mockSiblingDetectionAdminService.runSiblingRefreshJob.mockResolvedValue({
        rowsUpserted: 10,
        seedsProcessed: 12,
        batchesRun: 2,
        executionTimeMs: 456,
        completed: true,
      });

      const result = await runSiblingDetectionJob({
        max_octet_delta: 4,
        max_distance_m: 2000,
        min_candidate_conf: 0.8,
        seed_limit: 500,
        incremental: false,
      });

      expect(result.pairsProcessed).toBe(10);
      expect(mockSiblingDetectionAdminService.runSiblingRefreshJob).toHaveBeenCalledWith({
        batchSize: 500,
        maxOctetDelta: 4,
        maxDistanceM: 2000,
        minCandidateConf: 0.8,
        maxBatches: null,
        incremental: false,
      });
    });

    it('should use default values for sibling detection options', async () => {
      mockAdminDbService.adminQuery.mockResolvedValueOnce({}); // SET LOCAL
      mockSiblingDetectionAdminService.runSiblingRefreshJob.mockResolvedValue({
        rowsUpserted: 0,
        seedsProcessed: 0,
        batchesRun: 0,
        executionTimeMs: 50,
        completed: false,
      });

      await runSiblingDetectionJob({});

      expect(mockSiblingDetectionAdminService.runSiblingRefreshJob).toHaveBeenCalledWith({
        batchSize: 250,
        maxOctetDelta: 6,
        maxDistanceM: 1500,
        minCandidateConf: 0.9,
        maxBatches: null,
        incremental: true,
      });
      expect(mockAdminDbService.adminQuery).toHaveBeenCalledWith(
        "SET LOCAL statement_timeout = '30min'"
      );
    });
  });
});
