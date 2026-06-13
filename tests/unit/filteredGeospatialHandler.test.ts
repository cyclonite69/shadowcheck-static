export {};

const mockParseJsonParam = jest.fn();
const mockParseAndValidateFilters = jest.fn();
const mockIsParseValidatedFiltersError = jest.fn();
const mockNormalizeThreatTransparency = jest.fn();
const mockAssertHomeExistsIfNeeded = jest.fn();
const mockResolvePageType = jest.fn();
const mockApplyEffectiveThreat = jest.fn();

jest.mock('../../server/src/api/routes/v2/filteredHelpers', () => ({
  DEBUG_GEOSPATIAL: false,
  parseJsonParam: mockParseJsonParam,
  parseAndValidateFilters: mockParseAndValidateFilters,
  isParseValidatedFiltersError: mockIsParseValidatedFiltersError,
  normalizeThreatTransparency: mockNormalizeThreatTransparency,
  assertHomeExistsIfNeeded: mockAssertHomeExistsIfNeeded,
}));

jest.mock('../../server/src/api/routes/v2/filtered/utils', () => ({
  resolvePageType: mockResolvePageType,
  applyEffectiveThreat: mockApplyEffectiveThreat,
}));

jest.mock('../../server/src/config/routeConfig', () => ({
  ROUTE_CONFIG: {
    geospatialDefaultLimit: 5000,
    geospatialMaxLimit: 500000,
    slowGeospatialQueryMs: -1,
  },
}));

const {
  createGeospatialHandler,
} = require('../../server/src/api/routes/v2/filtered/handlers/geospatial');

function createResponse() {
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
}

describe('filtered geospatial handler', () => {
  const buildGeospatialQuery = jest.fn();
  const UniversalFilterQueryBuilder = jest.fn();
  const executeV2Query = jest.fn();
  const logger = { info: jest.fn(), warn: jest.fn() };
  const deps = {
    filterQueryBuilder: {
      UniversalFilterQueryBuilder,
      validateFilterPayload: jest.fn(),
    },
    v2Service: {
      executeV2Query,
      fetchMissingSiblingRows: jest.fn(),
    },
    filteredAnalyticsService: {
      getFilteredAnalytics: jest.fn(),
    },
    logger,
    validators: {
      limit: jest.fn(),
      offset: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    UniversalFilterQueryBuilder.mockImplementation(() => ({ buildGeospatialQuery }));
    mockParseAndValidateFilters.mockReturnValue({
      ok: true,
      filters: { threat: 'high' },
      enabled: { threat: true },
    });
    mockIsParseValidatedFiltersError.mockImplementation((value) => value.ok === false);
    mockAssertHomeExistsIfNeeded.mockResolvedValue(true);
    mockParseJsonParam.mockImplementation((value, fallback) =>
      value ? JSON.parse(value) : fallback
    );
    mockResolvePageType.mockReturnValue('wigle');
    mockApplyEffectiveThreat.mockImplementation((row) => row);
    mockNormalizeThreatTransparency.mockReturnValue({
      threatReasons: ['HIGH_OBSERVATION_COUNT'],
      threatEvidence: [{ rule: 'HIGH_OBSERVATION_COUNT', observedValue: 30, threshold: 20 }],
      transparencyError: false,
    });
    buildGeospatialQuery.mockReturnValue({
      sql: 'SELECT geospatial',
      params: ['high'],
      appliedFilters: ['threat'],
      ignoredFilters: [],
      warnings: ['sample warning'],
    });
    executeV2Query.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('returns filter validation failures without building a query', async () => {
    const error = { ok: false, status: 400, body: { ok: false, errors: ['bad filter'] } };
    mockParseAndValidateFilters.mockReturnValueOnce(error);
    const res = createResponse();

    await createGeospatialHandler(deps)({ query: {} } as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(error.body);
    expect(UniversalFilterQueryBuilder).not.toHaveBeenCalled();
  });

  it('stops when distance filters require a missing home marker', async () => {
    mockAssertHomeExistsIfNeeded.mockResolvedValueOnce(false);
    const res = createResponse();

    await createGeospatialHandler(deps)({ query: {} } as any, res);

    expect(res.json).not.toHaveBeenCalled();
    expect(UniversalFilterQueryBuilder).not.toHaveBeenCalled();
  });

  it('caps limits, forwards location options, and builds GeoJSON transparency', async () => {
    executeV2Query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          bssid: 'AA:BB:CC:DD:EE:FF',
          ssid: 'Target',
          lat: 40.1,
          lon: -75.2,
          level: -48,
          accuracy: 3,
          altitude: 12,
          time: '2026-06-13T00:00:00Z',
          obs_number: 7,
          radio_frequency: 2412,
          radio_capabilities: '[WPA2]',
          radio_type: 'W',
          centroid_lat: undefined,
          centroid_lon: undefined,
          weighted_lat: 40.2,
          weighted_lon: -75.3,
          has_siblings: 1,
          sibling_count: undefined,
          sibling_max_confidence: undefined,
          has_strong_sibling: 0,
          sibling_bssids: 'not-an-array',
          threat: { score: 80, level: 'HIGH' },
          media_count: '2',
        },
      ],
    });
    const req = {
      query: {
        limit: '999999',
        bssids: '["AA:BB:CC:DD:EE:FF"]',
        location_mode: 'weighted_centroid',
      },
    };
    const res = createResponse();

    await createGeospatialHandler(deps)(req as any, res);

    expect(UniversalFilterQueryBuilder).toHaveBeenCalledWith(
      { threat: 'high' },
      { threat: true },
      { pageType: 'wigle' }
    );
    expect(buildGeospatialQuery).toHaveBeenCalledWith({
      limit: 500000,
      selectedBssids: ['AA:BB:CC:DD:EE:FF'],
      locationMode: 'weighted_centroid',
    });
    expect(executeV2Query).toHaveBeenCalledWith('SELECT geospatial', ['high']);
    expect(logger.info).toHaveBeenCalledWith(
      '[geospatial] filtered/geospatial query',
      expect.objectContaining({ rows: 1, limit: 500000, selectedBssids: 1 })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        type: 'FeatureCollection',
        features: [
          expect.objectContaining({
            geometry: { type: 'Point', coordinates: [-75.2, 40.1] },
            properties: expect.objectContaining({
              has_siblings: true,
              sibling_count: 0,
              sibling_max_confidence: null,
              has_strong_sibling: false,
              sibling_bssids: [],
              media_count: 2,
              threatReasons: ['HIGH_OBSERVATION_COUNT'],
            }),
          }),
        ],
        filterTransparency: {
          appliedFilters: ['threat'],
          ignoredFilters: [],
          warnings: ['sample warning'],
        },
      })
    );
  });

  it('uses default limits and latest-observation mode for invalid query values', async () => {
    const res = createResponse();

    await createGeospatialHandler(deps)(
      { query: { limit: 'invalid', location_mode: 'invalid' } } as any,
      res
    );

    expect(buildGeospatialQuery).toHaveBeenCalledWith({
      limit: 5000,
      selectedBssids: [],
      locationMode: 'latest_observation',
    });
  });
});
