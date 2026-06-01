# Note: Test chat widget (Phase 4) — để dành test sau

> Ngày: 2026-05-30 · Spec: [`2026-05-27-taphoa-chat-widget-design.md`](./2026-05-27-taphoa-chat-widget-design.md) · Plan: [`../plans/2026-05-28-taphoa-chat-widget-phase4.md`](../plans/2026-05-28-taphoa-chat-widget-phase4.md)

**Trạng thái:** Code xong trên branch `nhd98z/taphoa-chat-agent` (7 commit). Chưa smoke test thật → **đây là việc cần làm khi rảnh.**

---

## 1. Bật 3 server (3 terminal)

```bash
# T1 — backend taphoa
cd /home/thb/Documents/taphoa-management/backend && go run main.go

# T2 — agent LangGraph
cd /home/thb/Documents/taphoa-management/agent && pnpm dev

# T3 — frontend (Vite proxy /agent → :2024 đã wire)
cd /home/thb/Documents/taphoa-management/frontend && npm start
```

> Cần `agent/.env` có `GOOGLE_API_KEY` + creds backend taphoa (xem Phase 1).

Mở `http://localhost:3000`, đăng nhập như bình thường.

## 2. Checklist test

### 2.1. Bong bóng hiện trên mọi trang

- [ ] Vào trang Sản phẩm → thấy 💬 góc phải-dưới
- [ ] Chuyển sang Bán hàng, Kho, Khách hàng → vẫn thấy 💬
- [ ] Bấm 💬 → panel mở ra (~380×560), thấy lời chào

### 2.2. Chat chữ (streaming + markdown)

- [ ] Hỏi: `tồn kho sản phẩm nào dưới 5?`
- [ ] ✅ Trả lời hiện **dần từng chữ** (không đợi cả block)
- [ ] ✅ Nếu agent trả về bảng/gạch đầu dòng → render đẹp (không phải `**bold**` thô)
- [ ] ❌ KHÔNG thấy JSON `tool_call` / `tool_result` lộ ra (mục 6 spec)

### 2.3. Giữ hội thoại khi chuyển trang

- [ ] Đang trong panel có vài tin → chuyển menu sang trang khác
- [ ] Bấm lại 💬 → tin nhắn cũ vẫn còn
- [ ] Reload F5 → tin nhắn cũ vẫn còn (vì `threadId` ở `localStorage` key `taphoa_chat_thread`)
- [ ] Bấm 🔄 (Đoạn chat mới) → tin nhắn biến mất, gửi câu mới tạo thread mới

### 2.4. Upload ảnh hóa đơn

- [ ] Bấm 📎 → chọn 1 ảnh hóa đơn JPG/PNG (<10MB)
- [ ] Thấy thumbnail 56×56 trong khung nhập, có nút ❌ xóa
- [ ] Gõ `ghi nháp giúp` (hoặc để trống) → Send
- [ ] ✅ Agent trả về tóm tắt nháp (giống Phase 2 CLI)
- [ ] Thử ảnh quá 10MB → báo lỗi "Ảnh quá lớn..."
- [ ] Thử file `.txt` → báo lỗi "Định dạng ảnh không hỗ trợ"

### 2.5. Lỗi khi agent offline

- [ ] Tắt `pnpm dev` ở T2
- [ ] Gửi tin → ✅ Alert đỏ "Trợ lý đang bận, thử lại sau"
- [ ] ✅ App taphoa vẫn dùng được bình thường (không crash trắng)

### 2.6. Trên điện thoại (qua tunnel — tùy chọn)

- [ ] Bật tunnel `taphoa.bangth.org` → :3000 (xem `docs/chat-ui-setup.md` cũ)
- [ ] Mở trên điện thoại
- [ ] 💬 vẫn hoạt động (proxy `/agent` nằm ở Vite local nên qua tunnel vẫn ok)
- [ ] Bấm 📎 → chọn "Camera" → chụp hóa đơn → trả về tóm tắt

## 3. Nếu lỗi

| Hiện tượng | Nghi ngờ trước | Check thế nào |
|---|---|---|
| Panel mở nhưng gửi tin không phản hồi | Proxy `/agent` chưa hoạt động | `curl -s http://localhost:3000/agent/info` — phải trả JSON, không phải HTML |
| Trả lời nhưng lộ JSON tool | `ChatMessage` lọc sai | Mở `frontend/src/components/chat/ChatMessage.tsx`, check điều kiện `message.type !== 'human' && message.type !== 'ai'` |
| Ảnh gửi nhưng agent không "thấy" | Block format sai | Check Network tab → request body có `{type:"image", mimeType, data}` không. Nếu có thì lỗi ở agent `normalize.ts` (Phase 3). |
| `useStream` báo CORS | Browser gọi thẳng `:2024` thay vì proxy | Xem `apiUrl: '/agent'` trong `ChatWidget.tsx`, không phải `http://localhost:2024` |

## 4. Sau khi test OK

- [ ] Sửa spec gốc: dòng `Trạng thái: Draft (chờ review)` → `Trạng thái: Implemented (v1)`
- [ ] Mở PR `nhd98z/taphoa-chat-agent → main`
- [ ] Xóa file note này (đã không còn cần)

## 5. Deviation duy nhất so với spec (để khỏi bất ngờ lúc review)

`lib/chatImage.ts` dùng `file.arrayBuffer() + btoa()` thay cho `FileReader` (spec mục 6 gợi ý). Lý do: `FileReader` không tồn tại trong Node nên vitest fail. Cách mới chạy được cả browser + Node — đơn giản hơn, đủ nhanh cho ảnh ≤10MB.
