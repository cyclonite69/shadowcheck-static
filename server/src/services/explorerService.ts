/**
 * Explorer Service Layer
 * Encapsulates database queries for explorer operations
 */

const { query } = require('../config/database');

export async function checkHomeLocationForFilters(enabled: any): Promise<boolean> {
  if (!enabled?.distanceFromHomeMin && !enabled?.distanceFromHomeMax) {
    return true;
  }
  try {
    const home = await query(
      "SELECT 1 FROM app.location_markers WHERE marker_type = 'home' LIMIT 1"
    );
    return home.rowCount > 0;
  } catch (err: any) {
    if (err && err.code === '42P01') {
      throw new Error('Home location markers table is missing (app.location_markers).');
    }
    throw err;
  }
}

export async function executeExplorerQuery(sql: string, params: any[]): Promise<any> {
  const result = await query(sql, params);
  return result;
}

// ── Sort map for listNetworks ──────────────────────────────────────────────────

const NETWORKS_SORT_MAP: Record<string, string> = {
  observed_at: 'observed_at',
  last_seen: 'last_seen',
  ssid: 'ssid',
  bssid: 'bssid',
  signal: 'level',
  frequency: 'frequency',
  observations: 'observations',
  distance_from_home_km: 'distance_from_home_km',
  accuracy_meters: 'accuracy_meters',
};

const NETWORKS_V2_SORT_MAP: Record<string, string> = {
  observed_at: 'observed_at',
  last_seen: 'last_seen',
  first_seen: 'first_seen',
  ssid: 'ssid',
  bssid: 'bssid',
  signal: 'signal',
  frequency: 'frequency',
  observations: 'observations',
  distance: 'distance_from_home_km',
  distancefromhome: 'distance_from_home_km',
  distance_from_home_km: 'distance_from_home_km',
  accuracy: 'accuracy_meters',
  accuracy_meters: 'accuracy_meters',
  type: 'type',
  security: 'security',
  manufacturer: 'manufacturer',
  threat_score: "(threat->>'score')::numeric",
  'threat.score': "(threat->>'score')::numeric",
  min_altitude_m: 'min_altitude_m',
  max_altitude_m: 'max_altitude_m',
  altitude_span_m: 'altitude_span_m',
  max_distance_meters: 'max_distance_meters',
  maxdistancemeters: 'max_distance_meters',
  max_distance: 'max_distance_meters',
  last_altitude_m: 'last_altitude_m',
  is_sentinel: 'is_sentinel',
  lastseen: 'last_seen',
  lastSeen: 'last_seen',
  distanceFromHome: 'distance_from_home_km',
};

function getThreatLevelSort(order: string): string {
  return order === 'asc'
    ? "CASE WHEN threat->>'level' = 'NONE' THEN 1 WHEN threat->>'level' = 'LOW' THEN 2 WHEN threat->>'level' = 'MED' THEN 3 WHEN threat->>'level' = 'HIGH' THEN 4 WHEN threat->>'level' = 'CRITICAL' THEN 5 ELSE 0 END"
    : "CASE WHEN threat->>'level' = 'CRITICAL' THEN 1 WHEN threat->>'level' = 'HIGH' THEN 2 WHEN threat->>'level' = 'MED' THEN 3 WHEN threat->>'level' = 'LOW' THEN 4 WHEN threat->>'level' = 'NONE' THEN 5 ELSE 6 END";
}

/**
 * Legacy paginated network list with optional search, quality filter and sort.
 * Joins obs_latest CTE with access_points and computes ST_Distance from home.
 */
