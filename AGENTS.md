# Repository Guidelines

## Project Structure & Module Organization
- `client/src/` contains the React + TypeScript frontend (routing in `client/src/App.tsx`, UI in `client/src/components`, state in `client/src/stores`).
- `server/src/` contains the Express API (routes in `server/src/api/routes/v1` and `server/src/api/routes/v2`, services in `server/src/services`, data access in `server/src/repositories`).
- `etl/` houses data load/transform/promote pipelines.
- `tests/` and `client/src/**/__tests__/` hold Jest tests.
- `sql/` contains migrations and database functions.
- `dist/` is the build output served by the production server.

## Build, Test, and Development Commands
```bash
npm run dev           # Build server and run with nodemon
npm run dev:frontend  # Vite dev server for the client
npm run build         # Build frontend + server
npm start             # Run the compiled server from dist/
```
```bash
docker-compose up -d --build api  # Recommended: run API + Postgres via Docker
docker ps | grep shadowcheck_postgres  # Verify DB container is running
```
```bash
npm test              # Jest test suite
npm run test:watch    # Watch mode
npm run test:cov      # Coverage report
npm run test:integration # Integration tests (RUN_INTEGRATION_TESTS=true)
```
```bash
npm run lint          # ESLint checks
npm run lint:boundaries # Validate client/server import boundaries
npm run format        # Prettier formatting
```

## Coding Style & Naming Conventions
- TypeScript is the default across client, server, and ETL. Use `*.ts`/`*.tsx` consistently.
- Formatting and linting are enforced with ESLint and Prettier. Run `npm run lint` before PRs; avoid `npm run format` unless needed because it can reformat unrelated files.
- Follow existing patterns: React components and classes use `PascalCase`, variables and functions use `camelCase`, and constants use `UPPER_SNAKE_CASE` when appropriate.

## Testing Guidelines
- Tests use Jest. Place new tests in `tests/` or alongside modules in `client/src/**/__tests__/` (e.g., `tests/networkTags.test.ts`).
- Coverage target is 70% when running `npm run test:cov`; watch the report when changing core logic.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits (examples from history): `feat: ...`, `fix: ...`, `refactor: ...`, with optional scope `fix(api): ...`.
- PRs should include a clear summary, test evidence, and updated docs when behavior changes. Follow the workflow in `CONTRIBUTING.md`.

## Security & Configuration Tips
- Copy `.env.example` to `.env` and set `DB_*`, `REDIS_*`, and `PORT` before running locally.
- PostgreSQL is expected to run in Docker as `shadowcheck_postgres`; stop local PostgreSQL if it conflicts.
- Database migrations live under `sql/`; follow `sql/migrations/README.md` for order.
- See `SECURITY.md` for production hardening and credential practices.
