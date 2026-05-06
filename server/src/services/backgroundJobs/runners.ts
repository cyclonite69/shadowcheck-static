export {};

const logger = require('../../logging/logger');
const { runPostgresBackup } = require('../backupService');
const mlScoringRepository = require('../ml/repository');
const networkTagService = require('../networkTagService');
const OUIGroupingService = require('../ouiGroupingService');

import { scoreBehavioralThreats } from './mlBehavioralScoring';
import { scoreSurveillanceCandidates } from './surveillanceScoring';

const survRepo = require('../../repositories/surveillanceDetectionRepository');

const ML_SCORING_LIMIT = 10000;
const ML_RECOMPUTE_LIMIT = 200000;
const MAX_BSSID_LENGTH = 17;
const MIN_OBSERVATIONS = 2;

const runBackupJob = async () => {
  logger.info('[Backup Job] Starting scheduled backup...');
  const result = await runPostgresBackup({ uploadToS3: true });
  const primaryFile = Array.isArray(result.files)
    ? result.files.find((file: any) => file.type === 'database') || result.files[0]
    : null;
  const uploadedDatabase = Array.isArray(result.s3)
    ? result.s3.find((file: any) => file.type === 'database') || result.s3[0]
    : null;
  const fileName = result.fileName || primaryFile?.name || null;
  const bytes = result.bytes || primaryFile?.bytes || null;

  if (uploadedDatabase) {
    logger.info(
      `[Backup Job] Complete: ${fileName} (${bytes} bytes) uploaded to ${uploadedDatabase.url}`
    );
  } else if (result.s3Error) {
    logger.warn(
      `[Backup Job] Backup created locally (${fileName}) but S3 upload failed: ${result.s3Error}`
    );
  }

  return {
    fileName,
    bytes,
    s3Url: uploadedDatabase?.url || null,
    s3Error: result.s3Error || null,
  };
};

const runBehavioralMlScoringJob = async () => {
  logger.info('[ML Scoring Job] Starting behavioral threat scoring v2.0 (simple)...');

  const pendingRecompute =
    await mlScoringRepository.getNetworksNeedingRecompute(ML_RECOMPUTE_LIMIT);
  const hasPending = pendingRecompute.length > 0;

  const networks = hasPending
    ? pendingRecompute
    : await mlScoringRepository.getNetworksForBehavioralScoring(
        ML_SCORING_LIMIT,
        MIN_OBSERVATIONS,
        MAX_BSSID_LENGTH
      );

  logger.info(
    `[ML Scoring Job] Analyzing ${networks.length} networks with feedback-aware behavioral model`,
    { recomputeMode: hasPending }
  );

  const tagRows = await networkTagService.getManualThreatTags();
  const { scores, tagMap } = scoreBehavioralThreats(networks, tagRows);

  logger.info(`[ML Scoring Job] Found ${tagMap.size} manual tags for feedback adjustment`);

  const inserted = await mlScoringRepository.bulkUpsertThreatScores(scores);
  logger.info(`[ML Scoring Job] Complete: ${inserted} networks scored with behavioral model v2.0`);

  if (hasPending && scores.length > 0) {
    const bssids = scores.map((s: { bssid: string }) => s.bssid);
    await mlScoringRepository.resetNeedsRecompute(bssids);
    logger.info(`[ML Scoring Job] Reset needs_recompute for ${bssids.length} networks`);
  }

  logger.info('[ML Scoring Job] Running OUI grouping analysis...');
  await OUIGroupingService.generateOUIGroups();
  await OUIGroupingService.detectMACRandomization();
  logger.info('[ML Scoring Job] OUI grouping complete');

  return {
    analyzedNetworks: networks.length,
    insertedScores: inserted,
    feedbackTaggedNetworks: tagMap.size,
  };
};

const runSiblingDetectionJob = async (options: any = {}) => {
  const { adminQuery } = require('../adminDbService');
  logger.info('[Sibling Detection Job] Starting sibling radio discovery...');

  const maxOctetDelta = options.max_octet_delta || 6;
  const maxDistanceM = options.max_distance_m || 5000;
  const minCandidateConf = options.min_candidate_conf || 0.7;
  // Cap scheduled runs at 2000 seeds to prevent timeout; manual runs can override
  const seedLimit = options.seed_limit !== undefined ? options.seed_limit : 2000;
  const incremental = options.incremental !== undefined ? options.incremental : true;

  // Set 10-minute timeout for this specific job (overrides pool's 5-minute default)
  await adminQuery("SET LOCAL statement_timeout = '10min'");

  const result = await adminQuery(
    'SELECT app.refresh_network_sibling_pairs($1, $2, $3, 0.92, $4, $5) as count',
    [maxOctetDelta, maxDistanceM, minCandidateConf, seedLimit, incremental]
  );

  const count = parseInt(result.rows[0]?.count || '0');
  logger.info(`[Sibling Detection Job] Complete: Identified/updated ${count} sibling pairs`);

  return {
    pairsProcessed: count,
    parameters: { maxOctetDelta, maxDistanceM, minCandidateConf, seedLimit, incremental },
  };
};

