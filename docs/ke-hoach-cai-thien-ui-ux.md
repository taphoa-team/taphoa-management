# Kế Hoạch Cải Thiện UI/UX — Taphoa Management

> **Phiên bản:** 1.0  
> **Ngày lập:** 03/04/2026  
> **Mục tiêu:** Nâng cấp giao diện ngườii dùng (UI) và trải nghiệm ngườii dùng (UX) từ mức "chức năng đầy đủ" lên mức "sẵn sàng vận hành thực tế và bảo vệ tốt nghiệp".

---

## 1. Phân Tích Hiện Trạng

### 1.1. Điểm mạnh
- Đã có đầy đủ 17 trang chức năng core (POS, Dashboard, Quản lý sản phẩm, Kho, Đơn hàng, v.v.).
- Sử dụng Ant Design giúp đồng bộ visual language.
- Flow POS (bán hàng) khá mượt, có tính năng tạm giữ đơn (hold order) phù hợp thực tế.
- Có responsive cơ bản nhờ grid system của Ant Design.

### 1.2. Điểm yếu cần cải thiện
- **Code quality:** Các page component quá lớn (300–400+ dòng), nhiều code duplication, inline styles tràn lan.
- **UX:** Thiếu breadcrumbs, empty states chưa tốt, modal CRUD quá dài, thiếu feedback loading.
- **Responsive:** POS chưa tối ưu cho tablet/cảm ứng (nút bấm còn nhỏ).
- **Maintainability:** Không có custom hooks, constants, hay design system riêng.

---

## 2. Mục Tiêu Tổng Quát

1. **Tăng tốc độ thao tác** của nhân viên bán hàng (giảm số click, tối ưu touch target).
2. **Giảm cognitive load** khi quản lý dữ liệu (breadcrumbs, empty states, form rõ ràng).
3. **Nâng cao maintainability** của codebase (tách hooks, tách styles, giảm duplication).
4. **Sẵn sàng cho mobile/tablet** — đặc biệt là màn hình POS trên iPad/tablet Android.

---

## 3. Kế Hoạch Thực Hiện Theo Giai Đoạn

### 🔴 Giai Đoạn 1: Nền tảng & Refactor Code (Tuần 1)
> **Mục tiêu:** Làm sạch codebase để dễ bảo trì và scale UI/UX sau này.

#### 1.1. Tách Custom Hooks
- [ ] `useDebouncedSearch(delay)` — thay thế `setTimeout(..., 300)` lặp lại ở ~10 file.
- [ ] `useCrudModal<T>()` — quản lý trạng thái `modalOpen`, `editing`, `form.resetFields()`, `form.setFieldsValue()`.
- [ ] `useFetchList<T>(url, params)` — xử lý `loading`, `data`, `error`, `pagination`.
- [ ] `useCart()` — tách logic giỏ hàng và hold orders ra khỏi `POSPage.tsx`.

#### 1.2. Tách Styles
- [ ] Tạo file `frontend/src/styles/common.ts` chứa các style objects dùng chung:
  ```ts
  export const flexBetween = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
  export const pageHeaderStyle = { marginBottom: 16, ...flexBetween };
  ```
- [ ] Thay thế inline styles lặp lại trong ít nhất 5 trang quan trọng nhất.

#### 1.3. Constants & Type Safety
- [ ] Tạo `frontend/src/constants/index.ts`:
  ```ts
  export const PAGE_SIZE = 20;
  export const POS_PRODUCT_LIMIT = 50;
  export const DEBOUNCE_DELAY = 300;
  ```
- [ ] Thay `any` bằng `unknown` + type guard cho error handling.
- [ ] Fix silent failures: mọi `catch` phải log lỗi hoặc hiển thị `message.error()`.

#### 1.4. Sửa lỗi nghiêm trọng
- [ ] Fix `printBarcode` — thay `document.write` bằng hidden iframe hoặc React print component.
- [ ] Fix/Xóa `App.test.tsx` (test mặc định CRA đang bị hỏng).
- [ ] Chuyển `agentation` từ `dependencies` sang `devDependencies`.

