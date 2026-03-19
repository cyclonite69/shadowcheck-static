-- ============================================================================
-- Migration: Geocoding queue indexes
-- Date: 2026-03-15
-- Purpose: Speed pending geocoding queue scans now that geocoding_cache acts
--          as the durable work queue for address and POI enrichment.
-- Archived after folding into 20260216_consolidated_010_performance_indexes.sql
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_geocoding_cache_pending_address
  ON app.geocoding_cache (precision, address_attempts, geocoded_at, id)
  WHERE address IS NULL;

CREATE INDEX IF NOT EXISTS idx_geocoding_cache_pending_poi
  ON app.geocoding_cache (precision, poi_attempts, geocoded_at, id)
  WHERE address IS NOT NULL
    AND poi_name IS NULL
    AND poi_skip IS FALSE;
