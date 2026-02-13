/**
 * Network-Only Queries
 * Optimized query path when only network-level filters are active (no observation-level filters).
 * Queries api_network_explorer_mv directly instead of building observation CTEs.
 */

import type { BuilderContext } from './builderContext';
import {
  OBS_TYPE_EXPR,
  SECURITY_EXPR,
  NETWORK_CHANNEL_EXPR,
  THREAT_SCORE_EXPR,
  THREAT_LEVEL_EXPR,
} from './sqlExpressions';
import { isOui, coerceOui } from './normalizers';
import type { FilteredQueryResult, QueryResult, NetworkListOptions } from './types';

interface ThreatLevelMap {
  [key: string]: string;
}

export function buildNetworkOnlyQuery(
  ctx: BuilderContext,
  options: NetworkListOptions
): FilteredQueryResult {
  const { limit = 500, offset = 0, orderBy = 'last_observed_at DESC' } = options;
  const f = ctx.filters;
  const e = ctx.enabled;
  const where: string[] = [];
  const networkTypeExpr = `
      CASE
        WHEN ola.radio_type IS NULL
          AND ola.radio_frequency IS NULL
          AND COALESCE(ola.radio_capabilities, '') = ''
        THEN ne.type
        ELSE ${OBS_TYPE_EXPR('ola')}
      END
    `;
  const networkSecurityExpr = `
      CASE
        WHEN COALESCE(ola.radio_capabilities, '') = '' THEN
          CASE
            WHEN COALESCE(ne.security, '') = '' THEN 'OPEN'
            WHEN UPPER(ne.security) LIKE '%WEP%' THEN 'WEP'
            WHEN UPPER(ne.security) ~ '^\\s*\\[ESS\\]\\s*$' THEN 'OPEN'
            WHEN UPPER(ne.security) ~ '^\\s*\\[IBSS\\]\\s*$' THEN 'OPEN'
            WHEN UPPER(ne.security) ~ 'RSN-OWE' THEN 'WPA3-OWE'
            WHEN UPPER(ne.security) ~ 'RSN-SAE' THEN 'WPA3-SAE'
            WHEN UPPER(ne.security) ~ '(WPA3|SAE)' AND UPPER(ne.security) ~ '(EAP|MGT)' THEN 'WPA3-E'
            WHEN UPPER(ne.security) ~ '(WPA3|SAE)' THEN 'WPA3'
            WHEN UPPER(ne.security) ~ '(WPA2|RSN)' AND UPPER(ne.security) ~ '(EAP|MGT)' THEN 'WPA2-E'
            WHEN UPPER(ne.security) ~ '(WPA2|RSN)' THEN 'WPA2'
            WHEN UPPER(ne.security) ~ 'WPA-' AND UPPER(ne.security) NOT LIKE '%WPA2%' THEN 'WPA'
            WHEN UPPER(ne.security) LIKE '%WPA%' AND UPPER(ne.security) NOT LIKE '%WPA2%' AND UPPER(ne.security) NOT LIKE '%WPA3%' AND UPPER(ne.security) NOT LIKE '%RSN%' THEN 'WPA'
            WHEN UPPER(ne.security) LIKE '%WPS%' AND UPPER(ne.security) NOT LIKE '%WPA%' AND UPPER(ne.security) NOT LIKE '%RSN%' THEN 'WPS'
            WHEN UPPER(ne.security) ~ '(CCMP|TKIP|AES)' THEN 'WPA2'
            ELSE 'Unknown'
          END
        ELSE ${SECURITY_EXPR('ola')}
      END
    `;
  const networkFrequencyExpr = 'COALESCE(ola.radio_frequency, ne.frequency)';
  const networkSignalExpr = 'COALESCE(ola.level, ne.signal)';
  const networkChannelExpr = `
      CASE
        WHEN ${networkFrequencyExpr} BETWEEN 2412 AND 2484 THEN
          CASE
            WHEN ${networkFrequencyExpr} = 2484 THEN 14
            ELSE FLOOR((${networkFrequencyExpr} - 2412) / 5) + 1
          END
        WHEN ${networkFrequencyExpr} BETWEEN 5000 AND 5900 THEN
          FLOOR((${networkFrequencyExpr} - 5000) / 5)
        WHEN ${networkFrequencyExpr} BETWEEN 5925 AND 7125 THEN
          FLOOR((${networkFrequencyExpr} - 5925) / 5)
        ELSE NULL
      END
    `;

  if (e.ssid && f.ssid) {
    where.push(`ne.ssid ILIKE ${ctx.addParam(`%${f.ssid}%`)}`);
    ctx.addApplied('identity', 'ssid', f.ssid);
  }
  if (e.bssid && f.bssid) {
    const value = String(f.bssid).toUpperCase();
    if (value.length === 17) {
      where.push(`UPPER(ne.bssid) = ${ctx.addParam(value)}`);
    } else {
      where.push(`UPPER(ne.bssid) LIKE ${ctx.addParam(`${value}%`)}`);
    }
    ctx.addApplied('identity', 'bssid', f.bssid);
  }
  if (e.manufacturer && f.manufacturer) {
    const cleaned = coerceOui(f.manufacturer);
    if (isOui(cleaned)) {
      where.push(`UPPER(REPLACE(SUBSTRING(ne.bssid, 1, 8), ':', '')) = ${ctx.addParam(cleaned)}`);
      ctx.addApplied('identity', 'manufacturerOui', cleaned);
    } else {
      where.push(`ne.manufacturer ILIKE ${ctx.addParam(`%${f.manufacturer}%`)}`);
      ctx.addApplied('identity', 'manufacturer', f.manufacturer);
    }
  }
  if (e.radioTypes && Array.isArray(f.radioTypes) && f.radioTypes.length > 0) {
    where.push(`${networkTypeExpr} = ANY(${ctx.addParam(f.radioTypes)})`);
    ctx.addApplied('radio', 'radioTypes', f.radioTypes);
  }
  if (e.frequencyBands && Array.isArray(f.frequencyBands) && f.frequencyBands.length > 0) {
    const bandConditions = f.frequencyBands.map((band) => {
      if (band === '2.4GHz') {
        return `(${networkFrequencyExpr} BETWEEN 2412 AND 2484)`;
      }
      if (band === '5GHz') {
        return `(${networkFrequencyExpr} BETWEEN 5000 AND 5900)`;
      }
      if (band === '6GHz') {
        return `(${networkFrequencyExpr} BETWEEN 5925 AND 7125)`;
      }
      if (band === 'BLE') {
        return `${networkTypeExpr} = 'E'`;
      }
      if (band === 'Cellular') {
        return `${networkTypeExpr} IN ('L', 'G', 'N')`;
      }
      return null;
    });
    const clauses = bandConditions.filter(Boolean);
    if (clauses.length > 0) {
      where.push(`(${clauses.join(' OR ')})`);
      ctx.addApplied('radio', 'frequencyBands', f.frequencyBands);
    }
  }
  if (e.channelMin && f.channelMin !== undefined) {
    where.push(`(${networkChannelExpr} >= ${ctx.addParam(f.channelMin)})`);
    ctx.addApplied('radio', 'channelMin', f.channelMin);
  }
  if (e.channelMax && f.channelMax !== undefined) {
    where.push(`(${networkChannelExpr} <= ${ctx.addParam(f.channelMax)})`);
    ctx.addApplied('radio', 'channelMax', f.channelMax);
  }
  if (e.rssiMin && f.rssiMin !== undefined) {
    where.push(`${networkSignalExpr} >= ${ctx.addParam(f.rssiMin)}`);
    ctx.addApplied('radio', 'rssiMin', f.rssiMin);
  }
  if (e.rssiMax && f.rssiMax !== undefined) {
    where.push(`${networkSignalExpr} <= ${ctx.addParam(f.rssiMax)}`);
    ctx.addApplied('radio', 'rssiMax', f.rssiMax);
  }
  if (e.encryptionTypes && Array.isArray(f.encryptionTypes) && f.encryptionTypes.length > 0) {
    const securityClauses: string[] = [];
    f.encryptionTypes.forEach((type) => {
      const normalizedType = String(type).trim().toUpperCase();
      const finalType = normalizedType.includes('WEP') ? 'WEP' : normalizedType;

      switch (finalType) {
        case 'OPEN':
          securityClauses.push(`${networkSecurityExpr} = 'OPEN'`);
          break;
        case 'WEP':
          securityClauses.push(`${networkSecurityExpr} = 'WEP'`);
          break;
        case 'WPA':
          securityClauses.push(`${networkSecurityExpr} = 'WPA'`);
          break;
        case 'WPA2':
          securityClauses.push(`${networkSecurityExpr} IN ('WPA2', 'WPA2-E')`);
          break;
        case 'WPA3':
          securityClauses.push(
            `${networkSecurityExpr} IN ('WPA3', 'WPA3-SAE', 'WPA3-OWE', 'WPA3-E')`
          );
          break;
      }
    });
    if (securityClauses.length > 0) {
      where.push(`(${securityClauses.join(' OR ')})`);
    }
    ctx.addApplied('security', 'encryptionTypes', f.encryptionTypes);
  }
  if (e.securityFlags && Array.isArray(f.securityFlags) && f.securityFlags.length > 0) {
    const flagClauses: string[] = [];
    if (f.securityFlags.includes('insecure')) {
      flagClauses.push(`${networkSecurityExpr} IN ('OPEN', 'WEP', 'WPS')`);
    }
    if (f.securityFlags.includes('deprecated')) {
      flagClauses.push(`${networkSecurityExpr} = 'WEP'`);
    }
    if (f.securityFlags.includes('enterprise')) {
      flagClauses.push(`${networkSecurityExpr} IN ('WPA2-E', 'WPA3-E')`);
    }
    if (f.securityFlags.includes('personal')) {
      flagClauses.push(`${networkSecurityExpr} IN ('WPA', 'WPA2-P', 'WPA3-P')`);
    }
    if (f.securityFlags.includes('unknown')) {
      flagClauses.push(`${networkSecurityExpr} = 'Unknown'`);
    }
    if (flagClauses.length > 0) {
      where.push(`(${flagClauses.join(' OR ')})`);
      ctx.addApplied('security', 'securityFlags', f.securityFlags);
    }
  }
  if (e.observationCountMin && f.observationCountMin !== undefined) {
    where.push(`ne.observations >= ${ctx.addParam(f.observationCountMin)}`);
    ctx.addApplied('quality', 'observationCountMin', f.observationCountMin);
  }
  if (e.observationCountMax && f.observationCountMax !== undefined) {
    where.push(`ne.observations <= ${ctx.addParam(f.observationCountMax)}`);
    ctx.addApplied('quality', 'observationCountMax', f.observationCountMax);
  }
  if (e.gpsAccuracyMax && f.gpsAccuracyMax !== undefined) {
    where.push(
      `ne.accuracy_meters IS NOT NULL AND ne.accuracy_meters > 0 AND ne.accuracy_meters <= ${ctx.addParam(
        f.gpsAccuracyMax
      )}`
    );
    ctx.addApplied('quality', 'gpsAccuracyMax', f.gpsAccuracyMax);
  }
  if (e.excludeInvalidCoords && f.excludeInvalidCoords) {
    where.push('ne.lat IS NOT NULL AND ne.lon IS NOT NULL');
    ctx.addApplied('quality', 'excludeInvalidCoords', f.excludeInvalidCoords);
  }
  if (e.distanceFromHomeMin && f.distanceFromHomeMin !== undefined) {
    where.push(`ne.distance_from_home_km >= ${ctx.addParam(f.distanceFromHomeMin)}`);
    ctx.addApplied('spatial', 'distanceFromHomeMin', f.distanceFromHomeMin);
  }
  if (e.distanceFromHomeMax && f.distanceFromHomeMax !== undefined) {
    where.push(`ne.distance_from_home_km <= ${ctx.addParam(f.distanceFromHomeMax)}`);
    ctx.addApplied('spatial', 'distanceFromHomeMax', f.distanceFromHomeMax);
  }
  if (e.threatScoreMin && f.threatScoreMin !== undefined) {
    where.push(`ne.threat_score >= ${ctx.addParam(f.threatScoreMin)}`);
    ctx.addApplied('threat', 'threatScoreMin', f.threatScoreMin);
  }
  if (e.threatScoreMax && f.threatScoreMax !== undefined) {
    where.push(`ne.threat_score <= ${ctx.addParam(f.threatScoreMax)}`);
    ctx.addApplied('threat', 'threatScoreMax', f.threatScoreMax);
  }
  if (e.threatCategories && Array.isArray(f.threatCategories) && f.threatCategories.length > 0) {
    const threatLevelMap: ThreatLevelMap = {
      critical: 'CRITICAL',
      high: 'HIGH',
      medium: 'MED',
      low: 'LOW',
    };
    const dbThreatLevels = f.threatCategories.map((cat) => threatLevelMap[cat]).filter(Boolean);
    if (dbThreatLevels.length > 0) {
      where.push(`ne.threat_level = ANY(${ctx.addParam(dbThreatLevels)})`);
      ctx.addApplied('threat', 'threatCategories', f.threatCategories);
    }
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
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
          WHEN COALESCE(ola.radio_capabilities, '') = '' THEN ne.security
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
        rm.organization_address AS manufacturer_address,
        NULL::numeric AS min_altitude_m,
        NULL::numeric AS max_altitude_m,
        NULL::numeric AS altitude_span_m,
        ne.max_distance_meters,
        NULL::numeric AS last_altitude_m,
        FALSE AS is_sentinel,
        ne.distance_from_home_km,
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
      ${whereClause}
      ORDER BY ${safeOrderBy}
      LIMIT ${ctx.addParam(limit)} OFFSET ${ctx.addParam(offset)}
    `;

  return {
    sql,
    params: [...ctx.params],
    appliedFilters: ctx.appliedFilters,
    ignoredFilters: ctx.ignoredFilters,
    warnings: ctx.warnings,
  };
}

export function buildNetworkOnlyCountQuery(ctx: BuilderContext): QueryResult {
  const f = ctx.filters;
  const e = ctx.enabled;
  const where: string[] = [];

  if (e.ssid && f.ssid) {
    where.push(`ne.ssid ILIKE ${ctx.addParam(`%${f.ssid}%`)}`);
  }
  if (e.bssid && f.bssid) {
    const value = String(f.bssid).toUpperCase();
    if (value.length === 17) {
      where.push(`UPPER(ne.bssid) = ${ctx.addParam(value)}`);
    } else {
      where.push(`UPPER(ne.bssid) LIKE ${ctx.addParam(`${value}%`)}`);
    }
  }
  if (e.manufacturer && f.manufacturer) {
    const cleaned = coerceOui(f.manufacturer);
    if (isOui(cleaned)) {
      where.push(`UPPER(REPLACE(SUBSTRING(ne.bssid, 1, 8), ':', '')) = ${ctx.addParam(cleaned)}`);
    } else {
      where.push(`ne.manufacturer ILIKE ${ctx.addParam(`%${f.manufacturer}%`)}`);
    }
  }
  if (e.radioTypes && Array.isArray(f.radioTypes) && f.radioTypes.length > 0) {
    where.push(`ne.type = ANY(${ctx.addParam(f.radioTypes)})`);
  }
  if (e.frequencyBands && Array.isArray(f.frequencyBands) && f.frequencyBands.length > 0) {
    const bandConditions = f.frequencyBands.map((band) => {
      if (band === '2.4GHz') {
        return '(ne.frequency BETWEEN 2412 AND 2484)';
      }
      if (band === '5GHz') {
        return '(ne.frequency BETWEEN 5000 AND 5900)';
      }
      if (band === '6GHz') {
        return '(ne.frequency BETWEEN 5925 AND 7125)';
      }
      if (band === 'BLE') {
        return "ne.type = 'E'";
      }
      if (band === 'Cellular') {
        return "ne.type IN ('L', 'G', 'N')";
      }
      return null;
    });
    const clauses = bandConditions.filter(Boolean);
    if (clauses.length > 0) {
      where.push(`(${clauses.join(' OR ')})`);
    }
  }
  if (e.channelMin && f.channelMin !== undefined) {
    where.push(`${NETWORK_CHANNEL_EXPR('ne')} >= ${ctx.addParam(f.channelMin)}`);
  }
  if (e.channelMax && f.channelMax !== undefined) {
    where.push(`${NETWORK_CHANNEL_EXPR('ne')} <= ${ctx.addParam(f.channelMax)}`);
  }
  if (e.rssiMin && f.rssiMin !== undefined) {
    where.push(`ne.signal >= ${ctx.addParam(f.rssiMin)}`);
  }
  if (e.rssiMax && f.rssiMax !== undefined) {
    where.push(`ne.signal <= ${ctx.addParam(f.rssiMax)}`);
  }
  const computedSecurityExpr = `
      CASE
        WHEN COALESCE(ne.security, '') = '' THEN 'OPEN'
        WHEN UPPER(ne.security) ~ '^\\s*\\[ESS\\]\\s*$' THEN 'OPEN'
        WHEN UPPER(ne.security) ~ '^\\s*\\[IBSS\\]\\s*$' THEN 'OPEN'
        WHEN UPPER(ne.security) ~ 'RSN-OWE' THEN 'WPA3-OWE'
        WHEN UPPER(ne.security) ~ 'RSN-SAE' THEN 'WPA3-SAE'
        WHEN UPPER(ne.security) ~ '(WPA3|SAE)' AND UPPER(ne.security) ~ '(EAP|MGT)' THEN 'WPA3-E'
        WHEN UPPER(ne.security) ~ '(WPA3|SAE)' THEN 'WPA3'
        WHEN UPPER(ne.security) ~ '(WPA2|RSN)' AND UPPER(ne.security) ~ '(EAP|MGT)' THEN 'WPA2-E'
        WHEN UPPER(ne.security) ~ '(WPA2|RSN)' THEN 'WPA2'
        WHEN UPPER(ne.security) ~ 'WPA-' AND UPPER(ne.security) NOT LIKE '%WPA2%' THEN 'WPA'
        WHEN UPPER(ne.security) LIKE '%WPA%' AND UPPER(ne.security) NOT LIKE '%WPA2%' AND UPPER(ne.security) NOT LIKE '%WPA3%' AND UPPER(ne.security) NOT LIKE '%RSN%' THEN 'WPA'
        WHEN UPPER(ne.security) LIKE '%WEP%' THEN 'WEP'
        WHEN UPPER(ne.security) LIKE '%WPS%' AND UPPER(ne.security) NOT LIKE '%WPA%' AND UPPER(ne.security) NOT LIKE '%RSN%' THEN 'WPS'
        WHEN UPPER(ne.security) ~ '(CCMP|TKIP|AES)' THEN 'WPA2'
        ELSE 'Unknown'
      END
    `;
  if (e.encryptionTypes && Array.isArray(f.encryptionTypes) && f.encryptionTypes.length > 0) {
    where.push(`(${computedSecurityExpr}) = ANY(${ctx.addParam(f.encryptionTypes)})`);
  }
  if (e.securityFlags && Array.isArray(f.securityFlags) && f.securityFlags.length > 0) {
    const flagClauses: string[] = [];
    if (f.securityFlags.includes('insecure')) {
      flagClauses.push(`(${computedSecurityExpr}) IN ('OPEN', 'WEP', 'WPS')`);
    }
    if (f.securityFlags.includes('deprecated')) {
      flagClauses.push(`(${computedSecurityExpr}) = 'WEP'`);
    }
    if (f.securityFlags.includes('enterprise')) {
      flagClauses.push(`(${computedSecurityExpr}) IN ('WPA2-E', 'WPA3-E')`);
    }
    if (f.securityFlags.includes('personal')) {
      flagClauses.push(`(${computedSecurityExpr}) IN ('WPA', 'WPA2-P', 'WPA3-P')`);
    }
    if (f.securityFlags.includes('unknown')) {
      flagClauses.push(`(${computedSecurityExpr}) = 'Unknown'`);
    }
    if (flagClauses.length > 0) {
      where.push(`(${flagClauses.join(' OR ')})`);
    }
  }
  if (e.observationCountMin && f.observationCountMin !== undefined) {
    where.push(`ne.observations >= ${ctx.addParam(f.observationCountMin)}`);
  }
  if (e.observationCountMax && f.observationCountMax !== undefined) {
    where.push(`ne.observations <= ${ctx.addParam(f.observationCountMax)}`);
  }
  if (e.gpsAccuracyMax && f.gpsAccuracyMax !== undefined) {
    where.push(
      `ne.accuracy_meters IS NOT NULL AND ne.accuracy_meters > 0 AND ne.accuracy_meters <= ${ctx.addParam(
        f.gpsAccuracyMax
      )}`
    );
  }
  if (e.excludeInvalidCoords && f.excludeInvalidCoords) {
    where.push('ne.lat IS NOT NULL AND ne.lon IS NOT NULL');
  }
  if (e.distanceFromHomeMin && f.distanceFromHomeMin !== undefined) {
    where.push(`ne.distance_from_home_km >= ${ctx.addParam(f.distanceFromHomeMin)}`);
  }
  if (e.distanceFromHomeMax && f.distanceFromHomeMax !== undefined) {
    where.push(`ne.distance_from_home_km <= ${ctx.addParam(f.distanceFromHomeMax)}`);
  }
  if (e.threatScoreMin && f.threatScoreMin !== undefined) {
    where.push(`(${THREAT_SCORE_EXPR('nts', 'nt')} >= ${ctx.addParam(f.threatScoreMin)})`);
  }
  if (e.threatScoreMax && f.threatScoreMax !== undefined) {
    where.push(`(${THREAT_SCORE_EXPR('nts', 'nt')} <= ${ctx.addParam(f.threatScoreMax)})`);
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
    where.push(`${THREAT_LEVEL_EXPR('nts', 'nt')} = ANY(${ctx.addParam(dbThreatLevels)})`);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  return {
    sql: `SELECT COUNT(*) AS total FROM app.api_network_explorer_mv ne
            LEFT JOIN app.network_threat_scores nts ON nts.bssid = ne.bssid
            LEFT JOIN app.network_tags nt ON nt.bssid = ne.bssid
            ${whereClause}`,
    params: [...ctx.params],
  };
}
