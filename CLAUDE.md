# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShadowCheck-Static is a simplified wireless network threat detection platform. It's a single-file Express server with a static HTML frontend that analyzes WiFi, Bluetooth, and cellular network observations to detect potential tracking devices based on movement patterns.

## Development Commands

```bash
# Start the server
npm start

# Install dependencies
npm install

# Connect to database (requires Docker container running)
docker exec -it shadowcheck_postgres_18 psql -U shadowcheck_user -d shadowcheck
```

**Server runs on port 3001** (configured in `.env`)

## Architecture

### Single-File Backend
- **server.js**: All API endpoints and business logic in one file
- **CommonJS module system** (not ES modules)
- **Express** for HTTP routing
- **PostgreSQL with PostGIS** for geospatial queries

### Database Schema (PostgreSQL)
Primary tables in `app` schema:
- `networks_legacy`: Network metadata (BSSID, SSID, type, encryption, last seen)
- `locations_legacy`: Observation records (BSSID, lat/lon, signal strength, timestamp)
- `network_tags`: User classification tags (LEGIT, FALSE_POSITIVE, INVESTIGATE, THREAT)
- `location_markers`: Home/work locations for threat analysis
- `wigle_networks_enriched`: WiGLE API enrichment data
- `radio_manufacturers`: OUI-to-manufacturer mapping

### Network Type Codes
- `W`: WiFi
- `E`: BLE (Bluetooth Low Energy)
- `B`: Bluetooth Classic (also mapped to BLE if frequency < 5000 or capabilities contain 'BLE')
- `L`: LTE
- `N`: 5G NR (New Radio)
- `G`: GSM/Cellular (mapped to LTE if capabilities contain 'LTE', otherwise GSM)

### Security/Encryption Classification
The `/api/analytics/security` endpoint classifies WiFi security types by parsing the `capabilities` field:
- `WPA3-E`: WPA3 Enterprise
- `WPA3-P`: WPA3 Personal (SAE/PSK)
- `WPA2-E`: WPA2 Enterprise
- `WPA2-P`: WPA2 Personal (PSK)
- `WPA`: WPA (original, not WPA2/WPA3)
- `WEP`: WEP encryption
- `WPS`: WiFi Protected Setup only
- `OPEN`: No encryption or empty capabilities

### Frontend
- **public/index.html**: Single-page static frontend
- **Tailwind CSS** via CDN
- **Mapbox GL JS** for geospatial visualization
- **Chart.js** for analytics charts
- No build step required

## Threat Detection Algorithm

The core threat scoring algorithm evaluates networks based on:

1. **Seen at home AND away from home**: +40 points (strongest indicator)
2. **Distance range > 200m**: +25 points (beyond WiFi range)
3. **Multiple unique days**: +5 to +15 points (7+ days: 15, 3-6 days: 10, 2 days: 5)
4. **High observation count**: +5 to +10 points (50+ obs: 10, 20-49 obs: 5)
5. **Movement speed** (advanced detection only): +10 to +20 points (>100 km/h: 20, >50 km/h: 15, >20 km/h: 10)

**Threshold**: Networks scoring ≥30 are flagged as potential threats

**Special filtering**: Cellular networks (G, L, N) are excluded unless distance range > 5km

**Two Detection Modes**:
- `/api/threats/quick`: Fast paginated detection (lines 344-494)
- `/api/threats/detect`: Advanced detection with speed calculations (lines 496-679)

## API Endpoints

**Response Format**: Most endpoints return JSON with structure `{ ok: boolean, data/error: any }`. Notable exceptions:
- `/api/dashboard-metrics`: Returns raw metrics object `{ totalNetworks, threatsCount, surveillanceCount, enrichedCount }`
- `/api/networks`: Returns array of network objects directly
- Error responses: `{ error: string, details?: string }` with HTTP 500 status

