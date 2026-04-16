import request from 'supertest';
import express from 'express';

// Define mock container
const mockContainer = {
  observationService: {
    getHomeLocationForObservations: jest.fn(),
    getObservationsByBSSID: jest.fn().mockResolvedValue([]), // Default to empty array
    checkWigleTableExists: jest.fn(),
    getWigleObservationsByBSSID: jest.fn().mockResolvedValue([]),
    getOurObservationCount: jest.fn().mockResolvedValue(0),
    getWigleObservationsBatch: jest.fn().mockResolvedValue([]),
  },
};

// Mock the container
jest.mock('../../../../server/src/config/container', () => mockContainer);

// Mock logger
jest.mock('../../../../server/src/logging/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

// Use commonjs require and handle possible .default from ts-node/esm
const observationsModule = require('../../../../server/src/api/routes/v1/networks/observations');
const observationsRouter = observationsModule.default || observationsModule;

const app = express();
app.use(express.json());
// Mounted at /api
app.use('/api', observationsRouter);

describe('Observations API v1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply defaults after clear
    mockContainer.observationService.getObservationsByBSSID.mockResolvedValue([]);
  });

  describe('GET /api/networks/observations/:bssid', () => {
    it('should return observations for a valid BSSID', async () => {
      const bssid = '00:11:22:33:44:55';
      const mockHome = { lon: -122.4194, lat: 37.7749 };
      const mockObservations = [
        { id: 1, bssid, ssid: 'TestNet', lat: 37.775, lon: -122.419, level: -50, time: 1600000000000 }
      ];

      mockContainer.observationService.getHomeLocationForObservations.mockResolvedValue(mockHome);
      mockContainer.observationService.getObservationsByBSSID.mockResolvedValue(mockObservations);

      const res = await request(app).get(`/api/networks/observations/${bssid}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.bssid).toBe(bssid);
      expect(res.body.observations).toEqual(mockObservations);
      expect(res.body.home).toEqual(mockHome);
    });

    it('should return 400 for truly invalid BSSID', async () => {
      // Use characters that fail both MAC and alphanumeric validation
      const res = await request(app).get('/api/networks/observations/invalid!bssid');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/networks/:bssid/wigle-observations', () => {
    it('should return WiGLE observations when table exists', async () => {
      const bssid = '00:11:22:33:44:55';
      const mockWigleObs = [
        {
          bssid,
          lat: 37.775,
          lon: -122.419,
          time: 1600000000000,
          level: -60,
          ssid: 'TestNet',
          is_matched: true,
          distance_from_our_center_m: 2.5
        }
      ];

      mockContainer.observationService.checkWigleTableExists.mockResolvedValue(true);
      mockContainer.observationService.getWigleObservationsByBSSID.mockResolvedValue(mockWigleObs);
      mockContainer.observationService.getOurObservationCount.mockResolvedValue(5);

      const res = await request(app).get(`/api/networks/${bssid}/wigle-observations`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.stats.wigle_total).toBe(1);
    });
  });
});
