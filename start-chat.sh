#!/bin/bash
# Chạy agent (langgraph dev :2024) + Agent Chat UI (:3030).
# Thêm --tunnel để mở quick Cloudflare tunnel cho điện thoại.
# Cần: backend taphoa đang chạy (:8082), agent/.env có GOOGLE_API_KEY + TAPHOA_*.
PROJECT_DIR="$HOME/Documents/taphoa-management"
UI_PORT=3030
TUNNEL=false
[ "$1" = "--tunnel" ] && TUNNEL=true

# 1. Kiểm backend
if ! curl -s http://localhost:8082/health > /dev/null; then
  echo "Backend chưa chạy (:8082). Chạy taphoa-all trước."; exit 1
fi

PIDS=""

# 2. langgraph dev (agent) :2024
echo "[1/3] Starting agent (langgraph dev :2024)..."
(cd "$PROJECT_DIR/agent" && npm run dev) &
PIDS="$PIDS $!"

# 3. Chat UI :3030
echo "[2/3] Starting chat UI (:$UI_PORT)..."
(cd "$PROJECT_DIR/chat-ui" && PORT=$UI_PORT pnpm dev) &
PIDS="$PIDS $!"

# 4. Tunnel (tùy chọn)
if $TUNNEL; then
  echo "[3/3] Starting Cloudflare quick tunnel -> :$UI_PORT ..."
  cloudflared tunnel --url "http://localhost:$UI_PORT" &
  PIDS="$PIDS $!"
  echo "  (URL *.trycloudflare.com sẽ hiện trong log cloudflared phía trên — mở trên điện thoại)"
fi

echo "================================"
echo "  Chat UI:    http://localhost:$UI_PORT"
echo "  LangGraph:  http://localhost:2024"
echo "  Ctrl+C để dừng tất cả"
echo "================================"

cleanup() { echo "Stopping..."; kill $PIDS 2>/dev/null; }
trap cleanup SIGINT SIGTERM
wait
