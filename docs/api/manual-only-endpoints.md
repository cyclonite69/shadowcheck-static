# Operator-Gated Manual API Endpoints

This document defines the REST API endpoints marked **`manualOnly: true`** or classified as
**Dangerous/Destructive** in ShadowCheck. These endpoints remain visible and individually testable
in the API Test Page, but are isolated from automated bulk verification.

---

## 1. Automation Safety Policy

> [!CAUTION]
> **Bulk API Test Page runs, continuous integration (CI) runners, and automated QA scripts MUST
> NOT invoke these endpoints. Operators may deliberately test them only against an isolated test
> database.**
>
> Doing so can result in:
>
> 1. **Data Contamination**: Persistent test records inserted into evidentiary tables (e.g. `app.network_media`, `app.network_tags`, `app.observations`).
> 2. **Infrastructure Failures**: Stopping/rebooting EC2 instances, disabling pgAdmin, or purging local Docker Compose stacks.
> 3. **Resource Exhaustion**: Running bulk database mutations, geocoding runs, or large-volume WiGLE import synchronizations.
> 4. **API Quota Lockout**: Running WiGLE detail fetches that exhaust the daily API quota (tracked in `app.wigle_ledger_events`).

### Verification & Testing Gates

The API Test Page displays these routes in its **Manual / Destructive / External-Effect Endpoints**
section. Selecting a preset keeps it available to the individual request panel; it does not add the
route to bulk verification. Integration tests must use mocked databases or the isolated
`shadowcheck_test` database, with mutations rolled back where applicable.

---

## 2. Inventory of Manual-Only / Dangerous Endpoints

The following endpoints are explicitly marked `manualOnly: true` in the API Test Page registry
(`client/src/config/apiTestEndpoints.ts`) or otherwise belong in its operator-selected manual bucket:

### A. VISINT Evidence Ingestion

- **Endpoints**:
  - `POST /api/observations/correlate-visint`
  - `POST /api/observations/attach-visint`
- **Why it's unsafe**: Processing uploaded images requires `exiftool` execution in the container and matches observations via PostGIS. Passing `commit=true` or calling `attach-visint` writes binary image buffers directly to `app.network_media` and tags to `app.network_tags`.
- **Safety Contract**: Defaults to `commit=false` (preview-only). See [VISINT Evidence Pipeline Guide](../features/visint-evidence-pipeline.md) for full details.

### B. WiGLE Paginated Imports & Enrichment

- **Endpoints**:
  - `POST /api/wigle/search-api/import-all`
  - `POST /api/wigle/search-api/import-runs/:id/resume`
  - `POST /api/wigle/search-api/import-runs/:id/pause`
  - `POST /api/wigle/search-api/import-runs/:id/cancel`
  - `POST /api/wigle/search-api/bt-import-start`
  - `POST /api/wigle/enrichment/start`
  - `POST /api/wigle/enrichment/resume/:runId`
  - `POST /api/wigle/enrichment/force-clear/:runId`
  - `POST /api/wigle/quota-reset`
  - `PATCH /api/wigle/soft-limits`
- **Why it's unsafe**: Spawns long-running paginated queries against the remote WiGLE API, updating cursors in `app.wigle_import_runs` and inserting thousands of observation points. Quota reset bypasses the daily request-ledger cap.

### C. Sibling Pair Graph Traversal & Refresh

- **Endpoints**:
  - `POST /api/admin/siblings/refresh`
  - `POST /api/admin/siblings/cancel`
  - `DELETE /api/admin/siblings/pairs`
- **Why it's unsafe**: Sibling refresh triggers a CPU-intensive undirected pair correlation scan across all observations using custom heuristics (HP Aruba, Mist, LAA rules). Purging deletes the entire override history from `app.network_sibling_overrides`.

### D. System & Database Administration

- **Endpoints**:
  - `POST /api/admin/cleanup-duplicates`
  - `POST /api/admin/refresh-colocation`
  - `POST /api/admin/import-sqlite`
  - `POST /api/admin/import-sql`
  - `POST /api/admin/import-kml`
  - `POST /api/admin/import/mobile/:uploadId/start`
  - `POST /api/admin/settings/local-stack/:action`
  - `POST /api/admin/settings/jobs/:jobName/run`
  - `POST /api/admin/geocoding/run`
  - `POST /api/admin/geocoding/daemon`
  - `DELETE /api/admin/geocoding/daemon`
  - `POST /api/admin/geocoding/requeue`
