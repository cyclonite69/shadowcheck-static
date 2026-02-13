/**
 * Geospatial Queries
 * Builds geospatial observation queries with optional network-level filtering.
 */

import type { BuilderContext } from './builderContext';
import { SECURITY_EXPR } from './sqlExpressions';
import { buildObservationFilters } from './observationFilters';
import { buildNetworkWhere, buildFilteredObservationsCte } from './networkWhereBuilder';
import type { FilteredQueryResult, QueryResult, GeospatialOptions } from './types';

/** Shared obs_rollup + obs_centroids + obs_spatial + filtered_networks CTEs */
function networkFilterCtes(networkWhereClause: string): string {
  return `
      , obs_rollup AS (
        SELECT
          bssid,
          COUNT(*) AS observation_count
        FROM filtered_obs
        GROUP BY bssid
      ),
      obs_centroids AS (
        SELECT
          bssid,
          ST_Centroid(ST_Collect(geom::geometry)) AS centroid,
          MIN(time) AS first_time,
          MAX(time) AS last_time,
          COUNT(*) AS obs_count
        FROM filtered_obs
        WHERE geom IS NOT NULL
        GROUP BY bssid
      ),
      obs_spatial AS (
        SELECT
          c.bssid,
          CASE
            WHEN c.obs_count < 2 THEN NULL
            ELSE ROUND(
              LEAST(1, GREATEST(0,
                (
                  (1 - LEAST(MAX(ST_Distance(o.geom::geography, c.centroid::geography)) / 500.0, 1)) * 0.5 +
                  (1 - LEAST(EXTRACT(EPOCH FROM (c.last_time - c.first_time)) / 3600 / 168, 1)) * 0.3 +
                  LEAST(c.obs_count / 50.0, 1) * 0.2
                )
              ))::numeric,
              3
            )
          END AS stationary_confidence
        FROM filtered_obs o
        JOIN obs_centroids c ON c.bssid = o.bssid
        WHERE o.geom IS NOT NULL
        GROUP BY c.bssid, c.centroid, c.first_time, c.last_time, c.obs_count
      ),
      filtered_networks AS (
        SELECT r.bssid
        FROM obs_rollup r
        LEFT JOIN obs_spatial s ON s.bssid = r.bssid
        LEFT JOIN app.api_network_explorer_mv ne ON UPPER(ne.bssid) = UPPER(r.bssid)
        LEFT JOIN app.network_threat_scores nts ON UPPER(nts.bssid) = UPPER(r.bssid)
        LEFT JOIN app.network_tags nt ON UPPER(nt.bssid) = UPPER(r.bssid)
        ${networkWhereClause}
      )`;
}

export function buildGeospatialQuery(
  ctx: BuilderContext,
  options: GeospatialOptions = {}
): FilteredQueryResult {
  const { limit = null, offset = 0, selectedBssids = [] } = options;
  const obsResult = buildObservationFilters(ctx);
  const { cte } = buildFilteredObservationsCte(ctx, obsResult, { selectedBssids });
  const networkWhere = buildNetworkWhere(ctx);

  if (networkWhere.length === 0) {
    const sql = `
        ${cte}
        SELECT
          o.bssid,
          o.ssid,
          COALESCE(o.lat, ST_Y(o.geom::geometry)) AS lat,
          COALESCE(o.lon, ST_X(o.geom::geometry)) AS lon,
          o.level,
          o.accuracy,
          o.time,
          o.radio_frequency,
          o.radio_capabilities,
          o.radio_type,
          o.altitude,
          ${SECURITY_EXPR('o')} AS security,
          ROW_NUMBER() OVER (PARTITION BY o.bssid ORDER BY o.time ASC) AS obs_number,
          JSONB_BUILD_OBJECT('score', ne.threat_score::text, 'level', ne.threat_level) AS threat
        FROM filtered_obs o
        LEFT JOIN app.api_network_explorer_mv ne ON UPPER(ne.bssid) = UPPER(o.bssid)
        WHERE ((o.lat IS NOT NULL AND o.lon IS NOT NULL)
          OR o.geom IS NOT NULL)
        ORDER BY o.time ASC
        ${limit !== null ? `LIMIT ${ctx.addParam(limit)}` : ''}
        OFFSET ${ctx.addParam(offset)}
      `;

    const finalParams = [...ctx.params];

    return {
      sql,
      params: finalParams,
      appliedFilters: ctx.appliedFilters,
      ignoredFilters: ctx.ignoredFilters,
      warnings: ctx.warnings,
    };
  }

  const networkWhereClause = `WHERE ${networkWhere.join(' AND ')}`;

  const sql = `
      ${cte}
      ${networkFilterCtes(networkWhereClause)}
      SELECT
        o.bssid,
        o.ssid,
        COALESCE(o.lat, ST_Y(o.geom::geometry)) AS lat,
        COALESCE(o.lon, ST_X(o.geom::geometry)) AS lon,
        o.level,
        o.accuracy,
        o.time,
        o.radio_frequency,
        o.radio_capabilities,
        o.radio_type,
        o.altitude,
        ${SECURITY_EXPR('o')} AS security,
        ROW_NUMBER() OVER (PARTITION BY o.bssid ORDER BY o.time ASC) AS obs_number,
        JSONB_BUILD_OBJECT('score', ne.threat_score::text, 'level', ne.threat_level) AS threat
      FROM filtered_obs o
      JOIN filtered_networks fn ON fn.bssid = o.bssid
      LEFT JOIN app.api_network_explorer_mv ne ON UPPER(ne.bssid) = UPPER(o.bssid)
      WHERE ((o.lat IS NOT NULL AND o.lon IS NOT NULL)
        OR o.geom IS NOT NULL)
      ORDER BY o.time ASC
      ${limit !== null ? `LIMIT ${ctx.addParam(limit)}` : ''}
      OFFSET ${ctx.addParam(offset)}
    `;

  const finalParams = [...ctx.params];

  return {
    sql,
    params: finalParams,
    appliedFilters: ctx.appliedFilters,
    ignoredFilters: ctx.ignoredFilters,
    warnings: ctx.warnings,
  };
}

export function buildGeospatialCountQuery(
  ctx: BuilderContext,
  options: { selectedBssids?: string[] } = {}
): QueryResult {
  const { selectedBssids = [] } = options;
  const obsResult = buildObservationFilters(ctx);
  const { cte, params } = buildFilteredObservationsCte(ctx, obsResult, { selectedBssids });
  const networkWhere = buildNetworkWhere(ctx);
  const networkWhereClause = networkWhere.length > 0 ? `WHERE ${networkWhere.join(' AND ')}` : '';

  const sql = `
      ${cte}
      ${networkFilterCtes(networkWhereClause)}
      SELECT COUNT(*)::bigint AS total
      FROM filtered_obs o
      JOIN filtered_networks fn ON fn.bssid = o.bssid
      WHERE ((o.lat IS NOT NULL AND o.lon IS NOT NULL)
        OR o.geom IS NOT NULL)
    `;

  return {
    sql,
    params: [...params],
  };
}
