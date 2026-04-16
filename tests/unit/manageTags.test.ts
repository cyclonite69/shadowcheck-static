import request from 'supertest';
import express from 'express';

jest.mock('../../server/src/config/container', () => ({
  networkTagService: {
    getNetworkTagByBssid: jest.fn(),
  },
  adminNetworkTagsService: {
    upsertNetworkTag: jest.fn(),
    insertNetworkTagIgnore: jest.fn(),
    updateNetworkTagIgnore: jest.fn(),
    insertNetworkThreatTag: jest.fn(),
    updateNetworkThreatTag: jest.fn(),
    markNetworkInvestigate: jest.fn(),
    deleteNetworkTag: jest.fn(),
    exportMLTrainingSet: jest.fn(),
  },
  adminNetworkMediaService: {
    addNetworkNoteWithFunction: jest.fn(),
  },
}));

jest.mock('../../server/src/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../server/src/middleware/authMiddleware', () => ({
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

jest.mock('../../server/src/validation/middleware', () => ({
  bssidParamMiddleware: (req: any, res: any, next: any) => next(),
}));

const {
  networkTagService,
  adminNetworkTagsService,
  adminNetworkMediaService,
} = require('../../server/src/config/container');
const manageTagsRouter = require('../../server/src/api/routes/v1/network-tags/manageTags');

const app = express();
app.use(express.json());
app.use('/api/network-tags', manageTagsRouter);

describe('manageTags routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/network-tags/:bssid', () => {
    it('should upsert network tag', async () => {
      adminNetworkTagsService.upsertNetworkTag.mockResolvedValueOnce({ id: 1 });
      const res = await request(app).post('/api/network-tags/00:11:22:33:44:55').send({
        is_ignored: true,
        ignore_reason: 'own_device',
        threat_tag: 'THREAT',
        threat_confidence: 0.9,
        notes: 'test',
      });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(adminNetworkTagsService.upsertNetworkTag).toHaveBeenCalledWith(
        '00:11:22:33:44:55',
        true,
        'own_device',
        'THREAT',
        0.9,
        'test'
      );
    });

    it('should reject invalid threat_tag', async () => {
      const res = await request(app)
        .post('/api/network-tags/00:11:22:33:44:55')
        .send({ threat_tag: 'INVALID' });
      expect(res.status).toBe(400);
    });

    it('should reject invalid ignore_reason', async () => {
      const res = await request(app)
        .post('/api/network-tags/00:11:22:33:44:55')
        .send({ ignore_reason: 'INVALID' });
      expect(res.status).toBe(400);
    });

    it('should reject invalid threat_confidence', async () => {
      const res = await request(app)
        .post('/api/network-tags/00:11:22:33:44:55')
        .send({ threat_confidence: 1.5 });
      expect(res.status).toBe(400);
    });

    it('should handle errors', async () => {
      adminNetworkTagsService.upsertNetworkTag.mockRejectedValueOnce(new Error('DB Error'));
      const res = await request(app).post('/api/network-tags/00:11:22:33:44:55').send({});
      expect(res.status).toBe(500);
    });
  });

  describe('PATCH /api/network-tags/:bssid/ignore', () => {
    it('should insert ignore if not existing', async () => {
      networkTagService.getNetworkTagByBssid.mockResolvedValueOnce(null);
      adminNetworkTagsService.insertNetworkTagIgnore.mockResolvedValueOnce({ is_ignored: true });
      const res = await request(app)
        .patch('/api/network-tags/00:11:22:33:44:55/ignore')
        .send({ ignore_reason: 'own_device' });
      expect(res.status).toBe(200);
      expect(adminNetworkTagsService.insertNetworkTagIgnore).toHaveBeenCalledWith(
        '00:11:22:33:44:55',
        true,
        'own_device'
      );
    });

    it('should update ignore if existing', async () => {
      networkTagService.getNetworkTagByBssid.mockResolvedValueOnce({ is_ignored: false });
      adminNetworkTagsService.updateNetworkTagIgnore.mockResolvedValueOnce({ is_ignored: true });
      const res = await request(app)
        .patch('/api/network-tags/00:11:22:33:44:55/ignore')
        .send({ ignore_reason: 'own_device' });
      expect(res.status).toBe(200);
      expect(adminNetworkTagsService.updateNetworkTagIgnore).toHaveBeenCalledWith(
        '00:11:22:33:44:55',
        true,
        'own_device'
      );
    });
  });

  describe('PATCH /api/network-tags/:bssid/threat', () => {
    it('should reject invalid threat tag', async () => {
      const res = await request(app)
        .patch('/api/network-tags/00:11:22:33:44:55/threat')
        .send({ threat_tag: 'INVALID' });
      expect(res.status).toBe(400);
    });

    it('should insert threat if not existing', async () => {
      networkTagService.getNetworkTagByBssid.mockResolvedValueOnce(null);
      adminNetworkTagsService.insertNetworkThreatTag.mockResolvedValueOnce({
        threat_tag: 'THREAT',
      });
      const res = await request(app)
        .patch('/api/network-tags/00:11:22:33:44:55/threat')
        .send({ threat_tag: 'THREAT', threat_confidence: 0.8 });
      expect(res.status).toBe(200);
      expect(adminNetworkTagsService.insertNetworkThreatTag).toHaveBeenCalledWith(
        '00:11:22:33:44:55',
        'THREAT',
        0.8
      );
    });

    it('should update threat if existing', async () => {
      networkTagService.getNetworkTagByBssid.mockResolvedValueOnce({ threat_tag: 'SUSPECT' });
      adminNetworkTagsService.updateNetworkThreatTag.mockResolvedValueOnce({
        threat_tag: 'THREAT',
      });
      const res = await request(app)
        .patch('/api/network-tags/00:11:22:33:44:55/threat')
        .send({ threat_tag: 'THREAT', threat_confidence: 0.8 });
      expect(res.status).toBe(200);
      expect(adminNetworkTagsService.updateNetworkThreatTag).toHaveBeenCalledWith(
        '00:11:22:33:44:55',
        'THREAT',
        0.8
      );
    });
  });

  describe('PATCH /api/network-tags/:bssid/notes', () => {
    it('should reject empty notes', async () => {
      const res = await request(app)
        .patch('/api/network-tags/00:11:22:33:44:55/notes')
        .send({ notes: '' });
      expect(res.status).toBe(400);
    });

    it('should add note successfully', async () => {
      adminNetworkMediaService.addNetworkNoteWithFunction.mockResolvedValueOnce(1);
      const res = await request(app)
        .patch('/api/network-tags/00:11:22:33:44:55/notes')
        .send({ notes: 'test note' });
      expect(res.status).toBe(200);
      expect(res.body.note_id).toBe(1);
    });
  });

  describe('PATCH /api/network-tags/:bssid/investigate', () => {
    it('should mark for investigate', async () => {
      adminNetworkTagsService.markNetworkInvestigate.mockResolvedValueOnce({ id: 1 });
      const res = await request(app).patch('/api/network-tags/00:11:22:33:44:55/investigate');
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/network-tags/:bssid', () => {
    it('should delete tags', async () => {
      adminNetworkTagsService.deleteNetworkTag.mockResolvedValueOnce(1);
      const res = await request(app).delete('/api/network-tags/00:11:22:33:44:55');
      expect(res.status).toBe(200);
    });

    it('should return 404 if no tags found', async () => {
      adminNetworkTagsService.deleteNetworkTag.mockResolvedValueOnce(0);
      const res = await request(app).delete('/api/network-tags/00:11:22:33:44:55');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/network-tags/export/ml', () => {
    it('should export ML training set', async () => {
      adminNetworkTagsService.exportMLTrainingSet.mockResolvedValueOnce([{ data: 1 }]);
      const res = await request(app).get('/api/network-tags/export/ml');
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
    });
  });
});
