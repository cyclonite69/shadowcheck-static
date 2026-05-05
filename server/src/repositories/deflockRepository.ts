const { query } = require('../config/database');

/**
 * Fetches all DeFlock camera locations as a GeoJSON FeatureCollection.
 */
export async function fetchDeflockCamerasGeoJSON(): Promise<any> {
  const sql = `
    SELECT
      jsonb_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'id', id,
            'geometry', ST_AsGeoJSON(geom)::jsonb,
            'properties', jsonb_build_object(
              'id', id,
              'city', city,
              'state', state,
              'source', source
            )
          )
        ), '[]'::jsonb)
      ) as geojson
    FROM app.deflock_cameras
    WHERE geom IS NOT NULL;
  `;

  const result = await query(sql);
  return (
    result.rows[0]?.geojson || {
      type: 'FeatureCollection',
      features: [],
    }
  );
}
