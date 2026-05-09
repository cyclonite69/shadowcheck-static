-- Migration: 20260509_003_sibling_run_tracking.sql
-- Adds run tracking table and links each sibling pair to its originating run.

SET search_path TO app, public;

CREATE TABLE IF NOT EXISTS app.sibling_runs (
  id                serial PRIMARY KEY,
  started_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  status            text NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running','completed','failed','truncated')),
  run_mode          text NOT NULL DEFAULT 'full'
                    CHECK (run_mode IN ('full','incremental','test')),
  max_octet_delta   integer NOT NULL,
  min_confidence    numeric NOT NULL,
  batch_size        integer,
  max_batches       integer,
  networks_scanned  integer,
  pairs_inserted    integer,
  pairs_updated     integer,
  notes             text
);

ALTER TABLE app.network_sibling_pairs
  ADD COLUMN IF NOT EXISTS run_id integer REFERENCES app.sibling_runs(id);

-- Rename octet_delta_max to run_max_octet_delta to clarify it stores
-- the run parameter ceiling, not the observed delta.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'app'
      AND table_name = 'network_sibling_pairs'
      AND column_name = 'octet_delta_max'
  ) THEN
    ALTER TABLE app.network_sibling_pairs
      RENAME COLUMN octet_delta_max TO run_max_octet_delta;
  END IF;
END $$;

-- Store the run min_confidence threshold as a per-row audit column.
ALTER TABLE app.network_sibling_pairs
  ADD COLUMN IF NOT EXISTS run_min_confidence numeric;
