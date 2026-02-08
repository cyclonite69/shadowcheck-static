#!/bin/bash
# Deploy with secrets - Load secrets and start containers in same shell
# Usage: ./scripts/deploy-with-secrets.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Bootstrap if needed
if [ ! -f "$HOME/.shadowcheck-machine-id" ]; then
  echo "🔐 Bootstrapping secrets..."
  npx tsx scripts/bootstrap-secrets.ts
fi

# Load secrets
echo "🔑 Loading secrets from keyring..."
export DB_PASSWORD=$(node "$SCRIPT_DIR/get-secret-simple.js" db_password 2>/dev/null || echo "")
export SESSION_SECRET=$(node "$SCRIPT_DIR/get-secret-simple.js" session_secret 2>/dev/null || echo "")
export MAPBOX_TOKEN=$(node "$SCRIPT_DIR/get-secret-simple.js" mapbox_token 2>/dev/null || echo "")
export KEYRING_MACHINE_ID=$(cat "$HOME/.shadowcheck-machine-id" 2>/dev/null || echo "")

if [ -z "$DB_PASSWORD" ]; then
  echo "❌ Required secret 'db_password' not found"
  exit 1
fi

echo "✅ Secrets loaded"

# Start containers with secrets
echo "🚀 Starting containers..."
docker-compose -f deploy/aws/docker-compose-aws.yml up -d --force-recreate backend

echo "✅ Deployment complete"
docker ps --filter name=backend