- **Why it's unsafe**: Directly triggers DDL operations, file system moves (SQLite ingestion), background daemon processes, container restarts, or bulk geocoding cache modifications.

### E. Destructive Cloud & AWS Operations

- **Endpoints**:
  - `POST /api/admin/aws/instances/:instanceId/start`
  - `POST /api/admin/aws/instances/:instanceId/stop`
  - `POST /api/admin/aws/instances/:instanceId/reboot`
  - `POST /api/admin/aws/instances/:instanceId/terminate`
  - `DELETE /api/admin/backup/s3/:key`
  - `POST /api/admin/pgadmin/start`
  - `POST /api/admin/pgadmin/stop`
  - `POST /api/admin/pgadmin/destroy`
- **Why it's unsafe**: Interacts directly with AWS EC2 resources and S3 buckets. Destroying pgAdmin deletes the active management container on the host.

### F. Credentials, Settings, and External Services

- **Settings reads/writes**: `/api/settings/aws`, `/api/settings/list`,
  `/api/settings/wigle`, `/api/settings/wigle/test`, `/api/settings/mapbox`,
  `/api/settings/smarty`, and both `GET`/`POST` forms of
  `/api/settings/{mapbox-unlimited,google-maps,opencage,geocodio,locationiq}`.
- **External-effect endpoints**: `GET /api/mapbox-style`, `GET /api/mapbox-proxy`,
  `GET /api/google-maps-tile/:type/:z/:x/:y`, `POST /api/geocode`,
  `GET|POST /api/wigle/search-api`, `GET /api/wigle/live/:bssid`,
  `GET /api/wigle/user-stats`, `POST /api/claude/analyze-networks`,
  `PATCH /api/claude/insights/:id/useful`, and `GET /api/claude/test`.
- **Why it's unsafe**: These routes can expose credential-backed configuration, consume paid or
  rate-limited services, import remote results, or write AI feedback.

### G. Sensitive Operator Reads

- **Admin state**: `GET /api/admin/{db-stats,pgadmin/status,secrets,settings}`,
  `GET /api/admin/settings/:key`, `GET /api/admin/settings/jobs/status`,
  `GET /api/admin/settings/runtime`, `GET /api/admin/aws/overview`,
  `GET /api/admin/backup/s3`, `GET /api/admin/geocoding/{stats,daemon}`, and
  `GET /api/admin/siblings/refresh/status`.
- **Import state**: `GET /api/admin/{import-history,device-sources,orphan-networks,kml-imports}`,
  `GET /api/admin/wigle-kml-sync/status`, and
  `GET /api/admin/wigle-kml-sync/transactions`.
- **Why it's unsafe**: Read-only HTTP semantics do not make these safe for an automated sweep;
  they inspect privileged infrastructure, secrets, import state, or external service status.

### H. Data Mutation and Legacy Aliases

- **Network and account mutations**: `POST /api/auth/change-password`,
  `POST /api/admin/network-notations/add`, `POST /api/tag-network`,
  `DELETE /api/tag-network/:bssid`, and `POST /api/networks/tag-threats`.
- **Import and cleanup mutations**: `POST /api/import/wigle`,
  `DELETE /api/wigle/search-api/import-runs/:id`,
  `DELETE /api/wigle/search-api/import-runs/cluster-cleanup`,
  `POST /api/wigle/search-api/saved-ssid-terms`, and
  `DELETE /api/wigle/search-api/saved-ssid-terms/:id`.
- **Backup and mobile ingest aliases**: `GET /api/backup`, `POST /api/restore`,
  `POST /v1/ingest/request-upload`, and `POST /v1/ingest/complete`.
- **Why it's unsafe**: These routes change credentials or database records, delete import state,
  truncate/restore data, create S3 upload URLs, or register uploaded artifacts.

---

## 3. Enforcement Mechanisms

1. **API Test Page Buckets**: Endpoints marked `manualOnly: true` or `isDestructive: true` remain
   visible in the operator-selected manual bucket and are absent from automated bulk inputs.
2. **`requireAdmin` Middleware**: Gated endpoints require the `admin` role, ensuring only authenticated operators with credentials stored in AWS Secrets Manager can trigger them.
3. **Sentinels**: Sentinel actions (e.g. attaching to `VISINT_UNMATCHED`) require explicit confirmation parameters (e.g. `confirm_fallback=true`) to block silent automated executions.
4. **Registry Regression Test**: `tests/unit/apiTestEndpointsSafety.test.ts` asserts that the
   safety-alignment batch remains registered exactly once, appears in the manual bucket, and is
   absent from automated bulk inputs.
