-- Migration: 20260601_032_seed_sigint_surveillance_ouis.sql
-- Description: Seeds SIGINT and defense surveillance OUI classifications into oui_device_groups.

SET search_path TO app, public;

-- The current app.oui_device_groups.oui contract is colonized 24-bit OUI text
-- such as '00:06:EC' stored in varchar(8). Do not truncate longer MA-S/IAB
-- prefixes into their parent 24-bit RA blocks.
--
-- Excluded for separate handling because they are 36-bit / 9-hex prefixes:
-- - Septier:          00:50:C2:2A:5 / 0050C22A5
-- - Norsat:           70:B3:D5:0A:E / 70B3D50AE
-- - Rockwell Collins: 70:B3:D5:83:9 / 70B3D5839
--
-- Excluded as malformed source data:
-- - 00:50:C2:B0:4

-- Tier 1: high-confidence SIGINT/intercept vendors.
INSERT INTO app.oui_device_groups (oui, surveillance_type, surveillance_confidence, vendor_name)
VALUES
  ('00:06:EC', 'L3HARRIS_STINGRAY', 'HIGH', 'L3Harris'),
  ('00:17:F3', 'L3HARRIS_STINGRAY', 'HIGH', 'L3Harris'),
  ('00:10:27', 'L3HARRIS_STINGRAY', 'HIGH', 'L3Harris'),
  ('00:00:8F', 'RAYTHEON_ESYSTEMS', 'HIGH', 'Raytheon E-Systems'),
  ('00:E0:E7', 'RAYTHEON_ESYSTEMS', 'HIGH', 'Raytheon E-Systems'),
  ('00:07:9A', 'VERINT_INTERCEPT', 'HIGH', 'Verint Systems'),
  ('00:0D:40', 'VERINT_LORONIX', 'HIGH', 'Verint Loronix Video Solutions'),
  ('20:ED:74', 'ABILITY_INTERCEPT', 'HIGH', 'Ability Inc'),
  ('00:90:B8', 'ROHDE_SCHWARZ_WLAN', 'HIGH', 'Rohde & Schwarz'),
  ('A4:7C:1F', 'COBHAM_SIGINT', 'HIGH', 'Cobham PLC')
ON CONFLICT (oui) DO UPDATE SET
  surveillance_type = EXCLUDED.surveillance_type,
  surveillance_confidence = EXCLUDED.surveillance_confidence,
  vendor_name = COALESCE(app.oui_device_groups.vendor_name, EXCLUDED.vendor_name),
  last_updated = NOW();

-- Tier 2: medium-confidence mesh/backhaul/mobile-post infrastructure.
INSERT INTO app.oui_device_groups (oui, surveillance_type, surveillance_confidence, vendor_name)
VALUES
  ('00:15:6D', 'UBIQUITI_MESH', 'MEDIUM', 'Ubiquiti Inc.'),
  ('F0:9F:C2', 'UBIQUITI_MESH', 'MEDIUM', 'Ubiquiti Inc.'),
  ('04:18:D6', 'UBIQUITI_MESH', 'MEDIUM', 'Ubiquiti Inc.'),
  ('80:2A:A8', 'UBIQUITI_MESH', 'MEDIUM', 'Ubiquiti Inc.'),
  ('00:27:22', 'UBIQUITI_MESH', 'MEDIUM', 'Ubiquiti Inc.'),
  ('00:04:56', 'CAMBIUM_BACKHAUL', 'MEDIUM', 'Cambium Networks'),
  ('30:CB:C7', 'CAMBIUM_BACKHAUL', 'MEDIUM', 'Cambium Networks'),
  ('58:C1:7A', 'CAMBIUM_BACKHAUL', 'MEDIUM', 'Cambium Networks'),
  ('90:14:AF', 'CAMBIUM_BACKHAUL', 'MEDIUM', 'Cambium Networks'),
  ('90:6D:62', 'CAMBIUM_BACKHAUL', 'MEDIUM', 'Cambium Networks'),
  ('B4:A2:5C', 'CAMBIUM_BACKHAUL', 'MEDIUM', 'Cambium Networks'),
  ('BC:A9:93', 'CAMBIUM_BACKHAUL', 'MEDIUM', 'Cambium Networks'),
  ('BC:E6:7C', 'CAMBIUM_BACKHAUL', 'MEDIUM', 'Cambium Networks'),
  ('FC:11:65', 'CAMBIUM_BACKHAUL', 'MEDIUM', 'Cambium Networks'),
  ('00:20:A6', 'PROXIM_SURVEILLANCE', 'MEDIUM', 'Proxim Wireless'),
  ('04:F5:F4', 'PROXIM_SURVEILLANCE', 'MEDIUM', 'Proxim Wireless'),
  ('10:56:CA', 'PEPLINK_MOBILEPOST', 'MEDIUM', 'Peplink International'),
  ('D4:13:F8', 'PEPLINK_MOBILEPOST', 'MEDIUM', 'Peplink International'),
  ('00:11:6E', 'PEPLINK_MOBILEPOST', 'MEDIUM', 'Peplink International')
