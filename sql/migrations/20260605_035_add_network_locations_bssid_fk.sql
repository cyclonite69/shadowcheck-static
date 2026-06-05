BEGIN;

-- Add the first low-risk RI constraint identified by the PK/FK audit.
-- Pre-flight: 0 orphans confirmed for network_locations.bssid -> networks.bssid.
-- Validation is intentionally deferred to a later approved migration/step.

ALTER TABLE app.network_locations
ADD CONSTRAINT fk_network_locations_bssid
FOREIGN KEY (bssid) REFERENCES app.networks(bssid)
ON DELETE CASCADE
NOT VALID;

COMMIT;
