-- Migration: FCC celltower import audit log and reconciliation materialized views
-- Date: 2026-04-16
-- Purpose:
--   1. Add FCC import audit tracking
--   2. Create canonical FCC tower materialized view
--   3. Create observation-to-nearest-FCC-tower reconciliation materialized view

CREATE TABLE IF NOT EXISTS app.fcc_asr_import_runs (
  run_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  source_file   text,
  rows_upserted integer,
  status        text NOT NULL DEFAULT 'running',
  error_text    text
);

GRANT SELECT, INSERT, UPDATE ON app.fcc_asr_import_runs TO shadowcheck_user;

CREATE MATERIALIZED VIEW IF NOT EXISTS app.mv_fcc_towers_canonical AS
SELECT DISTINCT ON (s.asr_number)
  s.asr_number,
  s.latitude,
  s.longitude,
  s.location,
  s.owner_name,
  s.state,
  s.city,
  s.structure_type_code,
  s.overall_height_agl_m,
  s.status_code
FROM app.fcc_asr_structures s
WHERE s.location IS NOT NULL
ORDER BY s.asr_number, s.imported_at DESC;

CREATE UNIQUE INDEX IF NOT EXISTS mv_fcc_towers_canonical_asr_idx
  ON app.mv_fcc_towers_canonical (asr_number);

CREATE INDEX IF NOT EXISTS mv_fcc_towers_canonical_location_idx
  ON app.mv_fcc_towers_canonical USING GIST (location);

GRANT SELECT ON app.mv_fcc_towers_canonical TO shadowcheck_user;

CREATE MATERIALIZED VIEW IF NOT EXISTS app.mv_fcc_tower_matches AS
SELECT DISTINCT ON (o.id)
  o.id                                                   AS observation_id,
  t.asr_number                                           AS tower_asr_number,
  t.owner_name,
  t.structure_type_code,
  t.overall_height_agl_m,
  ST_Distance(o.geom::geography, t.location::geography)  AS distance_m,
  CASE
    WHEN ST_Distance(o.geom::geography, t.location::geography) < 500
      THEN 'high_confidence_match'
    WHEN ST_Distance(o.geom::geography, t.location::geography) < 1500
      THEN 'partial_registry_match'
    ELSE 'dataset_inconsistency_zone'
  END                                                    AS classification
FROM app.observations o
JOIN LATERAL (
  SELECT *
  FROM app.mv_fcc_towers_canonical t
  ORDER BY t.location <-> o.geom::geography
  LIMIT 1
) t
  ON ST_Distance(o.geom::geography, t.location::geography) < 2000
WHERE o.geom IS NOT NULL
ORDER BY o.id, distance_m;

CREATE UNIQUE INDEX IF NOT EXISTS mv_fcc_tower_matches_obs_idx
  ON app.mv_fcc_tower_matches (observation_id);

CREATE INDEX IF NOT EXISTS mv_fcc_tower_matches_tower_idx
  ON app.mv_fcc_tower_matches (tower_asr_number);

CREATE INDEX IF NOT EXISTS mv_fcc_tower_matches_class_idx
  ON app.mv_fcc_tower_matches (classification);

GRANT SELECT ON app.mv_fcc_tower_matches TO shadowcheck_user;
