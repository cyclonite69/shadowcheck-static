# ShadowCheck - SIGINT Forensics Platform

[![Release](https://img.shields.io/github/v/release/your-username/shadowcheck-static?style=flat-square)](https://github.com/your-username/shadowcheck-static/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/your-username/shadowcheck-static/ci.yml?branch=main&style=flat-square)](https://github.com/your-username/shadowcheck-static/actions)
[![License](https://img.shields.io/github/license/your-username/shadowcheck-static?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-%3E%3D18-blue?style=flat-square)](https://www.postgresql.org/)
[![Coverage](https://img.shields.io/codecov/c/gh/your-username/shadowcheck-static?style=flat-square)](https://codecov.io/gh/your-username/shadowcheck-static)
[![Code Size](https://img.shields.io/github/languages/code-size/your-username/shadowcheck-static?style=flat-square)](https://github.com/your-username/shadowcheck-static)
[![Repo Size](https://img.shields.io/github/repo-size/your-username/shadowcheck-static?style=flat-square)](https://github.com/your-username/shadowcheck-static)
[![Open Issues](https://img.shields.io/github/issues/your-username/shadowcheck-static?style=flat-square)](https://github.com/your-username/shadowcheck-static/issues)
[![Stars](https://img.shields.io/github/stars/your-username/shadowcheck-static?style=social)](https://github.com/your-username/shadowcheck-static)
[![Dependabot](https://img.shields.io/badge/dependabot-enabled-brightgreen?style=flat-square)](https://dependabot.com/)
[![Security](https://img.shields.io/badge/security-policy-blue?style=flat-square)](SECURITY.md)

Production-grade SIGINT forensics and wireless network analysis platform. Real-time threat detection, geospatial correlation via PostGIS, and interactive analysis dashboards.

## Features

- **Dashboard:** Real-time network environment overview with threat indicators
- **Geospatial Analysis:** Interactive Mapbox visualization with spatial correlation
- **Network Analysis:** Deep dive into individual network characteristics and behavior patterns
- **Threat Detection:** ML-powered identification of surveillance devices and anomalies
- **Analytics:** Advanced charts and graphs for network pattern analysis
- **Address Enrichment:** Multi-API venue and business identification
- **Device Classification:** Automatic identification of device types and behavioral profiling
- **Trilateration:** AP location calculation from multiple observations

## Architecture

**Backend:** Node.js/Express REST API with PostgreSQL + PostGIS  
**Frontend:** Vanilla HTML5 with Tailwind CSS, Chart.js, Mapbox GL JS  
**Database:** PostgreSQL 18 with PostGIS extension (566,400+ location records, 173,326+ unique networks)

## Prerequisites

- Node.js 18+
- PostgreSQL 18+ with PostGIS

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/your-username/shadowcheck-static.git
cd shadowcheck-static
npm install
```

### 2. Database Setup

Create PostgreSQL database with PostGIS:

```sql
CREATE ROLE shadowcheck WITH LOGIN PASSWORD 'your_password';
CREATE DATABASE shadowcheck OWNER shadowcheck;
\c shadowcheck
CREATE EXTENSION postgis;
```

### 3. Environment Configuration

Create `.env` in project root:

```
DB_USER=shadowcheck
DB_HOST=localhost
DB_NAME=shadowcheck
DB_PASSWORD=your_password
DB_PORT=5432
PORT=3001
```

See `.env.example` for all options.

### 4. Run Migrations

```bash
psql -U shadowcheck -d shadowcheck -f sql/functions/create_scoring_function.sql
psql -U shadowcheck -d shadowcheck -f sql/functions/fix_kismet_functions.sql
psql -U shadowcheck -d shadowcheck -f sql/migrations/migrate_network_tags_v2.sql
```

### 5. Start Server

```bash
npm start
```

Server runs on `http://localhost:3001`

## Pages

- Dashboard: `/`
- Geospatial: `/geospatial.html`
- Networks: `/networks.html`
- Analytics: `/analytics.html`
- Surveillance: `/surveillance.html`

## API Endpoints

- `GET /api/networks` - All networks
- `GET /api/threats/quick` - Quick threat detection
- `GET /api/analytics/*` - Analytics data
- `GET /api/networks/observations/:bssid` - Network observations

See `server.js` for full endpoint documentation.

## Machine Learning

ShadowCheck includes multi-algorithm threat detection with model training and hyperparameter optimization.

### Architecture

- **Runtime:** Logistic Regression via `ml-logistic-regression` (Node.js)
- **Advanced:** Python ML iteration with scikit-learn (RandomForest, GradientBoosting, LogisticRegression)
- **LLM Enrichment:** AWS Bedrock integration for contextual threat analysis
- **Training:** Requires minimum 10 tagged networks; uses geospatial features + behavioral patterns

### Training Endpoint

**POST** `/api/ml/train`

Trains logistic regression model on all tagged networks in database.

**Authentication:**
```bash
-H "x-api-key: YOUR_API_KEY"
```

(Set `API_KEY` in `.env`; optional if not configured)

**Request:**
```bash
curl -X POST http://localhost:3001/api/ml/train \
  -H "x-api-key: your_api_key"
```

**Response:**
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
  },
  "message": "Model trained successfully"
}
```

**Errors:**
- `400`: Fewer than 10 tagged networks (minimum required)
- `503`: ML model module unavailable
- `401`: Invalid or missing API key

### Status Endpoint

**GET** `/api/ml/status`

Check model training status and tag statistics.

**Response:**
```json
{
  "ok": true,
  "modelTrained": true,
  "modelInfo": {
    "model_type": "threat_logistic_regression",
    "feature_names": ["observation_count", "unique_days", "distance_range_km", ...],
    "created_at": "2025-11-23T19:01:00Z",
    "updated_at": "2025-11-23T21:36:00Z"
  },
  "taggedNetworks": [
    { "tag_type": "THREAT", "count": 18 },
    { "tag_type": "FALSE_POSITIVE", "count": 27 }
  ]
}
```

### Threat Detection Endpoints

**GET** `/api/threats/quick`

Quick threat scoring for all networks (uses trained model if available).

**GET** `/api/threats/detect`

Detailed threat analysis with confidence scores and reasoning.

### Advanced ML Iteration

Test multiple algorithms with grid search and cross-validation:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run iterative training with hyperparameter tuning
python3 ml-iterate.py
```

Tests:
- **Logistic Regression** (C: 0.01–100)
- **Random Forest** (max_depth: 5–20, n_estimators: 50–200)
- **Gradient Boosting** (learning_rate: 0.01–0.1, n_estimators: 100–500)

Outputs classification metrics, ROC-AUC, and confusion matrices for model comparison.

### Features Used for Training

- Observation count (network detections)
- Unique days seen
- Geographic distribution (location clustering)
- Signal strength (RSSI max)
- Distance range from home location
- Behavioral flags (seen at home vs. away)

### ML UI Dashboard

Access the training interface at `/ml-train.html` for visual model management and performance tracking.

### Environment Variables

```
AWS_REGION=us-east-1          # Bedrock region (optional)
AWS_ACCESS_KEY_ID=...         # AWS credentials (optional)
AWS_SECRET_ACCESS_KEY=...     # AWS credentials (optional)
```

## Project Structure

```
shadowcheck-static/
├── server.js              # Express API server
├── package.json           # Dependencies
├── .env                   # Configuration
├── public/                # Frontend static files
│   ├── index.html
│   ├── geospatial.html
│   ├── networks.html
│   ├── analytics.html
│   ├── surveillance.html
│   └── js/, css/          # Assets
├── scripts/               # Utility scripts
│   ├── enrichment/        # Address enrichment
│   ├── geocoding/         # Reverse geocoding
│   └── ml/                # ML utilities
├── sql/                   # Database
│   ├── migrations/        # Schema migrations
│   └── functions/         # SQL functions
├── utils/                 # Helper modules
├── tests/                 # Test files
└── docs/                  # Documentation
```

## Development

**Run dev server:**
```bash
npm run dev
```

**Run tests:**
```bash
npm test
```

## Configuration

Key environment variables (see `.env.example`):

- `DB_*` - PostgreSQL connection
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - development or production
- `AWS_REGION` - For Bedrock ML integration (optional)

## Security

- Use strong database credentials in production
- Enable HTTPS/TLS at reverse proxy layer
- Restrict API access via rate limiting (already enabled)
- See `SECURITY.md` for detailed security guidelines

## Contributing

See `CONTRIBUTING.md` for code standards and workflow.

## Code of Conduct

See `CODE_OF_CONDUCT.md`.

## License

MIT. See `LICENSE` for details.

## Support

For issues, open a GitHub issue or see `SECURITY.md` for security vulnerability reporting.
