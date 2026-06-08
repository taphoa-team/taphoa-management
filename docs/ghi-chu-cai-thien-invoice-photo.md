# Ghi chú: Flow ảnh hóa đơn (chat agent) — chưa test kỹ, cần cải thiện

> Cập nhật: 08/06/2026
> Liên quan: `agent/src/invoice/tool.ts`, `agent/src/invoice/core.ts`, `agent/src/graph/graph.ts`,
> `frontend/src/lib/chatImage.ts`, `frontend/src/components/chat/`

---

## 1. Flow hiện tại đang làm gì

Người dùng gửi **ảnh hóa đơn nhập hàng** trong khung chat:

```
Ảnh (HandlePick → FileToBase64)         frontend
  → gửi block image cho agent
  → Gemini ĐỌC ảnh, trích xuất: nhà cung cấp + từng mặt hàng
       (tên, số lượng, đơn vị, GIÁ NHẬP/đơn vị, hạn dùng)
  → gọi tool `record_purchase_invoice`   agent/src/invoice/tool.ts
  → processInvoice(): đối chiếu sản phẩm trong cửa hàng,
       cảnh báo nếu GIÁ NHẬP đổi so với lần trước,
       rồi LƯU BẢN NHÁP (KHÔNG ghi vào kho thật)
```

Điểm quan trọng: tool **chỉ lưu nháp**, không đụng tồn kho thật → sai sót không phá dữ liệu,
nhưng nếu trích xuất sai mà người dùng tin theo thì vẫn nguy hiểm khi họ nhập tay lại.

---

## 2. Đã test tới đâu

✅ **Đã có unit test** (chạy `cd agent && npm test`):
- `invoice-core.test.ts` — luồng `processInvoice`
- `invoice-match.test.ts` — đối chiếu tên sản phẩm
- `invoice-pricing.test.ts` — so sánh giá nhập cũ/mới
- `invoice-store.test.ts` — lưu nháp
- `normalize.test.ts` — chuẩn hóa block ảnh đầu vào

❌ **CHƯA phủ** (đây là phần "chưa test kỹ"):
- **Độ chính xác khi Gemini đọc ảnh THẬT** — toàn bộ test trên dùng dữ liệu giả (fixture),
  chưa đo Gemini đọc đúng bao nhiêu % trên hóa đơn thật (in mờ, viết tay, chụp nghiêng).
- `tool.ts`, `graph/graph.ts`, `llm.ts` — phần ráp nối (orchestration) chưa có test.
- E2E: ảnh thật → agent → nháp, chưa có kịch bản kiểm thử lặp lại được.

---

## 3. Điểm yếu / rủi ro cần cải thiện

| # | Vấn đề | Vì sao rủi ro |
|---|--------|---------------|
| 1 | **Giá nhập: nhầm "thành tiền cả dòng" với "đơn giá"** | Schema có dặn LLM tự chia, nhưng chưa kiểm chứng. Sai chỗ này → cảnh báo đổi giá sai bét. |
| 2 | **Đơn vị (lon/chai/thùng/kg) lệch với catalog** | Hóa đơn ghi "thùng" nhưng SP lưu theo "lon" → số lượng/giá lệch theo hệ số quy đổi. |
| 3 | **Đối chiếu tên sản phẩm (fuzzy match)** | Tên trên hóa đơn viết tắt/khác chính tả → match nhầm SP khác hoặc bỏ sót. |
| 4 | **`previousCost = null` mơ hồ** | `/batches` chỉ trả lô còn hàng. SP bán sạch → trả `[]` → tưởng "chưa từng nhập" (xem comment trong `tool.ts:22`). |
| 5 | **Hạn dùng (expiryDate) nhiều định dạng** | Hóa đơn ghi `30/12/26`, `12-2026`, "còn 6 tháng"... LLM ép về `YYYY-MM-DD` có thể sai. |
| 6 | **Xử lý lỗi khi trích xuất rác/thiếu** | Ảnh không phải hóa đơn, hoặc đọc thiếu cột → cần báo rõ thay vì tạo nháp sai. |

---

## 4. Việc cần làm (để dành — đây là task lớn, KHÔNG dành cho cộng sự thực tập)

- [ ] Thu thập **bộ ảnh hóa đơn thật** (10–20 ảnh đủ kiểu: in, viết tay, mờ) làm dữ liệu kiểm thử.
- [ ] Tự tay đối chiếu kết quả Gemini trích xuất vs thực tế → **đo độ chính xác** từng trường (tên/SL/giá/đơn vị/HSD).
- [ ] Tinh chỉnh **prompt** trong `agent/src/prompts/system.ts` cho các lỗi hay gặp (mục 3).
- [ ] Thêm test cho `tool.ts` (ráp nối deps) và một kịch bản E2E nhẹ.
- [ ] Xem lại cảnh báo đổi giá khi `previousCost = null` (mục 4) — phân biệt "chưa từng nhập" vs "đã bán sạch".

> Smoke test thủ công cho cả widget chat xem: `docs/superpowers/specs/2026-05-30-taphoa-chat-widget-status.md`
