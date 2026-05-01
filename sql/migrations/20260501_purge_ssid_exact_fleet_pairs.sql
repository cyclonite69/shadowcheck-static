-- Purge stale ssid_exact (probabilistic) pairs where both sides have fleet SSIDs.
--
-- These were created before the fleet SSID exclusion was added to the probabilistic
-- 'c' CTE. The current find_sibling_radios function correctly excludes them, but
-- the ON CONFLICT DO UPDATE in refresh_network_sibling_pairs was updating their
-- confidence scores from stale data, keeping them alive.
--
-- The specific pattern: mdt ↔ mdt pairs where first 4 octets match but octet 5
-- differs (e.g. 00:14:3E:9C:DC:60 ↔ 00:14:3E:9C:DD:60). These are two different
-- physical units sharing a fleet SSID — not siblings.
--
-- Rule: for fleet SSIDs, a valid sibling pair requires first 5 octets identical
-- (last_octet_sequential). If octet 5 differs, they are different units.

BEGIN;

WITH deleted AS (
  DELETE FROM app.network_sibling_pairs p
  USING app.networks na, app.networks nb
  WHERE p.bssid1 = na.bssid
    AND p.bssid2 = nb.bssid
    -- Both sides have fleet SSIDs
    AND lower(regexp_replace(coalesce(na.ssid, ''), '[^a-z0-9]+', '', 'g')) IN (
      'greatlakesmobile','mdt','xfinitywifi','xfinitymobile',
      'mtasmartbus','kajeetsmartbus','somguest','somiot'
    )
    AND lower(regexp_replace(coalesce(nb.ssid, ''), '[^a-z0-9]+', '', 'g')) IN (
      'greatlakesmobile','mdt','xfinitywifi','xfinitymobile',
      'mtasmartbus','kajeetsmartbus','somguest','somiot'
    )
    -- And first 5 octets do NOT all match (i.e. octet 5 differs — different units)
    AND NOT (
      upper(split_part(na.bssid, ':', 1)) = upper(split_part(nb.bssid, ':', 1))
      AND upper(split_part(na.bssid, ':', 2)) = upper(split_part(nb.bssid, ':', 2))
      AND upper(split_part(na.bssid, ':', 3)) = upper(split_part(nb.bssid, ':', 3))
      AND upper(split_part(na.bssid, ':', 4)) = upper(split_part(nb.bssid, ':', 4))
      AND upper(split_part(na.bssid, ':', 5)) = upper(split_part(nb.bssid, ':', 5))
    )
  RETURNING p.bssid1, p.bssid2, p.rule
)
SELECT COUNT(*) AS rows_deleted FROM deleted;

COMMIT;
