import request from 'supertest';
import express from 'express';

// Mock container
jest.mock('../../../../server/src/config/container', () => ({
  exportService: {
    getObservationsForCSV: jest.fn(),
    getObservationsAndNetworksForJSON: jest.fn(),
    getFullDatabaseSnapshot: jest.fn(),
    getObservationsForGeoJSON: jest.fn(),
    getObservationsForKML: jest.fn(),
    generateKML: jest.fn(),
  },
}));

// Mock auth middleware
jest.mock('../../../../server/src/middleware/authMiddleware', () => ({
  requireAuth: (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

// Mock logger
jest.mock('../../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const container = require('../../../../server/src/config/container');
const exportRouter = require('../../../../server/src/api/routes/v1/export');

const app = express();
app.use(express.json());
app.use('/api/v1', exportRouter);

describe('Export API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/csv', () => {
    it('should return observations as CSV', async () => {
      const mockRows = [
        {
          bssid: 'AA:BB:CC:DD:EE:FF',
          ssid: 'Test SSID',
          latitude: 45.0,
          longitude: -75.0,
          signal_dbm: -60,
          observed_at: '2023-01-01T00:00:00Z',
          radio_type: 'W',
          frequency: 2412,
          capabilities: '[WPA2-PSK-CCMP][ESS]',
          accuracy: 10,
        },
      ];
      container.exportService.getObservationsForCSV.mockResolvedValue(mockRows);

      const res = await request(app).get('/api/v1/csv');

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.header['content-disposition']).toContain('attachment');
      expect(res.header['content-disposition']).toContain('.csv"');
      expect(res.text).toContain('bssid,ssid,latitude,longitude,signal_dbm,observed_at,radio_type,frequency,capabilities,accuracy');
      expect(res.text).toContain('AA:BB:CC:DD:EE:FF,Test SSID,45,-75,-60,2023-01-01T00:00:00Z,W,2412,[WPA2-PSK-CCMP][ESS],10');
    });

    it('should handle CSV values with commas', async () => {
      const mockRows = [
        {
          bssid: 'AA:BB:CC:DD:EE:FF',
          ssid: 'Comma, SSID',
          latitude: 45.0,
          longitude: -75.0,
          signal_dbm: -60,
          observed_at: '2023-01-01T00:00:00Z',
          radio_type: 'W',
          frequency: 2412,
          capabilities: '[WPA2-PSK-CCMP][ESS]',
          accuracy: 10,
        },
      ];
      container.exportService.getObservationsForCSV.mockResolvedValue(mockRows);

      const res = await request(app).get('/api/v1/csv');

      expect(res.status).toBe(200);
      expect(res.text).toContain('"Comma, SSID"');
    });

    it('should return 500 if export service fails', async () => {
      container.exportService.getObservationsForCSV.mockRejectedValue(new Error('DB Error'));

      const res = await request(app).get('/api/v1/csv');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('DB Error');
    });
  });

  describe('GET /api/v1/json', () => {
    it('should return observations and networks as JSON', async () => {
      const mockData = {
        observations: [{ bssid: 'AA:BB:CC:DD:EE:FF' }],
        networks: [{ bssid: 'AA:BB:CC:DD:EE:FF', ssid: 'Test SSID' }],
      };
      container.exportService.getObservationsAndNetworksForJSON.mockResolvedValue(mockData);

      const res = await request(app).get('/api/v1/json');

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/json');
      expect(res.header['content-disposition']).toContain('attachment');
      expect(res.header['content-disposition']).toContain('.json"');
      expect(res.body.total_observations).toBe(1);
      expect(res.body.observations).toHaveLength(1);
      expect(res.body.networks).toHaveLength(1);
    });

    it('should return 500 if export service fails', async () => {
      container.exportService.getObservationsAndNetworksForJSON.mockRejectedValue(new Error('DB Error'));

      const res = await request(app).get('/api/v1/json');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('DB Error');
    });
  });

  describe('GET /api/v1/json/full', () => {
    it('should return full database snapshot as JSON', async () => {
      const mockSnapshot = {
        tables: {
          networks: [{ bssid: 'AA:BB:CC:DD:EE:FF' }],
          observations: [{ id: 1 }],
        },
      };
      container.exportService.getFullDatabaseSnapshot.mockResolvedValue(mockSnapshot);

      const res = await request(app).get('/api/v1/json/full');

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/json');
      expect(res.header['content-disposition']).toContain('attachment');
      expect(res.header['content-disposition']).toContain('full_app_schema');
      expect(res.body).toEqual(mockSnapshot);
    });

    it('should return 500 if export service fails', async () => {
      container.exportService.getFullDatabaseSnapshot.mockRejectedValue(new Error('Access Denied'));

      const res = await request(app).get('/api/v1/json/full');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Access Denied');
    });
  });

  describe('GET /api/v1/geojson', () => {
    it('should return observations as GeoJSON', async () => {
      const mockRows = [
        {
          bssid: 'AA:BB:CC:DD:EE:FF',
          ssid: 'Test SSID',
          latitude: 45.0,
          longitude: -75.0,
          signal_dbm: -60,
          observed_at: '2023-01-01T00:00:00Z',
          radio_type: 'W',
          frequency: 2412,
          capabilities: '[WPA2-PSK-CCMP][ESS]',
          accuracy: 10,
        },
      ];
      container.exportService.getObservationsForGeoJSON.mockResolvedValue(mockRows);

      const res = await request(app).get('/api/v1/geojson');

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/json');
      expect(res.header['content-disposition']).toContain('geospatial');
      expect(res.body.type).toBe('FeatureCollection');
      expect(res.body.features).toHaveLength(1);
      expect(res.body.features[0].geometry.type).toBe('Point');
      expect(res.body.features[0].geometry.coordinates).toEqual([-75.0, 45.0]);
      expect(res.body.features[0].properties.bssid).toBe('AA:BB:CC:DD:EE:FF');
    });

    it('should return 500 if export service fails', async () => {
      container.exportService.getObservationsForGeoJSON.mockRejectedValue(new Error('Geo Error'));

      const res = await request(app).get('/api/v1/geojson');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Geo Error');
    });
  });

  describe('GET /api/v1/kml', () => {
    it('should return observations as KML for valid BSSIDs', async () => {
      const bssids = 'AA:BB:CC:DD:EE:FF,00:11:22:33:44:55';
      const mockObservations = [{ bssid: 'AA:BB:CC:DD:EE:FF', latitude: 45, longitude: -75 }];
      container.exportService.getObservationsForKML.mockResolvedValue(mockObservations);
      container.exportService.generateKML.mockReturnValue('<?xml version="1.0" encoding="UTF-8"?><kml>...</kml>');

      const res = await request(app).get('/api/v1/kml').query({ bssids });

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('application/vnd.google-earth.kml+xml');
      expect(res.header['content-disposition']).toContain('attachment');
      expect(res.header['content-disposition']).toContain('.kml"');
      expect(res.text).toBe('<?xml version="1.0" encoding="UTF-8"?><kml>...</kml>');
      expect(container.exportService.getObservationsForKML).toHaveBeenCalledWith(['AA:BB:CC:DD:EE:FF', '00:11:22:33:44:55']);
    });

    it('should return 400 if bssids parameter is missing', async () => {
      const res = await request(app).get('/api/v1/kml');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('bssids parameter is required');
    });

    it('should return 400 if no valid BSSIDs provided', async () => {
      const res = await request(app).get('/api/v1/kml').query({ bssids: 'invalid-bssid' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No valid BSSIDs provided');
    });

    it('should return 404 if no observations found', async () => {
      container.exportService.getObservationsForKML.mockResolvedValue([]);

      const res = await request(app).get('/api/v1/kml').query({ bssids: 'AA:BB:CC:DD:EE:FF' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No observations found for the specified networks');
    });

    it('should return 500 if export service fails', async () => {
      container.exportService.getObservationsForKML.mockRejectedValue(new Error('KML Error'));

      const res = await request(app).get('/api/v1/kml').query({ bssids: 'AA:BB:CC:DD:EE:FF' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('KML Error');
    });
  });
});