ON CONFLICT (oui) DO UPDATE SET
  surveillance_type = EXCLUDED.surveillance_type,
  surveillance_confidence = EXCLUDED.surveillance_confidence,
  vendor_name = COALESCE(app.oui_device_groups.vendor_name, EXCLUDED.vendor_name),
  last_updated = NOW();

-- Tier 3: high-confidence defense/C4ISR/tactical communications vendors.
INSERT INTO app.oui_device_groups (oui, surveillance_type, surveillance_confidence, vendor_name)
VALUES
  ('00:26:89', 'GENERAL_DYNAMICS_C4ISR', 'HIGH', 'General Dynamics'),
  ('00:14:8C', 'GENERAL_DYNAMICS_C4ISR', 'HIGH', 'General Dynamics'),
  ('00:25:D4', 'GENERAL_DYNAMICS_C4ISR', 'HIGH', 'General Dynamics'),
  ('00:A0:21', 'GENERAL_DYNAMICS_C4ISR', 'HIGH', 'General Dynamics'),
  ('00:E0:AF', 'GENERAL_DYNAMICS_C4ISR', 'HIGH', 'General Dynamics'),
  ('00:19:8A', 'NORTHROP_GRUMMAN_ISR', 'HIGH', 'Northrop Grumman'),
  ('00:0D:43', 'LEONARDO_DRS_TACTICAL', 'HIGH', 'Leonardo DRS'),
  ('00:D0:B3', 'LEONARDO_DRS_TACTICAL', 'HIGH', 'Leonardo DRS'),
  ('00:05:99', 'LEONARDO_DRS_TACTICAL', 'HIGH', 'Leonardo DRS'),
  ('C4:FD:E6', 'LEONARDO_DRS_TACTICAL', 'HIGH', 'Leonardo DRS'),
  ('00:0A:6B', 'TADIRAN_COMMS', 'HIGH', 'Tadiran'),
  ('00:30:B5', 'TADIRAN_COMMS', 'HIGH', 'Tadiran')
ON CONFLICT (oui) DO UPDATE SET
  surveillance_type = EXCLUDED.surveillance_type,
  surveillance_confidence = EXCLUDED.surveillance_confidence,
  vendor_name = COALESCE(app.oui_device_groups.vendor_name, EXCLUDED.vendor_name),
  last_updated = NOW();

-- Tier 4: private registered OUI.
INSERT INTO app.oui_device_groups (oui, surveillance_type, surveillance_confidence, vendor_name)
VALUES
  ('E4:F1:4C', 'PRIVATE_OUI_REGISTERED', 'HIGH', 'Private OUI Registered')
ON CONFLICT (oui) DO UPDATE SET
  surveillance_type = EXCLUDED.surveillance_type,
  surveillance_confidence = EXCLUDED.surveillance_confidence,
  vendor_name = COALESCE(app.oui_device_groups.vendor_name, EXCLUDED.vendor_name),
  last_updated = NOW();

-- ROLLBACK (data only; does not delete OUI groups):
-- UPDATE app.oui_device_groups
-- SET surveillance_type = NULL,
--     surveillance_confidence = NULL
-- WHERE oui IN (
--   '00:06:EC','00:17:F3','00:10:27','00:00:8F','00:E0:E7',
--   '00:07:9A','00:0D:40','20:ED:74','00:90:B8','A4:7C:1F',
--   '00:15:6D','F0:9F:C2','04:18:D6','80:2A:A8','00:27:22',
--   '00:04:56','30:CB:C7','58:C1:7A','90:14:AF','90:6D:62',
--   'B4:A2:5C','BC:A9:93','BC:E6:7C','FC:11:65',
--   '00:20:A6','04:F5:F4','10:56:CA','D4:13:F8','00:11:6E',
--   '00:26:89','00:14:8C','00:25:D4','00:A0:21','00:E0:AF',
--   '00:19:8A','00:0D:43','00:D0:B3','00:05:99','C4:FD:E6',
--   '00:0A:6B','00:30:B5','E4:F1:4C'
-- );
