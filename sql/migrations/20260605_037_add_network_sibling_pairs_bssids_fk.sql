BEGIN;

-- Add foreign key constraints on network_sibling_pairs referencing app.networks.
-- Preflight confirmed 0 orphans for both bssid1 and bssid2 on local dev.
-- Using ON DELETE CASCADE since sibling pairs are derived, rebuildable data
-- and cannot exist without both network endpoints.

ALTER TABLE app.network_sibling_pairs
ADD CONSTRAINT fk_network_sibling_pairs_bssid1
FOREIGN KEY (bssid1) REFERENCES app.networks(bssid)
ON DELETE CASCADE
NOT VALID;

ALTER TABLE app.network_sibling_pairs
ADD CONSTRAINT fk_network_sibling_pairs_bssid2
FOREIGN KEY (bssid2) REFERENCES app.networks(bssid)
ON DELETE CASCADE
NOT VALID;

COMMIT;
