# TODO — Taphoa Management

> Cập nhật: 08/06/2026

---

## Phase 0: Setup ✅

### Database & Backend setup
- [x] Thiết kế database (20 bảng)
- [x] Tạo repo GitHub (private)
- [x] Init Go project + cài dependencies (Gin, GORM, JWT, bcrypt)
- [x] Viết GORM models (20 files)
- [x] Viết config/database.go (kết nối PostgreSQL)
- [x] Viết main.go (khởi động server + auto migrate)
- [x] Viết routes/routes.go (health check)
- [x] Viết docker-compose.yml (PostgreSQL port 5433)
- [x] Chạy docker compose up + go run main.go → verify 20 bảng được tạo
- [x] Init frontend (React + TypeScript + Ant Design)
- [x] Commit đầu tiên lên GitHub

### Tài liệu (không block code)
- [ ] Hỏi trường yêu cầu báo cáo
- [ ] Hỏi mẹ 8 câu ưu tiên cao
- [ ] Điền 58 câu hỏi tính năng (cau-hoi-tinh-nang.md)

---

## Phase 1: Sản phẩm + Bán hàng + Nhập hàng + Tồn kho + Phân quyền ✅

> Merged: PR #1 (backend), PR #2 (frontend)

### 1A. Auth — Đăng nhập + Phân quyền
- [x] API đăng ký (POST /api/auth/register) — chỉ admin mới tạo được user mới
- [x] API đăng nhập (POST /api/auth/login) → trả JWT token
- [x] Middleware xác thực JWT (kiểm tra token mỗi request)
- [x] Middleware phân quyền (admin vs staff)
- [x] API lấy thông tin user hiện tại (GET /api/auth/me)
- [x] Tạo tài khoản admin mặc định khi chạy lần đầu (seed data)
- [x] Frontend: trang login
- [x] Frontend: redirect về login nếu chưa đăng nhập

### 1B. Nhóm hàng (Categories)
- [x] API CRUD nhóm hàng (GET/POST/PUT/DELETE /api/categories)
- [x] Frontend: trang quản lý nhóm hàng

### 1C. Sản phẩm (Products)
- [x] API thêm sản phẩm (POST /api/products) — tự sinh SKU
- [x] API sửa sản phẩm (PUT /api/products/:id)
- [x] API danh sách sản phẩm (GET /api/products) — lọc theo nhóm, tìm kiếm theo tên/SKU/barcode
- [x] API chi tiết sản phẩm (GET /api/products/:id) — kèm danh sách lô
- [x] API ngừng bán sản phẩm (PATCH /api/products/:id/deactivate)
- [x] API tạo barcode từ SKU + in tem
- [x] Frontend: trang danh sách sản phẩm (bảng + tìm kiếm + lọc)
- [x] Frontend: form thêm/sửa sản phẩm
- [x] Frontend: nút in tem barcode

### 1D. Quy đổi đơn vị (Unit Conversions)
- [x] API CRUD quy đổi (GET/POST/PUT/DELETE /api/products/:id/conversions)
- [x] Frontend: quản lý quy đổi trong form sản phẩm

### 1E. Nhà cung cấp (Suppliers)
- [x] API CRUD nhà cung cấp (GET/POST/PUT/DELETE /api/suppliers)
- [x] Frontend: trang quản lý nhà cung cấp

### 1F. Nhập hàng (Purchase Orders)
- [x] API tạo đơn nhập (POST /api/purchase-orders) → tạo batch + cộng tồn kho
- [x] API danh sách đơn nhập (GET /api/purchase-orders)
- [x] API chi tiết đơn nhập (GET /api/purchase-orders/:id)
- [x] API hủy đơn nhập (PATCH /api/purchase-orders/:id/cancel) → trừ lại tồn kho
- [x] Frontend: form tạo đơn nhập (chọn NCC, thêm SP, nhập số lượng + giá + HSD)
- [x] Frontend: danh sách đơn nhập

