-- Migration: 20260509_002_sibling_detection_fixes.sql
-- Fixes applied:
-- 1. ssid_exact_sequential: require o1-o5 identical (was only enforcing o1-o4 for fleet SSIDs)
-- 2. Expand fleet SSID exclusion list (eduroam, carrier hotspots)
-- 3. Add octet_delta_max column for audit trail tightness
-- 4. pair_strength thresholds: strong=1.000, candidate>=0.85, weak<0.85
-- 5. matched_octets: ssid_exact_sequential now always 'o1-o5+ssid'

SET search_path TO app, public;

-- Step 1: Add octet_delta_max column
ALTER TABLE app.network_sibling_pairs
  ADD COLUMN IF NOT EXISTS octet_delta_max integer;

-- Step 2: DROP and recreate find_sibling_radios (signature unchanged, logic fixed)
DROP FUNCTION IF EXISTS app.find_sibling_radios(text, integer, double precision);

CREATE FUNCTION app.find_sibling_radios(
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
-- Deterministic rule 2: first 5 octets identical, identical SSID, last octet delta 1–2.
-- Requires o1-o5 identical — same constraint as last_octet_sequential.
-- This prevents cross-OUI false positives (e.g. 00:F2:8B vs D4:DC:09 with same SSID).
-- Fleet SSIDs excluded entirely — they appear on thousands of unrelated devices.
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
    'o1-o5+ssid'::text AS matched_octets
  FROM t
  JOIN app.networks n
    ON upper(n.bssid) <> upper(t.bssid)
    AND n.type = 'W'
    AND (get_byte(decode(replace(n.bssid, ':', ''), 'hex'), 0) & 2) = 0
    AND (get_byte(decode(replace(t.bssid, ':', ''), 'hex'), 0) & 2) = 0
    -- First 5 octets must be identical — prevents cross-OUI false positives
    AND upper(split_part(n.bssid, ':', 1)) = t.o1
    AND upper(split_part(n.bssid, ':', 2)) = t.o2
    AND upper(split_part(n.bssid, ':', 3)) = t.o3
    AND upper(split_part(n.bssid, ':', 4)) = t.o4
    AND upper(split_part(n.bssid, ':', 5)) = t.o5
    AND t.ssid IS NOT NULL AND t.ssid <> ''
    AND n.ssid IS NOT NULL AND n.ssid <> ''
    AND lower(n.ssid) = lower(t.ssid)
    AND ABS(
      ('x' || upper(split_part(n.bssid, ':', 6)))::bit(8)::int -
      ('x' || t.o6)::bit(8)::int
    ) BETWEEN 1 AND 2
    -- Fleet/carrier SSIDs excluded — appear on thousands of unrelated devices
    AND lower(regexp_replace(coalesce(t.ssid, ''), '[^a-z0-9]+', '', 'g')) NOT IN (
      'greatlakesmobile','mdt','xfinitywifi','xfinitymobile',
      'mtasmartbus','kajeetsmartbus','somguest','somiot',
      'eduroam','attwifi','attwifi','googlesb','_google',
      'boingohotspot','boingowireless','optimumwifi','cablewifi',
      'spectrumwifi','twcwifi'
    )
    -- Exclude pairs already captured by sequential_siblings (o5 matches, delta 1-3)
    -- ssid_exact_sequential fires when o5 also matches but delta is 1-2 — already
    -- covered by sequential_siblings. Exclude to avoid duplicates.
    AND NOT (
      upper(split_part(n.bssid, ':', 5)) = t.o5
      AND ABS(
        ('x' || upper(split_part(n.bssid, ':', 6)))::bit(8)::int -
        ('x' || t.o6)::bit(8)::int
      ) BETWEEN 1 AND 3
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
    AND (get_byte(decode(replace(n.bssid, ':', ''), 'hex'), 0) & 2) = 0
    AND (get_byte(decode(replace(t.bssid, ':', ''), 'hex'), 0) & 2) = 0
    AND upper(split_part(n.bssid, ':', 1)) <> t.o1
    AND upper(split_part(n.bssid, ':', 2)) = t.o2
    AND upper(split_part(n.bssid, ':', 3)) = t.o3
    AND upper(split_part(n.bssid, ':', 4)) = t.o4
    AND upper(split_part(n.bssid, ':', 5)) = t.o5
    AND ABS(
      ('x' || upper(split_part(n.bssid, ':', 6)))::bit(8)::int -
      ('x' || t.o6)::bit(8)::int
    ) BETWEEN 0 AND 3
),
-- Probabilistic candidates: require first 4 octets identical.
-- Only fires for empty_ssid_match and mac_only_match.
-- SSID-based matching is handled exclusively by deterministic rules above.
-- Fleet/carrier SSIDs excluded. BT/BLE excluded via type = 'W'.
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
      AND upper(split_part(n.bssid, ':', 5)) = t.o5
      AND ABS(
        ('x' || upper(split_part(n.bssid, ':', 6)))::bit(8)::int -
        ('x' || t.o6)::bit(8)::int
      ) BETWEEN 1 AND 2
    )
    -- Fleet/carrier SSIDs never enter the probabilistic path.
    AND lower(regexp_replace(coalesce(t.ssid, ''), '[^a-z0-9]+', '', 'g')) NOT IN (
      'greatlakesmobile','mdt','xfinitywifi','xfinitymobile',
      'mtasmartbus','kajeetsmartbus','somguest','somiot',
      'eduroam','attwifi','attwifi','googlesb','_google',
      'boingohotspot','boingowireless','optimumwifi','cablewifi',
      'spectrumwifi','twcwifi'
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
