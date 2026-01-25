# Testing Guide

## Defaults

- `npm test` runs unit/fast suites and skips integration suites unless `RUN_INTEGRATION_TESTS=true`.
- Use this for local development or quick CI checks.

## Full Test Run (Unit + Integration)

- `RUN_INTEGRATION_TESTS=true npm test`
- Requires:
  - Database reachable (Postgres)
  - Any required secrets available via env/keyring
  - No port conflicts for test servers

## Useful Commands

- `npm run test:watch` — watch mode for fast feedback
- `npm run test:cov` — coverage
- `npm run test:integration` — full suite with integration enabled

## Notes

- Integration suites are gated to avoid false failures when DB/ports are unavailable.
- CI should run both standard tests and integration tests with the env flag enabled.
