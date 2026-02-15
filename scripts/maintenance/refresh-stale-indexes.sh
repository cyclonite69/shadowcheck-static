#!/bin/bash
# Refresh time-based partial indexes (run every 6 months)
# These indexes use fixed dates that go stale over time.
#
# Usage: bash scripts/maintenance/refresh-stale-indexes.sh
# Cron:  0 3 1 1,7 * /home/ssm-user/shadowcheck/scripts/maintenance/refresh-stale-indexes.sh >> /var/log/index-refresh.log 2>&1
set -e

RECENT_DATE=$(date -d '30 days ago' '+%Y-%m-%d')
ACCURACY_DATE=$(date -d '90 days ago' '+%Y-%m-%d')

echo "$(date '+%Y-%m-%d %H:%M:%S') Refreshing indexes with dates: recent=${RECENT_DATE}, accuracy=${ACCURACY_DATE}"

docker exec shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db <<SQL
-- Drop old indexes
DROP INDEX CONCURRENTLY IF EXISTS app.idx_observations_recent_covering;
DROP INDEX CONCURRENTLY IF EXISTS app.idx_observations_high_accuracy_recent;

-- Recreate with current dates
CREATE INDEX CONCURRENTLY idx_observations_recent_covering
  ON app.observations (time DESC, bssid)
  INCLUDE (lat, lon, level, accuracy)
  WHERE time > '${RECENT_DATE}'::timestamptz;

CREATE INDEX CONCURRENTLY idx_observations_high_accuracy_recent
  ON app.observations (bssid, time DESC)
  WHERE accuracy < 100 AND time > '${ACCURACY_DATE}'::timestamptz;

\echo 'Done - indexes refreshed'
SQL

echo "Verify sizes:"
docker exec shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db -c "
  SELECT indexname, pg_size_pretty(pg_relation_size('app.' || indexname))
  FROM pg_indexes
  WHERE indexname LIKE '%_recent%' AND schemaname='app';"
