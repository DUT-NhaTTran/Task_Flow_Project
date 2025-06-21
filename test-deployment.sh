#!/bin/bash

# TaskFlow Backend Deployment Test Script
# Author: tranminnhatdut
# Usage: ./test-deployment.sh [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.production.yml"
BASE_URL="http://localhost"
TIMEOUT=30

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Services to test
declare -A SERVICES=(
    ["common"]="8081:/actuator/health"
    ["ai"]="8000:/health"
    ["accounts"]="8080:/actuator/health"
    ["user"]="8086:/actuator/health"
    ["projects"]="8083:/actuator/health"
    ["tasks"]="8085:/actuator/health"
    ["sprints"]="8084:/actuator/health"
    ["notification"]="8089:/actuator/health"
    ["file"]="8087:/actuator/health"
)

# Infrastructure services
declare -A INFRASTRUCTURE=(
    ["postgres"]="5432"
    ["redis"]="6379"
)

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓ PASS]${NC} $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

log_fail() {
    echo -e "${RED}[✗ FAIL]${NC} $1"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[⚠ WARN]${NC} $1"
}

log_header() {
    echo -e "${PURPLE}========================================${NC}"
    echo -e "${PURPLE} $1${NC}"
    echo -e "${PURPLE}========================================${NC}"
}

# Test container status
test_container_status() {
    log_header "Testing Container Status"
    
    # Check if docker-compose file exists
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        log_fail "Docker compose file not found: $DOCKER_COMPOSE_FILE"
        return 1
    fi
    
    # Get running containers
    local containers=$(docker-compose -f $DOCKER_COMPOSE_FILE ps --services --filter "status=running" 2>/dev/null)
    
    if [ -z "$containers" ]; then
        log_fail "No containers are running"
        return 1
    fi
    
    # Check each expected container
    for service in "${!SERVICES[@]}" postgres redis nginx watchtower; do
        if echo "$containers" | grep -q "$service"; then
            log_success "Container $service is running"
        else
            # Check if container exists but stopped
            local status=$(docker-compose -f $DOCKER_COMPOSE_FILE ps $service 2>/dev/null | tail -n +3)
            if [ -n "$status" ]; then
                log_fail "Container $service exists but is not running"
            else
                log_fail "Container $service not found"
            fi
        fi
    done
}

# Test health endpoints
test_health_endpoints() {
    log_header "Testing Health Endpoints"
    
    for service in "${!SERVICES[@]}"; do
        local port_path="${SERVICES[$service]}"
        local port=$(echo $port_path | cut -d':' -f1)
        local path=$(echo $port_path | cut -d':' -f2)
        local url="${BASE_URL}:${port}${path}"
        
        log_info "Testing $service service at $url"
        
        if curl -f -s --max-time $TIMEOUT "$url" >/dev/null 2>&1; then
            log_success "$service health endpoint is responding"
        else
            log_fail "$service health endpoint is not responding"
            
            # Try to get more details
            local response=$(curl -s --max-time 5 "$url" 2>/dev/null || echo "No response")
            log_warning "Response: $response"
        fi
    done
}

# Test infrastructure services
test_infrastructure() {
    log_header "Testing Infrastructure Services"
    
    # Test PostgreSQL
    log_info "Testing PostgreSQL connection"
    if docker-compose -f $DOCKER_COMPOSE_FILE exec -T postgres pg_isready -U postgre >/dev/null 2>&1; then
        log_success "PostgreSQL is ready"
        
        # Test database connection
        if docker-compose -f $DOCKER_COMPOSE_FILE exec -T postgres psql -U postgre -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
            log_success "PostgreSQL database connection works"
        else
            log_fail "PostgreSQL database connection failed"
        fi
    else
        log_fail "PostgreSQL is not ready"
    fi
    
    # Test Redis
    log_info "Testing Redis connection"
    if docker-compose -f $DOCKER_COMPOSE_FILE exec -T redis redis-cli -a redis123 ping >/dev/null 2>&1; then
        log_success "Redis is responding"
    else
        log_fail "Redis is not responding"
    fi
}

