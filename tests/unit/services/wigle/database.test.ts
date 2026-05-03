export {};

jest.mock('../../../../server/src/config/database', () => ({
  query: jest.fn(),
  pool: { query: jest.fn(), connect: jest.fn(), end: jest.fn() },
  CONFIG: {
    MIN_VALID_TIMESTAMP: 946684800000,
    MIN_OBSERVATIONS: 2,
    MAX_PAGE_SIZE: 1000,
    DEFAULT_PAGE_SIZE: 100,
  },
}));

jest.mock('../../../../server/src/repositories/wigleQueriesRepository', () => ({
  buildWigleNetworkByBssidQuery: jest.fn().mockReturnValue({ sql: 'SELECT 1', queryParams: [] }),
  buildWigleSearchQuery: jest.fn().mockReturnValue({ sql: 'SELECT 1', queryParams: [] }),
  buildWigleV2NetworksQuery: jest.fn().mockReturnValue({ sql: 'SELECT 1', queryParams: [] }),
  buildWigleV2CountQuery: jest.fn().mockReturnValue({ sql: 'SELECT 1', queryParams: [] }),
  buildWigleV3NetworksQuery: jest.fn().mockReturnValue({ sql: 'SELECT 1', queryParams: [] }),
  buildWigleV3CountQuery: jest.fn().mockReturnValue({ sql: 'SELECT 1', queryParams: [] }),
  buildWigleV3TableExistsQuery: jest.fn().mockReturnValue({ sql: 'SELECT 1', queryParams: [] }),
  buildRecentWigleDetailImportQuery: jest
    .fn()
    .mockReturnValue({ sql: 'SELECT 1', queryParams: [] }),
  buildWigleObservationsQuery: jest.fn().mockReturnValue({ sql: 'SELECT 1', queryParams: [] }),
  buildWigleObservationsCountQuery: jest.fn().mockReturnValue({ sql: 'SELECT 1', queryParams: [] }),
  buildKmlBssidSummaryQuery: jest.fn().mockReturnValue({ sql: 'SELECT 1', queryParams: [] }),
  buildKmlPointsQuery: jest.fn().mockReturnValue({ sql: 'SELECT 1', queryParams: [] }),
  buildKmlPointsCountQuery: jest.fn().mockReturnValue({ sql: 'SELECT 1', queryParams: [] }),
}));

import {
  getWigleDatabase,
  getKmlBssidSummary,
  getWigleObservations,
  getRecentWigleDetailImport,
  checkWigleV3TableExists,
} from '../../../../server/src/services/wigle/database';

const db = require('../../../../server/src/config/database');
const repo = require('../../../../server/src/repositories/wigleQueriesRepository');

const DEFAULT_QUERY = { sql: 'SELECT 1', queryParams: [] };

