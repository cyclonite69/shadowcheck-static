# PostgreSQL SSL + SCRAM-SHA-256 Configuration

## Overview

ShadowCheck PostgreSQL is configured with:

- **SSL/TLS encryption** for all TCP connections (TLSv1.3)
- **SCRAM-SHA-256** password authentication (stronger than MD5)
- Self-signed certificate for local development
- Production-ready security configuration

## Current Configuration

### Authentication Method

```
SCRAM-SHA-256 (Salted Challenge Response Authentication Mechanism)
```

### SSL/TLS

```
Protocol: TLSv1.3
Cipher: TLS_AES_256_GCM_SHA384
Key Bits: 256
Library: OpenSSL
```

### Connection Security

- **Unix Socket**: No SSL (local only, trusted)
- **TCP (localhost)**: SSL enabled
- **TCP (remote)**: SSL required + SCRAM-SHA-256

## Verification Commands

### Check SSL Connection

```bash
docker exec shadowcheck_postgres psql -h localhost -U shadowcheck_user -d shadowcheck_db -c "\conninfo"
```

Expected output:

```
SSL Connection       | true
SSL Protocol         | TLSv1.3
SSL Cipher           | TLS_AES_256_GCM_SHA384
```

### Check Password Encryption

```bash
docker exec shadowcheck_postgres psql -U shadowcheck_user -d postgres -c \
  "SELECT substring(rolpassword, 1, 14) as hash_type FROM pg_authid WHERE rolname = 'shadowcheck_user';"
```

Expected output:

```
   hash_type
----------------
 SCRAM-SHA-256$
```

### Check pg_hba.conf

```bash
docker exec shadowcheck_postgres cat /var/lib/postgresql/18/docker/pg_hba.conf | grep -v "^#" | grep -v "^$"
```

Expected output:

```
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
host    all             all             0.0.0.0/0               scram-sha-256
```

## Setup Script

Run the automated setup script:

```bash
./scripts/enable-postgres-ssl.sh
```

This script:

1. Generates self-signed SSL certificate
2. Enables SSL in postgresql.conf
3. Re-encrypts passwords with SCRAM-SHA-256
4. Restarts PostgreSQL
5. Verifies SSL connection

## Manual Configuration

### 1. Generate SSL Certificate

```bash
docker exec shadowcheck_postgres bash -c "
  cd /var/lib/postgresql/18/docker
  openssl req -new -x509 -days 365 -nodes -text \
    -out server.crt \
    -keyout server.key \
    -subj '/CN=shadowcheck-postgres'
  chmod 600 server.key
  chown postgres:postgres server.key server.crt
"
```

### 2. Enable SSL in postgresql.conf

```bash
docker exec shadowcheck_postgres bash -c \
  "echo 'ssl = on' >> /var/lib/postgresql/18/docker/postgresql.conf"
```

### 3. Configure pg_hba.conf

```bash
# Remote connections require SCRAM-SHA-256
host all all 0.0.0.0/0 scram-sha-256
```

### 4. Re-encrypt Passwords

```bash
# Get password from keyring
PASSWORD=$(node -e "require('./dist/server/server/src/services/keyringService').default.getCredential('db_password').then(p => console.log(p))")

# Re-encrypt with SCRAM-SHA-256
docker exec shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db -c \
  "ALTER USER shadowcheck_user WITH PASSWORD '$PASSWORD';"
```

### 5. Restart PostgreSQL

```bash
docker restart shadowcheck_postgres
```

## Application Configuration

### Enable SSL in Application

Add to `.env`:

```bash
DB_SSL=true
```

Restart API:

```bash
docker-compose restart api
```

### Connection String Format

**Local (Unix Socket)**:

```
postgresql://shadowcheck_user@/shadowcheck_db
```

**Local (TCP with SSL)**:

```
postgresql://shadowcheck_user:password@localhost:5432/shadowcheck_db?sslmode=require
```

**Remote (SSL Required)**:

```
postgresql://shadowcheck_user:password@host:5432/shadowcheck_db?sslmode=require
```

## Production Deployment

### AWS/Remote Server

1. **Use CA-signed certificate** instead of self-signed:

```bash
# Copy your CA-signed certificate
docker cp server.crt shadowcheck_postgres:/var/lib/postgresql/18/docker/
docker cp server.key shadowcheck_postgres:/var/lib/postgresql/18/docker/
docker exec shadowcheck_postgres chown postgres:postgres /var/lib/postgresql/18/docker/server.{crt,key}
docker exec shadowcheck_postgres chmod 600 /var/lib/postgresql/18/docker/server.key
```

2. **Enforce SSL for all connections**:

```bash
# Edit pg_hba.conf to require SSL
hostssl all all 0.0.0.0/0 scram-sha-256
```

3. **Update application config**:

```bash
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true  # Verify certificate
```

### Certificate Renewal

Self-signed certificates expire after 365 days. Renew with:

```bash
./scripts/enable-postgres-ssl.sh
```

For production, use Let's Encrypt or your organization's CA.

## Security Benefits

### SCRAM-SHA-256 vs MD5

- **Salted hashing**: Prevents rainbow table attacks
- **Challenge-response**: Password never sent over network
- **Iteration count**: Slows brute-force attacks
- **FIPS 140-2 compliant**: Meets federal security standards

### SSL/TLS Encryption

- **Data in transit**: All queries/results encrypted
- **Man-in-the-middle protection**: Certificate verification
- **Forward secrecy**: TLS 1.3 with ephemeral keys
- **Compliance**: Required for PCI-DSS, HIPAA, SOC 2

## Troubleshooting

### SSL Connection Fails

```bash
# Check if SSL is enabled
docker exec shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db -c "SHOW ssl;"

# Check certificate permissions
docker exec shadowcheck_postgres ls -la /var/lib/postgresql/18/docker/server.{crt,key}

# Check logs
docker logs shadowcheck_postgres 2>&1 | grep -i ssl
```

### SCRAM Authentication Fails

```bash
# Verify password encryption method
docker exec shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db -c "SHOW password_encryption;"

# Re-encrypt password
./scripts/rotate-db-password.sh
```

### Application Can't Connect

```bash
# Test connection from API container
docker exec shadowcheck_static_api psql -h shadowcheck_postgres -U shadowcheck_user -d shadowcheck_db -c "SELECT 1;"

# Check environment variables
docker exec shadowcheck_static_api env | grep DB_
```

## References

- [PostgreSQL SSL Documentation](https://www.postgresql.org/docs/current/ssl-tcp.html)
- [SCRAM Authentication](https://www.postgresql.org/docs/current/sasl-authentication.html)
- [pg_hba.conf Configuration](https://www.postgresql.org/docs/current/auth-pg-hba-conf.html)
