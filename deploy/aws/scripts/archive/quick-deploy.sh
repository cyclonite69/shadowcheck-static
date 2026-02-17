#!/bin/bash
# Quick Deploy - Run containers from pre-built images
# Usage: ./quick-deploy.sh <mapbox_token>

set -e

if [ -z "$1" ]; then
  echo "Usage: ./quick-deploy.sh <mapbox_token>"
  exit 1
fi

MAPBOX_TOKEN=$1
DB_PASSWORD=$(docker exec shadowcheck_postgres printenv POSTGRES_PASSWORD)
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

echo "🚀 Deploying ShadowCheck..."

# Stop existing containers
docker stop shadowcheck_backend shadowcheck_frontend 2>/dev/null || true
docker rm shadowcheck_backend shadowcheck_frontend 2>/dev/null || true

# Start backend
docker run -d --name shadowcheck_backend \
  --network host \
  -e NODE_ENV=development \
  -e PORT=3001 \
  -e DB_HOST=127.0.0.1 \
  -e DB_PORT=5432 \
  -e DB_USER=shadowcheck_user \
  -e DB_PASSWORD=$DB_PASSWORD \
  -e DB_NAME=shadowcheck_db \
  -e MAPBOX_TOKEN=$MAPBOX_TOKEN \
  -e CORS_ORIGINS=http://${PUBLIC_IP},http://localhost \
  --restart unless-stopped \
  shadowcheck/backend:latest

# Start frontend
docker run -d --name shadowcheck_frontend \
  --network host \
  --restart unless-stopped \
  shadowcheck/frontend:latest

sleep 5

echo "✅ Deployment complete!"
echo ""
docker ps | grep shadowcheck
echo ""
echo "Backend: http://${PUBLIC_IP}:3001"
echo "Frontend: http://${PUBLIC_IP}"
echo ""
echo "⚠️  Using NODE_ENV=development for HTTP. Set up HTTPS for production!"

