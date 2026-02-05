# ShadowCheck Secure AWS Infrastructure

## Security Configuration

### Network Security

**Security Group**: `sg-0c3b2c64455ee8571` (shadowcheck-secure-sg)

**Inbound Rules:**

- PostgreSQL (5432): Your IP only (68.41.168.87/32)
- SSH: BLOCKED (use SSM instead)
- All other ports: BLOCKED

**Outbound Rules:**

- All traffic allowed (for updates, S3, SSM)

### PostgreSQL Security

- **Authentication**: SCRAM-SHA-256 (strongest PostgreSQL auth)
- **Encryption**: SSL/TLS required for all connections
- **Certificate**: Self-signed (10-year validity)
- **Connection Policy**: SSL required, plain connections rejected
- **Password Rotation**: See `docs/security/PASSWORD_ROTATION.md` for rotation procedures

### Access Methods

- **Instance Access**: AWS Systems Manager (SSM) only - no SSH
- **Database Access**: PostgreSQL with SSL from your IP only
- **No public services**: No HTTP/HTTPS exposed

## Performance Tuning (8GB RAM)

### PostgreSQL Configuration

```
shared_buffers = 2GB              # 25% of RAM
effective_cache_size = 6GB        # 75% of RAM
maintenance_work_mem = 512MB      # For VACUUM, CREATE INDEX
work_mem = 16MB                   # Per query (optimized for PostGIS)
max_connections = 100             # Connection limit
```

### Parallel Processing

```
max_worker_processes = 2
max_parallel_workers = 2
max_parallel_workers_per_gather = 1
```

### WAL & Checkpoints

```
min_wal_size = 1GB
max_wal_size = 4GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
```

### PostGIS Optimization

```
jit = on                          # Just-in-time compilation
work_mem = 16MB                   # Complex spatial queries
random_page_cost = 1.1            # NVMe SSD optimization
effective_io_concurrency = 200    # High concurrent I/O
```

**See `docs/performance/POSTGRESQL_TUNING.md` for detailed tuning guide.**

```

### Storage Optimization
```

random_page_cost = 1.1 # Optimized for SSD
effective_io_concurrency = 200 # NVMe SSD

````

## Infrastructure

### Compute
- **Instance Type**: t4g.large (ARM Graviton2)
- **vCPUs**: 2
- **RAM**: 8 GB
- **Architecture**: ARM64 (aarch64)
- **Lifecycle**: Spot (persistent)
- **Max Price**: $0.05/hour
- **Current Price**: ~$0.03/hour

### Storage
- **Boot Volume**: 30 GB GP3 (OS)
- **Data Volume**: 30 GB GP3 (PostgreSQL)
  - IOPS: 3,000 baseline
  - Throughput: 125 MB/s
  - Filesystem: XFS
  - Mount: /var/lib/postgresql

### Database
- **Image**: postgis/postgis:18-3.6 (ARM64)
- **PostgreSQL**: 18.1
- **PostGIS**: 3.6.1
- **Extensions**: postgis, postgis_topology, postgis_tiger_geocoder

## Cost Breakdown

### Monthly (24/7 operation)
- Instance (Spot): ~$22/month
- Storage (60GB): $4.80/month
- S3 Backups: ~$0.25/month
- **Total**: ~$27/month

### When Stopped
- Storage only: $4.80/month

### Savings
- vs On-Demand: $27/month (55% discount)
- vs 100GB storage: $87/month saved on storage alone

## Connection Examples

### SSM (Instance Access)
```bash
aws ssm start-session --target i-035565c52ac4fa6dd --region us-east-1
````

### PostgreSQL (SSL Required)

```bash
# From your machine
psql "host=<PUBLIC_IP> port=5432 dbname=shadowcheck_db user=shadowcheck_user sslmode=require"

# From instance
docker exec -it shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db
```

### Docker Commands

```bash
# Start PostgreSQL
cd /home/ssm-user
./start-shadowcheck.sh

# View logs
docker logs -f shadowcheck_postgres

# Connect to database
docker exec -it shadowcheck_postgres psql -U shadowcheck_user -d shadowcheck_db
```

## Launch New Instance

```bash
cd /home/cyclonite01/ShadowCheckStatic
./scripts/launch-shadowcheck-spot.sh
```

This will:

1. Launch Spot instance with secure template
2. Attach PostgreSQL data volume
3. Auto-configure SSL certificates
4. Apply performance tuning
5. Enable SCRAM authentication
6. Pull PostgreSQL 18 + PostGIS 3.6 ARM64 image

## Security Best Practices Applied

✅ No SSH access (SSM only)
✅ Minimal security group (PostgreSQL from your IP only)
✅ SCRAM-SHA-256 authentication (strongest)
✅ SSL/TLS required for all database connections
✅ Self-signed certificates (can upgrade to Let's Encrypt)
✅ No public web services
✅ Encrypted data volume (can enable EBS encryption)
✅ IAM role for SSM (no credentials on instance)
✅ Spot instance (cost-optimized)
✅ Regular security updates via user data

## Next Steps

1. Launch instance with secure template
2. Set strong PostgreSQL password
3. Restore database from S3 backup
4. Test SSL connection from your machine
5. Configure automated S3 backups
6. (Optional) Enable EBS encryption for data volume
7. (Optional) Replace self-signed cert with Let's Encrypt

## Monitoring

- CloudWatch: Instance metrics
- PostgreSQL logs: `docker logs shadowcheck_postgres`
- Bootstrap log: `/var/log/shadowcheck-bootstrap.log`
- SSM Session Manager: Connection history in CloudWatch Logs
