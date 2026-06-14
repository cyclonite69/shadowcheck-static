import express from 'express';
import request from 'supertest';

const mockV2Service = {
  listNetworks: jest.fn(),
  getNetworkDetail: jest.fn(),
  getDashboardMetrics: jest.fn(),
  getThreatMapData: jest.fn(),
  getNetworksByBssids: jest.fn(),
  checkNetworksExist: jest.fn(),
};
const mockMediaService = {
  getNetworkMediaThumbnail: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  v2Service: mockV2Service,
  adminNetworkMediaService: mockMediaService,
}));

const app = express();
app.use(express.json());
app.use('/api', require('../../server/src/api/routes/v2/networks'));
app.use((error: Error, _req: any, res: any, _next: any) => {
  res.status(500).json({ error: error.message });
});

describe('v2 network routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes list query parameters', async () => {
    mockV2Service.listNetworks.mockResolvedValue({ rows: [], total: 0 });

    const response = await request(app).get(
      '/api/v2/networks?limit=9999&offset=-5&search=%20needle%20&sort=ssid&order=asc'
    );

    expect(response.status).toBe(200);
    expect(mockV2Service.listNetworks).toHaveBeenCalledWith({
      limit: 5000,
      offset: 0,
      search: 'needle',
      sort: 'ssid',
      order: 'ASC',
    });
  });

  it('normalizes detail BSSIDs', async () => {
    mockV2Service.getNetworkDetail.mockResolvedValue({ bssid: 'AA:BB:CC:DD:EE:FF' });

    const response = await request(app).get('/api/v2/networks/aa:bb:cc:dd:ee:ff');

    expect(response.status).toBe(200);
    expect(mockV2Service.getNetworkDetail).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
  });

  it('returns dashboard metrics', async () => {
    mockV2Service.getDashboardMetrics.mockResolvedValue({ total: 42 });

    const response = await request(app).get('/api/v2/dashboard/metrics');

    expect(response.body).toEqual({ total: 42 });
  });

  it('normalizes map filters', async () => {
    mockV2Service.getThreatMapData.mockResolvedValue([]);

    await request(app).get('/api/v2/threats/map?severity=%20HIGH%20&days=999');

    expect(mockV2Service.getThreatMapData).toHaveBeenCalledWith({
      severity: 'high',
      days: 180,
    });
  });

  it('returns a media thumbnail inline', async () => {
    mockMediaService.getNetworkMediaThumbnail.mockResolvedValue({
      thumbnail: Buffer.from('image'),
      mime_type: 'image/png',
    });

    const response = await request(app).get('/api/v2/networks/media/7/thumbnail');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image/png');
    expect(response.headers['content-disposition']).toBe('inline');
  });

  it('returns 404 when media is missing', async () => {
    mockMediaService.getNetworkMediaThumbnail.mockResolvedValue(null);

    const response = await request(app).get('/api/v2/networks/media/7/thumbnail');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Media not found');
  });

  it('returns 404 when a media record has no thumbnail', async () => {
    mockMediaService.getNetworkMediaThumbnail.mockResolvedValue({ thumbnail: null });

    const response = await request(app).get('/api/v2/networks/media/7/thumbnail');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Thumbnail not found');
  });

  it('passes service failures to error middleware', async () => {
    mockV2Service.getDashboardMetrics.mockRejectedValue(new Error('metrics failed'));

    const response = await request(app).get('/api/v2/dashboard/metrics');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('metrics failed');
  });
});
