# Thiết kế Database — Quản lý cửa hàng tạp hóa

> Ngày tạo: 26/03/2026
> Bao gồm: Phase 1-4 (16 bảng)

---

## Sơ đồ quan hệ

```
users
  │
  ├──< invoices ──< invoice_items >── product_batches ──> products ──> categories
  │                                                          │
  ├──< purchase_orders ──< purchase_order_items >────────────┘
  │
  └──< customers ──< debts ──> invoices

Ký hiệu: ──< nghĩa là "1 → nhiều" (one-to-many)

products ──< product_batches (1 sản phẩm có nhiều lô)
Bán hàng trừ theo lô cũ nhất trước (FIFO)
```

---

## Bảng chi tiết

### 1. users (người dùng — phân quyền)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| name | VARCHAR(100) | Tên người dùng |
| phone | VARCHAR(20) UNIQUE | Số điện thoại — dùng để login |
| password | VARCHAR(255) | Mật khẩu (đã mã hóa, KHÔNG lưu plain text) |
| role | VARCHAR(20) | `admin` hoặc `staff` |
| created_at | TIMESTAMP | Ngày tạo |

> **Tại sao cần password?** Bảng phân quyền cũ chỉ có tên + sđt → ai cũng vào được.
> Cần password để phân biệt admin (mẹ) và staff (nhân viên), giới hạn quyền.

---

### 2. categories (nhóm hàng)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| name | VARCHAR(100) UNIQUE | Ví dụ: "Nước uống", "Đồ gia dụng", "Thuốc lá" |

> **Tại sao cần?** Để lọc sản phẩm theo nhóm. Cửa hàng mẹ có nhiều loại hàng khác nhau,
> không nhóm thì danh sách dài không tìm được.

---

### 3. products (sản phẩm)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| sku | VARCHAR(20) UNIQUE | Mã nội bộ — hệ thống tự sinh (ví dụ: TH0001, TH0002...) |
| barcode | VARCHAR(50) UNIQUE NULL | Mã vạch thật trên sản phẩm (NULL nếu không có) |
| name | VARCHAR(200) | Tên sản phẩm |
| category_id | INT → categories(id) | Thuộc nhóm hàng nào |
| sell_price | INT | Giá bán |
| min_quantity | INT DEFAULT 5 | Tồn kho tối thiểu — dưới mức này → cảnh báo "sắp hết" |
| has_expiry | BOOLEAN DEFAULT false | Sản phẩm này có HSD không? (đồ gia dụng = false, thực phẩm = true) |
| unit | VARCHAR(20) | Đơn vị: "chai", "gói", "thùng", "cái"... |
| is_active | BOOLEAN DEFAULT true | false = ngừng bán (không xóa, giữ lại lịch sử) |
| created_at | TIMESTAMP | Ngày thêm vào hệ thống |
| updated_at | TIMESTAMP | Lần cập nhật gần nhất |

> **Tại sao bỏ `quantity`, `cost_price`, `expiry_date` khỏi products?**
> Vì giờ có bảng `product_batches` (lô hàng) quản lý riêng từng lô.
> - `quantity` = SUM tất cả lô → tính từ batches
> - `cost_price` = giá nhập từng lô, mỗi lô có thể khác
> - `expiry_date` = mỗi lô có HSD riêng
>
> **Tại sao `is_active` thay vì xóa luôn?**
> Nếu xóa sản phẩm → lịch sử đơn hàng cũ bị mất thông tin. Đánh dấu ngừng bán an toàn hơn.
>
> **Tại sao giá dùng INT (đồng) thay vì DECIMAL?**
> Cửa hàng tạp hóa Việt Nam giá luôn là số nguyên (500đ, 10000đ). INT nhanh hơn, không bị lỗi làm tròn.

---

### 4. product_batches (lô hàng)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| product_id | INT → products(id) | Thuộc sản phẩm nào |
| cost_price | INT | Giá nhập của lô này |
| quantity | INT | Số lượng còn lại trong lô |
| expiry_date | DATE NULL | Hạn sử dụng của lô (NULL nếu sản phẩm không có HSD) |
| received_at | DATE | Ngày nhập lô này |
| created_at | TIMESTAMP | Ngày tạo record |

