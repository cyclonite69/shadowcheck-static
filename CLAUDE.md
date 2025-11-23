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

**Server runs on port 3002** (configured in `.env`)

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
PORT=3002
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
curl http://localhost:3002/api/dashboard-metrics

# Threat detection (first page, quick mode)
curl http://localhost:3002/api/threats/quick?page=1&limit=10

# Advanced threat detection with speed calculations
curl http://localhost:3002/api/threats/detect

# Network observations for specific BSSID
curl http://localhost:3002/api/networks/observations/AA:BB:CC:DD:EE:FF

# Tag a network
curl -X POST http://localhost:3002/api/tag-network \
  -H "Content-Type: application/json" \
  -d '{"bssid":"AA:BB:CC:DD:EE:FF","tag_type":"LEGIT","confidence":95,"notes":"Home router"}'

# Get manufacturer info
curl http://localhost:3002/api/manufacturer/AA:BB:CC:DD:EE:FF

# Search networks by SSID
curl http://localhost:3002/api/networks/search/MyNetwork

# Analytics endpoints
curl http://localhost:3002/api/analytics/network-types
curl http://localhost:3002/api/analytics/signal-strength
curl http://localhost:3002/api/analytics/temporal-activity
curl http://localhost:3002/api/analytics/security
curl http://localhost:3002/api/analytics/radio-type-over-time
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

**Input Validation**: SQL injection protection via parameterized queries throughout

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
- Changed default port from 5001 to 3002
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
- Port: 3002 (set in `.env` PORT variable)
- Database: PostgreSQL 18 with PostGIS
- Schema: `app`
- Timestamp filter: >= 946684800000 (Jan 1, 2000)
- Threat threshold: 30 points
- Min observations for threat: 2
- Rate limit: 1000 requests per 15 minutes per IP
- Default pagination: 100 networks per page (max 5000)
