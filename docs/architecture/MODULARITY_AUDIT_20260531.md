# Architectural Modularity & Coupling Audit (2026-05-31)

This document provides a comprehensive structural assessment of the `shadowcheck-web` repository. It evaluates modules based on their architectural roles, responsibility boundaries, side effects, coupling profiles, and systemic progression since the prior architectural audit.

---

## 1. Executive Summary

This modularity audit evaluates the codebase layout, module boundaries, and dependency maps of the `shadowcheck-web` system. It assesses architecture based on role purity rather than line-count thresholds, following the Express backend and React frontend designs.

### Core Developments Since the Prior Audit (2026-05-28)

1. **Expansion of Sibling Rules Taxonomy**:
   - A series of migrations (`20260528_*` through `20260530_*`) introduced advanced vendor-specific rules in the database rules engine.
   - Added custom rules for **Ubiquiti UniFi VAP**, **Mist Systems VAP**, **Comcast Vantiva**, **Netgear Dual-Band**, **Arcadyan HOME-EE7D**, and **GM Vehicle Hotspots** (with complementary scan mappings).
   - Tightened **Locally Administered Address (LAA)** constraints, preventing private or random MAC addresses from creating false positives.

2. **VisINT Auto-Correlation Ingestion Pipeline**:
   - Integrated the visual intelligence ingestion pipeline. The backend implements `correlateVisINT()` within `server/src/services/observationService.ts` to coordinate spatial-temporal scoring, metadata extraction, base64 media attachment, and tag classification.
   - The frontend implements the drag-and-drop ingestion interface at `client/src/components/visint/VisIntUploader.tsx`.

3. **Security Hardening**:
   - Hardened external utility invocations (specifically EXIF extraction paths). Replaced standard `child_process.exec` shell interpolation with `execFile` parameter arrays, mitigating command injection vulnerabilities.

---

## 2. Server-Side Orchestrator Map

### 2.1 Entry Bootstrap Flow

The Express application is bootstrapped starting from `server/server.ts` (API server) and `server/static-server.ts` (production client delivery). The boot sequence is delegated to modules under `server/src/core/initialization/` to structure the loading sequence:

```
server/server.ts
  └── core/initialization/appInit.ts
        ├── credentialsInit.ts    (Loads Secrets Manager configuration)
        ├── databaseInit.ts       (Verifies database pool connectivity)
        ├── middlewareInit.ts     (Registers parsers, rate limiters, and CORS)
        ├── routesInit.ts         (Registers dynamic router layers /api/v1 and /api/v2)
        ├── backgroundJobsInit.ts (Starts Node-Schedule schedulers)
        └── errorHandlingInit.ts  (Registers unified exception boundaries)
```

### 2.2 Routing Layer

All API route definitions are versioned under `server/src/api/routes/` and map to the following paths:

| Router Path                     | Route File                    | Primary Purpose / Sub-routes                                |
| :------------------------------ | :---------------------------- | :---------------------------------------------------------- |
| `/api/v1/auth`                  | `v1/auth.ts`                  | Handles user authentication, token signing, and passwords.  |
| `/api/v1/admin`                 | `v1/admin.ts`                 | Entry router directing sub-routes to admin helper systems.  |
| `/api/v1/admin/siblings`        | `v1/admin/siblings.ts`        | Controls sibling detection execution and stat queries.      |
| `/api/v1/admin/users`           | `v1/admin/users.ts`           | Handles administrative user accounts provisioning.          |
| `/api/v1/admin/backup`          | `v1/admin/backup.ts`          | Triggers manual backup SQL dump runs.                       |
| `/api/v1/admin/oui`             | `v1/admin/oui.ts`             | Manages MAC address manufacturer registries.                |
| `/api/v1/admin/settings`        | `v1/admin/settings.ts`        | Coordinates configuration parameters.                       |
| `/api/v1/admin/media`           | `v1/admin/media.ts`           | Coordinates network media and forensic notes.               |
| `/api/v1/admin/db-stats`        | `v1/admin/dbStats.ts`         | Evaluates index bloat and table sizes.                      |
| `/api/v1/admin/pgadmin`         | `v1/admin/pgadmin.ts`         | Proxies administrative database interface layers.           |
| `/api/v1/networks`              | `v1/networks.ts`              | Base wireless AP network details and lookups.               |
| `/api/v1/networks/list`         | `v1/networks/list.ts`         | Returns paginated tables of all active networks.            |
| `/api/v1/networks/notes`        | `v1/networks/notes.ts`        | Handles investigative note attachments.                     |
| `/api/v1/networks/tags`         | `v1/networks/tags.ts`         | Manages network tags (e.g. SIGINT, LEO, suspect).           |
| `/api/v1/networks/observations` | `v1/networks/observations.ts` | Pipeline for raw observations, VisINT uploads, and scoring. |
| `/api/v1/networks/manufacturer` | `v1/networks/manufacturer.ts` | Retrieves manufacturer details by MAC prefix.               |
| `/api/v1/analytics`             | `v1/analytics.ts`             | Prepares statistical metrics and overview trends.           |
| `/api/v1/geospatial`            | `v1/geospatial.ts`            | Returns map layers and coordinates for explorer views.      |
| `/api/v1/wigle`                 | `v1/wigle.ts`                 | Interfaces with caching and queries for WiGLE networks.     |
| `/api/v1/kepler`                | `v1/kepler.ts`                | Delivers data arrays formatted for Kepler.gl visual layers. |
| `/api/v1/mobile-ingest`         | `v1/mobileIngest.ts`          | Endpoints receiving remote smartphone telemetry streams.    |
| `/api/v1/threats`               | `v1/threats.ts`               | Delivers threat scores, LEO alerts, and statistics.         |
| `/api/v1/threat-report`         | `v1/threat-report.ts`         | Prepares exportable PDF or print dossier reports.           |
| `/api/v1/data-quality`          | `v1/dataQuality.ts`           | Reviews invalid scans and filters out corrupt devices.      |
| `/api/v1/home-location`         | `v1/home-location.ts`         | Predicts stationary home locations for specific targets.    |
| `/api/v2/networks`              | `v2/networks.ts`              | High-performance v2 query API for explorer screens.         |
| `/api/v2/filtered`              | `v2/filtered.ts`              | Supports custom dynamic multi-conditional filters.          |
| `/api/v2/threats`               | `v2/threats.ts`               | Integrates updated scoring algorithms.                      |

