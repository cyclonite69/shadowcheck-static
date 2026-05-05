-- Add source_id, camera_type, agency columns to app.deflock_cameras
-- Required for FLOCK repo import (import_flock_repo.py)

ALTER TABLE app.deflock_cameras
  ADD COLUMN IF NOT EXISTS source_id   TEXT,
  ADD COLUMN IF NOT EXISTS camera_type TEXT,
  ADD COLUMN IF NOT EXISTS agency      TEXT;

COMMENT ON COLUMN app.deflock_cameras.source_id   IS 'OSM ref or source system ID';
COMMENT ON COLUMN app.deflock_cameras.camera_type IS 'Camera type from source data (e.g. outdoor, dome)';
COMMENT ON COLUMN app.deflock_cameras.agency       IS 'Operating agency or operator name';
