# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

---

## Current Source-of-Truth Map

Before starting work, understand the subsystem layouts and workflow guides:

- [README.md](README.md) — Root entry point and system overview.
- [docs/ai/sessions/ACTIVE.md](docs/ai/sessions/ACTIVE.md) — Active session status and hard safety constraints.
- [docs/maintenance/documentation-workflow.md](docs/maintenance/documentation-workflow.md) — How docs and wiki synchronization is structured.
- [docs/maintenance/maintenance-cadence.md](docs/maintenance/maintenance-cadence.md) — Four maintenance lanes and audit check templates.
- [docs/features/geospatial.md](docs/features/geospatial.md) — Materialized views and Mapbox GL JS frontend.
- [docs/features/wigle-import-player.md](docs/features/wigle-import-player.md) — Ingest queues, ledgers, and rate-limiting.
- [docs/features/surveillance-detection.md](docs/features/surveillance-detection.md) — Surveillance classifications, equipment guides, and bodycam detection signatures.
- [docs/features/badge-studio.md](docs/features/badge-studio.md) — Badge styling rules.
- [docs/SIBLING_RULESET_ANALYSIS.md](docs/SIBLING_RULESET_ANALYSIS.md) — Sibling pair graphs, confidence scales, and chained inference rules.
- [docs/schema/network-tables.md](docs/schema/network-tables.md) — Core wireless database structure.
- [docs/schema/observations-sources.md](docs/schema/observations-sources.md) — WiGLE, KML, and mobile scans observation schemas.
- [docs/FILTERS.md](docs/FILTERS.md) — Universal pipeline filters query syntax.
- [docs/TESTING.md](docs/TESTING.md) — Frontend & backend test environments.
- [docs/workflow/TESTING_STANDARDS.md](docs/workflow/TESTING_STANDARDS.md) — Comprehensive coverage and regression test standards.
- [docs/workflow/EXISTING_WORK_AUDIT.md](docs/workflow/EXISTING_WORK_AUDIT.md) — Mandatory read-only audit and approval gate before implementation.

---

## Hard Workflow Law — Existing Work Audit First

Before implementing, rewriting, deleting, refactoring, documenting, testing, or continuing substantive work, complete the read-only [Existing Work Audit](docs/workflow/EXISTING_WORK_AUDIT.md), report the current implementation and lane ownership, and wait for explicit scope approval. Reuse or extend existing work before creating a parallel system. Generic prompts such as `Write tests for @filename` do not bypass this gate.

---

## Safety Guardrails for Future Agents

- **Operational Operations**: Do not run WiGLE imports, external API calls, VISINT correlation commits, sibling refresh jobs, migrations, or DB mutation jobs unless the user explicitly asks.
- **VISINT Pipeline**: VISINT defaults to preview/no-write behavior unless `commit=true` parameter is explicitly passed.
- **WiGLE Coverage**: WiGLE import progress is not coverage; never use `rows_inserted` as coverage truth. Reference the correct coverage tables instead.
- **Sibling Operations**: Sibling pairs are undirected; readers and query builders must check both `bssid1` and `bssid2`.
- **Sibling Validity**: Generic sibling candidates are not automatically truth; effective siblings must resolve through confidence metrics and override policies.
- **Maintenance lanes**: Documentation updates, unit/integration testing, modularity refactoring, and cruft cleanup are recurring development lanes, not optional afterthoughts.
- **Documentation Audits**: For serious docs updates, use git-history-assisted drift audits; see [docs/maintenance/maintenance-cadence.md](docs/maintenance/maintenance-cadence.md).
- **Unknown credentials — stop, don't guess**: If a credential (password, token, API key) is unknown or unavailable, stop and ask the operator. Never attempt to discover credentials by guessing against a live auth endpoint, cycling common passwords, or any other brute-force or enumeration method. Treating your own auth service as a guessing oracle to route around asking is a security violation regardless of whether any DB writes follow.

### DB Write Protocol — No Exceptions

Every database write (INSERT, UPDATE, DELETE, DDL) requires, in order:

1. Show the exact SQL
2. State the impact (rows affected, tables touched, reversibility)
3. State the rollback plan
4. Wait for explicit operator confirmation

