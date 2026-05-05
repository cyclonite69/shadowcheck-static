-- Migration: app.shotspotter_zones
-- ShotSpotter/SoundThinking known deployment zones reference layer
-- Enables geospatial proximity matching and contract status tracking

CREATE TABLE IF NOT EXISTS app.shotspotter_zones (
  id SERIAL PRIMARY KEY,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50),
  country VARCHAR(10) DEFAULT 'US',
  coverage_type VARCHAR(50), -- 'city_wide', 'zone', 'pilot'
  contract_status VARCHAR(50), -- 'active', 'expired', 'pending'
  source VARCHAR(100),
  source_url TEXT,
  notes TEXT,
  geom GEOMETRY(POLYGON, 4326),
  center_lat DOUBLE PRECISION,
  center_lon DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shotspotter_zones_geom
  ON app.shotspotter_zones USING GIST(geom);

CREATE INDEX IF NOT EXISTS idx_shotspotter_zones_city
  ON app.shotspotter_zones (city, state);

CREATE INDEX IF NOT EXISTS idx_shotspotter_zones_contract_status
  ON app.shotspotter_zones (contract_status);

-- Grant access to app runtime role
GRANT SELECT ON app.shotspotter_zones TO shadowcheck_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.shotspotter_zones TO shadowcheck_admin;
GRANT USAGE, SELECT ON SEQUENCE app.shotspotter_zones_id_seq TO shadowcheck_admin;

-- Seed known deployments from public record (EFF, Vice/Motherboard, city contracts)
-- Using ST_Buffer for ~5km radius polygon around center point as placeholder
INSERT INTO app.shotspotter_zones 
  (city, state, country, coverage_type, contract_status, source, source_url, center_lat, center_lon, geom)
VALUES
  ('Chicago', 'IL', 'US', 'city_wide', 'active', 'public_record', 'https://www.eff.org/deeplinks/2020/01/shotspotter-pitchometer-police', 41.8781, -87.6298,
   ST_Buffer(ST_SetSRID(ST_MakePoint(-87.6298, 41.8781), 4326)::geography, 5000)::geometry),
  ('Detroit', 'MI', 'US', 'zone', 'active', 'public_record', 'https://detroitmi.gov/government/departments/police-department', 42.3314, -83.0458,
   ST_Buffer(ST_SetSRID(ST_MakePoint(-83.0458, 42.3314), 4326)::geography, 5000)::geometry),
  ('Flint', 'MI', 'US', 'city_wide', 'active', 'public_record', 'https://www.flintmichigan.gov/', 43.1021, -83.6872,
   ST_Buffer(ST_SetSRID(ST_MakePoint(-83.6872, 43.1021), 4326)::geography, 5000)::geometry),
  ('Oakland', 'CA', 'US', 'city_wide', 'active', 'public_record', 'https://www.oaklandca.gov/', 37.8044, -122.2712,
   ST_Buffer(ST_SetSRID(ST_MakePoint(-122.2712, 37.8044), 4326)::geography, 5000)::geometry),
  ('Atlanta', 'GA', 'US', 'city_wide', 'active', 'public_record', 'https://www.atlantaga.gov/', 33.7490, -84.3880,
   ST_Buffer(ST_SetSRID(ST_MakePoint(-84.3880, 33.7490), 4326)::geography, 5000)::geometry),
  ('Kansas City', 'MO', 'US', 'city_wide', 'active', 'public_record', 'https://kcmo.gov/', 39.0997, -94.5786,
   ST_Buffer(ST_SetSRID(ST_MakePoint(-94.5786, 39.0997), 4326)::geography, 5000)::geometry),
  ('Newark', 'NJ', 'US', 'city_wide', 'active', 'public_record', 'https://www.ci.newark.nj.us/', 40.7357, -74.1724,
   ST_Buffer(ST_SetSRID(ST_MakePoint(-74.1724, 40.7357), 4326)::geography, 5000)::geometry),
  ('Cleveland', 'OH', 'US', 'city_wide', 'active', 'public_record', 'https://clevelandohio.gov/', 41.4993, -81.6944,
   ST_Buffer(ST_SetSRID(ST_MakePoint(-81.6944, 41.4993), 4326)::geography, 5000)::geometry),
  ('San Francisco', 'CA', 'US', 'city_wide', 'expired', 'public_record', 'https://www.sfgov.org/', 37.7749, -122.4194,
   ST_Buffer(ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography, 5000)::geometry),
  ('Rochester', 'NY', 'US', 'city_wide', 'active', 'public_record', 'https://www.cityofrochester.gov/', 43.1566, -77.6088,
   ST_Buffer(ST_SetSRID(ST_MakePoint(-77.6088, 43.1566), 4326)::geography, 5000)::geometry),
  ('Omaha', 'NE', 'US', 'city_wide', 'active', 'public_record', 'https://www.cityofomaha.org/', 41.2565, -95.9345,
   ST_Buffer(ST_SetSRID(ST_MakePoint(-95.9345, 41.2565), 4326)::geography, 5000)::geometry);

-- Create view for proximity matching: networks near ShotSpotter zones
CREATE OR REPLACE VIEW app.surveillance_shotspotter_matches AS
SELECT 
  sd.id as detection_id,
  sd.bssid,
  sd.device_type,
  sd.threat_score,
  n.bestlat as lat,
  n.bestlon as lon,
  sz.city,
  sz.state,
  sz.contract_status,
  ST_Distance(
    ST_SetSRID(ST_MakePoint(n.bestlon, n.bestlat), 4326)::geography,
    ST_SetSRID(ST_MakePoint(sz.center_lon, sz.center_lat), 4326)::geography
  ) as distance_m,
  sz.geom
FROM app.surveillance_detections sd
JOIN app.networks n ON sd.bssid = n.bssid
JOIN app.shotspotter_zones sz ON ST_Within(
  ST_SetSRID(ST_MakePoint(n.bestlon, n.bestlat), 4326),
  sz.geom
)
WHERE sd.device_type = 'SHOTSPOTTER_SENSOR';

GRANT SELECT ON app.surveillance_shotspotter_matches TO shadowcheck_user;
