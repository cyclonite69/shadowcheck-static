# ShadowCheck Documentation

This folder holds the long-form docs. Root `README.md` is the entry point for the repo.
The wiki in `.github/wiki/` is the primary source for diagram-heavy documentation.

## Current Status (Short)

- **Secrets**: AWS Secrets Manager only (no secrets on disk).
- **Data stack**: PostgreSQL 18 + PostGIS, Redis optional.
- **Frontend**: React + Vite (TypeScript).
- **Backend**: Express + TypeScript services/repositories.

## Doc Rules

- Do not add new docs unless they replace an existing page.
- Wiki is the primary source for diagrams; docs are for concise current state.

## Start Here
- [Architecture](ARCHITECTURE.md) - System overview and module organization.
- [Development](DEVELOPMENT.md) - Local dev setup and workflow.
- [Deployment](DEPLOYMENT.md) - Production deployment guidance.
- [Configuration](CONFIG.md) - Environment variables and configuration.
- [API Reference](API_REFERENCE.md) - REST endpoints.
 - [Wiki Home](../.github/wiki/Home.md) - Diagram-heavy documentation hub.
 - [Wiki Map](WIKI_MAP.md) - Docs ↔ wiki mapping.

## Development Guides
- [Frontend](CLIENT.md) - React components and client patterns.
- [Testing](TESTING.md) - Test strategy and commands.
- [Scripts](SCRIPTS.md) - Utility scripts and maintenance.

## Data & Infrastructure
- [Database](DATABASE_RADIO_ARCHITECTURE.md) - Schema and data design.
- [Redis](REDIS.md) - Caching and sessions.
- [Secrets](SECRETS.md) - Secrets management.
- [Auth](AUTH.md) - Authentication and authorization.

## Security
- [Security Policy](SECURITY_POLICY.md) - Disclosure and security posture.
- See `security/` for additional material.

## Optional/Internal
- `kiro/` - Job manifest and execution guides for internal quality passes.
- `bugfixes/` - Targeted fix plans and notes.

## Directory Map

```
docs/
├── README.md
├── ARCHITECTURE.md
├── API_REFERENCE.md
├── AUTH.md
├── CLIENT.md
├── CONFIG.md
├── DATABASE_RADIO_ARCHITECTURE.md
├── DEPLOYMENT.md
├── DEVELOPMENT.md
├── FEATURES.md
├── MODULARITY.md
├── PERFORMANCE_OPTIMIZATION_SUMMARY.md
├── REDIS.md
├── SCRIPTS.md
├── SECURITY_POLICY.md
├── SECRETS.md
├── TESTING.md
├── architecture/
├── bugfixes/
├── deployment/
├── development/
├── getting-started/
├── guides/
├── integrations/
├── kiro/
├── security/
├── setup/
└── testing/
```

### Features & UI

- [FEATURES.md](FEATURES.md) - Feature catalog
- [CLIENT.md](CLIENT.md) - Frontend docs
- `guides/` - Implementation guides

---

## Troubleshooting

- **[DEVELOPMENT.md](DEVELOPMENT.md#troubleshooting)** - Common development issues
- **[DEPLOYMENT.md](DEPLOYMENT.md#troubleshooting)** - Deployment issues

---

## Archive

Historical documentation is stored in `docs/archive/`:

- **sessions/** - Development session notes from 2025
- **bugfixes/** - Historical bug fix documentation

These files are kept for reference but are not actively maintained.

---

## Contributing

- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines
- **[CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)** - Community standards
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history

---

**Last Updated:** 2026-02-11
