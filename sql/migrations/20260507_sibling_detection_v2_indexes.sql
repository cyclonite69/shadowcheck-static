-- Migration: 20260507_sibling_detection_v2_indexes.sql
-- Adds indexes to support mac_increment_v1 and band_pair_v1 detection queries.
-- Does NOT alter existing columns or drop anything.

SET search_path TO app, public;

CREATE INDEX IF NOT EXISTS idx_network_sibling_pairs_rule
  ON app.network_sibling_pairs (rule);

CREATE INDEX IF NOT EXISTS idx_network_sibling_pairs_pair_strength
  ON app.network_sibling_pairs (pair_strength);

CREATE INDEX IF NOT EXISTS idx_network_sibling_pairs_source
  ON app.network_sibling_pairs (source);
