#!/bin/bash
# =============================================================================
# Mas3ndi Health Check Script
# =============================================================================
# Usage: ./health-check.sh
# Cron example: */5 * * * * /path/to/health-check.sh
# =============================================================================

set -e

# Configuration
DOMAIN="${MAS3NDI_DOMAIN:-mas3ndi.com}"
FRONTEND_URL="https://${DOMAIN}"
BACKEND_URL="https://api.${DOMAIN}/health"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

send_alert() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Send to Slack if webhook is configured
    if [ -n "${SLACK_WEBHOOK}" ]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 *Mas3ndi Alert*\n${message}\nTime: ${timestamp}\"}" \
            "${SLACK_WEBHOOK}" > /dev/null
    fi
    
    # Send email if configured
    if [ -n "${ALERT_EMAIL}" ]; then
        echo "${message}" | mail -s "Mas3ndi Alert - ${timestamp}" "${ALERT_EMAIL}"
    fi
}

ERRORS=0

echo "=========================================="
echo "Mas3ndi Health Check - $(date)"
echo "=========================================="

# Check Frontend
echo ""
echo "Checking Frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${FRONTEND_URL}" 2>/dev/null || echo "000")
if [ "${FRONTEND_STATUS}" = "200" ]; then
    log_info "Frontend is healthy (HTTP ${FRONTEND_STATUS})"
else
    log_error "Frontend is DOWN (HTTP ${FRONTEND_STATUS})"
    ERRORS=$((ERRORS + 1))
fi

# Check Backend API
echo ""
echo "Checking Backend API..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BACKEND_URL}" 2>/dev/null || echo "000")
if [ "${BACKEND_STATUS}" = "200" ]; then
    log_info "Backend API is healthy (HTTP ${BACKEND_STATUS})"
else
    log_error "Backend API is DOWN (HTTP ${BACKEND_STATUS})"
    ERRORS=$((ERRORS + 1))
fi

# Check Docker containers
echo ""
echo "Checking Docker Containers..."
CONTAINERS=("mas3ndi-frontend" "mas3ndi-backend" "mas3ndi-db" "mas3ndi-redis")
for container in "${CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        STATUS=$(docker inspect --format='{{.State.Health.Status}}' ${container} 2>/dev/null || echo "running")
        if [ "${STATUS}" = "healthy" ] || [ "${STATUS}" = "running" ]; then
            log_info "${container} is ${STATUS}"
        else
            log_warn "${container} status: ${STATUS}"
        fi
    else
        log_error "${container} is NOT running"
        ERRORS=$((ERRORS + 1))
    fi
done

# Check disk space
echo ""
echo "Checking Disk Space..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "${DISK_USAGE}" -lt 80 ]; then
    log_info "Disk usage: ${DISK_USAGE}%"
elif [ "${DISK_USAGE}" -lt 90 ]; then
    log_warn "Disk usage: ${DISK_USAGE}% (Warning)"
else
    log_error "Disk usage: ${DISK_USAGE}% (Critical)"
    ERRORS=$((ERRORS + 1))
fi

# Check memory
echo ""
echo "Checking Memory..."
MEM_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
if [ "${MEM_USAGE}" -lt 80 ]; then
    log_info "Memory usage: ${MEM_USAGE}%"
elif [ "${MEM_USAGE}" -lt 90 ]; then
    log_warn "Memory usage: ${MEM_USAGE}% (Warning)"
else
    log_error "Memory usage: ${MEM_USAGE}% (Critical)"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "=========================================="
if [ ${ERRORS} -eq 0 ]; then
    log_info "All checks passed!"
    exit 0
else
    log_error "${ERRORS} check(s) failed!"
    send_alert "Health check failed with ${ERRORS} error(s). Check the server immediately."
    exit 1
fi

