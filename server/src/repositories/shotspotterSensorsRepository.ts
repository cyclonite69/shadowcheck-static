const { query } = require('../config/database');

/**
 * Fetches all ShotSpotter sensor locations as a GeoJSON FeatureCollection.
 * Source: WIRED 2024 leak data (app.shotspotter_sensors).
 */
export async function fetchShotspotterSensorsGeoJSON(): Promise<any> {
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
              'sensor_id', sensor_id,
              'city', city,
              'state', state,
              'status', status,
              'source', source
            )
          )
        ), '[]'::jsonb)
      ) as geojson
    FROM app.shotspotter_sensors
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
