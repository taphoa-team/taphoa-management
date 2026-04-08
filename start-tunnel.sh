#!/bin/bash
# Chạy taphoa-management + cloudflared tunnels để truy cập từ xa
# Usage: bash start-tunnel.sh (chạy taphoa-all trước)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}==============================${NC}"
echo -e "${CYAN}  Taphoa - Cloudflare Tunnel  ${NC}"
echo -e "${CYAN}==============================${NC}"

# Kiểm tra cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}cloudflared chưa cài. Cài: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/${NC}"
    exit 1
fi

# Kiểm tra backend đang chạy
if ! curl -s http://localhost:8082/health > /dev/null 2>&1; then
    echo -e "${RED}Backend chưa chạy. Chạy taphoa-all trước!${NC}"
    exit 1
fi

# 1. Tunnel backend
echo -e "\n${YELLOW}[1/2] Starting backend tunnel (port 8082)...${NC}"
BACKEND_LOG=$(mktemp)
cloudflared tunnel --url http://localhost:8082 > "$BACKEND_LOG" 2>&1 &
BACKEND_TUNNEL_PID=$!

# Đợi URL
echo -n "  Waiting for URL..."
BACKEND_URL=""
for i in {1..15}; do
    BACKEND_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$BACKEND_LOG" | head -1)
    if [ -n "$BACKEND_URL" ]; then
        echo -e " ${GREEN}done${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

if [ -z "$BACKEND_URL" ]; then
    echo -e " ${RED}failed${NC}"
    kill $BACKEND_TUNNEL_PID 2>/dev/null
    exit 1
fi
echo -e "${GREEN}  Backend: $BACKEND_URL${NC}"

# 2. Tunnel frontend (cần restart frontend với REACT_APP_API_URL mới)
echo -e "\n${YELLOW}[2/2] Starting frontend tunnel (port 3001)...${NC}"
FRONTEND_LOG=$(mktemp)
cloudflared tunnel --url http://localhost:3001 > "$FRONTEND_LOG" 2>&1 &
FRONTEND_TUNNEL_PID=$!

echo -n "  Waiting for URL..."
FRONTEND_URL=""
for i in {1..15}; do
    FRONTEND_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$FRONTEND_LOG" | head -1)
    if [ -n "$FRONTEND_URL" ]; then
        echo -e " ${GREEN}done${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

if [ -z "$FRONTEND_URL" ]; then
    echo -e " ${RED}failed${NC}"
    kill $BACKEND_TUNNEL_PID $FRONTEND_TUNNEL_PID 2>/dev/null
    exit 1
fi
echo -e "${GREEN}  Frontend: $FRONTEND_URL${NC}"

echo -e "\n${CYAN}==============================${NC}"
echo -e "  Backend tunnel:  ${GREEN}$BACKEND_URL${NC}"
echo -e "  Frontend tunnel: ${GREEN}$FRONTEND_URL${NC}"
echo -e "${CYAN}==============================${NC}"
echo ""
echo -e "${YELLOW}QUAN TRONG: Ban can restart frontend voi env moi:${NC}"
echo -e "${GREEN}  1. Tat taphoa-all (Ctrl+C)${NC}"
echo -e "${GREEN}  2. Chay lai:${NC}"
echo -e "     cd ~/Documents/taphoa-management/backend && FRONTEND_URL=$FRONTEND_URL go run main.go &"
echo -e "     cd ~/Documents/taphoa-management/frontend && REACT_APP_API_URL=${BACKEND_URL}/api PORT=3001 npm start &"
echo ""
echo -e "${YELLOW}  Hoac don gian: mo $FRONTEND_URL tren dien thoai${NC}"
echo -e "${YELLOW}  Ctrl+C to stop tunnels${NC}\n"

cleanup() {
    echo -e "\n${RED}Stopping tunnels...${NC}"
    kill $BACKEND_TUNNEL_PID $FRONTEND_TUNNEL_PID 2>/dev/null
    wait $BACKEND_TUNNEL_PID $FRONTEND_TUNNEL_PID 2>/dev/null
    rm -f "$BACKEND_LOG" "$FRONTEND_LOG"
    echo -e "${GREEN}Done.${NC}"
}
trap cleanup SIGINT SIGTERM

wait
