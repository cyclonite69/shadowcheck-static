#!/bin/bash
# Fix PostgreSQL Port Binding on EC2
# Run this ON THE EC2 INSTANCE via SSM

set -e

echo "🔧 Fixing PostgreSQL Port Binding"
echo "=================================="
echo ""

cd /home/ssm-user

# Backup current config
cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)

# Fix the port binding: change 127.0.0.1:5432:5432 to 5432:5432
sed -i 's/127\.0\.0\.1:5432:5432/5432:5432/' docker-compose.yml

echo "✅ Updated docker-compose.yml"
echo ""
echo "Changes:"
echo "  Before: - \"127.0.0.1:5432:5432\""
echo "  After:  - \"5432:5432\""
echo ""

# Restart PostgreSQL container
echo "🔄 Restarting PostgreSQL container..."
docker-compose restart postgres

echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Verify port is now exposed
if docker port shadowcheck_postgres | grep -q "0.0.0.0:5432"; then
    echo "✅ PostgreSQL now listening on 0.0.0.0:5432"
else
    echo "❌ Port binding failed"
    docker port shadowcheck_postgres
    exit 1
fi

echo ""
echo "✅ Fix Complete!"
echo ""
echo "Test from your laptop:"
echo "  nc -zv \$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4) 5432"
echo ""
