# Chỉnh câu chữ giao diện — 30/10/2026

Theo yêu cầu người dùng: giảm slogan, dùng câu chữ tự nhiên và rõ chức năng; bỏ ví dụ màu xám trong ô đăng nhập. Đây là chỉnh sửa giao diện sau Tuần 8, không thêm FR hoặc tăng tiến độ.

## Thay đổi

| Vị trí | Trước | Sau |
| --- | --- | --- |
| Trang chủ | “Lắng nghe sinh viên. Cùng cải tiến từng môn học.” | “Khảo sát và phản hồi về môn học” |
| Khối giới thiệu trang chủ | Câu trích dẫn “Một góp ý hôm nay…” | Ba bước làm khảo sát |
| Thương hiệu và chân trang | Các câu về tiếng nói, cải tiến và đóng góp | Tên hệ thống, bỏ tagline lặp lại |
| Đăng nhập | “Chào mừng bạn trở lại”; placeholder “Ví dụ: SV2026001” | “Thông tin đăng nhập”; ô nhập trống, vẫn giữ nhãn và autocomplete |
| Danh sách khảo sát | “Tiếng nói của bạn”; mô tả nhiệm vụ đã chốt | Bỏ slogan, giải thích khảo sát của lớp học phần và quy định nộp một lần |
| Xác nhận | “Cảm ơn bạn đã gửi khảo sát” và tiêu đề phụ lặp ý | “Đã nộp khảo sát”, giữ ngày hoàn thành và quy định không sửa/xóa/nộp lại |
| Tài khoản/xác thực | Cách gọi “không gian” và câu dẫn chung | Tên chức năng và hướng dẫn xác thực cụ thể |

Trang chủ có liên kết đến khảo sát và tài khoản đang dùng được; chỉ chức năng phản hồi còn ghi “Chưa mở”. CI smoke và kiểm HTTP xác nhận được cập nhật theo tiêu đề mới, giữ nguyên các điều kiện kiểm nghiệp vụ. Các cảnh báo về bảo mật, thời hạn, nháp và ẩn danh cần thiết vẫn được giữ.

## Kiểm tra đã chạy

- `npm run check`: **646/646 test trong 39 tệp**, schema/ERD/lint/TypeScript qua.
- Chrome: **5 nhóm kiểm, 8 lượt bố cục ở 1440×1000 và 390×844, 8 PNG đã mở xem**; không lỗi JavaScript, tràn ngang hoặc trường nhập thiếu nhãn trong phép đo.
- Xác nhận các ô đăng nhập không có placeholder; đăng nhập/đăng xuất sinh viên demo qua biểu mẫu thật. Trang tài khoản có nhãn chức năng mới; danh sách khảo sát và xác nhận DONE hiển thị đúng.
- Chỉ đọc nhiệm vụ DONE đã có; **không nộp phiếu** trong lượt QA. Không thay service, schema, dữ liệu khảo sát hoặc quy tắc phân quyền.
- Harness/kết quả nằm ngoài Git tại `work/ui-copy/check.mjs` và `.local/ui-copy-qa.json`. Lượt đầu chờ `networkidle0` trên Next dev bị timeout; chuyển sang chờ DOM và trạng thái giao diện thực rồi chạy lại đủ các bước, không tính lượt lỗi là qua.

Đây là kiểm bố cục Chrome ở hai kích thước, không phải chứng nhận mọi thiết bị hoặc WCAG. Kết quả nghiệm thu và ảnh Tuần 8 cũ được giữ làm lịch sử.

## Ảnh sau chỉnh sửa

| Trang | Máy tính | Điện thoại |
| --- | --- | --- |
| Trang chủ | [PNG](assets/chinh-sua-giao-dien-2026-10-30/trang-chu-1440.png) | [PNG](assets/chinh-sua-giao-dien-2026-10-30/trang-chu-390.png) |
| Đăng nhập | [PNG](assets/chinh-sua-giao-dien-2026-10-30/dang-nhap-1440.png) | [PNG](assets/chinh-sua-giao-dien-2026-10-30/dang-nhap-390.png) |
| Danh sách khảo sát | [PNG](assets/chinh-sua-giao-dien-2026-10-30/khao-sat-1440.png) | [PNG](assets/chinh-sua-giao-dien-2026-10-30/khao-sat-390.png) |
| Xác nhận đã nộp | [PNG](assets/chinh-sua-giao-dien-2026-10-30/xac-nhan-1440.png) | [PNG](assets/chinh-sua-giao-dien-2026-10-30/xac-nhan-390.png) |

Cách xem: mở `/` hoặc `/dang-nhap`; ô mã định danh trống và vẫn có nhãn. Đăng nhập sinh viên demo để mở `/khao-sat`, chọn “Xem xác nhận” ở nhiệm vụ đã hoàn thành. Nội dung hoàn thành chỉ hiện trạng thái/ngày, không hiện lại câu trả lời.
