jest.mock('../../server/src/api/routes/v2/filteredHelpers', () => ({
  DEBUG_GEOSPATIAL: false,
}));

const {
  buildFilteredObservationsResponse,
} = require('../../server/src/api/routes/v2/filtered/observationsBuilder');

describe('buildFilteredObservationsResponse', () => {
  const buildGeospatialQuery = jest.fn();
  const Builder = jest.fn(() => ({ buildGeospatialQuery }));
  const v2Service = { executeV2Query: jest.fn() };
  const logger = { info: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    Builder.mockImplementation(() => ({ buildGeospatialQuery }));
    buildGeospatialQuery.mockReturnValue({
      sql: 'SELECT observations',
      params: ['value'],
      appliedFilters: ['ssid'],
    });
  });

  it('returns rows and query metadata with the supplied query context', async () => {
    v2Service.executeV2Query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const response = await buildFilteredObservationsResponse(
      Builder,
      v2Service,
      logger,
      { ssid: 'test' },
      { ssid: true },
      25,
      5,
      ['AA:BB:CC:DD:EE:FF'],
      'wigle'
    );

    expect(Builder).toHaveBeenCalledWith({ ssid: 'test' }, { ssid: true }, { pageType: 'wigle' });
    expect(buildGeospatialQuery).toHaveBeenCalledWith({
      limit: 25,
      offset: 5,
      selectedBssids: ['AA:BB:CC:DD:EE:FF'],
    });
    expect(response.data).toEqual([{ id: 1 }]);
    expect(response.meta.resultCount).toBe(1);
    expect(response).not.toHaveProperty('truncated');
  });

  it('fetches one extra row and marks truncated responses', async () => {
    v2Service.executeV2Query.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }, { id: 3 }] });

    const response = await buildFilteredObservationsResponse(
      Builder,
      v2Service,
      logger,
      {},
      {},
      2,
      10,
      [],
      'geospatial',
      true
    );

    expect(buildGeospatialQuery).toHaveBeenCalledWith({
      limit: 3,
      offset: 10,
      selectedBssids: [],
    });
    expect(response.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(response).toEqual(expect.objectContaining({ truncated: true, offset: 10, limit: 2 }));
  });

  it('normalizes a missing rows property to an empty result', async () => {
    v2Service.executeV2Query.mockResolvedValueOnce({});

    const response = await buildFilteredObservationsResponse(
      Builder,
      v2Service,
      logger,
      {},
      {},
      10
    );

    expect(response.data).toEqual([]);
    expect(response.meta.resultCount).toBe(0);
  });

  it('logs slow queries with counts but not selected BSSID values', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValue(5000);
    v2Service.executeV2Query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    await buildFilteredObservationsResponse(
      Builder,
      v2Service,
      logger,
      {},
      { ssid: true, bssid: false },
      10,
      0,
      ['AA:BB:CC:DD:EE:FF']
    );

    expect(logger.info).toHaveBeenCalledWith(
      '[geospatial] filtered/observations query',
      expect.objectContaining({ rows: 1, selectedBssids: 1, enabledCount: 1, appliedCount: 1 })
    );
    now.mockRestore();
  });
});