> **Đây là bảng giải quyết pain point lớn nhất của mẹ.**
>
> Ví dụ: Mì Hảo Hảo (product_id = 1)
> | id | product_id | cost_price | quantity | expiry_date | received_at |
> |----|-----------|-----------|----------|-------------|-------------|
> | 1  | 1         | 4000      | 30       | 2026-12-25  | 2026-03-01  |
> | 2  | 1         | 4000      | 20       | 2027-01-10  | 2026-03-01  |
> | 3  | 1         | 4200      | 40       | 2027-03-15  | 2026-03-15  |
>
> **Tồn kho tổng** = 30 + 20 + 40 = 90 gói
> **Lô sắp hết hạn nhất** = lô 1 (25/12/2026) → cảnh báo
> **Khi bán hàng** → trừ lô cũ nhất trước (FIFO — First In First Out = nhập trước bán trước)
>
> Cùng 1 ngày nhập (01/03) nhưng HSD khác → tách thành 2 lô riêng.

---

### 5. suppliers (nhà cung cấp)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| name | VARCHAR(200) | Tên nhà cung cấp / nhà phân phối |
| phone | VARCHAR(20) NULL | Số điện thoại |
| address | VARCHAR(300) NULL | Địa chỉ |
| note | TEXT NULL | Ghi chú (ví dụ: "giao hàng thứ 3 hàng tuần") |
| created_at | TIMESTAMP | Ngày thêm |

> **Tại sao tách riêng thay vì ghi tên trong đơn nhập?**
> Vì 1 NCC nhập nhiều lần. Nếu chỉ ghi tên → mỗi lần gõ khác nhau ("Vinamilk", "vinamilk", "VNM").
> Tách bảng riêng → chọn từ danh sách, xem lịch sử nhập từ NCC nào, so sánh giá giữa các NCC.

---

### 6. unit_conversions (quy đổi đơn vị)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| product_id | INT → products(id) | Sản phẩm nào |
| from_unit | VARCHAR(20) | Đơn vị lớn: "thùng", "lốc", "hộp" |
| to_unit | VARCHAR(20) | Đơn vị nhỏ: "chai", "gói", "cái" |
| conversion_rate | INT | 1 thùng = ? chai |

> **Ví dụ:** Nước suối Lavie
> | product_id | from_unit | to_unit | conversion_rate |
> |-----------|-----------|---------|-----------------|
> | 5         | thùng     | chai    | 24              |
> | 5         | lốc       | chai    | 6               |
>
> **Nhập hàng:** nhập 2 thùng → hệ thống tự tính = 48 chai → cộng vào tồn kho
> **Bán hàng:** bán 1 lốc → hệ thống tự tính = 6 chai → trừ tồn kho
> **Tồn kho luôn tính theo đơn vị nhỏ nhất** (chai, gói...)

---

### 7. invoices (đơn hàng — header)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| user_id | INT → users(id) | Ai bán đơn này |
| shift_id | INT → shifts(id) | Thuộc ca nào |
| customer_id | INT → customers(id) NULL | Khách hàng (NULL = khách lẻ, không ghi nợ) |
| total | INT | Tổng tiền đơn hàng |
| discount_amount | INT DEFAULT 0 | Số tiền giảm giá (nếu có) |
| final_total | INT | Tổng sau giảm giá (total - discount_amount) |
| cash_amount | INT DEFAULT 0 | Số tiền trả bằng tiền mặt |
| transfer_amount | INT DEFAULT 0 | Số tiền trả bằng chuyển khoản |
| cash_given | INT DEFAULT 0 | Số tiền khách đưa (để tính thừa) |
| change_amount | INT DEFAULT 0 | Tiền thừa trả khách (cash_given - cash_amount) |
| payment_method | VARCHAR(20) | `cash` / `transfer` / `mixed` / `debt` |
| status | VARCHAR(20) DEFAULT 'completed' | `completed` / `cancelled` |
| note | TEXT NULL | Ghi chú (nếu có) |
| created_at | TIMESTAMP | Thời gian bán |

