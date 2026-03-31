---
inclusion: always
---

# ShadowCheck — Repository Structure

## Top-Level Layout

```
shadowcheck-web/
├── client/                  # React 19 + Vite frontend
│   ├── src/
│   │   ├── api/             # Typed API client modules (one per domain)
│   │   ├── components/      # Pages and shared UI components
│   │   │   ├── admin/       # Admin page: hooks/, tabs/, components/
│   │   │   └── __tests__/   # Client-side component tests
│   │   └── App.tsx          # Root component with route definitions
│   ├── public/              # Static assets (favicon, robots, sitemap)
│   ├── index.html           # Vite entry HTML
│   └── vite.config.ts       # Vite config with proxy and code splitting
│
├── server/                  # Express backend
│   ├── server.ts            # Entry point (ts-node bootstrap → async init)
│   ├── static-server.ts     # Optional standalone static file server
│   └── src/
│       ├── api/routes/      # Route handlers
│       │   ├── v1/          # Primary API (health, networks, admin, etc.)
│       │   └── v2/          # Filtered/paginated endpoints
│       ├── config/          # database.ts, routeConfig.ts, container.ts, loadEnv.ts
│       ├── middleware/      # auth, cache, security headers, HTTPS redirect, requestId
│       ├── repositories/    # Data access layer (BaseRepository pattern with ALLOWED_TABLES)
│       ├── services/        # Business logic (organized by domain subdirectories)
│       │   ├── backgroundJobs/  # config.ts, mvRefresh.ts, runners.ts, settings.ts
│       │   ├── filterQueryBuilder/  # Universal filter system
│       │   ├── networking/  # Network query building, sorting, SQL generation
│       │   ├── ml/          # ML model scoring and training
│       │   ├── analytics/   # Analytics query builders
│       │   ├── wigleImport/ # WiGLE data import pipeline
│       │   ├── geocoding/   # Address enrichment services
│       │   ├── backup/      # Backup orchestration
│       │   └── reports/     # Threat report generation
│       ├── errors/          # AppError class and error handler
│       ├── logging/         # Winston logger and request logging middleware
│       ├── types/           # TypeScript declarations (express.d.ts, ml types)
│       ├── utils/           # Server init helpers (one file per bootstrap phase)
│       ├── validation/      # Zod-style schemas and parameter parsers
│       └── websocket/       # SSM terminal WebSocket handler
│
├── etl/                     # Extract-Transform-Load pipeline
│   ├── load/                # sqlite-import.ts, json-import.ts
│   ├── transform/           # Data normalization
│   ├── promote/             # MV refresh, ML scoring promotion
│   └── utils/               # Shared ETL utilities
│
├── sql/
│   ├── init/                # 00_bootstrap.sql (user/schema creation)
│   ├── migrations/          # 10 consolidated migration files (20260216_consolidated_*)
│   └── run-migrations.sh    # Migration runner (tracks in app.schema_migrations)
│
├── scripts/                 # Operational and dev scripts
│   ├── cli/                 # shadowcheck-cli.sh interactive CLI
│   ├── security/            # check-no-secret-disk-writes.sh
│   ├── enrichment/          # Address/venue enrichment scripts
│   ├── geocoding/           # Batch geocoding scripts
│   ├── ml/                  # ML training iteration scripts
│   ├── maintenance/         # Index refresh, export fixes
│   ├── import/              # Parallel WiGLE import
│   └── manual/              # Ad-hoc test/debug scripts
│
├── docker/
│   ├── entrypoint.sh        # Container entrypoint (secrets fetch, migrations, su-exec)
│   ├── infrastructure/      # docker-compose.postgres.yml for pgAdmin management
│   └── initdb/              # Docker entrypoint init scripts for local postgres
│
├── deploy/aws/              # AWS deployment
│   ├── scripts/             # scs_rebuild.sh, deploy-complete.sh, setup-instance.sh, etc.
│   ├── docker/              # Dockerfile.backend, Dockerfile.frontend, Dockerfile.postgis
│   ├── configs/             # Production docker-compose files, nginx.conf, postgresql.conf
│   ├── cloudformation/      # IAM backup permissions
│   ├── iam/                 # SSM embedded session policy
│   ├── lambda/              # Resource attachment Lambda
│   └── docs/                # Infrastructure and security documentation
│
├── tests/                   # Jest test suites
│   ├── unit/                # ~50 unit tests (filters, queries, ML, security)
│   ├── integration/         # SQL injection, data integrity, filter parity
│   ├── certification/       # Radio physical certification tests
│   ├── performance/         # Filter audit performance tests
│   ├── api/                 # Dashboard API tests
│   ├── helpers/             # Test utilities (integrationEnv.ts)
│   └── setup.ts             # Jest setup (env vars, timeouts, cleanup)
│
├── docker-compose.yml       # Local dev stack (postgres, redis, api, frontend)
├── docker-compose.dev.yml   # Dev overrides
├── Dockerfile               # Local dev multi-stage build
├── package.json             # Scripts, dependencies
├── tsconfig.json            # Root TS config (noEmit)
├── tsconfig.server.json     # Server build config (outDir: dist/server)
├── jest.config.js           # Jest with ts-jest preset
└── .eslintrc.json           # ESLint rules
```

## Key Architectural Patterns

- **Repository pattern**: `BaseRepository` with `ALLOWED_TABLES` whitelist and `ALLOWED_COLUMNS` per subclass. Prevents SQL injection via table/column name validation.
- **Service layer**: Business logic lives in `server/src/services/`. Services call repositories or `query()` directly for complex queries.
- **Route mounting**: `server/src/utils/routeMounts.ts` applies `requireAuth` or `requireAdmin` gates based on `API_GATE_ENABLED` env var. Routes are organized by domain in `v1/` and `v2/`.
- **Server bootstrap**: Each init phase is a separate file in `server/src/utils/` (credentialsInit, middlewareInit, databaseSetup, routesInit, serverLifecycle, etc.).
- **Client API layer**: `client/src/api/client.ts` is a centralized fetch wrapper. Domain-specific API modules (networkApi, adminApi, etc.) use this client.
- **Admin UI**: `client/src/components/admin/` uses a hooks + tabs pattern. Each admin feature has a hook (`useBackups.ts`) and a tab component (`BackupsTab.tsx`).

## File Naming Conventions

- Server: camelCase for files (`networkService.ts`, `baseRepository.ts`)
- Client components: PascalCase (`FilterPanel.tsx`, `AdminPage.tsx`)
- Client API modules: camelCase (`networkApi.ts`, `authApi.ts`)
- Tests: `*.test.ts` in `tests/` or `__tests__/` directories
- SQL migrations: `YYYYMMDD_consolidated_NNN_description.sql`
- Shell scripts: kebab-case (`scs_rebuild.sh`, `deploy-complete.sh`)
