export {};

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

const MED_CONF_OUIS = [
  'F4:6A:DD',
  'F8:A2:D6',
  'E0:0A:F6',
  '00:F4:8D',
  'D0:39:57',
  'E8:D0:FC',
  'E0:4F:43',
];

const SHOTSPOTTER_OUIS = ['00:1A:2B'];

function sqlArray(arr: string[]): string {
  return arr.map((o) => `'${o}'`).join(',');
}

export interface CandidateRow {
  bssid: string;
  ssid: string | null;
  type: string;
  bestlevel: number | null;
  service: string | null;
  mfgrid: number | null;
  device_type: string;
  base_likelihood: number;
  match_quality: string;
  detection_method: string;
  matched_signals: Record<string, any>;
  priority: number;
  tier_hit_count: number;
  obs_count: number;
  unique_days: number;
  min_rssi: number | null;
  max_rssi: number | null;
  avg_rssi: number | null;
  first_seen: string | null;
  last_seen: string | null;
  duration_seconds: number;
  unique_positions: number;
}

export interface ScoredDetection {
  bssid: string;
  device_type: string;
  confidence: number;
  threat_score: number;
  detection_method: string;
  matched_signals: Record<string, any>;
  false_positive: boolean;
  fp_reason: string | null;
}

/**
 * Fetches enriched surveillance candidates with observation stats.
 * Returns ALL tier hits per bssid (not deduplicated) so the scoring
 * engine can evaluate multi-surface corroboration.
 */
