# Database Password Rotation Guide

## Overview

ShadowCheck uses **AWS Secrets Manager** for all secrets. No secrets are written to disk.
This guide covers rotating the database password in AWS SM and PostgreSQL.

## Rotation Steps

### 1. Generate a new password

```bash
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
echo $NEW_PASSWORD
```

### 2. Update AWS Secrets Manager

Update `db_password` in your AWS Secrets Manager secret (e.g., `shadowcheck/config`).

### 3. Update PostgreSQL user

```bash
docker exec shadowcheck_postgres psql -U postgres -d shadowcheck_db -c \
  "ALTER USER shadowcheck_user WITH PASSWORD '$NEW_PASSWORD';"
```

### 4. Restart API

```bash
docker-compose restart api
```

## Security Best Practices

- Rotate passwords every 90 days or after a security event.
- Use strong, randomly generated passwords (32+ chars).
- Do not store secrets in `.env` or files.
- Keep IAM access to Secrets Manager tightly scoped.

## Logging Security

- PostgreSQL configured with `log_statement = 'none'` to prevent password exposure.
- Docker logs are capped to prevent long-term retention of sensitive data.
