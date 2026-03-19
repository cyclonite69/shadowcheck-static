-- 20260318_background_job_runs.sql
-- Persist background job execution history for the admin Jobs tab.
-- Archived after folding into 20260216_consolidated_004_network_analysis.sql

CREATE TABLE IF NOT EXISTS app.background_job_runs (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  cron TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT background_job_runs_job_name_check
    CHECK (job_name IN ('backup', 'mlScoring', 'mvRefresh')),
  CONSTRAINT background_job_runs_status_check
    CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_background_job_runs_job_name_started_at
  ON app.background_job_runs (job_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_background_job_runs_status
  ON app.background_job_runs (status, started_at DESC);

GRANT SELECT, INSERT, UPDATE ON TABLE app.background_job_runs TO shadowcheck_user;
GRANT USAGE, SELECT ON SEQUENCE app.background_job_runs_id_seq TO shadowcheck_user;
