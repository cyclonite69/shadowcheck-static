-- Migration: sibling detection false-positive reduction v2
--
-- Problems fixed:
--
-- 1. upper_octet_rotation (EXTRA_RULES_SQL) had no distance guard and no fleet
--    SSID exclusion. Azure Wave devices (GreatLakesMobile) with coincidentally
--    matching last-4-octet patterns were being joined as siblings at 0.95
--    confidence. Fix: require both networks to have location data AND be within
--    200m, AND exclude fleet SSIDs.
--
-- 2. ssid_exact_sequential in find_sibling_radios allowed fleet SSIDs (mdt,
--    GreatLakesMobile, etc.) to match cross-OUI when last octet delta is 1–2.
--    The comment "Fleet SSIDs are valid here" was wrong for cross-OUI cases.
--    Fix: fleet SSIDs in ssid_exact_sequential require same first 4 octets
--    (i.e., same OUI block). Cross-OUI fleet SSID matches are never valid.
--
-- 3. The refresh job (REFRESH_CHUNK_SQL) and EXTRA_RULES_SQL did not respect
--    manual not_sibling overrides — they would re-insert purged pairs on every
--    run. Fix: add LEFT JOIN to network_sibling_overrides in both upsert paths
--    and skip pairs where a not_sibling override exists.
--
-- 4. Purge: delete existing false-positive pairs created by the unfixed rules.

-- ============================================================================
-- Fix 1+2: update find_sibling_radios
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
-- Deterministic rule 2: identical SSID, last octet delta 1–2.
-- Fleet SSIDs (mdt, GreatLakesMobile, etc.) are only valid here when the
-- first 4 octets also match (same OUI block). Cross-OUI fleet SSID matches
-- are never valid evidence — different manufacturers sharing a fleet SSID
-- are not siblings.
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
    AND ABS(
      ('x' || upper(split_part(n.bssid, ':', 6)))::bit(8)::int -
      ('x' || t.o6)::bit(8)::int
    ) BETWEEN 1 AND 2
    -- Fleet SSIDs require same first 4 octets (same OUI block).
    -- Non-fleet SSIDs may match across OUIs.
    AND (
      lower(regexp_replace(coalesce(t.ssid, ''), '[^a-z0-9]+', '', 'g')) NOT IN (
        'greatlakesmobile','mdt','xfinitywifi','xfinitymobile',
        'mtasmartbus','kajeetsmartbus','somguest','somiot'
      )
      OR (
        upper(split_part(n.bssid, ':', 1)) = t.o1
        AND upper(split_part(n.bssid, ':', 2)) = t.o2
        AND upper(split_part(n.bssid, ':', 3)) = t.o3
        AND upper(split_part(n.bssid, ':', 4)) = t.o4
      )
    )
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
    -- Fleet SSIDs never enter the probabilistic path.
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
      -- Distance is NOT a penalty: mobile/vehicle-mounted radios appear at
      -- different locations on different passes and may never be co-located.
      -- Distance is stored as metadata only.
    )::numeric, 3))) AS confidence
  FROM c
  WHERE rule IS NOT NULL
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
-- Fix 3: purge false positives created by the unfixed rules
--
-- Deletes:
-- a) upper_octet_rotation pairs where both networks have fleet SSIDs
--    (these were the cross-OUI Azure Wave / GreatLakesMobile false positives)
-- b) ssid_exact_sequential pairs where the SSID is a fleet SSID AND the
--    first 4 octets differ (cross-OUI fleet SSID match — never valid)
-- c) Any pair blocked by a manual not_sibling override
-- ============================================================================

BEGIN;

WITH deleted AS (
  DELETE FROM app.network_sibling_pairs p
  USING app.networks na, app.networks nb
  WHERE p.bssid1 = na.bssid
    AND p.bssid2 = nb.bssid
    AND (
      -- upper_octet_rotation false positives: fleet SSID on either side
      (
        p.rule = 'upper_octet_rotation'
        AND lower(regexp_replace(coalesce(na.ssid, ''), '[^a-z0-9]+', '', 'g')) IN (
          'greatlakesmobile','mdt','xfinitywifi','xfinitymobile',
          'mtasmartbus','kajeetsmartbus','somguest','somiot'
        )
      )
      OR
      -- ssid_exact_sequential cross-OUI fleet SSID false positives
      (
        p.rule = 'ssid_exact_sequential'
        AND lower(regexp_replace(coalesce(na.ssid, ''), '[^a-z0-9]+', '', 'g')) IN (
          'greatlakesmobile','mdt','xfinitywifi','xfinitymobile',
          'mtasmartbus','kajeetsmartbus','somguest','somiot'
        )
        AND NOT (
          upper(split_part(na.bssid, ':', 1)) = upper(split_part(nb.bssid, ':', 1))
          AND upper(split_part(na.bssid, ':', 2)) = upper(split_part(nb.bssid, ':', 2))
          AND upper(split_part(na.bssid, ':', 3)) = upper(split_part(nb.bssid, ':', 3))
          AND upper(split_part(na.bssid, ':', 4)) = upper(split_part(nb.bssid, ':', 4))
        )
      )
    )
  RETURNING 1
)
SELECT COUNT(*) AS rows_deleted FROM deleted;

COMMIT;

-- Also purge any pairs blocked by manual not_sibling overrides
-- (these should never be in network_sibling_pairs)
BEGIN;

WITH deleted AS (
  DELETE FROM app.network_sibling_pairs p
  USING app.network_sibling_overrides o
  WHERE o.bssid1 = p.bssid1
    AND o.bssid2 = p.bssid2
    AND o.relation = 'not_sibling'
    AND o.is_active = true
  RETURNING 1
)
SELECT COUNT(*) AS rows_deleted FROM deleted;

COMMIT;
