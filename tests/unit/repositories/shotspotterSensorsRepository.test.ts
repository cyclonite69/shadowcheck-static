export {};

const mockQuery = jest.fn();

jest.mock('../../../server/src/config/database', () => ({
  query: mockQuery,
}));

describe('shotspotterSensorsRepository — fetchShotspotterSensorsGeoJSON', () => {
  let fetchShotspotterSensorsGeoJSON: () => Promise<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    jest.mock('../../../server/src/config/database', () => ({ query: mockQuery }));
    ({ fetchShotspotterSensorsGeoJSON } = require('../../../server/src/repositories/shotspotterSensorsRepository'));
  });

  it('returns the geojson from the first row', async () => {
    const expectedGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 42,
          geometry: { type: 'Point', coordinates: [-122.4, 37.7] },
          properties: {
            sensor_id: 'SS-001',
            city: 'San Francisco',
            state: 'CA',
            status: 'active',
            source: 'wired_2024',
          },
        },
      ],
    };
    mockQuery.mockResolvedValue({ rows: [{ geojson: expectedGeoJSON }] });

    const result = await fetchShotspotterSensorsGeoJSON();

    expect(result).toEqual(expectedGeoJSON);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0][0]).toContain('shotspotter_sensors');
  });

  it('returns empty FeatureCollection when geojson is null', async () => {
    mockQuery.mockResolvedValue({ rows: [{ geojson: null }] });

    const result = await fetchShotspotterSensorsGeoJSON();

    expect(result).toEqual({ type: 'FeatureCollection', features: [] });
  });

  it('returns empty FeatureCollection when rows array is empty', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    const result = await fetchShotspotterSensorsGeoJSON();

    expect(result).toEqual({ type: 'FeatureCollection', features: [] });
  });

  it('propagates query errors', async () => {
    mockQuery.mockRejectedValue(new Error('Connection timeout'));

    await expect(fetchShotspotterSensorsGeoJSON()).rejects.toThrow('Connection timeout');
  });

  it('uses a WHERE geom IS NOT NULL clause to exclude un-geolocated sensors', async () => {
    mockQuery.mockResolvedValue({ rows: [{ geojson: { type: 'FeatureCollection', features: [] } }] });

    await fetchShotspotterSensorsGeoJSON();

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('geom IS NOT NULL');
  });

  it('uses a parameterless SQL query (no injection surface)', async () => {
    mockQuery.mockResolvedValue({ rows: [{ geojson: { type: 'FeatureCollection', features: [] } }] });

    await fetchShotspotterSensorsGeoJSON();

    const callArgs = mockQuery.mock.calls[0];
    expect(callArgs.length).toBe(1);
  });
});
