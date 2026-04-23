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

## 3. Tính toán giá sản phẩm hợp lý

**Vấn đề:** Hiện tại hệ thống chỉ lưu giá bán cố định (sell_price), không có công cụ hỗ trợ tính giá bán hợp lý dựa trên giá nhập.

**Yêu cầu cốt lõi:** Giá bán phải bù được cả giá nhập + chi phí vận hành (điện, nước, thuế, mặt bằng, v.v.), không chỉ lời trên từng SP.

**Cần có:**
- Nhập chi phí vận hành hàng tháng (điện, nước, thuế, mặt bằng, nhân công, v.v.)
- Tính chi phí vận hành phân bổ trên mỗi SP (dựa trên số lượng bán ra tháng trước hoặc dự kiến)
- Gợi ý giá bán = giá nhập + chi phí phân bổ + % lợi nhuận mong muốn
- Hiển thị biên lợi nhuận thực tế (sau khi trừ cả chi phí vận hành)
- Cảnh báo nếu giá bán không đủ bù chi phí (bán lỗ ẩn)
- So sánh giá nhập giữa các lần nhập (giá nhập tăng/giảm)

**Ví dụ:**
- Chi phí vận hành tháng: 5.000.000đ (điện 1tr, nước 200k, thuế 500k, mặt bằng 3tr, khác 300k)
- Tháng trước bán 2.000 SP → chi phí phân bổ mỗi SP: ~2.500đ
- SP nhập 10.000đ → giá tối thiểu phải bán: 12.500đ (chưa tính lời)
- Muốn lời 15% → gợi ý bán: ~14.375đ

**Trạng thái:** Chưa làm

---

## 4. Các việc cần làm tiếp (từ review)

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

### Đã fix trong branch fix-ui-ux:
- [x] EmptyState — thêm cho 12/20 pages (8 pages đặc biệt không cần: Login, Dashboard, Reports, POS, detail pages)
- [x] Currency formatter — tạo `formatVND()` util, dùng chung hết
- [x] Date formatting — tạo `formatDate()`/`formatDateTime()` util, dùng chung hết
- [x] paymentLabel — tạo `PAYMENT_LABEL`/`PAYMENT_LABEL_SHORT` constants
- [x] Debounce delay — dùng `DEBOUNCE_DELAY` constant thay hardcode
- [x] err: any — đổi hết sang `unknown` + `getErrorMessage()` helper
