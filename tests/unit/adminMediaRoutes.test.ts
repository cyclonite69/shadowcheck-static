import express from 'express';
import request from 'supertest';

const adminNetworkMediaService = {
  uploadNetworkMedia: jest.fn(),
  getNetworkMediaList: jest.fn(),
  getNetworkMediaFile: jest.fn(),
};
const logger = {
  error: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  adminNetworkMediaService,
}));

jest.mock('../../server/src/logging/logger', () => logger);

const router = require('../../server/src/api/routes/v1/admin/media');

const app = express();
app.use(express.json());
app.use('/api', router);
app.use((error: Error, _req: unknown, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: error.message });
});

describe('admin media routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates required upload fields and media type', async () => {
    const missing = await request(app).post('/api/admin/network-media/upload').send({});
    const invalidType = await request(app).post('/api/admin/network-media/upload').send({
      bssid: 'AA:BB:CC:DD:EE:FF',
      media_type: 'document',
      filename: 'evidence.txt',
      media_data_base64: 'ZGF0YQ==',
    });

    expect(missing.status).toBe(400);
    expect(missing.body.error.message).toContain('required');
    expect(invalidType.status).toBe(400);
    expect(invalidType.body.error.message).toContain('image');
    expect(adminNetworkMediaService.uploadNetworkMedia).not.toHaveBeenCalled();
  });

  it('decodes and uploads media', async () => {
    adminNetworkMediaService.uploadNetworkMedia.mockResolvedValueOnce({ id: 7 });

    const response = await request(app)
      .post('/api/admin/network-media/upload')
      .send({
        bssid: 'AA:BB:CC:DD:EE:FF',
        media_type: 'image',
        filename: 'evidence.jpg',
        media_data_base64: Buffer.from('image-data').toString('base64'),
        description: 'front door',
        mime_type: 'image/jpeg',
      });

    expect(response.status).toBe(200);
    expect(adminNetworkMediaService.uploadNetworkMedia).toHaveBeenCalledWith(
      'AA:BB:CC:DD:EE:FF',
      'image',
      'evidence.jpg',
      10,
      'image/jpeg',
      Buffer.from('image-data'),
      'front door'
    );
    expect(response.body).toEqual({
      ok: true,
      message: 'image uploaded successfully',
      media: { id: 7 },
    });
  });

  it('logs upload failures and forwards them', async () => {
    adminNetworkMediaService.uploadNetworkMedia.mockRejectedValueOnce(new Error('write failed'));

    const response = await request(app).post('/api/admin/network-media/upload').send({
      bssid: 'AA:BB:CC:DD:EE:FF',
      media_type: 'video',
      filename: 'evidence.mp4',
      media_data_base64: 'ZGF0YQ==',
    });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('write failed');
    expect(logger.error).toHaveBeenCalledWith('Upload media error: write failed');
  });

  it('lists media for a network', async () => {
    adminNetworkMediaService.getNetworkMediaList.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

    const response = await request(app).get('/api/admin/network-media/AA%3ABB%3ACC%3ADD%3AEE%3AFF');

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(2);
    expect(adminNetworkMediaService.getNetworkMediaList).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
  });

  it('downloads media with attachment headers and handles missing media', async () => {
    adminNetworkMediaService.getNetworkMediaFile
      .mockResolvedValueOnce({
        filename: 'evidence.bin',
        mime_type: null,
        media_data: Buffer.from('full'),
      })
      .mockResolvedValueOnce(null);

    const found = await request(app).get('/api/admin/network-media/download/7');
    const missing = await request(app).get('/api/admin/network-media/download/8');

    expect(found.status).toBe(200);
    expect(found.headers['content-type']).toContain('application/octet-stream');
    expect(found.headers['content-disposition']).toBe('attachment; filename="evidence.bin"');
    expect(missing.status).toBe(404);
    expect(missing.body.error.message).toBe('Media not found');
  });

  it('serves a thumbnail inline when requested and falls back to full media', async () => {
    adminNetworkMediaService.getNetworkMediaFile
      .mockResolvedValueOnce({
        filename: 'evidence.jpg',
        mime_type: 'image/jpeg',
        media_data: Buffer.from('full'),
        thumbnail: Buffer.from('thumb'),
      })
      .mockResolvedValueOnce({
        filename: 'evidence.jpg',
        mime_type: null,
        media_data: Buffer.from('full'),
        thumbnail: null,
      })
      .mockResolvedValueOnce(null);

    const thumbnail = await request(app).get('/api/admin/network-media/7/inline?thumbnail=true');
    const full = await request(app).get('/api/admin/network-media/8/inline?thumbnail=true');
    const missing = await request(app).get('/api/admin/network-media/9/inline');

    expect(thumbnail.status).toBe(200);
    expect(thumbnail.body).toEqual(Buffer.from('thumb'));
    expect(thumbnail.headers['content-disposition']).toBe('inline');
    expect(full.headers['content-type']).toContain('image/jpeg');
    expect(full.body).toEqual(Buffer.from('full'));
    expect(missing.status).toBe(404);
  });

  it('forwards list and download service errors', async () => {
    adminNetworkMediaService.getNetworkMediaList.mockRejectedValueOnce(new Error('list failed'));
    adminNetworkMediaService.getNetworkMediaFile.mockRejectedValueOnce(new Error('read failed'));

    const list = await request(app).get('/api/admin/network-media/test');
    const download = await request(app).get('/api/admin/network-media/download/7');

    expect(list.status).toBe(500);
    expect(list.body.error).toBe('list failed');
    expect(download.status).toBe(500);
    expect(download.body.error).toBe('read failed');
  });
});
