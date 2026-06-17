import express from 'express';
import request from 'supertest';

const mockGetDetailedDatabaseStats = jest.fn();

jest.mock('../../../../../../server/src/config/container', () => ({
  adminDbStatsService: {
    getDetailedDatabaseStats: mockGetDetailedDatabaseStats,
  },
}));

jest.mock('../../../../../../server/src/logging/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  default: { error: jest.fn(), info: jest.fn() },
}));

const app = express();
app.use(express.json());
app.use('/', require('../../../../../../server/src/api/routes/v1/admin/dbStats').default);

describe('admin dbStats route — GET /', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns stats from service on success', async () => {
    const stats = {
      tables: [{ name: 'networks', rows: 1234 }],
      total_size: '500 MB',
    };
    mockGetDetailedDatabaseStats.mockResolvedValue(stats);

    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(stats);
    expect(mockGetDetailedDatabaseStats).toHaveBeenCalledTimes(1);
  });

  it('returns 500 with error message when service throws', async () => {
    mockGetDetailedDatabaseStats.mockRejectedValue(new Error('DB unavailable'));

    const res = await request(app).get('/');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'DB unavailable' });
  });

  it('returns 500 with empty error message for errorless throw', async () => {
    mockGetDetailedDatabaseStats.mockRejectedValue({ message: undefined });

    const res = await request(app).get('/');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
