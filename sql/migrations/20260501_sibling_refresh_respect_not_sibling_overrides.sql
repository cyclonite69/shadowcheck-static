-- Respect not_sibling manual overrides in refresh_network_sibling_pairs
-- The refresh function was blindly inserting/updating all computed pairs,
-- including pairs the analyst has explicitly marked as not_sibling.
-- Fix: filter out not_sibling overrides before the INSERT.

CREATE OR REPLACE FUNCTION app.refresh_network_sibling_pairs(
  p_max_octet_delta int DEFAULT 6,
  p_max_distance_m numeric DEFAULT 5000,
  p_min_candidate_conf numeric DEFAULT 0.70,
  p_min_strong_conf numeric DEFAULT 0.92,
  p_seed_limit int DEFAULT NULL,
  p_incremental boolean DEFAULT true
)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_rowcount bigint := 0;
BEGIN
  WITH seeds AS (
    SELECT ne.bssid
    FROM app.api_network_explorer_mv ne
    WHERE ne.bssid ~* '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
      AND (
        NOT p_incremental
        OR NOT EXISTS (
          SELECT 1 FROM app.network_sibling_pairs p
          WHERE p.bssid1 = ne.bssid OR p.bssid2 = ne.bssid
          AND p.computed_at > now() - interval '7 days'
        )
      )
    ORDER BY ne.bssid
    LIMIT COALESCE(p_seed_limit, 5000)
  ),
  hits AS (
    SELECT s.bssid AS seed_bssid, r.*
    FROM seeds s
    CROSS JOIN LATERAL app.find_sibling_radios(s.bssid, p_max_octet_delta, p_max_distance_m) r
  ),
  dedup AS (
    SELECT DISTINCT ON (LEAST(seed_bssid, sibling_bssid), GREATEST(seed_bssid, sibling_bssid))
      LEAST(seed_bssid, sibling_bssid) AS bssid1,
      GREATEST(seed_bssid, sibling_bssid) AS bssid2,
      rule,
      confidence,
      d_last_octet,
      d_third_octet,
      target_ssid AS ssid1,
      sibling_ssid AS ssid2,
      frequency_target AS frequency1,
      frequency_sibling AS frequency2,
      distance_m
    FROM hits
    ORDER BY LEAST(seed_bssid, sibling_bssid), GREATEST(seed_bssid, sibling_bssid), confidence DESC
  )
  INSERT INTO app.network_sibling_pairs (
    bssid1, bssid2, rule, confidence,
    d_last_octet, d_third_octet, ssid1, ssid2,
    frequency1, frequency2, distance_m,
    quality_scope, computed_at
  )
  SELECT
    f.bssid1, f.bssid2, f.rule, f.confidence,
    f.d_last_octet, f.d_third_octet, f.ssid1, f.ssid2,
    f.frequency1, f.frequency2, f.distance_m,
    'default', now()
  FROM dedup f
  WHERE f.confidence >= p_min_candidate_conf
    -- Never create or update a pair the analyst has explicitly rejected
    AND NOT EXISTS (
      SELECT 1 FROM app.network_sibling_overrides o
      WHERE o.relation = 'not_sibling'
        AND o.is_active = true
        AND o.bssid1 = LEAST(f.bssid1, f.bssid2)
        AND o.bssid2 = GREATEST(f.bssid1, f.bssid2)
    )
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
    quality_scope = EXCLUDED.quality_scope,
    computed_at = EXCLUDED.computed_at;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  RETURN v_rowcount;
END;
$$;
