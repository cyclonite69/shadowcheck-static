/**
 * Sibling Detection Service — mac_increment and band_pair modalities.
 *
 * These are additive detection pipelines that write new rows alongside
 * existing pairs in app.network_sibling_pairs. They do NOT modify or
 * delete existing rows. ON CONFLICT only upgrades confidence, never downgrades.
 *
 * Validated in harness run_1778152993 (mac_increment) and run_1778153011
 * (band_pair). See docs/adr/ADR-SIBLING-DETECTION-V2.md for full rationale.
 */

export {};

const { adminQuery } = require('./adminDbService');

export interface SiblingPair {
  bssid1: string;
  bssid2: string;
  rule: string;
  confidence: number;
  d_last_octet: number | null;
  ssid1: string | null;
  ssid2: string | null;
  frequency1: number | null;
  frequency2: number | null;
  distance_m: number | null;
}

export interface DetectionSummary {
  detected: number;
  inserted: number;
  updated: number;
}

/**
 * Detect sibling pairs via MAC address last-octet increment.
 *
 * Algorithm:
 *   - Source: app.observations filtered to WiFi (radio_frequency 2412–5825 MHz)
 *   - Match: same OUI (first 3 octets) + last-octet delta ≤ 4
 *   - Confidence: 0.85 for delta ≤ 2; 0.70 for delta 3–4
 *   - Rule name: 'mac_increment_v1'
 *
 * The WiFi frequency filter is mandatory — app.observations contains BLE
 * (radio_frequency=7936) and cellular (EARFCN values) rows that make up ~44%
 * of the table and produce garbage MAC pairs without this gate.
 *
 * @param limit - Max seed BSSIDs to scan (default 5000; use lower values for testing)
 * @returns Array of candidate SiblingPair objects (not yet persisted)
 */
async function detectMacIncrement(limit = 5000): Promise<SiblingPair[]> {
  const sql = `
    WITH wifi_obs AS (
      SELECT DISTINCT bssid, ssid, radio_frequency AS frequency
      FROM app.observations
      WHERE radio_frequency BETWEEN 2412 AND 5825
        AND bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      LIMIT $1
    ),
    pairs AS (
      SELECT
        LEAST(a.bssid, b.bssid)                                    AS bssid1,
        GREATEST(a.bssid, b.bssid)                                 AS bssid2,
        'mac_increment_v1'                                         AS rule,
        ABS(
          ('x' || REPLACE(SPLIT_PART(b.bssid, ':', 6), ':', ''))::bit(8)::int -
          ('x' || REPLACE(SPLIT_PART(a.bssid, ':', 6), ':', ''))::bit(8)::int
        )                                                          AS delta,
        a.ssid                                                     AS ssid1,
        b.ssid                                                     AS ssid2,
        a.frequency                                                AS frequency1,
        b.frequency                                                AS frequency2
      FROM wifi_obs a
      JOIN wifi_obs b
        -- Same OUI (first 3 octets = first 8 chars "XX:XX:XX")
        ON SUBSTRING(a.bssid, 1, 8) = SUBSTRING(b.bssid, 1, 8)
       AND a.bssid < b.bssid
      WHERE ABS(
          ('x' || REPLACE(SPLIT_PART(b.bssid, ':', 6), ':', ''))::bit(8)::int -
          ('x' || REPLACE(SPLIT_PART(a.bssid, ':', 6), ':', ''))::bit(8)::int
        ) BETWEEN 1 AND 4
    )
    SELECT
      bssid1,
      bssid2,
      rule,
      CASE WHEN delta <= 2 THEN 0.85 ELSE 0.70 END AS confidence,
      delta                                          AS d_last_octet,
      ssid1,
      ssid2,
      frequency1,
      frequency2,
      NULL::double precision                         AS distance_m
    FROM pairs
  `;

  const result = await adminQuery(sql, [limit]);
  return result.rows as SiblingPair[];
}

/**
 * Detect sibling pairs via dual-band co-location.
 *
 * Algorithm:
 *   - Sources: app.observations (radio_frequency 2412–5825) UNION
 *              app.wigle_v3_observations (frequency column, not channel — channel is ~0% populated)
 *   - Match: same SSID + different band (2.4 GHz vs 5 GHz) + haversine ≤ 20m + mac_dist ≤ 2
 *   - Confidence: 0.95 fixed
 *   - Rule name: 'band_pair_v1'
 *
 * Band classification: 2412–2484 MHz = 2.4 GHz; 5170–5825 MHz = 5 GHz.
 * mac_dist is the absolute difference of the last-octet hex values.
 *
 * @param limit - Max seed observations per source table (default 5000)
 * @returns Array of candidate SiblingPair objects (not yet persisted)
 */
