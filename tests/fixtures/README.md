# tests/fixtures

## Static test files

| File                | Purpose                                           |
| ------------------- | ------------------------------------------------- |
| `valid-sample.db`   | Valid WiGLE SQLite fixture for ETL unit tests     |
| `invalid-sample.db` | Malformed SQLite fixture for ETL error-path tests |
| `etl/`              | ETL pipeline fixtures                             |
| `factories.ts`      | Test data factory helpers                         |

## Integration test anchors

`seed_integration_anchors.sql` plants a small set of synthetic observations that
integration tests depend on. All rows use the locally-administered BSSID prefix
`02:SC:TE:ST:xx:xx` so they are clearly synthetic and never confused with real data.

### When to run the seeder

Run it after every `shadowcheck_test` DB refresh, before running the integration suite:

```bash
psql -U shadowcheck_user -d shadowcheck_test -f tests/fixtures/seed_integration_anchors.sql
```

The script is idempotent — safe to run multiple times, duplicate rows are silently ignored.

---

## Refreshing shadowcheck_test from production

`shadowcheck_test` should be refreshed from production periodically (recommended: monthly,
or before major feature pushes) to keep integration tests honest against realistic data.

### What to copy

Schema + observation data. Exclude operator-sensitive operational state:

```bash
pg_dump \
  --schema=app \
  --exclude-table=app.wigle_saved_ssid_terms \
  --exclude-table=app.wigle_ledger_events \
  --no-owner --no-acl \
  shadowcheck_db > /tmp/shadowcheck_test_refresh.sql
```

### What NOT to copy

- `app.wigle_saved_ssid_terms` — operator search history
- `app.wigle_ledger_events` — real rate-limit telemetry
- Any table containing API keys, credentials, or personal operator data

### Restore to shadowcheck_test

```bash
psql -U shadowcheck_admin -d shadowcheck_test -c "DROP SCHEMA app CASCADE; CREATE SCHEMA app;"
psql -U shadowcheck_admin -d shadowcheck_test -f /tmp/shadowcheck_test_refresh.sql
```

### Reseed integration anchors after restore

```bash
psql -U shadowcheck_user -d shadowcheck_test -f tests/fixtures/seed_integration_anchors.sql
```

### Run integration suite to verify

```bash
DB_NAME=shadowcheck_test RUN_INTEGRATION_TESTS=true npm test -- --runInBand --no-coverage
```
