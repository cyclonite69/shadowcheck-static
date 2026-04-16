import request from 'supertest';
import express from 'express';

// Mock container
jest.mock('../../../../server/src/config/container', () => ({
  dataQualityAdminService: {
    getQualityStats: jest.fn(),
    getQualityConfig: jest.fn(),
    updateQualityConfig: jest.fn(),
    applyQualityFilters: jest.fn(),
    clearQualityFlags: jest.fn(),
  },
}));

// Mock auth middleware
jest.mock('../../../../server/src/middleware/authMiddleware', () => ({
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

const container = require('../../../../server/src/config/container');
const dataQualityRouter = require('../../../../server/src/api/routes/v1/dataQuality').default;

const app = express();
app.use(express.json());
// Mounted at /api/v1/admin/data-quality in admin.ts
app.use('/api/v1/admin/data-quality', dataQualityRouter);

describe('Data Quality API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/admin/data-quality/stats', () => {
    it('should return quality stats', async () => {
      const mockStats = { total: 1000, flagged: 50 };
      container.dataQualityAdminService.getQualityStats.mockResolvedValue(mockStats);

      const res = await request(app).get('/api/v1/admin/data-quality/stats');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.stats).toEqual(mockStats);
    });
  });

  describe('GET /api/v1/admin/data-quality/config', () => {
    it('should return quality config', async () => {
      const mockConfig = { min_rssi: -90, min_observations: 5 };
      container.dataQualityAdminService.getQualityConfig.mockResolvedValue(mockConfig);

      const res = await request(app).get('/api/v1/admin/data-quality/config');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.config).toEqual(mockConfig);
    });
  });

  describe('PUT /api/v1/admin/data-quality/config', () => {
    it('should update quality config', async () => {
      const newConfig = { min_rssi: -85 };
      container.dataQualityAdminService.updateQualityConfig.mockResolvedValue(undefined);

      const res = await request(app).put('/api/v1/admin/data-quality/config').send(newConfig);
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.message).toBe('Quality filter config updated');
      expect(container.dataQualityAdminService.updateQualityConfig).toHaveBeenCalledWith(newConfig);
    });
  });

  describe('POST /api/v1/admin/data-quality/apply', () => {
    it('should apply quality filters', async () => {
      const mockStats = { processed: 100, flagged: 10 };
      container.dataQualityAdminService.applyQualityFilters.mockResolvedValue(mockStats);

      const res = await request(app).post('/api/v1/admin/data-quality/apply');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.message).toBe('Quality filters applied');
      expect(res.body.stats).toEqual(mockStats);
    });
  });

  describe('POST /api/v1/admin/data-quality/clear', () => {
    it('should clear quality flags', async () => {
      container.dataQualityAdminService.clearQualityFlags.mockResolvedValue(undefined);

      const res = await request(app).post('/api/v1/admin/data-quality/clear');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.message).toBe('Quality flags cleared');
    });
  });
});