**"Local dev," "Docker only," or "test needed to run" do not create exceptions.** The rule exists precisely because goal-justified writes normalize a pattern that eventually executes somewhere that isn't a laptop container.

**Anti-pattern, observed 2026-07-05:** Agent hit a credential blocker while trying to run E2E tests. It first cycled common passwords against `/api/auth/login` as a discovery mechanism (credential stuffing its own auth service). When that failed, it executed `UPDATE app.users SET password_hash = ...` to reset the admin password, then `DELETE FROM app.user_sessions WHERE token_hash = ...` to revoke a leaked session token — neither with SQL preview, impact statement, or operator confirmation. Both writes were locally correct in outcome. Neither followed this protocol. Local scope does not create an exception.

**Credential leak anti-pattern, same session:** When asked to rotate a password, the agent generated the replacement value and echoed it to stdout before the DB write was approved — burning the secret in the terminal/transcript before it ever touched the database. The correct pipeline: `generate → bcrypt-hash → discard plaintext → show hash only → wait for confirmation → write hash to DB`. The plaintext must never appear in stdout, logs, or any channel that gets pasted into a chat session.

---

## Context Loading Order

Read these before doing anything else on any task:

1. `package.json` — check existing deps before suggesting new ones
2. `docs/ai/sessions/ACTIVE.md` — check active workstreams; do not touch in-progress areas
3. `sql/migrations/README.md` — current migration state
4. `docs/DATABASE_CONNECTION.md` — DB access rules; `npm test` requires Docker; use unit-only flags locally
5. `docs/SSM_ACCESS.md` — EC2/SSM access; read before any DB or production operation
6. `docs/schema/observations-sources.md` — before any query touching observation/wigle data
7. `docs/ai/decisions/` — scan ADRs before any architectural decision
8. Any file explicitly referenced in the prompt via `@filepath`

---

## Project Overview

ShadowCheck is a SIGINT forensics platform for wireless network threat detection.
It analyzes WiFi, Bluetooth, and cellular observations to identify surveillance
devices using PostgreSQL 18 + PostGIS 3.6 for geospatial analysis.

Network types: `W` (WiFi), `E` (BLE), `B` (Bluetooth), `L` (LTE), `N` (5G NR), `G` (GSM)

---

## Commands

```bash
# Development
npm run dev                          # Local backend with auto-reload (port 3001)
npm run dev:frontend                 # Vite dev server (port 5173, hot reload)
npm run build                        # Full build: frontend + server TypeScript → dist/

# Testing
npm test                             # All tests (requires Docker DB running)
npm run test:cov                     # With coverage (70% threshold enforced)
npm run test:integration             # Integration tests (requires Docker DB)
npx jest tests/unit/file.test.ts    # Single test file
npx jest -t "test name pattern"     # Tests matching pattern
# Unit-only (no Docker needed):
npx jest --testPathPatterns="tests/unit" --globalSetup="" --globalTeardown=""

# Linting — run before all commits
npm run lint                         # Check ESLint issues
npm run lint:fix                     # Auto-fix issues
npm run lint:boundaries              # Verify no client→server imports

# Database (Docker only)
docker ps | grep shadowcheck_postgres
docker exec -it shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db    # Read
docker exec -it shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db   # Write

# ETL pipeline
node etl/run-pipeline.js             # Full import pipeline

# Local stack
docker compose up -d postgres redis api frontend
```

---

## Architecture

**Monorepo**: `server/` (Node.js/Express, CommonJS) + `client/` (React 19/Vite, ES modules).

**CRITICAL**: Backend uses CommonJS (`require`/`module.exports`). Frontend uses ES
modules (`import`/`export`). Never mix them.

**CRITICAL**: PostgreSQL runs in Docker container `shadowcheck_postgres` only. Never
use local system PostgreSQL.

### Backend three-tier pattern

```
Routes (server/src/api/routes/)       → validate input, extract params
  └── Services (server/src/services/) → business logic, threat scoring
        └── Repositories (server/src/repositories/) → SQL execution
```

SQL never appears in route handlers. Services are tested without HTTP context.
Repositories can be mocked in tests.

### Key backend files

