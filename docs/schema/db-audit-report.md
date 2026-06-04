# ShadowCheck DB Architecture Audit

> **Generated:** 2026-06-04 19:33:28 UTC  
> **Database:** shadowcheck_db · PostgreSQL 18.4 (local Docker)  
> **Schema Stats:** 3,001 MB app schema · 62 tables · 4 materialized views · 11 views · 70+ functions · 61 sequences · 256 indexes

This is a living document. Re-run `scratch/generate_audit_report.js` after schema changes to refresh.

---

## Table of Contents

1. [Extensions](#extensions)
2. [Schema Size Summary](#schema-size-summary)
3. [Tables — app schema](#tables--app-schema)
4. [Tables — public schema](#tables--public-schema)
5. [Tables — tiger schema (PostGIS geocoder)](#tables--tiger-schema-postgis-geocoder)
6. [Materialized Views](#materialized-views)
7. [Views](#views)
8. [Functions — app schema](#functions--app-schema)
9. [Functions — public schema (app-owned)](#functions--public-schema-app-owned)
10. [Triggers](#triggers)
11. [Sequences](#sequences)
12. [Indexes — Usage Summary](#indexes--usage-summary)
13. [Foreign Keys](#foreign-keys)
14. [Findings & Observations](#findings--observations)
15. [Referential Integrity Analysis](#referential-integrity-analysis)

---

## Extensions

| Extension                | Version | Purpose                                                                |
| ------------------------ | ------- | ---------------------------------------------------------------------- |
| `fuzzystrmatch`          | 1.2     | determine similarities and distance between strings                    |
| `pg_stat_statements`     | 1.12    | track planning and execution statistics of all SQL statements executed |
| `pg_trgm`                | 1.6     | text similarity measurement and index searching based on trigrams      |
| `plpgsql`                | 1.0     | PL/pgSQL procedural language                                           |
| `postgis`                | 3.6.3   | PostGIS geometry and geography spatial types and functions             |
| `postgis_tiger_geocoder` | 3.6.3   | PostGIS tiger geocoder and reverse geocoder                            |
| `postgis_topology`       | 3.6.3   | PostGIS topology spatial types and functions                           |

---

## Schema Size Summary

| Schema     | Total Size | Tables | Mat. Views | Views | Sequences |
| ---------- | ---------- | ------ | ---------- | ----- | --------- |
| `app`      | 3001 MB    | 62     | 4          | 11    | 45        |
| `pg_toast` | 24 MB      | 0      | 0          | 0     | 0         |
| `public`   | 7352 kB    | 1      | 0          | 4     | 0         |
| `tiger`    | 3488 kB    | 34     | 0          | 0     | 16        |

---

## Tables — app schema

Columns: **Name · Size · Rows (est.) · Code Refs · Migration Origin · Purpose**

### `app.kismet_packets`

| Property             | Value                                       |
| -------------------- | ------------------------------------------- |
| **Size**             | 713 MB                                      |
| **Est. Rows**        | 2,100,783                                   |
| **Code Coverage**    | ✅ 15 refs                                  |
| **Origin Migration** | `20260430_add_missing_bootstrap_tables.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `client/src/components/admin/tabs/data-import/types.ts`, `etl/load/kismet-import.ts`, `scripts/db-cleanup-2026-03-28.sql`

### `app.observations`

| Property             | Value                                       |
| -------------------- | ------------------------------------------- |
| **Size**             | 399 MB                                      |
| **Est. Rows**        | 685,788                                     |
| **Code Coverage**    | ✅ 453 refs                                 |
| **Origin Migration** | `20260216_consolidated_002_core_tables.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `client/src/api/dashboardApi.ts`, `client/src/api/keplerApi.ts`, `client/src/api/networkApi.ts`

### `app.kml_points`

| Property             | Value                                 |
| -------------------- | ------------------------------------- |
| **Size**             | 184 MB                                |
| **Est. Rows**        | 316,445                               |
| **Code Coverage**    | ✅ 17 refs                            |
| **Origin Migration** | `20260402_add_kml_staging_tables.sql` |

**Purpose:** Point-level KML staging rows parsed from Placemark entries. These rows are preserved as imported and are not canonical observations.

**Code references:** `client/src/components/admin/tabs/data-import/types.ts`, `client/src/config/apiTestEndpoints.ts`, `etl/load/kml-import.ts`

### `app.network_threat_scores`

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Size**             | 150 MB                                           |
| **Est. Rows**        | 195,224                                          |
| **Code Coverage**    | ✅ 91 refs                                       |
| **Origin Migration** | `20260216_consolidated_004_network_analysis.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `etl/promote/process-promotion.ts`, `scripts/score-all-hybrid.ts`, `scripts/recompute_threat_scores_v4.sql`

### `app.geocoding_cache`

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Size**             | 142 MB                                           |
| **Est. Rows**        | 124,188                                          |
| **Code Coverage**    | ✅ 23 refs                                       |
| **Origin Migration** | `20260216_consolidated_004_network_analysis.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `scripts/geocoding/reverse-geocode-observations-sample.ts`, `server/src/repositories/wigleQueriesRepository.ts`, `server/src/services/geocoding/daemonRuntime.ts`

### `app.wigle_v2_networks_search`

| Property             | Value                                             |
| -------------------- | ------------------------------------------------- |
| **Size**             | 79 MB                                             |
| **Est. Rows**        | 108,354                                           |
| **Code Coverage**    | ✅ 36 refs                                        |
| **Origin Migration** | `20260216_consolidated_006_wigle_integration.sql` |

**Purpose:** WiFi network locations from WiGLE.net /api/v2/network/search endpoint with PostGIS spatial support

**Code references:** `etl/load/json-import.ts`, `server/src/repositories/baseRepository.ts`, `server/src/repositories/courthouseRepository.ts`

### `app.networks`

| Property             | Value                                       |
| -------------------- | ------------------------------------------- |
| **Size**             | 75 MB                                       |
| **Est. Rows**        | 200,653                                     |
| **Code Coverage**    | ✅ 493 refs                                 |
| **Origin Migration** | `20260216_consolidated_002_core_tables.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `client/src/api/analyticsApi.ts`, `client/src/api/dashboardApi.ts`, `client/src/api/keplerApi.ts`

### `app.network_locations`

| Property             | Value                           |
| -------------------- | ------------------------------- |
| **Size**             | 66 MB                           |
| **Est. Rows**        | 188,961                         |
| **Code Coverage**    | ✅ 40 refs                      |
| **Origin Migration** | `20260331_consolidated_011.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/services/filterQueryBuilder/modules/geospatialQueryBuilders.ts`, `server/src/services/filterQueryBuilder/SqlFragmentLibrary.ts`, `server/src/services/networking/filterBuilders/locationFilters.ts`

### `app.wigle_v3_observations`

| Property             | Value                                             |
| -------------------- | ------------------------------------------------- |
| **Size**             | 43 MB                                             |
| **Est. Rows**        | 125,706                                           |
| **Code Coverage**    | ✅ 63 refs                                        |
| **Origin Migration** | `20260216_consolidated_006_wigle_integration.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `scripts/generate_schema_reference.sql`, `server/src/repositories/baseRepository.ts`, `server/src/repositories/courthouseRepository.ts`

### `app.deflock_cameras`

| Property             | Value                            |
| -------------------- | -------------------------------- |
| **Size**             | 41 MB                            |
| **Est. Rows**        | 178,053                          |
| **Code Coverage**    | 🟡 4 refs                        |
| **Origin Migration** | `20260505_deflock_reference.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/repositories/deflockRepository.ts`, `sql/migrations/20260505_deflock_reference.sql`, `sql/migrations/20260505b_deflock_cameras_add_columns.sql`

### `app.threat_scores_cache`

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Size**             | 30 MB                                            |
| **Est. Rows**        | 200,619                                          |
| **Code Coverage**    | ✅ 20 refs                                       |
| **Origin Migration** | `20260216_consolidated_004_network_analysis.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `scripts/incremental_score_v4.sql`, `scripts/generate_schema_docs.sql`, `scripts/db-cleanup-2026-03-28.sql`

### `app.radio_manufacturers`

| Property             | Value                                        |
| -------------------- | -------------------------------------------- |
| **Size**             | 29 MB                                        |
| **Est. Rows**        | 74,035                                       |
| **Code Coverage**    | ✅ 76 refs                                   |
| **Origin Migration** | `20260405_normalize_radio_manufacturers.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `scripts/db-cleanup-drop-script.sql`, `scripts/db-dependency-trace.sql`, `scripts/generate_schema_reference.sql`

### `app.kismet_devices`

| Property             | Value                                       |
| -------------------- | ------------------------------------------- |
| **Size**             | 12 MB                                       |
| **Est. Rows**        | 2,564                                       |
| **Code Coverage**    | ✅ 11 refs                                  |
| **Origin Migration** | `20260430_add_missing_bootstrap_tables.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `client/src/components/admin/tabs/data-import/types.ts`, `etl/load/kismet-import.ts`, `scripts/db-cleanup-2026-03-28.sql`

### `app.routes`

| Property             | Value                                       |
| -------------------- | ------------------------------------------- |
| **Size**             | 12 MB                                       |
| **Est. Rows**        | 37,699                                      |
| **Code Coverage**    | ✅ 142 refs                                 |
| **Origin Migration** | `20260216_consolidated_002_core_tables.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `client/src/directions/__tests__/directionsClient.test.ts`, `client/src/directions/directionsClient.ts`, `scripts/db-cleanup-drop-script.sql`

### `app.wigle_v3_network_details`

| Property             | Value                                             |
| -------------------- | ------------------------------------------------- |
| **Size**             | 9848 kB                                           |
| **Est. Rows**        | 2,926                                             |
| **Code Coverage**    | ✅ 26 refs                                        |
| **Origin Migration** | `20260216_consolidated_006_wigle_integration.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/api/routes/v1/wigle/database.ts`, `server/src/repositories/wigleQueriesRepository.ts`, `server/src/repositories/wiglePersistenceRepository.ts`

### `app.ssid_history`

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Size**             | 6248 kB                                          |
| **Est. Rows**        | 40,966                                           |
| **Code Coverage**    | ✅ 11 refs                                       |
| **Origin Migration** | `20260216_consolidated_004_network_analysis.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `scripts/db-cleanup-2026-03-28.sql`, `server/src/repositories/v2Repository.ts`, `server/src/types/v2Types.ts`

### `app.network_sibling_pairs`

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Size**             | 5744 kB                                          |
| **Est. Rows**        | 10,252                                           |
| **Code Coverage**    | ✅ 48 refs                                       |
| **Origin Migration** | `20260216_consolidated_004_network_analysis.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `scripts/analyze-sibling-quality.sql`, `scripts/export-sibling-training-data.sql`, `scripts/runSiblingRefreshTest.ts`

### `app.shotspotter_sensors`

| Property             | Value                                       |
| -------------------- | ------------------------------------------- |
| **Size**             | 5080 kB                                     |
| **Est. Rows**        | 20,280                                      |
| **Code Coverage**    | 🟡 3 refs                                   |
| **Origin Migration** | `20260506_shotspotter_sensor_locations.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/repositories/shotspotterSensorsRepository.ts`, `sql/migrations/20260506_shotspotter_sensor_locations.sql`, `sql/migrations/20260506b_surveillance_shotspotter_sensor_matches.sql`

### `app.oui_device_groups`

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Size**             | 2608 kB                                          |
| **Est. Rows**        | 2,678                                            |
| **Code Coverage**    | ✅ 27 refs                                       |
| **Origin Migration** | `20260216_consolidated_004_network_analysis.sql` |

**Purpose:** Groups BSSIDs by OUI (vendor MAC prefix) to detect same-device networks

**Code references:** `client/src/components/vendor-intel/types.ts`, `server/src/repositories/adminNetworkTagOuiRepository.ts`, `server/src/repositories/surveillanceDetectionRepository.ts`

### `app.network_tags`

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Size**             | 1552 kB                                          |
| **Est. Rows**        | 2,675                                            |
| **Code Coverage**    | ✅ 119 refs                                      |
| **Origin Migration** | `20260216_consolidated_004_network_analysis.sql` |

**Purpose:** User classifications and notes for networks - used for ML training and filtering

**Code references:** `client/src/constants/network.ts`, `client/src/types/network.ts`, `scripts/db-cleanup-drop-script.sql`

### `app.wigle_v2_bluetooth_search`

| Property             | Value                                    |
| -------------------- | ---------------------------------------- |
| **Size**             | 1216 kB                                  |
| **Est. Rows**        | 2,008                                    |
| **Code Coverage**    | ✅ 6 refs                                |
| **Origin Migration** | `20260504_wigle_v2_bluetooth_search.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/repositories/wiglePersistenceRepository.ts`, `server/src/services/wigleImport/btPageProcessor.ts`, `server/src/services/adminDbStatsService.ts`

### `app.networks_orphans`

| Property             | Value                                     |
| -------------------- | ----------------------------------------- |
| **Size**             | 1136 kB                                   |
| **Est. Rows**        | 3,203                                     |
| **Code Coverage**    | ✅ 18 refs                                |
| **Origin Migration** | `20260404_add_networks_orphans_table.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `etl/load/sqlite/schemaSetup.ts`, `etl/load/sqlite/networkReconciliation.ts`, `scripts/maintenance/cleanup-unused-indexes.sql`

### `app.kismet_snapshots`

| Property             | Value                                       |
| -------------------- | ------------------------------------------- |
| **Size**             | 1000 kB                                     |
| **Est. Rows**        | 2,431                                       |
| **Code Coverage**    | ✅ 10 refs                                  |
| **Origin Migration** | `20260430_add_missing_bootstrap_tables.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `etl/load/kismet-import.ts`, `scripts/db-cleanup-2026-03-28.sql`, `server/src/services/adminDbStatsService.ts`

### `app.kismet_messages`

| Property             | Value                                       |
| -------------------- | ------------------------------------------- |
| **Size**             | 1000 kB                                     |
| **Est. Rows**        | 3,725                                       |
| **Code Coverage**    | ✅ 10 refs                                  |
| **Origin Migration** | `20260430_add_missing_bootstrap_tables.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `etl/load/kismet-import.ts`, `scripts/db-cleanup-2026-03-28.sql`, `server/src/services/adminDbStatsService.ts`

### `app.surveillance_detections`

| Property             | Value                                  |
| -------------------- | -------------------------------------- |
| **Size**             | 936 kB                                 |
| **Est. Rows**        | 325                                    |
| **Code Coverage**    | ✅ 21 refs                             |
| **Origin Migration** | `20260503_surveillance_detections.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `client/src/components/vendor-intel/types.ts`, `server/src/api/routes/v1/admin/detectionEvidence.ts`, `server/src/repositories/surveillanceDetectionRepository.ts`

### `app.agency_offices`

| Property             | Value                                          |
| -------------------- | ---------------------------------------------- |
| **Size**             | 832 kB                                         |
| **Est. Rows**        | 391                                            |
| **Code Coverage**    | ✅ 126 refs                                    |
| **Origin Migration** | `20260216_consolidated_007_agency_offices.sql` |

**Purpose:** Public agency offices (field offices, resident agencies) with contact and jurisdiction data.

**Code references:** `etl/load/fbi-field-offices-gov.ts`, `etl/load/fbi-training-facilities.ts`, `etl/load/fbi-resident-agencies-gov.ts`

### `app.orphan_network_backfills`

| Property             | Value                                               |
| -------------------- | --------------------------------------------------- |
| **Size**             | 416 kB                                              |
| **Est. Rows**        | 1,350                                               |
| **Code Coverage**    | ✅ 10 refs                                          |
| **Origin Migration** | `20260405_add_orphan_network_backfill_tracking.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/services/adminOrphanNetworksService.ts`, `sql/migrations/archive/20260405_add_orphan_network_backfill_tracking.sql`, `sql/migrations/archive/20260412_orphan_search_index_and_promotion.sql`

### `app.wigle_import_run_pages`

| Property             | Value                                             |
| -------------------- | ------------------------------------------------- |
| **Size**             | 376 kB                                            |
| **Est. Rows**        | 806                                               |
| **Code Coverage**    | ✅ 17 refs                                        |
| **Origin Migration** | `20260216_consolidated_006_wigle_integration.sql` |

**Purpose:** Per-page audit log for resumable WiGLE import runs.

**Code references:** `server/src/services/wigleImport/pageProcessor.ts`, `server/src/services/wigleImport/btPageProcessor.ts`, `server/src/services/wigleImport/runRepository.ts`

### `app.federal_courthouses`

| Property             | Value                                       |
| -------------------- | ------------------------------------------- |
| **Size**             | 280 kB                                      |
| **Est. Rows**        | 357                                         |
| **Code Coverage**    | ✅ 11 refs                                  |
| **Origin Migration** | `20260430_add_missing_bootstrap_tables.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/repositories/courthouseRepository.ts`, `server/src/services/adminDbStatsService.ts`, `server/src/db/migrations/create_federal_courthouses.sql`

### `app.user_sessions`

| Property             | Value                                          |
| -------------------- | ---------------------------------------------- |
| **Size**             | 248 kB                                         |
| **Est. Rows**        | 245                                            |
| **Code Coverage**    | ✅ 24 refs                                     |
| **Origin Migration** | `20260216_consolidated_003_auth_and_users.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `scripts/verify_db_role_hardening.sql`, `server/src/services/adminUsersService.ts`, `server/src/services/authQueries.ts`

### `app.anchor_points`

| Property             | Value                            |
| -------------------- | -------------------------------- |
| **Size**             | 224 kB                           |
| **Est. Rows**        | 338                              |
| **Code Coverage**    | 🟡 3 refs                        |
| **Origin Migration** | `20260403_add_anchor_points.sql` |

**Purpose:** Stationary radio beacons used for device location verification and signal calibration

**Code references:** `sql/migrations/archive/20260403_add_anchor_points.sql`, `sql/baseline_phase3/baseline_003_external_and_reference.sql`, `.claude/worktrees/agent-a6211976/sql/migrations/20260403_add_anchor_points.sql`

### `app.kml_files`

| Property             | Value                                 |
| -------------------- | ------------------------------------- |
| **Size**             | 224 kB                                |
| **Est. Rows**        | 234                                   |
| **Code Coverage**    | ✅ 19 refs                            |
| **Origin Migration** | `20260402_add_kml_staging_tables.sql` |

**Purpose:** File-level staging metadata for imported KML/KMZ artifacts used in recovery and reconciliation workflows.

**Code references:** `client/src/components/admin/tabs/data-import/types.ts`, `client/src/config/apiTestEndpoints.ts`, `etl/load/kml-import.ts`

### `app.wigle_import_runs`

| Property             | Value                                             |
| -------------------- | ------------------------------------------------- |
| **Size**             | 208 kB                                            |
| **Est. Rows**        | 166                                               |
| **Code Coverage**    | ✅ 25 refs                                        |
| **Origin Migration** | `20260216_consolidated_006_wigle_integration.sql` |

**Purpose:** Persistent resumable WiGLE import runs for API search pagination.

**Code references:** `server/src/api/routes/v1/wigle/ledger.ts`, `server/src/repositories/wigleEnrichmentRepository.ts`, `server/src/services/wigleImport/pageProcessor.ts`

### `app.background_job_runs`

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Size**             | 192 kB                                           |
| **Est. Rows**        | 182                                              |
| **Code Coverage**    | ✅ 16 refs                                       |
| **Origin Migration** | `20260216_consolidated_004_network_analysis.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/repositories/jobRunRepository.ts`, `server/src/services/admin/siblingDetection/use-cases/reconcileSiblingState.ts`, `server/src/services/admin/siblingDetection/use-cases/cancelSiblingRefresh.ts`

### `app.wigle_ledger_events`

| Property             | Value                                  |
| -------------------- | -------------------------------------- |
| **Size**             | 192 kB                                 |
| **Est. Rows**        | 126                                    |
| **Code Coverage**    | ✅ 6 refs                              |
| **Origin Migration** | `20260426_add_wigle_ledger_events.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/api/routes/v1/wigle/ledger.ts`, `server/src/services/wigleRequestLedger.ts`, `sql/migrations/20260426_add_wigle_ledger_events.sql`

### `app.geocoding_job_runs`

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Size**             | 152 kB                                           |
| **Est. Rows**        | 379                                              |
| **Code Coverage**    | ✅ 9 refs                                        |
| **Origin Migration** | `20260216_consolidated_004_network_analysis.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/services/geocoding/jobState.ts`, `sql/migrations/archive/20260216_consolidated_004_network_analysis.sql`, `sql/migrations/archive/20260216_consolidated_010_performance_indexes.sql`

### `app.ai_insights`

| Property             | Value                                       |
| -------------------- | ------------------------------------------- |
| **Size**             | 128 kB                                      |
| **Est. Rows**        | 7                                           |
| **Code Coverage**    | ✅ 11 refs                                  |
| **Origin Migration** | `20260216_consolidated_002_core_tables.sql` |

**Purpose:** Persisted Claude/Bedrock analyses of network observations, with optional user feedback.

**Code references:** `server/src/services/aiInsightsService.ts`, `server/src/services/adminDbStatsService.ts`, `sql/migrations/archive/20260216_consolidated_002_core_tables.sql`

### `app.network_notes`

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Size**             | 112 kB                                           |
| **Est. Rows**        | 15                                               |
| **Code Coverage**    | ✅ 40 refs                                       |
| **Origin Migration** | `20260216_consolidated_004_network_analysis.sql` |

**Purpose:** User notes and observations for networks - supports right-click context menu

**Code references:** `server/src/api/routes/v1/network-tags/manageTags.ts`, `server/src/repositories/baseRepository.ts`, `server/src/repositories/adminNetworkMediaRepository.ts`

### `app.import_history`

| Property             | Value                                       |
| -------------------- | ------------------------------------------- |
| **Size**             | 96 kB                                       |
| **Est. Rows**        | 15                                          |
| **Code Coverage**    | ✅ 23 refs                                  |
| **Origin Migration** | `20260216_consolidated_002_core_tables.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `scripts/trigger-report.js`, `server/src/repositories/mobileIngestRepository.ts`, `server/src/services/adminDbStatsService.ts`

### `app.mobile_uploads`

| Property             | Value                                      |
| -------------------- | ------------------------------------------ |
| **Size**             | 96 kB                                      |
| **Est. Rows**        | 8                                          |
| **Code Coverage**    | ✅ 10 refs                                 |
| **Origin Migration** | `20260406_create_mobile_uploads_table.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/repositories/mobileIngestRepository.ts`, `server/src/services/adminImportHistoryService.ts`, `sql/migrations/archive/20260406_create_mobile_uploads_table.sql`

### `app.note_media`

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Size**             | 96 kB                                            |
| **Est. Rows**        | 1                                                |
| **Code Coverage**    | ✅ 13 refs                                       |
| **Origin Migration** | `20260216_consolidated_004_network_analysis.sql` |

**Purpose:** Media attachments for network notes

**Code references:** `server/src/repositories/adminNetworkMediaRepository.ts`, `sql/migrations/archive/20260216_consolidated_004_network_analysis.sql`, `sql/migrations/archive/20260216_consolidated_009_functions_and_triggers.sql`

### `app.schema_migrations`

| Property             | Value                                          |
| -------------------- | ---------------------------------------------- |
| **Size**             | 88 kB                                          |
| **Est. Rows**        | 201                                            |
| **Code Coverage**    | ✅ 15 refs                                     |
| **Origin Migration** | `20260216_consolidated_003_auth_and_users.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/services/adminDbStatsService.ts`, `sql/init/00_bootstrap.sql`, `sql/migrations/archive/20260216_consolidated_003_auth_and_users.sql`

### `app.sibling_runs`

| Property             | Value                                   |
| -------------------- | --------------------------------------- |
| **Size**             | 80 kB                                   |
| **Est. Rows**        | 156                                     |
| **Code Coverage**    | ✅ 9 refs                               |
| **Origin Migration** | `20260509_003_sibling_run_tracking.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/repositories/siblingRunRepository.ts`, `server/src/services/admin/siblingDetection/orchestrators/SiblingDetectionOrchestrator.ts`, `server/src/services/admin/siblingDetection/use-cases/reconcileSiblingState.ts`

### `app.agency_office_coverage_notes`

| Property             | Value                                          |
| -------------------- | ---------------------------------------------- |
| **Size**             | 80 kB                                          |
| **Est. Rows**        | 14                                             |
| **Code Coverage**    | 🟡 3 refs                                      |
| **Origin Migration** | `20260216_consolidated_007_agency_offices.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `sql/migrations/archive/20260216_consolidated_007_agency_offices.sql`, `sql/baseline_phase3/baseline_003_external_and_reference.sql`, `.claude/worktrees/agent-a6211976/sql/migrations/20260216_consolidated_007_agency_offices.sql`

### `app.network_sibling_overrides`

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Size**             | 80 kB                                            |
| **Est. Rows**        | 95                                               |
| **Code Coverage**    | ✅ 23 refs                                       |
| **Origin Migration** | `20260216_consolidated_004_network_analysis.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `scripts/export-sibling-training-data.sql`, `scripts/analyze-sibling-overrides.sql`, `scripts/explore-sibling-patterns.sql`

### `app.shotspotter_zones`

| Property             | Value                            |
| -------------------- | -------------------------------- |
| **Size**             | 72 kB                            |
| **Est. Rows**        | 11                               |
| **Code Coverage**    | 🟡 2 refs                        |
| **Origin Migration** | `20260505_shotspotter_zones.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/repositories/shotspotterRepository.ts`, `sql/migrations/20260505_shotspotter_zones.sql`

### `app.kismet_alerts`

| Property             | Value                                       |
| -------------------- | ------------------------------------------- |
| **Size**             | 72 kB                                       |
| **Est. Rows**        | 30                                          |
| **Code Coverage**    | ✅ 14 refs                                  |
| **Origin Migration** | `20260430_add_missing_bootstrap_tables.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `client/src/components/admin/tabs/data-import/types.ts`, `etl/load/kismet-import.ts`, `scripts/db-cleanup-2026-03-28.sql`

### `app.kismet_datasources`

| Property             | Value                                       |
| -------------------- | ------------------------------------------- |
| **Size**             | 64 kB                                       |
| **Est. Rows**        | 4                                           |
| **Code Coverage**    | ✅ 10 refs                                  |
| **Origin Migration** | `20260430_add_missing_bootstrap_tables.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `etl/load/kismet-import.ts`, `scripts/db-cleanup-2026-03-28.sql`, `server/src/services/adminDbStatsService.ts`

### `app.location_markers`

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Size**             | 64 kB                                            |
| **Est. Rows**        | 1                                                |
| **Code Coverage**    | ✅ 64 refs                                       |
| **Origin Migration** | `20260216_consolidated_004_network_analysis.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `scripts/db-cleanup-drop-script.sql`, `scripts/db-dependency-trace.sql`, `scripts/set-home.ts`

### `app.users`

| Property             | Value                                          |
| -------------------- | ---------------------------------------------- |
| **Size**             | 64 kB                                          |
| **Est. Rows**        | 2                                              |
| **Code Coverage**    | ✅ 53 refs                                     |
| **Origin Migration** | `20260216_consolidated_003_auth_and_users.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `client/src/api/adminApi.ts`, `client/src/components/wigle/mapHandlers.ts`, `client/src/config/apiTestEndpoints.ts`

### `app.kismet_data`

| Property             | Value                                       |
| -------------------- | ------------------------------------------- |
| **Size**             | 48 kB                                       |
| **Est. Rows**        | 1                                           |
| **Code Coverage**    | ✅ 10 refs                                  |
| **Origin Migration** | `20260430_add_missing_bootstrap_tables.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `etl/load/kismet-import.ts`, `scripts/db-cleanup-2026-03-28.sql`, `server/src/services/adminDbStatsService.ts`

### `app.device_sources`

| Property             | Value                                       |
| -------------------- | ------------------------------------------- |
| **Size**             | 48 kB                                       |
| **Est. Rows**        | 8                                           |
| **Code Coverage**    | ✅ 9 refs                                   |
| **Origin Migration** | `20260216_consolidated_002_core_tables.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `etl/load/sqlite/schemaSetup.ts`, `server/src/services/adminDbStatsService.ts`, `server/src/services/adminImportHistoryService.ts`

### `app.wigle_saved_ssid_terms`

| Property             | Value                                     |
| -------------------- | ----------------------------------------- |
| **Size**             | 48 kB                                     |
| **Est. Rows**        | 19                                        |
| **Code Coverage**    | ✅ 5 refs                                 |
| **Origin Migration** | `20260415_add_wigle_saved_ssid_terms.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/services/wigleSearchService.ts`, `sql/migrations/archive/20260415_add_wigle_saved_ssid_terms.sql`, `sql/baseline_phase3/baseline_003_external_and_reference.sql`

### `app.network_cooccurrence`

| Property             | Value                                               |
| -------------------- | --------------------------------------------------- |
| **Size**             | 40 kB                                               |
| **Est. Rows**        | 0                                                   |
| **Code Coverage**    | ✅ 9 refs                                           |
| **Origin Migration** | `20260216_consolidated_010_performance_indexes.sql` |

**Purpose:** Tracks networks that appear together at multiple locations for coordinated surveillance detection

**Code references:** `scripts/generate_schema_docs.sql`, `scripts/test_cooccurrence.sql`, `sql/functions/calculate_threat_score_v4_1_individual.sql`

### `app.network_media`

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Size**             | 40 kB                                            |
| **Est. Rows**        | 0                                                |
| **Code Coverage**    | ✅ 17 refs                                       |
| **Origin Migration** | `20260216_consolidated_004_network_analysis.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/repositories/adminNetworkMediaRepository.ts`, `server/src/services/admin/networkNotesAdminService.ts`, `sql/migrations/archive/20260216_consolidated_004_network_analysis.sql`

### `app.settings`

| Property             | Value                                          |
| -------------------- | ---------------------------------------------- |
| **Size**             | 32 kB                                          |
| **Est. Rows**        | 18                                             |
| **Code Coverage**    | ✅ 87 refs                                     |
| **Origin Migration** | `20260216_consolidated_003_auth_and_users.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `client/src/api/adminApi.ts`, `client/src/components/admin/hooks/useStackActions.ts`, `client/src/components/wigle/hooks/useWigleMapState.ts`

### `app.ml_training_history`

| Property             | Value                                          |
| -------------------- | ---------------------------------------------- |
| **Size**             | 32 kB                                          |
| **Est. Rows**        | 0                                              |
| **Code Coverage**    | ✅ 7 refs                                      |
| **Origin Migration** | `20260216_consolidated_005_ml_and_scoring.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `server/src/repositories/baseRepository.ts`, `sql/migrations/archive/20260216_consolidated_005_ml_and_scoring.sql`, `sql/migrations/archive/create_ml_model_metadata.sql`

### `app.ml_model_config`

| Property             | Value                                          |
| -------------------- | ---------------------------------------------- |
| **Size**             | 32 kB                                          |
| **Est. Rows**        | 1                                              |
| **Code Coverage**    | ✅ 16 refs                                     |
| **Origin Migration** | `20260216_consolidated_005_ml_and_scoring.sql` |

**Purpose:** Stores trained ML model coefficients for threat scoring

**Code references:** `scripts/score-all-hybrid.ts`, `server/src/services/ml/repository.ts`, `server/src/services/adminSettingsService.ts`

### `app.mac_randomization_suspects`

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Size**             | 32 kB                                            |
| **Est. Rows**        | 0                                                |
| **Code Coverage**    | ✅ 15 refs                                       |
| **Origin Migration** | `20260216_consolidated_004_network_analysis.sql` |

**Purpose:** Tracks MAC randomization patterns (walked BSSIDs)

**Code references:** `server/src/repositories/adminNetworkTagOuiRepository.ts`, `server/src/services/admin/networkTagOui.ts`, `server/src/services/ouiGroupingService.ts`

### `app.hardware_inventory`

| Property             | Value     |
| -------------------- | --------- |
| **Size**             | 24 kB     |
| **Est. Rows**        | -1        |
| **Code Coverage**    | ⚠️ 0 refs |
| **Origin Migration** | `UNKNOWN` |

**Purpose:** _(no pg_comment)_

### `app.api_mv_refresh_state`

| Property             | Value                                            |
| -------------------- | ------------------------------------------------ |
| **Size**             | 24 kB                                            |
| **Est. Rows**        | 1                                                |
| **Code Coverage**    | ✅ 5 refs                                        |
| **Origin Migration** | `20260216_consolidated_004_network_analysis.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `scripts/db-cleanup-2026-03-28.sql`, `sql/migrations/archive/20260216_consolidated_004_network_analysis.sql`, `sql/baseline_phase3/baseline_002_core_tables.sql`

### `app.ml_model_metadata`

| Property             | Value                                          |
| -------------------- | ---------------------------------------------- |
| **Size**             | 16 kB                                          |
| **Est. Rows**        | 0                                              |
| **Code Coverage**    | ✅ 5 refs                                      |
| **Origin Migration** | `20260216_consolidated_005_ml_and_scoring.sql` |

**Purpose:** _(no pg_comment)_

**Code references:** `sql/migrations/archive/20260216_consolidated_005_ml_and_scoring.sql`, `sql/migrations/archive/create_ml_model_metadata.sql`, `sql/baseline_phase3/baseline_002_core_tables.sql`

---

## Tables — public schema

| Name                     | Size    | Est. Rows | Purpose                                                                 |
| ------------------------ | ------- | --------- | ----------------------------------------------------------------------- |
| `public.spatial_ref_sys` | 7144 kB | 8,500     | PostGIS spatial reference system table (installed by PostGIS extension) |

---

## Tables — tiger schema (PostGIS geocoder)

These tables are installed by the `postgis_tiger_geocoder` extension for US TIGER/Line geocoding. None contain app data — they are populated only when TIGER data loads are run. Currently all are empty (0 rows).

| Name                             | Size       | Est. Rows |
| -------------------------------- | ---------- | --------- |
| `tiger.pagc_rules`               | 856 kB     | 4,354     |
| `tiger.pagc_lex`                 | 336 kB     | 2,938     |
| `tiger.pagc_gaz`                 | 128 kB     | 835       |
| `tiger.street_type_lookup`       | 128 kB     | 609       |
| `tiger.state_lookup`             | 104 kB     | 59        |
| `tiger.loader_lookuptables`      | 64 kB      | 13        |
| `tiger.addrfeat`                 | 48 kB      | 0         |
| `tiger.direction_lookup`         | 40 kB      | 28        |
| `tiger.secondary_unit_lookup`    | 40 kB      | 39        |
| `tiger.state`                    | 40 kB      | 0         |
| `tiger.edges`                    | 40 kB      | 0         |
| `tiger.faces`                    | 40 kB      | 0         |
| `tiger.featnames`                | 32 kB      | 0         |
| `tiger.geocode_settings_default` | 32 kB      | 7         |
| `tiger.county`                   | 32 kB      | 0         |
| `tiger.place`                    | 32 kB      | 0         |
| `tiger.cousub`                   | 32 kB      | 0         |
| `tiger.loader_variables`         | 32 kB      | 1         |
| `tiger.loader_platform`          | 32 kB      | 2         |
| `tiger.addr`                     | 24 kB      | 0         |
| `tiger.countysub_lookup`         | 24 kB      | 0         |
| `tiger.county_lookup`            | 24 kB      | 0         |
| `tiger.place_lookup`             | 24 kB      | 0         |
| `tiger.zcta5`                    | 16 kB      | 0         |
| `tiger.geocode_settings`         | 16 kB      | 0         |
| `tiger.tabblock20`               | 16 kB      | 0         |
| `tiger.tabblock`                 | 16 kB      | 0         |
| `tiger.bg`                       | 16 kB      | 0         |
| `tiger.tract`                    | 16 kB      | 0         |
| `tiger.zip_state_loc`            | 8192 bytes | 0         |
| `tiger.zip_state`                | 8192 bytes | 0         |
| `tiger.zip_lookup`               | 8192 bytes | 0         |
| `tiger.zip_lookup_base`          | 8192 bytes | 0         |
| `tiger.zip_lookup_all`           | 0 bytes    | 0         |

---

## Materialized Views

### `app.api_network_explorer_mv`

**Purpose:** Primary read model for the Network Explorer UI. Denormalized join of `networks`, `network_locations`, `network_tags`, `network_threat_scores`, `geocoding_cache`, `oui_device_groups`, `network_sibling_pairs`, `surveillance_detections`. Refreshed by `refresh_api_network_mvs()` and delta refreshes. Indexed for all Explorer filter dimensions.

| Property             | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Size**             | 148 MB                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Est. Rows**        | 188,961                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Code Coverage**    | ✅ 147 refs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Origin Migration** | `20260423_fix_mv_geocoding_join_precision.sql`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Rebuilt In**       | `20260216_consolidated_008_views_and_materialized_views.sql`, `20260216_consolidated_010_performance_indexes.sql`, `20260331_consolidated_011.sql`, `20260331_consolidated_012_mv_centroid_fields.sql`, `20260403_fix_api_network_explorer_distance_from_home.sql`, `20260404_add_geocoding_to_api_network_explorer_mv.sql`, `20260405_normalize_radio_manufacturers.sql`, `20260423_fix_mv_geocoding_join_precision.sql`, `20260507_fix_mv_ble_exclusion.sql`, `20260524_016_add_sibling_summary_to_api_network_explorer_mv.sql` |

**Code references:** `etl/promote/process-promotion.ts`, `scripts/rebuild-db.sql`, `scripts/score-all-hybrid.ts`

### `app.api_wigle_networks_mv`

**Purpose:** WiGLE network search result cache. Merges WiFi and Bluetooth WiGLE search results (`wigle_v2_networks_search`, `wigle_v2_bluetooth_search`) into a unified view for the WiGLE map panel.

| Property             | Value                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Size**             | 44 MB                                                                                                                            |
| **Est. Rows**        | 124,848                                                                                                                          |
| **Code Coverage**    | ✅ 5 refs                                                                                                                        |
| **Origin Migration** | `20260419_add_wigle_networks_mv.sql`                                                                                             |
| **Rebuilt In**       | `20260419_add_wigle_networks_mv.sql`, `20260504b_wigle_networks_mv_add_bluetooth.sql`, `20260506_widen_wigle_bt_type_column.sql` |

**Code references:** `server/src/repositories/wigleQueriesRepository.ts`, `server/src/services/wigleEnrichment/orchestrators/WigleEnrichmentOrchestrator.ts`, `sql/migrations/20260419_add_wigle_networks_mv.sql`

### `app.surveillance_density_zones`

**Purpose:** Geospatial density heatmap of surveillance-tagged networks. Computed as hexbin/cluster zones from `api_network_explorer_mv` filtered to confirmed/suspect threat tags.

| Property             | Value                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| **Size**             | 136 kB                                                                                                 |
| **Est. Rows**        | 98                                                                                                     |
| **Code Coverage**    | ✅ 5 refs                                                                                              |
| **Origin Migration** | `20260505_surveillance_density_zones_mv.sql`                                                           |
| **Rebuilt In**       | `20260507_fix_mv_ble_exclusion.sql`, `20260524_016_add_sibling_summary_to_api_network_explorer_mv.sql` |

**Code references:** `server/src/services/backgroundJobs/runners.ts`, `sql/migrations/20260505_surveillance_density_zones_mv.sql`, `sql/migrations/20260507_fix_mv_ble_exclusion.sql`

### `app.analytics_summary_mv`

**Purpose:** Per-network-type aggregate counts (network_count, unique_ssids, avg_signal, earliest/latest_seen) from `networks`. Used by Analytics dashboard panel.

| Property             | Value                                                        |
| -------------------- | ------------------------------------------------------------ |
| **Size**             | 40 kB                                                        |
| **Est. Rows**        | 6                                                            |
| **Code Coverage**    | ✅ 15 refs                                                   |
| **Origin Migration** | `20260216_consolidated_008_views_and_materialized_views.sql` |

**Code references:** `scripts/db-trim-runbook.sql`, `server/src/services/filterQueryBuilder/modules/analyticsQueryBuilders.ts`, `server/src/services/backgroundJobs/mvRefresh.ts`

---

## Views

### App Views

| View                                          | Code Refs  | Purpose                                                                                                                                                      |
| --------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app.api_network_explorer`                    | ✅ 14 refs | Legacy non-materialized version of the Network Explorer query. Retained for backward compatibility. Superseded by `api_network_explorer_mv` for performance. |
| `app.network_entries`                         | ✅ 7 refs  | Unified network-level summary combining `networks` with tag and threat score data. Used by legacy API paths.                                                 |
| `app.network_sibling_pairs_filtered`          | 🟡 2 refs  | Subset of `network_sibling_pairs` excluding overridden/rejected pairs. Used by sibling detection analysis queries.                                           |
| `app.network_siblings_effective`              | ✅ 6 refs  | Effective (non-rejected) sibling relationships combining `network_sibling_pairs` and `network_sibling_overrides`.                                            |
| `app.network_summary_with_notes`              | ✅ 7 refs  | Joins `networks` with `network_notes` for note-aware network summaries.                                                                                      |
| `app.network_tags_expanded`                   | ✅ 10 refs | Expanded view of `network_tags` joining OUI and threat data. Used by tag management admin UI.                                                                |
| `app.network_tags_full`                       | ✅ 9 refs  | Full `network_tags` with joined network metadata for tag admin workflows.                                                                                    |
| `app.surveillance_deflock_matches`            | 🟡 3 refs  | Networks cross-referenced against `deflock_cameras` proximity. Identifies surveillance cameras co-located with tracked networks.                             |
| `app.surveillance_shotspotter_matches`        | 🟡 1 refs  | Networks within proximity of `shotspotter_zones`. Identifies networks co-located with acoustic surveillance infrastructure.                                  |
| `app.surveillance_shotspotter_sensor_matches` | 🟡 1 refs  | Networks co-located with `shotspotter_sensors` (individual sensor units vs zones).                                                                           |
| `app.wigle_v2_radio_search`                   | 🟡 2 refs  | Union of `wigle_v2_networks_search` (WiFi) and `wigle_v2_bluetooth_search`. Unified interface for both radio types in WiGLE map queries.                     |

### Public / System Views

| View                             | Purpose                                                                    |
| -------------------------------- | -------------------------------------------------------------------------- |
| `public.geography_columns`       | PostGIS system view — catalogs geography-typed columns across all schemas. |
| `public.geometry_columns`        | PostGIS system view — catalogs geometry-typed columns across all schemas.  |
| `public.pg_stat_statements`      | pg_stat_statements extension view — SQL performance tracking.              |
| `public.pg_stat_statements_info` | pg_stat_statements extension metadata view.                                |

---

## Functions — app schema

### Application Functions

| Function                                 | Arguments                                                                                                                                                     | Code Refs  | Purpose                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| `calculate_threat_score_v3`              | `(p_bssid text)`                                                                                                                                              | ✅ 6 refs  | —                                                                                                          |
| `calculate_threat_score_v4`              | `(p_bssid text)`                                                                                                                                              | ✅ 6 refs  | Threat Scoring v4.0 - Detects surveillance through individual behavior patterns and fleet correlation      |
| `calculate_threat_score_v4_individual`   | `(p_bssid text)`                                                                                                                                              | ✅ 10 refs | Threat scoring v4.0 - individual behavior only. Fleet correlation calculated separately in batch.          |
| `calculate_threat_score_v5`              | `(p_bssid text)`                                                                                                                                              | ✅ 7 refs  | Threat Scoring v5.1 - Cellular excluded, BT/BLE signal-strength modifier, sentinel-safe signal averaging   |
| `calculate_threat_score_v5_individual`   | `(p_bssid text)`                                                                                                                                              | 🟡 1 refs  | Threat Scoring v5.1 Individual - Cellular excluded, BT/BLE signal modifier, sentinel-safe signal averaging |
| `deflock_cameras_set_geom`               | `(())`                                                                                                                                                        | 🟡 1 refs  | —                                                                                                          |
| `delete_note_media`                      | `(media_id_param integer)`                                                                                                                                    | ✅ 5 refs  | Delete media and return file path                                                                          |
| `find_sibling_radios`                    | `(p_bssid text, p_max_octet_delta integer, p_max_distance_m double precision)`                                                                                | ✅ 44 refs | —                                                                                                          |
| `get_home_location`                      | `(())`                                                                                                                                                        | 🟡 3 refs  | —                                                                                                          |
| `get_note_media`                         | `(note_id_param integer)`                                                                                                                                     | ✅ 5 refs  | Retrieve media for a specific note                                                                         |
| `get_oui_groups`                         | `(())`                                                                                                                                                        | ✅ 5 refs  | —                                                                                                          |
| `get_threat_score`                       | `(p_rule_based_score numeric, p_ml_score numeric, p_threat_tag text, p_threat_confidence numeric)`                                                            | ✅ 8 refs  | —                                                                                                          |
| `mark_network_for_rescoring`             | `(())`                                                                                                                                                        | 🟡 3 refs  | Marks networks for rescoring when new observations are added                                               |
| `mark_quality_filtered_observations`     | `(())`                                                                                                                                                        | 🟡 4 refs  | —                                                                                                          |
| `ml_model_config_update_trigger`         | `(())`                                                                                                                                                        | ✅ 8 refs  | —                                                                                                          |
| `nearby_networks`                        | `(p_lat double precision, p_lon double precision, p_radius_meters integer)`                                                                                   | 🟡 3 refs  | —                                                                                                          |
| `network_add_notation`                   | `(target_bssid text, note_text text, note_type text)`                                                                                                         | ✅ 7 refs  | —                                                                                                          |
| `network_add_note`                       | `(network_bssid character varying, note_content text, note_type character varying, user_name character varying)`                                              | ✅ 10 refs | Add note to network via right-click context menu                                                           |
| `network_add_tag`                        | `(network_tags jsonb, tag_name text)`                                                                                                                         | ✅ 13 refs | —                                                                                                          |
| `network_has_tag`                        | `(network_tags jsonb, tag_name text)`                                                                                                                         | ✅ 11 refs | —                                                                                                          |
| `network_media_count`                    | `(target_bssid text)`                                                                                                                                         | ✅ 7 refs  | —                                                                                                          |
| `network_media_update_trigger`           | `(())`                                                                                                                                                        | ✅ 8 refs  | —                                                                                                          |
| `network_note_count`                     | `(network_bssid character varying)`                                                                                                                           | ✅ 5 refs  | —                                                                                                          |
| `network_remove_tag`                     | `(network_tags jsonb, tag_name text)`                                                                                                                         | ✅ 13 refs | —                                                                                                          |
| `network_tags_update_trigger`            | `(())`                                                                                                                                                        | ✅ 6 refs  | —                                                                                                          |
| `network_threat_scores_update_trigger`   | `(())`                                                                                                                                                        | ✅ 9 refs  | —                                                                                                          |
| `network_toggle_tag`                     | `(target_bssid text, tag_name text, tag_notes text)`                                                                                                          | ✅ 5 refs  | —                                                                                                          |
| `refresh_all_materialized_views`         | `(())`                                                                                                                                                        | ✅ 11 refs | —                                                                                                          |
| `refresh_network_computed_columns`       | `(())`                                                                                                                                                        | 🟡 4 refs  | —                                                                                                          |
| `refresh_network_locations`              | `(())`                                                                                                                                                        | ✅ 9 refs  | —                                                                                                          |
| `refresh_network_sibling_pairs`          | `(p_max_octet_delta integer, p_max_distance_m numeric, p_min_candidate_conf numeric, p_min_strong_conf numeric, p_seed_limit integer, p_incremental boolean)` | ✅ 13 refs | —                                                                                                          |
| `refresh_oui_sibling_profiles`           | `(())`                                                                                                                                                        | 🟡 2 refs  | —                                                                                                          |
| `refresh_wigle_networks_mv`              | `(())`                                                                                                                                                        | 🟡 4 refs  | —                                                                                                          |
| `set_network_sibling_override`           | `(p_bssid_a text, p_bssid_b text, p_relation text, p_updated_by text, p_notes text, p_confidence numeric)`                                                    | ✅ 7 refs  | —                                                                                                          |
| `set_surveillance_detections_updated_at` | `(())`                                                                                                                                                        | 🟡 1 refs  | —                                                                                                          |
| `update_courthouse_location`             | `(())`                                                                                                                                                        | 🟡 3 refs  | —                                                                                                          |
| `update_mobile_uploads_timestamp`        | `(())`                                                                                                                                                        | 🟡 3 refs  | —                                                                                                          |
| `update_networks_wigle_counts`           | `(())`                                                                                                                                                        | ✅ 6 refs  | —                                                                                                          |
| `wigle_bt_set_location`                  | `(())`                                                                                                                                                        | 🟡 1 refs  | —                                                                                                          |

### Extension Functions (pg_trgm — installed in app schema)

These are pg_trgm trigram-similarity functions relocated to the `app` schema during schema setup. They are internal to the extension and not called directly from application code.

| Function                                        |
| ----------------------------------------------- |
| `app.gin_extract_query_trgm`                    |
| `app.gin_extract_value_trgm`                    |
| `app.gin_trgm_consistent`                       |
| `app.gin_trgm_triconsistent`                    |
| `app.gtrgm_compress`                            |
| `app.gtrgm_consistent`                          |
| `app.gtrgm_decompress`                          |
| `app.gtrgm_distance`                            |
| `app.gtrgm_in`                                  |
| `app.gtrgm_options`                             |
| `app.gtrgm_out`                                 |
| `app.gtrgm_penalty`                             |
| `app.gtrgm_picksplit`                           |
| `app.gtrgm_same`                                |
| `app.gtrgm_union`                               |
| `app.set_limit`                                 |
| `app.show_limit`                                |
| `app.show_trgm`                                 |
| `app.similarity`                                |
| `app.similarity_dist`                           |
| `app.similarity_op`                             |
| `app.strict_word_similarity`                    |
| `app.strict_word_similarity_commutator_op`      |
| `app.strict_word_similarity_dist_commutator_op` |
| `app.strict_word_similarity_dist_op`            |
| `app.strict_word_similarity_op`                 |
| `app.word_similarity`                           |
| `app.word_similarity_commutator_op`             |
| `app.word_similarity_dist_commutator_op`        |
| `app.word_similarity_dist_op`                   |
| `app.word_similarity_op`                        |

---

## Functions — public schema (app-owned)

These application-logic functions were created in `public` rather than `app`. This is a known schema placement issue — they are functionally correct but should ideally live in `app`. Migration is a future backlog item.

| Function                                   | Arguments                                                    | Code Refs | Purpose                                                                               |
| ------------------------------------------ | ------------------------------------------------------------ | --------- | ------------------------------------------------------------------------------------- |
| `public.mark_network_for_threat_recompute` | `()`                                                         | ✅ 8 refs | Trigger fn — fires on observations INSERT to queue threat score recompute             |
| `public.refresh_api_network_mvs`           | `()`                                                         | ⚠️ 0 refs | Refresh api_network_explorer_mv and related MVs; called from background job runner    |
| `public.refresh_api_network_mvs_delta`     | `(bssids text[])`                                            | ⚠️ 0 refs | Delta variant — refreshes only changed BSSIDs                                         |
| `public.refresh_threat_scores_incremental` | `()`                                                         | 🟡 2 refs | Batch threat-score recompute from threat_scores_cache queue; tracks execution metrics |
| `public.api_network_delta_bssids`          | `(_since timestamptz, _limit int [, _safety_skew interval])` | ⚠️ 0 refs | Returns BSSIDs changed since a given timestamp; drives delta MV refresh               |

---

## Triggers

| Table                           | Trigger                                  | Event  | Timing | Function                                   |
| ------------------------------- | ---------------------------------------- | ------ | ------ | ------------------------------------------ |
| `app.deflock_cameras`           | `deflock_cameras_geom_trigger`           | INSERT | BEFORE | `deflock_cameras_set_geom()`               |
| `app.deflock_cameras`           | `deflock_cameras_geom_trigger`           | UPDATE | BEFORE | `deflock_cameras_set_geom()`               |
| `app.federal_courthouses`       | `courthouse_location_trigger`            | INSERT | BEFORE | `update_courthouse_location()`             |
| `app.federal_courthouses`       | `courthouse_location_trigger`            | UPDATE | BEFORE | `update_courthouse_location()`             |
| `app.ml_model_config`           | `ml_model_config_update`                 | UPDATE | BEFORE | `ml_model_config_update_trigger()`         |
| `app.mobile_uploads`            | `trg_update_mobile_uploads_timestamp`    | UPDATE | BEFORE | `update_mobile_uploads_timestamp()`        |
| `app.network_media`             | `network_media_update`                   | UPDATE | BEFORE | `network_media_update_trigger()`           |
| `app.network_tags`              | `network_tags_update`                    | UPDATE | BEFORE | `network_tags_update_trigger()`            |
| `app.network_threat_scores`     | `network_threat_scores_insert`           | INSERT | BEFORE | `network_threat_scores_update_trigger()`   |
| `app.network_threat_scores`     | `network_threat_scores_update`           | UPDATE | BEFORE | `network_threat_scores_update_trigger()`   |
| `app.observations`              | `trigger_mark_for_rescoring`             | INSERT | AFTER  | `mark_network_for_rescoring()`             |
| `app.observations`              | `trigger_mark_threat_recompute`          | INSERT | AFTER  | `mark_network_for_threat_recompute()`      |
| `app.surveillance_detections`   | `trg_surveillance_detections_updated_at` | UPDATE | BEFORE | `set_surveillance_detections_updated_at()` |
| `app.wigle_v2_bluetooth_search` | `wigle_bt_location_sync`                 | INSERT | BEFORE | `wigle_bt_set_location()`                  |
| `app.wigle_v2_bluetooth_search` | `wigle_bt_location_sync`                 | UPDATE | BEFORE | `wigle_bt_set_location()`                  |
| `app.wigle_v3_observations`     | `trg_wigle_v3_count_update`              | INSERT | AFTER  | `update_networks_wigle_counts()`           |
| `app.wigle_v3_observations`     | `trg_wigle_v3_count_update`              | DELETE | AFTER  | `update_networks_wigle_counts()`           |

---

## Sequences

All sequences are standard `BIGINT` auto-increment sequences backing `id` primary key columns.

### App schema sequences (45)

| Sequence                                  |
| ----------------------------------------- |
| `app.agency_office_coverage_notes_id_seq` |
| `app.agency_offices_id_seq`               |
| `app.ai_insights_id_seq`                  |
| `app.anchor_points_id_seq`                |
| `app.background_job_runs_id_seq`          |
| `app.deflock_cameras_id_seq`              |
| `app.device_sources_id_seq`               |
| `app.federal_courthouses_id_seq`          |
| `app.geocoding_cache_id_seq`              |
| `app.geocoding_job_runs_id_seq`           |
| `app.import_history_id_seq`               |
| `app.kismet_alerts_id_seq`                |
| `app.kismet_data_id_seq`                  |
| `app.kismet_datasources_id_seq`           |
| `app.kismet_devices_id_seq`               |
| `app.kismet_messages_id_seq`              |
| `app.kismet_packets_id_seq`               |
| `app.kismet_snapshots_id_seq`             |
| `app.kml_files_id_seq`                    |
| `app.kml_points_id_seq`                   |
| `app.location_markers_id_seq`             |
| `app.mac_randomization_suspects_id_seq`   |
| `app.ml_training_history_id_seq`          |
| `app.mobile_uploads_id_seq`               |
| `app.network_media_id_seq`                |
| `app.network_notes_id_seq`                |
| `app.network_tags_id_seq`                 |
| `app.network_threat_scores_id_seq`        |
| `app.note_media_id_seq`                   |
| `app.observations_v2_id_seq`              |
| `app.oui_device_groups_id_seq`            |
| `app.routes_id_seq`                       |
| `app.shotspotter_sensors_id_seq`          |
| `app.shotspotter_zones_id_seq`            |
| `app.sibling_runs_id_seq`                 |
| `app.ssid_history_id_seq`                 |
| `app.surveillance_detections_id_seq`      |
| `app.users_id_seq`                        |
| `app.wigle_import_run_pages_id_seq`       |
| `app.wigle_import_runs_id_seq`            |
| `app.wigle_ledger_events_id_seq`          |
| `app.wigle_saved_ssid_terms_id_seq`       |
| `app.wigle_v2_bluetooth_search_id_seq`    |
| `app.wigle_v2_networks_search_id_seq`     |
| `app.wigle_v3_observations_id_seq`        |

### Tiger schema sequences (16)

Installed by `postgis_tiger_geocoder`. Not used unless TIGER data is loaded.

| Sequence                  |
| ------------------------- |
| `tiger.addr_gid_seq`      |
| `tiger.addrfeat_gid_seq`  |
| `tiger.bg_gid_seq`        |
| `tiger.county_gid_seq`    |
| `tiger.cousub_gid_seq`    |
| `tiger.edges_gid_seq`     |
| `tiger.faces_gid_seq`     |
| `tiger.featnames_gid_seq` |
| `tiger.pagc_gaz_id_seq`   |
| `tiger.pagc_lex_id_seq`   |
| `tiger.pagc_rules_id_seq` |
| `tiger.place_gid_seq`     |
| `tiger.state_gid_seq`     |
| `tiger.tabblock_gid_seq`  |
| `tiger.tract_gid_seq`     |
| `tiger.zcta5_gid_seq`     |

---

## Indexes — Usage Summary

Stats from `pg_stat_user_indexes`. "Used" = scan count since last stats reset. Indexes with 0 scans are candidates for review.

> **Note:** A fresh Docker restart resets pg_stat counters. An index showing 0 scans may simply not have been exercised since the last restart, not necessarily unused. Cross-reference with query patterns before dropping.

### Hot indexes (≥100 scans) — 13

| Table                      | Index                               | Size    | Scans  | Unique |
| -------------------------- | ----------------------------------- | ------- | ------ | ------ |
| `networks`                 | `idx_networks_bssid_covering`       | 12 MB   | 37,262 | —      |
| `user_sessions`            | `idx_user_sessions_expires_at`      | 16 kB   | 15,472 | —      |
| `wigle_v3_observations`    | `idx_wigle_v3_obs_netid`            | 1176 kB | 12,460 | —      |
| `networks`                 | `idx_networks_bssid_upper`          | 7984 kB | 6,011  | —      |
| `network_tags`             | `idx_network_tags_bssid_upper`      | 160 kB  | 4,532  | —      |
| `radio_manufacturers`      | `idx_radio_manufacturers_oui`       | 1664 kB | 4,517  | —      |
| `oui_device_groups`        | `idx_oui_device_groups_oui`         | 176 kB  | 4,501  | —      |
| `wigle_v2_networks_search` | `wigle_v2_networks_search_unique`   | 12 MB   | 2,656  | ✅     |
| `api_network_explorer_mv`  | `idx_api_network_explorer_mv_bssid` | 9600 kB | 2,380  | ✅     |
| `radio_manufacturers`      | `idx_radio_manufacturers_prefix24`  | 1352 kB | 1,785  | —      |
| `wigle_v3_observations`    | `wigle_v3_obs_unique`               | 9136 kB | 1,514  | ✅     |
| `observations`             | `idx_observations_v2_bssid`         | 12 MB   | 256    | —      |
| `wigle_import_run_pages`   | `wigle_import_run_pages_unique`     | 48 kB   | 104    | ✅     |

### Active indexes (1–99 scans) — 24

| Table                      | Index                                          | Size    | Scans | Unique |
| -------------------------- | ---------------------------------------------- | ------- | ----- | ------ |
| `wigle_import_run_pages`   | `idx_wigle_import_run_pages_run_fetched_at`    | 48 kB   | 84    | —      |
| `wigle_ledger_events`      | `idx_wigle_ledger_events_ts_id`                | 32 kB   | 75    | —      |
| `kml_points`               | `idx_kml_points_kml_file_id`                   | 2472 kB | 38    | —      |
| `network_tags`             | `network_tags_bssid_unique`                    | 176 kB  | 30    | ✅     |
| `observations`             | `idx_observations_upper_bssid`                 | 12 MB   | 19    | —      |
| `api_network_explorer_mv`  | `idx_api_network_explorer_mv_type`             | 1992 kB | 17    | —      |
| `kml_files`                | `idx_kml_files_imported_at`                    | 16 kB   | 16    | —      |
| `wigle_v3_observations`    | `idx_wigle_v3_obs_netid_upper`                 | 1176 kB | 15    | —      |
| `networks_orphans`         | `idx_networks_orphans_moved_at`                | 40 kB   | 15    | —      |
| `wigle_v2_networks_search` | `idx_wigle_v2_bssid`                           | 7544 kB | 11    | —      |
| `observations`             | `idx_observations_v2_radio_type`               | 4664 kB | 11    | —      |
| `networks`                 | `idx_networks_source_device`                   | 1376 kB | 11    | —      |
| `kismet_packets`           | `idx_packets_phyname`                          | 14 MB   | 10    | —      |
| `kismet_devices`           | `idx_devices_phyname`                          | 40 kB   | 10    | —      |
| `kml_files`                | `idx_kml_files_file_hash`                      | 40 kB   | 10    | ✅     |
| `import_history`           | `idx_import_history_source_tag`                | 16 kB   | 10    | —      |
| `device_sources`           | `device_sources_code_key`                      | 16 kB   | 10    | ✅     |
| `wigle_import_runs`        | `idx_wigle_import_runs_started_at`             | 16 kB   | 9     | —      |
| `kml_files`                | `idx_kml_files_source_file`                    | 32 kB   | 5     | ✅     |
| `wigle_import_run_pages`   | `idx_wigle_import_run_pages_run_success_page`  | 48 kB   | 3     | —      |
| `user_sessions`            | `idx_user_sessions_token_hash`                 | 72 kB   | 2     | —      |
| `wigle_import_runs`        | `idx_wigle_import_runs_fingerprint_started_at` | 40 kB   | 2     | —      |
| `wigle_saved_ssid_terms`   | `wigle_saved_ssid_terms_normalized_idx`        | 16 kB   | 2     | ✅     |
| `wigle_import_runs`        | `idx_wigle_import_runs_status_started_at`      | 16 kB   | 1     | —      |

### Unused indexes (0 scans) — unique/constraint — 26

These enforce data integrity. Zero scans is expected for constraint indexes — they are used by the constraint engine, not by query planning.

| Table                          | Index                                                       | Size    |
| ------------------------------ | ----------------------------------------------------------- | ------- |
| `kismet_packets`               | `idx_kismet_packets_forensic_id`                            | 81 MB   |
| `network_threat_scores`        | `network_threat_scores_bssid_key`                           | 7768 kB |
| `api_wigle_networks_mv`        | `idx_wigle_networks_mv_bssid`                               | 7640 kB |
| `observations`                 | `observations_v2_natural_uniq`                              | 75 MB   |
| `deflock_cameras`              | `deflock_cameras_lat_lon_unique`                            | 7040 kB |
| `shotspotter_sensors`          | `idx_shotspotter_sensors_latlon`                            | 640 kB  |
| `geocoding_cache`              | `geocoding_cache_round_idx`                                 | 4944 kB |
| `agency_offices`               | `agency_offices_agency_office_type_name_city_state_key`     | 48 kB   |
| `surveillance_detections`      | `uq_surveillance_detections_bssid`                          | 40 kB   |
| `routes`                       | `routes_natural_uniq`                                       | 3504 kB |
| `anchor_points`                | `idx_anchor_points_bssid_location_label`                    | 32 kB   |
| `kismet_messages`              | `idx_kismet_messages_forensic_id`                           | 296 kB  |
| `oui_device_groups`            | `oui_device_groups_oui_key`                                 | 184 kB  |
| `agency_office_coverage_notes` | `agency_office_coverage_notes_legacy_agency_offices_id_key` | 16 kB   |
| `mobile_uploads`               | `mobile_uploads_s3_key_key`                                 | 16 kB   |
| `users`                        | `users_email_key`                                           | 16 kB   |
| `users`                        | `users_username_key`                                        | 16 kB   |
| `agency_office_coverage_notes` | `agency_office_coverage_notes_uniq`                         | 16 kB   |
| `kismet_alerts`                | `idx_kismet_alerts_forensic_id`                             | 16 kB   |
| `kismet_data`                  | `idx_kismet_data_forensic_id`                               | 16 kB   |
| `kismet_datasources`           | `idx_kismet_datasources_forensic_id`                        | 16 kB   |
| `kml_files`                    | `kml_files_wigle_transid_idx`                               | 16 kB   |
| `surveillance_density_zones`   | `idx_surveillance_density_zones_id`                         | 16 kB   |
| `wigle_v2_bluetooth_search`    | `wigle_bt_netid_loc_uniq`                                   | 152 kB  |
| `kismet_devices`               | `kismet_devices_devkey_key`                                 | 144 kB  |
| `kismet_snapshots`             | `idx_kismet_snapshots_forensic_id`                          | 128 kB  |

### Unused indexes (0 scans) — non-unique — 157

> These are candidates for investigation. Zero scans could mean: (a) stats reset after last use, (b) the query paths they were built for are no longer in use, or (c) they are redundant to other indexes.

| Table                          | Index                                              | Size       | Notes                                                                        |
| ------------------------------ | -------------------------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| `observations`                 | `obs_time_idx`                                     | 9984 kB    | —                                                                            |
| `wigle_v2_networks_search`     | `idx_wigle_v2_channel`                             | 984 kB     | —                                                                            |
| `api_wigle_networks_mv`        | `idx_wigle_networks_mv_has_v3`                     | 960 kB     | —                                                                            |
| `wigle_v2_bluetooth_search`    | `idx_wigle_bt_netid`                               | 96 kB      | —                                                                            |
| `network_sibling_pairs`        | `idx_network_sibling_pairs_source`                 | 96 kB      | —                                                                            |
| `wigle_v2_bluetooth_search`    | `idx_wigle_bt_bssid`                               | 96 kB      | —                                                                            |
| `wigle_v2_networks_search`     | `idx_wigle_v2_country`                             | 920 kB     | —                                                                            |
| `wigle_v2_networks_search`     | `idx_wigle_v2_encryption`                          | 912 kB     | —                                                                            |
| `wigle_v2_networks_search`     | `idx_wigle_v2_source`                              | 896 kB     | —                                                                            |
| `wigle_v2_bluetooth_search`    | `idx_wigle_bt_location`                            | 88 kB      | —                                                                            |
| `oui_device_groups`            | `idx_oui_device_groups_surveillance`               | 88 kB      | —                                                                            |
| `geocoding_cache`              | `geocoding_cache_provider_idx`                     | 872 kB     | —                                                                            |
| `shotspotter_sensors`          | `idx_shotspotter_sensors_geom`                     | 864 kB     | —                                                                            |
| `network_media`                | `idx_network_media_type`                           | 8192 bytes | —                                                                            |
| `network_media`                | `idx_network_media_created`                        | 8192 bytes | —                                                                            |
| `network_media`                | `idx_network_media_bssid`                          | 8192 bytes | —                                                                            |
| `ml_training_history`          | `idx_ml_training_history_model_version`            | 8192 bytes | —                                                                            |
| `ml_training_history`          | `idx_ml_training_history_model`                    | 8192 bytes | —                                                                            |
| `mac_randomization_suspects`   | `idx_mac_randomization_oui`                        | 8192 bytes | —                                                                            |
| `mac_randomization_suspects`   | `idx_mac_randomization_confidence`                 | 8192 bytes | —                                                                            |
| `location_markers`             | `idx_location_markers_location_3d`                 | 8192 bytes | —                                                                            |
| `hardware_inventory`           | `idx_hardware_inventory_rule`                      | 8192 bytes | —                                                                            |
| `location_markers`             | `idx_location_markers_location`                    | 8192 bytes | —                                                                            |
| `network_cooccurrence`         | `idx_cooccurrence_count`                           | 8192 bytes | —                                                                            |
| `network_cooccurrence`         | `idx_cooccurrence_bssid2`                          | 8192 bytes | —                                                                            |
| `network_cooccurrence`         | `idx_cooccurrence_bssid1`                          | 8192 bytes | —                                                                            |
| `kismet_alerts`                | `idx_alerts_location`                              | 8192 bytes | —                                                                            |
| `shotspotter_zones`            | `idx_shotspotter_zones_geom`                       | 8192 bytes | —                                                                            |
| `surveillance_density_zones`   | `idx_surveillance_density_zones_geom`              | 8192 bytes | —                                                                            |
| `kismet_devices`               | `idx_devices_location`                             | 80 kB      | —                                                                            |
| `oui_device_groups`            | `idx_oui_device_groups_allocation`                 | 80 kB      | —                                                                            |
| `network_threat_scores`        | `idx_network_threat_scores_bssid_upper`            | 7768 kB    | —                                                                            |
| `network_threat_scores`        | `idx_network_threat_scores_bssid`                  | 7768 kB    | —                                                                            |
| `threat_scores_cache`          | `threat_scores_cache_needs_recompute_idx`          | 752 kB     | —                                                                            |
| `deflock_cameras`              | `deflock_cameras_geom_idx`                         | 7328 kB    | —                                                                            |
| `wigle_v2_bluetooth_search`    | `idx_wigle_bt_country_region`                      | 72 kB      | —                                                                            |
| `networks_orphans`             | `idx_networks_orphans_ssid_trgm`                   | 72 kB      | —                                                                            |
| `network_sibling_pairs`        | `idx_network_sibling_pairs_corroborating`          | 64 kB      | —                                                                            |
| `wigle_v3_network_details`     | `idx_wigle_v3_city`                                | 64 kB      | —                                                                            |
| `wigle_v2_bluetooth_search`    | `idx_wigle_bt_lasttime`                            | 64 kB      | —                                                                            |
| `kml_points`                   | `idx_kml_points_observed_at`                       | 5920 kB    | —                                                                            |
| `api_network_explorer_mv`      | `idx_api_network_explorer_mv_stationary`           | 5832 kB    | —                                                                            |
| `api_network_explorer_mv`      | `idx_api_network_explorer_mv_ml_score`             | 5816 kB    | —                                                                            |
| `kismet_packets`               | `idx_packets_location`                             | 57 MB      | Spatial GiST — 57 MB; 0 scans since restart                                  |
| `api_network_explorer_mv`      | `idx_api_network_explorer_mv_rule_score`           | 5608 kB    | —                                                                            |
| `api_network_explorer_mv`      | `idx_api_network_explorer_mv_threat`               | 5488 kB    | —                                                                            |
| `radio_manufacturers`          | `idx_radio_manufacturers_manufacturer_gin`         | 5304 kB    | —                                                                            |
| `wigle_v3_observations`        | `idx_wigle_v3_obs_location`                        | 5208 kB    | —                                                                            |
| `wigle_v2_networks_search`     | `idx_wigle_v2_location`                            | 5208 kB    | —                                                                            |
| `api_wigle_networks_mv`        | `idx_wigle_networks_mv_display_coords`             | 5024 kB    | —                                                                            |
| `api_network_explorer_mv`      | `idx_api_network_explorer_mv_observed_at`          | 4816 kB    | —                                                                            |
| `observations`                 | `idx_observations_v2_device_id`                    | 4744 kB    | —                                                                            |
| `kml_points`                   | `idx_kml_points_bssid`                             | 4536 kB    | —                                                                            |
| `threat_scores_cache`          | `threat_scores_cache_threat_score_idx`             | 4432 kB    | —                                                                            |
| `wigle_v2_networks_search`     | `idx_wigle_v2_location_time`                       | 4392 kB    | —                                                                            |
| `wigle_v2_networks_search`     | `idx_wigle_v2_country_region_encryption_lasttime`  | 4096 kB    | —                                                                            |
| `federal_courthouses`          | `idx_federal_courthouses_location`                 | 40 kB      | —                                                                            |
| `network_tags`                 | `idx_network_tags_wigle_pending`                   | 40 kB      | —                                                                            |
| `network_tags`                 | `idx_network_tags_threat`                          | 40 kB      | —                                                                            |
| `network_tags`                 | `idx_network_tags_tags_gin`                        | 40 kB      | —                                                                            |
| `background_job_runs`          | `idx_background_job_runs_status`                   | 40 kB      | —                                                                            |
| `background_job_runs`          | `idx_background_job_runs_job_name_started_at`      | 40 kB      | —                                                                            |
| `surveillance_detections`      | `idx_surveillance_detections_bssid`                | 40 kB      | —                                                                            |
| `surveillance_detections`      | `idx_surveillance_detections_threat_score`         | 40 kB      | —                                                                            |
| `wigle_v3_network_details`     | `idx_wigle_v3_region`                              | 40 kB      | —                                                                            |
| `network_sibling_pairs`        | `idx_network_sibling_pairs_bssid2`                 | 392 kB     | —                                                                            |
| `network_sibling_pairs`        | `idx_network_sibling_pairs_bssid2_upper`           | 392 kB     | —                                                                            |
| `network_sibling_pairs`        | `idx_network_sibling_pairs_strength`               | 368 kB     | —                                                                            |
| `observations`                 | `idx_observations_bssid_time_consolidated`         | 32 MB      | Compound index on bssid+time; 0 scans — covered by idx_observations_v2_bssid |
| `anchor_points`                | `idx_anchor_points_bssid`                          | 32 kB      | —                                                                            |
| `geocoding_job_runs`           | `idx_geocoding_job_runs_started_at`                | 32 kB      | —                                                                            |
| `api_wigle_networks_mv`        | `idx_wigle_networks_mv_network_type`               | 32 kB      | —                                                                            |
| `api_wigle_networks_mv`        | `idx_wigle_networks_mv_nonstationary`              | 32 kB      | —                                                                            |
| `api_wigle_networks_mv`        | `idx_wigle_networks_mv_has_local_match`            | 32 kB      | —                                                                            |
| `agency_offices`               | `idx_agency_offices_address_validated_at`          | 32 kB      | —                                                                            |
| `network_tags`                 | `idx_network_tags_investigate`                     | 32 kB      | —                                                                            |
| `agency_offices`               | `idx_agency_offices_location`                      | 32 kB      | —                                                                            |
| `agency_offices`               | `idx_agency_offices_normalized_phone`              | 32 kB      | —                                                                            |
| `wigle_ledger_events`          | `idx_wigle_ledger_events_kind_ts`                  | 32 kB      | —                                                                            |
| `wigle_v2_bluetooth_search`    | `idx_wigle_bt_type`                                | 32 kB      | —                                                                            |
| `network_sibling_pairs`        | `idx_network_sibling_pairs_bssid1`                 | 288 kB     | —                                                                            |
| `network_sibling_pairs`        | `idx_network_sibling_pairs_bssid1_upper`           | 288 kB     | —                                                                            |
| `geocoding_cache`              | `idx_geocoding_cache_pending_poi`                  | 2848 kB    | —                                                                            |
| `network_sibling_pairs`        | `idx_network_sibling_pairs_conf`                   | 272 kB     | —                                                                            |
| `observations`                 | `idx_obs_geom_gist`                                | 27 MB      | Spatial index on observations; 0 scans                                       |
| `oui_device_groups`            | `idx_oui_device_groups_threat`                     | 256 kB     | —                                                                            |
| `wigle_v2_networks_search`     | `idx_wigle_v2_lasttime`                            | 2520 kB    | —                                                                            |
| `kml_points`                   | `idx_kml_points_network_type`                      | 2408 kB    | —                                                                            |
| `kismet_packets`               | `idx_packets_timestamp`                            | 21 MB      | —                                                                            |
| `observations`                 | `idx_obs_lat_lon`                                  | 21 MB      | —                                                                            |
| `geocoding_cache`              | `idx_geocoding_cache_pending_address`              | 1744 kB    | —                                                                            |
| `ssid_history`                 | `idx_ssid_history_bssid`                           | 1648 kB    | —                                                                            |
| `network_tags`                 | `idx_network_tags_bssid`                           | 160 kB     | —                                                                            |
| `api_network_explorer_mv`      | `idx_api_network_explorer_mv_ignored`              | 16 kB      | —                                                                            |
| `agency_office_coverage_notes` | `idx_agency_office_coverage_notes_field_office_id` | 16 kB      | —                                                                            |
| `agency_offices`               | `idx_agency_offices_address_validation_provider`   | 16 kB      | —                                                                            |
| `agency_offices`               | `idx_agency_offices_agency`                        | 16 kB      | —                                                                            |
| `agency_offices`               | `idx_agency_offices_source_status`                 | 16 kB      | —                                                                            |
| `agency_offices`               | `idx_agency_offices_state`                         | 16 kB      | —                                                                            |
| `agency_offices`               | `idx_agency_offices_type`                          | 16 kB      | —                                                                            |
| `ai_insights`                  | `idx_ai_insights_created`                          | 16 kB      | —                                                                            |
| `ai_insights`                  | `idx_ai_insights_user_created`                     | 16 kB      | —                                                                            |
| `ai_insights`                  | `idx_ai_insights_user_id`                          | 16 kB      | —                                                                            |
| `kismet_alerts`                | `idx_alerts_timestamp`                             | 16 kB      | —                                                                            |
| `anchor_points`                | `idx_anchor_points_location_label`                 | 16 kB      | —                                                                            |
| `federal_courthouses`          | `idx_federal_courthouses_circuit`                  | 16 kB      | —                                                                            |
| `federal_courthouses`          | `idx_federal_courthouses_district`                 | 16 kB      | —                                                                            |
| `federal_courthouses`          | `idx_federal_courthouses_state`                    | 16 kB      | —                                                                            |
| `federal_courthouses`          | `idx_federal_courthouses_type`                     | 16 kB      | —                                                                            |
| `import_history`               | `idx_import_history_started_at`                    | 16 kB      | —                                                                            |
| `location_markers`             | `idx_location_markers_type`                        | 16 kB      | —                                                                            |
| `mobile_uploads`               | `idx_mobile_uploads_created_at`                    | 16 kB      | —                                                                            |
| `mobile_uploads`               | `idx_mobile_uploads_source_tag`                    | 16 kB      | —                                                                            |
| `mobile_uploads`               | `idx_mobile_uploads_status`                        | 16 kB      | —                                                                            |
| `network_notes`                | `idx_network_notes_bssid`                          | 16 kB      | —                                                                            |
| `network_notes`                | `idx_network_notes_bssid_active`                   | 16 kB      | —                                                                            |
| `network_notes`                | `idx_network_notes_bssid_upper`                    | 16 kB      | —                                                                            |
| `network_notes`                | `idx_network_notes_created`                        | 16 kB      | —                                                                            |
| `network_notes`                | `idx_network_notes_user`                           | 16 kB      | —                                                                            |
| `network_sibling_overrides`    | `idx_network_sibling_overrides_relation`           | 16 kB      | —                                                                            |
| `network_tags`                 | `idx_network_tags_ignored`                         | 16 kB      | —                                                                            |
| `note_media`                   | `idx_note_media_bssid`                             | 16 kB      | —                                                                            |
| `note_media`                   | `idx_note_media_created`                           | 16 kB      | —                                                                            |
| `note_media`                   | `idx_note_media_note_id`                           | 16 kB      | —                                                                            |
| `note_media`                   | `idx_note_media_note_id_created`                   | 16 kB      | —                                                                            |
| `shotspotter_zones`            | `idx_shotspotter_zones_city`                       | 16 kB      | —                                                                            |
| `shotspotter_zones`            | `idx_shotspotter_zones_contract_status`            | 16 kB      | —                                                                            |
| `surveillance_detections`      | `idx_surveillance_detections_device_type`          | 16 kB      | —                                                                            |
| `user_sessions`                | `idx_user_sessions_user_id`                        | 16 kB      | —                                                                            |
| `wigle_v2_bluetooth_search`    | `idx_wigle_bt_mfgrid`                              | 16 kB      | —                                                                            |
| `wigle_import_runs`            | `idx_wigle_import_runs_state_started_at`           | 16 kB      | —                                                                            |
| `analytics_summary_mv`         | `idx_analytics_summary_mv_type`                    | 16 kB      | —                                                                            |
| `api_wigle_networks_mv`        | `idx_wigle_networks_mv_mfgrid`                     | 16 kB      | —                                                                            |
| `surveillance_density_zones`   | `idx_surveillance_density_zones_weight`            | 16 kB      | —                                                                            |
| `surveillance_density_zones`   | `idx_surveillance_density_zones_ratio`             | 16 kB      | —                                                                            |
| `wigle_v2_networks_search`     | `idx_wigle_v2_bssid_oui24_expr`                    | 1584 kB    | —                                                                            |
| `routes`                       | `idx_routes_geom`                                  | 1504 kB    | —                                                                            |
| `observations`                 | `idx_obs_device_time`                              | 15 MB      | —                                                                            |
| `network_locations`            | `idx_network_locations_bssid_ci`                   | 15 MB      | —                                                                            |
| `wigle_v3_network_details`     | `idx_wigle_v3_trilat_trilon`                       | 144 kB     | —                                                                            |
| `network_threat_scores`        | `idx_network_threat_scores_scored_at`              | 1432 kB    | —                                                                            |
| `kismet_packets`               | `idx_packets_sourcemac`                            | 14 MB      | —                                                                            |
| `kml_points`                   | `idx_kml_points_location`                          | 14 MB      | —                                                                            |
| `threat_scores_cache`          | `threat_scores_cache_computed_at_idx`              | 1376 kB    | —                                                                            |
| `threat_scores_cache`          | `threat_scores_cache_threat_level_idx`             | 1368 kB    | —                                                                            |
| `networks`                     | `idx_networks_threat_updated_at`                   | 1368 kB    | —                                                                            |
| `network_threat_scores`        | `idx_network_threat_scores_threat_level`           | 1360 kB    | —                                                                            |
| `deflock_cameras`              | `deflock_cameras_state_idx`                        | 1216 kB    | —                                                                            |
| `kismet_devices`               | `idx_devices_devmac`                               | 120 kB     | —                                                                            |
| `wigle_v3_observations`        | `idx_wigle_v3_obs_time`                            | 1160 kB    | —                                                                            |
| `routes`                       | `idx_routes_device_observed`                       | 1152 kB    | —                                                                            |
| `network_sibling_pairs`        | `idx_network_sibling_pairs_pair_strength`          | 112 kB     | —                                                                            |
| `network_sibling_pairs`        | `idx_network_sibling_pairs_rule`                   | 112 kB     | —                                                                            |
| `wigle_v2_networks_search`     | `idx_wigle_v2_city`                                | 1104 kB    | —                                                                            |
| `kml_points`                   | `idx_kml_points_network_id`                        | 11 MB      | —                                                                            |
| `wigle_v2_networks_search`     | `idx_wigle_v2_ssid`                                | 1096 kB    | —                                                                            |
| `orphan_network_backfills`     | `idx_orphan_network_backfills_status`              | 104 kB     | —                                                                            |

### Tiger schema indexes — 36

All tiger indexes have 0 scans (no TIGER data loaded). Installed by `postgis_tiger_geocoder`.

---

## Foreign Keys

| Table                                              | Column            | References                           | On Delete |
| -------------------------------------------------- | ----------------- | ------------------------------------ | --------- |
| `app.agency_office_coverage_notes.field_office_id` | `field_office_id` | `app.agency_offices.id`              | CASCADE   |
| `app.ai_insights.user_id`                          | `user_id`         | `app.users.id`                       | SET NULL  |
| `app.kml_points.kml_file_id`                       | `kml_file_id`     | `app.kml_files.id`                   | CASCADE   |
| `app.ml_training_history.version`                  | `version`         | `app.ml_model_metadata.version`      | NO ACTION |
| `app.ml_training_history.version`                  | `version`         | `app.ml_model_metadata.model_type`   | NO ACTION |
| `app.ml_training_history.model_type`               | `model_type`      | `app.ml_model_metadata.version`      | NO ACTION |
| `app.ml_training_history.model_type`               | `model_type`      | `app.ml_model_metadata.model_type`   | NO ACTION |
| `app.mobile_uploads.history_id`                    | `history_id`      | `app.import_history.id`              | NO ACTION |
| `app.network_cooccurrence.bssid1`                  | `bssid1`          | `app.networks.bssid`                 | CASCADE   |
| `app.network_cooccurrence.bssid2`                  | `bssid2`          | `app.networks.bssid`                 | CASCADE   |
| `app.network_sibling_pairs.run_id`                 | `run_id`          | `app.sibling_runs.id`                | NO ACTION |
| `app.network_threat_scores.bssid`                  | `bssid`           | `app.networks.bssid`                 | CASCADE   |
| `app.networks.source_device`                       | `source_device`   | `app.device_sources.code`            | NO ACTION |
| `app.note_media.note_id`                           | `note_id`         | `app.network_notes.id`               | CASCADE   |
| `app.observations.bssid`                           | `bssid`           | `app.networks.bssid`                 | NO ACTION |
| `app.observations.device_id`                       | `device_id`       | `app.device_sources.code`            | NO ACTION |
| `app.orphan_network_backfills.bssid`               | `bssid`           | `app.networks_orphans.bssid`         | CASCADE   |
| `app.routes.device_id`                             | `device_id`       | `app.device_sources.code`            | NO ACTION |
| `app.ssid_history.bssid`                           | `bssid`           | `app.networks.bssid`                 | NO ACTION |
| `app.surveillance_detections.bssid`                | `bssid`           | `app.networks.bssid`                 | CASCADE   |
| `app.threat_scores_cache.bssid`                    | `bssid`           | `app.networks.bssid`                 | CASCADE   |
| `app.user_sessions.user_id`                        | `user_id`         | `app.users.id`                       | CASCADE   |
| `app.wigle_import_run_pages.run_id`                | `run_id`          | `app.wigle_import_runs.id`           | CASCADE   |
| `app.wigle_v3_observations.netid`                  | `netid`           | `app.wigle_v3_network_details.netid` | CASCADE   |

---

## Findings & Observations

### Schema Placement

- **5 app functions live in `public`** instead of `app`: `mark_network_for_threat_recompute`, `refresh_api_network_mvs`, `refresh_api_network_mvs_delta`, `refresh_threat_scores_incremental`, `api_network_delta_bssids`. These are fully functional but should be migrated to `app` in a future maintenance migration.

### Index Health

- **157 non-unique indexes show 0 scans.** Most of these are large data tables (kismet_packets, observations) where stats were reset on Docker restart. Genuine redundancy candidates require longer-running observation.
- **Known redundancy cluster (network_threat_scores):** Three separate BSSID indexes exist — `idx_network_threat_scores_bssid`, `idx_network_threat_scores_bssid_upper`, and the unique `network_threat_scores_bssid_key`. The non-unique ones duplicate coverage. Tracked in `docs/schema/indexes.md`.
- **network_sibling_pairs bssid1/bssid2 double-indexing:** Both case-sensitive and upper-case variants exist (`idx_network_sibling_pairs_bssid1` + `idx_network_sibling_pairs_bssid1_upper`). The upper-case variants may be redundant if BSSID is always stored upper-case.

### Zero-Row Tables

The following tables have 0 estimated rows and may be either unused or recently initialized:

- `app.network_cooccurrence` (40 kB) — 9 code refs
- `app.network_media` (40 kB) — 17 code refs
- `app.ml_training_history` (32 kB) — 7 code refs
- `app.mac_randomization_suspects` (32 kB) — 15 code refs
- `app.hardware_inventory` (24 kB) — 0 code refs
- `app.ml_model_metadata` (16 kB) — 5 code refs

### Largest Tables

| Table                          | Total Size | Rows (est.) |
| ------------------------------ | ---------- | ----------- |
| `app.kismet_packets`           | 713 MB     | 2,100,783   |
| `app.observations`             | 399 MB     | 685,788     |
| `app.kml_points`               | 184 MB     | 316,445     |
| `app.network_threat_scores`    | 150 MB     | 195,224     |
| `app.geocoding_cache`          | 142 MB     | 124,188     |
| `app.wigle_v2_networks_search` | 79 MB      | 108,354     |
| `app.networks`                 | 75 MB      | 200,653     |
| `app.network_locations`        | 66 MB      | 188,961     |
| `app.wigle_v3_observations`    | 43 MB      | 125,706     |
| `app.deflock_cameras`          | 41 MB      | 178,053     |

### Low Code-Coverage Tables

Tables with 0 code references — may be orphaned, import-only, or accessed via raw SQL:

- `app.hardware_inventory` (24 kB, -1 rows)

### Tiger Geocoder Status

The `postgis_tiger_geocoder` extension is installed (schema `tiger`) but no TIGER data has been loaded. All tiger tables are empty. The geocoding stack currently uses a separate external reverse-geocoding service via `geocoding_cache` and is not dependent on TIGER.

---

## Referential Integrity Analysis

This section inventories every 'bssid-like' and '\*\_id' column in the `app` schema, identifies which lack formal FK constraints, measures actual orphan counts from live data, and assigns a recommendation tier.

### Primary Key Coverage

All 62 `app` tables have a primary key. ✅ No gaps.

---

### Existing FK Constraints

24 FK constraints are currently enforced:

| Table.Column                                   | → References                     | On Delete |
| ---------------------------------------------- | -------------------------------- | --------- |
| `agency_office_coverage_notes.field_office_id` | `agency_offices.id`              | CASCADE   |
| `ai_insights.user_id`                          | `users.id`                       | SET NULL  |
| `kml_points.kml_file_id`                       | `kml_files.id`                   | CASCADE   |
| `ml_training_history.version/model_type`       | `ml_model_metadata`              | NO ACTION |
| `mobile_uploads.history_id`                    | `import_history.id`              | NO ACTION |
| `network_cooccurrence.bssid1/2`                | `networks.bssid`                 | CASCADE   |
| `network_sibling_pairs.run_id`                 | `sibling_runs.id`                | NO ACTION |
| `network_threat_scores.bssid`                  | `networks.bssid`                 | CASCADE   |
| `networks.source_device`                       | `device_sources.code`            | NO ACTION |
| `note_media.note_id`                           | `network_notes.id`               | CASCADE   |
| `observations.bssid`                           | `networks.bssid`                 | NO ACTION |
| `observations.device_id`                       | `device_sources.code`            | NO ACTION |
| `orphan_network_backfills.bssid`               | `networks_orphans.bssid`         | CASCADE   |
| `routes.device_id`                             | `device_sources.code`            | NO ACTION |
| `ssid_history.bssid`                           | `networks.bssid`                 | NO ACTION |
| `surveillance_detections.bssid`                | `networks.bssid`                 | CASCADE   |
| `threat_scores_cache.bssid`                    | `networks.bssid`                 | CASCADE   |
| `user_sessions.user_id`                        | `users.id`                       | CASCADE   |
| `wigle_import_run_pages.run_id`                | `wigle_import_runs.id`           | CASCADE   |
| `wigle_v3_observations.netid`                  | `wigle_v3_network_details.netid` | CASCADE   |

---

### FK Candidates — Missing Constraints

Columns that semantically reference another table but have no enforced constraint. Each entry includes an orphan count measured against live data and a recommendation.

#### Priority 1 — Add FK (clean data, natural ownership)

These columns have **zero orphans** and a clear owning table. Adding a FK is low-risk and immediately improves integrity.

| Table.Column                       | Logical Referent | Orphans         | Recommended Action              | Notes                                                                                                                     |
| ---------------------------------- | ---------------- | --------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `network_locations.bssid`          | `networks.bssid` | **0 / 188,961** | `ADD FK ... ON DELETE CASCADE`  | Core relationship — locations always belong to a network. No orphans detected in full table scan.                         |
| `network_tags.bssid`               | `networks.bssid` | **6 / 2,701**   | `ADD FK ... ON DELETE CASCADE`  | 6 orphaned tags (0.2%). Prune first, then constrain. Tags must be anchored to a network.                                  |
| `network_notes.bssid`              | `networks.bssid` | **1 / 16**      | `ADD FK ... ON DELETE CASCADE`  | 1 orphaned note. Clean before constraining.                                                                               |
| `network_sibling_pairs.bssid1`     | `networks.bssid` | **0 / 10,655**  | `ADD FK ... ON DELETE CASCADE`  | Zero orphans. Sibling pairs are always derived from known networks.                                                       |
| `network_sibling_pairs.bssid2`     | `networks.bssid` | **0 / 10,655**  | `ADD FK ... ON DELETE CASCADE`  | Same as bssid1.                                                                                                           |
| `network_sibling_overrides.bssid1` | `networks.bssid` | **0 / 109**     | `ADD FK ... ON DELETE CASCADE`  | User-authored overrides — must reference real networks.                                                                   |
| `network_sibling_overrides.bssid2` | `networks.bssid` | **0 / 109**     | `ADD FK ... ON DELETE CASCADE`  | Same as bssid1.                                                                                                           |
| `anchor_points.bssid`              | `networks.bssid` | **0 / 338**     | `ADD FK ... ON DELETE SET NULL` | Anchor points reference known signal sources. ON DELETE SET NULL preserves the anchor location if the network is removed. |

#### Priority 2 — Investigate Before Acting

These columns have a plausible referent but orphan counts or type mismatches require investigation before adding a constraint.

| Table.Column                      | Logical Referent                 | Orphans                          | Recommended Action              | Notes                                                                                                                                                                                                                |
| --------------------------------- | -------------------------------- | -------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `network_media.bssid`             | `networks.bssid`                 | **0 / 0** (table empty)          | Add FK when table has data      | No live data to measure. Table structure is correct.                                                                                                                                                                 |
| `note_media.bssid`                | `networks.bssid`                 | **0 / 0** (table empty)          | Add FK when table has data      | Same — empty table, no orphan risk yet.                                                                                                                                                                              |
| `kml_points.bssid`                | `networks.bssid`                 | **~260 / 5,000** sampled (~5.2%) | Investigate before constraining | KML staging rows may pre-date network promotion. BSSIDs may be populated before the network row exists. A FK would break the staging→promotion pipeline unless deferred or nullable. Consider FK ON DELETE SET NULL. |
| `wigle_v2_networks_search.bssid`  | `networks.bssid`                 | **5,000 / 5,000** sampled        | **Do NOT add FK**               | WiGLE data is imported before local promotion. These BSSIDs are external and intentionally may not exist in `networks`. This is the source, not a child.                                                             |
| `wigle_v2_bluetooth_search.bssid` | `networks.bssid`                 | **2,004 / 2,008**                | **Do NOT add FK**               | Same as above — WiGLE Bluetooth raw data, pre-promotion staging.                                                                                                                                                     |
| `wigle_v2_bluetooth_search.netid` | `wigle_v3_network_details.netid` | **2,008 / 2,008**                | **Do NOT add FK**               | These are independent WiGLE data sources. The netid is a WiGLE-assigned string, not a local PK reference.                                                                                                            |

#### Priority 3 — By Design (not FK candidates)

| Table.Column                                            | Value Type                   | Reason No FK Needed                                                                                                                                                                                            |
| ------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kismet_packets.session_id`                             | Free-text string             | Kismet session identifier — no `kismet_sessions` table exists. Denormalized by design from Kismet SQLite source.                                                                                               |
| `kismet_devices.session_id`                             | Free-text string             | Same — Kismet session label, not a FK.                                                                                                                                                                         |
| `kismet_alerts.session_id`                              | Free-text string             | Same.                                                                                                                                                                                                          |
| `kismet_messages.session_id`                            | Free-text string             | Same.                                                                                                                                                                                                          |
| `kismet_datasources.session_id`                         | Free-text string             | Same.                                                                                                                                                                                                          |
| `kismet_data.session_id`                                | Free-text string             | Same.                                                                                                                                                                                                          |
| `kismet_snapshots.session_id`                           | Free-text string             | Same.                                                                                                                                                                                                          |
| `deflock_cameras.source_id`                             | Numeric string (external ID) | External Deflock/DroneSentry system ID — no local referent table.                                                                                                                                              |
| `shotspotter_sensors.sensor_id`                         | Text (external ID)           | ShotSpotter vendor-assigned sensor identifier — no local referent.                                                                                                                                             |
| `mobile_uploads.device_id`                              | Hex device fingerprint       | Client-generated device hash (e.g. `34f2729658d8e5aa`) — not a FK to any local table.                                                                                                                          |
| `network_notes.user_id`                                 | Username string              | Stores username strings (e.g. `geospatial_user`) — not an integer FK to `users.id`. Type mismatch makes FK impossible without schema change.                                                                   |
| `api_mv_refresh_state.last_refresh_id`                  | bigint                       | Operational state tracker, not a reference to a specific row.                                                                                                                                                  |
| `kml_points.network_id`                                 | Text                         | Stores the WiGLE/Kismet network identifier string, not `networks.id` (an integer). Naming is misleading — not a FK.                                                                                            |
| `routes.run_id`                                         | integer                      | Tested against `import_history` (35k/37k orphaned) and `wigle_import_runs` (too many orphans). Most likely an internal sequence counter or pre-FK era field. Not a safe FK candidate without further research. |
| `hardware_inventory.bssid1/bssid2`                      | text                         | Table has -1 estimated rows (autovacuum hasn't run). Defer until table purpose is established.                                                                                                                 |
| `agency_office_coverage_notes.legacy_agency_offices_id` | integer                      | **14/14 orphaned** — this is a legacy migration column; the real FK is `field_office_id → agency_offices.id`. This column should be removed or nulled out in a cleanup migration.                              |
| `wigle_v3_network_details.netid`                        | text                         | This IS the PK for `wigle_v3_network_details`. Referenced correctly by the existing FK on `wigle_v3_observations.netid`.                                                                                       |

---

### Referential Integrity — Prioritized Recommendations

| Priority | Migration                                                                                    | Tables Affected              | Effort | Risk                    |
| -------- | -------------------------------------------------------------------------------------------- | ---------------------------- | ------ | ----------------------- |
| 🔴 P1    | Add FK `network_locations.bssid → networks.bssid` (ON DELETE CASCADE)                        | network_locations            | Low    | None — 0 orphans        |
| 🔴 P1    | Add FK `network_sibling_pairs.bssid1/2 → networks.bssid` (ON DELETE CASCADE)                 | network_sibling_pairs        | Low    | None — 0 orphans        |
| 🔴 P1    | Add FK `network_sibling_overrides.bssid1/2 → networks.bssid` (ON DELETE CASCADE)             | network_sibling_overrides    | Low    | None — 0 orphans        |
| 🟡 P2    | Prune 6 orphaned tags, then add FK `network_tags.bssid → networks.bssid`                     | network_tags                 | Low    | Must prune first        |
| 🟡 P2    | Prune 1 orphaned note, then add FK `network_notes.bssid → networks.bssid`                    | network_notes                | Low    | Must prune first        |
| 🟡 P2    | Add FK `anchor_points.bssid → networks.bssid` (ON DELETE SET NULL)                           | anchor_points                | Low    | 0 orphans but nullable  |
| 🟢 P3    | Investigate `kml_points.bssid` orphan rate (5.2% sampled) — possibly deferred FK             | kml_points                   | Medium | Staging pipeline impact |
| 🟢 P3    | Clean up `legacy_agency_offices_id` column (100% orphaned, superseded by field_office_id FK) | agency_office_coverage_notes | Low    | Safe to null/drop       |
| 🔵 P4    | Rename `kml_points.network_id` to `wigle_network_id` (clarify it is not a FK)                | kml_points                   | Low    | Rename only             |
| 🔵 P4    | Consider adding `kismet_sessions` table and backfilling `session_id` as proper FK            | kismet\_\* (7 tables)        | High   | Requires schema design  |

> **Note:** All FK additions should be applied via the standard `apply-migration.sh` workflow. Each constraint addition is a separate migration to enable atomic rollback.

---

_End of audit — generated 2026-06-04 19:33:28 UTC_
