BEGIN;

-- Validate foreign key constraints on network_notes and network_tags.
-- 041 pruned orphan notes and tags, and 042 added constraints as NOT VALID.

ALTER TABLE app.network_notes
VALIDATE CONSTRAINT fk_network_notes_bssid;

ALTER TABLE app.network_tags
VALIDATE CONSTRAINT fk_network_tags_bssid;

COMMIT;
