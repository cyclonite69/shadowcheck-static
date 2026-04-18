import request from 'supertest';
import express from 'express';

// Use require for cookie-parser to bypass missing types
const cookieParser = require('cookie-parser');

// Define mock container
const mockContainer = {
  authService: {},
  adminUsersService: {
    listUsers: jest.fn(),
    createAppUser: jest.fn(),
    setAppUserActive: jest.fn(),
    resetAppUserPassword: jest.fn(),
  },
  adminMaintenanceService: {
    getDuplicateObservationStats: jest.fn(),
    deleteDuplicateObservations: jest.fn(),
    getObservationCount: jest.fn(),
    refreshColocationView: jest.fn(),
  },
  settingsAdminService: {
    getAllSettings: jest.fn(),
    getSettingByKey: jest.fn(),
    updateSetting: jest.fn(),
  },
};

// Mock the container
jest.mock('../../../../server/src/config/container', () => mockContainer);

// Mock auth middleware
jest.mock('../../../../server/src/middleware/authMiddleware', () => ({
  requireAdmin: (req: any, res: any, next: any) => {
    req.user = { username: 'admin', role: 'admin' };
    next();
  },
  extractToken: (req: any, res: any, next: any) => {
    req.token = 'fake-token';
    next();
  },
}));

// Mock logger
jest.mock('../../../../server/src/logging/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const adminUsersRouter = require('../../../../server/src/api/routes/v1/admin/users');
const maintenanceRouter = require('../../../../server/src/api/routes/v1/admin/maintenance');
const settingsRouter = require('../../../../server/src/api/routes/v1/admin/settings');

const app = express();
app.use(express.json());
app.use(cookieParser());

// Mount routes
app.use('/api/v1/admin/users', adminUsersRouter);
app.use('/api/v1', maintenanceRouter);
app.use('/api/v1/admin/settings', settingsRouter);

describe('Admin Management API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Management (Admin Users Routes)', () => {
    it('GET /api/v1/admin/users should list users', async () => {
      const mockUsers = [{ username: 'user1', role: 'user' }];
      mockContainer.adminUsersService.listUsers.mockResolvedValue(mockUsers);

      const res = await request(app).get('/api/v1/admin/users');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.users).toEqual(mockUsers);
    });
  });

  describe('Maintenance Routes', () => {
    it('POST /api/v1/admin/cleanup-duplicates should trigger cleanup', async () => {
      mockContainer.adminMaintenanceService.getDuplicateObservationStats.mockResolvedValue({
        total: 20,
      });
      mockContainer.adminMaintenanceService.deleteDuplicateObservations.mockResolvedValue(10);
      mockContainer.adminMaintenanceService.getObservationCount.mockResolvedValue(100);

      const res = await request(app).post('/api/v1/admin/cleanup-duplicates');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.removed).toBe(10);
    });
  });

  describe('Settings Routes', () => {
    it('GET /api/v1/admin/settings should fetch settings', async () => {
      const mockSettingsRows = [
        { key: 'site_name', value: 'ShadowCheck', description: 'Test', updated_at: new Date() },
      ];
      mockContainer.settingsAdminService.getAllSettings.mockResolvedValue(mockSettingsRows);

      const res = await request(app).get('/api/v1/admin/settings');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.settings.site_name.value).toBe('ShadowCheck');
    });
  });
});
