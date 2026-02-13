/**
 * Build SQL WHERE conditions for the network list route.
 * Returns conditions array, params array, paramIndex, and any additional joins.
 */

export {};

const { escapeLikePattern } = require('../../../utils/escapeSQL');

interface ConditionBuilderState {
  conditions: string[];
  params: unknown[];
  paramIndex: number;
  extraJoins: string[];
}

interface ParsedFilterValues {
  ssidPattern: string | null;
  bssidList: string[] | null;
  threatLevel: string | null;
  threatCategories: string[] | null;
  threatScoreMin: number | null;
  threatScoreMax: number | null;
  lastSeen: string | null;
  distanceFromHomeKm: number | null;
  distanceFromHomeMinKm: number | null;
  distanceFromHomeMaxKm: number | null;
  minSignal: number | null;
  maxSignal: number | null;
  minObsCount: number | null;
  maxObsCount: number | null;
  radioTypes: string[] | null;
  encryptionTypes: string[] | null;
  authMethods: string[] | null;
  insecureFlags: string[] | null;
  securityFlags: string[] | null;
  quickSearchPattern: string | null;
  bboxMinLat: number | null;
  bboxMaxLat: number | null;
  bboxMinLng: number | null;
  bboxMaxLng: number | null;
  radiusCenterLat: number | null;
  radiusCenterLng: number | null;
  radiusMeters: number | null;
  locationMode: string;
}

interface SqlExpressions {
  typeExpr: string;
  threatScoreExpr: string;
  threatLevelExpr: string;
  distanceExpr: string;
}

