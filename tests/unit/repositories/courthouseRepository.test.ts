export {};
const courthouseRepository = require('../../../server/src/repositories/courthouseRepository');
const dbConfigCourthouse = require('../../../server/src/config/database');

jest.mock('../../../server/src/config/database', () => ({
  query: jest.fn(),
}));

describe('courthouseRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch geojson successfully', async () => {
    const mockGeoJSON = { type: 'FeatureCollection', features: [] };
    (dbConfigCourthouse.query as jest.Mock).mockResolvedValue({ rows: [{ geojson: mockGeoJSON }] });

    const result = await courthouseRepository.fetchFederalCourthousesGeoJSON();

    expect(dbConfigCourthouse.query).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockGeoJSON);
  });

  it('should return default empty feature collection if no result', async () => {
    (dbConfigCourthouse.query as jest.Mock).mockResolvedValue({ rows: [] });

    const result = await courthouseRepository.fetchFederalCourthousesGeoJSON();

    expect(result).toEqual({ type: 'FeatureCollection', features: [] });
  });

  describe('findNearestCourthousesBatch', () => {
    it('returns nearest federal courthouse per selected observation cluster', async () => {
      const mockRows = [
        {
          cluster_id: 0,
          cluster_count: 12,
          has_wigle_obs: false,
          has_local_obs: true,
          id: 101,
          name: 'Theodore Levin United States Courthouse',
          short_name: 'Levin Courthouse',
          courthouse_type: 'district_court',
          district: 'Eastern District of Michigan',
          circuit: 'Sixth Circuit',
          city: 'Detroit',
          state: 'MI',
          postal_code: '48226',
          latitude: 42.33,
          longitude: -83.05,
          distance_meters: 1400,
        },
        {
          cluster_id: 1,
          cluster_count: 3,
          has_wigle_obs: true,
          has_local_obs: false,
          id: 202,
          name: 'Wilkie D. Ferguson Jr. United States Courthouse',
          short_name: 'Ferguson Courthouse',
          courthouse_type: 'district_court',
          district: 'Southern District of Florida',
          circuit: 'Eleventh Circuit',
          city: 'Miami',
          state: 'FL',
          postal_code: '33128',
          latitude: 25.77,
          longitude: -80.19,
          distance_meters: 2600,
        },
      ];
      (dbConfigCourthouse.query as jest.Mock).mockResolvedValue({ rows: mockRows });

      const result = await courthouseRepository.findNearestCourthousesBatch(
        ['AA:BB:CC:DD:EE:FF'],
        250
      );

      expect(result).toHaveLength(2);
      expect(result[0].cluster_id).toBe(0);
      expect(result[1].cluster_id).toBe(1);
      expect(result[1].has_wigle_obs).toBe(true);
    });

    it('uses local and WiGLE point sources and skips invalid coordinates before clustering', async () => {
      (dbConfigCourthouse.query as jest.Mock).mockResolvedValue({ rows: [] });

      await courthouseRepository.findNearestCourthousesBatch(['AA:BB:CC:DD:EE:FF'], 250);
      const sql = (dbConfigCourthouse.query as jest.Mock).mock.calls[0][0] as string;

      expect(sql).toContain('FROM app.observations');
      expect(sql).toContain('FROM app.wigle_v3_observations');
      expect(sql).toContain('FROM app.wigle_v2_networks_search');
      expect(sql).toContain('ST_ClusterDBSCAN');
      expect(sql).toContain("BOOL_OR(source = 'wigle') AS has_wigle_obs");
      expect(sql).toContain("BOOL_OR(source = 'local') AS has_local_obs");
      expect(sql).toContain('lat IS NOT NULL AND lon IS NOT NULL');
      expect(sql).toContain('NOT (lat = 0 AND lon = 0)');
      expect(sql).toContain('latitude IS NOT NULL AND longitude IS NOT NULL');
      expect(sql).toContain('NOT (latitude = 0 AND longitude = 0)');
      expect(sql).toContain('trilat IS NOT NULL AND trilong IS NOT NULL');
      expect(sql).toContain('NOT (trilat = 0 AND trilong = 0)');
    });

    it('passes selected bssids and radius to the nearest courthouse query', async () => {
      (dbConfigCourthouse.query as jest.Mock).mockResolvedValue({ rows: [] });
      const bssids = ['AA:BB:CC:00:00:01', 'AA:BB:CC:00:00:02'];

      await courthouseRepository.findNearestCourthousesBatch(bssids, 100);

      expect(dbConfigCourthouse.query).toHaveBeenCalledWith(expect.any(String), [bssids, 100]);
    });

    it('uses MAX_NEAREST_PLACE_CLUSTERS=50, orders by cid (not COUNT), and includes cluster centroid coords', async () => {
      (dbConfigCourthouse.query as jest.Mock).mockResolvedValue({ rows: [] });

      await courthouseRepository.findNearestCourthousesBatch(['AA:BB:CC:DD:EE:FF'], 250);
      const sql = (dbConfigCourthouse.query as jest.Mock).mock.calls[0][0] as string;

      // Safety cap is 50, not a small arbitrary number
      expect(sql).toContain('LIMIT 50');
      // Must NOT use density-biased sorting that drops sparse clusters
      expect(sql).not.toContain('ORDER BY COUNT');
      // Must preserve natural DBSCAN cluster order
      expect(sql).toContain('ORDER BY cid');
      expect(sql).toContain('LEFT JOIN LATERAL');
      expect(sql).toContain('cluster_lat');
      expect(sql).toContain('cluster_lon');
    });

    it('11+ distinct singleton clusters are not silently truncated to 10', async () => {
      const mockRows = Array.from({ length: 11 }, (_, i) => ({
        cluster_id: i,
        cluster_count: 1,
        has_wigle_obs: false,
        has_local_obs: true,
        cluster_lat: 30 + i,
        cluster_lon: -90 - i,
        id: 200 + i,
        name: `District Court ${i}`,
        short_name: null,
        courthouse_type: 'district_court',
        district: `District ${i}`,
        circuit: 'Fifth Circuit',
        city: `City${i}`,
        state: 'XX',
        postal_code: '00000',
        latitude: 30 + i,
        longitude: -90 - i,
        distance_meters: 1000 + i * 100,
      }));
      (dbConfigCourthouse.query as jest.Mock).mockResolvedValue({ rows: mockRows });

      const result = await courthouseRepository.findNearestCourthousesBatch(
        ['AA:BB:CC:DD:EE:FF'],
        250
      );

      expect(result).toHaveLength(11);
      expect(result[10].cluster_id).toBe(10);

      const sql = (dbConfigCourthouse.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toContain('LIMIT 50');
      expect(sql).not.toContain('LIMIT 10');
    });

    it('cluster with no courthouse inside radius is returned with null courthouse fields', async () => {
      const mockRows = [
        {
          cluster_id: 0,
          cluster_count: 1,
          has_wigle_obs: true,
          has_local_obs: false,
          cluster_lat: 47.6,
          cluster_lon: -122.3,
          id: null,
          name: null,
          short_name: null,
          courthouse_type: null,
          district: null,
          circuit: null,
          city: null,
          state: null,
          postal_code: null,
          latitude: null,
          longitude: null,
          distance_meters: null,
        },
      ];
      (dbConfigCourthouse.query as jest.Mock).mockResolvedValue({ rows: mockRows });

      const result = await courthouseRepository.findNearestCourthousesBatch(
        ['AA:BB:CC:DD:EE:FF'],
        1
      );

      expect(result).toHaveLength(1);
      expect(result[0].cluster_id).toBe(0);
      expect(result[0].cluster_count).toBe(1);
      expect(result[0].name).toBeNull();
      expect(result[0].distance_meters).toBeNull();
    });
  });
});
