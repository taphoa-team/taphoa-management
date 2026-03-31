# Tổng hợp tính năng — Cần / Không cần / Chưa rõ

> Nguồn: cau-hoi-tinh-nang.docx — Mẹ trả lời vào cột Ghi chú
> Tổng hợp: 30/03/2026
> Quy ước: ✅ Cần | ❌ Không cần | ❓ Chưa rõ | 🗄 Đã có trong DB

---

## A. Bán hàng

| # | Tính năng | Cần? | Ghi chú mẹ |
|---|-----------|------|------------|
| 1 | Bán hàng nhanh (POS) | ✅ | Core feature |
| 2 | Tạm giữ đơn (đang bán cho A, khách B tới) | ✅ | Đã có trong TODO (localStorage) |
| 3 | Tìm SP bằng tên / mã vạch / SKU | ✅ 🗄 | Đã có trong DB |
| 4 | Giảm giá trên từng SP | ❓ | Mẹ chưa trả lời rõ |
| 5 | Giảm giá trên cả đơn hàng | ❓ | Mẹ chưa trả lời rõ |
| 6 | In hóa đơn | ❌ | Cửa hàng **không có máy in hóa đơn** |
| 7 | Gửi hóa đơn qua Zalo/SMS | ❓ | Mẹ chưa trả lời |
| 8 | Bán theo combo | ❓ | Mẹ chưa trả lời |
| 9 | Đặt hàng trước (khách đặt, mai lấy) | ❓ | Mẹ chưa trả lời |
| 10 | Bán theo cân (số lượng lẻ) | ❌ | Cửa hàng **không bán hàng cân** |

---

## B. Sản phẩm

| # | Tính năng | Cần? | Ghi chú mẹ |
|---|-----------|------|------------|
| 11 | Ảnh sản phẩm | ✅ | Mẹ nói "có" |
| 12 | SP nhiều phiên bản (Pepsi lon/chai/2L) | ✅ | Hiện tạo 3 SP riêng → giữ cách này |
| 13 | Nhiều đơn vị (thùng/lốc/chai) — quy đổi tự động | ✅ 🗄 | Đã có `unit_conversions` trong DB |
| 14 | Quản lý hàng theo lô / HSD | ✅ 🗄 | Đã có `product_batches` — điểm thắng KiotViet |
| 15 | Import SP từ Excel | ❌ | Mẹ nói không cần |
| 16 | In tem mã vạch | ✅ 🗄 | Đã có trong kế hoạch |
| 17 | Giá bán theo khách (VIP giá khác) | ❓ | Mẹ chưa trả lời |
| 18 | Giá bán theo số lượng (mua >= 10 giảm 5%) | ❓ | Mẹ chưa trả lời |

---

## C. Kho hàng

| # | Tính năng | Cần? | Ghi chú mẹ |
|---|-----------|------|------------|
| 19 | Kiểm kê kho | ✅ | "Cần kiểm kho so với thực tế **nhanh**" |
| 20 | Chuyển kho (nhiều điểm bán) | ❌ | Mẹ chỉ có **1 cửa hàng** |
| 21 | Xuất hủy hàng | ✅ | Hàng hết hạn xử lý: "**bán giảm giá và bỏ**" |
| 22 | Cảnh báo tồn kho thấp | ✅ 🗄 | Đã có `min_quantity` trong DB |
| 23 | Cảnh báo hàng sắp hết hạn | ✅ 🗄 | Đã có `product_batches.expiry_date` — điểm thắng KiotViet |
| 24 | Lịch sử xuất/nhập kho | ✅ | |
| 25 | Đề xuất nhập hàng tự động | ❓ | Tính năng nâng cao — mẹ chưa trả lời |

---

## D. Khách hàng

| # | Tính năng | Cần? | Ghi chú mẹ |
|---|-----------|------|------------|
| 26 | Lưu thông tin khách hàng | ✅ 🗄 | Đã có `customers` trong DB |
| 27 | Nhóm khách hàng (VIP, thường, sỉ) | ❓ | Mẹ chưa trả lời |
| 28 | Tích điểm / thẻ thành viên | ✅ | Mẹ nói "có" |
| 29 | Lịch sử mua hàng từng khách | ✅ | |
| 30 | Sinh nhật khách → voucher | ❓ | Mẹ nói "chưa làm được" |

---

## E. Công nợ

| # | Tính năng | Cần? | Ghi chú mẹ |
|---|-----------|------|------------|
| 31 | Ghi nợ khi bán hàng | ✅ 🗄 | Đã có `debts` trong DB |
| 32 | Ghi nhận trả nợ | ✅ 🗄 | Đã có `debts.type = payment` |
| 33 | Hạn trả nợ + nhắc nhở | ❌ | Mẹ **không đặt hạn**, đòi thủ công |
| 34 | Công nợ NCC (mình nợ NCC) | ❌ | NCC **không cho nợ** |
| 35 | In phiếu công nợ | ❓ | Mẹ chưa trả lời |

---

## F. Nhân viên

