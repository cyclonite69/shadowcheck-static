import { jest } from '@jest/globals';

// Create the mock before any imports
const mockSecretsManager = {
  get: jest.fn(),
};

jest.mock(
  '../../server/src/config/container',
  () => ({
    secretsManager: mockSecretsManager,
  }),
  { virtual: true }
);

jest.mock('../../server/src/logging/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../server/src/repositories/wigleEnrichmentRepository', () => ({
  getPendingEnrichmentCount: jest.fn(),
  getEnrichmentCatalog: jest.fn(),
  getNextEnrichmentBatch: jest.fn(),
  getActiveEnrichmentRunId: jest.fn(),
  setRunTotalItems: jest.fn(),
  incrementRunProgress: jest.fn(),
  getRunStatus: jest.fn(),
  resetRunForResume: jest.fn(),
  forceClearRun: jest.fn(),
  refreshWigleNetworksMv: jest.fn(),
}));

jest.mock('../../server/src/services/wigleImport/runRepository', () => ({
  createImportRun: jest.fn(),
  getImportRun: jest.fn(),
  markRunControlStatus: jest.fn(),
  markRunFailure: jest.fn(),
  completeRun: jest.fn(),
}));

jest.mock('../../server/src/services/wigleEnrichmentFetcher', () => ({
  fetchAndImportDetail: jest.fn(),
}));

jest.mock('../../server/src/services/wigleRequestLedger', () => ({
  assertCanRequest: jest.fn(),
}));

jest.mock('../../server/src/services/wigle/wigleGateway', () => ({
  wigleGatewayFetch: jest.fn(),
}));

jest.mock('../../server/src/services/wigleRequestUtils', () => ({
  getEncodedWigleAuth: jest.fn(() => 'encoded-auth'),
}));

import {
  runEnrichmentLoop,
  startBatchEnrichment,
  validateWigleApiCredit,
} from '../../server/src/services/wigleEnrichmentService';
import logger from '../../server/src/logging/logger';
import * as repo from '../../server/src/repositories/wigleEnrichmentRepository';
import * as runRepo from '../../server/src/services/wigleImport/runRepository';
import { fetchAndImportDetail } from '../../server/src/services/wigleEnrichmentFetcher';
import { wigleGatewayFetch } from '../../server/src/services/wigle/wigleGateway';

