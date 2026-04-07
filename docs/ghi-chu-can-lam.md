# Ghi chú các việc cần làm

> Cập nhật: 07/04/2026

---

## 1. HSD toggle (phân biệt sản phẩm có/không có hạn sử dụng)

**Vấn đề:** Nếu không có toggle, tất cả sản phẩm đều bắt buộc nhập HSD khi nhập hàng, dù là chổi lau nhà.

**Phân loại:**
- Có HSD: thực phẩm (mì gói, nước ngọt, sữa, bánh kẹo), hóa mỹ phẩm (nước rửa chén, xà bông)
- Không có HSD: dụng cụ (chổi, lau nhà, bao tay), văn phòng phẩm (bút, giấy), đồ dùng (bóng đèn, ổ cắm)

**3 giải pháp đề xuất:**
1. Giữ toggle, mặc định bật (vì đa số SP tạp hóa có HSD) — **hiện tại đang dùng cách này**
2. Bỏ toggle, cho phép để trống HSD khi nhập hàng
3. Tạo danh sách nhóm hàng thường có HSD để auto bật

**Trạng thái:** Chưa quyết định

---

## 2. POS: hiện sản phẩm hết hàng với cảnh báo

**Vấn đề:** Hiện tại SP hết hàng (tồn kho = 0) không tìm thấy ở POS. Mẹ không biết SP đó có trong hệ thống hay không.

**Yêu cầu:**
- Tìm SP bằng mã/tên ở POS vẫn hiện SP hết hàng
- Hiển thị cảnh báo "Hết hàng"
- Không cho bấm thanh toán hóa đơn có SP hết hàng
- Khi nào nhập thêm hàng thì mới cho thanh toán

**Trạng thái:** Chưa làm — task lớn, sẽ tạo PR riêng

---

## 3. Các việc cần làm tiếp (từ review)

### Đã fix trong branch phase6-deploy:
- [x] Path traversal vulnerability (dùng r.NoRoute thay middleware tự viết)
- [x] Binary taphoa-server vào .gitignore
- [x] CORS chỉ bật khi dev
- [x] deploy.sh thêm npm ci
- [x] Graceful shutdown
- [x] r.NoRoute trả JSON 404 cho /api/* (không trả HTML)
- [x] cancel() scheduler trước khi shutdown
- [x] Xóa Typography import thừa ở ProductsPage
- [x] Fix printBarcode gọi print() 2 lần
- [x] Xóa showAction={false} thừa ở 5 pages

### Chưa fix (low priority, làm sau):
- [ ] EmptyState chỉ có ở 4/14 trang — thêm cho các trang còn lại
- [ ] Currency formatter regex trùng lặp 8 chỗ — tạo util chung
- [ ] Date formatting trùng lặp 17 chỗ — tạo formatDate/formatDateTime
- [ ] paymentLabel trùng lặp và không nhất quán giữa InvoicesPage và InvoiceDetailPage
- [ ] Debounce delay hardcode 300 ở 2 file thay vì dùng DEBOUNCE_DELAY constant
- [ ] err: any ở 22 catch blocks — dùng unknown + helper function
