import request from 'supertest';
import express from 'express';

// Mock dependencies
jest.mock('../../../../server/src/services/secretsManager', () => ({
  get: jest.fn(),
}));

const secretsManager = require('../../../../server/src/services/secretsManager');
const statusRouter = require('../../../../server/src/api/routes/v1/wigle/status').default;

const app = express();
app.use(express.json());
app.use('/api/wigle', statusRouter);

describe('wigleStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return configured status', async () => {
    secretsManager.get.mockImplementation((key: string) => {
      if (key === 'wigle_api_name') return 'name';
      if (key === 'wigle_api_token') return 'token';
      return null;
    });

    const res = await request(app).get('/api/wigle/api-status');
    expect(res.status).toBe(200);
    expect(res.body.configured).toBe(true);
  });

  it('should return unconfigured status', async () => {
    secretsManager.get.mockReturnValue(null);
    const res = await request(app).get('/api/wigle/api-status');
    expect(res.body.configured).toBe(false);
  });
});
