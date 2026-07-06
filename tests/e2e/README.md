# ShadowCheck E2E Tests

Playwright end-to-end tests that run against a live API server (`http://127.0.0.1:3001`).

## Required Environment Variables

| Variable             | Required | Description                                      |
| -------------------- | -------- | ------------------------------------------------ |
| `E2E_ADMIN_PASSWORD` | **Yes**  | Password for the admin account used in test auth |
| `E2E_ADMIN_USER`     | No       | Admin username (default: `admin`)                |

`E2E_ADMIN_PASSWORD` has no fallback value. Tests will throw immediately on missing env var
rather than silently submitting a wrong credential. This is intentional — a hardcoded
fallback password in test code is a gitleaks violation and a credential hygiene problem.

## Setup

```bash
# Option 1: export in your shell before running tests
export E2E_ADMIN_USER=admin
export E2E_ADMIN_PASSWORD=<your-local-admin-password>
npx playwright test

# Option 2: .env.e2e file (never commit this file)
cat > tests/e2e/.env.e2e <<EOF
E2E_ADMIN_USER=admin
E2E_ADMIN_PASSWORD=<your-local-admin-password>
EOF
source tests/e2e/.env.e2e && npx playwright test
```

> `.env.e2e` is in `.gitignore`. Never commit actual credentials.

## Running

```bash
# All E2E tests
npx playwright test

# Single spec file
npx playwright test tests/e2e/filters.dashboard.spec.ts

# With browser UI (headed mode)
npx playwright test --headed

# Show test report after run
npx playwright show-report
```

## Auth Strategy

`global-setup.ts` logs in once before all workers and saves the session cookie to
`tests/e2e/.auth/state.json`. Individual tests reuse this stored state to avoid
hitting the rate limiter (50,000 req/15min per IP) when running in parallel.

The `.auth/` directory is gitignored — it contains session cookies, not source code.

## Gitleaks Policy

Credential values are never hardcoded in E2E test files. The `tests/e2e/` path is
covered by a scoped allowlist in `.gitleaks.toml` to account for test-context patterns,
but actual credentials must always come from env vars. If you see a literal password
value in any file under `tests/e2e/`, treat it as a bug and remove it.
