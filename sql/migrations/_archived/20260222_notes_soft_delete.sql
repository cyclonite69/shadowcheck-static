-- Migration: add is_deleted flag to app.network_notes for soft-delete support
-- Part of notes-system consolidation (Priority 2b)

ALTER TABLE app.network_notes
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT FALSE;

-- Index for filtering active notes efficiently
CREATE INDEX IF NOT EXISTS idx_network_notes_bssid_active
  ON app.network_notes (bssid)
  WHERE is_deleted = FALSE;
