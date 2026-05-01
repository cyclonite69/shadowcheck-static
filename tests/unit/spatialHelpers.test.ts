export {};
import { getSpatialBoundingBoxFragment } from '../../server/src/services/filterQueryBuilder/spatialHelpers';

describe('getSpatialBoundingBoxFragment', () => {
  test('returns ST_MakeEnvelope fragment with default geom column', () => {
    const result = getSpatialBoundingBoxFragment(38.9, -77.0, 1000);
    expect(result).toContain('ST_MakeEnvelope(');
    expect(result).toContain('4326)');
    expect(result).toMatch(/^geom &&/);
  });

  test('uses custom geom column name', () => {
    const result = getSpatialBoundingBoxFragment(38.9, -77.0, 1000, 'location');
    expect(result).toMatch(/^location &&/);
  });

  test('bounding box expands by radiusMeters / 111000 degrees', () => {
    const lat = 40.0;
    const lon = -74.0;
    const radiusMeters = 111000; // exactly 1 degree
    const result = getSpatialBoundingBoxFragment(lat, lon, radiusMeters);

    // deg = 1.0, so envelope should be lon±1, lat±1
    expect(result).toContain(`${lon - 1}`);
    expect(result).toContain(`${lon + 1}`);
    expect(result).toContain(`${lat - 1}`);
    expect(result).toContain(`${lat + 1}`);
  });

  test('small radius produces tight bounding box', () => {
    const lat = 0;
    const lon = 0;
    const radiusMeters = 111; // 0.001 degrees
    const result = getSpatialBoundingBoxFragment(lat, lon, radiusMeters);
    const deg = 111 / 111000;
    expect(result).toContain(`${lon - deg}`);
    expect(result).toContain(`${lat - deg}`);
  });

  test('fragment is valid SQL-like string (no injection vectors)', () => {
    const result = getSpatialBoundingBoxFragment(51.5, -0.1, 500);
    // Should not contain quotes or semicolons
    expect(result).not.toContain("'");
    expect(result).not.toContain(';');
    expect(result).toContain('ST_MakeEnvelope');
  });
});
