/**
 * Networks List Routes
 * GET /networks - List all networks with pagination and filtering
 */

export {};
const express = require('express');
const router = express.Router();
const { query } = require('../../../config/database');
const { safeJsonParse } = require('../../../utils/safeJsonParse');
const { cacheMiddleware } = require('../../../middleware/cacheMiddleware');
const {
  validateBSSIDList,
  validateEnum,
  validateNumberRange,
  validateString,
} = require('../../../validation/schemas');
const {
  parseRequiredInteger,
  parseOptionalNumber,
  parseOptionalInteger,
  parseCommaList,
  parseBoundingBoxParams,
  parseRadiusParams,
} = require('../../../validation/parameterParsers');
const {
  typeExpr,
  threatScoreExpr,
  threatLevelExpr,
  sortColumnMap,
  indexedSorts,
  selectColumns,
} = require('./networkListSql');
const { parseSortParams } = require('./parseSortParams');
const { buildNetworkListConditions } = require('./buildNetworkListConditions');

// GET /api/networks - List all networks with pagination and filtering
router.get('/networks', cacheMiddleware(60), async (req, res, next) => {
  try {
    // --- Parse & validate basic params ---
    const limitResult = parseRequiredInteger(
      req.query.limit,
      1,
      1000,
      'limit',
      'Missing limit parameter.',
      'Invalid limit parameter. Must be between 1 and 1000.'
    );
    if (!limitResult.ok) return res.status(400).json({ error: limitResult.error });

    const offsetResult = parseRequiredInteger(
      req.query.offset,
      0,
      10000000,
      'offset',
      'Missing offset parameter.',
      'Invalid offset parameter. Must be >= 0.'
    );
    if (!offsetResult.ok) return res.status(400).json({ error: offsetResult.error });

    const limit = limitResult.value;
    const offset = offsetResult.value;
    const planCheck = req.query.planCheck === '1';

    // --- Location mode ---
    const locationModeRaw = String(req.query.location_mode || 'latest_observation');
    const locationMode = [
      'latest_observation',
      'centroid',
      'weighted_centroid',
      'triangulated',
    ].includes(locationModeRaw)
      ? locationModeRaw
      : 'latest_observation';

    // --- Threat filters ---
    let threatLevel = null;
    let threatCategories = null;
    let threatScoreMin = null;
    let threatScoreMax = null;

    if (req.query.threat_level !== undefined) {
      const validation = validateEnum(
        req.query.threat_level,
        ['NONE', 'LOW', 'MED', 'HIGH', 'CRITICAL'],
        'threat_level'
      );
      if (!validation.valid)
        return res
          .status(400)
          .json({
            error: 'Invalid threat_level parameter. Must be NONE, LOW, MED, HIGH, or CRITICAL.',
          });
      threatLevel = validation.value;
    }
    if (req.query.threat_categories !== undefined) {
      try {
        const categories = Array.isArray(req.query.threat_categories)
          ? req.query.threat_categories
          : safeJsonParse(req.query.threat_categories);
        if (Array.isArray(categories) && categories.length > 0) {
          const threatLevelMap = { critical: 'CRITICAL', high: 'HIGH', medium: 'MED', low: 'LOW' };
          threatCategories = categories.map((cat) => threatLevelMap[cat]).filter(Boolean);
        }
      } catch {
        return res
          .status(400)
          .json({ error: 'Invalid threat_categories parameter. Must be JSON array.' });
      }
    }
    if (req.query.threat_score_min !== undefined) {
      const v = validateNumberRange(req.query.threat_score_min, 0, 100, 'threat_score_min');
      if (!v.valid)
        return res
          .status(400)
          .json({ error: 'Invalid threat_score_min parameter. Must be 0-100.' });
      threatScoreMin = v.value;
    }
    if (req.query.threat_score_max !== undefined) {
      const v = validateNumberRange(req.query.threat_score_max, 0, 100, 'threat_score_max');
      if (!v.valid)
        return res
          .status(400)
          .json({ error: 'Invalid threat_score_max parameter. Must be 0-100.' });
      threatScoreMax = v.value;
    }

    // --- Temporal ---
    let lastSeen = null;
    if (req.query.last_seen !== undefined) {
      const parsed = new Date(req.query.last_seen);
      if (Number.isNaN(parsed.getTime()))
        return res.status(400).json({ error: 'Invalid last_seen parameter.' });
      lastSeen = parsed.toISOString();
    }

    // --- Distance filters ---
    const distanceResult = parseOptionalNumber(
      req.query.distance_from_home_km,
      0,
      Number.MAX_SAFE_INTEGER,
      'distance_from_home_km'
    );
    if (!distanceResult.ok)
      return res
        .status(400)
        .json({ error: 'Invalid distance_from_home_km parameter. Must be >= 0.' });
    const distanceMinResult = parseOptionalNumber(
      req.query.distance_from_home_km_min,
      0,
      Number.MAX_SAFE_INTEGER,
      'distance_from_home_km_min'
    );
    if (!distanceMinResult.ok)
      return res
        .status(400)
        .json({ error: 'Invalid distance_from_home_km_min parameter. Must be >= 0.' });
    const distanceMaxResult = parseOptionalNumber(
      req.query.distance_from_home_km_max,
      0,
      Number.MAX_SAFE_INTEGER,
      'distance_from_home_km_max'
    );
    if (!distanceMaxResult.ok)
      return res
        .status(400)
        .json({ error: 'Invalid distance_from_home_km_max parameter. Must be >= 0.' });

    // --- Spatial filters ---
    const bboxResult = parseBoundingBoxParams(
      req.query.bbox_min_lat,
      req.query.bbox_max_lat,
      req.query.bbox_min_lng,
      req.query.bbox_max_lng
    );
    const radiusResult = parseRadiusParams(
      req.query.radius_center_lat,
      req.query.radius_center_lng,
      req.query.radius_meters
    );

    // --- Signal / obs count ---
    const minSignalResult = parseOptionalInteger(
      req.query.min_signal,
      Number.MIN_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      'min_signal'
    );
    if (!minSignalResult.ok)
      return res.status(400).json({ error: 'Invalid min_signal parameter.' });
    const maxSignalResult = parseOptionalInteger(
      req.query.max_signal,
      Number.MIN_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      'max_signal'
    );
    if (!maxSignalResult.ok)
      return res.status(400).json({ error: 'Invalid max_signal parameter.' });
    const minObsResult = parseOptionalInteger(
      req.query.min_obs_count,
      0,
      100000000,
      'min_obs_count'
    );
    if (!minObsResult.ok)
      return res.status(400).json({ error: 'Invalid min_obs_count parameter.' });
    const maxObsResult = parseOptionalInteger(
      req.query.max_obs_count,
      0,
      100000000,
      'max_obs_count'
    );
    if (!maxObsResult.ok)
      return res.status(400).json({ error: 'Invalid max_obs_count parameter.' });

    // --- Identity / security filters ---
    let ssidPattern = null;
    if (req.query.ssid !== undefined) {
      const v = validateString(req.query.ssid, 100, 'ssid');
      if (!v.valid) return res.status(400).json({ error: 'Invalid ssid parameter.' });
      ssidPattern = v.value;
    }
    let bssidList = null;
    if (req.query.bssid !== undefined) {
      const v = validateBSSIDList(req.query.bssid, 1000);
      if (!v.valid) return res.status(400).json({ error: v.error });
      bssidList = v.value;
    }
    let quickSearchPattern = null;
    if (req.query.q !== undefined) {
      const v = validateString(req.query.q, 100, 'q');
      if (!v.valid) return res.status(400).json({ error: 'Invalid q parameter.' });
      quickSearchPattern = v.value;
    }

    const radioTypes =
      req.query.radioTypes !== undefined
        ? (parseCommaList(req.query.radioTypes, 20) || []).map((v) => v.toUpperCase())
        : null;
    const encryptionTypes =
      req.query.encryptionTypes !== undefined
        ? parseCommaList(req.query.encryptionTypes, 50)
        : null;
    const authMethods =
      req.query.authMethods !== undefined ? parseCommaList(req.query.authMethods, 20) : null;
    const insecureFlags =
      req.query.insecureFlags !== undefined ? parseCommaList(req.query.insecureFlags, 20) : null;
    const securityFlags =
      req.query.securityFlags !== undefined ? parseCommaList(req.query.securityFlags, 20) : null;

    // --- Sort ---
    const sortRaw = req.query.sort || 'last_seen';
    const orderRaw = req.query.order || 'DESC';
    console.log('[SORT DEBUG] Received sort params:', { sortRaw, orderRaw });

    const { sortEntries, ignoredSorts, sortClauses, expensiveSort } = parseSortParams(
      sortRaw,
      orderRaw,
      sortColumnMap,
      indexedSorts
    );

    if (expensiveSort && limit > 2000) {
      return res.status(400).json({
        error:
          'Query plan check would be too expensive. Please reduce limit to <= 2000 for expensive sorts, or use an indexed sort column.',
      });
    }

    // --- Home location ---
    let homeLocation: { lat: number; lon: number } | null = null;
    try {
      const homeResult = await query(
        'SELECT lat, lon FROM user_home_locations WHERE user_id = CURRENT_USER_ID() LIMIT 1'
      );
      if (homeResult.rows.length > 0) {
        const { lat, lon } = homeResult.rows[0];
        if (lat !== null && lon !== null)
          homeLocation = { lat: parseFloat(lat), lon: parseFloat(lon) };
      }
    } catch (err) {
      console.log('[WARN] Could not fetch home location:', err.message);
    }

    const distanceExpr =
      homeLocation !== null
        ? `CASE WHEN ne.lat IS NOT NULL AND ne.lon IS NOT NULL THEN 6371 * ACOS(COS(RADIANS(${homeLocation.lat})) * COS(RADIANS(ne.lat)) * COS(RADIANS(ne.lon) - RADIANS(${homeLocation.lon})) + SIN(RADIANS(${homeLocation.lat})) * SIN(RADIANS(ne.lat))) ELSE NULL END`
        : 'NULL';

    const columnsWithDistance =
      homeLocation !== null
        ? [...selectColumns, `(${distanceExpr})::numeric(10,4) AS distance_from_home_km`]
        : selectColumns;

    // --- Build conditions ---
    const { conditions, params, paramIndex, extraJoins } = buildNetworkListConditions(
      {
        ssidPattern,
        bssidList,
        threatLevel,
        threatCategories,
        threatScoreMin,
        threatScoreMax,
        lastSeen,
        distanceFromHomeKm: distanceResult.value,
        distanceFromHomeMinKm: distanceMinResult.value,
        distanceFromHomeMaxKm: distanceMaxResult.value,
        minSignal: minSignalResult.value,
        maxSignal: maxSignalResult.value,
        minObsCount: minObsResult.value !== null ? minObsResult.value : 1,
        maxObsCount: maxObsResult.value,
        radioTypes: radioTypes && radioTypes.length > 0 ? radioTypes : null,
        encryptionTypes: encryptionTypes && encryptionTypes.length > 0 ? encryptionTypes : null,
        authMethods: authMethods && authMethods.length > 0 ? authMethods : null,
        insecureFlags: insecureFlags && insecureFlags.length > 0 ? insecureFlags : null,
        securityFlags: securityFlags && securityFlags.length > 0 ? securityFlags : null,
        quickSearchPattern,
        bboxMinLat: bboxResult.value?.minLat ?? null,
        bboxMaxLat: bboxResult.value?.maxLat ?? null,
        bboxMinLng: bboxResult.value?.minLng ?? null,
        bboxMaxLng: bboxResult.value?.maxLng ?? null,
        radiusCenterLat: radiusResult.value?.centerLat ?? null,
        radiusCenterLng: radiusResult.value?.centerLng ?? null,
        radiusMeters: radiusResult.value?.radius ?? null,
        locationMode,
      },
      { typeExpr, threatScoreExpr, threatLevelExpr, distanceExpr }
    );

    // --- Execute queries ---
    const joins = [
      `LEFT JOIN radio_manufacturers rm ON ne.oui = rm.oui`,
      `LEFT JOIN network_tags nt ON ne.bssid = nt.bssid`,
      `LEFT JOIN network_threat_scores nts ON ne.bssid = nts.bssid`,
      ...extraJoins,
    ];

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join('\nAND ')}` : '';

    const totalCountQuery = `SELECT COUNT(DISTINCT ne.bssid) AS total FROM network_entries ne ${joins.join('\n')} ${whereClause}`;
    const totalResult = await query(totalCountQuery, params);
    const total = parseInt(totalResult.rows[0]?.total || '0', 10);

    const dataQuery = `
      SELECT ${columnsWithDistance.join(',\n')}
      FROM network_entries ne
      ${joins.join('\n')}
      ${whereClause}
      ORDER BY ${sortClauses}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataParams = [...params, limit, offset];
    const dataResult = await query(dataQuery, dataParams);
    const rows = dataResult.rows.map((row) => {
      const typedRow = { ...row };
      if (row.type === '?') typedRow.type = null;
      return typedRow;
    });

    if (planCheck) {
      const explained = await query(`EXPLAIN (FORMAT JSON) ${dataQuery}`, dataParams);
      return res.json({
        query: dataQuery,
        params: dataParams,
        plan: explained.rows,
        total,
        count: rows.length,
        applied_filters: sortEntries,
        ignoredSorts,
      });
    }

    res.json({
      data: rows,
      total,
      count: rows.length,
      limit,
      offset,
      appliedFilters: sortEntries,
      ignoredSorts,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
