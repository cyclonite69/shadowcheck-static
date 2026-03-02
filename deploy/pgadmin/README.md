# pgAdmin Local Setup for AWS EC2 PostgreSQL

## Problem

Your local pgAdmin container can't access AWS Secrets Manager because:

- It runs on your laptop (not EC2)
- It doesn't have IAM role credentials
- The entrypoint script expects AWS CLI access

## Solution: Direct Connection

pgAdmin doesn't need Secrets Manager - just connect with the password directly.

## Quick Fix

### 1. Get Database Password

```bash
# From your laptop
aws secretsmanager get-secret-value \
  --secret-id shadowcheck/config \
  --region us-east-1 \
  --profile shadowcheck-sso \
  --query SecretString \
  --output text | jq -r '.db_password'
```

### 2. Get EC2 Public IP

```bash
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=*shadowcheck*" "Name=instance-state-name,Values=running" \
  --region us-east-1 \
  --profile shadowcheck-sso \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text
```

### 3. Verify Your IP is Allowed

```bash
# Check current IP
curl -s https://checkip.amazonaws.com

# Add your IP to security group if needed
cd deploy/aws/scripts
./add-ip-access.sh
```

### 4. Configure pgAdmin

Open pgAdmin and create a new server with these settings:

**General Tab:**

- Name: `ShadowCheck AWS`

**Connection Tab:**

- Host: `<EC2_PUBLIC_IP>`
- Port: `5432`
- Maintenance database: `shadowcheck_db`
- Username: `shadowcheck_user`
- Password: `<from step 1>`
- Save password: ✅ (optional)

**SSL Tab:**

- SSL mode: `Require`
- Root certificate: Download from https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

### 5. Test Connection

Click "Save" and pgAdmin should connect.

## Automated Audit

Run the audit script to check everything:

```bash
cd deploy/pgadmin
./audit-connection.sh
```

This will:

- ✅ Verify AWS credentials
- ✅ Check Secrets Manager access
- ✅ Find your EC2 instance
- ✅ Verify security group rules
- ✅ Test PostgreSQL connectivity
- ✅ Generate connection string

## Troubleshooting

### Connection Refused

**Check PostgreSQL is running on EC2:**

```bash
aws ssm start-session --target <INSTANCE_ID> --region us-east-1 --profile shadowcheck-sso
docker ps | grep postgres
docker logs shadowcheck_postgres
```

### SSL/SCRAM Errors

**Verify pg_hba.conf allows your IP:**

```bash
# On EC2 via SSM
docker exec shadowcheck_postgres cat /etc/postgresql/pg_hba.conf
```

Should contain:

```
hostssl all shadowcheck_user 0.0.0.0/0 scram-sha-256
```

### Wrong Password

**Verify password in Secrets Manager matches PostgreSQL:**

```bash
# Get password from AWS SM
aws secretsmanager get-secret-value \
  --secret-id shadowcheck/config \
  --region us-east-1 \
  --profile shadowcheck-sso \
  --query SecretString \
  --output text | jq -r '.db_password'

# Test connection
PGPASSWORD='<password>' psql -h <EC2_IP> -p 5432 -U shadowcheck_user -d shadowcheck_db -c "SELECT 1;"
```

## Alternative: Simplified pgAdmin (No AWS Integration)

If you don't need automated discovery, use standard pgAdmin:

```bash
docker run -d \
  --name pgadmin_simple \
  -p 5050:80 \
  -e PGADMIN_DEFAULT_EMAIL=admin@shadowcheck.local \
  -e PGADMIN_DEFAULT_PASSWORD=admin \
  dpage/pgadmin4:latest
```

Then manually configure the server connection as described in step 4 above.

## Security Notes

- Never commit passwords to git
- Use ephemeral SSO credentials (not long-lived IAM keys)
- Rotate passwords every 60-90 days
- Keep security group restricted to your IP only
- Use SSL/TLS for all connections
