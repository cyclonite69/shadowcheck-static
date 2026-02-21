# Security Policy

**Wiki version (diagrams):** [Security](../.github/wiki/Security.md)

See [SECRETS.md](SECRETS.md) for the authoritative secrets guide.

## Reporting Security Vulnerabilities

If you discover a security vulnerability in ShadowCheck-Static, please report it privately:

1. **DO NOT** open a public GitHub issue
2. Email: [Your security contact email]
3. Include detailed steps to reproduce
4. Allow reasonable time for a fix before public disclosure

## Secure Development Practices

This project follows strict security guidelines:

### No Secrets in Code

- ✅ All credentials stored in AWS Secrets Manager
- ✅ No secrets written to disk
- ✅ API keys never committed to version control
- ✅ Database passwords retrieved at runtime from AWS SM

### Security Features

- AES-256-GCM encryption for credential storage
- Machine-specific encryption keys
- **Role-Based Access Control (RBAC)**: Admin-only gating for sensitive operations
- **Database Least Privilege**: Restricted `shadowcheck_user` (read-only) vs `shadowcheck_admin` (write access)
- Rate limiting (1000 req/15min per IP)
- CORS origin restrictions
- Input validation on all endpoints
- SQL injection protection via parameterized queries

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Known Security Considerations

1. **Secrets Management**: AWS Secrets Manager
   - Access controlled via IAM policies/roles
   - No local secret files

2. **Admin Interface**: Protected by role-based authentication
   - Access to `/admin` requires a user with the `admin` role
   - Sensitive backend routes (tagging, imports, backups) are protected by `requireAdmin` middleware

3. **Database**: PostgreSQL with PostGIS
   - **Multi-user security**:
     - `shadowcheck_user`: Used for general app operation. Restricted to read-only access on production tables.
     - `shadowcheck_admin`: Used for administrative tasks (imports, tagging). Requires separate password.
   - Credentials should never be hardcoded
   - Use AWS Secrets Manager (env vars only for explicit local overrides)
   - Enable SSL connections in production

4. **Agency Offices Data Source**:
   - Data is sourced from the FBI public website (FBI.gov).
   - Metadata includes enrichment sources (Smarty, Mapbox, Nominatim, USPS).
   - The dataset contains no PII beyond public contact information for government offices.

## Authentication & Roles

- Session-based authentication using HTTP-only cookies.
- Two primary roles: `user` and `admin`.
- Admin-only routes are gated by middleware (imports, tagging, backups).

## SQL Injection Prevention

- Parameterized queries for all database access.
- Validation middleware for common inputs (BSSID, pagination, coordinates).
- Centralized SQL escaping utilities where dynamic fragments are unavoidable.

## Security Audit History

- **2025-12-04**: Comprehensive security audit completed
  - Fixed XSS vulnerabilities in frontend
  - Removed hardcoded credentials
  - Added CORS restrictions
  - Added request size limiting
