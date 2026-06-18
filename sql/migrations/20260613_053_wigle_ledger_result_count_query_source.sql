-- Migration: 20260613_053_wigle_ledger_result_count_query_source.sql
-- Adds result_count (zero-result dead zone signal), query_source (enrichment vs manual),
-- and retry_after_hint (WiGLE-supplied backoff hint from Retry-After header on 429s)
-- to app.wigle_ledger_events.

SET search_path TO app, public;

ALTER TABLE app.wigle_ledger_events
  ADD COLUMN IF NOT EXISTS result_count      INTEGER,
  ADD COLUMN IF NOT EXISTS query_source      TEXT
    CHECK (query_source IS NULL OR query_source IN ('manual', 'enrichment', 'import', 'sibling_trigger', 'scheduled')),
  ADD COLUMN IF NOT EXISTS retry_after_hint  INTEGER;  -- seconds from WiGLE Retry-After header

-- Partial index: zero-result queries are the primary coverage dead-zone signal
CREATE INDEX IF NOT EXISTS idx_wigle_ledger_zero_result
  ON app.wigle_ledger_events (requested_at DESC)
  WHERE result_count = 0;

COMMENT ON COLUMN app.wigle_ledger_events.result_count IS
  'Number of results returned by this query. 0 = explicit dead zone, NULL = not yet recorded or non-search kind.';
COMMENT ON COLUMN app.wigle_ledger_events.query_source IS
  'What triggered this request: manual, enrichment, import, sibling_trigger, scheduled.';
COMMENT ON COLUMN app.wigle_ledger_events.retry_after_hint IS
  'Seconds from WiGLE Retry-After response header on 429 responses. Used by self-tuning rate limiter.';
