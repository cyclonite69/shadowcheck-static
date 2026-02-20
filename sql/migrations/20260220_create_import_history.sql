-- Import history audit log
-- Records every SQLite import run with counts and timing.

CREATE TABLE IF NOT EXISTS app.import_history (
  id           SERIAL PRIMARY KEY,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at  TIMESTAMPTZ,
  source_tag   TEXT NOT NULL,
  filename     TEXT,
  imported     INTEGER,
  failed       INTEGER,
  duration_s   NUMERIC(10, 2),
  status       TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  error_detail TEXT
);

CREATE INDEX IF NOT EXISTS idx_import_history_source_tag  ON app.import_history (source_tag);
CREATE INDEX IF NOT EXISTS idx_import_history_started_at  ON app.import_history (started_at DESC);
