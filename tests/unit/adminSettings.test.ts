import request from 'supertest';
import express from 'express';
import { EventEmitter } from 'events';

jest.mock('../../server/src/config/container', () => ({
  settingsAdminService: {
    getAllSettings: jest.fn(),
    getSettingByKey: jest.fn(),
    updateSetting: jest.fn(),
    toggleMLBlending: jest.fn(),
  },
  backgroundJobsService: {
    getJobStatus: jest.fn(),
    startJobNow: jest.fn(),
    applySchedulerFlagChange: jest.fn(),
    isSchedulerEnabled: jest.fn(),
    rescheduleJobs: jest.fn(),
  },
}));

jest.mock('../../server/src/services/featureFlagService', () => ({
  refreshCache: jest.fn(),
  getAllFlags: jest.fn(),
  getFlag: jest.fn(),
  isDbBackedFlagKey: jest.fn(),
}));

jest.mock('../../server/src/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

let mockChildProcessSpawn: any;
jest.mock('child_process', () => {
  const EventEmitter = require('events').EventEmitter;
  return {
    spawn: jest.fn().mockImplementation(() => {
      return mockChildProcessSpawn;
    }),
  };
});

const {
  settingsAdminService,
  backgroundJobsService,
} = require('../../server/src/config/container');
const featureFlagService = require('../../server/src/services/featureFlagService');
const { spawn } = require('child_process');
const adminSettingsRouter = require('../../server/src/api/routes/v1/admin/settings');

const app = express();
app.use(express.json());
app.use('/api/admin/settings', adminSettingsRouter);

describe('admin settings routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChildProcessSpawn = new EventEmitter();
    mockChildProcessSpawn.stdout = new EventEmitter();
    mockChildProcessSpawn.stderr = new EventEmitter();
    process.env.DB_HOST = 'postgres';
    process.env.NODE_ENV = 'test';
  });

  describe('GET /api/admin/settings', () => {
    it('should return all settings', async () => {
      settingsAdminService.getAllSettings.mockResolvedValueOnce([
        { key: 'test', value: 'val', description: 'desc', updated_at: 'date' },
      ]);
      const res = await request(app).get('/api/admin/settings');
      expect(res.status).toBe(200);
      expect(res.body.settings.test.value).toBe('val');
    });

    it('should handle error', async () => {
      settingsAdminService.getAllSettings.mockRejectedValueOnce(new Error('DB Error'));
      const res = await request(app).get('/api/admin/settings');
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/admin/settings/jobs/status', () => {
    it('should return jobs status', async () => {
      backgroundJobsService.getJobStatus.mockResolvedValueOnce({ jobs: [] });
      const res = await request(app).get('/api/admin/settings/jobs/status');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/admin/settings/jobs/:jobName/run', () => {
    it('should reject invalid job name', async () => {
      const res = await request(app).post('/api/admin/settings/jobs/invalidJob/run');
      expect(res.status).toBe(400);
    });

    it('should run valid job', async () => {
      backgroundJobsService.startJobNow.mockResolvedValueOnce(true);
      backgroundJobsService.getJobStatus.mockResolvedValueOnce({});
      const res = await request(app).post('/api/admin/settings/jobs/backup/run');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/settings/runtime', () => {
    it('should return runtime settings', async () => {
      featureFlagService.getAllFlags.mockReturnValue({ admin_allow_docker: true });
      const res = await request(app).get('/api/admin/settings/runtime');
      expect(res.status).toBe(200);
      expect(res.body.featureFlags.adminAllowDocker).toBe(true);
    });
  });

  describe('POST /api/admin/settings/local-stack/:action', () => {
    it('should reject if flag is disabled', async () => {
      featureFlagService.getFlag.mockReturnValueOnce(false);
      const res = await request(app).post('/api/admin/settings/local-stack/recreate-api');
      expect(res.status).toBe(403);
    });

    it('should reject if not local docker mode', async () => {
      featureFlagService.getFlag.mockReturnValueOnce(true);
      process.env.DB_HOST = 'localhost';
      const res = await request(app).post('/api/admin/settings/local-stack/recreate-api');
      expect(res.status).toBe(400);
    });

    it('should reject invalid action', async () => {
      featureFlagService.getFlag.mockReturnValueOnce(true);
      const res = await request(app).post('/api/admin/settings/local-stack/invalid');
      expect(res.status).toBe(400);
    });

    it('should execute action successfully', async () => {
      featureFlagService.getFlag.mockReturnValueOnce(true);
      (spawn as jest.Mock).mockImplementationOnce(() => {
        setTimeout(() => mockChildProcessSpawn.emit('close', 0), 10);
        return mockChildProcessSpawn;
      });
      const res = await request(app).post('/api/admin/settings/local-stack/recreate-api');
      expect(res.status).toBe(200);
    });

    it('should fallback to docker compose on ENOENT', async () => {
      featureFlagService.getFlag.mockReturnValueOnce(true);
      const err = new Error('ENOENT') as any;
      err.code = 'ENOENT';

      // First spawn fails, second succeeds
      let spawnCount = 0;
      (spawn as jest.Mock).mockImplementation(() => {
        spawnCount++;
        const p = new EventEmitter() as any;
        p.stdout = new EventEmitter();
        p.stderr = new EventEmitter();
        setTimeout(() => {
          if (spawnCount === 1) p.emit('error', err);
          else p.emit('close', 0);
        }, 5);
        return p;
      });

      const res = await request(app).post('/api/admin/settings/local-stack/rebuild-stack');
      expect(res.status).toBe(200);
      expect(spawnCount).toBe(2);
    });
  });

  describe('GET /api/admin/settings/:key', () => {
    it('should get setting', async () => {
      settingsAdminService.getSettingByKey.mockResolvedValueOnce({ value: 'val' });
      const res = await request(app).get('/api/admin/settings/my_key');
      expect(res.status).toBe(200);
      expect(res.body.value).toBe('val');
    });

    it('should return 404 if not found', async () => {
      settingsAdminService.getSettingByKey.mockResolvedValueOnce(null);
      const res = await request(app).get('/api/admin/settings/my_key');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/admin/settings/:key', () => {
    it('should require value', async () => {
      const res = await request(app).put('/api/admin/settings/my_key').send({});
      expect(res.status).toBe(400);
    });

    it('should update setting', async () => {
      settingsAdminService.updateSetting.mockResolvedValueOnce({ value: 'newval' });
      featureFlagService.isDbBackedFlagKey.mockReturnValue(false);
      const res = await request(app).put('/api/admin/settings/my_key').send({ value: 'newval' });
      expect(res.status).toBe(200);
    });

    it('should handle background job config update', async () => {
      settingsAdminService.updateSetting.mockResolvedValueOnce({ value: 'newval' });
      featureFlagService.isDbBackedFlagKey.mockReturnValue(false);
      backgroundJobsService.isSchedulerEnabled.mockReturnValueOnce(true);
      const res = await request(app)
        .put('/api/admin/settings/backup_job_config')
        .send({ value: 'newval' });
      expect(res.status).toBe(200);
      expect(backgroundJobsService.rescheduleJobs).toHaveBeenCalled();
    });

    it('should handle enable_background_jobs update', async () => {
      settingsAdminService.updateSetting.mockResolvedValueOnce({ value: 'true' });
      featureFlagService.isDbBackedFlagKey.mockReturnValue(true);
      const res = await request(app)
        .put('/api/admin/settings/enable_background_jobs')
        .send({ value: 'true' });
      expect(res.status).toBe(200);
      expect(backgroundJobsService.applySchedulerFlagChange).toHaveBeenCalled();
    });
  });

  describe('POST /api/admin/settings/ml-blending/toggle', () => {
    it('should toggle ml blending', async () => {
      settingsAdminService.toggleMLBlending.mockResolvedValueOnce(true);
      const res = await request(app).post('/api/admin/settings/ml-blending/toggle');
      expect(res.status).toBe(200);
      expect(res.body.ml_blending_enabled).toBe(true);
    });
  });
});
