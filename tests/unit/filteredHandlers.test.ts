import { createHandlers } from '../../server/src/api/routes/v2/filteredHandlers';
import * as filteredHelpers from '../../server/src/api/routes/v2/filteredHelpers';
import { ROUTE_CONFIG } from '../../server/src/config/routeConfig';
import type { Request, Response } from 'express';

jest.mock('../../server/src/api/routes/v2/filteredHelpers', () => {
  return {
    ...jest.requireActual('../../server/src/api/routes/v2/filteredHelpers'),
    assertHomeExistsIfNeeded: jest.fn(),
    parseAndValidateFilters: jest.fn(),
    isParseValidatedFiltersError: jest.fn(),
    normalizeThreatTransparency: jest.fn(),
  };
});

describe('filteredHandlers', () => {
  let mockUniversalFilterQueryBuilder: jest.Mock;
  let mockValidateFilterPayload: jest.Mock;
  let mockExecuteV2Query: jest.Mock;
  let mockGetFilteredAnalytics: jest.Mock;
  let mockLoggerInfo: jest.Mock;
  let mockLoggerWarn: jest.Mock;
  let mockLimitValidator: jest.Mock;
  let mockOffsetValidator: jest.Mock;
  let deps: any;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let handlers: ReturnType<typeof createHandlers>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUniversalFilterQueryBuilder = jest.fn();
    mockUniversalFilterQueryBuilder.prototype.buildNetworkListQuery = jest
      .fn()
      .mockReturnValue({
        sql: 'list sql',
        params: [],
        appliedFilters: [],
        ignoredFilters: [],
        warnings: [],
      });
    mockUniversalFilterQueryBuilder.prototype.buildNetworkCountQuery = jest
      .fn()
      .mockReturnValue({ sql: 'count sql', params: [] });
    mockUniversalFilterQueryBuilder.prototype.buildGeospatialQuery = jest
      .fn()
      .mockReturnValue({
        sql: 'geo sql',
        params: [],
        appliedFilters: [],
        ignoredFilters: [],
        warnings: [],
      });

    mockValidateFilterPayload = jest.fn().mockReturnValue({ errors: [] });
    mockExecuteV2Query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    mockGetFilteredAnalytics = jest.fn().mockResolvedValue({ data: {}, queryDurationMs: 10 });
    mockLoggerInfo = jest.fn();
    mockLoggerWarn = jest.fn();
    mockLimitValidator = jest.fn((val, min, max, fallback) =>
      val ? parseInt(val as string, 10) : fallback
    );
    mockOffsetValidator = jest.fn((val) => (val ? parseInt(val as string, 10) : 0));

    deps = {
      filterQueryBuilder: {
        UniversalFilterQueryBuilder: mockUniversalFilterQueryBuilder,
        validateFilterPayload: mockValidateFilterPayload,
      },
      v2Service: {
        executeV2Query: mockExecuteV2Query,
      },
      filteredAnalyticsService: {
        getFilteredAnalytics: mockGetFilteredAnalytics,
      },
      logger: {
        info: mockLoggerInfo,
        warn: mockLoggerWarn,
      },
      validators: {
        limit: mockLimitValidator,
        offset: mockOffsetValidator,
      },
    };

    handlers = createHandlers(deps);

    req = {
      query: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    (filteredHelpers.assertHomeExistsIfNeeded as jest.Mock).mockResolvedValue(true);
    (filteredHelpers.parseAndValidateFilters as jest.Mock).mockReturnValue({
      filters: {},
      enabled: {},
    });
    (filteredHelpers.isParseValidatedFiltersError as unknown as jest.Mock).mockReturnValue(false);
    (filteredHelpers.normalizeThreatTransparency as jest.Mock).mockReturnValue({
      threatReasons: [],
      threatEvidence: {},
      transparencyError: false,
    });
  });

  describe('debug', () => {
    it('should return a debug message', () => {
      handlers.debug(req as Request, res as Response);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Debug route works' })
      );
    });
  });

  describe('list', () => {
    it('should return 400 if parsing filters fails', async () => {
      (filteredHelpers.parseAndValidateFilters as jest.Mock).mockReturnValue({
        status: 400,
        body: { error: 'bad' },
      });
      (filteredHelpers.isParseValidatedFiltersError as unknown as jest.Mock).mockReturnValue(true);

      await handlers.list(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'bad' });
    });

    it('should return early if home does not exist and is needed', async () => {
      (filteredHelpers.assertHomeExistsIfNeeded as jest.Mock).mockResolvedValue(false);

      await handlers.list(req as Request, res as Response);

      expect(mockExecuteV2Query).not.toHaveBeenCalled();
    });

    it('should execute list query and return enriched rows', async () => {
      req.query = { limit: '10', offset: '0', location_mode: 'centroid' };
      mockExecuteV2Query.mockResolvedValueOnce({
        rows: [{ bssid: '1', is_ignored: true, threat: { level: 'HIGH' } }],
        rowCount: 1,
      }); // For data

      await handlers.list(req as Request, res as Response);

      expect(mockExecuteV2Query).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.data[0].bssid).toBe('1');
      // is_ignored = true sets threat to NONE, IGNORED flags
      expect(responseBody.data[0].threat.level).toBe('NONE');
    });

    it('should handle is_ignored="true" string format', async () => {
      req.query = { limit: '10', offset: '0' };
      mockExecuteV2Query.mockResolvedValueOnce({
        rows: [{ bssid: '2', is_ignored: 'true', threat: { level: 'HIGH' } }],
        rowCount: 1,
      });

      await handlers.list(req as Request, res as Response);
      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.data[0].threat.level).toBe('NONE');
    });

    it('should include total count if requested', async () => {
      req.query = { includeTotal: '1', limit: '10', offset: '0' };
      mockExecuteV2Query
        .mockResolvedValueOnce({ rows: [{ bssid: '1' }], rowCount: 1 }) // Data query
        .mockResolvedValueOnce({ rows: [{ total: '5' }], rowCount: 1 }); // Count query

      await handlers.list(req as Request, res as Response);

      expect(mockExecuteV2Query).toHaveBeenCalledTimes(2);
      expect(mockUniversalFilterQueryBuilder.prototype.buildNetworkCountQuery).toHaveBeenCalled();
      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.pagination.total).toBe(5);
    });

    it('should trigger slow query warning if took too long', async () => {
      const originalNow = Date.now;
      let nowCalls = 0;
      jest.spyOn(Date, 'now').mockImplementation(() => {
        nowCalls++;
        if (nowCalls <= 2) return 1000; // start, buildStart
        if (nowCalls <= 4) return 1000 + 10; // queryStart
        return 1000 + ROUTE_CONFIG.slowFilteredQueryMs + 10; // after query
      });

      req.query = { limit: '10' };
      mockExecuteV2Query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await handlers.list(req as Request, res as Response);

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        '[v2/filtered] Slow query detected',
        expect.any(Object)
      );

      jest.restoreAllMocks();
    });

    it('should handle trackPerformance if env is true', async () => {
      const originalEnv = process.env.TRACK_QUERY_PERFORMANCE;
      process.env.TRACK_QUERY_PERFORMANCE = 'true';

      await handlers.list(req as Request, res as Response);

      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.performance).toBeDefined();

      process.env.TRACK_QUERY_PERFORMANCE = originalEnv;
    });
  });

  describe('geospatial', () => {
    it('should return 400 if parsing filters fails', async () => {
      (filteredHelpers.parseAndValidateFilters as jest.Mock).mockReturnValue({
        status: 400,
        body: { error: 'bad' },
      });
      (filteredHelpers.isParseValidatedFiltersError as unknown as jest.Mock).mockReturnValue(true);

      await handlers.geospatial(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'bad' });
    });

    it('should execute geospatial query and return features', async () => {
      req.query = { limit: '10', location_mode: 'centroid' };
      mockExecuteV2Query.mockResolvedValueOnce({
        rows: [
          { lon: 10, lat: 20, bssid: '1', level: -50, is_ignored: true, threat: { level: 'HIGH' } },
        ],
        rowCount: 1,
      });

      await handlers.geospatial(req as Request, res as Response);

      expect(mockExecuteV2Query).toHaveBeenCalled();
      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.type).toBe('FeatureCollection');
      expect(responseBody.features[0].properties.bssid).toBe('1');
      expect(responseBody.features[0].properties.threat.level).toBe('NONE'); // Ignored logic
      expect(responseBody.features[0].geometry.coordinates).toEqual([10, 20]);
    });
  });

  describe('getObservations', () => {
    it('should return 400 if parsing filters fails', async () => {
      (filteredHelpers.parseAndValidateFilters as jest.Mock).mockReturnValue({
        status: 400,
        body: { error: 'bad' },
      });
      (filteredHelpers.isParseValidatedFiltersError as unknown as jest.Mock).mockReturnValue(true);

      await handlers.getObservations(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'bad' });
    });

    it('should get observations and handle truncation logic', async () => {
      req.query = { limit: '2', include_total: '1', offset: '0', pageType: 'wigle' };
      mockExecuteV2Query.mockResolvedValueOnce({
        rows: [{ id: 1 }, { id: 2 }, { id: 3 }],
        rowCount: 3,
      });

      await handlers.getObservations(req as Request, res as Response);

      expect(mockUniversalFilterQueryBuilder.prototype.buildGeospatialQuery).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 3 }) // limit + 1
      );

      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.data.length).toBe(2);
      expect(responseBody.truncated).toBe(true);
    });

    it('should query without truncation if include_total is not 1', async () => {
      req.query = { limit: '2', include_total: '0', offset: '0' };
      mockExecuteV2Query.mockResolvedValueOnce({
        rows: [{ id: 1 }, { id: 2 }],
        rowCount: 2,
      });

      await handlers.getObservations(req as Request, res as Response);

      expect(mockUniversalFilterQueryBuilder.prototype.buildGeospatialQuery).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 2 }) // exact limit
      );

      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.data.length).toBe(2);
      expect(responseBody.truncated).toBeUndefined();
    });
  });

  describe('postObservations', () => {
    it('should validate body filters and return 400 if errors', async () => {
      mockValidateFilterPayload.mockReturnValueOnce({ errors: ['Invalid filter'] });
      req.body = { filters: { test: true } };

      await handlers.postObservations(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ ok: false, errors: ['Invalid filter'] });
    });

    it('should return early if home not exist', async () => {
      (filteredHelpers.assertHomeExistsIfNeeded as jest.Mock).mockResolvedValue(false);
      req.body = { filters: {}, enabled: {} };

      await handlers.postObservations(req as Request, res as Response);

      expect(mockExecuteV2Query).not.toHaveBeenCalled();
    });

    it('should execute and apply body limit, offset, and include_total', async () => {
      req.body = { limit: 5, offset: 2, include_total: 1, pageType: 'wigle', bssids: ['AA:BB'] };
      mockExecuteV2Query.mockResolvedValueOnce({
        rows: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }],
        rowCount: 6,
      });

      await handlers.postObservations(req as Request, res as Response);

      expect(mockUniversalFilterQueryBuilder.prototype.buildGeospatialQuery).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 6, offset: 2, selectedBssids: ['AA:BB'] })
      );

      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.data.length).toBe(5);
      expect(responseBody.truncated).toBe(true);
      expect(responseBody.offset).toBe(2);
      expect(responseBody.limit).toBe(5);
    });
  });

  describe('analytics', () => {
    it('should return 400 if parsing filters fails', async () => {
      (filteredHelpers.parseAndValidateFilters as jest.Mock).mockReturnValue({
        status: 400,
        body: { error: 'bad' },
      });
      (filteredHelpers.isParseValidatedFiltersError as unknown as jest.Mock).mockReturnValue(true);

      await handlers.analytics(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'bad' });
    });

    it('should return early if home not exist', async () => {
      (filteredHelpers.assertHomeExistsIfNeeded as jest.Mock).mockResolvedValue(false);

      await handlers.analytics(req as Request, res as Response);

      expect(mockGetFilteredAnalytics).not.toHaveBeenCalled();
    });

    it('should call getFilteredAnalytics and return result', async () => {
      await handlers.analytics(req as Request, res as Response);

      expect(mockGetFilteredAnalytics).toHaveBeenCalled();
      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.ok).toBe(true);
      expect(responseBody.meta.fastPath).toBe(false);
      expect(responseBody.meta.threatThresholds).toBe(ROUTE_CONFIG.threatThresholds);
    });
  });
});