### Core Endpoints
- `GET /api/dashboard-metrics`: Total networks, threats count, suspicious count, enriched count
- `GET /api/threats/quick?page=1&limit=100`: Paginated threat detection results
- `GET /api/threats/detect`: Advanced threat detection with speed calculations
- `GET /api/networks/observations/:bssid`: All observations for a specific network
- `POST /api/tag-network`: Tag a network (requires `{ bssid, tag_type, confidence, notes }`)

### Analytics Endpoints
- `GET /api/analytics/network-types`: Distribution by network type (WiFi, BLE, BT, LTE, NR, GSM)
- `GET /api/analytics/signal-strength`: Signal strength histogram (grouped by dBm ranges)
- `GET /api/analytics/temporal-activity`: Hourly activity patterns (24-hour distribution)
- `GET /api/analytics/security`: Encryption type distribution (WPA3-E/P, WPA2-E/P, WPA, WEP, WPS, OPEN)
- `GET /api/analytics/radio-type-over-time`: Network type distribution over last 30 days

### Utility Endpoints
- `GET /api/manufacturer/:bssid`: Lookup manufacturer from MAC address
- `GET /api/networks`: List networks with pagination support
  - Query params: `page` (default: 1), `limit` (default: 100, max: 5000), `sort` (default: lastSeen), `order` (ASC/DESC)
  - Returns: `{ networks: [], total: number, page: number, limit: number, totalPages: number }`
- `GET /api/networks/search/:ssid`: Search networks by SSID pattern

## Important Constants

```javascript
MIN_VALID_TIMESTAMP = 946684800000  // Jan 1, 2000 in milliseconds
```

All queries filter timestamps with `WHERE time >= MIN_VALID_TIMESTAMP` to exclude corrupted/invalid data.

## Database Query Patterns

### Transient Error Retry
The `query()` wrapper function (lines 25-42) automatically retries on transient PostgreSQL errors:
- Connection errors: 57P01, 53300, 08006, 08003, 08000
- Network errors: ETIMEDOUT, ECONNRESET
- Retries once with 1-second delay
- Takes parameters: `query(text, params = [], tries = 2)`

### PostGIS Distance Calculations
```sql
ST_Distance(
  ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
  home_point
) / 1000.0  -- Convert meters to kilometers
```

### Common Table Expressions (CTEs)
Most complex queries use CTEs for readability:
1. `home_location`: Get home coordinates from `location_markers`
2. `network_stats` or `network_locations`: Aggregate observations per network
3. `threat_analysis` or `threat_classification`: Calculate threat scores

## Network Tagging System

Tag types map to threat scores:
- `LEGIT`: 0.0
- `FALSE_POSITIVE`: 0.05
- `INVESTIGATE`: 0.7
- `THREAT`: 1.0

**Tagging Schema**:
- Confidence is stored as decimal 0.0-1.0 (API accepts 0-100 and converts)
- Tags are upserted using `ON CONFLICT (bssid, tag_type)` to prevent duplicates
- Tag history is stored as JSONB array for audit trail
- Each tag includes: tag_type, confidence, notes, threat_score, ml_confidence, user_override
- Tagged networks appear with `user_tag`, `userThreatScore`, `userConfidence`, etc. in `/api/threats/quick` responses

## Environment Variables

Required in `.env`:
```
DB_USER=shadowcheck_user
DB_PASSWORD=<password>
DB_HOST=127.0.0.1
DB_NAME=shadowcheck
DB_PORT=5432
PORT=3001
```

## Database Connection

Expects PostgreSQL 18 with PostGIS running in Docker:
```bash
docker exec -it shadowcheck_postgres_18 psql -U shadowcheck_user -d shadowcheck
```

Connection pooling handled by `pg.Pool` with automatic transient error retry.

## Dependencies

The project uses minimal dependencies (see `package.json`):
- `express`: ^4.18.2 - Web server framework
- `pg`: ^8.16.3 - PostgreSQL client with connection pooling
- `dotenv`: ^16.3.1 - Environment variable loader
- `cors`: ^2.8.5 - CORS middleware for cross-origin requests
- `express-rate-limit`: ^8.2.1 - Rate limiting middleware (1000 requests per 15 min per IP)
- `geojson`: ^0.5.0 - GeoJSON utilities
- `wellknown`: ^0.5.0 - WKT/GeoJSON conversion

