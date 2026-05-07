#!/bin/bash
set -e

# Pull secrets from AWS Secrets Manager
DB_PASS=$(aws secretsmanager get-secret-value --secret-id shadowcheck/config --region us-east-1 --query SecretString --output text | python3 -c "import sys,json; print(json.load(sys.stdin)['db_admin_password'])")

cd /home/ssm-user/shadowcheck

echo "=== Applying baseline 005 (fixed) ===" 
docker exec -i -e PGPASSWORD=$DB_PASS shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_test -v ON_ERROR_STOP=1 < sql/baseline_phase3/baseline_005_analysis_views_materialized_views.sql 2>&1 | tail -40

echo ""
echo "=== Applying baseline 006 (fixed) ==="
docker exec -i -e PGPASSWORD=$DB_PASS shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_test -v ON_ERROR_STOP=1 < sql/baseline_phase3/baseline_006_indexes_grants_defaults.sql 2>&1 | tail -40

echo ""
echo "=== Applying baseline 007 ==="
docker exec -i -e PGPASSWORD=$DB_PASS shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_test -v ON_ERROR_STOP=1 < sql/baseline_phase3/baseline_007_runtime_contracts.sql 2>&1 | tail -20

echo ""
echo "=== Final verification ==="
docker exec -e PGPASSWORD=$DB_PASS shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_test -c "\dm app.api_network_explorer_mv"
docker exec -e PGPASSWORD=$DB_PASS shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_test -c "\dm app.api_wigle_networks_mv"

