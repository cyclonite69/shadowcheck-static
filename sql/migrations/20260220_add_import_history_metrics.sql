-- Add before/after metrics snapshots and backup flag to import_history

ALTER TABLE app.import_history
  ADD COLUMN IF NOT EXISTS metrics_before JSONB,
  ADD COLUMN IF NOT EXISTS metrics_after  JSONB,
  ADD COLUMN IF NOT EXISTS backup_taken   BOOLEAN NOT NULL DEFAULT FALSE;
