import express from 'express';
import request from 'supertest';

const homeLocationService = {
  getAllLocationMarkers: jest.fn(),
  getHomeLocationMarker: jest.fn(),
  setHomeLocationMarker: jest.fn(),
  deleteHomeLocation: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  homeLocationService,
}));

jest.mock('../../server/src/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const locationMarkersRouter = require('../../server/src/api/routes/v1/location-markers');

const app = express();
app.use(express.json());
app.use('/api', locationMarkersRouter);

describe('Location Markers Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /location-markers', () => {
    it('returns all location markers', async () => {
      const mockMarkers = [{ id: 1, lat: 40.0, lng: -70.0 }];
      homeLocationService.getAllLocationMarkers.mockResolvedValueOnce(mockMarkers);

      const res = await request(app).get('/api/location-markers');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.markers).toEqual(mockMarkers);
      expect(homeLocationService.getAllLocationMarkers).toHaveBeenCalled();
    });
  });

  describe('GET /location-markers/home', () => {
    it('returns home location marker if it exists', async () => {
      const mockMarker = { id: 2, lat: 41.0, lng: -71.0, is_home: true };
      homeLocationService.getHomeLocationMarker.mockResolvedValueOnce(mockMarker);

      const res = await request(app).get('/api/location-markers/home');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.marker).toEqual(mockMarker);
    });

    it('returns null if home location marker does not exist', async () => {
      homeLocationService.getHomeLocationMarker.mockResolvedValueOnce(null);

      const res = await request(app).get('/api/location-markers/home');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.marker).toBeNull();
    });
  });

  describe('POST /location-markers/home', () => {
    it('updates home location successfully with valid inputs', async () => {
      const mockMarker = { lat: 42.0, lng: -72.0, is_home: true };
      homeLocationService.setHomeLocationMarker.mockResolvedValueOnce(mockMarker);

      const res = await request(app).post('/api/location-markers/home').send({
        latitude: '42.0',
        longitude: '-72.0',
        altitude_gps: '150.5',
        altitude_baro: '148.2',
        device_id: 'test-device',
        device_type: 'mobile',
      });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.marker).toEqual(mockMarker);
      expect(homeLocationService.setHomeLocationMarker).toHaveBeenCalledWith({
        lat: 42.0,
        lng: -72.0,
        altGps: 150.5,
        altBaro: 148.2,
        devId: 'test-device',
        devType: 'mobile',
      });
    });

    it('returns 400 if coordinates are missing', async () => {
      const res = await request(app).post('/api/location-markers/home').send({ latitude: '42.0' });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain('required');
    });

    it('returns 400 if coordinates are not numbers', async () => {
      const res = await request(app)
        .post('/api/location-markers/home')
        .send({ latitude: 'invalid', longitude: '-72.0' });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain('Invalid coordinates');
    });

    it('returns 400 if latitude is out of range', async () => {
      const res = await request(app)
        .post('/api/location-markers/home')
        .send({ latitude: '95.0', longitude: '-72.0' });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain('out of range');
    });
  });

  describe('DELETE /location-markers/home', () => {
    it('deletes home location', async () => {
      homeLocationService.deleteHomeLocation.mockResolvedValueOnce(undefined);

      const res = await request(app).delete('/api/location-markers/home');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(homeLocationService.deleteHomeLocation).toHaveBeenCalled();
    });
  });
});
