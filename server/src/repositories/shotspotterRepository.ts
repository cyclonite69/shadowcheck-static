const { query } = require('../config/database');

/**
 * Fetches all ShotSpotter deployment zones as a GeoJSON FeatureCollection.
 */
export async function fetchShotSpotterZonesGeoJSON(): Promise<any> {
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
              'country', country,
              'coverage_type', coverage_type,
              'contract_status', contract_status,
              'source', source,
              'source_url', source_url
            )
          )
        ), '[]'::jsonb)
      ) as geojson
    FROM app.shotspotter_zones
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
