-- Synthetic test data for shadowcheck_test
-- NOT for production. Safe to re-run (ON CONFLICT DO NOTHING throughout).
-- OUI prefix used: 000000 (Xerox Corporation)

\set ON_ERROR_STOP on

BEGIN;

-- ===========================================================================
-- Clear existing synthetic data (idempotent reset)
-- ===========================================================================
-- Only delete data that we own — identified by OUI prefix
DELETE FROM app.mac_randomization_suspects WHERE oui LIKE '000000:%';
DELETE FROM app.wigle_import_runs WHERE search_term LIKE 'TEST_%';
DELETE FROM app.wigle_v3_observations WHERE netid LIKE '000000:%';
DELETE FROM app.wigle_v3_network_details WHERE netid LIKE '000000:%';
DELETE FROM app.network_notes WHERE bssid LIKE '000000:%';
DELETE FROM app.network_threat_scores WHERE bssid LIKE '000000:%';
DELETE FROM app.network_tags WHERE bssid LIKE '000000:%';
DELETE FROM app.network_locations WHERE bssid LIKE '000000:%';
DELETE FROM app.observations WHERE bssid LIKE '000000:%';
DELETE FROM app.networks WHERE bssid LIKE '000000:%';

-- ===========================================================================
-- TIER 1 — Core network data
-- ===========================================================================

-- Tier 1a: 20 networks with sequential BSSIDs
INSERT INTO app.networks (
    bssid, ssid, type, frequency, capabilities, bestlevel, bestlat, bestlon,
    lasttime_ms, lastlat, lastlon, service, rcois, mfgrid
) VALUES
-- Network 01: WPA2, 2.4GHz, Infrastructure
('000000:00:00:01', 'TestNet_01', 'W', 2437, '', -55, 42.6500, -83.3800, 1704067200000, 42.6500, -83.3800, '', '', 0),
-- Network 02: WPA3, 5GHz, Infrastructure
('000000:00:00:02', 'TestNet_02', 'W', 5180, '', -60, 42.6510, -83.3790, 1704153600000, 42.6510, -83.3790, '', '', 0),
-- Network 03: WEP, 2.4GHz, AdHoc
('000000:00:00:03', 'TestNet_03', 'W', 2412, '', -65, 42.6520, -83.3780, 1704240000000, 42.6520, -83.3780, '', '', 0),
-- Network 04: Open, 5GHz, Infrastructure
('000000:00:00:04', 'TestNet_04', 'W', 5200, '', -70, 42.6530, -83.3770, 1704326400000, 42.6530, -83.3770, '', '', 0),
-- Network 05: WPA2, 2.4GHz, Probe
('000000:00:00:05', 'TestNet_05', 'W', 2462, '', -45, 42.6540, -83.3760, 1704412800000, 42.6540, -83.3760, '', '', 0),
-- Network 06: WPA3, 2.4GHz, Infrastructure
('000000:00:00:06', 'TestNet_06', 'W', 2447, '', -50, 42.6550, -83.3750, 1704499200000, 42.6550, -83.3750, '', '', 0),
-- Network 07: WEP, 5GHz, AdHoc
('000000:00:00:07', 'TestNet_07', 'W', 5220, '', -58, 42.6560, -83.3740, 1704585600000, 42.6560, -83.3740, '', '', 0),
-- Network 08: Open, 2.4GHz, Infrastructure
('000000:00:00:08', 'TestNet_08', 'W', 2427, '', -62, 42.6570, -83.3730, 1704672000000, 42.6570, -83.3730, '', '', 0),
-- Network 09: WPA2, 5GHz, Probe
('000000:00:00:09', 'TestNet_09', 'W', 5240, '', -48, 42.6580, -83.3720, 1704758400000, 42.6580, -83.3720, '', '', 0),
-- Network 10: WPA3, 2.4GHz, AdHoc
('000000:00:00:0A', 'TestNet_10', 'W', 2417, '', -52, 42.6590, -83.3710, 1704844800000, 42.6590, -83.3710, '', '', 0),
-- Network 11: WEP, 2.4GHz, Infrastructure
('000000:00:00:0B', 'TestNet_11', 'W', 2432, '', -66, 42.6600, -83.3700, 1704931200000, 42.6600, -83.3700, '', '', 0),
-- Network 12: Open, 5GHz, Probe
('000000:00:00:0C', 'TestNet_12', 'W', 5260, '', -56, 42.6610, -83.3690, 1705017600000, 42.6610, -83.3690, '', '', 0),
-- Network 13: WPA2, 2.4GHz, AdHoc
('000000:00:00:0D', 'TestNet_13', 'W', 2422, '', -51, 42.6620, -83.3680, 1705104000000, 42.6620, -83.3680, '', '', 0),
-- Network 14: WPA3, 5GHz, Infrastructure
('000000:00:00:0E', 'TestNet_14', 'W', 5280, '', -57, 42.6630, -83.3670, 1705190400000, 42.6630, -83.3670, '', '', 0),
-- Network 15: WEP, 5GHz, Infrastructure
('000000:00:00:0F', 'TestNet_15', 'W', 5300, '', -61, 42.6640, -83.3660, 1705276800000, 42.6640, -83.3660, '', '', 0),
-- Network 16: Open, 2.4GHz, AdHoc
('000000:00:00:10', 'TestNet_16', 'W', 2452, '', -54, 42.6650, -83.3650, 1705363200000, 42.6650, -83.3650, '', '', 0),
-- Network 17: WPA2, 5GHz, Probe
('000000:00:00:11', 'TestNet_17', 'W', 5320, '', -59, 42.6660, -83.3640, 1705449600000, 42.6660, -83.3640, '', '', 0),
-- Network 18: WPA3, 2.4GHz, Infrastructure
('000000:00:00:12', 'TestNet_18', 'W', 2407, '', -46, 42.6670, -83.3630, 1705536000000, 42.6670, -83.3630, '', '', 0),
-- Network 19: WEP, 2.4GHz, Probe
('000000:00:00:13', 'TestNet_19', 'W', 2442, '', -63, 42.6680, -83.3620, 1705622400000, 42.6680, -83.3620, '', '', 0),
-- Network 20: Open, 5GHz, Infrastructure
('000000:00:00:14', 'TestNet_20', 'W', 5340, '', -49, 42.6690, -83.3610, 1705708800000, 42.6690, -83.3610, '', '', 0)
ON CONFLICT (bssid) DO NOTHING;

