#!/bin/bash
# ===========================================
# Deploy Script for Production
# ===========================================

set -e

echo "=== Vue Gantt - Deploy Script ==="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check for Railway CLI
check_railway() {
    if ! command -v railway &> /dev/null; then
        echo -e "${YELLOW}Railway CLI not found. Installing...${NC}"
        npm install -g @railway/cli
    fi
}

# Deploy API to Railway
deploy_api() {
    echo -e "${GREEN}Deploying API to Railway...${NC}"
    check_railway
    cd api
    railway up
    cd ..
}

# Deploy with Docker Compose
deploy_docker() {
    echo -e "${GREEN}Deploying with Docker Compose...${NC}"
    
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Warning: .env file not found. Using defaults.${NC}"
        cp .env.docker .env
    fi
    
    docker-compose up -d --build
    echo -e "${GREEN}Containers started!${NC}"
    echo "  - App: http://localhost:8080"
    echo "  - API: http://localhost:3000"
    echo "  - DB:  localhost:5432"
}

# Show status
status() {
    echo -e "${GREEN}Container Status:${NC}"
    docker-compose ps
}

# Stop everything
stop() {
    echo -e "${GREEN}Stopping containers...${NC}"
    docker-compose down
}

# Help
help() {
    echo "Usage: ./deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  docker     - Deploy using Docker Compose"
    echo "  railway    - Deploy API to Railway"
    echo "  status     - Show container status"
    echo "  stop       - Stop all containers"
    echo "  help       - Show this help"
}

case "$1" in
    docker)
        deploy_docker
        ;;
    railway)
        deploy_api
        ;;
    status)
        status
        ;;
    stop)
        stop
        ;;
    *)
        help
        ;;
esac