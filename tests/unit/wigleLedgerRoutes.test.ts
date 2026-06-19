import express from 'express';
import request from 'supertest';

const adminQuery = jest.fn();
const logger = {
  error: jest.fn(),
  info: jest.fn(),
};

jest.mock('../../server/src/services/adminDbService', () => ({
  adminQuery: (...args: unknown[]) => adminQuery(...args),
}));

jest.mock('../../server/src/logging/logger', () => logger);

jest.mock('../../server/src/middleware/authMiddleware', () => ({
  requireAdmin: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const ledgerRouter = require('../../server/src/api/routes/v1/wigle/ledger').default;

const app = express();
app.use(express.json());
app.use('/api/wigle', ledgerRouter);

describe('WiGLE ledger routes', () => {
  const originalSoftLimits = {
    search: process.env.WIGLE_SOFT_LIMIT_SEARCH,
    detail: process.env.WIGLE_SOFT_LIMIT_DETAIL,
    stats: process.env.WIGLE_SOFT_LIMIT_STATS,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    for (const [kind, value] of Object.entries(originalSoftLimits)) {
      const key = `WIGLE_SOFT_LIMIT_${kind.toUpperCase()}`;
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('rejects invalid ledger filters before querying', async () => {
    const response = await request(app).get('/api/wigle/ledger?status=unknown');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Invalid status or source filter' });
    expect(adminQuery).not.toHaveBeenCalled();
  });

  it('merges event and import rows by timestamp and numeric id', async () => {
    const timestamp = '2026-06-01T12:00:00.000Z';
    adminQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'evt_2',
            source: 'event',
            kind: 'search',
            status: 'success',
            ts: timestamp,
            duration_ms: 10,
            phase: 'complete',
            query_source: 'manual',
            query_url: 'https://api.wigle.net/api/v2/network/search',
            query_params: { ssid: 'test' },
            result_count: 5,
            retry_after_hint: null,
            http_status: 200,
          },
          {
            id: 'evt_1',
            source: 'event',
            kind: 'detail',
            status: 'error',
            ts: '2026-05-31T12:00:00.000Z',
            error: 'failed',
            phase: 'complete',
            query_source: 'manual',
            query_url: 'https://api.wigle.net/api/v3/detail/wifi/00:11:22:33:44:55',
            query_params: null,
            result_count: null,
            retry_after_hint: null,
            http_status: 404,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'run_3',
            source: 'import',
            kind: 'fleet',
            status: 'success',
            ts: timestamp,
            rows_returned: 12,
            rows_inserted: 8,
            pages_fetched: 2,
            duration_ms: 2400,
            error: null,
            phase: 'complete',
            query_source: 'import',
            query_url: null,
            query_params: { search_term: 'fleet' },
            result_count: 12,
            retry_after_hint: null,
            http_status: 200,
          },
        ],
      });

    const response = await request(app).get('/api/wigle/ledger?limit=2');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      rows: [
        {
          id: 'run_3',
          source: 'import',
          kind: 'fleet',
          status: 'success',
          timestamp,
          rowsReturned: 12,
          rowsInserted: 8,
          pagesFetched: 2,
          durationMs: 2400,
          phase: 'complete',
          querySource: 'import',
          queryParams: { search_term: 'fleet' },
          resultCount: 12,
          httpStatus: 200,
        },
        {
          id: 'evt_2',
          source: 'event',
          kind: 'search',
          status: 'success',
          timestamp,
          durationMs: 10,
          phase: 'complete',
          querySource: 'manual',
          queryUrl: 'https://api.wigle.net/api/v2/network/search',
          queryParams: { ssid: 'test' },
          resultCount: 5,
          httpStatus: 200,
        },
      ],
      hasMore: true,
    });
    expect(adminQuery).toHaveBeenCalledTimes(2);
    expect(adminQuery.mock.calls[0][1]).toEqual([3]);
    expect(adminQuery.mock.calls[1][1]).toEqual([3]);
  });

  it('builds an event-only cursor query and caps the limit', async () => {
    adminQuery.mockResolvedValueOnce({ rows: [] });

    const response = await request(app).get('/api/wigle/ledger').query({
      source: 'event',
      status: 'error',
      limit: 999,
      before: '2026-06-01T12:00:00.000Z',
      beforeId: 'evt_42',
    });

    expect(response.status).toBe(200);
    expect(adminQuery).toHaveBeenCalledTimes(1);
    expect(adminQuery.mock.calls[0][0]).toContain('e.id < $2');
    expect(adminQuery.mock.calls[0][0]).toContain('e.status = $3');
    expect(adminQuery.mock.calls[0][1]).toEqual(['2026-06-01T12:00:00.000Z', 42, 'error', 201]);
  });

  it('maps import statuses and applies a run cursor', async () => {
    adminQuery.mockResolvedValueOnce({ rows: [] });

    const response = await request(app).get('/api/wigle/ledger').query({
      source: 'import',
      status: 'skipped',
      before: '2026-06-01T12:00:00.000Z',
      beforeId: 'run_7',
    });

    expect(response.status).toBe(200);
    expect(adminQuery).toHaveBeenCalledTimes(1);
    expect(adminQuery.mock.calls[0][0]).toContain('r.id < $2');
    expect(adminQuery.mock.calls[0][0]).toContain('r.status = ANY($3::text[])');
    expect(adminQuery.mock.calls[0][1]).toEqual([
      '2026-06-01T12:00:00.000Z',
      7,
      ['paused', 'cancelled'],
      51,
    ]);
  });

  it('skips the import query when no run status can match', async () => {
    const response = await request(app).get('/api/wigle/ledger?source=import&status=rate_limited');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ rows: [], hasMore: false });
    expect(adminQuery).not.toHaveBeenCalled();
  });

  it('returns a database error response', async () => {
    adminQuery.mockRejectedValueOnce(new Error('ledger unavailable'));

    const response = await request(app).get('/api/wigle/ledger?source=event');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'ledger unavailable' });
    expect(logger.error).toHaveBeenCalledWith(
      '[WiGLE Ledger] Failed to fetch ledger: ledger unavailable'
    );
  });

  it('updates valid runtime soft limits', async () => {
    const response = await request(app)
      .patch('/api/wigle/soft-limits')
      .send({ search: 125, stats: 75 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, updated: { search: 125, stats: 75 } });
    expect(process.env.WIGLE_SOFT_LIMIT_SEARCH).toBe('125');
    expect(process.env.WIGLE_SOFT_LIMIT_STATS).toBe('75');
  });

  it.each([
    [{ search: 0 }, 'Invalid value for search'],
    [{ detail: 'not-a-number' }, 'Invalid value for detail'],
    [{ unrelated: 10 }, 'No valid fields provided'],
  ])('rejects invalid soft-limit payloads', async (body, error) => {
    const response = await request(app).patch('/api/wigle/soft-limits').send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error });
  });
});