### 2.3 Service Layer

All business logic is isolated in services inside `server/src/services/` as CommonJS modules:

- **Administrative Services**:
  - `adminDbService.ts`: Performs administrative database queries under the privileged `shadowcheck_admin` role.
  - `adminDbStatsService.ts`: Formats index bloat, row counts, and table sizes.
  - `adminImportHistoryService.ts`: Tracks log entries for bulk scan integrations.
  - `adminMaintenanceService.ts`: Performs scheduled table cleanups and runs database VACUUM optimizations.
  - `adminNetworkMediaService.ts`: Manages the metadata registration and mapping of attachments.
  - `adminNetworkTagsService.ts`: Conducts forensic tag audits and links metadata keys to networks.
  - `adminOrphanNetworksService.ts`: Re-targets isolated client observations to master network records.
  - `adminSettingsService.ts`: Modifies parameters and toggles system configuration flags in the DB.
  - `adminSiblingService.ts`: Exposes sibling detection administrative triggers to controllers.
  - `adminUsersService.ts`: Manages user credentials, password overrides, and role configurations.

- **Forensic & Scoring Services**:
  - `observationService.ts`: High-performance ingestion pipeline, incorporating `correlateVisINT()` EXIF parsing and spatial calculations.
  - `threatScoringService.ts`: Evaluates threat score formulas, joining rule-based heuristics and ML weights.
  - `ml/scoringService.ts`: Evaluates behavioral scanning models for network threat categorization.
  - `mlTrainingLock.ts`: Multi-process transaction lock preventing concurrent model updates.
  - `ouiGroupingService.ts`: Resolves MAC addresses to specific hardware manufacturer profiles.
  - `homeLocationService.ts`: Computes stationary coordinates representing base operations of targets.
  - `dataQualityFilters.ts`: Flags and isolates corrupt scans or invalid device inputs.

- **Data Delivery Services**:
  - `explorerService.ts`: Coordinates Mapbox grid overlays, radius filters, and explorer views.
  - `explorerQueries.ts`: Assembles parameterized SQL statements for spatial explorer panels.
  - `explorerSorting.ts`: Parses sorting criteria and arranges search arrays.
  - `networkService.ts`: Retrieves primary properties and fields from the master networks catalog.
  - `networkListService.ts`: Feeds fast, paginated lists of networks to grid components.
  - `networkTagService.ts`: Add, removes, and lists custom labels associated with specific BSSIDs.
  - `analyticsService.ts`: Prepares active daily telemetry grids, scan volumes, and threat counts.
  - `filteredAnalyticsService.ts`: Executes analytical reports on filtered subsets of wireless networks.
  - `keplerService.ts`: Serializes telemetry collections into GeoJSON formats for Kepler maps.
  - `v2Service.ts` / `v2Queries.ts`: Updated high-performance service mapping updated v2 API pipelines.

- **System Integration Services**:
  - `authService.ts` / `authQueries.ts` / `authWrites.ts`: Manages logins, tokens, hashing, and password updates.
  - `awsService.ts`: Interfaces with AWS APIs, EC2 instance states, and S3 resources.
  - `backupService.ts`: Writes transaction-gated PostgreSQL database dumps and syncs files to AWS S3 storage.
  - `cacheService.ts`: Implements in-memory or Redis caching layers to speed up repetitive sweeps.
  - `courthouseService.ts`: Handles proximity lookups and geocoding operations for federal courthouse anchor zones.
  - `dashboardService.ts`: Prepares consolidated real-time state metrics for the frontend control panel.
  - `dataQualityFilters.ts`: Flags and isolates corrupt scans or invalid device inputs.
  - `mobileIngestService.ts`: Receives remote scan buffers from mobile smartphone clients.
  - `secretsManager.ts`: Direct integration loading runtime keys from AWS Secrets Manager.
  - `pgadminService.ts`: Manages configurations and ports for database admin web services.
  - `backgroundJobsService.ts`: Node-schedule wrapper running scheduled background tasks.
  - `externalServiceHandler.ts`: Orchestrates rate-limited exterior HTTP requests.

