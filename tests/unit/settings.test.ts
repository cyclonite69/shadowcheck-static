import request from 'supertest';
import express from 'express';

const mockGetConfiguredAwsRegion = jest.fn().mockResolvedValue('us-east-1');

jest.mock('../../server/src/middleware/authMiddleware', () => ({
  requireAuth: (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

jest.mock('../../server/src/api/routes/v1/settingsHelpers', () => ({
  __esModule: true,
  getErrorMessage: (err: any) => err.message,
  getConfiguredAwsRegion: mockGetConfiguredAwsRegion,
  validateAwsRegion: (val: any) => ({ valid: !!val, value: val }),
  validateGenericKey: (val: any, field: string) => ({ valid: !!val, value: val }),
  validateGoogleMapsKey: (val: any) => ({ valid: !!val, value: val }),
  getIncomingValue: (body: any, key: string) => body[key] || body.token || body.value,
}));

jest.mock('../../server/src/services/adminDbService', () => ({
  adminQuery: jest.fn(),
}));

// We must require the routes after all mocks are in place
const {
  registerProviderSecretRoutes,
} = require('../../server/src/api/routes/v1/settingsSecretRoutes');
const adminSettingsRouter = require('../../server/src/api/routes/v1/settings');

describe('settings routes', () => {
  let app: any;
  let mockSecretsManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSecretsManager = {
      getSecret: jest.fn(),
      putSecret: jest.fn(),
      deleteSecret: jest.fn(),
      putSecrets: jest.fn(),
    };
    app = express();
    app.use(express.json());

    const router = express.Router();
    registerProviderSecretRoutes({ router, secretsManager: mockSecretsManager });
    app.use('/api', router);
    app.use('/api', adminSettingsRouter);
  });

  describe('settingsSecretRoutes (Provider Secrets)', () => {
    it('should get mapbox-unlimited status', async () => {
      mockSecretsManager.getSecret.mockResolvedValueOnce('pk.123');
      const res = await request(app).get('/api/settings/mapbox-unlimited');
      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(true);
    });

    it('should post google-maps key', async () => {
      const res = await request(app).post('/api/settings/google-maps').send({ apiKey: 'test_key' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('admin settings routes', () => {
    it('should get aws settings', async () => {
      const res = await request(app).get('/api/settings/aws');
      expect(res.status).toBe(200);
      expect(res.body.region).toBeNull();
    });

    it('should post aws region', async () => {
      const res = await request(app).post('/api/settings/aws').send({ region: 'us-west-2' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
