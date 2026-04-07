#!/bin/bash
# Deploy script cho máy cửa hàng (Ubuntu)
# Chạy: bash deploy.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "=== Build frontend ==="
cd frontend
npm ci
npm run build
cd ..

echo "=== Build backend ==="
cd backend
go build -o ../taphoa-server .
cd ..

echo "=== Done ==="
echo "Binary: $PROJECT_DIR/taphoa-server"
echo ""
echo "Chạy thử: ./taphoa-server"
echo "Hoặc cài systemd service: sudo bash install-service.sh"