-- Tier 1b: 200 observations (10 per network)
-- Generate observations for networks 01-20
WITH base_data AS (
  SELECT
    n.bssid,
    GENERATE_SERIES(1, 10) AS obs_num,
    EXTRACT(EPOCH FROM TIMESTAMP '2026-01-01 00:00:00' + (
      (CAST(SUBSTRING(n.bssid, 16, 2) AS INTEGER) - 1) * INTERVAL '1 day'
      + (GENERATE_SERIES(1, 10) - 1) * INTERVAL '1 hour'
    ))::bigint AS time_ms,
    TIMESTAMP '2026-01-01 00:00:00' + (
      (CAST(SUBSTRING(n.bssid, 16, 2) AS INTEGER) - 1) * INTERVAL '1 day'
      + (GENERATE_SERIES(1, 10) - 1) * INTERVAL '1 hour'
    ) AS obs_time,
    (-40 - (GENERATE_SERIES(1, 10) - 1) * 5) AS signal_level,
    CAST(SUBSTRING(n.bssid, 16, 2) AS INTEGER) - 1 AS net_idx
  FROM app.networks n
  WHERE n.bssid LIKE '000000:%'
)
INSERT INTO app.observations (
    device_id, bssid, ssid, radio_type, level, lat, lon, altitude, accuracy,
    time, observed_at_ms, external, mfgrid, source_tag, source_pk, geom, time_ms
)
SELECT
    'test_device' AS device_id,
    b.bssid,
    CONCAT('TestNet_', LPAD(CAST(b.net_idx + 1 AS TEXT), 2, '0')) AS ssid,
    'wifi' AS radio_type,
    b.signal_level AS level,
    42.6500 + (b.net_idx * 0.001) + (b.obs_num * 0.0001) AS lat,
    -83.3800 + (b.net_idx * 0.001) + (b.obs_num * 0.0001) AS lon,
    10.0 AS altitude,
    5.0 AS accuracy,
    b.obs_time AS time,
    b.time_ms AS observed_at_ms,
    false AS external,
    0 AS mfgrid,
    'test_synthetic' AS source_tag,
    CONCAT('obs_', b.bssid, '_', b.obs_num) AS source_pk,
    ST_SetSRID(
      ST_MakePoint(-83.3800 + (b.net_idx * 0.001) + (b.obs_num * 0.0001),
                    42.6500 + (b.net_idx * 0.001) + (b.obs_num * 0.0001)),
      4326
    ) AS geom,
    b.time_ms
FROM base_data b
ON CONFLICT (device_id, source_pk, bssid, level, lat, lon, altitude, accuracy, observed_at_ms, external, mfgrid)
  DO NOTHING;

-- ===========================================================================
-- TIER 2 — Supporting test data
-- ===========================================================================

-- Tier 2a: 20 network_locations (1 per network)
INSERT INTO app.network_locations (bssid, centroid_lat, centroid_lon, weighted_lat, weighted_lon, obs_count, last_computed_at)
SELECT
    n.bssid,
    n.bestlat AS centroid_lat,
    n.bestlon AS centroid_lon,
    n.bestlat AS weighted_lat,
    n.bestlon AS weighted_lon,
    10 AS obs_count,
    NOW() AS last_computed_at
