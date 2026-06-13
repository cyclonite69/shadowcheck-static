# Testing Standards

This document defines unified testing requirements for all development and AI-agent work on ShadowCheck.

---

## Pre-Commit Testing Gate

**All code must pass these checks in order before any `git commit`:**

### 1. Linting

```bash
npm run lint
```

- Runs ESLint on all frontend and backend files
- Must report zero errors (warnings may be acceptable with justification)
- Auto-fix common issues first: `npm run lint:fix`

### 2. Type Checking

```bash
npx tsc --noEmit
```

- Validates all TypeScript files (frontend + backend)
- No TypeScript errors allowed
- Strict mode enforced project-wide

### 3. Test Suite

```bash
npm test
```

- Runs Jest unit and integration tests
- All tests must pass unless explicitly skipped with documented justification
- Coverage threshold: 60% (branches, functions, lines, statements)
- Check coverage: `npm run test:cov`

---

## Testing Requirements by Change Type

### Behavior Changes

- **Requirement**: Provide regression tests that verify the old behavior no longer occurs
- **Scope**: Include tests for edge cases and boundary conditions
- **Example**: Changing how filters are applied requires tests for pre/post state transitions

### New Features

- **Requirement**: Full test coverage (60% threshold enforced)
- **Scope**: Unit tests for isolated logic + integration tests for API endpoints
- **Example**: New endpoint requires entry in `client/src/config/apiTestEndpoints.ts` + tests

### SQL & Schema Changes

- **Requirement**: JSDoc on query builder functions + schema documentation
- **Scope**: Update `docs/schema/` with table/column changes
- **Example**: New migration requires JSDoc comment explaining the change

### Refactoring

- **Requirement**: All existing tests must continue to pass
- **Scope**: No new functionality = no new tests required (unless coverage drops)
- **Example**: Extracting service logic should not change test behavior

---

## Running Tests

### All Tests

```bash
npm test
```

### Specific Test File

```bash
npx jest tests/unit/myfunction.test.ts
npx jest tests/integration/myendpoint.test.ts
```

### Tests Matching Pattern

```bash
npx jest -t "filter name pattern"
```

### Watch Mode

```bash
npm run test:watch
```

### With Coverage Report

```bash
npm run test:cov
```

### Refresh Coverage Report During Commit

Use the transient Git config flag when the commit should include a freshly
generated `docs/metrics/coverage_report.md`:

```bash
git -c shadowcheck.refreshCoverage=true commit -m "test: improve route coverage"
```

The pre-commit hook runs the full suite with coverage, regenerates and formats
the report, and stages it into the same commit. Normal commits skip this
expensive step. Use the flag for coverage milestones rather than every commit.

---

## Test Structure

### Unit Tests

Location: `tests/unit/`

```typescript
describe('myFunction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return expected value', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });

  it('should throw on invalid input', () => {
    expect(() => myFunction(invalid)).toThrow();
  });
});
```

### Integration Tests

Location: `tests/integration/`

```typescript
// Mock database and services
const mockQuery = jest.fn();
jest.mock('../../server/src/config/database', () => ({
  query: mockQuery,
}));

it('GET /api/endpoint should return 200', async () => {
  mockQuery.mockResolvedValue([{ id: 1, name: 'Test' }]);
  const response = await request(app).get('/api/endpoint');
  expect(response.status).toBe(200);
});
```

### Common Test Utilities

Import from `tests/setup.ts`:

```typescript
import { mockDatabase, mockSecrets, createMockRequest } from '../setup';
```

---

## Coverage Threshold

**Project enforcement**: 60% (branches, functions, lines, statements) (as defined in [jest.config.js](../../jest.config.js))

**How to check**:

```bash
npm run test:cov
open coverage/index.html  # View in browser
```

**If coverage drops**:

1. Add tests to bring coverage back above 60%
2. Or revert the change
3. Or document why lower coverage is acceptable (rare exceptions only)

---

## Focused Test Commands

Run focused unit and integration tests to avoid running the full suite:

```bash
# All sibling integration tests (requires shadowcheck_test DB)
RUN_INTEGRATION_TESTS=true DB_NAME=shadowcheck_test npx jest --testPathPattern="siblingRuleQuality|siblingCoverage" --no-coverage

# Sibling unit tests only (no DB required)
DB_NAME=shadowcheck_test npx jest tests/unit/siblingDetectionQueries.test.ts tests/unit/adminSiblingService.test.ts --no-coverage

# Full sibling integration suite including find_sibling_radios
RUN_INTEGRATION_TESTS=true DB_NAME=shadowcheck_test npx jest --testPathPattern="findSiblingRadios|siblingRuleQuality|siblingCoverage" --no-coverage
```

---

## Key Principles

1. **No skipped tests without justification** — document why in the code comment
2. **Mock external dependencies** — database, HTTP calls, file system, secrets
3. **Deterministic tests** — no timing-based assertions, no random data
4. **Isolated tests** — unit tests should not depend on other tests running
5. **Fast execution** — mocking keeps tests under 10s total for full suite
6. **Regression protection** — behavior changes require tests proving the old path now fails

---

## References

- **Jest Configuration**: `jest.config.js`
- **Test Setup**: `tests/setup.ts`
- **Coverage Reports**: `coverage/` directory (git-ignored)
- **Test Enhancement Plan**: `docs/TEST_ENHANCEMENT_PLAN.md`
