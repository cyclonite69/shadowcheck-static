export {};

const mockParseJsonParam = jest.fn();
const mockParseAndValidateFilters = jest.fn();
const mockIsParseValidatedFiltersError = jest.fn();
const mockAssertHomeExistsIfNeeded = jest.fn();
const mockResolvePageType = jest.fn();
const mockResolveBodyPageType = jest.fn();
const mockParseAndValidateBodyFilters = jest.fn();
const mockBuildFilteredObservationsResponse = jest.fn();

jest.mock('../../server/src/api/routes/v2/filteredHelpers', () => ({
  parseJsonParam: mockParseJsonParam,
  parseAndValidateFilters: mockParseAndValidateFilters,
  isParseValidatedFiltersError: mockIsParseValidatedFiltersError,
  assertHomeExistsIfNeeded: mockAssertHomeExistsIfNeeded,
}));

jest.mock('../../server/src/api/routes/v2/filtered/utils', () => ({
  resolvePageType: mockResolvePageType,
  resolveBodyPageType: mockResolveBodyPageType,
  parseAndValidateBodyFilters: mockParseAndValidateBodyFilters,
}));

jest.mock('../../server/src/api/routes/v2/filtered/observationsBuilder', () => ({
  buildFilteredObservationsResponse: mockBuildFilteredObservationsResponse,
}));

jest.mock('../../server/src/config/routeConfig', () => ({
  ROUTE_CONFIG: {
    observationsDefaultLimit: 10000,
    observationsMaxLimit: 50000,
  },
}));

const {
  createGetObservationsHandler,
  createPostObservationsHandler,
} = require('../../server/src/api/routes/v2/filtered/handlers/observations');

function createResponse() {
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
}

describe('filtered observation handlers', () => {
  const UniversalFilterQueryBuilder = jest.fn();
  const validateFilterPayload = jest.fn();
  const v2Service = {
    executeV2Query: jest.fn(),
    fetchMissingSiblingRows: jest.fn(),
  };
  const logger = { info: jest.fn(), warn: jest.fn() };
  const deps = {
    filterQueryBuilder: { UniversalFilterQueryBuilder, validateFilterPayload },
    v2Service,
    filteredAnalyticsService: { getFilteredAnalytics: jest.fn() },
    logger,
    validators: { limit: jest.fn(), offset: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockParseAndValidateFilters.mockReturnValue({
      ok: true,
      filters: { type: 'W' },
      enabled: { type: true },
    });
    mockParseAndValidateBodyFilters.mockReturnValue({
      ok: true,
      filters: { type: 'E' },
      enabled: { type: true },
    });
    mockIsParseValidatedFiltersError.mockImplementation((value) => value.ok === false);
    mockAssertHomeExistsIfNeeded.mockResolvedValue(true);
    mockParseJsonParam.mockImplementation((value, fallback) =>
      value ? JSON.parse(value) : fallback
    );
    mockResolvePageType.mockReturnValue('wigle');
    mockResolveBodyPageType.mockReturnValue('geospatial');
    mockBuildFilteredObservationsResponse.mockResolvedValue({
      ok: true,
      data: [{ bssid: 'AA:BB:CC:DD:EE:FF' }],
    });
  });

  it('returns GET validation errors before home checks', async () => {
    const error = { ok: false, status: 400, body: { ok: false, errors: ['invalid'] } };
    mockParseAndValidateFilters.mockReturnValueOnce(error);
    const res = createResponse();

    await createGetObservationsHandler(deps)({ query: {} } as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(error.body);
    expect(mockAssertHomeExistsIfNeeded).not.toHaveBeenCalled();
  });

  it('stops GET requests when required home data is unavailable', async () => {
    mockAssertHomeExistsIfNeeded.mockResolvedValueOnce(false);
    const res = createResponse();

    await createGetObservationsHandler(deps)({ query: {} } as any, res);

    expect(res.json).not.toHaveBeenCalled();
    expect(mockBuildFilteredObservationsResponse).not.toHaveBeenCalled();
  });

  it('normalizes GET pagination, selected BSSIDs, page type, and totals flag', async () => {
    const req = {
      query: {
        limit: '999999',
        offset: '-12',
        includeTotal: '1',
        bssids: '["AA:BB:CC:DD:EE:FF"]',
      },
    };
    const res = createResponse();

    await createGetObservationsHandler(deps)(req as any, res);

    expect(mockBuildFilteredObservationsResponse).toHaveBeenCalledWith(
      UniversalFilterQueryBuilder,
      v2Service,
      logger,
      { type: 'W' },
      { type: true },
      50000,
      0,
      ['AA:BB:CC:DD:EE:FF'],
      'wigle',
      true
    );
    expect(res.json).toHaveBeenCalledWith({
      ok: true,
      data: [{ bssid: 'AA:BB:CC:DD:EE:FF' }],
    });
  });

  it('returns POST validation failures and stops on missing home data', async () => {
    const error = { ok: false, status: 400, body: { ok: false, errors: ['bad body'] } };
    mockParseAndValidateBodyFilters.mockReturnValueOnce(error);
    const firstRes = createResponse();

    await createPostObservationsHandler(deps)({ body: {} } as any, firstRes);

    expect(firstRes.status).toHaveBeenCalledWith(400);
    expect(firstRes.json).toHaveBeenCalledWith(error.body);

    mockAssertHomeExistsIfNeeded.mockResolvedValueOnce(false);
    const secondRes = createResponse();
    await createPostObservationsHandler(deps)({ body: {} } as any, secondRes);

    expect(secondRes.json).not.toHaveBeenCalled();
    expect(mockBuildFilteredObservationsResponse).not.toHaveBeenCalled();
  });

  it('normalizes POST pagination and filters non-string BSSIDs', async () => {
    const req = {
      body: {
        limit: 75000,
        offset: -5,
        include_total: 1,
        bssids: ['AA:BB:CC:DD:EE:FF', 7, null],
        pageType: 'geospatial',
      },
    };
    const res = createResponse();

    await createPostObservationsHandler(deps)(req as any, res);

    expect(mockBuildFilteredObservationsResponse).toHaveBeenCalledWith(
      UniversalFilterQueryBuilder,
      v2Service,
      logger,
      { type: 'E' },
      { type: true },
      50000,
      0,
      ['AA:BB:CC:DD:EE:FF'],
      'geospatial',
      true
    );
  });

  it('uses POST defaults for non-object payloads and invalid limits', async () => {
    const res = createResponse();

    await createPostObservationsHandler(deps)({ body: null } as any, res);

    expect(mockBuildFilteredObservationsResponse).toHaveBeenCalledWith(
      UniversalFilterQueryBuilder,
      v2Service,
      logger,
      { type: 'E' },
      { type: true },
      10000,
      0,
      [],
      'geospatial',
      false
    );
  });
});
