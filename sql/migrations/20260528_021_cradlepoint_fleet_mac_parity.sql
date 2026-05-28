-- Migration: 20260528_021_cradlepoint_fleet_mac_parity.sql
-- Implement strict, non-distance signals-based sibling rules for Cradlepoint fleet networks.
--
-- For Cradlepoint (OUI 00:30:44) and fleet SSIDs (MTA SmartBus, Kajeet SmartBus):
-- 1. Must share first five octets (octets_1_5_identical)
-- 2. last-octet delta = 1
-- 3. same service SSID (both MTA or both Kajeet)
-- 4. cross-band pair (one 2.4 GHz, other 5/6 GHz)
-- 5. MAC parity check: 2.4 GHz radio MAC value must be lower than 5/6 GHz radio MAC value
--
-- Preserves generic Cradlepoint delta <= 3 Class A behavior for non-fleet devices.

SET search_path TO app, public;

BEGIN;

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
    SUBSTRING(n.bssid, 1, 8) AS oui,
    ((('x' || split_part(n.bssid, ':', 1))::bit(8)::int & 2) = 2) AS has_la_bit,
    (n.bssid = '00:30:44' OR SUBSTRING(n.bssid, 1, 8) = '00:30:44') AS is_known_cradlepoint
  FROM app.networks n
  WHERE n.bssid = UPPER(p_bssid)
    AND n.type = 'W'
),
candidates AS (
  SELECT
    n.bssid, n.ssid, n.frequency,
    COALESCE(n.bestlat, n.lastlat) AS lat,
    COALESCE(n.bestlon, n.lastlon) AS lon,
    SUBSTRING(n.bssid, 1, 8) AS oui,
    ((('x' || split_part(n.bssid, ':', 1))::bit(8)::int & 2) = 2) AS has_la_bit
  FROM app.networks n
  WHERE n.bssid <> UPPER(p_bssid)
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
    (t.oui = '00:30:44' OR c.oui = '00:30:44') AS is_known_cradlepoint,
    (t.oui IN ('24:D7:9C', '5C:5B:35', '1C:28:AF') OR c.oui IN ('24:D7:9C', '5C:5B:35', '1C:28:AF')) AS is_known_enterprise,
    (t.has_la_bit OR c.has_la_bit) AS has_la_bit
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
      -- Cradlepoint Fleet Rule (OUI 00:30:44 + SmartBus/Kajeet SSIDs):
      -- Requires same first five octets, delta = 1, same service SSID, cross-band,
      -- and MAC parity (2.4G MAC < 5/6G MAC).
      WHEN is_known_cradlepoint
        AND (target_ssid ILIKE '%MTA SmartBus%' OR target_ssid ILIKE '%Kajeet SmartBus%' OR sibling_ssid ILIKE '%MTA SmartBus%' OR sibling_ssid ILIKE '%Kajeet SmartBus%')
        THEN
          CASE
            WHEN octets_1_5_identical
              AND octet_6_delta = 1
              AND (
                (target_ssid ILIKE '%MTA SmartBus%' AND sibling_ssid ILIKE '%MTA SmartBus%')
                OR (target_ssid ILIKE '%Kajeet SmartBus%' AND sibling_ssid ILIKE '%Kajeet SmartBus%')
              )
              AND (
                (frequency_target BETWEEN 2400 AND 2500 AND frequency_sibling BETWEEN 5000 AND 7125)
                OR (frequency_sibling BETWEEN 2400 AND 2500 AND frequency_target BETWEEN 5000 AND 7125)
              )
              AND (
                CASE
                  WHEN frequency_target BETWEEN 2400 AND 2500 THEN
                    ('x' || split_part(target_bssid, ':', 6))::bit(8)::int < ('x' || split_part(sibling_bssid, ':', 6))::bit(8)::int
                  ELSE
                    ('x' || split_part(sibling_bssid, ':', 6))::bit(8)::int < ('x' || split_part(target_bssid, ':', 6))::bit(8)::int
                END
              )
            THEN 'Class A'
            ELSE NULL
          END

      -- Generic non-fleet Cradlepoint Rule (delta <= 3 fallback):
      -- Preserves existing behavior for non-fleet Cradlepoint devices.
      WHEN is_known_cradlepoint AND octets_2_5_identical AND octet_6_delta <= 3 THEN 'Class A'

      -- LAA generic fallback (Unnamed Recursive Class A): no delta gate added here.
      -- These are non-Cradlepoint locally-administered address devices; the fleet
      -- cross-vehicle pattern is Cradlepoint-specific.
      WHEN has_la_bit AND NOT is_known_cradlepoint AND octets_2_5_identical THEN 'Unnamed Recursive (Class A)'

      WHEN oui_target IN ('00:14:3E', '28:A3:31') AND oui_target = oui_sibling AND octets_1_5_identical AND octet_6_delta = 1 THEN
        CASE oui_target
          WHEN '00:14:3E' THEN 'AIRLINK_DELTA1_TWIN'
          WHEN '28:A3:31' THEN 'SIERRA_DELTA1_TWIN'
        END

      WHEN octets_1_5_identical AND octet_6_delta BETWEEN 1 AND 3 THEN 'Class C'

      WHEN matched_octets_count >= 5 AND octet_6_delta <= 7
        AND NOT is_known_cradlepoint  -- Cradlepoint must only match via Class A (delta<=3) or produce NULL
        AND NOT (
          (oui_target IN ('70:90:41', '7C:B6:8D', 'A8:3A:79', 'A8:53:7D', 'A8:F7:D9', 'AC:23:16', 'C8:78:67', 'D4:20:B0', 'D4:DC:09', '1C:28:AF', '00:14:3E', '28:A3:31', '24:D7:9C', '5C:5B:35')
           OR oui_sibling IN ('70:90:41', '7C:B6:8D', 'A8:3A:79', 'A8:53:7D', 'A8:F7:D9', 'AC:23:16', 'C8:78:67', 'D4:20:B0', 'D4:DC:09', '1C:28:AF', '00:14:3E', '28:A3:31', '24:D7:9C', '5C:5B:35'))
          AND NOT octets_1_5_identical
        ) THEN
        CASE WHEN is_known_enterprise THEN 'Class B' ELSE 'Unnamed Recursive (Class B)' END

      ELSE NULL
    END AS assigned_bucket
  FROM scored
),
cluster_counts AS (
  SELECT
    *,
    COUNT(*) OVER(PARTITION BY oui_sibling, assigned_bucket) AS cluster_size
  FROM classified
  WHERE assigned_bucket IS NOT NULL
    AND NOT (
      oui_target IN ('70:90:41', '7C:B6:8D', 'A8:3A:79', 'A8:53:7D', 'A8:F7:D9', 'AC:23:16', 'C8:78:67', 'D4:20:B0', 'D4:DC:09', '1C:28:AF')
      AND oui_sibling IN ('70:90:41', '7C:B6:8D', 'A8:3A:79', 'A8:53:7D', 'A8:F7:D9', 'AC:23:16', 'C8:78:67', 'D4:20:B0', 'D4:DC:09', '1C:28:AF')
      AND target_ssid IS NOT NULL AND target_ssid <> ''
      AND target_ssid = sibling_ssid
      AND (
        (frequency_target BETWEEN 2400 AND 2500 AND frequency_sibling BETWEEN 2400 AND 2500) OR
        (frequency_target BETWEEN 5000 AND 5900 AND frequency_sibling BETWEEN 5000 AND 5900) OR
        (frequency_target BETWEEN 5925 AND 7125 AND frequency_sibling BETWEEN 5925 AND 7125)
      )
    )
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
    WHEN assigned_bucket IN ('Unnamed Recursive (Class B)') THEN 0.950::numeric
    ELSE 1.000::numeric
  END AS confidence,
  CASE
    WHEN assigned_bucket IN ('Class A', 'Unnamed Recursive (Class A)') THEN 'o2-o5'::text
    WHEN assigned_bucket IN ('Class C', 'AIRLINK_DELTA1_TWIN', 'SIERRA_DELTA1_TWIN') THEN 'o1-o5'::text
    ELSE matched_octets_count || ' matching octets'::text
  END AS matched_octets
FROM cluster_counts
WHERE cluster_size <= 15
ORDER BY confidence DESC, distance_m NULLS LAST, sibling_bssid;
$function$;

COMMIT;