# Test API endpoints with sample requests
test_api_endpoints() {
    log_header "Testing Sample API Endpoints"
    
    # Test common service
    log_info "Testing Common Service API"
    local common_response=$(curl -s --max-time 10 "${BASE_URL}:8081/actuator/info" 2>/dev/null || echo "")
    if [ -n "$common_response" ]; then
        log_success "Common Service API is responding"
    else
        log_fail "Common Service API is not responding"
    fi
    
    # Test AI service
    log_info "Testing AI Service API"
    local ai_response=$(curl -s --max-time 10 "${BASE_URL}:8000/" 2>/dev/null || echo "")
    if [ -n "$ai_response" ]; then
        log_success "AI Service API is responding"
    else
        log_fail "AI Service API is not responding"
    fi
    
    # Test accounts service
    log_info "Testing Accounts Service API"
    local accounts_response=$(curl -s --max-time 10 "${BASE_URL}:8080/actuator/info" 2>/dev/null || echo "")
    if [ -n "$accounts_response" ]; then
        log_success "Accounts Service API is responding"
    else
        log_fail "Accounts Service API is not responding"
    fi
}

# Test resource usage
test_resource_usage() {
    log_header "Testing Resource Usage"
    
    # Check memory usage
    log_info "Checking memory usage"
    local memory_stats=$(docker stats --no-stream --format "{{.MemPerc}}" 2>/dev/null)
    if [ -n "$memory_stats" ]; then
        log_success "Memory stats available"
        echo "Memory usage by containers:"
        docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}" 2>/dev/null | head -10
    else
        log_fail "Could not get memory stats"
    fi
    
    # Check CPU usage
    log_info "Checking CPU usage"
    local cpu_stats=$(docker stats --no-stream --format "{{.CPUPerc}}" 2>/dev/null)
    if [ -n "$cpu_stats" ]; then
        log_success "CPU stats available"
    else
        log_fail "Could not get CPU stats"
    fi
}

# Test logs for errors
test_logs() {
    log_header "Testing Service Logs"
    
    for service in "${!SERVICES[@]}"; do
        log_info "Checking $service logs for errors"
        
        local error_count=$(docker-compose -f $DOCKER_COMPOSE_FILE logs --tail=50 $service 2>/dev/null | grep -i "error\|exception\|fail" | wc -l)
        
        if [ "$error_count" -eq 0 ]; then
            log_success "$service logs look clean (no errors in last 50 lines)"
        else
            log_warning "$service has $error_count error/exception entries in recent logs"
        fi
    done
}

# Test network connectivity
test_network() {
    log_header "Testing Network Connectivity"
    
    # Test internal network connectivity
    log_info "Testing internal network connectivity"
    if docker-compose -f $DOCKER_COMPOSE_FILE exec -T common-service curl -s --max-time 5 http://postgres:5432 >/dev/null 2>&1; then
        log_success "Internal network connectivity works"
    else
        log_fail "Internal network connectivity issues"
    fi
    
    # Test external access
    log_info "Testing external access"
    if curl -s --max-time 5 "${BASE_URL}:8081/actuator/health" >/dev/null 2>&1; then
        log_success "External access works"
    else
        log_fail "External access not working"
    fi
}

# Test file permissions and volumes
test_volumes() {
    log_header "Testing Volumes and File Permissions"
    
    # Test PostgreSQL data volume
    if docker volume ls | grep -q "postgres_data"; then
        log_success "PostgreSQL data volume exists"
    else
        log_fail "PostgreSQL data volume missing"
    fi
    
    # Test Redis data volume
    if docker volume ls | grep -q "redis_data"; then
        log_success "Redis data volume exists"
    else
        log_fail "Redis data volume missing"
    fi
    
    # Test file uploads volume
    if docker volume ls | grep -q "file_uploads"; then
        log_success "File uploads volume exists"
    else
        log_fail "File uploads volume missing"
    fi
}

