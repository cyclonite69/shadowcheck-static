import request from 'supertest';
import express from 'express';

// Mock container
const mockContainer = {
  wigleService: {
    getWigleDetail: jest.fn(),
    importWigleV3NetworkDetail: jest.fn(),
    importWigleV3Observation: jest.fn(),
    getWigleObservations: jest.fn(),
  },
};

// Mock services
const mockWigleEnrichmentService = {
  getPendingEnrichmentCount: jest.fn(),
  getEnrichmentCatalog: jest.fn(),
  startBatchEnrichment: jest.fn(),
  resumeEnrichment: jest.fn(),
};

// Mock dependencies
jest.mock('../../../../server/src/config/container', () => mockContainer);
jest.mock('../../../../server/src/services/wigleEnrichmentService', () => mockWigleEnrichmentService);

jest.mock('../../../../server/src/services/secretsManager', () => ({
  __esModule: true,
  default: {
    get: jest.fn((key) => {
      if (key === 'wigle_api_name') return 'test_user';
      if (key === 'wigle_api_token') return 'test_token';
      return null;
    }),
  },
}));

jest.mock('../../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../../../server/src/middleware/authMiddleware', () => ({
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

// Mock express-fileupload if needed, but we can just mock the request object in supertest if it supports it
// Or we can mock the router's dependency on it if it had one, but it seems it uses req.files directly.

// Import router after mocks
const detailRouter = require('../../../../server/src/api/routes/v1/wigle/detail').default;

const app = express();
app.use(express.json());
app.use('/api/v1/wigle', detailRouter);

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('WiGLE Detail API v1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const secretsManager = require('../../../../server/src/services/secretsManager').default;
    secretsManager.get.mockImplementation((key: string) => {
      if (key === 'wigle_api_name') return 'test_user';
      if (key === 'wigle_api_token') return 'test_token';
      return null;
    });
  });

  describe('POST /detail/:netid', () => {
    it('should return cached results if available and not importing', async () => {
      mockContainer.wigleService.getWigleDetail.mockResolvedValue({
        netid: '00:11:22:33:44:55',
        ssid: 'TestNet',
        trilat: 1.23,
        trilon: 4.56,
      });

      const res = await request(app).post('/api/v1/wigle/detail/00:11:22:33:44:55').send({
        import: false,
      });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.cached).toBe(true);
      expect(res.body.data.networkId).toBe('00:11:22:33:44:55');
      expect(mockContainer.wigleService.getWigleDetail).toHaveBeenCalledWith('00:11:22:33:44:55');
    });

    it('should fetch from WiGLE API and import if requested', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          networkId: '00:11:22:33:44:55',
          name: 'TestNet',
          trilateratedLatitude: 1.23,
          trilateratedLongitude: 4.56,
          locationClusters: [
            {
              clusterSsid: 'TestNet',
              locations: [{ lat: 1.23, lon: 4.56 }],
            },
          ],
        }),
      });

      mockContainer.wigleService.importWigleV3NetworkDetail.mockResolvedValue(undefined);
      mockContainer.wigleService.importWigleV3Observation.mockResolvedValue(1);
      mockContainer.wigleService.getWigleObservations.mockResolvedValue({ total: 1 });

      const res = await request(app).post('/api/v1/wigle/detail/00:11:22:33:44:55').send({
        import: true,
      });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.imported).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
      expect(mockContainer.wigleService.importWigleV3NetworkDetail).toHaveBeenCalled();
    });
  });

  describe('Enrichment Routes', () => {
    it('GET /enrichment/stats should return pending count', async () => {
      mockWigleEnrichmentService.getPendingEnrichmentCount.mockResolvedValue(42);

      const res = await request(app).get('/api/v1/wigle/enrichment/stats');

      expect(res.status).toBe(200);
      expect(res.body.pendingCount).toBe(42);
    });

    it('POST /enrichment/start should start enrichment', async () => {
      mockWigleEnrichmentService.startBatchEnrichment.mockResolvedValue({ id: 1, status: 'running' });

      const res = await request(app).post('/api/v1/wigle/enrichment/start').send({
        bssids: ['00:11:22:33:44:55'],
      });

      expect(res.status).toBe(200);
      expect(res.body.run.id).toBe(1);
    });
  });
});
