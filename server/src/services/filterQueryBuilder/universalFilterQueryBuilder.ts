/**
 * Universal Filter Query Builder
 * Thin facade delegating to focused query builder modules.
 * Forensically correct, parameterized SQL with explicit enable flags.
 */

import { NETWORK_ONLY_FILTERS, type FilterKey } from './constants';
import { OBS_TYPE_EXPR, SECURITY_EXPR } from './sqlExpressions';
import { createBuilderContext, type BuilderContext } from './builderContext';
import { buildObservationFilters } from './observationFilters';
import { buildNetworkWhere, buildFilteredObservationsCte } from './networkWhereBuilder';
import { buildNetworkOnlyQuery, buildNetworkOnlyCountQuery } from './networkOnlyQueries';
import { buildGeospatialQuery, buildGeospatialCountQuery } from './geospatialQueries';
import {
  buildAnalyticsQueries as buildAnalytics,
  canUseAnalyticsMV as checkAnalyticsMV,
  buildAnalyticsQueriesFromMV as buildFromMV,
} from './analyticsQueries';
import type {
  QueryResult,
  FilteredQueryResult,
  CteResult,
  ObservationFiltersResult,
  NetworkListOptions,
  GeospatialOptions,
  AnalyticsOptions,
  AnalyticsQueries,
} from './types';

class UniversalFilterQueryBuilder {
  private ctx: BuilderContext;

  constructor(filters: unknown, enabled: unknown) {
    this.ctx = createBuilderContext(filters, enabled);
  }

  buildObservationFilters(): ObservationFiltersResult {
    return buildObservationFilters(this.ctx);
  }

  buildFilteredObservationsCte(options: { selectedBssids?: string[] } = {}): CteResult {
    const obsResult = this.buildObservationFilters();
    return buildFilteredObservationsCte(this.ctx, obsResult, options);
  }

