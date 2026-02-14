#!/bin/bash
# Force complete rebuild and restart
set -e

echo "=== Force Rebuild & Restart ==="

cd ~/shadowcheck

echo "[1/5] Stopping containers..."
docker stop shadowcheck_backend shadowcheck_frontend 2>/dev/null || true
docker rm shadowcheck_backend shadowcheck_frontend 2>/dev/null || true

echo "[2/5] Removing old images..."
docker rmi shadowcheck/backend:latest shadowcheck/frontend:latest 2>/dev/null || true

echo "[3/5] Pulling latest code..."
git pull origin master

echo "[4/5] Running full rebuild..."
./deploy/aws/scripts/scs_rebuild.sh

echo "[5/5] Waiting for services..."
sleep 10

echo ""
echo "=== Checking Status ==="
docker ps --filter "name=shadowcheck" --format "table {{.Names}}\t{{.Status}}"

echo ""
echo "=== Testing API ==="
curl -s http://localhost:3001/health | head -20

echo ""
echo "=== Backend Logs (last 20 lines) ==="
docker logs shadowcheck_backend --tail 20

echo ""
echo "Done! Check http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