- **WiGLE Integration Services**:
  - `wigleService.ts`: Unified entry wrapper for all WiGLE integration classes.
  - `wigleClient.ts`: Direct HTTP agent managing handshakes with the external WiGLE API.
  - `wigleDetailService.ts` / `wigleDetailTransforms.ts`: Downloads and normalizes detailed record lookups for unmapped APs.
  - `wigleSearchApiService.ts` / `wigleSearchTransforms.ts`: Runs regional bounding box scans and transforms telemetry.
  - `wigleSearchCache.ts` / `wigleSearchService.ts`: Manages map query caches and search results orchestration.
  - `wigleEnrichmentService.ts` / `wigleEnrichmentFetcher.ts`: Schedules background loops updating missing radio details.
  - `wigleImportService.ts` / `wigleImportRunService.ts` / `wigleBluetoothImportService.ts`: Integrates bulk external file uploads.
  - `wigleRequestLedger.ts` / `wigleRequestUtils.ts`: Enforces strict daily query quotas and formats requests.
  - `wigleAuditLogger.ts`: Log keeper tracking all external API requests.

### 2.4 Repository Layer

Data access logic is isolated in repositories under `server/src/repositories/`. Every SQL statement is parameterized to prevent injection:

| Repository File                      | Primary Table / Entity Owned             | Operations Handled                                               |
| :----------------------------------- | :--------------------------------------- | :--------------------------------------------------------------- |
| `networkRepository.ts`               | `app.networks`                           | Handles base registration, spatial updates, and catalog queries. |
| `mobileIngestRepository.ts`          | `app.mobile_uploads`, `app.observations` | Streams incoming signals into raw observation buffers.           |
| `surveillanceDetectionRepository.ts` | `app.surveillance_detections`            | Queries camera targets and maps static OUI vendor scopes.        |
| `threatRepository.ts`                | `app.network_threat_scores`              | Manages threat calculations, severity logs, and metrics.         |
| `siblingRunRepository.ts`            | `app.sibling_runs`                       | Manages logs and execution stats for sibling runs.               |
| `siblingPruningRepository.ts`        | `app.network_sibling_pairs`              | Handles cluster sizing pruning and sequential edge deletion.     |
| `adminNetworkMediaRepository.ts`     | `app.network_media`                      | Manages uploads, retrievals, and deletions of media.             |
| `adminNetworkTagRepository.ts`       | `app.network_tags`                       | Coordinates user tags linked to wireless AP nodes.               |
| `adminNetworkTagOuiRepository.ts`    | `app.oui_device_groups`                  | Evaluates OUI patterns against tag classifications.              |
| `agencyRepository.ts`                | `app.agency_offices`                     | Performs spatial lookups on law enforcement offices.             |
| `courthouseRepository.ts`            | `app.federal_courthouses`                | Retrieves locations of administrative federal target zones.      |
| `deflockRepository.ts`               | `app.deflock_cameras`                    | Performs spatial queries for automated license plate readers.    |
| `shotspotterRepository.ts`           | `app.shotspotter_zones`                  | Resolves coverage boundaries for acoustic detectors.             |
| `shotspotterSensorsRepository.ts`    | `app.shotspotter_sensors`                | Manages exact coordinate nodes for gunshot sensors.              |
| `exportRepository.ts`                | `app.networks`, `app.observations`       | Streams formatted data subsets for offline exports.              |
| `jobRunRepository.ts`                | `app.background_job_runs`                | Logs execution states and errors for background jobs.            |
| `keplerRepository.ts`                | `app.networks`                           | Prepares geospatial collections for Kepler dashboards.           |
| `wiglePersistenceRepository.ts`      | `app.wigle_v2_networks_search`           | Persists downloaded WiGLE network fields.                        |
| `wigleQueriesRepository.ts`          | `app.wigle_v2_networks_search`           | Performs text matches and bounding box lookups.                  |
| `wigleEnrichmentRepository.ts`       | `app.networks`                           | Updates queue lists and downloads trackers.                      |
| `v2Repository.ts`                    | `app.networks`, `app.observations`       | High-performance spatial-temporal search operations.             |
| `baseRepository.ts`                  | `pg.Pool` (Shared helper)                | Common transactional wrapper and client acquisition helper.      |

### 2.5 Dependency Injection Configuration

Dependencies are registered in `server/src/config/container.ts`.

- **Orchestration Pattern**: Route controllers import the container object and call resolved services. No route file imports a service directly from `services/`.
- **Decoupled Swapping**: To change a service implementation (e.g. swapping a mock service or a Bedrock-enhanced LLM version), modifications are made to a single line in this container file.

### 2.6 Background Jobs & Scheduled Workers

Background workers are managed by `BackgroundJobsService` using the `node-schedule` cron engine. The scheduler is gated by the `enable_background_jobs` feature flag:

1. **Scheduled Backups (`backup`)**:
   - Scheduled daily via `BACKUP_CRON`.
   - Runs `runBackupJob()`, creating a compressed SQL database dump and synchronizing it to an AWS S3 bucket.
2. **Behavioral ML Threat Scoring (`mlScoring`)**:
   - Scheduled every 4 hours via `ML_SCORING_CRON`.
   - Runs `runBehavioralMlScoringJob()`, processing mobility patterns and updating behavioral threat classes.
