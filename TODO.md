# TODO — Taphoa Management

> Cập nhật: 26/03/2026

---

## Phase 0: Setup (tuần 0)

### Database & Backend setup
- [x] Thiết kế database (20 bảng)
- [x] Tạo repo GitHub (private)
- [x] Init Go project + cài dependencies (Gin, GORM, JWT, bcrypt)
- [x] Viết GORM models (20 files)
- [x] Viết config/database.go (kết nối PostgreSQL)
- [x] Viết main.go (khởi động server + auto migrate)
- [x] Viết routes/routes.go (health check)
- [x] Viết docker-compose.yml (PostgreSQL port 5433)
- [x] Chạy docker compose up + go run main.go → verify 20 bảng được tạo ✅
- [ ] Init frontend (React + TypeScript + Ant Design)
- [ ] Commit đầu tiên lên GitHub

### Tài liệu (không block code)
- [ ] Hỏi trường yêu cầu báo cáo
- [ ] Hỏi mẹ 8 câu ưu tiên cao
- [ ] Điền 58 câu hỏi tính năng (cau-hoi-tinh-nang.md)

---

## Phase 1: Sản phẩm + Bán hàng + Nhập hàng + Tồn kho + Phân quyền (tuần 1-3)

### 1A. Auth — Đăng nhập + Phân quyền
- [ ] API đăng ký (POST /api/auth/register) — chỉ admin mới tạo được user mới
- [ ] API đăng nhập (POST /api/auth/login) → trả JWT token
- [ ] Middleware xác thực JWT (kiểm tra token mỗi request)
- [ ] Middleware phân quyền (admin vs staff)
- [ ] API lấy thông tin user hiện tại (GET /api/auth/me)
- [ ] Tạo tài khoản admin mặc định khi chạy lần đầu (seed data)
- [ ] Frontend: trang login
- [ ] Frontend: redirect về login nếu chưa đăng nhập

### 1B. Nhóm hàng (Categories)
- [ ] API CRUD nhóm hàng (GET/POST/PUT/DELETE /api/categories)
- [ ] Frontend: trang quản lý nhóm hàng

### 1C. Sản phẩm (Products)
- [ ] API thêm sản phẩm (POST /api/products) — tự sinh SKU
- [ ] API sửa sản phẩm (PUT /api/products/:id)
- [ ] API danh sách sản phẩm (GET /api/products) — lọc theo nhóm, tìm kiếm theo tên/SKU/barcode
- [ ] API chi tiết sản phẩm (GET /api/products/:id) — kèm danh sách lô
- [ ] API ngừng bán sản phẩm (PATCH /api/products/:id/deactivate)
- [ ] API tạo barcode từ SKU + in tem
- [ ] Frontend: trang danh sách sản phẩm (bảng + tìm kiếm + lọc)
- [ ] Frontend: form thêm/sửa sản phẩm
- [ ] Frontend: nút in tem barcode

### 1D. Quy đổi đơn vị (Unit Conversions)
- [ ] API CRUD quy đổi (GET/POST/PUT/DELETE /api/products/:id/conversions)
- [ ] Frontend: quản lý quy đổi trong form sản phẩm

### 1E. Nhà cung cấp (Suppliers)
- [ ] API CRUD nhà cung cấp (GET/POST/PUT/DELETE /api/suppliers)
- [ ] Frontend: trang quản lý nhà cung cấp

### 1F. Nhập hàng (Purchase Orders)
- [ ] API tạo đơn nhập (POST /api/purchase-orders) → tạo batch + cộng tồn kho
- [ ] API danh sách đơn nhập (GET /api/purchase-orders)
- [ ] API chi tiết đơn nhập (GET /api/purchase-orders/:id)
- [ ] API hủy đơn nhập (PATCH /api/purchase-orders/:id/cancel) → trừ lại tồn kho
- [ ] Frontend: form tạo đơn nhập (chọn NCC, thêm SP, nhập số lượng + giá + HSD)
- [ ] Frontend: danh sách đơn nhập

### 1G. Ca bán hàng (Shifts)
- [ ] API mở ca (POST /api/shifts/open) — nhập tiền đầu ca
- [ ] API đóng ca (POST /api/shifts/:id/close) — nhập tiền cuối ca, tính chênh lệch
- [ ] API ca hiện tại (GET /api/shifts/current)
- [ ] Frontend: popup mở ca khi bắt đầu bán hàng
- [ ] Frontend: popup đóng ca + hiển thị đối soát

### 1H. Bán hàng (Invoices)
- [ ] API tạo đơn bán (POST /api/invoices) → trừ tồn kho theo FIFO
- [ ] API danh sách đơn bán (GET /api/invoices) — lọc theo ngày, ca, nhân viên
- [ ] API chi tiết đơn bán (GET /api/invoices/:id)
- [ ] API hủy đơn (PATCH /api/invoices/:id/cancel) → cộng lại tồn kho
- [ ] Logic tính tiền thừa (cash_given - cash_amount)
- [ ] Logic thanh toán kết hợp (tiền mặt + chuyển khoản)
- [ ] Logic mua nợ (payment_method = debt → tạo debt record)
- [ ] Frontend: trang POS (chọn hàng → thêm vào đơn → thanh toán)
- [ ] Frontend: tìm SP bằng tên / quét barcode
- [ ] Frontend: chọn mệnh giá tiền khách đưa (50k, 100k, 200k, 500k)
- [ ] Frontend: nút chọn phương thức (tiền mặt / CK / kết hợp / nợ)
- [ ] Frontend: tạm giữ đơn (localStorage) — đang bán cho A, khách B tới
- [ ] Frontend: lịch sử đơn hàng

