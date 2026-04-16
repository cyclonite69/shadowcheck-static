import {
  getPendingEnrichmentCount,
  getEnrichmentCatalog,
  startBatchEnrichment,
  resumeEnrichment,
  validateWigleApiCredit,
} from '../../../server/src/services/wigleEnrichmentService';
import { adminQuery } from '../../../server/src/services/adminDbService';
import * as wigleService from '../../../server/src/services/wigleService';
import secretsManager from '../../../server/src/services/secretsManager';
import { withRetry } from '../../../server/src/services/externalServiceHandler';
import * as runRepo from '../../../server/src/services/wigleImport/runRepository';

jest.mock('../../../server/src/services/adminDbService', () => ({
  adminQuery: jest.fn(),
}));

jest.mock('../../../server/src/services/wigleService');
jest.mock('../../../server/src/services/secretsManager');
jest.mock('../../../server/src/services/externalServiceHandler');
jest.mock('../../../server/src/services/wigleImport/runRepository');
jest.mock('../../../server/src/logging/logger');

describe('wigleEnrichmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    global.fetch = jest.fn();
    // @ts-ignore
    global.setTimeout = jest.fn((cb) => cb());
  });

  describe('getPendingEnrichmentCount', () => {
    it('should return count from database', async () => {
      (adminQuery as jest.Mock).mockResolvedValue({ rows: [{ count: 10 }] });
      const result = await getPendingEnrichmentCount();
      expect(result).toBe(10);
      expect(adminQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT COUNT'));
    });

    it('should return 0 if no results', async () => {
      (adminQuery as jest.Mock).mockResolvedValue({ rows: [] });
      const result = await getPendingEnrichmentCount();
      expect(result).toBe(0);
    });
  });

  describe('getEnrichmentCatalog', () => {
    it('should return data and total', async () => {
      (adminQuery as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ bssid: '1' }] }) // data
        .mockResolvedValueOnce({ rows: [{ count: 100 }] }); // count

      const result = await getEnrichmentCatalog({ page: 1, limit: 10 });
      expect(result.data).toEqual([{ bssid: '1' }]);
      expect(result.total).toBe(100);
      expect(adminQuery).toHaveBeenCalledTimes(2);
    });

    it('should handle filters', async () => {
      (adminQuery as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: 0 }] });

      await getEnrichmentCatalog({
        region: 'US',
        city: 'NYC',
        ssid: 'Test',
        bssid: 'AA:',
      });
      
      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['US%', 'NYC%', '%Test%', 'AA:%'])
      );
    });
  });

  describe('validateWigleApiCredit', () => {
    it('should return hasCredit: false if credentials missing', async () => {
      (secretsManager.get as jest.Mock).mockReturnValue(undefined);
      const result = await validateWigleApiCredit();
      expect(result.hasCredit).toBe(false);
      expect(result.message).toContain('not configured');
    });

    it('should return hasCredit: true if enough credit', async () => {
      (secretsManager.get as jest.Mock).mockReturnValue('mock');
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue({ estimatedApiQuotaRemaining: 100 }),
      });

      const result = await validateWigleApiCredit();
      expect(result.hasCredit).toBe(true);
      expect(result.message).toContain('100 requests available');
    });

    it('should return hasCredit: false if no credit', async () => {
      (secretsManager.get as jest.Mock).mockReturnValue('mock');
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        json: jest.fn().mockResolvedValue({ estimatedApiQuotaRemaining: 0 }),
      });

      const result = await validateWigleApiCredit();
      expect(result.hasCredit).toBe(false);
      expect(result.message).toContain('No API credit remaining');
    });

    it('should handle 401 Unauthorized', async () => {
      (secretsManager.get as jest.Mock).mockReturnValue('mock');
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 401,
      });

      const result = await validateWigleApiCredit();
      expect(result.hasCredit).toBe(false);
      expect(result.message).toContain('Invalid WiGLE API key');
    });

    it('should fail open on other errors', async () => {
      (secretsManager.get as jest.Mock).mockReturnValue('mock');
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await validateWigleApiCredit();
      expect(result.hasCredit).toBe(true);
      expect(result.message).toContain('Credit check unavailable');
    });
  });

  describe('startBatchEnrichment', () => {
    it('should throw if no pending items', async () => {
      (adminQuery as jest.Mock).mockResolvedValue({ rows: [{ count: 0 }] });
      await expect(startBatchEnrichment()).rejects.toThrow('No networks found in v2 catalog');
    });

    it('should create a run and start loop', async () => {
      (adminQuery as jest.Mock).mockResolvedValue({ rows: [{ count: 5 }] });
      (runRepo.createImportRun as jest.Mock).mockResolvedValue({ id: 123 });
      (runRepo.getImportRun as jest.Mock).mockResolvedValue({ id: 123, status: 'running' });
      
      const result = await startBatchEnrichment();
      
      expect(result.id).toBe(123);
      expect(runRepo.createImportRun).toHaveBeenCalled();
      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE app.wigle_import_runs SET api_total_results'),
        [5, 123]
      );
    });

    it('should handle manual BSSIDs', async () => {
      (runRepo.createImportRun as jest.Mock).mockResolvedValue({ id: 123 });
      (runRepo.getImportRun as jest.Mock).mockResolvedValue({ id: 123, status: 'running' });
      
      const result = await startBatchEnrichment(['AA:BB:CC']);
      
      expect(result.id).toBe(123);
      expect(runRepo.createImportRun).toHaveBeenCalledWith(expect.objectContaining({
        source: 'v3_manual'
      }));
    });
  });

  describe('resumeEnrichment', () => {
    it('should update run status and start loop', async () => {
      (adminQuery as jest.Mock).mockResolvedValue({ rows: [{ id: 123, status: 'running' }] });
      (runRepo.getImportRun as jest.Mock).mockResolvedValue({ id: 123, status: 'running' });
      
      const result = await resumeEnrichment(123);
      expect(result.status).toBe('running');
      expect(adminQuery).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE app.wigle_import_runs SET status = 'running'"),
        [123]
      );
    });

    it('should throw if run not found', async () => {
      (adminQuery as jest.Mock).mockResolvedValue({ rows: [] });
      await expect(resumeEnrichment(123)).rejects.toThrow('Run not found');
    });
  });

  describe('Internal logic via startBatchEnrichment', () => {
    it('should execute the loop and process items', async () => {
      // Mock for startBatchEnrichment
      (adminQuery as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: 1 }] }) // pending count
        .mockResolvedValueOnce({ rows: [] }) // UPDATE api_total_results
        .mockResolvedValueOnce({ rows: [{ status: 'running' }] }) // Re-fetch status in loop
        .mockResolvedValueOnce({ rows: [{ bssid: 'AA:BB:CC', type: 'W' }] }) // getNextEnrichmentBatch (global)
        .mockResolvedValueOnce({ rows: [] }) // UPDATE rows_inserted
        .mockResolvedValueOnce({ rows: [{ status: 'running' }] }) // Re-fetch status in loop (2nd pass)
        .mockResolvedValueOnce({ rows: [] }); // getNextEnrichmentBatch (global) - empty to break loop

      (runRepo.createImportRun as jest.Mock).mockResolvedValue({ id: 123 });
      (runRepo.getImportRun as jest.Mock).mockResolvedValue({ id: 123, status: 'running' });

      // Mock for fetchAndImportDetail
      (secretsManager.get as jest.Mock).mockReturnValue('mock');
      (withRetry as jest.Mock).mockImplementation((fn) => fn());
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          networkId: 'AA:BB:CC',
          locationClusters: [{ locations: [{ lat: 1 }] }]
        }),
      });

      await startBatchEnrichment();

      // Wait for background loop to finish (since I mocked setTimeout to call immediately and nextTick)
      await new Promise(resolve => process.nextTick(resolve));
      await new Promise(resolve => process.nextTick(resolve));

      expect(wigleService.importWigleV3NetworkDetail).toHaveBeenCalled();
      expect(wigleService.importWigleV3Observation).toHaveBeenCalled();
      expect(runRepo.completeRun).toHaveBeenCalledWith(123);
    });

    it('should handle API errors in loop', async () => {
      (adminQuery as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: 1 }] }) // pending count
        .mockResolvedValueOnce({ rows: [] }) // UPDATE api_total_results
        .mockResolvedValueOnce({ rows: [{ status: 'running' }] }) // Re-fetch status in loop
        .mockResolvedValueOnce({ rows: [{ bssid: 'AA:BB:CC', type: 'W' }] }) // getNextEnrichmentBatch
        .mockResolvedValueOnce({ rows: [{ status: 'running' }] }) // Re-fetch status in loop (2nd pass)
        .mockResolvedValueOnce({ rows: [] }); // getNextEnrichmentBatch - empty

      (runRepo.createImportRun as jest.Mock).mockResolvedValue({ id: 123 });
      (runRepo.getImportRun as jest.Mock).mockResolvedValue({ id: 123, status: 'running' });

      (secretsManager.get as jest.Mock).mockReturnValue('mock');
      (withRetry as jest.Mock).mockImplementation((fn) => fn());
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Server Error'),
      });

      await startBatchEnrichment();
      await new Promise(resolve => process.nextTick(resolve));

      // Should have logged error but continued (or in this case finished because next batch is empty)
      expect(runRepo.completeRun).toHaveBeenCalledWith(123);
    });

    it('should pause on 429 Rate Limit', async () => {
      (adminQuery as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: 1 }] }) // pending count
        .mockResolvedValueOnce({ rows: [] }) // UPDATE
        .mockResolvedValueOnce({ rows: [{ status: 'running' }] }) // Re-fetch
        .mockResolvedValueOnce({ rows: [{ bssid: 'AA:BB:CC', type: 'W' }] }); // getNext

      (runRepo.createImportRun as jest.Mock).mockResolvedValue({ id: 123 });
      (runRepo.getImportRun as jest.Mock).mockResolvedValue({ id: 123, status: 'running' });

      (secretsManager.get as jest.Mock).mockReturnValue('mock');
      (withRetry as jest.Mock).mockImplementation((fn) => fn());
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('Too Many Requests'),
      });

      await startBatchEnrichment();
      await new Promise(resolve => process.nextTick(resolve));

      expect(runRepo.markRunControlStatus).toHaveBeenCalledWith(123, 'paused');
    });
  });
});