3. **Materialized Views Refresh (`mvRefresh`)**:
   - Scheduled daily at 4:30 AM via `MV_REFRESH_CRON`.
   - Runs `refreshMaterializedViews(adminQuery)`, sequentially rebuilding active analytical caches.
4. **Sibling Detection Engine (`siblingDetection`)**:
   - Scheduled via DB configuration or manually.
   - Runs `runSiblingDetectionJob(options)`, identifying twin physical radios.
5. **Surveillance Density Scan (`surveillanceScan`)**:
   - Runs `runSurveillanceScanJob()`, compiling density maps and evaluating coverage overlays.

---

## 3. Client-Side Orchestrator Map

### 3.1 React App Entry Tree

The client is structured as an ES module React 19 application. The tree mounts from `client/src/main.tsx` into `client/src/App.tsx`:

```
client/src/main.tsx
  └── App.tsx
        └── AuthProvider  (React Context provider managing logins)
              └── Router  (React Router DOM coordinating navigation)
                    ├── AppContent  (Enforces skip-links and renders Navigation)
                    └── Main Layout
                          ├── Navigation  (Side pane controls)
                          └── Main Content Routing (Suspense lazy boundaries)
```

### 3.2 View Components and Client Routes

Views are loaded within lazy-loading boundaries, reducing the initial JavaScript bundle size. The router handles the following paths:

- `/` or `/start`: `StartPage.tsx` - Initial gateway, dashboard indicators, and telemetry statistics.
- `/dashboard`: `DashboardPage.tsx` - Main status screen showing quick counts, threat charts, and scanner statuses.
- `/geospatial-explorer`: `LazyMapComponent.tsx` (loads `GeospatialExplorer.tsx`) - Interactive Mapbox GL JS map canvas with Deck.gl overlays, spatial filtering, and pin drops.
- `/analytics`: `AnalyticsPage.tsx` - Detailed tables and charts of threat distributions, daily signal counts, and manufacturer groups.
- `/wigle`: `WiglePage.tsx` - Interfaces for executing bounding-box queries, synchronizing external downloads, and managing query budgets.
- `/kepler`: `KeplerPage.tsx` - Mounts an iframe containing Kepler.gl layers for advanced spatial-temporal mapping.
- `/monitoring`: `MonitoringPage.tsx` - Displays background worker statuses, active queues, and execution logs.
- `/admin`: `AdminPage.tsx` - Admin panel for user management, system settings, sibling detection triggers, and backup downloads.

### 3.3 Shared UI Component Directories

UI elements under `client/src/components/` are logically grouped into the following folders:

- `admin/`: Sub-components for admin views, including job runners and user forms.
- `analytics/`: Chart widgets and telemetry tables for analytics screens.
- `auth/`: User forms handling credentials validation and passwords change.
- `badges/`: Unified indicators displaying threat labels and match classifications.
- `contextMenu/`: Interactive popup overlays triggered by map clicks.
- `dashboard/`: KPI blocks, signal activity charts, and telemetry meters.
- `filter/` / `filters/`: Unified sliders, toggle fields, and search boxes.
- `geospatial/`: Base Mapbox layouts, layer selections, and Deck.gl wrappers.
- `hooks/`: Local presentation state controllers.
- `kepler/`: UI components for managing advanced spatial-temporal maps.
- `modals/`: Global warning messages, delete prompts, and detail cards.
- `ui/`: Common layouts, custom buttons, loaders, and input fields.
- `visint/`: Visual intelligence drag-and-drop file uploaders and match cards.
- `wigle/`: Controls, bounding box overlays, cache maps, and search panels supporting external WiGLE synchronization.

### 3.4 API Client Layer

The client communicates with the server using the unified `apiClient` defined in `client/src/api/client.ts`:

- **Fetch Wrapper**: Native `fetch` is wrapped inside a class. It handles request serializations and response formatting.
- **Timeout Management**: Incorporates an `AbortController` implementing a **120-second timeout** (double the backend Express timeout to protect client-side UI states).
- **Credentials**: Enforces `credentials: 'include'` for secure, cookie-based session validation.
- **API Wrappers**: Domain-specific API wrappers (e.g. `networkApi.ts`, `wigleApi.ts`, `adminApi.ts`) call `apiClient` methods.

### 3.5 Client State Management

Application state is divided between contextual provider scopes and global Zustand stores:

1. **React Auth Context (`AuthProvider`)**:
   - Manages user login validation states, credentials updates, session states, and authentication status.
2. **Filter Zustand Store (`filterStore.ts`)**:
   - Tracks active filters, query strings, date spans, spatial radii, and threat checkboxes, sharing state changes across components.
3. **Pin Drop Zustand Store (`pinDropStore.ts`)**:
   - Tracks pin drops, coordinate clicks, and map location markers.

---

## 4. Database Orchestrator Map

### 4.1 Core Table Catalog

The database runs PostgreSQL 18 with PostGIS 3.6 extensions. The primary `app` schema contains the following tables:

