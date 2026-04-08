# Phase 4: Brainstorm — Báo cáo + Giảm giá + Lịch sử giá

> Trạng thái: Design hoàn tất — tất cả 5 Part đã duyệt ✅
> Cập nhật: 08/04/2026

---

## Quyết định đã chốt

**Approach:** A — Báo cáo đầy đủ + Giảm giá POS + Lịch sử giá

### Báo cáo (ưu tiên theo thứ tự)
1. Doanh thu hôm nay/tuần/tháng, lời bao nhiêu (ưu tiên cao nhất)
2. So sánh tháng này với tháng trước
3. Hàng bán chạy/ế

### Giảm giá
- Không cần hệ thống chương trình giảm giá phức tạp
- Mẹ giảm giá "mồm" (17k → 15k) nhưng hóa đơn ghi 17k
- Giải pháp: cho sửa giá trên POS, tự hiện "giảm 2k (12%)"
- Staff KHÔNG được sửa giá, chỉ được giảm giá trên POS
- Admin được sửa giá + xem báo cáo
- Làm admin trước, staff phân quyền sau

### Phân quyền
- Báo cáo (doanh thu, lãi/lỗ, top SP, so sánh): chỉ admin
- Menu "Báo cáo": ẩn với staff
- POS giảm giá: staff được giảm, không được sửa giá gốc

### UI
- Máy tính là chính (không cần ưu tiên mobile cho báo cáo)
- Biểu đồ: số liệu tổng ở trên + biểu đồ (cột/đường) ở dưới
- Xuất Excel: có nhưng low priority, làm sau cùng

### Lịch sử giá
- Tự ghi khi sửa giá sản phẩm (model PriceHistory đã có sẵn)

---

## Design Part 1 — Backend API báo cáo (ĐÃ DUYỆT ✅)

4 endpoints:
- `GET /api/reports/revenue` — doanh thu theo ngày/tuần/tháng (from, to, group_by)
- `GET /api/reports/profit` — lãi/lỗ (doanh thu - giá vốn)
- `GET /api/reports/top-products` — hàng bán chạy/ế (from, to, limit, sort)
- `GET /api/reports/compare` — so sánh 2 khoảng thời gian

Cách tính:
- Doanh thu: SUM(invoice.final_total) WHERE status = 'completed'
- Giá vốn (COGS): SUM(invoice_item.cost_price * quantity)
- Lãi gộp: Doanh thu - Giá vốn
- File mới: backend/handlers/report.go

---

## Design Part 2 — Frontend ReportsPage (ĐÃ DUYỆT ✅)

### Chart library: recharts
- Nhẹ (~150KB), docs tiếng Anh tốt, cộng đồng lớn
- Install: `npm install recharts`

### Layout: 1 trang + 3 tab (Ant Design Tabs)
- Route: `/reports` (admin only, ẩn menu với staff)
- File mới: `frontend/src/pages/ReportsPage.tsx`

### Tab 1: Doanh thu
- **Date picker**: Hôm nay | Tuần này | Tháng này | Tùy chọn (DatePicker range)
- **4 stat cards**: Doanh thu, Giá vốn, Lợi nhuận, Số hóa đơn
- **Biểu đồ cột** (BarChart): doanh thu theo ngày, có số trên cột + grid background
- **Biểu đồ đường** (AreaChart): lợi nhuận theo ngày, nằm dưới biểu đồ doanh thu, có số trên mỗi điểm + area fill
- API: `GET /api/reports/revenue` + `GET /api/reports/profit`

### Tab 2: So sánh
- **3 summary cards**: Doanh thu, Lợi nhuận, Số hóa đơn — mỗi card hiện "tháng trước → tháng này + %"
- **Biểu đồ cột ghép** (grouped BarChart): xám = tháng trước, xanh = tháng này, group theo tuần
- API: `GET /api/reports/compare`

### Tab 3: Top sản phẩm
- **Toggle**: Bán chạy ↔ Bán ế
- **Date picker**: Tuần này | Tháng này | Tùy chọn
- **Bảng** (Table): #, Sản phẩm, SL bán, Doanh thu, Lợi nhuận — sort desc/asc theo toggle
- API: `GET /api/reports/top-products`

### Mockup
- Xem tại: `.superpowers/brainstorm/` (file `full-reports-page.html`)

---

## Design Part 3 — POS giảm giá (ĐÃ DUYỆT ✅)

POS đã có sẵn giảm giá trên tổng đơn (DiscountAmount). Chỉ cần thêm:

### Giới hạn cho staff
- Staff chỉ được giảm tối đa **20%** tổng đơn (hardcode)
- Frontend: nếu role = staff → clamp input, hiện warning khi vượt 20%
- Backend: validate trong CreateInvoice — nếu role = staff và discount > 20% subtotal → reject
- Admin: không giới hạn

### Báo cáo giảm giá (trong tab Doanh thu)
- Thêm card thứ 5: "Tổng giảm giá" vào stat cards
- Thêm bảng chi tiết giảm giá ở dưới 2 biểu đồ: Thời gian, Nhân viên, Mã HĐ, Số tiền giảm
- Data từ: `Invoice.DiscountAmount` WHERE `DiscountAmount > 0`, JOIN User

### Không cần thay đổi model
- Dùng `Invoice.DiscountAmount` có sẵn
- Dùng `Invoice.UserID` để biết ai giảm

---

## Design Part 4 — Lịch sử giá (ĐÃ DUYỆT ✅)

### Xem lịch sử: Modal trong ProductsPage
- Thêm icon lịch sử (HistoryOutlined) bên cạnh cột giá bán trong bảng sản phẩm
- Click → modal hiện bảng: Ngày, Giá cũ, Giá mới, Người sửa
- API mới: `GET /api/products/:id/price-history`

### Auto ghi khi sửa giá
- Trong backend handler `UpdateProduct`: nếu `sell_price` mới != cũ → tạo PriceHistory record
- Fields: product_id, old_price, new_price, changed_by (từ JWT)
- Model PriceHistory đã có sẵn trong DB

---

## Design Part 5 — Xuất Excel (ĐÃ DUYỆT ✅)

### Vị trí: Nút "Xuất Excel" trên mỗi tab báo cáo
- Tab Doanh thu, Tab So sánh, Tab Top SP — mỗi tab có nút riêng

### Xử lý: Backend (Go + excelize)
- `GET /api/reports/revenue/export?from=&to=` → file .xlsx
- `GET /api/reports/compare/export` → file .xlsx
- `GET /api/reports/top-products/export?from=&to=&sort=` → file .xlsx
- Response: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Frontend: click nút → browser tự download file

---

## Context kỹ thuật

- Model Discount + PriceHistory đã migrate sẵn trong DB
- InvoiceItem có cả price + cost_price → tính lãi được ngay
- Frontend dùng Ant Design, biểu đồ dùng recharts
- Backend pattern: handlers/ + routes.go, dùng GORM
- Hệ thống role: admin / staff (middleware phân quyền đã có)
