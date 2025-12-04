# Secrets and Credentials Audit

This document identifies all hardcoded secrets, credentials, and sensitive information in the codebase and provides remediation steps.

## Audit Date: 2025-12-02

## Summary

**Status:** ⚠️ **ISSUES FOUND**

- **Critical Issues:** 2 (hardcoded passwords in test files)
- **Medium Issues:** 1 (.env file contains real credentials)
- **Low Issues:** 0

## Findings

### 1. Hardcoded Database Passwords in Test Files (CRITICAL)

**Location:**
- `tests/test-dns.js:password`
- `tests/test-minimal.js:password`

**Issue:**
Test files contain hardcoded database passwords:
```javascript
password: 'DJvHRxGZ2e+rDgkO4LWXZG1np80rU4daQNQpQ3PwvZ8='
```

**Risk:**
- Passwords committed to version control
- Accessible in git history
- May be actual production credentials

**Remediation:**
1. **Immediate:** Change all passwords that match this value
2. **Code Fix:** Update test files to use environment variables

```javascript
// tests/test-minimal.js - BEFORE
const pool = new Pool({
  password: 'DJvHRxGZ2e+rDgkO4LWXZG1np80rU4daQNQpQ3PwvZ8=',
});

// tests/test-minimal.js - AFTER
const pool = new Pool({
  password: process.env.DB_PASSWORD_TEST || 'test_password',
});
```

3. **Git History:** Consider using BFG Repo-Cleaner or git-filter-repo to remove from history:
```bash
# Install BFG
brew install bfg  # macOS
# Or download from: https://rtyley.github.io/bfg-repo-cleaner/

# Remove sensitive data
bfg --replace-text passwords.txt

# Force push (coordinate with team!)
git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

---

### 2. Real Credentials in .env File (MEDIUM)

**Location:**
- `.env`

**Issue:**
The `.env` file contains actual database credentials:
```env
DB_PASSWORD=PjUKZCNXUaRd9HCLjv@yj0wSSvU9hoDO
```

**Current Status:**
✅ File is in `.gitignore` and not committed to repository
❌ File exists on disk and could be accidentally committed

**Remediation:**
1. **Use System Keyring** (Recommended for development):
```bash
npm install keytar

# Store password in system keyring
node -e "require('keytar').setPassword('shadowcheck', 'postgres_password', 'your-password')"
```

Update `server.js` to retrieve from keyring:
```javascript
const keytar = require('keytar');

async function getDbPassword() {
  try {
    const password = await keytar.getPassword('shadowcheck', 'postgres_password');
    return password || process.env.DB_PASSWORD;
  } catch (err) {
    console.warn('Keyring unavailable, falling back to env var');
    return process.env.DB_PASSWORD;
  }
}
```

2. **Use .env.local** for local overrides (never commit):
Add to `.gitignore`:
```
.env.local
.env.*.local
```

3. **Production:** Use cloud secrets manager:
   - AWS: AWS Secrets Manager
   - GCP: Secret Manager
   - Azure: Key Vault
   - DigitalOcean: Encrypted environment variables

---

### 3. Mapbox Token Management (LOW)

**Location:**
- Frontend HTML files reference Mapbox token
- Token should be served via API endpoint

**Current Status:**
✅ Token is in environment variable
❌ Token may be exposed in frontend source

**Remediation:**
Create API endpoint to serve frontend config:
```javascript
// server.js
app.get('/api/config', (req, res) => {
  res.json({
    mapboxToken: process.env.MAPBOX_TOKEN || '',
    environment: process.env.NODE_ENV,
  });
});
```

Update frontend to fetch token:
```javascript
// public/js/common.js
async function getConfig() {
  const response = await fetch('/api/config');
  return response.json();
}

