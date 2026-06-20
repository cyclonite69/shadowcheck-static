# ShadowCheck — Gemini CLI Project Config

Full session primer: `docs/ai/GEMINI.md` — read this next.

---

## Project Overview

**ShadowCheckWeb** is a production-grade SIGINT (Signals Intelligence) forensics
and wireless network analysis platform. It provides real-time threat detection,
geospatial correlation via PostGIS, and interactive analysis dashboards.

**Primary Technologies:**

- React 19, Vite 8, TypeScript
- Node.js 22+, Express
- PostgreSQL 18 + PostGIS
- Redis 7.0 (session management, rate limiting, caching)
- Docker / Podman (primary container runtime — not optional)
- Mapbox GL JS, Deck.gl (spatial visualization)
- Zustand (frontend state management)

---

## Architecture

**Frontend:** Component-based UI — Zustand state, Mapbox GL JS + Deck.gl for
spatial visualization.

**Backend:** Express REST API using a Service-Query pattern. All business logic
lives in the service layer with parameterized queries only.

**Data Layer:** PostgreSQL + PostGIS for spatial data. Redis for sessions,
rate limiting, caching.

**ETL:** Modular pipeline for ingestion, transformation, and enrichment of
WiGLE, KML, and mobile scan data.

---

## Directory Structure

- `client/` — React/Vite frontend source
- `server/` — Express backend source
  - `src/api/` — REST API route definitions
  - `src/services/` — Business logic, direct SQL query integration
- `etl/` — ETL pipeline scripts and logic
- `scripts/` — DB management, geocoding, maintenance utilities
- `sql/` — Schema, migrations, PostGIS functions
  - `sql/migrations/` — Live runner path — DO NOT touch without explicit instruction
  - `sql/baseline_drafts/` — Phase 2 planning drafts — reference only
  - `sql/baseline_phase3/` — Phase 3 baseline assembly — validation complete
- `docs/` — Architecture and development documentation
- `tests/` — Integration and unit tests (Jest)
- `deploy/` — AWS, Docker, Homelab deployment configs
- `reports/` — Audit artifacts — untracked, do not auto-commit

---

## Key Files

- `server/server.ts` — Express entry point
- `client/src/App.tsx` — React entry point
- `package.json` — Dependencies and scripts
- `docs/ARCHITECTURE.md` — System architecture detail
- `docs/DEVELOPMENT.md` — Development guide
- `.env.example` — Environment variable template (NEVER touch `.env`)
- `sql/migrations/README.md` — Current migration state
- `sql/seed-migrations-tracker.sql` — Migration tracker seeding (approval required)
- `AGENTS.md` — Prior session notes — read before starting any task

---

## Building and Running

### Prerequisites

- Node.js 22+
- PostgreSQL 18+ with PostGIS
- Redis 7.0+
- Docker or Podman (required)

### Development Commands

```bash
npm install                  # Install dependencies
npm run dev                  # Full-stack dev (nodemon + Vite)
npm run dev:frontend         # Vite frontend only
npm run build                # Production build (client + server)
npm start                    # Run production server from dist/
docker-compose up -d         # Start PostgreSQL, Redis infrastructure
```

### Testing and Linting

```bash
npm test                     # All tests (Jest)
npm run test:integration     # Integration tests (requires live DB)
npm run lint                 # ESLint
npm run format               # Prettier
```

---

## Database Roles — Critical

| Role                | Purpose                                 |
| ------------------- | --------------------------------------- |
| `shadowcheck_admin` | DDL owner — use for all psql operations |
| `shadowcheck_user`  | App runtime role — limited privileges   |
| `postgres`          | Does NOT exist in this container setup  |

Always connect as `shadowcheck_admin`. Never assume a `postgres` superuser.

Live database: `shadowcheck_db` — DDL against this requires explicit approval.

---

## Development Conventions

### Modularity Philosophy

Responsibility-based modularity. One primary responsibility per module.
Coherence and logical grouping over arbitrary line limits.

### TypeScript

Mandatory for all new frontend and backend code.
Use explicit typing. Avoid `any`. No exceptions without justification.

### API Versioning

