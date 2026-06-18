-- Migration: 20260613_057_wigle_ledger_query_url_params.sql
-- Adds query_url (full endpoint URL, no credentials) and query_params (structured JSONB)
-- to app.wigle_ledger_events for request provenance.

SET search_path TO app, public;

ALTER TABLE app.wigle_ledger_events
  ADD COLUMN IF NOT EXISTS query_url    TEXT,
  ADD COLUMN IF NOT EXISTS query_params JSONB;

COMMENT ON COLUMN app.wigle_ledger_events.query_url IS
  'Full URL sent to WiGLE API (no credentials). Stored at INSERT time before the HTTP call.';
COMMENT ON COLUMN app.wigle_ledger_events.query_params IS
  'Structured query parameters extracted from the URL. Enables replay and coverage analysis.';
