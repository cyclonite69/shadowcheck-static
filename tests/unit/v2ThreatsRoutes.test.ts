import express from 'express';
import request from 'supertest';

const v2Service = {
  getThreatSeverityCounts: jest.fn(),
};
const logger = {
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  v2Service,
}));

jest.mock('../../server/src/logging/logger', () => logger);

const router = require('../../server/src/api/routes/v2/threats');

const app = express();
app.use('/api/v2', router);

describe('v2 threats routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes parsed filters and enabled state to the service', async () => {
    const counts = { HIGH: { unique_networks: 2 } };
    v2Service.getThreatSeverityCounts.mockResolvedValueOnce(counts);

    const response = await request(app)
      .get('/api/v2/threats/severity-counts')
      .query({
        filters: JSON.stringify({ threatCategories: ['HIGH'] }),
        enabled: JSON.stringify({ threatCategories: true }),
      });

    expect(response.status).toBe(200);
    expect(v2Service.getThreatSeverityCounts).toHaveBeenCalledWith(
      { threatCategories: ['HIGH'] },
      { threatCategories: true }
    );
    expect(response.body).toEqual({ counts });
  });

  it('uses empty objects and warns for malformed JSON', async () => {
    v2Service.getThreatSeverityCounts.mockResolvedValueOnce({});

    const response = await request(app)
      .get('/api/v2/threats/severity-counts')
      .query({ filters: '{bad', enabled: '[bad' });

    expect(response.status).toBe(200);
    expect(v2Service.getThreatSeverityCounts).toHaveBeenCalledWith({}, {});
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('uses empty objects when query parameters are omitted', async () => {
    v2Service.getThreatSeverityCounts.mockResolvedValueOnce({ NONE: 1 });

    const response = await request(app).get('/api/v2/threats/severity-counts');

    expect(response.status).toBe(200);
    expect(v2Service.getThreatSeverityCounts).toHaveBeenCalledWith({}, {});
  });

  it('returns the service error message and logs context', async () => {
    v2Service.getThreatSeverityCounts.mockRejectedValueOnce(new Error('count failed'));

    const response = await request(app).get('/api/v2/threats/severity-counts');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('count failed');
    expect(logger.error).toHaveBeenCalledWith(
      'Threat severity counts error: count failed',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
