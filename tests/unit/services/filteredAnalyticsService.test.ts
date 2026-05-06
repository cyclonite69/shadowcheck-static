export {};

jest.mock('../../../server/src/config/database', () => ({ query: jest.fn() }));
jest.mock('../../../server/src/logging/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

// Mock v2Service.executeV2Query — the actual DB call
jest.mock('../../../server/src/services/v2Service', () => ({
  executeV2Query: jest.fn(),
}));

// Mock UniversalFilterQueryBuilder
const mockGetValidationErrors = jest.fn().mockReturnValue([]);
const mockBuildAnalyticsQueries = jest.fn().mockReturnValue({
  networkTypes: { sql: 'SELECT 1', params: [] },
  signalStrength: { sql: 'SELECT 1', params: [] },
  security: { sql: 'SELECT 1', params: [] },
  threatDistribution: { sql: 'SELECT 1', params: [] },
  temporalActivity: { sql: 'SELECT 1', params: [] },
  radioTypeOverTime: { sql: 'SELECT 1', params: [] },
  threatTrends: { sql: 'SELECT 1', params: [] },
  topNetworks: { sql: 'SELECT 1', params: [] },
});

jest.mock('../../../server/src/services/filterQueryBuilder', () => {
  return {
    UniversalFilterQueryBuilder: jest.fn().mockImplementation(() => ({
      getValidationErrors: mockGetValidationErrors,
      buildAnalyticsQueries: mockBuildAnalyticsQueries,
    })),
  };
});

const { getFilteredAnalytics } = require('../../../server/src/services/filteredAnalyticsService');
const v2Service = require('../../../server/src/services/v2Service');
const { UniversalFilterQueryBuilder } = require('../../../server/src/services/filterQueryBuilder');

const emptyRows = { rows: [] };

describe('filteredAnalyticsService — getFilteredAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UniversalFilterQueryBuilder.mockImplementation(() => ({
      getValidationErrors: mockGetValidationErrors,
      buildAnalyticsQueries: mockBuildAnalyticsQueries,
    }));
    v2Service.executeV2Query.mockResolvedValue(emptyRows);
    mockGetValidationErrors.mockReturnValue([]);
    mockBuildAnalyticsQueries.mockReturnValue({
      networkTypes: { sql: 'SELECT 1', params: [] },
      signalStrength: { sql: 'SELECT 1', params: [] },
      security: { sql: 'SELECT 1', params: [] },
      threatDistribution: { sql: 'SELECT 1', params: [] },
      temporalActivity: { sql: 'SELECT 1', params: [] },
      radioTypeOverTime: { sql: 'SELECT 1', params: [] },
      threatTrends: { sql: 'SELECT 1', params: [] },
      topNetworks: { sql: 'SELECT 1', params: [] },
    });
  });

  test('returns all expected data keys on success', async () => {
    const result = await getFilteredAnalytics({}, {});
    expect(result.data).toHaveProperty('networkTypes');
    expect(result.data).toHaveProperty('signalStrength');
    expect(result.data).toHaveProperty('security');
    expect(result.data).toHaveProperty('threatDistribution');
    expect(result.data).toHaveProperty('temporalActivity');
    expect(result.data).toHaveProperty('radioTypeOverTime');
    expect(result.data).toHaveProperty('threatTrends');
    expect(result.data).toHaveProperty('topNetworks');
    expect(typeof result.queryDurationMs).toBe('number');
  });

  test('maps network_type field with fallback to type then Other', async () => {
    v2Service.executeV2Query
      .mockResolvedValueOnce({ rows: [{ network_type: 'W', count: '5' }] }) // networkTypes
      .mockResolvedValue(emptyRows);

    const result = await getFilteredAnalytics({}, {});
    expect(result.data.networkTypes[0]).toEqual({ type: 'W', count: 5 });
  });

  test('falls back to "Other" when network_type and type are both missing', async () => {
    v2Service.executeV2Query
      .mockResolvedValueOnce({ rows: [{ count: '3' }] })
      .mockResolvedValue(emptyRows);

    const result = await getFilteredAnalytics({}, {});
    expect(result.data.networkTypes[0].type).toBe('Other');
  });

  test('normalizes numeric count fields via asNumber', async () => {
    v2Service.executeV2Query
      .mockResolvedValueOnce({ rows: [{ network_type: 'E', count: '42' }] })
      .mockResolvedValue(emptyRows);

    const result = await getFilteredAnalytics({}, {});
    expect(result.data.networkTypes[0].count).toBe(42);
  });

  test('throws when builder returns validation errors', async () => {
    mockGetValidationErrors.mockReturnValueOnce(['invalid filter: foo']);

    await expect(getFilteredAnalytics({ foo: 'bad' }, {})).rejects.toThrow(
      'Invalid filter payload: invalid filter: foo'
    );
  });

  test('passes pageType to builder', async () => {
    await getFilteredAnalytics({}, {}, 'wigle');
    expect(UniversalFilterQueryBuilder).toHaveBeenCalledWith({}, {}, { pageType: 'wigle' });
  });

  test('returns empty arrays when DB returns no rows', async () => {
    const result = await getFilteredAnalytics({}, {});
    expect(result.data.networkTypes).toEqual([]);
    expect(result.data.topNetworks).toEqual([]);
  });

  // ── signalStrength mapper (slot 2) ──────────────────────────────────────────

  test('signalStrength maps signal_range with fallback to range then -90', async () => {
    v2Service.executeV2Query
      .mockResolvedValueOnce(emptyRows) // networkTypes
      .mockResolvedValueOnce({ rows: [{ signal_range: '-70 to -60', count: '8' }] }) // signalStrength
      .mockResolvedValue(emptyRows);
    const result = await getFilteredAnalytics({}, {});
    expect(result.data.signalStrength[0]).toEqual({
      signal_range: '-70 to -60',
      range: '-70 to -60',
      count: 8,
    });
  });

  test('signalStrength falls back to range field when signal_range missing', async () => {
    v2Service.executeV2Query
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce({ rows: [{ range: '-80 to -70', count: '3' }] })
      .mockResolvedValue(emptyRows);
    const result = await getFilteredAnalytics({}, {});
    expect(result.data.signalStrength[0].signal_range).toBe('-80 to -70');
  });

  test('signalStrength falls back to -90 when both fields missing', async () => {
    v2Service.executeV2Query
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValue(emptyRows);
    const result = await getFilteredAnalytics({}, {});
    expect(result.data.signalStrength[0].signal_range).toBe('-90');
  });

  // ── security mapper (slot 3) ────────────────────────────────────────────────

  test('security maps security_type with fallback to type then Unknown', async () => {
    v2Service.executeV2Query
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce({ rows: [{ security_type: 'WPA2', count: '10' }] })
      .mockResolvedValue(emptyRows);
    const result = await getFilteredAnalytics({}, {});
    expect(result.data.security[0]).toEqual({ security_type: 'WPA2', type: 'WPA2', count: 10 });
  });

  test('security falls back to Unknown when both fields missing', async () => {
    v2Service.executeV2Query
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValue(emptyRows);
    const result = await getFilteredAnalytics({}, {});
    expect(result.data.security[0].security_type).toBe('Unknown');
  });

  // ── threatDistribution mapper (slot 4) ──────────────────────────────────────

  test('threatDistribution maps range and count', async () => {
    v2Service.executeV2Query
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce({ rows: [{ range: '60-79', count: '5' }] })
      .mockResolvedValue(emptyRows);
    const result = await getFilteredAnalytics({}, {});
    expect(result.data.threatDistribution[0]).toEqual({ range: '60-79', count: 5 });
  });

  // ── temporalActivity mapper (slot 5) ────────────────────────────────────────

  test('temporalActivity maps hour and count as numbers', async () => {
    v2Service.executeV2Query
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce({ rows: [{ hour: '14', count: '22' }] })
      .mockResolvedValue(emptyRows);
    const result = await getFilteredAnalytics({}, {});
    expect(result.data.temporalActivity[0]).toEqual({ hour: 14, count: 22 });
  });

  // ── radioTypeOverTime mapper (slot 6) ───────────────────────────────────────

  test('radioTypeOverTime maps date, network_type (dual-key), and count', async () => {
    v2Service.executeV2Query
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce({ rows: [{ date: '2026-01-01', network_type: 'W', count: '7' }] })
      .mockResolvedValue(emptyRows);
    const result = await getFilteredAnalytics({}, {});
    expect(result.data.radioTypeOverTime[0]).toEqual({
      date: '2026-01-01',
      network_type: 'W',
      type: 'W',
      count: 7,
    });
  });

  test('radioTypeOverTime falls back to Other when network_type missing', async () => {
    v2Service.executeV2Query
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce({ rows: [{ date: '2026-01-01', count: '3' }] })
      .mockResolvedValue(emptyRows);
    const result = await getFilteredAnalytics({}, {});
    expect(result.data.radioTypeOverTime[0].type).toBe('Other');
  });

  // ── threatTrends mapper (slot 7) — dual-key aliasing ────────────────────────

  test('threatTrends emits both camelCase and snake_case keys', async () => {
    v2Service.executeV2Query
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce({
        rows: [
          {
            date: '2026-01-01',
            avg_score: '72.5',
            critical_count: '3',
            high_count: '5',
            medium_count: '8',
            low_count: '12',
            network_count: '28',
          },
        ],
      })
      .mockResolvedValue(emptyRows);
    const result = await getFilteredAnalytics({}, {});
    const row = result.data.threatTrends[0];
    expect(row.avg_score).toBe(72.5);
    expect(row.avgScore).toBe(72.5);
    expect(row.critical_count).toBe(3);
    expect(row.criticalCount).toBe(3);
    expect(row.high_count).toBe(5);
    expect(row.highCount).toBe(5);
    expect(row.medium_count).toBe(8);
    expect(row.mediumCount).toBe(8);
    expect(row.low_count).toBe(12);
    expect(row.lowCount).toBe(12);
    expect(row.network_count).toBe(28);
    expect(row.networkCount).toBe(28);
    expect(row.date).toBe('2026-01-01');
  });

  // ── topNetworks mapper (slot 8) — dual-key aliasing ─────────────────────────

  test('topNetworks emits both camelCase and snake_case keys', async () => {
    v2Service.executeV2Query
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce(emptyRows)
      .mockResolvedValueOnce({
        rows: [
          {
            bssid: 'AA:BB:CC:DD:EE:FF',
            ssid: 'TestNet',
            observation_count: '42',
            first_seen: '2026-01-01T00:00:00Z',
            last_seen: '2026-02-01T00:00:00Z',
          },
        ],
      });
    const result = await getFilteredAnalytics({}, {});
    const row = result.data.topNetworks[0];
    expect(row.observation_count).toBe(42);
    expect(row.observations).toBe(42);
    expect(row.first_seen).toBe('2026-01-01T00:00:00Z');
    expect(row.firstSeen).toBe('2026-01-01T00:00:00Z');
    expect(row.last_seen).toBe('2026-02-01T00:00:00Z');
    expect(row.lastSeen).toBe('2026-02-01T00:00:00Z');
    expect(row.bssid).toBe('AA:BB:CC:DD:EE:FF');
    expect(row.ssid).toBe('TestNet');
  });

  // ── asNumber edge cases ──────────────────────────────────────────────────────

  test('asNumber coerces non-finite values to 0', async () => {
    v2Service.executeV2Query
      .mockResolvedValueOnce({ rows: [{ network_type: 'W', count: 'NaN' }] })
      .mockResolvedValue(emptyRows);
    const result = await getFilteredAnalytics({}, {});
    expect(result.data.networkTypes[0].count).toBe(0);
  });

  test('asNumber coerces null count to 0', async () => {
    v2Service.executeV2Query
      .mockResolvedValueOnce({ rows: [{ network_type: 'W', count: null }] })
      .mockResolvedValue(emptyRows);
    const result = await getFilteredAnalytics({}, {});
    expect(result.data.networkTypes[0].count).toBe(0);
  });
});
