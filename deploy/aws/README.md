# AWS Deployment for ShadowCheck

This directory contains AWS-specific deployment configurations, scripts, and documentation.

## Directory Structure

```
deploy/aws/
├── scripts/          # AWS deployment scripts
│   └── launch-shadowcheck-spot.sh
├── configs/          # PostgreSQL and infrastructure configs
│   ├── postgresql-optimized.conf
│   └── postgresql-security.conf
└── docs/             # AWS-specific documentation
    ├── AWS_INFRASTRUCTURE.md
    ├── POSTGRESQL_TUNING.md
    └── PASSWORD_ROTATION.md
```

## Quick Start

### Launch Spot Instance

```bash
./scripts/launch-shadowcheck-spot.sh
```

### Connect to Instance

```bash
aws ssm start-session --target i-INSTANCE_ID --region us-east-1
```

### Rotate Database Password

```bash
# On AWS instance via SSM
sudo /home/ssm-user/scripts/rotate-db-password.sh
```

## Infrastructure

- **Instance Type**: t4g.large (ARM64, 2 vCPU, 8GB RAM)
- **Pricing**: ~$22/month Spot + $4.80/month storage
- **Database**: PostgreSQL 18 + PostGIS 3.6
- **Storage**: 30GB GP3 EBS (persistent, optimized XFS)
- **Security**: SCRAM-SHA-256, SSL/TLS required, IP-restricted

## Documentation

- **[AWS_INFRASTRUCTURE.md](docs/AWS_INFRASTRUCTURE.md)** - Complete infrastructure guide
- **[POSTGRESQL_TUNING.md](docs/POSTGRESQL_TUNING.md)** - Performance optimization
- **[PASSWORD_ROTATION.md](docs/PASSWORD_ROTATION.md)** - Security procedures

## Configuration Files

### PostgreSQL Configs

- **postgresql-optimized.conf** - Performance-tuned for 8GB RAM + PostGIS
- **postgresql-security.conf** - Security settings (no password logging)

These configs are embedded in the launch template and applied automatically.

## Launch Template

**Name**: `shadowcheck-spot-template`  
**Current Version**: 5  
**Region**: us-east-1

**Features:**

- Automated PostgreSQL setup with optimized XFS filesystem
- SSL/TLS certificates (self-signed, 10-year validity)
- Docker Compose with persistent data volume
- Performance tuning for PostGIS workloads
- Secure logging (no password exposure)

## Cost Breakdown

| Component           | Monthly Cost |
| ------------------- | ------------ |
| t4g.large Spot      | ~$22         |
| 30GB GP3 Storage    | $4.80        |
| S3 Backups          | ~$0.25       |
| **Total (running)** | **~$27**     |
| **Total (stopped)** | **$4.80**    |

## Security

- **Network**: Security group restricts PostgreSQL to single IP (68.41.168.87/32)
- **Access**: SSM only (no SSH)
- **Authentication**: SCRAM-SHA-256 with SSL/TLS required
- **Logging**: Password-safe configuration

## Maintenance

### Start Instance

```bash
aws ec2 start-instances --instance-ids i-INSTANCE_ID --region us-east-1
```

### Stop Instance

```bash
aws ec2 stop-instances --instance-ids i-INSTANCE_ID --region us-east-1
```

### Backup Database

```bash
# Via SSM session
cd /home/ssm-user
docker exec shadowcheck_postgres pg_dump -U shadowcheck_user shadowcheck_db | gzip > backup-$(date +%Y%m%d).sql.gz
```

## Monitoring

### Check Instance Status

```bash
aws ec2 describe-instances --instance-ids i-INSTANCE_ID --region us-east-1 --query 'Reservations[0].Instances[0].State.Name'
```

### Check Spot Price

```bash
aws ec2 describe-spot-price-history --instance-types t4g.large --region us-east-1 --start-time $(date -u +%Y-%m-%dT%H:%M:%S) --product-descriptions "Linux/UNIX" --query 'SpotPriceHistory[0].SpotPrice'
```

## Troubleshooting

See individual documentation files for detailed troubleshooting:

- Infrastructure issues → `docs/AWS_INFRASTRUCTURE.md`
- Performance problems → `docs/POSTGRESQL_TUNING.md`
- Password/auth issues → `docs/PASSWORD_ROTATION.md`
