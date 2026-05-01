-- Migration: fleet SSID exclusion from probabilistic path + purge junk pairs
--
-- Fix 1 (SQL function): In find_sibling_radios, fleet SSIDs ('mdt', 'greatlakesmobile',
-- etc.) are excluded from the probabilistic 'c' CTE. These SSIDs are only valid
-- evidence via deterministic MAC rules (last_octet_sequential, ssid_exact_sequential).
-- Allowing them into the probabilistic path produces thousands of false-positive pairs.
--
-- Fix 2 (purge): Delete existing junk fleet-SSID pairs that have no MAC evidence
-- (octets 1–4 differ OR last octet delta > 3). Wrapped in a transaction that reports
-- the deleted row count before committing.
--
-- NOTE: The REFRESH_CHUNK_SQL scoring bypass (final_pairs CTE) and EXTRA_RULES_SQL
-- fleet exclusion are applied in siblingDetectionQueries.ts and
-- siblingDetectionAdminService.ts respectively (TypeScript, not SQL).

-- ============================================================================
-- Fix 1: update find_sibling_radios — exclude fleet SSIDs from probabilistic path
-- ============================================================================

CREATE OR REPLACE FUNCTION app.find_sibling_radios(
  p_bssid text,
  p_max_octet_delta integer DEFAULT 6,
  p_max_distance_m double precision DEFAULT 1500.0
)
RETURNS TABLE(
  target_bssid text,
  sibling_bssid text,
  target_ssid text,
  sibling_ssid text,
  frequency_target integer,
  frequency_sibling integer,
  d_last_octet integer,
  d_third_octet integer,
  distance_m double precision,
  rule text,
  confidence numeric
)
LANGUAGE sql
STABLE
AS $function$
WITH t AS (
  SELECT
    n.bssid, n.ssid, n.frequency,
    COALESCE(n.bestlat, n.lastlat) AS lat,
    COALESCE(n.bestlon, n.lastlon) AS lon,
    upper(split_part(n.bssid, ':', 1)) AS o1,
    upper(split_part(n.bssid, ':', 2)) AS o2,
    upper(split_part(n.bssid, ':', 3)) AS o3,
    upper(split_part(n.bssid, ':', 4)) AS o4,
    upper(split_part(n.bssid, ':', 5)) AS o5,
    upper(split_part(n.bssid, ':', 6)) AS o6
  FROM app.networks n
  WHERE upper(n.bssid) = upper(p_bssid)
  LIMIT 1
),
-- Deterministic rule 1: first 5 octets identical, last octet delta 1–3.
sequential_siblings AS (
  SELECT
    t.bssid AS target_bssid,
    n.bssid AS sibling_bssid,
    t.ssid AS target_ssid,
    n.ssid AS sibling_ssid,
    t.frequency AS frequency_target,
    n.frequency AS frequency_sibling,
    ABS(
      ('x' || upper(split_part(n.bssid, ':', 6)))::bit(8)::int -
      ('x' || t.o6)::bit(8)::int
    ) AS d_last_octet,
    NULL::integer AS d_third_octet,
    CASE
      WHEN t.lat IS NOT NULL AND t.lon IS NOT NULL
        AND COALESCE(n.bestlat, n.lastlat) IS NOT NULL
        AND COALESCE(n.bestlon, n.lastlon) IS NOT NULL
      THEN ST_Distance(
        ST_SetSRID(ST_MakePoint(t.lon, t.lat), 4326)::public.geography,
        ST_SetSRID(ST_MakePoint(COALESCE(n.bestlon, n.lastlon), COALESCE(n.bestlat, n.lastlat)), 4326)::public.geography
      )
      ELSE NULL
    END AS distance_m,
    'last_octet_sequential' AS rule,
    1.000::numeric AS confidence
  FROM t
  JOIN app.networks n
    ON upper(n.bssid) <> upper(t.bssid)
    AND upper(split_part(n.bssid, ':', 1)) = t.o1
    AND upper(split_part(n.bssid, ':', 2)) = t.o2
    AND upper(split_part(n.bssid, ':', 3)) = t.o3
    AND upper(split_part(n.bssid, ':', 4)) = t.o4
    AND upper(split_part(n.bssid, ':', 5)) = t.o5
    AND ABS(
      ('x' || upper(split_part(n.bssid, ':', 6)))::bit(8)::int -
      ('x' || t.o6)::bit(8)::int
    ) BETWEEN 1 AND 3
),
-- Deterministic rule 2: identical SSID (non-fleet), last octet delta 1–2, any MAC prefix.
ssid_exact_sequential AS (
  SELECT
    t.bssid AS target_bssid,
    n.bssid AS sibling_bssid,
    t.ssid AS target_ssid,
    n.ssid AS sibling_ssid,
    t.frequency AS frequency_target,
    n.frequency AS frequency_sibling,
    ABS(
      ('x' || upper(split_part(n.bssid, ':', 6)))::bit(8)::int -
      ('x' || t.o6)::bit(8)::int
    ) AS d_last_octet,
    NULL::integer AS d_third_octet,
    CASE
      WHEN t.lat IS NOT NULL AND t.lon IS NOT NULL
        AND COALESCE(n.bestlat, n.lastlat) IS NOT NULL
        AND COALESCE(n.bestlon, n.lastlon) IS NOT NULL
      THEN ST_Distance(
        ST_SetSRID(ST_MakePoint(t.lon, t.lat), 4326)::public.geography,
        ST_SetSRID(ST_MakePoint(COALESCE(n.bestlon, n.lastlon), COALESCE(n.bestlat, n.lastlat)), 4326)::public.geography
      )
      ELSE NULL
    END AS distance_m,
    'ssid_exact_sequential' AS rule,
    1.000::numeric AS confidence
  FROM t
  JOIN app.networks n
    ON upper(n.bssid) <> upper(t.bssid)
    AND t.ssid IS NOT NULL AND t.ssid <> ''
    AND n.ssid IS NOT NULL AND n.ssid <> ''
    AND lower(n.ssid) = lower(t.ssid)
    -- Fleet SSIDs are valid here — last_octet_sequential already covers them
    -- when octets 1–5 match; ssid_exact_sequential covers cross-5th-octet cases.
    AND ABS(
      ('x' || upper(split_part(n.bssid, ':', 6)))::bit(8)::int -
      ('x' || t.o6)::bit(8)::int
    ) BETWEEN 1 AND 2
    -- Exclude pairs already captured by sequential_siblings
    AND NOT (
      upper(split_part(n.bssid, ':', 1)) = t.o1
      AND upper(split_part(n.bssid, ':', 2)) = t.o2
      AND upper(split_part(n.bssid, ':', 3)) = t.o3
      AND upper(split_part(n.bssid, ':', 4)) = t.o4
      AND upper(split_part(n.bssid, ':', 5)) = t.o5
    )
),
-- Probabilistic candidates: require first 4 octets identical.
-- Fleet SSIDs are excluded — they produce thousands of false positives via
-- SSID matching and are only valid evidence via deterministic MAC rules above.
c AS (
  SELECT
    t.bssid AS target_bssid,
    n.bssid AS sibling_bssid,
    t.ssid AS target_ssid,
    n.ssid AS sibling_ssid,
    t.frequency AS frequency_target,
    n.frequency AS frequency_sibling,
    NULL::integer AS d_last_octet,
    NULL::integer AS d_third_octet,
    CASE
      WHEN t.lat IS NOT NULL AND t.lon IS NOT NULL
        AND COALESCE(n.bestlat, n.lastlat) IS NOT NULL
        AND COALESCE(n.bestlon, n.lastlon) IS NOT NULL
      THEN ST_Distance(
        ST_SetSRID(ST_MakePoint(t.lon, t.lat), 4326)::public.geography,
        ST_SetSRID(ST_MakePoint(COALESCE(n.bestlon, n.lastlon), COALESCE(n.bestlat, n.lastlat)), 4326)::public.geography
      )
      ELSE NULL
    END AS distance_m,
    CASE
      WHEN t.ssid IS NOT NULL AND n.ssid IS NOT NULL AND t.ssid <> '' AND n.ssid <> '' AND lower(t.ssid) = lower(n.ssid) THEN 'ssid_exact'
      WHEN t.ssid IS NOT NULL AND n.ssid IS NOT NULL AND t.ssid <> '' AND n.ssid <> '' AND lower(t.ssid) LIKE lower(n.ssid) || '%' THEN 'ssid_prefix_target'
      WHEN t.ssid IS NOT NULL AND n.ssid IS NOT NULL AND t.ssid <> '' AND n.ssid <> '' AND lower(n.ssid) LIKE lower(t.ssid) || '%' THEN 'ssid_prefix_sibling'
      WHEN (t.ssid IS NULL OR t.ssid = '') AND (n.ssid IS NULL OR n.ssid = '') THEN 'empty_ssid_match'
      ELSE 'mac_only_match'
    END AS rule,
    CASE
      WHEN t.ssid IS NOT NULL AND n.ssid IS NOT NULL AND t.ssid <> '' AND n.ssid <> '' AND lower(t.ssid) = lower(n.ssid) THEN 0.85
      WHEN t.ssid IS NOT NULL AND n.ssid IS NOT NULL AND t.ssid <> '' AND n.ssid <> '' AND lower(t.ssid) LIKE lower(n.ssid) || '%' THEN 0.70
      WHEN t.ssid IS NOT NULL AND n.ssid IS NOT NULL AND t.ssid <> '' AND n.ssid <> '' AND lower(n.ssid) LIKE lower(t.ssid) || '%' THEN 0.70
      WHEN (t.ssid IS NULL OR t.ssid = '') AND (n.ssid IS NULL OR n.ssid = '') THEN 0.40
      ELSE 0.30
    END AS base_confidence
  FROM t
  JOIN app.networks n
    ON upper(n.bssid) <> upper(t.bssid)
    AND upper(split_part(n.bssid, ':', 1)) = t.o1
    AND upper(split_part(n.bssid, ':', 2)) = t.o2
    AND upper(split_part(n.bssid, ':', 3)) = t.o3
    AND upper(split_part(n.bssid, ':', 4)) = t.o4
    -- Exclude pairs already captured by sequential_siblings
    AND NOT (
      upper(split_part(n.bssid, ':', 5)) = t.o5
      AND ABS(
        ('x' || upper(split_part(n.bssid, ':', 6)))::bit(8)::int -
        ('x' || t.o6)::bit(8)::int
      ) BETWEEN 1 AND 3
    )
    -- Exclude pairs already captured by ssid_exact_sequential
    AND NOT (
      t.ssid IS NOT NULL AND t.ssid <> ''
      AND n.ssid IS NOT NULL AND n.ssid <> ''
      AND lower(n.ssid) = lower(t.ssid)
      AND ABS(
        ('x' || upper(split_part(n.bssid, ':', 6)))::bit(8)::int -
        ('x' || t.o6)::bit(8)::int
      ) BETWEEN 1 AND 2
    )
    -- Fleet SSIDs never enter the probabilistic path — SSID matching alone is
    -- not meaningful evidence for these high-cardinality shared SSIDs.
    AND lower(regexp_replace(coalesce(t.ssid, ''), '[^a-z0-9]+', '', 'g')) NOT IN (
      'greatlakesmobile','mdt','xfinitywifi','xfinitymobile',
      'mtasmartbus','kajeetsmartbus','somguest','somiot'
    )
),
probabilistic AS (
  SELECT
    target_bssid, sibling_bssid, target_ssid, sibling_ssid,
    frequency_target, frequency_sibling, d_last_octet, d_third_octet, distance_m,
    rule,
    GREATEST(0, LEAST(1.000, round((
      COALESCE(base_confidence, 0)
      + CASE
          WHEN frequency_target = frequency_sibling THEN 0.10
          WHEN abs(frequency_target - frequency_sibling) <= 25 THEN 0.05
          ELSE 0
        END
      + CASE
          WHEN distance_m IS NULL THEN 0
          WHEN distance_m <= 50 THEN 0.10
          WHEN distance_m <= 250 THEN 0.05
          WHEN distance_m <= 500 THEN 0.01
          ELSE -0.25
        END
      - CASE
          WHEN lower(regexp_replace(coalesce(target_ssid, ''), '[^a-z0-9]+', '', 'g')) IN (
            'greatlakesmobile','mdt','xfinitywifi','xfinitymobile',
            'mtasmartbus','kajeetsmartbus','somguest','somiot'
          ) AND coalesce(distance_m, 0) > 100 THEN 0.45
          ELSE 0
        END
    )::numeric, 3))) AS confidence
  FROM c
  WHERE rule IS NOT NULL
    AND (distance_m IS NULL OR distance_m <= p_max_distance_m)
)
SELECT target_bssid, sibling_bssid, target_ssid, sibling_ssid,
       frequency_target, frequency_sibling, d_last_octet, d_third_octet,
       distance_m, rule, confidence