async function detectBandPair(limit = 5000): Promise<SiblingPair[]> {
  const sql = `
    WITH combined AS (
      SELECT DISTINCT
        bssid,
        ssid,
        radio_frequency                                            AS frequency,
        lat,
        lon
      FROM app.observations
      WHERE radio_frequency BETWEEN 2412 AND 5825
        AND bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
        AND lat IS NOT NULL AND lon IS NOT NULL
      LIMIT $1

      UNION ALL

      SELECT DISTINCT
        netid                                                      AS bssid,
        ssid,
        frequency,
        latitude                                                   AS lat,
        longitude                                                  AS lon
      FROM app.wigle_v3_observations
      WHERE frequency BETWEEN 2412 AND 5825
        AND netid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
        AND latitude IS NOT NULL AND longitude IS NOT NULL
      LIMIT $1
    ),
    pairs AS (
      SELECT
        LEAST(a.bssid, b.bssid)                                    AS bssid1,
        GREATEST(a.bssid, b.bssid)                                 AS bssid2,
        a.ssid                                                     AS ssid1,
        b.ssid                                                     AS ssid2,
        a.frequency                                                AS frequency1,
        b.frequency                                                AS frequency2,
        ABS(
          ('x' || REPLACE(SPLIT_PART(b.bssid, ':', 6), ':', ''))::bit(8)::int -
          ('x' || REPLACE(SPLIT_PART(a.bssid, ':', 6), ':', ''))::bit(8)::int
        )                                                          AS mac_dist,
        -- Haversine approximation in metres
        111320.0 * SQRT(
          POWER((b.lat - a.lat), 2) +
          POWER((b.lon - a.lon) * COS(RADIANS((a.lat + b.lat) / 2.0)), 2)
        )                                                          AS dist_m
      FROM combined a
      JOIN combined b
        ON a.ssid = b.ssid
       AND a.ssid IS NOT NULL AND a.ssid <> ''
       AND a.bssid < b.bssid
       -- Different bands: one 2.4 GHz, one 5 GHz
       AND (
         (a.frequency BETWEEN 2412 AND 2484 AND b.frequency BETWEEN 5170 AND 5825)
         OR
         (a.frequency BETWEEN 5170 AND 5825 AND b.frequency BETWEEN 2412 AND 2484)
       )
    )
    SELECT DISTINCT ON (bssid1, bssid2)
      bssid1,
      bssid2,
      'band_pair_v1'                                               AS rule,
      0.95                                                         AS confidence,
      NULL::int                                                    AS d_last_octet,
      ssid1,
      ssid2,
      frequency1,
      frequency2,
      dist_m                                                       AS distance_m
    FROM pairs
    WHERE mac_dist <= 2
      AND dist_m <= 20.0
    ORDER BY bssid1, bssid2, dist_m ASC
  `;

  const result = await adminQuery(sql, [limit]);
  return result.rows as SiblingPair[];
}

/**
 * Persist detected sibling pairs to app.network_sibling_pairs.
 *
 * Uses ON CONFLICT (bssid1, bssid2) DO UPDATE only when the incoming
 * confidence is strictly higher than the stored value — never downgrades.
 * All new pairs are written with pair_strength='candidate' and
 * source='detection_pipeline_v2'.
 *
 * Enforces bssid1 < bssid2 ordering before insert (required by table CHECK constraint).
 *
 * @param pairs - Array of SiblingPair objects from detectMacIncrement or detectBandPair
 * @returns Summary of rows inserted and updated
 */
async function persistSiblingPairs(pairs: SiblingPair[]): Promise<DetectionSummary> {
  if (pairs.length === 0) return { detected: 0, inserted: 0, updated: 0 };

  // Build VALUES list — enforce bssid1 < bssid2 ordering
  const values: unknown[] = [];
  const placeholders: string[] = [];
  let idx = 1;

  for (const p of pairs) {
    const b1 = p.bssid1 < p.bssid2 ? p.bssid1 : p.bssid2;
    const b2 = p.bssid1 < p.bssid2 ? p.bssid2 : p.bssid1;
    placeholders.push(
      `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`
    );
    values.push(
      b1,
      b2,
      p.rule,
      p.confidence,
      p.d_last_octet ?? null,
      p.ssid1 ?? null,
      p.ssid2 ?? null,
      p.frequency1 ?? null,
      p.frequency2 ?? null,
      p.distance_m ?? null
    );
  }

  const sql = `
    WITH input(bssid1, bssid2, rule, confidence, d_last_octet,
               ssid1, ssid2, frequency1, frequency2, distance_m) AS (
      VALUES ${placeholders.join(', ')}
    ),
    upserted AS (
      INSERT INTO app.network_sibling_pairs
        (bssid1, bssid2, rule, confidence, d_last_octet,
         ssid1, ssid2, frequency1, frequency2, distance_m,
         pair_strength, source)
      SELECT
        i.bssid1::text, i.bssid2::text, i.rule::text,
        i.confidence::double precision,
        i.d_last_octet::int,
        i.ssid1::text, i.ssid2::text,
        i.frequency1::int, i.frequency2::int,
        i.distance_m::double precision,
        'candidate', 'detection_pipeline_v2'
      FROM input i
      ON CONFLICT (bssid1, bssid2) DO UPDATE
        SET rule        = EXCLUDED.rule,
            confidence  = EXCLUDED.confidence,
            d_last_octet = EXCLUDED.d_last_octet,
            ssid1       = EXCLUDED.ssid1,
            ssid2       = EXCLUDED.ssid2,
            frequency1  = EXCLUDED.frequency1,
            frequency2  = EXCLUDED.frequency2,
            distance_m  = EXCLUDED.distance_m,
            source      = EXCLUDED.source
        WHERE EXCLUDED.confidence > network_sibling_pairs.confidence
      RETURNING xmax
    )
    SELECT
      COUNT(*)::int                                    AS total,
      COUNT(*) FILTER (WHERE xmax = 0)::int           AS inserted,
      COUNT(*) FILTER (WHERE xmax <> 0)::int          AS updated
    FROM upserted
  `;

  const result = await adminQuery(sql, values);
  const row = result.rows[0] || { total: 0, inserted: 0, updated: 0 };
  return {
    detected: pairs.length,
    inserted: Number(row.inserted),
    updated: Number(row.updated),
  };
}

