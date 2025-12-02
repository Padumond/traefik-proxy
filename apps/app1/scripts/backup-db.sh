#!/bin/bash
# =============================================================================
# Mas3ndi PostgreSQL Database Backup Script
# =============================================================================
# Usage: ./backup-db.sh [daily|weekly|monthly]
# Cron example: 0 2 * * * /path/to/backup-db.sh daily
# =============================================================================

set -e

# Configuration
BACKUP_TYPE="${1:-daily}"
BACKUP_DIR="/backups"
CONTAINER_NAME="mas3ndi-db"
DB_NAME="${POSTGRES_DB:-mas3ndi}"
DB_USER="${POSTGRES_USER:-postgres}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_TYPE}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Retention periods (in days)
DAILY_RETENTION=7
WEEKLY_RETENTION=30
MONTHLY_RETENTION=365

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Create backup directories if they don't exist
mkdir -p "${BACKUP_DIR}/daily"
mkdir -p "${BACKUP_DIR}/weekly"
mkdir -p "${BACKUP_DIR}/monthly"

log_info "Starting ${BACKUP_TYPE} backup of database: ${DB_NAME}"

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_error "Container ${CONTAINER_NAME} is not running!"
    exit 1
fi

# Create backup
log_info "Creating backup: ${BACKUP_FILE}"
docker exec ${CONTAINER_NAME} pg_dump -U ${DB_USER} ${DB_NAME} | gzip > "${BACKUP_FILE}"

# Verify backup
if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    log_info "Backup created successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
    log_error "Backup failed or file is empty!"
    exit 1
fi

# Cleanup old backups based on retention policy
cleanup_old_backups() {
    local dir=$1
    local days=$2
    local count=$(find "${dir}" -name "*.sql.gz" -mtime +${days} | wc -l)
    
    if [ ${count} -gt 0 ]; then
        log_info "Removing ${count} backup(s) older than ${days} days from ${dir}"
        find "${dir}" -name "*.sql.gz" -mtime +${days} -delete
    fi
}

log_info "Cleaning up old backups..."
cleanup_old_backups "${BACKUP_DIR}/daily" ${DAILY_RETENTION}
cleanup_old_backups "${BACKUP_DIR}/weekly" ${WEEKLY_RETENTION}
cleanup_old_backups "${BACKUP_DIR}/monthly" ${MONTHLY_RETENTION}

# List current backups
log_info "Current backups:"
echo "  Daily:   $(ls -1 ${BACKUP_DIR}/daily/*.sql.gz 2>/dev/null | wc -l) files"
echo "  Weekly:  $(ls -1 ${BACKUP_DIR}/weekly/*.sql.gz 2>/dev/null | wc -l) files"
echo "  Monthly: $(ls -1 ${BACKUP_DIR}/monthly/*.sql.gz 2>/dev/null | wc -l) files"

log_info "Backup completed successfully!"

