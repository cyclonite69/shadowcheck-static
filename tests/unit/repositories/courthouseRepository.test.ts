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
  });
});
