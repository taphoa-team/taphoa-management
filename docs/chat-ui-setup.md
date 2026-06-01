# Agent Chat UI — Hướng dẫn chạy

Giao diện chat (Phase 3) cho agent taphoa: dùng [Agent Chat UI](https://github.com/langchain-ai/agent-chat-ui) của LangChain, nối tới `langgraph dev` qua API passthrough. Chat hỏi-đáp + **upload ảnh hóa đơn** (kéo-thả trên máy, hoặc chụp trực tiếp trên điện thoại qua Cloudflare tunnel).

## Bảng cổng

| Cổng | Service |
|------|---------|
| 8082 | backend taphoa (Go) |
| 2024 | `langgraph dev` — agent (graph `agent`) |
| 3030 | Agent Chat UI (Next.js) |
| 3000 | frontend taphoa (React) — KHÔNG cần khi demo agent |

## Yêu cầu

- `backend` taphoa đang chạy ở `:8082` (chạy `taphoa-all`).
- `agent/.env` có `GOOGLE_API_KEY` + `TAPHOA_PHONE` + `TAPHOA_PASSWORD`.
- `pnpm` (Node 24 có sẵn: `corepack enable pnpm`), `cloudflared` (cho tunnel).

## Cài lần đầu

`chat-ui/` là app bên thứ 3 (đã gitignore — không commit). Clone + cấu hình:

```bash
cd ~/Documents/taphoa-management
git clone https://github.com/langchain-ai/agent-chat-ui.git chat-ui
cp chat-ui.env.example chat-ui/.env
cd chat-ui && pnpm install
```

`chat-ui/.env` đã trỏ sẵn: `NEXT_PUBLIC_API_URL=/api`, `LANGGRAPH_API_URL=http://localhost:2024`, `NEXT_PUBLIC_ASSISTANT_ID=agent`.

> **Vì sao passthrough (`/api`)?** UI gọi proxy nội bộ cùng origin → không vướng CORS, và khi tunnel chỉ cần mở 1 cổng (UI), không phải expose `:2024`. Proxy server-side (`src/app/api/[..._path]/route.ts`) forward sang `LANGGRAPH_API_URL`.

## Chạy

```bash
# Local (chat + upload ảnh từ máy)
bash start-chat.sh

# Local + tunnel cho điện thoại (chụp ảnh trực tiếp)
bash start-chat.sh --tunnel
```

Script tự: kiểm backend `:8082` → chạy `langgraph dev` (`:2024`) → chạy chat UI (`:3030`) → (nếu `--tunnel`) mở quick Cloudflare tunnel in URL `*.trycloudflare.com`. `Ctrl+C` dừng tất cả.

- **Máy:** mở http://localhost:3030
- **Điện thoại:** mở URL `*.trycloudflare.com` (hiện trong log cloudflared)

## Cách hoạt động (ảnh)

UI gửi ảnh dạng `{ type:"image", mimeType, data }` (base64). Agent (`src/graph/normalize.ts`) chuẩn hóa về `{ type:"image_url", image_url:{ url:"data:<mime>;base64,..." } }` — dạng Gemini đọc được — trước khi gọi LLM. Cùng đường dữ liệu với `agent/scripts/invoice.ts`.

## Troubleshooting

| Triệu chứng | Cách xử lý |
|---|---|
| Ảnh gửi nhưng agent không "thấy" | Mở DevTools → xem block UI gửi có đúng `type:"image"` không; đối chiếu `agent/src/graph/normalize.ts`. Xem log `langgraph dev`. |
| Lỗi CORS | Đảm bảo dùng passthrough (`NEXT_PUBLIC_API_URL=/api` + `LANGGRAPH_API_URL=...`), KHÔNG để `NEXT_PUBLIC_API_URL=http://localhost:2024`. |
| Cổng 3030 bận | Sửa `UI_PORT` trong `start-chat.sh`. |
| UI không kết nối được agent | Kiểm `langgraph dev` đã lên `:2024` chưa; `NEXT_PUBLIC_ASSISTANT_ID=agent` đúng tên graph chưa. |
| Backend chưa chạy | `start-chat.sh` sẽ báo và dừng — chạy `taphoa-all` trước. |

## Tunnel URL cố định — `chat-taphoa.bangth.org` (đã cấu hình)

Thay vì quick tunnel (URL ngẫu nhiên), chat UI dùng named tunnel `taphoa` với URL cố định. Đã set up:

1. **`~/.cloudflared/config.yml`** — thêm ingress (trước catch-all 404):
   ```yaml
   - hostname: chat-taphoa.bangth.org
     service: http://localhost:3030
   ```
2. **DNS record** (chạy 1 lần): `cloudflared tunnel route dns taphoa chat-taphoa.bangth.org`
3. **`chat-ui/next.config.mjs`** — thêm `allowedDevOrigins: ["chat-taphoa.bangth.org"]` để Next dev server cho phép tài nguyên `/_next/*` qua domain tunnel. ⚠️ `chat-ui/` gitignored → nếu clone lại phải thêm dòng này lại.

**Chạy (URL cố định):**
```bash
taphoa-all --tunnel   # named tunnel (phục vụ cả chat-taphoa.bangth.org) + backend
bash start-chat.sh    # chat UI :3030 + langgraph :2024 — KHÔNG cần --tunnel
# → điện thoại: https://chat-taphoa.bangth.org
```

> Nếu `taphoa-all --tunnel` đang chạy từ trước khi sửa `config.yml`, phải restart nó để nạp ingress mới.
