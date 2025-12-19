#!/usr/bin/env bash
set -euo pipefail

# ETL execution order (documented only; adjust paths/vars per device before running):
# 1) Apply schema/migration:
#    psql -f etl/01_schema/01_create_extensions.sql
#    psql -f etl/01_schema/02_create_postgis_extensions.sql
#    psql -f etl/01_schema/03_create_staging_tables.sql
#    psql -f etl/01_schema/04_create_raw_locations.sql
#    psql -f etl/01_schema/04_create_final_tables.sql
#    psql -f etl/01_schema/05_lock_fact_tables.sql
#    psql -f etl/01_schema/07_create_observations_v2.sql
# 2) Load per-device CSVs into staging (locations + networks):
#    psql -v locations_csv=/path/to/j24_locations.csv -v networks_csv=/path/to/j24_networks.csv -v device_locale='en_US' -f etl/02_load/01_copy_j24.sql
#    psql -v locations_csv=/path/to/g63_locations.csv -v networks_csv=/path/to/g63_networks.csv -v device_locale='en_US' -f etl/02_load/02_copy_g63.sql
#    psql -v locations_csv=/path/to/s22_main_locations.csv -v networks_csv=/path/to/s22_main_networks.csv -v device_locale='en_US' -f etl/02_load/03_copy_s22_main.sql
#    psql -v locations_csv=/path/to/s22_backup_locations.csv -v networks_csv=/path/to/s22_backup_networks.csv -v device_locale='en_US' -f etl/02_load/04_copy_s22_backup.sql
# 3) Merge staging and enrich timestamps/geoms:
#    psql -f etl/03_transform/01_merge_staging.sql
#    psql -f etl/03_transform/02_convert_timestamps.sql
#    psql -f etl/03_transform/03_build_geom.sql
# 4) Promote canonical facts:
#    psql -f etl/04_promote/04_insert_networks.sql
#    psql -f etl/04_promote/01_insert_observations.sql
#    psql -f etl/04_promote/05_rebuild_observations_v2.sql
#    psql -v device_code=j24 -v routes_csv=/path/to/j24_routes.csv -f etl/02_load/06_copy_routes.sql
#    psql -v device_code=g63 -v routes_csv=/path/to/g63_routes.csv -f etl/02_load/06_copy_routes.sql
#    psql -v device_code=s22_main -v routes_csv=/path/to/s22_main_routes.csv -f etl/02_load/06_copy_routes.sql
#    psql -v device_code=s22_backup -v routes_csv=/path/to/s22_backup_routes.csv -f etl/02_load/06_copy_routes.sql
# 5) Existing legacy promos (access_points, ssid_history) if needed:
#    psql -f etl/04_promote/02_insert_access_points.sql
#    psql -f etl/04_promote/03_build_ssid_history.sql
# 6) Index helpers/materialized views (optional legacy):
#    psql -f etl/05_indexes/01_indexes_observations.sql
#    psql -f etl/05_indexes/02_spatial_indexes.sql
#    psql -f etl/05_indexes/03_refresh_matviews.sql
#    psql -f etl/06_matviews/01_create_matviews.sql
#    psql -f etl/06_matviews/02_refresh_matviews.sql

echo "Refer to comments above for ordered ETL commands. This script documents steps only."
