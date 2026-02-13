/**
 * Network WHERE Builder
 * Builds network-level WHERE clauses and the filtered observations CTE.
 */

import type { BuilderContext } from './builderContext';
import { THREAT_SCORE_EXPR, THREAT_LEVEL_EXPR } from './sqlExpressions';
import type { CteResult, ObservationFiltersResult } from './types';

interface ThreatLevelMap {
  [key: string]: string;
}

export function buildNetworkWhere(ctx: BuilderContext): string[] {
  const f = ctx.filters;
  const e = ctx.enabled;
  const networkWhere: string[] = [];

  if (e.threatScoreMin && f.threatScoreMin !== undefined) {
    networkWhere.push(`(${THREAT_SCORE_EXPR('nts', 'nt')} >= ${ctx.addParam(f.threatScoreMin)})`);
    ctx.addApplied('threat', 'threatScoreMin', f.threatScoreMin);
  }
  if (e.threatScoreMax && f.threatScoreMax !== undefined) {
    networkWhere.push(`(${THREAT_SCORE_EXPR('nts', 'nt')} <= ${ctx.addParam(f.threatScoreMax)})`);
    ctx.addApplied('threat', 'threatScoreMax', f.threatScoreMax);
  }
  if (e.threatCategories && Array.isArray(f.threatCategories) && f.threatCategories.length > 0) {
    const threatLevelMap: ThreatLevelMap = {
      critical: 'CRITICAL',
      high: 'HIGH',
      medium: 'MED',
      low: 'LOW',
    };
    const dbThreatLevels = f.threatCategories
      .map((cat) => threatLevelMap[cat] || cat.toUpperCase())
      .filter(Boolean);
    networkWhere.push(`${THREAT_LEVEL_EXPR('nts', 'nt')} = ANY(${ctx.addParam(dbThreatLevels)})`);
    ctx.addApplied('threat', 'threatCategories', f.threatCategories);
  }
  if (e.observationCountMin && f.observationCountMin !== undefined) {
    networkWhere.push(`r.observation_count >= ${ctx.addParam(f.observationCountMin)}`);
    ctx.addApplied('quality', 'observationCountMin', f.observationCountMin);
  }
  if (e.observationCountMax && f.observationCountMax !== undefined) {
    networkWhere.push(`r.observation_count <= ${ctx.addParam(f.observationCountMax)}`);
    ctx.addApplied('quality', 'observationCountMax', f.observationCountMax);
  }
  if (e.stationaryConfidenceMin && f.stationaryConfidenceMin !== undefined) {
    networkWhere.push(`s.stationary_confidence >= ${ctx.addParam(f.stationaryConfidenceMin)}`);
    ctx.addApplied('threat', 'stationaryConfidenceMin', f.stationaryConfidenceMin);
  }
  if (e.stationaryConfidenceMax && f.stationaryConfidenceMax !== undefined) {
    networkWhere.push(`s.stationary_confidence <= ${ctx.addParam(f.stationaryConfidenceMax)}`);
    ctx.addApplied('threat', 'stationaryConfidenceMax', f.stationaryConfidenceMax);
  }

  if (e.threatScoreMin && f.threatScoreMin === undefined) {
    ctx.addIgnored('threat', 'threatScoreMin', 'enabled_without_value');
  }
  if (e.threatScoreMax && f.threatScoreMax === undefined) {
    ctx.addIgnored('threat', 'threatScoreMax', 'enabled_without_value');
  }
  if (
    e.threatCategories &&
    (!Array.isArray(f.threatCategories) || f.threatCategories.length === 0)
  ) {
    ctx.addIgnored('threat', 'threatCategories', 'enabled_without_value');
  }
  if (e.stationaryConfidenceMin && f.stationaryConfidenceMin === undefined) {
    ctx.addIgnored('threat', 'stationaryConfidenceMin', 'enabled_without_value');
  }
  if (e.stationaryConfidenceMax && f.stationaryConfidenceMax === undefined) {
    ctx.addIgnored('threat', 'stationaryConfidenceMax', 'enabled_without_value');
  }

  return networkWhere;
}

export function buildFilteredObservationsCte(
  ctx: BuilderContext,
  obsFiltersResult: ObservationFiltersResult,
  options: { selectedBssids?: string[] } = {}
): CteResult {
  const { selectedBssids = [] } = options;
  const { where, joins } = obsFiltersResult;
  const whereClause = where.length > 0 ? where.join(' AND ') : '1=1';
  const homeCte = ctx.requiresHome
    ? `home AS (
        SELECT
          ST_SetSRID(location::geometry, 4326)::geography AS home_point
        FROM app.location_markers
        WHERE marker_type = 'home'
        LIMIT 1
      )`
    : '';

  const homeJoin = ctx.requiresHome ? 'CROSS JOIN home' : '';
  const selectionClause =
    Array.isArray(selectedBssids) && selectedBssids.length > 0
      ? `AND UPPER(o.bssid) = ANY(${ctx.addParam(selectedBssids.map((v) => String(v).toUpperCase()))})`
      : '';
  const cte = `
    WITH ${homeCte ? `${homeCte},` : ''} filtered_obs AS (
      SELECT
        o.bssid,
        o.ssid,
        o.lat,
        o.lon,
        o.level,
        o.accuracy,
        o.time,
        o.radio_type,
        o.radio_frequency,
        o.radio_capabilities,
        o.geom,
        o.altitude
      FROM app.observations o
      ${homeJoin}
      ${joins.join('\n')}
      WHERE ${whereClause}
        AND o.bssid NOT IN ('00:00:00:00:00:00', 'FF:FF:FF:FF:FF:FF')
        AND o.bssid IS NOT NULL
        ${selectionClause}
    )
    `;

  return { cte, params: ctx.params };
}