describe('wigle/database service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-establish mock return values cleared by resetMocks:true
    Object.keys(repo).forEach((key) => {
      if (typeof repo[key]?.mockReturnValue === 'function') {
        repo[key].mockReturnValue(DEFAULT_QUERY);
      }
    });
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('getWigleDatabase — v2 path', () => {
    test('returns rows and null total when includeTotal is false', async () => {
      db.query.mockResolvedValue({ rows: [{ bssid: 'AA:BB:CC:DD:EE:FF' }] });
      const result = await getWigleDatabase({ version: 'v2' });
      expect(result.rows).toHaveLength(1);
      expect(result.total).toBeNull();
    });

    test('returns total when includeTotal is true', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ bssid: 'AA' }] }) // networks
        .mockResolvedValueOnce({ rows: [{ total: '42' }] }); // count
      const result = await getWigleDatabase({ version: 'v2', includeTotal: true });
      expect(result.total).toBe(42);
    });

    test('passes ssid/bssid/encryption filters to query builder', async () => {
      await getWigleDatabase({ version: 'v2', ssid: 'test', bssid: 'AA', encryption: 'WPA2' });
      const call = repo.buildWigleV2NetworksQuery.mock.calls[0][0];
      expect(call.whereClauses.some((c: string) => c.includes('ssid'))).toBe(true);
      expect(call.whereClauses.some((c: string) => c.includes('bssid'))).toBe(true);
      expect(call.whereClauses.some((c: string) => c.includes('encryption'))).toBe(true);
    });

    test('escapes ssid wildcard characters before building v2 filters', async () => {
      await getWigleDatabase({ version: 'v2', ssid: 'x_' });
      const call = repo.buildWigleV2NetworksQuery.mock.calls[0][0];
      expect(call.whereClauses).toContain("ssid ILIKE $1 ESCAPE '\\'");
      expect(call.queryParams).toEqual(['%x\\_%']);
    });

    test('passes type filter to query builder', async () => {
      await getWigleDatabase({ version: 'v2', type: 'WiFi' });
      const call = repo.buildWigleV2NetworksQuery.mock.calls[0][0];
      expect(call.whereClauses.some((c: string) => c.includes('type'))).toBe(true);
    });

    test('ignores blank type string', async () => {
      await getWigleDatabase({ version: 'v2', type: '   ' });
      const call = repo.buildWigleV2NetworksQuery.mock.calls[0][0];
      expect(call.whereClauses.some((c: string) => c.includes('type ='))).toBe(false);
    });
  });

  describe('getWigleDatabase — v3 path', () => {
    test('routes to v3 query builders', async () => {
      await getWigleDatabase({ version: 'v3', ssid: 'net', bssid: 'BB', encryption: 'WPA3' });
      expect(repo.buildWigleV3NetworksQuery).toHaveBeenCalled();
      expect(repo.buildWigleV2NetworksQuery).not.toHaveBeenCalled();
    });

    test('escapes ssid wildcard characters before building v3 filters', async () => {
      await getWigleDatabase({ version: 'v3', ssid: 'x_' });
      const call = repo.buildWigleV3NetworksQuery.mock.calls[0][0];
      expect(call.whereClauses).toContain("obs.ssid ILIKE $1 ESCAPE '\\'");
      expect(call.queryParams).toEqual(['%x\\_%']);
    });

    test('returns total for v3 when includeTotal is true', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '7' }] });
      const result = await getWigleDatabase({ version: 'v3', includeTotal: true });
      expect(result.total).toBe(7);
    });
  });

  describe('getKmlBssidSummary', () => {
    test('returns null when no rows', async () => {
      db.query.mockResolvedValue({ rows: [] });
      const result = await getKmlBssidSummary('AA:BB:CC:DD:EE:FF');
      expect(result).toBeNull();
    });

    test('returns null when observation_count is 0', async () => {
      db.query.mockResolvedValue({
        rows: [{ observation_count: '0', first_seen: null, last_seen: null, timespan_days: null }],
      });
      const result = await getKmlBssidSummary('AA:BB:CC:DD:EE:FF');
      expect(result).toBeNull();
    });

    test('returns shaped object with numeric fields', async () => {
      db.query.mockResolvedValue({
        rows: [
          {
            observation_count: '5',
            first_seen: '2024-01-01',
            last_seen: '2025-01-01',
            timespan_days: '365',
          },
        ],
      });
      const result = await getKmlBssidSummary('AA:BB:CC:DD:EE:FF');
      expect(result).toEqual({
        observation_count: 5,
        first_seen: '2024-01-01',
        last_seen: '2025-01-01',
        timespan_days: 365,
      });
    });

    test('returns null timespan_days when null in DB', async () => {
      db.query.mockResolvedValue({
        rows: [{ observation_count: '3', first_seen: null, last_seen: null, timespan_days: null }],
      });
      const result = await getKmlBssidSummary('AA:BB:CC:DD:EE:FF');
      expect(result!.timespan_days).toBeNull();
    });
  });

  describe('getWigleObservations', () => {
    test('returns rows and parsed total', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ netid: 'AA' }] })
        .mockResolvedValueOnce({ rows: [{ total: '10' }] });
      const result = await getWigleObservations('AA:BB:CC:DD:EE:FF');
      expect(result.rows).toHaveLength(1);
      expect(result.total).toBe(10);
    });

    test('returns 0 total when count row missing', async () => {
      db.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{}] });
      const result = await getWigleObservations('AA:BB:CC:DD:EE:FF');
      expect(result.total).toBe(0);
    });
  });

  describe('getRecentWigleDetailImport', () => {
    test('returns first row when found', async () => {
      db.query.mockResolvedValue({ rows: [{ netid: 'AA', imported_at: '2025-01-01' }] });
      const result = await getRecentWigleDetailImport('AA:BB:CC:DD:EE:FF', 24);
      expect(result).toEqual({ netid: 'AA', imported_at: '2025-01-01' });
    });

    test('returns null when no rows', async () => {
      db.query.mockResolvedValue({ rows: [] });
      const result = await getRecentWigleDetailImport('AA:BB:CC:DD:EE:FF', 24);
      expect(result).toBeNull();
    });

    test('defaults withinHours to 24 for invalid input', async () => {
      db.query.mockResolvedValue({ rows: [] });
      await getRecentWigleDetailImport('AA', -5);
      expect(repo.buildRecentWigleDetailImportQuery).toHaveBeenCalledWith('AA', 24);
    });
  });

  describe('checkWigleV3TableExists', () => {
    test('returns true when exists', async () => {
      db.query.mockResolvedValue({ rows: [{ exists: true }] });
      expect(await checkWigleV3TableExists()).toBe(true);
    });

    test('returns false when not exists', async () => {
      db.query.mockResolvedValue({ rows: [{ exists: false }] });
      expect(await checkWigleV3TableExists()).toBe(false);
    });
  });
});
