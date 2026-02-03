# ShadowCheck Wiki

> **Production-grade SIGINT forensics and wireless network analysis platform.**
>
> Real-time threat detection, geospatial correlation via PostGIS, and interactive analysis dashboards.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Architecture](#architecture)
4. [Features](#features)
5. [API Reference](#api-reference)
6. [Database](#database)
7. [Development](#development)
8. [Deployment](#deployment)
9. [Security](#security)
10. [Machine Learning](#machine-learning)
11. [Troubleshooting](#troubleshooting)

---

## Overview

ShadowCheck is a comprehensive SIGINT (Signals Intelligence) forensics platform designed for wireless network threat detection. It analyzes WiFi, Bluetooth, and cellular observations to identify potential surveillance devices and anomalies using machine learning and geospatial analysis.

### Key Capabilities

| Capability              | Description                                                                   |
| ----------------------- | ----------------------------------------------------------------------------- |
| **Threat Detection**    | ML-powered identification of surveillance devices with multi-factor scoring   |
| **Geospatial Analysis** | Interactive Mapbox visualization with spatial correlation and clustering      |
| **Network Analysis**    | Deep dive into 173,326+ unique networks with behavioral profiling             |
| **Universal Filters**   | 20+ filter types supporting complex temporal, spatial, and behavioral queries |
| **ML Training**         | Multi-algorithm threat detection with hyperparameter optimization             |
| **Address Enrichment**  | Multi-API venue identification (OpenCage, LocationIQ, Abstract, Overpass)     |

### Technology Stack

**Backend:**

- Node.js 20+ (TypeScript)
- Express.js REST API
- PostgreSQL 18 + PostGIS 3.6
- Winston structured logging

**Frontend:**

- React 19 (TypeScript)
- Vite build system
- Tailwind CSS v4
- Mapbox GL JS / Deck.gl
- Zustand state management

**Infrastructure:**

- Docker + Docker Compose
- Jest testing framework
- GitHub Actions CI/CD

---

## Getting Started

### Prerequisites

- **Node.js**: v20 or newer ([.nvmrc](.nvmrc))
- **PostgreSQL**: v18+ with PostGIS extension
- **Docker** (recommended for database)

### Quick Installation

```bash
# 1. Clone repository
git clone https://github.com/cyclonite69/shadowcheck-static.git
cd shadowcheck-static

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 4. Set secrets in keyring
node scripts/set-secret.js db_password "your_password"
node scripts/set-secret.js db_admin_password "admin_password"
node scripts/set-secret.js mapbox_token "pk.your_mapbox_token"

# 5. Run migrations
psql -U shadowcheck_admin -d shadowcheck_db -f sql/migrations/20260129_implement_db_security.sql

# 6. Start development server
npm run dev
```

### DevContainer Setup (Recommended)

For a consistent development environment with VS Code:

```bash
# Open in DevContainer
# Ctrl+Shift+P -> "Dev Containers: Reopen in Container"

# Inside container:
npm install
npm run dev        # Backend (port 3001)
npm run dev:frontend  # Frontend (port 5173)
```

See [Quick Start Guide](docs/guides/QUICK_START.md) for detailed setup instructions.

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   React Frontend (Vite)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │Geospatial│  │ Analytics│  │ML Training│   │
│  │   Page   │  │   Intel  │  │   Page   │  │   Page    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  State Management: Zustand + React Hooks                   │
│  Routing: React Router with lazy loading                   │
│  Styling: Tailwind CSS with dark theme                     │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST API (JSON)
┌───────────────────────────┴─────────────────────────────────┐
│                 Express Server (Node.js)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Layer (Modular Architecture)                   │   │
│  │  • Routes: server/src/api/routes/v1/ & v2/           │   │
│  │  • Services: server/src/services/                   │   │
│  │  • Repositories: server/src/repositories/           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Middleware Stack                                     │   │
│  │  • CORS + Rate Limiting (1000 req/15min)            │   │
│  │  • Security Headers (CSP, X-Frame-Options)           │   │
│  │  • Structured Logging with Winston                   │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │ Connection Pool (pg)
┌─────────────────────────────────────────────────────────────┐
│            PostgreSQL 18 + PostGIS (Geospatial)            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Multi-User Security Model                            │   │
│  │  • shadowcheck_user (Read-Only)                      │   │
│  │  • shadowcheck_admin (Full Access)                 │   │
│  │                                                      │   │
│  │  Materialized Views:                                  │   │
│  │  • api_network_explorer_mv (fast queries)           │   │
│  │  • threat_analysis_mv (threat metrics)              │   │
│  │  • analytics_summary_mv (dashboard metrics)         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
shadowcheck-static/
├── 📁 client/              # React/Vite frontend
│   ├── src/
│   │   ├── components/     # React components (.tsx)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── stores/         # Zustand state management
│   │   ├── utils/          # Utility functions
│   │   ├── types/          # TypeScript definitions
│   │   ├── App.tsx         # Main React app
│   │   └── main.tsx        # Entry point
│   ├── vite.config.ts      # Vite configuration
│   └── tailwind.config.js  # Tailwind CSS config
│
├── 📁 server/              # Express backend
│   ├── server.ts           # Main server entry
│   └── src/
│       ├── api/routes/     # REST API routes (v1 + v2)
│       ├── services/       # Business logic layer
│       ├── repositories/   # Data access layer
│       ├── middleware/     # Express middleware
│       ├── validation/     # Input validation
│       ├── errors/         # Error handling
│       ├── logging/        # Winston logger
│       └── utils/          # Server utilities
│
├── 📁 etl/                 # ETL pipeline
│   ├── 01_load/            # Data extraction
│   ├── 03_transform/       # Data transformation
│   └── 05_indexes/         # Index creation
│
├── 📁 scripts/             # Utility scripts
│   ├── import/             # Data import utilities
│   ├── geocoding/          # Geocoding scripts
│   ├── enrichment/         # Address enrichment
│   └── ml/                 # ML training scripts
│
├── 📁 sql/                 # Database
│   ├── functions/          # SQL functions
│   └── migrations/         # Schema migrations
│
├── 📁 tests/               # Test suite
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── api/                # API tests
│
└── 📁 docs/                # Documentation
    ├── architecture/       # System architecture
    ├── security/           # Security guides
    ├── development/      # Development guides
    └── features/           # Feature docs
```

See [Project Structure](docs/architecture/PROJECT_STRUCTURE.md) for complete details.

---

## Features

### Core Features

#### 1. Dashboard

- Real-time network environment overview
- Threat indicators with severity counts
- Interactive metrics cards with filter awareness
- Quick access to all major features

#### 2. Geospatial Intelligence

- Interactive Mapbox visualization
- Heatmaps, routes, and timeline overlays
- Spatial correlation and clustering
- Unified Network Tooltips (threat-color-coded)
- Distance-from-home calculations

#### 3. Geospatial Explorer

- Map-based network exploration
- Network selection with context menus
- Map controls (layers, overlays, styles)
- WiGLE observations integration

#### 4. Network Analysis

- Deep dive into individual network characteristics
- Universal filtering with 20+ filter types
- Manufacturer/OUI resolution
- Signal strength analysis

#### 5. Threat Detection

- **Rule-Based Scoring**: Multi-factor analysis
  - Seen at home AND away: +40 points
  - Distance range >200m: +25 points
  - Multiple unique days: +5-15 points
  - High observation count: +5-10 points
  - Movement speed analysis: +10-20 points
- **ML-Powered Detection**: Logistic regression with hyperparameter optimization
- **Quick Detection**: Fast paginated threat overview
- **Advanced Detection**: Full analysis with speed calculations

#### 6. Analytics

- Temporal activity patterns (24-hour distribution)
- Radio type trends over time
- Threat score trends
- Signal strength distributions
- Security/encryption analysis

#### 7. Universal Filter System

- **20+ filter types**: Time, signal, radio, security, distance, geography, tags
- **Page-scoped filters**: URL-synced with debounced application
- **Distance-from-home**: Backed by stored home location markers

#### 8. Address Enrichment

- Multi-API venue identification:
  - OpenCage API
  - LocationIQ API
  - Abstract API
  - Overpass API (OpenStreetMap)
- Conflict resolution and voting system
- Venue names and categories

#### 9. Machine Learning

- **Training Endpoint**: Train models on tagged networks
- **Multi-Algorithm Support**: Logistic Regression, Random Forest, Gradient Boosting
- **Hyperparameter Optimization**: Grid search and cross-validation
- **Model Versioning**: Track model performance over time

#### 10. Admin Features

- Role-based access control (RBAC)
- Configuration management
- Database backup/restore
- Network tagging and classification
- ML model training
- Data import/export

### Pages Overview

| Page                | Route                  | Description                             |
| ------------------- | ---------------------- | --------------------------------------- |
| Dashboard           | `/`                    | Real-time metrics and threat indicators |
| Geospatial Intel    | `/geospatial`          | Map-based analysis with heatmaps        |
| Geospatial Explorer | `/geospatial-explorer` | Interactive map exploration             |
| Networks Explorer   | `/networks`            | Filtered network table                  |
| Analytics           | `/analytics`           | Charts and visualizations               |
| ML Training         | `/ml-training`         | Model management and training           |
| Admin               | `/admin`               | System administration                   |
| WiGLE               | `/wigle`               | WiGLE database search                   |
| Kepler              | `/kepler`              | Kepler.gl GeoJSON feeds                 |
| API Test            | `/endpoint-test`       | Endpoint testing                        |

---

## API Reference

### Base URL

```
http://localhost:3001/api
```

### Authentication

**Session-Based**: Most GET endpoints are public

**Admin Role Required**:

- `POST /api/network-tags/:bssid`
- `POST /api/wigle/detail/:netid` (with import)
- Admin page access

**API Key Required**:

```bash
curl -H "x-api-key: your-key" http://localhost:3001/api/admin/backup
```

### Rate Limiting

- **Limit**: 1000 requests per 15 minutes per IP
- **Response**: 429 Too Many Requests when exceeded

### Endpoints Overview

#### Dashboard

```http
GET /api/dashboard-metrics
```

Returns platform statistics (total networks, threats, enriched count).

#### Threats

```http
GET /api/threats/quick?page=1&limit=100&minSeverity=40
GET /api/threats/detect?minSeverity=40
```

Threat detection with pagination and full analysis.

#### Networks

```http
GET /api/networks?page=1&limit=100&sort=lastSeen&order=DESC
GET /api/networks/observations/:bssid
GET /api/networks/search/:ssid
```

Network listing, observations, and search.

#### Network Tags

```http
POST   /api/network-tags/:bssid      # Tag network (admin)
GET    /api/network-tags/:bssid      # Get tags
DELETE /api/network-tags/:bssid      # Remove tag (admin)
```

#### Analytics

```http
GET /api/analytics/network-types
GET /api/analytics/signal-strength
GET /api/analytics/temporal-activity
GET /api/analytics/security
GET /api/analytics/radio-type-over-time
```

#### Machine Learning

```http
POST /api/ml/train        # Train model (api-key)
GET  /api/ml/status       # Training status
GET  /api/ml/predict/:bssid  # Predict threat
```

#### Utilities

```http
GET /api/manufacturer/:bssid   # OUI lookup
GET /api/mapbox-token           # Mapbox token
GET /api/health                 # Health check
```

See [Complete API Documentation](docs/API.md) for full reference.

---

## Database

### Schema Overview

```sql
-- Core Tables
public.networks          -- Network metadata (bssid, ssid, type, encryption)
public.observations      -- Observation records (lat, lon, signal, time)
app.network_tags         -- Manual classifications (threat, false_positive, known_safe)
app.location_markers     -- Home/work locations for threat analysis
app.wigle_networks_enriched  -- WiGLE API enrichment data
app.radio_manufacturers  -- OUI → manufacturer mapping
app.ml_model_metadata    -- ML model versioning
app.network_threat_scores -- Precomputed threat scores
```

### Network Types

| Code | Type      | Description              |
| ---- | --------- | ------------------------ |
| `W`  | WiFi      | 802.11 wireless networks |
| `E`  | BLE       | Bluetooth Low Energy     |
| `B`  | Bluetooth | Bluetooth Classic        |
| `L`  | LTE       | 4G cellular networks     |
| `N`  | 5G NR     | 5G New Radio             |
| `G`  | GSM       | 2G/3G cellular           |

### Security Model

- **shadowcheck_user**: Read-only access for queries
- **shadowcheck_admin**: Full access for imports, tagging, backups

### Key Indexes

```sql
-- Performance indexes
CREATE INDEX idx_locations_bssid ON app.locations_legacy(bssid);
CREATE INDEX idx_locations_time ON app.locations_legacy(time) WHERE time >= 946684800000;
CREATE INDEX idx_networks_type ON app.networks_legacy(type);

-- PostGIS spatial index
CREATE INDEX idx_locations_geom ON app.locations_legacy USING GIST (
  ST_SetSRID(ST_MakePoint(lon, lat), 4326)
);
```

See [Database Schema Documentation](docs/DATABASE_SCHEMA_ENTITIES.md) for complete details.

---

## Development

### Available Scripts

```bash
# Development
npm run dev              # Backend with nodemon (port 3001)
npm run dev:frontend     # Frontend with Vite HMR (port 5173)

# Building
npm run build            # Build frontend and server
npm run build:frontend   # Build React app
npm run build:server     # Compile TypeScript
npm run build:prod       # Production build

# Testing
npm test                 # Run all tests
npm run test:cov         # Tests with coverage
npm run test:integration # Integration tests only

# Code Quality
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix issues
npm run format:check     # Prettier check
npm run format           # Auto-format

# Docker
npm run docker:up        # Start containers
npm run docker:down      # Stop containers
npm run docker:logs      # View API logs
```

### Adding a New API Endpoint

1. **Create route handler** in `server/src/api/routes/v1/`:

```typescript
// server/src/api/routes/v1/my-feature.ts
import { Router } from 'express';
import { container } from '../../../config/container';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const service = container.get('myService');
    const data = await service.getData();
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
```

2. **Add business logic** in `server/src/services/`:

```typescript
// server/src/services/myService.ts
export class MyService {
  async getData() {
    // Business logic here
  }
}
```

3. **Register in container**:

```typescript
// server/src/config/container.ts
container.register('myService', new MyService());
```

4. **Mount route** in server initialization:

```typescript
// server/src/utils/routeMounts.ts
app.use('/api/my-feature', require('./api/routes/v1/my-feature').default);
```

### Adding a Frontend Component

1. **Create component**:

```tsx
// client/src/components/MyComponent.tsx
import React from 'react';

export const MyComponent: React.FC = () => {
  return <div className="p-4">My Component</div>;
};
```

2. **Add route** in `App.tsx`:

```tsx
import { lazy } from 'react';
const MyComponent = lazy(() => import('./components/MyComponent'));

<Route path="/my-route" element={<MyComponent />} />;
```

3. **Add navigation link** in `Navigation.tsx`.

See [Development Guide](docs/DEVELOPMENT.md) for complete instructions.

---

## Deployment

### Docker Compose (Recommended)

```bash
# 1. Configure environment
cp .env.example .env
nano .env  # Edit with production values

# 2. Build and start
docker-compose build
docker-compose up -d

# 3. Run migrations
docker exec -i shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db < sql/migrations/00_init_schema.sql

# 4. Verify
docker-compose exec api curl http://localhost:3001/api/dashboard-metrics
```

### Production Environment Variables

```env
# Required
NODE_ENV=production
PORT=3001
DB_USER=shadowcheck_user
DB_HOST=postgres
DB_NAME=shadowcheck_db
DB_PASSWORD=<strong-password>
API_KEY=<generate-strong-key>
MAPBOX_TOKEN=<your-token>

# Security
FORCE_HTTPS=true
CORS_ORIGINS=https://yourdomain.com

# Optional
REDIS_HOST=redis
REDIS_PORT=6379
LOG_LEVEL=info
```

### Nginx Configuration

```nginx
upstream shadowcheck_api {
    server localhost:3001;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location /api/ {
        proxy_pass http://shadowcheck_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://shadowcheck_api;
    }
}
```

See [Deployment Guide](docs/DEPLOYMENT.md) for complete instructions including:

- AWS ECS deployment
- DigitalOcean App Platform
- SSL/TLS configuration
- Monitoring and logging setup
- Backup strategies

---

## Security

### Security Architecture

**Multi-Layered Approach**:

1. **Network Security**: HTTPS/TLS, firewall, rate limiting
2. **Application Security**: CORS, CSP headers, input validation
3. **Data Security**: SQL injection prevention, parameterized queries
4. **Access Control**: RBAC, session-based auth, API keys
5. **Secrets Management**: Keyring/Docker secrets, never in code

### Security Headers

```javascript
// Applied by securityHeaders middleware
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

### Secrets Management

**Priority Order** (highest to lowest):

1. Docker Secrets (`/run/secrets/*`)
2. System Keyring (via `keytar`)
3. Environment Variables (`.env`)

**Required Secrets**:

- `db_password` - PostgreSQL user password
- `db_admin_password` - PostgreSQL admin password
- `mapbox_token` - Mapbox GL JS token

**Setting Secrets**:

```bash
# Keyring (development)
node scripts/set-secret.js db_password "your-password"

# Docker Secrets (production)
echo "your-password" > secrets/db_password.txt
chmod 600 secrets/*
```

### SQL Injection Prevention

All database queries use parameterized statements:

```typescript
// ✅ Safe - parameterized query
const result = await query('SELECT * FROM networks WHERE bssid = $1', [bssid]);

// ❌ Unsafe - never do this
const result = await query(`SELECT * FROM networks WHERE bssid = '${bssid}'`);
```

See [Security Documentation](docs/security/SECRETS_MANAGEMENT.md) and [SQL Injection Prevention](docs/security/SQL_INJECTION_PREVENTION.md) for details.

---

## Machine Learning

### ML System Overview

ShadowCheck includes multi-algorithm threat detection with model training and hyperparameter optimization.

### Training Endpoint

```bash
# Train model on tagged networks
curl -X POST http://localhost:3001/api/ml/train \
  -H "x-api-key: your-key"
```

**Response**:

```json
{
  "ok": true,
  "model": {
    "type": "logistic_regression",
    "accuracy": 0.92,
    "precision": 0.88,
    "recall": 0.95,
    "f1": 0.91,
    "rocAuc": 0.94
  },
  "trainingData": {
    "totalNetworks": 45,
    "threats": 18,
    "falsePositives": 27
  }
}
```

### Features Used for Training

- Observation count (network detections)
- Unique days seen
- Geographic distribution (location clustering)
- Signal strength (RSSI max)
- Distance range from home location
- Behavioral flags (seen at home vs. away)

### Advanced ML Iteration

Test multiple algorithms with grid search:

```bash
pip install -r scripts/ml/requirements.txt
python3 scripts/ml/ml-iterate.py
```

Tests:

- Logistic Regression
- Random Forest
- Gradient Boosting

With hyperparameter tuning and cross-validation.

### Model Status

```bash
curl http://localhost:3001/api/ml/status
```

See [ML Iteration Guide](docs/ML_ITERATION_GUIDE.md) for complete details.

---

## Troubleshooting

### Common Issues

#### Database Connection Errors

```bash
# Verify Docker PostgreSQL is running
docker ps | grep shadowcheck_postgres

# Test connection
docker exec shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db

# If local API, stop system PostgreSQL
sudo systemctl stop postgresql
```

#### Map is Blank

- Verify `mapbox_token` is set in keyring
- Check browser console for Mapbox GL errors
- Ensure token has correct permissions

#### "Access Denied" on Admin Page

- Verify user has `admin` role in `app.users` table
- Check `db_admin_password` secret is configured

#### Dashboard Shows Zeros

```sql
-- Check data exists
SELECT COUNT(*) FROM public.networks;

-- Verify home location
SELECT * FROM app.location_markers WHERE name = 'home';
```

#### High Memory Usage

```bash
# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### Database Query Performance

```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Analyze and vacuum
ANALYZE;
VACUUM ANALYZE;
```

### Logs and Debugging

```bash
# Enable debug logging
DEBUG=shadowcheck:* npm start

# View Docker logs
docker-compose logs -f api

# Check structured logs
ls logs/
cat logs/combined.log
```

See [Troubleshooting Guide](docs/TROUBLESHOOTING_RECENT_FIXES.md) for recently resolved issues.

---

## Documentation Index

### Core Documentation

- [README.md](README.md) - Project overview
- [CLAUDE.md](CLAUDE.md) - AI assistant guidance
- [CHANGELOG.md](CHANGELOG.md) - Version history

### Architecture & Design

- [Architecture](docs/ARCHITECTURE.md) - System architecture
- [Project Structure](docs/architecture/PROJECT_STRUCTURE.md) - Repository layout
- [Universal Filter System](docs/universal-filter-system.md) - Filter architecture

### API & Database

- [API Documentation](docs/API.md) - Complete API reference
- [API Reference](docs/API_REFERENCE.md) - Endpoint details
- [Database Schema](docs/DATABASE_SCHEMA_ENTITIES.md) - Entity documentation

### Development & Deployment

- [Development Guide](docs/DEVELOPMENT.md) - Local development
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment
- [Quick Start](docs/guides/QUICK_START.md) - 5-minute setup

### Security

- [Security Policy](SECURITY.md) - Vulnerability reporting
- [Secrets Management](docs/security/SECRETS_MANAGEMENT.md) - Credential handling
- [SQL Injection Prevention](docs/security/SQL_INJECTION_PREVENTION.md) - Database security

### Features

- [Feature Catalog](docs/FEATURES.md) - Comprehensive feature list
- [ML Iteration Guide](docs/ML_ITERATION_GUIDE.md) - Machine learning
- [Surveillance Detection](docs/SURVEILLANCE_DETECTION.md) - Threat analysis

### Operations

- [Troubleshooting](docs/TROUBLESHOOTING_RECENT_FIXES.md) - Issue resolution
- [Recent Fixes](docs/RECENT_FIXES_QUICK_REF.md) - Quick verification

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for code standards and workflow.

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards.

## License

MIT License. See [LICENSE](LICENSE) for details.

---

**Last Updated**: 2026-02-03  
**Maintained By**: ShadowCheck Team  
**Version**: 1.0.0