## Code Style

- CommonJS (`require`, `module.exports`)
- No TypeScript
- No linting/formatting configured
- Single-file architecture (no modularization, except errorHandler utility)
- Inline SQL queries (no query builder or ORM)
- Express v4 (with CORS and rate limiting enabled)

## Testing the API

```bash
# Dashboard metrics
curl http://localhost:3001/api/dashboard-metrics

# Threat detection (first page, quick mode)
curl http://localhost:3001/api/threats/quick?page=1&limit=10

# Advanced threat detection with speed calculations
curl http://localhost:3001/api/threats/detect

# Network observations for specific BSSID
curl http://localhost:3001/api/networks/observations/AA:BB:CC:DD:EE:FF

# Tag a network
curl -X POST http://localhost:3001/api/tag-network \
  -H "Content-Type: application/json" \
  -d '{"bssid":"AA:BB:CC:DD:EE:FF","tag_type":"LEGIT","confidence":95,"notes":"Home router"}'

# Get manufacturer info
curl http://localhost:3001/api/manufacturer/AA:BB:CC:DD:EE:FF

# Search networks by SSID
curl http://localhost:3001/api/networks/search/MyNetwork

# Analytics endpoints
curl http://localhost:3001/api/analytics/network-types
curl http://localhost:3001/api/analytics/signal-strength
curl http://localhost:3001/api/analytics/temporal-activity
curl http://localhost:3001/api/analytics/security
curl http://localhost:3001/api/analytics/radio-type-over-time
```

## SQL Migration Files

The repository includes SQL migration files for database schema updates:
- `create_scoring_function.sql`: Threat scoring as a database function
- `migrate_network_tags.sql`: Network tagging schema migration
- `migrate_network_tags_v2.sql`: Updated tagging schema
- `fix_kismet_functions.sql`: Kismet-related function fixes

Apply migrations manually:
```bash
docker exec -i shadowcheck_postgres_18 psql -U shadowcheck_user -d shadowcheck < migrate_network_tags_v2.sql
```

Note: Migration files are separate from the main server.js logic and must be applied to the database independently.

## Frontend Integration

The HTML frontend fetches data from API endpoints and renders:
- Dashboard metrics cards
- Interactive Mapbox map with network markers
- Chart.js visualizations (signal strength, network types, temporal activity)
- Threat detection table with tagging interface

Frontend files:
- `public/index.html` - Main dashboard (deprecated/legacy)
- `public/geospatial.html` - Geospatial network visualization with threat severity levels
- `public/analytics.html` - Analytics dashboards and charts
- `public/networks.html` - Network list with advanced filtering
- `public/surveillance.html` - Surveillance-focused threat analysis

**Dynamic API URLs**: Frontend uses `window.location` to construct API base URL, supporting deployment flexibility.

## Security Features

**Rate Limiting**: API endpoints are protected with rate limiting (1000 requests per 15 minutes per IP)
- Applied to all `/api/*` routes
- Configurable via `express-rate-limit` middleware
- Returns 429 status when limit exceeded

**CORS**: Cross-Origin Resource Sharing enabled for all routes via `cors` middleware

**Input Validation**:
- SQL injection protection via parameterized queries throughout
- BSSID/Tower ID validation: Accepts MAC addresses or alphanumeric tower identifiers
- Pagination validation: Page must be positive integer, limit must be 1-5000
- Threat severity validation: `minSeverity` must be 0-100
- Tag type validation: Must be one of LEGIT, FALSE_POSITIVE, INVESTIGATE, THREAT
- Confidence validation: Must be 0-100 (converted to 0.0-1.0 internally)

**Transient Error Handling**: Automatic retry logic for database connection issues

## Threat Severity Classification

Networks are classified by severity based on threat score:
- **Critical** (80+): Red styling, highest priority
- **High** (70-79): Orange styling, immediate investigation
- **Medium** (50-69): Yellow styling, monitor closely
- **Low** (30-49): Blue styling, potential concern

