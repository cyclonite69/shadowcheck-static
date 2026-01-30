# API Reference

Complete REST API documentation for ShadowCheck SIGINT Forensics Platform.

## Base URL

```
http://localhost:3001/api
```

## Authentication

Protected endpoints require API key:

```http
x-api-key: your-api-key-here
```

Set via: `API_KEY=your-secret-key` in `.env`

## Rate Limiting

- **1000 requests per 15 minutes** per IP
- Returns `429 Too Many Requests` when exceeded

---

## Dashboard

### GET /api/dashboard-metrics

Platform statistics.

**Response:**

```json
{
  "totalNetworks": 173326,
  "threatsCount": 1842,
  "surveillanceCount": 256,
  "enrichedCount": 45123
}
```

---

## Threats

### GET /api/threats/quick

Fast paginated threat detection.

**Parameters:**

- `page` (int, default: 1)
- `limit` (int, default: 100, max: 5000)
- `minSeverity` (int, default: 40, range: 0-100)

**Response:**

```json
{
  "threats": [
    {
      "bssid": "AA:BB:CC:DD:EE:FF",
      "ssid": "Hidden Network",
      "type": "W",
      "threat_score": 75,
      "distance_range_km": 2.5,
      "observation_count": 45,
      "unique_days": 8,
      "seen_at_home": true,
      "seen_away_from_home": true,
      "max_speed_kmh": 65,
      "manufacturer": "Apple Inc."
    }
  ],
  "pagination": {
    "page": 1,
    "total": 1842,
    "totalPages": 19
  }
}
```

### GET /api/threats/detect

Advanced threat detection with speed calculations.

---

## Networks

### GET /api/networks

List networks with pagination and filtering.

**Parameters:**

- `page` (int, default: 1) - Page number
- `limit` (int, default: 100, max: 5000) - Results per page
- `sort` (string) - Sort field (bssid, ssid, last_seen, threat_score, etc.)
- `order` (string) - Sort order (ASC, DESC)
- `location_mode` (string) - Data source mode:
  - `latest_observation` - Uses latest observation data (recommended)
  - `aggregated` - Uses materialized view aggregated data
- `distance_from_home` (float) - Filter by distance from home location

**Response:**

```json
{
  "networks": [
    {
      "bssid": "AA:BB:CC:DD:EE:FF",
      "ssid": "MyNetwork",
      "type": "W",
      "signal": -45,
      "frequency": 2437,
      "channel": 6,
      "manufacturer": "Apple Inc.",
      "max_distance_meters": 1250.5,
      "threat_score": 25,
      "last_seen": "2026-01-30T06:30:19.059Z"
    }
  ],
  "pagination": {
    "page": 1,
    "total": 173326,
    "totalPages": 1734
  }
}
```

**Note:** The API now uses latest observation data by default for accurate real-time information. Manufacturer fields are populated via OUI prefix matching from BSSID MAC addresses.

### GET /api/networks/observations/:bssid

Get all observations for a network.

### GET /api/networks/search/:ssid

Search by SSID.

### POST /api/network-tags/:bssid 🔒

Tag a network (requires API key).

**Request:**

```json
{
  "threat_tag": "LEGIT",
  "threat_confidence": 0.95,
  "notes": "Home router"
}
```

**Tag Types:**

- `LEGIT`: Safe
- `FALSE_POSITIVE`: Incorrectly flagged
- `INVESTIGATE`: Needs review
- `THREAT`: Confirmed threat

### DELETE /api/network-tags/:bssid 🔒

Remove tag.

### GET /api/networks/tagged

List tagged networks.

---

## Analytics

### GET /api/analytics/network-types

Network type distribution.

### GET /api/analytics/signal-strength

Signal strength histogram.

### GET /api/analytics/temporal-activity

Hourly observation patterns over time.

**Parameters:**

- `range`: `24h`, `7d`, `30d`, `90d`, `all` (default: `all`)

**Response:**

```json
{
  "data": [
    {
      "hour": 0,
      "observations": 1250
    }
  ]
}
```

### GET /api/analytics/radio-type-over-time

