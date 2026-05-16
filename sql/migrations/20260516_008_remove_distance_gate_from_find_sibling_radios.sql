-- Migration: 20260516_008_remove_distance_gate_from_find_sibling_radios.sql
-- Removes distance as a gate and scoring factor from sibling detection.
-- Distance is now metadata only.

SET search_path TO app, public;

-- Drop existing function
DROP FUNCTION IF EXISTS app.find_sibling_radios(text, integer, double precision);

-- Recreate without distance gates or penalties
CREATE FUNCTION app.find_sibling_radios(
  p_bssid text,
  p_max_octet_delta integer DEFAULT 6,
  p_max_distance_m double precision DEFAULT 1500.0 -- Kept for signature compatibility; IGNORED in logic.
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
  WHERE n.bssid = p_bssid
    AND n.type = 'W'
),
last_octet_sequential AS (
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
        AND COALESCE(n.bestlon, n.bestlon) IS NOT NULL
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
-- CORRECTED: Require o1-o5 identical, no cross-OUI pairs
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
        AND COALESCE(n.bestlon, n.bestlon) IS NOT NULL
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
    -- Exclude locally administered (randomized) MACs on both sides
    AND (get_byte(decode(replace(n.bssid, ':', ''), 'hex'), 0) & 2) = 0
    AND (get_byte(decode(replace(t.bssid, ':', ''), 'hex'), 0) & 2) = 0
    -- CRITICAL: Require all 5 octets identical (no cross-OUI)
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
    -- Expanded fleet exclusion list with new entries
    AND lower(regexp_replace(coalesce(t.ssid, ''), '[^a-z0-9]+', '', 'g')) NOT IN (
      'greatlakesmobile','mdt','xfinitywifi','xfinitymobile',
      'mtasmartbus','kajeetsmartbus','somguest','somiot',
      'eduroam','attwifi','googlesb','_google',
      'boingohotspot','boingowireless','optimumwifi','cablewifi',
      'spectrumwifi','twcwifi','masimo','msamobile','pasrig'
    )
    AND lower(regexp_replace(coalesce(t.ssid, ''), '[^a-z0-9]+', '', 'g')) NOT LIKE 'hmc%'
    AND lower(regexp_replace(coalesce(t.ssid, ''), '[^a-z0-9]+', '', 'g')) NOT LIKE 'sas%'
),
-- RELAXED: Require at least one side to be non-locally-administered
-- (instead of requiring both). 4-octet match is strong enough evidence.
middle_octets_sequential AS (
  SELECT
    t.bssid AS target_bssid,
    n.bssid AS sibling_bssid,
    t.ssid AS target_ssid,
    n.ssid AS sibling_ssid,
    t.frequency AS frequency_target,
    n.frequency AS frequency_sibling,
    NULL::integer AS d_last_octet,
    ABS(
      ('x' || upper(split_part(n.bssid, ':', 4)))::bit(8)::int -
      ('x' || t.o4)::bit(8)::int
    ) AS d_third_octet,
    CASE
      WHEN t.lat IS NOT NULL AND t.lon IS NOT NULL
        AND COALESCE(n.bestlat, n.lastlat) IS NOT NULL
        AND COALESCE(n.bestlon, n.bestlon) IS NOT NULL
      THEN ST_Distance(
        ST_SetSRID(ST_MakePoint(t.lon, t.lat), 4326)::public.geography,
        ST_SetSRID(ST_MakePoint(COALESCE(n.bestlon, n.lastlon), COALESCE(n.bestlat, n.lastlat)), 4326)::public.geography
      )
      ELSE NULL
    END AS distance_m,
    'middle_octets_sequential' AS rule,
    0.95::numeric AS confidence,
    'o2-o5'::text AS matched_octets
  FROM t
  JOIN app.networks n
    ON upper(n.bssid) <> upper(t.bssid)
    AND n.type = 'W'
    -- Exclude locally administered (randomized) MACs on both sides
    AND (get_byte(decode(replace(n.bssid, ':', ''), 'hex'), 0) & 2) = 0
    AND (get_byte(decode(replace(t.bssid, ':', ''), 'hex'), 0) & 2) = 0
    AND upper(split_part(n.bssid, ':', 2)) = t.o2
    AND upper(split_part(n.bssid, ':', 3)) = t.o3
    AND upper(split_part(n.bssid, ':', 4)) = t.o4
    AND upper(split_part(n.bssid, ':', 5)) = t.o5
    AND ABS(
      ('x' || upper(split_part(n.bssid, ':', 6)))::bit(8)::int -
      ('x' || t.o6)::bit(8)::int
    ) BETWEEN 1 AND 6
),
sequential_siblings AS (
  SELECT target_bssid, sibling_bssid, target_ssid, sibling_ssid,
         frequency_target, frequency_sibling, d_last_octet, d_third_octet,
         distance_m, rule, confidence, matched_octets
  FROM last_octet_sequential
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
),
c AS (
  SELECT s.target_bssid, s.sibling_bssid, s.target_ssid, s.sibling_ssid,
         s.frequency_target, s.frequency_sibling, s.d_last_octet, s.d_third_octet,
         s.distance_m, s.rule, s.confidence, s.matched_octets
  FROM sequential_siblings s
  WHERE s.rule IS NOT NULL
),
probabilistic AS (
  SELECT
    target_bssid, sibling_bssid, target_ssid, sibling_ssid,
    frequency_target, frequency_sibling, d_last_octet, d_third_octet, distance_m,
    rule,
    GREATEST(0, LEAST(1.000, round((
      0.30::numeric
      + CASE
          WHEN frequency_target = frequency_sibling THEN 0.10
          WHEN abs(frequency_target - frequency_sibling) <= 25 THEN 0.05
          ELSE 0
        END
    )::numeric, 3))) AS confidence,
    NULL::text AS matched_octets
  FROM c
  WHERE rule IS NOT NULL
)
-- Deterministic rules win; probabilistic fills remaining candidates.
SELECT target_bssid, sibling_bssid, target_ssid, sibling_ssid,
       frequency_target, frequency_sibling, d_last_octet, d_third_octet,
       distance_m, rule, confidence, matched_octets
FROM sequential_siblings
UNION ALL
SELECT target_bssid, sibling_bssid, target_ssid, sibling_ssid,
       frequency_target, frequency_sibling, d_last_octet, d_third_octet,
       distance_m, rule, confidence, matched_octets
FROM probabilistic
ORDER BY confidence DESC, distance_m NULLS LAST, sibling_bssid;
$function$;
