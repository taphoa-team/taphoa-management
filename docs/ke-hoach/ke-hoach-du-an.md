# Kế hoạch đồ án tốt nghiệp — Quản lý cửa hàng tạp hóa

> Ngày tạo: 26/03/2026
> Deadline: Đầu tháng 6/2026 (~9 tuần)
> Thời gian: 1-2 tiếng/ngày (~7-14 tiếng/tuần, tổng ~63-126 tiếng)
> Mục tiêu: Mẹ dùng được thật + đủ báo cáo cho trường

---

## Tổng quan 7 phases

```
Phase 1 (tuần 1-3):  Nền tảng + Sản phẩm + Bán hàng + Nhập hàng + Tồn kho + Phân quyền
Phase 2 (tuần 4):    Công nợ khách hàng (thay sổ tay + Excel)
Phase 3 (tuần 5):    Cảnh báo hết hạn + hàng sắp hết
Phase 4 (tuần 6):    Báo cáo doanh thu/lãi lỗ
Phase 5 (tuần 7):    AI trợ lý (hỏi bằng tiếng Việt thay bấm nút)
Phase 6 (tuần 8-9):  Báo cáo tốt nghiệp + polish UI + test thực tế
```

---

## TUẦN 0 — Chuẩn bị (27/3 - 30/3, 3-4 ngày)

### Việc KHÔNG cần code:
- [ ] **Hỏi trường** yêu cầu báo cáo: mẫu, số chương, cần UML/ERD không, ngày nộp chính xác
- [ ] **Hỏi mẹ 8 câu ưu tiên cao** (xem cuối file)
- [ ] **Thiết kế database** cho Phase 1-3
- [ ] **Vẽ wireframe** trên giấy: trang bán hàng, trang sản phẩm, trang tồn kho → cho mẹ xem

### Setup project:
- [ ] Tạo repo Git
- [ ] Init backend: Go + Gin + GORM + PostgreSQL
- [ ] Init frontend: React + TypeScript + Ant Design
- [ ] Chạy được "Hello World" cả 2 đầu

---

## PHASE 1 — Sản phẩm + Bán hàng + Nhập hàng + Tồn kho (tuần 1-3)

> Đây là lõi của app. Xong phase này = đã dùng được cơ bản.

### Tuần 1 (31/3 - 6/4): Backend core + Sản phẩm

| Ngày | Việc | Chi tiết |
|------|------|----------|
| T2-T3 | Database + Models + Auth | Tạo bảng: products, categories, users, roles. Viết GORM models. Login + JWT + phân quyền admin/nhân viên |
| T4-T5 | API sản phẩm | CRUD products: thêm/sửa/xóa/tìm kiếm. API categories |
| T6-CN | Frontend sản phẩm | Trang danh sách sản phẩm, form thêm/sửa, tìm kiếm, tạo + in tem barcode |

### Tuần 2 (7/4 - 13/4): Bán hàng

| Ngày | Việc | Chi tiết |
|------|------|----------|
| T2-T3 | Database + API | Bảng invoices, invoice_items. API tạo hóa đơn, trừ tồn kho |
| T4-T5 | Trang bán hàng | Giao diện POS: chọn hàng → thêm vào đơn → thanh toán |
| T6-CN | Lịch sử đơn hàng | Xem lại đơn đã bán, sửa/hủy đơn (KHÔNG tạo nợ ảo) |

### Tuần 3 (14/4 - 20/4): Nhập hàng + Tồn kho

| Ngày | Việc | Chi tiết |
|------|------|----------|
| T2-T3 | API nhập hàng | Bảng purchase_orders. Nhập hàng → cộng tồn kho, cập nhật giá vốn |
| T4-T5 | Frontend nhập hàng | Form nhập hàng, lịch sử nhập |
| T6-CN | Trang tồn kho | Xem tồn kho, cảnh báo sắp hết, so sánh số liệu |

> 🎯 **Checkpoint Phase 1:** Cho mẹ dùng thử. Hỏi feedback.

---

## PHASE 2 — Công nợ khách hàng (tuần 4)

> Thay thế sổ tay NV + sổ mẹ + Excel → 1 chỗ duy nhất.

### Tuần 4 (21/4 - 27/4)

| Ngày | Việc | Chi tiết |
|------|------|----------|
| T2-T3 | Database + API | Bảng customers, debts. Bán nợ → ghi nhận. Trả nợ → trừ dần |
| T4-T5 | Frontend công nợ | Danh sách khách nợ, chi tiết từng khách, ghi nhận trả nợ |
| T6-CN | Lịch sử + báo cáo nợ | Xem lịch sử nợ, tổng nợ, khách nợ nhiều nhất |

> 🎯 **Checkpoint Phase 2:** Mẹ đối chiếu với sổ tay hiện tại.

---

## PHASE 3 — Cảnh báo hết hạn + hàng sắp hết (tuần 5)

> Tính năng mẹ muốn NHẤT.

### Tuần 5 (28/4 - 4/5)

| Ngày | Việc | Chi tiết |
|------|------|----------|
| T2-T3 | Thêm expiry_date | Thêm field HSD vào products. API lọc hàng sắp hết hạn |
| T4-T5 | Dashboard cảnh báo | Trang chính: hàng sắp hết hạn (7/15/30 ngày), hàng sắp hết kho |
| T6-CN | Thông báo | Thông báo qua Zalo/Telegram khi có hàng sắp hết hạn |

