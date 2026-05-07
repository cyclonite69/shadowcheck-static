#!/bin/bash
set -e

INSTANCE_ID="i-06380d0c9c99f6124"
REGION="us-east-1"
PROFILE="shadowcheck-sso"

SCRIPT_CONTENT=$(cat <<'EOF'
DB_PASS=$(aws secretsmanager get-secret-value --secret-id shadowcheck/config --region us-east-1 --query SecretString --output text | python3 -c "import sys,json; print(json.load(sys.stdin)['db_admin_password'])")

echo "--- 1. Row counts for all app.* tables in prod ---"
docker exec -e PGPASSWORD="$DB_PASS" shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db -c "SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname='app' ORDER BY n_live_tup DESC;"

echo "--- 2. Full table inventory of test ---"
docker exec -e PGPASSWORD="$DB_PASS" shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_test -c "\dt app.*"

echo "--- 3. Full materialized view inventory of test ---"
docker exec -e PGPASSWORD="$DB_PASS" shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_test -c "\dm app.*"

echo "--- 4. Full view inventory of test ---"
docker exec -e PGPASSWORD="$DB_PASS" shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_test -c "\dv app.*"

echo "--- 5. All migrations in test ---"
docker exec -e PGPASSWORD="$DB_PASS" shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_test -c "SELECT filename, applied_at FROM app.schema_migrations ORDER BY applied_at;"
EOF
)

PARAMS=$(jq -n --arg cmd "$SCRIPT_CONTENT" '{commands: [$cmd]}')

CMD_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "$PARAMS" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --query "Command.CommandId" \
    --output text)

while true; do
    RESULT=$(aws ssm get-command-invocation \
        --command-id "$CMD_ID" \
        --instance-id "$INSTANCE_ID" \
        --region "$REGION" \
        --profile "$PROFILE" \
        --query "{Status:Status,StandardOutputContent:StandardOutputContent,StandardErrorContent:StandardErrorContent}" \
        --output json)
    
    STATUS=$(echo "$RESULT" | jq -r '.Status')
    
    if [[ "$STATUS" == "Success" || "$STATUS" == "Failed" || "$STATUS" == "Cancelled" || "$STATUS" == "TimedOut" ]]; then
        echo "$RESULT" | jq -r '.StandardOutputContent'
        break
    fi
    sleep 5
done
