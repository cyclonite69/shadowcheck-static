import express from 'express';
import request from 'supertest';

const networkService = {
  getManufacturerByBSSID: jest.fn(),
};
const networkListService = {
  listByManufacturer: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  networkService,
  networkListService,
}));

jest.mock('../../server/src/config/routeConfig', () => ({
  ROUTE_CONFIG: {
    explorer: { maxLimit: 5000 },
    networks: { maxOffset: 10000000 },
  },
}));

const manufacturerRouter = require('../../server/src/api/routes/v1/networks/manufacturer').default;

const app = express();
app.use('/api/networks', manufacturerRouter);
app.use((error: Error, _req: unknown, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: error.message });
});

describe('manufacturer routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid BSSIDs before service lookup', async () => {
    const response = await request(app).get(`/api/networks/manufacturer/${'A'.repeat(65)}`);

    expect(response.status).toBe(400);
    expect(networkService.getManufacturerByBSSID).not.toHaveBeenCalled();
  });

  it('returns an unknown manufacturer with a normalized prefix', async () => {
    networkService.getManufacturerByBSSID.mockResolvedValueOnce(null);

    const response = await request(app).get(
      '/api/networks/manufacturer/aa%3Abb%3Acc%3Add%3Aee%3Aff'
    );

    expect(response.status).toBe(200);
    expect(networkService.getManufacturerByBSSID).toHaveBeenCalledWith('AABBCC');
    expect(response.body).toEqual({
      ok: true,
      bssid: 'AA:BB:CC:DD:EE:FF',
      manufacturer: 'Unknown',
      prefix: 'AABBCC',
    });
  });

  it('returns known manufacturer metadata', async () => {
    networkService.getManufacturerByBSSID.mockResolvedValueOnce({
      manufacturer: 'Example Devices',
      address: 'Philadelphia, PA',
      prefix: 'AABBCC',
    });

    const response = await request(app).get(
      '/api/networks/manufacturer/AA%3ABB%3ACC%3ADD%3AEE%3AFF'
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      bssid: 'AA:BB:CC:DD:EE:FF',
      manufacturer: 'Example Devices',
      address: 'Philadelphia, PA',
      prefix: 'AABBCC',
    });
  });

  it('validates manufacturer network listing query parameters', async () => {
    const invalidSort = await request(app)
      .get('/api/networks/manufacturer/AA%3ABB%3ACC%3ADD%3AEE%3AFF/networks')
      .query({ sort: 'drop table' });
    const invalidLimit = await request(app)
      .get('/api/networks/manufacturer/AA%3ABB%3ACC%3ADD%3AEE%3AFF/networks')
      .query({ limit: 5001 });

    expect(invalidSort.status).toBe(400);
    expect(invalidLimit.status).toBe(400);
    expect(networkListService.listByManufacturer).not.toHaveBeenCalled();
  });

  it('forwards normalized pagination and sort values to the listing service', async () => {
    networkListService.listByManufacturer.mockResolvedValueOnce({
      rows: [{ bssid: 'AA:BB:CC:00:00:01' }],
      total: 12,
    });

    const response = await request(app)
      .get('/api/networks/manufacturer/AA%3ABB%3ACC%3ADD%3AEE%3AFF/networks')
      .query({ limit: 25, offset: 50, sort: 'SSID' });

    expect(response.status).toBe(200);
    expect(networkListService.listByManufacturer).toHaveBeenCalledWith('AABBCC', 25, 50, 'ssid');
    expect(response.body).toEqual({
      ok: true,
      prefix: 'AABBCC',
      count: 1,
      total: 12,
      networks: [{ bssid: 'AA:BB:CC:00:00:01' }],
    });
  });

  it('passes null pagination defaults and undefined sort', async () => {
    networkListService.listByManufacturer.mockResolvedValueOnce({ rows: [], total: 0 });

    const response = await request(app).get(
      '/api/networks/manufacturer/AA%3ABB%3ACC%3ADD%3AEE%3AFF/networks'
    );

    expect(response.status).toBe(200);
    expect(networkListService.listByManufacturer).toHaveBeenCalledWith(
      'AABBCC',
      null,
      null,
      undefined
    );
  });
});
