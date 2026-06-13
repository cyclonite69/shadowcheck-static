import express from 'express';
import request from 'supertest';

const adminNetworkTagsService = {
  getNetworkTagsByBssid: jest.fn(),
  insertNetworkTagWithNotes: jest.fn(),
  removeTagFromNetwork: jest.fn(),
  addTagToNetwork: jest.fn(),
  getNetworkTagsAndNotes: jest.fn(),
  searchNetworksByTagArray: jest.fn(),
  getNetworkTagsExpanded: jest.fn(),
};

const logger = {
  error: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  adminNetworkTagsService,
}));

jest.mock('../../server/src/logging/logger', () => logger);

const tagsRouter = require('../../server/src/api/routes/v1/admin/tags');

const app = express();
app.use(express.json());
app.use('/api', tagsRouter);
app.use((error: Error, _req: unknown, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: error.message });
});

describe('admin tags routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /admin/network-tags/toggle', () => {
    it('returns 400 if bssid or tag is missing', async () => {
      const res = await request(app).post('/api/admin/network-tags/toggle').send({ bssid: 'A' });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('BSSID and tag are required');
    });

    it('returns 400 if tag is invalid', async () => {
      const res = await request(app)
        .post('/api/admin/network-tags/toggle')
        .send({ bssid: 'A', tag: 'INVALID_TAG' });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid tag. Must be one of:');
    });

    it('creates tag if network does not exist with tags', async () => {
      adminNetworkTagsService.getNetworkTagsByBssid.mockResolvedValueOnce(null);
      adminNetworkTagsService.insertNetworkTagWithNotes.mockResolvedValueOnce(undefined);
      adminNetworkTagsService.getNetworkTagsAndNotes.mockResolvedValueOnce({
        rows: [{ bssid: 'A', tags: ['THREAT'] }],
      });

      const res = await request(app)
        .post('/api/admin/network-tags/toggle')
        .send({ bssid: 'A', tag: 'THREAT', notes: 'some notes' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.action).toBe('added');
      expect(adminNetworkTagsService.insertNetworkTagWithNotes).toHaveBeenCalledWith(
        'A',
        ['THREAT'],
        'some notes'
      );
    });

    it('removes tag if tag is already present', async () => {
      adminNetworkTagsService.getNetworkTagsByBssid.mockResolvedValueOnce({ tags: ['THREAT'] });
      adminNetworkTagsService.removeTagFromNetwork.mockResolvedValueOnce(undefined);
      adminNetworkTagsService.getNetworkTagsAndNotes.mockResolvedValueOnce({
        rows: [{ bssid: 'A', tags: [] }],
      });

      const res = await request(app)
        .post('/api/admin/network-tags/toggle')
        .send({ bssid: 'A', tag: 'THREAT' });

      expect(res.status).toBe(200);
      expect(res.body.action).toBe('removed');
      expect(adminNetworkTagsService.removeTagFromNetwork).toHaveBeenCalledWith('A', 'THREAT');
    });

    it('adds tag if tag is not present on existing network', async () => {
      adminNetworkTagsService.getNetworkTagsByBssid.mockResolvedValueOnce({
        tags: ['INVESTIGATE'],
      });
      adminNetworkTagsService.addTagToNetwork.mockResolvedValueOnce(undefined);
      adminNetworkTagsService.getNetworkTagsAndNotes.mockResolvedValueOnce({
        rows: [{ bssid: 'A', tags: ['INVESTIGATE', 'THREAT'] }],
      });

      const res = await request(app)
        .post('/api/admin/network-tags/toggle')
        .send({ bssid: 'A', tag: 'THREAT', notes: 'threat notes' });

      expect(res.status).toBe(200);
      expect(res.body.action).toBe('added');
      expect(adminNetworkTagsService.addTagToNetwork).toHaveBeenCalledWith(
        'A',
        'THREAT',
        'threat notes'
      );
    });

    it('forwards error on failure', async () => {
      adminNetworkTagsService.getNetworkTagsByBssid.mockRejectedValueOnce(
        new Error('db toggle error')
      );
      const res = await request(app)
        .post('/api/admin/network-tags/toggle')
        .send({ bssid: 'A', tag: 'THREAT' });
      expect(res.status).toBe(500);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('DELETE /admin/network-tags/remove', () => {
    it('returns 400 if bssid or tag is missing', async () => {
      const res = await request(app)
        .delete('/api/admin/network-tags/remove')
        .send({ tag: 'THREAT' });
      expect(res.status).toBe(400);
    });

    it('removes tag successfully', async () => {
      adminNetworkTagsService.removeTagFromNetwork.mockResolvedValueOnce(undefined);
      adminNetworkTagsService.getNetworkTagsAndNotes.mockResolvedValueOnce({
        bssid: 'A',
        tags: [],
      });

      const res = await request(app)
        .delete('/api/admin/network-tags/remove')
        .send({ bssid: 'A', tag: 'THREAT' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(adminNetworkTagsService.removeTagFromNetwork).toHaveBeenCalledWith('A', 'THREAT');
    });

    it('forwards error on failure', async () => {
      adminNetworkTagsService.removeTagFromNetwork.mockRejectedValueOnce(
        new Error('db remove error')
      );
      const res = await request(app)
        .delete('/api/admin/network-tags/remove')
        .send({ bssid: 'A', tag: 'THREAT' });
      expect(res.status).toBe(500);
    });
  });

  describe('GET /admin/network-tags/search', () => {
    it('returns 400 if tags query param is missing or empty', async () => {
      const res = await request(app).get('/api/admin/network-tags/search');
      expect(res.status).toBe(400);
    });

    it('returns 400 if limit query param is out of bounds', async () => {
      const res = await request(app)
        .get('/api/admin/network-tags/search')
        .query({ tags: 'THREAT', limit: 2000 });
      expect(res.status).toBe(400);
    });

    it('returns networks matching tags', async () => {
      adminNetworkTagsService.searchNetworksByTagArray.mockResolvedValueOnce([{ bssid: 'A' }]);

      const res = await request(app)
        .get('/api/admin/network-tags/search')
        .query({ tags: 'THREAT, SUSPECT', limit: 100 });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.networks).toEqual([{ bssid: 'A' }]);
      expect(adminNetworkTagsService.searchNetworksByTagArray).toHaveBeenCalledWith(
        ['THREAT', 'SUSPECT'],
        100
      );
    });

    it('forwards error on failure', async () => {
      adminNetworkTagsService.searchNetworksByTagArray.mockRejectedValueOnce(
        new Error('db search error')
      );
      const res = await request(app)
        .get('/api/admin/network-tags/search')
        .query({ tags: 'THREAT' });
      expect(res.status).toBe(500);
    });
  });

  describe('GET /admin/network-tags/:bssid', () => {
    it('returns 404 if network is not found', async () => {
      adminNetworkTagsService.getNetworkTagsExpanded.mockResolvedValueOnce(null);
      const res = await request(app).get('/api/admin/network-tags/A');
      expect(res.status).toBe(404);
    });

    it('returns network tag details', async () => {
      adminNetworkTagsService.getNetworkTagsExpanded.mockResolvedValueOnce({
        bssid: 'A',
        tags: ['THREAT'],
      });
      const res = await request(app).get('/api/admin/network-tags/A');
      expect(res.status).toBe(200);
      expect(res.body.network).toEqual({ bssid: 'A', tags: ['THREAT'] });
    });

    it('forwards error on failure', async () => {
      adminNetworkTagsService.getNetworkTagsExpanded.mockRejectedValueOnce(
        new Error('db get error')
      );
      const res = await request(app).get('/api/admin/network-tags/A');
      expect(res.status).toBe(500);
    });
  });
});
