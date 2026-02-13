/**
 * Observation Filters
 * Builds observation-level WHERE clauses from filter state.
 */

const logger = require('../../logging/logger');

import { NOISE_FLOOR_DBM, RELATIVE_WINDOWS } from './constants';
import { OBS_TYPE_EXPR, SECURITY_EXPR, WIFI_CHANNEL_EXPR } from './sqlExpressions';
import { isOui, coerceOui } from './normalizers';
import type { BuilderContext } from './builderContext';
import type { ObservationFiltersResult } from './types';

export function buildObservationFilters(ctx: BuilderContext): ObservationFiltersResult {
  const where: string[] = [];
  const f = ctx.filters;
  const e = ctx.enabled;

  if (e.excludeInvalidCoords) {
    where.push(
      'o.lat IS NOT NULL',
      'o.lon IS NOT NULL',
      'o.lat BETWEEN -90 AND 90',
      'o.lon BETWEEN -180 AND 180'
    );
    ctx.addApplied('quality', 'excludeInvalidCoords', true);
  }

  if (e.gpsAccuracyMax && f.gpsAccuracyMax !== undefined) {
    where.push(
      `o.accuracy IS NOT NULL AND o.accuracy > 0 AND o.accuracy <= ${ctx.addParam(
        f.gpsAccuracyMax
      )}`
    );
    ctx.addApplied('quality', 'gpsAccuracyMax', f.gpsAccuracyMax);
  }

  if (e.ssid && f.ssid) {
    where.push(`o.ssid ILIKE ${ctx.addParam(`%${f.ssid}%`)}`);
    ctx.addApplied('identity', 'ssid', f.ssid);
  }

  if (e.bssid && f.bssid) {
    const value = String(f.bssid).toUpperCase();
    if (value.length === 17) {
      where.push(`o.bssid = ${ctx.addParam(value)}`);
    } else {
      where.push(`o.bssid LIKE ${ctx.addParam(`${value}%`)}`);
    }
    ctx.addApplied('identity', 'bssid', f.bssid);
  }

  if (e.manufacturer && f.manufacturer) {
    const cleaned = coerceOui(f.manufacturer);
    ctx.obsJoins.add('JOIN app.networks ap ON UPPER(ap.bssid) = UPPER(o.bssid)');
    ctx.obsJoins.add(
      "LEFT JOIN app.radio_manufacturers rm ON rm.prefix_24bit = UPPER(REPLACE(SUBSTRING(ap.bssid, 1, 8), ':', ''))"
    );
    if (isOui(cleaned)) {
      where.push(`rm.prefix_24bit = ${ctx.addParam(cleaned)}`);
      ctx.addApplied('identity', 'manufacturerOui', cleaned);
    } else {
      where.push(`rm.organization_name ILIKE ${ctx.addParam(`%${f.manufacturer}%`)}`);
      ctx.addApplied('identity', 'manufacturer', f.manufacturer);
    }
  }

  if (e.networkId && f.networkId) {
    ctx.addIgnored('identity', 'networkId', 'unsupported_backend');
    ctx.warnings.push('networkId filter ignored (app.networks not available).');
  }

  if (e.radioTypes && Array.isArray(f.radioTypes) && f.radioTypes.length > 0) {
    where.push(`${OBS_TYPE_EXPR('o')} = ANY(${ctx.addParam(f.radioTypes)})`);
    ctx.addApplied('radio', 'radioTypes', f.radioTypes);
  }

  if (e.frequencyBands && Array.isArray(f.frequencyBands) && f.frequencyBands.length > 0) {
    const bandConditions = f.frequencyBands.map((band) => {
      if (band === '2.4GHz') {
        return '(o.radio_frequency BETWEEN 2412 AND 2484)';
      }
      if (band === '5GHz') {
        return '(o.radio_frequency BETWEEN 5000 AND 5900)';
      }
      if (band === '6GHz') {
        return '(o.radio_frequency BETWEEN 5925 AND 7125)';
      }
      if (band === 'BLE') {
        return `${OBS_TYPE_EXPR('o')} = 'E'`;
      }
      if (band === 'Cellular') {
        return `${OBS_TYPE_EXPR('o')} IN ('L', 'G', 'N')`;
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
    where.push(`${WIFI_CHANNEL_EXPR('o')} >= ${ctx.addParam(f.channelMin)}`);
    ctx.addApplied('radio', 'channelMin', f.channelMin);
  }

  if (e.channelMax && f.channelMax !== undefined) {
    where.push(`${WIFI_CHANNEL_EXPR('o')} <= ${ctx.addParam(f.channelMax)}`);
    ctx.addApplied('radio', 'channelMax', f.channelMax);
  }

  if (e.rssiMin && f.rssiMin !== undefined) {
    where.push('o.level IS NOT NULL');
    where.push(`o.level >= ${ctx.addParam(NOISE_FLOOR_DBM)}`);
    where.push(`o.level >= ${ctx.addParam(f.rssiMin)}`);
    ctx.addApplied('radio', 'rssiMin', f.rssiMin);
  }

  if (e.rssiMax && f.rssiMax !== undefined) {
    where.push('o.level IS NOT NULL');
    where.push(`o.level >= ${ctx.addParam(NOISE_FLOOR_DBM)}`);
    where.push(`o.level <= ${ctx.addParam(f.rssiMax)}`);
    ctx.addApplied('radio', 'rssiMax', f.rssiMax);
  }

  // Quality filters for anomalous data
  if (e.qualityFilter && f.qualityFilter && f.qualityFilter !== 'none') {
    if (process.env.DEBUG_FILTERS === 'true') {
      logger.debug(`Quality filter applied: ${f.qualityFilter}`);
    }
    const { DATA_QUALITY_FILTERS } = require('../dataQualityFilters');
    let qualityWhere = '';
    if (f.qualityFilter === 'temporal') {
      qualityWhere = DATA_QUALITY_FILTERS.temporal_clusters;
    } else if (f.qualityFilter === 'extreme') {
      qualityWhere = DATA_QUALITY_FILTERS.extreme_signals;
    } else if (f.qualityFilter === 'duplicate') {
      qualityWhere = DATA_QUALITY_FILTERS.duplicate_coords;
    } else if (f.qualityFilter === 'all') {
      qualityWhere = DATA_QUALITY_FILTERS.all();
    }

    if (qualityWhere) {
      // Remove the leading "AND" from the filter
      const cleanFilter = qualityWhere.replace(/^\s*AND\s+/, '');
      where.push(`(${cleanFilter})`);
      ctx.addApplied('quality', 'qualityFilter', f.qualityFilter);
      if (process.env.DEBUG_FILTERS === 'true') {
        logger.debug(`Quality where clause: ${cleanFilter}`);
      }
    }
  } else {
    if (process.env.DEBUG_FILTERS === 'true') {
      logger.debug('Quality filter not applied', {
        enabled: e.qualityFilter,
        value: f.qualityFilter,
      });
    }
  }

  // Handle security-related filters (encryption types and auth methods)
  const securityClauses: string[] = [];

  if (e.encryptionTypes && Array.isArray(f.encryptionTypes) && f.encryptionTypes.length > 0) {
    f.encryptionTypes.forEach((type) => {
      const normalizedType = String(type).trim().toUpperCase();
      const finalType = normalizedType.includes('WEP') ? 'WEP' : normalizedType;

      switch (finalType) {
        case 'OPEN':
          securityClauses.push(`${SECURITY_EXPR('o')} = 'OPEN'`);
          break;
        case 'WEP':
          securityClauses.push(`${SECURITY_EXPR('o')} = 'WEP'`);
          break;
        case 'WPA':
          securityClauses.push(`${SECURITY_EXPR('o')} = 'WPA'`);
          break;
        case 'WPA2':
          securityClauses.push(`${SECURITY_EXPR('o')} IN ('WPA2', 'WPA2-E')`);
          break;
        case 'WPA3':
          securityClauses.push(
            `${SECURITY_EXPR('o')} IN ('WPA3', 'WPA3-SAE', 'WPA3-OWE', 'WPA3-E')`
          );
          break;
      }
    });
    ctx.addApplied('security', 'encryptionTypes', f.encryptionTypes);
  }

  if (e.authMethods && Array.isArray(f.authMethods) && f.authMethods.length > 0) {
    f.authMethods.forEach((method) => {
      switch (method) {
        case 'PSK':
          securityClauses.push(`${SECURITY_EXPR('o')} IN ('WPA', 'WPA2', 'WPA3', 'WPA3-SAE')`);
          break;
        case 'Enterprise':
          securityClauses.push(`${SECURITY_EXPR('o')} IN ('WPA2-E', 'WPA3-E')`);
          break;
        case 'SAE':
          securityClauses.push(`${SECURITY_EXPR('o')} IN ('WPA3', 'WPA3-SAE')`);
          break;
        case 'OWE':
          securityClauses.push(`${SECURITY_EXPR('o')} = 'WPA3-OWE'`);
          break;
        case 'None':
          securityClauses.push(`${SECURITY_EXPR('o')} = 'OPEN'`);
          break;
      }
    });
    ctx.addApplied('security', 'authMethods', f.authMethods);
  }

  // Combine all security clauses with OR logic
  if (securityClauses.length > 0) {
    where.push(`(${securityClauses.join(' OR ')})`);
  }

  if (e.insecureFlags && Array.isArray(f.insecureFlags) && f.insecureFlags.length > 0) {
    const insecureClauses: string[] = [];
    if (f.insecureFlags.includes('open')) {
      insecureClauses.push(`${SECURITY_EXPR('o')} = 'OPEN'`);
    }
    if (f.insecureFlags.includes('wep')) {
      insecureClauses.push(`${SECURITY_EXPR('o')} = 'WEP'`);
    }
    if (f.insecureFlags.includes('wps')) {
      insecureClauses.push(`${SECURITY_EXPR('o')} = 'WPS'`);
    }
    if (f.insecureFlags.includes('deprecated')) {
      insecureClauses.push(`${SECURITY_EXPR('o')} IN ('WEP', 'WPS')`);
    }
    if (insecureClauses.length > 0) {
      where.push(`(${insecureClauses.join(' OR ')})`);
      ctx.addApplied('security', 'insecureFlags', f.insecureFlags);
    }
  }

  if (e.securityFlags && Array.isArray(f.securityFlags) && f.securityFlags.length > 0) {
    const flagClauses: string[] = [];
    if (f.securityFlags.includes('insecure')) {
      flagClauses.push(`${SECURITY_EXPR('o')} IN ('OPEN', 'WEP', 'WPS')`);
    }
    if (f.securityFlags.includes('deprecated')) {
      flagClauses.push(`${SECURITY_EXPR('o')} = 'WEP'`);
    }
    if (f.securityFlags.includes('enterprise')) {
      flagClauses.push(`${SECURITY_EXPR('o')} IN ('WPA2-E', 'WPA3-E')`);
    }
    if (f.securityFlags.includes('personal')) {
      flagClauses.push(`${SECURITY_EXPR('o')} IN ('WPA', 'WPA2', 'WPA3', 'WPA3-SAE')`);
    }
    if (f.securityFlags.includes('unknown')) {
      flagClauses.push(`${SECURITY_EXPR('o')} = 'Unknown'`);
    }
    if (flagClauses.length > 0) {
      where.push(`(${flagClauses.join(' OR ')})`);
      ctx.addApplied('security', 'securityFlags', f.securityFlags);
    }
  }

  if (e.timeframe && f.timeframe) {
    const normalizeTimestamp = (value: string | undefined): string | null => {
      if (!value || value === 'null' || value === 'undefined') {
        return null;
      }
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? null : value;
    };
    const scope = f.temporalScope || 'observation_time';
    if (scope === 'network_lifetime') {
      ctx.obsJoins.add('JOIN app.networks ap ON UPPER(ap.bssid) = UPPER(o.bssid)');
    }
    if (scope === 'threat_window') {
      ctx.warnings.push('Threat window scope mapped to observation_time (no threat timestamps).');
    }
    if (f.timeframe.type === 'absolute') {
      const startTarget = scope === 'network_lifetime' ? 'ap.first_seen_at' : 'o.time';
      const endTarget = scope === 'network_lifetime' ? 'ap.last_seen_at' : 'o.time';
      const startValue = normalizeTimestamp(f.timeframe.startTimestamp);
      const endValue = normalizeTimestamp(f.timeframe.endTimestamp);
      const startParam = ctx.addParam(startValue);
      const endParam = ctx.addParam(endValue);

      where.push(`(${startParam}::timestamptz IS NULL OR ${startTarget} >= ${startParam})`);
      where.push(`(${endParam}::timestamptz IS NULL OR ${endTarget} <= ${endParam})`);
    } else {
      const window = RELATIVE_WINDOWS[f.timeframe.relativeWindow || '30d'];
      const target = scope === 'network_lifetime' ? 'ap.last_seen_at' : 'o.time';
      const windowParam = ctx.addParam(window || null);
      where.push(
        `(${windowParam}::interval IS NULL OR ${target} >= NOW() - ${windowParam}::interval)`
      );
    }
    ctx.addApplied('temporal', 'timeframe', f.timeframe);
    ctx.addApplied('temporal', 'temporalScope', f.temporalScope || 'observation_time');
  }

  if (e.boundingBox && f.boundingBox) {
    where.push(`o.lat <= ${ctx.addParam(f.boundingBox.north)}`);
    where.push(`o.lat >= ${ctx.addParam(f.boundingBox.south)}`);
    where.push(`o.lon <= ${ctx.addParam(f.boundingBox.east)}`);
    where.push(`o.lon >= ${ctx.addParam(f.boundingBox.west)}`);
    ctx.addApplied('spatial', 'boundingBox', f.boundingBox);
  }

  if (e.radiusFilter && f.radiusFilter) {
    const radiusLon = ctx.addParam(f.radiusFilter.longitude);
    const radiusLat = ctx.addParam(f.radiusFilter.latitude);
    where.push(
      `ST_DWithin(
          ST_SetSRID(ST_MakePoint(o.lon, o.lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${radiusLon}, ${radiusLat}), 4326)::geography,
          ${ctx.addParam(f.radiusFilter.radiusMeters)}
        )`
    );
    ctx.addApplied('spatial', 'radiusFilter', f.radiusFilter);
  }

  if (e.distanceFromHomeMin || e.distanceFromHomeMax) {
    ctx.requiresHome = true;
    const distanceExpr = `ST_Distance(
        home.home_point,
        COALESCE(o.geom, ST_SetSRID(ST_MakePoint(o.lon, o.lat), 4326)::geometry)::geography
      )`;
    if (e.distanceFromHomeMin && f.distanceFromHomeMin !== undefined) {
      where.push(`${distanceExpr} >= ${ctx.addParam(f.distanceFromHomeMin)}`);
      ctx.addApplied('spatial', 'distanceFromHomeMin', f.distanceFromHomeMin);
    }
    if (e.distanceFromHomeMax && f.distanceFromHomeMax !== undefined) {
      where.push(`${distanceExpr} <= ${ctx.addParam(f.distanceFromHomeMax)}`);
      ctx.addApplied('spatial', 'distanceFromHomeMax', f.distanceFromHomeMax);
    }
  }

  // Log ignored filters (enabled but missing values)
  if (e.ssid && !f.ssid) {
    ctx.addIgnored('identity', 'ssid', 'enabled_without_value');
  }
  if (e.bssid && !f.bssid) {
    ctx.addIgnored('identity', 'bssid', 'enabled_without_value');
  }
  if (e.manufacturer && !f.manufacturer) {
    ctx.addIgnored('identity', 'manufacturer', 'enabled_without_value');
  }
  if (e.networkId && !f.networkId) {
    ctx.addIgnored('identity', 'networkId', 'enabled_without_value');
  }
  if (e.radioTypes && (!Array.isArray(f.radioTypes) || f.radioTypes.length === 0)) {
    ctx.addIgnored('radio', 'radioTypes', 'enabled_without_value');
  }
  if (e.frequencyBands && (!Array.isArray(f.frequencyBands) || f.frequencyBands.length === 0)) {
    ctx.addIgnored('radio', 'frequencyBands', 'enabled_without_value');
  }
  if (e.channelMin && f.channelMin === undefined) {
    ctx.addIgnored('radio', 'channelMin', 'enabled_without_value');
  }
  if (e.channelMax && f.channelMax === undefined) {
    ctx.addIgnored('radio', 'channelMax', 'enabled_without_value');
  }
  if (e.rssiMin && f.rssiMin === undefined) {
    ctx.addIgnored('radio', 'rssiMin', 'enabled_without_value');
  }
  if (e.rssiMax && f.rssiMax === undefined) {
    ctx.addIgnored('radio', 'rssiMax', 'enabled_without_value');
  }
  if (e.encryptionTypes && (!Array.isArray(f.encryptionTypes) || f.encryptionTypes.length === 0)) {
    ctx.addIgnored('security', 'encryptionTypes', 'enabled_without_value');
  }
  if (e.authMethods && (!Array.isArray(f.authMethods) || f.authMethods.length === 0)) {
    ctx.addIgnored('security', 'authMethods', 'enabled_without_value');
  }
  if (e.insecureFlags && (!Array.isArray(f.insecureFlags) || f.insecureFlags.length === 0)) {
    ctx.addIgnored('security', 'insecureFlags', 'enabled_without_value');
  }
  if (e.securityFlags && (!Array.isArray(f.securityFlags) || f.securityFlags.length === 0)) {
    ctx.addIgnored('security', 'securityFlags', 'enabled_without_value');
  }
  if (e.timeframe && !f.timeframe) {
    ctx.addIgnored('temporal', 'timeframe', 'enabled_without_value');
  }
  if (e.boundingBox && !f.boundingBox) {
    ctx.addIgnored('spatial', 'boundingBox', 'enabled_without_value');
  }
  if (e.radiusFilter && !f.radiusFilter) {
    ctx.addIgnored('spatial', 'radiusFilter', 'enabled_without_value');
  }
  if (e.distanceFromHomeMin && f.distanceFromHomeMin === undefined) {
    ctx.addIgnored('spatial', 'distanceFromHomeMin', 'enabled_without_value');
  }
  if (e.distanceFromHomeMax && f.distanceFromHomeMax === undefined) {
    ctx.addIgnored('spatial', 'distanceFromHomeMax', 'enabled_without_value');
  }
  if (e.observationCountMin && f.observationCountMin === undefined) {
    ctx.addIgnored('quality', 'observationCountMin', 'enabled_without_value');
  }
  if (e.observationCountMax && f.observationCountMax === undefined) {
    ctx.addIgnored('quality', 'observationCountMax', 'enabled_without_value');
  }

  return { where, joins: Array.from(ctx.obsJoins) };
}
