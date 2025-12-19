\echo 'Promote enriched staging into observations'

INSERT INTO observations (
  device_id, bssid, ssid, level, lat, lon, altitude, accuracy,
  time, external, mfgrid, source_tag, source_pk, geom, time_ms, observed_at_ms
)
SELECT
  device_id,
  bssid,
  ssid,
  level,
  lat,
  lon,
  altitude,
  accuracy,
  observed_at AS time,
  external,
  mfgrid,
  source_tag,
  source_pk,
  geom,
  time_ms,
  observed_at_ms
FROM staging_locations_all_enriched
ON CONFLICT ON CONSTRAINT observations_natural_uniq DO NOTHING;
