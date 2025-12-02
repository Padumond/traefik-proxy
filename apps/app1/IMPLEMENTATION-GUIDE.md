# Mas3ndi Implementation Guide

> Complete step-by-step guide to deploy Mas3ndi (App1) from development to production.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Part 1: GitHub Setup](#part-1-github-setup)
4. [Part 2: Server Preparation](#part-2-server-preparation)
5. [Part 3: Deploy Mas3ndi](#part-3-deploy-mas3ndi)
6. [Part 4: CI/CD Configuration](#part-4-cicd-configuration)
7. [Part 5: Testing & Verification](#part-5-testing--verification)

---

## Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DEPLOYMENT FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐        │
│   │   GitHub     │         │   GitHub     │         │  Production  │        │
│   │   Mas3ndi    │────────▶│   Actions    │────────▶│   Server     │        │
│   │   Repo       │         │   CI/CD      │         │              │        │
│   └──────────────┘         └──────────────┘         └──────────────┘        │
│         │                        │                        │                  │
│         │                        ▼                        │                  │
│         │                  ┌──────────────┐               │                  │
│         │                  │   GitHub     │               │                  │
│         │                  │   Container  │◀──────────────┘                  │
│         │                  │   Registry   │    (pulls images)                │
│         │                  └──────────────┘                                  │
│         │                                                                    │
│         ▼                                                                    │
│   ┌──────────────────────────────────────────────────────────────────┐      │
│   │                    MAS3NDI REPO STRUCTURE                         │      │
│   │   mas3ndi/                                                        │      │
│   │   ├── frontend/          ──┐                                      │      │
│   │   │   ├── package.json     │                                      │      │
│   │   │   ├── next.config.ts   │   Copied to                          │      │
│   │   │   └── src/             │   apps/app1/frontend/                │      │
│   │   │                        │                                      │      │
│   │   ├── backend/           ──┤                                      │      │
│   │   │   ├── package.json     │   Copied to                          │      │
│   │   │   ├── prisma/          │   apps/app1/backend/                 │      │
│   │   │   └── src/             │                                      │      │
│   │   │                      ──┘                                      │      │
│   │   └── docker-compose.yml   (development - NOT used)              │      │
│   └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│   ┌──────────────────────────────────────────────────────────────────┐      │
│   │                 PRODUCTION SERVER STRUCTURE                       │      │
│   │   /home/user/project/traefik-proxy/                              │      │
│   │   ├── traefik/                                                    │      │
│   │   ├── docker-compose.traefik.yml                                  │      │
│   │   └── apps/                                                       │      │
│   │       └── app1/                   ◀── MAS3NDI LIVES HERE          │      │
│   │           ├── frontend/           (from mas3ndi repo)             │      │
│   │           ├── backend/            (from mas3ndi repo)             │      │
│   │           ├── docker-compose.yml  (production config)             │      │
│   │           ├── .env                (production secrets)            │      │
│   │           └── scripts/            (automation scripts)            │      │
│   └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Git Flow

```
development ──────▶ staging ──────▶ main
     │                 │              │
     ▼                 ▼              ▼
  CI Tests         Deploy to      Deploy to
   Only            Staging        Production
```

---

## Prerequisites

### What You Need

| Item | Description |
|------|-------------|
| **GitHub Account** | With access to mas3ndi repository |
| **Production Server** | Ubuntu 22.04 LTS, 4GB+ RAM, 50GB+ SSD |
| **Domain Name** | e.g., `mas3ndi.com` with DNS access |
| **SSH Access** | To production server |

### Server Requirements

- Docker 24.0+
- Docker Compose 2.20+
- Git
- Nginx (optional, Traefik handles this)

---

## Part 1: GitHub Setup

### Step 1.1: Verify Repository Structure

Your mas3ndi repository should look like this:

```
mas3ndi/
├── frontend/

**A) Frontend Dockerfile (`frontend/Dockerfile`):**

```dockerfile
# =============================================================================
# Mas3ndi Frontend - Next.js 15 Production Build
# =============================================================================

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build argument for API URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**B) Backend Dockerfile (`backend/Dockerfile`):**

```dockerfile
# =============================================================================
# Mas3ndi Backend - Express.js + Prisma Production Build
# =============================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache openssl libc6-compat

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copy necessary files
COPY --from=builder --chown=expressjs:nodejs /app/dist ./dist
COPY --from=builder --chown=expressjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=expressjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=expressjs:nodejs /app/package.json ./

USER expressjs

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### Step 1.3: Update next.config.ts for Standalone Output

**In your `frontend/next.config.ts`, ensure you have:**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',  // ◀── REQUIRED for Docker
  // ... your other config
};

export default nextConfig;
```

### Step 1.4: Create GitHub Actions Workflows

Copy the workflow files from `traefik-proxy` repo to your mas3ndi repo:

```bash
# In your mas3ndi repo
mkdir -p .github/workflows

# Copy these files (we'll create them):
# - .github/workflows/ci.yml
# - .github/workflows/cd.yml
```

**Create `.github/workflows/ci.yml`:**

```yaml
name: Mas3ndi CI

on:
  push:
    branches: [development]
  pull_request:
    branches: [main, staging, development]

jobs:
  test-frontend:
    name: Test Frontend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build
        env:
          NEXT_PUBLIC_API_URL: https://api.example.com

  test-backend:
    name: Test Backend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

**Create `.github/workflows/cd.yml`:**

```yaml
name: Mas3ndi CD

on:
  push:
    branches: [main, staging]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME_FRONTEND: ${{ github.repository }}/frontend
  IMAGE_NAME_BACKEND: ${{ github.repository }}/backend

jobs:
  build:
    name: Build & Push Images
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set environment tag
        id: env
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "tag=latest" >> $GITHUB_OUTPUT
            echo "environment=production" >> $GITHUB_OUTPUT
          else
            echo "tag=staging" >> $GITHUB_OUTPUT
            echo "environment=staging" >> $GITHUB_OUTPUT
          fi

      - name: Build and push Frontend
        uses: docker/build-push-action@v5
        with:
          context: frontend
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_FRONTEND }}:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_FRONTEND }}:${{ steps.env.outputs.tag }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_URL }}

      - name: Build and push Backend
        uses: docker/build-push-action@v5
        with:
          context: backend
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_BACKEND }}:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_BACKEND }}:${{ steps.env.outputs.tag }}
          cache-from: type=gha,mode=max
          cache-to: type=gha,mode=max

  deploy:
    name: Deploy
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Set deployment variables
        id: vars
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "host=${{ secrets.PROD_SSH_HOST }}" >> $GITHUB_OUTPUT
            echo "user=${{ secrets.PROD_SSH_USER }}" >> $GITHUB_OUTPUT
            echo "key=${{ secrets.PROD_SSH_KEY }}" >> $GITHUB_OUTPUT
            echo "path=${{ secrets.PROD_DEPLOY_PATH }}" >> $GITHUB_OUTPUT
          else
            echo "host=${{ secrets.STAGING_SSH_HOST }}" >> $GITHUB_OUTPUT
            echo "user=${{ secrets.STAGING_SSH_USER }}" >> $GITHUB_OUTPUT
            echo "key=${{ secrets.STAGING_SSH_KEY }}" >> $GITHUB_OUTPUT
            echo "path=${{ secrets.STAGING_DEPLOY_PATH }}" >> $GITHUB_OUTPUT
          fi

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ steps.vars.outputs.host }}
          username: ${{ steps.vars.outputs.user }}
          key: ${{ steps.vars.outputs.key }}
          script: |
            cd ${{ steps.vars.outputs.path }}/apps/app1

            # Set image versions
            export FRONTEND_IMAGE="${{ env.REGISTRY }}/${{ env.IMAGE_NAME_FRONTEND }}:${{ github.sha }}"
            export BACKEND_IMAGE="${{ env.REGISTRY }}/${{ env.IMAGE_NAME_BACKEND }}:${{ github.sha }}"

            # Login to registry
            echo "${{ secrets.GHCR_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin

            # Pull and deploy
            docker compose pull
            docker compose --profile migrations run --rm mas3ndi-migrations
            docker compose up -d --remove-orphans
            docker image prune -f
