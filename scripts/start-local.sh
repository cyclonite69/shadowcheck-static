#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

docker compose \
  --env-file .env \
  --env-file .env.local \
  -f docker-compose.yml \
  -f docker-compose.local.yml \
  up -d --build api frontend
