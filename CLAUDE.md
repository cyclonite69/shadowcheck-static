# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShadowCheck is a SIGINT forensics platform for wireless network threat detection. It analyzes WiFi, Bluetooth, and cellular observations to detect potential surveillance devices using **Dockerized PostgreSQL 18 + PostGIS 3.6** for geospatial analysis.

**Tech Stack**: Node.js 20+, Express 4, PostgreSQL 18 + PostGIS, React 18, Vite 7, TypeScript 5.9, Tailwind CSS v4, Mapbox GL JS, deck.gl 9, Recharts, Zustand 5, Redis 7, Jest 30

**CRITICAL**: PostgreSQL runs in Docker container `shadowcheck_postgres` on the `shadowcheck_net` network. **DO NOT use local system PostgreSQL** - if running API locally, STOP local PostgreSQL: `sudo systemctl stop postgresql`

## Commands

```bash
# Verify Docker PostgreSQL is running (REQUIRED)
docker ps | grep shadowcheck_postgres

# Development
docker-compose up -d --build api   # Run API in Docker (recommended)
npm run build                       # Build React frontend + TypeScript server
npm run dev                         # Local backend with auto-reload (port 3001)
npm run dev:frontend                # Vite dev server (port 5173)

# Testing
npm test                            # All tests (uses tests/setup.ts)
npm run test:watch                  # Watch mode
npm run test:cov                    # With coverage (70% threshold)
npm run test:integration            # Integration tests (RUN_INTEGRATION_TESTS=true)
npx jest tests/unit/file.test.ts   # Single test file
npx jest --testNamePattern="pattern" # Tests matching pattern

# Linting (run before commits)
npm run lint                        # Check issues
npm run lint:fix                    # Auto-fix issues
npm run lint:boundaries             # Check client/server import boundaries
# Note: Avoid `npm run format` unless explicitly needed - it reformats unrelated files

# Docker operations
npm run docker:build                # Build Docker image
npm run docker:up                   # Start containers
npm run docker:down                 # Stop containers
npm run docker:logs                 # Tail API logs

# Database access
docker exec -it shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db
docker exec -it shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db  # Admin access
```

## Architecture

**Monorepo Structure** - Backend in `server/`, Frontend in `client/`:

```
server/
├── server.ts              # Express entry point (orchestration, CommonJS with ts-node)
├── static-server.ts       # Static file server for production
└── src/
    ├── api/routes/
    │   ├── v1/            # Primary HTTP endpoints (22 route modules)
    │   │   ├── admin/     # Admin sub-routes (aws, backup, geocoding, import, etc.)
    │   │   ├── explorer/  # Explorer sub-routes (networks, shared)
    │   │   ├── networks/  # Network sub-routes (list, manufacturer, observations, search, tags)
    │   │   ├── network-tags/  # Tag management sub-routes
    │   │   └── wigle/     # WiGLE sub-routes (database, detail, live, search, status)
    │   └── v2/            # V2 endpoints (filtered, networks, threats)
    ├── services/          # Business logic
    │   ├── analytics/     # Analytics calculations (core, network, threat)
    │   ├── filterQueryBuilder/  # Universal SQL filter builder (large module)
    │   ├── geocoding/     # Geocoding providers (Mapbox, OpenCage, etc.)
    │   └── ml/            # ML scoring service
    ├── repositories/      # Data access layer (base, network)
    ├── config/            # Database pool (database.ts), DI container (container.ts)
    ├── middleware/         # Auth, cache, security headers, HTTPS redirect, SPA fallback, request ID
    ├── validation/        # Request schemas (Zod)
    │   └── schemas/       # Common, geospatial, network, temporal schemas
    ├── errors/            # AppError class, error handler
    ├── logging/           # Winston logger, logging middleware
    ├── utils/             # Server startup modules (modularized initialization)
    └── websocket/         # WebSocket handlers (SSM terminal)

client/
├── src/
│   ├── App.tsx            # React router (React Router 7)
│   ├── main.tsx           # React DOM entry point
│   ├── components/        # 180+ component files
│   │   ├── admin/         # Admin panel (tabs, hooks, types)
│   │   ├── analytics/     # Analytics page (charts, filters, data hooks)
│   │   ├── auth/          # Login form
│   │   ├── badges/        # Threat/type badges
│   │   ├── dashboard/     # Metric cards, card definitions
│   │   ├── filters/       # Universal filter panel sections
│   │   ├── geospatial/    # 46 files: map, table, layers, context menus, 25+ hooks
│   │   ├── kepler/        # Kepler.gl deck.gl integration
│   │   ├── modals/        # Time frequency modal
│   │   ├── ui/            # Shared UI components
│   │   └── wigle/         # WiGLE map and control panel
│   ├── hooks/             # useAuth, useAdaptedFilters, useNetworkData, useObservations, usePageFilters, useFilteredData
│   ├── stores/            # Zustand state (filterStore.ts)
│   ├── types/             # TypeScript types (filters, network)
│   ├── constants/         # Network config, MAP_STYLES, NETWORK_TYPE_CONFIG
│   ├── utils/             # Map helpers, Mapbox loader, filter capabilities
│   │   ├── geospatial/    # renderNetworkTooltip.ts
│   │   └── wigle/         # WiGLE utilities
│   └── index.css          # Tailwind + custom CSS
├── vite.config.ts         # Vite 7 config with PWA, code splitting, proxy
└── tailwind.config.js     # Dark-only theme, semantic z-index tokens
```

