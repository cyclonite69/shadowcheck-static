/**
 * Analytics Queries
 * Builds analytics chart queries using filtered observation CTEs
 * or the analytics materialized view for faster access.
 */

import type { BuilderContext } from './builderContext';
import { OBS_TYPE_EXPR, SECURITY_EXPR } from './sqlExpressions';
import { buildObservationFilters } from './observationFilters';
import { buildNetworkWhere, buildFilteredObservationsCte } from './networkWhereBuilder';
import type { QueryResult, AnalyticsOptions, AnalyticsQueries } from './types';

export function buildAnalyticsQueries(
  ctx: BuilderContext,
  options: AnalyticsOptions = {}
): AnalyticsQueries {
  const { useLatestPerBssid = false } = options;

  const obsResult = buildObservationFilters(ctx);
  const { cte, params } = buildFilteredObservationsCte(ctx, obsResult);
  const networkWhere = buildNetworkWhere(ctx);
  const networkWhereClause = networkWhere.length > 0 ? `WHERE ${networkWhere.join(' AND ')}` : '';
  const baseCtes = `
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
      ),
      filtered_networks AS (
        SELECT r.bssid
        FROM obs_rollup r
        LEFT JOIN obs_spatial s ON s.bssid = r.bssid
        LEFT JOIN app.api_network_explorer_mv ne ON UPPER(ne.bssid) = UPPER(r.bssid)
        LEFT JOIN app.network_threat_scores nts ON UPPER(nts.bssid) = UPPER(r.bssid)
        LEFT JOIN app.network_tags nt ON UPPER(nt.bssid) = UPPER(r.bssid)
        ${networkWhereClause}
      ),
      filtered_obs_scope AS (
        SELECT o.*
        FROM filtered_obs o
        JOIN filtered_networks fn ON fn.bssid = o.bssid
      )
    `;
  const latestPerBssidCte = useLatestPerBssid
    ? `,
      latest_per_bssid AS (
        SELECT *
        FROM (
          SELECT o.*, ROW_NUMBER() OVER (PARTITION BY UPPER(o.bssid) ORDER BY o.time DESC NULLS LAST) as rn
          FROM filtered_obs_scope o
        ) ranked
        WHERE rn = 1
      )`
    : '';
  const signalStrengthCte = useLatestPerBssid
    ? ''
    : `
        , latest AS (
          SELECT DISTINCT ON (bssid)
            bssid,
            level
          FROM filtered_obs_scope o
          ORDER BY bssid, o.time DESC
        )
      `;
  const signalStrengthSource = useLatestPerBssid ? 'latest_per_bssid' : 'latest';

  const base = (query: string): QueryResult => ({
    sql: `${baseCtes}${latestPerBssidCte}\n${query}`,
    params: [...params],
  });

  return {
    networkTypes: base(`
        SELECT
          CASE
            WHEN ${OBS_TYPE_EXPR('o')} = 'W' THEN 'WiFi'
            WHEN ${OBS_TYPE_EXPR('o')} = 'E' THEN 'BLE'
            WHEN ${OBS_TYPE_EXPR('o')} = 'B' THEN 'BT'
            WHEN ${OBS_TYPE_EXPR('o')} = 'L' THEN 'LTE'
            WHEN ${OBS_TYPE_EXPR('o')} = 'N' THEN 'NR'
            WHEN ${OBS_TYPE_EXPR('o')} = 'G' THEN 'GSM'
            ELSE 'Other'
          END AS network_type,
          COUNT(DISTINCT o.bssid) AS count
        FROM filtered_obs_scope o
        GROUP BY network_type
        ORDER BY count DESC
      `),
    signalStrength: base(`
        ${signalStrengthCte}
        SELECT
          CASE
            WHEN o.level >= -30 THEN '-30'
            WHEN o.level >= -40 THEN '-40'
            WHEN o.level >= -50 THEN '-50'
            WHEN o.level >= -60 THEN '-60'
            WHEN o.level >= -70 THEN '-70'
            WHEN o.level >= -80 THEN '-80'
            ELSE '-90'
          END AS signal_range,
          COUNT(*) AS count
        FROM ${signalStrengthSource} o
        WHERE o.level IS NOT NULL
        GROUP BY signal_range
        ORDER BY signal_range DESC
      `),
    security: base(`
        SELECT
          ${SECURITY_EXPR('o')} AS security_type,
          COUNT(*) AS count
        FROM filtered_obs_scope o
        GROUP BY security_type
        ORDER BY count DESC
      `),
    threatDistribution: base(`
        SELECT
          CASE
            WHEN ne.threat_score >= 80 THEN '80-100'
            WHEN ne.threat_score >= 60 THEN '60-80'
            WHEN ne.threat_score >= 40 THEN '40-60'
            WHEN ne.threat_score >= 20 THEN '20-40'
            ELSE '0-20'
          END AS range,
          COUNT(DISTINCT ne.bssid) AS count
        FROM filtered_networks fn
        JOIN app.api_network_explorer_mv ne ON ne.bssid = fn.bssid
        GROUP BY range
        ORDER BY range DESC
      `),
    temporalActivity: base(`
        SELECT
          EXTRACT(HOUR FROM o.time) AS hour,
          COUNT(*) AS count
        FROM filtered_obs_scope o
        GROUP BY hour
        ORDER BY hour
      `),
    radioTypeOverTime: base(`
        SELECT
          DATE_TRUNC('day', o.time) AS date,
          CASE
            WHEN ${OBS_TYPE_EXPR('o')} = 'W' THEN 'WiFi'
            WHEN ${OBS_TYPE_EXPR('o')} = 'E' THEN 'BLE'
            WHEN ${OBS_TYPE_EXPR('o')} = 'B' THEN 'BT'
            WHEN ${OBS_TYPE_EXPR('o')} = 'L' THEN 'LTE'
            WHEN ${OBS_TYPE_EXPR('o')} = 'N' THEN 'NR'
            WHEN ${OBS_TYPE_EXPR('o')} = 'G' THEN 'GSM'
            ELSE 'Other'
          END AS network_type,
          COUNT(*) AS count
        FROM filtered_obs_scope o
        GROUP BY date, network_type
        ORDER BY date, network_type
      `),
    threatTrends: base(`
        , daily_networks AS (
          SELECT
            DATE_TRUNC('day', o.time) AS date,
            o.bssid
          FROM filtered_obs_scope o
          GROUP BY date, o.bssid
        )
        SELECT
          d.date,
          AVG(COALESCE(ne.threat_score, 0)) AS avg_score,
          COUNT(CASE WHEN ne.threat_score >= 80 THEN 1 END) AS critical_count,
          COUNT(CASE WHEN ne.threat_score BETWEEN 60 AND 79.9 THEN 1 END) AS high_count,
          COUNT(CASE WHEN ne.threat_score BETWEEN 40 AND 59.9 THEN 1 END) AS medium_count,
          COUNT(CASE WHEN ne.threat_score BETWEEN 20 AND 39.9 THEN 1 END) AS low_count,
          COUNT(*) AS network_count
        FROM daily_networks d
        LEFT JOIN app.api_network_explorer_mv ne ON ne.bssid = d.bssid
        GROUP BY d.date
        ORDER BY d.date
      `),
    topNetworks: base(`
        SELECT
          o.bssid,
          MAX(o.ssid) AS ssid,
          COUNT(*) AS observation_count,
          MIN(o.time) AS first_seen,
          MAX(o.time) AS last_seen
        FROM filtered_obs_scope o
        GROUP BY o.bssid
        ORDER BY observation_count DESC
        LIMIT 50
      `),
  };
}

