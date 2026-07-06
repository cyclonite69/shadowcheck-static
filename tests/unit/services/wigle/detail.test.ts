export {};

// Pre-define all mock functions before jest.mock() calls (hoisting safety)
const mockBuildWigleNetworksMvQuery = jest.fn(() => ({ sql: 'SELECT 1', queryParams: [] }));
const mockBuildWiglePageGeocodedAddressQuery = jest.fn(() => ({
  sql: 'SELECT 1',
  queryParams: [],
}));
const mockBuildWiglePageLocalMatchQuery = jest.fn(() => ({ sql: 'SELECT 1', queryParams: [] }));
const mockBuildWiglePageMostRecentObsQuery = jest.fn(() => ({ sql: 'SELECT 1', queryParams: [] }));
const mockBuildWiglePageV2SummaryQuery = jest.fn(() => ({ sql: 'SELECT 1', queryParams: [] }));
const mockBuildWiglePageV3DetailQuery = jest.fn(() => ({ sql: 'SELECT 1', queryParams: [] }));
const mockBuildWiglePageV3TemporalQuery = jest.fn(() => ({ sql: 'SELECT 1', queryParams: [] }));

jest.mock('../../../../server/src/repositories/wigleQueriesRepository', () => ({
  buildWigleNetworksMvQuery: mockBuildWigleNetworksMvQuery,
  buildWiglePageGeocodedAddressQuery: mockBuildWiglePageGeocodedAddressQuery,
  buildWiglePageLocalMatchQuery: mockBuildWiglePageLocalMatchQuery,
  buildWiglePageMostRecentObsQuery: mockBuildWiglePageMostRecentObsQuery,
  buildWiglePageV2SummaryQuery: mockBuildWiglePageV2SummaryQuery,
  buildWiglePageV3DetailQuery: mockBuildWiglePageV3DetailQuery,
  buildWiglePageV3TemporalQuery: mockBuildWiglePageV3TemporalQuery,
}));

jest.mock('../../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../../../server/src/services/wigle/database', () => ({
  getWigleNetworkByBSSID: jest.fn(),
}));

jest.mock('../../../../server/src/services/wigle/persistence', () => ({
  getStoredWigleDetail: jest.fn(),
}));

import {
  getWiglePageNetwork,
  getWiglePageNetworkFromMv,
  getWigleDetail,
} from '../../../../server/src/services/wigle/detail';
import { query } from '../../../../server/src/config/database';
import { getWigleNetworkByBSSID } from '../../../../server/src/services/wigle/database';
import { getStoredWigleDetail } from '../../../../server/src/services/wigle/persistence';

const queryMock = query as jest.Mock;
const getBSSIDMock = getWigleNetworkByBSSID as jest.Mock;
const getStoredMock = getStoredWigleDetail as jest.Mock;

/** Set up the 5 sequential query mocks getWiglePageNetwork fires via Promise.all:
 *  1. v3Detail, 2. v2Summary, 3. localMatch, 4. v3Temporal, 5. recentObs
 *  Optionally add a 6th for geocoding. */
function mockPageNetworkQueries({
  v3 = null,
  v2 = null,
  localMatch = {},
  temporal = {},
  recentObs = null,
  geocode,
}: {
  v3?: any;
  v2?: any;
  localMatch?: any;
  temporal?: any;
  recentObs?: any;
  geocode?: any;
}) {
  queryMock
    .mockResolvedValueOnce({ rows: v3 ? [v3] : [] })
    .mockResolvedValueOnce({ rows: v2 ? [v2] : [] })
    .mockResolvedValueOnce({ rows: localMatch ? [localMatch] : [] })
    .mockResolvedValueOnce({ rows: temporal ? [temporal] : [] })
    .mockResolvedValueOnce({ rows: recentObs ? [recentObs] : [] });

  if (geocode !== undefined) {
    queryMock.mockResolvedValueOnce({ rows: geocode ? [geocode] : [] });
  }
}

