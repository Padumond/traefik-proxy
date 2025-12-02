#!/bin/bash
# Script to generate a new application configuration
# Usage: ./scripts/new-app.sh <app-name> <domain> <api-domain> <backend-port>
# Example: ./scripts/new-app.sh myapp myapp.com api.myapp.com 3000

set -e

APP_NAME=$1
DOMAIN=$2
API_DOMAIN=$3
BACKEND_PORT=${4:-3000}

if [ -z "$APP_NAME" ] || [ -z "$DOMAIN" ] || [ -z "$API_DOMAIN" ]; then
    echo "Usage: ./scripts/new-app.sh <app-name> <domain> <api-domain> [backend-port]"
    echo "Example: ./scripts/new-app.sh myapp myapp.com api.myapp.com 3000"
    exit 1
fi

APP_DIR="apps/$APP_NAME"

if [ -d "$APP_DIR" ]; then
    echo "Error: Application directory $APP_DIR already exists"
    exit 1
fi

mkdir -p "$APP_DIR/frontend"
mkdir -p "$APP_DIR/backend"

cat > "$APP_DIR/docker-compose.yml" << EOF
# Application: $DOMAIN
# Run with: docker-compose -f $APP_DIR/docker-compose.yml up -d

version: "3.8"

services:
  ${APP_NAME}-frontend:
    image: nginx:alpine
    container_name: ${APP_NAME}-frontend
    restart: unless-stopped
    volumes:
      - ./frontend:/usr/share/nginx/html:ro
    networks:
      - traefik-network
      - ${APP_NAME}-internal
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${APP_NAME}-frontend.rule=Host(\`${DOMAIN}\`) || Host(\`www.${DOMAIN}\`)"
      - "traefik.http.routers.${APP_NAME}-frontend.entrypoints=websecure"
      - "traefik.http.routers.${APP_NAME}-frontend.tls=true"
      - "traefik.http.routers.${APP_NAME}-frontend.tls.certresolver=letsencrypt"
      - "traefik.http.routers.${APP_NAME}-frontend.service=${APP_NAME}-frontend-svc"
      - "traefik.http.services.${APP_NAME}-frontend-svc.loadbalancer.server.port=80"
      - "traefik.http.routers.${APP_NAME}-frontend.middlewares=secure-headers@file,compress@file"

  ${APP_NAME}-backend:
    image: node:18-alpine
    container_name: ${APP_NAME}-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=${BACKEND_PORT}
    volumes:
      - ./backend:/app
    working_dir: /app
    command: ["node", "server.js"]
    networks:
      - traefik-network
      - ${APP_NAME}-internal
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${APP_NAME}-backend.rule=Host(\`${API_DOMAIN}\`)"
      - "traefik.http.routers.${APP_NAME}-backend.entrypoints=websecure"
      - "traefik.http.routers.${APP_NAME}-backend.tls=true"
      - "traefik.http.routers.${APP_NAME}-backend.tls.certresolver=letsencrypt"
      - "traefik.http.routers.${APP_NAME}-backend.service=${APP_NAME}-backend-svc"
      - "traefik.http.services.${APP_NAME}-backend-svc.loadbalancer.server.port=${BACKEND_PORT}"
      - "traefik.http.routers.${APP_NAME}-backend.middlewares=cors-headers@file,rate-limit@file"

networks:
  traefik-network:
    external: true
  ${APP_NAME}-internal:
    driver: bridge
EOF

echo "Created application configuration at $APP_DIR"
echo ""
echo "Next steps:"
echo "1. Add your frontend files to $APP_DIR/frontend/"
echo "2. Add your backend files to $APP_DIR/backend/"
echo "3. Modify the docker-compose.yml as needed"
echo "4. Run: docker-compose -f $APP_DIR/docker-compose.yml up -d"

