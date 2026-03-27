-- Purpose: Persist resumable WiGLE search import runs and per-page progress logs

CREATE TABLE IF NOT EXISTS app.wigle_import_runs (
    id bigserial PRIMARY KEY,
    source text NOT NULL DEFAULT 'wigle',
    api_version text NOT NULL DEFAULT 'v2',
    search_term text NOT NULL DEFAULT '',
    state text,
    request_fingerprint text NOT NULL,
    request_params jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'paused', 'failed', 'completed', 'cancelled')),
    api_total_results integer,
    page_size integer NOT NULL DEFAULT 100 CHECK (page_size > 0),
    total_pages integer,
    last_successful_page integer NOT NULL DEFAULT 0 CHECK (last_successful_page >= 0),
    next_page integer NOT NULL DEFAULT 1 CHECK (next_page >= 1),
    pages_fetched integer NOT NULL DEFAULT 0 CHECK (pages_fetched >= 0),
    rows_returned integer NOT NULL DEFAULT 0 CHECK (rows_returned >= 0),
    rows_inserted integer NOT NULL DEFAULT 0 CHECK (rows_inserted >= 0),
    api_cursor text,
    last_error text,
    started_at timestamptz NOT NULL DEFAULT now(),
    last_attempted_at timestamptz,
    completed_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wigle_import_runs_started_at
    ON app.wigle_import_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_wigle_import_runs_status_started_at
    ON app.wigle_import_runs (status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_wigle_import_runs_fingerprint_started_at
    ON app.wigle_import_runs (request_fingerprint, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_wigle_import_runs_state_started_at
    ON app.wigle_import_runs (state, started_at DESC);

COMMENT ON TABLE app.wigle_import_runs IS
    'Persistent resumable WiGLE import runs for API search pagination.';
COMMENT ON COLUMN app.wigle_import_runs.search_term IS
    'Primary query term for operator display, typically SSID or BSSID.';
COMMENT ON COLUMN app.wigle_import_runs.request_fingerprint IS
    'Stable hash of normalized request params used to locate resumable runs.';

CREATE TABLE IF NOT EXISTS app.wigle_import_run_pages (
    id bigserial PRIMARY KEY,
    run_id bigint NOT NULL REFERENCES app.wigle_import_runs(id) ON DELETE CASCADE,
    page_number integer NOT NULL CHECK (page_number >= 1),
    request_cursor text,
    next_cursor text,
    fetched_at timestamptz NOT NULL DEFAULT now(),
    rows_returned integer NOT NULL DEFAULT 0 CHECK (rows_returned >= 0),
    rows_inserted integer NOT NULL DEFAULT 0 CHECK (rows_inserted >= 0),
    success boolean NOT NULL DEFAULT true,
    error_message text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT wigle_import_run_pages_unique UNIQUE (run_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_wigle_import_run_pages_run_fetched_at
    ON app.wigle_import_run_pages (run_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_wigle_import_run_pages_run_success_page
    ON app.wigle_import_run_pages (run_id, success, page_number);

COMMENT ON TABLE app.wigle_import_run_pages IS
    'Per-page audit log for resumable WiGLE import runs.';

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE app.wigle_import_runs TO shadowcheck_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE app.wigle_import_run_pages TO shadowcheck_user;
GRANT USAGE, SELECT ON SEQUENCE app.wigle_import_runs_id_seq TO shadowcheck_user;
GRANT USAGE, SELECT ON SEQUENCE app.wigle_import_run_pages_id_seq TO shadowcheck_user;