> **4 phương thức thanh toán:**
> - `cash`: tiền mặt — hiển thị nút chọn mệnh giá (50k, 100k, 200k, 500k) + tự tính tiền thừa
> - `transfer`: chuyển khoản — có thể hiển thị QR code
> - `mixed`: kết hợp — ví dụ 30k mặt + 17k chuyển khoản
> - `debt`: mua nợ — ghi vào công nợ khách hàng
>
> **Ví dụ đơn hàng 47,000đ:**
> | Trường hợp | cash_amount | transfer_amount | cash_given | change_amount | payment_method |
> |-----------|------------|----------------|-----------|--------------|---------------|
> | Trả mặt | 47,000 | 0 | 50,000 | 3,000 | cash |
> | Chuyển khoản | 0 | 47,000 | 0 | 0 | transfer |
> | Kết hợp | 30,000 | 17,000 | 30,000 | 0 | mixed |
> | Mua nợ | 0 | 0 | 0 | 0 | debt |
>
> **Tại sao `status` thay vì xóa đơn?**
> Hủy đơn = đổi status thành `cancelled` + cộng lại quantity sản phẩm.
> Không bao giờ xóa đơn → giữ lịch sử, dễ kiểm tra.

---

### 8. invoice_items (chi tiết đơn hàng — items)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| invoice_id | INT → invoices(id) | Thuộc đơn hàng nào |
| product_id | INT → products(id) | Sản phẩm nào |
| batch_id | INT → product_batches(id) | Trừ từ lô nào (FIFO) |
| quantity | INT | Số lượng mua |
| unit | VARCHAR(20) | Đơn vị bán (chai, lốc, thùng...) |
| price | INT | Giá bán tại thời điểm mua |
| cost_price | INT | Giá vốn tại thời điểm mua |

> **Tại sao lưu `price` và `cost_price` ở đây thay vì lấy từ bảng products?**
> Vì giá có thể thay đổi. Hôm nay mì gói 5000đ, tháng sau tăng 6000đ.
> Nếu không lưu giá tại thời điểm mua → báo cáo lãi/lỗ sẽ sai.

---

### 9. purchase_orders (đơn nhập hàng — header)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| user_id | INT → users(id) | Ai tạo đơn nhập |
| supplier_id | INT → suppliers(id) | Nhà cung cấp nào |
| total | INT | Tổng tiền đơn nhập |
| paid | INT DEFAULT 0 | Số tiền đã trả NCC |
| status | VARCHAR(20) DEFAULT 'completed' | `completed` / `cancelled` |
| note | TEXT NULL | Ghi chú |
| created_at | TIMESTAMP | Ngày nhập |

---

### 10. purchase_order_items (chi tiết đơn nhập — items)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| purchase_order_id | INT → purchase_orders(id) | Thuộc đơn nhập nào |
| product_id | INT → products(id) | Sản phẩm nào |
| quantity | INT | Số lượng nhập |
| cost_price | INT | Giá nhập |

> **Khi tạo đơn nhập:**
> 1. Tạo product_batch mới (hoặc cộng vào batch cùng HSD)
> 2. Tồn kho tự tăng (vì tính từ SUM batches)

---

### 11. returns (trả hàng)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| invoice_id | INT → invoices(id) | Đơn hàng gốc |
| user_id | INT → users(id) | Ai xử lý trả hàng |
| reason | TEXT | Lý do trả (hàng lỗi, hết hạn, đổi ý...) |
| total_refund | INT | Tổng tiền hoàn |
| status | VARCHAR(20) DEFAULT 'completed' | `completed` / `cancelled` |
| created_at | TIMESTAMP | Ngày trả |

---

### 12. return_items (chi tiết trả hàng)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| return_id | INT → returns(id) | Thuộc phiếu trả nào |
| product_id | INT → products(id) | Sản phẩm nào |
| batch_id | INT → product_batches(id) | Trả về lô nào |
| quantity | INT | Số lượng trả |
| refund_price | INT | Giá hoàn mỗi sản phẩm |

> **Flow trả hàng:**
> 1. Chọn đơn hàng gốc → chọn sản phẩm muốn trả
> 2. Cộng lại quantity vào batch (hoặc tạo batch mới nếu hàng lỗi không nhập lại kho)
> 3. Hoàn tiền cho khách (trừ nợ nếu khách đang nợ)

---