  buildNetworkListQuery(options: NetworkListOptions = {}): FilteredQueryResult {
    const { limit = null, offset = 0, orderBy = 'last_observed_at DESC' } = options;

    // Set requiresHome flag for distance_from_home_km in SELECT
    this.ctx.requiresHome = true;

    const noFiltersEnabled = Object.values(this.ctx.enabled).every((value) => !value);
    if (noFiltersEnabled) {
      return this.buildNoFilterQuery({ limit, offset, orderBy });
    }

    const enabledKeys = Object.entries(this.ctx.enabled)
      .filter(([, value]) => value)
      .map(([key]) => key);
    const networkOnly =
      enabledKeys.length > 0 &&
      enabledKeys.every((key) => NETWORK_ONLY_FILTERS.has(key as FilterKey));
    if (networkOnly) {
      return buildNetworkOnlyQuery(this.ctx, { limit, offset, orderBy });
    }

    const { cte, params } = this.buildFilteredObservationsCte();
    const networkWhere = buildNetworkWhere(this.ctx);
    const whereClause = networkWhere.length > 0 ? `WHERE ${networkWhere.join(' AND ')}` : '';

    const sql = `
      ${cte}
      , obs_rollup AS (
        SELECT
          bssid,
          COUNT(*) AS observation_count,
          MIN(time) AS first_observed_at,
          MAX(time) AS last_observed_at,
          COUNT(DISTINCT DATE(time)) AS unique_days,
          COUNT(DISTINCT ST_SnapToGrid(geom, 0.001)) AS unique_locations,
          AVG(level) AS avg_signal,
          MIN(level) AS min_signal,
          MAX(level) AS max_signal
        FROM filtered_obs
        GROUP BY bssid
      ),
      obs_latest AS (
        SELECT DISTINCT ON (bssid)
          bssid,
          ssid,
          lat,
          lon,
          level,
          accuracy,
          time AS observed_at,
          radio_frequency,
          radio_capabilities,
          radio_type,
          geom,
          altitude
        FROM filtered_obs
        ORDER BY bssid, time DESC
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
      -- Stationary confidence derives from spatial variance, temporal spread, and observation density.
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
      )
      SELECT
        ne.bssid,
        COALESCE(l.ssid, ne.ssid) AS ssid,
        CASE
          WHEN l.radio_type IS NULL
            AND l.radio_frequency IS NULL
            AND COALESCE(l.radio_capabilities, '') = ''
          THEN ne.type
          ELSE ${OBS_TYPE_EXPR('l')}
        END AS type,
        CASE
          WHEN COALESCE(l.radio_capabilities, '') = '' THEN ne.security
          ELSE ${SECURITY_EXPR('l')}
        END AS security,
        COALESCE(l.radio_frequency, ne.frequency) AS frequency,
        COALESCE(l.radio_capabilities, ne.security) AS capabilities,
        (ne.frequency BETWEEN 5000 AND 5900) AS is_5ghz,
        (ne.frequency BETWEEN 5925 AND 7125) AS is_6ghz,
        (COALESCE(ne.ssid, '') = '') AS is_hidden,
        ne.first_seen,
        ne.last_seen,
        rm.organization_name AS manufacturer,
        rm.organization_address AS manufacturer_address,
        NULL::numeric AS min_altitude_m,
        NULL::numeric AS max_altitude_m,
        NULL::numeric AS altitude_span_m,
        ne.max_distance_meters,
        NULL::numeric AS last_altitude_m,
        FALSE AS is_sentinel,
        CASE
          WHEN home.home_point IS NOT NULL AND l.lat IS NOT NULL AND l.lon IS NOT NULL
          THEN ST_Distance(
            home.home_point,
            COALESCE(l.geom, ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326)::geometry)::geography
          ) / 1000.0
          ELSE NULL
        END AS distance_from_home_km,
        r.observation_count AS observations,
        r.first_observed_at,
        r.last_observed_at,
        r.unique_days,
        r.unique_locations,
        r.avg_signal,
        r.min_signal,
        r.max_signal,
        l.observed_at,
        COALESCE(l.level, ne.signal) AS signal,
        l.lat,
        l.lon,
        l.accuracy AS accuracy_meters,
        s.stationary_confidence,
        JSONB_BUILD_OBJECT('score', ne.threat_score::text, 'level', ne.threat_level) AS threat,
        NULL::text AS network_id
      FROM obs_rollup r
      JOIN obs_latest l ON l.bssid = r.bssid
        LEFT JOIN app.api_network_explorer_mv ne ON UPPER(ne.bssid) = UPPER(l.bssid)
        LEFT JOIN app.network_threat_scores nts ON UPPER(nts.bssid) = UPPER(l.bssid)
        LEFT JOIN app.network_tags nt ON UPPER(nt.bssid) = UPPER(l.bssid)
        LEFT JOIN app.radio_manufacturers rm ON rm.prefix_24bit = UPPER(REPLACE(SUBSTRING(l.bssid, 1, 8), ':', ''))
      LEFT JOIN obs_spatial s ON s.bssid = r.bssid
      ${this.ctx.requiresHome ? 'CROSS JOIN home' : ''}
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${this.ctx.addParam(limit)} OFFSET ${this.ctx.addParam(offset)}
    `;

    return {
      sql,
      params: [...params],
      appliedFilters: this.ctx.appliedFilters,
      ignoredFilters: this.ctx.ignoredFilters,
      warnings: this.ctx.warnings,
    };
  }

  buildNetworkCountQuery(): QueryResult {
    const noFiltersEnabled = Object.values(this.ctx.enabled).every((value) => !value);
    if (noFiltersEnabled) {
      return {
        sql: 'SELECT COUNT(*) AS total FROM app.api_network_explorer_mv',
        params: [],
      };
    }

    const enabledKeys = Object.entries(this.ctx.enabled)
      .filter(([, value]) => value)
      .map(([key]) => key);
    const networkOnly =
      enabledKeys.length > 0 &&
      enabledKeys.every((key) => NETWORK_ONLY_FILTERS.has(key as FilterKey));
    if (networkOnly) {
      return buildNetworkOnlyCountQuery(this.ctx);
    }

    const { cte, params } = this.buildFilteredObservationsCte();
    const networkWhere = buildNetworkWhere(this.ctx);
    const whereClause = networkWhere.length > 0 ? `WHERE ${networkWhere.join(' AND ')}` : '';

    const sql = `
      ${cte}
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
      )
      SELECT COUNT(DISTINCT r.bssid) AS total
      FROM obs_rollup r
      JOIN app.api_network_explorer_mv ne ON ne.bssid = r.bssid
      LEFT JOIN obs_spatial s ON s.bssid = r.bssid
      ${whereClause}
    `;

    return { sql, params: [...params] };
  }

