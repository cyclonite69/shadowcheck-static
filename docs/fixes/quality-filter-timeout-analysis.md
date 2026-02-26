# Filter System 504 Timeout - Root Cause Analysis

## Date: 2026-02-26

## Summary

The filter system timeout with `qualityFilter='all'` is caused by **fundamentally inefficient SQL subqueries** in the quality filter implementation, not a routing issue.

## Root Cause

The `qualityFilter='all'` adds three `NOT IN` subqueries that perform full table scans on the `observations` table:

```sql
-- temporal_clusters: Scans entire observations table
AND (time, lat, lon) NOT IN (
  SELECT time, lat, lon FROM observations
  GROUP BY time, lat, lon HAVING COUNT(*) > 50
)

-- duplicate_coords: Scans entire observations table
AND (lat, lon) NOT IN (
  SELECT lat, lon FROM observations
  GROUP BY lat, lon HAVING COUNT(*) > 1000
)

-- extreme_signals: Simple range check (fast)
AND level BETWEEN -120 AND 0
```

With 566,400+ observations, these `NOT IN` subqueries cause 60+ second timeouts.

## Investigation Timeline

1. **Initial hypothesis**: `qualityFilter` not in `NETWORK_ONLY_FILTERS` → forcing slow path
2. **First fix attempt**: Added `qualityFilter` to `NETWORK_ONLY_FILTERS`
3. **Result**: Still timed out (62s) even on FAST path
4. **Discovery**: Quality filter subqueries were being applied to materialized view query
5. **Second fix**: Removed `qualityFilter` from `NETWORK_ONLY_FILTERS` (correct behavior)
6. **Result**: Now uses SLOW path as intended, but still times out due to inefficient subqueries

## Why It "Used to Work"

**User claim**: "Filter system used to work fast with qualityFilter='all' enabled"

**Possible explanations**:

1. Smaller dataset in the past (fewer observations)
2. Quality filter was disabled/ignored in previous implementation
3. Different database indexes existed
4. User may have been using `qualityFilter='none'` (default)

## The Real Problem

The quality filter implementation in `server/src/services/dataQualityFilters.ts` uses anti-patterns:

- `NOT IN` with subqueries (should use `NOT EXISTS` or `LEFT JOIN ... WHERE NULL`)
- No indexes on `(time, lat, lon)` or `(lat, lon)` for the GROUP BY operations
- Full table scans on every query

## Solutions

### Option 1: Optimize Quality Filter SQL (Recommended)

Replace `NOT IN` with `NOT EXISTS`:

```sql
-- temporal_clusters (optimized)
AND NOT EXISTS (
  SELECT 1 FROM observations o2
  WHERE o2.time = observations.time
    AND o2.lat = observations.lat
    AND o2.lon = observations.lon
  GROUP BY o2.time, o2.lat, o2.lon
  HAVING COUNT(*) > 50
)
```

Add indexes:

```sql
CREATE INDEX idx_obs_time_lat_lon ON observations(time, lat, lon);
CREATE INDEX idx_obs_lat_lon ON observations(lat, lon);
```

### Option 2: Pre-compute Quality Flags

Add quality flag columns to observations table:

```sql
ALTER TABLE observations ADD COLUMN is_temporal_cluster BOOLEAN DEFAULT FALSE;
ALTER TABLE observations ADD COLUMN is_duplicate_coord BOOLEAN DEFAULT FALSE;
```

Update flags during ETL/import, then filter with simple WHERE clauses.

### Option 3: Disable Quality Filter

Set default to `qualityFilter='none'` and document that it's too slow for large datasets.

### Option 4: Materialized View with Quality Pre-filtering

Create a separate materialized view that excludes quality issues:

```sql
CREATE MATERIALIZED VIEW api_network_explorer_quality_mv AS
SELECT * FROM api_network_explorer_mv ne
WHERE NOT EXISTS (...)  -- pre-filtered quality checks
```

## Current Status

- ✅ Performance tracking added (execution time, query path logging)
- ✅ `qualityFilter` correctly removed from `NETWORK_ONLY_FILTERS`
- ❌ Quality filter still times out on both FAST and SLOW paths
- ❌ No immediate fix without database schema changes or SQL optimization

## Recommendation

**Short term**: Disable quality filter in UI (set default to 'none', hide from filter panel)

**Long term**: Implement Option 1 (optimize SQL) + Option 2 (pre-compute flags during ETL)

## Files Involved

- `server/src/services/dataQualityFilters.ts` - Quality filter SQL (needs optimization)
- `server/src/services/filterQueryBuilder/constants.ts` - NETWORK_ONLY_FILTERS set
- `server/src/services/filterQueryBuilder/universalFilterQueryBuilder.ts` - Filter application logic
- `client/src/stores/filterStore.ts` - Frontend filter state (default value)

## Performance Data

- **No filters**: ~100ms
- **Simple network filter** (encryption): ~100ms, FAST path
- **qualityFilter='all'**: 60s timeout, SLOW path
- **Database size**: 566,400+ observations, 173,326+ networks

## Next Steps

1. Decide on solution approach (Option 1, 2, 3, or 4)
2. If Option 1: Create optimized SQL and test performance
3. If Option 2: Add ETL step to compute quality flags
4. If Option 3: Update UI to hide/disable quality filter
5. Update documentation with performance characteristics