**Tiêu chí hoàn thành Giai đoạn 1:**
- `POSPage.tsx` < 250 dòng.
- Không còn `catch () {}` hay `catch { /* ignore */ }`.
- Không còn magic numbers hardcoded trong các page chính.

---

### 🟡 Giai Đoạn 2: Cải Thiện Layout & Navigation (Tuần 2)
> **Mục tiêu:** Giúp user không bị lạc, dễ di chuyển giữa các trang, tối ưu không gian màn hình.

#### 2.1. Breadcrumbs
- [ ] Thêm component `Breadcrumbs` vào `AppLayout.tsx` (bên dưới Header, trên Content).
- [ ] Cấu hình mapping route → breadcrumb label cho tất cả 17 routes.
- [ ] Hỗ trợ dynamic segments (`/customers/:id`, `/invoices/:id`).

#### 2.2. Empty States
- [ ] Tạo component `EmptyState` dùng chung (icon + title + description + optional CTA button).
- [ ] Áp dụng cho các bảng chính: Sản phẩm, Khách hàng, Đơn hàng, Tồn kho.
- [ ] Ví dụ: Bảng sản phẩm rỗng → "Chưa có sản phẩm nào" + nút "Thêm sản phẩm đầu tiên".

#### 2.3. Cải tiến Menu
- [ ] Đánh giá xem menu ngang hiện tại có bị tràn trên laptop 13" không.
- [ ] Nếu tràn → chuyển sang **Sidebar menu dọc** (có thể collapse) hoặc hybrid header + sidebar.
- [ ] Highlight menu item đang active rõ ràng hơn (thêm background hoặc border-bottom).

#### 2.4. Page Headers đồng bộ
- [ ] Tạo component `PageHeader` dùng chung: `[Tiêu đề trang] + [Nút primary action]`.
- [ ] Áp dụng cho tất cả các trang quản lý (Products, Customers, Invoices, v.v.).

**Tiêu chí hoàn thành Giai đoạn 2:**
- Ngườii dùng luôn biết mình đang ở đâu nhờ breadcrumbs.
- Mọi bảng dữ liệu chính đều có empty state đẹp.
- Menu không bị tràn trên màn hình 1366×768.

---

### 🟡 Giai Đoạn 3: Tối Ưu Form & Modal UX (Tuần 2–3)
> **Mục tiêu:** Giảm độ dài form, giảm lỗi nhập liệu, tăng tốc độ thao tác.

#### 3.1. Tách Modal dài thành Page riêng
- [ ] **ProductsPage:** Chuyển form Thêm/Sửa sản phẩm từ Modal sang trang riêng `/products/new` và `/products/:id/edit`.
- [ ] Đảm bảo form quy đổi đơn vị vẫn hiển thị rõ ràng trên trang mới.
- [ ] Áp dụng tương tự cho các modal phức tạp khác nếu cần (PurchaseOrders, InventoryChecks).

#### 3.2. Form Validation & Feedback
- [ ] Thêm `rules` validation đầy đủ cho tất cả các form chính (không để trống, giá > 0, số lượng >= 0).
- [ ] Hiển thị lỗi field-level thay vì chỉ dùng `message.error()` toàn cục.
- [ ] Thêm `disabled` nút Submit khi form đang loading.

#### 3.3. Confirmation Dialogs
- [ ] Thêm `Popconfirm` hoặc `Modal.confirm` cho các hành động nguy hiểm:
  - Xóa/Xuất hủy sản phẩm
  - Hủy đơn nhập / Hủy đơn bán
  - Đóng ca bán hàng
  - Xóa đơn tạm giữ

**Tiêu chí hoàn thành Giai đoạn 3:**
- Không còn modal nào vượt quá 80% chiều cao viewport.
- Mọi hành động xóa/hủy đều có xác nhận.
- Form validation hiển thị ngay tại field bị lỗi.

---

### 🟡 Giai Đoạn 4: Tối Ưu POS Cho Tablet & Cảm ứng (Tuần 3)
> **Mục tiêu:** POS là màn hình quan trọng nhất, cần mượt mà trên thiết bị cảm ứng.

#### 4.1. Tăng Touch Target
- [ ] Card sản phẩm trong POS: tăng padding, font-size, chiều cao tối thiểu.
- [ ] Nút tăng/giảm số lượng trong giỏ hàng: tối thiểu 44×44px.
- [ ] Nút Thanh toán và Tạm giữ đơn: lớn hơn, dễ bấm.

