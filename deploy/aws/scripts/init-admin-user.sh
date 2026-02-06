#!/bin/bash
# Initialize database with admin user
# Run this after database restore or on fresh install

set -e

echo "🔐 Creating admin user..."

docker exec shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db -f /tmp/01_create_admin_user.sql

echo "✅ Admin user created"
echo ""
echo "Login credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "⚠️  Change this password after first login!"