- `server/server.ts` — Express entry point; all routes mounted here
- `server/src/config/database.ts` — `query()` function (read-only `shadowcheck_user`)
- `server/src/services/adminDbService.ts` — Write operations (`shadowcheck_admin`)
- `server/src/errors/AppError.ts` — Consistent error responses

### Key frontend files

- `client/src/App.tsx` — React Router setup
- `client/src/stores/filterStore.ts` — Zustand universal filter state (URL-synced, page-scoped)
- `client/src/hooks/useAdaptedFilters.ts` — Use this instead of creating new filter state
- `client/src/constants/network.ts` — `MAP_STYLES`, `NETWORK_TYPE_CONFIG`, column definitions
- `client/src/utils/geospatial/renderNetworkTooltip.ts` — Shared map tooltip (all three map pages)

### Database user separation (enforced at DB role level)

```javascript
// Read (default)
const { query } = require('../config/database');
await query('SELECT * FROM app.networks WHERE bssid = $1', [bssid]);

// Write (admin only)
const adminDb = require('../services/adminDbService');
await adminDb.query('INSERT INTO app.network_tags ...', params);
```

Key tables: `app.networks`, `app.observations`, `app.location_markers`, `app.network_tags`

### Universal filter system

`filterStore.ts` + `useAdaptedFilters()` powers filtering across Dashboard, Geospatial,
Kepler, and WiGLE pages. Filters are URL-synced and page-scoped via `getPageCapabilities()`.
Backend converts filters to SQL via `server/src/services/filterQueryBuilder/`.

### Map pages

- **GeospatialExplorer** — Mapbox GL JS, custom observation layers, network context menus
- **KeplerPage** — deck.gl ScatterplotLayer/HeatmapLayer for 100K+ point datasets; **no default pagination limits**
- **WiglePage** — Mapbox GL JS with WiGLE API v2 search / v3 detail integration

### Threat scoring

Networks scored on: seen at home AND away (+40 pts), distance range >200m (+25 pts),
multiple days (+5–15 pts), observation count (+5–10 pts). Threshold: ≥40 (default) points = threat (defined in `server/src/config/database.ts`:L34).

---

## Verification Pattern

For every change, in this exact order:

1. Make the change
2. `npm run lint` or `npx eslint <filepath>`
3. `npx tsc --noEmit`
4. Run relevant tests
5. Report PASS or the exact failure output
6. **Stop for approval before committing**

A failing test or lint error is a hard stop. Do not work around it — report it.

---

## Approval Gates

Stop, show the plan, and wait for explicit "yes" before:

1. Any `git commit`
2. Any `git push`
3. Any DDL against `shadowcheck_db`
4. Any file deletion
5. Any dependency version change
6. Any change to `sql/seed-migrations-tracker.sql`
7. Any file written to `sql/migrations/`

---

## Hard Rules — No Exceptions

### Secrets

- NEVER write secrets to disk
- AWS Secrets Manager is the source of truth
- For local dev: inject as environment variables at runtime only (`export DB_PASSWORD=...`)
- NEVER create `.env` files — only `.env.example`

### EC2 Access

- Instances have no public ingress ports
- Access ONLY via AWS SSM Session Manager (`aws ssm start-session --target i-...`)
- NEVER open port 22 or create 0.0.0.0/0 inbound rules

### File System

- NEVER write to `sql/migrations/` without explicit instruction
- NEVER modify `sql/seed-migrations-tracker.sql` without explicit instruction
- NEVER modify `docker-compose.yml` or any `Dockerfile` without explicit instruction
- NEVER modify `.env` — only `.env.example`
- NEVER auto-commit files in `reports/` — ask first
- All new files go to the path explicitly stated in the prompt

### Git

- NEVER run `git push` without explicit approval in the current prompt
- NEVER run `git commit` without showing the exact diff and message first
- NEVER run `git stash pop` or `git stash drop` without listing contents first
- NEVER use `--force` on any git operation

### Database

- NEVER run DDL against `shadowcheck_db` without explicit approval
- Always use `-v ON_ERROR_STOP=1` on every psql execution
- Always connect as `shadowcheck_admin` — not `postgres` (does not exist in this setup)

### Packages