FROM app.networks n
WHERE n.bssid LIKE '000000:%'
ON CONFLICT (bssid) DO NOTHING;

-- Tier 2b: 5 network_tags rows (2 threat, 2 ignored, 1 note)
INSERT INTO app.network_tags (bssid, threat_tag, threat_confidence, is_ignored, ignore_reason, notes, created_at, updated_at)
VALUES
    ('000000:00:00:01', 'SUSPICIOUS', 0.85, false, NULL, NULL, NOW(), NOW()),
    ('000000:00:00:02', 'SUSPICIOUS', 0.90, false, NULL, NULL, NOW(), NOW()),
    ('000000:00:00:03', NULL, NULL, true, 'known_friend', NULL, NOW(), NOW()),
    ('000000:00:00:04', NULL, NULL, true, 'neighbor', NULL, NOW(), NOW()),
    ('000000:00:00:05', NULL, NULL, false, NULL, 'Test note for integration tests', NOW(), NOW())
ON CONFLICT (bssid) DO NOTHING;

-- Tier 2c: 5 network_threat_scores rows
INSERT INTO app.network_threat_scores (bssid, final_threat_score, final_threat_level, model_version, scored_at)
VALUES
    ('000000:00:00:01', 0.10, 'LOW', 'v5', '2026-03-01 00:00:00'::timestamptz),
    ('000000:00:00:02', 0.30, 'LOW', 'v5', '2026-03-01 00:00:00'::timestamptz),
    ('000000:00:00:03', 0.50, 'MEDIUM', 'v5', '2026-03-01 00:00:00'::timestamptz),
    ('000000:00:00:04', 0.70, 'HIGH', 'v5', '2026-03-01 00:00:00'::timestamptz),
    ('000000:00:00:05', 0.90, 'CRITICAL', 'v5', '2026-03-01 00:00:00'::timestamptz)
ON CONFLICT (bssid) DO NOTHING;

-- Tier 2d: 3 network_notes rows
INSERT INTO app.network_notes (bssid, user_id, content, note_type, created_at, updated_at)
VALUES
    ('000000:00:00:01', 'default_user', 'Integration test note 1', 'general', '2026-03-01 00:00:00'::timestamp, '2026-03-01 00:00:00'::timestamp),
    ('000000:00:00:02', 'default_user', 'Integration test note 2', 'general', '2026-03-01 00:00:00'::timestamp, '2026-03-01 00:00:00'::timestamp),
    ('000000:00:00:03', 'default_user', 'Integration test note 3', 'general', '2026-03-01 00:00:00'::timestamp, '2026-03-01 00:00:00'::timestamp)
ON CONFLICT DO NOTHING;

-- Tier 2e: 10 wigle_v3_observations rows (2 per network from networks 01-05)
INSERT INTO app.wigle_v3_observations (netid, latitude, longitude, altitude, accuracy, signal, observed_at, ssid, frequency, channel, encryption, location)
VALUES
    ('000000:00:00:01', 42.6500, -83.3800, 10.0, 5.0, -45, '2026-01-15 12:00:00'::timestamptz, 'TestNet_01', 2437, 6, 'WPA2', ST_SetSRID(ST_MakePoint(-83.3800, 42.6500), 4326)),
    ('000000:00:00:01', 42.6505, -83.3805, 10.0, 5.0, -50, '2026-01-16 12:00:00'::timestamptz, 'TestNet_01', 2437, 6, 'WPA2', ST_SetSRID(ST_MakePoint(-83.3805, 42.6505), 4326)),
    ('000000:00:00:02', 42.6510, -83.3790, 10.0, 5.0, -55, '2026-01-15 13:00:00'::timestamptz, 'TestNet_02', 5180, 36, 'WPA3', ST_SetSRID(ST_MakePoint(-83.3790, 42.6510), 4326)),
    ('000000:00:00:02', 42.6515, -83.3795, 10.0, 5.0, -60, '2026-01-16 13:00:00'::timestamptz, 'TestNet_02', 5180, 36, 'WPA3', ST_SetSRID(ST_MakePoint(-83.3795, 42.6515), 4326)),
    ('000000:00:00:03', 42.6520, -83.3780, 10.0, 5.0, -48, '2026-01-15 14:00:00'::timestamptz, 'TestNet_03', 2412, 1, 'WEP', ST_SetSRID(ST_MakePoint(-83.3780, 42.6520), 4326)),
    ('000000:00:00:03', 42.6525, -83.3785, 10.0, 5.0, -52, '2026-01-16 14:00:00'::timestamptz, 'TestNet_03', 2412, 1, 'WEP', ST_SetSRID(ST_MakePoint(-83.3785, 42.6525), 4326)),
    ('000000:00:00:04', 42.6530, -83.3770, 10.0, 5.0, -58, '2026-01-15 15:00:00'::timestamptz, 'TestNet_04', 5200, 40, 'OPEN', ST_SetSRID(ST_MakePoint(-83.3770, 42.6530), 4326)),
    ('000000:00:00:04', 42.6535, -83.3775, 10.0, 5.0, -62, '2026-01-16 15:00:00'::timestamptz, 'TestNet_04', 5200, 40, 'OPEN', ST_SetSRID(ST_MakePoint(-83.3775, 42.6535), 4326)),
    ('000000:00:00:05', 42.6540, -83.3760, 10.0, 5.0, -46, '2026-01-15 16:00:00'::timestamptz, 'TestNet_05', 2462, 11, 'WPA2', ST_SetSRID(ST_MakePoint(-83.3760, 42.6540), 4326)),
    ('000000:00:00:05', 42.6545, -83.3765, 10.0, 5.0, -51, '2026-01-16 16:00:00'::timestamptz, 'TestNet_05', 2462, 11, 'WPA2', ST_SetSRID(ST_MakePoint(-83.3765, 42.6545), 4326))
