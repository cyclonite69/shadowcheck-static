---
inclusion: always
---

# ShadowCheck — Product Context

## What It Is

ShadowCheck is a SIGINT forensics and wireless network analysis platform. It ingests
WiFi observation data (primarily from WiGLE exports), stores it in PostgreSQL/PostGIS,
scores networks for surveillance-threat indicators, and presents interactive maps,
dashboards, and analytics to the operator.

## Core Domain Concepts

- **Network**: A unique BSSID (WiFi access point). Stored in `app.networks`.
- **Observation**: A single sighting of a network at a point in time/space. Stored in `app.observations`.
- **Threat Score**: A composite score (0–100) combining rule-based heuristics and optional ML model output. Thresholds: critical 80–100, high 60–79, medium 40–59, low 20–39, none 0–19.
- **Materialized Views**: Precomputed explorer/analytics datasets refreshed on a cron schedule. The critical view is `app.api_network_explorer_mv`.
- **ETL Pipeline**: Load → Transform → Promote. Ingests WiGLE SQLite/JSON into staging, normalizes into `app.observations`, then refreshes MVs and ML scores.
- **Sibling Detection**: Identifies co-located access points that appear together across observations.
- **Home Location**: A saved reference point used for distance-from-home filters and geospatial analysis.

## User Roles

- **Unauthenticated**: No access when `API_GATE_ENABLED=true` (default). Health endpoint is always public.
- **Authenticated User** (`requireAuth`): Can view networks, maps, analytics, exports.
- **Admin** (`requireAdmin`): Can trigger backups, ML training, data imports, manage users, change settings, access Docker/SSM controls.

## Key Pages (Frontend Routes)

| Route                  | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `/`                    | Start / landing page                           |
| `/dashboard`           | Real-time overview with threat indicators      |
| `/geospatial-explorer` | Mapbox map with spatial correlation            |
| `/analytics`           | Chart.js visualizations and pattern analysis   |
| `/wigle`               | WiGLE database search and live API lookups     |
| `/kepler`              | Kepler.gl GeoJSON explorer (no default limits) |
| `/endpoint-test`       | API endpoint testing page                      |
| `/admin`               | System administration (admin-gated)            |
| `/monitoring`          | Grafana monitoring dashboard                   |

## Secrets Policy — Immutable Rule

**Secrets must never be written to disk.** All credentials (DB passwords, API tokens)
are fetched at runtime from AWS Secrets Manager (`shadowcheck/config`). The entrypoint
and Node.js `SecretsManager` class enforce this: credential keys from SM always override
environment variables. The policy is enforced by `npm run policy:secrets`.

## Feature Flags

Stored in `app.settings` and cached in-memory by `featureFlagService`. Current flags:
`admin_allow_docker`, `admin_allow_ml_training`, `admin_allow_ml_scoring`,
`enable_background_jobs`, `simple_rule_scoring_enabled`.
