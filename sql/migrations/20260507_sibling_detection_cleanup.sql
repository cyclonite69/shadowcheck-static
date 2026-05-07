-- Migration: 20260507_sibling_detection_cleanup.sql
-- Removes false positive sibling pairs produced by SSID-only matching rules
-- (ssid_exact, ssid_prefix_target, ssid_prefix_sibling) which have no
-- geographic or MAC-distance constraint and produce high false-positive rates.
-- The legacy find_sibling_radios function is patched separately in this migration
-- to remove these rule branches and add a WiFi frequency filter.

SET search_path TO app, public;

DELETE FROM app.network_sibling_pairs
WHERE rule IN ('ssid_exact', 'ssid_prefix_target', 'ssid_prefix_sibling');

-- Verify what remains:
-- SELECT rule, pair_strength, COUNT(*)
-- FROM app.network_sibling_pairs
-- GROUP BY rule, pair_strength ORDER BY rule;
-- Expected: ~584 heuristic_last_octet rows + 40 heuristic_last_octet_vendor rows
