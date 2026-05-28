-- Targeted review/prune for residual invalid Cradlepoint SmartBus/Kajeet sibling rows.
--
-- Scope:
-- - Only app.network_sibling_pairs rows where both radios are Cradlepoint OUI 00:30:44.
-- - Only rows where stored or live SSID indicates MTA SmartBus or Kajeet SmartBus.
-- - Excludes manual confirmations and active manual sibling overrides.
-- - Leaves non-Cradlepoint rows and non-fleet Cradlepoint fallback rows untouched.
--
-- This script defaults to ROLLBACK. Review candidate/deleted rows first, then
-- change the final ROLLBACK to COMMIT only when the candidate set is approved.

SET search_path TO app, public;

BEGIN;

CREATE TEMP TABLE invalid_cradlepoint_fleet_sibling_pairs AS
WITH joined_pairs AS (
  SELECT
    p.bssid1,
    p.bssid2,
    p.rule,
    p.confidence,
    p.pair_strength,
    p.ssid1 AS stored_ssid1,
    p.ssid2 AS stored_ssid2,
    p.frequency1 AS stored_frequency1,
    p.frequency2 AS stored_frequency2,
    n1.ssid AS live_ssid1,
    n2.ssid AS live_ssid2,
    COALESCE(n1.frequency, p.frequency1) AS frequency1,
    COALESCE(n2.frequency, p.frequency2) AS frequency2,
    ABS(
      ('x' || split_part(p.bssid2, ':', 6))::bit(8)::int -
      ('x' || split_part(p.bssid1, ':', 6))::bit(8)::int
    ) AS d_last_octet,
    ('x' || split_part(p.bssid1, ':', 6))::bit(8)::int AS bssid1_last_octet,
    ('x' || split_part(p.bssid2, ':', 6))::bit(8)::int AS bssid2_last_octet,
    COALESCE(n1.ssid, p.ssid1, '') AS effective_ssid1,
    COALESCE(n2.ssid, p.ssid2, '') AS effective_ssid2
  FROM app.network_sibling_pairs p
  JOIN app.networks n1
    ON n1.bssid = upper(p.bssid1)
   AND n1.type = 'W'
  JOIN app.networks n2
    ON n2.bssid = upper(p.bssid2)
   AND n2.type = 'W'
  LEFT JOIN app.network_sibling_overrides o
    ON o.bssid1 = p.bssid1
   AND o.bssid2 = p.bssid2
   AND o.relation = 'sibling'
   AND o.is_active = true
  WHERE substring(p.bssid1, 1, 8) = '00:30:44'
    AND substring(p.bssid2, 1, 8) = '00:30:44'
    AND p.rule <> 'manual_confirmed'
    AND p.pair_strength <> 'verified'
    AND o.bssid1 IS NULL
    AND (
      COALESCE(n1.ssid, p.ssid1, '') ILIKE '%MTA SmartBus%'
      OR COALESCE(n1.ssid, p.ssid1, '') ILIKE '%Kajeet SmartBus%'
      OR COALESCE(n2.ssid, p.ssid2, '') ILIKE '%MTA SmartBus%'
      OR COALESCE(n2.ssid, p.ssid2, '') ILIKE '%Kajeet SmartBus%'
    )
),
classified_pairs AS (
  SELECT
    *,
    (
      substring(bssid1, 1, 14) = substring(bssid2, 1, 14)
      AND d_last_octet = 1
      AND (
        (effective_ssid1 ILIKE '%MTA SmartBus%' AND effective_ssid2 ILIKE '%MTA SmartBus%')
        OR (effective_ssid1 ILIKE '%Kajeet SmartBus%' AND effective_ssid2 ILIKE '%Kajeet SmartBus%')
      )
      AND (
        (frequency1 BETWEEN 2400 AND 2500 AND frequency2 BETWEEN 5000 AND 7125)
        OR (frequency2 BETWEEN 2400 AND 2500 AND frequency1 BETWEEN 5000 AND 7125)
      )
      AND (
        CASE
          WHEN frequency1 BETWEEN 2400 AND 2500 THEN bssid1_last_octet < bssid2_last_octet
          WHEN frequency2 BETWEEN 2400 AND 2500 THEN bssid2_last_octet < bssid1_last_octet
          ELSE false
        END
      )
    ) AS is_valid_fleet_pair
  FROM joined_pairs
)
SELECT
  bssid1,
  bssid2,
  rule,
  confidence,
  pair_strength,
  stored_ssid1,
  stored_ssid2,
  live_ssid1,
  live_ssid2,
  stored_frequency1,
  stored_frequency2,
  frequency1,
  frequency2,
  d_last_octet
FROM classified_pairs
WHERE NOT is_valid_fleet_pair;

SELECT COUNT(*) AS candidate_rows
FROM invalid_cradlepoint_fleet_sibling_pairs;

SELECT *
FROM invalid_cradlepoint_fleet_sibling_pairs
ORDER BY bssid1, bssid2
LIMIT 100;

WITH deleted AS (
  DELETE FROM app.network_sibling_pairs p
  USING invalid_cradlepoint_fleet_sibling_pairs v
  WHERE p.bssid1 = v.bssid1
    AND p.bssid2 = v.bssid2
  RETURNING p.bssid1, p.bssid2, p.rule, p.confidence, p.pair_strength
)
SELECT COUNT(*) AS deleted_rows
FROM deleted;

ROLLBACK;
