-- Cleanup Script: 20260528_prune_invalid_laa_vehicle_class_b_siblings.sql
--
-- Prunes persisted false-positive sibling edges in app.network_sibling_pairs
-- that are now rejected by the hardened app.find_sibling_radios rules.
--
-- Scope:
-- 1. Unnamed Recursive (Class B) pairings with the Locally Administered Address (LAA) bit set
--    where the middle octets are not identical (i.e. cross-chassis/cross-block).
-- 2. Unnamed Recursive (Class B) GM/LG Innotek vehicle hotspots (OUI 02:92:A5 / 00:92:A5)
--    with differing SSIDs (cross-vehicle).
--
-- Pre-execution verification: run inside a transaction and rollback if validation fails.

BEGIN;

-- 1. Create a backup table of the affected rows before deleting
CREATE TABLE IF NOT EXISTS app.backup_sibling_pairs_pruned_20260528 AS
SELECT nsp.*,
       n1.ssid AS ssid1,
       n2.ssid AS ssid2
FROM app.network_sibling_pairs nsp
LEFT JOIN app.networks n1 ON n1.bssid = nsp.bssid1
LEFT JOIN app.networks n2 ON n2.bssid = nsp.bssid2
WHERE nsp.rule = 'Unnamed Recursive (Class B)'
  AND (
      -- Locally Administered Address Class B exclusions (Randomized/Private BSSID cross-chassis)
      (
          ((('x' || split_part(nsp.bssid1, ':', 1))::bit(8)::int & 2) = 2)
          OR ((('x' || split_part(nsp.bssid2, ':', 1))::bit(8)::int & 2) = 2)
      )
      OR
      -- GM Vehicle Hotspots with mismatching SSIDs
      (
          (substring(nsp.bssid1 from 1 for 8) IN ('02:92:A5', '00:92:A5') OR substring(nsp.bssid2 from 1 for 8) IN ('02:92:A5', '00:92:A5'))
          AND (
              (n1.ssid ILIKE 'myChevrolet%' OR n1.ssid ILIKE 'myBuick%' OR n1.ssid ILIKE 'myGMC%' OR n1.ssid ILIKE 'myCadillac%')
              OR (n2.ssid ILIKE 'myChevrolet%' OR n2.ssid ILIKE 'myBuick%' OR n2.ssid ILIKE 'myGMC%' OR n2.ssid ILIKE 'myCadillac%')
          )
          AND COALESCE(n1.ssid, '') <> COALESCE(n2.ssid, '')
      )
  );

-- Log count of backed up rows
SELECT COUNT(*) AS backed_up_row_count FROM app.backup_sibling_pairs_pruned_20260528;

-- 2. Prune from primary table
DELETE FROM app.network_sibling_pairs nsp
WHERE EXISTS (
    SELECT 1
    FROM app.backup_sibling_pairs_pruned_20260528 b
    WHERE b.bssid1 = nsp.bssid1 AND b.bssid2 = nsp.bssid2
);

-- Log count of deleted rows
SELECT row_count FROM (SELECT COUNT(*) AS row_count FROM app.backup_sibling_pairs_pruned_20260528) t;

-- 3. Post-execution Validation Checks
-- Check 1: Ensure valid same-chassis Xfinity/Vantiva Class A networks still exist
SELECT COUNT(*) AS preserved_xfinity_class_a
FROM app.network_sibling_pairs
WHERE bssid1 = '4A:BD:CE:D9:2D:B2' AND bssid2 = '4A:BD:CE:D9:2D:B4' AND rule = 'Unnamed Recursive (Class A)';

-- Check 2: Ensure valid same-vehicle GM hotspot Class A networks still exist
SELECT COUNT(*) AS preserved_gm_class_a
FROM app.network_sibling_pairs
WHERE bssid1 = '02:92:A5:12:AF:17' AND bssid2 = '02:92:A5:12:AF:18' AND rule = 'Unnamed Recursive (Class A)';

-- Note: Review output. If correct, run COMMIT; otherwise run ROLLBACK;
ROLLBACK;
