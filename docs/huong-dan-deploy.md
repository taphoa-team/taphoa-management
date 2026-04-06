# Hướng dẫn Deploy

## Bước 1: Build & cài service

```bash
# Build frontend + backend
bash deploy.sh

# Cài systemd service (chạy 24/7)
sudo bash install-service.sh
```

Kiểm tra: `sudo systemctl status taphoa` → phải thấy "active (running)"

Mở trình duyệt: `http://localhost:8082` → thấy trang đăng nhập

## Bước 2: Cloudflare Tunnel (truy cập từ xa)

### 2.1. Cài cloudflared

```bash
# Ubuntu/Debian
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

### 2.2. Đăng nhập Cloudflare

```bash
cloudflared tunnel login
# Mở link trong trình duyệt → chọn domain → authorize
```

### 2.3. Tạo tunnel

```bash
# Tạo tunnel tên "taphoa"
cloudflared tunnel create taphoa

# Lấy tunnel ID (ghi lại)
cloudflared tunnel list
```

### 2.4. Config tunnel

```bash
mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml << EOF
tunnel: <TUNNEL_ID>
credentials-file: /home/$USER/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: taphoa.your-domain.com
    service: http://localhost:8082
  - service: http_status:404
EOF
```

Thay `<TUNNEL_ID>` bằng ID từ bước 2.3, `taphoa.your-domain.com` bằng domain thật.

### 2.5. Thêm DNS record

```bash
cloudflared tunnel route dns taphoa taphoa.your-domain.com
```

### 2.6. Cài tunnel service (chạy 24/7)

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### 2.7. Test

Mở `https://taphoa.your-domain.com` từ điện thoại → thấy trang đăng nhập!

## Xử lý lỗi

```bash
# Xem log app
sudo journalctl -u taphoa -f

# Xem log tunnel
sudo journalctl -u cloudflared -f

# Restart app
sudo systemctl restart taphoa

# Restart tunnel
sudo systemctl restart cloudflared
```