// Usage
const config = await getConfig();
mapboxgl.accessToken = config.mapboxToken;
```

---

## Secrets Checklist

### Files That Should NEVER Be Committed

- [ ] `.env` (contains actual credentials)
- [ ] `.env.local`, `.env.*.local` (local overrides)
- [ ] `.pgpass` (PostgreSQL password file)
- [ ] `pgadmin-servers.json` (contains server passwords)
- [ ] `*.key`, `*.pem` (private keys)
- [ ] `credentials.json` (service account keys)
- [ ] `*.backup`, `*.dump` (database backups may contain sensitive data)

### Current .gitignore Status

✅ `.env` is ignored
✅ `.pgpass` is ignored
✅ `pgadmin-servers.json` is ignored
❌ Missing: `.env.local`, `.env.*.local`
❌ Missing: `credentials.json`
✅ `*.backup` and `*.dump` patterns should be added

**Update .gitignore:**
```gitignore
# Environment files
.env
.env.local
.env.*.local

# Credentials
.pgpass
pgadmin-servers.json
credentials.json
*.key
*.pem
*.p12
*.pfx

# Database files
*.sql.gz
*.backup
*.dump
backup-*.sqlite
```

---

## Best Practices for Secrets Management

### Development

1. **Use System Keyring** (keytar for Node.js)
   - Passwords stored in OS-level secure storage
   - Never in plaintext files

2. **Use .env.example Template**
   - Contains variable names only (no values)
   - Developers copy to `.env` and fill in their own values

3. **Never Commit Secrets**
   - Pre-commit hooks to detect secrets
   - Tools: detect-secrets, truffleHog, git-secrets

### Staging/Production

1. **Cloud Secrets Manager**
   - AWS Secrets Manager
   - GCP Secret Manager
   - Azure Key Vault
   - HashiCorp Vault

2. **Environment Variables** (for non-sensitive config)
   - Injected by deployment platform
   - Never hardcoded in Dockerfile

3. **Encrypted Configuration**
   - Tools: sops, git-crypt
   - Decrypt at runtime

### General Rules

1. **Rotate Credentials Regularly**
   - Database passwords: quarterly
   - API keys: annually
   - Service account keys: annually

2. **Use Least Privilege**
   - Read-only database users for analytics
   - Separate credentials for dev/staging/prod

3. **Audit Access**
   - Log all secret retrievals
   - Alert on suspicious access patterns

4. **Monitor for Leaks**
   - GitHub Advanced Security
   - GitGuardian
   - Regular git history scans

---

## Immediate Action Items

### Priority 1 (Do Now)

1. **Change Database Password** (if `DJvHRxGZ2e+rDgkO4LWXZG1np80rU4daQNQpQ3PwvZ8=` is used in production)
   ```sql
   ALTER USER shadowcheck_user WITH PASSWORD 'new-secure-password';
   ```

2. **Remove Hardcoded Passwords from Test Files**
   ```bash
   # Edit tests/test-dns.js
   # Edit tests/test-minimal.js
   # Replace hardcoded passwords with process.env.DB_PASSWORD_TEST
   ```

3. **Update .gitignore**
   ```bash
   cat >> .gitignore << EOF
   # Additional secret files
   .env.local
   .env.*.local
   credentials.json
   *.dump
   EOF
   ```

### Priority 2 (This Week)

4. **Install Pre-commit Hooks**
   ```bash
   npm install --save-dev @commitlint/cli @commitlint/config-conventional
   npm install --save-dev husky
   npx husky install
   npx husky add .husky/pre-commit "npm run lint && npm test"
   ```

5. **Scan Git History for Secrets**
   ```bash
   # Install truffleHog
   pip install truffleHog

   # Scan repository
   trufflehog --regex --entropy=True .
   ```

6. **Setup Keyring for Development**
   ```bash
   npm install keytar
   # Update server.js to use keyring
   ```

### Priority 3 (This Month)

7. **Implement Secrets Manager** (for production)
   - Choose cloud provider secrets solution
   - Migrate all production secrets
   - Update deployment scripts

8. **Setup Secret Scanning** (GitHub)
   - Enable GitHub Advanced Security
   - Configure secret scanning alerts
   - Add custom patterns for internal tokens

9. **Documentation**
   - Update CONTRIBUTING.md with secrets policy
   - Update README.md with setup instructions
   - Create runbook for credential rotation

---

## Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Git History Cleanup Tools](https://rtyley.github.io/bfg-repo-cleaner/)
- [Keytar Documentation](https://github.com/atom/node-keytar)

---

**Last Updated:** 2025-12-02
**Next Audit:** 2026-03-02 (quarterly)
