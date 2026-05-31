-- Migration: 20260531_031_add_surveillance_oui_metadata.sql
-- Description: Adds surveillance metadata columns to oui_device_groups and seeds target OUI groups.

SET search_path TO app, public;

-- 1. ADD COLUMN surveillance_type to app.oui_device_groups
ALTER TABLE app.oui_device_groups
  ADD COLUMN IF NOT EXISTS surveillance_type character varying(50) NULL;

-- 2. ADD COLUMN surveillance_confidence to app.oui_device_groups
ALTER TABLE app.oui_device_groups
  ADD COLUMN IF NOT EXISTS surveillance_confidence character varying(20) NULL;

-- 3. ADD INDEX on (surveillance_type, surveillance_confidence)
CREATE INDEX IF NOT EXISTS idx_oui_device_groups_surveillance
  ON app.oui_device_groups (surveillance_type, surveillance_confidence);

-- 4. Seed all target OUIs using ON CONFLICT (oui) DO UPDATE.
-- Precedence: Battery OUI must win as 'FS_EXT_BATTERY' not 'FLOCK_SAFETY_CAMERA'.
-- To do this, we insert the general camera list first, then the battery/axon/motorola/shotspotter lists.

-- A. Seed high-confidence Flock Safety cameras (surveillance_type = 'FLOCK_SAFETY_CAMERA', surveillance_confidence = 'HIGH')
INSERT INTO app.oui_device_groups (oui, surveillance_type, surveillance_confidence, vendor_name)
VALUES
  ('70:C9:4E', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('3C:91:80', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('D8:F3:BC', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('80:30:49', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('B8:35:32', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('14:5A:FC', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('74:4C:A1', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('08:3A:88', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('9C:2F:9D', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('C0:35:32', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('94:08:53', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('E4:AA:EA', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('24:B2:B9', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('B8:1E:A4', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('70:08:94', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('58:8E:81', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('EC:1B:BD', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('3C:71:BF', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('58:00:E3', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('90:35:EA', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('5C:93:A2', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('64:6E:69', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('48:27:EA', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('A4:CF:12', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('82:6B:F2', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('CC:CC:CC', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('04:0D:84', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('F0:82:C0', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('1C:34:F1', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('38:5B:44', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('94:34:69', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('B4:E3:F9', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety'),
  ('B4:1E:52', 'FLOCK_SAFETY_CAMERA', 'HIGH', 'Flock Safety')
ON CONFLICT (oui) DO UPDATE SET
  surveillance_type = EXCLUDED.surveillance_type,
  surveillance_confidence = EXCLUDED.surveillance_confidence,
  vendor_name = COALESCE(app.oui_device_groups.vendor_name, EXCLUDED.vendor_name),
  last_updated = NOW();

-- B. Seed medium-confidence cameras (surveillance_type = 'FLOCK_SAFETY_CAMERA', surveillance_confidence = 'MEDIUM')
INSERT INTO app.oui_device_groups (oui, surveillance_type, surveillance_confidence, vendor_name)
VALUES
  ('F4:6A:DD', 'FLOCK_SAFETY_CAMERA', 'MEDIUM', 'contract_mfr'),
  ('F8:A2:D6', 'FLOCK_SAFETY_CAMERA', 'MEDIUM', 'contract_mfr'),
  ('E0:0A:F6', 'FLOCK_SAFETY_CAMERA', 'MEDIUM', 'contract_mfr'),
  ('00:F4:8D', 'FLOCK_SAFETY_CAMERA', 'MEDIUM', 'contract_mfr'),
  ('D0:39:57', 'FLOCK_SAFETY_CAMERA', 'MEDIUM', 'contract_mfr'),
  ('E8:D0:FC', 'FLOCK_SAFETY_CAMERA', 'MEDIUM', 'contract_mfr'),
  ('E0:4F:43', 'FLOCK_SAFETY_CAMERA', 'MEDIUM', 'contract_mfr')
ON CONFLICT (oui) DO UPDATE SET
  surveillance_type = EXCLUDED.surveillance_type,
  surveillance_confidence = EXCLUDED.surveillance_confidence,
  vendor_name = COALESCE(app.oui_device_groups.vendor_name, EXCLUDED.vendor_name),
  last_updated = NOW();

-- C. Seed ShotSpotter sensors (surveillance_type = 'SHOTSPOTTER_SENSOR', surveillance_confidence = 'HIGH')
INSERT INTO app.oui_device_groups (oui, surveillance_type, surveillance_confidence, vendor_name)
VALUES
  ('D4:11:D6', 'SHOTSPOTTER_SENSOR', 'HIGH', 'ShotSpotter Inc. / SoundThinking')
ON CONFLICT (oui) DO UPDATE SET
  surveillance_type = EXCLUDED.surveillance_type,
  surveillance_confidence = EXCLUDED.surveillance_confidence,
  vendor_name = COALESCE(app.oui_device_groups.vendor_name, EXCLUDED.vendor_name),
  last_updated = NOW();

-- D. Seed Axon body cameras (surveillance_type = 'AXON_BODY_CAMERA', surveillance_confidence = 'HIGH')
INSERT INTO app.oui_device_groups (oui, surveillance_type, surveillance_confidence, vendor_name)
VALUES
  ('00:25:DF', 'AXON_BODY_CAMERA', 'HIGH', 'Axon Enterprise'),
  ('08:FB:EA', 'AXON_BODY_CAMERA', 'HIGH', 'Axon Enterprise'),
  ('54:78:C9', 'AXON_BODY_CAMERA', 'HIGH', 'Axon Enterprise'),
  ('70:F7:54', 'AXON_BODY_CAMERA', 'HIGH', 'Axon Enterprise'),
  ('B8:13:32', 'AXON_BODY_CAMERA', 'HIGH', 'Axon Enterprise')
ON CONFLICT (oui) DO UPDATE SET
  surveillance_type = EXCLUDED.surveillance_type,
  surveillance_confidence = EXCLUDED.surveillance_confidence,
  vendor_name = COALESCE(app.oui_device_groups.vendor_name, EXCLUDED.vendor_name),
  last_updated = NOW();

-- E. Seed Motorola body-worn cameras (surveillance_type = 'MOTOROLA_BWC', surveillance_confidence = 'HIGH')
INSERT INTO app.oui_device_groups (oui, surveillance_type, surveillance_confidence, vendor_name)
VALUES
  ('00:04:7D', 'MOTOROLA_BWC', 'HIGH', 'Motorola Solutions'),
  ('00:18:85', 'MOTOROLA_BWC', 'HIGH', 'Motorola Solutions'),
  ('00:1F:92', 'MOTOROLA_BWC', 'HIGH', 'Motorola Solutions'),
  ('4C:CC:34', 'MOTOROLA_BWC', 'HIGH', 'Motorola Solutions')
ON CONFLICT (oui) DO UPDATE SET
  surveillance_type = EXCLUDED.surveillance_type,
  surveillance_confidence = EXCLUDED.surveillance_confidence,
  vendor_name = COALESCE(app.oui_device_groups.vendor_name, EXCLUDED.vendor_name),
  last_updated = NOW();

-- F. Seed FS external batteries (surveillance_type = 'FS_EXT_BATTERY', surveillance_confidence = 'HIGH')
-- Note: These OUIs are subsets of HIGH_CONF_OUIS. Upserting them last guarantees they carry the correct sub-type.
INSERT INTO app.oui_device_groups (oui, surveillance_type, surveillance_confidence, vendor_name)
VALUES
  ('58:8E:81', 'FS_EXT_BATTERY', 'HIGH', 'Flock Safety'),
  ('EC:1B:BD', 'FS_EXT_BATTERY', 'HIGH', 'Flock Safety'),
  ('90:35:EA', 'FS_EXT_BATTERY', 'HIGH', 'Flock Safety'),
  ('CC:CC:CC', 'FS_EXT_BATTERY', 'HIGH', 'Flock Safety'),
  ('04:0D:84', 'FS_EXT_BATTERY', 'HIGH', 'Flock Safety'),
  ('F0:82:C0', 'FS_EXT_BATTERY', 'HIGH', 'Flock Safety'),
  ('1C:34:F1', 'FS_EXT_BATTERY', 'HIGH', 'Flock Safety'),
  ('38:5B:44', 'FS_EXT_BATTERY', 'HIGH', 'Flock Safety'),
  ('94:34:69', 'FS_EXT_BATTERY', 'HIGH', 'Flock Safety'),
  ('B4:E3:F9', 'FS_EXT_BATTERY', 'HIGH', 'Flock Safety')
ON CONFLICT (oui) DO UPDATE SET
  surveillance_type = EXCLUDED.surveillance_type,
  surveillance_confidence = EXCLUDED.surveillance_confidence,
  vendor_name = COALESCE(app.oui_device_groups.vendor_name, EXCLUDED.vendor_name),
  last_updated = NOW();

-- ROLLBACK (data only — does not drop columns):
-- UPDATE app.oui_device_groups SET surveillance_type = NULL, surveillance_confidence = NULL
-- WHERE oui IN (
--   '70:C9:4E','3C:91:80','D8:F3:BC','80:30:49','B8:35:32','14:5A:FC','74:4C:A1','08:3A:88',
--   '9C:2F:9D','C0:35:32','94:08:53','E4:AA:EA','24:B2:B9','B8:1E:A4','70:08:94','58:8E:81',
--   'EC:1B:BD','3C:71:BF','58:00:E3','90:35:EA','5C:93:A2','64:6E:69','48:27:EA','A4:CF:12',
--   '82:6B:F2','CC:CC:CC','04:0D:84','F0:82:C0','1C:34:F1','38:5B:44','94:34:69','B4:E3:F9',
--   'B4:1E:52','F4:6A:DD','F8:A2:D6','E0:0A:F6','00:F4:8D','D0:39:57','E8:D0:FC','E0:4F:43',
--   'D4:11:D6','00:25:DF','08:FB:EA','54:78:C9','70:F7:54','B8:13:32',
--   '00:04:7D','00:18:85','00:1F:92','4C:CC:34'
-- );
