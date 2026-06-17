const mockQuery = jest.fn();

jest.mock('../../../server/src/config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

import { fetchShotSpotterZonesGeoJSON } from '../../../server/src/repositories/shotspotterRepository';

describe('server/src/repositories/shotspotterRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns database GeoJSON and keeps the query parameterless', async () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', id: 1, properties: { city: 'Detroit' } }],
    };
    mockQuery.mockResolvedValue({ rows: [{ geojson }] });

    await expect(fetchShotSpotterZonesGeoJSON()).resolves.toEqual(geojson);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0]).toHaveLength(1);
    expect(mockQuery.mock.calls[0][0]).toContain('FROM app.shotspotter_zones');
    expect(mockQuery.mock.calls[0][0]).toContain('WHERE geom IS NOT NULL');
  });

  it('returns an empty FeatureCollection when the query returns no geojson', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await expect(fetchShotSpotterZonesGeoJSON()).resolves.toEqual({
      type: 'FeatureCollection',
      features: [],
    });
  });
});
