#!/bin/bash

# TaskFlow Backend Deployment Script for VPS
# Author: tranminnhatdut
# Usage: ./deploy.sh [action]
# Actions: build, push, deploy, stop, restart, logs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE="env.production"
DOCKER_REGISTRY="tranminnhatdut/taskflow-backend"

# Services list
SERVICES=(
    "common"
    "ai"
    "accounts"
    "user" 
    "projects"
    "tasks"
    "sprints"
    "notification"
    "file"
)

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        log_error "Docker Compose file not found: $DOCKER_COMPOSE_FILE"
        exit 1
    fi
    
    log_success "Requirements check passed"
}

build_images() {
    log_info "Building Docker images..."
    
    cd backend
    
    for service in "${SERVICES[@]}"; do
        log_info "Building $service service..."
        
        case $service in
            "ai")
                cd AI-Service
                docker build -t ${DOCKER_REGISTRY}:ai-latest .
                cd ..
                ;;
            *)
                service_dir=$(find . -maxdepth 1 -type d -iname "*${service}*" | head -1)
                if [ -n "$service_dir" ]; then
                    cd "$service_dir"
                    docker build -t ${DOCKER_REGISTRY}:${service}-latest .
                    cd ..
                else
                    log_warning "Service directory not found for: $service"
                fi
                ;;
        esac
    done
    
    cd ..
    log_success "All images built successfully"
}

push_images() {
    log_info "Pushing images to Docker Hub..."
    
    for service in "${SERVICES[@]}"; do
        log_info "Pushing $service service..."
        docker push ${DOCKER_REGISTRY}:${service}-latest
    done
    
    log_success "All images pushed successfully"
}

deploy() {
    log_info "Deploying to production..."
    
    # Pull latest images
    docker-compose -f $DOCKER_COMPOSE_FILE pull
    
    # Start services
    docker-compose -f $DOCKER_COMPOSE_FILE up -d
    
    log_success "Deployment completed"
    
    # Show status
    show_status
}

stop_services() {
    log_info "Stopping all services..."
    docker-compose -f $DOCKER_COMPOSE_FILE down
    log_success "All services stopped"
}

restart_services() {
    log_info "Restarting all services..."
    docker-compose -f $DOCKER_COMPOSE_FILE restart
    log_success "All services restarted"
}

show_logs() {
    log_info "Showing logs for all services..."
    docker-compose -f $DOCKER_COMPOSE_FILE logs -f --tail=100
}

show_status() {
    log_info "Service Status:"
    docker-compose -f $DOCKER_COMPOSE_FILE ps
    
    echo ""
    log_info "System Resources:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}"
}

cleanup() {
    log_info "Cleaning up unused resources..."
    docker system prune -f
    docker volume prune -f
    log_success "Cleanup completed"
}

backup_database() {
    log_info "Creating database backup..."
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    docker-compose -f $DOCKER_COMPOSE_FILE exec postgres pg_dump -U postgre postgres > $BACKUP_FILE
    log_success "Database backup created: $BACKUP_FILE"
}

health_check() {
    log_info "Performing health check..."
    
    services_to_check=(
        "http://localhost:8081/actuator/health:Common Service"
        "http://localhost:8000/health:AI Service"
        "http://localhost:8080/actuator/health:Accounts Service"
        "http://localhost:8086/actuator/health:User Service"
        "http://localhost:8083/actuator/health:Projects Service"
        "http://localhost:8085/actuator/health:Tasks Service"
        "http://localhost:8084/actuator/health:Sprints Service"
        "http://localhost:8089/actuator/health:Notification Service"
        "http://localhost:8087/actuator/health:File Service"
    )
    
    for service_check in "${services_to_check[@]}"; do
        url=$(echo $service_check | cut -d':' -f1,2)
        name=$(echo $service_check | cut -d':' -f3)
        
        if curl -f -s $url > /dev/null; then
            log_success "$name: ✓ Healthy"
        else
            log_error "$name: ✗ Unhealthy"
        fi
    done
}

show_help() {
    echo "TaskFlow Backend Deployment Script"
    echo ""
    echo "Usage: $0 [action]"
    echo ""
    echo "Actions:"
    echo "  build       Build Docker images"
    echo "  push        Push images to Docker Hub"
    echo "  deploy      Deploy to production"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  logs        Show logs"
    echo "  status      Show service status"
    echo "  health      Perform health check"
    echo "  backup      Backup database"
    echo "  cleanup     Clean up unused resources"
    echo "  full        Build, push and deploy (full deployment)"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build"
    echo "  $0 deploy"
    echo "  $0 full"
}

# Main script logic
case "${1:-help}" in
    "build")
        check_requirements
        build_images
        ;;
    "push")
        check_requirements
        push_images
        ;;
    "deploy")
        check_requirements
        deploy
        ;;
    "stop")
        check_requirements
        stop_services
        ;;
    "restart")
        check_requirements
        restart_services
        ;;
    "logs")
        check_requirements
        show_logs
        ;;
    "status")
        check_requirements
        show_status
        ;;
    "health")
        check_requirements
        health_check
        ;;
    "backup")
        check_requirements
        backup_database
        ;;
    "cleanup")
        check_requirements
        cleanup
        ;;
    "full")
        check_requirements
        build_images
        push_images
        deploy
        ;;
    "help"|*)
        show_help
        ;;
esac 