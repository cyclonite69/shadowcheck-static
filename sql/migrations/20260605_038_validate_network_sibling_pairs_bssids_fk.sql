BEGIN;

-- Validate sibling-pair endpoint FKs after 037 added them as NOT VALID.
-- Preflight confirmed 0 orphan rows for both bssid1 and bssid2.

ALTER TABLE app.network_sibling_pairs
VALIDATE CONSTRAINT fk_network_sibling_pairs_bssid1;

ALTER TABLE app.network_sibling_pairs
VALIDATE CONSTRAINT fk_network_sibling_pairs_bssid2;

COMMIT;
