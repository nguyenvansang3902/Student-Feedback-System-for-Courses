# ADR-005 — TOTP và phân quyền theo gán phạm vi

- Ngày thực hiện: 22/10/2026.
- Trạng thái: quyết định triển khai Tuần 4; nghiệm thu HTTP/MySQL/CI đã xác minh trong nghiệm thu cuối.
- Liên quan: FR-07, FR-08, FR-10–12; BR-30, BR-32, BR-34; Mục 8.3–8.5 của đặc tả.

## Bối cảnh

ADMIN quản lý tài khoản và cấu hình nhạy cảm, bắt buộc TOTP. Token sau mật khẩu không được dùng để vào quản trị trước bước hai. Một người có thể mang nhiều vai trò với các phạm vi khác nhau; quyền ADMIN không được trở thành quyền đọc dữ liệu khảo sát/phản hồi. Cần kiểm tại service và trong truy vấn, không chỉ tại middleware hoặc giao diện.

## Phương án

1. Chỉ lưu cờ MFA và vai trò trong JWT, dùng middleware để chặn trang: đơn giản nhưng khó thu hồi ngay, dễ dùng nhầm token tạm hoặc bỏ sót API.
2. Lưu purpose/MFA trong UserSession, kiểm lại DB và chính sách tại ranh giới service; scope đặt trong điều kiện query: thêm truy vấn nhưng có căn cứ thu hồi và kiểm IDOR nhất quán.

## Quyết định

- Chọn phương án 2. UserSession có purpose FULL/PASSWORD_CHANGE/MFA_SETUP/MFA_VERIFY và mfaVerifiedAt; JWT phải khớp DB. Phiên hạn chế tối đa 5 phút, không phát refresh dùng được.
- Dùng `otplib` 13.5.0 và `qrcode` 1.5.4, MIT. TOTP SHA1/6 chữ số/30 giây/±1 bước; lưu lastUsedStep và CAS để chặn replay. Mã sai 5 lần khóa 15 phút theo tài khoản/IP.
- Mã hóa secret bằng AES-256-GCM, AAD gồm keyVersion và User ID, khóa môi trường riêng 32 byte. Sinh 10 recovery code ngẫu nhiên 128 bit, chỉ hiển thị lần đầu, lưu hash gắn User ID và consume một lần.
- ADMIN luôn thuộc MFA_REQUIRED_ROLES; ADMIN khác có MFA được sửa phần bổ sung của chính sách. Chuyển chính sách khóa người dùng liên quan, cập nhật và thu hồi phiên chưa MFA; guard và refresh vẫn kiểm lại cấu hình.
- `can()` từ chối mặc định. Gán GLOBAL chỉ dành SV/GV/ĐBCL/LĐ/ADMIN; TBM có DEPARTMENT và TK có FACULTY. Nhiều gán là hợp các quyền độc lập. Không có đường suy quyền nghiệp vụ từ ADMIN.
- Dùng chung filter theo Enrollment/TeachingAssignment/đơn vị cho list/count/detail lớp. Tuần 4 chỉ hiện thông tin danh mục tối thiểu để kiểm phạm vi; chưa tạo kết quả, phiếu hay nội dung phản hồi.
- Thay đổi quyền/trạng thái/chính sách dùng hàng khóa ADMIN_MUTATION_LOCK; kiểm lại actor, bảo vệ ADMIN ACTIVE cuối cùng, thu hồi phiên/token và audit trong transaction. Chặn tự khóa/tự đổi vai trò; cần ADMIN khác.
- Câu lệnh đầu transaction là locking `INSERT ... ON DUPLICATE KEY UPDATE`, sau đó SELECT FOR UPDATE. Không dùng ORM upsert rỗng: lượt MySQL đầu phát hiện SELECT nội bộ có thể lập snapshot REPEATABLE READ trước khi đợi mutex, làm kiểm quyền/số ADMIN sau khóa vẫn thấy dữ liệu cũ. Regression mock đã thêm; kiểm service song song trên MySQL riêng sau sửa đạt một yêu cầu thắng và còn một ADMIN ACTIVE, yêu cầu thua INVALID_SESSION. Lượt HTTP đầy đủ được ghi riêng trong nghiệm thu.
- Ghi quản trị cần Origin/Host cùng APP_URL và token CSRF ký, gắn phiên. Tạo tài khoản, đổi vai trò, sửa chính sách MFA, reset MFA người khác cần thêm mã TOTP mới. Recovery code không thay step-up.
- Cung cấp script tạo ADMIN/reset MFA cho người vận hành máy chủ; không tạo API công khai bootstrap quản trị hoặc tự bỏ MFA.

## Hệ quả

DB được truy vấn tại ranh giới bảo mật; tính đúng ưu tiên hơn việc chỉ dùng claim JWT. Khóa và thứ tự đọc cần kiểm trên MySQL thật, đặc biệt thay quyền đồng thời, policy trong lúc đăng nhập/refresh và tiêu thụ mã một lần. Test mock chỉ chứng minh nhánh kiểm được viết, không thay bằng chứng tranh chấp thật.

Phiên có thể mất hiệu lực khi đổi trạng thái, vai trò hoặc chính sách. Người dùng phải đăng nhập và hoàn tất MFA lại. Việc chặn dùng lại bước TOTP làm người quản trị phải chờ mã mới giữa hai thao tác nhạy cảm.

Khóa MFA hiện chỉ hỗ trợ một version đang cấu hình; đổi khóa cần quy trình chuyển ciphertext riêng, chưa có xoay khóa tự động. Các danh mục lớn cần bổ sung tìm kiếm/phân trang cho bộ chọn đơn vị thay giới hạn 200 mỗi loại. Các module nghiệp vụ sau phải thêm action, filter và test tương ứng; không coi ma trận toàn hệ thống là đã hiện thực ở Tuần 4.

## Nghiệm thu cuối ngày 22/10/2026

Full check **121/121 test trong 13 file**, SQL MySQL **10/10**, CLI stdin **5/5**, HTTP hồi quy Tuần 3 **24/24**, HTTP/MySQL Tuần 4 **28/28** và build exit0. [CI 39733168348](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39733168348) của mã `578fd96622b341b0d94228de83c4c8994449e03b` đã qua check và smoke. Hai ADMIN khóa chéo chỉ một thắng, giữ một ADMIN ACTIVE. UI 13 nhóm/6 viewport qua; [nghiệm thu](../NGHIEM_THU_TUAN_04.md).
