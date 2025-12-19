\echo 'Rebuild observations_v2 from staging_locations_all_raw (SQLite ground truth)'

TRUNCATE observations_v2;

INSERT INTO observations_v2 (
  device_id,
  bssid,
  ssid,
  radio_type,
  radio_frequency,
  radio_capabilities,
  radio_service,
  radio_rcois,
  radio_lasttime_ms,
  level,
  lat,
  lon,
  altitude,
  accuracy,
  time,
  observed_at_ms,
  external,
  mfgrid,
  source_tag,
  source_pk,
  geom,
  time_ms
)
SELECT
  l.device_id,
  l.bssid,
  NULLIF(n.ssid, '') AS ssid,
  n.type AS radio_type,
  n.frequency AS radio_frequency,
  n.capabilities AS radio_capabilities,
  n.service AS radio_service,
  n.rcois AS radio_rcois,
  n.lasttime AS radio_lasttime_ms,
  l.level,
  l.lat,
  l.lon,
  l.altitude,
  l.accuracy,
  to_timestamp(l.location_at_ms / 1000.0) AS time,
  l.location_at_ms AS observed_at_ms,
  CASE WHEN l.external IS NOT NULL AND l.external <> 0 THEN true ELSE false END AS external,
  l.mfgrid,
  l.device_id AS source_tag,
  l.source_pk,
  ST_SetSRID(ST_MakePoint(l.lon, l.lat), 4326) AS geom,
  l.location_at_ms AS time_ms
FROM staging_locations_all_raw l
LEFT JOIN staging_networks n
  ON n.device_id = l.device_id AND n.bssid = l.bssid
WHERE l.device_id IS NOT NULL
ON CONFLICT ON CONSTRAINT observations_v2_natural_uniq DO NOTHING;