#### 4.2. Layout Responsive POS
- [ ] Trên tablet (md breakpoint): Cột sản phẩm `span={14}` → `span={16}`, giỏ hàng `span={10}` → `span={8}` hoặc drawer.
- [ ] Trên màn hình nhỏ hơn: hiển thị giỏ hàng dưới dạng **Drawer** từ phải sang.
- [ ] Đảm bảo ô tìm kiếm và danh sách sản phẩm không bị scroll ngang.

#### 4.3. Keyboard Optimization
- [ ] Sau khi quét barcode (hoặc Enter trong ô tìm kiếm), tự động:
  - Nếu chỉ có 1 sản phẩm khớp → thêm ngay vào giỏ.
  - Clear ô tìm kiếm.
  - Giữ focus trên ô tìm kiếm để quét tiếp.
- [ ] Phím tắt: `F1` mở thanh toán, `F2` tạm giữ đơn, `Esc` đóng modal.

#### 4.4. Loading & Feedback
- [ ] Thêm skeleton hoặc spin khi tìm kiếm sản phẩm.
- [ ] Hiển thị toast "Đã thêm [Tên SP]" khi click vào card sản phẩm.
- [ ] Hiển thị tổng tiền realtime với animation nhẹ khi thay đổi.

**Tiêu chí hoàn thành Giai đoạn 4:**
- POS sử dụng mượt trên iPad 10.9" mà không bị bấm nhầm.
- Quét barcode liên tục không cần dùng chuột.
- Thờii gian phản hồi từ click sản phẩm đến hiển thị trong giỏ < 200ms.

---

### 🟢 Giai Đoạn 5: Polish & Micro-interactions (Tuần 4)
> **Mục tiêu:** Tạo cảm giác professional, giảm stress khi sử dụng.

#### 5.1. Micro-interactions
- [ ] Thêm hover effects cho các card sản phẩm trong POS.
- [ ] Thêm transition nhẹ cho modal open/close.
- [ ] Highlight sản phẩm vừa được thêm vào giỏ (flash background xanh nhạt).

