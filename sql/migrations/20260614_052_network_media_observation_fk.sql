-- Migration: Add observation_id FK to app.network_media
-- 20260614_052_network_media_observation_fk.sql
--
-- Adds nullable observation_id so media can be scoped to a specific
-- observation in addition to (or instead of) the bssid-only scope.
-- ON DELETE SET NULL preserves media records when observations are removed.
-- Existing bssid-scoped queries are unaffected.

ALTER TABLE app.network_media
  ADD COLUMN IF NOT EXISTS observation_id BIGINT
    REFERENCES app.observations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_network_media_observation_id
  ON app.network_media (observation_id)
  WHERE observation_id IS NOT NULL;
