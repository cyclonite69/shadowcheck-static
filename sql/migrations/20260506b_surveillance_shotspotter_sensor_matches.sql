-- Migration: 20260506b_surveillance_shotspotter_sensor_matches
-- Creates proximity match view for ShotSpotter sensor detections
-- 200m radius (wider than deflock 100m — acoustic sensors have larger RF footprint than ALPR cameras)

CREATE OR REPLACE VIEW app.surveillance_shotspotter_sensor_matches AS
SELECT
  sd.id as detection_id,
  sd.bssid,
  sd.device_type,
  ss.sensor_id,
  ss.city,
  ss.state,
  ss.status,
  ST_Distance(
    ST_SetSRID(ST_MakePoint(sd.lon, sd.lat), 4326)::geography,
    ST_SetSRID(ST_MakePoint(ss.lon, ss.lat), 4326)::geography
  ) as distance_m
FROM app.surveillance_detections sd
JOIN app.shotspotter_sensors ss ON ST_DWithin(
  ST_SetSRID(ST_MakePoint(sd.lon, sd.lat), 4326)::geography,
  ST_SetSRID(ST_MakePoint(ss.lon, ss.lat), 4326)::geography,
  200
)
WHERE sd.false_positive = FALSE
ORDER BY distance_m;

-- Grant read access
GRANT SELECT ON app.surveillance_shotspotter_sensor_matches TO shadowcheck_user;
