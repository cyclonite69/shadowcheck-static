import express from 'express';
import request from 'supertest';

const mockAuthService = {
  login: jest.fn(),
  logout: jest.fn(),
  validateSession: jest.fn(),
  changePassword: jest.fn(),
};
const mockExtractToken = jest.fn();

jest.mock('express-rate-limit', () => () => (_req: any, _res: any, next: any) => next());

jest.mock('../../server/src/config/container', () => ({
  authService: mockAuthService,
}));

jest.mock('../../server/src/middleware/authMiddleware', () => ({
  extractToken: mockExtractToken,
}));

jest.mock('../../server/src/logging/logger', () => ({
  error: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api', require('../../server/src/api/routes/v1/auth'));

describe('authentication routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.COOKIE_SECURE;
  });

  it('requires login credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({ username: 'admin' });

    expect(response.status).toBe(400);
  });

  it('returns the service login failure status', async () => {
    mockAuthService.login.mockResolvedValue({ success: false, status: 403, error: 'denied' });

    const response = await request(app)
      .post('/api/auth/login')
      .set('user-agent', 'jest')
      .send({ username: 'admin', password: 'bad' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'denied' });
  });

  it('sets the session cookie for a successful login', async () => {
    mockAuthService.login.mockResolvedValue({
      success: true,
      token: 'token',
      user: { username: 'admin' },
      forcePasswordChange: 1,
    });

    const response = await request(app)
      .post('/api/auth/login')
      .set('user-agent', 'jest')
      .send({ username: 'admin', password: 'secret' });

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie'][0]).toContain('session_token=token');
    expect(response.body.forcePasswordChange).toBe(true);
    expect(mockAuthService.login).toHaveBeenCalledWith(
      'admin',
      'secret',
      'jest',
      expect.any(String)
    );
  });

  it('reports unexpected login failures', async () => {
    mockAuthService.login.mockRejectedValue(new Error('failed'));

    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'secret' });

    expect(response.status).toBe(500);
  });

  it('logs out a token and clears the cookie', async () => {
    mockExtractToken.mockReturnValue('token');

    const response = await request(app).post('/api/auth/logout');

    expect(response.body.success).toBe(true);
    expect(mockAuthService.logout).toHaveBeenCalledWith('token');
    expect(response.headers['set-cookie'][0]).toContain('session_token=');
  });

  it('allows logout without a token', async () => {
    mockExtractToken.mockReturnValue(null);

    const response = await request(app).post('/api/auth/logout');

    expect(response.status).toBe(200);
    expect(mockAuthService.logout).not.toHaveBeenCalled();
  });

  it('reports logout failures', async () => {
    mockExtractToken.mockReturnValue('token');
    mockAuthService.logout.mockRejectedValue(new Error('failed'));

    const response = await request(app).post('/api/auth/logout');

    expect(response.status).toBe(500);
  });

  it('requires a token for the current user', async () => {
    mockExtractToken.mockReturnValue(null);

    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.authenticated).toBe(false);
  });

  it('rejects an invalid session', async () => {
    mockExtractToken.mockReturnValue('token');
    mockAuthService.validateSession.mockResolvedValue({ valid: false, error: 'expired' });

    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('expired');
  });

  it('returns the current authenticated user', async () => {
    mockExtractToken.mockReturnValue('token');
    mockAuthService.validateSession.mockResolvedValue({
      valid: true,
      user: { username: 'admin' },
      forcePasswordChange: false,
    });

    const response = await request(app).get('/api/auth/me');

    expect(response.body).toEqual({
      authenticated: true,
      user: { username: 'admin' },
      forcePasswordChange: false,
    });
  });

  it('reports current-user lookup failures', async () => {
    mockExtractToken.mockImplementation(() => {
      throw new Error('failed');
    });

    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(500);
  });

  it('requires all password-change fields', async () => {
    mockExtractToken.mockReturnValue('token');

    const response = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: 'old' });

    expect(response.status).toBe(400);
  });

  it('requires a valid session to change a password', async () => {
    mockExtractToken.mockReturnValue('token');
    mockAuthService.validateSession.mockResolvedValue({ valid: false });

    const response = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: 'old', newPassword: 'new' });

    expect(response.status).toBe(401);
  });

  it('returns password-change validation failures', async () => {
    mockExtractToken.mockReturnValue('token');
    mockAuthService.validateSession.mockResolvedValue({
      valid: true,
      user: { username: 'admin' },
    });
    mockAuthService.changePassword.mockResolvedValue({ success: false, error: 'weak password' });

    const response = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: 'old', newPassword: 'new' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('weak password');
  });

  it('changes the authenticated user password', async () => {
    mockExtractToken.mockReturnValue('token');
    mockAuthService.validateSession.mockResolvedValue({
      valid: true,
      user: { username: 'admin' },
    });
    mockAuthService.changePassword.mockResolvedValue({ success: true });

    const response = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: 'old', newPassword: 'new' });

    expect(response.body.success).toBe(true);
    expect(mockAuthService.changePassword).toHaveBeenCalledWith('admin', 'old', 'new');
  });

  it('reports unexpected password-change failures', async () => {
    mockExtractToken.mockReturnValue('token');
    mockAuthService.validateSession.mockRejectedValue(new Error('failed'));

    const response = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: 'old', newPassword: 'new' });

    expect(response.status).toBe(500);
  });
});
