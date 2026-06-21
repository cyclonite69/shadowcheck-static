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
  getNetworkMediaFile: jest.fn(),
  getNetworkMediaThumbnail: jest.fn(),
  getRelatedNetworkMediaForBssid: jest.fn(),
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

  it('returns full media inline under the v2 user route', async () => {
    mockMediaService.getNetworkMediaFile.mockResolvedValue({
      media_data: Buffer.from('full-image'),
      mime_type: 'image/jpeg',
    });

    const response = await request(app).get('/api/v2/networks/media/7/inline');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image/jpeg');
    expect(response.headers['content-disposition']).toBe('inline');
    expect(mockMediaService.getNetworkMediaFile).toHaveBeenCalledWith('7');
  });

  it('returns 404 when full media is missing', async () => {
    mockMediaService.getNetworkMediaFile.mockResolvedValue(null);

    const response = await request(app).get('/api/v2/networks/media/7/inline');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Media not found');
  });

  it('returns 404 when a media record has no full data', async () => {
    mockMediaService.getNetworkMediaFile.mockResolvedValue({ media_data: null });

    const response = await request(app).get('/api/v2/networks/media/7/inline');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Media data not found');
  });

  it('passes service failures to error middleware', async () => {
    mockV2Service.getDashboardMetrics.mockRejectedValue(new Error('metrics failed'));

    const response = await request(app).get('/api/v2/dashboard/metrics');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('metrics failed');
  });

  describe('GET /api/v2/networks/:bssid/media', () => {
    const BSSID = 'AA:BB:CC:DD:EE:FF';
    const directRow = {
      id: 11,
      requested_bssid: BSSID,
      source_bssid: BSSID,
      observation_id: null,
      media_type: 'image',
      filename: '20260602_202827.jpg',
      mime_type: 'image/jpeg',
      file_size: 14506231,
      created_at: '2026-06-12T14:41:59.354Z',
      exif_captured_at: null,
      is_direct: true,
      source_kind: 'direct',
    };

    test('returns media list with provenance and URL fields', async () => {
      mockMediaService.getRelatedNetworkMediaForBssid.mockResolvedValue([directRow]);

      const res = await request(app).get(`/api/v2/networks/${BSSID}/media`);

      expect(res.status).toBe(200);
      expect(res.body.bssid).toBe(BSSID);
      expect(res.body.count).toBe(1);
      const item = res.body.media[0];
      expect(item.id).toBe(11);
      expect(item.source_bssid).toBe(BSSID);
      expect(item.is_direct).toBe(true);
      expect(item.source_kind).toBe('direct');
      expect(item.thumbnail_url).toBe('/api/v2/networks/media/11/thumbnail');
      expect(item.inline_url).toBe('/api/v2/networks/media/11/inline');
      expect(item).not.toHaveProperty('media_data');
    });

    test('normalises BSSID to uppercase', async () => {
      mockMediaService.getRelatedNetworkMediaForBssid.mockResolvedValue([]);

      await request(app).get('/api/v2/networks/aa:bb:cc:dd:ee:ff/media');

      expect(mockMediaService.getRelatedNetworkMediaForBssid).toHaveBeenCalledWith(BSSID);
    });

    test('returns empty media array with count 0 when no media exists', async () => {
      mockMediaService.getRelatedNetworkMediaForBssid.mockResolvedValue([]);

      const res = await request(app).get(`/api/v2/networks/${BSSID}/media`);

      expect(res.status).toBe(200);
      expect(res.body.media).toEqual([]);
      expect(res.body.count).toBe(0);
    });

    test('includes component-sourced row with correct labels', async () => {
      const componentRow = {
        ...directRow,
        id: 42,
        source_bssid: 'BB:CC:DD:EE:FF:00',
        is_direct: false,
        source_kind: 'component',
        observation_id: 7,
      };
      mockMediaService.getRelatedNetworkMediaForBssid.mockResolvedValue([directRow, componentRow]);

      const res = await request(app).get(`/api/v2/networks/${BSSID}/media`);

      expect(res.body.count).toBe(2);
      const comp = res.body.media.find((m: any) => m.id === 42);
      expect(comp.source_kind).toBe('component');
      expect(comp.source_bssid).toBe('BB:CC:DD:EE:FF:00');
      expect(comp.observation_id).toBe(7);
      expect(comp.is_direct).toBe(false);
    });

    test('does not expose binary media_data in response', async () => {
      const rowWithBinary = { ...directRow, media_data: Buffer.from('raw') };
      mockMediaService.getRelatedNetworkMediaForBssid.mockResolvedValue([rowWithBinary]);

      const res = await request(app).get(`/api/v2/networks/${BSSID}/media`);

      expect(res.body.media[0]).not.toHaveProperty('media_data');
    });
  });
});
