# Database Password Rotation Guide

## Overview

ShadowCheck uses **AWS Secrets Manager** for all secrets. No secrets are written to disk.
This guide covers rotating the database password in AWS SM and PostgreSQL.

## Rotation Steps

### 1. Use the rotation script

```bash
./scripts/rotate-db-password.sh
```

Rotate both application and admin passwords if needed:

```bash
./scripts/rotate-db-password.sh --rotate-admin
```

What the script does:

- Generates a strong 32-character password
- Runs `ALTER USER ... WITH PASSWORD ...` so PostgreSQL stores the password as SCRAM-SHA-256
- Updates `shadowcheck/config` in AWS Secrets Manager without writing secrets to disk
- Restarts `shadowcheck_web_api` or `shadowcheck_backend` if running

### 2. Manual fallback

If you cannot use the script, perform the same steps manually:

```bash
NEW_PASSWORD=$(openssl rand -base64 48 | tr -d '=+/' | cut -c1-32)

docker exec shadowcheck_postgres psql -U postgres -d shadowcheck_db -c \
  "ALTER USER shadowcheck_user WITH PASSWORD '$NEW_PASSWORD';"

aws secretsmanager put-secret-value \
  --secret-id shadowcheck/config \
  --secret-string "{\"db_password\":\"$NEW_PASSWORD\"}"

docker restart shadowcheck_web_api 2>/dev/null || docker restart shadowcheck_backend
```

## Security Best Practices

- Rotate passwords every 90 days or after a security event.
- Use strong, randomly generated passwords (32+ chars).
- Do not store secrets in `.env` or files.
- Keep IAM access to Secrets Manager tightly scoped.

## Logging Security

- PostgreSQL configured with `log_statement = 'none'` to prevent password exposure.
- Docker logs are capped to prevent long-term retention of sensitive data.
