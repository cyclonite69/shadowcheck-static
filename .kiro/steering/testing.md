---
inclusion: always
---

# ShadowCheck — Testing Conventions

## Test Framework

- Server-side: Jest with `ts-jest` preset (`jest.config.js`)
- Client-side component tests: excluded from Jest (`testPathIgnorePatterns` includes `client/src/components/`). Needs verification: whether Vitest is configured for client tests.
- E2E: Playwright via CircleCI (`.circleci/config.yml`), parallelized across 4 workers

## Running Tests

```bash
npm test                    # All Jest tests (unit + integration)
npm run test:watch          # Watch mode
npm run test:cov            # With coverage report
npm run test:integration    # Integration tests (RUN_INTEGRATION_TESTS=true)
npm run test:certification  # Radio physical certification suite
```

## Test Directory Structure

```
tests/
├── setup.ts                # Jest setup: env vars, timeouts, global utilities
├── unit/                   # ~50 unit test files
├── integration/            # SQL injection, data integrity, filter parity
├── certification/          # Radio physical certification
├── performance/            # Filter audit performance benchmarks
├── api/                    # Dashboard API tests
└── helpers/                # integrationEnv.ts (shared test utilities)
```

Additional test files exist in:

- `client/src/components/__tests__/` (component-level tests)
- `client/src/components/admin/hooks/__tests__/` (admin hook tests)

## Test Environment

Set in `tests/setup.ts`:

- `NODE_ENV=test`
- `DB_NAME=shadowcheck_test` (separate from dev/prod)
- `PORT=3002` (avoids conflict with dev server)
- 10s default timeout
- Mocks are cleared, reset, and restored between tests

## Testing Patterns

### Unit Tests (most common)

- Mock database queries with Jest (`jest.fn()`)
- No actual database connection required
- Focus on validation logic, query building, filter predicates, SQL generation
- Example: `tests/unit/filterQueryBuilder.test.ts`, `tests/unit/secretsManager.test.ts`

### Integration Tests

- Gated by `RUN_INTEGRATION_TESTS=true` env var
- Test SQL injection prevention, data integrity, route authorization
- Use mocked repositories but test full request/response flow
- Example: `tests/integration/sql-injection-fixes.test.ts` (44 tests covering injection vectors)

### Shell-Based Endpoint Tests

- `scripts/test-endpoints.sh` — curl-based API smoke tests
- `scripts/test-all-filters.sh` — filter parameter validation
- `scripts/test-v2-filters.sh` — v2 filtered endpoint tests
- `scripts/test-dashboard-filters.sh` — dashboard filter tests
- `scripts/validate-explorer-v2.sh` — explorer v2 validation
- These run against a live server instance (local or remote)

### Policy Checks (not Jest)

```bash
npm run policy:secrets       # No secrets written to disk
npm run policy:modularity    # Doc line counts + modularity rules
npm run lint:boundaries      # Client import boundary enforcement
```

## Coverage

- Configured for 70% threshold (branches, functions, lines, statements)
- Coverage collected from: `server/src/**`, `server/server.js`, `scripts/**`, `etl/**`
- Reports: text, text-summary, HTML, LCOV, JSON
- Output directory: `coverage/`

## Writing New Tests

1. Place unit tests in `tests/unit/yourFeature.test.ts`
2. Place integration tests in `tests/integration/yourFeature.test.ts`
3. Mock database calls — don't require a live DB for unit tests
4. Use descriptive test names that explain the threat or behavior being validated
5. For SQL injection tests: include injection attempts, legitimate queries, and edge cases
6. For filter tests: verify both the generated SQL and parameter arrays
