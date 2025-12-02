#!/bin/bash
# =============================================================================
# Mas3ndi Prisma Database Migration Script
# =============================================================================
# Usage: ./run-migrations.sh [deploy|status|reset]
# =============================================================================

set -e

# Configuration
ACTION="${1:-deploy}"
CONTAINER_NAME="mas3ndi-backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check if database container is running
if ! docker ps --format '{{.Names}}' | grep -q "^mas3ndi-db$"; then
    log_error "Database container mas3ndi-db is not running!"
    exit 1
fi

case "${ACTION}" in
    deploy)
        log_info "Running Prisma migrations (deploy)..."
        docker compose run --rm mas3ndi-migrations
        log_info "Migrations deployed successfully!"
        ;;
    
    status)
        log_info "Checking migration status..."
        docker exec ${CONTAINER_NAME} npx prisma migrate status
        ;;
    
    reset)
        log_warn "This will RESET the database and delete all data!"
        read -p "Are you sure? (yes/no): " confirm
        if [ "${confirm}" = "yes" ]; then
            log_info "Resetting database..."
            docker exec ${CONTAINER_NAME} npx prisma migrate reset --force
            log_info "Database reset complete!"
        else
            log_info "Reset cancelled."
        fi
        ;;
    
    generate)
        log_info "Generating Prisma client..."
        docker exec ${CONTAINER_NAME} npx prisma generate
        log_info "Prisma client generated!"
        ;;
    
    studio)
        log_info "Starting Prisma Studio..."
        log_info "Access at: http://localhost:5555"
        docker exec -it ${CONTAINER_NAME} npx prisma studio
        ;;
    
    *)
        echo "Usage: $0 [deploy|status|reset|generate|studio]"
        echo ""
        echo "Commands:"
        echo "  deploy   - Apply pending migrations (default)"
        echo "  status   - Show migration status"
        echo "  reset    - Reset database (WARNING: deletes all data)"
        echo "  generate - Regenerate Prisma client"
        echo "  studio   - Open Prisma Studio GUI"
        exit 1
        ;;
esac