**Design Patterns**:

- **Backend**: CommonJS with TypeScript (ts-node transpile-only), Dependency Injection (`server/src/config/container.ts`), Repository pattern
- **Frontend**: ES modules, TypeScript (strict mode), Functional components, Zustand for state
- **Universal Filter System**: `filterStore.ts` + `useAdaptedFilters` hook powers filtering across all pages (Dashboard, Geospatial, Kepler, WiGLE). Filters are URL-synced and page-scoped via `getPageCapabilities()`.
- **Server Modularization**: `server.ts` delegates to utility modules in `src/utils/` (appInit, middlewareInit, routesInit, databaseSetup, serverStartup, serverLifecycle, shutdownHandlers, etc.)

**Map Pages Architecture**:

- `GeospatialExplorer` - Mapbox GL JS with custom observation layers, network context menus, virtualized table
- `KeplerPage` - deck.gl ScatterplotLayer/HeatmapLayer/HexagonLayer for large datasets
- `WiglePage` - Mapbox GL JS with WiGLE API integration (v2 search, v3 detail)
- All use `renderNetworkTooltip.ts` for consistent tooltip rendering

## API Versioning

The API has two versions:

- **v1** (`/api/*`): Primary endpoints, 22 route modules
- **v2** (`/api/v2/*`): Newer filtered endpoints with universal filter query builder
  - `/api/v2/filtered` - Universal filtered data endpoint
  - `/api/v2/networks` - V2 network queries
  - `/api/v2/threats` - V2 threat detection

## Database Schema

PostgreSQL 18 with PostGIS. Network types: `W` (WiFi), `E` (BLE), `B` (Bluetooth), `L` (LTE), `N` (5G NR), `G` (GSM)

**Key Tables**:

- `public.networks` - Network metadata (bssid, ssid, type, frequency, bestlevel, bestlat/bestlon, lasttime_ms)
- `public.observations` - Observation records with location data
- `app.location_markers` - Home/work locations for threat analysis
- `app.network_tags` - Manual network classifications (threat, false_positive, known_safe)
- `app.agency_offices` - FBI field offices/resident agencies with geocoded addresses
- `app.geocoding_cache` - Cached geocoding results
- `app.wigle_v3_details` - WiGLE v3 network detail cache
- `app.wigle_v3_observations` - WiGLE v3 observation data
- `app.network_threat_scores` - Precomputed threat scores
- `app.ml_model_metadata` - ML model training metadata

**Materialized Views**: Multiple MVs for threat scoring, network explorer, analytics. Refreshed via `etl/promote/refresh-mviews.ts`.

**Database Users** (security separation):

