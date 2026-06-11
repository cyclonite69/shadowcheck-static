# GEMINI.md — Session Primer

Gemini CLI does not auto-read context files. Paste this entire file at the start of each session.

---

## Project

**ShadowCheck** — SIGINT forensics platform.
**Stack**: Node.js 22, Express (CJS), React 19, Vite (ESM), PostgreSQL 18/PostGIS, Redis.

---

## Current Source-of-Truth Map

Before starting work, understand the subsystem layouts and workflow guides:

- [README.md](../../README.md) — Root entry point and system overview.
- [docs/ai/sessions/ACTIVE.md](sessions/ACTIVE.md) — Active session status and hard safety constraints.
- [docs/maintenance/documentation-workflow.md](../maintenance/documentation-workflow.md) — How docs and wiki synchronization is structured.
- [docs/maintenance/maintenance-cadence.md](../maintenance/maintenance-cadence.md) — Four maintenance lanes and audit check templates.
- [docs/features/geospatial.md](../features/geospatial.md) — Materialized views and Mapbox GL JS frontend.
- [docs/features/wigle-import-player.md](../features/wigle-import-player.md) — Ingest queues, ledgers, and rate-limiting.
- [docs/features/surveillance-detection.md](../features/surveillance-detection.md) — Surveillance classifications, equipment guides, and bodycam detection signatures.
- [docs/features/badge-studio.md](../features/badge-studio.md) — Badge styling rules.
- [docs/features/visint-evidence-pipeline.md](../features/visint-evidence-pipeline.md) — VISINT upload, EXIF extraction, spatial-temporal scoring, and commit-safety contract.
- [docs/SIBLING_RULESET_ANALYSIS.md](../SIBLING_RULESET_ANALYSIS.md) — Sibling pair graphs, confidence scales, and chained inference rules.
- [docs/schema/network-tables.md](../schema/network-tables.md) — Core wireless database structure.
- [docs/schema/observations-sources.md](../schema/observations-sources.md) — WiGLE, KML, and mobile scans observation schemas.
- [docs/FILTERS.md](../FILTERS.md) — Universal pipeline filters query syntax.
- [docs/TESTING.md](../TESTING.md) — Frontend & backend test environments.
- [docs/workflow/TESTING_STANDARDS.md](../workflow/TESTING_STANDARDS.md) — Comprehensive coverage and regression test standards.

---

## Safety Guardrails for Future Agents

- **Operational Operations**: Do not run WiGLE imports, external API calls, VISINT correlation commits, sibling refresh jobs, migrations, or DB mutation jobs unless the user explicitly asks.
- **VISINT Pipeline**: VISINT defaults to preview/no-write behavior unless `commit=true` parameter is explicitly passed.
- **WiGLE Coverage**: WiGLE import progress is not coverage; never use `rows_inserted` as coverage truth. Reference the correct coverage tables instead.
- **Sibling Operations**: Sibling pairs are undirected; readers and query builders must check both `bssid1` and `bssid2`.
- **Sibling Validity**: Generic sibling candidates are not automatically truth; effective siblings must resolve through confidence metrics and override policies.
- **Maintenance lanes**: Documentation updates, unit/integration testing, modularity refactoring, and cruft cleanup are recurring development lanes, not optional afterthoughts.
- **Documentation Audits**: For serious docs updates, use git-history-assisted drift audits; see [docs/maintenance/maintenance-cadence.md](../maintenance/maintenance-cadence.md).

---

## Context Loading (Read in this order)

1. Root `GEMINI.md` — foundational project rules & mandates.
2. `package.json` — check existing deps before suggesting new ones.
3. `docs/ai/sessions/ACTIVE.md` — active workstreams; do not touch in-progress areas.
4. `sql/migrations/README.md` — current migration state.
5. `docs/DATABASE_CONNECTION.md` — DB access rules; `npm test` requires Docker; use unit-only flags locally.
6. `docs/SSM_ACCESS.md` — EC2/SSM access; read before any DB or production operation.
7. `docs/schema/observations-sources.md` — before querying spatial data.
8. `docs/ai/decisions/` — scan ADRs before any architectural decision.
9. Any file explicitly referenced in the user's prompt.

---

## Hard Rules — No Exceptions

- **Secrets**: Never write to disk. Use AWS Secrets Manager.
- **EC2 access**: SSM only. Never SSH.
- **Module systems**: Backend = CommonJS. Frontend = ES modules. Never mix.
- **SQL**: Only in `server/src/repositories/`. Never in routes/services. Parameterized queries only.
- **Migrations**: Never edit `sql/migrations/` without explicit approval. Use `-v ON_ERROR_STOP=1`.

---

## Verification Pattern

1. Make the change.
2. `npm run lint` or `npx eslint <filepath>`.
3. `npx tsc --noEmit`.
4. Run relevant tests: `npx jest tests/unit/<file>.test.ts --runInBand`.
5. Report PASS or the exact failure.
6. Stop for approval before committing.

---

## Standards

### LOC Metrics

`docs/metrics/lines-of-code.md` — auto-updated on every push via husky pre-push hook.
Run `npm run metrics` manually anytime to refresh.

### Every new endpoint requires:

1. Entry in `client/src/config/apiTestEndpoints.ts`
2. JSDoc comment on the route handler
3. If it touches DB schema: a note in the relevant `docs/schema/` file

### Every new DB query requires:

- JSDoc on the query builder function
- If schema changes: update `docs/schema/` before the PR

These are non-negotiable. Do not commit a new route without all three.
