export {};

const logger = require('../../logging/logger');
const { runPostgresBackup } = require('../backupService');
const mlScoringRepository = require('../ml/repository');
const networkTagService = require('../networkTagService');
const OUIGroupingService = require('../ouiGroupingService');

import { scoreBehavioralThreats } from './mlBehavioralScoring';

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

const HIGH_CONF_OUIS = [
  '70:C9:4E',
  '3C:91:80',
  'D8:F3:BC',
  '80:30:49',
  'B8:35:32',
  '14:5A:FC',
  '74:4C:A1',
  '08:3A:88',
  '9C:2F:9D',
  'C0:35:32',
  '94:08:53',
  'E4:AA:EA',
  '24:B2:B9',
  'B8:1E:A4',
  '70:08:94',
  '58:8E:81',
  'EC:1B:BD',
  '3C:71:BF',
  '58:00:E3',
  '90:35:EA',
  '5C:93:A2',
  '64:6E:69',
  '48:27:EA',
  'A4:CF:12',
  '82:6B:F2',
  'CC:CC:CC',
  '04:0D:84',
  'F0:82:C0',
  '1C:34:F1',
  '38:5B:44',
  '94:34:69',
  'B4:E3:F9',
  'B4:1E:52',
];

// FS Ext Battery OUIs are a subset of HIGH_CONF_OUIS
const FS_EXT_BATTERY_OUIS = [
  '58:8E:81',
  'EC:1B:BD',
  '90:35:EA',
  'CC:CC:CC',
  '04:0D:84',
  'F0:82:C0',
  '1C:34:F1',
  '38:5B:44',
  '94:34:69',
  'B4:E3:F9',
];

// Liteon/USI contract manufacturers — also make non-Flock devices
const MED_CONF_OUIS = [
  'F4:6A:DD',
  'F8:A2:D6',
  'E0:0A:F6',
  '00:F4:8D',
  'D0:39:57',
  'E8:D0:FC',
  'E0:4F:43',
];

// ShotSpotter/SoundThinking acoustic sensor OUIs
// 00:1A:2B — Sensys Networks (known acoustic sensor vendor, acquired by SoundThinking)
// Digi International OUIs (supply embedded radios for SoundThinking infrastructure)
const SHOTSPOTTER_OUIS = ['00:1A:2B'];

// ShotSpotter/SoundThinking SSID patterns (case-insensitive)
// Includes: SoundThinking, ShotSpotter, SST-*, SENSOR-*, SNS-*
// Pole-mounted infra naming: [A-Z]{2,4}-\d{4,6}
const SHOTSPOTTER_SSID_PATTERNS = [
  /^SoundThinking/i,
  /^ShotSpotter/i,
  /^SST-/i,
  /^SENSOR-/i,
  /^SNS-/i,
  /^acoustic/i,
  /^[A-Z]{2,4}-\d{4,6}$/, // pole-mounted naming convention
];

