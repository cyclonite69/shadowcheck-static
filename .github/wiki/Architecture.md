# Architecture

> **System architecture and design patterns for ShadowCheck**

---

## Overview

ShadowCheck uses a modern modular architecture combining:

- **React/Vite frontend** with TypeScript and Tailwind CSS
- **Node.js/Express backend** with service/repository pattern
- **PostgreSQL + PostGIS** for geospatial data processing

---

## System Architecture

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

---

## Project Structure

```
shadowcheck-static/
├── 📁 client/              # React/Vite frontend
│   ├── src/
│   │   ├── components/     # React components (.tsx)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── stores/         # Zustand state management
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript definitions
│   └── vite.config.ts      # Vite configuration
│
├── 📁 server/              # Express backend
│   ├── server.ts           # Main server entry
│   └── src/
│       ├── api/routes/     # REST API routes (v1 + v2)
│       ├── services/       # Business logic layer
│       ├── repositories/   # Data access layer
│       ├── middleware/     # Express middleware
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
└── 📁 docs/                # Documentation
    ├── architecture/       # System architecture
    ├── security/           # Security guides
    └── development/      # Development guides
```

---

## Data Flow

### Threat Detection Request Flow

```
User Request
↓
[Frontend] → GET /api/threats/quick?page=1&limit=100&minSeverity=40
↓
[Middleware] → Rate Limiting → CORS → Authentication
↓
[Route Handler] → Parse & Validate Query Params
↓
[Threat Service] → Calculate Threat Scores
↓
[Repository Layer] → Query Database (CTEs)
↓
[PostgreSQL] → Execute Query with PostGIS Distance Calculations
↓
[Repository Layer] → Map DB Results to Domain Models
↓
[Threat Service] → Apply Pagination & Filtering
↓
[Route Handler] → Format Response
↓
[Frontend] → Render Threat Table
```

### Enrichment Data Flow

```
[WiGLE CSV Import] → Import Script
↓
[PostgreSQL] → app.wigle_networks_enriched
↓
[Enrichment System] → Multi-API Venue Lookup
├─→ [LocationIQ API] → Conflict Resolution
├─→ [OpenCage API] → Voting System
├─→ [Overpass API] → Best Match Selection
└─→ [Nominatim API] → Gap Filling
↓
[PostgreSQL] → app.ap_addresses (venue names, categories)
↓
[Frontend] → Display Enriched Network Data
```

---

## Technology Stack

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

## Scalability Considerations

### Current Limitations

- Single PostgreSQL instance (no read replicas)
- Connection pool: 20 max connections
- Single-threaded Node.js (no horizontal scaling)

### Scaling Path

**Short-Term (0-100K users)**

- Nginx load balancer
- Multiple API instances
- PostgreSQL read replicas

**Medium-Term (100K-1M users)**

- Redis caching layer
- CDN for static assets
- API rate limiting per user

**Long-Term (1M+ users)**

- Microservices architecture
- Event-driven architecture (Kafka)
- TimescaleDB for time-series data

---

## Related Documentation

- [API Reference](API-Reference) - Complete REST API documentation
- [Development Guide](Development) - Development setup and workflows
- [Database](Database) - Schema and query reference
- [Security](Security) - Security architecture and best practices
