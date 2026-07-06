#!/bin/bash
set -euo pipefail

MIGRATION_FILE="${1:?Usage: apply-migration.sh <migration_filename>}"
REGION="us-east-1"
PROFILE="shadowcheck-sso"
INSTANCE_ID="i-06380d0c9c99f6124"

if [ ! -f "sql/migrations/$MIGRATION_FILE" ]; then
  echo "ERROR: sql/migrations/$MIGRATION_FILE not found"
  exit 1
fi

SQL_CONTENT=$(cat "sql/migrations/$MIGRATION_FILE")

run_on_ec2() {
  local db_name="$1"
  local script="$2"
  local params
  params=$(jq -n --arg cmd "$script" '{commands: [$cmd]}')

  local cmd_id
  cmd_id=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "$params" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --query "Command.CommandId" \
    --output text)

  echo "  Command ID: $cmd_id"

  while true; do
    local result
    result=$(aws ssm get-command-invocation \
      --command-id "$cmd_id" \
      --instance-id "$INSTANCE_ID" \
      --region "$REGION" \
      --profile "$PROFILE" \
      --query "{Status:Status,Out:StandardOutputContent,Err:StandardErrorContent}" \
      --output json)

    local status
    status=$(echo "$result" | jq -r '.Status')

    if [[ "$status" == "Success" || "$status" == "Failed" || \
          "$status" == "Cancelled" || "$status" == "TimedOut" ]]; then
      echo "  Status: $status"
      echo "$result" | jq -r '.Out'
      if [ "$status" != "Success" ]; then
        echo "STDERR:"
        echo "$result" | jq -r '.Err'
        return 1
      fi
      return 0
    fi
    sleep 3
  done
}

echo "=== Applying $MIGRATION_FILE ==="
echo ""
echo "[1/2] Applying to shadowcheck_test..."

TEST_SCRIPT=$(cat <<EOF
DB_PASS=\$(aws secretsmanager get-secret-value \
  --secret-id shadowcheck/config --region us-east-1 \
  --query SecretString --output text | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['db_admin_password'])")

echo "$SQL_CONTENT" | docker exec -i -e PGPASSWORD="\$DB_PASS" shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_test -v ON_ERROR_STOP=1

docker exec -e PGPASSWORD="\$DB_PASS" shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_test -c "INSERT INTO app.schema_migrations (filename) VALUES ('$MIGRATION_FILE') ON CONFLICT DO NOTHING;"

echo "shadowcheck_test: $MIGRATION_FILE applied"
EOF
)

if ! run_on_ec2 "shadowcheck_test" "$TEST_SCRIPT"; then
  echo ""
  echo "FAILED on shadowcheck_test — aborting. Prod not touched."
  exit 1
fi

echo ""
echo "[2/2] Applying to shadowcheck_db (prod)..."

PROD_SCRIPT=$(cat <<EOF
DB_PASS=\$(aws secretsmanager get-secret-value \
  --secret-id shadowcheck/config --region us-east-1 \
  --query SecretString --output text | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['db_admin_password'])")

echo "$SQL_CONTENT" | docker exec -i -e PGPASSWORD="\$DB_PASS" shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db -v ON_ERROR_STOP=1

docker exec -e PGPASSWORD="\$DB_PASS" shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db -c "INSERT INTO app.schema_migrations (filename) VALUES ('$MIGRATION_FILE') ON CONFLICT DO NOTHING;"

echo "shadowcheck_db: $MIGRATION_FILE applied"
EOF
)

if ! run_on_ec2 "shadowcheck_db" "$PROD_SCRIPT"; then
  echo ""
  echo "FAILED on shadowcheck_db (prod)."
  echo "WARNING: shadowcheck_test has the migration but prod does not."
  echo "Investigate and apply manually if needed."
  exit 1
fi

echo ""
echo "=== Done: $MIGRATION_FILE applied to both databases ==="
