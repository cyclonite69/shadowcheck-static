export {};

import request from 'supertest';
import express from 'express';

jest.mock('../../../../server/src/config/container', () => ({
  wigleService: { getUserStats: jest.fn() },
}));

jest.mock('../../../../server/src/logging/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

function createApp() {
  jest.resetModules();
  const { wigleService } = require('../../../../server/src/config/container');
  const statsRouter = require('../../../../server/src/api/routes/v1/wigle/stats').default;
  const app = express();
  app.use(express.json());
  app.use('/api/wigle', statsRouter);
  return { app, wigleService };
}

describe('wigle stats route', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns 200 with stats on success', async () => {
    const { app, wigleService } = createApp();
    wigleService.getUserStats.mockResolvedValue({ rank: 1234, user: 'testuser' });
    const res = await request(app).get('/api/wigle/user-stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.rank).toBe(1234);
  });

  test('returns 429 when ledger soft limit is reached (regression: was 500)', async () => {
    const { app, wigleService } = createApp();
    const err: any = new Error('WiGLE stats soft limit reached (10/10).');
    err.status = 429;
    wigleService.getUserStats.mockRejectedValue(err);

    const res = await request(app).get('/api/wigle/user-stats');
    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('soft limit reached');
  });

  test('returns 503 when credentials not configured', async () => {
    const { app, wigleService } = createApp();
    const err: any = new Error('WiGLE API credentials not configured');
    wigleService.getUserStats.mockRejectedValue(err);

    const res = await request(app).get('/api/wigle/user-stats');
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
  });

  test('returns 500 for unexpected errors', async () => {
    const { app, wigleService } = createApp();
    wigleService.getUserStats.mockRejectedValue(new Error('Unexpected DB failure'));
    const res = await request(app).get('/api/wigle/user-stats');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
