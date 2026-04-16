import request from 'supertest';
import express from 'express';

jest.mock('../../server/src/config/container', () => ({
  wigleService: {
    importWigleV2SearchResult: jest.fn(),
  },
  wigleImportRunService: {
    validateImportQuery: jest.fn(),
    resumeImportRun: jest.fn(),
    resumeLatestImportRun: jest.fn(),
    startImportRun: jest.fn(),
    listImportRuns: jest.fn(),
    getImportCompletenessReport: jest.fn(),
    getImportRun: jest.fn(),
    getLatestResumableImportRun: jest.fn(),
    pauseImportRun: jest.fn(),
    cancelImportRun: jest.fn(),
    bulkDeleteGlobalCancelledCluster: jest.fn(),
  },
}));

jest.mock('../../server/src/services/secretsManager', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock('../../server/src/logging/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../server/src/middleware/authMiddleware', () => ({
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

jest.mock('../../server/src/services/externalServiceHandler', () => ({
  withRetry: jest.fn(async (fn) => fn()),
}));

jest.mock('../../server/src/services/wigleImport/params', () => ({
  buildSearchParams: jest.fn(() => ({ toString: () => 'test=1' })),
  validateImportQuery: jest.fn(() => null),
  DEFAULT_RESULTS_PER_PAGE: 100,
}));

jest.mock('../../server/src/config/database', () => ({
  query: jest.fn(),
}));

const { wigleService, wigleImportRunService } = require('../../server/src/config/container');
import secretsManager from '../../server/src/services/secretsManager';
import {
  validateImportQuery as validateSearchQuery,
  buildSearchParams,
} from '../../server/src/services/wigleImport/params';
import { withRetry } from '../../server/src/services/externalServiceHandler';
const db = require('../../server/src/config/database');

const wigleSearchRouter = require('../../server/src/api/routes/v1/wigle/search').default;

const app = express();
app.use(express.json());
app.use('/api', wigleSearchRouter);
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message });
});

