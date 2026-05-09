-- Migration: 20260509_sibling_detection_overhaul.sql
-- Fixes applied:
-- 1. Add matched_octets column for audit trail
-- 2. find_sibling_radios: filter n.type = 'W' in all CTEs (excludes 993 BT/BLE devices)
-- 3. find_sibling_radios: exclude locally administered MACs from all sequential rules
-- 4. find_sibling_radios: remove ssid_exact/ssid_prefix_* from probabilistic CTE
-- 5. find_sibling_radios: populate d_third_octet for middle_octets_sequential
-- 6. find_sibling_radios: add matched_octets to return type

SET search_path TO app, public;

-- Step 1: Add matched_octets column
ALTER TABLE app.network_sibling_pairs
  ADD COLUMN IF NOT EXISTS matched_octets text;

-- Step 2: Replace find_sibling_radios with fixed version
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
  confidence numeric,
  matched_octets text
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
    AND n.type = 'W'
  LIMIT 1
),
-- Deterministic rule 1: first 5 octets identical, last octet delta 1–3.
-- Excludes locally administered MACs (randomized) on both sides.
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
    1.000::numeric AS confidence,
    'o1-o5'::text AS matched_octets
  FROM t
  JOIN app.networks n
    ON upper(n.bssid) <> upper(t.bssid)
    AND n.type = 'W'
    -- Exclude locally administered (randomized) MACs on both sides
    AND (get_byte(decode(replace(n.bssid, ':', ''), 'hex'), 0) & 2) = 0
    AND (get_byte(decode(replace(t.bssid, ':', ''), 'hex'), 0) & 2) = 0
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
-- Fleet SSIDs require same first 4 octets (same OUI block).
-- Excludes locally administered MACs on both sides.
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
    1.000::numeric AS confidence,
    CASE
      WHEN upper(split_part(n.bssid, ':', 1)) = t.o1
        AND upper(split_part(n.bssid, ':', 2)) = t.o2
        AND upper(split_part(n.bssid, ':', 3)) = t.o3
        AND upper(split_part(n.bssid, ':', 4)) = t.o4
      THEN 'o1-o4+ssid'
      ELSE 'ssid+last_octet'
    END AS matched_octets
  FROM t
  JOIN app.networks n
    ON upper(n.bssid) <> upper(t.bssid)
    AND n.type = 'W'
    -- Exclude locally administered (randomized) MACs on both sides
    AND (get_byte(decode(replace(n.bssid, ':', ''), 'hex'), 0) & 2) = 0
    AND (get_byte(decode(replace(t.bssid, ':', ''), 'hex'), 0) & 2) = 0
    AND t.ssid IS NOT NULL AND t.ssid <> ''
    AND n.ssid IS NOT NULL AND n.ssid <> ''
    AND lower(n.ssid) = lower(t.ssid)
    AND ABS(
      ('x' || upper(split_part(n.bssid, ':', 6)))::bit(8)::int -
      ('x' || t.o6)::bit(8)::int
    ) BETWEEN 1 AND 2
    -- Fleet SSIDs require same first 4 octets (same OUI block).
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
-- Deterministic rule 3: octets 2–5 identical, first octet differs, last octet delta 0–3.
-- Covers multi-BSSID APs (e.g. Xfinity/Commscope) that broadcast multiple SSIDs
-- across bands with the same middle octets but varying first and last octets.
-- Example: 8C:61:A3:7C:BD:08 ↔ CE:61:A3:7C:BD:09.
-- Excludes locally administered MACs on both sides.
middle_octets_sequential AS (
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
    -- d_third_octet: delta between octet 3 of each BSSID (always 0 here since o3 must match)
    ABS(
      ('x' || upper(split_part(n.bssid, ':', 3)))::bit(8)::int -
      ('x' || t.o3)::bit(8)::int
    ) AS d_third_octet,
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
    'middle_octets_sequential' AS rule,
    1.000::numeric AS confidence,
    'o2-o5'::text AS matched_octets
  FROM t
  JOIN app.networks n
    ON upper(n.bssid) <> upper(t.bssid)
    AND n.type = 'W'
    -- Exclude locally administered (randomized) MACs on both sides
    AND (get_byte(decode(replace(n.bssid, ':', ''), 'hex'), 0) & 2) = 0
    AND (get_byte(decode(replace(t.bssid, ':', ''), 'hex'), 0) & 2) = 0
    -- First octet must differ
    AND upper(split_part(n.bssid, ':', 1)) <> t.o1
    -- Octets 2–5 must be identical
    AND upper(split_part(n.bssid, ':', 2)) = t.o2
    AND upper(split_part(n.bssid, ':', 3)) = t.o3
    AND upper(split_part(n.bssid, ':', 4)) = t.o4
    AND upper(split_part(n.bssid, ':', 5)) = t.o5
    -- Last octet delta 0–3
    AND ABS(
      ('x' || upper(split_part(n.bssid, ':', 6)))::bit(8)::int -
      ('x' || t.o6)::bit(8)::int
    ) BETWEEN 0 AND 3
),
-- Probabilistic candidates: require first 4 octets identical.
-- Only fires for empty_ssid_match and mac_only_match.
-- SSID-based matching is handled exclusively by deterministic rules above.
-- Fleet SSIDs excluded. BT/BLE excluded via type = 'W'.
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
      WHEN (t.ssid IS NULL OR t.ssid = '') AND (n.ssid IS NULL OR n.ssid = '') THEN 'empty_ssid_match'
      ELSE 'mac_only_match'
    END AS rule,
    CASE
      WHEN (t.ssid IS NULL OR t.ssid = '') AND (n.ssid IS NULL OR n.ssid = '') THEN 0.40
      ELSE 0.30
    END AS base_confidence
  FROM t
  JOIN app.networks n
    ON upper(n.bssid) <> upper(t.bssid)
    AND n.type = 'W'
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
    )::numeric, 3))) AS confidence,
    'o1-o4'::text AS matched_octets
  FROM c
  WHERE rule IS NOT NULL
)
SELECT target_bssid, sibling_bssid, target_ssid, sibling_ssid,
       frequency_target, frequency_sibling, d_last_octet, d_third_octet,
       distance_m, rule, confidence, matched_octets
FROM sequential_siblings
UNION ALL
SELECT target_bssid, sibling_bssid, target_ssid, sibling_ssid,
       frequency_target, frequency_sibling, d_last_octet, d_third_octet,
       distance_m, rule, confidence, matched_octets
FROM ssid_exact_sequential
UNION ALL
SELECT target_bssid, sibling_bssid, target_ssid, sibling_ssid,
       frequency_target, frequency_sibling, d_last_octet, d_third_octet,
       distance_m, rule, confidence, matched_octets
FROM middle_octets_sequential
UNION ALL
SELECT target_bssid, sibling_bssid, target_ssid, sibling_ssid,
       frequency_target, frequency_sibling, d_last_octet, d_third_octet,
       distance_m, rule, confidence, matched_octets
FROM probabilistic
ORDER BY confidence DESC, distance_m NULLS LAST, sibling_bssid;
$function$;