describe('wigle/detail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-arm repository builder mocks after clearAllMocks
    mockBuildWigleNetworksMvQuery.mockReturnValue({ sql: 'SELECT 1', queryParams: [] });
    mockBuildWiglePageGeocodedAddressQuery.mockReturnValue({ sql: 'SELECT 1', queryParams: [] });
    mockBuildWiglePageLocalMatchQuery.mockReturnValue({ sql: 'SELECT 1', queryParams: [] });
    mockBuildWiglePageMostRecentObsQuery.mockReturnValue({ sql: 'SELECT 1', queryParams: [] });
    mockBuildWiglePageV2SummaryQuery.mockReturnValue({ sql: 'SELECT 1', queryParams: [] });
    mockBuildWiglePageV3DetailQuery.mockReturnValue({ sql: 'SELECT 1', queryParams: [] });
    mockBuildWiglePageV3TemporalQuery.mockReturnValue({ sql: 'SELECT 1', queryParams: [] });
  });

  // ── getWiglePageNetwork ───────────────────────────────────────────────────

  describe('getWiglePageNetwork', () => {
    test('returns null when neither v3 nor v2 data exists', async () => {
      queryMock.mockResolvedValue({ rows: [] });
      expect(await getWiglePageNetwork('aa:bb:cc:dd:ee:ff')).toBeNull();
    });

    test('normalises netid to uppercase before querying', async () => {
      queryMock.mockResolvedValue({ rows: [] });
      await getWiglePageNetwork('aa:bb:cc:dd:ee:ff');
      expect(queryMock).toHaveBeenCalled();
    });

    test('trims whitespace from netid', async () => {
      queryMock.mockResolvedValue({ rows: [] });
      await getWiglePageNetwork('  aa:bb:cc:dd:ee:ff  ');
      expect(queryMock).toHaveBeenCalled();
    });

    test('returns wigle + localLinkage shape when v3 record exists', async () => {
      mockPageNetworkQueries({
        v3: { oui_manufacturer: 'Apple', trilat: 40.0, trilon: -74.0 },
        temporal: {
          wigle_v3_observation_count: 5,
          wigle_v3_centroid_lat: 40.1,
          wigle_v3_centroid_lon: -74.1,
        },
      });
      const result = await getWiglePageNetwork('AA:BB:CC:DD:EE:FF');
      expect(result).not.toBeNull();
      expect(result?.wigle).toBeDefined();
      expect(result?.localLinkage).toBeDefined();
    });

    test('returns data and wigle_source=wigle-v2 when only v2 record exists', async () => {
      mockPageNetworkQueries({
        v2: { trilat: 40.0, trilong: -74.0, oui_manufacturer: 'Samsung' },
      });
      const result = await getWiglePageNetwork('AA:BB:CC:DD:EE:FF');
      expect(result).not.toBeNull();
      expect(result?.wigle.wigle_source).toBe('wigle-v2');
    });

    test('uses v3 centroid as display coordinate when v3 observations exist', async () => {
      mockPageNetworkQueries({
        v3: { oui_manufacturer: 'X' },
        temporal: {
          wigle_v3_observation_count: 10,
          wigle_v3_centroid_lat: 42.0,
          wigle_v3_centroid_lon: -83.0,
        },
      });
      const result = await getWiglePageNetwork('AA:BB:CC:DD:EE:FF');
      expect(result?.wigle.display_coordinate_source).toBe('wigle-v3-centroid');
      expect(result?.wigle.display_lat).toBe(42.0);
    });

    test('falls back to v2 trilat when no v3 centroid', async () => {
      mockPageNetworkQueries({
        v2: { trilat: 41.0, trilong: -82.0 },
        temporal: { wigle_v3_observation_count: 0 },
      });
      const result = await getWiglePageNetwork('AA:BB:CC:DD:EE:FF');
      expect(result?.wigle.display_coordinate_source).toBe('wigle-v2-trilat');
      expect(result?.wigle.display_lat).toBe(41.0);
    });

    test('falls back to v3 summary trilat when no v3 centroid and no v2', async () => {
      mockPageNetworkQueries({
        v3: { trilat: 39.0, trilon: -80.0 },
        temporal: { wigle_v3_observation_count: 0 },
      });
      const result = await getWiglePageNetwork('AA:BB:CC:DD:EE:FF');
      expect(result?.wigle.display_coordinate_source).toBe('wigle-v3-summary');
    });

    test('display_lat/lon are null when no coordinates available', async () => {
      mockPageNetworkQueries({
        v3: { oui_manufacturer: 'X' },
        temporal: { wigle_v3_observation_count: 0 },
      });
      const result = await getWiglePageNetwork('AA:BB:CC:DD:EE:FF');
      expect(result?.wigle.display_lat).toBeNull();
      expect(result?.wigle.display_lon).toBeNull();
    });

    test('fetches geocoded address when display coordinates are present', async () => {
      mockPageNetworkQueries({
        v3: {},
        temporal: {
          wigle_v3_observation_count: 3,
          wigle_v3_centroid_lat: 42.0,
          wigle_v3_centroid_lon: -83.0,
        },
        geocode: { address: '123 Main St, Detroit, MI' },
      });
      const result = await getWiglePageNetwork('AA:BB:CC:DD:EE:FF');
      expect(result?.wigle.geocoded_address).toBe('123 Main St, Detroit, MI');
    });

    test('geocoded_address is null when geocoding returns empty rows', async () => {
      mockPageNetworkQueries({
        v3: {},
        temporal: {
          wigle_v3_observation_count: 3,
          wigle_v3_centroid_lat: 42.0,
          wigle_v3_centroid_lon: -83.0,
        },
        geocode: null,
      });
      const result = await getWiglePageNetwork('AA:BB:CC:DD:EE:FF');
      expect(result?.wigle.geocoded_address).toBeNull();
    });

    test('geocoded_address is null when geocoding query throws', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{ oui_manufacturer: 'X' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({
          rows: [
            {
              wigle_v3_observation_count: 3,
              wigle_v3_centroid_lat: 42.0,
              wigle_v3_centroid_lon: -83.0,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('geocoding_cache does not exist'));

      const result = await getWiglePageNetwork('AA:BB:CC:DD:EE:FF');
      expect(result?.wigle.geocoded_address).toBeNull();
    });

    test('populates localLinkage fields from localMatch row', async () => {
      mockPageNetworkQueries({
        v3: {},
        localMatch: {
          has_local_match: true,
          local_observation_count: 5,
          local_first_seen: '2023-01-01',
          local_last_seen: '2024-01-01',
        },
      });
      const result = await getWiglePageNetwork('AA:BB:CC:DD:EE:FF');
      expect(result?.localLinkage.has_local_match).toBe(true);
      expect(result?.localLinkage.local_observation_count).toBe(5);
    });

    test('populates recent obs fields from recentObs row', async () => {
      mockPageNetworkQueries({
        v3: {},
        recentObs: { ssid: 'TEST-SSID', channel: 6, frequency: 2437, accuracy: 8 },
      });
      const result = await getWiglePageNetwork('AA:BB:CC:DD:EE:FF');
      expect(result?.wigle.recent_ssid).toBe('TEST-SSID');
      expect(result?.wigle.recent_channel).toBe(6);
    });

    test('public_nonstationary_flag is true when spread > 500m with v3 obs', async () => {
      mockPageNetworkQueries({
        v3: {},
        temporal: {
          wigle_v3_observation_count: 5,
          wigle_v3_spread_m: 600,
          wigle_v3_centroid_lat: 42.0,
          wigle_v3_centroid_lon: -83.0,
        },
      });
      const result = await getWiglePageNetwork('AA:BB:CC:DD:EE:FF');
      expect(result?.wigle.public_nonstationary_flag).toBe(true);
    });

    test('public_nonstationary_flag is false when spread ≤ 500m', async () => {
      mockPageNetworkQueries({
        v3: {},
        temporal: {
          wigle_v3_observation_count: 5,
          wigle_v3_spread_m: 100,
          wigle_v3_centroid_lat: 42.0,
          wigle_v3_centroid_lon: -83.0,
        },
      });
      const result = await getWiglePageNetwork('AA:BB:CC:DD:EE:FF');
      expect(result?.wigle.public_nonstationary_flag).toBe(false);
    });

    test('recentObs query failure is swallowed — result still returned', async () => {
      queryMock
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{}] })
        .mockResolvedValueOnce({ rows: [{ wigle_v3_observation_count: 0 }] })
        .mockRejectedValueOnce(new Error('table missing'));

      const result = await getWiglePageNetwork('AA:BB:CC:DD:EE:FF');
      expect(result).not.toBeNull();
      expect(result?.wigle.recent_ssid).toBeNull();
    });
  });

  // ── getWiglePageNetworkFromMv ─────────────────────────────────────────────

  describe('getWiglePageNetworkFromMv', () => {
    test('returns null when MV query returns no rows', async () => {
      queryMock.mockResolvedValue({ rows: [] });
      expect(await getWiglePageNetworkFromMv('AA:BB:CC:DD:EE:FF')).toBeNull();
    });

    test('returns null when MV query throws', async () => {
      queryMock.mockRejectedValue(new Error('MV not found'));
      expect(await getWiglePageNetworkFromMv('AA:BB:CC:DD:EE:FF')).toBeNull();
    });

    test('returns wigle + localLinkage when MV row exists', async () => {
      queryMock
        .mockResolvedValueOnce({
          rows: [{ bssid: 'AA:BB:CC:DD:EE:FF', display_lat: null, display_lon: null }],
        })
        .mockResolvedValueOnce({ rows: [] });
      const result = await getWiglePageNetworkFromMv('aa:bb:cc:dd:ee:ff');
      expect(result).not.toBeNull();
      expect(result?.wigle.bssid).toBe('AA:BB:CC:DD:EE:FF');
      expect(result?.localLinkage).toBeDefined();
    });

    test('fetches geocoded address when MV has display coordinates', async () => {
      queryMock
        .mockResolvedValueOnce({
          rows: [{ bssid: 'AA:BB:CC:DD:EE:FF', display_lat: 42.0, display_lon: -83.0 }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ address: '456 Oak Ave, Flint, MI' }] });

      const result = await getWiglePageNetworkFromMv('AA:BB:CC:DD:EE:FF');
      expect(result?.wigle.geocoded_address).toBe('456 Oak Ave, Flint, MI');
    });

    test('geocoded_address is null when geocoding throws in MV path', async () => {
      queryMock
        .mockResolvedValueOnce({
          rows: [{ bssid: 'AA:BB:CC:DD:EE:FF', display_lat: 42.0, display_lon: -83.0 }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('geocoding_cache does not exist'));

      const result = await getWiglePageNetworkFromMv('AA:BB:CC:DD:EE:FF');
      expect(result?.wigle.geocoded_address).toBeNull();
    });

    test('recentObs failure is swallowed in MV path', async () => {
      queryMock
        .mockResolvedValueOnce({
          rows: [{ bssid: 'AA:BB:CC:DD:EE:FF', display_lat: null, display_lon: null }],
        })
        .mockRejectedValueOnce(new Error('table missing'));

      const result = await getWiglePageNetworkFromMv('AA:BB:CC:DD:EE:FF');
      expect(result).not.toBeNull();
      expect(result?.wigle.recent_ssid).toBeNull();
    });

    test('normalises bssid to uppercase before querying', async () => {
      queryMock
        .mockResolvedValueOnce({
          rows: [{ bssid: 'AA:BB:CC:DD:EE:FF', display_lat: null, display_lon: null }],
        })
        .mockResolvedValueOnce({ rows: [] });

      await getWiglePageNetworkFromMv('aa:bb:cc:dd:ee:ff');
      expect(mockBuildWigleNetworksMvQuery).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    });
  });

  // ── getWigleDetail ────────────────────────────────────────────────────────

  describe('getWigleDetail', () => {
    test('returns stored detail when persistence layer has a row', async () => {
      const stored = { bssid: 'AA:BB:CC:DD:EE:FF', ssid: 'StoredNetwork' };
      getStoredMock.mockResolvedValue([stored]);
      const result = await getWigleDetail('AA:BB:CC:DD:EE:FF');
      expect(result).toEqual(stored);
      expect(getBSSIDMock).not.toHaveBeenCalled();
    });

    test('falls back to getWigleNetworkByBSSID when persistence is empty', async () => {
      getStoredMock.mockResolvedValue([]);
      const network = { bssid: 'AA:BB:CC:DD:EE:FF', ssid: 'LiveNetwork' };
      getBSSIDMock.mockResolvedValue(network);
      const result = await getWigleDetail('AA:BB:CC:DD:EE:FF');
      expect(result).toEqual(network);
      expect(getBSSIDMock).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    });

    test('returns null when both persistence and BSSID lookup return nothing', async () => {
      getStoredMock.mockResolvedValue([]);
      getBSSIDMock.mockResolvedValue(null);
      const result = await getWigleDetail('AA:BB:CC:DD:EE:FF');
      expect(result).toBeNull();
    });
  });
});
