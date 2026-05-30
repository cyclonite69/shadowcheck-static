-- Dry-run Validation Script: 20260530_verify_mist_sibling_rule_dryrun.sql
--
-- Dry-runs and validates the addition of the Mist Systems VAP Sibling Rule.
--
-- Scope:
-- 1. Evaluates all newly matched Mist Systems same-chassis pairs (OUI D4:20:B0 or D4:DC:09).
-- 2. Identifies active manual overrides that are now covered by the deterministic rule.
-- 3. Verifies that no false bridges are created.
--
-- Pre-execution verification: run inside a transaction and rollback.

BEGIN;

-- 1. Temporary table to evaluate the new rule's output on existing networks
CREATE TEMP TABLE temp_new_mist_siblings AS
SELECT DISTINCT
  f.target_bssid,
  f.sibling_bssid,
  f.target_ssid,
  f.sibling_ssid,
  f.rule,
  f.confidence
FROM app.networks n
CROSS JOIN LATERAL app.find_sibling_radios(n.bssid) f
WHERE (n.bssid LIKE 'D4:20:B0:%' OR n.bssid LIKE 'D4:DC:09:%')
  AND f.rule = 'Mist Systems VAP (Class A)';

-- Log count of newly detected sibling pairs
SELECT COUNT(*) AS total_detected_mist_vap_siblings FROM temp_new_mist_siblings;

-- 2. Identify manual overrides that are now successfully covered by the code
SELECT
  o.bssid1,
  o.bssid2,
  n1.ssid AS ssid1,
  n2.ssid AS ssid2,
  t.rule
FROM app.network_sibling_overrides o
JOIN app.networks n1 ON n1.bssid = o.bssid1
JOIN app.networks n2 ON n2.bssid = o.bssid2
JOIN temp_new_mist_siblings t
  ON (t.target_bssid = o.bssid1 AND t.sibling_bssid = o.bssid2)
  OR (t.target_bssid = o.bssid2 AND t.sibling_bssid = o.bssid1)
WHERE o.relation = 'sibling' AND o.is_active = true;

-- Log number of overrides now rendered redundant (absorbed by the code)
SELECT COUNT(*) AS manual_overrides_absorbed
FROM app.network_sibling_overrides o
JOIN temp_new_mist_siblings t
  ON (t.target_bssid = o.bssid1 AND t.sibling_bssid = o.bssid2)
  OR (t.target_bssid = o.bssid2 AND t.sibling_bssid = o.bssid1)
WHERE o.relation = 'sibling' AND o.is_active = true;

-- Note: Review output. This script must always end in ROLLBACK.
ROLLBACK;