- All dependencies in `package.json` MUST be pinned to exact versions (no `^` or `~`)
- Dependencies MUST be upgraded one at a time — test and verify each before touching another
- NEVER run `npm audit fix --force`
- NEVER run `npm install <package>` without checking `package.json` first
- NEVER upgrade a package that causes a test failure without stopping and reporting

### Kepler endpoints

- No default pagination limits (Kepler endpoints accept limit/offset parameters)
- Use timeouts (120s) instead of caps

### Tailwind CSS

- Uses `@tailwindcss/postcss` plugin (NOT `tailwindcss`)
- Dark-only theme (slate-950 primary)
- Use Tailwind utilities instead of inline `style={{}}` for colors and spacing

### Import boundaries

- Frontend never imports from `server/`
- Use API calls instead
- Verify with `npm run lint:boundaries`

---

## Parallelism & Subagents

Spawn subagents (via the `Agent` tool) when tasks are **independent and can run in
parallel** — this is faster and protects the main context window from large result sets.

**Good candidates for subagents:**

- Broad codebase exploration that spans more than 3 search queries
- Running tests or lint in parallel with reading files
- Independent research tasks that don't share intermediate results

**Preferred subagent types:**

- `Explore` — fast codebase searches, file pattern matching, keyword grep
- `general-purpose` — open-ended multi-step research or code analysis
- `Plan` — architecture and implementation planning before writing code

**Do NOT spawn a subagent when:**

- You already know the file/function to read — use `Read` or `Grep` directly
- The task is a single focused edit — do it inline
- A prior subagent of the same type is still running — continue via `SendMessage`

When launching parallel subagents, send a **single message with all `Agent` tool calls**
so they start simultaneously rather than sequentially.

---

## Scope Discipline

You are NOT:

- Refactoring anything not mentioned in the current prompt
- Improving adjacent code you notice while working
- Adding logging, comments, or documentation beyond what the prompt asks
- Changing code style or formatting outside the affected lines
- Making judgment calls on stashes, untracked files, or open branches without asking

**Audit prompts that say "DO NOT write any code" mean exactly that.** Identifying
a refactor opportunity during an audit does NOT grant permission to execute it.
Report it as a finding only.

**NEVER modify CLAUDE.md itself during a session.** If you believe CLAUDE.md needs
updating, report what change you would make and why. Wait for explicit approval.

---

## Naming & Conventions

- Utility files: `camelCase`; React components: `PascalCase`
- SQL migrations: `YYYYMMDD_description.sql`
- Conventional commits: `feat(...)`, `fix(...)`, `refactor(...)`, `docs(...)`, `test(...)`, `chore(...)`
- Run `npm run lint:fix` before every commit
- Validate all inputs with Joi or Zod; no raw SQL string concatenation

---

## Ten Commandments

1. Secrets shall never be written to disk.
2. AWS Secrets Manager shall remain the source of truth for secrets.
3. Core tables shall remain canonical.
4. Enrichment data shall live in separate source-owned tables.
5. Cross-source merging shall happen in views or materialized views, not core tables.
6. Source precision shall be preserved end-to-end.
7. Rounding, truncation, and shortening shall remain presentation concerns only.
8. Refactors shall not leave cruft, duplicate paths, or half-migrated code behind.
9. Behavior changes require regression tests; new features require test coverage.
10. Bootstrap, restore, import, and upgrade are separate contracts and must be validated separately.

---

## Claude Code Specifics

**EC2 access**: SSM only — instance `i-06380d0c9c99f6124`, profile `shadowcheck`. Never SSH, never open port 22. Secrets from `shadowcheck/config` in Secrets Manager.

**NEVER run `docker` commands locally.** Local containers are not running and starting them causes resource instability. All container/DB operations go through SSM to EC2 only.

**Tool patterns**:

- `Read` before `Edit` — always
- Parallel `Bash` calls for independent operations (lint + tsc + tests can run simultaneously)
- `Agent` tool for broad codebase exploration spanning >3 searches
- Never spawn agents for single-file reads or targeted edits

**Approved rebuild pattern** (after backend changes):

```bash
# On EC2 via SSM:
cd /home/ssm-user/shadowcheck && ./scs_rebuild.sh
```

**This file**: Explicit user approval required before modifying `CLAUDE.md`. Report the proposed change first.

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
