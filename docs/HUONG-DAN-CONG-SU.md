# Hướng dẫn tham gia dự án `taphoa-management`

Chào bạn 👋 Đây là hướng dẫn để bạn bắt đầu góp code vào dự án **taphoa-management**.
Đọc kỹ một lần, làm theo từng bước. Có gì không hiểu cứ hỏi.

---

## 1. Cách làm việc của nhóm (đọc để hiểu, đừng bỏ qua)

Repo gốc (gọi là **upstream**) nằm ở tài khoản của chủ dự án: `taphoa-team/taphoa-management`.
Repo này **private** và bạn chỉ có quyền **Read** (đọc) — tức là:

- ✅ Bạn **xem** được toàn bộ code.
- ❌ Bạn **KHÔNG** push thẳng code lên repo gốc được.
- ❌ Bạn **KHÔNG** merge vào nhánh `main` được.

Vậy bạn góp code kiểu gì? → Qua mô hình **Fork + Pull Request (PR)**:

```
  Repo gốc (upstream)                Fork của bạn (origin)
  taphoa-team/taphoa-management  <----   BANcủa-bạn/taphoa-management
         ^                                      ^
         |  (4) mở Pull Request                 |  (3) push code lên đây
         |                                      |
         +--------- code của bạn -------- (1)(2) bạn code ở máy mình
```

**Luồng tổng quát:**
1. Bạn tạo một bản sao repo về tài khoản mình → gọi là **fork**.
2. Bạn code trên máy mình, trong một **nhánh (branch)** riêng.
3. Bạn **push** code lên fork của bạn.
4. Bạn mở một **Pull Request (PR)** từ fork của bạn → vào repo gốc.
5. Chủ dự án **review** (xem xét) PR đó. Nếu OK thì merge, nếu cần sửa thì để lại comment.

> 💡 Đây chính là cách các dự án mã nguồn mở (open-source) trên thế giới làm việc. Học được cái này là học được kỹ năng thật.

**Một số thuật ngữ:**
- **fork** = bản sao repo về tài khoản của bạn, bạn toàn quyền trên đó.
- **clone** = tải repo từ GitHub về máy tính của bạn.
- **branch (nhánh)** = một dòng phát triển riêng, để code của bạn không đụng vào code của người khác.
- **commit** = một lần lưu thay đổi, kèm lời mô tả.
- **push** = đẩy commit từ máy lên GitHub.
- **Pull Request (PR)** = lời đề nghị "xin gộp code của tôi vào dự án", để chủ dự án review.
- **upstream** = repo gốc của dự án. **origin** = fork của bạn.

---

## 2. Chuẩn bị một lần (cài đặt công cụ)

### 2.1. Cài Git
Kiểm tra đã có chưa:
```bash
git --version
```
Nếu báo lỗi "command not found" thì cài:
```bash
# Ubuntu / Linux Mint / Debian
sudo apt update && sudo apt install git -y
```

### 2.2. Cài GitHub CLI (`gh`) — công cụ giúp thao tác GitHub bằng dòng lệnh
```bash
# Ubuntu / Linux Mint / Debian
sudo apt install gh -y
```
Kiểm tra:
```bash
gh --version
```

### 2.3. Đăng nhập GitHub
```bash
gh auth login
```
Chọn lần lượt:
- `GitHub.com`
- `SSH` (giao thức kết nối — an toàn, không phải gõ mật khẩu mỗi lần)
- Đồng ý tạo SSH key nếu nó hỏi.
- `Login with a web browser` → nó hiện một mã (ví dụ `AB12-CD34`), copy mã đó, nhấn Enter để mở trình duyệt, dán mã vào và đồng ý.

Kiểm tra đã đăng nhập thành công:
```bash
gh auth status
```
Thấy dòng `✓ Logged in to github.com account <tên-bạn>` là xong.

### 2.4. Khai báo tên & email cho Git (để commit ghi đúng tên bạn)
```bash
git config --global user.name "Tên Của Bạn"
git config --global user.email "email-github-cua-ban@example.com"
```

---

## 3. Lấy code về máy (làm một lần)

> ⚠️ Trước khi làm bước này, hãy báo username GitHub của bạn cho chủ dự án, để được thêm vào repo với quyền Read. Nếu chưa được thêm, bạn sẽ không thấy repo private này.

Fork repo gốc về tài khoản bạn **và** clone về máy cùng lúc — chỉ một lệnh:
```bash
gh repo fork taphoa-team/taphoa-management --clone
```
Lệnh này tự động:
- Tạo fork `<tên-bạn>/taphoa-management` trên tài khoản bạn.
- Tải (clone) về máy, vào thư mục `taphoa-management`.
- Thiết lập sẵn 2 "remote": `origin` (fork của bạn) và `upstream` (repo gốc).

Vào thư mục dự án:
```bash
cd taphoa-management
```

