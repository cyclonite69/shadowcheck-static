-- Idempotent migration to add WiGLE transaction metadata fields directly to app.kml_files
ALTER TABLE app.kml_files ADD COLUMN IF NOT EXISTS wigle_transid text;
ALTER TABLE app.kml_files ADD COLUMN IF NOT EXISTS wigle_file_name text;
ALTER TABLE app.kml_files ADD COLUMN IF NOT EXISTS wigle_uploaded_at timestamp with time zone;
ALTER TABLE app.kml_files ADD COLUMN IF NOT EXISTS wigle_status text;

CREATE UNIQUE INDEX IF NOT EXISTS kml_files_wigle_transid_idx ON app.kml_files (wigle_transid) WHERE wigle_transid IS NOT NULL;