export function canUseAnalyticsMV(ctx: BuilderContext): boolean {
  const hasComplexFilters =
    ctx.enabled?.boundingBox ||
    ctx.enabled?.radiusFilter ||
    ctx.enabled?.distanceFromHomeMin ||
    ctx.enabled?.distanceFromHomeMax ||
    ctx.filters?.boundingBox ||
    ctx.filters?.radiusFilter;

  return !hasComplexFilters;
}

export function buildAnalyticsQueriesFromMV(): AnalyticsQueries {
  const params: unknown[] = [];

  return {
    networkTypes: {
      sql: `
          SELECT
            CASE
              WHEN type = 'W' THEN 'WiFi'
              WHEN type = 'E' THEN 'BLE'
              WHEN type = 'B' THEN 'BT'
              WHEN type = 'L' THEN 'LTE'
              WHEN type = 'N' THEN 'NR'
              WHEN type = 'G' THEN 'GSM'
              ELSE type
            END as type,
            COUNT(*) as count
          FROM app.analytics_summary_mv
          GROUP BY type
          ORDER BY count DESC
        `,
      params,
    },
    signalStrength: {
      sql: `
          SELECT
            CASE
              WHEN max_signal >= -30 THEN 'Excellent'
              WHEN max_signal >= -50 THEN 'Good'
              WHEN max_signal >= -70 THEN 'Fair'
              ELSE 'Poor'
            END as strength_category,
            COUNT(*) as count
          FROM app.analytics_summary_mv
          GROUP BY strength_category
          ORDER BY count DESC
        `,
      params,
    },
    security: {
      sql: `
          SELECT
            CASE
              WHEN capabilities LIKE '%WPA3%' THEN 'WPA3'
              WHEN capabilities LIKE '%WPA2%' THEN 'WPA2'
              WHEN capabilities LIKE '%WPA%' THEN 'WPA'
              WHEN capabilities LIKE '%WEP%' THEN 'WEP'
              WHEN capabilities = '' OR capabilities IS NULL THEN 'Open'
              ELSE 'Other'
            END as encryption,
            COUNT(*) as count
          FROM app.analytics_summary_mv
          GROUP BY encryption
          ORDER BY count DESC
        `,
      params,
    },
    threatDistribution: {
      sql: `
          SELECT
            CASE
              WHEN threat_score >= 0.7 THEN 'high'
              WHEN threat_score >= 0.4 THEN 'medium'
              WHEN threat_score >= 0.1 THEN 'low'
              ELSE 'none'
            END as threat_level,
            COUNT(*) as count
          FROM app.analytics_summary_mv
          GROUP BY threat_level
          ORDER BY count DESC
        `,
      params,
    },
    temporalActivity: {
      sql: `
          SELECT
            DATE(last_seen) as date,
            COUNT(*) as count
          FROM app.analytics_summary_mv
          GROUP BY DATE(last_seen)
          ORDER BY date DESC
          LIMIT 30
        `,
      params,
    },
    radioTypeOverTime: {
      sql: `
          SELECT
            DATE(last_seen) as date,
            CASE
              WHEN type = 'W' THEN 'WiFi'
              WHEN type = 'E' THEN 'BLE'
              WHEN type = 'B' THEN 'BT'
              WHEN type = 'L' THEN 'LTE'
              WHEN type = 'N' THEN 'NR'
              WHEN type = 'G' THEN 'GSM'
              ELSE type
            END as type,
            COUNT(*) as count
          FROM app.analytics_summary_mv
          GROUP BY DATE(last_seen), type
          ORDER BY date DESC, count DESC
          LIMIT 100
        `,
      params,
    },
    threatTrends: {
      sql: `
          SELECT
            DATE(last_seen) as date,
            AVG(threat_score) as avg_threat_score,
            COUNT(*) as network_count
          FROM app.analytics_summary_mv
          GROUP BY DATE(last_seen)
          ORDER BY date DESC
          LIMIT 30
        `,
      params,
    },
    topNetworks: {
      sql: `
          SELECT
            bssid,
            ssid,
            type,
            observation_count,
            threat_score,
            last_seen
          FROM app.analytics_summary_mv
          ORDER BY observation_count DESC
          LIMIT 20
        `,
      params,
    },
  };
}