const runSurveillanceScanJob = async () => {
  const { adminQuery } = require('../adminDbService');
  logger.info('[Surveillance Scan] Starting surveillance device detection scan...');

  // Build SQL arrays inline — static signature catalog from SURVEILLANCE_DEVICE_SIGNATURES.md
  const highOuiLiteral = HIGH_CONF_OUIS.map((o) => `'${o}'`).join(',');
  const extBattOuiLiteral = FS_EXT_BATTERY_OUIS.map((o) => `'${o}'`).join(',');
  const medOuiLiteral = MED_CONF_OUIS.map((o) => `'${o}'`).join(',');
  const shotspotterOuiLiteral = SHOTSPOTTER_OUIS.map((o) => `'${o}'`).join(',');

  let result;
  try {
    result = await adminQuery(`
    WITH candidates AS (

      -- 1. High-confidence WiFi OUI (addr2/transmitter match)
      SELECT
        n.bssid,
        CASE WHEN LEFT(n.bssid, 8) = ANY(ARRAY[${extBattOuiLiteral}]) THEN 'FS_EXT_BATTERY'
             ELSE 'FLOCK_SAFETY_CAMERA'
        END AS device_type,
        CASE WHEN n.ssid ~ '^Flock-[0-9A-Fa-f]{6}$' THEN 0.95
             WHEN LEFT(n.bssid, 8) = 'B4:1E:52' THEN 0.90
             ELSE 0.80
        END AS confidence,
        CASE WHEN n.ssid ~ '^Flock-[0-9A-Fa-f]{6}$' THEN 'multi_signal'
             ELSE 'oui_match'
        END AS detection_method,
        jsonb_build_object('oui', LEFT(n.bssid, 8), 'ssid', n.ssid, 'tier', 'HIGH') AS matched_signals,
        1 AS priority
      FROM app.networks n
      WHERE n.type = 'W'
        AND LEFT(n.bssid, 8) = ANY(ARRAY[${highOuiLiteral}])

      UNION ALL

      -- 2. SSID exact: test_flck dev SSID (CVE-2025-59409)
      SELECT n.bssid, 'FLOCK_SAFETY_CAMERA', 0.95::numeric, 'ssid_exact',
        jsonb_build_object('ssid', n.ssid, 'cve', 'CVE-2025-59409'), 2
      FROM app.networks n
      WHERE n.type = 'W' AND n.ssid = 'test_flck'
        AND LEFT(n.bssid, 8) != ALL(ARRAY[${highOuiLiteral}])

      UNION ALL

      -- 3. SSID pattern: canonical Flock-[hex6]
      SELECT n.bssid, 'FLOCK_SAFETY_CAMERA', 0.85::numeric, 'ssid_pattern',
        jsonb_build_object('ssid', n.ssid, 'pattern', 'Flock-[0-9A-Fa-f]{6}'), 3
      FROM app.networks n
      WHERE n.type = 'W' AND n.ssid ~ '^Flock-[0-9A-Fa-f]{6}$'
        AND LEFT(n.bssid, 8) != ALL(ARRAY[${highOuiLiteral}])

      UNION ALL

      -- 4. Medium-confidence OUI (Liteon/USI contract manufacturers)
      SELECT n.bssid, 'FLOCK_SAFETY_CAMERA', 0.55::numeric, 'oui_match',
        jsonb_build_object('oui', LEFT(n.bssid, 8), 'tier', 'MEDIUM', 'vendor', 'contract_mfr'), 4
      FROM app.networks n
      WHERE n.type = 'W'
        AND LEFT(n.bssid, 8) = ANY(ARRAY[${medOuiLiteral}])
        AND LEFT(n.bssid, 8) != ALL(ARRAY[${highOuiLiteral}])

      UNION ALL

      -- 5. BLE manufacturer ID 0x09C8 (XUNTONG — Flock/Raven)
      SELECT n.bssid,
        CASE WHEN n.ssid ~* '^raven' THEN 'RAVEN_GUNSHOT_DETECTOR'
             WHEN n.ssid ~* '^fs ext battery' THEN 'FS_EXT_BATTERY'
             ELSE 'FLOCK_SAFETY_CAMERA'
        END,
        0.80::numeric, 'mfgrid_match',
        jsonb_build_object('mfgrid', n.mfgrid, 'mfgrid_hex', '0x09C8', 'ssid', n.ssid), 5
      FROM app.networks n
      WHERE n.type = 'E' AND n.mfgrid = 2504

      UNION ALL

      -- 6. BLE device name patterns (no mfgrid hit)
      SELECT n.bssid,
        CASE WHEN n.ssid ~* '^raven' THEN 'RAVEN_GUNSHOT_DETECTOR'
             WHEN n.ssid ~* '^fs ext battery' THEN 'FS_EXT_BATTERY'
             ELSE 'FLOCK_SAFETY_CAMERA'
        END,
        0.75::numeric, 'ble_name_pattern',
        jsonb_build_object('ssid', n.ssid, 'type', n.type), 6
      FROM app.networks n
      WHERE n.type IN ('E', 'B')
        AND n.ssid ~* '^(fs ext battery|flock|falcon|raven|sparrow|condor|penguin)'
        AND (n.mfgrid IS NULL OR n.mfgrid != 2504)

      UNION ALL

      -- 7. ShotSpotter OUI match: Sensys Networks / SoundThinking vendor
      SELECT n.bssid, 'SHOTSPOTTER_SENSOR', 0.90::numeric, 'oui_match',
        jsonb_build_object('oui', LEFT(n.bssid, 8), 'vendor', 'Sensys Networks / SoundThinking'), 7
      FROM app.networks n
      WHERE n.type = 'W' AND LEFT(n.bssid, 8) = ANY(ARRAY[${shotspotterOuiLiteral}])

      UNION ALL

      -- 8. ShotSpotter SSID exact: SoundThinking, ShotSpotter, SST-, SENSOR-, SNS-, acoustic prefixes
      SELECT n.bssid, 'SHOTSPOTTER_SENSOR', 0.85::numeric, 'ssid_pattern',
        jsonb_build_object('ssid', n.ssid, 'pattern', 'SoundThinking|ShotSpotter|SST-|SENSOR-|SNS-|acoustic'), 8
      FROM app.networks n
      WHERE n.type = 'W'
        AND (n.ssid ~* '^(SoundThinking|ShotSpotter|SST-|SENSOR-|SNS-|acoustic)'
             OR n.ssid ~ '^[A-Z]{2,4}-\d{4,6}$')
        AND LEFT(n.bssid, 8) != ALL(ARRAY[${shotspotterOuiLiteral}])

    ),
    ranked AS (
      SELECT DISTINCT ON (bssid)
        bssid, device_type, confidence, detection_method, matched_signals,
        LEAST(
          ROUND((
            CASE device_type
              WHEN 'RAVEN_GUNSHOT_DETECTOR' THEN 85.0
              WHEN 'FS_EXT_BATTERY' THEN 75.0
              ELSE 80.0
            END * 1.2 * confidence
          )::numeric, 1),
          100.0
        ) AS threat_score
      FROM candidates
      ORDER BY bssid, priority ASC, confidence DESC
    )
    INSERT INTO app.surveillance_detections
      (bssid, device_type, confidence, threat_score, detection_method, matched_signals, created_by)
    SELECT bssid, device_type, confidence, threat_score, detection_method, matched_signals,
      'surveillance_scan_job'
    FROM ranked
    ON CONFLICT (bssid) DO UPDATE SET
      device_type      = EXCLUDED.device_type,
      confidence       = EXCLUDED.confidence,
      threat_score     = EXCLUDED.threat_score,
      detection_method = EXCLUDED.detection_method,
      matched_signals  = EXCLUDED.matched_signals,
      detected_at      = NOW()
    WHERE app.surveillance_detections.false_positive = FALSE
    RETURNING bssid, device_type, confidence, detection_method
  `);
  } catch (err: any) {
    logger.error('[Surveillance Scan] SQL error during scan', {
      message: err?.message,
      detail: err?.detail,
      code: err?.code,
    });
    throw err;
  }

  const rowCount = result.rowCount ?? 0;
  logger.info(`[Surveillance Scan] Complete: upserted ${rowCount} surveillance detections`);

  const detectedRows: Array<{
    bssid: string;
    device_type: string;
    confidence: string;
    detection_method: string;
  }> = result.rows || [];
  let taggedCount = 0;

  if (detectedRows.length > 0) {
    const bssids = detectedRows.map((r) => r.bssid);
    const confidences = detectedRows.map((r) => Number(r.confidence));
    const deviceTypes = detectedRows.map((r) => r.device_type);
    const methods = detectedRows.map((r) => r.detection_method);

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

  try {
    await adminQuery('REFRESH MATERIALIZED VIEW CONCURRENTLY app.surveillance_density_zones');
    logger.info('[Surveillance Scan] Refreshed surveillance_density_zones MV');
  } catch (err: any) {
    logger.warn('[Surveillance Scan] Could not refresh surveillance_density_zones MV', {
      message: err?.message,
    });
  }

  return { detectionCount: rowCount, taggedCount };
};

export { runBackupJob, runBehavioralMlScoringJob, runSiblingDetectionJob, runSurveillanceScanJob };
