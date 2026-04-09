#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/rotate-db-password.sh [options]

Rotates the ShadowCheck PostgreSQL application password without writing secrets to disk.

Options:
  --rotate-admin         Also rotate db_admin_password / shadowcheck_admin
  --skip-aws             Do not update AWS Secrets Manager
  --no-restart           Do not restart API containers after rotation
  --container NAME       Override postgres container name
  --db-name NAME         Override database name (default: shadowcheck_db)
  --db-user NAME         Override app DB role (default: shadowcheck_user)
  --admin-user NAME      Override admin DB role (default: shadowcheck_admin)
  --secret-id NAME       Override AWS secret id (default: shadowcheck/config)
  --region REGION        Override AWS region
  --profile PROFILE      Override AWS profile
  -h, --help             Show this help
EOF
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1" >&2
    exit 1
  fi
}

detect_pg_container() {
  local candidates=(
    "${PG_CONTAINER:-}"
    shadowcheck_postgres
    shadowcheck_postgres_local
  )
  local name
  for name in "${candidates[@]}"; do
    if [ -n "$name" ] && docker ps --format '{{.Names}}' | grep -qx "$name"; then
      printf '%s\n' "$name"
      return 0
    fi
  done

  name="$(docker ps --format '{{.Names}}' | grep -E 'shadowcheck.*postgres|postgres' | head -n 1 || true)"
  if [ -n "$name" ]; then
    printf '%s\n' "$name"
    return 0
  fi

  echo "No running postgres container found." >&2
  exit 1
}

generate_password() {
  openssl rand -base64 48 | tr -d '=+/' | cut -c1-32
}

aws_args() {
  local action="$1"
  shift
  local args=(secretsmanager "$action" --secret-id "$SECRET_ID")
  if [ -n "$AWS_REGION" ]; then
    args+=(--region "$AWS_REGION")
  fi
  if [ -n "$AWS_PROFILE" ]; then
    args+=(--profile "$AWS_PROFILE")
  fi
  args+=("$@")
  printf '%s\n' "${args[@]}"
}

update_role_password() {
  local role="$1"
  local password="$2"
  docker exec "$PG_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d "$DB_NAME" -c \
    "ALTER USER \"$role\" WITH PASSWORD '$password';" >/dev/null
}

restart_runtime() {
  local restarted=0

  if docker ps --format '{{.Names}}' | grep -qx shadowcheck_web_api; then
    docker restart shadowcheck_web_api >/dev/null
    echo "Restarted container: shadowcheck_web_api"
    restarted=1
  fi

  if docker ps --format '{{.Names}}' | grep -qx shadowcheck_backend; then
    docker restart shadowcheck_backend >/dev/null
    echo "Restarted container: shadowcheck_backend"
    restarted=1
  fi

  if [ "$restarted" -eq 0 ]; then
    echo "No known API container was running. Restart the application manually if needed."
  fi
}

ROTATE_ADMIN=0
UPDATE_AWS=1
RESTART_RUNTIME=1
PG_CONTAINER="${PG_CONTAINER:-}"
DB_NAME="${DB_NAME:-shadowcheck_db}"
DB_USER="${DB_USER:-shadowcheck_user}"
DB_ADMIN_USER="${DB_ADMIN_USER:-shadowcheck_admin}"
SECRET_ID="${SHADOWCHECK_AWS_SECRET:-shadowcheck/config}"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
AWS_PROFILE="${AWS_PROFILE:-}"

while [ $# -gt 0 ]; do
  case "$1" in
    --rotate-admin)
      ROTATE_ADMIN=1
      ;;
    --skip-aws)
      UPDATE_AWS=0
      ;;
    --no-restart)
      RESTART_RUNTIME=0
      ;;
    --container)
      PG_CONTAINER="${2:?missing container name}"
      shift
      ;;
    --db-name)
      DB_NAME="${2:?missing db name}"
      shift
      ;;
    --db-user)
      DB_USER="${2:?missing db user}"
      shift
      ;;
    --admin-user)
      DB_ADMIN_USER="${2:?missing admin user}"
      shift
      ;;
    --secret-id)
      SECRET_ID="${2:?missing secret id}"
      shift
      ;;
    --region)
      AWS_REGION="${2:?missing region}"
      shift
      ;;
    --profile)
      AWS_PROFILE="${2:?missing profile}"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

need_cmd docker
need_cmd openssl
need_cmd python3
if [ "$UPDATE_AWS" -eq 1 ]; then
  need_cmd aws
fi

PG_CONTAINER="$(detect_pg_container)"
NEW_PASSWORD="$(generate_password)"
NEW_ADMIN_PASSWORD=""
if [ "$ROTATE_ADMIN" -eq 1 ]; then
  NEW_ADMIN_PASSWORD="$(generate_password)"
fi

echo "Rotating app DB password for role '$DB_USER' on container '$PG_CONTAINER'..."
update_role_password "$DB_USER" "$NEW_PASSWORD"

if [ "$ROTATE_ADMIN" -eq 1 ]; then
  echo "Rotating admin DB password for role '$DB_ADMIN_USER'..."
  update_role_password "$DB_ADMIN_USER" "$NEW_ADMIN_PASSWORD"
fi

if [ "$UPDATE_AWS" -eq 1 ]; then
  echo "Updating AWS Secrets Manager secret '$SECRET_ID'..."
  mapfile -t GET_ARGS < <(aws_args get-secret-value --query SecretString --output text)
  CURRENT_SECRET_JSON="$(aws "${GET_ARGS[@]}")"

  UPDATED_SECRET_JSON="$(
    CURRENT_SECRET_JSON="$CURRENT_SECRET_JSON" \
    NEW_PASSWORD="$NEW_PASSWORD" \
    NEW_ADMIN_PASSWORD="$NEW_ADMIN_PASSWORD" \
    ROTATE_ADMIN="$ROTATE_ADMIN" \
    python3 - <<'PY'
import json
import os

raw = os.environ.get("CURRENT_SECRET_JSON", "").strip()
data = {} if not raw or raw == "None" else json.loads(raw)
data["db_password"] = os.environ["NEW_PASSWORD"]
if os.environ.get("ROTATE_ADMIN") == "1":
    data["db_admin_password"] = os.environ["NEW_ADMIN_PASSWORD"]
print(json.dumps(data, separators=(",", ":")))
PY
  )"

  mapfile -t PUT_ARGS < <(aws_args put-secret-value --secret-string "$UPDATED_SECRET_JSON")
  aws "${PUT_ARGS[@]}" >/dev/null
  unset CURRENT_SECRET_JSON UPDATED_SECRET_JSON
fi

if [ "$RESTART_RUNTIME" -eq 1 ]; then
  restart_runtime
fi

echo "Rotation complete."
echo "  db_password: rotated"
if [ "$ROTATE_ADMIN" -eq 1 ]; then
  echo "  db_admin_password: rotated"
fi
if [ "$UPDATE_AWS" -eq 1 ]; then
  echo "  AWS secret: updated"
else
  echo "  AWS secret: skipped"
fi
