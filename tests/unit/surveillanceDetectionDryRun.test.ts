export {};

import type { SurveillanceScanDryRunResult } from '../../server/src/types/surveillanceScan';

const mockAdminQuery = jest.fn();
const mockGetEnrichedCandidates = jest.fn();
const mockBulkUpsertDetections = jest.fn();
const mockScoreSurveillanceCandidates = jest.fn();

jest.mock('../../server/src/services/adminDbService', () => ({
  adminQuery: mockAdminQuery,
}));

jest.mock('../../server/src/repositories/surveillanceDetectionRepository', () => ({
  getEnrichedCandidates: mockGetEnrichedCandidates,
  bulkUpsertDetections: mockBulkUpsertDetections,
}));

jest.mock('../../server/src/services/backgroundJobs/surveillanceScoring', () => ({
  scoreSurveillanceCandidates: mockScoreSurveillanceCandidates,
}));

const { runSurveillanceScanJob } = require('../../server/src/services/backgroundJobs/runners');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('runSurveillanceScanJob - Dry Run', () => {
  const mockCandidates = [
    { bssid: 'AA:BB:CC:DD:EE:01', ssid: 'Flock-1', device_type: 'FLOCK_SAFETY_CAMERA' },
    { bssid: 'AA:BB:CC:DD:EE:02', ssid: 'Axon-2', device_type: 'AXON_BODY_CAMERA' },
    { bssid: 'AA:BB:CC:DD:EE:03', ssid: 'Shot-3', device_type: 'SHOTSPOTTER_SENSOR' },
    { bssid: 'AA:BB:CC:DD:EE:04', ssid: 'Axon-4', device_type: 'AXON_BODY_CAMERA' },
  ];

  const mockScored = [
    {
      bssid: 'AA:BB:CC:DD:EE:01',
      device_type: 'FLOCK_SAFETY_CAMERA',
      confidence: 0.9,
      threat_score: 85,
      detection_method: 'oui_match',
      matched_signals: [],
      false_positive: false,
      fp_reason: null,
    },
    {
      bssid: 'AA:BB:CC:DD:EE:02',
      device_type: 'AXON_BODY_CAMERA',
      confidence: 0.95,
      threat_score: 90,
      detection_method: 'ssid_pattern',
      matched_signals: ['a', 'b'],
      false_positive: false,
      fp_reason: null,
    },
    {
      bssid: 'AA:BB:CC:DD:EE:03',
      device_type: 'SHOTSPOTTER_SENSOR',
      confidence: 0.85,
      threat_score: 80,
      detection_method: 'ssid_pattern',
      matched_signals: [],
      false_positive: false,
      fp_reason: null,
    },
    {
      bssid: 'AA:BB:CC:DD:EE:04',
      device_type: 'AXON_BODY_CAMERA',
      confidence: 0.8,
      threat_score: 75,
      detection_method: 'ssid_pattern',
      matched_signals: [],
      false_positive: false,
      fp_reason: null,
    },
  ];

  describe('Write safety', () => {
    test('dry-run does not call bulkUpsertDetections', async () => {
      mockGetEnrichedCandidates.mockResolvedValue(mockCandidates);
      mockScoreSurveillanceCandidates.mockReturnValue(mockScored);
      mockAdminQuery.mockResolvedValue({ rows: [] });

      await runSurveillanceScanJob({ dryRun: true });

      expect(mockBulkUpsertDetections).not.toHaveBeenCalled();
    });

    test('dry-run does not write network_tags', async () => {
      mockGetEnrichedCandidates.mockResolvedValue(mockCandidates);
      mockScoreSurveillanceCandidates.mockReturnValue(mockScored);
      mockAdminQuery.mockResolvedValue({ rows: [] });

      await runSurveillanceScanJob({ dryRun: true });

      const tagCalls = mockAdminQuery.mock.calls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('network_tags')
      );
      expect(tagCalls).toHaveLength(0);
    });

    test('dry-run does not call any MV refresh function', async () => {
      mockGetEnrichedCandidates.mockResolvedValue(mockCandidates);
      mockScoreSurveillanceCandidates.mockReturnValue(mockScored);
      mockAdminQuery.mockResolvedValue({ rows: [] });

      await runSurveillanceScanJob({ dryRun: true });

      const mvCalls = mockAdminQuery.mock.calls.filter(
        (call: any[]) =>
          typeof call[0] === 'string' && call[0].includes('surveillance_density_zones')
      );
      expect(mvCalls).toHaveLength(0);
    });
  });

  describe('Categorization', () => {
    test('candidate with no existing row -> action = insert', async () => {
      mockGetEnrichedCandidates.mockResolvedValue([mockCandidates[0]]);
      mockScoreSurveillanceCandidates.mockReturnValue([mockScored[0]]);
      mockAdminQuery.mockResolvedValue({ rows: [] });

      const result = (await runSurveillanceScanJob({
        dryRun: true,
      })) as SurveillanceScanDryRunResult;

      expect(result.summary.insert).toBe(1);
      expect(result.samples[0].action).toBe('insert');
    });

    test('candidate with identical existing row (all 5 fields match) -> unchanged', async () => {
      mockGetEnrichedCandidates.mockResolvedValue([mockCandidates[1]]);
      mockScoreSurveillanceCandidates.mockReturnValue([mockScored[1]]);
      mockAdminQuery.mockResolvedValue({
        rows: [
          {
            bssid: 'AA:BB:CC:DD:EE:02',
            device_type: 'AXON_BODY_CAMERA',
            confidence: '0.95',
            threat_score: '90.0',
            detection_method: 'ssid_pattern',
            matched_signals: ['a', 'b'],
            false_positive: false,
          },
        ],
      });

      const result = (await runSurveillanceScanJob({
        dryRun: true,
      })) as SurveillanceScanDryRunResult;

      expect(result.summary.unchanged).toBe(1);
      expect(result.samples[0].action).toBe('unchanged');
    });

    test('candidate where threat_score differs -> action = update', async () => {
      mockGetEnrichedCandidates.mockResolvedValue([mockCandidates[1]]);
      mockScoreSurveillanceCandidates.mockReturnValue([mockScored[1]]);
      mockAdminQuery.mockResolvedValue({
        rows: [
          {
            bssid: 'AA:BB:CC:DD:EE:02',
            device_type: 'AXON_BODY_CAMERA',
            confidence: '0.95',
            threat_score: '85.0', // Differs
            detection_method: 'ssid_pattern',
            matched_signals: ['a', 'b'],
            false_positive: false,
          },
        ],
      });

      const result = (await runSurveillanceScanJob({
        dryRun: true,
      })) as SurveillanceScanDryRunResult;

      expect(result.summary.update).toBe(1);
      expect(result.samples[0].action).toBe('update');
    });

    test('candidate where matched_signals differ (same elements, different order) -> unchanged', async () => {
      mockGetEnrichedCandidates.mockResolvedValue([mockCandidates[1]]);
      mockScoreSurveillanceCandidates.mockReturnValue([mockScored[1]]);
      mockAdminQuery.mockResolvedValue({
        rows: [
          {
            bssid: 'AA:BB:CC:DD:EE:02',
            device_type: 'AXON_BODY_CAMERA',
            confidence: '0.95',
            threat_score: '90.0',
            detection_method: 'ssid_pattern',
            matched_signals: ['b', 'a'], // Same elements, different order
            false_positive: false,
          },
        ],
      });

      const result = (await runSurveillanceScanJob({
        dryRun: true,
      })) as SurveillanceScanDryRunResult;

      expect(result.summary.unchanged).toBe(1);
      expect(result.samples[0].action).toBe('unchanged');
    });

    test('candidate where existing.false_positive = true -> skip_false_positive even when fields differ', async () => {
      mockGetEnrichedCandidates.mockResolvedValue([mockCandidates[1]]);
      mockScoreSurveillanceCandidates.mockReturnValue([mockScored[1]]);
      mockAdminQuery.mockResolvedValue({
        rows: [
          {
            bssid: 'AA:BB:CC:DD:EE:02',
            device_type: 'AXON_BODY_CAMERA',
            confidence: '0.80', // Differs
            threat_score: '75.0', // Differs
            detection_method: 'oui_match', // Differs
            matched_signals: [], // Differs
            false_positive: true, // marked true
          },
        ],
      });

      const result = (await runSurveillanceScanJob({
        dryRun: true,
      })) as SurveillanceScanDryRunResult;

      expect(result.summary.skip_false_positive).toBe(1);
      expect(result.samples[0].action).toBe('skip_false_positive');
    });

    test('real (non-dry) run path is unchanged: bulkUpsertDetections IS called', async () => {
      mockGetEnrichedCandidates.mockResolvedValue(mockCandidates);
      mockScoreSurveillanceCandidates.mockReturnValue(mockScored);
      mockBulkUpsertDetections.mockResolvedValue(4);
      mockAdminQuery.mockResolvedValue({ rowCount: 4 });

      const result = await runSurveillanceScanJob();

      expect(mockBulkUpsertDetections).toHaveBeenCalled();
      expect(result).toEqual({
        detectionCount: 4,
        taggedCount: 4,
        falsePositiveCount: 0,
      });
    });
  });

  describe('Aggregation & Sample Capping', () => {
    test('summary counts reflect correct totals across all candidates, byDeviceType buckets correctly', async () => {
      mockGetEnrichedCandidates.mockResolvedValue(mockCandidates);
      mockScoreSurveillanceCandidates.mockReturnValue(mockScored);
      mockAdminQuery.mockResolvedValue({
        rows: [
          {
            bssid: 'AA:BB:CC:DD:EE:02',
            device_type: 'AXON_BODY_CAMERA',
            confidence: '0.95',
            threat_score: '90.0',
            detection_method: 'ssid_pattern',
            matched_signals: ['b', 'a'],
            false_positive: false,
          },
        ],
      });

      const result = (await runSurveillanceScanJob({
        dryRun: true,
      })) as SurveillanceScanDryRunResult;

      expect(result.summary).toEqual({
        insert: 3, // EE:01, EE:03, EE:04
        update: 0,
        unchanged: 1, // EE:02
        skip_false_positive: 0,
      });

      expect(result.byDeviceType.FLOCK_SAFETY_CAMERA).toEqual({
        insert: 1,
        update: 0,
        unchanged: 0,
        skip_false_positive: 0,
      });
      expect(result.byDeviceType.AXON_BODY_CAMERA).toEqual({
        insert: 1,
        update: 0,
        unchanged: 1,
        skip_false_positive: 0,
      });
    });

    test('sample capping behaves correctly when scored candidates > sampleLimit', async () => {
      mockGetEnrichedCandidates.mockResolvedValue(mockCandidates);
      mockScoreSurveillanceCandidates.mockReturnValue(mockScored);
      mockAdminQuery.mockResolvedValue({ rows: [] });

      const result = (await runSurveillanceScanJob({
        dryRun: true,
        sampleLimit: 2,
      })) as SurveillanceScanDryRunResult;

      expect(result.candidateCount).toBe(4);
      expect(result.samples).toHaveLength(2);
      expect(result.summary.insert).toBe(4); // Reflects all candidates (N = 4)
    });
  });
});
