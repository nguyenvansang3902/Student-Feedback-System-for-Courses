# Kiểm tra giao diện Tuần 9

Ngày chạy: **30/10/2026**, hoàn tất lượt fixture lúc **17:38 giờ Việt Nam**. Phạm vi: FR-60–65, FR-150 và phần trạng thái/nhắc nhở BR-13 của Tuần 9. Tài liệu này ghi phép thử giao diện, không thay cho kiểm thử dịch vụ, HTTP hoặc nghiệm thu toàn tuần.

## Môi trường và phương pháp

- Chrome headless trên Windows, Puppeteer có sẵn trong môi trường làm việc; một Next dev tại `http://127.0.0.1:3009`.
- Dùng database kiểm thử riêng đã xác minh marker, tên database và UUID máy chủ bằng harness HTTP. Không chạy thao tác nghiệp vụ của lượt này trên database chính.
- Harness cấp phiên cho các tài khoản **giả** đã có vai trò và MFA theo fixture. Lượt này **không kiểm chứng đăng nhập bằng biểu mẫu**, thiết lập TOTP thật hay luồng xác thực Docker.
- Chụp toàn trang ở **1440 × 1000** và **390 × 844**; ảnh có thể cao hơn viewport. Đo tràn ngang, nhãn trường nhập và lỗi JavaScript/React. Kiểm câu chữ trên các trang mới, giữ yêu cầu không có ví dụ placeholder ở trang đăng nhập.
- **14 nhóm kiểm tra, 23 trạng thái, 46 viewport/46 PNG** đều qua trong lượt fixture. Đã xem lại toàn bộ ảnh bằng bảng ảnh và xem ảnh gốc kiểm duyệt, kết quả lớp trên mobile, Khảo thí và cấu hình trên mobile.
- Kết quả máy đọc lưu cục bộ ở `.local/week9-ui-result.json`. Phiên và ngữ cảnh fixture chứa thông tin xác thực được giữ ngoài Git. Harness HTTP đã dọn fixture sau tín hiệu hoàn tất UI; đối chiếu việc dọn dữ liệu trong [nghiệm thu Tuần 9](NGHIEM_THU_TUAN_09.md).

## Kết quả chạy thật

| Nhóm | Kết quả quan sát |
| --- | --- |
| Khách | Truy cập `/ket-qua` chuyển về đăng nhập; các input không có placeholder ví dụ. |
| ĐBCL đọc kết quả | Xem kết quả lớp đã lưu trữ, điểm nhóm/câu hỏi/phân bố và so sánh cùng mẫu. |
| Giảng viên | Có liên kết lớp phụ trách; UUID lớp khác trả 404, không có điểm hoặc góp ý. |
| Thiếu mẫu | Hiện “Chưa đủ mẫu để công bố”; không dựng điểm nhóm hoặc góp ý của lớp đó. |
| Khảo thí | Chỉ có nhóm kiểm tra, đánh giá ở mức gộp; không liên kết lớp, nhóm giảng dạy hay tự luận. API lớp trả 403. |
| Nhiều vai trò | GV + Khảo thí đổi chế độ bằng capability DTO; chế độ Khảo thí không có liên kết lớp. |
| Chưa hoàn thành | Trưởng bộ môn xem danh sách trạng thái; nhắc thật và lần nhắc tiếp theo cùng ngày xếp 0 thông báo. |
| Mất kết nối | Chủ động ngắt POST tổng hợp **trước khi tới máy chủ**: chỉ gửi một lần, giữ mã yêu cầu; người dùng thử lại thủ công và tổng hợp thật thành công. |
| Kiểm duyệt | ĐBCL xử lý thật **3 góp ý** với lý do bắt buộc; hàng đợi chờ chuyển rỗng. |
| Công bố | Sau kiểm duyệt, ĐBCL công bố thật; GV đọc được góp ý đã duyệt trong lớp phụ trách. |
| Rỗng và chỉ đọc | Tìm kiếm không có dữ liệu hiển thị rỗng; đợt đã công bố/lưu trữ không có form sửa kiểm duyệt. |
| ADMIN | Xem cấu hình mức đánh giá/từ khóa và yêu cầu mã TOTP mới; mã 5 chữ số không qua kiểm tra biểu mẫu. Không có quyền/menu kết quả nghiệp vụ. |
| Vai trò bị chặn | Sinh viên, PĐT và Thanh tra truy cập `/ket-qua` được chuyển về tài khoản; không có menu kết quả. |
| Bố cục và câu chữ | 46 phép đo không tràn ngang/thiếu nhãn; không có lỗi JS/React; các trang mới dùng tên chức năng và hướng dẫn ngắn. |

Lỗi mạng được tạo bằng cách chặn một yêu cầu trong trình duyệt; **không giả phản hồi nghiệp vụ**. Các bước tổng hợp, kiểm duyệt, công bố, nhắc và đọc kết quả vẫn chạy qua API và MySQL của database kiểm thử. Việc không tự lặp POST còn có test client riêng; giao dịch, CAS và giới hạn mỗi ngày được kiểm ở dịch vụ/HTTP.

## Ảnh bằng chứng

