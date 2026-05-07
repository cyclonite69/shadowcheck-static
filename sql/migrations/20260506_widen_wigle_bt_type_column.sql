-- Migration: 20260506_widen_wigle_bt_type_column.sql
-- Widens app.wigle_v2_bluetooth_search.type from VARCHAR(10) to TEXT.
-- WiGLE BT API returns type values (e.g. "BT_CLASSIC", "BT_LE", "BLE") that
-- can exceed 10 characters, causing value-too-long truncation errors on insert.
-- The dependent view wigle_v2_radio_search is dropped and recreated around the ALTER.

SET search_path TO app, public;

DROP VIEW IF EXISTS app.wigle_v2_radio_search;

ALTER TABLE app.wigle_v2_bluetooth_search
  ALTER COLUMN type TYPE TEXT;

CREATE VIEW app.wigle_v2_radio_search AS
  SELECT
    bssid                  AS netid,
    ssid,
    type,
    trilat::double precision,
    trilong::double precision,
    firsttime,
    lasttime,
    city,
    region,
    country,
    NULL::BIGINT           AS mfgrid,
    'wifi'::TEXT           AS radio_source
  FROM app.wigle_v2_networks_search
UNION ALL
  SELECT
    netid,
    name                   AS ssid,
    type,
    trilat::double precision,
    trilong::double precision,
    firsttime,
    lasttime,
    city,
    region,
    country,
    mfgrid,
    'bluetooth'::TEXT      AS radio_source
  FROM app.wigle_v2_bluetooth_search;

GRANT SELECT ON app.wigle_v2_radio_search TO shadowcheck_user;
GRANT SELECT ON app.wigle_v2_radio_search TO shadowcheck_admin;
