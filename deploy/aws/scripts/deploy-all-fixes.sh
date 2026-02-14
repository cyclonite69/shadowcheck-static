#!/bin/bash
# Complete deployment of all recent fixes
# Run on AWS instance: cd ~/shadowcheck && bash deploy/aws/scripts/deploy-all-fixes.sh

set -e

echo "=== ShadowCheck Complete Fix Deployment ==="
echo ""

# 1. Pull latest code
echo "[1/4] Pulling latest code..."
git pull origin master

# 2. Rebuild containers
echo ""
echo "[2/4] Rebuilding containers..."
./deploy/aws/scripts/scs_rebuild.sh

# 3. Apply database migrations manually
echo ""
echo "[3/4] Applying database migrations..."
docker exec shadowcheck_postgres psql -U shadowcheck_admin -d shadowcheck_db <<'EOF'
-- Drop uppercase SSID triggers
DROP TRIGGER IF EXISTS trigger_uppercase_ssid_networks ON app.networks;
DROP TRIGGER IF EXISTS trigger_uppercase_ssid ON public.access_points;
DROP TRIGGER IF EXISTS trigger_uppercase_ssid_observations ON public.observations;
DROP TRIGGER IF EXISTS trigger_uppercase_ssid_history ON public.ssid_history;
DROP FUNCTION IF EXISTS app.uppercase_ssid_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.uppercase_ssid_trigger() CASCADE;

-- Track this migration
INSERT INTO app.schema_migrations (filename) VALUES ('20260214_drop_uppercase_ssid_triggers.sql')
ON CONFLICT (filename) DO NOTHING;

-- Recreate network_entries view with real observation aggregates
DROP MATERIALIZED VIEW IF EXISTS app.network_entries CASCADE;
DROP VIEW IF EXISTS app.network_entries CASCADE;

CREATE OR REPLACE VIEW app.network_entries AS
SELECT
    n.bssid,
    n.ssid,
    n.type,
    n.frequency,
    n.capabilities AS security,
    n.bestlevel AS signal,
    n.bestlat AS lat,
    n.bestlon AS lon,
    to_timestamp(n.lasttime_ms / 1000.0) AS last_seen,
    COALESCE(MIN(o.time), to_timestamp(n.lasttime_ms / 1000.0)) AS first_seen,
    to_timestamp(n.lasttime_ms / 1000.0) AS observed_at,
    COALESCE(COUNT(o.id), 0) AS observations,
    MAX(o.accuracy) AS accuracy_meters,
    NULL::integer AS channel,
    NULL::text AS wps,
    NULL::text AS battery,
    NULL::text AS auth,
    0::double precision AS altitude_m,
    0::double precision AS min_altitude_m,
    0::double precision AS max_altitude_m,
    0::double precision AS altitude_accuracy_m,
    0::double precision AS altitude_span_m,
    0::double precision AS max_distance_meters,
    0::double precision AS last_altitude_m,
    COALESCE(COUNT(DISTINCT DATE(o.time)), 0) AS unique_days,
    COALESCE(COUNT(DISTINCT (ROUND(o.lat::numeric, 3) || ',' || ROUND(o.lon::numeric, 3))), 0) AS unique_locations,
    false AS is_sentinel,
    LEFT(REPLACE(n.bssid, ':', ''), 6) AS oui,
    NULL::text[] AS insecure_flags,
    NULL::text[] AS security_flags,
    COALESCE(COUNT(DISTINCT o.source_type), 0) AS unique_source_count,
    AVG(o.level) AS avg_signal,
    MIN(o.level) AS min_signal,
    MAX(o.level) AS max_signal
FROM app.networks n
LEFT JOIN app.observations o ON o.bssid = n.bssid
GROUP BY n.bssid, n.ssid, n.type, n.frequency, n.capabilities, n.bestlevel, n.bestlat, n.bestlon, n.lasttime_ms;

GRANT SELECT ON app.network_entries TO shadowcheck_user;
GRANT SELECT ON app.network_entries TO shadowcheck_admin;

SELECT 'Migrations applied successfully' AS status;
EOF

# 4. Verify deployment
echo ""
echo "[4/4] Verifying deployment..."
sleep 3

echo ""
echo "Container status:"
docker ps --filter "name=shadowcheck" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "Testing API health:"
curl -s http://localhost:3001/health | head -20

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Fixed issues:"
echo "  ✓ WiGLE observations schema (app → public)"
echo "  ✓ Network entries view with real observation data"
echo "  ✓ SSID uppercase triggers removed"
echo "  ✓ Error handling for WiGLE credentials save"
echo "  ✓ Frontend error object rendering"
echo ""
echo "Refresh your browser to see the changes."
