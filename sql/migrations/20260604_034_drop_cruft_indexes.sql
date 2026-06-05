-- Migration: Drop redundant and unused indexes to reclaim disk space (~29 MB)
-- Date: 2026-06-04
-- Purpose: Reclaim disk space by dropping redundant/unused indexes.
--
-- Space reclamation breakdown:
-- 1. Redundant index on app.network_threat_scores (~7.7 MB)
--    network_threat_scores_bssid_key is a unique constraint index on bssid.
-- 2. Redundant index on app.network_sibling_pairs (~288 kB)
--    network_sibling_pairs_pkey is a composite primary key index on (bssid1, bssid2).
-- 3. Unused composite index on app.observations (~21 MB)
--    Standard B-tree index on (lat, lon) is not used for geospatial queries.

BEGIN;

DROP INDEX IF EXISTS app.idx_network_threat_scores_bssid;
DROP INDEX IF EXISTS app.idx_network_sibling_pairs_bssid1;
DROP INDEX IF EXISTS app.idx_obs_lat_lon;

COMMIT;
