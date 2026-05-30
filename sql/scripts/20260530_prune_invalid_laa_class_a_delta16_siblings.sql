-- ROLLBACK-only cleanup script for invalid LAA Class A delta-16 sibling edges
-- YMCA DT-Public (F6:92:BF:64:94:0C) <-> Whaley (02:92:BF:64:94:1C / F4:92:BF:64:94:1C)
-- File: sql/scripts/20260530_prune_invalid_laa_class_a_delta16_siblings.sql

BEGIN;

-- 1. Create backup table of targeted bad edges
CREATE TABLE IF NOT EXISTS app.backup_invalid_laa_siblings AS
SELECT *
FROM app.network_sibling_pairs
WHERE (bssid1 = 'F6:92:BF:64:94:0C' AND bssid2 IN ('02:92:BF:64:94:1C', 'F4:92:BF:64:94:1C'))
   OR (bssid2 = 'F6:92:BF:64:94:0C' AND bssid1 IN ('02:92:BF:64:94:1C', 'F4:92:BF:64:94:1C'));

-- 2. Verify backup contents
SELECT 'BACKED UP ROWS:' AS label, bssid1, bssid2, rule, confidence
FROM app.backup_invalid_laa_siblings;

-- 3. Delete the targeted bad edges from network_sibling_pairs
DELETE FROM app.network_sibling_pairs
WHERE (bssid1 = 'F6:92:BF:64:94:0C' AND bssid2 IN ('02:92:BF:64:94:1C', 'F4:92:BF:64:94:1C'))
   OR (bssid2 = 'F6:92:BF:64:94:0C' AND bssid1 IN ('02:92:BF:64:94:1C', 'F4:92:BF:64:94:1C'));

-- 4. Verify post-deletion state for YMCA DT-Public
SELECT 'YMCA REMAINING EDGES COUNT:' AS label, COUNT(*)
FROM app.network_sibling_pairs
WHERE bssid1 = 'F6:92:BF:64:94:0C' OR bssid2 = 'F6:92:BF:64:94:0C';

-- 5. Force ROLLBACK to ensure no permanent mutations are committed during this dry-run
ROLLBACK;
