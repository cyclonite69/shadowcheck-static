-- Migration: 20260504_wigle_v2_bluetooth_search.sql
-- Creates app.wigle_v2_bluetooth_search for WiGLE BT/BLE search results.
-- Also creates app.wigle_v2_radio_search — a unified view over WiFi + BT tables.

SET search_path TO app, public;

CREATE TABLE IF NOT EXISTS app.wigle_v2_bluetooth_search (
  id           BIGSERIAL PRIMARY KEY,
  netid        TEXT NOT NULL,
  bssid        TEXT GENERATED ALWAYS AS (UPPER(netid)) STORED,
  name         VARCHAR(255),
  type         VARCHAR(10) NOT NULL DEFAULT 'BLE',
  trilat       NUMERIC(12,10) NOT NULL,
  trilong      NUMERIC(13,10) NOT NULL,
  location     GEOMETRY(Point,4326) NOT NULL,
  firsttime    TIMESTAMPTZ NOT NULL,
  lasttime     TIMESTAMPTZ NOT NULL,
  lastupdt     TIMESTAMPTZ NOT NULL,
  mfgrid       BIGINT,
  mfgr_name    TEXT,
  qos          SMALLINT,
  comment      TEXT,
  city         VARCHAR(100),
  region       VARCHAR(100),
  country      CHAR(2),
  road         VARCHAR(255),
  housenumber  VARCHAR(255),
  postalcode   VARCHAR(20),
  source       VARCHAR(255),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT wigle_bt_netid_loc_uniq UNIQUE (netid, trilat, trilong, lastupdt)
);

CREATE INDEX idx_wigle_bt_netid        ON app.wigle_v2_bluetooth_search (netid);
CREATE INDEX idx_wigle_bt_bssid        ON app.wigle_v2_bluetooth_search (bssid);
CREATE INDEX idx_wigle_bt_mfgrid       ON app.wigle_v2_bluetooth_search (mfgrid)
  WHERE mfgrid IS NOT NULL;
CREATE INDEX idx_wigle_bt_location     ON app.wigle_v2_bluetooth_search USING GIST (location);
CREATE INDEX idx_wigle_bt_lasttime     ON app.wigle_v2_bluetooth_search (lasttime DESC);
CREATE INDEX idx_wigle_bt_country_region
  ON app.wigle_v2_bluetooth_search (country, region, lasttime DESC);
CREATE INDEX idx_wigle_bt_type         ON app.wigle_v2_bluetooth_search (type);

-- Keep location geometry in sync with trilat/trilong on insert/update
CREATE OR REPLACE FUNCTION app.wigle_bt_set_location()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.trilong::float8, NEW.trilat::float8), 4326);
  RETURN NEW;
END;
$$;

CREATE TRIGGER wigle_bt_location_sync
  BEFORE INSERT OR UPDATE OF trilat, trilong
  ON app.wigle_v2_bluetooth_search
  FOR EACH ROW EXECUTE FUNCTION app.wigle_bt_set_location();

GRANT SELECT ON app.wigle_v2_bluetooth_search TO shadowcheck_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.wigle_v2_bluetooth_search TO shadowcheck_admin;
GRANT USAGE ON SEQUENCE app.wigle_v2_bluetooth_search_id_seq TO shadowcheck_admin;

-- Unified view: common shape for both WiFi and BT search records
DROP VIEW IF EXISTS app.wigle_v2_radio_search;

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
