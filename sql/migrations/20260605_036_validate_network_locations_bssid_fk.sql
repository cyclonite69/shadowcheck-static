BEGIN;

-- Validate the first network_locations -> networks RI constraint.
-- Preflight confirmed 0 orphan rows on local dev:
-- app.network_locations.bssid -> app.networks.bssid.
-- This validates existing historical rows after the FK was added as NOT VALID.

ALTER TABLE app.network_locations
VALIDATE CONSTRAINT fk_network_locations_bssid;

COMMIT;
