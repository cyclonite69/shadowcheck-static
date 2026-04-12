# Quick Start Guide

**Note: This guide has been consolidated into the primary documentation.**

Please see the following canonical resources for up-to-date installation and setup instructions:

## 🚀 Recommended Resources

- **[Main README](../../README.md)** - Project overview, system requirements, and quick start commands.
- **[Installation Guide (Wiki)](../../.github/wiki/Installation.md)** - Comprehensive setup for all environments.
- **[Deployment Guide (Wiki)](../../.github/wiki/Deployment-Guide.md)** - Detailed deployment workflows (Local, Docker, AWS).
- **[AWS Quick Start](../../deploy/aws/QUICKSTART.md)** - 5-minute automated setup for AWS Spot instances.

## 🛠️ Quick Commands (Local Dev)

```bash
# 1. Clone and Install
git clone https://github.com/cyclonite69/shadowcheck-web.git
cd shadowcheck-web
npm install

# 2. Start Infrastructure (PostgreSQL + PostGIS, Redis)
docker compose up -d

# 3. Configure Environment
# Copy example env files if needed (non-secrets only)
cp .env.example .env

# 4. Start Development Server
npm run dev
```

---

_Last Updated: 2026-04-12_  
_Reason: Docs consolidation and legacy path cleanup._