```

### Step 1.5: Configure GitHub Secrets

Go to your **mas3ndi** repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | API URL for frontend | `https://api.mas3ndi.com` |
| `GHCR_TOKEN` | GitHub PAT with `write:packages` | `ghp_xxxx...` |
| **Production** | | |
| `PROD_SSH_HOST` | Production server IP | `192.168.1.100` |
| `PROD_SSH_USER` | SSH username | `deploy` |
| `PROD_SSH_KEY` | SSH private key | `-----BEGIN OPENSSH...` |
| `PROD_DEPLOY_PATH` | Path on server | `/home/deploy/traefik-proxy` |
| **Staging** | | |
| `STAGING_SSH_HOST` | Staging server IP | `192.168.1.101` |
| `STAGING_SSH_USER` | SSH username | `deploy` |
| `STAGING_SSH_KEY` | SSH private key | `-----BEGIN OPENSSH...` |
| `STAGING_DEPLOY_PATH` | Path on server | `/home/deploy/traefik-proxy` |

### Step 1.6: Create GitHub Personal Access Token (PAT)

1. Go to **GitHub** → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Give it a name: `mas3ndi-ghcr`
4. Select scopes:
   - ✅ `write:packages`
   - ✅ `read:packages`
   - ✅ `delete:packages`
