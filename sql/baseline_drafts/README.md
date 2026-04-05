# Baseline Refresh Drafts

This directory holds **draft** refreshed baseline files for the migration fold plan.

These files are intentionally **outside** [`sql/migrations`](/home/dbcooper/repos/shadowcheck-web/sql/migrations)
so the canonical runner [`sql/run-migrations.sh`](/home/dbcooper/repos/shadowcheck-web/sql/run-migrations.sh)
cannot apply them accidentally.

## Status

- Phase 1: inventory and cut line documented in [`sql/migrations/README.md`](/home/dbcooper/repos/shadowcheck-web/sql/migrations/README.md)
- Phase 2: draft refreshed baselines live here
- No active migrations have been archived or deleted

## Cut Line

Current draft fold candidates stop at:

- `20260331_consolidated_012_mv_centroid_fields.sql`

Current additive migrations that remain outside the draft baseline:

- `20260401_observations_upper_bssid_index.sql`
- `20260402_add_kml_staging_tables.sql`
- `20260403_add_anchor_points.sql`
- `20260403_fix_api_network_explorer_distance_from_home.sql`
- `20260404_align_kml_staging_permissions.sql`
- `20260404_backfill_networks_from_child_tables.sql`
- `20260404_retarget_bssid_fks_to_networks.sql`
- `20260404_drop_access_points.sql`
- `20260404_add_geocoding_to_api_network_explorer_mv.sql`
- `20260404_add_networks_orphans_table.sql`
- `20260405_add_orphan_network_backfill_tracking.sql`

## Draft Files

1. [`baseline_001_extensions_auth_schema.sql`](/home/dbcooper/repos/shadowcheck-web/sql/baseline_drafts/baseline_001_extensions_auth_schema.sql)
2. [`baseline_002_core_tables.sql`](/home/dbcooper/repos/shadowcheck-web/sql/baseline_drafts/baseline_002_core_tables.sql)
3. [`baseline_003_external_and_reference.sql`](/home/dbcooper/repos/shadowcheck-web/sql/baseline_drafts/baseline_003_external_and_reference.sql)
4. [`baseline_004_analysis_views_materialized_views.sql`](/home/dbcooper/repos/shadowcheck-web/sql/baseline_drafts/baseline_004_analysis_views_materialized_views.sql)
5. [`baseline_005_functions_and_triggers.sql`](/home/dbcooper/repos/shadowcheck-web/sql/baseline_drafts/baseline_005_functions_and_triggers.sql)
6. [`baseline_006_indexes_grants_defaults.sql`](/home/dbcooper/repos/shadowcheck-web/sql/baseline_drafts/baseline_006_indexes_grants_defaults.sql)

## Intent

Each draft captures:

- source migrations to fold
- exclusions that must remain additive for now
- a short implementation checklist for phase 3

These are planning artifacts, not production-ready replacement baselines yet.
