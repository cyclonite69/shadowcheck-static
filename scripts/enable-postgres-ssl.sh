#!/bin/bash
# Enable PostgreSQL SSL and SCRAM-SHA-256 authentication
set -e

PGDATA="/var/lib/postgresql/18/docker"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔐 Enabling PostgreSQL SSL + SCRAM-SHA-256${NC}\n"

# Generate self-signed certificate
echo -e "${YELLOW}Generating SSL certificate...${NC}"
docker exec shadowcheck_postgres bash -c "
  cd $PGDATA
  openssl req -new -x509 -days 365 -nodes -text \
    -out server.crt \
    -keyout server.key \
    -subj '/CN=shadowcheck-postgres'
  chmod 600 server.key
  chown postgres:postgres server.key server.crt
"
echo -e "${GREEN}✅ SSL certificate generated${NC}\n"

# Enable SSL in postgresql.conf
echo -e "${YELLOW}Enabling SSL in postgresql.conf...${NC}"
docker exec shadowcheck_postgres bash -c "
  grep -q '^ssl = on' $PGDATA/postgresql.conf || \
  echo 'ssl = on' >> $PGDATA/postgresql.conf
"
echo -e "${GREEN}✅ SSL enabled${NC}\n"

# Re-encrypt passwords with SCRAM-SHA-256
echo -e "${YELLOW}Re-encrypting user passwords with SCRAM-SHA-256...${NC}"
USER_PASSWORD=$(node -e "require('./dist/server/server/src/services/keyringService').default.getCredential('db_password').then(p => console.log(p))")

if [ -n "$USER_PASSWORD" ]; then
  docker exec shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db -c \
    "ALTER USER shadowcheck_user WITH PASSWORD '$USER_PASSWORD';"
  echo "✅ shadowcheck_user password re-encrypted with SCRAM-SHA-256"
fi
echo -e "${GREEN}✅ Passwords re-encrypted${NC}\n"

# Restart PostgreSQL
echo -e "${YELLOW}Restarting PostgreSQL...${NC}"
docker restart shadowcheck_postgres
sleep 3
echo -e "${GREEN}✅ PostgreSQL restarted${NC}\n"

# Verify SSL
echo -e "${YELLOW}Verifying SSL connection...${NC}"
docker exec shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db -c "\conninfo"
echo -e "${GREEN}✅ SSL verification complete${NC}\n"

echo -e "${GREEN}🎉 PostgreSQL SSL + SCRAM-SHA-256 enabled!${NC}"
