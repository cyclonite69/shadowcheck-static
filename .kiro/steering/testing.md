---
inclusion: fileMatch
fileMatchPattern:
  ['**/tests/**', '**/__tests__/**', '**/*.test.ts', '**/*.spec.ts', 'jest.config.js']
---

# ShadowCheck — Testing Conventions

## Framework & Config

- Jest 30 with `ts-jest` preset, config in `jest.config.js`
- Test environment: `node` (server-side); client component tests use `@jest-environment jsdom` directive
- `setupFilesAfterEnv`: `tests/setup.ts` — sets `NODE_ENV=test`, `DB_NAME=shadowcheck_test`, `PORT=3002`
- Mocks are cleared, reset, and restored between tests (`clearMocks`, `resetMocks`, `restoreMocks` all true)
- `forceExit: true`, `detectOpenHandles: true`, `maxWorkers: '50%'`
- 10s default timeout (`testTimeout: 10000`)
- Client component paths (`client/src/components/`) are in `testPathIgnorePatterns` — those tests need jsdom and are excluded from the main Jest run
- SM is unreachable in the test environment; credential keys (`db_password`) fall back to env vars from `tests/setup.ts` (`DB_PASSWORD=test_password`). Some test suites (e.g. `filterQueryBuilder.test.ts`) import modules that trigger `secretsManager.getOrThrow('db_password')` at import time — this works because the SM-unreachable fallback path accepts env vars

## Commands

```bash
npm test                    # jest (all server-side tests)
npm run test:watch          # jest --watch
npm run test:cov            # jest --coverage (70% threshold: branches, functions, lines, statements)
npm run test:integration    # RUN_INTEGRATION_TESTS=true npm test
npm run test:certification  # Radio physical certification suite
```

## Directory Layout

```
tests/
├── setup.ts                  # Global env vars, timeout, sleep utility, mock cleanup
├── unit/                     # Pure logic tests (filters, queries, ML, security, rendering)
│   └── builders/             # Query builder class tests
├── integration/              # SQL injection, data integrity, filter parity (gated)
├── certification/            # Radio physical certification
├── performance/              # *.perf.test.ts benchmarks
├── api/                      # Dashboard API tests
└── helpers/
    └── integrationEnv.ts     # Exports runIntegration flag + conditional describe/test/it
```

Additional locations:

- `client/src/components/__tests__/` — component-level tests (jsdom)
- `client/src/components/admin/hooks/__tests__/` — admin hook tests

## Test File Conventions

- Name: `featureName.test.ts` (e.g., `filterQueryBuilder.test.ts`, `secretsManager.test.ts`)
- Performance tests: `featureName.perf.test.ts`
- Every test file starts with `export {};` to ensure module isolation
- Imports use relative paths from the test file to source (e.g., `../../server/src/services/...`)
- Use `describe` blocks to group related tests; use `test()` (not `it()`) for individual cases
- Test names should describe the behavior or threat being validated, not implementation details

## Unit Test Patterns

Unit tests are the primary test type. They mock the database layer and test logic in isolation.

### Mocking the database

```typescript
jest.mock('../../server/src/config/database', () => ({
  query: jest.fn(),
  pool: { query: jest.fn(), connect: jest.fn(), end: jest.fn() },
  CONFIG: {
    MIN_VALID_TIMESTAMP: 946684800000,
    MIN_OBSERVATIONS: 2,
    MAX_PAGE_SIZE: 1000,
    DEFAULT_PAGE_SIZE: 100,
  },
}));
```

- Mock `database` module before importing code under test
- Never require a live DB connection in unit tests
- Use `jest.fn()` for all database calls; set return values with `mockResolvedValue`

### Assertion patterns for filter/query tests

Filter and query builder tests are the most common category. They verify:

1. Generated SQL fragments contain expected clauses
2. Parameter arrays match expected values and order
3. Applied filter metadata is tracked correctly

```typescript
// Verify SQL output
expect(where[0]).toContain('ne.threat_level = ANY');
// Verify parameterized values
expect(ctx.getParams()).toEqual([['MEDIUM', 'MED'], 5, '7 days']);
// Verify filter tracking
expect(ctx.getAppliedFilters().map((entry) => entry.field)).toEqual([
  'threatCategories',
  'observationCountMin',
  'timeframe',
]);
```

### SQL injection tests

When testing SQL injection prevention:

- Include injection attempts (semicolons, UNION, comments, subqueries)
- Include legitimate queries that should succeed
- Include edge cases (empty strings, special characters in valid data)
- Assert that malicious input throws with `/Invalid orderBy/` or similar validation errors
- Assert that legitimate input produces correct parameterized queries

## Integration Tests

- Gated by `RUN_INTEGRATION_TESTS=true` env var
- Use helpers from `tests/helpers/integrationEnv.ts`:

```typescript
const { runIntegration } = require('../helpers/integrationEnv');
const describeIfIntegration = runIntegration ? describe : describe.skip;
```

- Test full request/response flow with mocked repositories
- Cover SQL injection prevention, data integrity, filter parity, route authorization

## Client Component Tests

- Use `/** @jest-environment jsdom */` directive at top of file
- Mock API modules with `jest.mock()` and type with `jest.Mocked<typeof module>`
- Use `React.createElement` (not JSX) since these run under ts-jest without babel JSX transform
- Use `@testing-library/react` (`render`, `screen`, `waitFor`, `act`)
- Use `jest.useFakeTimers()` / `jest.advanceTimersByTime()` for debounced or async UI behavior

## Coverage

- Threshold: 70% (branches, functions, lines, statements)
- Collected from: `server/src/**`, `server/server.js`, `scripts/**`, `etl/**`
- Excluded: `node_modules`, `tests`, `__tests__`, `coverage`
- Output: `coverage/` directory; reporters: text, text-summary, HTML, LCOV, JSON

## Policy Checks (non-Jest)

```bash
npm run policy:secrets       # No secrets written to disk
npm run policy:modularity    # Doc line counts + modularity rules
npm run lint:boundaries      # Client import boundary enforcement
```

## Shell-Based Endpoint Tests

These scripts run against a live server instance (not part of `npm test`):

- `scripts/test-endpoints.sh` — curl-based API smoke tests
- `scripts/test-all-filters.sh` — filter parameter validation
- `scripts/test-v2-filters.sh` — v2 filtered endpoint tests
- `scripts/test-dashboard-filters.sh` — dashboard filter tests
- `scripts/validate-explorer-v2.sh` — explorer v2 validation

## Writing New Tests

1. Place unit tests in `tests/unit/yourFeature.test.ts`
2. Place integration tests in `tests/integration/yourFeature.test.ts`
3. Start every file with `export {};`
4. Mock database calls — never require a live DB for unit tests
5. Use descriptive test names that explain the behavior or threat being validated
6. For filter/query tests: verify generated SQL fragments, parameter arrays, and applied filter metadata
7. For SQL injection tests: include injection attempts, legitimate queries, and edge cases
8. For client component tests: use jsdom directive, `React.createElement`, and `@testing-library/react`