# Generate detailed report
generate_report() {
    log_header "Test Summary Report"
    
    echo -e "${BLUE}Total Tests: ${TOTAL_TESTS}${NC}"
    echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
    echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"
    
    local success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${PURPLE}Success Rate: ${success_rate}%${NC}"
    
    if [ "$FAILED_TESTS" -eq 0 ]; then
        echo -e "${GREEN}🎉 All tests passed! Deployment is successful!${NC}"
        return 0
    else
        echo -e "${RED}❌ Some tests failed. Please check the issues above.${NC}"
        return 1
    fi
}

# Quick health check function
quick_check() {
    log_header "Quick Health Check"
    
    echo "Service Status:"
    docker-compose -f $DOCKER_COMPOSE_FILE ps
    
    echo -e "\nHealth Endpoints:"
    for service in "${!SERVICES[@]}"; do
        local port_path="${SERVICES[$service]}"
        local port=$(echo $port_path | cut -d':' -f1)
        local path=$(echo $port_path | cut -d':' -f2)
        local url="${BASE_URL}:${port}${path}"
        
        if curl -f -s --max-time 5 "$url" >/dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} $service ($url)"
        else
            echo -e "  ${RED}✗${NC} $service ($url)"
        fi
    done
}

# Show service URLs
show_urls() {
    log_header "Service URLs"
    
    echo "Access your services at:"
    echo -e "  ${BLUE}Common Service:${NC}      http://localhost:8081"
    echo -e "  ${BLUE}AI Service:${NC}          http://localhost:8000"
    echo -e "  ${BLUE}Accounts Service:${NC}    http://localhost:8080"
    echo -e "  ${BLUE}User Service:${NC}        http://localhost:8086"
    echo -e "  ${BLUE}Projects Service:${NC}    http://localhost:8083"
    echo -e "  ${BLUE}Tasks Service:${NC}       http://localhost:8085"
    echo -e "  ${BLUE}Sprints Service:${NC}     http://localhost:8084"
    echo -e "  ${BLUE}Notification Service:${NC} http://localhost:8089"
    echo -e "  ${BLUE}File Service:${NC}        http://localhost:8087"
    echo -e "  ${BLUE}PostgreSQL:${NC}          localhost:5432"
    echo -e "  ${BLUE}Redis:${NC}               localhost:6379"
}

# Show help
show_help() {
    echo "TaskFlow Backend Deployment Test Script"
    echo ""
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  all         Run all tests (default)"
    echo "  quick       Quick health check"
    echo "  containers  Test container status only"
    echo "  health      Test health endpoints only"
    echo "  api         Test API endpoints only"
    echo "  infra       Test infrastructure only"
    echo "  logs        Check logs for errors"
    echo "  network     Test network connectivity"
    echo "  volumes     Test volumes and permissions"
    echo "  urls        Show service URLs"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # Run all tests"
    echo "  $0 quick        # Quick health check"
    echo "  $0 health       # Test health endpoints"
}

# Main script logic
case "${1:-all}" in
    "all")
        test_container_status
        test_infrastructure
        test_health_endpoints
        test_api_endpoints
        test_network
        test_volumes
        test_logs
        test_resource_usage
        generate_report
        ;;
    "quick")
        quick_check
        ;;
    "containers")
        test_container_status
        ;;
    "health")
        test_health_endpoints
        ;;
    "api")
        test_api_endpoints
        ;;
    "infra")
        test_infrastructure
        ;;
    "logs")
        test_logs
        ;;
    "network")
        test_network
        ;;
    "volumes")
        test_volumes
        ;;
    "urls")
        show_urls
        ;;
    "help"|*)
        show_help
        ;;
esac 