### 13. shifts (ca bán hàng)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| user_id | INT → users(id) | Ai mở ca |
| opening_cash | INT | Số tiền mặt đầu ca (đếm két trước khi bán) |
| closing_cash | INT NULL | Số tiền mặt cuối ca (đếm két khi đóng ca) |
| expected_cash | INT NULL | Số tiền mặt lý thuyết (opening + tiền mặt bán được) |
| difference | INT NULL | Chênh lệch (closing - expected). Dương = thừa, âm = thiếu |
| total_sales | INT DEFAULT 0 | Tổng doanh thu trong ca |
| total_invoices | INT DEFAULT 0 | Tổng số đơn trong ca |
| note | TEXT NULL | Ghi chú (giải thích chênh lệch nếu có) |
| opened_at | TIMESTAMP | Thời gian mở ca |
| closed_at | TIMESTAMP NULL | Thời gian đóng ca (NULL = ca đang mở) |

> **Flow:**
> 1. **Mở ca:** NV đếm tiền trong két → nhập opening_cash → bắt đầu bán
> 2. **Bán hàng:** Mỗi đơn gắn với shift hiện tại
> 3. **Đóng ca:** NV đếm tiền trong két → nhập closing_cash → hệ thống tính chênh lệch
> 4. Nếu chênh lệch ≠ 0 → NV phải ghi chú giải thích
>
> **Mẹ xem cuối ngày:** thấy ngay NV bán được bao nhiêu, tiền có khớp không.

---

### 14. inventory_checks (kiểm kê kho)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| user_id | INT → users(id) | Ai kiểm kê |
| status | VARCHAR(20) DEFAULT 'draft' | `draft` (đang kiểm) / `completed` (đã xác nhận) |
| note | TEXT NULL | Ghi chú |
| created_at | TIMESTAMP | Ngày bắt đầu kiểm |
| completed_at | TIMESTAMP NULL | Ngày hoàn thành |

---

### 15. inventory_check_items (chi tiết kiểm kê)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| check_id | INT → inventory_checks(id) | Thuộc đợt kiểm nào |
| product_id | INT → products(id) | Sản phẩm nào |
| system_quantity | INT | Số lượng trên hệ thống |
| actual_quantity | INT | Số lượng đếm thực tế |
| difference | INT | Chênh lệch (actual - system). Âm = thiếu, dương = thừa |
| note | TEXT NULL | Lý do chênh lệch (mất, hư, ghi sai...) |

> **Flow kiểm kê:**
> 1. Tạo đợt kiểm → hệ thống tự điền system_quantity từ tồn kho
> 2. NV đi đếm → nhập actual_quantity từng sản phẩm
> 3. Hệ thống tự tính difference
> 4. Xác nhận → tự điều chỉnh tồn kho theo actual_quantity
>
> **Giải quyết pain point lớn nhất của mẹ:** tồn kho trên KiotViet khác thực tế → giờ kiểm kê định kỳ để sync lại.

---

### 16. waste_records (xuất hủy hàng)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| product_id | INT → products(id) | Sản phẩm nào |
| batch_id | INT → product_batches(id) | Lô nào |
| quantity | INT | Số lượng hủy |
| reason | VARCHAR(50) | `expired` (hết hạn) / `damaged` (hỏng) / `lost` (mất) / `other` |
| user_id | INT → users(id) | Ai ghi nhận |
| note | TEXT NULL | Ghi chú thêm |
| created_at | TIMESTAMP | Ngày hủy |

> **Khi hủy:** trừ quantity trong batch tương ứng.
> **Liên kết với cảnh báo HSD:** hàng hết hạn → bấm "Hủy" → tự tạo waste_record + trừ kho.

---

### 17. customers (khách hàng — Phase 2)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| name | VARCHAR(100) | Tên khách |
| phone | VARCHAR(20) NULL | Số điện thoại |
| address | VARCHAR(200) NULL | Địa chỉ (tùy chọn) |
| total_debt | INT DEFAULT 0 | Tổng nợ hiện tại (cache, tính từ debts) |
| created_at | TIMESTAMP | Ngày thêm |

> **Tại sao `total_debt` nằm ở đây?**
> Để hiển thị nhanh danh sách khách nợ mà không cần tính lại từ bảng debts mỗi lần.
> Mỗi khi ghi nợ/trả nợ → cập nhật lại total_debt.

---