Severity levels are used in:
- `geospatial.html` threat panel with color-coded rows
- Threat filtering dropdowns
- Visual indicators on map markers

## Troubleshooting

**Database Connection Errors:**
- Verify PostgreSQL container is running: `docker ps | grep shadowcheck`
- Test database connection: `docker exec -it shadowcheck_postgres_18 psql -U shadowcheck_user -d shadowcheck`
- Check environment variables in `.env` match container configuration
- Review transient error retry logic in `query()` function (lines 25-42)

**Empty or Missing Data:**
- All queries filter by `MIN_VALID_TIMESTAMP` (Jan 1, 2000) to exclude corrupted timestamps
- Check that `location_markers` table has a 'home' marker for threat detection to work
- Verify `app` schema exists and contains required tables

**API Returns 500 Errors:**
- Check server logs for specific error messages
- Verify database schema matches expected structure
- Ensure PostGIS extension is enabled in PostgreSQL

**Threat Detection Returns No Results:**
- Verify home location is set in `location_markers` table
- Check that networks have at least 2 observations (`HAVING COUNT >= 2`)
- Confirm observations have valid lat/lon coordinates (`WHERE lat IS NOT NULL AND lon IS NOT NULL`)
- Threat score threshold is 30 - networks below this won't appear

## Recent Changes & Improvements

**Latest Updates (November 2024)**:
- Added CORS support for cross-origin API requests
- Implemented rate limiting (1000 req/15min per IP) for API protection
- Changed default port from 5001 to 3001
- Added pagination to `/api/networks` endpoint (page, limit, sort, order params)
- Implemented threat severity classification (Critical/High/Medium/Low)
- Added severity-based filtering to geospatial threat panel
- Fixed security type parsing with debug logging
- Updated all frontend files to use dynamic API base URLs
- Added capabilities field to network responses
- Fixed timestamp formatting for network lists
- Improved geospatial page with full network grid layout
- Enhanced search and filter controls across frontend pages
- Removed artificial limits on infinite scroll lists for better UX

**Bug Fixes**:
- Fixed SQL injection vulnerabilities via parameterized queries
- Addressed XSS risks in frontend rendering
- Improved error handling with transient retry logic
- Fixed network type classification for BLE/Bluetooth/Cellular

## Bug Fixes (2025-11-23)

**Critical Bugs Fixed (11 total)**:

### Round 1 - Stability & Security Fixes
1. **Dashboard Metrics Crash Risk** (`server.js:191-199`)
   - Added defensive `rows.length > 0` checks before accessing `rows[0]`
   - Prevents application crash when database returns empty result sets
   - Affected: `/api/dashboard-metrics` endpoint

2. **Hardcoded Mapbox Token** (`public/geospatial.html:1727`)
   - Documented security risk with TODO comments
   - Token should be moved to environment variable and served via API endpoint
   - Current: Hardcoded in frontend (temporary solution)

3. **Missing BSSID Validation** (`server.js:667-669`)
   - Added validation for BSSID/tower identifier in `/api/observations/check-duplicates/:bssid`
   - Prevents SQL errors from malformed input
   - Accepts both MAC addresses and cellular tower identifiers

4. **Threat Severity Filtering Logic Bug** (`server.js:478-481`)
   - Removed duplicate hardcoded threshold that conflicted with user's `minSeverity` parameter
   - Now correctly respects user-provided `minSeverity` or defaults to 40
   - Fixed `/api/threats/quick` endpoint

5. **Debug Logging in Production** (`server.js:1628-1632`)
   - Removed console.log statements from `/api/networks` endpoint
   - Eliminates log pollution and improves performance

6. **Defensive NULL Checks** (`server.js:752-753`)
   - Added safety checks in `/api/admin/cleanup-duplicates` endpoint
   - Prevents crashes when COUNT queries return empty results

### Round 2 - Performance & Validation Fixes
7. **10k Limit Performance Issue** (`public/surveillance.html:533`)
   - Reduced from `limit=10000` to `limit=1000`
   - Prevents browser memory issues and slow page loads
   - Mitigates potential DoS vector

