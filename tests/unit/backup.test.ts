import request from 'supertest';
import express from 'express';

jest.mock('../../server/src/config/container', () => ({
  adminDbService: {
    getBackupData: jest.fn(),
    truncateAllData: jest.fn(),
  },
}));

jest.mock('../../server/src/middleware/authMiddleware', () => ({
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

const { adminDbService } = require('../../server/src/config/container');
const backupRouter = require('../../server/src/api/routes/v1/backup');

const app = express();
app.use(express.json());
// Mock file upload as the route uses req.files
app.use((req: any, res: any, next: any) => {
  req.files = { backup: { data: Buffer.from(JSON.stringify({ tables: {} })) } };
  next();
});
app.use('/api', backupRouter);

describe('backup routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/backup', () => {
    it('should return backup file', async () => {
      adminDbService.getBackupData.mockResolvedValueOnce({
        observations: [],
        networks: [],
        tags: [],
      });
      const res = await request(app).get('/api/backup');
      expect(res.status).toBe(200);
      expect(res.body.version).toBe('1.0');
    });

    it('should handle error', async () => {
      adminDbService.getBackupData.mockRejectedValueOnce(new Error('DB Error'));
      const res = await request(app).get('/api/backup');
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/restore', () => {
    it('should reject if no file provided', async () => {
      // Create a new app instance to override file upload mock
      const appNoFile = express();
      appNoFile.use('/api', backupRouter);
      const res = await request(appNoFile).post('/api/restore');
      expect(res.status).toBe(400);
    });

    it('should restore successfully', async () => {
      const res = await request(app).post('/api/restore');
      expect(res.status).toBe(200);
      expect(adminDbService.truncateAllData).toHaveBeenCalled();
    });
  });
});
