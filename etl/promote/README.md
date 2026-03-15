# ETL Promote Scripts

Data validation, materialized view refresh, and ML scoring scripts.

## Scripts

### process-promotion.ts

Runs the consolidated promotion stage:

- validates data quality after import
- marks quality-filtered observations
- refreshes computed columns and materialized views
- triggers ML threat scoring

```bash
tsx etl/promote/process-promotion.ts
```

## Promotion Flow

```
app.observations
         ↓
  [process-promotion.ts]
         ↓
  Threat scores updated
```