#### 5.2. Theme & Branding
- [ ] Custom Ant Design theme qua `ConfigProvider`:
  - Primary color phù hợp với brand (thay vì màu default #1677ff).
  - Border radius, font-family đồng bộ.
- [ ] Thay `APP_NAME = 'Family Mart'` bằng tên cửa hàng thực tế (hoặc configurable).

#### 5.3. Global Loading States
- [ ] Thêm `React.lazy` + `Suspense` cho toàn bộ routes.
- [ ] Thêm global loading indicator (spin ở giữa màn hình) khi chuyển trang.

#### 5.4. Error Boundaries
- [ ] Tạo `ErrorBoundary` component bao quanh `Outlet` trong `AppLayout`.
- [ ] Hiển thị trang "Đã có lỗi xảy ra" với nút "Tải lại trang" thân thiện.

**Tiêu chí hoàn thành Giai đoạn 5:**
- Mọi trang chuyển route đều có loading indicator.
- Ứng dụng có màu chủ đạo riêng, không còn là theme Ant Design mặc định.
- Khi code crash, user không nhìn thấy màn hình trắng chết.

---

### 🟢 Giai Đoạn 6: Testing & Documentation (Tuần 4–5)
> **Mục tiêu:** Đảm bảo chất lượng trước khi bàn giao.

#### 6.1. Manual UX Testing
- [ ] **Scenario 1:** Nhân viên mở ca → quét 10 sản phẩm → thanh toán tiền mặt → in hóa đơn.
- [ ] **Scenario 2:** Admin thêm sản phẩm mới → nhập kho → kiểm tra tồn kho.
- [ ] **Scenario 3:** Khách hàng trả hàng → hoàn tiền → kiểm tra lịch sử trả.
- [ ] **Scenario 4:** Sử dụng trên iPad/tablet trong 30 phút liên tục.

#### 6.2. Accessibility (a11y) Cơ bản
- [ ] Đảm bảo mọi input có `label` hoặc `aria-label`.
- [ ] Đảm bảo tương phản màu text/background đạt WCAG AA.
- [ ] Kiểm tra navigation bằng phím Tab qua các form và modal.

#### 6.3. Code Review
- [ ] Review lại toàn bộ custom hooks.
- [ ] Đảm bảo không còn inline styles trong các component mới.
- [ ] Đảm bảo không còn `any` trong các file core.

---

## 4. Checklist Tổng Hợp

### Refactor & Code Quality
| # | Hạng mục | Trạng thái |
|---|----------|------------|
| 1 | Tách `useDebouncedSearch` | ⬜ |
| 2 | Tách `useCrudModal` | ⬜ |
| 3 | Tách `useFetchList` | ⬜ |
| 4 | Tách `useCart` từ POSPage | ⬜ |
| 5 | Tạo file constants | ⬜ |
| 6 | Fix `printBarcode` XSS risk | ⬜ |
| 7 | Fix silent failures | ⬜ |
| 8 | Chuyển `agentation` sang devDependencies | ⬜ |
| 9 | Fix/Xóa `App.test.tsx` | ⬜ |

### UX Improvements
| # | Hạng mục | Trạng thái |
|---|----------|------------|
| 10 | Thêm Breadcrumbs | ⬜ |
| 11 | Thêm EmptyState component | ⬜ |
| 12 | Cải thiện menu (sidebar nếu cần) | ⬜ |
| 13 | Tạo PageHeader dùng chung | ⬜ |
| 14 | Chuyển form sửa sản phẩm sang page | ⬜ |
| 15 | Thêm confirmation dialogs | ⬜ |
| 16 | Tối ưu POS cho tablet | ⬜ |
| 17 | Phím tắt POS | ⬜ |
| 18 | Custom theme Ant Design | ⬜ |
| 19 | React.lazy + Suspense | ⬜ |
| 20 | Error Boundary | ⬜ |

---

## 5. Timeline Đề Xuất

| Tuần | Giai đoạn | Focus chính |
|------|-----------|-------------|
| **Tuần 1** | Giai đoạn 1 | Refactor hooks, constants, fix lỗi nghiêm trọng |
| **Tuần 2** | Giai đoạn 2 + 3 | Breadcrumbs, Empty states, Tách modal thành page, Confirmation dialogs |
| **Tuần 3** | Giai đoạn 4 | Tối ưu POS cho tablet, phím tắt, loading feedback |
| **Tuần 4** | Giai đoạn 5 + 6 | Polish theme, micro-interactions, lazy loading, testing |
| **Tuần 5** | Buffer | Fix bugs phát sinh, chuẩn bị demo cho mẹ dùng thử |

---

## 6. Tiêu Chí Đánh Giá Thành Công

Sau khi thực hiện xong kế hoạch này, dự án đạt chuẩn nếu:

1. **Codebase sạch:** Không còn page component > 250 dòng, không còn inline styles tràn lan, không còn `any` trong core logic.
2. **POS mượt mà:** Nhân viên có thể bán hàng liên tục 30 phút trên tablet mà không gặp khó khăn.
3. **Không bị lạc:** Ngườii dùng mới có thể tự tìm được chức năng cần dùng nhờ breadcrumbs + menu rõ ràng.
4. **Không màn hình trắng:** Mọi trạng thái rỗng, lỗi, loading đều có UI xử lý đẹp.
5. **Sẵn sàng demo:** Có thể demo trước giám khảo hoặc khách hàng mà không cần giải thích "chỗ này đang để tạm".

---

## 7. Ghi Chú Thêm

- **Không viết lại toàn bộ:** Kế hoạch này ưu tiên refactor từng phần (incremental improvement) thay vì rewrite toàn bộ frontend.
- **Ưu tiên POS:** POS là màn hình quan trọng nhất trong cửa hàng tạp hóa, nên được ưu tiên cao hơn các trang quản lý thụ động.
- **Giữ Ant Design:** Không chuyển sang UI library khác (tốn thờii gian), chỉ custom theme và tổ chức lại cách dùng.

---

*Kế hoạch này sẽ được cập nhật khi có thay đổi phạm vi hoặc phát hiện vấn đề mới trong quá trình thực hiện.*
