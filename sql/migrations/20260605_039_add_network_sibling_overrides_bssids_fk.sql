BEGIN;

-- Add foreign key constraints on network_sibling_overrides referencing app.networks.
-- Preflight confirmed 0 orphans for both bssid1 and bssid2 on local dev.
-- Using ON DELETE CASCADE since sibling overrides are only useful if the
-- referenced networks exist, and should be cleaned up if a network is physically deleted.
-- bssid1 and bssid2 are NOT NULL primary-key columns, so SET NULL is not applicable.

ALTER TABLE app.network_sibling_overrides
ADD CONSTRAINT fk_network_sibling_overrides_bssid1
FOREIGN KEY (bssid1) REFERENCES app.networks(bssid)
ON DELETE CASCADE
NOT VALID;

ALTER TABLE app.network_sibling_overrides
ADD CONSTRAINT fk_network_sibling_overrides_bssid2
FOREIGN KEY (bssid2) REFERENCES app.networks(bssid)
ON DELETE CASCADE
NOT VALID;

COMMIT;
