#!/bin/bash
# =============================================================================
# SSL Certificate Verification Script
# =============================================================================
# Usage: ./check-ssl.sh
# Cron example: 0 9 * * * /path/to/check-ssl.sh
# =============================================================================

set -e

# Configuration
DOMAIN="${MAS3NDI_DOMAIN:-mas3ndi.com}"
DOMAINS=("${DOMAIN}" "api.${DOMAIN}" "www.${DOMAIN}")
WARNING_DAYS=30
CRITICAL_DAYS=7
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
    
    if [ -n "${SLACK_WEBHOOK}" ]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🔐 *SSL Certificate Alert*\n${message}\nTime: ${timestamp}\"}" \
            "${SLACK_WEBHOOK}" > /dev/null
    fi
    
    if [ -n "${ALERT_EMAIL}" ]; then
        echo "${message}" | mail -s "SSL Certificate Alert - ${timestamp}" "${ALERT_EMAIL}"
    fi
}

check_ssl() {
    local domain=$1
    
    # Get certificate expiry date
    EXPIRY=$(echo | openssl s_client -servername ${domain} -connect ${domain}:443 2>/dev/null | \
             openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    
    if [ -z "${EXPIRY}" ]; then
        log_error "${domain}: Unable to retrieve certificate"
        return 1
    fi
    
    # Calculate days until expiry
    EXPIRY_EPOCH=$(date -d "${EXPIRY}" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "${EXPIRY}" +%s 2>/dev/null)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
    
    if [ ${DAYS_LEFT} -lt 0 ]; then
        log_error "${domain}: Certificate EXPIRED!"
        send_alert "Certificate for ${domain} has EXPIRED!"
        return 1
    elif [ ${DAYS_LEFT} -lt ${CRITICAL_DAYS} ]; then
        log_error "${domain}: Certificate expires in ${DAYS_LEFT} days (CRITICAL)"
        send_alert "Certificate for ${domain} expires in ${DAYS_LEFT} days!"
        return 1
    elif [ ${DAYS_LEFT} -lt ${WARNING_DAYS} ]; then
        log_warn "${domain}: Certificate expires in ${DAYS_LEFT} days (Warning)"
        send_alert "Certificate for ${domain} expires in ${DAYS_LEFT} days. Consider renewal."
        return 0
    else
        log_info "${domain}: Certificate valid for ${DAYS_LEFT} days (expires: ${EXPIRY})"
        return 0
    fi
}

echo "=========================================="
echo "SSL Certificate Check - $(date)"
echo "=========================================="
echo ""

ERRORS=0

for domain in "${DOMAINS[@]}"; do
    if ! check_ssl "${domain}"; then
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo "=========================================="
if [ ${ERRORS} -eq 0 ]; then
    log_info "All SSL certificates are valid!"
    exit 0
else
    log_error "${ERRORS} certificate(s) need attention!"
    exit 1
fi

