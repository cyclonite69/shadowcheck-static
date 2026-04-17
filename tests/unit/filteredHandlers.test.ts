import { createHandlers } from '../../server/src/api/routes/v2/filteredHandlers';

describe('filteredHandlers (unit)', () => {
  let mockUniversalFilterQueryBuilder: any;
  let mockV2Service: any;
  let mockFilteredAnalyticsService: any;
  let mockLogger: any;
  let mockValidators: any;
  let handlers: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUniversalFilterQueryBuilder = jest.fn().mockImplementation(() => ({
      buildNetworkListQuery: jest.fn(() => ({
        sql: 'sql',
        params: [],
        appliedFilters: [],
        ignoredFilters: [],
        warnings: [],
      })),
      buildNetworkCountQuery: jest.fn(() => ({ sql: 'sql', params: [] })),
      buildGeospatialQuery: jest.fn(() => ({
        sql: 'sql',
        params: [],
        appliedFilters: [],
        ignoredFilters: [],
        warnings: [],
      })),
    }));

    mockV2Service = {
      executeV2Query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };

    mockFilteredAnalyticsService = {
      getFilteredAnalytics: jest.fn().mockResolvedValue({ data: {}, queryDurationMs: 10 }),
    };

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
    };

    mockValidators = {
      limit: jest.fn((val, min, max, fallback) => (val ? parseInt(val) : fallback)),
      offset: jest.fn((val) => (val ? parseInt(val) : 0)),
    };

    const deps = {
      filterQueryBuilder: {
        UniversalFilterQueryBuilder: mockUniversalFilterQueryBuilder,
        validateFilterPayload: jest.fn(() => ({ errors: [] })),
      },
      v2Service: mockV2Service,
      filteredAnalyticsService: mockFilteredAnalyticsService,
      logger: mockLogger,
      validators: mockValidators,
    };

    handlers = createHandlers(deps);
  });

  describe('debug handler', () => {
    it('should return debug message', async () => {
      const res = { json: jest.fn() };
      await handlers.debug({} as any, res as any);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Debug route works' })
      );
    });
  });

  // Additional unit tests can be added here, testing 'handlers' functions directly
  // by passing mocked Request/Response objects, avoiding the supertest/express server issues.
});
