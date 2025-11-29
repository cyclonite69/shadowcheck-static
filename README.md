# ShadowCheck

![ShadowCheck Logo](docs/assets/logo.png)

Professional SIGINT forensics & wireless network analysis platform with PostGIS spatial correlation, real-time surveillance detection, and interactive geospatial visualization.

A full-stack platform built for security researchers, incident responders, and RF analysts. Core technologies: TypeScript, React, PostgreSQL + PostGIS, with components for packet ingestion, geospatial correlation, detection rules, and interactive dashboards.

Badges
- Release / Version: ![Release](https://img.shields.io/github/v/release/cyclonite69/shadowcheck?style=flat-square)
- Build (replace WORKFLOW_FILE with your action file): ![CI](https://img.shields.io/github/actions/workflow/status/cyclonite69/shadowcheck/ci.yml?branch=main&style=flat-square)
- License: ![License](https://img.shields.io/github/license/cyclonite69/shadowcheck?style=flat-square)
- Top language: ![Top language](https://img.shields.io/github/languages/top/cyclonite69/shadowcheck?style=flat-square)
- Repo size: ![Repo size](https://img.shields.io/github/repo-size/cyclonite69/shadowcheck?style=flat-square)
- Issues: ![Open issues](https://img.shields.io/github/issues/cyclonite69/shadowcheck?style=flat-square)
- Stars (social): ![Stars](https://img.shields.io/github/stars/cyclonite69/shadowcheck?style=social)
- Code coverage (example provider): ![Coverage](https://img.shields.io/codecov/c/gh/cyclonite69/shadowcheck?style=flat-square)
- Dependabot / Security (example): ![Dependabot](https://img.shields.io/badge/dependabot-enabled-brightgreen?style=flat-square)
- Docker pulls (if published): ![Docker Pulls](https://img.shields.io/docker/pulls/cyclonite69/shadowcheck?style=flat-square)

Table of contents
- About
- Highlights & Features
- Architecture
- Quickstart (dev & docker)
- Production / Deployment
- Database (PostGIS) setup
- Configuration & Environment variables
- API / CLI usage
- Visualizations & dashboards
- Testing & CI
- Security & Privacy
- Contributing
- Governance & best practices
- License
- Roadmap
- Support & contact

About
ShadowCheck ingests wireless telemetry and SIGINT artifacts (passive RF observations, decoded frames, metadata), enriches events with spatial correlation using PostGIS, applies real-time detection rules (surveillance signatures, beacon anomalies, tracking patterns), and exposes a responsive React UI and APIs for investigation and visualization.

Highlights & Features
- Real-time ingestion pipeline for RF/sensor metadata
- Geospatial correlation with PostgreSQL + PostGIS
- Interactive maps and timelines (React + TypeScript)
- Detection engine with rule definitions and alerting
- Data retention, partitioning, and fast spatial queries
- Exportable reports and evidence packaging
- Extensible plugin architecture for additional decoders or input sources
- Role-based access control and audit logging (recommended to enable for production)

Architecture (high level)
- frontend/: React + TypeScript single-page application for visualization and investigation
- server/: Node/TypeScript API server implementing ingestion, enrichment, rule engine, and REST/WS endpoints
- db/: PostgreSQL + PostGIS schema, PL/pgSQL functions, spatial indexes, and CDC scripts
- infra/: Docker Compose and example Kubernetes manifests (Helm charts recommended)
- scripts/: utilities for import/export, evidence packaging, and migrations

Quickstart (development)
Prerequisites: Node.js 16+, Docker, Docker Compose, yarn or npm

1. Clone
   ```bash
   git clone https://github.com/cyclonite69/shadowcheck.git
   cd shadowcheck
   ```

2. Local dev with Docker Compose (starts DB, API, frontend)
   ```bash
   docker compose up --build
   # by default:
   # - Postgres+PostGIS on 5432
   # - API on http://localhost:3000
   # - Frontend on http://localhost:8080
   ```

3. Install client/server deps (if running outside containers)
   ```bash
   cd server && yarn && yarn dev
   cd ../frontend && yarn && yarn start
   ```

Postgres + PostGIS setup (manual)
- Create database user and DB:
  ```sql
  CREATE ROLE shadowcheck WITH LOGIN PASSWORD 'changeme';
  CREATE DATABASE shadowcheck OWNER shadowcheck;
  \c shadowcheck
  CREATE EXTENSION postgis;
  CREATE EXTENSION pg_trgm; -- optional for text similarity searches
  ```
- Run migrations:
  ```bash
  ./scripts/db/migrate.sh
  ```
- Seed sample data for development:
  ```bash
  ./scripts/db/seed_dev.sh
  ```

Configuration & Environment Variables
- server/.env.example contains a full list. Key items:
  - DATABASE_URL=postgres://shadowcheck:password@db:5432/shadowcheck
  - JWT_SECRET=...
  - NODE_ENV=development|production
  - PORT=3000
  - POSTGIS_MIGRATIONS_PATH=...
- frontend/.env.example:
  - REACT_APP_API_URL=http://localhost:3000
  - REACT_APP_MAPBOX_TOKEN=... (or other map provider)

Authentication & Authorization
- The reference implementation uses JWT for API auth and role-based permissions for UI actions.
- For production, integrate with SSO/OAuth2 (e.g., Keycloak) and enable HTTPS/TLS termination at the edge.

API & CLI
- REST endpoints for searches, ingestion, and alerts: see server/docs/openapi.yml
- WebSocket endpoints for live alerts and map updates
- CLI tool (scripts/cli) for bulk ingestion and exports:
  ```bash
  node ./scripts/cli ingest --file examples/sample-telemetry.json
  ```

Visualizations & Dashboards
- Interactive map with clustered events, heatmaps, and timeline scrubber.
- Evidence cards with metadata and geo-trace views.
- Export PNG/PDF snapshots for reporting.

Rule Engine & Detection
- Rules are JSON/TS definitions in server/rules.
- Example rule: suspicious-device-tracking.json
- Rules can be hot-reloaded and tested with built-in simulator.

Testing & CI
- Unit tests: Jest (server & frontend)
- Integration tests: Playwright (UI flows) and Postgres test fixtures
- Coverage: codecov integrations recommended
- Recommended GitHub Actions:
  - ci.yml: build/test/lint
  - release.yml: semantic-release
  - dependabot.yml: automated dependency updates

Security & Privacy
- Keep PII and sensitive payloads encrypted at rest and in transit.
- Use Postgres row-level-security (RLS) if multi-tenant or to restrict access per role.
- Enable GitHub Secret Scanning and Dependabot alerts.
- Add SAST/DAST in CI (e.g., CodeQL, OWASP ZAP).

Contributing
We welcome contributions! Please follow these files when contributing:
- CONTRIBUTING.md (code standards, commit messages, branching)
- CODE_OF_CONDUCT.md
- .github/ISSUE_TEMPLATE and .github/PULL_REQUEST_TEMPLATE
- Use Conventional Commits for automated changelogs and releases.

Suggested repository governance / best practices
- Protect main branch with required reviews and CI passing
- Use CODEOWNERS to assign reviewers for server/, frontend/, infra/
- Enable Dependabot, GitHub Actions, and branch protection rules
- Use semantic-release for automated releases and CHANGELOG generation
- Provide clear issue labels (bug, enhancement, help wanted, security)

Release & Versioning
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Use GitHub Releases and attach build artifacts (docker images, binaries)
- Publish Docker images and tag by semantic version and commit SHA

Roadmap
Planned improvements:
- Harden RBAC + SSO integration
- Plugin marketplace for decoders and enrichment modules
- ML-assisted anomaly detection
- Multi-region replication for geoplace-aware queries
- Export formats for court-admissible evidence packages

Troubleshooting & FAQs
- DB connection errors: ensure POSTGRES_USER/POSTGRES_PASSWORD and that migrations ran
- Map tiles not loading: configure REACT_APP_MAPBOX_TOKEN or switch providers
- Slow spatial queries: ensure GiST/GIST indexes on geometry columns and use ST_DWithin with proper indexes

License
- This repository is licensed under the MIT License. See LICENSE for details.

Acknowledgements
- Built with open source geospatial tools (PostGIS), mapping libraries (Mapbox/Leaflet), and the TypeScript/React ecosystem.

Contact & Support
- For support or security issues, please open an issue or contact the maintainers at the repository's issue tracker.
- For security vulnerabilities, prefer a private disclosure via the repository's SECURITY.md process.

Appendices & Links
- Schema reference: db/README.md
- OpenAPI: server/docs/openapi.yml
- Architecture diagrams: docs/architecture.png
- Example datasets: examples/

---
Notes for maintainers (what I included and next steps)
- This README collects project goals, quickstart, architecture, recommended GitHub best practices, and actionable next steps (CI, CODEOWNERS, CONTRIBUTING).
- Suggestions: add CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, and ISSUE/PR templates to the repo root; enable Dependabot and GitHub Actions; add a CODEOWNERS file to guide reviews.
- If you want, I can:
  - create a branch with this README update and push it to the repository,
  - open a PR with additional suggested files (CONTRIBUTING.md, SECURITY.md, CODEOWNERS, PR/issue templates),
  - or generate the supplementary files now. Tell me which action you'd like me to take.
