-- Migration: 20260506_shotspotter_sensor_locations
-- Creates app.shotspotter_sensors table for WIRED 2024 leak data
-- Source: https://github.com/kevee/shotspotter-locations (22,471 sensors)

CREATE TABLE IF NOT EXISTS app.shotspotter_sensors (
  id          SERIAL PRIMARY KEY,
  sensor_id   TEXT,
  city        TEXT,
  state       TEXT,
  country     TEXT DEFAULT 'US',
  status      TEXT,  -- 'active', 'offline', 'broken'
  source      TEXT DEFAULT 'WIRED_2024_LEAK',
  lat         DOUBLE PRECISION NOT NULL,
  lon         DOUBLE PRECISION NOT NULL,
  geom        GEOMETRY(POINT, 4326),
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shotspotter_sensors_geom
  ON app.shotspotter_sensors USING GIST(geom);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shotspotter_sensors_latlon
  ON app.shotspotter_sensors(lat, lon);

-- Grant read access to app user
GRANT SELECT ON app.shotspotter_sensors TO shadowcheck_user;
GRANT ALL ON app.shotspotter_sensors TO shadowcheck_admin;
GRANT USAGE, SELECT ON SEQUENCE app.shotspotter_sensors_id_seq TO shadowcheck_admin;
