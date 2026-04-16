import request from 'supertest';
import express from 'express';

// Define mock container
const mockContainer = {
  secretsManager: {
    getSecret: jest.fn(),
    get: jest.fn(),
    smReachable: true,
    smLastError: null as string | null,
  },
  externalServiceHandler: {
    withRetry: jest.fn(),
  },
};

// Mock the container
jest.mock('../../../../server/src/config/container', () => mockContainer);

// Mock logger
jest.mock('../../../../server/src/logging/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const geospatialRouter = require('../../../../server/src/api/routes/v1/geospatial');

const app = express();
app.use(express.json());
// Geospatial routes have /api prefix in their definitions
app.use('/', geospatialRouter);

describe('Geospatial API v1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContainer.secretsManager.smReachable = true;
    mockContainer.secretsManager.smLastError = null;
  });

  describe('GET /api/mapbox-token', () => {
    it('should return mapbox token when configured', async () => {
      mockContainer.secretsManager.getSecret.mockResolvedValue('pk.test-token');
      
      const res = await request(app).get('/api/mapbox-token');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.token).toBe('pk.test-token');
    });
  });

  describe('GET /api/mapbox-style', () => {
    it('should fetch mapbox style successfully', async () => {
      mockContainer.secretsManager.getSecret.mockResolvedValue('pk.test-token');
      const mockStyleJson = { version: 8, name: 'Test Style', layers: [] };
      
      mockContainer.externalServiceHandler.withRetry.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockStyleJson),
      });

      const res = await request(app).get('/api/mapbox-style?style=mapbox/dark-v11');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.style).toEqual(mockStyleJson);
    });

    it('should return 400 for invalid style format', async () => {
      const res = await request(app).get('/api/mapbox-style?style=invalid-style');
      
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/google-maps-token', () => {
    it('should return google maps API key', async () => {
      mockContainer.secretsManager.get.mockReturnValue('AIza-test-key');
      
      const res = await request(app).get('/api/google-maps-token');
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.apiKey).toBe('AIza-test-key');
    });
  });

  describe('GET /api/google-maps-tile/:type/:z/:x/:y', () => {
    it('should proxy google maps tiles', async () => {
      mockContainer.secretsManager.get.mockReturnValue('AIza-test-key');
      
      const mockHeaders = {
        get: (name: string) => (name.toLowerCase() === 'content-type' ? 'image/png' : null)
      };
      
      mockContainer.externalServiceHandler.withRetry.mockResolvedValue({
        ok: true,
        status: 200,
        headers: mockHeaders,
        body: {
          pipe: (res: any) => {
            res.write('fake-image-binary');
            res.end();
          },
        },
      });

      const res = await request(app).get('/api/google-maps-tile/roadmap/10/512/512');
      
      expect(res.status).toBe(200);
    });
  });
});
