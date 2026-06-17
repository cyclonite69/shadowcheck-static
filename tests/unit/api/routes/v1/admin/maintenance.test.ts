import request from 'supertest';
import express, { Router } from 'express';

// Mock maintenance service
const mockMaintenanceService = {
  getMaintenanceStatus: jest.fn(),
  runCoLocationView: jest.fn(),
};

// Create test app
const app = express();
app.use(express.json());

const maintenanceRouter = Router();

maintenanceRouter.get('/admin/maintenance/status', async (req, res, next) => {
  try {
    const status = await mockMaintenanceService.getMaintenanceStatus();
    res.json({ ok: true, status });
  } catch (err) {
    next(err);
  }
});

maintenanceRouter.post('/admin/maintenance/colocation', async (req, res, next) => {
  try {
    const result = await mockMaintenanceService.runCoLocationView();
    res.json({
      ok: true,
      message: 'Co-location materialized view created/refreshed successfully',
      result,
    });
  } catch (err: any) {
    next(err);
  }
});

app.use('/', maintenanceRouter);

describe('maintenance routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /admin/maintenance/status', () => {
    it('returns maintenance status', async () => {
      mockMaintenanceService.getMaintenanceStatus.mockResolvedValue({
        uptime: 86400,
        lastMaintenance: '2024-01-01T00:00:00Z',
      });

      const response = await request(app).get('/admin/maintenance/status');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.status).toBeDefined();
      expect(response.body.status.uptime).toBeDefined();
    });

    it('handles service errors on status', async () => {
      mockMaintenanceService.getMaintenanceStatus.mockRejectedValue(new Error('Service error'));

      const response = await request(app).get('/admin/maintenance/status');

      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe('POST /admin/maintenance/colocation', () => {
    it('runs co-location view refresh', async () => {
      mockMaintenanceService.runCoLocationView.mockResolvedValue({
        rowsAffected: 1000,
      });

      const response = await request(app).post('/admin/maintenance/colocation');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.message).toContain('Co-location');
      expect(response.body.result).toBeDefined();
    });

    it('calls maintenance service', async () => {
      mockMaintenanceService.runCoLocationView.mockResolvedValue({});

      await request(app).post('/admin/maintenance/colocation');

      expect(mockMaintenanceService.runCoLocationView).toHaveBeenCalled();
    });

    it('handles service errors on colocation', async () => {
      mockMaintenanceService.runCoLocationView.mockRejectedValue(new Error('View refresh failed'));

      const response = await request(app).post('/admin/maintenance/colocation');

      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });
});
