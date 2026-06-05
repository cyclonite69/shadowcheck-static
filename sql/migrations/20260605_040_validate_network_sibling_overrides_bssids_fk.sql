BEGIN;

-- Validate sibling override endpoint FKs after 039 added them as NOT VALID.
-- Preflight confirmed 0 orphan rows for both bssid1 and bssid2.

ALTER TABLE app.network_sibling_overrides
VALIDATE CONSTRAINT fk_network_sibling_overrides_bssid1;

ALTER TABLE app.network_sibling_overrides
VALIDATE CONSTRAINT fk_network_sibling_overrides_bssid2;

COMMIT;
