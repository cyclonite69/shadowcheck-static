# Threat Score Refresh Automation

## Current Status

**Last Refresh**: 2026-01-16 04:04:59 EST  
**Duration**: 1 hour 6 minutes  
**Status**: ✅ COMPLETE

## Automatic Refresh Setup

### 1. Daily Refresh (Recommended)

Add to crontab:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 3 AM)
0 3 * * * /home/cyclonite01/ShadowCheckStatic/scripts/refresh-threat-scores.sh
```

### 2. Manual Refresh

Run anytime:

```bash
cd /home/cyclonite01/ShadowCheckStatic
./scripts/refresh-threat-scores.sh
```

Or directly:

```bash
docker exec shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db \
  -c "REFRESH MATERIALIZED VIEW public.api_network_explorer_mv;"
```

### 3. Check Refresh Status

```bash
# Check if view exists
docker exec shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db \
  -c "SELECT schemaname, matviewname FROM pg_matviews WHERE matviewname = 'api_network_explorer_mv';"

# Check row count
docker exec shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db \
  -c "SELECT COUNT(*) FROM public.api_network_explorer_mv;"
```

## Performance Notes

- **Refresh time**: ~66 minutes for 173,326 networks
- **Recommended schedule**: Daily at 3 AM (low traffic)
- **Impact**: View is locked during refresh (queries use stale data)
- **Concurrency**: Use `REFRESH MATERIALIZED VIEW CONCURRENTLY` if needed (requires unique index)

## Optimization Options

### Option 1: Concurrent Refresh (No Locking)

Requires unique index:

```sql
CREATE UNIQUE INDEX api_network_explorer_mv_bssid_idx
  ON public.api_network_explorer_mv (bssid);

-- Then use concurrent refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY public.api_network_explorer_mv;
```

### Option 2: Incremental Refresh

For new observations only (requires custom logic):

```sql
-- Refresh only networks with new observations since last refresh
-- (Would need to track last_refresh_time)
```

### Option 3: Partition by Date

Split view by observation date for faster partial refreshes.

## Monitoring

### Check Logs

```bash
tail -f /var/log/shadowcheck/threat-refresh.log
```

### Alert on Failure

Add to refresh script:

```bash
if [ $? -ne 0 ]; then
  echo "ALERT: Threat score refresh failed!" | mail -s "ShadowCheck Alert" admin@example.com
fi
```

## Troubleshooting

### Refresh Taking Too Long?

1. Check database load: `docker exec shadowcheck_postgres pg_top`
2. Check disk I/O: `iostat -x 1`
3. Consider running during off-peak hours
4. Add more indexes to source tables

### Refresh Failing?

1. Check disk space: `df -h`
2. Check PostgreSQL logs: `docker logs shadowcheck_postgres`
3. Check for blocking queries:
   ```sql
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

## Next Steps

1. ✅ Set up cron job for daily refresh
2. ⚠️ Consider concurrent refresh (add unique index)
3. ⚠️ Set up monitoring/alerting
4. ⚠️ Optimize refresh time if needed
