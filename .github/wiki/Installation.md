# Installation Guide

Complete setup instructions for ShadowCheck development and production environments.

---

## Prerequisites

### Required Software

| Software   | Version | Purpose                                     |
| ---------- | ------- | ------------------------------------------- |
| Node.js    | 20+     | Runtime environment                         |
| PostgreSQL | 18+     | Database with PostGIS extension             |
| Docker     | 20.10+  | Containerization (optional but recommended) |
| Git        | 2.30+   | Version control                             |

### System Requirements

**Minimum:**

- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB SSD

**Recommended:**

- CPU: 4 cores
- RAM: 8 GB
- Storage: 50 GB SSD

---

## Quick Installation

### 1. Clone Repository

```bash
git clone https://github.com/cyclonite69/shadowcheck-static.git
cd shadowcheck-static
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Set Up PostgreSQL

#### Option A: Docker (Recommended)

```bash
# Start PostgreSQL with PostGIS
docker-compose up -d postgres

# Verify it's running
docker ps | grep shadowcheck_postgres
```

#### Option B: Local PostgreSQL

```sql
-- Create database users
CREATE ROLE shadowcheck_user WITH LOGIN PASSWORD 'your_password';
CREATE ROLE shadowcheck_admin WITH LOGIN PASSWORD 'admin_password';

-- Create database
CREATE DATABASE shadowcheck_db OWNER shadowcheck_admin;
\c shadowcheck_db
CREATE EXTENSION postgis;
```

### 4. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your settings
nano .env
```

**Essential environment variables:**

```env
# Database
DB_USER=shadowcheck_user
DB_HOST=localhost
DB_NAME=shadowcheck_db
DB_PORT=5432

# Server
PORT=3001
NODE_ENV=development

# Frontend
MAPBOX_TOKEN=pk.your_mapbox_token_here
```

### 5. Set Secrets

```bash
# Set database password in keyring
node scripts/set-secret.js db_password "your_password"

# Set admin password
node scripts/set-secret.js db_admin_password "admin_password"

# Set Mapbox token
node scripts/set-secret.js mapbox_token "pk.your_token"
```

### 6. Run Migrations

```bash
# Apply security migration
psql -U shadowcheck_admin -d shadowcheck_db -f sql/migrations/20260129_implement_db_security.sql
```

### 7. Start Development Server

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
npm run dev:frontend
```

Access the application:

- Backend API: http://localhost:3001
- Frontend: http://localhost:5173

---

## DevContainer Setup (Recommended)

### Prerequisites

- Docker Desktop
- VS Code with Dev Containers extension

### Steps

1. Open in DevContainer (VS Code will prompt)
2. Wait for container build (includes Node.js 20, PostgreSQL 18, PostGIS)
3. Start developing:
   ```bash
   npm run dev          # Backend
   npm run dev:frontend # Frontend
   ```

---

## Production Deployment

### Docker Compose

```bash
# Configure production environment
cp .env.example .env
nano .env

# Build and start
docker-compose build
docker-compose up -d

# Run migrations
docker exec -i shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db < sql/migrations/00_init_schema.sql

# Verify
docker-compose exec api curl http://localhost:3001/api/dashboard-metrics
```

---

## Verification

```bash
# Test API
curl http://localhost:3001/api/dashboard-metrics

# Run tests
npm test
```

---

## Next Steps

- [Development Guide](Development)
- [API Reference](API-Reference)
- [Architecture](Architecture)