describe('WiGLE Enrichment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runEnrichmentLoop', () => {
    const runId = 123;

    it('should return early if run is already completed', async () => {
      (runRepo.getImportRun as jest.Mock<any>).mockResolvedValue({
        id: runId,
        status: 'completed',
      });
      await runEnrichmentLoop(runId);
      expect(repo.getNextEnrichmentBatch).not.toHaveBeenCalled();
    });

    it('should mark manual run as failed if no matching networks are found initially', async () => {
      (runRepo.getImportRun as jest.Mock<any>).mockResolvedValue({ id: runId, status: 'running' });
      (repo.getRunStatus as jest.Mock<any>).mockResolvedValue('running');
      (repo.getNextEnrichmentBatch as jest.Mock<any>).mockResolvedValue([]);

      const manualList = ['AA:BB:CC:DD:EE:FF'];
      await runEnrichmentLoop(runId, manualList);

      expect(runRepo.markRunFailure).toHaveBeenCalledWith(
        runId,
        'No matching networks found in catalog for provided BSSIDs'
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Manual run #123 failed: No matching networks found')
      );
    });

    it('should complete run if batch is empty and it is not a fresh manual run', async () => {
      (runRepo.getImportRun as jest.Mock<any>).mockResolvedValue({ status: 'running' });
      (repo.getRunStatus as jest.Mock<any>).mockResolvedValue('running');
      (repo.getNextEnrichmentBatch as jest.Mock<any>).mockResolvedValue([]);

      await runEnrichmentLoop(runId);

      expect(runRepo.completeRun).toHaveBeenCalledWith(runId);
      expect(repo.refreshWigleNetworksMv).toHaveBeenCalled();
    });

    it('should process items in batch and increment progress', async () => {
      (runRepo.getImportRun as jest.Mock<any>).mockResolvedValue({ status: 'running' });
      (repo.getRunStatus as jest.Mock<any>)
        .mockResolvedValueOnce('running')
        .mockResolvedValueOnce('running')
        .mockResolvedValueOnce('paused');

      (repo.getNextEnrichmentBatch as jest.Mock<any>).mockResolvedValueOnce([
        { bssid: 'AA:BB:CC:DD:EE:FF', type: 'W' },
      ]);

      (fetchAndImportDetail as jest.Mock<any>).mockResolvedValue({
        bssid: 'AA:BB:CC:DD:EE:FF',
        obsCount: 10,
      });

      await runEnrichmentLoop(runId);

      expect(fetchAndImportDetail).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF', 'W');
      expect(repo.incrementRunProgress).toHaveBeenCalledWith(runId);
    });

    it('should pause run if WiGLE rate limit is reached (429)', async () => {
      (runRepo.getImportRun as jest.Mock<any>).mockResolvedValue({ status: 'running' });
      (repo.getRunStatus as jest.Mock<any>).mockResolvedValue('running');
      (repo.getNextEnrichmentBatch as jest.Mock<any>).mockResolvedValue([
        { bssid: 'B1', type: 'W' },
      ]);

      const error = new Error('Too Many Requests');
      (error as any).status = 429;
      (fetchAndImportDetail as jest.Mock<any>).mockRejectedValue(error);

      await runEnrichmentLoop(runId);

      expect(runRepo.markRunControlStatus).toHaveBeenCalledWith(runId, 'paused');
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('WiGLE blocked/throttled'));
    });

    it('should abort run after multiple consecutive failures', async () => {
      (runRepo.getImportRun as jest.Mock<any>).mockResolvedValue({ status: 'running' });
      (repo.getRunStatus as jest.Mock<any>).mockResolvedValue('running');

      const batch = Array.from({ length: 6 }, (_, i) => ({ bssid: `B${i}`, type: 'W' }));
      (repo.getNextEnrichmentBatch as jest.Mock<any>).mockResolvedValue(batch);

      (fetchAndImportDetail as jest.Mock<any>).mockRejectedValue(new Error('API Error'));

      await runEnrichmentLoop(runId);

      expect(runRepo.markRunFailure).toHaveBeenCalledWith(
        runId,
        expect.stringContaining('5 consecutive failures')
      );
    });
  });

  describe('startBatchEnrichment', () => {
    it('should throw if no pending items found', async () => {
      (repo.getPendingEnrichmentCount as jest.Mock<any>).mockResolvedValue(0);
      await expect(startBatchEnrichment()).rejects.toThrow('No networks found in v2 catalog');
    });

    it('should throw if another enrichment run is active', async () => {
      (repo.getPendingEnrichmentCount as jest.Mock<any>).mockResolvedValue(10);
      (repo.getActiveEnrichmentRunId as jest.Mock<any>).mockResolvedValue(999);

      await expect(startBatchEnrichment()).rejects.toMatchObject({ status: 409 });
    });

    it('should throw if concurrent run is active', async () => {
      (repo.getPendingEnrichmentCount as jest.Mock<any>).mockResolvedValue(5);
      (repo.getActiveEnrichmentRunId as jest.Mock<any>).mockResolvedValue(1);
      await expect(startBatchEnrichment()).rejects.toThrow(/already active/);
    });

    it('should handle manual bssid list correctly', async () => {
      const bssids = ['AA:BB:CC:DD:EE:FF'];
      (repo.getActiveEnrichmentRunId as jest.Mock<any>).mockResolvedValue(null);
      (runRepo.createImportRun as jest.Mock<any>).mockResolvedValue({ id: 99 });

      const result = await startBatchEnrichment(bssids);
      expect(result.id).toBe(99);
      expect(runRepo.createImportRun).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'v3_manual' }),
        expect.anything()
      );
    });
  });

  describe('validateWigleApiCredit', () => {
    it('should handle API errors gracefully', async () => {
      mockSecretsManager.get.mockReturnValue('valid');
      (wigleGatewayFetch as jest.Mock<any>).mockResolvedValue({
        ok: false,
        status: 500,
        error: 'Server error',
      });

      const result = await validateWigleApiCredit();
      expect(result.hasCredit).toBe(true); // Should proceed on check failure
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
