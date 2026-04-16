import request from 'supertest';
import express from 'express';
import path from 'path';

// Mock dependencies
jest.mock('../../server/src/config/container', () => ({
  miscService: {
    getDataQualityMetrics: jest.fn(),
  },
  secretsManager: {
    getSecret: jest.fn(),
  },
  wigleImportService: {
    importWigleDirectory: jest.fn(),
  },
  dataQualityFilters: {
    DATA_QUALITY_FILTERS: {
      temporal_clusters: 'temporal',
      extreme_signals: 'extreme',
      duplicate_coords: 'duplicate',
      all: () => 'all',
    },
  },
}));

jest.mock('../../server/src/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const {
  miscService,
  secretsManager,
  wigleImportService,
  dataQualityFilters,
} = require('../../server/src/config/container');
const miscRouter = require('../../server/src/api/routes/v1/misc');

const app = express();
app.use(express.json());
app.use('/api', miscRouter);

describe('misc routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /demo/oui-grouping', () => {
    it('should return the demo page', async () => {
      const res = await request(app).get('/api/demo/oui-grouping');
      // Just check status 200, as sendFile might need actual file to exist or mock res.sendFile
      // If it fails with 404, we mock path.join
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/geocode', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      (global.fetch as jest.Mock).mockRestore();
    });

    it('should return 400 if address is missing', async () => {
      const res = await request(app).post('/api/geocode').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Address is required');
    });

    it('should return 500 if mapbox token is missing', async () => {
      secretsManager.getSecret.mockResolvedValueOnce(null);
      const res = await request(app).post('/api/geocode').send({ address: '123 Main St' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Mapbox token not configured');
    });

    it('should geocode address successfully', async () => {
      secretsManager.getSecret.mockResolvedValueOnce('mock_token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
          features: [{ center: [10, 20], place_name: 'Mock Place', relevance: 1 }],
        }),
      });

      const res = await request(app).post('/api/geocode').send({ address: '123 Main St' });
      expect(res.status).toBe(200);
      expect(res.body.lat).toBe(20);
      expect(res.body.lng).toBe(10);
      expect(res.body.formatted_address).toBe('Mock Place');
    });

    it('should return 404 if no features found', async () => {
      secretsManager.getSecret.mockResolvedValueOnce('mock_token');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({ features: [] }),
      });

      const res = await request(app).post('/api/geocode').send({ address: '123 Main St' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Address not found');
    });

    it('should handle fetch error', async () => {
      secretsManager.getSecret.mockResolvedValueOnce('mock_token');
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Fetch failed'));

      const res = await request(app).post('/api/geocode').send({ address: '123 Main St' });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Geocoding failed');
    });
  });

  describe('POST /api/import/wigle', () => {
    it('should call importWigleDirectory successfully', async () => {
      wigleImportService.importWigleDirectory.mockResolvedValueOnce({ count: 5 });
      const res = await request(app).post('/api/import/wigle').send({});
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(5);
    });

    it('should handle importWigleDirectory error', async () => {
      wigleImportService.importWigleDirectory.mockRejectedValueOnce(new Error('Import failed'));
      const res = await request(app).post('/api/import/wigle').send({});
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Import failed');
    });
  });

  describe('GET /api/data-quality', () => {
    it('should get data quality metrics with no filter', async () => {
      miscService.getDataQualityMetrics.mockResolvedValueOnce({ metric: 1 });
      const res = await request(app).get('/api/data-quality');
      expect(res.status).toBe(200);
      expect(res.body.metric).toBe(1);
      expect(res.body.filter_applied).toBe('none');
      expect(miscService.getDataQualityMetrics).toHaveBeenCalledWith('');
    });

    it('should get data quality metrics with temporal filter', async () => {
      miscService.getDataQualityMetrics.mockResolvedValueOnce({ metric: 1 });
      const res = await request(app).get('/api/data-quality?filter=temporal');
      expect(res.status).toBe(200);
      expect(miscService.getDataQualityMetrics).toHaveBeenCalledWith('temporal');
    });

    it('should get data quality metrics with extreme filter', async () => {
      miscService.getDataQualityMetrics.mockResolvedValueOnce({ metric: 1 });
      const res = await request(app).get('/api/data-quality?filter=extreme');
      expect(res.status).toBe(200);
      expect(miscService.getDataQualityMetrics).toHaveBeenCalledWith('extreme');
    });

    it('should get data quality metrics with duplicate filter', async () => {
      miscService.getDataQualityMetrics.mockResolvedValueOnce({ metric: 1 });
      const res = await request(app).get('/api/data-quality?filter=duplicate');
      expect(res.status).toBe(200);
      expect(miscService.getDataQualityMetrics).toHaveBeenCalledWith('duplicate');
    });

    it('should get data quality metrics with all filter', async () => {
      miscService.getDataQualityMetrics.mockResolvedValueOnce({ metric: 1 });
      const res = await request(app).get('/api/data-quality?filter=all');
      expect(res.status).toBe(200);
      expect(miscService.getDataQualityMetrics).toHaveBeenCalledWith('all');
    });

    it('should handle error', async () => {
      miscService.getDataQualityMetrics.mockRejectedValueOnce(new Error('DB Error'));
      const res = await request(app).get('/api/data-quality');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('DB Error');
    });
  });
});