> 🎯 **Checkpoint Phase 3:** Mẹ nhập HSD cho ~20 sản phẩm test.

---

## PHASE 4 — Báo cáo doanh thu (tuần 6)

### Tuần 6 (5/5 - 11/5)

| Ngày | Việc | Chi tiết |
|------|------|----------|
| T2-T3 | API báo cáo | Doanh thu theo ngày/tuần/tháng. Lãi/lỗ = doanh thu - giá vốn |
| T4-T5 | Frontend báo cáo | Biểu đồ đơn giản, bảng tổng hợp, hàng bán chạy/ế |
| T6-CN | Export | Xuất báo cáo Excel (nếu kịp) |

> 🎯 **Checkpoint Phase 4:** Mẹ xem báo cáo, đối chiếu với thực tế.

---

## PHASE 5 — AI trợ lý (tuần 7)

> Người dùng gõ tiếng Việt hỏi thay vì bấm nút. Ví dụ: "hàng nào sắp hết hạn?", "hôm nay bán được bao nhiêu?"

### Tuần 7 (12/5 - 18/5)

| Ngày | Việc | Chi tiết |
|------|------|----------|
| T2-T3 | Tích hợp LLM | Kết nối API (OpenAI/Gemini/local model). Gửi câu hỏi → nhận câu trả lời |
| T4-T5 | Chuyển câu hỏi → query DB | AI hiểu "hàng sắp hết hạn" → gọi API lọc sản phẩm → trả kết quả |
| T6-CN | Chat UI + test | Ô chat trên dashboard, test các câu hỏi phổ biến |

> 🎯 **Checkpoint Phase 5:** Mẹ hỏi thử 5-10 câu, xem AI trả lời đúng không.

---

## PHASE 6 — Báo cáo tốt nghiệp + Polish (tuần 8-9)

### Tuần 8 (19/5 - 25/5): Viết báo cáo

- [ ] Chương 1: Giới thiệu đề tài, lý do chọn đề tài
- [ ] Chương 2: Cơ sở lý thuyết (Go, React, PostgreSQL...)
- [ ] Chương 3: Phân tích yêu cầu (khảo sát, use case, ERD)
- [ ] Chương 4: Thiết kế hệ thống (kiến trúc, database, API)
- [ ] Chương 5: Triển khai + kết quả (screenshot, hướng dẫn cài đặt)
- [ ] Chương 6: Kết luận + hướng phát triển

> ⚠️ Cấu trúc chương sẽ thay đổi khi biết yêu cầu trường

### Tuần 9 (26/5 - 1/6): Polish + Test + Hoàn thiện

- [ ] Setup PWA (icon app, full màn hình, cài trên điện thoại)
- [ ] Sửa UI: chữ to, ít bước thao tác, responsive cho điện thoại
- [ ] Cho mẹ dùng thử, ghi nhận lỗi, fix bugs
- [ ] Chụp screenshot cho báo cáo
- [ ] Hoàn thiện báo cáo
- [ ] Chuẩn bị slide thuyết trình (nếu cần)
- [ ] Deploy lên máy tính cửa hàng

---

## 8 câu hỏi mẹ — ưu tiên cao (hỏi trong tuần 0)

1. Bao nhiêu loại hàng trên KiotViet?
2. Bao nhiêu lượt khách/ngày?
3. Doanh thu trung bình/ngày?
4. Phí KiotViet bao nhiêu/tháng?
5. File Excel ghi công nợ có những cột gì?
6. Tại sao lãi/lỗ chỉ biết 80%?
7. Tính năng nào hay dùng nhất trên KiotViet?
8. Khi nhập hàng, quyết định nhập gì bằng cách nào?

---

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend | React + TypeScript + Ant Design |
| Backend | Go + Gin + GORM |
| Database | PostgreSQL (chạy trên máy cửa hàng) |
| Auth | JWT (đơn giản: 1 admin + 1 nhân viên) |
| Thông báo | Telegram Bot (dễ hơn Zalo OA) |
| Deploy | Máy tính cửa hàng (self-host, 0đ/tháng) |
| Remote access | Cloudflare Tunnel (đã có domain, miễn phí, để bảo dưỡng từ xa) |

### Môi trường

| | Dev | Prod |
|---|---|---|
| Máy | Máy tính cá nhân (thb) | Máy tính cửa hàng |
| Database | PostgreSQL local | PostgreSQL local |
| Truy cập | localhost | WiFi cửa hàng + Cloudflare Tunnel (từ xa) |

---

## Rủi ro & cách xử lý

| Rủi ro | Xác suất | Cách xử lý |
|--------|----------|------------|
| Không kịp deadline | Trung bình | Phase 5 (AI trợ lý) cắt đầu tiên, rồi Phase 4 (báo cáo doanh thu) |
| Chưa biết yêu cầu trường | Cao | Hỏi NGAY trong tuần 0, không trì hoãn |
| Mẹ không quen dùng | Trung bình | Cho test từ Phase 1, sửa sớm |
| Stuck khi code | Cao | Hỏi Claude, nhưng phải tự trace trước |
| B3 bận, không có thời gian | Trung bình | Tối thiểu 1 tiếng/ngày, ưu tiên cuối tuần |
