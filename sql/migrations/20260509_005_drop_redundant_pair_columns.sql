-- Migration: 20260509_005_drop_redundant_pair_columns.sql
-- Removes redundant run-level parameters from network_sibling_pairs.
-- These are already stored on sibling_runs and accessible via run_id FK.

SET search_path TO app, public;

ALTER TABLE app.network_sibling_pairs
  DROP COLUMN IF EXISTS run_max_octet_delta,
  DROP COLUMN IF EXISTS run_min_confidence;
