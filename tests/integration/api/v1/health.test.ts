import request from 'supertest';
import express from 'express';

// Mock database
jest.mock('../../../../server/src/config/database', () => ({
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [{ 1: 1 }] }),
  },
}));

// Mock secretsManager
jest.mock('../../../../server/src/services/secretsManager', () => {
  const has = jest.fn().mockReturnValue(true);
  const m = {
    has,
    smReachable: true,
    smLastError: null,
  };
  return {
    __esModule: true,
    default: m,
    has: m.has,
    smReachable: m.smReachable,
    smLastError: m.smLastError,
  };
});

import healthRouter from '../../../../server/src/api/routes/v1/health';

beforeAll(() => {
  const mockMemory = {
    rss: 1024,
    heapTotal: 1000 * 1024 * 1024, // 1GB
    heapUsed: 1 * 1024 * 1024,     // 1MB (~0.1% usage)
    external: 0,
    arrayBuffers: 0,
  };
  jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemory as any);
});

const app = express();
app.use('/api/v1', healthRouter);

describe('GET /api/v1/health', () => {
  it('should return 200 and healthy status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});
