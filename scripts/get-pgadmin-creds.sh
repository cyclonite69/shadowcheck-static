#!/bin/bash
# Quick pgAdmin Connection Helper
# Fetches all connection details and displays them for manual entry

PROFILE="${AWS_PROFILE:-shadowcheck-sso}"
REGION="us-east-1"

# Get password
DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id shadowcheck/config \
  --region "$REGION" \
  --profile "$PROFILE" \
  --query SecretString \
  --output text 2>/dev/null | jq -r '.db_password // empty')

# Get EC2 IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=*shadowcheck*" "Name=instance-state-name,Values=running" \
  --region "$REGION" \
  --profile "$PROFILE" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text 2>/dev/null)

if [ -z "$DB_PASSWORD" ] || [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" = "None" ]; then
  echo "❌ Could not retrieve connection details"
  echo ""
  echo "Run full audit: ./scripts/audit-aws-connection.sh"
  exit 1
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         ShadowCheck pgAdmin Connection Details            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "  Host:     $PUBLIC_IP"
echo "  Port:     5432"
echo "  Database: shadowcheck_db"
echo "  Username: shadowcheck_user"
echo "  Password: $DB_PASSWORD"
echo "  SSL Mode: require"
echo ""
echo "Connection String:"
echo "  postgresql://shadowcheck_user:$DB_PASSWORD@$PUBLIC_IP:5432/shadowcheck_db?sslmode=require"
echo ""
echo "Copy these values into pgAdmin → Create Server"
echo ""