### 18. debts (lịch sử công nợ — Phase 2)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| customer_id | INT → customers(id) | Khách nào |
| invoice_id | INT → invoices(id) NULL | Đơn hàng gây nợ (NULL nếu trả nợ) |
| type | VARCHAR(20) | `debt` (ghi nợ) / `payment` (trả nợ) |
| amount | INT | Số tiền |
| note | TEXT NULL | Ghi chú |
| created_at | TIMESTAMP | Ngày ghi nhận |

> **Flow công nợ:**
> - Khách mua nợ → tạo record type=`debt`, amount = total - paid
> - Khách trả nợ → tạo record type=`payment`, amount = số tiền trả
> - Tổng nợ = SUM(debt) - SUM(payment)
> - Thay thế hoàn toàn sổ tay NV + sổ mẹ + Excel → 1 chỗ duy nhất

---

### 19. price_history (lịch sử thay đổi giá — Phase 4)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| product_id | INT → products(id) | Sản phẩm nào |
| old_price | INT | Giá cũ |
| new_price | INT | Giá mới |
| changed_by | INT → users(id) | Ai thay đổi |
| created_at | TIMESTAMP | Thời điểm thay đổi |

> **Tự động ghi lại** mỗi khi sửa `sell_price` trong products.
> Để biết: ai đổi giá, khi nào, từ bao nhiêu thành bao nhiêu.

---

### 20. discounts (giảm giá — Phase 4)

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | SERIAL PRIMARY KEY | Tự tăng |
| name | VARCHAR(100) | Tên chương trình: "Giảm giá Tết", "Mua 2 tặng 1"... |
| type | VARCHAR(20) | `percent` (giảm %) / `fixed` (giảm số tiền cố định) |
| value | INT | Giá trị: 10 (= 10%) hoặc 5000 (= giảm 5000đ) |
| min_order | INT DEFAULT 0 | Đơn tối thiểu để áp dụng (0 = không giới hạn) |
| product_id | INT → products(id) NULL | Áp dụng cho SP cụ thể (NULL = áp dụng cả đơn) |
| start_date | DATE | Ngày bắt đầu |
| end_date | DATE | Ngày kết thúc |
| is_active | BOOLEAN DEFAULT true | Đang hoạt động không |
| created_at | TIMESTAMP | Ngày tạo |

> **Ví dụ:**
> - Giảm 10% nước ngọt dịp Tết: type=`percent`, value=10, product_id=nước ngọt
> - Giảm 20k cho đơn trên 200k: type=`fixed`, value=20000, min_order=200000, product_id=NULL

---

## Tóm tắt

| Bảng | Phase | Mô tả |
|------|-------|-------|
| users | 1 | Đăng nhập + phân quyền |
| categories | 1 | Nhóm hàng |
| products | 1 | Thông tin sản phẩm (tên, giá bán, đơn vị...) |
| product_batches | 1 | Lô hàng (số lượng, giá nhập, HSD từng lô) |
| suppliers | 1 | Nhà cung cấp / nhà phân phối |
| unit_conversions | 1 | Quy đổi đơn vị (thùng → chai, lốc → gói...) |
| invoices | 1 | Đơn bán hàng (header) |
| invoice_items | 1 | Chi tiết đơn bán (items) |
| purchase_orders | 1 | Đơn nhập hàng (header) |
| purchase_order_items | 1 | Chi tiết đơn nhập (items) |
| returns | 1 | Trả hàng (header) |
| return_items | 1 | Chi tiết trả hàng (items) |
| shifts | 1 | Ca bán hàng (mở/đóng ca, đối soát tiền) |
| inventory_checks | 1 | Kiểm kê kho (header) |
| inventory_check_items | 1 | Chi tiết kiểm kê (từng sản phẩm) |
| waste_records | 1 | Xuất hủy hàng (hết hạn, hỏng, mất) |
| customers | 2 | Khách hàng |
| debts | 2 | Lịch sử công nợ |
| price_history | 4 | Lịch sử thay đổi giá |
| discounts | 4 | Chương trình giảm giá |

**Tổng: 20 bảng**
- Phase 1: 16 bảng (lõi hệ thống)
- Phase 2: 2 bảng (công nợ)
- Phase 4: 2 bảng (báo cáo + khuyến mãi)
