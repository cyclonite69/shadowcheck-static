import express from 'express';
import request from 'supertest';

const secretsManager = {
  getSecret: jest.fn(),
};
const logger = {
  error: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  secretsManager,
}));

jest.mock('../../server/src/logging/logger', () => logger);

const router = require('../../server/src/api/routes/v1/geocoding').default;

const app = express();
app.use(express.json());
app.use('/api', router);

describe('geocoding routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('rejects requests without an address', async () => {
    const response = await request(app).post('/api/geocode').send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Address is required');
    expect(secretsManager.getSecret).not.toHaveBeenCalled();
  });

  it('returns an error when the Mapbox token is unavailable', async () => {
    secretsManager.getSecret.mockResolvedValueOnce('');

    const response = await request(app).post('/api/geocode').send({ address: 'Philadelphia' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Mapbox token not configured');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns normalized coordinates from the first Mapbox feature', async () => {
    secretsManager.getSecret.mockResolvedValueOnce('token');
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({
        features: [
          {
            center: [-75.1652, 39.9526],
            place_name: 'Philadelphia, Pennsylvania',
            relevance: 0.98,
          },
        ],
      }),
    });

    const response = await request(app)
      .post('/api/geocode')
      .send({ address: 'City Hall, Philadelphia' });

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('City%20Hall%2C%20Philadelphia.json?access_token=token&limit=1')
    );
    expect(response.body).toEqual({
      lat: 39.9526,
      lng: -75.1652,
      formatted_address: 'Philadelphia, Pennsylvania',
      confidence: 0.98,
    });
  });

  it('returns 404 when Mapbox has no matching feature', async () => {
    secretsManager.getSecret.mockResolvedValueOnce('token');
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: jest.fn().mockResolvedValue({ features: [] }),
    });

    const response = await request(app).post('/api/geocode').send({ address: 'missing' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Address not found');
  });

  it('logs and masks upstream failures', async () => {
    secretsManager.getSecret.mockResolvedValueOnce('token');
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network unavailable'));

    const response = await request(app).post('/api/geocode').send({ address: 'Philadelphia' });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Geocoding failed');
    expect(logger.error).toHaveBeenCalledWith(
      'Geocoding error: network unavailable',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
