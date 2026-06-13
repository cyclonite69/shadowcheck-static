import express from 'express';
import request from 'supertest';

const networkTagService = {
  getTaggedNetworks: jest.fn(),
  checkNetworkExists: jest.fn(),
  deleteNetworkTag: jest.fn(),
  insertNetworkTag: jest.fn(),
  deleteNetworkTagReturning: jest.fn(),
  upsertThreatTag: jest.fn(),
};
const logger = {
  warn: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  networkService: {},
  networkTagService,
}));

jest.mock('../../server/src/logging/logger', () => ({
  __esModule: true,
  default: logger,
}));

const networkTagsRouter = require('../../server/src/api/routes/v1/networks/tags').default;

const app = express();
app.use(express.json());
app.use('/api', networkTagsRouter);
app.use((error: Error, _req: unknown, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: error.message });
});

describe('network classification tag routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists tagged networks with normalized output and pagination', async () => {
    networkTagService.getTaggedNetworks.mockResolvedValueOnce({
      rows: [
        {
          bssid: 'AA:BB:CC:DD:EE:FF',
          ssid: null,
          tag_type: 'THREAT',
          confidence: '0.85',
          notes: 'manual',
          tagged_at: '2026-06-01T00:00:00Z',
          updated_at: '2026-06-02T00:00:00Z',
        },
      ],
      totalCount: 11,
    });

    const response = await request(app).get('/api/networks/tagged').query({
      tag_type: 'THREAT',
      page: 2,
      limit: 10,
    });

    expect(response.status).toBe(200);
    expect(networkTagService.getTaggedNetworks).toHaveBeenCalledWith('THREAT', 10, 10);
    expect(response.body.networks[0]).toEqual(
      expect.objectContaining({ ssid: '<Hidden>', confidence: 0.85 })
    );
    expect(response.body.totalPages).toBe(2);
  });

  it.each([
    ['/api/networks/tagged', 'Valid tag_type is required'],
    ['/api/networks/tagged?tag_type=THREAT&page=0', 'Invalid page parameter'],
    ['/api/networks/tagged?tag_type=THREAT&limit=1001', 'Invalid limit parameter'],
  ])('rejects invalid tagged-network queries', async (url, error) => {
    const response = await request(app).get(url);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain(error);
  });

  it('tags an existing network after replacing its prior tag', async () => {
    networkTagService.checkNetworkExists.mockResolvedValueOnce(true);
    networkTagService.deleteNetworkTag.mockResolvedValueOnce(undefined);
    networkTagService.insertNetworkTag.mockResolvedValueOnce({ id: 7 });

    const response = await request(app).post('/api/tag-network').send({
      bssid: 'aa:bb:cc:dd:ee:ff',
      tag_type: 'THREAT',
      confidence: 85,
      notes: 'confirmed',
    });

    expect(response.status).toBe(200);
    expect(networkTagService.deleteNetworkTag).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    expect(networkTagService.insertNetworkTag).toHaveBeenCalledWith(
      'AA:BB:CC:DD:EE:FF',
      'THREAT',
      0.85,
      'confirmed'
    );
  });

  it.each([
    [{ bssid: 'bad!', tag_type: 'THREAT', confidence: 80 }, 'Invalid BSSID'],
    [{ bssid: 'AA:BB:CC:DD:EE:FF', tag_type: 'UNKNOWN', confidence: 80 }, 'Valid tag_type'],
    [{ bssid: 'AA:BB:CC:DD:EE:FF', tag_type: 'THREAT', confidence: 101 }, 'Confidence'],
    [
      { bssid: 'AA:BB:CC:DD:EE:FF', tag_type: 'THREAT', confidence: 80, notes: 123 },
      'Notes must be a string',
    ],
  ])('rejects invalid tag payloads', async (body, error) => {
    const response = await request(app).post('/api/tag-network').send(body);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain(error);
  });

  it('returns 404 when the network does not exist', async () => {
    networkTagService.checkNetworkExists.mockResolvedValueOnce(false);

    const response = await request(app).post('/api/tag-network').send({
      bssid: 'AA:BB:CC:DD:EE:FF',
      tag_type: 'THREAT',
      confidence: 80,
    });

    expect(response.status).toBe(404);
    expect(networkTagService.insertNetworkTag).not.toHaveBeenCalled();
  });

  it('removes an existing tag', async () => {
    networkTagService.deleteNetworkTagReturning.mockResolvedValueOnce(1);

    const response = await request(app).delete('/api/tag-network/aa:bb:cc:dd:ee:ff');

    expect(response.status).toBe(200);
    expect(response.body.bssid).toBe('AA:BB:CC:DD:EE:FF');
  });

  it('validates tag removal and reports missing tags', async () => {
    const invalid = await request(app).delete('/api/tag-network/not-a-mac');
    expect(invalid.status).toBe(400);

    networkTagService.deleteNetworkTagReturning.mockResolvedValueOnce(0);
    const missing = await request(app).delete('/api/tag-network/AA:BB:CC:DD:EE:FF');
    expect(missing.status).toBe(404);
  });

  it('bulk tags valid networks and isolates per-network failures', async () => {
    networkTagService.upsertThreatTag
      .mockResolvedValueOnce({ id: 1 })
      .mockRejectedValueOnce(new Error('write failed'));

    const response = await request(app).post('/api/networks/tag-threats').send({
      bssids: 'AA:BB:CC:DD:EE:01,AA:BB:CC:DD:EE:02',
      reason: 'manual review',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ successCount: 1, errorCount: 1 }));
    expect(logger.warn).toHaveBeenCalledWith('Failed to tag AA:BB:CC:DD:EE:02: write failed');
  });

  it.each([
    [{ bssids: [] }, 'BSSID list must be a non-empty string'],
    [{ bssids: 'bad!' }, 'Invalid BSSID'],
    [
      { bssids: 'AA:BB:CC:DD:EE:FF', reason: 'x'.repeat(513) },
      'Reason cannot exceed 512 characters',
    ],
  ])('rejects invalid bulk tagging payloads', async (body, error) => {
    const response = await request(app).post('/api/networks/tag-threats').send(body);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain(error);
  });
});
