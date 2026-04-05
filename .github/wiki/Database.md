# Database

**Docs version (repo):** [docs/DATABASE_RADIO_ARCHITECTURE.md](../../docs/DATABASE_RADIO_ARCHITECTURE.md)

> **PostgreSQL + PostGIS schema and query reference**

---

## Schema Overview

### Core Tables

```sql
-- Canonical network/observation layer
app.networks                  -- Canonical network metadata used by explorer flows
app.observations              -- Canonical local observation records
app.api_network_explorer_mv   -- Explorer-facing materialized view with geocoded_* enrichment

-- Import and reconciliation
app.import_history            -- Audit trail for SQLite/KML/WiGLE imports
app.networks_orphans          -- Parent-only network rows peeled out of canonical networks
app.orphan_network_backfills  -- Lightweight orphan WiGLE lookup status

-- Classification / reference
app.network_tags              -- Manual classifications (threat, false_positive, known_safe)
app.location_markers          -- Home/work locations for threat analysis
app.radio_manufacturers       -- OUI -> manufacturer mapping

-- External evidence
app.wigle_v3_network_details  -- WiGLE detail records keyed by netid
app.wigle_v3_observations     -- WiGLE observation rows keyed to v3 detail records

-- ML
app.ml_model_metadata        -- ML model versioning
app.network_threat_scores    -- Precomputed threat scores
```

Operational rule:

- `app.networks` stays canonical.
- orphan-triggered WiGLE checks write to `app.wigle_v3_*` plus `app.orphan_network_backfills`, not back into canonical `app.networks`.

---

## Network Types

| Code | Type      | Description              |
| ---- | --------- | ------------------------ |
| `W`  | WiFi      | 802.11 wireless networks |
| `E`  | BLE       | Bluetooth Low Energy     |
| `B`  | Bluetooth | Bluetooth Classic        |
| `L`  | LTE       | 4G cellular networks     |
| `N`  | 5G NR     | 5G New Radio             |
| `G`  | GSM       | 2G/3G cellular           |

---

## Security Model

- **shadowcheck_user**: Read-only access for queries
- **shadowcheck_admin**: Full access for imports, tagging, backups

---

## Key Indexes

```sql
-- Performance indexes
CREATE INDEX idx_locations_bssid ON app.locations_legacy(bssid);
CREATE INDEX idx_locations_time ON app.locations_legacy(time) WHERE time >= 946684800000;
CREATE INDEX idx_networks_type ON app.networks_legacy(type);

-- PostGIS spatial index
CREATE INDEX idx_locations_geom ON app.locations_legacy USING GIST (
  ST_SetSRID(ST_MakePoint(lon, lat), 4326)
);
```

---

## Common Queries

### Count Networks by Type

```sql
SELECT type, COUNT(*)
FROM public.networks
GROUP BY type;
```

### Recent Observations

```sql
SELECT * FROM public.observations
WHERE time >= EXTRACT(EPOCH FROM NOW() - INTERVAL '1 day') * 1000
ORDER BY time DESC
LIMIT 10;
```

### Tagged Networks

```sql
SELECT n.bssid, n.ssid, nt.tag_type, nt.threat_score, nt.notes
FROM public.networks n
JOIN app.network_tags nt ON n.bssid = nt.bssid
ORDER BY nt.threat_score DESC;
```

### Threat Statistics

```sql
SELECT
  COUNT(*) FILTER (WHERE threat_score >= 80) AS critical,
  COUNT(*) FILTER (WHERE threat_score >= 70) AS high,
  COUNT(*) FILTER (WHERE threat_score >= 50) AS medium,
  COUNT(*) FILTER (WHERE threat_score >= 30) AS low
FROM app.network_threat_scores;
```

### Geographic Distance Calculation

```sql
-- Calculate distance between two points using PostGIS
SELECT ST_Distance(
  ST_SetSRID(ST_MakePoint(-74.006, 40.7128), 4326)::geography,
  ST_SetSRID(ST_MakePoint(-73.9857, 40.7484), 4326)::geography
) / 1000 AS distance_km;
```

---

## Materialized Views

### Refresh Views

```sql
-- Refresh materialized view
REFRESH MATERIALIZED VIEW api_network_explorer_mv;
REFRESH MATERIALIZED VIEW threat_analysis_mv;
REFRESH MATERIALIZED VIEW analytics_summary_mv;
```

### Auto-Refresh Trigger

```sql
-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY api_network_explorer_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY threat_analysis_mv;
END;
$$ LANGUAGE plpgsql;
```

---

## Migrations

### Apply Migrations

```bash
# Review migration ordering / folded state
cat sql/migrations/README.md

# Apply a specific migration manually
docker exec -e PGPASSWORD=\"$DB_ADMIN_PASSWORD\" -i shadowcheck_postgres \\
  psql -U shadowcheck_admin -d shadowcheck_db < sql/migrations/<migration>.sql
```

### Migration Order

See `sql/migrations/README.md` for canonical migration sequence.

---

## Backup & Restore

### Full Backup

```bash
# Custom format (compressed)
pg_dump -U shadowcheck_admin -d shadowcheck_db -F c -f backup_$(date +%Y%m%d).dump

# Plain SQL
pg_dump -U shadowcheck_admin -d shadowcheck_db > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
# From custom format
pg_restore -U shadowcheck_admin -d shadowcheck_db backup.dump

# From SQL
psql -U shadowcheck_admin -d shadowcheck_db < backup.sql
```

---

## Query Performance

### Check Slow Queries

```sql
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Analyze Tables

```sql
ANALYZE;
VACUUM ANALYZE;
```

---

## Related Documentation

- [Architecture](Architecture) - System architecture
- [Development](Development) - Database management in development
- [API Reference](API-Reference) - API endpoints that query the database
- [Security](Security) - Database security model

_Last Updated: 2026-04-05_