async function getEnrichedCandidates(
  adminQuery: (sql: string, params?: any[]) => Promise<any>
): Promise<CandidateRow[]> {
  const highOui = sqlArray(HIGH_CONF_OUIS);
  const extBattOui = sqlArray(FS_EXT_BATTERY_OUIS);
  const medOui = sqlArray(MED_CONF_OUIS);
  const shotspotterOui = sqlArray(SHOTSPOTTER_OUIS);

  const result = await adminQuery(`
    WITH candidates AS (

      -- 1. High-confidence WiFi OUI
      SELECT n.bssid, n.ssid, n.type, n.bestlevel, n.service, n.mfgrid,
        CASE WHEN LEFT(n.bssid, 8) = ANY(ARRAY[${extBattOui}]) THEN 'FS_EXT_BATTERY'
             ELSE 'FLOCK_SAFETY_CAMERA'
        END AS device_type,
        CASE WHEN n.ssid ~ '^Flock-[0-9A-Fa-f]{6}$' THEN 90
             WHEN LEFT(n.bssid, 8) = 'B4:1E:52' THEN 85
             ELSE 80
        END AS base_likelihood,
        CASE WHEN n.ssid ~ '^Flock-[0-9A-Fa-f]{6}$' THEN 'EXACT'
             ELSE 'PARTIAL'
        END AS match_quality,
        CASE WHEN n.ssid ~ '^Flock-[0-9A-Fa-f]{6}$' THEN 'multi_signal'
             ELSE 'oui_match'
        END AS detection_method,
        jsonb_build_object('oui', LEFT(n.bssid, 8), 'ssid', n.ssid, 'tier', 'HIGH') AS matched_signals,
        1 AS priority
      FROM app.networks n
      WHERE n.type = 'W'
        AND LEFT(n.bssid, 8) = ANY(ARRAY[${highOui}])

      UNION ALL

      -- 2. SSID exact: test_flck dev SSID
      SELECT n.bssid, n.ssid, n.type, n.bestlevel, n.service, n.mfgrid,
        'FLOCK_SAFETY_CAMERA', 90, 'EXACT', 'ssid_exact',
        jsonb_build_object('ssid', n.ssid, 'cve', 'CVE-2025-59409'), 2
      FROM app.networks n
      WHERE n.type = 'W' AND n.ssid = 'test_flck'
        AND LEFT(n.bssid, 8) != ALL(ARRAY[${highOui}])

      UNION ALL

      -- 3. SSID pattern: canonical Flock-[hex6]
      SELECT n.bssid, n.ssid, n.type, n.bestlevel, n.service, n.mfgrid,
        'FLOCK_SAFETY_CAMERA', 85, 'STRONG', 'ssid_pattern',
        jsonb_build_object('ssid', n.ssid, 'pattern', 'Flock-[0-9A-Fa-f]{6}'), 3
      FROM app.networks n
      WHERE n.type = 'W' AND n.ssid ~ '^Flock-[0-9A-Fa-f]{6}$'
        AND LEFT(n.bssid, 8) != ALL(ARRAY[${highOui}])

      UNION ALL

      -- 4. Medium-confidence OUI (Liteon/USI contract manufacturers)
      SELECT n.bssid, n.ssid, n.type, n.bestlevel, n.service, n.mfgrid,
        'FLOCK_SAFETY_CAMERA', 50, 'WEAK', 'oui_match',
        jsonb_build_object('oui', LEFT(n.bssid, 8), 'tier', 'MEDIUM', 'vendor', 'contract_mfr'), 4
      FROM app.networks n
      WHERE n.type = 'W'
        AND LEFT(n.bssid, 8) = ANY(ARRAY[${medOui}])
        AND LEFT(n.bssid, 8) != ALL(ARRAY[${highOui}])

      UNION ALL

      -- 5. BLE manufacturer ID 0x09C8 (XUNTONG — Flock/Raven)
      SELECT n.bssid, n.ssid, n.type, n.bestlevel, n.service, n.mfgrid,
        CASE WHEN n.ssid ~* '^raven' THEN 'RAVEN_GUNSHOT_DETECTOR'
             WHEN n.ssid ~* '^fs ext battery' THEN 'FS_EXT_BATTERY'
             ELSE 'FLOCK_SAFETY_CAMERA'
        END,
        80, 'STRONG', 'mfgrid_match',
        jsonb_build_object('mfgrid', n.mfgrid, 'mfgrid_hex', '0x09C8', 'ssid', n.ssid), 5
      FROM app.networks n
      WHERE n.type IN ('E', 'B') AND n.mfgrid = 2504

      UNION ALL

      -- 6. BLE device name patterns (no mfgrid hit)
      SELECT n.bssid, n.ssid, n.type, n.bestlevel, n.service, n.mfgrid,
        CASE WHEN n.ssid ~* '^raven' THEN 'RAVEN_GUNSHOT_DETECTOR'
             WHEN n.ssid ~* '^fs ext battery' THEN 'FS_EXT_BATTERY'
             ELSE 'FLOCK_SAFETY_CAMERA'
        END,
        70, 'PARTIAL', 'ble_name_pattern',
        jsonb_build_object('ssid', n.ssid, 'type', n.type), 6
      FROM app.networks n
      WHERE n.type IN ('E', 'B')
        AND n.ssid ~* '^(fs ext battery|flock|falcon|raven|sparrow|condor|penguin)'
        AND (n.mfgrid IS NULL OR n.mfgrid != 2504)

      UNION ALL

      -- 7. ShotSpotter OUI match
      SELECT n.bssid, n.ssid, n.type, n.bestlevel, n.service, n.mfgrid,
        'SHOTSPOTTER_SENSOR', 85, 'STRONG', 'oui_match',
        jsonb_build_object('oui', LEFT(n.bssid, 8), 'vendor', 'Sensys Networks / SoundThinking'), 7
      FROM app.networks n
      WHERE n.type = 'W' AND LEFT(n.bssid, 8) = ANY(ARRAY[${shotspotterOui}])

      UNION ALL

      -- 8. ShotSpotter SSID pattern
      SELECT n.bssid, n.ssid, n.type, n.bestlevel, n.service, n.mfgrid,
        'SHOTSPOTTER_SENSOR', 80, 'PARTIAL', 'ssid_pattern',
        jsonb_build_object('ssid', n.ssid, 'pattern', 'SoundThinking|ShotSpotter|SST-|SENSOR-|SNS-|acoustic'), 8
      FROM app.networks n
      WHERE n.type = 'W'
        AND (n.ssid ~* '^(SoundThinking|ShotSpotter|SST-|SENSOR-|SNS-|acoustic)'
             OR n.ssid ~ '^[A-Z]{2,4}-\\d{4,6}$')
        AND LEFT(n.bssid, 8) != ALL(ARRAY[${shotspotterOui}])

    ),
    obs_stats AS (
      SELECT
        o.bssid,
        COUNT(*)::int                                      AS obs_count,
        COUNT(DISTINCT DATE(o.time))::int                  AS unique_days,
        MIN(o.level)::int                                  AS min_rssi,
        MAX(o.level)::int                                  AS max_rssi,
        ROUND(AVG(o.level)::numeric, 1)                    AS avg_rssi,
        MIN(o.time)                                        AS first_seen,
        MAX(o.time)                                        AS last_seen,
        EXTRACT(EPOCH FROM MAX(o.time) - MIN(o.time))::int AS duration_seconds,
        COUNT(DISTINCT (ROUND(o.lat::numeric,3) || ',' || ROUND(o.lon::numeric,3)))::int AS unique_positions
      FROM app.observations o
      WHERE o.bssid IN (SELECT DISTINCT bssid FROM candidates)
        AND (o.is_quality_filtered = false OR o.is_quality_filtered IS NULL)
      GROUP BY o.bssid
    )
    SELECT
      c.bssid, c.ssid, c.type, c.bestlevel, c.service, c.mfgrid,
      c.device_type, c.base_likelihood, c.match_quality,
      c.detection_method, c.matched_signals, c.priority,
      COUNT(*) OVER (PARTITION BY c.bssid)::int AS tier_hit_count,
      COALESCE(os.obs_count, 0)          AS obs_count,
      COALESCE(os.unique_days, 0)        AS unique_days,
      os.min_rssi,
      os.max_rssi,
      os.avg_rssi,
      os.first_seen,
      os.last_seen,
      COALESCE(os.duration_seconds, 0)   AS duration_seconds,
      COALESCE(os.unique_positions, 0)   AS unique_positions
    FROM candidates c
    LEFT JOIN obs_stats os ON os.bssid = c.bssid
    ORDER BY c.bssid, c.priority ASC, c.base_likelihood DESC
  `);

  return result.rows as CandidateRow[];
}