describe('wigleSearch routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    (buildSearchParams as jest.Mock).mockReturnValue({ toString: () => 'test=1' });
    (withRetry as jest.Mock).mockImplementation(async (fn) => fn());
  });

  describe('ALL /api/search-api', () => {
    it('should reject invalid methods', async () => {
      const res = await request(app).put('/api/search-api');
      expect(res.status).toBe(405);
    });

    it('should reject if no credentials', async () => {
      (secretsManager.get as jest.Mock).mockReturnValue(null);
      const res = await request(app).get('/api/search-api');
      expect(res.status).toBe(503);
    });

    it('should reject if validation fails', async () => {
      (secretsManager.get as jest.Mock).mockReturnValue('token');
      (validateSearchQuery as jest.Mock).mockReturnValueOnce('Invalid query');
      const res = await request(app).get('/api/search-api');
      expect(res.status).toBe(400);
    });

    it('should search v2 and import', async () => {
      (secretsManager.get as jest.Mock).mockReturnValue('token');
      (validateSearchQuery as jest.Mock).mockReturnValue(null);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, totalResults: 1, results: [{ netid: '123' }] }),
      });
      wigleService.importWigleV2SearchResult.mockResolvedValueOnce(1);

      const res = await request(app).post('/api/search-api').send({ import: true });
      if (res.status !== 200) console.log(res.body);
      expect(res.status).toBe(200);
      expect(res.body.importedCount).toBe(1);
    });

    it('should search v3 and return results', async () => {
      (secretsManager.get as jest.Mock).mockReturnValue('token');
      (validateSearchQuery as jest.Mock).mockReturnValue(null);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            totalResults: 1,
            search_after: 'cursor',
            results: [{ netid: '123' }],
          }),
      });

      const res = await request(app).get('/api/search-api?version=v3');
      expect(res.status).toBe(200);
      expect(res.body.search_after).toBe('cursor');
    });

    it('should handle fetch non-ok response', async () => {
      (secretsManager.get as jest.Mock).mockReturnValue('token');
      (validateSearchQuery as jest.Mock).mockReturnValue(null);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      });

      const res = await request(app).get('/api/search-api');
      expect(res.status).toBe(404);
    });

    it('should handle import errors', async () => {
      (secretsManager.get as jest.Mock).mockReturnValue('token');
      (validateSearchQuery as jest.Mock).mockReturnValue(null);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, totalResults: 1, results: [{ netid: '123' }] }),
      });
      wigleService.importWigleV2SearchResult.mockRejectedValueOnce(new Error('Import failed'));

      const res = await request(app).get('/api/search-api?import=true');
      expect(res.status).toBe(200);
      expect(res.body.importErrors.length).toBe(1);
    });
  });

  describe('POST /api/search-api/import-all', () => {
    it('should validate query', async () => {
      wigleImportRunService.validateImportQuery.mockReturnValueOnce('Error');
      const res = await request(app).post('/api/search-api/import-all');
      expect(res.status).toBe(400);
    });

    it('should start import run', async () => {
      wigleImportRunService.validateImportQuery.mockReturnValueOnce(null);
      wigleImportRunService.startImportRun.mockResolvedValueOnce({ apiTotalResults: 10 });
      const res = await request(app).post('/api/search-api/import-all').send({});
      expect(res.status).toBe(200);
    });

    it('should resume import run by id', async () => {
      wigleImportRunService.validateImportQuery.mockReturnValueOnce(null);
      wigleImportRunService.resumeImportRun.mockResolvedValueOnce({ apiTotalResults: 10 });
      const res = await request(app).post('/api/search-api/import-all').send({ runId: 1 });
      expect(res.status).toBe(200);
    });

    it('should resume latest import run', async () => {
      wigleImportRunService.validateImportQuery.mockReturnValueOnce(null);
      wigleImportRunService.resumeLatestImportRun.mockResolvedValueOnce({ apiTotalResults: 10 });
      const res = await request(app)
        .post('/api/search-api/import-all')
        .send({ resumeLatest: true });
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/search-api/import-runs', () => {
    it('should list import runs', async () => {
      wigleImportRunService.listImportRuns.mockResolvedValueOnce([]);
      const res = await request(app).get('/api/search-api/import-runs');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/search-api/import-runs/completeness/summary', () => {
    it('should get report', async () => {
      wigleImportRunService.getImportCompletenessReport.mockResolvedValueOnce({});
      const res = await request(app).get('/api/search-api/import-runs/completeness/summary');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/search-api/import-runs/:id', () => {
    it('should reject invalid id', async () => {
      const res = await request(app).get('/api/search-api/import-runs/abc');
      expect(res.status).toBe(400);
    });

    it('should get import run', async () => {
      wigleImportRunService.getImportRun.mockResolvedValueOnce({});
      const res = await request(app).get('/api/search-api/import-runs/1');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/search-api/import-runs/resume-latest', () => {
    it('should resume latest', async () => {
      wigleImportRunService.validateImportQuery.mockReturnValueOnce(null);
      wigleImportRunService.resumeLatestImportRun.mockResolvedValueOnce({});
      const res = await request(app).post('/api/search-api/import-runs/resume-latest');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/search-api/import-runs/resumable/latest', () => {
    it('should get latest resumable', async () => {
      wigleImportRunService.validateImportQuery.mockReturnValueOnce(null);
      wigleImportRunService.getLatestResumableImportRun.mockResolvedValueOnce({});
      const res = await request(app).get('/api/search-api/import-runs/resumable/latest');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/search-api/import-runs/:id/resume', () => {
    it('should resume run', async () => {
      wigleImportRunService.resumeImportRun.mockResolvedValueOnce({});
      const res = await request(app).post('/api/search-api/import-runs/1/resume');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/search-api/import-runs/:id/pause', () => {
    it('should pause run', async () => {
      wigleImportRunService.pauseImportRun.mockResolvedValueOnce({});
      const res = await request(app).post('/api/search-api/import-runs/1/pause');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/search-api/import-runs/:id/cancel', () => {
    it('should cancel run', async () => {
      wigleImportRunService.cancelImportRun.mockResolvedValueOnce({});
      const res = await request(app).post('/api/search-api/import-runs/1/cancel');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/search-api/saved-ssid-terms', () => {
    it('should get saved terms', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/search-api/saved-ssid-terms');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/search-api/saved-ssid-terms', () => {
    it('should reject invalid term', async () => {
      const res = await request(app).post('/api/search-api/saved-ssid-terms').send({ term: 'us' });
      expect(res.status).toBe(400);
    });

    it('should save term', async () => {
      db.query.mockResolvedValueOnce({ rows: [{ term: 'test' }] });
      const res = await request(app)
        .post('/api/search-api/saved-ssid-terms')
        .send({ term: 'test' });
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/search-api/saved-ssid-terms/:id', () => {
    it('should reject invalid id', async () => {
      const res = await request(app).delete('/api/search-api/saved-ssid-terms/abc');
      expect(res.status).toBe(400);
    });

    it('should reject if not found', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 0 });
      const res = await request(app).delete('/api/search-api/saved-ssid-terms/1');
      expect(res.status).toBe(404);
    });

    it('should delete term', async () => {
      db.query.mockResolvedValueOnce({ rowCount: 1 });
      const res = await request(app).delete('/api/search-api/saved-ssid-terms/1');
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/search-api/import-runs/cluster-cleanup', () => {
    it('should require confirm flag', async () => {
      const res = await request(app).delete('/api/search-api/import-runs/cluster-cleanup');
      expect(res.status).toBe(400);
    });

    it('should cleanup cluster', async () => {
      wigleImportRunService.bulkDeleteGlobalCancelledCluster.mockResolvedValueOnce(5);
      const res = await request(app)
        .delete('/api/search-api/import-runs/cluster-cleanup')
        .send({ confirm: true });
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(5);
    });
  });
});
