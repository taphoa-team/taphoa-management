# PLAN — Phase 3: Cảnh báo hết hạn + hàng sắp hết

> Ngày tạo: 03/04/2026
> Mục tiêu: Dashboard cảnh báo thông minh + Telegram Bot tự động thông báo mỗi sáng
> Ghi chú: Phase 2 (Công nợ) đã xong trong Phase 1 → skip

---

## Tình trạng hiện tại

- `product_batches.expiry_date` đã có sẵn (nullable, lưu theo lô)
- `products.has_expiry` flag đã có
- `products.min_quantity` đã có → low-stock warning đã hoạt động
- DashboardPage hiện chỉ show low-stock (client-side filter, limit 200) — chưa có expiry alerts
- **Chưa có:** alert API, Telegram bot, scheduled jobs

---

## Wave 1 — Backend APIs cảnh báo

| # | Việc | Chi tiết |
|---|------|---------|
| 1.1 | `GET /api/alerts/expiry` | Query batches có `expiry_date` trong 7/15/30 ngày tới (configurable via query param `days`). Chỉ lấy batches có `quantity > 0`. Trả về kèm product name, batch info, số ngày còn lại |
| 1.2 | `GET /api/alerts/low-stock` | Query products có stock ≤ min_quantity (dùng lại `getStockMap`). Server-side filter — không cần client filter limit 200 nữa |
| 1.3 | `GET /api/alerts/summary` | Tổng hợp: bao nhiêu SP sắp hết hạn, bao nhiêu SP sắp hết kho — dùng cho dashboard cards |

**File mới:** `backend/handlers/alert.go`
**Routes mới:** thêm vào `routes.go` trong group `auth`

---

## Wave 2 — Frontend cảnh báo

| # | Việc | Chi tiết |
|---|------|---------|
| 2.1 | Nâng cấp DashboardPage | Thay client-side filter bằng API `/alerts/summary` + `/alerts/expiry?days=7` + `/alerts/low-stock`. Thêm bảng hàng sắp hết hạn (tên SP, lô, HSD, số ngày còn lại) |
| 2.2 | Trang cảnh báo chi tiết | Trang `/alerts` mới — 2 tabs: "Sắp hết hạn" (filter 7/15/30 ngày) + "Sắp hết kho". Có nút "Xuất hủy" link sang WastePage |

---

## Wave 3 — Telegram Bot

| # | Việc | Chi tiết |
|---|------|---------|
| 3.1 | Tạo Telegram Bot | Tạo bot qua @BotFather, lưu token vào env `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` |
| 3.2 | Backend: gửi message | Hàm `sendTelegramAlert(message string)` dùng Telegram Bot API (`/sendMessage`) |
| 3.3 | Backend: scheduled job | Goroutine chạy mỗi sáng 7:00 — query hàng sắp hết hạn (7 ngày) + hàng sắp hết → gửi Telegram |
| 3.4 | API thủ công | `POST /api/alerts/send-telegram` — admin bấm nút gửi cảnh báo ngay lập tức |

---

## Thứ tự thực hiện

```
Wave 1 (backend):
  1.1 expiry API ──→ 1.2 low-stock API ──→ 1.3 summary API

Wave 2 (frontend):
  2.1 Dashboard upgrade ──→ 2.2 Alerts page

Wave 3 (Telegram):
  3.1 Tạo bot ──→ 3.2 Send function ──→ 3.3 Scheduler ──→ 3.4 Manual trigger

Commit + PR sau mỗi wave
```

---

## Ước tính

| Wave | Độ phức tạp | Ghi chú |
|------|-------------|---------|
| Wave 1 | Thấp | Query đơn giản, data đã có sẵn |
| Wave 2 | Thấp-Trung bình | Chủ yếu là UI, pattern giống các page đã làm |
| Wave 3 | Trung bình | Telegram API đơn giản, nhưng cần scheduler + env config |
