# ShadowCheck — SIGINT Forensics Platform

[![Node.js](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen?style=flat-square)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-18%2BPostGIS-blue?style=flat-square)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/redis-%3E%3D7.0.0-red?style=flat-square)](https://redis.io/)

**Production-grade SIGINT forensics and wireless network analysis platform.** Real-time threat
detection, geospatial correlation via PostGIS, and interactive analysis dashboards.

---

## Purpose & Ethical Use

ShadowCheck is a **defensive, evidentiary network intelligence platform**.
It is not an offensive tool and is not designed or intended for nefarious,
harmful, or unauthorized use.

**Data:** This platform is designed for operators to analyze their own legally collected
wardriving observations. You bring your own data. The system does not collect data on
your behalf.

**Intended use:**

- Personal network intelligence and RF environment awareness
- Defensive security research using operator-collected data
- Evidentiary documentation of observed RF activity
- Academic and hobbyist wardriving analysis

**Not intended for:**

- Unauthorized network access or surveillance
- Targeting individuals or organizations without consent
- Any activity that violates local, state, or federal law

---

## Current System Status

- **React 19 + Vite 8** frontend with TypeScript (`/geospatial-explorer`, `/analytics`, `/wigle`, `/kepler`, `/admin`)
- **Express + Node.js 22** backend with modular services/repositories architecture
- **PostgreSQL 18 + PostGIS 3.6** with materialized views powering Explorer, sibling graphs, and coverage metrics
- **Redis 7** for session management, rate limiting, and analytics caching
- **Universal filter system** with 30+ filter types across all pages (temporal scopes, spatial, behavioral, surveillance)
- **AWS Secrets Manager** integration for production credentials (Mapbox, WiGLE, DB passwords)
- **DevContainer** support for consistent VS Code development environments

---

## Current Major Subsystems

- **Geospatial Explorer** — Map/table explorer with pre-computed materialized views, sibling topology, pin-drop radius filter, nearest agency/courthouse overlays, activity metrics, and filter-aware hydration. See [docs/features/geospatial.md](docs/features/geospatial.md).
- **Sibling Detection** — Undirected sibling-pair storage, vendor-specific cross-band rules (HP Aruba, Mist, Qualcomm LAA), effective view confidence filtering, and analyst override policy. See [docs/SIBLING_RULESET_ANALYSIS.md](docs/SIBLING_RULESET_ANALYSIS.md).
- **VISINT Evidence Pipeline** — Field image upload, EXIF extraction, spatial-temporal correlation scoring, preview-by-default safety, and explicit-commit persistence. See [docs/features/visint-evidence-pipeline.md](docs/features/visint-evidence-pipeline.md).
- **WiGLE Import Player** — Paginated V2 ingestion, ledger-based resume, rate-limit-safe circuit breakers, quota ledger, Home Area overlay, and Kepler export. See [docs/features/wigle-import-player.md](docs/features/wigle-import-player.md).
- **Surveillance Detection & SIGINT Library** — OUI/device classification, bodycam (BWC) signatures, DeFlock/Flock/ShotSpotter reference layer matching, and vendor equipment guide reference library. See [docs/features/surveillance-detection.md](docs/features/surveillance-detection.md).
- **Badge Studio** — Feature-gated badge rendering configuration for Explorer table columns. See [docs/features/badge-studio.md](docs/features/badge-studio.md).
- **Universal Filters** — 30+ filter types: SSID/BSSID with pipe-OR syntax, temporal scopes, spatial radius, per-category surveillance, WiGLE date ranges, forensic activity metrics. See [docs/FILTERS.md](docs/FILTERS.md).
- **Machine Learning** — Admin-gated logistic regression threat model with tagging-driven training and `scripts/ml/ml-iterate.py` for multi-algorithm hyperparameter iteration.

---

## Architecture

**Frontend:** React 19 + Vite 8 + TypeScript (`client/src/`). Component-based UI with Zustand state, Mapbox GL JS + Deck.gl spatial visualization, and Kepler.gl GeoJSON integration.

**Backend:** Node.js 22 + Express (CommonJS, TypeScript). Three-tier: Routes validate → Services hold logic → Repositories hold SQL. No raw SQL in route handlers.

**Data:** PostgreSQL 18 + PostGIS 3.6 for spatial data. Materialized views (`app.api_network_explorer_mv`, `app.mv_sibling_groups`) pre-compute expensive joins. Redis 7 for sessions, rate limiting, analytics caching.

**Module systems:**

- Backend: CommonJS (`require`/`module.exports`)
- Frontend: ES modules (`import`/`export`)
- Never mix them across boundaries.

**Database roles:**

- `shadowcheck_admin` — DDL owner. Use for all psql/migration operations.
- `shadowcheck_user` — App runtime (read-limited). Default query pool.
- `postgres` superuser does **not** exist in this container setup.

---

## Safety & Operator Constraints

> These apply to all operators and coding agents working in this repo.

**VISINT:** `POST /api/observations/correlate-visint` defaults to `commit=false`. Omitting
`commit` never writes to any table. Pass explicit `commit=true` only after reviewing the
preview. See [docs/features/visint-evidence-pipeline.md](docs/features/visint-evidence-pipeline.md).

**WiGLE imports:** Always use the ledger-based resume flow. Do not re-run imports blindly.
`rows_inserted` is not coverage truth — use `stored_count` from network tables.
See [docs/features/wigle-import-player.md](docs/features/wigle-import-player.md).

**DB mutations / migrations:** Do not run DDL against `shadowcheck_db` without explicit approval.
Use `scs_rebuild.sh` for any rebuild or redeploy on EC2 — never raw `docker build` / `docker compose up`.
See [docs/SSM_ACCESS.md](docs/SSM_ACCESS.md) and [AGENTS.md](AGENTS.md).

**Sibling graph:** Sibling pairs are undirected. Readers and query builders must check
both `bssid1` and `bssid2`. Heuristic candidates are not truth until validated through the
effective view's confidence and override policy.

---

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL 18+ with PostGIS
- Redis 7.0+
- Docker (for local stack)

### Local Development (Docker)

```bash
git clone https://github.com/cyclonite69/shadowcheck-web.git
cd shadowcheck-web
npm install
docker compose up -d
```

`docker compose up -d` starts a self-contained PostgreSQL, Redis, API, and frontend
stack. No `.env` file required for container-to-container connectivity.

### Dev Server (host-based)

```bash
npm run dev          # Nodemon backend on :3001
npm run dev:frontend # Vite frontend on :5173
```

### Shell Helpers

```bash
source ./scripts/local-dev-aliases.sh
```

| Alias       | Action                                       |
| ----------- | -------------------------------------------- |
| `sclocal`   | `docker compose up -d --build`               |
| `scapi`     | Recreate API container with AWS dev defaults |
| `scdb`      | `psql` as `shadowcheck_user`                 |
| `scdba`     | `psql` as `shadowcheck_admin`                |
| `scsecrets` | Restart API + reload secrets from AWS        |

### Homelab Deployment

```bash
./deploy/homelab/scripts/setup.sh
```

See [deploy/homelab/README.md](deploy/homelab/README.md) for hardware requirements.

### AWS EC2 Production

```bash
# Connect via SSM
aws ssm start-session --target INSTANCE_ID --region us-east-1

# Rebuild/redeploy (ONLY approved rebuild method — protects SSL, EBS, permissions)
export HOME=/home/ssm-user && cd /home/ssm-user/shadowcheck && bash deploy/aws/scripts/scs_rebuild.sh
```

See [deploy/aws/QUICKSTART.md](deploy/aws/QUICKSTART.md) for full setup.
See [deploy/aws/WORKFLOW.md](deploy/aws/WORKFLOW.md) for the development workflow.
See [deploy/aws/DEPLOYMENT_CHECKLIST.md](deploy/aws/DEPLOYMENT_CHECKLIST.md) for verification.

---

## Pages

| Route                  | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `/` `/dashboard`       | Network environment overview, threat metrics                     |
| `/geospatial-explorer` | Map + table explorer with filters, sibling topology              |
| `/wigle`               | WiGLE import player, enrichment catalog, map layers              |
| `/kepler`              | Kepler.gl visualization with lazy-loaded tooltips                |
| `/analytics`           | Signal, temporal, threat, and network analytics                  |
| `/admin`               | Admin tools: jobs, geocoding, siblings, SIGINT library, settings |
| `/endpoint-test`       | API endpoint tester                                              |

---

## API Reference

Curated endpoint documentation: **[docs/API_REFERENCE.md](docs/API_REFERENCE.md)**
Exhaustive Express route inventory: **[docs/api/route-inventory.md](docs/api/route-inventory.md)**

Key endpoint groups:

- `GET /api/networks` — Paginated network list with universal filtering
- `GET /api/v2/networks/filtered` — Filtered networks (Explorer, WiGLE, geospatial variants)
- `POST /api/observations/correlate-visint` — VISINT auto-correlation (preview-safe)
- `POST /api/observations/attach-visint` — VISINT explicit commit
- `GET /api/explorer/networks` — Explorer with sibling summaries
- `GET /api/wigle/*` — WiGLE import, enrichment, ledger, search
- `GET /api/admin/siblings/*` — Sibling refresh, override, pairs
- `POST /api/ml/train` — ML model training (admin)
- `POST /api/auth/login` — Session authentication

---

## Project Structure

```
shadowcheck-web/
├── client/
│   └── src/
│       ├── components/    # React components (TypeScript)
│       ├── stores/        # Zustand state management
│       ├── hooks/         # Shared React hooks
│       ├── config/        # API endpoint registry, feature flags
│       └── App.tsx        # Main React app
├── server/
│   └── src/
│       ├── api/routes/v1/ # REST API routes (TypeScript)
│       ├── services/      # Business logic
│       ├── services/visint/     # VISINT pipeline (pipeline, exif, scorer)
│       ├── repositories/  # Data access layer (SQL lives here only)
│       └── config/        # DI container, database config
├── etl/                   # ETL pipeline scripts
├── scripts/               # Utility and maintenance scripts
├── tests/                 # Jest unit and integration tests
│   ├── unit/
│   └── integration/
├── sql/
│   ├── migrations/        # Live migration runner — do not touch without approval
│   └── functions/         # PostgreSQL stored functions
├── docs/                  # Feature guides, schema refs, API reference, maintenance
├── .github/wiki/          # Diagram-heavy wiki docs
├── deploy/
│   ├── aws/               # AWS EC2 deployment scripts
│   └── homelab/           # Self-hosted deployment
└── docker-compose.yml
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed module organization.

---

## Development

```bash
npm run dev           # Backend dev server (nodemon, :3001)
npm run dev:frontend  # Vite frontend (:5173)
npm run build         # Production build (client + server → dist/)
npm test              # Jest suite
npm run test:cov      # Coverage report (70% threshold enforced)
npm run lint          # ESLint
npm run lint:fix      # Auto-fix lint
npx tsc --noEmit      # TypeScript type check
```

See [docs/TESTING.md](docs/TESTING.md) and [docs/workflow/TESTING_STANDARDS.md](docs/workflow/TESTING_STANDARDS.md)
for full test strategy, coverage requirements, and regression standards.

---

## Environment Configuration

Key variables (see `.env.example` — never commit `.env`):

| Variable                              | Purpose                                      |
| ------------------------------------- | -------------------------------------------- |
| `DB_HOST` / `DB_PORT` / `DB_NAME`     | PostgreSQL connection                        |
| `DB_USER` / `DB_PASSWORD`             | App runtime credentials (`shadowcheck_user`) |
| `DB_ADMIN_USER` / `DB_ADMIN_PASSWORD` | Admin operations                             |
| `REDIS_HOST` / `REDIS_PORT`           | Redis connection                             |
| `PORT`                                | API port (default: `3001`)                   |
| `NODE_ENV`                            | `development` or `production`                |
| `MAPBOX_TOKEN`                        | Map visualization                            |
| `WIGLE_API_NAME` / `WIGLE_API_TOKEN`  | WiGLE API credentials                        |

In production, all secrets come from **AWS Secrets Manager** (`shadowcheck/config`).
See [docs/DATABASE_CONNECTION.md](docs/DATABASE_CONNECTION.md) and [docs/SSM_ACCESS.md](docs/SSM_ACCESS.md).

For local-only dev without AWS, export `DB_PASSWORD`, `DB_ADMIN_PASSWORD`, and any
needed API keys in your shell before `docker compose up`.

---

## Security

- Never write secrets to disk. Use AWS Secrets Manager in production.
- Use strong database credentials. Rotate passwords regularly (see `scripts/rotate-db-password.sh`).
- Enable HTTPS/TLS at the reverse proxy layer.
- Redis rate limiting enforces 50,000 req/15 min per IP.
- Multi-user DB model: `shadowcheck_admin` for DDL, `shadowcheck_user` for app runtime.
- See [SECURITY.md](SECURITY.md) for the full security posture.

---

## Project Commandments

Engineering constraints and safety rules live in:

- **[AGENTS.md](AGENTS.md)** — Coding agent rules, EC2 safety, approved shell patterns
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Human contributor standards

Core rules (Ten Commandments in AGENTS.md):

1. Secrets shall never be written to disk.
2. AWS Secrets Manager is the source of truth for secrets.
3. Core tables shall remain canonical.
4. Enrichment data shall live in separate source-owned tables.
5. Cross-source merging happens in views or materialized views, not core tables.
6. Source precision is preserved end-to-end.
7. Rounding and truncation are presentation concerns only.
8. Refactors shall not leave cruft, duplicate paths, or half-migrated code.
9. Behavior changes require regression tests; new features require test coverage.
10. Bootstrap, restore, import, and upgrade are separate contracts.

---

## Documentation Map

| Doc                                                                                      | Purpose                                                        |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [docs/features/visint-evidence-pipeline.md](docs/features/visint-evidence-pipeline.md)   | VISINT upload, EXIF, scoring, safety contract                  |
| [docs/features/geospatial.md](docs/features/geospatial.md)                               | Explorer materialized views, sibling hydration, nearest places |
| [docs/features/wigle-import-player.md](docs/features/wigle-import-player.md)             | WiGLE ingestion lifecycle, ledger, rate-limit safety           |
| [docs/features/surveillance-detection.md](docs/features/surveillance-detection.md)       | BWC signatures, SIGINT library, Flock/ShotSpotter matching     |
| [docs/features/badge-studio.md](docs/features/badge-studio.md)                           | Badge rendering configuration                                  |
| [docs/SIBLING_RULESET_ANALYSIS.md](docs/SIBLING_RULESET_ANALYSIS.md)                     | Sibling inference architecture, vendor rules                   |
| [docs/FILTERS.md](docs/FILTERS.md)                                                       | Universal filter parameter reference                           |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md)                                           | Curated REST API endpoint reference                            |
| [docs/api/route-inventory.md](docs/api/route-inventory.md)                               | Complete, exhaustive Express route mapping                     |
| [docs/api/manual-only-endpoints.md](docs/api/manual-only-endpoints.md)                   | Dangerous/destructive endpoints and automation safety rules    |
| [docs/schema/network-tables.md](docs/schema/network-tables.md)                           | Core wireless database tables                                  |
| [docs/schema/observations-sources.md](docs/schema/observations-sources.md)               | Observation sources, WiGLE accounting                          |
| [docs/TESTING.md](docs/TESTING.md)                                                       | Test strategy and commands                                     |
| [docs/workflow/TESTING_STANDARDS.md](docs/workflow/TESTING_STANDARDS.md)                 | Coverage and regression standards                              |
| [docs/maintenance/maintenance-cadence.md](docs/maintenance/maintenance-cadence.md)       | Four maintenance lanes, audit workflow                         |
| [docs/maintenance/documentation-workflow.md](docs/maintenance/documentation-workflow.md) | Docs/wiki sync process                                         |
| [docs/ai/sessions/ACTIVE.md](docs/ai/sessions/ACTIVE.md)                                 | Active session state for AI agents                             |
| [.github/wiki/Home.md](.github/wiki/Home.md)                                             | Diagram-heavy wiki hub                                         |
| [.github/wiki/Architecture.md](.github/wiki/Architecture.md)                             | Architecture diagrams                                          |
| [.github/wiki/Data-Flow.md](.github/wiki/Data-Flow.md)                                   | Data flow diagrams                                             |

---

## Kepler.gl Data Policy

No default row limits on Kepler endpoints unless explicitly requested via query params.
Filters are the primary data control mechanism. Kepler.gl is designed for large datasets.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for code standards and workflow.

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

MIT. See [LICENSE](LICENSE) for details.
