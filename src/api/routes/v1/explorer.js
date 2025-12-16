const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');

function inferSecurity(capabilities, encryption) {
  const cap = String(capabilities || encryption || '').toUpperCase();
  if (!cap) {
    return 'OPEN';
  }
  const hasEap = cap.includes('EAP') || cap.includes('MGT');
  if (cap.includes('WPA3') || cap.includes('SAE')) {
    return hasEap ? 'WPA3-E' : 'WPA3-P';
  }
  if (cap.includes('WPA2') || cap.includes('RSN')) {
    return hasEap ? 'WPA2-E' : 'WPA2-P';
  }
  if (cap.includes('WPA')) {
    return 'WPA';
  }
  if (cap.includes('WEP')) {
    return 'WEP';
  }
  if (cap.includes('WPS') && !cap.includes('WPA')) {
    return 'WPS';
  }
  return 'Unknown';
}

// Basic input guards
function parseIntParam(value, defaultValue, max) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n <= 0) {
    return defaultValue;
  }
  return max ? Math.min(n, max) : n;
}

// GET /api/explorer/networks
// Returns latest snapshot per BSSID from mv_network_latest + metadata
router.get('/explorer/networks', async (req, res, _next) => {
  try {
    const rawLimit = req.query.limit;
    const limit =
      typeof rawLimit === 'string' && rawLimit.toLowerCase() === 'all'
        ? null
        : parseIntParam(rawLimit, 500, 5000);
    const offset = limit === null ? 0 : Math.max(0, parseInt(req.query.offset, 10) || 0);
    const search = req.query.search ? String(req.query.search).trim() : '';
    const sort = (req.query.sort || 'observed_at').toLowerCase();
    const order = (req.query.order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Sort uses columns exposed in the outer select (no inner aliases)
    const sortMap = {
      observed_at: 'observed_at',
      last_seen: 'observed_at',
      ssid: 'ssid',
      bssid: 'bssid',
      signal: 'level',
      frequency: 'frequency',
      observations: 'observations',
      distance_from_home_km: 'distance_from_home_km',
      accuracy_meters: 'accuracy_meters',
    };
    const sortColumn = sortMap[sort] || sortMap.observed_at;

    // Use fixed home point (no dependency on location_markers)
    const homeLon = -83.69682688;
    const homeLat = 43.02345147; // fallback trilateration point

    const params = [homeLon, homeLat];
    const where = [];
    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      where.push(`(ml.ssid ILIKE $${params.length - 1} OR ml.bssid ILIKE $${params.length})`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderClause = `ORDER BY ${sortColumn} ${order}`;
    const sql = `
      WITH sn_latest AS (
        SELECT DISTINCT ON (bssid)
          bssid,
          frequency,
          capabilities,
          type
        FROM staging_networks
        ORDER BY bssid, lasttime DESC
      ),
      obs_latest AS (
        SELECT DISTINCT ON (bssid)
          bssid,
          lat,
          lon,
          level,
          accuracy AS accuracy_meters,
          time AS observed_at
        FROM observations
        ORDER BY bssid, time DESC
      ),
      base AS (
        SELECT
          ml.bssid,
          COALESCE(NULLIF(ml.ssid, ''), ap.latest_ssid) AS ssid,
          ml.device_id,
          ml.source_tag,
          COALESCE(ml.observed_at, obs_latest.observed_at) AS observed_at,
          COALESCE(ml.level, obs_latest.level) AS level,
          COALESCE(ml.lat, obs_latest.lat) AS lat,
          COALESCE(ml.lon, obs_latest.lon) AS lon,
          ml.external,
          COALESCE(ap.total_observations, 0) AS observations,
          ap.first_seen,
          ap.last_seen,
          ap.is_5ghz,
          ap.is_6ghz,
          ap.is_hidden,
          sn.frequency,
          NULL::integer AS channel,
          obs_latest.accuracy_meters,
          sn.type,
          sn.capabilities,
          CASE
            WHEN COALESCE(ml.lat, obs_latest.lat) IS NOT NULL AND COALESCE(ml.lon, obs_latest.lon) IS NOT NULL THEN
              ST_Distance(
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                ST_SetSRID(ST_MakePoint(COALESCE(ml.lon, obs_latest.lon), COALESCE(ml.lat, obs_latest.lat)), 4326)::geography
              ) / 1000.0
            ELSE NULL
          END AS distance_from_home_km
        FROM mv_network_latest ml
        LEFT JOIN access_points ap ON ap.bssid = ml.bssid
        LEFT JOIN sn_latest sn ON sn.bssid = ml.bssid
        LEFT JOIN obs_latest ON obs_latest.bssid = ml.bssid
        ${whereClause}
      )
      SELECT
        *,
        COUNT(*) OVER() AS total
      FROM base
      ${orderClause}
      ${
        limit === null
          ? ''
          : (() => {
              const limitIndex = params.length + 1;
              const offsetIndex = params.length + 2;
              params.push(limit, offset);
              return `LIMIT $${limitIndex} OFFSET $${offsetIndex}`;
            })()
      };
    `;

    const result = await query(sql, params);
    res.json({
      total: result.rows[0]?.total || 0,
      rows: result.rows.map((row) => ({
        bssid: row.bssid ? row.bssid.toUpperCase() : null,
        ssid: row.ssid || '(hidden)',
        device_id: row.device_id,
        source_tag: row.source_tag,
        observed_at: row.observed_at,
        signal: row.level,
        lat: row.lat,
        lon: row.lon,
        external: row.external,
        observations: row.observations,
        first_seen: row.first_seen,
        last_seen: row.last_seen,
        is_5ghz: row.is_5ghz,
        is_6ghz: row.is_6ghz,
        is_hidden: row.is_hidden,
        type: row.type || 'W',
        frequency: row.frequency,
        capabilities: row.capabilities,
        security: inferSecurity(row.capabilities, row.encryption),
        distance_from_home_km: row.distance_from_home_km,
        accuracy_meters: row.accuracy_meters,
      })),
    });
  } catch (err) {
    console.error('Explorer networks query failed', err);
    res.status(500).json({ error: 'networks query failed', code: err.code, message: err.message });
  }
});

// GET /api/explorer/timeline/:bssid
router.get('/explorer/timeline/:bssid', async (req, res, next) => {
  try {
    const bssid = String(req.params.bssid || '').toLowerCase();
    const data = await query(
      `
        SELECT bucket, obs_count, avg_level, min_level, max_level
        FROM mv_network_timeline
        WHERE bssid = $1
        ORDER BY bucket ASC
      `,
      [bssid]
    );
    res.json(data.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/explorer/heatmap
router.get('/explorer/heatmap', async (_req, res, next) => {
  try {
    const data = await query(
      `
        SELECT
          ST_AsGeoJSON(tile_geom)::json AS geometry,
          obs_count,
          avg_level,
          min_level,
          max_level,
          first_seen,
          last_seen
        FROM mv_heatmap_tiles
      `
    );
    res.json(data.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/explorer/routes
router.get('/explorer/routes', async (_req, res, next) => {
  try {
    const data = await query(
      `
        SELECT
          device_id,
          point_count,
          start_at,
          end_at,
          ST_AsGeoJSON(route_geom)::json AS geometry
        FROM mv_device_routes
      `
    );
    res.json(data.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
