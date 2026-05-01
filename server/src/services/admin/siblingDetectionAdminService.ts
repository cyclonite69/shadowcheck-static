const logger = require('../../logging/logger');
import { REFRESH_CHUNK_SQL, SIBLING_STATS_SQL } from './siblingDetectionQueries';

// Four additional rule classes derived from manual ground truth analysis.
// Run once per refresh after the chunked REFRESH_CHUNK_SQL loop, as a single
// full-table pass. ON CONFLICT only upgrades confidence, never downgrades.
const EXTRA_RULES_SQL = `
  WITH upper_rotation AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, distance_m, quality_scope, computed_at
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'upper_octet_rotation',
      0.95,
      CASE
        WHEN COALESCE(a.bestlat, a.lastlat) IS NOT NULL
          AND COALESCE(a.bestlon, a.lastlon) IS NOT NULL
          AND COALESCE(b.bestlat, b.lastlat) IS NOT NULL
          AND COALESCE(b.bestlon, b.lastlon) IS NOT NULL
        THEN ST_Distance(
          ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
          ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
        )
        ELSE NULL
      END,
      'default',
      now()
    FROM app.networks a
    JOIN app.networks b
      ON SUBSTRING(b.bssid, 7) = SUBSTRING(a.bssid, 7)
     AND SUBSTRING(b.bssid, 1, 5) <> SUBSTRING(a.bssid, 1, 5)
     AND b.bssid > a.bssid
     AND b.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
    -- Skip pairs blocked by manual not_sibling overrides
    LEFT JOIN app.network_sibling_overrides nso
      ON nso.bssid1 = LEAST(a.bssid, b.bssid)
     AND nso.bssid2 = GREATEST(a.bssid, b.bssid)
     AND nso.relation = 'not_sibling'
     AND nso.is_active = true
    WHERE a.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      AND nso.bssid1 IS NULL
      -- upper_octet_rotation is a pure MAC-based rule — SSID is irrelevant.
      -- Do NOT exclude fleet SSIDs here: a multi-BSSID AP (e.g. Xfinity) may
      -- broadcast xfinitywifi on one BSSID and a different SSID on another,
      -- with the same last 4 octets and a different first octet. The MAC
      -- pattern is the evidence; the SSID is incidental.
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = EXCLUDED.rule,
          confidence  = EXCLUDED.confidence,
          distance_m  = EXCLUDED.distance_m,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at
      WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
    RETURNING 1
  ),
  ssid_anchor AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, ssid1, ssid2, quality_scope, computed_at
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'ssid_anchor',
      0.97,
      a.ssid,
      b.ssid,
      'default',
      now()
    FROM app.networks a
    JOIN app.networks b
      ON b.ssid = a.ssid
     AND SUBSTRING(b.bssid, 1, 8) = SUBSTRING(a.bssid, 1, 8)
     AND b.bssid > a.bssid
     AND b.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
    LEFT JOIN app.network_sibling_overrides nso
      ON nso.bssid1 = LEAST(a.bssid, b.bssid)
     AND nso.bssid2 = GREATEST(a.bssid, b.bssid)
     AND nso.relation = 'not_sibling'
     AND nso.is_active = true
    WHERE a.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      AND nso.bssid1 IS NULL
      AND a.ssid IS NOT NULL AND a.ssid <> ''
      -- Fleet SSIDs are not valid evidence for ssid_anchor — SSID alone is meaningless
      -- for high-cardinality shared SSIDs. Deterministic MAC rules handle these.
      AND lower(regexp_replace(a.ssid, '[^a-z0-9]+', '', 'g')) NOT IN (
        'greatlakesmobile','mdt','xfinitywifi','xfinitymobile',
        'mtasmartbus','kajeetsmartbus','somguest','somiot'
      )
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = EXCLUDED.rule,
          confidence  = EXCLUDED.confidence,
          ssid1       = EXCLUDED.ssid1,
          ssid2       = EXCLUDED.ssid2,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at
      WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
    RETURNING 1
  ),
  cross_oui_ssid AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, ssid1, ssid2, distance_m, quality_scope, computed_at
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'cross_oui_ssid_exact',
      0.88,
      a.ssid,
      b.ssid,
      ST_Distance(
        ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
      ),
      'default',
      now()
    FROM app.networks a
    JOIN app.networks b
      ON b.ssid = a.ssid
     AND SUBSTRING(b.bssid, 1, 8) <> SUBSTRING(a.bssid, 1, 8)
     AND b.bssid > a.bssid
     AND b.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
    LEFT JOIN app.network_sibling_overrides nso
      ON nso.bssid1 = LEAST(a.bssid, b.bssid)
     AND nso.bssid2 = GREATEST(a.bssid, b.bssid)
     AND nso.relation = 'not_sibling'
     AND nso.is_active = true
    WHERE a.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      AND nso.bssid1 IS NULL
      AND a.ssid IS NOT NULL AND a.ssid <> ''
      -- Fleet SSIDs are not valid evidence for cross_oui_ssid_exact.
      AND lower(regexp_replace(a.ssid, '[^a-z0-9]+', '', 'g')) NOT IN (
        'greatlakesmobile','mdt','xfinitywifi','xfinitymobile',
        'mtasmartbus','kajeetsmartbus','somguest','somiot'
      )
      AND COALESCE(a.bestlat, a.lastlat) IS NOT NULL
      AND COALESCE(a.bestlon, a.lastlon) IS NOT NULL
      AND COALESCE(b.bestlat, b.lastlat) IS NOT NULL
      AND COALESCE(b.bestlon, b.lastlon) IS NOT NULL
      AND ST_Distance(
        ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
      ) < 200
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = EXCLUDED.rule,
          confidence  = EXCLUDED.confidence,
          ssid1       = EXCLUDED.ssid1,
          ssid2       = EXCLUDED.ssid2,
          distance_m  = EXCLUDED.distance_m,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at
      WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
    RETURNING 1
  ),
  same_oui_proximity AS (
    -- OUI+1 match: same first 4 octets, last octet delta 1–6.
    -- Requires 4 octets (not just OUI) to avoid chaining unrelated devices
    -- from high-volume manufacturers (e.g. TP-Link) that happen to share an OUI.
    -- Distance is stored as metadata but NOT used as a gate.
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, distance_m, quality_scope, computed_at
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'same_oui_proximity',
      0.93,
      CASE
        WHEN COALESCE(a.bestlat, a.lastlat) IS NOT NULL
          AND COALESCE(a.bestlon, a.lastlon) IS NOT NULL
          AND COALESCE(b.bestlat, b.lastlat) IS NOT NULL
          AND COALESCE(b.bestlon, b.lastlon) IS NOT NULL
        THEN ST_Distance(
          ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
          ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
        )
        ELSE NULL
      END,
      'default',
      now()
    FROM app.networks a
    JOIN app.networks b
      -- First 4 octets identical (11 chars: "XX:XX:XX:XX")
      ON SUBSTRING(b.bssid, 1, 11) = SUBSTRING(a.bssid, 1, 11)
     AND ABS(
           ('x' || SUBSTRING(b.bssid, 16, 2))::bit(8)::int -
           ('x' || SUBSTRING(a.bssid, 16, 2))::bit(8)::int
         ) BETWEEN 1 AND 6
     AND b.bssid > a.bssid
     AND b.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
    LEFT JOIN app.network_sibling_overrides nso
      ON nso.bssid1 = LEAST(a.bssid, b.bssid)
     AND nso.bssid2 = GREATEST(a.bssid, b.bssid)
     AND nso.relation = 'not_sibling'
     AND nso.is_active = true
    WHERE a.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      AND nso.bssid1 IS NULL
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = EXCLUDED.rule,
          confidence  = EXCLUDED.confidence,
          distance_m  = EXCLUDED.distance_m,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at
      WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
    RETURNING 1
  ),
  -- Manual sibling overrides are the authoritative baseline.
  -- Any heuristic pair that the operator has confirmed as a sibling gets
  -- upgraded to confidence 1.0 and rule 'manual_confirmed'. This ensures
  -- manual selections survive future refresh runs at full confidence.
  manual_boost AS (
    UPDATE app.network_sibling_pairs p
    SET rule        = 'manual_confirmed',
        confidence  = 1.0,
        quality_scope = 'manual',
        computed_at = now()
    FROM app.network_sibling_overrides o
    WHERE o.bssid1 = p.bssid1
      AND o.bssid2 = p.bssid2
      AND o.relation = 'sibling'
      AND o.is_active = true
      AND p.confidence < 1.0
    RETURNING 1
  ),
  -- Also insert manual sibling pairs that no heuristic rule has created yet.
  -- This ensures the operator's confirmed pairs are always in network_sibling_pairs
  -- and not just in the effective view.
  manual_insert AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, quality_scope, computed_at
    )
    SELECT
      o.bssid1,
      o.bssid2,
      'manual_confirmed',
      1.0,
      'manual',
      now()
    FROM app.network_sibling_overrides o
    WHERE o.relation = 'sibling'
      AND o.is_active = true
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = 'manual_confirmed',
          confidence  = 1.0,
          quality_scope = 'manual',
          computed_at = now()
      WHERE network_sibling_pairs.confidence < 1.0
    RETURNING 1
  )
  SELECT
    (SELECT COUNT(*)::int FROM upper_rotation)     AS upper_rotation_count,
    (SELECT COUNT(*)::int FROM ssid_anchor)        AS ssid_anchor_count,
    (SELECT COUNT(*)::int FROM cross_oui_ssid)     AS cross_oui_count,
    (SELECT COUNT(*)::int FROM same_oui_proximity) AS same_oui_proximity_count,
    (SELECT COUNT(*)::int FROM manual_boost)       AS manual_boost_count,
    (SELECT COUNT(*)::int FROM manual_insert)      AS manual_insert_count
`;
import {
  getSiblingRefreshStatus,
  normalizeOptions,
  state,
  type SiblingRefreshOptions,
  type SiblingRefreshResult,
  type SiblingRefreshStatus,
} from './siblingDetectionState';