| Table Name                     | Primary Purpose / Entity                                                              |
| :----------------------------- | :------------------------------------------------------------------------------------ |
| `networks`                     | Canonical list of unique physical wireless APs, keyed by BSSID.                       |
| `observations`                 | RAW telemetry scans, signals, frequencies, and coordinates.                           |
| `network_sibling_pairs`        | Identifies twins and virtual APs matching sibling rules.                              |
| `network_sibling_overrides`    | Administrative overrides (e.g., forced `sibling` or `not_sibling` relations).         |
| `network_tags`                 | Links custom labels (e.g., LEO, SIGINT) to BSSIDs.                                    |
| `network_threat_scores`        | Tracks security assessments and scores.                                               |
| `network_media`                | Stores base64 or bytea media attachments (e.g., photo captures) anchored to BSSIDs.   |
| `network_notes`                | Investigative note attachments linked to BSSIDs.                                      |
| `users`                        | User credentials, account status, and privilege scopes.                               |
| `user_sessions`                | Active user authentication sessions and tokens.                                       |
| `settings`                     | System-wide and background configuration settings stored as key-value configurations. |
| `sibling_runs`                 | Execution logs and statistics tracking sibling runs.                                  |
| `background_job_runs`          | Tracks execution states and errors for background jobs.                               |
| `surveillance_detections`      | Candidates flagged by surveillance rules filters.                                     |
| `deflock_cameras`              | Geographic data for known license plate reader cameras.                               |
| `federal_courthouses`          | Seeded reference data of federal administrative buildings for proximity mapping.      |
| `agency_offices`               | Stores coordinates and metadata for known law enforcement offices.                    |
| `agency_office_coverage_notes` | Administrative notes linked to specific agency coverage zones.                        |
| `geocoding_cache`              | Cached coordinates resolved from third-party mapping APIs.                            |
| `geocoding_job_runs`           | Logs execution states and errors for geocoding tasks.                                 |
| `ml_model_config`              | Dynamic configurations for machine learning threat models.                            |
| `ml_model_metadata`            | Active version markers for ML models.                                                 |
| `ml_training_history`          | Tracks metrics and results for model training runs.                                   |
| `mobile_uploads`               | Log entries for scans uploaded by mobile clients.                                     |
| `radio_manufacturers`          | Seeded lookup table mapping MAC prefixes to vendors.                                  |
| `routes`                       | Telemetry tracks representing paths driven during signal sweeps.                      |
| `anchor_points`                | Coordinates for lock zones.                                                           |
| `location_markers`             | Coordinates and details for pins placed on explorer maps.                             |
| `mac_randomization_suspects`   | Registers devices exhibiting random MAC rotation patterns.                            |
| `schema_migrations`            | Canonical migration runner log.                                                       |
| `ssid_history`                 | Historical changes in SSIDs over specific BSSIDs.                                     |
| `wigle_import_runs`            | Execution states and counts for bulk WiGLE imports.                                   |
| `wigle_import_run_pages`       | Page-level metrics and tracking for WiGLE imports.                                    |
| `wigle_ledger_events`          | Quota ledger tracking external query usage.                                           |
| `wigle_v2_bluetooth_search`    | Telemetry cache for external BLE scans.                                               |
| `wigle_v2_networks_search`     | Telemetry cache for external AP scans.                                                |
| `wigle_v3_network_details`     | Detail records resolved from external WiGLE lookups.                                  |
| `wigle_v3_observations`        | Observations resolved from external WiGLE sweeps.                                     |

### 4.2 Materialized Views

Four materialized views optimize analytical and explorer query performance:

1. `analytics_summary_mv`:
   - Prepares aggregate daily signal volumes, threat distributions, and vendor rankings.
   - Refreshed daily at 4:30 AM via `BackgroundJobsService`.
2. `api_network_explorer_mv`:
   - Highly indexed geospatial view aggregating centroid coordinates, geocoded districts, and threat categories.
   - Refreshed daily at 4:30 AM via `BackgroundJobsService`.
3. `api_wigle_networks_mv`:
   - Materialized view caching external WiGLE queries and synchronizations.
   - Refreshed daily at 4:30 AM via `BackgroundJobsService`.
4. `surveillance_density_zones`:
   - Computes weighted gridded density fields mapping suspected surveillance units against total networks.
   - Refreshed daily at 4:30 AM via `BackgroundJobsService`.

### 4.3 Stored Database Functions

The database primary schema includes several key PL/pgSQL stored procedures:

- **Classification & Scoring Heuristics**:
  - `calculate_threat_score_v5(p_bssid text)` / `calculate_threat_score_v5_individual(p_bssid text)`: Evaluates distance anomalies, OUI targets, and ML heuristics.
  - `find_sibling_radios(p_bssid text, p_max_octet_delta integer, p_max_distance_m double precision)`: Evaluates hardware characteristics to identify potential sibling APs.
  - `get_threat_score(...)`: Combines heuristics and ML scores into a single threat metric.
- **Geospatial & Proximity Procedures**:
  - `nearby_networks(p_lat double precision, p_lon double precision, p_radius_meters integer)`: Returns wireless nodes within a circular geographical area.
  - `get_home_location()`: Computes probable stationary coordinates based on scan occurrences.
  - `update_courthouse_location()`: Triggers geometry updates for courthouse targets.
- **Operations & Maintenance Utilities**:
  - `refresh_network_sibling_pairs(...)`: Orchestrator function executing sibling scans.
  - `refresh_all_materialized_views()`: Sequentially rebuilds active materialized views.
  - `network_add_tag(network_tags jsonb, tag_name text)`: Appends custom tags.
  - `network_toggle_tag(...)`: Safe interface for adding/removing tags on specific BSSIDs.

