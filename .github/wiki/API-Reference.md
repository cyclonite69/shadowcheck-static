# API Reference

> **Complete REST API documentation for ShadowCheck**

---

## Base URL

```
http://localhost:3001/api
```

---

## Authentication

**Session-Based**: Most GET endpoints are public

**Admin Role Required**:

- `POST /api/network-tags/:bssid`
- `POST /api/wigle/detail/:netid` (with import)

**API Key Required**:

```bash
curl -H "x-api-key: your-key" http://localhost:3001/api/admin/backup
```

---

## Rate Limiting

- **Limit**: 1000 requests per 15 minutes per IP
- **Response**: 429 Too Many Requests when exceeded

---

## Endpoints

### Dashboard

```http
GET /api/dashboard-metrics
```

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

### Threats

#### Quick Threat Detection

```http
GET /api/threats/quick?page=1&limit=100&minSeverity=40
```

**Query Parameters:**

- `page` (integer, default: 1): Page number
- `limit` (integer, default: 100, max: 5000): Results per page
- `minSeverity` (integer, default: 40): Minimum threat score

**Response:**

```json
{
  "threats": [
    {
      "bssid": "AA:BB:CC:DD:EE:FF",
      "ssid": "Hidden Network",
      "threat_score": 75,
      "distance_range_km": 2.5,
      "observation_count": 45,
      "seen_at_home": true,
      "seen_away_from_home": true,
      "max_speed_kmh": 65
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 1842,
    "totalPages": 19
  }
}
```

---

### Networks

#### List Networks

```http
GET /api/networks?page=1&limit=100&sort=lastSeen&order=DESC
```

**Query Parameters:**

- `page`, `limit`: Pagination
- `sort`: `lastSeen`, `ssid`, `type`, `bssid`
- `order`: `ASC` or `DESC`

**Response:**

```json
{
  "networks": [
    {
      "bssid": "AA:BB:CC:DD:EE:FF",
      "ssid": "Home WiFi",
      "type": "W",
      "encryption": "WPA3-PSK",
      "last_seen": "2025-12-02T08:30:00Z"
    }
  ],
  "total": 173326
}
```

#### Get Network Observations

```http
GET /api/networks/observations/:bssid
```

**Response:**

```json
{
  "ok": true,
  "data": {
    "bssid": "AA:BB:CC:DD:EE:FF",
    "observations": [
      {
        "lat": 40.7128,
        "lon": -74.006,
        "signal_strength": -65,
        "time": "2025-12-02T08:00:00Z"
      }
    ]
  }
}
```

#### Tag Network

```http
POST /api/network-tags/:bssid
```

**Request Body:**

```json
{
  "threat_tag": "THREAT",
  "threat_confidence": 0.95,
  "notes": "Confirmed tracking device"
}
```

**Tag Types:** `INVESTIGATE`, `THREAT`, `SUSPECT`, `FALSE_POSITIVE`

---

### Analytics

```http
GET /api/analytics/network-types
GET /api/analytics/signal-strength
GET /api/analytics/temporal-activity
GET /api/analytics/security
GET /api/analytics/radio-type-over-time
```

**Response (network-types):**

```json
{
  "ok": true,
  "data": [
    { "type": "W", "type_name": "WiFi", "count": 145230 },
    { "type": "E", "type_name": "BLE", "count": 18456 }
  ]
}
```

---

### Machine Learning

#### Train Model

```http
POST /api/ml/train
```

**Headers:** `x-api-key: your-key`

**Response:**

```json
{
  "ok": true,
  "data": {
    "accuracy": 0.89,
    "precision": 0.88,
    "recall": 0.95,
    "f1": 0.91
  }
}
```

#### Get Model Status

```http
GET /api/ml/status
```

#### Predict Threat

```http
GET /api/ml/predict/:bssid
```

---

### Utilities

```http
GET /api/manufacturer/:bssid   # OUI lookup
GET /api/mapbox-token           # Mapbox token
GET /api/health                 # Health check
```

---

## Network Type Codes

| Code | Type      | Description              |
| ---- | --------- | ------------------------ |
| `W`  | WiFi      | 802.11 wireless networks |
| `E`  | BLE       | Bluetooth Low Energy     |
| `B`  | Bluetooth | Bluetooth Classic        |
| `L`  | LTE       | 4G cellular networks     |
| `N`  | 5G NR     | 5G New Radio             |
| `G`  | GSM       | 2G/3G cellular           |

---

## Constants

- `MIN_VALID_TIMESTAMP`: 946684800000 (Jan 1, 2000)
- `THREAT_THRESHOLD`: 40 points
- `MAX_PAGE_SIZE`: 5000

---

## Related Documentation

- [Architecture](Architecture) - System design and data flow
- [Development](Development) - Adding new API endpoints
- [Database](Database) - Database schema reference