5. Click **Generate token**
6. **Copy the token** and save it as `GHCR_TOKEN` secret

---

## Part 2: Server Preparation

### Step 2.1: Initial Server Setup

**SSH into your production server:**

```bash
ssh user@your-server-ip
```

**Update system and install dependencies:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw
```

### Step 2.2: Install Docker

```bash
# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group (logout/login required)
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker compose version
```

**IMPORTANT: Logout and login again for group changes to take effect!**

```bash
exit
ssh user@your-server-ip
```

### Step 2.3: Configure Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (important - don't lock yourself out!)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### Step 2.4: Create Project Directory Structure

```bash
# Create project directory
mkdir -p ~/project/traefik-proxy

# Create all subdirectories
cd ~/project/traefik-proxy
mkdir -p \
    letsencrypt \
    logs/traefik \
    traefik/dynamic \
    monitoring/prometheus \
    monitoring/grafana/dashboards \
    monitoring/grafana/provisioning/dashboards \
    monitoring/grafana/provisioning/datasources \
    scripts \
    apps/app1/frontend \
    apps/app1/backend \
    apps/app1/scripts \
    apps/app1/backups

# Verify structure
find . -type d | head -20
```

### Step 2.5: Create Deploy User (Recommended)

```bash
# Create deploy user
sudo adduser deploy

# Add to docker group
sudo usermod -aG docker deploy

# Create SSH directory for deploy user
sudo mkdir -p /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh

# Copy your authorized keys (so you can SSH as deploy)
sudo cp ~/.ssh/authorized_keys /home/deploy/.ssh/
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys

# Create project directory for deploy user
sudo mkdir -p /home/deploy/traefik-proxy
sudo chown -R deploy:deploy /home/deploy/traefik-proxy
```

### Step 2.6: Configure DNS

In your domain registrar (e.g., Namecheap, Cloudflare, GoDaddy), add these A records:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | `@` | `YOUR_SERVER_IP` | Auto |
| A | `www` | `YOUR_SERVER_IP` | Auto |
| A | `api` | `YOUR_SERVER_IP` | Auto |

**Example for `mas3ndi.com`:**
```
mas3ndi.com      → 192.168.1.100
www.mas3ndi.com  → 192.168.1.100
api.mas3ndi.com  → 192.168.1.100
```

---

## Part 3: Deploy Mas3ndi

### Step 3.1: Clone Traefik-Proxy Repository

```bash
# As deploy user
sudo su - deploy
cd ~

# Clone the traefik-proxy repository (contains docker-compose configs)
git clone https://github.com/YOUR_USERNAME/traefik-proxy.git

cd traefik-proxy
```

### Step 3.2: Setup Traefik (Reverse Proxy)

**Create Traefik configuration:**

```bash
# Create traefik.yml
cat > traefik/traefik.yml << 'EOF'
api:
  dashboard: true
  insecure: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik-network

certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web

log:
  level: INFO
  filePath: /logs/traefik.log

accessLog:
  filePath: /logs/access.log
EOF
```

**Create Traefik docker-compose:**

```bash
cat > docker-compose.traefik.yml << 'EOF'
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./traefik/dynamic:/etc/traefik/dynamic:ro
      - ./letsencrypt:/letsencrypt
      - ./logs/traefik:/logs
    networks:
      - traefik-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`traefik.mas3ndi.com`)"
      - "traefik.http.routers.dashboard.service=api@internal"
      - "traefik.http.routers.dashboard.entrypoints=websecure"
      - "traefik.http.routers.dashboard.tls.certresolver=letsencrypt"

networks:
  traefik-network:
    external: true
EOF
```

**Create the Traefik network and start Traefik:**

```bash
# Create the network
docker network create traefik-network

# Create acme.json for certificates
touch letsencrypt/acme.json
chmod 600 letsencrypt/acme.json

# Start Traefik
docker compose -f docker-compose.traefik.yml up -d