### 1I. Trả hàng (Returns)
- [ ] API tạo phiếu trả (POST /api/returns) → cộng lại tồn kho
- [ ] API danh sách phiếu trả (GET /api/returns)
- [ ] Frontend: form trả hàng (chọn đơn gốc → chọn SP trả → hoàn tiền)

### 1J. Tồn kho
- [ ] API xem tồn kho (GET /api/inventory) — tổng từ batches, cảnh báo sắp hết
- [ ] API xem lô hàng theo SP (GET /api/products/:id/batches)
- [ ] Frontend: trang tồn kho (bảng SP + số lượng + cảnh báo đỏ/vàng)

### 1K. Kiểm kê kho (Inventory Checks)
- [ ] API tạo đợt kiểm kê (POST /api/inventory-checks)
- [ ] API cập nhật số lượng thực tế (PUT /api/inventory-checks/:id/items)
- [ ] API xác nhận kiểm kê (POST /api/inventory-checks/:id/confirm) → điều chỉnh tồn kho
- [ ] Frontend: form kiểm kê (danh sách SP + ô nhập số thực tế + hiển thị chênh lệch)

### 1L. Xuất hủy (Waste Records)
- [ ] API tạo phiếu hủy (POST /api/waste) → trừ tồn kho
- [ ] API danh sách phiếu hủy (GET /api/waste)
- [ ] Frontend: form xuất hủy (chọn SP, lô, lý do)

---

## Phase 2: Công nợ khách hàng (tuần 4)

### 2A. Khách hàng (Customers)
- [ ] API CRUD khách hàng (GET/POST/PUT/DELETE /api/customers)
- [ ] API lịch sử mua hàng của khách (GET /api/customers/:id/invoices)
- [ ] Frontend: trang quản lý khách hàng
- [ ] Frontend: chi tiết khách (thông tin + lịch sử mua + công nợ)

### 2B. Công nợ (Debts)
- [ ] API xem công nợ theo khách (GET /api/customers/:id/debts)
- [ ] API ghi nhận trả nợ (POST /api/debts/payment)
- [ ] API danh sách tất cả khách nợ (GET /api/debts/summary)
- [ ] Frontend: trang công nợ (danh sách khách nợ, tổng nợ, chi tiết)
- [ ] Frontend: form ghi nhận trả nợ

---

## Phase 3: Cảnh báo hết hạn + hàng sắp hết (tuần 5)

- [ ] API hàng sắp hết hạn (GET /api/alerts/expiry) — 7/15/30 ngày
- [ ] API hàng sắp hết kho (GET /api/alerts/low-stock)
- [ ] Frontend: dashboard cảnh báo (hàng sắp hết hạn + sắp hết kho)
- [ ] Thông báo Telegram Bot khi có hàng sắp hết hạn (chạy tự động mỗi sáng)

---

## Phase 4: Báo cáo + Giảm giá (tuần 6)

### 4A. Báo cáo
- [ ] API doanh thu theo ngày/tuần/tháng (GET /api/reports/revenue)
- [ ] API lãi/lỗ (GET /api/reports/profit)
- [ ] API hàng bán chạy/ế (GET /api/reports/top-products)
- [ ] API báo cáo tồn kho (GET /api/reports/inventory)
- [ ] API so sánh doanh thu giữa các tháng (GET /api/reports/compare)
- [ ] Xuất báo cáo Excel
- [ ] Frontend: trang báo cáo (biểu đồ + bảng)

### 4B. Giảm giá + Lịch sử giá
- [ ] API CRUD chương trình giảm giá (GET/POST/PUT/DELETE /api/discounts)
- [ ] Logic tự động áp dụng giảm giá khi bán hàng
- [ ] API xem lịch sử thay đổi giá (GET /api/products/:id/price-history)
- [ ] Tự động ghi price_history khi sửa giá bán
- [ ] Frontend: trang quản lý giảm giá
- [ ] Frontend: hiển thị lịch sử giá trong chi tiết SP

---

## Phase 5: AI trợ lý (tuần 7)

- [ ] Tích hợp LLM API (OpenAI/Gemini)
- [ ] Chuyển câu hỏi tiếng Việt → query DB → trả kết quả
- [ ] Frontend: ô chat trên dashboard
- [ ] Test các câu hỏi phổ biến

---

## Phase 6: Báo cáo tốt nghiệp + Polish (tuần 8-9)

### Polish
- [ ] Setup PWA (icon app, full màn hình)
- [ ] Responsive cho điện thoại
- [ ] UI: chữ to, ít bước thao tác
- [ ] Import dữ liệu từ Excel/KiotViet
- [ ] Backup tự động database
- [ ] Hướng dẫn sử dụng (tooltip/tour)
- [ ] Cho mẹ dùng thử + fix bugs

### Báo cáo
- [ ] Viết báo cáo tốt nghiệp (theo yêu cầu trường)
- [ ] Chụp screenshot cho báo cáo
- [ ] Chuẩn bị slide thuyết trình
- [ ] Deploy lên máy cửa hàng + Cloudflare Tunnel

### Bảo vệ
- [ ] Cài app lên laptop
- [ ] Quay video demo (quét barcode, in tem, bán hàng)
- [ ] Chuẩn bị trả lời câu hỏi giám khảo
