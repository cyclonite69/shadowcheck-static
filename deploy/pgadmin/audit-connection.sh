#!/bin/bash
# Audit and Fix Script for ShadowCheck AWS → pgAdmin Connection
# Run this from your laptop to diagnose and fix connectivity issues

set -e

PROFILE="${AWS_PROFILE:-shadowcheck-sso}"
REGION="us-east-1"
SECRET_NAME="shadowcheck/config"

echo "🔍 ShadowCheck Connection Audit"
echo "================================"
echo ""

# 1. Check AWS credentials
echo "1️⃣  Checking AWS Credentials..."
if aws sts get-caller-identity --profile "$PROFILE" &>/dev/null; then
    IDENTITY=$(aws sts get-caller-identity --profile "$PROFILE")
    echo "✅ AWS credentials valid"
    echo "   Account: $(echo "$IDENTITY" | jq -r .Account)"
    echo "   User: $(echo "$IDENTITY" | jq -r .Arn)"
    ACCESS_KEY=$(echo "$IDENTITY" | jq -r .UserId | cut -d: -f1)
    if [[ $ACCESS_KEY == ASIA* ]]; then
        echo "   Type: Ephemeral (SSO)"
    else
        echo "   Type: Long-lived IAM user"
    fi
else
    echo "❌ AWS credentials invalid or expired"
    echo ""
    echo "Fix: Run 'aws sso login --profile $PROFILE'"
    exit 1
fi
echo ""

# 2. Check Secrets Manager access
echo "2️⃣  Checking Secrets Manager Access..."
if SECRET_JSON=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --query SecretString \
    --output text 2>&1); then
    echo "✅ Secrets Manager accessible"
    DB_PASSWORD=$(echo "$SECRET_JSON" | jq -r '.db_password // empty')
    if [ -n "$DB_PASSWORD" ]; then
        echo "   db_password: ✅ Found (${#DB_PASSWORD} chars)"
    else
        echo "   db_password: ❌ Missing"
    fi
else
    echo "❌ Cannot access Secrets Manager"
    echo "   Error: $SECRET_JSON"
    echo ""
    echo "Fix: Ensure your IAM user/role has secretsmanager:GetSecretValue permission"
    exit 1
fi
echo ""

# 3. Find EC2 instance
echo "3️⃣  Finding ShadowCheck EC2 Instance..."
INSTANCE_ID=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=*shadowcheck*" "Name=instance-state-name,Values=running" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text 2>/dev/null)

if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "None" ]; then
    echo "❌ No running ShadowCheck instance found"
    echo ""
    echo "Fix: Start your EC2 instance"
    exit 1
fi

PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

PUBLIC_DNS=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --query 'Reservations[0].Instances[0].PublicDnsName' \
    --output text)

echo "✅ Instance found"
echo "   Instance ID: $INSTANCE_ID"
echo "   Public IP: $PUBLIC_IP"
echo "   Public DNS: $PUBLIC_DNS"
echo ""

# 4. Check security group
echo "4️⃣  Checking Security Group Rules..."
MY_IP=$(curl -s https://checkip.amazonaws.com)
echo "   Your IP: $MY_IP"

SG_ID=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
    --output text)

ALLOWED_IPS=$(aws ec2 describe-security-groups \
    --group-ids "$SG_ID" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --query 'SecurityGroups[0].IpPermissions[?FromPort==`5432`].IpRanges[].CidrIp' \
    --output text)

if echo "$ALLOWED_IPS" | grep -q "$MY_IP"; then
    echo "✅ Your IP is authorized for PostgreSQL (port 5432)"
else
    echo "❌ Your IP is NOT authorized"
    echo "   Allowed IPs: $ALLOWED_IPS"
    echo ""
    echo "Fix: Run './deploy/aws/scripts/add-ip-access.sh' to add your IP"
    exit 1
fi
echo ""

# 5. Test PostgreSQL connectivity
echo "5️⃣  Testing PostgreSQL Connectivity..."
if command -v nc &>/dev/null; then
    if nc -zv -w 3 "$PUBLIC_IP" 5432 2>&1 | grep -q succeeded; then
        echo "✅ Port 5432 is reachable"
    else
        echo "❌ Cannot reach port 5432"
        echo ""
        echo "Possible causes:"
        echo "  - PostgreSQL container not running on EC2"
        echo "  - Security group misconfigured"
        echo "  - Network firewall blocking connection"
    fi
else
    echo "⚠️  'nc' not installed, skipping port test"
fi
echo ""

# 6. Generate connection string
echo "6️⃣  Connection Details for pgAdmin"
echo "================================"
echo ""
echo "Host: $PUBLIC_IP"
echo "Port: 5432"
echo "Database: shadowcheck_db"
echo "Username: shadowcheck_user"
echo "Password: $DB_PASSWORD"
echo "SSL Mode: require"
echo ""
echo "Connection String:"
echo "postgresql://shadowcheck_user:$DB_PASSWORD@$PUBLIC_IP:5432/shadowcheck_db?sslmode=require"
echo ""

# 7. Test connection with psql (if available)
if command -v psql &>/dev/null; then
    echo "7️⃣  Testing Connection with psql..."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$PUBLIC_IP" -p 5432 -U shadowcheck_user -d shadowcheck_db -c "SELECT version();" &>/dev/null; then
        echo "✅ PostgreSQL connection successful!"
    else
        echo "❌ PostgreSQL connection failed"
        echo ""
        echo "Possible causes:"
        echo "  - Wrong password in Secrets Manager"
        echo "  - SSL/SCRAM configuration mismatch"
        echo "  - pg_hba.conf not allowing your IP"
    fi
else
    echo "⚠️  'psql' not installed, skipping connection test"
fi
echo ""

echo "✅ Audit Complete"
echo ""
echo "Next Steps:"
echo "1. Copy the connection details above into pgAdmin"
echo "2. If connection fails, check EC2 PostgreSQL logs:"
echo "   aws ssm start-session --target $INSTANCE_ID --region $REGION --profile $PROFILE"
echo "   docker logs shadowcheck_postgres"
