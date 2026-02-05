# Documentation Update Summary

## Files Updated (February 5, 2026)

### Core Documentation

✅ **README.md**

- Added `deploy/` directory to project structure
- Updated Quick Start with three deployment paths (local, home lab, AWS)
- Updated security section with password rotation reference
- Updated AWS script paths

✅ **CHANGELOG.md**

- Added "Deployment Separation" section
- Added "Password Rotation System" section
- Added "PostgreSQL Security Hardening" section
- Added "PostgreSQL Performance Optimization" section
- Added "Home Lab Deployment" section
- Added "Security" section with logging and rotation details

### Deployment Documentation

✅ **deploy/README.md** (NEW)

- Overview of deployment directory structure
- Environment comparison (AWS, home lab, local)
- Quick reference table
- Separation of concerns explanation

✅ **deploy/aws/README.md** (NEW)

- AWS deployment quick start
- Infrastructure overview
- Cost breakdown
- Security configuration
- Maintenance procedures

✅ **deploy/aws/docs/AWS_INFRASTRUCTURE.md** (MOVED)

- Moved from `docs/AWS_INFRASTRUCTURE.md`
- Added password rotation reference
- Updated performance tuning section with PostGIS optimizations

✅ **deploy/aws/docs/POSTGRESQL_TUNING.md** (MOVED)

- Moved from `docs/performance/POSTGRESQL_TUNING.md`
- Comprehensive PostgreSQL performance guide
- PostGIS-specific optimizations
- Monitoring queries
- Benchmarking procedures

✅ **deploy/aws/docs/PASSWORD_ROTATION.md** (MOVED)

- Moved from `docs/security/PASSWORD_ROTATION.md`
- Complete password rotation guide
- Local and AWS procedures
- Log security section
- Troubleshooting guide

✅ **deploy/homelab/README.md** (NEW)

- Comprehensive home lab deployment guide
- Hardware requirements (min/recommended)
- Quick start instructions
- Architecture options
- Performance tuning for different RAM sizes
- Network configuration
- Security hardening
- Backup strategies
- Cost comparison vs AWS
- Community contribution guidelines

### Configuration Files

✅ **deploy/aws/configs/postgresql-optimized.conf** (NEW)

- Complete PostgreSQL config for 8GB RAM + PostGIS
- All settings documented with explanations

✅ **deploy/aws/configs/postgresql-security.conf** (NEW)

- Security-focused PostgreSQL settings
- Password logging prevention

✅ **deploy/homelab/configs/postgresql-8gb.conf** (NEW)

- Home lab config for 8GB RAM systems
- Optimized for x86_64/ARM64

✅ **deploy/homelab/configs/postgresql-4gb.conf** (NEW)

- Home lab config for Raspberry Pi and low-memory systems
- Conservative settings for 4GB RAM

### Scripts

✅ **scripts/README.md**

- Updated AWS script path references
- Added password rotation to security section

✅ **scripts/rotate-db-password.sh** (NEW)

- Automated password rotation
- Environment detection (local vs AWS)
- Updates all storage locations

✅ **deploy/homelab/scripts/setup.sh** (NEW)

- Automated home lab setup
- RAM detection and config selection
- Password generation
- Database initialization

### Wiki Documentation

✅ **.github/wiki/Security.md**

- Added password rotation section
- Updated secrets management

✅ **.github/wiki/Installation.md**

- Updated production deployment section
- Added home lab deployment option
- Added AWS deployment option
- Added security setup section with password rotation

### Other Documentation

✅ **docs/DEPLOYMENT.md**

- Updated deployment options section
- Added home lab as primary option
- Added AWS production option
- Reorganized deployment strategies

## Files NOT Updated (Still Current)

The following files reference PostgreSQL 18 + PostGIS 3.6 and are still accurate:

- CLAUDE.md
- GEMINI.md
- WIKI.md
- CONTRIBUTING.md
- docs/ARCHITECTURE.md
- docs/DEVELOPMENT.md
- docs/setup/docker.md
- docs/setup/pgadmin.md
- .github/wiki/Architecture.md
- .github/wiki/Home.md

## New Directory Structure

```
deploy/
├── README.md                    # Deployment overview
├── aws/                         # AWS production
│   ├── scripts/
│   │   └── launch-shadowcheck-spot.sh
│   ├── configs/
│   │   ├── postgresql-optimized.conf
│   │   └── postgresql-security.conf
│   └── docs/
│       ├── AWS_INFRASTRUCTURE.md
│       ├── POSTGRESQL_TUNING.md
│       └── PASSWORD_ROTATION.md
└── homelab/                     # Self-hosted
    ├── scripts/
    │   └── setup.sh
    ├── configs/
    │   ├── postgresql-8gb.conf
    │   └── postgresql-4gb.conf
    └── README.md
```

## Key Changes Summary

1. **Deployment Separation**: AWS and home lab configs now in dedicated directories
2. **Password Rotation**: Complete system with automated script and documentation
3. **PostgreSQL Security**: Logging configured to prevent password exposure
4. **PostgreSQL Performance**: Optimized for PostGIS workloads (JIT, autovacuum, monitoring)
5. **Home Lab Support**: Full deployment guide with automated setup
6. **Documentation Organization**: Clear separation between environments

## Verification Checklist

- [x] All AWS paths updated to `deploy/aws/`
- [x] Password rotation documented and referenced
- [x] PostgreSQL versions consistent (18 + PostGIS 3.6)
- [x] Home lab deployment fully documented
- [x] CHANGELOG updated with recent changes
- [x] Wiki pages updated with new paths
- [x] Main README includes all deployment options
- [x] Scripts README references correct paths
- [x] Configuration files organized by environment

## Next Steps

If adding new features, update:

1. CHANGELOG.md (under [Unreleased])
2. README.md (if user-facing)
3. Relevant wiki pages
4. Deployment docs (if infrastructure changes)
