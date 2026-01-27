# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShadowCheck is a SIGINT forensics platform for wireless network threat detection. It analyzes WiFi, Bluetooth, and cellular observations to detect potential surveillance devices using **Dockerized PostgreSQL 18 + PostGIS 3.6** for geospatial analysis.

**Tech Stack**: Node.js 20+, Express, PostgreSQL 18 + PostGIS, React 18, Vite, Tailwind CSS v4, Mapbox GL JS, Recharts

**CRITICAL**: PostgreSQL runs in Docker container `shadowcheck_postgres` on the `shadowcheck_net` network. **DO NOT use local system PostgreSQL** - if running API locally, STOP local PostgreSQL: `sudo systemctl stop postgresql`

## Commands

```bash
# Verify Docker PostgreSQL is running (REQUIRED)
docker ps | grep shadowcheck_postgres

# Development
docker-compose up -d --build api   # Run API in Docker (recommended)
npm run build                       # Build React frontend
npm run dev                         # Local backend with auto-reload (port 3001)
npm run dev:frontend                # Vite dev server (port 5173)

# Testing
npm test                            # All tests
npm run test:watch                  # Watch mode
npm run test:cov                    # With coverage (70% threshold)
npm run test:integration            # Integration tests only
npx jest tests/unit/file.test.js   # Single test file
npx jest --testNamePattern="pattern" # Tests matching pattern

# Linting (run before commits)
npm run lint                        # Check issues
npm run lint:fix                    # Auto-fix issues
# Note: Avoid `npm run format` unless explicitly needed - it reformats unrelated files

# Database access
docker exec -it shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db
```

## Architecture

**Monorepo Structure** - Backend in `server/`, Frontend in `client/`:

```
server/
├── server.js              # Express entry point (orchestration)
└── src/
    ├── api/routes/v1/     # HTTP endpoints
    ├── services/          # Business logic
    ├── repositories/      # Data access layer
    ├── config/            # Database pool, DI container
    ├── middleware/        # Auth, rate limiting, error handling
    ├── validation/        # Request schemas
    └── utils/             # SQL escaping, secrets

client/
├── src/
│   ├── App.tsx            # React router
│   ├── components/        # Page components (.tsx)
│   ├── hooks/             # Custom hooks (useNetworkData, useObservations)
│   ├── stores/            # Zustand state (filterStore)
│   ├── types/             # TypeScript types
│   └── index.css          # Tailwind + custom CSS
├── vite.config.js
└── tailwind.config.js
```

**Design Patterns**:

- **Backend**: CommonJS, Dependency Injection (`server/src/config/container.js`), Repository pattern
- **Frontend**: ES modules, TypeScript, Functional components, Zustand for state

## Database Schema

PostgreSQL 18 with PostGIS. Network types: `W` (WiFi), `E` (BLE), `B` (Bluetooth), `L` (LTE), `N` (5G NR), `G` (GSM)

**Key Tables**:

- `public.networks` - Network metadata (bssid, ssid, type, frequency, bestlevel, bestlat/bestlon, lasttime_ms)
- `public.observations` - Observation records with location data
- `app.location_markers` - Home/work locations for threat analysis

```javascript
// Always use parameterized queries
const { query } = require('../config/database');
const result = await query('SELECT * FROM public.networks WHERE bssid = $1', [bssid.toUpperCase()]);
```

## Code Patterns

**Backend Error Handling**:

```javascript
const AppError = require('../errors/AppError');
if (!network) throw new AppError('Network not found', 404);
```

**Secrets Management** (priority: Docker secrets → System keyring → Environment variables):

```javascript
const secretsManager = require('../services/secretsManager');
const apiKey = secretsManager.get('api_key'); // Optional (returns null if missing)
const dbPassword = secretsManager.getOrThrow('db_password'); // Required (throws if missing)
```

## Tailwind CSS (v4)

**CRITICAL**: Uses `@tailwindcss/postcss` plugin (NOT `tailwindcss`). Dark-only theme (slate-950 primary).

- Use Tailwind utilities instead of inline `style={{}}` for colors, spacing, shadows
- Extract complex gradients to `client/src/index.css` under `@layer components`
- Use semantic z-index tokens: `z-modal` (1000), `z-dropdown` (100)
- Reference `client/tailwind.config.js` for color palette and safelist

```tsx
// Good: Tailwind utilities
<div className="bg-slate-900/95 border border-slate-700/20 shadow-lg rounded-lg p-4">

// Bad: Inline styles for colors
<div style={{ backgroundColor: '#0f172a', border: '1px solid rgba(71, 85, 105, 0.6)' }}>
```

## Threat Detection

Networks scored on: seen at home AND away (+40 pts), distance range >200m (+25 pts), multiple days (+5-15 pts), observation count (+5-10 pts). Threshold: ≥40 points.

- `/api/threats/quick` - Fast paginated detection
- `/api/threats/detect` - Advanced with speed calculations

## Key Configuration

**Required Secrets**: `db_password`, `mapbox_token`
**Optional**: `wigle_api_key`, `locationiq_api_key`, `opencage_api_key`

**Constants**: `THREAT_THRESHOLD`: 40, `MAX_PAGE_SIZE`: 5000, `RATE_LIMIT`: 1000 req/15min

## Adding a New API Endpoint

1. Create route handler in `server/src/api/routes/v1/`
2. Add business logic to service in `server/src/services/`
3. Add data access to repository in `server/src/repositories/`
4. Register services in `server/src/config/container.js` (if needed)
5. Import and mount route in `server/server.js`

## ML Model Training

```bash
curl -X POST http://localhost:3001/api/ml/train   # Train model
curl http://localhost:3001/api/ml/status          # Check status

# Advanced iteration with multiple algorithms
pip install -r scripts/ml/requirements.txt
python3 scripts/ml/ml-iterate.py
```

## Secrets Management

```bash
node scripts/set-secret.js db_password "password"    # Set secret
python3 scripts/keyring/list-keyring-items.py        # List secrets
python3 scripts/keyring/get-keyring-password.py key  # Get secret
```

## Troubleshooting

**Database Connection Errors**:

- Verify Docker PostgreSQL: `docker ps | grep shadowcheck_postgres`
- If local API, STOP local PostgreSQL: `sudo systemctl stop postgresql`
- Test connection: `docker exec shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db`

**Dashboard Shows Zeros**:

- Check data exists: `SELECT COUNT(*) FROM public.networks;`
- Verify home location set in `app.location_markers`
- Check if filters are active (displayed in UI)
