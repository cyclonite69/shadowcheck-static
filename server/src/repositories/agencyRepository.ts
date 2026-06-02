const { query } = require('../config/database');

export async function fetchAgencyOfficesGeoJSON(): Promise<any> {
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
              'office_type', office_type,
              'address_line1', address_line1,
              'address_line2', address_line2,
              'city', city,
              'state', state,
              'postal_code', postal_code,
              'phone', phone,
              'website', website,
              'parent_office', parent_office
            )
          )
        )
      ) as geojson
    FROM app.agency_offices
    WHERE location IS NOT NULL;
  `;

  const result = await query(sql);
  return (
    result.rows[0]?.geojson || {
      type: 'FeatureCollection',
      features: [],
    }
  );
}

export async function fetchAgencyOfficeCounts(): Promise<any[]> {
  const sql = `
    SELECT 
      office_type,
      COUNT(*) as count
    FROM app.agency_offices
    GROUP BY office_type
    ORDER BY office_type;
  `;

  const result = await query(sql);
  return result.rows;
}

export async function findNearestAgenciesToNetwork(bssid: string, radius: number): Promise<any[]> {
  const sql = `
    WITH all_observations AS (
      -- Local observations (exclude default (0,0) coordinates)
      SELECT DISTINCT lat, lon, 'local' as source
      FROM app.observations
      WHERE UPPER(bssid) = UPPER($1)
        AND lat IS NOT NULL AND lon IS NOT NULL
        AND NOT (lat = 0 AND lon = 0)
      UNION
      -- WiGLE v3 observations (exclude default (0,0) coordinates)
      SELECT DISTINCT latitude as lat, longitude as lon, 'wigle' as source
      FROM app.wigle_v3_observations
      WHERE UPPER(netid) = UPPER($1)
        AND latitude IS NOT NULL AND longitude IS NOT NULL
        AND NOT (latitude = 0 AND longitude = 0)
    ),
    agency_distances AS (
      SELECT
        a.id,
        a.name,
        a.office_type,
        a.city,
        a.state,
        a.postal_code,
        ST_Y(a.location::geometry) as latitude,
        ST_X(a.location::geometry) as longitude,
        MIN(ST_Distance(
          ST_SetSRID(ST_MakePoint(o.lon, o.lat), 4326)::geography,
          a.location::geography
        )) as distance_meters,
        BOOL_OR(o.source = 'wigle') as has_wigle_obs
      FROM all_observations o
      CROSS JOIN app.agency_offices a
      GROUP BY a.id, a.name, a.office_type, a.city, a.state, a.postal_code, a.location
    )
    SELECT * FROM agency_distances
    WHERE distance_meters <= ($2 * 1000)
    ORDER BY distance_meters ASC
    LIMIT 10
  `;

  const result = await query(sql, [bssid, radius]);
  return result.rows;
}

export async function findNearestAgenciesBatch(bssids: string[], radius: number): Promise<any[]> {
  // DBSCAN clusters observation points (5 km eps), computes each cluster's
  // centroid, finds the nearest agency per cluster.
  // Returns one row per cluster (not deduplicated by agency id).
  // Caps: 5 clusters.
  const sql = `
    WITH all_observations AS (
      SELECT lat, lon, 'local' as source
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
        AVG(lat) AS lat,
        AVG(lon) AS lon,
        COUNT(*) AS cluster_count,
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
        a.id, a.name, a.office_type, a.city, a.state, a.postal_code,
        ST_Y(a.location::geometry) AS latitude,
        ST_X(a.location::geometry) AS longitude,
        ST_Distance(
          ST_SetSRID(ST_MakePoint(c.lon, c.lat), 4326)::geography,
          a.location::geography
        ) AS distance_meters
      FROM centroids c
      CROSS JOIN app.agency_offices a
      WHERE a.location IS NOT NULL
        AND ST_Distance(
          ST_SetSRID(ST_MakePoint(c.lon, c.lat), 4326)::geography,
          a.location::geography
        ) <= ($2 * 1000)
      ORDER BY c.cid, ST_Distance(
        ST_SetSRID(ST_MakePoint(c.lon, c.lat), 4326)::geography,
        a.location::geography
      )
    )
    SELECT
      cid AS cluster_id,
      cluster_count,
      has_wigle_obs,
      has_local_obs,
      id, name, office_type, city, state, postal_code,
      latitude, longitude, distance_meters
    FROM per_cluster_nearest
    ORDER BY distance_meters ASC
  `;

  const result = await query(sql, [bssids, radius]);
  return result.rows;
}
