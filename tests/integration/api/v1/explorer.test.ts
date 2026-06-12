import request from 'supertest';
import express from 'express';

// Define mock container
const mockContainer = {
  explorerService: {
    listNetworks: jest.fn(),
    listNetworksV2: jest.fn(),
    getNetworkByBssid: jest.fn(),
    checkHomeLocationForFilters: jest.fn(),
  },
  homeLocationService: {
    getHomeLocation: jest.fn(),
  },
  dataQualityFilters: {},
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

const explorerRouter = require('../../../../server/src/api/routes/v1/explorer/index');

const app = express();
app.use(express.json());
app.use('/api', explorerRouter);

describe('Explorer API v1', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockContainer.explorerService.listNetworks.mockResolvedValue({
      total: 1,
      rows: [
        {
          bssid: '00:11:22:33:44:55',
          ssid: 'TestNet',
          observed_at: new Date().toISOString(),
        },
      ],
    });

    mockContainer.explorerService.listNetworksV2.mockResolvedValue({
      total: 1,
      rows: [
        {
          bssid: '00:11:22:33:44:55',
          ssid: 'TestNet',
        },
      ],
    });

    mockContainer.explorerService.getNetworkByBssid.mockResolvedValue({
      bssid: '00:11:22:33:44:55',
      ssid: 'TestNet',
    });

    mockContainer.explorerService.checkHomeLocationForFilters.mockResolvedValue(true);

    mockContainer.homeLocationService.getHomeLocation.mockResolvedValue({
      lat: 45.0,
      lon: -75.0,
      radius_meters: 1000,
    });
  });

  describe('GET /api/explorer/networks', () => {
    it('should list networks for legacy endpoint', async () => {
      const res = await request(app).get('/api/explorer/networks');

      expect(res.status).toBe(200);
      expect(res.body.rows).toBeDefined();
      expect(res.body.rows[0].bssid).toBe('00:11:22:33:44:55');
    });
  });

  describe('GET /api/explorer/networks-v2', () => {
    it('should list networks for v2 endpoint', async () => {
      const res = await request(app).get('/api/explorer/networks-v2');

      expect(res.status).toBe(200);
      expect(res.body.rows).toBeDefined();
    });
  });

  describe('GET /api/explorer/network/:bssid', () => {
    it('should get a single network by BSSID', async () => {
      const res = await request(app).get('/api/explorer/network/00:11:22:33:44:55');

      expect(res.status).toBe(200);
      expect(res.body.bssid).toBe('00:11:22:33:44:55');
    });

    it('should return 404 if network not found', async () => {
      mockContainer.explorerService.getNetworkByBssid.mockResolvedValue(null);
      const res = await request(app).get('/api/explorer/network/00:00:00:00:00:00');
      expect(res.status).toBe(404);
    });
  });
});