### 1G. Ca bán hàng (Shifts)
- [x] API mở ca (POST /api/shifts/open) — nhập tiền đầu ca
- [x] API đóng ca (POST /api/shifts/:id/close) — nhập tiền cuối ca, tính chênh lệch
- [x] API ca hiện tại (GET /api/shifts/current)
- [x] Frontend: popup mở ca khi bắt đầu bán hàng
- [x] Frontend: popup đóng ca + hiển thị đối soát

### 1H. Bán hàng (Invoices)
- [x] API tạo đơn bán (POST /api/invoices) → trừ tồn kho theo FIFO
- [x] API danh sách đơn bán (GET /api/invoices) — lọc theo ngày, ca, nhân viên
- [x] API chi tiết đơn bán (GET /api/invoices/:id)
- [x] API hủy đơn (PATCH /api/invoices/:id/cancel) → cộng lại tồn kho
- [x] Logic tính tiền thừa (cash_given - cash_amount)
- [x] Logic thanh toán kết hợp (tiền mặt + chuyển khoản)
- [x] Logic mua nợ (payment_method = debt → tạo debt record)
- [x] Frontend: trang POS (chọn hàng → thêm vào đơn → thanh toán)
- [x] Frontend: tìm SP bằng tên / quét barcode
- [x] Frontend: chọn mệnh giá tiền khách đưa (50k, 100k, 200k, 500k)
- [x] Frontend: nút chọn phương thức (tiền mặt / CK / kết hợp / nợ)
- [x] Frontend: tạm giữ đơn (localStorage) — đang bán cho A, khách B tới
- [x] Frontend: lịch sử đơn hàng

### 1I. Trả hàng (Returns)
- [x] API tạo phiếu trả (POST /api/returns) → cộng lại tồn kho
- [x] API danh sách phiếu trả (GET /api/returns)
- [x] Frontend: form trả hàng (chọn đơn gốc → chọn SP trả → hoàn tiền)

### 1J. Tồn kho
- [x] API xem tồn kho (GET /api/inventory) — tổng từ batches, cảnh báo sắp hết
- [x] API xem lô hàng theo SP (GET /api/products/:id/batches)
- [x] Frontend: trang tồn kho (bảng SP + số lượng + cảnh báo đỏ/vàng)

### 1K. Kiểm kê kho (Inventory Checks)
- [x] API tạo đợt kiểm kê (POST /api/inventory-checks)
- [x] API cập nhật số lượng thực tế (PUT /api/inventory-checks/:id/items)
- [x] API xác nhận kiểm kê (POST /api/inventory-checks/:id/confirm) → điều chỉnh tồn kho
- [x] Frontend: form kiểm kê (danh sách SP + ô nhập số thực tế + hiển thị chênh lệch)

### 1L. Xuất hủy (Waste Records)
- [x] API tạo phiếu hủy (POST /api/waste) → trừ tồn kho
- [x] API danh sách phiếu hủy (GET /api/waste)
- [x] Frontend: form xuất hủy (chọn SP, lô, lý do)

---

## Phase 2: Công nợ khách hàng ✅

> Đã build cùng Phase 1, merged trong PR #1 + #2

### 2A. Khách hàng (Customers)
- [x] API CRUD khách hàng (GET/POST/PUT/DELETE /api/customers)
- [x] API lịch sử mua hàng của khách (GET /api/customers/:id/invoices)
- [x] Frontend: trang quản lý khách hàng
- [x] Frontend: chi tiết khách (thông tin + lịch sử mua + công nợ)

### 2B. Công nợ (Debts)
- [x] API xem công nợ theo khách (GET /api/customers/:id/debts)
- [x] API ghi nhận trả nợ (POST /api/debts/payment)
- [x] API danh sách tất cả khách nợ (GET /api/debts/summary)
- [x] Frontend: trang công nợ (danh sách khách nợ, tổng nợ, chi tiết)
- [x] Frontend: form ghi nhận trả nợ