Network types distribution over time periods.

**Parameters:**

- `range`: `24h`, `7d`, `30d`, `90d`, `all` (default: `all`)

**Response:**

```json
{
  "data": [
    {
      "period": "2026-01-29",
      "wifi": 1500,
      "bluetooth": 250,
      "cellular": 100
    }
  ]
}
```

### GET /api/analytics/threat-trends

Threat score trends over time.

**Parameters:**

- `range`: `24h`, `7d`, `30d`, `90d`, `all` (default: `all`)

**Response:**

```json
{
  "data": [
    {
      "period": "2026-01-29",
      "avg_threat_score": 35.2,
      "threat_count": 45
    }
  ]
}
```

### GET /api/analytics/top-networks

Top networks by observation count.

**Parameters:**

- `limit` (int, default: 10, max: 100) - Number of results

**Response:**

```json
{
  "data": [
    {
      "bssid": "AA:BB:CC:DD:EE:FF",
      "ssid": "Popular Network",
      "observations": 2500
    }
  ]
}
```

**Note:** All analytics endpoints now properly handle null values and use appropriate data sources (materialized views for aggregated data, observations table for temporal data).

---

## Machine Learning

### POST /api/ml/train 🔒

Train threat detection model.

### GET /api/ml/status

Model training status.

---

## Location Markers

### GET /api/location-markers

Get all markers.

### POST /api/location-markers/home

Set home location.

### DELETE /api/location-markers/home

Remove home marker.

---

## WiGLE Integration

### GET /api/networks/:bssid/wigle-observations

Get WiGLE observation data for a specific network.

**Response:**

```json
{
  "bssid": "AA:BB:CC:DD:EE:FF",
  "observations": [
    {
      "lat": 40.7128,
      "lon": -74.006,
      "accuracy": 10,
      "timestamp": "2026-01-30T06:30:19.059Z"
    }
  ],
  "stats": {
    "total": 15,
    "accuracy_avg": 12.5
  }
}
```

### POST /api/networks/wigle-observations/batch

Batch fetch WiGLE observations for multiple networks.

**Request:**

```json
{
  "bssids": ["AA:BB:CC:DD:EE:FF", "11:22:33:44:55:66"]
}
```

**Response:**

```json
{
  "results": [
    {
      "bssid": "AA:BB:CC:DD:EE:FF",
      "observations": [...],
      "stats": {...}
    }
  ]
}
```

### GET /api/wigle/api-status

Check WiGLE API connectivity and status.

**Response:**

```json
{
  "status": "connected",
  "api_key_valid": true,
  "rate_limit_remaining": 95
}
```

**Note:** WiGLE observations now use the correct 'app' schema namespace instead of 'public'.

---

## Utilities

### GET /api/mapbox-token

Get Mapbox token.

### GET /api/manufacturer/:bssid

Lookup manufacturer from MAC OUI.

### GET /api/observations/check-duplicates/:bssid

Check for duplicate observations.

---

## Admin

### POST /api/admin/cleanup-duplicates 🔒

Remove duplicate observations.

### POST /api/admin/refresh-colocation 🔒

Refresh colocation data.

---

## Settings & Export

### GET /api/settings

Get settings.

### POST /api/settings

Update settings.

### POST /api/admin/backup

Run a full database backup (no auth yet).

### GET /api/csv

Export observations as CSV (full dataset).

### GET /api/json

Export observations + networks as JSON (full dataset).

### GET /api/geojson

Export observations as GeoJSON (full dataset).

> Note: Backups/exports are currently unauthenticated and intended for trusted environments only.

---

## Network Types

- `W`: WiFi
- `E`: BLE
- `B`: Bluetooth
- `L`: LTE
- `N`: 5G NR
- `G`: GSM

## Threat Scoring

- **50**: Seen at home AND away
- **30**: Distance > 1km
- **20**: 10+ days
- **15**: 100+ observations
- **-20**: Strong signal (stationary)

Default threshold: **40**

## Error Codes

- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `429`: Rate Limited
- `500`: Server Error

---

🔒 = Requires API key
