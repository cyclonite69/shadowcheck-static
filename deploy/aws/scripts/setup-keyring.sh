#!/bin/bash
set -euo pipefail

# Setup encrypted keyring for ShadowCheck secrets — runs inside Docker
# Usage: ./setup-keyring.sh
#   Reads secrets interactively and stores them in the host's keyring
#   via the backend Docker image. No Node.js needed on the host.

MACHINE_ID="${KEYRING_MACHINE_ID:-$(hostname)$(whoami)}"
KEYRING_DIR="/home/ssm-user/.local/share/shadowcheck"
DOCKER_IMAGE="shadowcheck/backend:latest"

echo "==> ShadowCheck Keyring Setup (via Docker)"
echo "    Machine ID: $MACHINE_ID"
echo "    Keyring dir: $KEYRING_DIR"
echo ""

# Ensure keyring directory exists on host
mkdir -p "$KEYRING_DIR"

set_secret() {
  local key="$1"
  local value="$2"

  docker run --rm \
    -e KEYRING_MACHINE_ID="$MACHINE_ID" \
    -e XDG_DATA_HOME=/data \
    -v "$KEYRING_DIR:/data/shadowcheck" \
    "$DOCKER_IMAGE" \
    node -e "
      const ks = require('./dist/server/server/src/services/keyringService').default;
      ks.setCredential('$key', '$value')
        .then(() => console.log('  ✓ $key stored'))
        .catch(e => { console.error('  ✗ $key failed:', e.message); process.exit(1); });
    "
}

# --- Required secrets ---
echo "==> Required secrets"

read -rsp "  db_password: " DB_PASS
echo ""
set_secret "db_password" "$DB_PASS"

read -rp "  mapbox_token (pk.xxx): " MAPBOX
set_secret "mapbox_token" "$MAPBOX"

# --- Optional secrets ---
echo ""
echo "==> Optional secrets (press Enter to skip)"

read -rsp "  db_admin_password: " DB_ADMIN_PASS
echo ""
if [ -n "$DB_ADMIN_PASS" ]; then
  set_secret "db_admin_password" "$DB_ADMIN_PASS"
fi

read -rp "  wigle_api_name: " WIGLE_NAME
if [ -n "$WIGLE_NAME" ]; then
  set_secret "wigle_api_name" "$WIGLE_NAME"
  read -rsp "  wigle_api_token: " WIGLE_TOKEN
  echo ""
  set_secret "wigle_api_token" "$WIGLE_TOKEN"
  WIGLE_ENCODED=$(echo -n "$WIGLE_NAME:$WIGLE_TOKEN" | base64)
  set_secret "wigle_api_encoded" "$WIGLE_ENCODED"
fi

# --- Update .env with machine ID ---
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  if grep -q "^KEYRING_MACHINE_ID=" "$ENV_FILE"; then
    sed -i "s|^KEYRING_MACHINE_ID=.*|KEYRING_MACHINE_ID=$MACHINE_ID|" "$ENV_FILE"
  else
    echo "KEYRING_MACHINE_ID=$MACHINE_ID" >> "$ENV_FILE"
  fi
  echo ""
  echo "==> Updated $ENV_FILE with KEYRING_MACHINE_ID=$MACHINE_ID"
fi

# --- Verify ---
echo ""
echo "==> Verifying keyring..."
docker run --rm \
  -e KEYRING_MACHINE_ID="$MACHINE_ID" \
  -e XDG_DATA_HOME=/data \
  -v "$KEYRING_DIR:/data/shadowcheck:ro" \
  "$DOCKER_IMAGE" \
  node -e "
    const ks = require('./dist/server/server/src/services/keyringService').default;
    ks.listCredentials()
      .then(keys => console.log('  Stored keys:', keys.join(', ')))
      .catch(e => { console.error('  Failed:', e.message); process.exit(1); });
  "

echo ""
echo "==> Keyring setup complete. Run deploy-separated.sh to deploy."
