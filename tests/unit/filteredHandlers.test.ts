import { createHandlers } from '../../server/src/api/routes/v2/filteredHandlers';

jest.mock('../../server/src/services/adminNetworkMediaService', () => ({
  getUnmatchedMediaPoints: jest.fn(),
  getMatchedMediaPoints: jest.fn(),
}));

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

  describe('unmatchedMedia handler', () => {
    it('should return unmatched media points in GeoJSON format', async () => {
      const mockPoints = [
        {
          id: '123',
          bssid: 'VISINT_UNMATCHED',
          filename: 'test.jpg',
          exif_lat: '43.123',
          exif_lon: '-83.456',
          exif_captured_at: '2026-06-12T00:00:00Z',
        },
      ];

      const {
        getUnmatchedMediaPoints,
      } = require('../../server/src/services/adminNetworkMediaService');
      getUnmatchedMediaPoints.mockResolvedValue(mockPoints);

      const res = { json: jest.fn() };
      await handlers.unmatchedMedia({} as any, res as any);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [-83.456, 43.123],
            },
            properties: {
              id: '123',
              bssid: 'VISINT_UNMATCHED',
              filename: 'test.jpg',
              captured_at: '2026-06-12T00:00:00Z',
              thumbnail_url: '/api/v2/networks/media/123/thumbnail',
              inline_url: '/api/v2/networks/media/123/inline',
            },
          },
        ],
      });
    });
  });

  describe('matchedMedia handler', () => {
    it('should return matched media points in GeoJSON format', async () => {
      const mockPoints = [
        {
          component_id: 'AA:BB:CC:DD:EE:FF',
          lat: '43.02',
          lon: '-83.69',
          media_count: 2,
          media_ids: ['10', '11'],
          member_bssids: ['AA:BB:CC:DD:EE:FF', 'AA:BB:CC:DD:EE:FE'],
          location_provenance: 'component_location',
          marker_location_source: 'observation',
          observation_id: 123,
          capture_lat: '43.01',
          capture_lon: '-83.68',
          observation_lat: '43.02',
          observation_lon: '-83.69',
          network_lat: '43.03',
          network_lon: '-83.70',
        },
      ];

      const {
        getMatchedMediaPoints,
      } = require('../../server/src/services/adminNetworkMediaService');
      getMatchedMediaPoints.mockResolvedValue(mockPoints);

      const res = { json: jest.fn() };
      await handlers.matchedMedia({} as any, res as any);

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [-83.69, 43.02],
            },
            properties: {
              component_id: 'AA:BB:CC:DD:EE:FF',
              media_count: 2,
              media_ids: ['10', '11'],
              member_bssids: ['AA:BB:CC:DD:EE:FF', 'AA:BB:CC:DD:EE:FE'],
              location_provenance: 'component_location',
              location_confidence: null,
              marker_location_source: 'observation',
              observation_id: 123,
              capture_lat: 43.01,
              capture_lon: -83.68,
              observation_lat: 43.02,
              observation_lon: -83.69,
              network_lat: 43.03,
              network_lon: -83.7,
            },
          },
        ],
      });
    });
  });
});
