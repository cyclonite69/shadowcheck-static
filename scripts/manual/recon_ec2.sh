#!/bin/bash
set -e

INSTANCE_ID="i-06380d0c9c99f6124"
REGION="us-east-1"
PROFILE="shadowcheck-sso"

# Define the script to run on the EC2 instance
SCRIPT_CONTENT=$(cat <<'EOF'
# Pull DB_PASS from Secrets Manager
DB_PASS=$(aws secretsmanager get-secret-value --secret-id shadowcheck/config --region us-east-1 --query SecretString --output text | python3 -c "import sys,json; print(json.load(sys.stdin)['db_admin_password'])")

echo "--- 1. Migration files on disk ---"
ls -la /home/ssm-user/shadowcheck/sql/migrations/
ls -la /home/ssm-user/shadowcheck/sql/baseline_phase3/

echo "--- 2. What prod has recorded as applied ---"
docker exec -e PGPASSWORD="$DB_PASS" shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db -c "SELECT filename, applied_at FROM app.schema_migrations ORDER BY applied_at;"

echo "--- 3. What test has recorded as applied ---"
docker exec -e PGPASSWORD="$DB_PASS" shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_test -c "SELECT filename, applied_at FROM app.schema_migrations ORDER BY applied_at;"

echo "--- 4. Full table inventory of prod ---"
docker exec -e PGPASSWORD="$DB_PASS" shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db -c "\dt app.*" -c "\dm app.*" -c "\dv app.*"

echo "--- 5. Full table inventory of test ---"
docker exec -e PGPASSWORD="$DB_PASS" shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_test -c "\dt app.*" -c "\dm app.*" -c "\dv app.*"

echo "--- 6. Row counts for all app.* tables in prod ---"
docker exec -e PGPASSWORD="$DB_PASS" shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db -c "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables WHERE schemaname='app' ORDER BY n_live_tup DESC;"
EOF
)

# Use jq to safely generate the parameters JSON
PARAMS=$(jq -n --arg cmd "$SCRIPT_CONTENT" '{commands: [$cmd]}')

echo "Sending command to EC2..."
CMD_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "$PARAMS" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --query "Command.CommandId" \
    --output text)

if [ -z "$CMD_ID" ] || [ "$CMD_ID" == "None" ]; then
    echo "Error: Failed to get Command ID from SSM."
    exit 1
fi

echo "Command ID: $CMD_ID"

# Poll for completion
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
        echo "Command finished with status: $STATUS"
        echo "--- STDOUT ---"
        echo "$RESULT" | jq -r '.StandardOutputContent'
        echo "--- STDERR ---"
        echo "$RESULT" | jq -r '.StandardErrorContent'
        
        if [ "$STATUS" != "Success" ]; then
            exit 1
        fi
        break
    fi
    sleep 5
done
