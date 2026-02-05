# Deployment Directory

Deployment configurations and scripts for different environments.

## Structure

```
deploy/
└── aws/              # AWS production deployment
    ├── scripts/      # Deployment automation scripts
    ├── configs/      # Infrastructure configurations
    └── docs/         # AWS-specific documentation
```

## Environments

### AWS Production (`deploy/aws/`)

- EC2 Spot instances (t4g.large ARM64)
- PostgreSQL 18 + PostGIS 3.6
- Persistent EBS storage
- Cost-optimized (~$27/month)

See [deploy/aws/README.md](aws/README.md) for details.

### Home Lab (`deploy/homelab/`)

- Your own hardware (x86_64 or ARM64)
- Docker Compose deployment
- One-time hardware cost (~$200-500)
- Full control and privacy

See [deploy/homelab/README.md](homelab/README.md) for details.

### Local Development

- Docker Compose (see `docker/infrastructure/`)
- Local PostgreSQL + PostGIS
- Development secrets in `secrets/`

See main [README.md](../README.md) for local setup.

## Separation of Concerns

**AWS-specific files** → `deploy/aws/`

- Launch scripts
- Infrastructure docs
- AWS-optimized configs

**Local development files** → Root + `docker/infrastructure/`

- docker-compose.yml
- Local PostgreSQL configs
- Development scripts

**Shared files** → `scripts/`, `sql/`, `etl/`

- Database migrations
- Import scripts
- ETL pipelines
- Backup scripts (work in both environments)

## Quick Reference

| Task               | Local Dev                         | Home Lab                            | AWS                                               |
| ------------------ | --------------------------------- | ----------------------------------- | ------------------------------------------------- |
| Setup              | `docker-compose up -d`            | `./deploy/homelab/scripts/setup.sh` | `./deploy/aws/scripts/launch-shadowcheck-spot.sh` |
| Connect            | `./scripts/db-connect.sh`         | `./scripts/db-connect.sh`           | `aws ssm start-session --target i-ID`             |
| Rotate password    | `./scripts/rotate-db-password.sh` | Same                                | Same (auto-detects)                               |
| Backup             | `./scripts/backup-shadowcheck.sh` | Same                                | Same                                              |
| Performance tuning | `docker/infrastructure/`          | `deploy/homelab/configs/`           | `deploy/aws/configs/`                             |
| Cost               | Free (local)                      | ~$5/month (electricity)             | ~$27/month                                        |

## Adding New Environments

To add a new deployment environment (e.g., `deploy/azure/`):

1. Create directory: `deploy/[environment]/`
2. Add subdirectories: `scripts/`, `configs/`, `docs/`
3. Create environment-specific README
4. Update this file with new environment details
