#!/bin/bash
# Chạy tất cả services của taphoa-management
# Usage: taphoa-all

PROJECT_DIR="$HOME/Documents/taphoa-management"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Màu cho log
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}==============================${NC}"
echo -e "${CYAN}  Taphoa Management - Start   ${NC}"
echo -e "${CYAN}==============================${NC}"

# 1. PostgreSQL (docker)
echo -e "\n${YELLOW}[1/3] Starting PostgreSQL...${NC}"
if docker ps --format '{{.Names}}' | grep -q 'taphoa-db'; then
    echo -e "${GREEN}  ✓ PostgreSQL already running${NC}"
else
    docker compose -f "$PROJECT_DIR/docker-compose.yml" up -d
    echo -e "${GREEN}  ✓ PostgreSQL started (port 5433)${NC}"
fi

# Đợi PostgreSQL sẵn sàng
echo -n "  Waiting for DB..."
for i in {1..15}; do
    if docker exec taphoa-db pg_isready -U postgres > /dev/null 2>&1; then
        echo -e " ${GREEN}ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# 2. Backend (Go)
echo -e "\n${YELLOW}[2/3] Starting Backend...${NC}"
(cd "$BACKEND_DIR" && go run main.go) &
BACKEND_PID=$!
echo -e "${GREEN}  ✓ Backend starting (port 8082, PID: $BACKEND_PID)${NC}"

# 3. Frontend (React)
echo -e "\n${YELLOW}[3/3] Starting Frontend...${NC}"
(cd "$FRONTEND_DIR" && PORT=3001 npm start) &
FRONTEND_PID=$!
echo -e "${GREEN}  ✓ Frontend starting (port 3001, PID: $FRONTEND_PID)${NC}"

echo -e "\n${CYAN}==============================${NC}"
echo -e "  DB:       ${GREEN}localhost:5433${NC}"
echo -e "  Backend:  ${GREEN}localhost:8082${NC}"
echo -e "  Frontend: ${GREEN}localhost:3001${NC}"
echo -e "${CYAN}==============================${NC}"
echo -e "${YELLOW}  Ctrl+C to stop all${NC}\n"

# Ctrl+C → dừng cả 2 process con
cleanup() {
    echo -e "\n${RED}Stopping services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}Done. PostgreSQL vẫn chạy (docker).${NC}"
    echo -e "${YELLOW}Muốn tắt DB: docker compose -f $PROJECT_DIR/docker-compose.yml down${NC}"
}
trap cleanup SIGINT SIGTERM

# Giữ script chạy cho đến khi Ctrl+C
wait