---

## Phase 3: Cảnh báo hết hạn + hàng sắp hết ✅

> Merged: PR #3. Dùng email thay Telegram.

- [x] API hàng sắp hết hạn (GET /api/alerts/expiry) — 7/15/30 ngày
- [x] API hàng sắp hết kho (GET /api/alerts/low-stock)
- [x] Frontend: dashboard cảnh báo (hàng sắp hết hạn + sắp hết kho)
- [x] Gửi email cảnh báo tự động khi có hàng sắp hết hạn (scheduler chạy hàng ngày)

---

## Phase 4: Báo cáo + Giảm giá + Lịch sử giá ✅

> Đã code xong trên main (handlers/report.go, price_history.go, ReportsPage.tsx).

### 4A. Báo cáo
- [x] API doanh thu theo ngày/tuần/tháng (GET /api/reports/revenue)
- [x] API lãi/lỗ (GET /api/reports/profit)
- [x] API hàng bán chạy/ế (GET /api/reports/top-products)
- [x] API so sánh doanh thu giữa các tháng (GET /api/reports/compare)
- [x] Xuất báo cáo Excel (revenue/top-products/compare)
- [x] Frontend: trang báo cáo (biểu đồ recharts + bảng, 3 tab)
- [ ] API báo cáo tồn kho (GET /api/reports/inventory) — chưa làm

### 4B. Giảm giá + Lịch sử giá
- [x] Giới hạn giảm giá 20% cho staff (backend validate + POS clamp)
- [x] API xem lịch sử thay đổi giá (GET /api/products/:id/price-history)
- [x] Tự động ghi price_history khi sửa giá bán
- [x] Frontend: modal lịch sử giá trong trang sản phẩm
- [ ] CRUD chương trình giảm giá (/api/discounts) — chưa làm (chỉ mới giới hạn % giảm)

---

## Phase 5: AI trợ lý (Trợ lý chat) ✅

> Đã merge vào main (branch nhd98z/taphoa-chat-agent). Agent LangGraph + Gemini, có ChatWidget.

- [x] Tích hợp LLM API (Gemini 2.5 Flash qua LangGraph.js)
- [x] Chuyển câu hỏi tiếng Việt → đọc dữ liệu backend → trả kết quả
- [x] Frontend: ChatWidget (bong bóng nổi mọi trang) + upload ảnh hóa đơn
- [ ] Test kỹ flow ảnh hóa đơn (xem docs/ghi-chu-cai-thien-invoice-photo.md)

---

## Phase 6: Deploy + Polish + Báo cáo tốt nghiệp

### Deploy (branch: nhd98z2/phase6-deploy)
- [x] Backend serve static frontend files
- [x] Script deploy.sh (build frontend + chạy backend)
- [x] Systemd service (tự khởi động khi reboot)
- [x] Hướng dẫn deploy (docs/huong-dan-deploy.md)
- [ ] Merge branch phase6-deploy vào main
- [ ] Deploy lên máy cửa hàng + Cloudflare Tunnel

### Polish
- [ ] Setup PWA (icon app, full màn hình)
- [ ] Responsive cho điện thoại
- [ ] UI: chữ to, ít bước thao tác
- [ ] Import dữ liệu từ Excel/KiotViet
- [ ] Backup tự động database
- [ ] Hướng dẫn sử dụng (tooltip/tour)
- [ ] Cho mẹ dùng thử + fix bugs

### Báo cáo (làm sau)
- [ ] Viết báo cáo tốt nghiệp (theo yêu cầu trường)
- [ ] Chụp screenshot cho báo cáo
- [ ] Chuẩn bị slide thuyết trình

### Bảo vệ (làm sau)
- [ ] Cài app lên laptop
- [ ] Quay video demo (quét barcode, in tem, bán hàng)
- [ ] Chuẩn bị trả lời câu hỏi giám khảo
