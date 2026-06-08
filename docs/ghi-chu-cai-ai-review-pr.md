# Ghi chú: Cài AI tự động review PR (để dành làm sau)

> Cập nhật: 08/06/2026
> Trạng thái: CHƯA cài. Tạm thời review PR thủ công là đủ.

---

## Quyết định tạm thời

Cộng sự thực tập mới làm quen code → **review PR thủ công là đủ**, chưa cần tự động.
Khi nào muốn tự động thì xem các cách dưới.

---

## 3 cách review PR bằng AI

| | Cách A: Tại máy | Cách B: Gemini free + GitHub | Cách C: Claude tự động |
|---|---|---|---|
| Chi phí | **Miễn phí** (gói Pro/Max) | **Miễn phí** (Gemini free tier) | Tốn tiền (API key Anthropic) |
| Tự động? | Không (bấm tay) | Có | Có |
| Setup | Không cần | Vừa | Vừa |
| Chất lượng review | Cao (Claude) | Khá (Gemini) | Cao (Claude) |

### Cách A — Review tại máy (đang dùng, miễn phí)

```bash
gh pr checkout <số-PR> --repo taphoa-team/taphoa-management
# Trong Claude Code:
/code-review          # hoặc /code-review ultra (sâu hơn)
```
Dùng gói Pro/Max sẵn có → không tốn thêm. Mình (thb) tự bấm khi muốn review.

### Cách B — Gemini free tier + GitHub Action (free, tự động)

**Mấu chốt:** dự án **đã có sẵn `GOOGLE_API_KEY`** (dùng cho chat agent).
Gemini có **gói free** ở [aistudio.google.com](https://aistudio.google.com) — gọi API miễn phí,
chỉ giới hạn số request/phút. Đủ cho việc review vài PR/ngày.

Cần: 1 GitHub Action gọi Gemini đọc diff PR rồi comment. Có sẵn action mã nguồn mở
(tìm "gemini pr review action" trên GitHub Marketplace), hoặc tự viết ~30 dòng.

⚠️ Vẫn dính bẫy fork: PR từ fork không thấy secret `GOOGLE_API_KEY` nếu dùng trigger
`pull_request` thường → phải dùng `pull_request_target` (xem cảnh báo bảo mật cách C).

### Cách C — Claude tự động (tốn tiền)

- Cài GitHub App: gõ `/install-github-app` trong Claude Code.
- Thêm secret `ANTHROPIC_API_KEY` (lấy ở console.anthropic.com → cần gắn thẻ).
- Workflow `.github/workflows/claude-review.yml` dùng `anthropics/claude-code-action@v1`.
- **Tốn tiền mỗi PR**: ~$0.20–0.50/lần với Opus (PR nhỏ); rẻ hơn nếu đổi sang Haiku/Sonnet.
- **Bẫy fork + secret:** dùng `pull_request_target` + `ref: head.sha` để secret tới được
  PR từ fork. Rủi ro: code người ngoài chạy kèm key của mình → chỉ bật khi tin cộng sự.
  Luật vàng: PR nào sửa file `.github/workflows/` phải xem kỹ trước khi merge.

---

## Tóm tắt token/chi phí Claude (để khỏi quên)

- Tính tiền theo **token** (≈ mẩu chữ). Mỗi review = input (diff + code đọc) + output (nhận xét).
- Opus 4.8: $5 / 1 triệu token input, $25 / 1 triệu token output.
- Rẻ hơn: Sonnet 4.6 ($3/$15), Haiku 4.5 ($1/$5).

---

## Khuyến nghị

1. **Bây giờ:** dùng cách A (thủ công, free) cho PR của cộng sự.
2. **Khi muốn tự động mà không tốn tiền:** thử cách B (Gemini free — đã có key sẵn).
3. **Chỉ dùng cách C** nếu cần chất lượng Claude tự động và chấp nhận trả phí API.
