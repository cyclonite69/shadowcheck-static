-- Migration: Drop unused indexes from core tables (observations, networks)
-- Date: 2026-04-16
-- Purpose: Reclaim ~92 MB of disk space from unused indexes on core tables
--
-- These indexes were identified via pg_stat_user_indexes with idx_scan = 0
--
-- Space reclamation breakdown:
-- - observations table: 84 MB (9 indexes)
-- - networks table: 8 MB (5 indexes)
--
-- VERIFICATION STEPS BEFORE RUNNING:
-- 1. Run on read replica first to validate query performance (24-48 hours)
-- 2. Monitor query plans for any sequential scans that previously used these indexes
-- 3. Check application logs for any slow query alerts
-- 4. If regression detected, ROLLBACK this migration
--
-- ROLLBACK PLAN:
-- If you need to restore these indexes, refer to schema backups or
-- reconstruct from git history at commit before this migration.
-- Reconstruction will take significant time; test on non-prod first.

BEGIN;

-- =============================================================================
-- OBSERVATIONS TABLE INDEXES (84 MB total, 9 indexes)
-- =============================================================================
DROP INDEX IF EXISTS app.idx_observations_bssid_time;           -- 30 MB
DROP INDEX IF EXISTS app.idx_obs_time_lat_lon;                 -- 25 MB
DROP INDEX IF EXISTS app.idx_observations_bssid_geom_not_null; -- 11 MB
DROP INDEX IF EXISTS app.idx_observations_v2_observed_at_ms;   -- 9360 kB
DROP INDEX IF EXISTS app.idx_observations_recent_covering;     -- 7496 kB
DROP INDEX IF EXISTS app.idx_observations_high_accuracy_recent;-- 6400 kB
DROP INDEX IF EXISTS app.idx_observations_v2_radio_frequency;  -- 4464 kB
DROP INDEX IF EXISTS app.idx_obs_quality_filtered;             -- 408 kB
DROP INDEX IF EXISTS app.idx_observations_observed_at_ms_brin; -- 24 kB

-- =============================================================================
-- NETWORKS TABLE INDEXES (8 MB total, 5 indexes)
-- =============================================================================
DROP INDEX IF EXISTS app.idx_networks_threat_score_v2;  -- 4264 kB
DROP INDEX IF EXISTS app.idx_networks_ssid_upper;       -- 2040 kB
DROP INDEX IF EXISTS app.idx_networks_threat_level;     -- 1320 kB
DROP INDEX IF EXISTS app.idx_networks_wigle_count;      -- 32 kB
DROP INDEX IF EXISTS app.idx_networks_ml_threat_score;  -- 8192 bytes

COMMIT;

-- =============================================================================
-- POST-MIGRATION VALIDATION
-- =============================================================================
-- After applying this migration, run:
--
-- SELECT COUNT(*) as remaining_unused_indexes
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'app'
--   AND idx_scan = 0
--   AND indexrelname NOT LIKE '%_pkey'
--   AND relname NOT LIKE 'kismet%'
--   AND relname IN ('observations', 'networks');
--
-- Expected result: 0
--
-- Monitor query performance for 24-48 hours for any degradation,
-- especially on these core operations:
-- - Network search/filter queries
-- - Observation time-range queries
-- - BSSID lookups
--
-- If sequential scans increase significantly, consider rebuilding specific indexes.
