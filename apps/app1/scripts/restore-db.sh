#!/bin/bash
# =============================================================================
# Mas3ndi PostgreSQL Database Restore Script
# =============================================================================
# Usage: ./restore-db.sh <backup_file.sql.gz>
# =============================================================================

set -e

# Configuration
BACKUP_FILE="$1"
CONTAINER_NAME="mas3ndi-db"
DB_NAME="${POSTGRES_DB:-mas3ndi}"
DB_USER="${POSTGRES_USER:-postgres}"

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

# Check arguments
if [ -z "${BACKUP_FILE}" ]; then
    log_error "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Available backups:"
    find /backups -name "*.sql.gz" -type f | sort -r | head -20
    exit 1
fi

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    log_error "Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_error "Container ${CONTAINER_NAME} is not running!"
    exit 1
fi

# Confirmation prompt
log_warn "This will REPLACE ALL DATA in database '${DB_NAME}'!"
log_warn "Backup file: ${BACKUP_FILE}"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "${confirm}" != "yes" ]; then
    log_info "Restore cancelled."
    exit 0
fi

# Create a backup before restore
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PRE_RESTORE_BACKUP="/backups/pre_restore_${TIMESTAMP}.sql.gz"
log_info "Creating pre-restore backup: ${PRE_RESTORE_BACKUP}"
docker exec ${CONTAINER_NAME} pg_dump -U ${DB_USER} ${DB_NAME} | gzip > "${PRE_RESTORE_BACKUP}"

# Stop dependent services
log_info "Stopping backend service..."
docker stop mas3ndi-backend 2>/dev/null || true

# Restore database
log_info "Restoring database from: ${BACKUP_FILE}"

# Drop and recreate database
docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -c "DROP DATABASE IF EXISTS ${DB_NAME};"
docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -c "CREATE DATABASE ${DB_NAME};"

# Restore from backup
gunzip -c "${BACKUP_FILE}" | docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} ${DB_NAME}

log_info "Database restored successfully!"

# Restart backend service
log_info "Starting backend service..."
docker start mas3ndi-backend

log_info "Restore completed! Pre-restore backup saved at: ${PRE_RESTORE_BACKUP}"

