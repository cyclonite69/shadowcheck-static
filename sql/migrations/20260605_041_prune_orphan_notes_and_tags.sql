BEGIN;

-- Prune orphan network notes that do not reference any valid BSSID in app.networks.
-- Preflight confirmed 1 orphan note:
--   id=16, bssid='00:11:22:33:44:55', content='Test note'
-- Preflight confirmed 0 note_media attachments for the orphan note.
DELETE FROM app.network_notes nt
WHERE NOT EXISTS (
  SELECT 1
  FROM app.networks n
  WHERE n.bssid = nt.bssid
);

-- Prune orphan network tags that do not reference any valid BSSID in app.networks.
-- Preflight confirmed 6 orphan tags:
--   AA:BB:CC:DD:EE:FF
--   BB:CC:DD:EE:FF:00
--   00:11:22:33:44:55
--   UNKNOWN-249
--   UNKNOWN-250
--   UNKNOWN-251
DELETE FROM app.network_tags nt
WHERE NOT EXISTS (
  SELECT 1
  FROM app.networks n
  WHERE n.bssid = nt.bssid
);

COMMIT;
