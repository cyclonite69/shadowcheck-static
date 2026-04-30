export {};

const request = require('supertest');
const express = require('express');
import type { Express } from 'express';

const resolveDefault = (m: any) => m?.default || m;

// Mock dependencies
jest.mock('../../server/src/config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

jest.mock('../../server/src/services/secretsManager', () => ({
  has: jest.fn(),
}));

describe('Health Check Endpoint', () => {
  let app: Express;
  let healthRoutes: any;
  let pool: any;
  let secretsManager: any;
  let memoryUsageSpy: any;
  let previousNodeEnv: string | undefined;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    memoryUsageSpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 0,
      heapTotal: 100,
      heapUsed: 10,
      external: 0,
      arrayBuffers: 0,
    } as any);

    pool = require('../../server/src/config/database').pool;
    secretsManager = require('../../server/src/services/secretsManager');
    healthRoutes = resolveDefault(require('../../server/src/api/routes/v1/health'));

    app = express();
    app.use(healthRoutes);
  });

  afterEach(() => {
    memoryUsageSpy?.mockRestore?.();
    process.env.NODE_ENV = previousNodeEnv;
  });

  test('should return healthy status when all checks pass', async () => {
    pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    secretsManager.has.mockReturnValue(true);

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body.checks.database.status).toBe('ok');
    expect(response.body.checks.secrets.status).toBe('ok');
    expect(response.body.checks.memory.status).toBe('ok');
  });

  test('should return unhealthy status when database fails', async () => {
    pool.query.mockRejectedValue(new Error('Connection refused'));
    secretsManager.has.mockReturnValue(true);

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('unhealthy');
    expect(response.body.checks.database.status).toBe('error');
  });

  test('should return unhealthy status when secrets missing', async () => {
    pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    secretsManager.has.mockReturnValue(false);

    const response = await request(app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('unhealthy');
    expect(response.body.checks.secrets.status).toBe('error');
    expect(response.body.checks.secrets.loaded_count).toBe(0);
  });

  test('should include database latency', async () => {
    pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    secretsManager.has.mockReturnValue(true);

    const response = await request(app).get('/health');

    expect(response.body.checks.database).toHaveProperty('latency_ms');
    expect(typeof response.body.checks.database.latency_ms).toBe('number');
  });

  test('should include memory usage', async () => {
    pool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    secretsManager.has.mockReturnValue(true);

    const response = await request(app).get('/health');

    expect(response.body.checks.memory).toHaveProperty('heap_used_mb');
    expect(response.body.checks.memory).toHaveProperty('heap_max_mb');
  });
});