ON CONFLICT (netid, latitude, longitude, observed_at) DO NOTHING;

-- Tier 2f: 5 wigle_v3_network_details rows
INSERT INTO app.wigle_v3_network_details (netid, ssid, name, trilat, trilon, first_seen, last_update)
VALUES
    ('000000:00:00:01', 'TestNet_01', 'Test Network 01', 42.6500, -83.3800, '2026-01-01 00:00:00'::timestamptz, '2026-01-16 16:00:00'::timestamptz),
    ('000000:00:00:02', 'TestNet_02', 'Test Network 02', 42.6510, -83.3790, '2026-01-01 00:00:00'::timestamptz, '2026-01-16 16:00:00'::timestamptz),
    ('000000:00:00:03', 'TestNet_03', 'Test Network 03', 42.6520, -83.3780, '2026-01-01 00:00:00'::timestamptz, '2026-01-16 16:00:00'::timestamptz),
    ('000000:00:00:04', 'TestNet_04', 'Test Network 04', 42.6530, -83.3770, '2026-01-01 00:00:00'::timestamptz, '2026-01-16 16:00:00'::timestamptz),
    ('000000:00:00:05', 'TestNet_05', 'Test Network 05', 42.6540, -83.3760, '2026-01-01 00:00:00'::timestamptz, '2026-01-16 16:00:00'::timestamptz)
ON CONFLICT (netid) DO NOTHING;

-- Tier 2g: 2 wigle_import_runs rows
INSERT INTO app.wigle_import_runs (source, api_version, search_term, request_fingerprint, status, pages_fetched, error_message)
VALUES
    ('wigle', 'v2', 'TEST_Search_01', 'fp_test_001', 'completed', 5, NULL),
    ('wigle', 'v2', 'TEST_Search_02', 'fp_test_002', 'failed', 0, 'Test failure for integration testing')
ON CONFLICT DO NOTHING;

-- Tier 2h: 2 mac_randomization_suspects rows
INSERT INTO app.mac_randomization_suspects (oui, reason, confidence_score, notes, created_at)
VALUES
    ('000000:15', 'oui_mismatch', 0.85, 'Test MAC randomization suspect', NOW()),
    ('000000:16', 'oui_mismatch', 0.92, 'Test MAC randomization suspect', NOW())
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- Row count verification at end of script
-- ===========================================================================
SELECT 'networks' as tbl, count(*) as cnt FROM app.networks WHERE bssid LIKE '000000:%'
UNION ALL SELECT 'observations', count(*) FROM app.observations WHERE bssid LIKE '000000:%'
UNION ALL SELECT 'network_locations', count(*) FROM app.network_locations WHERE bssid LIKE '000000:%'
UNION ALL SELECT 'network_tags', count(*) FROM app.network_tags WHERE bssid LIKE '000000:%'
UNION ALL SELECT 'network_threat_scores', count(*) FROM app.network_threat_scores WHERE bssid LIKE '000000:%'
UNION ALL SELECT 'network_notes', count(*) FROM app.network_notes WHERE bssid LIKE '000000:%'
UNION ALL SELECT 'wigle_v3_observations', count(*) FROM app.wigle_v3_observations WHERE netid LIKE '000000:%'
UNION ALL SELECT 'wigle_v3_network_details', count(*) FROM app.wigle_v3_network_details WHERE netid LIKE '000000:%'
UNION ALL SELECT 'wigle_import_runs', count(*) FROM app.wigle_import_runs WHERE search_term LIKE 'TEST_%'
UNION ALL SELECT 'mac_randomization_suspects', count(*) FROM app.mac_randomization_suspects WHERE oui LIKE '000000:%'
ORDER BY tbl;

COMMIT;
