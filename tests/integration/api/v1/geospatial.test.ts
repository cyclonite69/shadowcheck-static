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

const logger = require('../../../../server/src/logging/logger');
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

    it('should distinguish missing tokens from an unreachable secret manager', async () => {
      mockContainer.secretsManager.getSecret.mockResolvedValue(null);

      const missing = await request(app).get('/api/mapbox-token');
      expect(missing.status).toBe(500);
      expect(missing.body.error).toBe('Mapbox token not configured');

      mockContainer.secretsManager.smReachable = false;
      mockContainer.secretsManager.smLastError = 'credentials unavailable';
      const unreachable = await request(app).get('/api/mapbox-token');
      expect(unreachable.body.error).toBe('Secrets Manager unreachable');
      expect(unreachable.body.message).toContain('credentials unavailable');
    });

    it('should report secret loading failures', async () => {
      mockContainer.secretsManager.getSecret.mockRejectedValue(new Error('vault failed'));

      const res = await request(app).get('/api/mapbox-token');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'vault failed', ok: false });
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
      expect(mockContainer.externalServiceHandler.withRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { serviceName: 'Mapbox style', timeoutMs: 10000, maxRetries: 2 }
      );
    });

    it('should return 400 for invalid style format', async () => {
      const res = await request(app).get('/api/mapbox-style?style=invalid-style');

      expect(res.status).toBe(400);
    });

    it('should accept mapbox style URIs and use the default style', async () => {
      mockContainer.secretsManager.getSecret.mockResolvedValue('pk.test-token');
      mockContainer.externalServiceHandler.withRetry.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{"version":8}',
      });

      const uri = await request(app).get(
        '/api/mapbox-style?style=mapbox%3A%2F%2Fstyles%2Fowner%2Fstyle'
      );
      const defaultStyle = await request(app).get('/api/mapbox-style');

      expect(uri.status).toBe(200);
      expect(defaultStyle.status).toBe(200);
    });

    it('should handle missing tokens, upstream failures, invalid JSON, and exceptions', async () => {
      mockContainer.secretsManager.getSecret.mockResolvedValueOnce(null);
      const missing = await request(app).get('/api/mapbox-style');
      expect(missing.status).toBe(500);

      mockContainer.secretsManager.getSecret.mockResolvedValue('pk.test-token');
      mockContainer.externalServiceHandler.withRetry.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      });
      const upstream = await request(app).get('/api/mapbox-style');
      expect(upstream.status).toBe(401);
      expect(upstream.body.body).toBe('unauthorized');

      mockContainer.externalServiceHandler.withRetry.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'not-json',
      });
      const invalidJson = await request(app).get('/api/mapbox-style');
      expect(invalidJson.status).toBe(500);
      expect(invalidJson.body.error).toBe('Invalid JSON from Mapbox style');

      mockContainer.externalServiceHandler.withRetry.mockRejectedValueOnce(
        new Error('request failed')
      );
      const failed = await request(app).get('/api/mapbox-style');
      expect(failed.status).toBe(500);
      expect(failed.body.error).toBe('request failed');
    });
  });

  describe('GET /api/mapbox-proxy', () => {
    it('should validate proxy URLs and hostnames', async () => {
      const missing = await request(app).get('/api/mapbox-proxy');
      const malformed = await request(app).get('/api/mapbox-proxy?url=not-a-url');
      const denied = await request(app).get(
        '/api/mapbox-proxy?url=https%3A%2F%2Fexample.com%2Ftiles'
      );

      expect(missing.status).toBe(400);
      expect(malformed.status).toBe(400);
      expect(denied.status).toBe(400);
      expect(denied.body.error).toBe('Only api.mapbox.com is allowed');
    });

    it('should require a token and proxy allowed upstream responses', async () => {
      const url = encodeURIComponent('https://api.mapbox.com/styles/v1/mapbox/dark-v11');
      mockContainer.secretsManager.getSecret.mockResolvedValueOnce(null);
      const missing = await request(app).get(`/api/mapbox-proxy?url=${url}`);
      expect(missing.status).toBe(500);

      mockContainer.secretsManager.getSecret.mockResolvedValue('pk.test-token');
      mockContainer.externalServiceHandler.withRetry.mockResolvedValueOnce({
        status: 206,
        headers: {
          forEach: (callback: (value: string, key: string) => void) =>
            callback('text/plain', 'content-type'),
        },
        body: {
          pipe: (res: express.Response) => {
            res.write('proxied');
            res.end();
          },
        },
      });

      const proxied = await request(app).get(`/api/mapbox-proxy?url=${url}`);

      expect(proxied.status).toBe(206);
      expect(proxied.text).toBe('proxied');
      expect(proxied.headers['content-type']).toContain('text/plain');
    });

    it('should handle empty upstream bodies and proxy failures', async () => {
      const url = encodeURIComponent(
        'https://api.mapbox.com/styles/v1/mapbox/dark-v11?access_token=existing'
      );
      mockContainer.secretsManager.getSecret.mockResolvedValue('pk.test-token');
      mockContainer.externalServiceHandler.withRetry.mockResolvedValueOnce({
        status: 204,
        headers: { forEach: jest.fn() },
        body: null,
      });
      const empty = await request(app).get(`/api/mapbox-proxy?url=${url}`);
      expect(empty.status).toBe(204);

      mockContainer.externalServiceHandler.withRetry.mockRejectedValueOnce(
        new Error('proxy failed')
      );
      const failed = await request(app).get(`/api/mapbox-proxy?url=${url}`);
      expect(failed.status).toBe(500);
      expect(logger.error).toHaveBeenCalledWith('Mapbox proxy error: proxy failed', {
        error: expect.any(Error),
      });
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

    it('should report missing keys and secret lookup failures', async () => {
      mockContainer.secretsManager.get.mockReturnValueOnce(null).mockImplementationOnce(() => {
        throw new Error('lookup failed');
      });

      const missing = await request(app).get('/api/google-maps-token');
      const failed = await request(app).get('/api/google-maps-token');

      expect(missing.status).toBe(500);
      expect(missing.body.ok).toBe(false);
      expect(failed.body).toEqual({ error: 'lookup failed', ok: false });
    });
  });

  describe('GET /api/google-maps-tile/:type/:z/:x/:y', () => {
    it('should proxy google maps tiles', async () => {
      mockContainer.secretsManager.get.mockReturnValue('AIza-test-key');

      const mockHeaders = {
        get: (name: string) => (name.toLowerCase() === 'content-type' ? 'image/png' : null),
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

    it('should reject missing keys and upstream tile failures', async () => {
      mockContainer.secretsManager.get.mockReturnValueOnce(null);
      const missing = await request(app).get('/api/google-maps-tile/hybrid/10/512/512');
      expect(missing.status).toBe(500);

      mockContainer.secretsManager.get.mockReturnValue('AIza-test-key');
      mockContainer.externalServiceHandler.withRetry.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'tile missing',
      });
      const upstream = await request(app).get('/api/google-maps-tile/unknown/10/512/512');
      expect(upstream.status).toBe(404);
      expect(upstream.body.details).toBe('tile missing');
    });

    it('should report tile proxy exceptions', async () => {
      mockContainer.secretsManager.get.mockReturnValue('AIza-test-key');
      mockContainer.externalServiceHandler.withRetry.mockRejectedValueOnce(
        new Error('tile failed')
      );

      const res = await request(app).get('/api/google-maps-tile/terrain/10/512/512');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('tile failed');
    });
  });
});
