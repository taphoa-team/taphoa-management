# Ghi chú fix lỗi

> Danh sách lỗi đã gặp trong quá trình phát triển + cách fix.
> Mục đích: không lặp lại sai lầm cũ.

---

## PR #2 — Frontend Phase 1 (review iteration 2)

### 🔴 Blocker

#### 1. XSS trong printBarcode
- **Lỗi:** Dùng `document.write()` với template literal, inject `product.name` trực tiếp vào HTML mà không escape → attacker chèn `<script>` đánh cắp JWT từ localStorage
- **Fix:** Tạo hàm `escapeHtml()` trong `utils/format.ts`, wrap tất cả data trước khi inject
- **Bài học:** Bất cứ khi nào viết HTML string có data từ user/DB → PHẢI escape. Đặc biệt nguy hiểm khi JWT lưu localStorage (XSS = mất token)

#### 2. Hardcoded API URL `localhost:8082`
- **Lỗi:** `baseURL: 'http://localhost:8082/api'` hardcode trong `api.ts`
- **Fix:** Đổi thành `process.env.REACT_APP_API_URL || '/api'`, tạo file `.env.development`
- **Bài học:** URL, port, endpoint → luôn dùng env variable. Không hardcode localhost

### 🟡 Medium

#### 3. POS cho bán khi chưa mở ca
- **Lỗi:** Không check `currentShift` trước khi checkout → backend reject nhưng user thấy lỗi chung chung
- **Fix:** Thêm `if (!currentShift)` check vào `openCheckout()`
- **Bài học:** Frontend nên mirror backend validation cho UX tốt

#### 4. POS cho add sản phẩm hết hàng
- **Lỗi:** SP `stock <= 0` chỉ hiện mờ nhưng vẫn click add được. Cũng không check khi tăng quantity
- **Fix:** Check `stock <= 0` return warning, check `qty >= stock` khi tăng
- **Bài học:** Visual indicator (opacity) không phải validation — phải block action

#### 5. Checkout thiếu validate tổng tiền
- **Lỗi:** Không check `cash_amount + transfer_amount >= finalTotal`
- **Fix:** Validate trước khi gọi API, hiện `message.error` nếu không đủ
- **Bài học:** Money validation phải ở cả frontend (UX) lẫn backend (safety)

#### 6. Checkout modal hiển thị sai tổng khi có giảm giá
- **Lỗi:** Modal header hiện `total` (chưa trừ discount), `cash_amount` không auto-update
- **Fix:** Dùng `Form.useWatch('discount_amount')` tính `finalTotal`, hiện `finalTotal` trong modal, auto-update `cash_amount` qua `useEffect`
- **Bài học:** Khi có computed value phụ thuộc form field → dùng `Form.useWatch`

#### 7. Discount có thể lớn hơn total
- **Lỗi:** InputNumber `discount_amount` không có `max`
- **Fix:** Thêm `max={total}`
- **Bài học:** InputNumber cho tiền luôn cần `min` + `max`

#### 8. InventoryPage thiếu debounce search
- **Lỗi:** Gọi API mỗi keystroke (POSPage đã có debounce nhưng InventoryPage quên)
- **Fix:** `setTimeout 300ms` + `clearTimeout` trong `useEffect`
- **Bài học:** Search input gọi API → PHẢI debounce

#### 9. Tên app không nhất quán
- **Lỗi:** "Family Mart" ở layout, "Quản lý Tạp Hóa" ở login
- **Fix:** Extract `APP_NAME` constant vào `utils/format.ts`, import ở mọi nơi
- **Bài học:** String hiện nhiều nơi → extract constant

#### 10. PurchaseOrders refetch thừa mỗi lần đổi page
- **Lỗi:** suppliers/products fetch chung useEffect với orders → đổi page = refetch hết
- **Fix:** Tách data tĩnh vào `useEffect([], [])` riêng
- **Bài học:** Data không thay đổi theo page → fetch 1 lần, tách useEffect

#### 11. Dashboard lọc hàng sắp hết client-side với limit 200
- **Lỗi:** Nếu > 200 SP thì bỏ sót SP hết hàng
- **Chưa fix:** Cần backend hỗ trợ filter `warning=low,out`

### 🟢 Low

#### 12. formatVND duplicate 14 lần
- **Fix:** Extract vào `utils/format.ts`, import ở mọi page
- **Bài học:** Hàm dùng >= 3 chỗ → extract shared util

#### 13. eslint-disable thay vì fix root cause
- **Fix:** Wrap fetch function bằng `useCallback`, bỏ disable comment
- **Bài học:** eslint-disable = red flag, fix root cause

#### 14. Silent error swallowing (11 chỗ)
- **Lỗi:** `catch { /* ignore */ }` → user thấy list trống không biết tại sao
- **Fix:** Thêm `message.error('Lỗi tải dữ liệu')`
- **Bài học:** KHÔNG swallow error silent — ít nhất phải thông báo user

#### 15. Agentation component trong production
- **Fix:** Wrap bằng `process.env.NODE_ENV === 'development'`
- **Bài học:** Dev-only tools → luôn wrap NODE_ENV check

#### 16. Login không redirect user đã đăng nhập
- **Fix:** `useEffect` check `user` → redirect `/`
- **Bài học:** Public pages nên redirect nếu đã authenticated

#### 17. useRef\<any\>
- **Fix:** Dùng `useRef<InputRef>(null)`
- **Bài học:** Tránh `any` — Ant Design export type cho mọi component ref

#### 18. Pagination không có total count
- **Chưa fix:** Backend cần trả `{ data: [...], total: N }`

#### 19. Held orders không sync giữa tabs
- **Chưa fix:** Edge case nhỏ cho tạp hóa (thường 1 máy)

---

## PR #2 — Frontend Phase 1 (review iteration 4 — issues mới)

### 🟡 Medium

#### 20. updateQty không check stock limit
- **Lỗi:** `addToCart` đã check `stock <= 0` nhưng `updateQty` thì không → user tăng quantity bằng nút "+" hoặc InputNumber vượt stock
- **Fix:** Thêm `if (qty > item.product.stock)` check vào `updateQty`
- **Bài học:** Khi fix validation ở 1 entry point, kiểm tra tất cả entry points khác cùng chức năng

#### 21. Mixed payment bị override khi đổi discount
- **Lỗi:** `useEffect` auto-set `cash_amount = finalTotal` cho MỌI payment method → khi user đang dùng mixed (60k cash + 40k CK), đổi discount → cash_amount bị reset, phá split
- **Fix:** Thêm `paymentMethod !== 'mixed'` condition vào useEffect
- **Bài học:** useEffect auto-update form field → phải check CONTEXT (payment method) chứ không chỉ check value

#### 22. ProductsPage + CustomersPage search không debounce
- **Lỗi:** Mỗi keystroke = 1 API call (POSPage và InventoryPage đã có debounce nhưng 2 page này quên)
- **Fix:** Tách thành `searchInput` (UI) + `search` (API), useEffect setTimeout 300ms
- **Bài học:** Pattern nhất quán — nếu 1 page có debounce thì TẤT CẢ pages có search phải có
