# Features

> **Complete feature catalog for ShadowCheck**

---

## Core UI & Exploration

| Feature                     | Description                                                        |
| --------------------------- | ------------------------------------------------------------------ |
| **Dashboard**               | Real-time metrics cards, threat indicators, filter-aware summaries |
| **Geospatial Intelligence** | Map-based analysis with heatmaps, routes, timeline overlays        |
| **Geospatial Explorer**     | Interactive map view with network selection and tooltips           |
| **Networks Explorer**       | Filtered network table with sorting and manufacturer cues          |
| **Threats Explorer**        | Strong-signal candidate list with quick triage                     |
| **Analytics**               | Temporal activity, radio-type trends, threat score charts          |
| **WiGLE Page**              | Local WiGLE data search with optional live API lookups             |
| **Kepler Page**             | Kepler.gl-ready GeoJSON feeds with filter support                  |
| **API Test Page**           | Endpoint smoke tests and response inspection                       |
| **Admin Page**              | Configuration workflows and operational controls                   |

---

## Universal Filter System

- **20+ filter types** spanning:
  - Time (date ranges, hours)
  - Signal (strength, quality)
  - Radio (type, band, frequency)
  - Security (encryption, WPS)
  - Distance (from home, range)
  - Geography (bounding box, radius)
  - Tags (threat classification)
  - Device attributes

- **Page-scoped filters** with URL sync and debounced application
- **Distance-from-home filters** backed by stored home location markers

---

## Geospatial & Mapping

| Feature                | Description                                        |
| ---------------------- | -------------------------------------------------- |
| **Mapbox Integration** | Token management, style proxying, request proxy    |
| **Google Maps Tiles**  | Server-side tile proxy with key management         |
| **Heatmaps**           | Geospatial overlays for movement patterns          |
| **Routes & Timelines** | Movement visualization                             |
| **Location Markers**   | CRUD for saved markers plus radius-based home zone |
| **Unified Tooltips**   | Consistent, rich hover tooltips across map views   |

---

## Data & Enrichment

| Feature                  | Description                                       |
| ------------------------ | ------------------------------------------------- |
| **Multi-API Enrichment** | OpenCage, LocationIQ, Abstract, Overpass support  |
| **Manufacturer/OUI**     | Vendor data from radio manufacturers              |
| **Network Tagging**      | Manual classification and tag lookups             |
| **Trilateration**        | Estimate AP location from multiple observations   |
| **Export Tooling**       | CSV, JSON, GeoJSON exports                        |
| **Backup & Restore**     | JSON snapshot export with admin-protected restore |

---

## Threat Detection

| Feature                | Description                                                       |
| ---------------------- | ----------------------------------------------------------------- |
| **Rule-Based Scoring** | Multi-factor analysis (seen at home/away, distance, observations) |
| **ML Training**        | Logistic regression model training and scoring                    |
| **ML Iteration**       | Offline model comparison (LR, RF, Gradient Boosting)              |
| **Threat Analytics**   | Quick and detailed threat detection endpoints                     |

### Threat Score Calculation

| Factor       | Points | Condition              |
| ------------ | ------ | ---------------------- |
| Home/Away    | +40    | Seen at home AND away  |
| Distance     | +25    | Distance range > 200m  |
| Temporal     | +5-15  | Multiple unique days   |
| Observations | +5-10  | High observation count |
| Speed        | +10-20 | High movement speed    |

---

## Admin, Auth & Security

| Feature                 | Description                             |
| ----------------------- | --------------------------------------- |
| **Authentication**      | Session-based login/logout              |
| **Role-Based Gating**   | Admin-only routes for sensitive actions |
| **Settings Management** | Keyring-backed credentials              |
| **Security Headers**    | CSP and hardened response headers       |
| **Secrets Handling**    | `.env` + keyring support                |

---

## Platform & Operations

| Feature             | Description                                    |
| ------------------- | ---------------------------------------------- |
| **API Versioning**  | v1 and v2 endpoints                            |
| **Modular Backend** | Services and repositories with validation      |
| **ETL Pipeline**    | Load/transform/promote steps                   |
| **Static Server**   | Production-ready hosting with security headers |
| **Rate Limiting**   | 1000 req/15min per IP                          |

---

## Pages Overview

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

## Related Documentation

- [Architecture](Architecture) - System design
- [API Reference](API-Reference) - REST API documentation
- [Machine Learning](Machine-Learning) - ML features