const adminQuery = (text: string, params: any[] = []) =>
  require('../../config/container').adminDbService.adminQuery(text, params);

async function runSiblingRefreshJob(
  options: SiblingRefreshOptions = {}
): Promise<SiblingRefreshResult> {
  const normalized = normalizeOptions(options);
  const started = Date.now();

  let cursor: string | null = null;
  let batchesRun = 0;
  let seedsProcessed = 0;
  let rowsUpserted = 0;
  let completed = true;

  while (true) {
    if (normalized.maxBatches !== null && batchesRun >= normalized.maxBatches) {
      completed = false;
      break;
    }
    const result: any = await adminQuery(REFRESH_CHUNK_SQL, [
      normalized.batchSize,
      cursor,
      normalized.maxOctetDelta,
      normalized.maxDistanceM,
      normalized.minCandidateConf,
    ]);

    const row = result.rows[0] || {};
    const seedCount = Number(row.seed_count || 0);
    const upsertedCount = Number(row.upserted_count || 0);
    const nextCursor = row.next_cursor || null;

    if (seedCount === 0) {
      break;
    }

    batchesRun += 1;
    seedsProcessed += seedCount;
    rowsUpserted += upsertedCount;
    cursor = nextCursor;

    state.progress = {
      batchesRun,
      seedsProcessed,
      rowsUpserted,
      lastCursor: cursor,
    };

    if (batchesRun % 10 === 0) {
      logger.info('[Siblings] Batch progress', {
        batchesRun,
        seedsProcessed,
        rowsUpserted,
        lastCursor: cursor,
      });
    }
  }

  const extraResult: any = await adminQuery(EXTRA_RULES_SQL, []);
  const extraRow = extraResult.rows[0] || {};
  logger.info('[Siblings] Extra rules complete', {
    upper_rotation: extraRow.upper_rotation_count,
    ssid_anchor: extraRow.ssid_anchor_count,
    cross_oui: extraRow.cross_oui_count,
    same_oui_proximity: extraRow.same_oui_proximity_count,
    manual_boost: extraRow.manual_boost_count,
    manual_insert: extraRow.manual_insert_count,
  });

  return {
    success: true,
    batchesRun,
    seedsProcessed,
    rowsUpserted,
    lastCursor: cursor,
    executionTimeMs: Date.now() - started,
    completed,
  };
}

