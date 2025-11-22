# ShadowCheck - SIGINT Forensics Platform

ShadowCheck is a web-based platform for Signals Intelligence (SIGINT) forensics and analysis. It allows you to analyze wireless network data to identify potential threats and gain insights into network activity.

## Features

*   **Dashboard:** Get a real-time overview of your network environment.
*   **Geospatial Analysis:** Visualize network data on a map.
*   **Analytics:** Explore network data with various charts and graphs.
*   **Threat Detection:** Automatically identify potential threats and surveillance devices.
*   **Network Analysis:** Dive deep into individual network data.

## Architecture

ShadowCheck consists of a Node.js/Express backend and a static frontend.

*   **Backend:** The backend is responsible for querying a PostgreSQL database and providing a REST API for the frontend.
*   **Frontend:** The frontend is built with HTML, Tailwind CSS, and JavaScript. It uses Chart.js for data visualization and Mapbox for geospatial analysis.
*   **Database:** The database is a PostgreSQL database that stores network data.

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
    *   `psql -f create_scoring_function.sql`
    *   `psql -f fix_kismet_functions.sql`
    *   `psql -f migrate_network_tags_v2.sql`

### Running the Application

```bash
npm start
```

The application will be available at `http://localhost:3000`.

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

## Documentation

Additional documentation is available in the `docs` directory.

## Contributing

Please see our [Contributing Guidelines](CONTRIBUTING.md).

## Code of Conduct

Please see our [Code of Conduct](CODE_OF_CONDUCT.md).