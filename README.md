# ShadowCheck - SIGINT Forensics Platform

ShadowCheck is a production-grade web platform for Signals Intelligence (SIGINT) forensics and analysis. It provides comprehensive wireless network analysis, threat detection, and intelligence gathering capabilities.

## Features

### Core Capabilities
*   **Dashboard:** Real-time overview of network environment with threat indicators
*   **Geospatial Analysis:** Interactive map visualization with Mapbox integration
*   **Analytics:** Advanced charts and graphs for network pattern analysis
*   **Threat Detection:** ML-powered identification of surveillance devices and anomalies
*   **Network Analysis:** Deep dive into individual network characteristics and behavior

### Intelligence Features
*   **Address Enrichment:** Multi-API venue and business identification (4 sources)
*   **Device Classification:** Automatic identification of device types (vehicles, IoT, smartphones)
*   **Contextual Analysis:** Government, education, and commercial facility detection
*   **Trilateration:** AP location calculation from multiple observations
*   **UUID Tracking:** Device movement pattern analysis and behavioral profiling

## Architecture

### Backend
*   **Node.js/Express** server with REST API
*   **PostgreSQL** with PostGIS for geospatial data
*   **Multi-API enrichment** system with intelligent conflict resolution
*   **ML threat detection** with confidence scoring

### Frontend
*   **HTML5** with Tailwind CSS
*   **Chart.js** for data visualization
*   **Mapbox GL JS** for geospatial analysis
*   **Real-time updates** via API polling

### Database
*   **PostgreSQL 18** with PostGIS extension
*   **566,400+ location records**
*   **173,326+ unique networks**
*   **Trilateration and enrichment** data

## Getting Started

### Prerequisites

*   Node.js
*   PostgreSQL

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/shadowcheck-static.git
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Set up the database:
    *   Create a PostgreSQL database.
    *   Create a `.env` file in the root of the project with the following content:
        ```
        DB_USER=your_database_user
        DB_HOST=your_database_host
        DB_NAME=your_database_name
        DB_PASSWORD=your_database_password
        DB_PORT=your_database_port
        ```
4.  Run the database migrations:
    ```bash
    psql -f sql/functions/create_scoring_function.sql
    psql -f sql/functions/fix_kismet_functions.sql
    psql -f sql/migrations/migrate_network_tags_v2.sql
    ```

### Running the Application

```bash
npm start
```

The application will be available at `http://localhost:3001`.

## Directory Structure

```
shadowcheck-static/
├── server.js              # Main Express server
├── scripts/               # Utility scripts
│   ├── enrichment/        # Address enrichment
│   ├── geocoding/         # Reverse geocoding
│   └── ml/                # Machine learning
├── sql/                   # Database files
│   ├── migrations/        # Schema migrations
│   └── functions/         # SQL functions
├── public/                # Frontend files
├── docs/                  # Documentation
└── data/                  # Data files (not in git)
```

See [docs/DIRECTORY_STRUCTURE.md](docs/DIRECTORY_STRUCTURE.md) for complete details.

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

See `server.js` for full API documentation.

## Machine Learning

ShadowCheck includes ML-powered threat detection:

### Node.js ML Trainer
```bash
# Train model on tagged networks (via API)
curl -X POST http://localhost:3001/api/ml/train
```

### Python ML Iteration (Advanced)
Test multiple algorithms with hyperparameter tuning:
```bash
pip install -r requirements.txt
python3 ml-iterate.py
```

See [ML_ITERATION_GUIDE.md](ML_ITERATION_GUIDE.md) for details.

## Documentation

Additional documentation is available in the `docs` directory.

## Contributing

Please see our [Contributing Guidelines](CONTRIBUTING.md).

## Code of Conduct

Please see our [Code of Conduct](CODE_OF_CONDUCT.md).