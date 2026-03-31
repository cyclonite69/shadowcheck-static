---
inclusion: always
---

# ShadowCheck — Tech Stack & Conventions

## Runtime Versions

- Node.js 22+ (see `.node-version`, `.nvmrc`)
- PostgreSQL 18 with PostGIS 3.6
- Redis 7 (Alpine)
- TypeScript 5+ (strict mode)

## Backend

- Express.js REST API on port 3001
- Entry point: `server/server.ts` (registers ts-node, then runs async bootstrap)
- Production entry: `node dist/server/server/server.js` (compiled via `tsconfig.server.json`)
- Server startup order: secrets → validation → app init → middleware → database → routes → lifecycle → Redis → listen
- Database: `pg` Pool in `server/src/config/database.ts`, search path `app,public`
- Pool size: 5 connections, 30s idle timeout, 60s statement timeout
- Admin pool: separate `adminDbService.ts` pool for privileged operations (migrations, MV refresh, backups)
- Logging: Winston via `server/src/logging/logger.ts`
- Scheduling: `node-schedule` for background cron jobs
- WebSocket: SSM terminal via `server/src/websocket/ssmTerminal.ts`

## Frontend

- React 19 + Vite 7
- Config: `client/vite.config.ts`, root at `client/`
- Dev server proxies `/api` and `/ws` to `localhost:3001`
- State management: Zustand
- Maps: Mapbox GL JS, Kepler.gl
- Charts: Chart.js via Recharts
- Code splitting: vendor-mapbox, vendor-react, vendor-libs, plus per-page chunks
- Build output: `dist/` (served by Express in production)

## TypeScript Configuration

- `tsconfig.json`: root config, `noEmit: true`, includes server/scripts/etl/tests
- `tsconfig.server.json`: extends root, `outDir: ./dist/server`, includes server + etl, excludes tests/client
- Client uses Vite's built-in TS handling (no separate tsconfig for client build)

## Package Scripts (key ones)

| Script                      | Purpose                                    |
| --------------------------- | ------------------------------------------ |
| `npm run dev`               | Build server + nodemon watch               |
| `npm run dev:frontend`      | Vite dev server on :5173                   |
| `npm run build`             | Frontend (Vite) + server (tsc) compilation |
| `npm run build:prod`        | Production build with indexing enabled     |
| `npm test`                  | Jest (server-side tests)                   |
| `npm run lint`              | ESLint                                     |
| `npm run policy:secrets`    | Enforce no-secrets-on-disk policy          |
| `npm run policy:modularity` | Check doc line counts + modularity rules   |
| `npm run lint:boundaries`   | Check client import boundaries             |

## Linting & Formatting

- ESLint: `.eslintrc.json` — 2-space indent, single quotes, semicolons required, `prefer-const`, `eqeqeq`
- Prettier: `.prettierrc.json`
- Husky pre-commit hook in `.husky/pre-commit`
- Client `.tsx`/`.ts` files are excluded from ESLint (handled by Vite/TS)

## Secrets Management — Critical

- AWS Secrets Manager is the sole source of truth for credentials
- Secret name: `shadowcheck/config` (overridable via `SHADOWCHECK_AWS_SECRET` env var)
- `CREDENTIAL_SECRETS` (`db_password`, `db_admin_password`) in `secretsManager.ts`:
  - When SM is reachable: SM value always wins, env vars are ignored for credential keys
  - When SM is unreachable (expired SSO, no IAM role): env vars are accepted as fallback so local dev and tests still work
  - Non-credential secrets (mapbox_token, etc.) always accept env var overrides
- Shell entrypoint (`docker/entrypoint.sh`) fetches SM before running migrations or starting the app; credential keys from SM always override env vars in the entrypoint too
- Policy enforced by `scripts/security/check-no-secret-disk-writes.sh` and `npm run policy:secrets`
- SM resilience: if SM is unreachable at startup, the app retries with exponential backoff (10s → 5min cap) and self-heals when credentials are refreshed — no container restart needed
- Health check (`/health`) exposes `sm_reachable`, `sm_error`, and an actionable `hint` when SSO tokens expire
- Startup logs print a loud banner with fix instructions when SM is unreachable
- Local dev uses AWS SSO profile `shadowcheck-sso` mounted read-only from `~/.aws`; tokens expire after ~12h of inactivity — run `aws sso login --profile shadowcheck-sso` to refresh

## Database Users

- `shadowcheck_user`: read-only application user (used by the API pool)
- `shadowcheck_admin`: privileged user for migrations, MV refresh, backups, ML scoring
- Bootstrap script: `sql/init/00_bootstrap.sql`

## Background Jobs

| Job              | Default Cron  | Purpose                         |
| ---------------- | ------------- | ------------------------------- |
| backup           | `0 3 * * *`   | Database backup to S3           |
| mlScoring        | `0 */4 * * *` | Behavioral ML threat scoring    |
| mvRefresh        | `30 4 * * *`  | Refresh materialized views      |
| siblingDetection | `0 5 * * *`   | Detect co-located access points |

Jobs are gated by `enable_background_jobs` feature flag. Config is stored in `app.settings`
and polled every 5 minutes. Job runs are tracked in `app.job_runs`.

## Materialized Views (refreshed by mvRefresh job)

- `app.api_network_explorer_mv` (critical, concurrent refresh)
- `app.api_network_latest_mv`
- `app.analytics_summary_mv`
- `app.mv_network_timeline`
- Plus `app.network_locations` centroid recomputation after MV refresh