8. **Server Startup Error Handling** (`server.js:1733`)
   - Added `process.exit(1)` on startup failure
   - Ensures server doesn't run in broken state
   - Proper error signaling for process managers

9. **BSSID Validation for Cellular Towers** (`server.js:1241, 1361, 1391`)
   - Relaxed strict MAC regex validation to accept cellular tower IDs
   - Affected endpoints: `/api/tag-network`, `/api/tag-network/:bssid`, `/api/manufacturer/:bssid`
   - Now accepts both MAC addresses (AA:BB:CC:DD:EE:FF) and alphanumeric tower identifiers

10. **Max Limit Validation** (`server.js:440, 1431`)
    - Added max limit of 5000 to prevent memory exhaustion and DoS
    - Affected endpoints: `/api/threats/quick`, `/api/networks`
    - Returns 400 error for `limit > 5000`

11. **Frontend Error Handling** (`public/geospatial.html:2038-2050`)
    - Added `.catch()` handlers to prevent unhandled promise rejections
    - Graceful degradation when API calls fail
    - Continues to function with partial data

### Updated Validation Rules

**BSSID/Tower ID Validation**:
- **Old**: Strict MAC regex `^[0-9A-F]{2}(:[0-9A-F]{2}){5}$`
- **New**: Accepts any non-empty string (MAC or tower ID)
- **Reason**: Cellular towers (G, L, N types) use numeric identifiers, not MAC addresses

**Pagination Limits**:
- **Page**: Must be positive integer
- **Limit**: Must be between 1 and 5000
- **Default**: 100 networks per page
- **Affected endpoints**: `/api/threats/quick`, `/api/networks`, `/api/networks/tagged`

**Threat Score Filtering**:
- **Default threshold**: 40 points
- **User override**: `minSeverity` parameter (0-100)
- **Previous bug**: Hardcoded 40 + user parameter (both applied incorrectly)
- **Fixed**: Single threshold using `minSeverity` or default

### Testing Recommendations

After deploying bug fixes:
```bash
# Test max limit validation
curl "http://localhost:3001/api/threats/quick?page=1&limit=10000"
# Expected: 400 error - "Invalid limit parameter. Must be between 1 and 5000."

# Test cellular tower tagging
curl -X POST http://localhost:3001/api/tag-network \
  -H "Content-Type: application/json" \
  -d '{"bssid":"310410123456789","tag_type":"LEGIT","confidence":90}'
# Expected: 200 success (accepts non-MAC identifiers)

# Test threat severity filtering
curl "http://localhost:3001/api/threats/quick?page=1&limit=10&minSeverity=30"
# Expected: Returns threats with score >= 30 (not hardcoded 40)

# Test ML training (with API key if configured)
curl -X POST http://localhost:3001/api/ml/train \
  -H "x-api-key: your-key-here"
# Expected: 200 success with model coefficients (or 401 if key wrong)

# Test server startup failure
# Stop database and start server - should exit with code 1
docker stop shadowcheck_postgres_18
npm start
# Expected: Server logs error and exits immediately
```

## Quick Reference

**Key Database Tables:**
- `app.networks_legacy` - Network metadata (BSSID, SSID, type, encryption)
- `app.locations_legacy` - Observation records (coordinates, signal, timestamp)
- `app.network_tags` - User tagging and ML classification
- `app.location_markers` - Home/work locations
- `app.wigle_networks_enriched` - WiGLE enrichment data
- `app.radio_manufacturers` - MAC OUI lookup

**Key Functions in server.js:**
- `query(text, params, tries)` - Database wrapper with retry (lines 25-42)
- Dashboard metrics calculation (lines 70-151)
- Quick threat detection with pagination (lines 344-494)
- Advanced threat detection with speed (lines 496-679)
- Network observation retrieval (lines 682-738)
- Network tagging endpoint (lines 740-815)