const runSurveillanceScanJob = async () => {
  const { adminQuery } = require('../adminDbService');
  logger.info('[Surveillance Scan] Starting multi-factor surveillance detection scan (v2.0)...');

  // Phase 1: SQL — get enriched candidates with observation stats (all tier hits per bssid)
  let candidates;
  try {
    candidates = await survRepo.getEnrichedCandidates(adminQuery);
  } catch (err: any) {
    logger.error('[Surveillance Scan] SQL error fetching candidates', {
      message: err?.message,
      detail: err?.detail,
      code: err?.code,
    });
    throw err;
  }

  const uniqueBssids = new Set(candidates.map((c: any) => c.bssid));
  logger.info(
    `[Surveillance Scan] Found ${candidates.length} raw candidate signals across ${uniqueBssids.size} unique devices`
  );

  // Phase 2: TypeScript — apply multi-factor scoring per SURVEILLANCE_DEVICE_SIGNATURES.md §5
  const scored = scoreSurveillanceCandidates(candidates);
  const fpCount = scored.filter((s) => s.false_positive).length;
  logger.info(
    `[Surveillance Scan] Scored ${scored.length} devices (${fpCount} auto-flagged false positive)`
  );

  // Phase 3: SQL — bulk upsert scored detections
  let upsertedCount: number;
  try {
    upsertedCount = await survRepo.bulkUpsertDetections(adminQuery, scored);
  } catch (err: any) {
    logger.error('[Surveillance Scan] SQL error upserting detections', {
      message: err?.message,
      detail: err?.detail,
      code: err?.code,
    });
    throw err;
  }

  logger.info(`[Surveillance Scan] Upserted ${upsertedCount} surveillance detections`);

  // Phase 4: Tag networks in network_tags (non-FP detections only)
  const nonFpDetections = scored.filter((s) => !s.false_positive);
  let taggedCount = 0;

  if (nonFpDetections.length > 0) {
    const bssids = nonFpDetections.map((r) => r.bssid);
    const confidences = nonFpDetections.map((r) => r.confidence);
    const deviceTypes = nonFpDetections.map((r) => r.device_type);
    const methods = nonFpDetections.map((r) => r.detection_method);

    const tagResult = await adminQuery(
      `
      INSERT INTO app.network_tags (bssid, threat_tag, threat_confidence, notes, tags, created_by)
      SELECT b, 'THREAT', c, 'Surveillance: ' || d || ' (' || m || ')',
        CASE
          WHEN dt = 'SHOTSPOTTER_SENSOR' THEN '["surveillance","shotspotter"]'::jsonb
          ELSE '["surveillance"]'::jsonb
        END,
        'surveillance_scan_job'
      FROM unnest($1::text[], $2::numeric[], $3::text[], $4::text[], $5::text[]) AS t(b, c, d, m, dt)
      ON CONFLICT (bssid) DO UPDATE SET
        threat_tag        = CASE WHEN app.network_tags.threat_tag = 'FALSE_POSITIVE'
                              THEN app.network_tags.threat_tag ELSE 'THREAT' END,
        threat_confidence = EXCLUDED.threat_confidence,
        notes             = EXCLUDED.notes,
        tags              = CASE
                              WHEN COALESCE(app.network_tags.tags, '[]'::jsonb) @> '["surveillance"]'::jsonb
                                THEN app.network_tags.tags
                              ELSE COALESCE(app.network_tags.tags, '[]'::jsonb) || EXCLUDED.tags
                            END,
        updated_at        = NOW()
      WHERE NOT COALESCE(app.network_tags.is_ignored, false)
      `,
      [bssids, confidences, deviceTypes, methods, deviceTypes]
    );

    taggedCount = tagResult.rowCount ?? 0;
    logger.info(`[Surveillance Scan] Tagged ${taggedCount} networks in network_tags`);
  }

  // Phase 5: Refresh materialized view
  try {
    await adminQuery('REFRESH MATERIALIZED VIEW CONCURRENTLY app.surveillance_density_zones');
    logger.info('[Surveillance Scan] Refreshed surveillance_density_zones MV');
  } catch (err: any) {
    logger.warn('[Surveillance Scan] Could not refresh surveillance_density_zones MV', {
      message: err?.message,
    });
  }

  return { detectionCount: upsertedCount, taggedCount, falsePositiveCount: fpCount };
};

export { runBackupJob, runBehavioralMlScoringJob, runSiblingDetectionJob, runSurveillanceScanJob };
