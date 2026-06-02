export {};

import {
  fetchAgencyOfficesGeoJSON,
  fetchAgencyOfficeCounts,
  findNearestAgenciesBatch,
} from '../../../server/src/repositories/agencyRepository';
const { query } = require('../../../server/src/config/database');

jest.mock('../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

describe('agencyRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetchAgencyOfficesGeoJSON returns FeatureCollection', async () => {
    (query as jest.Mock).mockResolvedValue({
      rows: [{ geojson: { type: 'FeatureCollection', features: [] } }],
    });
    const result = await fetchAgencyOfficesGeoJSON();
    expect(query).toHaveBeenCalled();
    expect(result.type).toBe('FeatureCollection');
  });

  test('fetchAgencyOfficeCounts returns rows', async () => {
    (query as jest.Mock).mockResolvedValue({ rows: [{ office_type: 'type1', count: 1 }] });
    const result = await fetchAgencyOfficeCounts();
    expect(result).toHaveLength(1);
    expect(result[0].office_type).toBe('type1');
  });

  describe('findNearestAgenciesBatch', () => {
    test('Michigan and Florida selected points produce multiple agency cluster matches', async () => {
      const mockRows = [
        {
          cluster_id: 0,
          cluster_count: 149,
          has_wigle_obs: false,
          has_local_obs: true,
          id: 10,
          name: 'Flint Resident Agency',
          office_type: 'resident_agency',
          city: 'Flint',
          state: 'MI',
          postal_code: '48503',
          latitude: 43.01,
          longitude: -83.69,
          distance_meters: 312,
        },
        {
          cluster_id: 1,
          cluster_count: 42,
          has_wigle_obs: true,
          has_local_obs: false,
          id: 20,
          name: 'Miami Field Office',
          office_type: 'field_office',
          city: 'Miami',
          state: 'FL',
          postal_code: '33169',
          latitude: 25.94,
          longitude: -80.19,
          distance_meters: 27900,
        },
      ];
      (query as jest.Mock).mockResolvedValue({ rows: mockRows });

      const result = await findNearestAgenciesBatch(['AA:BB:CC:DD:EE:FF'], 250);

      expect(result).toHaveLength(2);
      expect(result[0].cluster_id).toBe(0);
      expect(result[1].cluster_id).toBe(1);
      expect(result[0].cluster_count).toBe(149);
      expect(result[1].cluster_count).toBe(42);
      expect(result[0].has_local_obs).toBe(true);
      expect(result[0].has_wigle_obs).toBe(false);
      expect(result[1].has_wigle_obs).toBe(true);
    });

    test('passes bssids array and radius to query', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [] });
      const bssids = ['AA:BB:CC:00:00:01', 'AA:BB:CC:00:00:02'];
      await findNearestAgenciesBatch(bssids, 100);
      expect(query).toHaveBeenCalledWith(expect.any(String), [bssids, 100]);
    });

    test('returns empty array when no observations match', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [] });
      const result = await findNearestAgenciesBatch(['FF:FF:FF:FF:FF:FF'], 250);
      expect(result).toEqual([]);
    });

    test('single-region input returns one cluster', async () => {
      const mockRow = {
        cluster_id: 0,
        cluster_count: 5,
        has_wigle_obs: false,
        has_local_obs: true,
        id: 1,
        name: 'Chicago Field Office',
        office_type: 'field_office',
        city: 'Chicago',
        state: 'IL',
        postal_code: '60604',
        latitude: 41.88,
        longitude: -87.63,
        distance_meters: 1200,
      };
      (query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

      const result = await findNearestAgenciesBatch(['AA:BB:CC:DD:EE:01'], 250);
      expect(result).toHaveLength(1);
      expect(result[0].cluster_id).toBe(0);
    });

    test('WiGLE-only rows are included (has_wigle_obs true, has_local_obs false)', async () => {
      const mockRow = {
        cluster_id: 0,
        cluster_count: 8,
        has_wigle_obs: true,
        has_local_obs: false,
        id: 5,
        name: 'Merrillville Resident Agency',
        office_type: 'resident_agency',
        city: 'Merrillville',
        state: 'IN',
        postal_code: '46410',
        latitude: 41.47,
        longitude: -87.33,
        distance_meters: 3600,
      };
      (query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

      const result = await findNearestAgenciesBatch(['WW:WW:WW:WW:WW:WW'], 250);
      expect(result[0].has_wigle_obs).toBe(true);
      expect(result[0].has_local_obs).toBe(false);
    });

    test('local and WiGLE nearby points cluster together by spatial centroid', async () => {
      (query as jest.Mock).mockResolvedValue({
        rows: [
          {
            cluster_id: 0,
            cluster_count: 2,
            has_wigle_obs: true,
            has_local_obs: true,
            id: 7,
            name: 'Detroit Field Office',
            office_type: 'field_office',
            city: 'Detroit',
            state: 'MI',
            postal_code: '48226',
            latitude: 42.33,
            longitude: -83.05,
            distance_meters: 900,
          },
        ],
      });

      const result = await findNearestAgenciesBatch(['AA:BB:CC:DD:EE:02'], 250);
      const sql = (query as jest.Mock).mock.calls[0][0] as string;

      expect(result[0].cluster_count).toBe(2);
      expect(result[0].has_local_obs).toBe(true);
      expect(result[0].has_wigle_obs).toBe(true);
      expect(sql).toContain('ST_ClusterDBSCAN');
      expect(sql).toContain("BOOL_OR(source = 'wigle') AS has_wigle_obs");
      expect(sql).toContain("BOOL_OR(source = 'local') AS has_local_obs");
    });

    test('WiGLE v2 and v3 selected points are included in cluster input', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [] });

      await findNearestAgenciesBatch(['AA:BB:CC:DD:EE:03'], 250);
      const sql = (query as jest.Mock).mock.calls[0][0] as string;

      expect(sql).toContain('FROM app.wigle_v3_observations');
      expect(sql).toContain('FROM app.wigle_v2_networks_search');
      expect(sql).toContain("SELECT latitude AS lat, longitude AS lon, 'wigle' AS source");
      expect(sql).toContain(
        "SELECT trilat::double precision AS lat, trilong::double precision AS lon, 'wigle' AS source"
      );
    });

    test('invalid and null coordinates are skipped before clustering', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [] });

      await findNearestAgenciesBatch(['AA:BB:CC:DD:EE:04'], 250);
      const sql = (query as jest.Mock).mock.calls[0][0] as string;

      expect(sql).toContain('lat IS NOT NULL AND lon IS NOT NULL');
      expect(sql).toContain('NOT (lat = 0 AND lon = 0)');
      expect(sql).toContain('latitude IS NOT NULL AND longitude IS NOT NULL');
      expect(sql).toContain('NOT (latitude = 0 AND longitude = 0)');
      expect(sql).toContain('trilat IS NOT NULL AND trilong IS NOT NULL');
      expect(sql).toContain('NOT (trilat = 0 AND trilong = 0)');
    });
  });
});
