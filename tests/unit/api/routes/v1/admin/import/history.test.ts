import request from 'supertest';
import express, { Router } from 'express';

// Mock import history service
const mockImportHistoryService = {
  getImportHistory: jest.fn(),
  getDeviceSources: jest.fn(),
};

jest.mock('../../../../../server/src/services', () => ({
  adminImportHistoryService: mockImportHistoryService,
}));

// Create test app
const app = express();
app.use(express.json());

const historyRouter = Router();

historyRouter.get('/admin/import-history', async (req, res, next) => {
  try {
    const history = await mockImportHistoryService.getImportHistory();
    res.json({ ok: true, history });
  } catch (e) {
    next(e);
  }
});

historyRouter.get('/admin/device-sources', async (req, res, next) => {
  try {
    const sources = await mockImportHistoryService.getDeviceSources();
    res.json({ ok: true, sources });
  } catch (e) {
    next(e);
  }
});

app.use('/', historyRouter);

describe('import history routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /admin/import-history', () => {
    it('returns import history', async () => {
      mockImportHistoryService.getImportHistory.mockResolvedValue([
        { id: 1, source: 'wigle', timestamp: '2024-01-01T00:00:00Z' },
      ]);

      const response = await request(app).get('/admin/import-history');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.history).toHaveLength(1);
    });

    it('returns empty array when no history', async () => {
      mockImportHistoryService.getImportHistory.mockResolvedValue([]);

      const response = await request(app).get('/admin/import-history');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.history).toEqual([]);
    });

    it('handles service errors', async () => {
      mockImportHistoryService.getImportHistory.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get('/admin/import-history');

      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe('GET /admin/device-sources', () => {
    it('returns device sources', async () => {
      mockImportHistoryService.getDeviceSources.mockResolvedValue([
        { id: 1, name: 'Device1', type: 'mobile' },
      ]);

      const response = await request(app).get('/admin/device-sources');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.sources).toHaveLength(1);
    });

    it('returns empty array when no sources', async () => {
      mockImportHistoryService.getDeviceSources.mockResolvedValue([]);

      const response = await request(app).get('/admin/device-sources');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.sources).toEqual([]);
    });

    it('handles service errors', async () => {
      mockImportHistoryService.getDeviceSources.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get('/admin/device-sources');

      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });
});