  buildGeospatialQuery(options: GeospatialOptions = {}): FilteredQueryResult {
    return buildGeospatialQuery(this.ctx, options);
  }

  buildGeospatialCountQuery(options: { selectedBssids?: string[] } = {}): QueryResult {
    return buildGeospatialCountQuery(this.ctx, options);
  }

  buildAnalyticsQueries(options: AnalyticsOptions = {}): AnalyticsQueries {
    return buildAnalytics(this.ctx, options);
  }

  canUseAnalyticsMV(): boolean {
    return checkAnalyticsMV(this.ctx);
  }

  buildAnalyticsQueriesFromMV(): AnalyticsQueries {
    return buildFromMV();
  }

  /** No-filter optimized path: queries api_network_explorer_mv directly */
  private buildNoFilterQuery(options: NetworkListOptions): FilteredQueryResult {
    const { limit = null, offset = 0, orderBy = 'last_observed_at DESC' } = options;

    const safeOrderBy = orderBy
      .replace(/\bl\.observed_at\b/g, 'COALESCE(ola.time, ne.observed_at)')
      .replace(/\bl\.level\b/g, 'COALESCE(ola.level, ne.signal)')
      .replace(/\bl\.lat\b/g, 'ne.lat')
      .replace(/\bl\.lon\b/g, 'ne.lon')
      .replace(/\bl\.accuracy\b/g, 'COALESCE(ola.accuracy, ne.accuracy_meters)')
      .replace(/\br\.observation_count\b/g, 'ne.observations')
      .replace(/\br\.first_observed_at\b/g, 'ne.first_seen')
      .replace(/\br\.last_observed_at\b/g, 'ne.last_seen')
      .replace(/\bs\.stationary_confidence\b/g, 'ne.last_seen');

    const sql = `
        WITH obs_latest_any AS (
          SELECT DISTINCT ON (bssid)
            bssid,
            ssid,
            level,
            accuracy,
            time,
            radio_type,
            radio_frequency,
            radio_capabilities
          FROM app.observations
          WHERE bssid NOT IN ('00:00:00:00:00:00', 'FF:FF:FF:FF:FF:FF')
            AND time >= '2000-01-01 00:00:00+00'::timestamptz
          ORDER BY bssid, time DESC
        )
        SELECT
          ne.bssid,
          COALESCE(ola.ssid, ne.ssid) AS ssid,
          CASE
            WHEN ola.radio_type IS NULL
              AND ola.radio_frequency IS NULL
              AND COALESCE(ola.radio_capabilities, '') = ''
            THEN ne.type
            ELSE ${OBS_TYPE_EXPR('ola')}
          END AS type,
          CASE
            WHEN COALESCE(ola.radio_capabilities, '') = '' THEN
              CASE
                WHEN ne.security LIKE '%WEP%' THEN 'WEP'
                WHEN ne.security ~ '^\\s*\\[ESS\\]\\s*$' THEN 'OPEN'
                WHEN ne.security ~ '^\\s*\\[IBSS\\]\\s*$' THEN 'OPEN'
                WHEN ne.security ~ 'RSN-OWE' THEN 'WPA3-OWE'
                WHEN ne.security ~ 'RSN-SAE' THEN 'WPA3-SAE'
                WHEN ne.security ~ '(WPA3|SAE)' AND ne.security ~ '(EAP|MGT)' THEN 'WPA3-E'
                WHEN ne.security ~ '(WPA3|SAE)' THEN 'WPA3'
                WHEN ne.security ~ '(WPA2|RSN)' AND ne.security ~ '(EAP|MGT)' THEN 'WPA2-E'
                WHEN ne.security ~ '(WPA2|RSN)' THEN 'WPA2'
                WHEN ne.security ~ 'WPA-' AND ne.security NOT LIKE '%WPA2%' THEN 'WPA'
                WHEN ne.security LIKE '%WPA%' AND ne.security NOT LIKE '%WPA2%' AND ne.security NOT LIKE '%WPA3%' AND ne.security NOT LIKE '%RSN%' THEN 'WPA'
                WHEN ne.security LIKE '%WPS%' AND ne.security NOT LIKE '%WPA%' AND ne.security NOT LIKE '%RSN%' THEN 'WPS'
                WHEN ne.security ~ '(CCMP|TKIP|AES)' THEN 'WPA2'
                WHEN COALESCE(ne.security, '') = '' THEN 'OPEN'
                ELSE 'Unknown'
              END
            ELSE ${SECURITY_EXPR('ola')}
          END AS security,
          COALESCE(ola.radio_frequency, ne.frequency) AS frequency,
          COALESCE(ola.radio_capabilities, ne.security) AS capabilities,
          (ne.frequency BETWEEN 5000 AND 5900) AS is_5ghz,
          (ne.frequency BETWEEN 5925 AND 7125) AS is_6ghz,
          (COALESCE(ne.ssid, '') = '') AS is_hidden,
          ne.first_seen,
          ne.last_seen,
          rm.organization_name AS manufacturer,
          rm.address AS manufacturer_address,
          NULL::numeric AS min_altitude_m,
          NULL::numeric AS max_altitude_m,
          NULL::numeric AS altitude_span_m,
          ne.max_distance_meters,
          NULL::numeric AS last_altitude_m,
          FALSE AS is_sentinel,
          CASE
            WHEN home.home_point IS NOT NULL AND ne.lat IS NOT NULL AND ne.lon IS NOT NULL
            THEN ST_Distance(
              home.home_point,
              ST_SetSRID(ST_MakePoint(ne.lon, ne.lat), 4326)::geometry::geography
            ) / 1000.0
            ELSE NULL
          END AS distance_from_home_km,
          ne.observations AS observations,
          ne.first_seen AS first_observed_at,
          ne.last_seen AS last_observed_at,
          NULL::integer AS unique_days,
          NULL::integer AS unique_locations,
          NULL::numeric AS avg_signal,
          NULL::numeric AS min_signal,
          NULL::numeric AS max_signal,
          COALESCE(ola.time, ne.observed_at) AS observed_at,
          COALESCE(ola.level, ne.signal) AS signal,
          ne.lat,
          ne.lon,
          COALESCE(ola.accuracy, ne.accuracy_meters) AS accuracy_meters,
          NULL::numeric AS stationary_confidence,
          JSONB_BUILD_OBJECT('score', ne.threat_score::text, 'level', ne.threat_level) AS threat,
          NULL::text AS network_id
        FROM app.api_network_explorer_mv ne
        LEFT JOIN obs_latest_any ola ON UPPER(ola.bssid) = UPPER(ne.bssid)
        LEFT JOIN app.radio_manufacturers rm ON rm.prefix_24bit = UPPER(REPLACE(SUBSTRING(ne.bssid, 1, 8), ':', ''))
        ${this.ctx.requiresHome ? "CROSS JOIN (SELECT ST_SetSRID(location::geometry, 4326)::geography AS home_point FROM app.location_markers WHERE marker_type = 'home' LIMIT 1) home" : ''}
        ORDER BY ${safeOrderBy}
        LIMIT ${this.ctx.addParam(limit)} OFFSET ${this.ctx.addParam(offset)}
      `;

    return {
      sql,
      params: [limit, offset],
      appliedFilters: this.ctx.appliedFilters,
      ignoredFilters: this.ctx.ignoredFilters,
      warnings: this.ctx.warnings,
    };
  }
}

export { UniversalFilterQueryBuilder };
