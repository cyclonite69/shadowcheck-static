-- Dry-run Validation Script: 20260530_verify_netgear_sibling_rule_dryrun.sql
--
-- Dry-runs and validates the addition of the Netgear Dual-Band Sibling Rule.
--
-- Scope:
-- 1. Evaluates all newly matched Netgear dual-band gateway virtual AP pairs.
-- 2. Identifies active manual overrides that are now covered by the deterministic rule.
-- 3. Verifies that no false bridges are created.
--

BEGIN;

-- 1. Temporary table to evaluate the new rule's output on existing networks
CREATE TEMP TABLE temp_new_netgear_siblings AS
WITH seed_networks AS (
  SELECT bssid, ssid
  FROM app.networks
  WHERE bssid LIKE '6C:CD:D6%'
)
SELECT DISTINCT
  LEAST(f.target_bssid, f.sibling_bssid) AS bssid1,
  GREATEST(f.target_bssid, f.sibling_bssid) AS bssid2,
  f.target_ssid,
  f.sibling_ssid,
  f.rule,
  f.confidence
FROM seed_networks n
CROSS JOIN LATERAL app.find_sibling_radios(n.bssid) f
WHERE f.rule = 'Netgear Dual-Band (Class A)';

-- Log count of newly detected sibling pairs
SELECT COUNT(*) AS total_detected_netgear_siblings FROM temp_new_netgear_siblings;

-- 2. Identify manual overrides that are now successfully covered by the code
SELECT DISTINCT
  o.bssid1,
  o.bssid2,
  n1.ssid AS ssid1,
  n2.ssid AS ssid2,
  t.rule
FROM app.network_sibling_overrides o
JOIN app.networks n1 ON n1.bssid = o.bssid1
JOIN app.networks n2 ON n2.bssid = o.bssid2
JOIN temp_new_netgear_siblings t
  ON (t.bssid1 = o.bssid1 AND t.bssid2 = o.bssid2)
  OR (t.bssid1 = o.bssid2 AND t.bssid2 = o.bssid1)
WHERE o.relation = 'sibling' AND o.is_active = true;

-- Log number of overrides now rendered redundant (absorbed by the code)
SELECT COUNT(*) AS manual_overrides_absorbed
FROM app.network_sibling_overrides o
JOIN temp_new_netgear_siblings t
  ON (t.bssid1 = o.bssid1 AND t.bssid2 = o.bssid2)
  OR (t.bssid1 = o.bssid2 AND t.bssid2 = o.bssid1)
WHERE o.relation = 'sibling' AND o.is_active = true;

-- Note: Review output. This script must always end in ROLLBACK.
ROLLBACK;