/**
 * Detect Xfinity/Comcast AP siblings via hardware middle-octet signature.
 *
 * Algorithm:
 *   - Sources: app.observations (WiFi-filtered) UNION app.wigle_v3_observations
 *   - Match: octets 2–5 identical (SUBSTRING(bssid, 4, 11) = ':XX:XX:XX:XX')
 *     while octet 1 and/or octet 6 differ. Xfinity/Commscope/Arris hardware
 *     assigns the same middle 4 octets to all radios on a gateway; the first
 *     octet varies for LA-bit virtual interfaces and the last octet increments
 *     per radio/SSID.
 *   - Confidence: 1.0 fixed (hardware signature match is deterministic)
 *   - Rule name: 'xfinity_sig_v1'
 *
 * Validated in harness run_1778155295 (xfinity_sig, limit=2000, source=both):
 *   971 detections, avg_conf=1.000, 25 matched existing, 47 new, max 10 per seed.
 *   Example: A4:01:DE:7C:D2:CA ↔ 16:01:DE:7C:D2:CB (middle=01:DE:7C:D2,
 *   first octet LA-bit variant, last octet delta 1).
 *
 * @param limit - Max seed BSSIDs per source table (default 5000)
 * @returns Array of candidate SiblingPair objects (not yet persisted)
 */
async function detectXfinitySignature(limit = 5000): Promise<SiblingPair[]> {
  const sql = `
    WITH combined AS (
      SELECT DISTINCT bssid, ssid, radio_frequency AS frequency
      FROM app.observations
      WHERE radio_frequency BETWEEN 2412 AND 5825
        AND bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      LIMIT $1

      UNION ALL

      SELECT DISTINCT netid AS bssid, ssid, frequency
      FROM app.wigle_v3_observations
      WHERE frequency BETWEEN 2412 AND 5825
        AND netid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      LIMIT $1
    ),
    pairs AS (
      SELECT
        LEAST(a.bssid, b.bssid)    AS bssid1,
        GREATEST(a.bssid, b.bssid) AS bssid2,
        a.ssid                     AS ssid1,
        b.ssid                     AS ssid2,
        a.frequency                AS frequency1,
        b.frequency                AS frequency2
      FROM combined a
      JOIN combined b
        -- Middle 4 octets identical: chars 4–14 of 'XX:XX:XX:XX:XX:XX'
        ON SUBSTRING(a.bssid, 4, 11) = SUBSTRING(b.bssid, 4, 11)
       AND a.bssid < b.bssid
        -- At least one of first or last octet must differ
       AND (
         SPLIT_PART(a.bssid, ':', 1) <> SPLIT_PART(b.bssid, ':', 1)
         OR SPLIT_PART(a.bssid, ':', 6) <> SPLIT_PART(b.bssid, ':', 6)
       )
    )
    SELECT DISTINCT ON (bssid1, bssid2)
      bssid1,
      bssid2,
      'xfinity_sig_v1'             AS rule,
      1.0                          AS confidence,
      NULL::int                    AS d_last_octet,
      ssid1,
      ssid2,
      frequency1,
      frequency2,
      NULL::double precision       AS distance_m
    FROM pairs
    ORDER BY bssid1, bssid2
  `;

  const result = await adminQuery(sql, [limit]);
  return result.rows as SiblingPair[];
}

module.exports = {
  detectMacIncrement,
  detectBandPair,
  detectXfinitySignature,
  persistSiblingPairs,
};
