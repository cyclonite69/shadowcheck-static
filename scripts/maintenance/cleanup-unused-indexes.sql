-- ============================================================================
-- DATABASE MAINTENANCE: UNUSED INDEX CLEANUP
-- ShadowCheck SIGINT Forensics Platform
-- ============================================================================
--
-- Purpose: Reclaim disk space by removing redundant or unused indexes.
--
-- Methodology:
-- 1. Identify indexes with zero scans (idx_scan = 0)
-- 2. Identify duplicate indexes (same columns, different names)
-- 3. Identify overlapping indexes (one index is a prefix of another)
--
-- IMPORTANT: Review this script before execution. Some indexes may be 
--            newly created and not yet scanned by the planner.
-- ============================================================================

BEGIN;

-- 1. Redundant Geometry Indexes on app.observations
-- We have both idx_obs_geom_gist and idx_observations_geom_gist.
-- Keeping the one consistent with v2 naming.
DROP INDEX IF EXISTS app.idx_obs_geom_gist;

-- 2. Potentially unused forensic indexes (to be verified via live audit)
-- These are often candidates for removal if seq_scans are preferred by the planner.
-- DROP INDEX IF EXISTS app.idx_networks_mfgrid;
-- DROP INDEX IF EXISTS app.idx_observations_source_tag;

-- 3. Duplicate BSSID indexes on child tables (if any remain)
-- Many child tables have PKs on bssid, so additional indexes are redundant.

-- 4. Orphan search optimization (already added in latest migration)
-- CREATE INDEX IF NOT EXISTS idx_networks_orphans_ssid_trgm ON app.networks_orphans USING gin (ssid gin_trgm_ops);

COMMIT;

\echo 'Redundant index cleanup script complete. Run with live stats for full optimization.'
