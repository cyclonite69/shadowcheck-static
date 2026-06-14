import express from 'express';
import request from 'supertest';

const mockPgadminService = {
  isDockerControlEnabled: jest.fn(),
  getPgAdminStatus: jest.fn(),
  startPgAdmin: jest.fn(),
  stopPgAdmin: jest.fn(),
  destroyPgAdmin: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  pgadminService: mockPgadminService,
}));

jest.mock('../../server/src/logging/logger', () => ({
  error: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api', require('../../server/src/api/routes/v1/admin/pgadmin'));

describe('admin PgAdmin routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPgadminService.isDockerControlEnabled.mockReturnValue(true);
  });

  it('returns status with the control flag', async () => {
    mockPgadminService.getPgAdminStatus.mockResolvedValue({ running: true });

    const response = await request(app).get('/api/admin/pgadmin/status');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, enabled: true, running: true });
  });

  it('returns status failures with the current control flag', async () => {
    mockPgadminService.isDockerControlEnabled.mockReturnValue(false);
    mockPgadminService.getPgAdminStatus.mockRejectedValue(new Error('status failed'));

    const response = await request(app).get('/api/admin/pgadmin/status');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ ok: false, enabled: false, error: 'status failed' });
  });

  it.each([
    ['start', '/api/admin/pgadmin/start'],
    ['stop', '/api/admin/pgadmin/stop'],
    ['destroy', '/api/admin/pgadmin/destroy'],
  ])('blocks %s when Docker controls are disabled', async (_name, path) => {
    mockPgadminService.isDockerControlEnabled.mockReturnValue(false);

    const response = await request(app).post(path);

    expect(response.status).toBe(403);
    expect(response.body.ok).toBe(false);
  });

  it('starts PgAdmin with reset semantics', async () => {
    mockPgadminService.startPgAdmin.mockResolvedValue({ running: true });

    const response = await request(app).post('/api/admin/pgadmin/start').send({ reset: true });

    expect(response.body).toEqual({
      ok: true,
      reset: true,
      message: 'PgAdmin reset and started',
      running: true,
    });
    expect(mockPgadminService.startPgAdmin).toHaveBeenCalledWith({ reset: true });
  });

  it('stops PgAdmin', async () => {
    mockPgadminService.stopPgAdmin.mockResolvedValue({ running: false });

    const response = await request(app).post('/api/admin/pgadmin/stop');

    expect(response.body).toEqual({ ok: true, message: 'PgAdmin stopped', running: false });
  });

  it('destroys PgAdmin and its volume when requested', async () => {
    mockPgadminService.destroyPgAdmin.mockResolvedValue({ removed: true });

    const response = await request(app)
      .post('/api/admin/pgadmin/destroy')
      .send({ removeVolume: true });

    expect(response.body.message).toBe('PgAdmin container and data destroyed');
    expect(mockPgadminService.destroyPgAdmin).toHaveBeenCalledWith({ removeVolume: true });
  });

  it.each([
    ['start', 'startPgAdmin', '/api/admin/pgadmin/start'],
    ['stop', 'stopPgAdmin', '/api/admin/pgadmin/stop'],
    ['destroy', 'destroyPgAdmin', '/api/admin/pgadmin/destroy'],
  ])('reports %s failures', async (_name, method, path) => {
    mockPgadminService[method as keyof typeof mockPgadminService].mockRejectedValue(
      new Error(`${_name} failed`)
    );

    const response = await request(app).post(path);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ ok: false, error: `${_name} failed` });
  });
});