/**
 * Bulk upserts scored surveillance detections.
 * Returns the number of rows upserted.
 */
async function bulkUpsertDetections(
  adminQuery: (sql: string, params?: any[]) => Promise<any>,
  detections: ScoredDetection[]
): Promise<number> {
  if (detections.length === 0) return 0;

  const bssids = detections.map((d) => d.bssid);
  const deviceTypes = detections.map((d) => d.device_type);
  const confidences = detections.map((d) => d.confidence);
  const threatScores = detections.map((d) => d.threat_score);
  const methods = detections.map((d) => d.detection_method);
  const signals = detections.map((d) => JSON.stringify(d.matched_signals));
  const fps = detections.map((d) => d.false_positive);
  const fpReasons = detections.map((d) => d.fp_reason);

  const result = await adminQuery(
    `
    INSERT INTO app.surveillance_detections
      (bssid, device_type, confidence, threat_score, detection_method,
       matched_signals, false_positive, fp_reason, created_by)
    SELECT b, dt, c, ts, dm, ms::jsonb, fp, fpr, 'surveillance_scan_job'
    FROM unnest(
      $1::text[], $2::text[], $3::numeric[], $4::numeric[],
      $5::text[], $6::jsonb[], $7::boolean[], $8::text[]
    ) AS t(b, dt, c, ts, dm, ms, fp, fpr)
    ON CONFLICT (bssid) DO UPDATE SET
      device_type      = EXCLUDED.device_type,
      confidence       = EXCLUDED.confidence,
      threat_score     = EXCLUDED.threat_score,
      detection_method = EXCLUDED.detection_method,
      matched_signals  = EXCLUDED.matched_signals,
      false_positive   = EXCLUDED.false_positive,
      fp_reason        = EXCLUDED.fp_reason,
      detected_at      = NOW()
    WHERE app.surveillance_detections.false_positive = FALSE
       OR EXCLUDED.false_positive = TRUE
    RETURNING bssid
    `,
    [bssids, deviceTypes, confidences, threatScores, methods, signals, fps, fpReasons]
  );

  return result.rowCount ?? 0;
}

module.exports = { getEnrichedCandidates, bulkUpsertDetections };
export { getEnrichedCandidates, bulkUpsertDetections };
export type { CandidateRow as CandidateRowType, ScoredDetection as ScoredDetectionType };
