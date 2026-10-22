# Giải thích Tuần 4 — phân quyền và xác thực hai bước

Thực hiện ngày **22/10/2026**. Đây là bản nháp AI hỗ trợ; nhóm cần đọc, thử và diễn đạt lại. Kết quả chạy thực tế nằm trong [nghiệm thu](../NGHIEM_THU_TUAN_04.md), thiết kế chi tiết ở [ADR-005](../decisions/ADR-005-totp-va-phan-quyen.md).

## Vì sao nhập đúng mật khẩu vẫn chưa vào quản trị?

ADMIN còn phải chứng minh có ứng dụng xác thực. Sau mật khẩu, máy chủ chỉ cấp phiên tối đa 5 phút để đăng ký hoặc nhập mã hai bước. Phiên này không dùng được cho quản trị, xem danh sách người dùng hoặc làm mới thành phiên đầy đủ.

Khi đăng ký, quét QR hoặc nhập khóa bằng tay vào Google Authenticator/Authy. Mã đầu tiên đúng mới bật TOTP và cấp phiên có MFA. Mười mã khôi phục chỉ xuất hiện một lần; cất riêng an toàn, không gửi GitHub hoặc chụp vào báo cáo.

## Mã sáu chữ số và mã khôi phục khác nhau thế nào?

Mã TOTP đổi sau mỗi 30 giây; máy chủ chấp nhận lệch một chu kỳ để xử lý lệch đồng hồ. Một bước đã dùng thì không dùng lại. Mã khôi phục là chuỗi ngẫu nhiên để đăng nhập khi mất ứng dụng, mỗi mã chỉ dùng một lần. Database giữ hash mã khôi phục và secret TOTP đã mã hóa, không giữ chúng ở dạng đọc được.

Đổi quyền hoặc đặt lại 2FA cần thêm một mã TOTP mới. Nếu vừa dùng mã để đăng nhập hoặc thao tác khác, chờ ứng dụng hiện mã tiếp theo. Mã khôi phục không thay thế bước xác nhận thao tác nhạy cảm này.

## Vì sao phải kiểm cả vai trò lẫn phạm vi?

Hai trưởng khoa cùng chức danh nhưng phụ trách hai khoa khác nhau. Service kiểm phiên trong DB và đưa điều kiện khoa vào truy vấn, nên đổi ID trên URL không làm xuất hiện dữ liệu khoa khác. Sinh viên được lọc qua đăng ký học phần; giảng viên qua phân công giảng dạy. Có nhiều gán vai trò thì xét hợp các gán hợp lệ.

ADMIN quản lý tài khoản và cấu hình. Quyền này không tự cho phép đọc kết quả hay nội dung phản hồi. Tuần 4 mới có danh sách lớp tối thiểu để kiểm phạm vi; chức năng khảo sát, kết quả và phản hồi triển khai đúng các tuần sau.

## Vì sao không tự khóa hoặc tự đổi vai trò ADMIN?

Thao tác này dễ làm mất quyền quản trị của chính người đang sử dụng. Giao diện và service yêu cầu ADMIN khác thực hiện; transaction còn bảo vệ ADMIN ACTIVE cuối cùng và thu hồi phiên cũ khi quyền/trạng thái thay đổi. Trường hợp mất 2FA có script trên máy chủ, có xác nhận tài khoản và audit; không có nút công khai bỏ qua MFA.

## Năm câu hỏi bảo vệ

### 1. Ẩn nút quản trị có đủ chống truy cập trái phép không?

Không. Người dùng vẫn có thể tự gửi request. Route và service phải kiểm phiên, ADMIN và MFA; truy vấn dữ liệu phải có bộ lọc phạm vi.

### 2. Tại sao không lưu secret TOTP bằng hash như mật khẩu?

Máy chủ cần secret để tính và kiểm mã theo thời gian nên phải giải mã được. AES-256-GCM giữ bí mật và phát hiện ciphertext bị sửa, gắn với tài khoản và phiên bản khóa.

### 3. Hai request gửi cùng mã khôi phục có cùng thành công không?

Không được phép. Cập nhật có điều kiện chỉ nhận mã chưa dùng; khóa và transaction bảo đảm một request thắng. Test mock kiểm logic, còn HTTP/MySQL kiểm tình huống đồng thời thật.

### 4. Có cookie httpOnly thì vì sao vẫn cần CSRF?

Trình duyệt tự gửi cookie. Thao tác ghi kiểm Origin/Host và token CSRF có chữ ký gắn đúng phiên; thao tác rất nhạy cảm còn cần TOTP mới.

### 5. Đổi khóa MFA trong .env là xong chưa?

Chưa. Ciphertext cũ cần khóa cũ để giải mã. Phải sao lưu, có quy trình chuyển ciphertext hoặc đặt lại và đăng ký TOTP có kiểm soát. Bản hiện tại dùng một phiên bản khóa, chưa có công cụ xoay khóa tự động.
