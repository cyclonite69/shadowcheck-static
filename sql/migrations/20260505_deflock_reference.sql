-- Migration: app.deflock_cameras reference table
-- Stores known Flock Safety ALPR camera locations imported from
-- the DeFlock / OpenStreetMap public dataset. Idempotent on lat+lon.

CREATE TABLE IF NOT EXISTS app.deflock_cameras (
  id          serial      PRIMARY KEY,
  lat         numeric     NOT NULL,
  lon         numeric     NOT NULL,
  geom        geometry(Point, 4326),
  city        text,
  state       text,
  source      text        NOT NULL DEFAULT 'deflock',
  imported_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deflock_cameras_lat_lon_unique UNIQUE (lat, lon)
);

CREATE INDEX IF NOT EXISTS deflock_cameras_geom_idx
  ON app.deflock_cameras USING GIST (geom);

CREATE INDEX IF NOT EXISTS deflock_cameras_state_idx
  ON app.deflock_cameras (state);

-- Auto-populate geom from lat/lon on insert/update
CREATE OR REPLACE FUNCTION app.deflock_cameras_set_geom()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lon, NEW.lat), 4326);
  RETURN NEW;
END;
$$;

CREATE TRIGGER deflock_cameras_geom_trigger
  BEFORE INSERT OR UPDATE OF lat, lon
  ON app.deflock_cameras
  FOR EACH ROW EXECUTE FUNCTION app.deflock_cameras_set_geom();

-- Cross-reference view: surveillance detections within 100m of a known DeFlock camera
CREATE OR REPLACE VIEW app.surveillance_deflock_matches AS
SELECT
  sd.bssid,
  sd.device_type,
  sd.confidence,
  sd.detection_method,
  ne.lat  AS network_lat,
  ne.lon  AS network_lon,
  dc.id   AS deflock_camera_id,
  dc.lat  AS deflock_lat,
  dc.lon  AS deflock_lon,
  dc.city,
  dc.state,
  dc.source,
  ROUND(ST_Distance(
    ST_SetSRID(ST_MakePoint(COALESCE(ne.centroid_lon, ne.lon),
                            COALESCE(ne.centroid_lat, ne.lat)), 4326)::geography,
    ST_SetSRID(ST_MakePoint(dc.lon, dc.lat), 4326)::geography
  )::numeric, 1)                                                       AS distance_m
FROM app.surveillance_detections sd
JOIN app.api_network_explorer_mv ne
  ON UPPER(ne.bssid) = UPPER(sd.bssid)
JOIN app.deflock_cameras dc
  ON ST_DWithin(
    ST_SetSRID(ST_MakePoint(COALESCE(ne.centroid_lon, ne.lon),
                            COALESCE(ne.centroid_lat, ne.lat)), 4326)::geography,
    ST_SetSRID(ST_MakePoint(dc.lon, dc.lat), 4326)::geography,
    100
  )
WHERE sd.false_positive = FALSE
ORDER BY distance_m;