Kiểm tra remote đã đúng chưa:
```bash
git remote -v
```
Bạn sẽ thấy:
```
origin    git@github.com:<tên-bạn>/taphoa-management.git   (fork của bạn — push lên đây)
upstream  git@github.com:taphoa-team/taphoa-management.git      (repo gốc — chỉ để lấy code mới)
```

---

## 4. Quy trình làm việc mỗi ngày (lặp lại mỗi khi làm task mới)

### Bước 1 — Cập nhật code mới nhất từ repo gốc
Trước khi bắt đầu task mới, luôn đồng bộ `main` với repo gốc để tránh xung đột:
```bash
git checkout main
git pull upstream main
```

### Bước 2 — Tạo một nhánh mới cho task của bạn
**Quy ước đặt tên nhánh:** thêm tiền tố tên/biệt danh của bạn vào trước, ví dụ `tencuaban/`.
Hỏi chủ dự án xem dùng tiền tố nào nếu chưa rõ.
```bash
git checkout -b tencuaban/ten-tinh-nang
# ví dụ: git checkout -b minh/them-trang-bao-cao
```

### Bước 3 — Code, rồi lưu lại (commit)
Sau khi sửa/thêm file, xem mình đã đổi gì:
```bash
git status          # liệt kê file đã thay đổi
git diff            # xem chi tiết từng dòng đã đổi
```
Đưa file vào "giỏ" để commit rồi commit:
```bash
git add .                                   # thêm tất cả thay đổi
git commit -m "Mô tả ngắn gọn việc bạn làm"  # ví dụ: "add báo cáo doanh thu theo ngày"
```
> 💡 Commit message viết ngắn gọn, rõ ràng, bằng tiếng Anh càng tốt (ví dụ `add daily revenue report`). Mỗi commit nên là một việc nhỏ hoàn chỉnh.

### Bước 4 — Đẩy code lên fork của bạn (origin)
Lần đầu đẩy một nhánh mới:
```bash
git push -u origin tencuaban/ten-tinh-nang
```
Những lần sau trên cùng nhánh đó, chỉ cần:
```bash
git push
```

### Bước 5 — Mở Pull Request vào repo gốc
```bash
gh pr create --repo taphoa-team/taphoa-management --base main --fill
```
- `--repo taphoa-team/taphoa-management` → PR gửi vào repo gốc (KHÔNG phải fork của bạn).
- `--base main` → muốn gộp vào nhánh `main` của repo gốc.
- `--fill` → tự lấy tiêu đề + mô tả từ commit của bạn.

Muốn tự viết tiêu đề và mô tả thì bỏ `--fill`:
```bash
gh pr create --repo taphoa-team/taphoa-management --base main \
  --title "Thêm trang báo cáo doanh thu" \
  --body "Mô tả chi tiết bạn đã làm gì, vì sao làm vậy."
```

### Bước 6 — Chờ review
- Chủ dự án sẽ xem PR. Nếu cần sửa, họ để lại comment.
- Bạn **không cần mở PR mới** — chỉ cần sửa tiếp trên cùng nhánh, `git add` → `git commit` → `git push`. PR sẽ **tự cập nhật** theo.
- Khi nào chủ dự án bấm **Merge** thì code của bạn chính thức vào dự án 🎉.

---

## 5. Bảng lệnh tra nhanh

| Việc cần làm | Lệnh |
|---|---|
| Đồng bộ main mới nhất | `git checkout main && git pull upstream main` |
| Tạo nhánh mới | `git checkout -b tencuaban/ten-task` |
| Xem mình đổi gì | `git status` / `git diff` |
| Lưu thay đổi | `git add .` → `git commit -m "mô tả"` |
| Đẩy lên fork lần đầu | `git push -u origin ten-nhanh` |
| Đẩy lên fork lần sau | `git push` |
| Mở PR | `gh pr create --repo taphoa-team/taphoa-management --base main --fill` |
| Xem các PR của mình | `gh pr list --repo taphoa-team/taphoa-management --author @me` |
| Xem trạng thái PR | `gh pr status` |

---

## 6. Lưu ý quan trọng (tránh sai lầm thường gặp)

- ❌ **Đừng** code trực tiếp trên nhánh `main`. Luôn tạo nhánh riêng cho mỗi task.
- ❌ **Đừng** quên `git pull upstream main` trước khi tạo nhánh mới — không là dễ bị xung đột.
- ✅ Một PR = một việc. Đừng nhồi 5 tính năng khác nhau vào một PR, khó review.
- ✅ Nếu bị kẹt hay gặp lỗi lạ, **chụp màn hình lỗi + copy lệnh đã chạy** rồi hỏi, đừng đoán mò xoá lung tung.
- ⚠️ Nếu bạn không thấy repo gốc khi fork, nghĩa là bạn **chưa được thêm vào** repo. Báo username GitHub cho chủ dự án.

Chúc bạn code vui 🚀