# Check logs
docker compose -f docker-compose.traefik.yml logs -f
```

### Step 3.3: Setup Mas3ndi Application

**Navigate to app1 directory and create docker-compose.yml:**

```bash
cd apps/app1

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # ==========================================================================
  # Frontend - Next.js 15
  # ==========================================================================
  mas3ndi-frontend:
    image: ${FRONTEND_IMAGE:-ghcr.io/YOUR_ORG/mas3ndi/frontend:latest}
    container_name: mas3ndi-frontend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    networks:
      - traefik-network
      - mas3ndi-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mas3ndi-frontend.rule=Host(`mas3ndi.com`) || Host(`www.mas3ndi.com`)"
      - "traefik.http.routers.mas3ndi-frontend.entrypoints=websecure"
      - "traefik.http.routers.mas3ndi-frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.mas3ndi-frontend.loadbalancer.server.port=3000"
    depends_on:
      - mas3ndi-backend

  # ==========================================================================
  # Backend - Express.js + Prisma
  # ==========================================================================
  mas3ndi-backend:
    image: ${BACKEND_IMAGE:-ghcr.io/YOUR_ORG/mas3ndi/backend:latest}
    container_name: mas3ndi-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@mas3ndi-db:5432/${POSTGRES_DB}?schema=public
      - REDIS_URL=redis://mas3ndi-redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - ARKESEL_API_KEY=${ARKESEL_API_KEY}
      - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
      - CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
      - CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
      - PAYSTACK_SECRET_KEY=${PAYSTACK_SECRET_KEY}
    networks:
      - traefik-network
      - mas3ndi-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mas3ndi-backend.rule=Host(`api.mas3ndi.com`)"
      - "traefik.http.routers.mas3ndi-backend.entrypoints=websecure"
      - "traefik.http.routers.mas3ndi-backend.tls.certresolver=letsencrypt"
      - "traefik.http.services.mas3ndi-backend.loadbalancer.server.port=3000"
    depends_on:
      mas3ndi-db:
        condition: service_healthy
      mas3ndi-redis:
        condition: service_healthy

  # ==========================================================================
  # Database - PostgreSQL 16
  # ==========================================================================
  mas3ndi-db:
    image: postgres:16-alpine
    container_name: mas3ndi-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - mas3ndi-postgres-data:/var/lib/postgresql/data
    networks:
      - mas3ndi-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ==========================================================================
  # Redis - Cache & Queue
  # ==========================================================================
  mas3ndi-redis:
    image: redis:7-alpine
    container_name: mas3ndi-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - mas3ndi-redis-data:/data
    networks:
      - mas3ndi-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ==========================================================================
  # Migrations (runs once)
  # ==========================================================================
  mas3ndi-migrations:
    image: ${BACKEND_IMAGE:-ghcr.io/YOUR_ORG/mas3ndi/backend:latest}
    container_name: mas3ndi-migrations
    command: npx prisma migrate deploy
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@mas3ndi-db:5432/${POSTGRES_DB}?schema=public
    networks:
      - mas3ndi-network
    depends_on:
      mas3ndi-db:
        condition: service_healthy
    profiles:
      - migrations

networks:
  traefik-network:
    external: true
  mas3ndi-network:
    driver: bridge

volumes:
  mas3ndi-postgres-data:
  mas3ndi-redis-data:
EOF
```

### Step 3.4: Create Environment File

```bash
# Create .env file
cat > .env << 'EOF'
# =============================================================================
# MAS3NDI PRODUCTION ENVIRONMENT
# =============================================================================

# Docker Images (set by CI/CD or manually)
FRONTEND_IMAGE=ghcr.io/YOUR_ORG/mas3ndi/frontend:latest
BACKEND_IMAGE=ghcr.io/YOUR_ORG/mas3ndi/backend:latest

# Domain
MAS3NDI_DOMAIN=mas3ndi.com

# Database
POSTGRES_USER=mas3ndi
POSTGRES_PASSWORD=CHANGE_THIS_TO_SECURE_PASSWORD
POSTGRES_DB=mas3ndi

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=CHANGE_THIS_TO_SECURE_SECRET

# Arkesel SMS Gateway
ARKESEL_API_KEY=your-arkesel-api-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Paystack
PAYSTACK_SECRET_KEY=your-paystack-secret-key
EOF

# Secure the .env file
chmod 600 .env
```

**IMPORTANT: Edit the .env file with your actual values!**

```bash
nano .env
```

### Step 3.5: Login to GitHub Container Registry

```bash
# Login to GHCR (use your GitHub PAT)
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### Step 3.6: Pull and Start Services

```bash
# Pull all images
docker compose pull

# Run database migrations
docker compose --profile migrations run --rm mas3ndi-migrations

# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### Step 3.7: Verify Deployment

```bash
# Check if services are running
docker compose ps

