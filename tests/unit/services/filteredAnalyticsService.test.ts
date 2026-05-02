export {};

jest.mock('../../server/src/config/database', () => ({ query: jest.fn() }));
jest.mock('../../server/src/logging/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

// Mock v2Service.executeV2Query — the actual DB call
jest.mock('../../server/src/services/v2Service', () => ({
  executeV2Query: jest.fn(),
}));

// Mock UniversalFilterQueryBuilder
jest.mock('../../server/src/services/filterQueryBuilder', () => {
  return {
    UniversalFilterQueryBuilder: jest.fn().mockImplementation(() => ({
      getValidationErrors: jest.fn().mockReturnValue([]),
      buildAnalyticsQueries: jest.fn().mockReturnValue({
        networkTypes: { sql: 'SELECT 1', params: [] },
        signalStrength: { sql: 'SELECT 1', params: [] },
        security: { sql: 'SELECT 1', params: [] },
        threatDistribution: { sql: 'SELECT 1', params: [] },
        temporalActivity: { sql: 'SELECT 1', params: [] },
        radioTypeOverTime: { sql: 'SELECT 1', params: [] },
        threatTrends: { sql: 'SELECT 1', params: [] },
        topNetworks: { sql: 'SELECT 1', params: [] },
      }),
    })),
  };
});

const { getFilteredAnalytics } = require('../../server/src/services/filteredAnalyticsService');
const v2Service = require('../../server/src/services/v2Service');
const { UniversalFilterQueryBuilder } = require('../../server/src/services/filterQueryBuilder');

const emptyRows = { rows: [] };

describe('filteredAnalyticsService — getFilteredAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    v2Service.executeV2Query.mockResolvedValue(emptyRows);
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
    UniversalFilterQueryBuilder.mockImplementationOnce(() => ({
      getValidationErrors: jest.fn().mockReturnValue(['invalid filter: foo']),
      buildAnalyticsQueries: jest.fn(),
    }));

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
});
