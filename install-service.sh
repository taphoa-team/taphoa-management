#!/bin/bash
# Cài systemd service để chạy app 24/7
# Chạy: sudo bash install-service.sh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
USER=$(logname)

# Tạo file .env nếu chưa có
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    cp "$PROJECT_DIR/backend/.env.example" "$PROJECT_DIR/backend/.env"
    echo "Đã tạo backend/.env — cần sửa thông tin SMTP trước khi dùng email"
fi

# Tạo systemd service
cat > /etc/systemd/system/taphoa.service << EOF
[Unit]
Description=Taphoa Management Server
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/backend
ExecStart=$PROJECT_DIR/taphoa-server
EnvironmentFile=$PROJECT_DIR/backend/.env
Environment=GIN_MODE=release
Environment=STATIC_DIR=$PROJECT_DIR/frontend/build
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Reload và start
systemctl daemon-reload
systemctl enable taphoa
systemctl restart taphoa

echo "=== Service đã cài ==="
echo "Xem status: sudo systemctl status taphoa"
echo "Xem log:    sudo journalctl -u taphoa -f"
echo "Restart:    sudo systemctl restart taphoa"
echo "Stop:       sudo systemctl stop taphoa"
