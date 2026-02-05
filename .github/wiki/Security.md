# Security

> **Security best practices and hardening guide for ShadowCheck**

---

## Security Architecture

**Multi-Layered Approach:**

1. **Network Security**: HTTPS/TLS, firewall, rate limiting
2. **Application Security**: CORS, CSP headers, input validation
3. **Data Security**: SQL injection prevention, parameterized queries
4. **Access Control**: RBAC, session-based auth, API keys
5. **Secrets Management**: Keyring/Docker secrets, never in code

---

## Security Headers

```javascript
// Applied by securityHeaders middleware
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

---

## Secrets Management

### Priority Order (highest to lowest):

1. Docker Secrets (`/run/secrets/*`)
2. System Keyring (via `keytar`)
3. Environment Variables (`.env`)

### Required Secrets

- `db_password` - PostgreSQL user password
- `db_admin_password` - PostgreSQL admin password
- `mapbox_token` - Mapbox GL JS token

### Setting Secrets

```bash
# Keyring (development)
node scripts/set-secret.js db_password "your-password"

# Docker secrets (production)
echo "your-password" > secrets/db_password.txt
chmod 600 secrets/db_password.txt
```

### Password Rotation

Rotate database passwords every 60-90 days:

```bash
# Automated rotation (local or AWS)
./scripts/rotate-db-password.sh
```

See `deploy/aws/docs/PASSWORD_ROTATION.md` for detailed procedures.

# Docker Secrets (production)

echo "your-password" > secrets/db_password.txt
chmod 600 secrets/\*

````

---

## SQL Injection Prevention

All database queries use parameterized statements:

```typescript
// ✅ Safe - parameterized query
const result = await query('SELECT * FROM networks WHERE bssid = $1', [bssid]);

// ❌ Unsafe - never do this
const result = await query(`SELECT * FROM networks WHERE bssid = '${bssid}'`);
````

---

## Authentication & Authorization

### Role-Based Access Control (RBAC)

- **Admin Role**: Required for `/admin` page and data-modifying operations
- **User Role**: Standard access to dashboards and mapping

### API Key Authentication

Protected endpoints:

- `GET /api/admin/backup`
- `POST /api/admin/restore`

```bash
curl -H "x-api-key: your-key" http://localhost:3001/api/admin/backup
```

### Rate Limiting

- **Limit**: 1000 requests per 15 minutes per IP
- **Response**: 429 Too Many Requests when exceeded

---

## Security Best Practices

### ✅ DO

- Use system keyring for local development
- Use Docker secrets for production
- Rotate secrets regularly
- Use strong, randomly generated passwords
- Restrict file permissions on secret files (`chmod 600`)
- Use parameterized queries for all database access
- Validate all user input
- Sanitize output (XSS prevention)
- Use HTTPS in production

### ❌ DON'T

- Commit `.env` files to git
- Hardcode secrets in source code
- Store secrets in Docker images
- Share secrets via email or chat
- Use weak or default passwords
- Use string concatenation for SQL queries

---

## Threat Model

**Primary Threat**: Unauthorized data access and manipulation

**Mitigations**:

- Rate limiting (1000 req/15min per IP)
- API key for sensitive endpoints
- CORS origin whitelisting
- SQL injection prevention
- XSS prevention
- Request body size limiting (10MB)

---

## Secrets Validation

Secrets are validated at application startup:

```javascript
// server/src/utils/validateSecrets.js
async function validateSecrets() {
  const required = ['db_password', 'mapbox_token'];

  for (const secret of required) {
    if (!secretsManager.get(secret)) {
      throw new Error(`Required secret '${secret}' not found`);
    }
  }
}
```

---

## Troubleshooting

### Secret Not Found

```
Error: Required secret 'db_password' not found
```

**Solution**:

1. Set via keyring: `node scripts/set-secret.js db_password "password"`
2. Create Docker secret file: `echo "password" > secrets/db_password.txt`

### Keyring Access Denied

```
Error: Access to keyring denied
```

**Linux**: Install libsecret

```bash
sudo apt-get install libsecret-1-dev
```

**macOS**: Keyring uses macOS Keychain automatically

**Windows**: Keyring uses Windows Credential Manager automatically

---

## Related Documentation

- [Secrets Management](https://github.com/cyclonite69/shadowcheck-static/blob/main/docs/security/SECRETS_MANAGEMENT.md) - Detailed secrets guide
- [SQL Injection Prevention](https://github.com/cyclonite69/shadowcheck-static/blob/main/docs/security/SQL_INJECTION_PREVENTION.md) - Database security
- [Architecture](Architecture) - Security architecture overview
- [Development](Development) - Secure development practices