### 4.4 Database Triggers

The database utilizes 17 active triggers on key tables:

```
federal_courthouses   ── [INSERT/UPDATE] ──> courthouse_location_trigger
deflock_cameras       ── [INSERT/UPDATE] ──> deflock_cameras_geom_trigger
ml_model_config       ── [UPDATE]        ──> ml_model_config_update
network_media         ── [UPDATE]        ──> network_media_update
network_tags          ── [UPDATE]        ──> network_tags_update
network_threat_scores ── [INSERT]        ──> network_threat_scores_insert
network_threat_scores ── [UPDATE]        ──> network_threat_scores_update
surveillance_det.     ── [UPDATE]        ──> trg_surveillance_detections_updated_at
mobile_uploads        ── [UPDATE]        ──> trg_update_mobile_uploads_timestamp
wigle_v3_obs.         ── [INSERT/DELETE] ──> trg_wigle_v3_count_update
observations          ── [INSERT]        ──> trigger_mark_for_rescoring
observations          ── [INSERT]        ──> trigger_mark_threat_recompute
wigle_v2_bt_search    ── [INSERT/UPDATE] ──> wigle_bt_location_sync
```

### 4.5 Applied Migrations

The database schema is updated using `sql/run-migrations.sh`. It records completed steps in `app.schema_migrations`.

- Total migrations applied: **220**
- Consolidated Baselines: Seven baseline files (applied 2026-04-16) consolidate historical schema updates.
- Core Sibling Migrations: Migrations applied between **May 22 and May 30, 2026** successfully deployed the vendor rules engine, LAA filters, and chassis-matching logic.

---

## 5. Sibling Detection Subsystem Map

The Sibling Detection Subsystem is a critical forensic engine in the platform. It identifies physical wireless APs hosted on the same physical hardware (e.g. cross-band or multi-virtual networks).

### 5.1 Core Database Functions

The detection logic runs primarily in the database:

1. **`app.find_sibling_radios`**:
   - The primary rules engine. Given a BSSID, it queries coordinates, frequencies, and MAC octet configurations from `app.networks` to find potential sibling APs.
   - Classifies matches into specific rules using a `CASE` router, enforcing threshold restrictions (e.g. final octet differences and local MAC exclusions).
2. **`app.refresh_network_sibling_pairs`**:
   - Database runner function that coordinates execution parameters, joins target networks, and records results.

### 5.2 Runner Pathways

Sibling detection is triggered through two main pathways:

1. **Background Job Runner**:
   - `BackgroundJobsService` triggers the `siblingDetection` task, which runs `runSiblingDetectionJob()` via the `node-schedule` cron engine.
   - It instantiates `SiblingDetectionOrchestrator` to run a chunked, incremental sweep of networks updated since the last run.
2. **Administrative Controller**:
   - The administrative endpoint `POST /api/admin/siblings/refresh` triggers `siblingDetectionAdminService.ts`.
   - It runs a full or incremental sweep, providing progress updates to the frontend monitoring dashboard.

### 5.3 Data Flow

The subsystem interacts with the following database tables:

```
[app.networks] ──(Reads target/sibling telemetry)──> [app.find_sibling_radios]
                                                              │
                                                              ▼
[app.sibling_runs] ──(Logs start/end states) ───> [SiblingDetectionOrchestrator]
                                                              │
                                                              ▼
[app.network_sibling_overrides] ─(Merges overrides)─> [app.network_sibling_pairs]
```

### 5.4 Rule Taxonomy

The engine classifies twin APs into the following rules:

- **Class A**: Identical first 5 octets, last-octet difference <= 3. Typical for generic multi-band devices.
- **Class B** / **Unnamed Recursive (Class B)**: Matches 5 octets with last-octet difference <= 7. Used for enterprise devices with wider MAC spreads.
- **Class C**: Identical first 5 octets, last-octet difference between 1 and 3. Typical for generic home routers.
- **Ubiquiti UniFi VAP (Class A)**: Groups virtual APs on Ubiquiti hardware sharing OUI `xx:E2:C6`, matching the fifth and sixth octets, and matching the lower nibble of the fourth octet.
- **Mist Systems VAP (Class A)**: Groups virtual APs on Mist hardware sharing OUI `D4:20:B0` or `D4:DC:09`, matching the first 5 octets, and having a sixth-octet difference <= 18.
- **Comcast Vantiva (Class A)**: Groups virtual APs on Comcast hardware sharing OUI `C6:4F:D5`, matching the fifth octet, and having a fourth-octet difference of 0 or 7 and sixth-octet difference <= 7.
- **Netgear Dual-Band (Class A)**: Groups virtual APs on Netgear hardware sharing OUI `6C:CD:D6`, matching the sixth octet, and having a fourth-octet difference <= 3.
- **Arcadyan HOME-EE7D (Class A)**: Groups virtual APs on Arcadyan hardware matching octets 2-5 as `B0:66:EB:E1` with a sixth-octet difference <= 7.
- **GM Vehicle Hotspot (Class A)**: Groups Chevrolet/Buick/GMC/Cadillac rolling vehicle hotspots matching SSID and BSSID bytes 1, 4-6 (covers rotating byte 2 or rotating bytes 2-3) or bytes 1-3, 5-6 with a fourth-octet low-nibble match.
- **AIRLINK_DELTA1_TWIN** / **SIERRA_DELTA1_TWIN**: Hardcoded templates for AirLink and Sierra chassis configurations.
- **Unnamed Recursive (Class A)**: Generic locally administered address (LAA) fallback, requiring matching octets 2-5 and last-octet difference <= 7.
- **manual_confirmed**: Sibling relationships created manually by administrators.

