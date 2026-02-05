# Changelog

All notable changes to ShadowCheck will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Deployment Separation**: Organized AWS and home lab deployments into `deploy/` directory
  - AWS production configs in `deploy/aws/` with launch scripts and documentation
  - Home lab deployment guide in `deploy/homelab/` with automated setup script
  - Clear separation between cloud, self-hosted, and local development environments
- **Password Rotation System**: Automated database password rotation script
  - Environment-aware (detects local vs AWS automatically)
  - Generates cryptographically secure 32-character passwords
  - Updates all storage locations (secrets, keyring, .env, PostgreSQL)
  - Comprehensive documentation in `deploy/aws/docs/PASSWORD_ROTATION.md`
- **PostgreSQL Security Hardening**:
  - Logging configuration to prevent password exposure (`log_statement = 'none'`)
  - Docker logging limits (10MB × 3 files per container)
  - AWS launch template v4 with secure logging
- **PostgreSQL Performance Optimization**:
  - PostGIS-specific tuning (JIT compilation, increased work_mem to 16MB)
  - Autovacuum optimization for frequent updates
  - Query planner enhancements for partitioned tables
  - I/O timing tracking for NVMe performance monitoring
  - AWS launch template v5 with optimized configuration
  - Home lab configs for 4GB and 8GB RAM systems
- **Home Lab Deployment**:
  - Automated setup script with RAM detection
  - Hardware-specific PostgreSQL configs (Raspberry Pi, Intel NUC)
  - Comprehensive deployment guide with cost comparison
  - Support for x86_64 and ARM64 architectures
- Complete TypeScript migration for 60+ files (server utilities, middleware, ETL scripts, build tools)
- Production build pipeline with compiled TypeScript server for Docker deployment
- Comprehensive type safety with interfaces for database operations, API responses, and service layers
- TypeScript configuration files (tsconfig.json, tsconfig.server.json)
- OpenAPI 3.0 specification for comprehensive API documentation
- Husky pre-commit hooks with ESLint, Prettier, and secret detection
- Node.js version management with `.nvmrc` file
- Manufacturer field population via radio_manufacturers table JOIN
- Comprehensive regression tests for networks API data integrity

### Changed

- **Infrastructure Organization**: Moved AWS-specific files to `deploy/aws/`
  - `scripts/launch-shadowcheck-spot.sh` → `deploy/aws/scripts/`
  - `docs/AWS_INFRASTRUCTURE.md` → `deploy/aws/docs/`
  - PostgreSQL configs organized by environment
- **Documentation Structure**: Updated all references to new deployment paths
  - Main README includes deployment options (local, home lab, AWS)
  - Scripts README references new AWS paths
  - Deploy directory with environment-specific guides
- Build optimization: Frontend and server compile separately with proper path resolution
- Improved development workflow with automated code quality checks
- Networks API now uses latest observation data instead of aggregated materialized view
- Max distance calculation uses real PostGIS ST_Distance instead of signal strength arithmetic
- WiGLE observations table schema updated from 'public' to 'app' namespace

### Fixed

- Analytics card display: Removed incorrect "0 Total Observations" from navigation cards
- Dashboard threat level filtering: Threat severity counts now properly respect active filter selections
- Frontend dist path resolution for compiled server in Docker containers
- GeoSpatial table page showing incorrect default values (signal: 0 dBm, channel: 0, frequency: 0 MHz)
- Analytics widgets failures (Temporal Activity, Radio Types Over Time, Threat Score Trends)
- Max distance calculation returning ~238m instead of real geographic distances
- Threat score column sorting issues (rule_score, ml_score, ml_weight, ml_boost columns)
- WiGLE observation points not rendering due to schema mismatch
- Manufacturer field population with proper OUI prefix matching from BSSID MAC addresses
- Frontend data transformer field name mismatches (network_type → type, avg_score → avgScore)
- Missing API calls for temporal, radio-time, and threat-trends analytics endpoints

### Security

- PostgreSQL logging configured to prevent password exposure in logs
- Docker container logs limited to prevent disk exhaustion and credential retention
- Password rotation procedures documented with 60-90 day schedule
- Launch template security updates applied to AWS infrastructure

## [1.0.0] - 2025-12-10

### Added

- ML network reassessment feature for threat detection
- Network filtering, search, and threat tagging capabilities
- `/api/networks/tag-threats` endpoint for bulk threat tagging
- Radio icon system for network type visualization
- Community features and visibility improvements
- Demo-ready features and enhanced documentation
- Enhanced admin interface with visualization features
- Turbo SQLite import for fast data ingestion

### Changed

- Completely rewritten ML reassessment algorithm with improved accuracy
- Simplified ML scoring algorithm for better performance
- Enhanced surveillance detection UI with improved threat APIs
- Optimized network filtering and sorting

### Fixed

- Network tagging authentication requirement removed for better usability
- ML trainer threat/safe counting accuracy
- ML reassess data compatibility issues
- JSON parsing errors in ML reassess endpoint
- Admin page layout system stability
- Dashboard control buttons header visibility
- BaseComponents initialization across all pages
- Analytics API paths consistency
- Mapbox token management in admin page

### Security

- Removed hardcoded passwords from test files
- Implemented secretsManager for all credential handling
- Added pre-commit hooks with secret detection

## [0.9.0] - 2025-12-06

### Added

- Production-ready observability and monitoring
- Comprehensive secrets management system
- Mapbox token setup guide and documentation
- Network marker loading controls on geospatial page

### Changed

- Migrated to modular route architecture
- Improved error handling and logging
- Enhanced dashboard service initialization

### Fixed

- Missing mapbox settings endpoint handling
- Surveillance page API paths and column names
- Dashboard service initialization timing
- Undefined function references in network row handling
- Analytics page API endpoint paths

## [0.8.0] - 2025-12-05

### Added

- PostgreSQL 18 + PostGIS 3.6 Docker container setup
- React 18 + Vite frontend build system
- Threat detection algorithm v2 with improved scoring
- Network observation tracking with geospatial analysis
- WiGLE database integration
- User tagging system (LEGIT, FALSE_POSITIVE, INVESTIGATE, THREAT)

### Changed

- Migrated from local PostgreSQL to Dockerized setup
- Modernized frontend build pipeline with Vite
- Refactored API routes to v1 structure

### Security

- Implemented Docker secrets management
- Added keyring-based credential storage
- Enhanced SQL injection protection

## [0.7.0] - 2025-11-20

### Added

- Initial wireless network threat detection capabilities
- Basic dashboard and analytics
- Network discovery and tracking
- SQLite import functionality

### Changed

- Core database schema design
- Network aggregation logic

## [0.6.0] - 2025-11-01

### Added

- Initial project setup
- Basic Express.js server
- PostgreSQL database integration
- Network data models

---

## Version History Summary

- **1.0.0** (2025-12-10): ML enhancement, bulk tagging, improved UI/UX
- **0.9.0** (2025-12-06): Production observability, secrets management
- **0.8.0** (2025-12-05): Docker migration, React frontend, PostGIS integration
- **0.7.0** (2025-11-20): Core threat detection algorithms
- **0.6.0** (2025-11-01): Initial project foundation

---

## Types of Changes

- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements

---

For detailed API changes, see [API.md](docs/API.md).
For migration guides, see [docs/MIGRATION.md](docs/MIGRATION.md).
For security advisories, see [SECURITY.md](SECURITY.md).