**Configuration:**
- Port: 3001 (set in `.env` PORT variable, defaults to 3001 in server.js)
- Database: PostgreSQL 18 with PostGIS
- Schema: `app`
- Timestamp filter: >= 946684800000 (Jan 1, 2000)
- Threat threshold: 40 points (default, configurable via `minSeverity`)
- Min observations for threat: 2
- Rate limit: 1000 requests per 15 minutes per IP
- Pagination limits:
  - Default: 100 networks per page
  - Maximum: 5000 networks per page
  - Minimum: 1 network per page
- BSSID validation: Accepts MAC addresses (AA:BB:CC:DD:EE:FF) or cellular tower identifiers (alphanumeric)
- API Authentication: Optional API key via `x-api-key` header (if API_KEY set in .env)

**ML Endpoints:**
- `POST /api/ml/train` - Train logistic regression model on tagged networks (requires 10+ tagged, auth required)
- `GET /api/ml/status` - Get model training status and tagged network counts
- `GET /api/ml/predict/:bssid` - Get ML prediction for specific network

**Protected Endpoints (require x-api-key header if API_KEY configured):**
- `POST /api/tag-network` - Tag a network
- `DELETE /api/tag-network/:bssid` - Remove network tag
- `POST /api/ml/train` - Train ML model

## Security Audit & Known Issues (2025-11-23)

### Critical Security Vulnerabilities (FIXED)

#### 1. XSS Vulnerabilities in Frontend (HIGH SEVERITY)
**Location**: `public/surveillance.html:808-815`, `public/geospatial.html`, `public/networks.html`
**Issue**: User-controlled data (SSID, BSSID) injected via `innerHTML` without sanitization
**Risk**: Malicious SSIDs like `<script>alert('XSS')</script>` could execute arbitrary JavaScript
**Fix**: Use `textContent` for user data or implement HTML entity encoding
**Status**: FIXED - Added `escapeHtml()` utility function and replaced `innerHTML` with safe DOM methods

#### 2. API Key in Query Parameters (MEDIUM SEVERITY)
**Location**: `server.js:76`
**Issue**: `requireAuth()` accepts API key via `req.query.key`, exposing it in logs/history
**Risk**: API keys logged in server access logs, browser history, referrer headers
**Fix**: Only accept API key via `x-api-key` header
**Status**: FIXED - Removed query parameter support

#### 3. Unrestricted CORS (MEDIUM SEVERITY)
**Location**: `server.js:51`
**Issue**: CORS enabled for all origins without restrictions
**Risk**: Any website can make authenticated requests to your API
**Fix**: Restrict CORS to specific origins or implement origin validation
**Status**: FIXED - Added origin whitelist configuration

#### 4. Weak CSP Policy (LOW-MEDIUM SEVERITY)
**Location**: `server.js:36-43`
**Issue**: CSP allows `'unsafe-inline'` and `'unsafe-eval'` for scripts
**Risk**: Weakens XSS protection significantly
**Fix**: Remove unsafe directives, use nonces or hashes for inline scripts
**Status**: DOCUMENTED - Requires frontend refactoring to remove inline scripts

### Performance & Resource Management Issues (FIXED)

#### 5. Missing Database Connection Pool Limits (MEDIUM SEVERITY)
**Location**: `server.js:96-102`
**Issue**: No `max`, `idleTimeoutMillis`, or `connectionTimeoutMillis` configured
**Risk**: Connection exhaustion under high load, memory leaks
**Fix**: Add proper pool configuration
**Status**: FIXED - Added connection pool limits (max: 20, idle timeout: 30s, connection timeout: 2s)

#### 6. No Request Body Size Limiting (HIGH SEVERITY - DoS Risk)
**Location**: `server.js:143`
**Issue**: `express.json()` has no size limit
**Risk**: DoS via large JSON payloads, memory exhaustion
**Fix**: Add `limit` parameter to body parser
**Status**: FIXED - Added 10MB limit to prevent DoS

#### 7. Expensive Cartesian Product Query (HIGH SEVERITY - Performance)
**Location**: `server.js:1107-1108`
**Issue**: LEFT JOIN creates O(n²) complexity for distance calculations
**Risk**: Extreme slowness for networks with many observations (e.g., 1000 obs = 1M comparisons)
**Fix**: Use window functions or aggregate distances differently
**Status**: DOCUMENTED - Requires query refactoring, disabled endpoint for now

