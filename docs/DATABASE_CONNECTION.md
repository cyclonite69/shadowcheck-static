# Database Connection Guide

**Comprehensive reference for connecting to ShadowCheck PostgreSQL database**

---

## Quick Reference

### Development (Local)

```bash
# Start Docker containers if not running
docker compose up -d

# Read-only queries (shadowcheck_user)
docker exec -it shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db

# Write operations (shadowcheck_admin)
docker exec -it shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db
```

### Production (EC2 via SSM)

```bash
# Connect to EC2 first
aws ssm start-session --target i-06380d0c9c99f6124 --region us-east-1 --profile shadowcheck-sso

# Then inside EC2 shell, get the admin password from AWS Secrets Manager
DB_PASS=$(aws secretsmanager get-secret-value --secret-id shadowcheck/config \
  --region us-east-1 --query SecretString --output text | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['db_admin_password'])")

# Connect to database
docker exec -e PGPASSWORD=$DB_PASS shadowcheck_postgres psql \
  -U shadowcheck_admin -d shadowcheck_db -v ON_ERROR_STOP=1
```

---

## Connection Details

| Property     | Value                                     |
| ------------ | ----------------------------------------- |
| **Host**     | `shadowcheck_postgres` (Docker container) |
| **Port**     | `5432`                                    |
| **Database** | `shadowcheck_db`                          |
| **Version**  | PostgreSQL 18 + PostGIS 3.6               |
| **Schema**   | `app` (primary)                           |

---

## Database Roles

### `shadowcheck_admin`

- **Purpose**: DDL and data modifications (imports, tagging, backups)
- **Privileges**: Full read/write access
- **Password**: Stored in AWS Secrets Manager (`shadowcheck/config` → `db_admin_password`)
- **Use for**:
  - Running migrations
  - Importing data
  - Administrative queries
  - Schema modifications

### `shadowcheck_user`

- **Purpose**: Application runtime queries
- **Privileges**: Read-only access to tables
- **Password**: Stored in AWS Secrets Manager (`shadowcheck/config` → `db_user_password`)
- **Use for**:
  - Standard SELECT queries
  - Report generation
  - API read operations

---

## Connection Methods

### 1. Local Development (Docker Desktop / Docker CLI)

**Prerequisites**: Docker is running, containers are started

```bash
# Check container is running
docker ps | grep shadowcheck_postgres

# Connect as read-only user
docker exec -it shadowcheck_postgres psql \
  -U shadowcheck_user \
  -d shadowcheck_db \
  -h localhost

# Connect as admin
docker exec -it shadowcheck_postgres psql \
  -U shadowcheck_admin \
  -d shadowcheck_db \
  -h localhost
```

### 2. Production (EC2 via SSM)

**Prerequisites**:

- AWS SSO session active (`aws sso login --profile shadowcheck-sso`)
- SSM Session Manager plugin installed
- IAM permissions to access EC2 and Secrets Manager

**Step 1: Connect to EC2**

```bash
aws ssm start-session --target i-06380d0c9c99f6124 --region us-east-1 --profile shadowcheck-sso
```

**Step 2: Get database password**

```bash
DB_ADMIN_PASS=$(aws secretsmanager get-secret-value \
  --secret-id shadowcheck/config \
  --region us-east-1 \
  --query SecretString \
  --output text | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['db_admin_password'])")

# For user password (read-only)
DB_USER_PASS=$(aws secretsmanager get-secret-value \
  --secret-id shadowcheck/config \
  --region us-east-1 \
  --query SecretString \
  --output text | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['db_user_password'])")
```

**Step 3: Connect to database**

```bash
# As admin
docker exec -e PGPASSWORD=$DB_ADMIN_PASS shadowcheck_postgres psql \
  -U shadowcheck_admin \
  -d shadowcheck_db \
  -v ON_ERROR_STOP=1

# As user (read-only)
docker exec -e PGPASSWORD=$DB_USER_PASS shadowcheck_postgres psql \
  -U shadowcheck_user \
  -d shadowcheck_db
```

### 3. Using psql with Connection String (Local)

```bash
# Full connection string format
psql "postgresql://shadowcheck_user@shadowcheck_postgres/shadowcheck_db"

# With password (if needed)
psql "postgresql://shadowcheck_user:password@shadowcheck_postgres/shadowcheck_db"
```

### 4. Using Environment Variables

```bash
# Set environment variables
export PGHOST=shadowcheck_postgres
export PGPORT=5432
export PGDATABASE=shadowcheck_db
export PGUSER=shadowcheck_admin
export PGPASSWORD=$DB_PASS

# Then simply use psql
psql
```

---

## Common Tasks

### View Table Structure

```bash
# List all tables in app schema
\dt app.*

# Describe specific table
\d+ app.networks

# List all columns and types
\d app.networks

# Show indexes on a table
\di app.idx_*
```

### Run Queries