### 5.5 Sibling Detection Migration Timeline

Sibling detection logic has evolved through the following migrations:

1. **`20260429_fix_sibling_detection_false_negatives_positives.sql`**: Corrected a bug where `find_sibling_radios` joined on only 2 octets, causing OUI-only matches.
2. **`20260501_fix_sibling_false_positives_v2.sql`**: Added `ssid_exact_sequential` and tweaked rules.
3. **`20260501_fix_sibling_fleet_purge_and_sequential_bypass.sql`**: Excluded vehicle fleet SSIDs from the probabilistic matching path.
4. **`20260501_fix_sibling_ssid_exact_sequential.sql`**: Deployed the `ssid_exact_sequential` deterministic rule.
5. **`20260501_purge_ssid_exact_fleet_pairs.sql`**: Cleaned up invalid fleet matches.
6. **`20260501_sibling_refresh_fleet_fleet_guard.sql`**: Protected sequential runs from fleet interference.
7. **`20260501_sibling_refresh_respect_not_sibling_overrides.sql`**: Ensured `not_sibling` overrides are ignored during sweeps.
8. **`20260507_sibling_detection_cleanup.sql`**: Optimized sequential rule sweeps.
9. **`20260509_002_sibling_detection_fixes.sql`**: Recreated `find_sibling_radios` to address OUI gaps.
10. **`20260509_006_fix_ssid_exact_sequential_final.sql`**: Standardized exact-matching rules.
11. **`20260509_007_middle_octets_relax_la_filter.sql`**: Relaxes the LAA filter to allow ISP APs.
12. **`20260509_sibling_detection_overhaul.sql`**: Filtered out BLE devices (`type = 'W'`) and removed general LA-MAC exclusions.
13. **`20260516_008_remove_distance_gate_from_find_sibling_radios.sql`**: Removed the spatial distance gate from initial rule parsing to capture fleet siblings.
14. **`20260522_009_deterministic_sibling_sieve_find_sibling_radios.sql`**: Replaced PL/pgSQL logic with vendor-classified deterministic routing arrays.
15. **`20260522_010_consolidate_asymmetric_twins.sql`**: Integrated asymmetric twin matching.
16. **`20260522_011_harden_sieve_class_b_delta_clamp.sql`**: Clamped Class B delta differences.
17. **`20260522_012_pure_hardware_sieve_sibling_detection.sql`**: Deployed hardware sieve checks.
18. **`20260524_016_add_sibling_summary_to_api_network_explorer_mv.sql`**: Integrated sibling counts into explorer views.
19. **`20260524_017_sibling_rule_consolidation.sql`**: Consolidated historical sibling rules.
20. **`20260524_018_harden_vendor_chassis_sibling_rules.sql`**: Hardened vendor chassis classification.
21. **`20260524_019_harden_cisco_chassis_sibling_rules.sql`**: Fine-tuned Cisco quad-radio matching.
22. **`20260528_020_harden_cradlepoint_class_a_delta3.sql`**: Tuned Cradlepoint delta tolerances.
23. **`20260528_021_cradlepoint_fleet_mac_parity.sql`**: Applied MAC parity rules to Cradlepoint smart buses.
24. **`20260528_022_harden_laa_and_gm_sibling_rules.sql`**: Tightened LAA and GM hotspot constraints.
25. **`20260530_023_ubiquiti_unifi_vap_sibling_rule.sql`**: Added Ubiquiti UniFi VAP chassis rule.
26. **`20260530_024_mist_vap_sibling_rule.sql`**: Added Mist Systems OUI-gated VAP rule.
27. **`20260530_025_gm_hotspot_sibling_rule.sql`**: Fine-tuned Chevrolet/Cadillac/Buick rolling BSSIDs.
28. **`20260530_026_comcast_vantiva_sibling_rule.sql`**: Added Comcast Vantiva delta rules.
29. **`20260530_027_harden_laa_class_a_sibling_delta.sql`**: Restrained local administered MACs.
30. **`20260530_028_gm_complementary_hotspot_sibling_rule.sql`**: Added supplementary mobile scans.
31. **`20260530_029_netgear_sibling_rule.sql`**: Grouped Netgear dual-band VAPs.
32. **`20260530_030_arcadyan_sibling_rule.sql`**: Grouped Arcadyan EE7D virtual APs.

### 5.6 Autonomous vs. Manual Triggers

- **Autonomous Sweeps**: If the background scheduler is enabled, the `BackgroundJobsService` runs `runSiblingDetectionJob(options)` incrementally according to its configured cron string. It sweeps networks updated since the last run.
- **Manual Runs**: Administrators can trigger incremental or full sweeps via `POST /api/admin/siblings/refresh` through `siblingDetectionAdminService.ts`.

