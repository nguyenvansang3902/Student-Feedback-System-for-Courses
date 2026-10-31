# Ngữ cảnh theo vai trò và cấp tài khoản ADMIN — 31/10/2026

Theo yêu cầu người dùng, cả mười vai trò tiếp tục dùng một trang đăng nhập. Các trang chưa xác thực không biết người truy cập là sinh viên hay cán bộ, nên dùng câu chữ trung tính. Cách gọi sinh viên chỉ giữ ở chức năng dành riêng cho sinh viên. Quy ước này áp dụng cho các tuần tiếp theo, cùng yêu cầu ít slogan, không gọi “bạn” và không có chữ gợi ý bên trong ô nhập.

## Cách hiển thị hiện tại

| Ngữ cảnh | Câu chữ/nhãn |
| --- | --- |
| Đăng nhập dùng chung | Mã tài khoản hoặc email; Nhập mật khẩu |
| Kích hoạt/khôi phục/email tài khoản | Kích hoạt tài khoản; email của tài khoản; đăng nhập bằng mật khẩu mới |
| Tài khoản chỉ có vai trò sinh viên | Mã số sinh viên |
| Tài khoản chỉ có vai trò giảng viên | Mã giảng viên |
| ADMIN, trưởng bộ môn/khoa, ĐBCL, lãnh đạo, PĐT, Khảo thí, Thanh tra | Mã tài khoản |
| Một tài khoản nhiều vai trò | Mã tài khoản; hiển thị những vai trò và chức năng được cấp |

Trang chủ hướng dẫn đăng nhập, hoàn tất hai bước nếu được yêu cầu rồi chọn chức năng theo quyền. Liên kết Khảo sát môn học đi qua trang tài khoản, phù hợp cả cán bộ và sinh viên. Tên mục quản trị là “Cấu hình kết quả và kiểm duyệt”; quyền cấu hình không cấp quyền đọc kết quả nghiệp vụ. Không thêm bước chọn vai trò trước đăng nhập, thay quyền hoặc đổi luồng nghiệp vụ.

## ADMIN riêng và đăng nhập lần đầu

Đã tạo một tài khoản ADMIN riêng ACTIVE/GLOBAL trên database cục bộ bằng công cụ admin:create hiện có. Kiểm đúng database chính qua marker/server UUID trước thao tác. Mật khẩu bàn giao riêng, không nằm trong mã nguồn, tài liệu, ảnh hoặc tham số dòng lệnh. Tài khoản chỉ tồn tại trên database máy hiện tại; người tải dự án ở máy khác cần tạo ADMIN riêng.

Đăng nhập tại [trang đăng nhập](http://localhost:3000/dang-nhap), quét QR bằng ứng dụng xác thực, nhập mã sáu chữ số và lưu riêng mười mã khôi phục. Sau đó vào [quản trị](http://localhost:3000/quan-tri). Chủ tài khoản tự thiết lập TOTP; chưa có TOTP thì chưa được vào chức năng quản trị, đúng FR-07/BR-32. Không dùng tài khoản ADMIN thử trong ảnh để đăng nhập.

Sau lần gián đoạn, mật khẩu bàn giao trong bộ nhớ không còn. Đã phát hành lại qua luồng quên/đặt lại mật khẩu chính thức cho đúng ADMIN mới, email chỉ vào Mailpit cục bộ. Không tạo thêm ADMIN hoặc đặt lại 2FA. Đăng nhập thật trả200/MFA_SETUP, mfaRequired=true; truy cập quản trị trước hai bước bị chuyển đến /bao-mat/thiet-lap. Phiên xác minh đã đăng xuất, chủ tài khoản vẫn chưa có TOTP. [Kết quả không chứa thông tin đăng nhập](assets/ngu-canh-tai-khoan-2026-10-30/admin-handoff-verification.json).

## Kiểm tra và bằng chứng

- Chạy lại npm run check ngày31/10: **797/797 kiểm thử trong50tệp**, schema/ERD/lint/TypeScript qua. Không thêm kiểm thử chỉ so khớp câu chữ. Build/HTTP nghiệp vụ/seed của Tuần9 giữ bằng chứng cũ; không nhận đã chạy lại các bộ đó cho lượt đổi câu chữ này.
- QA Chrome ngày30/10: **44/44 lượt bố cục**, gồm mười vai trò và một trường hợp đa vai trò; kiểm trang chủ, năm trạng thái xác thực, tài khoản từng vai trò, không gian từng vai trò và quản trị. Hai kích thước1440×1000/390×844 cho các trang chung/tài khoản; không gian vai trò và cấu hình quản trị kiểm1440.
- Không có Bạn/placeholder/thiếu nhãn/tràn ngang/lỗiJavaScript hoặcReact trong phép đo. Nhãn mã tài khoản được đối chiếu vai trò đăng nhập thực tế. Đã mở xem cả tám PNG mới; ảnh các lượt trước được giữ nguyên.
- Chín tài khoản demo sẵn có và một ADMIN giả riêng được dùng để kiểm. ADMIN giả hoàn tất TOTP thật qua API và xem được cấu hình; thử thêm vai trò sinh viên để xác nhận nhãn chung. Sau kiểm, đã vô hiệu hóa ADMIN giả, bỏ quyền và TOTP/mã khôi phục thử, thu hồi phiên, xóa passwordHash; giữ User/AuditLog, không xóa lịch sử kiểm toán.
- QA chỉ gửi các POST xác thực, không ghi khảo sát/phản hồi hoặc gửi email; bước bàn giao ADMIN ngày31/10 có một email đặt lại ở Mailpit cục bộ, đã dùng token và kiểm nội dung trung tính. Không tự thiết lập TOTP cho ADMIN của chủ dự án.
- [Kết quả UI máy đọc](assets/ngu-canh-tai-khoan-2026-10-30/verification.json). Harness/log nằm trong .local, ngoài Git; không lưu QR, secret, token, cookie hoặc mật khẩu vào báo cáo/ảnh.

| Trang | Máy tính | Điện thoại |
| --- | --- | --- |
| Đăng nhập dùng chung | [Ảnh1440](assets/ngu-canh-tai-khoan-2026-10-30/dang-nhap-chung-1440.png) | [Ảnh390](assets/ngu-canh-tai-khoan-2026-10-30/dang-nhap-chung-390.png) |
| Kích hoạt dùng chung | [Ảnh1440](assets/ngu-canh-tai-khoan-2026-10-30/kich-hoat-chung-1440.png) | [Ảnh390](assets/ngu-canh-tai-khoan-2026-10-30/kich-hoat-chung-390.png) |
| Tài khoản sinh viên | [Ảnh1440](assets/ngu-canh-tai-khoan-2026-10-30/tai-khoan-sinh_vien-1440.png) | [Ảnh390](assets/ngu-canh-tai-khoan-2026-10-30/tai-khoan-sinh_vien-390.png) |
| ADMIN giả dùng cho QA, đã vô hiệu hóa | [Ảnh1440](assets/ngu-canh-tai-khoan-2026-10-30/tai-khoan-admin-1440.png) | [Ảnh390](assets/ngu-canh-tai-khoan-2026-10-30/tai-khoan-admin-390.png) |

Đây là chỉnh giao diện và bàn giao vận hành, không cộng FR/điểm: vẫn **138/219=63,0%,49/84FR**. Không bắt đầu Tuần10. FR-160 kiểm toàn bộ ma trận tương lai vẫn chờ Tuần13. Kết quả CI phải đối chiếu đúng SHA của commit mới; không dùng CI Tuần9 cũ để nhận lượt sửa này đã qua CI.
