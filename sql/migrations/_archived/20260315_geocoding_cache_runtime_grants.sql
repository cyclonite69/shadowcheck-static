-- ============================================================================
-- Migration: Geocoding cache runtime grants
-- Date: 2026-03-15
-- Purpose: Ensure the runtime app role can seed and update geocoding_cache.
-- Archived after folding into 20260216_consolidated_010_performance_indexes.sql
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON TABLE app.geocoding_cache TO shadowcheck_user;
GRANT USAGE, SELECT ON SEQUENCE app.geocoding_cache_id_seq TO shadowcheck_user;
