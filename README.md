# Traefik Multi-Application Reverse Proxy

A production-ready Traefik configuration for hosting multiple independent web applications on a single server using Docker.

## Architecture Overview

```text
                    ┌─────────────────────────────────────────────────────────┐
                    │                    TRAEFIK                               │
                    │              (Reverse Proxy)                             │
                    │         Ports 80 (HTTP) & 443 (HTTPS)                    │
                    └─────────────────────────────────────────────────────────┘
                                           │
           ┌───────────────────────────────┼───────────────────────────────┐
           │                               │                               │
           ▼                               ▼                               ▼
    ┌─────────────┐                ┌─────────────┐                ┌─────────────┐
    │    App 1    │                │    App 2    │                │    App 3    │
    ├─────────────┤                ├─────────────┤                ├─────────────┤
    │ Frontend    │                │ Frontend    │                │ Frontend    │
    │ app.com     │                │ app1.com    │                │ app3.com    │
    ├─────────────┤                ├─────────────┤                ├─────────────┤
    │ Backend     │                │ Backend     │                │ Backend     │
    │ api.app.com │                │ api.app1.com│                │ api.app3.com│
    └─────────────┘                └─────────────┘                └─────────────┘
```

## Quick Start

### 1. Start Traefik

```bash
# Create required directories
mkdir -p letsencrypt logs/traefik

# Start Traefik
docker-compose -f docker-compose.traefik.yml up -d
```

### 2. Deploy an Application

```bash
# Start Application 1
docker-compose -f apps/app1/docker-compose.yml up -d

# Start Application 2
docker-compose -f apps/app2/docker-compose.yml up -d
```

## Project Structure

```text
.
├── docker-compose.traefik.yml    # Main Traefik configuration
├── traefik/
│   ├── traefik.yml               # Traefik static configuration
│   └── dynamic/
│       └── middlewares.yml       # Reusable middlewares
├── apps/
│   ├── app1/
│   │   └── docker-compose.yml    # App 1 configuration
│   ├── app2/
│   │   └── docker-compose.yml    # App 2 configuration
│   └── app3/
│       └── docker-compose.yml    # App 3 configuration
├── scripts/
│   └── new-app.sh                # Script to generate new app configs
├── letsencrypt/                  # SSL certificates (auto-generated)
└── logs/                         # Traefik logs
```

## Adding a New Application

### Option 1: Use the Script

```bash
chmod +x scripts/new-app.sh
./scripts/new-app.sh newapp newapp.com api.newapp.com 3000
```

### Option 2: Manual Setup

1. Create a new directory: `mkdir -p apps/newapp`
2. Copy an existing docker-compose.yml
3. Update the following:
   - Container names (must be unique)
   - Router names (must be unique)
   - Service names (must be unique)
   - Domain names in Host rules
   - Backend port if different

## Key Concepts

### Networks

- **traefik-network**: Shared network for Traefik communication (external)
- **app-internal**: App-specific internal network for database connections

## Local Development Setup

For local development without real domains:

```bash
# Add to /etc/hosts (or C:\Windows\System32\drivers\etc\hosts on Windows)
127.0.0.1 app.local api.app.local
127.0.0.1 app1.local api.app1.local
127.0.0.1 app3.local api.app3.local
127.0.0.1 traefik.local
```

Then update your docker-compose files to use `.local` domains.

## Production Checklist

- [ ] Update `admin@yourdomain.com` in traefik.yml with your email
- [ ] Generate proper htpasswd for dashboard authentication
- [ ] Update CORS settings in middlewares.yml (remove `*`)
- [ ] Configure proper database passwords
- [ ] Set up proper DNS records for all domains
- [ ] Verify SSL certificates are issued correctly

## DNS Configuration

For each application, create these DNS records:

| Type | Name | Value |
|------|------|-------|
| A | app.com | YOUR_SERVER_IP |
| A | www.app.com | YOUR_SERVER_IP |
| A | api.app.com | YOUR_SERVER_IP |

## Optional Enhancements

### Start Monitoring Stack (Prometheus + Grafana)

```bash
# Start monitoring services
docker compose -f docker-compose.monitoring.yml up -d

# Access points:
# - Grafana: https://grafana.yourdomain.com
# - Prometheus: https://prometheus.yourdomain.com
```

### Start Portainer (Docker GUI)

```bash
# Start Portainer
docker compose -f docker-compose.portainer.yml up -d

# Access at: https://portainer.yourdomain.com
```

### Available Security Middlewares

| Middleware | Use Case |
|------------|----------|
| `secure-headers@file` | Full security headers (CSP, HSTS, X-Frame) |
| `rate-limit@file` | Standard rate limiting (100 req/s) |
| `rate-limit-auth@file` | Strict rate limiting for auth (10 req/min) |
| `rate-limit-api@file` | Higher limits for APIs (200 req/s) |
| `cors-headers@file` | CORS for production (specific domains) |
| `cors-permissive@file` | CORS for development (allow all) |
| `compress@file` | Gzip compression |
| `circuit-breaker@file` | Auto-disable failing services |

**Apply middleware to a service:**

```yaml
labels:
  - "traefik.http.routers.myapp.middlewares=secure-headers@file,rate-limit@file"
```

## Troubleshooting

### View Traefik Logs

```bash
docker logs traefik -f
```

### Check Container Network

```bash
docker network inspect traefik-network
```

### Verify Routing Rules

```bash
# Access Traefik API (if dashboard enabled)
curl http://localhost:8080/api/http/routers
```

### Common Issues

1. **502 Bad Gateway**: Container not connected to traefik-network
2. **404 Not Found**: Host rule doesn't match or container not started
3. **SSL Certificate Issues**: Check Let's Encrypt rate limits

## License

MIT

### Labels Explained

| Label | Purpose |
|-------|---------|
| `traefik.enable=true` | Enable Traefik routing for this container |
| `traefik.http.routers.*.rule` | Define routing rules (Host, Path, etc.) |
| `traefik.http.routers.*.entrypoints` | Which ports to listen on |
| `traefik.http.routers.*.tls` | Enable TLS/SSL |
| `traefik.http.services.*.loadbalancer.server.port` | Container's internal port |
