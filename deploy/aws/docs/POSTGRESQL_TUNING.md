# PostgreSQL Performance Tuning for ShadowCheck

## Overview

ShadowCheck uses PostgreSQL 18 with PostGIS for geospatial analysis. The database workload is:

- **Size**: ~2.1GB (566k observations, 173k networks)
- **Pattern**: Read-heavy with complex geospatial queries
- **Hardware**: t4g.large (2 vCPU, 8GB RAM, NVMe SSD)

## Performance Optimizations Applied

### Memory Configuration

```
shared_buffers = 2GB              # 25% of RAM (PostgreSQL best practice)
effective_cache_size = 6GB        # 75% of RAM (OS + PG cache)
work_mem = 16MB                   # Increased for PostGIS queries (was 10MB)
maintenance_work_mem = 512MB      # For VACUUM, CREATE INDEX
temp_buffers = 16MB               # Temporary tables
```

**Why these values:**

- `shared_buffers` at 25% prevents memory pressure
- `work_mem` at 16MB handles complex ST_Distance/ST_DWithin queries
- `effective_cache_size` tells planner about available OS cache

### Storage Optimization (NVMe SSD)

```
random_page_cost = 1.1            # NVMe is fast (default 4.0 for HDD)
effective_io_concurrency = 200    # NVMe handles many concurrent I/O
seq_page_cost = 1.0               # Sequential scan baseline
```

**Impact:**

- Query planner prefers index scans over sequential scans
- Better utilization of NVMe's low latency

### PostGIS Optimization

```
work_mem = 16MB                   # Complex spatial queries need more memory
jit = on                          # Just-in-time compilation for expensive queries
jit_above_cost = 100000           # Enable JIT for costly operations
track_io_timing = on              # Monitor I/O performance
```

**Why JIT matters:**

- PostGIS functions (ST_Distance, ST_Contains) benefit from JIT
- Reduces CPU overhead for repeated spatial calculations
- Enabled automatically for queries exceeding cost threshold

### Autovacuum Tuning

```
autovacuum = on
autovacuum_max_workers = 2
autovacuum_naptime = 30s
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05
log_autovacuum_min_duration = 0
```

**Why this matters:**

- Observations table has frequent updates (new data imports)
- Aggressive autovacuum prevents table bloat
- Logging helps identify vacuum performance issues

### Parallel Processing

```
max_worker_processes = 2
max_parallel_workers = 2
max_parallel_workers_per_gather = 1
max_parallel_maintenance_workers = 1
```

**Limitations:**

- t4g.large has only 2 vCPU
- Conservative parallelism prevents CPU contention
- Maintenance operations (VACUUM, CREATE INDEX) can use 1 worker

## Performance Monitoring

### Check Query Performance

```sql
-- Enable timing
\timing on

-- Test geospatial query
EXPLAIN ANALYZE
SELECT bssid, ST_Distance(location, ST_MakePoint(-73.9857, 40.7484)::geography) as distance
FROM observations
WHERE ST_DWithin(location, ST_MakePoint(-73.9857, 40.7484)::geography, 1000)
ORDER BY distance
LIMIT 100;
```

### Monitor I/O Performance

```sql
-- Check I/O timing statistics
SELECT schemaname, tablename,
       heap_blks_read, heap_blks_hit,
       idx_blks_read, idx_blks_hit
FROM pg_statio_user_tables
WHERE schemaname = 'public'
ORDER BY heap_blks_read DESC;
```

### Check Autovacuum Activity

```sql
-- View autovacuum progress
SELECT schemaname, relname,
       last_vacuum, last_autovacuum,
       n_tup_ins, n_tup_upd, n_tup_del
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_tup_upd + n_tup_del DESC;
```

### Monitor JIT Compilation

```sql
-- Check JIT usage
SELECT query, calls, total_exec_time, jit_generation_time, jit_inlining_time
FROM pg_stat_statements
WHERE jit_generation_time > 0
ORDER BY total_exec_time DESC
LIMIT 10;
```

## Benchmarking

### Before Optimization

```
Query: ST_DWithin + ORDER BY distance (1000m radius)
Time: ~450ms (cold cache), ~180ms (warm cache)
```

### After Optimization (Expected)

```
Query: ST_DWithin + ORDER BY distance (1000m radius)
Time: ~280ms (cold cache), ~120ms (warm cache)
JIT: Enabled for queries > 100k cost
```

**Improvements:**

- 38% faster cold cache (better I/O settings)
- 33% faster warm cache (JIT + work_mem)
- Better index utilization (random_page_cost)

## Tuning for Different Workloads

### Heavy Import Workload

```sql
-- Temporarily disable autovacuum during bulk import
ALTER TABLE observations SET (autovacuum_enabled = false);

-- Import data
\copy observations FROM 'data.csv' CSV HEADER

-- Re-enable and force vacuum
ALTER TABLE observations SET (autovacuum_enabled = true);
VACUUM ANALYZE observations;
```

### Query-Heavy Workload

```sql
-- Increase work_mem for complex queries
SET work_mem = '32MB';

-- Run expensive query
SELECT ...;

-- Reset
RESET work_mem;
```

### Maintenance Window

```sql
-- Full vacuum and reindex
VACUUM FULL ANALYZE observations;
REINDEX TABLE observations;

-- Update statistics
ANALYZE observations;
```

## Configuration Files

### AWS Production

- **Location**: `/var/lib/postgresql/postgresql.conf`
- **Applied**: Launch template v5 (automatic on new instances)
- **Update**: Requires instance restart or `SELECT pg_reload_conf();`

### Local Development

- **Reference**: `docker/infrastructure/postgresql-optimized.conf`
- **Apply**: Mount as volume in docker-compose.yml
- **Reload**: `docker exec shadowcheck_postgres psql -U postgres -c "SELECT pg_reload_conf();"`

## Troubleshooting

### Slow Queries

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### High Memory Usage

```sql
-- Check memory usage by query
SELECT query, shared_blks_hit, shared_blks_read, temp_blks_written
FROM pg_stat_statements
WHERE temp_blks_written > 0
ORDER BY temp_blks_written DESC;
```

### Autovacuum Not Running

```sql
-- Check autovacuum settings
SHOW autovacuum;
SHOW autovacuum_naptime;

-- Force manual vacuum
VACUUM ANALYZE observations;
```

## Performance Checklist

- [ ] Indexes exist on frequently queried columns (bssid, location, timestamp)
- [ ] Autovacuum running regularly (check `pg_stat_user_tables`)
- [ ] No table bloat (check `pg_stat_user_tables.n_dead_tup`)
- [ ] Query plans use indexes (check with `EXPLAIN ANALYZE`)
- [ ] JIT enabled for expensive queries (check `pg_stat_statements`)
- [ ] I/O timing tracked (check `track_io_timing = on`)
- [ ] No long-running transactions (check `pg_stat_activity`)

## References

- PostgreSQL 18 Documentation: https://www.postgresql.org/docs/18/
- PostGIS Performance Tips: https://postgis.net/docs/performance_tips.html
- PgTune: https://pgtune.leopard.in.ua/ (for baseline recommendations)
