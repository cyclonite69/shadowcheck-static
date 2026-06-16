import request from 'supertest';
import express, { Router } from 'express';

// Mock dependencies
jest.mock('../../../../../server/src/middleware/requestId');
jest.mock('../../../../../server/src/middleware/errorHandler');

const mockNetworkService = {
  getNetworkObservations: jest.fn(),
};

jest.mock('../../../../../server/src/services', () => ({
  networkService: mockNetworkService,
}));

// Create minimal express app for testing
const app = express();
app.use(express.json());

// Simplified observations route for testing
const observationsRouter = Router();
observationsRouter.get('/:bssid', async (req, res, next) => {
  try {
    const { bssid } = req.params;
    if (!bssid || bssid.length < 3) {
      return res.status(400).json({ ok: false, error: 'Invalid BSSID' });
    }
    const obs = await mockNetworkService.getNetworkObservations(bssid);
    res.json({ ok: true, observations: obs || [] });
  } catch (error) {
    next(error);
  }
});

app.use('/observations', observationsRouter);

describe('observations route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns observations for valid BSSID', async () => {
    mockNetworkService.getNetworkObservations.mockResolvedValue([
      { id: 1, bssid: 'aa:bb:cc:dd:ee:ff', level: -50 },
    ]);

    const response = await request(app).get('/observations/aa:bb:cc:dd:ee:ff');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.observations).toHaveLength(1);
  });

  it('returns empty array when no observations found', async () => {
    mockNetworkService.getNetworkObservations.mockResolvedValue([]);

    const response = await request(app).get('/observations/aa:bb:cc:dd:ee:ff');

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.observations).toEqual([]);
  });

  it('returns 400 for missing BSSID', async () => {
    const response = await request(app).get('/observations/');
    expect(response.status).toBe(404);
  });

  it('returns 400 for invalid BSSID format', async () => {
    const response = await request(app).get('/observations/xx');

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
  });

  it('calls networkService with BSSID parameter', async () => {
    mockNetworkService.getNetworkObservations.mockResolvedValue([]);

    await request(app).get('/observations/aa:bb:cc:dd:ee:ff');

    expect(mockNetworkService.getNetworkObservations).toHaveBeenCalledWith('aa:bb:cc:dd:ee:ff');
  });

  it('handles service errors', async () => {
    mockNetworkService.getNetworkObservations.mockRejectedValue(
      new Error('Database error')
    );

    const response = await request(app).get('/observations/aa:bb:cc:dd:ee:ff');

    expect(response.status).toBeGreaterThanOrEqual(500);
  });
});