#### 8. Array Overflow Risk (MEDIUM SEVERITY)
**Location**: `server.js:1077-1079`
**Issue**: `ARRAY_AGG(...LIMIT 1000)` can still cause memory issues
**Risk**: Large arrays in database results consume excessive memory
**Fix**: Reduce limit or paginate results
**Status**: FIXED - Reduced to 500 and added memory monitoring

### Logic Errors & Validation Issues (FIXED)

#### 9. Type Checking After parseInt (LOW SEVERITY)
**Location**: `server.js:1528-1533`
**Issue**: `typeof minSignal !== 'number'` after `parseInt()` always passes (parseInt returns number or NaN)
**Risk**: Logic error doesn't catch invalid inputs properly
**Fix**: Check for `isNaN()` instead
**Status**: FIXED - Corrected validation logic

#### 10. Duplicate MIN_VALID_TIMESTAMP (LOW SEVERITY)
**Location**: `server.js:67, 105`
**Issue**: Constant defined twice (in CONFIG object and as standalone)
**Risk**: Confusion, potential inconsistency if only one is updated
**Fix**: Use single source of truth
**Status**: FIXED - Removed duplicate, use CONFIG.MIN_VALID_TIMESTAMP

#### 11. Hardcoded SQL Constant (LOW SEVERITY)
**Location**: `server.js:856`
**Issue**: `${MIN_VALID_TIMESTAMP}` hardcoded in SQL string instead of parameterized
**Risk**: Inconsistent with parameterized query pattern (not a security risk as it's a constant)
**Fix**: Use parameterized query
**Status**: FIXED - Replaced with $1 parameter

#### 12. Database Connection Test Doesn't Stop Server (MEDIUM SEVERITY)
**Location**: `server.js:129-140`
**Issue**: Connection test logs error but server continues starting
**Risk**: Server runs in broken state without database
**Fix**: Exit process on connection failure
**Status**: FIXED - Added `process.exit(1)` on connection failure

#### 13. ML Model Require Without Error Handling (MEDIUM SEVERITY)
**Location**: `server.js:922`
**Issue**: `require('./ml-trainer')` fails silently if file missing
**Risk**: Server crashes on startup if ml-trainer.js is missing
**Fix**: Wrap in try-catch or check file existence
**Status**: FIXED - Added try-catch with graceful degradation

### Best Practice Improvements (FIXED)

#### 14. Missing HTTPS Enforcement Configuration (LOW SEVERITY)
**Location**: `server.js:18-25`
**Issue**: HTTPS redirect relies on `x-forwarded-proto` which can be spoofed
**Risk**: If not behind trusted proxy, header can be forged
**Fix**: Document trusted proxy requirement or add validation
**Status**: DOCUMENTED - Added security note about trusted proxy requirement

#### 15. Error Handler Exposes Stack Traces (LOW SEVERITY)
**Location**: `utils/errorHandler.js:3`
**Issue**: `console.error(err)` may expose stack traces in production
**Risk**: Information disclosure
**Fix**: Conditionally log based on NODE_ENV
**Status**: FIXED - Added NODE_ENV check for detailed logging

### Performance Optimizations Applied

- **Database Query Optimization**: Added indexes recommendation for frequently queried columns
- **Response Compression**: Already enabled via `compression` middleware
- **Static File Caching**: Already configured with `maxAge: '1h'`
- **Rate Limiting**: Already implemented (1000 req/15min per IP)
- **Connection Pooling**: Now properly configured with limits

### Security Hardening Checklist

- [x] XSS prevention via HTML escaping
- [x] API key only via headers
- [x] CORS origin restrictions
- [x] Request size limiting
- [x] Database connection pool limits
- [x] Input validation improvements
- [x] Error handling improvements
- [ ] CSP policy hardening (requires frontend refactoring)
- [ ] Rate limiting per endpoint (currently global)
- [ ] SQL query optimization for expensive operations