- `shadowcheck_user` - Read-only access for queries (used by default `query()`)
- `shadowcheck_admin` - Write access for imports, tagging, backups (use `adminDbService`)

```typescript
// Read operations (default)
const { query } = require('../config/database');
const result = await query('SELECT * FROM public.networks WHERE bssid = $1', [bssid.toUpperCase()]);

// Write operations (admin only)
const adminDb = require('../services/adminDbService');
await adminDb.query('INSERT INTO app.network_tags ...', params);
```

**Migrations**: 75+ SQL migration files in `sql/migrations/`. Run with `node scripts/run-migration.ts`.

## Code Patterns

**Backend Error Handling**:

```typescript
const AppError = require('../errors/AppError');
if (!network) throw new AppError('Network not found', 404);
```

**Validation (Zod schemas)**:

```typescript
// server/src/validation/schemas/
const { z } = require('zod');
// Schemas in: commonSchemas.ts, geospatialSchemas.ts, networkSchemas.ts, temporalSchemas.ts
```

**Secrets Management** (priority: Encrypted keyring → Local files → Environment variables):

```typescript
const secretsManager = require('../services/secretsManager');
const apiKey = secretsManager.get('api_key'); // Optional (returns null if missing)
const dbPassword = secretsManager.getOrThrow('db_password'); // Required (throws if missing)
```

**Logging (Winston)**:

```typescript
const { logger } = require('../logging/logger');
logger.info('Operation completed', { meta: 'data' });
```

**Caching (Redis)**:

```typescript
// Redis 7 running alongside API in Docker
// Used for response caching via cacheMiddleware
// Config: 512MB with allkeys-lru eviction
```

## Kepler.gl Data Rules (Do Not Violate)

- **No artificial limits** on Kepler endpoints unless explicitly requested via query params.
- Default behavior is **no limit**; let the DB and Kepler.gl handle large datasets.
- Applies to: `/api/kepler/data`, `/api/kepler/observations`, `/api/kepler/networks`.
- Use timeouts (e.g., 120s) for large queries and prefer filtering over caps.

## Tailwind CSS (v4)

**CRITICAL**: Uses `@tailwindcss/postcss` plugin (NOT `tailwindcss`). Dark-only theme (slate-950 primary).

- Use Tailwind utilities instead of inline `style={{}}` for colors, spacing, shadows
- Extract complex gradients to `client/src/index.css` under `@layer components`
- Use semantic z-index tokens: `z-modal` (1000), `z-dropdown` (100)
- Reference `client/tailwind.config.js` for color palette and safelist
- See `.cursor/rules/tailwind-css-refactoring.md` for detailed refactoring guidelines

```tsx
// Good: Tailwind utilities
<div className="bg-slate-900/95 border border-slate-700/20 shadow-lg rounded-lg p-4">

// Bad: Inline styles for colors
<div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(71, 85, 105, 0.6)' }}>
```

**Color Mapping**: `#0f172a` → `bg-slate-950`, `#1e293b` → `bg-slate-800`, `rgba(X, 0.9)` → `/90` opacity

