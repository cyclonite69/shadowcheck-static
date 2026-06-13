import express from 'express';
import request from 'supertest';

const adminUsersService = {
  listUsers: jest.fn(),
  createAppUser: jest.fn(),
  setAppUserActive: jest.fn(),
  resetAppUserPassword: jest.fn(),
};

const logger = {
  error: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  adminUsersService,
}));

jest.mock('../../server/src/logging/logger', () => logger);

const usersRouter = require('../../server/src/api/routes/v1/admin/users');

const app = express();
app.use(express.json());

// Middleware to inject mock req.user for testing self-disabling check
app.use((req: any, _res: any, next: any) => {
  if (req.headers['x-mock-user-id']) {
    req.user = { id: req.headers['x-mock-user-id'] };
  }
  next();
});

app.use('/api', usersRouter);

describe('admin users routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /', () => {
    it('lists all users successfully', async () => {
      adminUsersService.listUsers.mockResolvedValueOnce([{ id: 1, username: 'admin' }]);
      const res = await request(app).get('/api/');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.users).toEqual([{ id: 1, username: 'admin' }]);
    });

    it('returns 500 on service failure', async () => {
      adminUsersService.listUsers.mockRejectedValueOnce(new Error('db error'));
      const res = await request(app).get('/api/');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /', () => {
    it('returns 400 if username, email, or password is missing', async () => {
      const res = await request(app).post('/api/').send({ username: 'user' });
      expect(res.status).toBe(400);
    });

    it('returns 400 if role is invalid', async () => {
      const res = await request(app)
        .post('/api/')
        .send({ username: 'user', email: 'u@u.com', password: 'password123', role: 'invalid' }); // gitleaks:allow
      expect(res.status).toBe(400);
    });

    it('returns 400 if password is too short', async () => {
      const res = await request(app)
        .post('/api/')
        .send({ username: 'user', email: 'u@u.com', password: 'short' });
      expect(res.status).toBe(400);
    });

    it('creates user successfully', async () => {
      adminUsersService.createAppUser.mockResolvedValueOnce({ id: 2, username: 'newuser' });
      const res = await request(app)
        .post('/api/')
        .send({ username: 'newuser', email: 'u@u.com', password: 'password123' }); // gitleaks:allow
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.username).toBe('newuser');
    });

    it('returns 409 if username or email already exists', async () => {
      const error: any = new Error('conflict');
      error.code = '23505';
      adminUsersService.createAppUser.mockRejectedValueOnce(error);
      const res = await request(app)
        .post('/api/')
        .send({ username: 'newuser', email: 'u@u.com', password: 'password123' }); // gitleaks:allow
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('exists');
    });
  });

  describe('PUT /:id/active', () => {
    it('returns 400 for invalid user ID', async () => {
      const res = await request(app).put('/api/invalid-id/active').send({ isActive: true });
      expect(res.status).toBe(400);
    });

    it('returns 400 if isActive is not boolean', async () => {
      const res = await request(app).put('/api/2/active').send({ isActive: 'yes' });
      expect(res.status).toBe(400);
    });

    it('returns 400 if user tries to disable their own account', async () => {
      const res = await request(app)
        .put('/api/2/active')
        .set('x-mock-user-id', '2')
        .send({ isActive: false });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('cannot disable your own');
    });

    it('returns 404 if user not found', async () => {
      adminUsersService.setAppUserActive.mockResolvedValueOnce(null);
      const res = await request(app).put('/api/3/active').send({ isActive: false });
      expect(res.status).toBe(404);
    });

    it('updates active status successfully', async () => {
      adminUsersService.setAppUserActive.mockResolvedValueOnce({ id: 3, isActive: true });
      const res = await request(app).put('/api/3/active').send({ isActive: true });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.isActive).toBe(true);
    });
  });

  describe('PUT /:id/password', () => {
    it('resets password successfully', async () => {
      adminUsersService.resetAppUserPassword.mockResolvedValueOnce({ id: 3 });
      const res = await request(app).put('/api/3/password').send({ password: 'newpassword123' }); // gitleaks:allow
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 if password is too short', async () => {
      const res = await request(app).put('/api/3/password').send({ password: 'short' });
      expect(res.status).toBe(400);
    });

    it('returns 404 if user not found', async () => {
      adminUsersService.resetAppUserPassword.mockResolvedValueOnce(null);
      const res = await request(app).put('/api/3/password').send({ password: 'newpassword123' }); // gitleaks:allow
      expect(res.status).toBe(404);
    });
  });
});
