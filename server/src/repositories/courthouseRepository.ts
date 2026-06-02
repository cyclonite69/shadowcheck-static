const { query } = require('../config/database');

export async function fetchFederalCourthousesGeoJSON(): Promise<any> {
  const sql = `
    SELECT 
      jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'id', id,
            'geometry', ST_AsGeoJSON(location)::jsonb,
            'properties', jsonb_build_object(
              'id', id,
              'name', name,
              'short_name', short_name,
              'courthouse_type', courthouse_type,
              'district', district,
              'circuit', circuit,
              'address_line1', address_line1,
              'city', city,
              'state', state,
              'postal_code', postal_code,
              'active', active
            )
          )
        )
      ) as geojson
    FROM app.federal_courthouses
    WHERE active = TRUE
      AND location IS NOT NULL;
  `;

  const result = await query(sql);
  return (
    result.rows[0]?.geojson || {
      type: 'FeatureCollection',
      features: [],
    }
  );
}

/**
 * DBSCAN-cluster observation points for the given BSSIDs (local + WiGLE),
 * then return the nearest federal courthouse per cluster.
 * Returns one row per cluster with cluster_id, cluster_count, and source flags.
 */
export async function findNearestCourthousesBatch(
  bssids: string[],
  radius: number
): Promise<any[]> {
  const sql = `
    WITH all_observations AS (
      SELECT lat, lon, 'local' AS source
      FROM app.observations
      WHERE UPPER(bssid) = ANY($1)
        AND lat IS NOT NULL AND lon IS NOT NULL
        AND NOT (lat = 0 AND lon = 0)
      UNION ALL
      SELECT latitude AS lat, longitude AS lon, 'wigle' AS source
      FROM app.wigle_v3_observations
      WHERE UPPER(netid) = ANY($1)
        AND latitude IS NOT NULL AND longitude IS NOT NULL
        AND NOT (latitude = 0 AND longitude = 0)
      UNION ALL
      SELECT trilat::double precision AS lat, trilong::double precision AS lon, 'wigle' AS source
      FROM app.wigle_v2_networks_search
      WHERE UPPER(bssid) = ANY($1)
        AND trilat IS NOT NULL AND trilong IS NOT NULL
        AND NOT (trilat = 0 AND trilong = 0)
    ),
    clustered AS (
      SELECT lat, lon, source,
        ST_ClusterDBSCAN(
          ST_SetSRID(ST_MakePoint(lon, lat), 4326),
          eps := 0.045, minpoints := 1
        ) OVER () AS cid
      FROM all_observations
    ),
    centroids AS (
      SELECT
        cid,
        AVG(lat)  AS lat,
        AVG(lon)  AS lon,
        COUNT(*)  AS cluster_count,
        BOOL_OR(source = 'wigle') AS has_wigle_obs,
        BOOL_OR(source = 'local') AS has_local_obs
      FROM clustered
      GROUP BY cid
      ORDER BY COUNT(*) DESC
      LIMIT 5
    ),
    per_cluster_nearest AS (
      SELECT DISTINCT ON (c.cid)
        c.cid,
        c.cluster_count,
        c.has_wigle_obs,
        c.has_local_obs,
        ch.id, ch.name, ch.short_name, ch.courthouse_type,
        ch.district, ch.circuit,
        ch.city, ch.state, ch.postal_code,
        ST_Y(ch.location::geometry) AS latitude,
        ST_X(ch.location::geometry) AS longitude,
        ST_Distance(
          ST_SetSRID(ST_MakePoint(c.lon, c.lat), 4326)::geography,
          ch.location::geography
        ) AS distance_meters
      FROM centroids c
      CROSS JOIN app.federal_courthouses ch
      WHERE ch.location IS NOT NULL
        AND ch.active = TRUE
        AND ST_Distance(
          ST_SetSRID(ST_MakePoint(c.lon, c.lat), 4326)::geography,
          ch.location::geography
        ) <= ($2 * 1000)
      ORDER BY c.cid, ST_Distance(
        ST_SetSRID(ST_MakePoint(c.lon, c.lat), 4326)::geography,
        ch.location::geography
      )
    )
    SELECT
      cid AS cluster_id,
      cluster_count,
      has_wigle_obs,
      has_local_obs,
      id, name, short_name, courthouse_type,
      district, circuit,
      city, state, postal_code,
      latitude, longitude, distance_meters
    FROM per_cluster_nearest
    ORDER BY distance_meters ASC
  `;

  const result = await query(sql, [bssids, radius]);
  return result.rows;
}
