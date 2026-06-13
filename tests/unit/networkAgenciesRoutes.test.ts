import express from 'express';
import request from 'supertest';

const agencyService = {
  getNearestAgenciesToNetwork: jest.fn(),
  getNearestAgenciesToNetworksBatch: jest.fn(),
};
const courthouseService = {
  getNearestCourthousesBatch: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  agencyService,
  courthouseService,
}));

const router = require('../../server/src/api/routes/v1/network-agencies');

const app = express();
app.use(express.json());
app.use('/api/networks', router);
app.use((error: Error, _req: unknown, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: error.message });
});

describe('network agencies routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns nearest agencies using the default radius', async () => {
    agencyService.getNearestAgenciesToNetwork.mockResolvedValueOnce([{ id: 1 }]);

    const response = await request(app).get(
      '/api/networks/nearest-agencies/AA%3ABB%3ACC%3ADD%3AEE%3AFF'
    );

    expect(response.status).toBe(200);
    expect(agencyService.getNearestAgenciesToNetwork).toHaveBeenCalledWith(
      'AA:BB:CC:DD:EE:FF',
      250
    );
    expect(response.body).toEqual({
      ok: true,
      bssid: 'AA:BB:CC:DD:EE:FF',
      agencies: [{ id: 1 }],
      count: 1,
      radius_km: 250,
    });
  });

  it('normalizes batch BSSIDs and accepts a custom radius', async () => {
    agencyService.getNearestAgenciesToNetworksBatch.mockResolvedValueOnce([{ id: 2 }]);

    const response = await request(app)
      .post('/api/networks/nearest-agencies/batch?radius=75.5')
      .send({ bssids: ['aa:bb:cc:dd:ee:ff', 123] });

    expect(response.status).toBe(200);
    expect(agencyService.getNearestAgenciesToNetworksBatch).toHaveBeenCalledWith(
      ['AA:BB:CC:DD:EE:FF', '123'],
      75.5
    );
    expect(response.body.count).toBe(1);
    expect(response.body.radius_km).toBe(75.5);
  });

  it.each([
    ['/nearest-agencies/batch', undefined],
    ['/nearest-agencies/batch', []],
    ['/nearest-courthouses/batch', 'not-an-array'],
  ])('rejects invalid batch input for %s', async (path, bssids) => {
    const response = await request(app).post(`/api/networks${path}`).send({ bssids });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('bssids array is required');
  });

  it('returns nearest courthouses with an invalid radius falling back to the default', async () => {
    courthouseService.getNearestCourthousesBatch.mockResolvedValueOnce([{ id: 3 }]);

    const response = await request(app)
      .post('/api/networks/nearest-courthouses/batch?radius=invalid')
      .send({ bssids: ['aa:bb:cc:dd:ee:ff'] });

    expect(response.status).toBe(200);
    expect(courthouseService.getNearestCourthousesBatch).toHaveBeenCalledWith(
      ['AA:BB:CC:DD:EE:FF'],
      250
    );
    expect(response.body.courthouses).toEqual([{ id: 3 }]);
  });

  it('forwards service errors to error middleware', async () => {
    agencyService.getNearestAgenciesToNetwork.mockRejectedValueOnce(new Error('lookup failed'));

    const response = await request(app).get('/api/networks/nearest-agencies/test');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('lookup failed');
  });
});