All routes use `/api/v1/` or `/api/v2/` prefixes.

### Spatial Calculations

Use PostGIS `ST_Distance` (spheroid) for all distance-based SQL logic.

### Multi-Agent Orchestration

For large-scale efforts (e.g., expanding test coverage across multiple
directories, project-wide audits, or bulk refactoring), **ALWAYS** prioritize
parallel execution by spawning multiple `generalist` subagents.

- **Task Partitioning:** Divide the objective into independent, logical batches
  (e.g., by service category or directory).
- **Concurrency:** Assign each batch to a separate subagent to maximize
  throughput.
- **Conflict Avoidance:** Ensure subagents work on distinct files to prevent
  race conditions.
- **Verification:** Subagents must report specific outcomes (e.g., coverage %
  achieved, logical bugs fixed, or standard verification results).

### Security

- Validate all inputs with Joi or Zod
- No raw SQL string concatenation
- No secrets in code — environment variables only via `.env.example`

### Git Workflow

- Conventional Commits: `feat:` `fix:` `docs:` `test:` `chore:`
- Direct pushes to `master` are permitted for this repo — no PR requirement
- `npm test` and `npm run lint` must pass before any commit
- Never use `--force` on any git operation

---

## Hard Rules — No Exceptions

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
- Always connect as `shadowcheck_admin` — not `postgres`
- **SQL**: New query logic should be added to server/src/repositories/ where possible. Existing SQL in server/src/services/ follows established patterns (notably filterQueryBuilder/ for dynamic query construction) — match the nearest file's approach rather than introducing new patterns.

### Packages

- **Pinning:** Dependencies in package.json use a mix of exact pins and caret (^) range versions.
- **Sequential Upgrades:** Dependencies MUST be upgraded one at a time. Each change must be tested and verified working before any other dependency is modified.
- NEVER run `npm audit fix --force`
- NEVER run `npm install <package>` without checking `package.json` first
- NEVER upgrade a package that causes a test failure without stopping and reporting

### Testing

- Run the relevant tests after every change
- A failing test is a hard stop — report it, do not work around it

---

## Approval Gates

Stop, show the plan, wait for explicit "yes" before:

1. Any `git commit`
2. Any `git push`
3. Any DDL against `shadowcheck_db`
4. Any file deletion
5. Any dependency version change
6. Any change to `sql/seed-migrations-tracker.sql`
7. Any file written to `sql/migrations/`

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

---

## Context Loading Order

When starting any task, read these before doing anything else:

1. `package.json` — check existing deps before suggesting new ones
2. `docs/ai/sessions/ACTIVE.md` — active workstreams; do not touch in-progress areas
3. `sql/migrations/README.md` — current migration state
4. `docs/DATABASE_CONNECTION.md` — DB access rules; `npm test` requires Docker; use unit-only flags locally
5. `docs/SSM_ACCESS.md` — EC2/SSM access; read before any DB or production operation
6. `docs/schema/observations-sources.md` — before any query touching observation/wigle data
7. `docs/ai/decisions/` — scan ADRs before any architectural decision
8. Any file explicitly referenced in the prompt via `@filepath`

---

## Verification Pattern

For every change, in this order:

1. Make the change
2. Run relevant lint: `npm run lint` or `npx eslint <filepath>`
3. Run type check: `npx tsc --noEmit`
4. Run relevant tests
5. Report PASS or the exact failure
6. Stop for approval before committing

---

## Scope Discipline

You are NOT:

- Refactoring anything not mentioned in the current prompt
- Improving adjacent code you notice while working
- Adding logging, comments, or documentation beyond what the prompt asks
- Changing code style or formatting outside the affected lines
- Making judgment calls on stashes, untracked files, or open branches
  without asking first

## Scope Discipline — Additional Rules (added after violation 2026-04-05)

- Audit prompts that say "DO NOT write any code" mean exactly that.
  Identifying a refactor opportunity in an audit does NOT grant permission
  to execute it. Report it as a finding only.
- NEVER modify GEMINI.md itself during a session. If you believe GEMINI.md
  needs updating, report what change you would make and why. Wait for
  explicit approval before touching it.
