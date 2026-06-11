# Manual-Only & Dangerous Endpoints

This document defines the REST API endpoints that are marked **`manualOnly: true`** or classified as **Dangerous/Destructive** in the ShadowCheck platform. It outlines the safety contracts for testing and automated runs.

---

## 1. Automation Safety Policy

> [!CAUTION]
> **Automated test suites, continuous integration (CI) runners, and automated QA scripts MUST NOT invoke these endpoints against any active or production database.**
>
> Doing so can result in:
>
> 1. **Data Contamination**: Persistent test records inserted into evidentiary tables (e.g. `app.network_media`, `app.network_tags`, `app.observations`).
> 2. **Infrastructure Failures**: Stopping/rebooting EC2 instances, disabling pgAdmin, or purging local Docker Compose stacks.
> 3. **Resource Exhaustion**: Running bulk database mutations, geocoding runs, or large-volume WiGLE import synchronizations.
> 4. **API Quota Lockout**: Running WiGLE detail fetches that exhaust the daily API quota (tracked in `app.wigle_ledger_events`).

### Verification & Testing Gates

All integration test suites must run on mocked databases or the isolated `shadowcheck_test` database (where mutations are safe or rolled back in transactions). Any automated test verifying these endpoints must do so via unit mocks only.

---

## 2. Inventory of Manual-Only / Dangerous Endpoints

The following endpoints are explicitly marked `manualOnly: true` in the API Test tab (`client/src/config/apiTestEndpoints.ts`) or require manual analyst confirmation:

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

---

## 3. Enforcement Mechanisms

1. **`apiTestEndpoints.ts` Gating**: Endpoints marked `manualOnly: true` or `isDestructive: true` require manual confirmation or are hidden from automated script sweeps.
2. **`requireAdmin` Middleware**: Gated endpoints require the `admin` role, ensuring only authenticated operators with credentials stored in AWS Secrets Manager can trigger them.
3. **Sentinels**: Sentinel actions (e.g. attaching to `VISINT_UNMATCHED`) require explicit confirmation parameters (e.g. `confirm_fallback=true`) to block silent automated executions.
