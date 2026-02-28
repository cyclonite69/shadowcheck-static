#!/bin/bash
# Toggle PostgreSQL external access on/off
# Usage: ./toggle-postgres-access.sh [on|off]

set -e

MODE="${1:-}"
INSTANCE_ID="${2:-}"

if [ -z "$MODE" ] || [ -z "$INSTANCE_ID" ]; then
  echo "Usage: $0 [on|off] [instance-id]"
  echo ""
  echo "Example:"
  echo "  $0 on i-0021a7c116aeb2e9e    # Enable external access"
  echo "  $0 off i-0021a7c116aeb2e9e   # Disable external access"
  exit 1
fi

PROFILE="${AWS_PROFILE:-AdministratorAccess-161020170158}"
REGION="us-east-1"

if [ "$MODE" = "on" ]; then
  echo "🔓 Enabling PostgreSQL external access..."
  aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["cd /home/ssm-user && sed -i \"s/127\\.0\\.0\\.1:5432:5432/5432:5432/\" docker-compose.yml && docker-compose restart postgres"]' \
    --region "$REGION" \
    --profile "$PROFILE" \
    --output text
  echo "✅ PostgreSQL now accessible on 0.0.0.0:5432 (secured by SG)"
elif [ "$MODE" = "off" ]; then
  echo "🔒 Disabling PostgreSQL external access..."
  aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters 'commands=["cd /home/ssm-user && sed -i \"s/5432:5432/127.0.0.1:5432:5432/\" docker-compose.yml && docker-compose restart postgres"]' \
    --region "$REGION" \
    --profile "$PROFILE" \
    --output text
  echo "✅ PostgreSQL now localhost-only"
else
  echo "Invalid mode: $MODE (use 'on' or 'off')"
  exit 1
fi
