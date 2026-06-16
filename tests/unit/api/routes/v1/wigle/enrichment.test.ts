import request from 'supertest';
import express, { Router } from 'express';

// Mock WiGLE enrichment service
const mockWigleEnrichmentService = {
  enrichNetworkWithWigleData: jest.fn(),
};

jest.mock('../../../../../server/src/services', () => ({
  wigleEnrichmentService: mockWigleEnrichmentService,
}));

// Create test app
const app = express();
app.use(express.json());

const enrichmentRouter = Router();

enrichmentRouter.post('/network/:bssid', async (req, res, next) => {
  try {
    const { bssid } = req.params;
    const { force } = req.body;

    if (!bssid) {
      return res.status(400).json({ ok: false, error: 'BSSID required' });
    }

    const result = await mockWigleEnrichmentService.enrichNetworkWithWigleData(bssid, {
      force: !!force,
    });

    if (!result) {
      return res.status(404).json({ ok: false, error: 'Network not found' });
    }

    res.json({ ok: true, enriched: result });
  } catch (error: any) {
    if (error?.status === 403) {
      return res.status(403).json({ ok: false, error: error.message, code: 'FORBIDDEN' });
    }
    if (error?.status === 409) {
      return res.status(409).json({ ok: false, error: error.message, code: 'CONFLICT' });
    }
    next(error);
  }
});

app.use('/enrichment', enrichmentRouter);

describe('wigle enrichment route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enriches network with WiGLE data', async () => {
    mockWigleEnrichmentService.enrichNetworkWithWigleData.mockResolvedValue({
      bssid: 'aa:bb:cc:dd:ee:ff',
      wigleData: { firsttime: 1234567890, lasttime: 1234567890 },
    });

    const response = await request(app)
      .post('/enrichment/network/aa:bb:cc:dd:ee:ff')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.enriched).toBeDefined();
  });

  it('returns 400 when BSSID is missing', async () => {
    const response = await request(app).post('/enrichment/network/').send({});

    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
  });

  it('returns 404 when network not found', async () => {
    mockWigleEnrichmentService.enrichNetworkWithWigleData.mockResolvedValue(null);

    const response = await request(app)
      .post('/enrichment/network/aa:bb:cc:dd:ee:ff')
      .send({});

    expect(response.status).toBe(404);
    expect(response.body.ok).toBe(false);
  });

  it('returns 403 for forbidden enrichment', async () => {
    const error: any = new Error('Enrichment forbidden');
    error.status = 403;
    mockWigleEnrichmentService.enrichNetworkWithWigleData.mockRejectedValue(error);

    const response = await request(app)
      .post('/enrichment/network/aa:bb:cc:dd:ee:ff')
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('returns 409 for enrichment conflict', async () => {
    const error: any = new Error('Enrichment conflict');
    error.status = 409;
    mockWigleEnrichmentService.enrichNetworkWithWigleData.mockRejectedValue(error);

    const response = await request(app)
      .post('/enrichment/network/aa:bb:cc:dd:ee:ff')
      .send({});

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('CONFLICT');
  });

  it('passes force flag to service', async () => {
    mockWigleEnrichmentService.enrichNetworkWithWigleData.mockResolvedValue({});

    await request(app)
      .post('/enrichment/network/aa:bb:cc:dd:ee:ff')
      .send({ force: true });

    expect(mockWigleEnrichmentService.enrichNetworkWithWigleData).toHaveBeenCalledWith(
      'aa:bb:cc:dd:ee:ff',
      { force: true }
    );
  });

  it('handles service errors', async () => {
    mockWigleEnrichmentService.enrichNetworkWithWigleData.mockRejectedValue(
      new Error('Service error')
    );

    const response = await request(app)
      .post('/enrichment/network/aa:bb:cc:dd:ee:ff')
      .send({});

    expect(response.status).toBeGreaterThanOrEqual(500);
  });
});
