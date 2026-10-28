# Kiểm sơ đồ — Điều chỉnh số 01, việc bù G1

Kiểm thực tế **28/10/2026** (Asia/Saigon) từ [ERD hiện tại](ERD.md): **46 model thiết kế / 31 runtime / 15 chỉ thiết kế**, chia bốn miền chính **10 + 17 + 10 + 9**. SHA-256 DMMF thiết kế: `c1e361cc05de595ac669db33e113b03b494505a1c7353add2fbe9a95fc0df5d5`.

Đã dùng **Puppeteer và Chrome headless** mở từng SVG thẻ, chụp PNG và mở xem đủ bốn ảnh. Kiểm vị trí mọi phần tử chữ trong biên SVG trả về **0 phần tử vượt biên**; khi xem ảnh không thấy cắt nhãn, khóa hoặc chân trang. Thẻ `RoleAssignment` ghi 10 vai trò; thẻ `CriterionGroup` ghi `isAssessmentGroup` mặc định false. Bảng chỉ thiết kế có nhãn riêng; bốn SVG này được sinh trực tiếp từ DMMF, không phải bản render Mermaid.

| SVG đã xem | Kích thước PNG | SHA-256 SVG |
| --- | --- | --- |
| [Nền và danh mục](assets/bo-sung-01/erd-nen-danh-muc.svg) | 1632 × 1093 | `81323cf4815c239df852a441c9c291355fe936ed5233245e7ee77903c898635d` |
| [Khảo sát](assets/bo-sung-01/erd-khao-sat.svg) | 1632 × 2067 | `34d8c3e06c2c671b0b3bc4e88e217ba667a0394e2236ee1297ad5e1c10fd1809` |
| [Phản hồi](assets/bo-sung-01/erd-phan-hoi.svg) | 1632 × 1486 | `d9c2e6f483cc7a14cef9db572a013c3332644004a0d7b53a8a14ff43599c2963` |
| [Xác thực và hệ thống](assets/bo-sung-01/erd-he-thong.svg) | 1632 × 1070 | `b70b85ca986d53fd4f25be7a0c80797840a31ad48b3a899c13b58d99a9cf2357` |

Đã trích **cả bốn khối Mermaid** từ `ERD.md`, chuẩn hóa CRLF thành LF, bỏ khoảng trắng cuối khối và thêm một LF; **Mermaid CLI 12 render thành công 4/4** bằng Chrome hiện có, không có lỗi cú pháp. Đã mở xem bốn PNG toàn miền ở chiều rộng 2400px và một ảnh riêng `CriterionGroup` để kiểm cờ mới. Sơ đồ khảo sát/phản hồi lớn, nhiều đường nối; ảnh toàn miền dùng kiểm bố cục, cần phóng SVG để đọc chi tiết.

Harness, nguồn `.mmd`, SVG render, **9 PNG đã xem** và hash nguồn/render nằm ngoài repository tại `work/bo-sung-01-erd/verify.mjs` và `verification.json` trong workspace. Không sửa tài sản hay báo cáo lịch sử Tuần 6. `node scripts/export-erd.mjs --check` đã qua; lần kiểm này không chạy DB, generate client hay build và không thay kiểm chức năng, migration, ẩn danh hoặc CI. Chưa bắt đầu Tuần 7.