---

## 6. Open Gaps & Missing Abstractions

1. **Monolithic VisINT Correlation Pipeline**:
   - `correlateVisINT` in `observationService.ts` handles visual intelligence ingestion.
   - It performs EXIF extraction, spatial-temporal scoring, database media insertion, and tag classification in a single method.
   - **Status**: CLOSED — Decoupled VisINT pipeline from `observationService` into `server/src/services/visint/` (Commit `cd972894`).

2. **Graph Traversal in React Effect Loop**:
   - `useSiblingLinks.ts` implements adjacent-edge graph traversal algorithms directly within a React hook.
   - **Status**: CLOSED — Extracted pure graph traversal algorithms from `useSiblingLinks` into a dedicated utility file `siblingGroupGraph.ts` (Commit `72bd3dc7`).

3. **Embedded Rule Equations in Query Builders**:
   - `siblingDetectionQueries.ts` houses scoring parameters, SSID regexp normalization, and common partner penalties directly inside raw SQL string templates.
   - **Status**: DEFERRED — Business rules embedded inside SQL construction are in the hot path of the sibling detection system; extracting these rule constants from SQL templates remains acknowledged as debt due to the high risk and multi-session effort required.

4. **Domain Logic Leaks in Repositories**:
   - `surveillanceDetectionRepository.ts` hardcodes hardware manufacturer OUI arrays (e.g. Axon, Flock Safety) directly inside SQL strings.
   - **Status**: CLOSED — Decoupled OUI arrays from the repository to database-driven lookups via migration 031 (`e1d1318e`) and `oui_device_groups` lookup tables (`24922d98`).

5. **Missing Automated Test Coverage for New Sibling Rules**:
   - Multiple vendor-specific rules (Ubiquiti, Mist, Comcast, Netgear, Arcadyan) were added via migrations.
   - **Status**: CLOSED — Confirmed passing pre-audit; validated integration tests cover advanced sibling rules.

6. **Orphaned SQL Files**:
   - Multiple legacy, unreferenced `.sql` files remained in the `sql/` root.
   - **Status**: CLOSED — 13 loose legacy SQL files archived to `sql/migrations/archive/` in this session.

---

## Post-Audit Improvements (2026-05-31)

Several modularity and architectural improvements were successfully completed during the session of 2026-05-31:

- **WigleSearchTab Hook Extraction**: Extracted search and UI states from `WigleSearchTab.tsx` into dedicated, clean hooks under `client/src/components/admin/hooks/` (Commit `832d75f3`).
- **WigleDetailTab Hook Extraction**: Decoupled WiGLE detail viewing and sync interactions from `WigleDetailTab.tsx` into dedicated presentation hooks (Commit `e22b50b0`).
- **DbStatsTab Hook Extraction**: Refactored `DbStatsTab.tsx` to pull database statistics fetch logic and sibling operations into modular hooks (`useDbStats`, `useSiblingStats`, and `useTableCategories`) under `client/src/components/admin/hooks/` (Commit `b71f4210`).
- **v2Service Duplicate require Block Removed**: Cleaned up legacy `module.exports` require block from `server/src/services/v2Service.ts` to strictly enforce standard ES module TypeScript compiling (This session).
- **Redis Dev Compose Fix**: Resolved the `api_dev` container's DNS resolution issues by explicitly defining `REDIS_HOST=redis` in the dev compose configuration (Commit `cc631abe`).
- **loadEnv Canonical Fix**: Replaced the custom override dotenv invocation with the canonical `loadEnv` helper, properly preserving container-level environment variables (Commit `f503c3c7`).

---

## 7. Recommended Next Refactors

1. **Extract Sibling Pruning Service (Orchestrator Pattern)**:
   - **Action**: Extract cluster-size pruning and sequential component overflow deletion logic from `SiblingDetectionOrchestrator.ts` into a dedicated `SiblingPruningService`.
   - **Rationale**: Keeps the orchestrator focused on running sweeps while delegating cleanup rules to a separate service.

2. **Extract EXIF Ingestion Helpers (Single Responsibility)**:
   - **Action**: Extract image EXIF parsing and spatial-temporal scoring from `observationService.ts` into dedicated `ExifExtractionService` and `SpatialScoringService` components.
   - **Rationale**: Decouples external tool parsing and math calculations from the main database ingestion pipeline.

3. **Decouple Graph Traversal from `useSiblingLinks.ts`**:
   - **Action**: Move adjacent-edge graph traversal algorithms from `useSiblingLinks.ts` to `client/src/components/geospatial/utils/siblingGroupGraph.ts` as a pure utility function.
   - **Rationale**: Isolates business graph logic from React rendering loops, allowing direct unit testing.

4. **Move OUI Lists to Lookup Tables**:
   - **Action**: Move hardcoded OUI lists from `surveillanceDetectionRepository.ts` into the `app.oui_device_groups` lookup table.
   - **Rationale**: Decouples hardware manufacturer profiles from data access queries.

5. **Add Test Fixtures for New Sibling Rules**:
   - **Action**: Add integration test cases in `tests/integration/findSiblingRadios.test.ts` covering Ubiquiti, Netgear, Comcast, and Arcadyan matching criteria.
   - **Rationale**: Ensures new sibling rules are covered by automated tests to prevent regressions.
