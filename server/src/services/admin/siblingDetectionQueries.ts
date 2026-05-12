import { FLEET_SSID_SQL_LIST } from './siblingDetectionConstants';

const REFRESH_CHUNK_SQL = `
  WITH seeds AS (
    SELECT ne.bssid
    FROM app.api_network_explorer_mv ne
    WHERE ne.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      AND ($2::text IS NULL OR ne.bssid > $2)
      -- Incremental mode ($6=true): skip BSSIDs whose last_seen predates the
      -- cutoff timestamp captured BEFORE the run started ($7). Using a
      -- pre-run snapshot prevents batch 2+ from seeing pairs inserted by
      -- batch 1 and incorrectly filtering out all remaining seeds.
      AND (NOT $6::boolean OR ne.last_seen > COALESCE($7::timestamptz, '1970-01-01'::timestamptz))
    ORDER BY ne.bssid
    LIMIT $1
  ),
  hits AS (
    SELECT s.bssid AS seed_bssid, r.*
    FROM seeds s
    CROSS JOIN LATERAL app.find_sibling_radios(s.bssid, $3, $4) r
  ),
  dedup AS (
    SELECT
      LEAST(seed_bssid, sibling_bssid) AS bssid1,
      GREATEST(seed_bssid, sibling_bssid) AS bssid2,
      (array_agg(rule ORDER BY confidence DESC))[1] AS rule,
      MAX(confidence) AS confidence,
      (array_agg(d_last_octet ORDER BY confidence DESC))[1] AS d_last_octet,
      (array_agg(d_third_octet ORDER BY confidence DESC))[1] AS d_third_octet,
      (array_agg(target_ssid ORDER BY confidence DESC))[1] AS ssid1,
      (array_agg(sibling_ssid ORDER BY confidence DESC))[1] AS ssid2,
      (array_agg(frequency_target ORDER BY confidence DESC))[1] AS frequency1,
      (array_agg(frequency_sibling ORDER BY confidence DESC))[1] AS frequency2,
      (array_agg(distance_m ORDER BY confidence DESC))[1] AS distance_m,
      (array_agg(matched_octets ORDER BY confidence DESC))[1] AS matched_octets,
      array_agg(DISTINCT rule) AS corroborating_rules
    FROM hits
    GROUP BY
      LEAST(seed_bssid, sibling_bssid),
      GREATEST(seed_bssid, sibling_bssid)
  ),
  scored AS (
    SELECT
      d.*,
      lower(regexp_replace(coalesce(d.ssid1, ''), '[^a-z0-9]+', '', 'g')) AS n1,
      lower(regexp_replace(coalesce(d.ssid2, ''), '[^a-z0-9]+', '', 'g')) AS n2,
      (
        lower(regexp_replace(coalesce(d.ssid1, ''), '[^a-z0-9]+', '', 'g'))
        =
        lower(regexp_replace(coalesce(d.ssid2, ''), '[^a-z0-9]+', '', 'g'))
      ) AS ssid_same,
      (
        lower(regexp_replace(coalesce(d.ssid1, ''), '[^a-z0-9]+', '', 'g')) IN (${FLEET_SSID_SQL_LIST})
        OR lower(regexp_replace(coalesce(d.ssid1, ''), '[^a-z0-9]+', '', 'g')) LIKE 'hmc%'
      ) AS ssid_common,
      -- Distance is NOT a penalty: mobile/vehicle-mounted radios appear at
      -- different locations on different passes and may never be co-located.
      -- Stored as metadata only.
      0 AS distance_penalty
    FROM dedup d
  ),
  partner_stats AS (
    SELECT
      radio_bssid,
      COUNT(*) FILTER (WHERE ssid_same AND ssid_common) AS common_partner_count
    FROM (
      SELECT
        s.bssid1 AS radio_bssid,
        s.ssid_same,
        s.ssid_common
      FROM scored s
      UNION ALL
      SELECT
        s.bssid2 AS radio_bssid,
        s.ssid_same,
        s.ssid_common
      FROM scored s
    ) radio_pairs
    GROUP BY radio_bssid
  ),
  family_stats AS (
    SELECT
      family_nodes.ssid_norm,
      family_pairs.family_pair_count,
      COUNT(*) AS family_radio_count
    FROM (
      SELECT DISTINCT
        s.n1 AS ssid_norm,
        s.bssid1 AS radio_bssid
      FROM scored s
      WHERE s.ssid_same AND s.ssid_common AND s.n1 <> ''
      UNION
      SELECT DISTINCT
        s.n1 AS ssid_norm,
        s.bssid2 AS radio_bssid
      FROM scored s
      WHERE s.ssid_same AND s.ssid_common AND s.n1 <> ''
    ) family_nodes
    JOIN (
      SELECT
        s.n1 AS ssid_norm,
        COUNT(*) AS family_pair_count
      FROM scored s
      WHERE s.ssid_same AND s.ssid_common AND s.n1 <> ''
      GROUP BY s.n1
    ) family_pairs ON family_pairs.ssid_norm = family_nodes.ssid_norm
    GROUP BY family_nodes.ssid_norm, family_pairs.family_pair_count
  ),
  final_pairs AS (
    SELECT
      s.bssid1,
      s.bssid2,
      s.rule,
      -- Deterministic rules bypass all penalty logic — their confidence is ground truth.
      -- Applying fleet-SSID partner/family penalties to last_octet_sequential rows was
      -- killing the 31 confirmed mdt/unit pairs (1.000 → below 0.90 threshold).
      -- LEAST(1.000) enforced here to prevent overflow from any bonus stacking.
      LEAST(1.000, CASE WHEN s.rule IN ('last_octet_sequential', 'ssid_exact_sequential', 'middle_octets_sequential') THEN s.confidence
      ELSE GREATEST(0, (
        s.confidence
        - s.distance_penalty
        + CASE
            WHEN s.n1 <> '' AND s.n2 <> ''
             AND (s.n1 = s.n2 OR s.n1 LIKE s.n2 || '%' OR s.n2 LIKE s.n1 || '%') THEN 0.07
            ELSE 0
          END
        - CASE
            WHEN s.ssid_same AND s.ssid_common THEN
              CASE
                WHEN GREATEST(
                  COALESCE(ps1.common_partner_count, 0),
                  COALESCE(ps2.common_partner_count, 0)
                ) >= 12 THEN 0.55
                WHEN GREATEST(
                  COALESCE(ps1.common_partner_count, 0),
                  COALESCE(ps2.common_partner_count, 0)
                ) >= 8 THEN 0.40
                WHEN GREATEST(
                  COALESCE(ps1.common_partner_count, 0),
                  COALESCE(ps2.common_partner_count, 0)
                ) >= 5 THEN 0.25
                WHEN GREATEST(
                  COALESCE(ps1.common_partner_count, 0),
                  COALESCE(ps2.common_partner_count, 0)
                ) >= 3 THEN 0.12
                ELSE 0
              END
            ELSE 0
          END
        - CASE
            WHEN s.ssid_same AND s.ssid_common THEN
              CASE
                WHEN COALESCE(fs.family_radio_count, 0) >= 18 THEN 0.25
                WHEN COALESCE(fs.family_radio_count, 0) >= 10 THEN 0.15
                WHEN COALESCE(fs.family_radio_count, 0) >= 6 THEN 0.08
                ELSE 0
              END
            ELSE 0
          END
      ))
      END) AS final_conf,
      s.d_last_octet,
      s.d_third_octet,
      s.ssid1,
      s.ssid2,
      s.frequency1,
      s.frequency2,
      s.distance_m,
      s.matched_octets,
      s.corroborating_rules
    FROM scored s
    LEFT JOIN partner_stats ps1 ON ps1.radio_bssid = s.bssid1
    LEFT JOIN partner_stats ps2 ON ps2.radio_bssid = s.bssid2
    LEFT JOIN family_stats fs ON fs.ssid_norm = s.n1
  ),
  upserted AS (
    INSERT INTO app.network_sibling_pairs (
      bssid1, bssid2, rule, confidence,
      d_last_octet, d_third_octet, ssid1, ssid2,
      frequency1, frequency2, distance_m,
      matched_octets, pair_strength, quality_scope, computed_at,
      run_id,
      corroborating_rules
    )
    SELECT
      f.bssid1,
      f.bssid2,
      f.rule,
      f.final_conf,
      f.d_last_octet,
      f.d_third_octet,
      f.ssid1,
      f.ssid2,
      f.frequency1,
      f.frequency2,
      f.distance_m,
      f.matched_octets,
      CASE
        WHEN f.rule = 'manual_confirmed' THEN 'verified'
        WHEN f.final_conf = 1.000 THEN 'strong'
        WHEN f.final_conf >= 0.85 THEN 'candidate'
        ELSE 'weak'
      END,
      'default',
      now(),
      $8::integer,
      f.corroborating_rules
    FROM final_pairs f
    -- Skip pairs blocked by manual not_sibling overrides
    LEFT JOIN app.network_sibling_overrides nso
      ON nso.bssid1 = f.bssid1
     AND nso.bssid2 = f.bssid2
     AND nso.relation = 'not_sibling'
     AND nso.is_active = true
    WHERE f.final_conf >= $5
      AND nso.bssid1 IS NULL
    ON CONFLICT (bssid1, bssid2) DO UPDATE
    SET
      rule = EXCLUDED.rule,
      confidence = EXCLUDED.confidence,
      d_last_octet = EXCLUDED.d_last_octet,
      d_third_octet = EXCLUDED.d_third_octet,
      ssid1 = EXCLUDED.ssid1,
      ssid2 = EXCLUDED.ssid2,
      frequency1 = EXCLUDED.frequency1,
      frequency2 = EXCLUDED.frequency2,
      distance_m = EXCLUDED.distance_m,
      matched_octets = EXCLUDED.matched_octets,
      pair_strength = EXCLUDED.pair_strength,
      quality_scope = EXCLUDED.quality_scope,
      computed_at = EXCLUDED.computed_at,
      run_id = EXCLUDED.run_id,
      corroborating_rules = array(
        SELECT DISTINCT unnest(
          network_sibling_pairs.corroborating_rules || EXCLUDED.corroborating_rules
        )
      )
    RETURNING 1
  )
  SELECT
    (SELECT COUNT(*)::int FROM seeds) AS seed_count,
    (SELECT COUNT(*)::int FROM upserted) AS upserted_count,
    (SELECT MAX(bssid)::text FROM seeds) AS next_cursor
`;

const SIBLING_STATS_SQL = `
  SELECT
    COUNT(*)::int AS total_pairs,
    COUNT(*)::int AS active_pairs,
    COUNT(*) FILTER (WHERE confidence >= 0.97)::int AS strong_pairs,
    COUNT(*) FILTER (WHERE confidence < 0.97)::int AS candidate_pairs,
    ROUND(AVG(confidence)::numeric, 3) AS avg_confidence,
    MIN(computed_at) AS oldest_computed_at,
    MAX(computed_at) AS newest_computed_at
  FROM app.network_sibling_pairs
`;

const SIBLING_STATS_BY_RULE_SQL = `
  SELECT
    rule,
    COUNT(*)::int                              AS pair_count,
    ROUND(AVG(confidence)::numeric, 3)         AS avg_confidence,
    MAX(computed_at)                           AS last_run_at
  FROM app.network_sibling_pairs
  GROUP BY rule
  ORDER BY pair_count DESC
`;

export { REFRESH_CHUNK_SQL, SIBLING_STATS_SQL, SIBLING_STATS_BY_RULE_SQL };
