#!/bin/bash
# =============================================================================
# Mas3ndi Deployment Script
# =============================================================================
# Usage: ./deploy.sh [--build] [--migrate] [--backup]
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "${SCRIPT_DIR}")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') - $1"
}

log_step() {
    echo -e "\n${BLUE}==>${NC} $1"
}

# Parse arguments
BUILD_LOCAL=false
MIGRATE=false
BACKUP=false

for arg in "$@"; do
    case $arg in
        --build-local)
            BUILD_LOCAL=true
            ;;
        --migrate)
            MIGRATE=true
            ;;
        --backup)
            BACKUP=true
            ;;
        --help)
            echo "Usage: $0 [--build-local] [--migrate] [--backup]"
            echo ""
            echo "Options:"
            echo "  --build-local  Build images locally (for development)"
            echo "  --migrate      Run database migrations"
            echo "  --backup       Create database backup before deployment"
            echo ""
            echo "Production deployments pull pre-built images from registry."
            echo "Use --build-local only for local development/testing."
            exit 0
            ;;
    esac
done

cd "${APP_DIR}"

echo "=========================================="
echo "Mas3ndi Deployment"
echo "=========================================="
echo "Time: $(date)"
echo "Directory: ${APP_DIR}"
echo "=========================================="

# Check if .env exists
if [ ! -f .env ]; then
    log_error ".env file not found! Copy .env.example to .env and configure it."
    exit 1
fi

# Create backup if requested
if [ "${BACKUP}" = true ]; then
    log_step "Creating database backup..."
    "${SCRIPT_DIR}/backup-db.sh" daily || log_warn "Backup failed, continuing..."
fi

# Pull images
log_step "Pulling images..."

if [ "${BUILD_LOCAL}" = true ]; then
    # Local build: only pull base images
    log_info "Building images locally (development mode)..."
    docker compose pull mas3ndi-db mas3ndi-redis
    docker compose -f docker-compose.yml -f docker-compose.build.yml build
else
    # Production: pull all pre-built images from registry
    log_info "Pulling pre-built images from registry..."
    docker compose pull
fi

# Start database and redis first
log_step "Starting database and Redis..."
docker compose up -d mas3ndi-db mas3ndi-redis

# Wait for database to be healthy
log_info "Waiting for database to be ready..."
sleep 10

# Run migrations if requested
if [ "${MIGRATE}" = true ]; then
    log_step "Running database migrations..."
    docker compose --profile migrations run --rm mas3ndi-migrations
fi

# Start all services
log_step "Starting all services..."
if [ "${BUILD_LOCAL}" = true ]; then
    docker compose -f docker-compose.yml -f docker-compose.build.yml up -d
else
    docker compose up -d
fi

# Wait for services to start
log_info "Waiting for services to start..."
sleep 15

# Health check
log_step "Running health checks..."
"${SCRIPT_DIR}/health-check.sh" || log_warn "Some health checks failed"

log_step "Deployment complete!"
echo ""
docker compose ps