**Custom Colors**: `dashboard-dark` (#0a1525), `dashboard-mid` (#0d1c31), `dashboard-darker` (#0a1424)

## Threat Detection

Networks scored on: seen at home AND away (+40 pts), distance range >200m (+25 pts), multiple days (+5-15 pts), observation count (+5-10 pts). Threshold: ≥40 points.

- `/api/threats/quick` - Fast paginated detection
- `/api/threats/detect` - Advanced with speed calculations
- `/api/v2/threats` - V2 with universal filter support
- `/api/ml/train` - ML-based threat scoring (logistic regression)

## Key Configuration

**Required Secrets**: `db_password`, `db_admin_password`, `mapbox_token`
**Optional**: `wigle_api_key`, `wigle_api_name`, `wigle_api_token`, `locationiq_api_key`, `opencage_api_key`, `google_maps_api_key`

**Constants**: `THREAT_THRESHOLD`: 40, `MAX_PAGE_SIZE`: 5000, `RATE_LIMIT`: 1000 req/15min

**Ports**: API server: 3001, Vite dev: 5173, Redis: 6379, PostgreSQL: 5432

## Adding a New API Endpoint

1. Create route handler in `server/src/api/routes/v1/` (TypeScript)
2. Add business logic to service in `server/src/services/`
3. Add data access to repository in `server/src/repositories/`
4. Register services in `server/src/config/container.ts` (if needed)
5. Add validation schema in `server/src/validation/schemas/` (if needed)
6. Import route in `server/src/utils/serverDependencies.ts` (`loadRouteModules()`)
7. Mount route in `server/src/utils/routeMounts.ts` (`mountApiRoutes()`)

**Existing v1 route modules**: `admin`, `admin-threat-scoring`, `agencyOffices`, `analytics`, `analytics-public`, `auth`, `backup`, `dashboard`, `explorer`, `export`, `geospatial`, `health`, `home-location`, `kepler`, `location-markers`, `misc`, `ml`, `network-agencies`, `network-tags`, `networks`, `settings`, `threats`, `weather`, `wigle`

**Existing v2 route modules**: `filtered`, `networks`, `threats`

**Admin sub-routes** (`server/src/api/routes/v1/admin/`): `aws`, `awsInstances`, `backup`, `geocoding`, `import`, `maintenance`, `media`, `notes`, `oui`, `pgadmin`, `secrets`, `settings`, `tags`

## ETL Pipeline

Data ingestion via `etl/` directory with modular stages (TypeScript):

```bash
npx tsx etl/run-pipeline.ts              # Run full ETL pipeline

# Individual stages - Load
npx tsx etl/load/json-import.ts          # Import WiGLE JSON
npx tsx etl/load/sqlite-import.ts        # Import from Kismet SQLite
npx tsx etl/load/sqlite-import-incremental.ts  # Incremental SQLite import
npx tsx etl/load/fbi-field-offices-gov.ts      # Import FBI field office data

# Individual stages - Transform
npx tsx etl/transform/deduplicate.ts     # Deduplicate observations
npx tsx etl/transform/normalize-observations.ts  # Normalize data
npx tsx etl/transform/enrich-geocoding.ts        # Geocoding enrichment

# Individual stages - Promote
npx tsx etl/promote/refresh-mviews.ts    # Refresh materialized views
npx tsx etl/promote/run-scoring.ts       # Run threat scoring
npx tsx etl/promote/validate-data.ts     # Validate data integrity
```

Staging tables are UNLOGGED for ingestion speed.

## ML Model Training

```bash
curl -X POST http://localhost:3001/api/ml/train   # Train model
curl http://localhost:3001/api/ml/status          # Check status

# Advanced iteration with multiple algorithms
pip install -r scripts/ml/requirements.txt
python3 scripts/ml/ml-iterate.py
```

## Secrets Management

Secrets are stored in an encrypted keyring at `~/.local/share/shadowcheck/keyring.enc`, encrypted with a machine-specific key derived from hostname + username.

```bash
npx tsx scripts/set-secret.ts db_password "password"    # Set secret in keyring
npx tsx scripts/set-secret.ts db_admin_password "pass"  # Set admin password
npx tsx scripts/set-secret.ts mapbox_token "pk.xxx"     # Set Mapbox token
```

For Docker: set `KEYRING_MACHINE_ID` env var to `$(hostname)$(whoami)` so the container can decrypt the same keyring file as the host.

## Testing

**Framework**: Jest 30 with ts-jest for TypeScript transformation.

**Test structure**:
- `tests/setup.ts` - Global test setup
- `tests/unit/` - Unit tests (SQL escaping, filter builder, health, secrets, request ID)
- `tests/integration/` - Integration tests (explorer v2, LIKE escaping, data integrity, SQL injection, route verification)
- `tests/api/` - API endpoint tests (dashboard)

**Coverage**: 70% threshold enforced on branches, functions, lines, and statements.

**Running specific tests**:
```bash
npx jest tests/unit/escapeSQL.test.ts              # Single unit test
npx jest tests/integration/                         # All integration tests
RUN_INTEGRATION_TESTS=true npx jest                # Enable integration tests
npx jest --testNamePattern="filter"                # Pattern match
```

## CI/CD

**GitHub Actions** (`.github/workflows/`):
- `ci.yml` - Main CI pipeline (lint, test, build)
- `codeql.yml` - CodeQL security scanning
- `wiki-sync.yml` - Wiki synchronization

**Husky + lint-staged**: Pre-commit hooks run ESLint fix and Prettier on staged `.js`, `.ts`, `.tsx` files.

## Deployment

**Docker Compose** (local): API service + Redis, connects to external `shadowcheck_postgres` container on `shadowcheck_net`.

**AWS** (`deploy/aws/`): EC2 deployment with separated containers (backend, frontend via Nginx, PostGIS). Includes spot instance support, IP whitelisting, SSL, and password rotation scripts.

**Homelab** (`deploy/homelab/`): Self-hosted deployment with PostgreSQL configs tuned for 4GB/8GB RAM.

## Troubleshooting

**Database Connection Errors**:

- Verify Docker PostgreSQL: `docker ps | grep shadowcheck_postgres`
- If local API, STOP local PostgreSQL: `sudo systemctl stop postgresql`
- Test connection: `docker exec shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db`

**Dashboard Shows Zeros**:

- Check data exists: `SELECT COUNT(*) FROM public.networks;`
- Verify home location set in `app.location_markers`
- Check if filters are active (displayed in UI)

**Admin Operations Failing (500 errors on tags/imports)**:

- Ensure `db_admin_password` secret is in keyring: `npx tsx scripts/set-secret.ts db_admin_password`
- Verify migration applied: `sql/migrations/20260129_implement_db_security.sql`

**Build Failures**:

- Frontend: `npm run build:frontend` (Vite, outputs to `dist/`)
- Server: `npm run build:server` (TypeScript, outputs to `dist/server/`)
- Check Node version: requires >=20.0.0 (see `.nvmrc`)

## Key Frontend Utilities

- `client/src/utils/geospatial/renderNetworkTooltip.ts` - Unified tooltip for all map pages
- `client/src/utils/mapHelpers.ts` - Signal range calculations, coordinate formatting
- `client/src/utils/mapboxLoader.ts` - Mapbox GL JS initialization
- `client/src/utils/filterCapabilities.ts` - Page-specific filter feature detection
- `client/src/hooks/useNetworkData.ts` - Network list fetching with `formatSecurity()` helper
- `client/src/hooks/useAdaptedFilters.ts` - Filter adaptation for API queries
- `client/src/stores/filterStore.ts` - Zustand store for universal filters
- `client/src/constants/network.ts` - `MAP_STYLES`, `NETWORK_TYPE_CONFIG`, column definitions

## Key Backend Utilities

- `server/src/services/filterQueryBuilder/universalFilterQueryBuilder.ts` - Core SQL filter builder (large, complex module)
- `server/src/services/secretsManager.ts` - Encrypted keyring secrets
- `server/src/services/adminDbService.ts` - Admin (write) database operations
- `server/src/services/cacheService.ts` - Redis caching layer
- `server/src/services/threatScoringService.ts` - Threat scoring logic
- `server/src/services/dashboardService.ts` - Dashboard data aggregation
- `server/src/utils/escapeSQL.ts` - SQL escaping utilities (security-critical)
- `server/src/validation/schemas/` - Zod validation schemas for all endpoints

## Scripts

Utility scripts in `scripts/` (run with `npx tsx`):

- `scripts/set-secret.ts` - Set secrets in encrypted keyring
- `scripts/bootstrap-secrets.ts` - Initialize secrets keyring
- `scripts/run-migration.ts` - Run database migrations
- `scripts/set-home.ts` - Set home location marker
- `scripts/check-client-imports.ts` - Verify client/server import boundaries
- `scripts/enrichment/` - Address and business name enrichment
- `scripts/geocoding/` - Batch geocoding and reverse geocoding
- `scripts/import/` - Parallel WiGLE import, turbo import
- `scripts/ml/` - ML model training (Python + TypeScript)
- `scripts/cli/shadowcheck-cli.sh` - Interactive CLI interface
