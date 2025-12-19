\echo 'Loading route telemetry'
-- Usage:
-- psql -v device_code='j24' \
--      -v routes_csv='/path/to/routes.csv' \
--      -f etl/02_load/06_copy_routes.sql

CREATE TEMP TABLE tmp_routes_load (
  source_pk text NOT NULL,
  run_id integer NOT NULL,
  wifi_visible integer NOT NULL,
  cell_visible integer NOT NULL,
  bt_visible integer NOT NULL,
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  altitude double precision NOT NULL,
  accuracy double precision NOT NULL,
  observed_at_ms bigint NOT NULL
);

\copy tmp_routes_load (
  source_pk, run_id, wifi_visible, cell_visible, bt_visible,
  lat, lon, altitude, accuracy, observed_at_ms
) FROM :'routes_csv' CSV;

INSERT INTO routes (
  device_id, source_pk, run_id, wifi_visible, cell_visible, bt_visible,
  lat, lon, altitude, accuracy, observed_at_ms, geom
)
SELECT
  :'device_code',
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
  ST_SetSRID(ST_MakePoint(lon, lat), 4326)
FROM tmp_routes_load
ON CONFLICT ON CONSTRAINT routes_natural_uniq DO NOTHING;
