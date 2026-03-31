---
inclusion: always
---

# ShadowCheck — Deployment & Infrastructure

## Environments

### Local Development

- `docker-compose.yml`: postgres (PostGIS 18-3.6), redis, api, frontend
- Postgres uses `POSTGRES_HOST_AUTH_METHOD: trust` (no password locally)
- API builds from root `Dockerfile` (multi-stage: builder → production Alpine)
- Frontend builds from `docker/Dockerfile.frontend.local`
- Secrets: mount `~/.aws` read-only into container, or export env vars in shell

### AWS Production (EC2)

- ARM Graviton spot instances (t4g.large)
- Compose files in `deploy/aws/configs/` and `deploy/aws/docker/`
- Backend image: `deploy/aws/docker/Dockerfile.backend`
- Frontend image: `deploy/aws/docker/Dockerfile.frontend` (Nginx with TLS)
- Network mode: host (containers share EC2 network stack)
- Persistent EBS volume at `/var/lib/postgresql` (XFS, survives termination)

## Docker Services (Production)

| Container            | Image                       | Port   | Purpose                     |
| -------------------- | --------------------------- | ------ | --------------------------- |
| shadowcheck_postgres | postgis/postgis:18-3.6      | 5432   | Database with PostGIS       |
| shadowcheck_redis    | redis:7-alpine              | 6379   | Cache, sessions, rate limit |
| shadowcheck_backend  | shadowcheck/backend:latest  | 3001   | Node.js API                 |
| shadowcheck_frontend | shadowcheck/frontend:latest | 80/443 | Nginx + React SPA           |
| shadowcheck_pgadmin  | dpage/pgadmin4:latest       | 5050   | Database management UI      |
| shadowcheck_grafana  | grafana (optional)          | 3000   | Monitoring dashboards       |

## Container Entrypoint (`docker/entrypoint.sh`)

Execution order:

1. `load_runtime_secrets()` — fetch `shadowcheck/config` from AWS Secrets Manager
   - Credential keys (`db_password`, `db_admin_password`) always override env vars from SM
   - Non-credential keys only set if not already in env
2. If `API_RUN_AS_ROOT_FOR_DOCKER=true`, exec directly (local dev path)
3. Docker socket GID detection and group setup for `nodejs` user
4. `run_migrations()` — runs `sql/run-migrations.sh` with admin credentials via `PGPASSWORD`
5. `exec dumb-init -- su-exec nodejs "$@"` — drop to unprivileged user, start app

## Migration Workflow

Migrations live in `sql/migrations/` (10 consolidated files). Runner: `sql/run-migrations.sh`.

- Tracks applied migrations in `app.schema_migrations` table
- Runs in filename sort order within a transaction per file
- Aborts on first failure to prevent partial state
- Uses `shadowcheck_admin` user (privileged)
- On EC2, `scs_rebuild.sh` copies migrations into the postgres container and runs them before starting the backend

To add a new migration:

1. Create `sql/migrations/YYYYMMDD_NNN_description.sql`
2. Make it idempotent (use `IF NOT EXISTS`, `CREATE OR REPLACE`, etc.)
3. Test locally: `docker exec -i shadowcheck_postgres_local bash < sql/run-migrations.sh`

## Deployment Scripts (`deploy/aws/scripts/`)

| Script                        | Purpose                                            |
| ----------------------------- | -------------------------------------------------- |
| `scs_rebuild.sh`              | Primary rebuild: pull, build, migrate, restart all |
| `deploy-complete.sh`          | Full first-time deployment from scratch            |
| `setup-instance.sh`           | System setup (Docker, Node, utilities)             |
| `deploy-postgres.sh`          | Start/restart postgres container with SSL          |
| `deploy-redis.sh`             | Start/restart redis container                      |
| `build-containers.sh`         | Build backend + frontend images                    |
| `init-admin-user.sh`          | Create initial admin user                          |
| `scs-ssm.sh`                  | SSM session helper                                 |
| `dry-run.sh`                  | Validate deployment without applying               |
| `setup-passwords.sh`          | Bootstrap DB passwords in Secrets Manager          |
| `rotate-grafana-passwords.sh` | Rotate Grafana + grafana_reader credentials        |

## `scs_rebuild.sh` Steps (the main deploy command)

1. `git pull origin <branch>`
2. Prepare certificates (self-signed TLS, backed up to S3)
3. Clean old Docker artifacts
4. Build backend + frontend images (`docker build --no-cache`)
5. Ensure postgres + redis are running and healthy
6. Run migrations (fetch SM credentials, copy SQL into container, execute)
7. Refresh `app.api_network_explorer_mv` before backend starts
8. Start backend + frontend + pgAdmin containers
9. Sync monitoring (Grafana password rotation if enabled)
10. Verify: `docker ps`, health check, HTTPS check

## AWS Services Used

- **Secrets Manager**: `shadowcheck/config` — all credentials and API tokens
- **SSM (Systems Manager)**: Session Manager for SSH-less EC2 access; Parameter Store for S3 bucket name
- **S3**: Backup storage (`dbcoopers-briefcase-*`), certificate backup
- **EC2**: Compute (ARM spot instances)
- **IAM**: EC2 instance role with `secretsmanager:GetSecretValue`, SSM permissions
- **CloudFormation**: IAM backup permissions template
- **Bedrock**: Optional AI insights via Claude (threat analysis)

## CI/CD

- CircleCI (`.circleci/config.yml`): Playwright E2E tests, parallelized across 4 workers
- GitHub Actions (`.github/`): Needs verification — check for additional workflows
- Husky pre-commit: lint checks before commit

## Health Checks

All containers have Docker healthchecks:

- Postgres: `pg_isready` every 10s
- Redis: `redis-cli ping` every 10s
- Backend: `curl http://localhost:3001/health` every 30s (40s start period)
- Frontend: `wget http://localhost/health` every 30s
