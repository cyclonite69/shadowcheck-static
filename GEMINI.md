# ShadowCheck - Project Context

## Project Overview

**ShadowCheck** is a SIGINT forensics and wireless network analysis platform. It is designed for real-time threat detection, geospatial correlation via PostGIS, and interactive analysis dashboards.

- **Type:** Full-stack Web Application (Node.js/Express + React/Vite).
- **Core Purpose:** Wireless network surveillance, threat detection, and forensic analysis.
- **Architecture:**
  - **Frontend:** React 19 (TypeScript) built with Vite 7. Uses Mapbox GL JS 3 and Deck.gl 9 for visualizations.
  - **Backend:** Node.js (TypeScript) with Express 4. REST API structure.
  - **Database:** PostgreSQL (v18+) + PostGIS extension for geospatial queries. Uses materialized views and Redis for performance.
  - **ETL:** TypeScript-based data pipeline for loading, transforming, and promoting SIGINT data.
  - **ML:** Node.js-based machine learning pipelines for threat scoring and network classification.

## Key Technologies

- **Runtime:** Node.js (v20+)
- **Database:** PostgreSQL (v18+) + PostGIS, Redis (v4+)
- **Frontend Framework:** React 19
- **Build Tool:** Vite 7
- **Maps:** Mapbox GL JS 3, Deck.gl 9
- **State Management:** Zustand 5
- **Styling:** Tailwind CSS 4

## Directory Structure

- `client/`: Frontend source code (React, TypeScript, Vite config).
- `server/`: Backend source code (TypeScript, API routes, Services).
- `etl/`: Data pipeline for SIGINT data processing.
- `scripts/`: Maintenance, ML, and import scripts.
- `sql/`: Database schema, migrations, functions, and materialized views.
- `dist/`: Production build output (served by the backend).
- `docker/`: Docker infrastructure files.
- `tests/`: Integrated Jest tests (server and unit).
- `deploy/`: Deployment configurations for AWS and Homelab.

## Development Workflow

### 1. Prerequisites

- Node.js 20+
- PostgreSQL 18+ with PostGIS
- Redis (optional for development, required for production caching)
- `.env` file configured (see `.env.example`).

### 2. Installation

```bash
npm install
```

### 3. Database Setup

Ensure PostgreSQL is running and the database is created with the PostGIS extension. Run migrations:

```bash
# Initialize schema
npm run db:migrate
# See sql/migrations/README.md for subsequent migration order
```

### 4. Running the Application

- **Backend Dev:** `npm run dev` (Builds server and runs via nodemon).
- **Frontend Dev:** `npm run dev:frontend` (Runs Vite dev server on port 5173).
- **Full Build:** `npm run build` (Builds frontend to `dist/` and server to `dist/server/`).
- **Production Start:** `npm start` (Runs the compiled server).

### 5. Testing & Quality

- **Run Tests:** `npm test` (Runs Jest tests).
- **Linting:** `npm run lint` (ESLint + boundaries check).
- **Formatting:** `npm run format` (Prettier).

## Code Conventions

- **Frontend:**
  - Components in `client/src/components`.
  - API and data fetching via hooks in `client/src/hooks`.
  - State managed via Zustand stores in `client/src/stores`.
- **Backend:**
  - TypeScript-based modular architecture in `server/src/`.
  - Layers: `api/routes`, `services`, `repositories`, `middleware`, `utils`.
  - Secrets managed via `keytar` or environment variables.
- **Database:**
  - Heavy use of SQL functions and materialized views (`api_network_explorer_mv`) for geospatial performance.
  - Migrations are SQL files in `sql/migrations/` (tracked in `migrations` table).

## Deployment

The project is containerized using Docker and supports multi-stage builds.

- `Dockerfile`: Multi-stage build for the full-stack application.
- `docker-compose.yml`: Orchestrates API, Redis, and optionally Postgres.

## Kepler.gl Data Rules (Do Not Violate)

- No default limits for Kepler endpoints unless a user provides `limit`.
- Kepler is designed for large datasets; avoid artificial caps.
- Endpoints: `/api/kepler/data`, `/api/kepler/observations`, `/api/kepler/networks`.