| Trạng thái | Desktop 1440 | Mobile 390 |
| --- | --- | --- |
| Khách về đăng nhập | [Ảnh](assets/tuan-09/ui/khach-dang-nhap-1440.png) | [Ảnh](assets/tuan-09/ui/khach-dang-nhap-390.png) |
| ĐBCL danh sách | [Ảnh](assets/tuan-09/ui/dbcl-danh-sach-1440.png) | [Ảnh](assets/tuan-09/ui/dbcl-danh-sach-390.png) |
| ĐBCL kết quả lớp | [Ảnh](assets/tuan-09/ui/dbcl-ket-qua-lop-1440.png) | [Ảnh](assets/tuan-09/ui/dbcl-ket-qua-lop-390.png) |
| GV phạm vi | [Ảnh](assets/tuan-09/ui/gv-pham-vi-1440.png) | [Ảnh](assets/tuan-09/ui/gv-pham-vi-390.png) |
| GV điểm và so sánh | [Ảnh](assets/tuan-09/ui/gv-ket-qua-so-sanh-1440.png) | [Ảnh](assets/tuan-09/ui/gv-ket-qua-so-sanh-390.png) |
| GV ngoài phạm vi | [Ảnh](assets/tuan-09/ui/gv-ngoai-pham-vi-1440.png) | [Ảnh](assets/tuan-09/ui/gv-ngoai-pham-vi-390.png) |
| Chưa đủ mẫu | [Ảnh](assets/tuan-09/ui/dbcl-chua-du-mau-1440.png) | [Ảnh](assets/tuan-09/ui/dbcl-chua-du-mau-390.png) |
| Khảo thí dữ liệu gộp | [Ảnh](assets/tuan-09/ui/khao-thi-ket-qua-gop-1440.png) | [Ảnh](assets/tuan-09/ui/khao-thi-ket-qua-gop-390.png) |
| Khảo thí bị chặn lớp | [Ảnh](assets/tuan-09/ui/khao-thi-chan-lop-1440.png) | [Ảnh](assets/tuan-09/ui/khao-thi-chan-lop-390.png) |
| GV + Khảo thí | [Ảnh](assets/tuan-09/ui/nhieu-vai-tro-khao-thi-1440.png) | [Ảnh](assets/tuan-09/ui/nhieu-vai-tro-khao-thi-390.png) |
| Danh sách chưa hoàn thành | [Ảnh](assets/tuan-09/ui/truong-bo-mon-chua-hoan-thanh-1440.png) | [Ảnh](assets/tuan-09/ui/truong-bo-mon-chua-hoan-thanh-390.png) |
| Nhắc sinh viên | [Ảnh](assets/tuan-09/ui/truong-bo-mon-da-nhac-1440.png) | [Ảnh](assets/tuan-09/ui/truong-bo-mon-da-nhac-390.png) |
| Trước tổng hợp | [Ảnh](assets/tuan-09/ui/dbcl-cho-tong-hop-1440.png) | [Ảnh](assets/tuan-09/ui/dbcl-cho-tong-hop-390.png) |
| Lỗi mạng, chờ đối chiếu | [Ảnh](assets/tuan-09/ui/dbcl-loi-mang-cho-doi-chieu-1440.png) | [Ảnh](assets/tuan-09/ui/dbcl-loi-mang-cho-doi-chieu-390.png) |
| Đã tổng hợp | [Ảnh](assets/tuan-09/ui/dbcl-da-tong-hop-1440.png) | [Ảnh](assets/tuan-09/ui/dbcl-da-tong-hop-390.png) |
| Góp ý chờ kiểm duyệt | [Ảnh](assets/tuan-09/ui/dbcl-kiem-duyet-cho-1440.png) | [Ảnh](assets/tuan-09/ui/dbcl-kiem-duyet-cho-390.png) |
| Kiểm duyệt xong | [Ảnh](assets/tuan-09/ui/dbcl-kiem-duyet-xong-1440.png) | [Ảnh](assets/tuan-09/ui/dbcl-kiem-duyet-xong-390.png) |
| Đã công bố | [Ảnh](assets/tuan-09/ui/dbcl-da-cong-bo-1440.png) | [Ảnh](assets/tuan-09/ui/dbcl-da-cong-bo-390.png) |
| GV góp ý sau công bố | [Ảnh](assets/tuan-09/ui/gv-gop-y-sau-cong-bo-1440.png) | [Ảnh](assets/tuan-09/ui/gv-gop-y-sau-cong-bo-390.png) |
| Danh sách rỗng | [Ảnh](assets/tuan-09/ui/dbcl-danh-sach-rong-1440.png) | [Ảnh](assets/tuan-09/ui/dbcl-danh-sach-rong-390.png) |
| Kiểm duyệt chỉ đọc | [Ảnh](assets/tuan-09/ui/dbcl-kiem-duyet-chi-doc-1440.png) | [Ảnh](assets/tuan-09/ui/dbcl-kiem-duyet-chi-doc-390.png) |
| Cấu hình ADMIN | [Ảnh](assets/tuan-09/ui/admin-cau-hinh-ket-qua-1440.png) | [Ảnh](assets/tuan-09/ui/admin-cau-hinh-ket-qua-390.png) |
| ADMIN không có menu kết quả | [Ảnh](assets/tuan-09/ui/admin-khong-co-menu-ket-qua-1440.png) | [Ảnh](assets/tuan-09/ui/admin-khong-co-menu-ket-qua-390.png) |

## Giới hạn của lượt kiểm tra

Chưa chứng minh WCAG đầy đủ, trình đọc màn hình, mọi trình duyệt/thiết bị hoặc tải 1.500 request. Phép đo nhận diện rò rỉ bằng tên trường trong chữ hiển thị không thay cho kiểm DTO/log/schema; phần đó có phép thử riêng. Kiểm tra cấu hình ở UI mới xác nhận bố cục và ràng buộc mã TOTP, không lưu thay đổi cấu hình toàn hệ thống bằng phiên thật của người dùng. Không kiểm hoặc triển khai phần xuất báo cáo của Tuần 12.