# Expected output:
# NAME                  STATUS
# mas3ndi-frontend      Up (healthy)
# mas3ndi-backend       Up (healthy)
# mas3ndi-db            Up (healthy)
# mas3ndi-redis         Up (healthy)

# Test health endpoints
curl -s http://localhost:3000/health

# Test via domain (after DNS propagation)
curl -s https://mas3ndi.com
curl -s https://api.mas3ndi.com/health
```

---

## Part 4: CI/CD Configuration

### Step 4.1: Generate SSH Key for CI/CD

**On your local machine:**

```bash
# Generate SSH key for CI/CD
ssh-keygen -t ed25519 -C "mas3ndi-deploy" -f ~/.ssh/mas3ndi-deploy -N ""

# Display the public key (add this to server)
cat ~/.ssh/mas3ndi-deploy.pub

# Display the private key (add this to GitHub Secrets)
cat ~/.ssh/mas3ndi-deploy
```

**On the server (as deploy user):**

```bash
# Add the public key to authorized_keys
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
```

### Step 4.2: Add GitHub Secrets

Go to your **mas3ndi** repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets (copy the private key including `-----BEGIN...` and `-----END...`):

| Secret | Value |
|--------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.mas3ndi.com` |
| `GHCR_TOKEN` | Your GitHub PAT |
| `PROD_SSH_HOST` | Server IP address |
| `PROD_SSH_USER` | `deploy` |
| `PROD_SSH_KEY` | Contents of `~/.ssh/mas3ndi-deploy` |
| `PROD_DEPLOY_PATH` | `/home/deploy/traefik-proxy` |

### Step 4.3: Test the Pipeline

**Push to development branch:**

```bash
# In your mas3ndi repo
git checkout development
git add .
git commit -m "feat: add Docker and CI/CD configuration"
git push origin development
```

**Check GitHub Actions:** Go to **Actions** tab and verify CI passes.

**Create PR to staging:**

1. Go to GitHub → **Pull requests** → **New pull request**
2. Base: `staging`, Compare: `development`
3. Create and merge the PR
4. CD will build images and deploy to staging

**Create PR to main (production):**

1. Go to GitHub → **Pull requests** → **New pull request**
2. Base: `main`, Compare: `staging`
3. Create and merge the PR
4. CD will build images and deploy to production

---

## Part 5: Testing & Verification

### Step 5.1: Verify All Services

```bash
# SSH to server
ssh deploy@your-server-ip

# Check all containers
docker ps

# Check Traefik logs
docker logs traefik

# Check Mas3ndi logs
cd ~/traefik-proxy/apps/app1
docker compose logs -f
```

### Step 5.2: Test Endpoints

```bash
# Frontend
curl -I https://mas3ndi.com
# Expected: HTTP/2 200

# Backend API
curl https://api.mas3ndi.com/health
# Expected: {"status":"ok"}

# Traefik Dashboard (if enabled)
curl -I https://traefik.mas3ndi.com
```

### Step 5.3: SSL Certificate Verification

```bash
# Check SSL certificate
echo | openssl s_client -servername mas3ndi.com -connect mas3ndi.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Quick Reference Commands

```bash
# View logs
docker compose logs -f mas3ndi-backend

# Restart a service
docker compose restart mas3ndi-backend

# Stop all services
docker compose down

# Start all services
docker compose up -d

# Run migrations
docker compose --profile migrations run --rm mas3ndi-migrations

# Pull latest images
docker compose pull

# Full redeploy
docker compose pull && docker compose up -d

# View running containers
docker ps

# Clean up old images
docker image prune -f
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs mas3ndi-backend

# Check container status
docker inspect mas3ndi-backend
```

### Database Connection Issues

```bash
# Test database connection
docker compose exec mas3ndi-db psql -U mas3ndi -d mas3ndi -c "SELECT 1"
```

### SSL Certificate Issues

```bash
# Check Traefik logs
docker logs traefik | grep -i acme

# Check acme.json permissions
ls -la letsencrypt/acme.json
# Should be: -rw------- (600)
```

### Image Pull Failed

```bash
# Verify login to GHCR
docker login ghcr.io

# Check image exists
docker pull ghcr.io/YOUR_ORG/mas3ndi/frontend:latest
```

---

## Next Steps

After successfully deploying App1 (Mas3ndi), you can:

1. **Set up monitoring** with Prometheus/Grafana
2. **Configure automated backups** for PostgreSQL
3. **Add App2** following the same pattern
4. **Set up staging environment** on a separate server
