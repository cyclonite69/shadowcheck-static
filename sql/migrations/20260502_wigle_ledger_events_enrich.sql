-- Migration: 20260502_wigle_ledger_events_enrich.sql
-- Adds status, duration_ms, error_message, meta columns to app.wigle_ledger_events
-- so the ledger panel can show request outcomes alongside quota tracking.

SET search_path TO app, public;

ALTER TABLE app.wigle_ledger_events
    ADD COLUMN IF NOT EXISTS status        TEXT    NOT NULL DEFAULT 'success'
        CHECK (status IN ('success', 'error', 'rate_limited', 'skipped')),
    ADD COLUMN IF NOT EXISTS duration_ms   INTEGER,
    ADD COLUMN IF NOT EXISTS error_message TEXT,
    ADD COLUMN IF NOT EXISTS meta          JSONB   NOT NULL DEFAULT '{}';

-- Index for ledger panel queries (cursor pagination by timestamp + id)
CREATE INDEX IF NOT EXISTS idx_wigle_ledger_events_ts_id
    ON app.wigle_ledger_events (requested_at DESC, id DESC);