FROM sequential_siblings
UNION ALL
SELECT target_bssid, sibling_bssid, target_ssid, sibling_ssid,
       frequency_target, frequency_sibling, d_last_octet, d_third_octet,
       distance_m, rule, confidence
FROM ssid_exact_sequential
UNION ALL
SELECT target_bssid, sibling_bssid, target_ssid, sibling_ssid,
       frequency_target, frequency_sibling, d_last_octet, d_third_octet,
       distance_m, rule, confidence
FROM probabilistic
ORDER BY confidence DESC, distance_m NULLS LAST, sibling_bssid;
$function$;

-- ============================================================================
-- Fix 2: purge junk fleet-SSID pairs with no MAC evidence
--
-- Deletes pairs where one side has a fleet SSID AND the pair lacks the MAC
-- evidence that would make it a true sibling (octets 1–4 identical + last
-- octet delta ≤ 3). These are the ~3,200 false positives identified in the
-- data analysis (2,643 GreatLakesMobile + 558 mdt + others).
--
-- Uses bssid1/bssid2 directly — network_sibling_pairs has no network_id columns.
-- ============================================================================

BEGIN;

WITH deleted AS (
  DELETE FROM app.network_sibling_pairs p
  USING app.networks na, app.networks nb
  WHERE p.bssid1 = na.bssid
    AND p.bssid2 = nb.bssid
    AND lower(regexp_replace(coalesce(na.ssid, ''), '[^a-z0-9]+', '', 'g')) IN (
      'greatlakesmobile','mdt','xfinitywifi','xfinitymobile',
      'mtasmartbus','kajeetsmartbus','somguest','somiot'
    )
    -- Keep pairs that have genuine MAC evidence: octets 1–4 identical AND last octet delta ≤ 3
    AND NOT (
      upper(split_part(na.bssid, ':', 1)) = upper(split_part(nb.bssid, ':', 1))
      AND upper(split_part(na.bssid, ':', 2)) = upper(split_part(nb.bssid, ':', 2))
      AND upper(split_part(na.bssid, ':', 3)) = upper(split_part(nb.bssid, ':', 3))
      AND upper(split_part(na.bssid, ':', 4)) = upper(split_part(nb.bssid, ':', 4))
      AND ABS(
        ('x' || upper(split_part(na.bssid, ':', 6)))::bit(8)::int -
        ('x' || upper(split_part(nb.bssid, ':', 6)))::bit(8)::int
      ) <= 3
    )
  RETURNING 1
)
SELECT COUNT(*) AS rows_deleted FROM deleted;

COMMIT;
