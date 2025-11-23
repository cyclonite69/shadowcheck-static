# Changelog

All notable changes to ShadowCheck-Static will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- Added HTML escaping utility (`escapeHtml()`) to prevent XSS attacks
- Removed API key acceptance via query parameters (header-only now)
- Implemented CORS origin whitelist (configurable via `CORS_ORIGINS` env variable)
- Added request body size limiting (10MB) to prevent DoS attacks
- Improved error handling to prevent stack trace exposure in production

### Performance
- Configured database connection pool with limits (max: 20 connections)
- Reduced ARRAY_AGG limit from 1000 to 500 to prevent memory issues
- Added connection and idle timeouts to database pool
- Enabled gzip compression for responses

### Fixed
- Fixed XSS vulnerabilities in `surveillance.html` and `geospatial.html`
- Fixed validation logic for parseInt() parameters
- Fixed server startup behavior on database connection failure (now exits properly)
- Fixed ML model loading with graceful degradation
- Removed duplicate `MIN_VALID_TIMESTAMP` constant
- Fixed SQL query parameterization consistency

### Changed
- Server now exits on database connection failure (prevents running in broken state)
- Error handler now respects `NODE_ENV` for detailed logging
- Updated `.env.example` with new CORS_ORIGINS configuration
- Improved input validation across all endpoints

## [1.0.0] - 2025-11-23

### Added
- Initial release of ShadowCheck-Static
- Wireless network threat detection platform
- WiFi, Bluetooth, and cellular network analysis
- Geospatial visualization with Mapbox GL JS
- Machine learning threat scoring
- Network tagging system
- Analytics dashboards
- PostgreSQL with PostGIS backend
- Express.js RESTful API
- Static HTML/CSS/JS frontend

### Features
- Real-time network observation tracking
- Home/away pattern detection
- Distance-based threat scoring
- Multi-day observation analysis
- Movement speed calculations
- WiGLE API enrichment integration
- Manufacturer lookup (OUI database)
- Infinite scroll pagination
- Advanced filtering and sorting
- Export capabilities

[Unreleased]: https://github.com/yourusername/shadowcheck-static/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/shadowcheck-static/releases/tag/v1.0.0
