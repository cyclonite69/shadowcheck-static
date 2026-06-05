BEGIN;

-- Add FK from network_notes.bssid to networks.bssid.
-- 041 pruned orphan notes first.
-- Using ON DELETE CASCADE because notes are attached to a specific network.
-- bssid is NOT NULL, so SET NULL is not applicable.

ALTER TABLE app.network_notes
ADD CONSTRAINT fk_network_notes_bssid
FOREIGN KEY (bssid) REFERENCES app.networks(bssid)
ON DELETE CASCADE
NOT VALID;

-- Add FK from network_tags.bssid to networks.bssid.
-- 041 pruned orphan tags first.
-- Using ON DELETE CASCADE because tags are attached to a specific network.
-- bssid is NOT NULL, so SET NULL is not applicable.

ALTER TABLE app.network_tags
ADD CONSTRAINT fk_network_tags_bssid
FOREIGN KEY (bssid) REFERENCES app.networks(bssid)
ON DELETE CASCADE
NOT VALID;

COMMIT;
