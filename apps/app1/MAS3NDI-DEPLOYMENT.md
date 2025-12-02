# Mas3ndi Deployment Guide

> SMS Gateway Platform - Production Deployment with Traefik

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Deployment](#deployment)
5. [Database Management](#database-management)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Backup & Recovery](#backup--recovery)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Server Requirements
- **OS**: Ubuntu 22.04 LTS (recommended)
- **RAM**: Minimum 4GB (8GB recommended)
- **CPU**: 2+ cores
- **Storage**: 50GB+ SSD
- **Docker**: 24.0+
- **Docker Compose**: 2.20+

### Domain Configuration
Configure DNS A records:
```
mas3ndi.com      → YOUR_SERVER_IP
www.mas3ndi.com  → YOUR_SERVER_IP
api.mas3ndi.com  → YOUR_SERVER_IP
```

### Required Accounts
- **Arkessel**: SMS Gateway API key
- **Cloudinary**: File upload credentials
- **Paystack**: Payment processing keys

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/traefik-proxy.git
cd traefik-proxy

# 2. Start Traefik (if not already running)
docker compose -f docker-compose.traefik.yml up -d

# 3. Navigate to mas3ndi app
cd apps/app1

# 4. Configure environment
cp .env.example .env
nano .env  # Edit with your values

# 5. Deploy
./scripts/deploy.sh --build --migrate
```

---

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Domain
MAS3NDI_DOMAIN=mas3ndi.com

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=mas3ndi

# JWT (generate with: openssl rand -base64 64)
JWT_SECRET=<64-char-secret>
JWT_REFRESH_SECRET=<64-char-secret>

# Arkessel SMS
ARKESSEL_API_KEY=<your-api-key>
ARKESSEL_API_URL=https://sms.arkessel.com/api/v2

# Cloudinary
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>

# Paystack
PAYSTACK_SECRET_KEY=sk_live_xxx
PAYSTACK_PUBLIC_KEY=pk_live_xxx

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASSWORD=<password>
```

---

## Deployment

### Deployment Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Developer     │────▶│  GitHub Actions │────▶│   Production    │
│   Push to main  │     │  Build & Push   │     │   Pull & Run    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  GitHub         │
                        │  Container      │
                        │  Registry       │
                        └─────────────────┘
```

**Why this approach?**

- ✅ Faster deployments (no build time on server)
- ✅ Consistent images across environments
- ✅ Easy rollback to previous versions
- ✅ Source code not on production server
- ✅ Less server resources needed

### First-Time Deployment

```bash
# 1. Create Traefik network (if not exists)
docker network create traefik-network

# 2. Start Traefik
cd /path/to/traefik-proxy
docker compose -f docker-compose.traefik.yml up -d

# 3. Navigate to mas3ndi
cd apps/app1

# 4. Configure environment
cp .env.example .env
nano .env  # Set GITHUB_REPOSITORY and other values

# 5. Login to GitHub Container Registry
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# 6. Pull and deploy
docker compose pull
docker compose --profile migrations run --rm mas3ndi-migrations
docker compose up -d
```

### Update Deployment (CI/CD - Recommended)

Push to `main` branch triggers automatic deployment:

1. GitHub Actions builds Docker images
2. Images pushed to GitHub Container Registry
3. SSH to server and pull new images
4. Zero-downtime deployment

### Manual Deployment (Production)

```bash
cd apps/app1

# Pull latest images from registry
docker compose pull

# Run migrations
docker compose --profile migrations run --rm mas3ndi-migrations

# Start services (zero-downtime)
docker compose up -d

# View logs
docker compose logs -f
```

### Local Development Build

For local testing, use the build override:

```bash
# Build locally
docker compose -f docker-compose.yml -f docker-compose.build.yml build

# Run locally
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d
```

---

## Monitoring & Health Checks

### Manual Health Check

```bash
./scripts/health-check.sh
```

### Check SSL Certificates

```bash
./scripts/check-ssl.sh
```

### View Container Status

```bash
docker compose ps
docker compose logs -f mas3ndi-backend
```

### Access Points
| Service | URL |
|---------|-----|
| Frontend | https://mas3ndi.com |
| Backend API | https://api.mas3ndi.com |
| Health Check | https://api.mas3ndi.com/health |
| Traefik Dashboard | https://traefik.yourdomain.com |

---

## Backup & Recovery

### Create Backup

```bash
# Daily backup
./scripts/backup-db.sh daily

# Weekly backup
./scripts/backup-db.sh weekly

# Monthly backup
./scripts/backup-db.sh monthly
```

### Restore from Backup

```bash
./scripts/restore-db.sh /backups/daily/mas3ndi_20241201_020000.sql.gz
```

### Automated Backups (Cron)

```bash
# Edit crontab
crontab -e

# Add these lines:
# Daily at 2 AM
0 2 * * * /path/to/apps/app1/scripts/backup-db.sh daily
# Weekly on Sunday at 3 AM
0 3 * * 0 /path/to/apps/app1/scripts/backup-db.sh weekly
# Monthly on 1st at 4 AM
0 4 1 * * /path/to/apps/app1/scripts/backup-db.sh monthly
# Health check every 5 minutes
*/5 * * * * /path/to/apps/app1/scripts/health-check.sh
# SSL check daily at 9 AM
0 9 * * * /path/to/apps/app1/scripts/check-ssl.sh
```

---

## CI/CD Pipeline

### Git Branching Strategy

```
feature/xyz ──┐
              │
feature/abc ──┼──▶ develop ──────────▶ main ──────────▶ Production
              │       │                  │
feature/123 ──┘       │                  │
                      ▼                  ▼
                  ┌───────┐         ┌─────────┐
                  │  CI   │         │   CD    │
                  │ Tests │         │ Build & │
                  │ Only  │         │ Deploy  │
                  └───────┘         └─────────┘
```

### Workflow: Feature → Production

```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/new-sms-template

# 2. Develop your feature
# ... make changes ...
git add .
git commit -m "feat: add new SMS template"

# 3. Push and create PR to develop
git push origin feature/new-sms-template
# → Create PR: feature/new-sms-template → develop
# → CI runs tests automatically
# → Get code review and approval
# → Merge PR

# 4. When ready for production, create PR to main
# → Create PR: develop → main
# → CI runs tests again
# → Get approval from team lead
# → Merge PR
# → CD automatically builds and deploys to production!
```

### GitHub Actions Workflows

| Workflow | Trigger | What It Does |
|----------|---------|--------------|
| `mas3ndi-ci.yml` | Push to `develop`, PR to `develop`/`main` | Lint, type-check, run tests |
| `mas3ndi-cd.yml` | Push to `main` (after PR merge) | Build images → Push to registry → Deploy |
| `mas3ndi-rollback.yml` | Manual trigger | Rollback to previous version |

### Required GitHub Secrets

Set these in: Repository → Settings → Secrets and variables → Actions

```text
SSH_HOST            - Production server IP
SSH_USER            - SSH username (e.g., deploy)
SSH_PRIVATE_KEY     - SSH private key for deployment
SSH_PORT            - SSH port (default: 22)
DEPLOY_PATH         - Path to traefik-proxy on server
NEXT_PUBLIC_API_URL - API URL for frontend build
```

### Branch Protection Rules (Recommended)

Set in: Repository → Settings → Branches → Add rule

**For `develop` branch:**

- ✅ Require pull request before merging
- ✅ Require status checks to pass (select CI workflow)
- ✅ Require 1 approval

**For `main` branch:**

- ✅ Require pull request before merging
- ✅ Require status checks to pass (select CI workflow)
- ✅ Require 2 approvals (recommended for production)
- ✅ Dismiss stale approvals when new commits are pushed

### Manual Rollback

If something goes wrong after deployment:

1. Go to **Actions** → **Mas3ndi Rollback**
2. Click **Run workflow**
3. Enter the version/SHA to rollback to (e.g., `abc1234`)
4. Select service: `all`, `frontend`, or `backend`
5. Type `ROLLBACK` to confirm
6. Click **Run workflow**

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs mas3ndi-backend

# Check container status
docker inspect mas3ndi-backend

# Restart service
docker compose restart mas3ndi-backend
```

### Database Connection Issues

```bash
# Check if database is running
docker compose ps mas3ndi-db

# Test connection
docker exec mas3ndi-db pg_isready -U postgres

# Check database logs
docker compose logs mas3ndi-db
```

### SSL Certificate Issues

```bash
# Check certificate status
./scripts/check-ssl.sh

# Force certificate renewal
docker compose -f docker-compose.traefik.yml restart traefik
```

### Redis Connection Issues

```bash
# Check Redis status
docker exec mas3ndi-redis redis-cli ping

# Check Redis logs
docker compose logs mas3ndi-redis
```

### Out of Memory

```bash
# Check memory usage
docker stats

# Increase container limits in docker-compose.yml
# Restart with new limits
docker compose up -d
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Traefik Reverse Proxy                     │
│              (SSL Termination, Load Balancing)               │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Frontend    │   │    Backend    │   │   Monitoring  │
│   (Next.js)   │   │   (Express)   │   │  (Prometheus) │
│   Port 3000   │   │   Port 3000   │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼
┌───────────────┐   ┌───────────────┐
│  PostgreSQL   │   │     Redis     │
│   Database    │   │  Cache/Queue  │
└───────────────┘   └───────────────┘
```

---

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review container logs: `docker compose logs -f`
3. Check GitHub Issues
4. Contact the development team
