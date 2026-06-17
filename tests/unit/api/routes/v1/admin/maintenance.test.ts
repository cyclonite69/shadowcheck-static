import request from 'supertest';
import express from 'express';

const mockGetDuplicateObservationStats = jest.fn();
const mockDeleteDuplicateObservations = jest.fn();
const mockGetObservationCount = jest.fn();
const mockRefreshColocationView = jest.fn();

jest.mock('../../../../../../server/src/config/container', () => ({
  adminMaintenanceService: {
    getDuplicateObservationStats: mockGetDuplicateObservationStats,
    deleteDuplicateObservations: mockDeleteDuplicateObservations,
    getObservationCount: mockGetObservationCount,
    refreshColocationView: mockRefreshColocationView,
  },
}));

jest.mock('../../../../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const maintenanceRouter = require('../../../../../../server/src/api/routes/v1/admin/maintenance');

const app = express();
app.use(express.json());
app.use('/', maintenanceRouter);

describe('Admin Maintenance Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /admin/cleanup-duplicates', () => {
    it('successfully cleans up duplicates', async () => {
      mockGetDuplicateObservationStats.mockResolvedValue({ total: 100 });
      mockDeleteDuplicateObservations.mockResolvedValue(20);
      mockGetObservationCount.mockResolvedValue(80);

      const response = await request(app).post('/admin/cleanup-duplicates');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        message: 'Duplicate observations removed',
        before: 100,
        after: 80,
        removed: 20,
      });
    });

    it('handles errors during cleanup', async () => {
      mockGetDuplicateObservationStats.mockRejectedValue(new Error('Cleanup failed'));

      const response = await request(app).post('/admin/cleanup-duplicates');

      expect(response.status).toBe(500);
    });
  });

  describe('POST /admin/refresh-colocation', () => {
    it('successfully refreshes colocation view', async () => {
      mockRefreshColocationView.mockResolvedValue(undefined);

      const response = await request(app).post('/admin/refresh-colocation');

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(mockRefreshColocationView).toHaveBeenCalled();
    });

    it('handles errors during refresh', async () => {
      mockRefreshColocationView.mockRejectedValue(new Error('Refresh failed'));

      const response = await request(app).post('/admin/refresh-colocation');

      expect(response.status).toBe(500);
    });
  });
});
