#!/bin/bash
# Complete Audit & Fix for ShadowCheck AWS → pgAdmin Connection
# Run from your laptop to diagnose and repair all connection issues

set -e

PROFILE="${AWS_PROFILE:-shadowcheck-sso}"
REGION="us-east-1"
SECRET_NAME="shadowcheck/config"

echo "🔍 ShadowCheck AWS Connection Audit & Fix"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# ============================================================================
# 1. AWS CREDENTIALS CHECK
# ============================================================================
echo "1️⃣  AWS Credentials"
echo "-------------------"

if ! command -v aws &>/dev/null; then
    error "AWS CLI not installed"
    echo "Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

if ! aws sts get-caller-identity --profile "$PROFILE" &>/dev/null; then
    error "AWS credentials invalid or expired"
    echo ""
    echo "Fix: Run 'aws sso login --profile $PROFILE'"
    exit 1
fi

IDENTITY=$(aws sts get-caller-identity --profile "$PROFILE")
success "AWS credentials valid"
echo "   Account: $(echo "$IDENTITY" | jq -r .Account)"
echo "   ARN: $(echo "$IDENTITY" | jq -r .Arn)"

ACCESS_KEY=$(echo "$IDENTITY" | jq -r .UserId | cut -d: -f1)
if [[ $ACCESS_KEY == ASIA* ]]; then
    success "Using ephemeral SSO credentials"
else
    warn "Using long-lived IAM keys (consider switching to SSO)"
fi
echo ""

# ============================================================================
# 2. SECRETS MANAGER ACCESS
# ============================================================================
echo "2️⃣  AWS Secrets Manager"
echo "----------------------"

if ! SECRET_JSON=$(aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --query SecretString \
    --output text 2>&1); then
    error "Cannot access Secrets Manager"
    echo "   Error: $SECRET_JSON"
    echo ""
    echo "Fix: Ensure your IAM user/role has this policy:"
    echo "   {\"Effect\": \"Allow\", \"Action\": \"secretsmanager:GetSecretValue\", \"Resource\": \"arn:aws:secretsmanager:$REGION:*:secret:shadowcheck/*\"}"
    exit 1
fi

success "Secrets Manager accessible"

DB_PASSWORD=$(echo "$SECRET_JSON" | jq -r '.db_password // empty')
if [ -n "$DB_PASSWORD" ]; then
    success "db_password found (${#DB_PASSWORD} chars)"
else
    error "db_password missing from secret"
    exit 1
fi
echo ""

# ============================================================================
# 3. EC2 INSTANCE DISCOVERY
# ============================================================================
echo "3️⃣  EC2 Instance Discovery"
echo "-------------------------"

INSTANCE_ID=$(aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=*shadowcheck*" "Name=instance-state-name,Values=running" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text 2>/dev/null)

if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "None" ]; then
    error "No running ShadowCheck instance found"
    echo ""
    echo "Fix: Start your EC2 instance:"
    echo "   aws ec2 start-instances --instance-ids <INSTANCE_ID> --region $REGION --profile $PROFILE"
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

IAM_ROLE=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --profile "$PROFILE" \
    --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' \
    --output text)

success "Instance found"
echo "   Instance ID: $INSTANCE_ID"
echo "   Public IP: $PUBLIC_IP"
echo "   Public DNS: $PUBLIC_DNS"
if [ -n "$IAM_ROLE" ] && [ "$IAM_ROLE" != "None" ]; then
    success "IAM role attached: $(basename "$IAM_ROLE")"
else
    warn "No IAM role attached to instance"
    echo "   EC2 instance cannot access Secrets Manager without IAM role"
fi
echo ""

# ============================================================================
# 4. SECURITY GROUP VALIDATION
# ============================================================================
echo "4️⃣  Security Group Rules"
echo "-----------------------"

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
    success "Your IP is authorized for PostgreSQL (port 5432)"
else
    error "Your IP is NOT authorized"
    echo "   Allowed IPs: $ALLOWED_IPS"
    echo ""
    echo "Fix: Add your IP to security group:"
    echo "   aws ec2 authorize-security-group-ingress \\"
    echo "     --group-id $SG_ID \\"
    echo "     --protocol tcp \\"
    echo "     --port 5432 \\"
    echo "     --cidr ${MY_IP}/32 \\"
    echo "     --region $REGION \\"
    echo "     --profile $PROFILE"
    echo ""
    read -p "Add your IP now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        aws ec2 authorize-security-group-ingress \
            --group-id "$SG_ID" \
            --protocol tcp \
            --port 5432 \
            --cidr "${MY_IP}/32" \
            --region "$REGION" \
            --profile "$PROFILE"
        success "IP added to security group"
    else
        exit 1
    fi
fi
echo ""

