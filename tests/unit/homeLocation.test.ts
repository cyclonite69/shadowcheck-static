import request from 'supertest';
import express from 'express';

jest.mock('../../server/src/config/container', () => ({
  homeLocationService: {
    getCurrentHomeLocation: jest.fn(),
    setHomeLocation: jest.fn(),
  },
}));

jest.mock('../../server/src/middleware/authMiddleware', () => ({
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

const { homeLocationService } = require('../../server/src/config/container');
const homeLocationRouter = require('../../server/src/api/routes/v1/home-location');

const app = express();
app.use(express.json());
app.use('/api', homeLocationRouter);

describe('homeLocation routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/home-location', () => {
    it('should return 404 if no home configured', async () => {
      homeLocationService.getCurrentHomeLocation.mockResolvedValueOnce(null);
      const res = await request(app).get('/api/home-location');
      expect(res.status).toBe(404);
    });

    it('should return location if configured', async () => {
      homeLocationService.getCurrentHomeLocation.mockResolvedValueOnce({
        latitude: 1,
        longitude: 2,
        radius: 100,
        created_at: '2026-01-01',
      });
      const res = await request(app).get('/api/home-location');
      expect(res.status).toBe(200);
      expect(res.body.latitude).toBe(1);
    });
  });

  describe('GET /api/admin/home-location', () => {
    it('should return 404 if no home configured', async () => {
      homeLocationService.getCurrentHomeLocation.mockResolvedValueOnce(null);
      const res = await request(app).get('/api/admin/home-location');
      expect(res.status).toBe(404);
    });

    it('should return location if configured', async () => {
      homeLocationService.getCurrentHomeLocation.mockResolvedValueOnce({
        latitude: 1,
        longitude: 2,
        radius: 100,
        created_at: '2026-01-01',
      });
      const res = await request(app).get('/api/admin/home-location');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/admin/home-location', () => {
    it('should reject invalid coordinates', async () => {
      const res = await request(app)
        .post('/api/admin/home-location')
        .send({ latitude: 100, longitude: 0 });
      expect(res.status).toBe(400);
    });

    it('should save location', async () => {
      const res = await request(app)
        .post('/api/admin/home-location')
        .send({ latitude: 10, longitude: 20, radius: 50 });
      expect(res.status).toBe(200);
      expect(homeLocationService.setHomeLocation).toHaveBeenCalledWith(10, 20, 50);
    });
  });
});
