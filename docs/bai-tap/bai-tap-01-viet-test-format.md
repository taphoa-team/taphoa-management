# Bài tập 1 — Viết test cho các hàm `format`

> Dành cho: cộng sự mục tiêu **làm quen codebase**.
> Trước khi làm: đọc `docs/HUONG-DAN-CONG-SU.md` (cách fork + tạo nhánh + mở PR).

---

## 0. Mục tiêu bài này

1. **Đọc hiểu** code có sẵn (không sửa nó).
2. Học viết **unit test** — kiểm tra một hàm chạy đúng chưa.
3. Làm quen quy trình **fork → nhánh → commit → PR**.

> Đây là bài an toàn nhất: bạn chỉ **tạo file mới**, không động vào code đang chạy → không thể làm hỏng dự án.

---

## 1. ⚠️ LƯU Ý VÀNG khi dùng AI (đọc kỹ — quan trọng hơn cả bài tập)

AI (ChatGPT, Claude, Copilot...) viết test hộ bạn trong 5 giây. Nhưng nếu dùng sai, bạn sẽ
**phá dự án mà không biết**, và quan trọng hơn: **bạn không học được gì**. Luật bắt buộc:

1. **Bạn là người chịu trách nhiệm, không phải AI.** Code nào bạn commit là code của _bạn_.
   Nếu reviewer hỏi "dòng này làm gì?" mà bạn không trả lời được → bạn chưa được commit nó.

2. **Chỉ tạo MỚI file `format.test.ts`. TUYỆT ĐỐI không sửa `format.ts`** (file gốc).
   Nếu AI gợi ý "sửa hàm `format.ts` cho dễ test hơn" → **TỪ CHỐI**. Bài này chỉ viết test.

3. **Không bao giờ sửa code gốc để test xanh.** Nếu test fail, có 2 khả năng:
   (a) bạn viết test sai, hoặc (b) bạn phát hiện bug thật → **báo lại**, đừng tự sửa source cho qua.

4. **Đọc `git diff` trước mỗi commit.** Xem AI đã đổi đúng những file bạn muốn chưa.
   Nếu thấy nó tự ý đổi file khác (vd `package.json`, file page nào đó) → **bỏ thay đổi đó đi**:

   ```bash
   git status          # xem AI đụng vào file nào
   git diff            # đọc từng dòng đã đổi
   git checkout -- <file-không-định-sửa>   # hoàn tác file đó
   ```

5. **Không copy-paste mù.** Mỗi test case bạn viết, phải giải thích được:
   "test này kiểm tra cái gì, đầu vào gì, mong đợi kết quả gì".

6. **`npm test` phải xanh THẬT.** Không được `skip`/`comment` test cho qua.

7. **1 PR = 1 việc.** Đừng nhân tiện sửa lung tung thứ khác.

---

## 2. Chuẩn bị

```bash
# 1. Đồng bộ code mới nhất (xem HUONG-DAN-CONG-SU.md mục 4)
git checkout main && git pull upstream main

# 2. Tạo nhánh riêng cho bài này (đổi "ten" thành tên/biệt danh của bạn)
git checkout -b ten/test-format

# 3. Cài và chạy thử test có sẵn cho quen
cd frontend
npm install
npm test
```

> File bạn sẽ tạo: `frontend/src/utils/format.test.ts`
> File cần đọc hiểu (KHÔNG sửa): `frontend/src/utils/format.ts`
> File tham khảo cách viết test: `frontend/src/lib/chatImage.test.ts`

---

## 3. Đề bài

Trong `frontend/src/utils/format.ts` có 6 hàm. Viết test cho chúng trong file mới
`frontend/src/utils/format.test.ts`. Mỗi hàm **ít nhất 2 trường hợp**: 1 bình thường + 1 biên (edge case).

| Hàm                           | Gợi ý trường hợp cần test                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `formatVND(value)`            | số thường (vd `1000` → `"1.000đ"`); và `0`, `null`, `undefined` đều phải ra `"0đ"`                                                    |
| `formatDate(value)`           | một ngày cụ thể → đúng định dạng `vi-VN` (dd/mm/yyyy)                                                                                 |
| `formatDateTime(value)`       | một mốc thời gian cụ thể → có cả ngày + giờ                                                                                           |
| `getErrorMessage(err)`        | lỗi kiểu Axios `{response:{data:{error:"X"}}}` → ra `"X"`; một `Error` thường → ra `.message`; giá trị lạ (vd `null`) → ra `fallback` |
| `escapeHtml(text)`            | chuỗi có `<script>` → ký tự `<` `>` bị đổi thành dạng an toàn (không còn thẻ thật)                                                    |
| `inputNumberFormatter(value)` | số `1000000` → chèn dấu phẩy phân nhóm `"1,000,000"`                                                                                  |

> Mẫu một test (cú pháp Vitest):
>
> ```ts
> import { describe, it, expect } from "vitest";
> import { formatVND } from "./format";
>
> describe("formatVND", () => {
>   it('thêm "đ" và phân cách hàng nghìn', () => {
>     expect(formatVND(1000)).toBe("1.000đ");
>   });
>   it("coi null là 0", () => {
>     expect(formatVND(null)).toBe("0đ");
>   });
> });
> ```

---

## 4. Tiêu chí nghiệm thu (tự kiểm trước khi mở PR)

- [ ] Có file `frontend/src/utils/format.test.ts`.
- [ ] Đủ 6 hàm, mỗi hàm ≥ 2 case.
- [ ] `npm test` **xanh hết**, không có test bị `skip`.
- [ ] `git diff` chỉ thấy **1 file mới** (`format.test.ts`) — không đụng file nào khác.
- [ ] Bạn giải thích được từng test mình viết.

---

## 5. Nộp bài

```bash
git add frontend/src/utils/format.test.ts
git commit -m "add unit tests for format utils"
git push -u origin ten/test-format
gh pr create --repo taphoa-team/taphoa-management --base main --fill
```

---

## 6. Câu hỏi tự kiểm tra (trả lời trong phần mô tả PR)

1. `formatVND(null)` trả về gì? Vì sao trong code lại ra như vậy? (gợi ý: toán tử `??`)
2. Nếu một ngày `getErrorMessage` nhận vào một chuỗi `"abc"` (không phải Error, không phải object lỗi) thì trả về gì?
3. Theo bạn, vì sao `escapeHtml` lại quan trọng cho bảo mật? (gợi ý: chữ XSS trong comment dòng 29)