# ============================================================================
# 5. POSTGRESQL CONNECTIVITY TEST
# ============================================================================
echo "5️⃣  PostgreSQL Connectivity"
echo "--------------------------"

if command -v nc &>/dev/null; then
    if timeout 3 nc -zv "$PUBLIC_IP" 5432 2>&1 | grep -q succeeded; then
        success "Port 5432 is reachable"
    else
        error "Cannot reach port 5432"
        echo ""
        echo "Possible causes:"
        echo "  1. PostgreSQL container not running on EC2"
        echo "  2. Security group misconfigured"
        echo "  3. Local firewall blocking outbound connections"
        echo ""
        echo "Check PostgreSQL status on EC2:"
        echo "   aws ssm start-session --target $INSTANCE_ID --region $REGION --profile $PROFILE"
        echo "   docker ps | grep postgres"
        echo "   docker logs shadowcheck_postgres"
        exit 1
    fi
else
    warn "'nc' not installed, skipping port test"
fi
echo ""

# ============================================================================
# 6. DATABASE CONNECTION TEST
# ============================================================================
echo "6️⃣  Database Authentication"
echo "--------------------------"

if command -v psql &>/dev/null; then
    if PGPASSWORD="$DB_PASSWORD" psql \
        -h "$PUBLIC_IP" \
        -p 5432 \
        -U shadowcheck_user \
        -d shadowcheck_db \
        -c "SELECT version();" &>/dev/null; then
        success "PostgreSQL authentication successful"
        
        # Get database stats
        STATS=$(PGPASSWORD="$DB_PASSWORD" psql \
            -h "$PUBLIC_IP" \
            -p 5432 \
            -U shadowcheck_user \
            -d shadowcheck_db \
            -t -c "SELECT COUNT(*) FROM app.networks;" 2>/dev/null || echo "0")
        echo "   Networks in database: $(echo $STATS | xargs)"
    else
        error "PostgreSQL authentication failed"
        echo ""
        echo "Possible causes:"
        echo "  1. Wrong password in Secrets Manager"
        echo "  2. SSL/SCRAM configuration mismatch"
        echo "  3. pg_hba.conf not allowing your IP"
        echo ""
        echo "Debug on EC2:"
        echo "   docker exec shadowcheck_postgres cat /etc/postgresql/pg_hba.conf"
        echo "   docker logs shadowcheck_postgres | tail -20"
        exit 1
    fi
else
    warn "'psql' not installed, skipping authentication test"
    echo "   Install: sudo apt install postgresql-client (Ubuntu/Debian)"
    echo "           brew install postgresql (macOS)"
fi
echo ""

# ============================================================================
# 7. GENERATE PGADMIN CONNECTION CONFIG
# ============================================================================
echo "7️⃣  pgAdmin Configuration"
echo "------------------------"
echo ""
echo "Manual Setup (Recommended):"
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

# ============================================================================
# 8. EC2 IAM ROLE CHECK
# ============================================================================
echo "8️⃣  EC2 IAM Role Verification"
echo "----------------------------"

if [ -n "$IAM_ROLE" ] && [ "$IAM_ROLE" != "None" ]; then
    ROLE_NAME=$(basename "$IAM_ROLE" | cut -d/ -f2)
    
    # Get attached policies
    POLICIES=$(aws iam list-attached-role-policies \
        --role-name "$ROLE_NAME" \
        --region "$REGION" \
        --profile "$PROFILE" \
        --query 'AttachedPolicies[].PolicyName' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$POLICIES" ]; then
        success "IAM role has attached policies"
        echo "   Policies: $POLICIES"
        
        # Check for Secrets Manager permissions
        if echo "$POLICIES" | grep -qi "secret\|admin"; then
            success "Likely has Secrets Manager access"
        else
            warn "May be missing Secrets Manager permissions"
            echo "   Required: secretsmanager:GetSecretValue on shadowcheck/*"
        fi
    else
        warn "Could not retrieve role policies"
    fi
else
    error "No IAM role attached to EC2 instance"
    echo ""
    echo "Fix: Attach IAM role with Secrets Manager permissions"
    echo "   1. Create role with trust policy for EC2"
    echo "   2. Attach policy with secretsmanager:GetSecretValue"
    echo "   3. Attach role to instance"
fi
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "=========================================="
echo "✅ Audit Complete"
echo "=========================================="
echo ""
echo "Next Steps:"
echo ""
echo "1. Open pgAdmin and create a new server connection"
echo "2. Use the connection details shown above"
echo "3. If connection fails, check EC2 logs:"
echo "   aws ssm start-session --target $INSTANCE_ID --region $REGION --profile $PROFILE"
echo "   docker logs shadowcheck_postgres"
echo ""
echo "For automated pgAdmin setup, see: deploy/pgadmin/README.md"
echo ""
