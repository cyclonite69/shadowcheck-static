#!/bin/bash
# PostgreSQL query aliases for ShadowCheck
# Automatically fetches password from AWS Secrets Manager

# Get DB password from Secrets Manager
get_db_password() {
    aws secretsmanager get-secret-value \
        --secret-id shadowcheck/database \
        --region us-east-1 \
        --query 'SecretString' \
        --output text | jq -r '.db_password'
}

# Alias: psql-sc - Run psql as shadowcheck_user
psql-sc() {
    local password=$(get_db_password)
    PGPASSWORD="$password" docker exec -i shadowcheck_postgres \
        psql -U shadowcheck_user -d shadowcheck_db "$@"
}

# Alias: psql-sc-admin - Run psql as shadowcheck_admin
psql-sc-admin() {
    local password=$(aws secretsmanager get-secret-value \
        --secret-id shadowcheck/database \
        --region us-east-1 \
        --query 'SecretString' \
        --output text | jq -r '.db_admin_password')
    PGPASSWORD="$password" docker exec -i shadowcheck_postgres \
        psql -U shadowcheck_admin -d shadowcheck_db "$@"
}

# Alias: psql-sc-query - Quick query without interactive mode
psql-sc-query() {
    psql-sc -c "$1"
}

# Export functions
export -f psql-sc
export -f psql-sc-admin
export -f psql-sc-query

echo "PostgreSQL aliases loaded:"
echo "  psql-sc              - Connect as shadowcheck_user"
echo "  psql-sc-admin        - Connect as shadowcheck_admin"
echo "  psql-sc-query 'SQL'  - Run quick query"