| # | Tính năng | Cần? | Ghi chú mẹ |
|---|-----------|------|------------|
| 36 | Phân quyền admin / NV | ✅ 🗄 | Đã có `users.role` |
| 37 | Quản lý ca làm việc | ✅ | NV làm "theo thời gian mẹ đặt ra" (không ca cố định) |
| 38 | Chấm công | ❓ | Mẹ chưa trả lời |
| 39 | Tính lương | ❓ | Mẹ chưa trả lời |
| 40 | Mở/đóng ca bán hàng | ✅ | Đã có `shifts` trong DB |
| 41 | Nhật ký hoạt động (ai làm gì) | ❓ | Mẹ nói "chưa biết dùng" |

---

## G. Báo cáo

| # | Tính năng | Cần? | Ghi chú mẹ |
|---|-----------|------|------------|
| 42 | Doanh thu theo ngày/tuần/tháng | ✅ | |
| 43 | Lãi/lỗ | ✅ | Mẹ hiện chỉ ước lượng |
| 44 | Hàng bán chạy / hàng ế | ✅ | Mẹ muốn biết hàng ế |
| 45 | Báo cáo tồn kho | ✅ | |
| 46 | Báo cáo công nợ | ✅ | |
| 47 | Báo cáo theo NV | ❓ | Mẹ chưa trả lời |
| 48 | Xuất báo cáo Excel | ✅ | |
| 49 | So sánh doanh thu giữa các tháng | ❓ | Mẹ chưa trả lời |

---

## H. Khác

| # | Tính năng | Cần? | Ghi chú mẹ |
|---|-----------|------|------------|
| 50 | Giao hàng (quản lý đơn giao) | ✅ | Mẹ **có giao hàng** nhưng "chưa biết quản lý" |
| 51 | Kết nối sàn TMĐT | ❓ | Mẹ chưa trả lời |
| 52 | Quản lý két tiền | ✅ | Liên quan `shifts` |
| 53 | Backup tự động | ✅ | Quan trọng cho self-host |
| 54 | Hỗ trợ offline | ❓ | Self-host + WiFi → ít khi mất |
| 55 | Dark mode | ❌ | Không cần |
| 56 | Chỉ tiếng Việt | ✅ | |
| 57 | Hướng dẫn sử dụng (tooltip/tour) | ✅ | Điểm thắng KiotViet |
| 58 | AI trợ lý (hỏi tiếng Việt) | ✅ | Mẹ: "Thích, rất tiện!" — điểm thắng KiotViet |

---

## Tổng kết

| Phân loại | Số lượng | Các tính năng |
|-----------|----------|---------------|
| ✅ Cần làm | **30** | 1,2,3,11,12,13,14,16,19,21,22,23,24,26,28,29,31,32,36,37,40,42,43,44,45,46,48,50,52,53,56,57,58 |
| ❌ Không cần | **7** | 6 (không máy in), 10 (không bán cân), 15 (không import), 20 (1 cửa hàng), 33 (không đặt hạn nợ), 34 (NCC không cho nợ), 55 (dark mode) |
| ❓ Chưa rõ | **21** | 4,5,7,8,9,17,18,25,27,30,35,38,39,41,47,49,51,54 |
| 🗄 Đã có DB | **11** | 3,13,14,16,22,23,26,31,32,36,40 |

---

## Quyết định cho các ❓ chưa rõ

> Dựa trên context khảo sát + quy mô cửa hàng, đề xuất:

| # | Tính năng | Đề xuất | Lý do |
|---|-----------|---------|-------|
| 4,5 | Giảm giá SP/đơn | ✅ Phase 4 | Mẹ nói hàng hết hạn "bán giảm giá" → cần |
| 7 | Gửi hóa đơn Zalo/SMS | ❌ Bỏ | Cửa hàng tạp hóa, khách lẻ không cần |
| 8 | Bán combo | ❌ Bỏ | Phức tạp, cửa hàng nhỏ chưa cần |
| 9 | Đặt hàng trước | ❌ Bỏ | Tạp hóa mua tại chỗ |
| 17,18 | Giá theo khách/SL | ❌ Bỏ | Phức tạp, chưa có nhu cầu rõ |
| 25 | Đề xuất nhập hàng tự động | ❓ Phase sau | Hay nhưng phức tạp, để sau |
| 27 | Nhóm khách hàng | ❌ Bỏ | Cửa hàng nhỏ, chưa cần phân nhóm |
| 30 | Sinh nhật → voucher | ❌ Bỏ | Tạp hóa chưa cần |
| 35 | In phiếu công nợ | ❌ Bỏ | Không có máy in |
| 38,39 | Chấm công / tính lương | ❌ Bỏ | Ngoài scope, 2 NV quản lý đơn giản |
| 41 | Nhật ký hoạt động | ✅ Phase 1 | Audit log quan trọng, mẹ cần kiểm soát NV |
| 47 | Báo cáo theo NV | ✅ Phase 4 | Có `shifts` → dễ làm |
| 49 | So sánh doanh thu | ✅ Phase 4 | Dễ làm khi đã có API báo cáo |
| 51 | Kết nối sàn TMĐT | ❌ Bỏ | Ngoài scope, quá phức tạp |
| 54 | Hỗ trợ offline | ❌ Bỏ | Self-host + WiFi nội bộ đủ dùng |

> ⚠️ Các đề xuất trên cần hỏi lại mẹ xác nhận trước khi quyết định cuối cùng.