export async function listNetworks(opts: {
  homeLon: number | null;
  homeLat: number | null;
  search: string;
  sort: string;
  order: 'ASC' | 'DESC';
  qualityWhere: string;
  limit: number | null;
  offset: number;
}): Promise<{ total: number; rows: any[] }> {
  const { homeLon, homeLat, search, sort, order, qualityWhere, limit, offset } = opts;
  const sortColumn = NETWORKS_SORT_MAP[sort] || 'last_seen';

  const params: any[] = [homeLon, homeLat];
  const where: string[] = [];
  if (search) {
    params.push(`%${search}%`, `%${search}%`);
    where.push(`(ap.latest_ssid ILIKE $${params.length - 1} OR ap.bssid ILIKE $${params.length})`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderClause = `ORDER BY ${sortColumn} ${order}`;
  let limitClause = '';
  if (limit !== null) {
    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;
    params.push(limit, offset);
    limitClause = `LIMIT $${limitIndex} OFFSET $${offsetIndex}`;
  }

  const sql = `
    WITH obs_latest AS (
      SELECT DISTINCT ON (bssid)
        bssid,
        ssid,
        lat,
        lon,
        level,
        accuracy AS accuracy_meters,
        time AS observed_at,
        radio_type,
        radio_frequency,
        radio_capabilities
      FROM app.observations
      WHERE lat IS NOT NULL AND lon IS NOT NULL AND lat != 0 AND lon != 0 ${qualityWhere}
      ORDER BY bssid, time DESC
    )
    SELECT
      ap.bssid,
      COALESCE(NULLIF(obs.ssid, ''), ap.latest_ssid) AS ssid,
      obs.observed_at,
      obs.level,
      obs.lat,
      obs.lon,
      ap.total_observations AS observations,
      ap.first_seen,
      ap.last_seen,
      ap.is_5ghz,
      ap.is_6ghz,
      ap.is_hidden,
      obs.radio_frequency AS frequency,
      obs.radio_capabilities AS capabilities,
      obs.accuracy_meters,
      obs.radio_type AS type,
      CASE
        WHEN obs.lat IS NOT NULL AND obs.lon IS NOT NULL THEN
          ST_Distance(
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
            ST_SetSRID(ST_MakePoint(obs.lon, obs.lat), 4326)::geography
          ) / 1000.0
        ELSE NULL
      END AS distance_from_home_km,
      COUNT(*) OVER() AS total
    FROM app.access_points ap
    LEFT JOIN obs_latest obs ON obs.bssid = ap.bssid
    ${whereClause}
    ${orderClause}
    ${limitClause}
  `;

  const result = await query(sql, params);
  return { total: result.rows[0]?.total || 0, rows: result.rows };
}

/**
 * Forensic-grade network list using the api_network_explorer_mv materialized view.
 * Supports complex multi-column sorting including threat level CASE ordering.
 */
export async function listNetworksV2(opts: {
  search: string;
  sort: string;
  order: string;
  limit: number | null;
  offset: number;
}): Promise<{ total: number; rows: any[] }> {
  const { search, sort, order, limit, offset } = opts;

  const sortColumns = String(sort)
    .toLowerCase()
    .split(',')
    .map((s) => s.trim());
  const sortOrders = String(order)
    .toLowerCase()
    .split(',')
    .map((o) => o.trim());

  const orderByClauses = sortColumns
    .map((col, idx) => {
      const dir = sortOrders[idx] === 'asc' ? 'ASC' : 'DESC';
      if (col === 'threat') {
        return `${getThreatLevelSort(sortOrders[idx])} ${dir}`;
      }
      if (col === 'threat_score') {
        return `(threat->>'score')::numeric ${dir} NULLS LAST`;
      }
      const mappedCol = NETWORKS_V2_SORT_MAP[col] || 'last_seen';
      return `${mappedCol} ${dir} NULLS LAST`;
    })
    .join(', ');

  const params: any[] = [];
  const where: string[] = [];
  if (search) {
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    where.push(
      `(ssid ILIKE $${params.length - 3}
        OR bssid ILIKE $${params.length - 2}
        OR manufacturer ILIKE $${params.length - 1}
        OR manufacturer_address ILIKE $${params.length})`
    );
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderClause = `ORDER BY ${orderByClauses}`;

  const sql = `
    SELECT
      mv.bssid,
      mv.ssid,
      mv.observed_at,
      mv.signal,
      mv.lat,
      mv.lon,
      mv.observations,
      mv.first_seen,
      mv.last_seen,
      mv.is_5ghz,
      mv.is_6ghz,
      mv.is_hidden,
      mv.type,
      mv.frequency,
      mv.capabilities,
      mv.security,
      mv.distance_from_home_km,
      mv.accuracy_meters,
      mv.manufacturer,
      mv.manufacturer_address,
      mv.min_altitude_m,
      mv.max_altitude_m,
      mv.altitude_span_m,
      mv.max_distance_meters,
      mv.last_altitude_m,
      mv.is_sentinel,
      COALESCE(
        jsonb_build_object(
          'score', live_ts.final_threat_score,
          'level', live_ts.final_threat_level,
          'model_version', live_ts.model_version
        ),
        mv.threat
      ) AS threat,
      COUNT(*) OVER() AS total
    FROM app.api_network_explorer_mv mv
    LEFT JOIN app.network_threat_scores live_ts ON mv.bssid = live_ts.bssid::text
    ${whereClause}
    ${orderClause}
    ${limit !== null ? `LIMIT $${params.length + 1} OFFSET $${params.length + 2}` : ''};
  `;

  if (limit !== null) {
    params.push(limit, offset);
  }

  const result = await query(sql, params);
  return { total: result.rows[0]?.total || 0, rows: result.rows };
}

module.exports = {
  checkHomeLocationForFilters,
  executeExplorerQuery,
  listNetworks,
  listNetworksV2,
};
