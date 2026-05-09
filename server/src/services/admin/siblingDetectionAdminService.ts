const logger = require('../../logging/logger');
import {
  REFRESH_CHUNK_SQL,
  SIBLING_STATS_SQL,
  SIBLING_STATS_BY_RULE_SQL,
} from './siblingDetectionQueries';

// Four additional rule classes derived from manual ground truth analysis.
// Run once per refresh after the chunked REFRESH_CHUNK_SQL loop, as a single
// full-table pass. ON CONFLICT only upgrades confidence, never downgrades.
const EXTRA_RULES_SQL = `
  WITH upper_rotation AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, distance_m, matched_octets, pair_strength, quality_scope, computed_at,
      run_id
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'upper_octet_rotation',
      LEAST(1.000, 0.95),
      CASE
        WHEN COALESCE(a.bestlat, a.lastlat) IS NOT NULL
          AND COALESCE(a.bestlon, a.lastlon) IS NOT NULL
          AND COALESCE(b.bestlat, b.lastlat) IS NOT NULL
          AND COALESCE(b.bestlon, b.bestlon) IS NOT NULL
        THEN ST_Distance(
          ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
          ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
        )
        ELSE NULL
      END,
      'o2-o5',
      'candidate',
      'default',
      now(),
      $1::integer
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
      -- Require both networks to have location data and be within 200m to
      -- prevent false positives from coincidentally matching middle octets
      -- across unrelated devices (e.g. Azure Wave / GreatLakesMobile).
      AND COALESCE(a.bestlat, a.lastlat) IS NOT NULL
      AND COALESCE(a.bestlon, a.lastlon) IS NOT NULL
      AND COALESCE(b.bestlat, b.lastlat) IS NOT NULL
      AND COALESCE(b.bestlon, b.bestlon) IS NOT NULL
      AND ST_Distance(
        ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.bestlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
      ) < 200
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = EXCLUDED.rule,
          confidence  = EXCLUDED.confidence,
          distance_m  = EXCLUDED.distance_m,
          matched_octets = EXCLUDED.matched_octets,
          pair_strength = EXCLUDED.pair_strength,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at,
          run_id = EXCLUDED.run_id
      WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
    RETURNING 1
  ),
  ssid_anchor AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, ssid1, ssid2, matched_octets, pair_strength, quality_scope, computed_at,
      run_id
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'ssid_anchor',
      LEAST(1.000, 0.97),
      a.ssid,
      b.ssid,
      'o1-o4+ssid',
      'candidate',
      'default',
      now(),
      $1::integer
    FROM app.networks a
    JOIN app.networks b
      ON b.ssid = a.ssid
     AND SUBSTRING(b.bssid, 1, 11) = SUBSTRING(a.bssid, 1, 11)
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
        'mtasmartbus','kajeetsmartbus','somguest','somiot',
        'eduroam','attwifi','googlesb','_google',
        'boingohotspot','boingowireless','optimumwifi','cablewifi',
        'spectrumwifi','twcwifi','masimo'
      )
      AND lower(regexp_replace(a.ssid, '[^a-z0-9]+', '', 'g')) NOT LIKE 'hmc%'
    ON CONFLICT (bssid1, bssid2) DO UPDATE
      SET rule        = EXCLUDED.rule,
          confidence  = EXCLUDED.confidence,
          ssid1       = EXCLUDED.ssid1,
          ssid2       = EXCLUDED.ssid2,
          matched_octets = EXCLUDED.matched_octets,
          pair_strength = EXCLUDED.pair_strength,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at,
          run_id = EXCLUDED.run_id
      WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
    RETURNING 1
  ),
  cross_oui_ssid AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, ssid1, ssid2, distance_m, matched_octets, pair_strength, quality_scope, computed_at,
      run_id
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'cross_oui_ssid_exact',
      LEAST(1.000, 0.88),
      a.ssid,
      b.ssid,
      ST_Distance(
        ST_SetSRID(ST_MakePoint(COALESCE(a.bestlon, a.lastlon), COALESCE(a.bestlat, a.lastlat)), 4326)::geography,
        ST_SetSRID(ST_MakePoint(COALESCE(b.bestlon, b.lastlon), COALESCE(b.bestlat, b.lastlat)), 4326)::geography
      ),
      'ssid+proximity',
      'candidate',
      'default',
      now(),
      $1::integer
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
        'mtasmartbus','kajeetsmartbus','somguest','somiot',
        'eduroam','attwifi','googlesb','_google',
        'boingohotspot','boingowireless','optimumwifi','cablewifi',
        'spectrumwifi','twcwifi','masimo'
      )
      AND lower(regexp_replace(a.ssid, '[^a-z0-9]+', '', 'g')) NOT LIKE 'hmc%'
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
          matched_octets = EXCLUDED.matched_octets,
          pair_strength = EXCLUDED.pair_strength,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at,
          run_id = EXCLUDED.run_id
      WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
    RETURNING 1
  ),
  same_oui_proximity AS (
    -- OUI+1 match: same first 4 octets, last octet delta 1–6.
    -- Requires 4 octets (not just OUI) to avoid chaining unrelated devices
    -- from high-volume manufacturers (e.g. TP-Link) that happen to share an OUI.
    -- Distance is stored as metadata but NOT used as a gate.
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence, distance_m, matched_octets, pair_strength, quality_scope, computed_at,
      run_id
    )
    SELECT
      LEAST(a.bssid, b.bssid),
      GREATEST(a.bssid, b.bssid),
      'same_oui_proximity',
      LEAST(1.000, 0.93),
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
      'o1-o4',
      'candidate',
      'default',
      now(),
      $1::integer
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
          matched_octets = EXCLUDED.matched_octets,
          pair_strength = EXCLUDED.pair_strength,
          quality_scope = EXCLUDED.quality_scope,
          computed_at = EXCLUDED.computed_at,
          run_id = EXCLUDED.run_id
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
        pair_strength = 'verified',
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

const longRunningAdminQuery = (text: string, params: any[] = []) =>
  require('../../config/container').adminDbService.longRunningAdminQuery(text, params);

async function runSiblingRefreshJob(
  options: SiblingRefreshOptions = {}
): Promise<SiblingRefreshResult> {
  const normalized = normalizeOptions(options);
  const started = Date.now();

  // Determine run_mode from options
  const runMode =
    normalized.maxBatches !== null ? 'test' : normalized.incremental ? 'incremental' : 'full';

  // Create a sibling_runs row to track this refresh
  const runInsert = await adminQuery(
    `INSERT INTO app.sibling_runs
       (run_mode, max_octet_delta, min_confidence, batch_size, max_batches)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      runMode,
      normalized.maxOctetDelta,
      normalized.minCandidateConf,
      normalized.batchSize,
      normalized.maxBatches,
    ]
  );
  const runId: number = runInsert.rows[0].id;

  // Snapshot MAX(computed_at) BEFORE the loop so incremental mode uses a
  // stable cutoff. Without this, batch 2+ would see pairs inserted by batch 1
  // and filter out all remaining seeds, stopping after one batch.
  const cutoffResult = await adminQuery(
    `SELECT MAX(computed_at) AS cutoff FROM app.network_sibling_pairs`
  );
  const incrementalCutoff: string | null = cutoffResult.rows[0]?.cutoff ?? null;

  let cursor: string | null = null;
  let batchesRun = 0;
  let seedsProcessed = 0;
  let rowsUpserted = 0;
  let completed = true;

  while (true) {
    if (state.cancelRequested) {
      completed = false;
      logger.info('[Siblings] Cancel requested — stopping batch loop');
      break;
    }
    if (normalized.maxBatches !== null && batchesRun >= normalized.maxBatches) {
      completed = false;
      break;
    }
    const result: any = await longRunningAdminQuery(REFRESH_CHUNK_SQL, [
      normalized.batchSize,
      cursor,
      normalized.maxOctetDelta,
      normalized.maxDistanceM,
      normalized.minCandidateConf,
      normalized.incremental,
      incrementalCutoff,
      runId,
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

  const extraResult: any = await longRunningAdminQuery(EXTRA_RULES_SQL, [
    runId,
    normalized.minCandidateConf,
  ]);
  const extraRow = extraResult.rows[0] || {};
  logger.info('[Siblings] Extra rules complete', {
    upper_rotation: extraRow.upper_rotation_count,
    ssid_anchor: extraRow.ssid_anchor_count,
    cross_oui: extraRow.cross_oui_count,
    same_oui_proximity: extraRow.same_oui_proximity_count,
    manual_boost: extraRow.manual_boost_count,
    manual_insert: extraRow.manual_insert_count,
  });

  const finalStatus = completed ? 'completed' : 'truncated';
  await adminQuery(
    `UPDATE app.sibling_runs
     SET completed_at = now(), status = $1, networks_scanned = $2, pairs_inserted = $3, pairs_updated = $5
     WHERE id = $4`,
    [finalStatus, seedsProcessed, rowsUpserted, runId, rowsUpserted]
  );

  await longRunningAdminQuery('SELECT app.refresh_oui_sibling_profiles()');
  logger.info('[Siblings] OUI sibling profiles refreshed');

  return {
    success: true,
    batchesRun,
    seedsProcessed,
    rowsUpserted,
    lastCursor: cursor,
    executionTimeMs: Date.now() - started,
    completed,
    sibling_run_id: runId,
  };
}

async function startSiblingRefresh(
  options: SiblingRefreshOptions = {}
): Promise<{ accepted: boolean; status: SiblingRefreshStatus }> {
  if (state.running) {
    return { accepted: false, status: getSiblingRefreshStatus() };
  }

  state.running = true;
  state.cancelRequested = false;
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

  // Capture runMode for use in .then()/.catch() blocks
  const capturedRunMode =
    state.options.maxBatches !== null ? 'test' : state.options.incremental ? 'incremental' : 'full';

  // Write to background_job_runs BEFORE async job starts
  try {
    await adminQuery(
      `INSERT INTO app.background_job_runs (job_name, status, cron, started_at, details)
       VALUES ($1, $2, $3, now(), $4)`,
      ['siblingDetection', 'running', null, JSON.stringify(state.options)]
    );
    logger.info('[Siblings] Background job run record created');
  } catch (err: any) {
    logger.error('[Siblings] Failed to create background job run record', { error: err?.message });
  }

  runSiblingRefreshJob(state.options)
    .then((result) => {
      state.lastResult = result;
      logger.info('[Siblings] Sibling refresh job completed', result);
      // Mark background_job_runs as completed
      adminQuery(
        `UPDATE app.background_job_runs 
         SET status = $1, finished_at = now(), 
             details = jsonb_build_object(
               'pairs_inserted', $5,
               'networks_scanned', $6,
               'run_mode', $7,
               'sibling_run_id', $8
             )
         WHERE job_name = $2 AND status = $3 ORDER BY id DESC LIMIT 1`,
        [
          'completed',
          'siblingDetection',
          'running',
          null, // unused param placeholder
          result.rowsUpserted,
          result.seedsProcessed,
          capturedRunMode,
          result.sibling_run_id,
        ]
      ).catch((err: any) => {
        logger.error('[Siblings] Failed to update background job run to completed', {
          error: err?.message,
        });
      });
    })
    .catch((err: any) => {
      state.lastError = err?.message || 'Unknown error';
      logger.error('[Siblings] Sibling refresh job failed', { error: err?.message });
      // Mark background_job_runs as failed
      // Query for the most recent sibling_runs id that was running
      adminQuery(
        `SELECT id FROM app.sibling_runs 
         WHERE status = 'running' 
         ORDER BY id DESC LIMIT 1`
      )
        .then((runResult: any) => {
          const siblingRunId = runResult.rows[0]?.id || null;
          adminQuery(
            `UPDATE app.background_job_runs 
           SET status = $1, finished_at = now(), error = $2,
               details = jsonb_build_object(
                 'run_mode', $5,
                 'sibling_run_id', $6
               )
           WHERE job_name = $3 AND status = $4 ORDER BY id DESC LIMIT 1`,
            [
              'failed',
              err?.message || 'Unknown error',
              'siblingDetection',
              'running',
              capturedRunMode,
              siblingRunId,
            ]
          ).catch((err: any) => {
            logger.error('[Siblings] Failed to update background job run to failed', {
              error: err?.message,
            });
          });
        })
        .catch((err: any) => {
          logger.error('[Siblings] Failed to query sibling_runs for failed job', {
            error: err?.message,
          });
        });
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

async function getSiblingStatsByRule(): Promise<any[]> {
  const { rows } = await adminQuery(SIBLING_STATS_BY_RULE_SQL);
  return rows;
}

/**
 * Reconcile in-memory sibling job state with the database.
 * If in-memory says NOT running but DB has a stale 'running' row,
 * mark it failed with reason 'Interrupted by container restart'.
 */
async function reconcileSiblingState(): Promise<void> {
  if (!state.running) {
    // Check if there's a stale 'running' row in background_job_runs
    const bgResult = await adminQuery(
      `SELECT id FROM app.background_job_runs WHERE job_name = $1 AND status = $2 ORDER BY id DESC LIMIT 1`,
      ['siblingDetection', 'running']
    );
    if (bgResult.rows.length > 0) {
      logger.warn('[Siblings] Found stale running row in background_job_runs; marking failed', {
        id: bgResult.rows[0].id,
      });
      await adminQuery(
        `UPDATE app.background_job_runs SET status = $1, finished_at = now(), error = $2 WHERE job_name = $3 AND status = $4`,
        ['failed', 'Interrupted by container restart', 'siblingDetection', 'running']
      );
    }

    // Also check sibling_runs
    const siblingResult = await adminQuery(
      `SELECT id FROM app.sibling_runs WHERE status = $1 ORDER BY id DESC LIMIT 1`,
      ['running']
    );
    if (siblingResult.rows.length > 0) {
      logger.warn('[Siblings] Found stale running row in sibling_runs; marking failed', {
        id: siblingResult.rows[0].id,
      });
      await adminQuery(
        `UPDATE app.sibling_runs SET status = $1, completed_at = now() WHERE status = $2`,
        ['failed', 'running']
      );
    }
  }
}

async function cancelSiblingRefresh(): Promise<{ accepted: boolean; message: string }> {
  // First reconcile DB state
  await reconcileSiblingState();

  const dbUpdates: string[] = [];

  if (state.running) {
    // In-memory job is running — set cancel flag and update both tables
    state.cancelRequested = true;
    dbUpdates.push('in-memory job cancelled');
  }

  // ALWAYS check and update background_job_runs
  const bgJobResult = await adminQuery(
    `UPDATE app.background_job_runs SET status = $1, finished_at = now(), error = $2
     WHERE job_name = $3 AND status = $4 RETURNING id`,
    ['failed', 'Cancelled by operator', 'siblingDetection', 'running']
  );
  if (bgJobResult.rowCount && bgJobResult.rowCount > 0) {
    dbUpdates.push(`background_job_runs updated (${bgJobResult.rowCount} row)`);
  }

  // ALWAYS check and update sibling_runs
  const siblingResult = await adminQuery(
    `UPDATE app.sibling_runs SET status = $1, completed_at = now()
     WHERE status = $2 RETURNING id`,
    ['failed', 'running']
  );
  if (siblingResult.rowCount && siblingResult.rowCount > 0) {
    dbUpdates.push(`sibling_runs updated (${siblingResult.rowCount} row)`);
  }

  // Return success if anything changed (in-memory flag or DB rows)
  if (state.running || dbUpdates.length > 1) {
    return {
      accepted: true,
      message: `Job cancelled. Updates: ${dbUpdates.join(', ')}`,
    };
  }

  return { accepted: false, message: 'No job is currently running' };
}

async function purgeSiblingPairs(): Promise<{ deleted: number }> {
  const result = await adminQuery('TRUNCATE app.network_sibling_pairs');
  logger.info('[Siblings] Purged all sibling pairs');
  return { deleted: result.rowCount ?? 0 };
}

/**
 * Get reconciled sibling refresh status — checks both in-memory state and DB.
 * Auto-fixes stale DB rows if in-memory says NOT running.
 * Never returns 'running' unless in-memory state confirms it.
 */
async function getSiblingRefreshStatusReconciled(): Promise<SiblingRefreshStatus> {
  // First reconcile DB state with in-memory
  await reconcileSiblingState();

  // If in-memory says running, trust it
  if (state.running) {
    return getSiblingRefreshStatus();
  }

  // In-memory is NOT running — verify DB doesn't have stale running rows
  const bgRunning = await adminQuery(
    `SELECT id FROM app.background_job_runs WHERE job_name = $1 AND status = $2 LIMIT 1`,
    ['siblingDetection', 'running']
  );

  const siblingRunning = await adminQuery(
    `SELECT id FROM app.sibling_runs WHERE status = $1 LIMIT 1`,
    ['running']
  );

  // If we find any stale running rows, they were auto-fixed by reconcileSiblingState above
  if (bgRunning.rows.length > 0 || siblingRunning.rows.length > 0) {
    logger.info('[Siblings] Stale running rows were auto-fixed during reconciliation');
  }

  return getSiblingRefreshStatus();
}

module.exports = {
  startSiblingRefresh,
  cancelSiblingRefresh,
  getSiblingRefreshStatus,
  getSiblingRefreshStatusReconciled,
  getSiblingStats,
  getSiblingStatsByRule,
  runSiblingRefreshJob,
  purgeSiblingPairs,
  reconcileSiblingState,
};

export {};
