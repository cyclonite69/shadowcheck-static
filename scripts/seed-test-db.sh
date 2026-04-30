#!/bin/bash
set -euo pipefail

TARGET_DB="${1:-shadowcheck_test}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# DB connection — works locally against Docker or on EC2 via SSM
PSQL_CMD="docker exec -i -e PGPASSWORD=${PGPASSWORD:-changeme} \
  shadowcheck_postgres psql \
  -U ${DB_USER:-shadowcheck_admin} \
  -d $TARGET_DB \
  -v ON_ERROR_STOP=1"

echo "=== ShadowCheck Test Seed ==="
echo "Target DB: $TARGET_DB"
echo "Repo root: $REPO_ROOT"
echo ""

echo "[1/5] Seeding admin user..."
$PSQL_CMD < "$REPO_ROOT/sql/seeds/01_create_admin_user.sql"

echo "[2/5] Seeding federal courthouses..."
$PSQL_CMD < "$REPO_ROOT/sql/seeds/02_reference_federal_courthouses.sql"

echo "[3/5] Seeding radio manufacturers..."
$PSQL_CMD < "$REPO_ROOT/sql/seeds/03_reference_radio_manufacturers.sql"

echo "[4/5] Seeding synthetic test data..."
$PSQL_CMD < "$REPO_ROOT/sql/seeds/04_synthetic_test_data.sql"

echo "[5/5] Refreshing materialized views..."
docker exec -i -e PGPASSWORD=${PGPASSWORD:-changeme} shadowcheck_postgres psql \
  -U ${DB_USER:-shadowcheck_admin} -d $TARGET_DB \
  -c "REFRESH MATERIALIZED VIEW CONCURRENTLY app.api_network_explorer_mv;" \
  -c "REFRESH MATERIALIZED VIEW CONCURRENTLY app.analytics_summary_mv;" \
  -c "REFRESH MATERIALIZED VIEW CONCURRENTLY app.api_wigle_networks_mv;" || echo "Note: Some materialized views may not exist yet (this is OK in fresh test DB)"

echo ""
echo "=== Seed complete ==="
echo ""
echo "Verifying data:"
echo "  Networks: $(docker exec -i -e PGPASSWORD=${PGPASSWORD:-changeme} shadowcheck_postgres psql -U ${DB_USER:-shadowcheck_admin} -d $TARGET_DB -t -c "SELECT count(*) FROM app.networks WHERE bssid LIKE '000000:%';")"
echo "  Observations: $(docker exec -i -e PGPASSWORD=${PGPASSWORD:-changeme} shadowcheck_postgres psql -U ${DB_USER:-shadowcheck_admin} -d $TARGET_DB -t -c "SELECT count(*) FROM app.observations WHERE bssid LIKE '000000:%';")"
echo ""
