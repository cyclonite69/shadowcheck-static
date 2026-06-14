-- Migration: Add sibling_group_id FK to network_notes and network_media
-- 20260614_054_sibling_group_scope.sql
--
-- Allows notes and media to be scoped directly to a sibling group
-- (in addition to the existing bssid-scoped records).
-- Nullable — all existing bssid-scoped records are unaffected.
-- ON DELETE CASCADE: removing a sibling pair removes its group-scoped items.
--
-- Depends on: 20260614_053_sibling_pairs_surrogate_pk.sql (id column required)

ALTER TABLE app.network_notes
  ADD COLUMN IF NOT EXISTS sibling_group_id BIGINT
    REFERENCES app.network_sibling_pairs(id) ON DELETE CASCADE;

ALTER TABLE app.network_media
  ADD COLUMN IF NOT EXISTS sibling_group_id BIGINT
    REFERENCES app.network_sibling_pairs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_network_notes_sibling_group_id
  ON app.network_notes (sibling_group_id)
  WHERE sibling_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_network_media_sibling_group_id
  ON app.network_media (sibling_group_id)
  WHERE sibling_group_id IS NOT NULL;
