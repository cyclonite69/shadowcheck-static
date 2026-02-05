#!/bin/bash
# Quick setup script for home lab deployment

set -e

echo "🏠 ShadowCheck Home Lab Setup"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Install Docker first:"
    echo "   curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose not found. Install Docker Compose first."
    exit 1
fi

echo "✅ Docker found"

# Detect RAM
TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
echo "📊 Detected ${TOTAL_RAM}GB RAM"

# Recommend config
if [ "$TOTAL_RAM" -ge 8 ]; then
    CONFIG="postgresql-8gb.conf"
    echo "✅ Using 8GB configuration"
elif [ "$TOTAL_RAM" -ge 4 ]; then
    CONFIG="postgresql-4gb.conf"
    echo "✅ Using 4GB configuration"
else
    echo "⚠️  Warning: Less than 4GB RAM detected. Performance may be limited."
    CONFIG="postgresql-4gb.conf"
fi

# Create directories
mkdir -p secrets backups data logs

# Check for .env
if [ ! -f .env ]; then
    echo "📝 Creating .env from example..."
    cp .env.example .env
    echo "⚠️  Edit .env and set your database credentials!"
fi

# Check for secrets
if [ ! -f secrets/db_password.txt ]; then
    echo "🔐 Generating database password..."
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32 > secrets/db_password.txt
    chmod 600 secrets/db_password.txt
    echo "✅ Password saved to secrets/db_password.txt"
fi

# Start infrastructure
echo ""
echo "🚀 Starting PostgreSQL..."
docker compose -f docker/infrastructure/docker-compose.postgres.yml up -d

echo "⏳ Waiting for database to be ready..."
sleep 10

# Check database
if docker exec shadowcheck_postgres pg_isready -U shadowcheck_user &> /dev/null; then
    echo "✅ Database is ready"
else
    echo "❌ Database failed to start. Check logs:"
    echo "   docker logs shadowcheck_postgres"
    exit 1
fi

echo ""
echo "✅ Home lab setup complete!"
echo ""
echo "Next steps:"
echo "1. Run migrations: ./scripts/shell/run-migration.sh sql/migrations/001_initial_schema.sql"
echo "2. Start application: docker compose up -d"
echo "3. Access at: http://localhost:3001"
echo ""
echo "Configuration used: deploy/homelab/configs/$CONFIG"
echo "Database password: secrets/db_password.txt"
echo ""
