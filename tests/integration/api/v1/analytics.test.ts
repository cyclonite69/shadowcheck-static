import request from 'supertest';
import express from 'express';

// Mock container
jest.mock('../../../../server/src/config/container', () => ({
  analyticsService: {
    getNetworkTypes: jest.fn(),
    getSignalStrengthDistribution: jest.fn(),
    getTemporalActivity: jest.fn(),
    getRadioTypeOverTime: jest.fn(),
    getSecurityDistribution: jest.fn(),
    getTopNetworks: jest.fn(),
    getDashboardStats: jest.fn(),
    getBulkAnalytics: jest.fn(),
    getThreatDistribution: jest.fn(),
    getThreatTrends: jest.fn(),
  },
}));

const analyticsRouter = require('../../../../server/src/api/routes/v1/analytics');
const { analyticsService } = require('../../../../server/src/config/container');
const { createErrorHandler } = require('../../../../server/src/errors/errorHandler');
const logger = require('../../../../server/src/logging/logger');

const app = express();
app.use(express.json());
app.use('/api/v1/analytics', analyticsRouter);
app.use(createErrorHandler(logger));

describe('Analytics API Integration Tests', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/v1/analytics/network-types', () => {
    it('should return 200 and network type distribution', async () => {
      const mockData = [{ type: 'wifi', count: 100 }, { type: 'ble', count: 50 }];
      analyticsService.getNetworkTypes.mockResolvedValue(mockData);

      const res = await request(app).get('/api/v1/analytics/network-types');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toEqual(mockData);
      expect(analyticsService.getNetworkTypes).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/analytics/signal-strength', () => {
    it('should return 200 and signal strength distribution', async () => {
      const mockData = [{ range: '-50 to -60', count: 20 }];
      analyticsService.getSignalStrengthDistribution.mockResolvedValue(mockData);

      const res = await request(app).get('/api/v1/analytics/signal-strength');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toEqual(mockData);
    });
  });

  describe('GET /api/v1/analytics/temporal-activity', () => {
    it('should return 200 and temporal activity', async () => {
      const mockData = [{ hour: 12, count: 10 }];
      analyticsService.getTemporalActivity.mockResolvedValue(mockData);

      const res = await request(app).get('/api/v1/analytics/temporal-activity');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toEqual(mockData);
    });
  });

  describe('GET /api/v1/analytics/radio-type-over-time', () => {
    it('should return 200 and radio type over time', async () => {
      const mockData = [{ timestamp: '2023-01-01T00:00:00Z', counts: {} }];
      analyticsService.getRadioTypeOverTime.mockResolvedValue(mockData);

      const res = await request(app).get('/api/v1/analytics/radio-type-over-time?range=7d');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.range).toBe('7d');
      expect(res.body.data).toEqual(mockData);
    });

    it('should return 400 for invalid range', async () => {
      const res = await request(app).get('/api/v1/analytics/radio-type-over-time?range=invalid');
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /api/v1/analytics/security', () => {
    it('should return 200 and security distribution', async () => {
      const mockData = [{ protocol: 'WPA2', count: 80 }];
      analyticsService.getSecurityDistribution.mockResolvedValue(mockData);

      const res = await request(app).get('/api/v1/analytics/security');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toEqual(mockData);
    });
  });

  describe('GET /api/v1/analytics/top-networks', () => {
    it('should return 200 and top networks', async () => {
      const mockData = [{ ssid: 'Test', count: 10 }];
      analyticsService.getTopNetworks.mockResolvedValue(mockData);

      const res = await request(app).get('/api/v1/analytics/top-networks?limit=10');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.limit).toBe(10);
      expect(res.body.data).toEqual(mockData);
    });
  });

  describe('GET /api/v1/analytics/dashboard', () => {
    it('should return 200 and dashboard stats', async () => {
      const mockData = { totalNetworks: 1000 };
      analyticsService.getDashboardStats.mockResolvedValue(mockData);

      const res = await request(app).get('/api/v1/analytics/dashboard');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toEqual(mockData);
    });
  });

  describe('GET /api/v1/analytics/bulk', () => {
    it('should return 200 and bulk data', async () => {
      const mockData = { generatedAt: new Date().toISOString() };
      analyticsService.getBulkAnalytics.mockResolvedValue(mockData);

      const res = await request(app).get('/api/v1/analytics/bulk');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toEqual(mockData);
    });
  });

  describe('GET /api/v1/analytics/threat-distribution', () => {
    it('should return 200 and threat distribution', async () => {
      const mockData = [{ range: 'high', count: 5 }];
      analyticsService.getThreatDistribution.mockResolvedValue(mockData);

      const res = await request(app).get('/api/v1/analytics/threat-distribution');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toEqual(mockData);
    });
  });

  describe('GET /api/v1/analytics/threat-trends', () => {
    it('should return 200 and threat trends', async () => {
      const mockData = [{ timestamp: '2023-01-01T00:00:00Z', averageScore: 50 }];
      analyticsService.getThreatTrends.mockResolvedValue(mockData);

      const res = await request(app).get('/api/v1/analytics/threat-trends?range=30d');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.range).toBe('30d');
      expect(res.body.data).toEqual(mockData);
    });
  });
});
