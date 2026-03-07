# Threat Scoring Validation Runbook

## Purpose

Use this after `scs_rebuild` (or any threat/filter change) to confirm:

- v2 filtered API behavior is healthy
- temporal + threat filters are fast and stable
- `calculate_threat_score_v4` is the active scoring path
- migration state and DB function state match expectations

## 1) Quick deployment sanity

```bash
cd ~/shadowcheck
git rev-parse --short HEAD
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep shadowcheck_
docker logs --tail 120 shadowcheck_backend | grep -Ei "Path decision|Slow V2 query|timed out|v2/filtered|error"
```

## 2) Full filter smoke test

```bash
cd ~/shadowcheck
./scripts/test-all-filters.sh localhost:3001
```

Expected:

- `FAIL=0`
- warnings only for known ignored cases (for example enabled-without-value)

## 3) Targeted temporal + threat category checks

```bash
BASE="http://localhost:3001"
E='{"timeframe":true,"temporalScope":true,"threatCategories":true}'

for W in 30d 90d all; do
  F="{\"temporalScope\":\"observation_time\",\"timeframe\":{\"type\":\"relative\",\"relativeWindow\":\"$W\"},\"threatCategories\":[\"high\"]}"
  echo "=== $W ==="
  time curl --max-time 65 -sS -G "$BASE/api/v2/networks/filtered" \
    --data-urlencode "limit=500" \
    --data-urlencode "offset=0" \
    --data-urlencode "sort=last_seen" \
    --data-urlencode "order=DESC" \
    --data-urlencode "filters=$F" \
    --data-urlencode "enabled=$E" \
    --data-urlencode "includeTotal=1" \
    | jq '{ok, total:.pagination.total, rows:(.data|length)}'
done
```

Expected:

- all responses `ok: true`
- no 500/504
- response times well below timeout

## 4) Check migration tracker and active function

```bash
cd ~/shadowcheck
scdba
```

In `psql`:

```sql
\pset pager off

SELECT filename, applied_at
FROM app.schema_migrations
WHERE filename IN (
  '20260302_deploy_threat_score_v4.sql',
  '20260306_harden_db_roles_and_ownership.sql'
)
ORDER BY filename;

SELECT
  POSITION('eps := 1000' IN pg_get_functiondef('app.calculate_threat_score_v4(text)'::regprocedure)) > 0 AS has_eps_1000,
  POSITION('eps := 0.01'  IN pg_get_functiondef('app.calculate_threat_score_v4(text)'::regprocedure)) > 0 AS has_eps_001,
  POSITION('eps := 500'   IN pg_get_functiondef('app.calculate_threat_score_v4(text)'::regprocedure)) > 0 AS has_eps_500,
  POSITION('eps := 0.005' IN pg_get_functiondef('app.calculate_threat_score_v4(text)'::regprocedure)) > 0 AS has_eps_0005;
```

Expected:

- both migrations present in `app.schema_migrations`
- current function state: `has_eps_001 = true`, `has_eps_0005 = true`

## 5) WiGLE import sanity (permission + persistence)

```bash
docker logs --tail 200 shadowcheck_backend | grep -Ei "wigle|permission denied|failed to import observation|Imported"
```

If permission errors appear, verify grants in DB for runtime user.

## 6) Guardrails

- Do not edit old applied migrations to ship new behavior.
- Ship scoring changes via a new forward migration file.
- Keep scratch SQL in stash or clearly marked non-deploy scripts.
