import express from 'express';
import request from 'supertest';

const mockListSecretsStatus = jest.fn();
const mockStoreSecret = jest.fn();
const mockDeleteSecret = jest.fn();

jest.mock('../../server/src/middleware/authMiddleware', () => ({
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../server/src/api/routes/v1/admin/adminSecretsHelpers', () => ({
  listSecretsStatus: mockListSecretsStatus,
  storeSecret: mockStoreSecret,
  deleteSecret: mockDeleteSecret,
}));

jest.mock('../../server/src/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api', require('../../server/src/api/routes/v1/admin/secrets'));

describe('admin secrets routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists secret status without values', async () => {
    mockListSecretsStatus.mockReturnValue([{ key: 'db_password', configured: true }]);

    const response = await request(app).get('/api/admin/secrets');

    expect(response.body).toEqual({
      ok: true,
      secrets: [{ key: 'db_password', configured: true }],
    });
  });

  it('reports secret list failures', async () => {
    mockListSecretsStatus.mockImplementation(() => {
      throw new Error('failed');
    });

    const response = await request(app).get('/api/admin/secrets');

    expect(response.status).toBe(500);
  });

  it('stores a named secret', async () => {
    const response = await request(app)
      .post('/api/admin/secrets/mapbox_token')
      .send({ value: 'secret' });

    expect(response.body.ok).toBe(true);
    expect(mockStoreSecret).toHaveBeenCalledWith('mapbox_token', 'secret');
  });

  it('reports store failures', async () => {
    mockStoreSecret.mockRejectedValue(new Error('Value is required'));

    const response = await request(app).post('/api/admin/secrets/mapbox_token').send({});

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Value is required');
  });

  it('deletes an optional secret', async () => {
    const response = await request(app).delete('/api/admin/secrets/mapbox_token');

    expect(response.body.ok).toBe(true);
    expect(mockDeleteSecret).toHaveBeenCalledWith('mapbox_token');
  });

  it('returns 400 for required-secret deletion', async () => {
    const error: any = new Error('Cannot delete required secrets');
    error.code = 'REQUIRED';
    mockDeleteSecret.mockRejectedValue(error);

    const response = await request(app).delete('/api/admin/secrets/db_password');

    expect(response.status).toBe(400);
  });

  it('returns 500 for other delete failures', async () => {
    mockDeleteSecret.mockRejectedValue(new Error('delete failed'));

    const response = await request(app).delete('/api/admin/secrets/mapbox_token');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('delete failed');
  });
});
