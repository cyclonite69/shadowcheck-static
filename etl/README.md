# ETL Pipeline

ShadowCheck Extract-Transform-Load pipeline for importing network observation data.

## Directory Structure

```
etl/
├── load/           # Data extraction and loading scripts
├── transform/      # Data transformation and normalization
├── promote/        # Data validation and materialized view refresh
└── utils/          # Shared utilities
```

## Pipeline Flow

```
Source Data (SQLite/JSON)
         ↓
    [1. LOAD]
         ↓
  import.wigle_networks_raw (staging / WiGLE JSON path)
         ↓
   [2. TRANSFORM]
         ↓
  app.observations (canonical)
  + app.networks_orphans (preserved parent-only rows)
         ↓
   [3. PROMOTE]
         ↓
  Materialized Views + ML Scoring
```

## Quick Start

```bash
# Import from SQLite database
tsx etl/load/sqlite-import.ts backups/sqlite/your-file.sqlite [source_tag]

# Import from WiGLE API JSON responses
tsx etl/load/json-import.ts

# Run the consolidated promotion stage
tsx etl/promote/process-promotion.ts
```

## Configuration

Set environment variables or use `.env`:

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shadowcheck_db
DB_USER=shadowcheck_user
DB_PASSWORD=your_password
IMPORT_WORKERS=4
IMPORT_BATCH_SIZE=1000
DEBUG=false
```

## Data Sources

| Source              | Script                  | Target Table                                                 |
| ------------------- | ----------------------- | ------------------------------------------------------------ |
| SQLite backup       | `load/sqlite-import.ts` | `app.observations` + `app.networks_orphans`                  |
| WiGLE API v2 JSON   | `load/json-import.ts`   | `app.wigle_v2_networks_search`                               |
| WiGLE API v3 Detail | API/admin action        | `app.wigle_v3_network_details` + `app.wigle_v3_observations` |

## Monitoring

Admin import progress is tracked in `app.import_history`:

```sql
SELECT id, started_at, finished_at, source_tag, imported, failed, status
FROM app.import_history
ORDER BY started_at DESC
LIMIT 10;
```

Orphan reconciliation status is tracked separately in:

```sql
SELECT bssid, status, matched_netid, observations_imported, last_attempted_at
FROM app.orphan_network_backfills
ORDER BY last_attempted_at DESC NULLS LAST
LIMIT 10;
```