async function startSiblingRefresh(
  options: SiblingRefreshOptions = {}
): Promise<{ accepted: boolean; status: SiblingRefreshStatus }> {
  if (state.running) {
    return { accepted: false, status: getSiblingRefreshStatus() };
  }

  state.running = true;
  state.startedAt = new Date().toISOString();
  state.finishedAt = null;
  state.lastError = null;
  state.lastResult = null;
  state.options = normalizeOptions(options);
  state.progress = {
    batchesRun: 0,
    seedsProcessed: 0,
    rowsUpserted: 0,
    lastCursor: null,
  };

  logger.info('[Siblings] Starting sibling refresh job', state.options);

  runSiblingRefreshJob(state.options)
    .then((result) => {
      state.lastResult = result;
      logger.info('[Siblings] Sibling refresh job completed', result);
    })
    .catch((err: any) => {
      state.lastError = err?.message || 'Unknown error';
      logger.error('[Siblings] Sibling refresh job failed', { error: err?.message });
    })
    .finally(() => {
      state.running = false;
      state.finishedAt = new Date().toISOString();
    });

  return { accepted: true, status: getSiblingRefreshStatus() };
}

async function getSiblingStats(): Promise<any> {
  const { rows } = await adminQuery(SIBLING_STATS_SQL);
  return rows[0] || {};
}

module.exports = {
  startSiblingRefresh,
  getSiblingRefreshStatus,
  getSiblingStats,
  runSiblingRefreshJob,
};

export {};
