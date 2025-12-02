# Production Deployment Guide

Complete step-by-step guide to deploy your applications with Traefik reverse proxy.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Prerequisites](#prerequisites)
3. [Server Setup](#server-setup)
4. [DNS Configuration](#dns-configuration)
5. [Deploy Traefik](#deploy-traefik)
6. [Deploy App1 (Next.js + NestJS)](#deploy-app1)
7. [Deploy App2 (React + NestJS)](#deploy-app2)
8. [Deploy Monitoring (Optional)](#deploy-monitoring)
9. [Verify Deployment](#verify-deployment)
10. [Maintenance Commands](#maintenance-commands)
11. [Troubleshooting](#troubleshooting)

---

## Project Structure

```
traefik-proxy/
│
├── 📄 .env.example                      # Environment variables template
├── 📄 docker-compose.traefik.yml        # Traefik reverse proxy
├── 📄 docker-compose.monitoring.yml     # Prometheus + Grafana stack
├── 📄 docker-compose.portainer.yml      # Docker management GUI
├── 📄 DEPLOYMENT.md                     # This deployment guide
├── 📄 README.md                         # Project overview
│
├── 📁 letsencrypt/                      # SSL certificates (created on deploy)
│   └── 📄 acme.json                     # Let's Encrypt certificates
│
├── 📁 logs/                             # Log files (created on deploy)
│   └── 📁 traefik/
│       └── 📄 access.log
│
├── 📁 traefik/                          # Traefik configuration
│   ├── 📄 traefik.yml                   # Main Traefik config
│   └── 📁 dynamic/
│       └── 📄 middlewares.yml           # Security middlewares (rate-limit, headers, etc.)
│
├── 📁 monitoring/                       # Monitoring stack configuration
│   ├── 📁 prometheus/
│   │   ├── 📄 prometheus.yml            # Prometheus scrape config
│   │   └── 📄 alerts.yml                # Alert rules
│   └── 📁 grafana/
│       ├── 📁 dashboards/               # Custom Grafana dashboards
│       └── 📁 provisioning/
│           ├── 📁 dashboards/           # Dashboard provisioning
│           └── 📁 datasources/          # Datasource provisioning
│
├── 📁 scripts/
│   └── 📄 new-app.sh                    # Script to scaffold new apps
│
└── 📁 apps/                             # Application stacks
    │
    ├── 📁 app1/                         # Next.js + NestJS + PostgreSQL + Redis
    │   ├── 📄 docker-compose.yml        # App1 compose file
    │   ├── 📄 .env.example              # App1 environment template
    │   ├── 📁 frontend/
    │   │   ├── 📄 Dockerfile            # Next.js multi-stage build
    │   │   ├── 📄 .dockerignore
    │   │   ├── 📄 package.json
    │   │   ├── 📄 next.config.js        # Must have output: 'standalone'
    │   │   └── 📁 src/                  # Your Next.js source code
    │   ├── 📁 backend/
    │   │   ├── 📄 Dockerfile            # NestJS multi-stage build
    │   │   ├── 📄 .dockerignore
    │   │   ├── 📄 package.json
    │   │   └── 📁 src/                  # Your NestJS source code
    │   └── 📁 init-scripts/             # PostgreSQL init scripts (optional)
    │       └── 📄 .gitkeep
    │
    ├── 📁 app2/                         # React + NestJS + PostgreSQL + Redis
    │   ├── 📄 docker-compose.yml        # App2 compose file
    │   ├── 📄 .env.example              # App2 environment template
    │   ├── 📁 frontend/
    │   │   ├── 📄 Dockerfile            # React multi-stage build with Nginx
    │   │   ├── 📄 nginx.conf            # Nginx config for React SPA
    │   │   ├── 📄 .dockerignore
    │   │   ├── 📄 package.json
    │   │   └── 📁 src/                  # Your React source code
    │   ├── 📁 backend/
    │   │   ├── 📄 Dockerfile            # NestJS multi-stage build
    │   │   ├── 📄 .dockerignore
    │   │   ├── 📄 package.json
    │   │   └── 📁 src/                  # Your NestJS source code
    │   └── 📁 init-scripts/             # PostgreSQL init scripts (optional)
    │       └── 📄 .gitkeep
    │
    └── 📁 app3/                         # Template for additional apps
        └── 📄 docker-compose.yml
```

### File Descriptions

| File | Purpose |
|------|---------|
| `docker-compose.traefik.yml` | Main reverse proxy with SSL termination |
| `docker-compose.monitoring.yml` | Prometheus, Grafana, Node Exporter, cAdvisor |
| `docker-compose.portainer.yml` | Docker container management UI |
| `traefik/traefik.yml` | Traefik entrypoints, providers, certificate resolvers |
| `traefik/dynamic/middlewares.yml` | Reusable middlewares (rate-limit, security headers, CORS) |
| `apps/app1/docker-compose.yml` | Next.js frontend + NestJS API + PostgreSQL + Redis |
| `apps/app2/docker-compose.yml` | React frontend + NestJS API + PostgreSQL + Redis |

### Create Project Structure

Run the following commands to create all necessary directories and files:

```bash
# Create the main project directory
mkdir -p traefik-proxy
cd traefik-proxy

# Create all directories
mkdir -p letsencrypt
mkdir -p logs/traefik
mkdir -p traefik/dynamic
mkdir -p monitoring/prometheus
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/provisioning/dashboards
mkdir -p monitoring/grafana/provisioning/datasources
mkdir -p scripts
mkdir -p apps/app1/frontend
mkdir -p apps/app1/backend
mkdir -p apps/app1/init-scripts
mkdir -p apps/app2/frontend
mkdir -p apps/app2/backend
mkdir -p apps/app2/init-scripts

# Create empty placeholder files
touch letsencrypt/acme.json
chmod 600 letsencrypt/acme.json
touch logs/traefik/.gitkeep
touch monitoring/grafana/dashboards/.gitkeep
touch monitoring/grafana/provisioning/dashboards/.gitkeep
touch monitoring/grafana/provisioning/datasources/.gitkeep
touch apps/app1/init-scripts/.gitkeep
touch apps/app2/init-scripts/.gitkeep
```

### Create Configuration Files

#### 1. Root Environment File (.env.example)

```bash
cat > .env.example << 'EOF'
# =============================================================================
# Traefik Proxy Environment Variables
# =============================================================================
# Copy to .env and update values: cp .env.example .env
# =============================================================================

# Timezone
TZ=UTC

# Traefik Dashboard
DASHBOARD_HOST=traefik.yourdomain.com
# Generate with: htpasswd -nb admin password (double $$ signs)
DASHBOARD_CREDENTIALS=admin:$$apr1$$xyz$$hashedpassword

# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your-secure-grafana-password

# Portainer
PORTAINER_HOST=portainer.yourdomain.com
EOF
```

#### 2. Traefik Main Configuration (traefik/traefik.yml)

```bash
cat > traefik/traefik.yml << 'EOF'
# Traefik v3.0 Configuration
api:
  dashboard: true
  insecure: false

log:
  level: INFO
  filePath: /var/log/traefik/traefik.log

accessLog:
  filePath: /var/log/traefik/access.log

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
    http:
      tls:
        certResolver: letsencrypt

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik-network
  file:
    directory: /etc/traefik/dynamic
    watch: true

certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@domain.com  # ← CHANGE THIS!
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web
EOF
```

#### 3. Traefik Middlewares (traefik/dynamic/middlewares.yml)

```bash
cat > traefik/dynamic/middlewares.yml << 'EOF'
http:
  middlewares:
    # Security Headers
    secure-headers:
      headers:
        browserXssFilter: true
        contentTypeNosniff: true
        frameDeny: true
        stsIncludeSubdomains: true
        stsPreload: true
        stsSeconds: 31536000
        customFrameOptionsValue: "SAMEORIGIN"

    # Rate Limiting
    rate-limit:
      rateLimit:
        average: 100
        burst: 50
        period: 1s

    rate-limit-api:
      rateLimit:
        average: 50
        burst: 25
        period: 1s

    # CORS Headers
    cors-headers:
      headers:
        accessControlAllowMethods:
          - GET
          - POST
          - PUT
          - PATCH
          - DELETE
          - OPTIONS
        accessControlAllowHeaders:
          - Content-Type
          - Authorization
        accessControlAllowOriginList:
          - "https://app1.com"
          - "https://app2.com"
        accessControlMaxAge: 86400
        addVaryHeader: true

    # Compression
    compress:
      compress: {}
EOF
```

#### 4. Docker Compose - Traefik (docker-compose.traefik.yml)

```bash
cat > docker-compose.traefik.yml << 'EOF'
version: "3.8"

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
      - "8080:8080"
    environment:
      - TZ=${TZ:-UTC}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./traefik/dynamic:/etc/traefik/dynamic:ro
      - ./letsencrypt:/letsencrypt
      - ./logs/traefik:/var/log/traefik
    networks:
      - traefik-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik-dashboard.rule=Host(`${DASHBOARD_HOST:-traefik.localhost}`)"
      - "traefik.http.routers.traefik-dashboard.entrypoints=websecure"
      - "traefik.http.routers.traefik-dashboard.tls=true"
      - "traefik.http.routers.traefik-dashboard.tls.certresolver=letsencrypt"
      - "traefik.http.routers.traefik-dashboard.service=api@internal"
      - "traefik.http.routers.traefik-dashboard.middlewares=dashboard-auth"
      - "traefik.http.middlewares.dashboard-auth.basicauth.users=${DASHBOARD_CREDENTIALS}"

networks:
  traefik-network:
    name: traefik-network
    driver: bridge
EOF
```

#### 5. Docker Compose - Monitoring (docker-compose.monitoring.yml)

```bash
cat > docker-compose.monitoring.yml << 'EOF'
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:v2.47.0
    container_name: prometheus
    restart: unless-stopped
    # Uncomment for direct access: http://SERVER_IP:9090
    # ports:
    #   - "9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    networks:
      - traefik-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.prometheus.rule=Host(`prometheus.${DASHBOARD_HOST:-localhost}`)"
      - "traefik.http.routers.prometheus.entrypoints=websecure"
      - "traefik.http.routers.prometheus.tls=true"
      - "traefik.http.routers.prometheus.tls.certresolver=letsencrypt"
      - "traefik.http.services.prometheus.loadbalancer.server.port=9090"

  grafana:
    image: grafana/grafana:10.1.0
    container_name: grafana
    restart: unless-stopped
    # Uncomment for direct access: http://SERVER_IP:3001
    # ports:
    #   - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - traefik-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.grafana.rule=Host(`grafana.${DASHBOARD_HOST:-localhost}`)"
      - "traefik.http.routers.grafana.entrypoints=websecure"
      - "traefik.http.routers.grafana.tls=true"
      - "traefik.http.routers.grafana.tls.certresolver=letsencrypt"
      - "traefik.http.services.grafana.loadbalancer.server.port=3000"

networks:
  traefik-network:
    external: true

volumes:
  prometheus-data:
  grafana-data:
EOF
```

#### 6. Docker Compose - Portainer (docker-compose.portainer.yml)

```bash
cat > docker-compose.portainer.yml << 'EOF'
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    # Uncomment for direct access: http://SERVER_IP:9000
    # ports:
    #   - "9000:9000"
    security_opt:
      - no-new-privileges:true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - portainer-data:/data
    networks:
      - traefik-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Host(`${PORTAINER_HOST:-portainer.localhost}`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      - "traefik.http.routers.portainer.tls=true"
      - "traefik.http.routers.portainer.tls.certresolver=letsencrypt"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"

networks:
  traefik-network:
    external: true

volumes:
  portainer-data:
EOF
```

#### 7. Prometheus Configuration (monitoring/prometheus/prometheus.yml)

```bash
cat > monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'traefik'
    static_configs:
      - targets: ['traefik:8082']
EOF
```

### Create App1 Configuration Files (Next.js + NestJS)

#### App1 Environment File (apps/app1/.env.example)

```bash
cat > apps/app1/.env.example << 'EOF'
# App1 Configuration
APP1_DOMAIN=app1.com
NEXT_PUBLIC_API_URL=https://api.app1.com

# Database
DB_USER=app1user
DB_PASSWORD=your-secure-database-password
DB_NAME=app1db

# Security
JWT_SECRET=your-jwt-secret-minimum-32-characters-long
CORS_ORIGINS=https://app1.com,https://www.app1.com
EOF
```

#### App1 Docker Compose (apps/app1/docker-compose.yml)

```bash
cat > apps/app1/docker-compose.yml << 'EOF'
version: "3.8"

services:
  app1-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: app1-frontend
    restart: unless-stopped
    environment:
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-https://api.app1.com}
    networks:
      - traefik-network
      - app1-internal
    depends_on:
      app1-backend:
        condition: service_healthy
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=traefik-network"
      - "traefik.http.routers.app1-frontend.rule=Host(`${APP1_DOMAIN:-app1.com}`)"
      - "traefik.http.routers.app1-frontend.entrypoints=websecure"
      - "traefik.http.routers.app1-frontend.tls=true"
      - "traefik.http.routers.app1-frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.app1-frontend.loadbalancer.server.port=3000"
      - "traefik.http.routers.app1-frontend.middlewares=secure-headers@file,compress@file"

  app1-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: app1-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=4000
      - DATABASE_URL=postgresql://${DB_USER:-app1user}:${DB_PASSWORD:-password}@app1-db:5432/${DB_NAME:-app1db}
      - REDIS_URL=redis://app1-redis:6379
      - JWT_SECRET=${JWT_SECRET:-changeme}
      - CORS_ORIGINS=${CORS_ORIGINS:-https://app1.com}
    networks:
      - traefik-network
      - app1-internal
    depends_on:
      app1-db:
        condition: service_healthy
      app1-redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=traefik-network"
      - "traefik.http.routers.app1-backend.rule=Host(`api.${APP1_DOMAIN:-app1.com}`)"
      - "traefik.http.routers.app1-backend.entrypoints=websecure"
      - "traefik.http.routers.app1-backend.tls=true"
      - "traefik.http.routers.app1-backend.tls.certresolver=letsencrypt"
      - "traefik.http.services.app1-backend.loadbalancer.server.port=4000"
      - "traefik.http.routers.app1-backend.middlewares=cors-headers@file,rate-limit-api@file"

  app1-db:
    image: postgres:16-alpine
    container_name: app1-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${DB_USER:-app1user}
      - POSTGRES_PASSWORD=${DB_PASSWORD:-password}
      - POSTGRES_DB=${DB_NAME:-app1db}
    volumes:
      - app1-db-data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
    networks:
      - app1-internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-app1user}"]
      interval: 10s
      timeout: 5s
      retries: 5

  app1-redis:
    image: redis:7-alpine
    container_name: app1-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru
    volumes:
      - app1-redis-data:/data
    networks:
      - app1-internal
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  traefik-network:
    external: true
  app1-internal:
    driver: bridge

volumes:
  app1-db-data:
  app1-redis-data:
EOF
```

#### App1 Next.js Dockerfile (apps/app1/frontend/Dockerfile)

```bash
cat > apps/app1/frontend/Dockerfile << 'EOF'
# Next.js Production Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

COPY . .
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm build; \
  fi

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
EOF
```

#### App1 NestJS Dockerfile (apps/app1/backend/Dockerfile)

```bash
cat > apps/app1/backend/Dockerfile << 'EOF'
# NestJS Production Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

COPY . .
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm build; \
  fi

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile --production; \
  elif [ -f package-lock.json ]; then npm ci --only=production; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile --prod; \
  fi

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

USER nestjs
EXPOSE 4000
ENV PORT=4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/main.js"]
EOF
```

#### App1 .dockerignore Files

```bash
# Frontend .dockerignore
cat > apps/app1/frontend/.dockerignore << 'EOF'
node_modules
.next
.git
.gitignore
README.md
Dockerfile
.dockerignore
.env*
EOF

# Backend .dockerignore
cat > apps/app1/backend/.dockerignore << 'EOF'
node_modules
dist
.git
.gitignore
README.md
Dockerfile
.dockerignore
.env*
EOF
```

### Create App2 Configuration Files (React + NestJS)

#### App2 Environment File (apps/app2/.env.example)

```bash
cat > apps/app2/.env.example << 'EOF'
# App2 Configuration
APP2_DOMAIN=app2.com
REACT_APP_API_URL=https://api.app2.com

# Database
DB_USER=app2user
DB_PASSWORD=your-secure-database-password
DB_NAME=app2db

# Security
JWT_SECRET=your-jwt-secret-minimum-32-characters-long
CORS_ORIGINS=https://app2.com,https://www.app2.com
EOF
```

#### App2 Docker Compose (apps/app2/docker-compose.yml)

```bash
cat > apps/app2/docker-compose.yml << 'EOF'
version: "3.8"

services:
  app2-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - REACT_APP_API_URL=${REACT_APP_API_URL:-https://api.app2.com}
    container_name: app2-frontend
    restart: unless-stopped
    networks:
      - traefik-network
      - app2-internal
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=traefik-network"
      - "traefik.http.routers.app2-frontend.rule=Host(`${APP2_DOMAIN:-app2.com}`)"
      - "traefik.http.routers.app2-frontend.entrypoints=websecure"
      - "traefik.http.routers.app2-frontend.tls=true"
      - "traefik.http.routers.app2-frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.app2-frontend.loadbalancer.server.port=80"
      - "traefik.http.routers.app2-frontend.middlewares=secure-headers@file,compress@file"

  app2-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: app2-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=4000
      - DATABASE_URL=postgresql://${DB_USER:-app2user}:${DB_PASSWORD:-password}@app2-db:5432/${DB_NAME:-app2db}
      - REDIS_URL=redis://app2-redis:6379
      - JWT_SECRET=${JWT_SECRET:-changeme}
      - CORS_ORIGINS=${CORS_ORIGINS:-https://app2.com}
    networks:
      - traefik-network
      - app2-internal
    depends_on:
      app2-db:
        condition: service_healthy
      app2-redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=traefik-network"
      - "traefik.http.routers.app2-backend.rule=Host(`api.${APP2_DOMAIN:-app2.com}`)"
      - "traefik.http.routers.app2-backend.entrypoints=websecure"
      - "traefik.http.routers.app2-backend.tls=true"
      - "traefik.http.routers.app2-backend.tls.certresolver=letsencrypt"
      - "traefik.http.services.app2-backend.loadbalancer.server.port=4000"
      - "traefik.http.routers.app2-backend.middlewares=cors-headers@file,rate-limit-api@file"

  app2-db:
    image: postgres:16-alpine
    container_name: app2-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${DB_USER:-app2user}
      - POSTGRES_PASSWORD=${DB_PASSWORD:-password}
      - POSTGRES_DB=${DB_NAME:-app2db}
    volumes:
      - app2-db-data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
    networks:
      - app2-internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-app2user}"]
      interval: 10s
      timeout: 5s
      retries: 5

  app2-redis:
    image: redis:7-alpine
    container_name: app2-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru
    volumes:
      - app2-redis-data:/data
    networks:
      - app2-internal
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  traefik-network:
    external: true
  app2-internal:
    driver: bridge

volumes:
  app2-db-data:
  app2-redis-data:
EOF
```

#### App2 React Dockerfile (apps/app2/frontend/Dockerfile)

```bash
cat > apps/app2/frontend/Dockerfile << 'EOF'
# React Production Dockerfile with Nginx
FROM node:20-alpine AS builder
WORKDIR /app

ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

COPY . .
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm build; \
  fi

FROM nginx:alpine AS runner
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -q --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
EOF
```

#### App2 Nginx Config (apps/app2/frontend/nginx.conf)

```bash
cat > apps/app2/frontend/nginx.conf << 'EOF'
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
```

#### App2 NestJS Dockerfile (apps/app2/backend/Dockerfile)

```bash
cat > apps/app2/backend/Dockerfile << 'EOF'
# NestJS Production Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

COPY . .
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm build; \
  fi

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile --production; \
  elif [ -f package-lock.json ]; then npm ci --only=production; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile --prod; \
  fi

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

USER nestjs
EXPOSE 4000
ENV PORT=4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q --spider http://localhost:4000/health || exit 1

CMD ["node", "dist/main.js"]
EOF
```

#### App2 .dockerignore Files

```bash
# Frontend .dockerignore
cat > apps/app2/frontend/.dockerignore << 'EOF'
node_modules
build
.git
.gitignore
README.md
Dockerfile
.dockerignore
.env*
EOF

# Backend .dockerignore
cat > apps/app2/backend/.dockerignore << 'EOF'
node_modules
dist
.git
.gitignore
README.md
Dockerfile
.dockerignore
.env*
EOF
```

### Verify Structure

After running all commands, verify the structure:

```bash
# List the complete structure
find . -type f -name "*.yml" -o -name "*.yaml" -o -name "Dockerfile" -o -name ".env*" -o -name "*.conf" | sort

# Expected output:
# ./.env.example
# ./apps/app1/.env.example
# ./apps/app1/backend/Dockerfile
# ./apps/app1/docker-compose.yml
# ./apps/app1/frontend/Dockerfile
# ./apps/app2/.env.example
# ./apps/app2/backend/Dockerfile
# ./apps/app2/docker-compose.yml
# ./apps/app2/frontend/Dockerfile
# ./apps/app2/frontend/nginx.conf
# ./docker-compose.monitoring.yml
# ./docker-compose.portainer.yml
# ./docker-compose.traefik.yml
# ./monitoring/prometheus/prometheus.yml
# ./traefik/dynamic/middlewares.yml
# ./traefik/traefik.yml
```

---

## Prerequisites

- Ubuntu 22.04 LTS server (or similar Linux distribution)
- Root or sudo access
- Domain names pointing to your server IP
- At least 2GB RAM, 2 CPU cores recommended

---

## Server Setup

### Step 1: SSH into your server

```bash
ssh root@your-server-ip
# or
ssh user@your-server-ip
```

### Step 2: Update system packages

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 3: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Start Docker and enable on boot
sudo systemctl start docker
sudo systemctl enable docker

# Add your user to docker group (optional, avoids sudo)
sudo usermod -aG docker $USER

# Apply group changes (or logout and login)
newgrp docker
```

### Step 4: Verify Docker installation

```bash
docker --version
docker compose version
```

---

## DNS Configuration

Configure your DNS records (assuming your server IP is `123.45.67.89`):

### App1 DNS Records

| Type | Name | Value |
|------|------|-------|
| A | app1.com | 123.45.67.89 |
| A | www.app1.com | 123.45.67.89 |
| A | api.app1.com | 123.45.67.89 |

### App2 DNS Records

| Type | Name | Value |
|------|------|-------|
| A | app2.com | 123.45.67.89 |
| A | www.app2.com | 123.45.67.89 |
| A | api.app2.com | 123.45.67.89 |

### Management DNS Records (Optional)

| Type | Name | Value |
|------|------|-------|
| A | traefik.yourdomain.com | 123.45.67.89 |
| A | grafana.yourdomain.com | 123.45.67.89 |
| A | portainer.yourdomain.com | 123.45.67.89 |

**Wait for DNS propagation (5-30 minutes) before proceeding.**

Verify DNS:

```bash
# Check DNS resolution
dig +short app1.com
dig +short api.app1.com
```

---

## Deploy Traefik

### Step 1: Clone or transfer your project

```bash
# Create project directory
mkdir -p /opt/project
cd /opt/project

# Option A: Clone from Git
git clone https://github.com/yourusername/your-repo.git traefik-proxy
cd traefik-proxy


### Step 3: Update Traefik configuration

```bash
# Edit traefik.yml - update your email for Let's Encrypt
nano traefik/traefik.yml
```

Update the email:

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: your-real-email@domain.com  # ← Change this!
```

### Step 4: Create required directories and files

```bash
# Create SSL certificate storage
mkdir -p letsencrypt
touch letsencrypt/acme.json
chmod 600 letsencrypt/acme.json

# Create log directory
mkdir -p logs/traefik
```

### Step 5: Create the Traefik network

```bash
docker network create traefik-network
```

### Step 6: Start Traefik

```bash
docker compose -f docker-compose.traefik.yml up -d
```

### Step 7: Verify Traefik is running

```bash
# Check container status
docker ps | grep traefik

# Check logs
docker logs traefik -f

# Test dashboard (if DNS configured)
curl -I https://traefik.yourdomain.com

# Alternative: Test via localhost (if DNS not configured)
curl -I http://localhost:8080/dashboard/
# Or via server IP
curl -I http://YOUR_SERVER_IP:8080/dashboard/
```

---

## Deploy App1

**Stack: Next.js (Frontend) + NestJS (Backend) + PostgreSQL + Redis**

### Step 1: Prepare your application code

```bash
cd apps/app1

# Your project structure should look like:
# apps/app1/
# ├── docker-compose.yml
# ├── .env
# ├── frontend/
# │   ├── Dockerfile
# │   ├── package.json
# │   ├── next.config.js (with output: 'standalone')
# │   └── ... (your Next.js code)
# ├── backend/
# │   ├── Dockerfile
# │   ├── package.json
# │   └── ... (your NestJS code)
# └── init-scripts/
#     └── (optional SQL scripts)
```

### Step 2: Configure Next.js for standalone build

In your Next.js `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // Required for Docker
  // ... other config
}

module.exports = nextConfig
```

### Step 3: Add health check endpoint to Next.js

Create `pages/api/health.js` or `app/api/health/route.js`:

```javascript
// pages/api/health.js (Pages Router)
export default function handler(req, res) {
  res.status(200).json({ status: 'ok' });
}

// OR app/api/health/route.js (App Router)
export async function GET() {
  return Response.json({ status: 'ok' });
}
```

### Step 4: Add health check endpoint to NestJS

In your NestJS `app.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

### Step 5: Configure environment variables

```bash
# Copy and edit environment file
cp .env.example .env
nano .env
```

**Update `.env`:**

```env
APP1_DOMAIN=app1.com
NEXT_PUBLIC_API_URL=https://api.app1.com

DB_USER=app1user
DB_PASSWORD=super-secure-password-here-123!
DB_NAME=app1db

JWT_SECRET=your-jwt-secret-minimum-32-characters-long
CORS_ORIGINS=https://app1.com,https://www.app1.com
```

### Step 6: Build and deploy

```bash
# Build and start all services
docker compose up -d --build

# Watch the logs
docker compose logs -f
```

### Step 7: Verify deployment

```bash
# Check all containers are running
docker compose ps

# Test frontend
curl -I https://app1.com

# Test backend API
curl https://api.app1.com/health

# Check database connection
docker exec -it app1-db psql -U app1user -d app1db -c "SELECT 1;"

# Check Redis
docker exec -it app1-redis redis-cli ping
```

---

## Deploy App2

**Stack: React.js (Frontend) + NestJS (Backend) + PostgreSQL + Redis**

### Step 1: Prepare your application code

```bash
cd apps/app2

# Your project structure should look like:
# apps/app2/
# ├── docker-compose.yml
# ├── .env
# ├── frontend/
# │   ├── Dockerfile
# │   ├── nginx.conf
# │   ├── package.json
# │   └── ... (your React code)
# ├── backend/
# │   ├── Dockerfile
# │   ├── package.json
# │   └── ... (your NestJS code)
# └── init-scripts/
```

### Step 2: Configure environment variables

```bash
cp .env.example .env
nano .env
```

**Update `.env`:**

```env
APP2_DOMAIN=app2.com
REACT_APP_API_URL=https://api.app2.com

DB_USER=app2user
DB_PASSWORD=another-super-secure-password-456!
DB_NAME=app2db

JWT_SECRET=different-jwt-secret-for-app2-minimum-32-chars
CORS_ORIGINS=https://app2.com,https://www.app2.com
```

### Step 3: Build and deploy

```bash
docker compose up -d --build
docker compose logs -f
```

### Step 4: Verify deployment

```bash
curl -I https://app2.com
curl https://api.app2.com/health
```

---

## Deploy Monitoring

### Start Prometheus + Grafana

```bash
cd /opt/project/traefik-proxy

# Create monitoring directories
mkdir -p monitoring/prometheus monitoring/grafana/provisioning/datasources

# Start monitoring stack
docker compose -f docker-compose.monitoring.yml up -d

# Access Grafana
# URL: https://grafana.yourdomain.com
# Default: admin / (password from .env)

# Alternative: If DNS not configured
# URL: http://YOUR_SERVER_IP:3001
# (Grafana exposes port 3000 internally, mapped to 3001 if direct access enabled)
```

### Start Portainer

```bash
docker compose -f docker-compose.portainer.yml up -d

# Access Portainer
# URL: https://portainer.yourdomain.com
# Set admin password on first visit

# Alternative: If DNS not configured
# URL: http://YOUR_SERVER_IP:9000
# (Portainer's default web UI port)
```

---

## Verify Deployment

### Check all containers

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Expected output

```
NAMES             STATUS          PORTS
traefik           Up 2 hours      80/tcp, 443/tcp, 8082/tcp
app1-frontend     Up 1 hour       3000/tcp
app1-backend      Up 1 hour       4000/tcp
app1-db           Up 1 hour       5432/tcp
app1-redis        Up 1 hour       6379/tcp
app2-frontend     Up 1 hour       80/tcp
app2-backend      Up 1 hour       4000/tcp
app2-db           Up 1 hour       5432/tcp
app2-redis        Up 1 hour       6379/tcp
```

### Test SSL certificates

```bash
# Check certificate
echo | openssl s_client -servername app1.com -connect app1.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Maintenance Commands

### View logs

```bash
# Traefik logs
docker logs traefik -f --tail 100

# App1 logs
cd apps/app1
docker compose logs -f

# Specific service
docker compose logs -f app1-backend
```

### Restart services

```bash
# Restart single service
docker compose restart app1-backend

# Restart all app services
docker compose restart

# Restart Traefik
docker compose -f docker-compose.traefik.yml restart
```

### Update application

```bash
cd apps/app1

# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build

# Or rebuild specific service
docker compose up -d --build app1-frontend
```

### Database backup

```bash
# Backup App1 database
docker exec app1-db pg_dump -U app1user app1db > backup_app1_$(date +%Y%m%d).sql

# Restore
cat backup_app1_20241201.sql | docker exec -i app1-db psql -U app1user -d app1db
```

### Clean up unused resources

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (careful!)
docker volume prune

# Full cleanup
docker system prune -a
```

---

## Troubleshooting

### SSL Certificate Issues

```bash
# Check Traefik logs for ACME errors
docker logs traefik 2>&1 | grep -i acme

# Verify acme.json permissions
ls -la letsencrypt/acme.json
# Should be: -rw------- (600)

# Reset certificates (if corrupted)
rm letsencrypt/acme.json
touch letsencrypt/acme.json
chmod 600 letsencrypt/acme.json
docker restart traefik
```

### Container won't start

```bash
# Check detailed logs
docker logs container-name

# Check health status
docker inspect container-name | grep -A 10 Health

# Check resource usage
docker stats
```

### Database connection issues

```bash
# Test connection from backend container
docker exec -it app1-backend sh
# Inside container:
wget -q --spider http://app1-db:5432 && echo "DB reachable"
```

### Network issues

```bash
# List networks
docker network ls

# Inspect traefik network
docker network inspect traefik-network

# Verify container is on network
docker inspect app1-frontend | grep -A 10 Networks
```

### Common fixes

```bash
# Recreate containers
docker compose down
docker compose up -d

# Rebuild without cache
docker compose build --no-cache
docker compose up -d

# Reset everything
docker compose down -v  # Warning: removes volumes!
docker compose up -d --build
```

---

## Quick Reference

| Service | URL | Port |
|---------|-----|------|
| App1 Frontend | https://app1.com | 3000 |
| App1 API | https://api.app1.com | 4000 |
| App2 Frontend | https://app2.com | 80 |
| App2 API | https://api.app2.com | 4000 |
| Traefik Dashboard | https://traefik.yourdomain.com | 8080 |
| Grafana | https://grafana.yourdomain.com | 3000 |
| Portainer | https://portainer.yourdomain.com | 9000 |

---

**🎉 Deployment Complete!**

Your applications are now running with:

- ✅ Automatic HTTPS via Let's Encrypt
- ✅ Reverse proxy with Traefik
- ✅ PostgreSQL databases
- ✅ Redis caching
- ✅ Health checks
- ✅ Security headers
- ✅ Rate limiting
