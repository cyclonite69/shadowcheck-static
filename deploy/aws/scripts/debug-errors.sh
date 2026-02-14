#!/bin/bash
# Check server logs for WiGLE batch errors
echo "=== Recent Server Errors ==="
docker logs shadowcheck_backend --tail 100 2>&1 | grep -A 5 -i "error\|wigle\|batch"

echo ""
echo "=== Database Connection Test ==="
docker exec shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db -c "SELECT COUNT(*) FROM public.wigle_v3_observations;"

echo ""
echo "=== Check if observations table has data ==="
docker exec shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db -c "SELECT COUNT(*) FROM app.observations;"

echo ""
echo "=== Test network_entries view ==="
docker exec shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db -c "SELECT bssid, observations, unique_days, avg_signal FROM app.network_entries LIMIT 5;"