function buildNetworkListConditions(
  filters: ParsedFilterValues,
  sql: SqlExpressions
): ConditionBuilderState {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;
  const extraJoins: string[] = [];

  const addCondition = (condition: string, value: unknown) => {
    conditions.push(condition);
    params.push(value);
    paramIndex++;
  };

  if (filters.ssidPattern !== null) {
    const escapedPattern = escapeLikePattern(filters.ssidPattern);
    addCondition(`ne.ssid ILIKE $${paramIndex}`, `%${escapedPattern}%`);
  }

  if (filters.bssidList !== null && filters.bssidList.length > 0) {
    conditions.push(`ne.bssid = ANY($${paramIndex}::text[])`);
    params.push(filters.bssidList);
    paramIndex++;
  }

  if (filters.threatLevel !== null) {
    addCondition(`(${sql.threatLevelExpr}) = $${paramIndex}`, filters.threatLevel);
  }

  if (filters.threatCategories !== null && filters.threatCategories.length > 0) {
    addCondition(`nt.threat_category = ANY($${paramIndex}::text[])`, filters.threatCategories);
  }

  if (filters.threatScoreMin !== null) {
    addCondition(`${sql.threatScoreExpr} >= $${paramIndex}`, filters.threatScoreMin);
  }

  if (filters.threatScoreMax !== null) {
    addCondition(`${sql.threatScoreExpr} <= $${paramIndex}`, filters.threatScoreMax);
  }

  if (filters.lastSeen !== null) {
    addCondition(`ne.last_seen >= $${paramIndex}`, filters.lastSeen);
  }

  if (filters.distanceFromHomeKm !== null) {
    addCondition(`(${sql.distanceExpr}) <= $${paramIndex}`, filters.distanceFromHomeKm);
  }

  if (filters.distanceFromHomeMinKm !== null) {
    addCondition(`(${sql.distanceExpr}) >= $${paramIndex}`, filters.distanceFromHomeMinKm);
  }

  if (filters.distanceFromHomeMaxKm !== null) {
    addCondition(`(${sql.distanceExpr}) <= $${paramIndex}`, filters.distanceFromHomeMaxKm);
  }

  if (filters.minSignal !== null) {
    addCondition(`ne.signal >= $${paramIndex}`, filters.minSignal);
  }

  if (filters.maxSignal !== null) {
    addCondition(`ne.signal <= $${paramIndex}`, filters.maxSignal);
  }

  if (filters.minObsCount !== null) {
    addCondition(`ne.observations >= $${paramIndex}`, filters.minObsCount);
  }

  if (filters.maxObsCount !== null) {
    addCondition(`ne.observations <= $${paramIndex}`, filters.maxObsCount);
  }

  if (filters.radioTypes !== null && filters.radioTypes.length > 0) {
    if (filters.radioTypes.includes('W')) {
      conditions.push(`(${sql.typeExpr}) = 'W'`);
    } else {
      const radioConditions = filters.radioTypes.map((rt) => `(${sql.typeExpr}) = '${rt}'`);
      conditions.push(`(${radioConditions.join(' OR ')})`);
    }
  }

  if (filters.encryptionTypes !== null && filters.encryptionTypes.length > 0) {
    const encConditions = filters.encryptionTypes.map((enc) => {
      if (enc === 'WEP') return `ne.security ILIKE '%WEP%'`;
      if (enc === 'WPA')
        return `(ne.security ILIKE '%WPA%' OR ne.security ILIKE '%WPA2%' OR ne.security ILIKE '%WPA3%' OR ne.security ILIKE '%WPA%')`;
      if (enc === 'WPA2') return `ne.security ILIKE '%WPA2%'`;
      if (enc === 'WPA3') return `ne.security ILIKE '%WPA3%'`;
      if (enc === 'OWE') return `ne.security ILIKE '%OWE%'`;
      if (enc === 'SAE') return `ne.security ILIKE '%SAE%'`;
      if (enc === 'NONE')
        return `(ne.security IS NULL OR ne.security = '' OR ne.security ILIKE '%NONE%' OR ne.security !~* '(WPA|WEP|ESS|RSN|CCMP|TKIP|OWE|SAE)')`;
      return `ne.security ILIKE '%${enc.replace(/'/g, "''")}%'`;
    });
    conditions.push(`(${encConditions.join(' OR ')})`);
  }

  if (filters.authMethods !== null && filters.authMethods.length > 0) {
    const authConditions = filters.authMethods.map((auth) => {
      if (auth === 'NONE') return `(ne.auth IS NULL OR ne.auth = '' OR ne.auth ILIKE '%NONE%')`;
      return `ne.auth ILIKE '%${auth.replace(/'/g, "''")}%'`;
    });
    conditions.push(`(${authConditions.join(' OR ')})`);
  }

  if (filters.insecureFlags !== null && filters.insecureFlags.length > 0) {
    conditions.push(`(ne.insecure_flags && $${paramIndex}::text[])`);
    params.push(filters.insecureFlags);
    paramIndex++;
  }

  if (filters.securityFlags !== null && filters.securityFlags.length > 0) {
    conditions.push(`(ne.security_flags && $${paramIndex}::text[])`);
    params.push(filters.securityFlags);
    paramIndex++;
  }

  if (filters.quickSearchPattern !== null) {
    const escapedQuickSearch = escapeLikePattern(filters.quickSearchPattern);
    const quickSearchCondition = `
      (ne.ssid ILIKE $${paramIndex} OR ne.bssid ILIKE $${paramIndex} OR rm.manufacturer ILIKE $${paramIndex})
    `;
    conditions.push(quickSearchCondition);
    params.push(`%${escapedQuickSearch}%`);
    paramIndex++;
  }

  if (
    filters.locationMode === 'centroid' ||
    filters.locationMode === 'weighted_centroid' ||
    filters.locationMode === 'triangulated'
  ) {
    const prefix =
      filters.locationMode === 'weighted_centroid'
        ? 'weighted'
        : filters.locationMode === 'triangulated'
          ? 'triangulated'
          : 'centroid';
    extraJoins.push(
      `STATIC JOIN (SELECT bssid, ${prefix}_lat AS lat, ${prefix}_lon AS lon FROM network_locations WHERE bssid = ne.bssid) AS nl ON ne.bssid = nl.bssid`
    );
  }

  if (
    filters.bboxMinLat !== null &&
    filters.bboxMaxLat !== null &&
    filters.bboxMinLng !== null &&
    filters.bboxMaxLng !== null
  ) {
    if (filters.locationMode === 'latest_observation') {
      conditions.push(`ne.lat BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      params.push(filters.bboxMinLat, filters.bboxMaxLat);
      paramIndex += 2;
      conditions.push(`ne.lon BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      params.push(filters.bboxMinLng, filters.bboxMaxLng);
      paramIndex += 2;
    } else {
      extraJoins.push(`STATIC JOIN network_locations nl ON ne.bssid = nl.bssid`);
      conditions.push(`nl.lat BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      params.push(filters.bboxMinLat, filters.bboxMaxLat);
      paramIndex += 2;
      conditions.push(`nl.lon BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      params.push(filters.bboxMinLng, filters.bboxMaxLng);
      paramIndex += 2;
    }
  }

  if (
    filters.radiusCenterLat !== null &&
    filters.radiusCenterLng !== null &&
    filters.radiusMeters !== null
  ) {
    const radiusExpr = `
      (
        6371 * ACOS(
          COS(RADIANS($${paramIndex})) * COS(RADIANS(ne.lat)) *
          COS(RADIANS(ne.lon) - RADIANS($${paramIndex + 1})) +
          SIN(RADIANS($${paramIndex})) * SIN(RADIANS(ne.lat))
        ) * 1000 <= $${paramIndex + 2}
      )
    `;
    conditions.push(radiusExpr);
    params.push(filters.radiusCenterLat, filters.radiusCenterLng, filters.radiusMeters);
    paramIndex += 3;
  }

  return { conditions, params, paramIndex, extraJoins };
}

module.exports = { buildNetworkListConditions };
