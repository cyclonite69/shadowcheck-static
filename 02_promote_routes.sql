BEGIN;

INSERT INTO routes (
  device_id,
  source_pk,
  run_id,
  wifi_visible,
  cell_visible,
  bt_visible,
  lat,
  lon,
  altitude,
  accuracy,
  observed_at_ms,
  geom
)
SELECT
  device_id,
  source_pk,
  run_id,
  wifi_visible,
  cell_visible,
  bt_visible,
  lat,
  lon,
  altitude,
  accuracy,
  observed_at_ms,
  ST_SetSRID(ST_MakePoint(lon, lat), 4326) AS geom
FROM staging_routes;

COMMIT;
