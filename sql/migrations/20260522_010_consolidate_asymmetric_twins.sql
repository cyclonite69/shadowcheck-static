-- Migration: 20260522_010_consolidate_asymmetric_twins.sql
-- Overrides app.find_sibling_radios with asymmetric twin matching logic, explicitly allowing different SSIDs,
-- purging legacy fleet SSID text blacklists from database matching blocks, and retaining the 16-node cluster circuit breaker.

SET search_path TO app, public;

-- Drop existing function with correct signature
DROP FUNCTION IF EXISTS app.find_sibling_radios(text, integer, double precision);

-- Create new function with the comprehensive deterministic sieve logic
CREATE OR REPLACE FUNCTION app.find_sibling_radios(
  p_bssid text,
  p_max_octet_delta integer DEFAULT 6,
  p_max_distance_m double precision DEFAULT 1500.0 -- Ignored, kept for signature compatibility
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
    SUBSTRING(n.bssid, 1, 8) AS oui,
    -- LA bit of byte 1
    ((('x' || split_part(n.bssid, ':', 1))::bit(8)::int & 2) = 2) AS has_la_bit,
    (n.bssid = '00:30:44' OR SUBSTRING(n.bssid, 1, 8) = '00:30:44') AS is_known_cradlepoint
  FROM app.networks n
  WHERE n.bssid = p_bssid
    AND n.type = 'W'
),
candidates AS (
  SELECT
    n.bssid, n.ssid, n.frequency,
    COALESCE(n.bestlat, n.lastlat) AS lat,
    COALESCE(n.bestlon, n.lastlon) AS lon,
    SUBSTRING(n.bssid, 1, 8) AS oui
  FROM app.networks n
  WHERE n.bssid <> p_bssid
    AND n.type = 'W'
    AND (
      SUBSTRING(n.bssid, 1, 8) = (SELECT oui FROM t)
      OR SUBSTRING(n.bssid, 4, 11) = (SELECT SUBSTRING(bssid, 4, 11) FROM t)
    )
),
scored AS (
  SELECT
    t.bssid AS target_bssid,
    c.bssid AS sibling_bssid,
    t.ssid AS target_ssid,
    c.ssid AS sibling_ssid,
    t.frequency AS frequency_target,
    c.frequency AS frequency_sibling,
    t.lat AS lat_target,
    t.lon AS lon_target,
    c.lat AS lat_sibling,
    c.lon AS lon_sibling,
    t.oui AS oui_target,
    c.oui AS oui_sibling,
    -- Octet count summation
    (
      (CASE WHEN split_part(c.bssid, ':', 1) = split_part(t.bssid, ':', 1) THEN 1 ELSE 0 END) +
      (CASE WHEN split_part(c.bssid, ':', 2) = split_part(t.bssid, ':', 2) THEN 1 ELSE 0 END) +
      (CASE WHEN split_part(c.bssid, ':', 3) = split_part(t.bssid, ':', 3) THEN 1 ELSE 0 END) +
      (CASE WHEN split_part(c.bssid, ':', 4) = split_part(t.bssid, ':', 4) THEN 1 ELSE 0 END) +
      (CASE WHEN split_part(c.bssid, ':', 5) = split_part(t.bssid, ':', 5) THEN 1 ELSE 0 END) +
      (CASE WHEN split_part(c.bssid, ':', 6) = split_part(t.bssid, ':', 6) THEN 1 ELSE 0 END)
    ) AS matched_octets_count,
    (
      split_part(c.bssid, ':', 2) = split_part(t.bssid, ':', 2) AND
      split_part(c.bssid, ':', 3) = split_part(t.bssid, ':', 3) AND
      split_part(c.bssid, ':', 4) = split_part(t.bssid, ':', 4) AND
      split_part(c.bssid, ':', 5) = split_part(t.bssid, ':', 5)
    ) AS octets_2_5_identical,
    (
      SUBSTRING(t.bssid, 1, 14) = SUBSTRING(c.bssid, 1, 14)
    ) AS octets_1_5_identical,
    ABS(
      ('x' || split_part(c.bssid, ':', 6))::bit(8)::int -
      ('x' || split_part(t.bssid, ':', 6))::bit(8)::int
    ) AS octet_6_delta,
    ABS(
      ('x' || split_part(c.bssid, ':', 4))::bit(8)::int -
      ('x' || split_part(t.bssid, ':', 4))::bit(8)::int
    ) AS octet_4_delta,
    -- Known Named OUIs
    (t.oui = '00:30:44' OR c.oui = '00:30:44') AS is_known_cradlepoint,
    (t.oui IN ('24:D7:9C', '5C:5B:35', '1C:28:AF') OR c.oui IN ('24:D7:9C', '5C:5B:35', '1C:28:AF')) AS is_known_enterprise,
    -- LA bit flips in Byte 1
    (t.has_la_bit OR ((('x' || split_part(c.bssid, ':', 1))::bit(8)::int & 2) = 2)) AS has_la_bit
  FROM t
  CROSS JOIN candidates c
),
classified AS (
  SELECT
    target_bssid, sibling_bssid, target_ssid, sibling_ssid,
    frequency_target, frequency_sibling,
    lat_target, lon_target, lat_sibling, lon_sibling,
    oui_target, oui_sibling,
    matched_octets_count,
    octet_6_delta,
    octet_4_delta,
    CASE
      -- Class A: Known Cradlepoint or active LA bit flip (Mobile/Fleet)
      WHEN is_known_cradlepoint OR has_la_bit THEN
        CASE 
          WHEN octets_2_5_identical THEN 
            CASE WHEN is_known_cradlepoint THEN 'Class A' ELSE 'Unnamed Recursive (Class A)' END
          ELSE NULL 
        END
      
      -- Class B: Known Enterprise (Cisco, Mist, Aruba)
      WHEN is_known_enterprise THEN
        CASE WHEN matched_octets_count >= 5 THEN 'Class B' ELSE NULL END
      
      -- Unnamed / Unknown OUIs
      ELSE
        CASE
          -- Position-independent 5+ octets match -> Class B behavior (Enterprise)
          WHEN matched_octets_count >= 5 AND NOT (octets_1_5_identical AND octet_6_delta BETWEEN 1 AND 3) THEN 'Unnamed Recursive (Class B)'
          -- Strict physical silicon twin match -> Class C behavior (Consumer/Generic/Asymmetric Twins)
          -- Explicitly removes any SSID same/identity restriction and strips out legacy SSID exclusions from the database
          WHEN octets_1_5_identical AND octet_6_delta BETWEEN 1 AND 3 THEN 'Class C'
          ELSE NULL
        END
    END AS assigned_bucket
  FROM scored
),
cluster_counts AS (
  SELECT
    *,
    COUNT(*) OVER(PARTITION BY oui_sibling, assigned_bucket) AS cluster_size
  FROM classified
  WHERE assigned_bucket IS NOT NULL
)
SELECT
  target_bssid,
  sibling_bssid,
  target_ssid,
  sibling_ssid,
  frequency_target,
  frequency_sibling,
  octet_6_delta AS d_last_octet,
  octet_4_delta AS d_third_octet,
  CASE
    WHEN lat_target IS NOT NULL AND lon_target IS NOT NULL
      AND lat_sibling IS NOT NULL AND lon_sibling IS NOT NULL
      AND lat_target <> 0 AND lon_target <> 0
      AND lat_sibling <> 0 AND lon_sibling <> 0
    THEN ST_Distance(
      ST_SetSRID(ST_MakePoint(lon_target, lat_target), 4326)::geography,
      ST_SetSRID(ST_MakePoint(lon_sibling, lat_sibling), 4326)::geography
    )
    ELSE NULL
  END AS distance_m,
  assigned_bucket AS rule,
  CASE
    WHEN assigned_bucket = 'Unnamed Recursive (Class B)' THEN 0.950::numeric
    ELSE 1.000::numeric
  END AS confidence,
  CASE
    WHEN assigned_bucket IN ('Class A', 'Unnamed Recursive (Class A)') THEN 'o2-o5'::text
    WHEN assigned_bucket = 'Class C' THEN 'o1-o5'::text
    ELSE matched_octets_count || ' matching octets'::text
  END AS matched_octets
FROM cluster_counts
-- Enforce 16-node cluster ceiling (siblings + target <= 16, i.e., siblings <= 15)
WHERE cluster_size <= 15
ORDER BY confidence DESC, distance_m NULLS LAST, sibling_bssid;
$function$;