```bash
# From command line
docker exec -e PGPASSWORD=$DB_PASS shadowcheck_postgres psql \
  -U shadowcheck_admin \
  -d shadowcheck_db \
  -c "SELECT COUNT(*) FROM app.networks;"

# Multiple statements with ON_ERROR_STOP
docker exec -e PGPASSWORD=$DB_PASS shadowcheck_postgres psql \
  -U shadowcheck_admin \
  -d shadowcheck_db \
  -v ON_ERROR_STOP=1 \
  -c "
    SELECT COUNT(*) as network_count FROM app.networks;
    SELECT COUNT(*) as observation_count FROM app.observations;
  "
```

### Execute SQL File

```bash
# From local file
docker exec -i -e PGPASSWORD=$DB_PASS shadowcheck_postgres psql \
  -U shadowcheck_admin \
  -d shadowcheck_db \
  < /path/to/query.sql

# From EC2 via SSM
cat /tmp/myquery.sql | docker exec -i -e PGPASSWORD=$DB_PASS shadowcheck_postgres psql \
  -U shadowcheck_admin \
  -d shadowcheck_db
```

### Export Data

```bash
# Export to CSV
docker exec -e PGPASSWORD=$DB_PASS shadowcheck_postgres psql \
  -U shadowcheck_admin \
  -d shadowcheck_db \
  -c "\copy (SELECT * FROM app.networks LIMIT 100) TO STDOUT WITH CSV HEADER" \
  > networks_export.csv

# Export to JSON
docker exec -e PGPASSWORD=$DB_PASS shadowcheck_postgres psql \
  -U shadowcheck_admin \
  -d shadowcheck_db \
  -c "SELECT jsonb_pretty(jsonb_agg(row_to_json(t))) FROM app.networks LIMIT 100;" \
  > networks_export.json
```

---

## Security Model

### Password Storage

- Passwords are **NEVER hardcoded** in files or environment files
- Passwords are stored in **AWS Secrets Manager only**
- At runtime, passwords are fetched from Secrets Manager and held in memory
- **Never write passwords to disk** — this is a security breach

### Access Control

- `shadowcheck_user` has SELECT-only permissions (used by application)
- `shadowcheck_admin` has all permissions (used for admin operations)
- All DDL operations require explicit approval before execution
- All queries must use parameterized statements (no string concatenation)

### Network Security

- Database runs in Docker container on private network
- No direct TCP access from outside (port 5432 not exposed)
- Local development: Access via `docker exec` only
- Production: Access via SSM Session Manager to EC2 container

---

## Troubleshooting

### "connection refused"

**Problem**: Cannot connect to the database

**Solutions**:

```bash
# Check if container is running
docker ps | grep shadowcheck_postgres

# If not running, start it
docker compose up -d

# Check container logs
docker logs shadowcheck_postgres

# Verify network
docker network ls | grep shadowcheck
```

### "FATAL: password authentication failed"

**Problem**: Wrong password or authentication issue

**Solutions**:

```bash
# Verify you're using the correct role
docker exec -it shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db

# Check if password is set correctly (production)
aws secretsmanager get-secret-value --secret-id shadowcheck/config --region us-east-1

# Verify environment variable is set (if using PGPASSWORD)
echo $PGPASSWORD
```

### "ON_ERROR_STOP not recognized"

**Problem**: psql flags not being recognized

**Solutions**:

```bash
# Use lowercase flag
psql -v ON_ERROR_STOP=1

# Or use uppercase
psql -v on_error_stop=1
```

### No response from psql command

**Problem**: Command hangs or times out

**Solutions**:

```bash
# Check if there's a long-running query
docker exec shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db -c "SELECT pid, query, state FROM pg_stat_activity WHERE state != 'idle';"

# Increase timeout (set statement_timeout in milliseconds)
docker exec shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db -c "SET statement_timeout = 120000; <your query>"
```

---

## Key Constraints

### Local Development

- ✅ Use `docker exec` for all database access
- ✅ PostgreSQL runs in Docker container only
- ❌ Never use local system PostgreSQL (`/usr/bin/psql` or `brew install postgresql`)
- ❌ Never expose port 5432 directly
- ✅ Run `docker compose up -d` to start fresh

### Production (EC2)

- ✅ Connect via SSM Session Manager first
- ✅ Fetch passwords from AWS Secrets Manager
- ✅ Use `docker exec -e PGPASSWORD=...` to pass credentials
- ❌ Never write passwords to shell history or scripts
- ❌ Never SSH directly to EC2 (port 22 is closed)

### Query Execution

- ✅ Use parameterized queries (`:param` syntax or prepared statements)
- ✅ Run with `-v ON_ERROR_STOP=1` for critical operations
- ✅ Always verify DDL changes before execution
- ❌ Never use string concatenation for SQL
- ❌ Never commit queries that modify production data without approval

---

## Related Documentation

- `docs/SSM_ACCESS.md` — How to connect to EC2 via SSM
- `CLAUDE.md` — Full database guidelines
- `docs/SECURITY_POLICY.md` — Security rules and constraints
- `sql/migrations/README.md` — Migration tracking and status
- `docs/schema/` — Table definitions and relationships
