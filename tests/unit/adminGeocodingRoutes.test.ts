import express from 'express';
import request from 'supertest';

const geocodingCacheService = {
  startGeocodeCacheUpdate: jest.fn(),
  getGeocodingCacheStats: jest.fn(),
  testGeocodingProvider: jest.fn(),
  startGeocodingDaemon: jest.fn(),
  stopGeocodingDaemon: jest.fn(),
  getGeocodingDaemonStatus: jest.fn(),
  requeueFailedGeocoding: jest.fn(),
};
const logger = {
  error: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  geocodingCacheService,
}));

jest.mock('../../server/src/logging/logger', () => logger);

const geocodingRouter = require('../../server/src/api/routes/v1/admin/geocoding');

const app = express();
app.use(express.json());
app.use('/api', geocodingRouter);

describe('admin geocoding routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns geocoding statistics with parsed precision', async () => {
    geocodingCacheService.getGeocodingCacheStats.mockResolvedValueOnce({ cached: 10 });

    const response = await request(app).get('/api/admin/geocoding/stats?precision=7');

    expect(response.status).toBe(200);
    expect(geocodingCacheService.getGeocodingCacheStats).toHaveBeenCalledWith(7);
    expect(response.body.stats).toEqual({ cached: 10 });
  });

  it('starts a configured one-shot geocoding run', async () => {
    geocodingCacheService.startGeocodeCacheUpdate.mockResolvedValueOnce({ started: true });

    const response = await request(app).post('/api/admin/geocoding/run').send({
      provider: 'mapbox',
      mode: 'both',
      limit: 25,
      precision: 6,
    });

    expect(response.status).toBe(200);
    expect(geocodingCacheService.startGeocodeCacheUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'mapbox',
        mode: 'both',
        limit: 25,
        precision: 6,
      })
    );
  });

  it('reports both forms of already-running responses', async () => {
    geocodingCacheService.startGeocodeCacheUpdate
      .mockResolvedValueOnce({ started: false })
      .mockRejectedValueOnce(new Error('job_already_running'));

    const returned = await request(app).post('/api/admin/geocoding/run').send({});
    const thrown = await request(app).post('/api/admin/geocoding/run').send({});

    expect(returned.status).toBe(409);
    expect(thrown.status).toBe(409);
  });

  it('reports missing provider keys and generic run failures', async () => {
    geocodingCacheService.startGeocodeCacheUpdate
      .mockRejectedValueOnce(new Error('missing_key:mapbox'))
      .mockRejectedValueOnce(new Error('run failed'));

    const missingKey = await request(app).post('/api/admin/geocoding/run').send({});
    const failed = await request(app).post('/api/admin/geocoding/run').send({});

    expect(missingKey.status).toBe(400);
    expect(missingKey.body.error).toBe('Missing API key for mapbox');
    expect(failed.status).toBe(500);
    expect(failed.body.error).toBe('run failed');
  });

  it('returns daemon status and a safe fallback when status loading fails', async () => {
    geocodingCacheService.getGeocodingDaemonStatus
      .mockResolvedValueOnce({ running: true })
      .mockRejectedValueOnce(new Error('status unavailable'));

    const running = await request(app).get('/api/admin/geocoding/daemon');
    const fallback = await request(app).get('/api/admin/geocoding/daemon');

    expect(running.body.daemon).toEqual({ running: true });
    expect(fallback.status).toBe(200);
    expect(fallback.body.daemon).toEqual({
      running: false,
      stopRequested: false,
      config: null,
      lastError: 'status unavailable',
    });
  });

  it('starts and stops the geocoding daemon', async () => {
    geocodingCacheService.startGeocodingDaemon.mockResolvedValueOnce({
      started: true,
      status: { running: true },
    });
    geocodingCacheService.stopGeocodingDaemon.mockReturnValueOnce({
      stopped: true,
      status: { running: false },
    });

    const started = await request(app)
      .post('/api/admin/geocoding/daemon')
      .send({ provider: 'locationiq', loopDelayMs: 5000 });
    const stopped = await request(app).delete('/api/admin/geocoding/daemon');

    expect(started.status).toBe(200);
    expect(started.body.started).toBe(true);
    expect(stopped.body).toEqual({
      ok: true,
      stopped: true,
      daemon: { running: false },
    });
  });

  it('handles daemon start and stop errors', async () => {
    geocodingCacheService.startGeocodingDaemon
      .mockRejectedValueOnce(new Error('missing_key:locationiq'))
      .mockRejectedValueOnce(new Error('start failed'));
    geocodingCacheService.stopGeocodingDaemon.mockImplementationOnce(() => {
      throw new Error('stop failed');
    });

    const missingKey = await request(app).post('/api/admin/geocoding/daemon').send({});
    const startFailed = await request(app).post('/api/admin/geocoding/daemon').send({});
    const stopFailed = await request(app).delete('/api/admin/geocoding/daemon');

    expect(missingKey.status).toBe(400);
    expect(startFailed.status).toBe(500);
    expect(stopFailed.status).toBe(500);
  });

  it('tests a provider and reports provider errors', async () => {
    geocodingCacheService.testGeocodingProvider
      .mockResolvedValueOnce({ address: 'test' })
      .mockRejectedValueOnce(new Error('missing_key:locationiq'))
      .mockRejectedValueOnce(new Error('provider failed'));

    const success = await request(app)
      .post('/api/admin/geocoding/test')
      .send({ provider: 'locationiq', lat: 40, lon: -75 });
    const missingKey = await request(app)
      .post('/api/admin/geocoding/test')
      .send({ provider: 'locationiq' });
    const failed = await request(app)
      .post('/api/admin/geocoding/test')
      .send({ provider: 'locationiq' });

    expect(success.body.result).toEqual({ address: 'test' });
    expect(missingKey.status).toBe(400);
    expect(failed.status).toBe(500);
  });

  it('requeues failed entries with defaults or supplied bounds', async () => {
    geocodingCacheService.requeueFailedGeocoding.mockResolvedValueOnce(4).mockResolvedValueOnce(2);

    const defaults = await request(app).post('/api/admin/geocoding/requeue').send({});
    const supplied = await request(app)
      .post('/api/admin/geocoding/requeue')
      .send({ precision: 7, maxAttempts: 9 });

    expect(defaults.body).toEqual({ ok: true, count: 4, precision: 5, maxAttempts: 5 });
    expect(supplied.body).toEqual({ ok: true, count: 2, precision: 7, maxAttempts: 9 });
  });

  it('handles stats and requeue failures', async () => {
    geocodingCacheService.getGeocodingCacheStats.mockRejectedValueOnce(new Error('stats failed'));
    geocodingCacheService.requeueFailedGeocoding.mockRejectedValueOnce(new Error('requeue failed'));

    const stats = await request(app).get('/api/admin/geocoding/stats');
    const requeue = await request(app).post('/api/admin/geocoding/requeue').send({});

    expect(stats.status).toBe(500);
    expect(requeue.status).toBe(500);
  });
});
