# Nháp mục bảo mật — Tuần 4

Soạn thực tế **22/10/2026**, để nhóm đọc, giải thích và viết lại vào báo cáo. Đây là bản nháp có hỗ trợ AI, không thay phần đóng góp của thành viên. Phần triển khai bám Mục 8.3–8.5 của [đặc tả](DAC_TA_NGHIEP_VU.md); kết quả nghiệm thu tổng hợp HTTP/MySQL/CI được ghi trong nghiệm thu cuối.

## 1. Mục tiêu và mô hình tin cậy

Mật khẩu đúng chỉ chứng minh bước thứ nhất. Đối với ADMIN, ứng dụng còn yêu cầu một yếu tố từ ứng dụng xác thực trước khi mở chức năng quản trị. Khi gọi service, máy chủ kiểm phiên và quyền hiện tại trong DB; không tin các thuộc tính role, phạm vi hoặc mfa do trình duyệt tự gửi.

Phân quyền chia theo hành động và gán phạm vi. ADMIN quản lý tài khoản, cấu hình và kiểm toán; không có quyền mặc định đọc kết quả khảo sát hay nội dung phản hồi. Quyền GV/TBM/TK/ĐBCL/LĐ được xét độc lập. Các chức năng khảo sát/phản hồi chưa được xây ở Tuần 4 nên không được mô tả là đã bảo vệ hoàn chỉnh.

## 2. Mật khẩu và phiên kế thừa từ Tuần 3

Mật khẩu dùng bcryptjs với cost tối thiểu 12, kiểm độ dài tối thiểu 10 ký tự và tối đa 72 byte UTF-8. Access JWT ngắn hạn được ký bằng jose, kiểm cố định thuật toán, issuer, audience, hạn và mục đích token. Refresh ngẫu nhiên chỉ lưu hash trong UserSession, xoay vòng và phát hiện dùng lại; thu hồi family khi replay. Cookie httpOnly, SameSite=Lax; Secure ở production, refresh giới hạn path `/api/auth`. Không lưu token trong localStorage.

Tuần 4 bổ sung `UserSession.purpose` và `mfaVerifiedAt`. Token tạm tối đa 5 phút chỉ có mục đích PASSWORD_CHANGE, MFA_SETUP hoặc MFA_VERIFY; không phát refresh dùng được cho token tạm. Chỉ phiên FULL mới gọi được service nghiệp vụ. Mục đích và cờ MFA của JWT phải khớp phiên trong DB; refresh không biến token tạm thành FULL.

## 3. Đăng ký và xác minh TOTP

- Thư viện được khóa phiên bản `otplib` 13.5.0 và `qrcode` 1.5.4, giấy phép MIT. Cấu hình đang dùng: HMAC-SHA1, 6 chữ số, chu kỳ 30 giây, cửa sổ đúng ±1 bước.
- ADMIN chưa bật TOTP đăng nhập bằng mật khẩu chỉ nhận purpose MFA_SETUP. Trang đăng ký hiển thị QR và secret nhập tay. Secret mới được bật sau khi nhập đúng mã đầu; yêu cầu thiết lập hết hạn sau 5 phút.
- Secret lưu dưới dạng AES-256-GCM: IV ngẫu nhiên 12 byte, tag xác thực 16 byte, AAD gắn phiên bản khóa và User ID. Chép ciphertext sang tài khoản khác hoặc sửa dữ liệu sẽ không giải mã hợp lệ.
- Bảng lưu `lastUsedStep`. Chỉ chấp nhận bước mới hơn bước đã dùng; khóa hàng và cập nhật có điều kiện ngăn hai yêu cầu dùng lại cùng mã.
- Sau xác nhận, ứng dụng sinh đúng 10 recovery code, mỗi mã từ 16 byte ngẫu nhiên. Hiện một lần trong phản hồi xác nhận; DB chỉ giữ SHA-256 gắn User ID. Mã dùng một lần qua cập nhật có điều kiện; không dùng recovery code thay mã TOTP cho step-up quản trị.
- ADMIN đã bật TOTP, sau mật khẩu nhận purpose MFA_VERIFY. TOTP hoặc recovery code đúng mới tạo phiên FULL có `mfa=true` và `mfaVerifiedAt` trong DB.
- Mã sai, hết hạn hoặc đã dùng trả thông báo chung. Bộ đếm theo tài khoản và IP nằm trong MySQL; lần sai thứ 5 đặt khóa 15 phút trong cửa sổ 15 phút. Bộ đếm lỗi được ghi sau transaction xác minh để không bị rollback theo lỗi.

Thành công ở MFA thu hồi phiên cũ và phát phiên mới theo luồng tương ứng. Các phản hồi chứa secret/recovery code không được ghi log, cache, đưa vào URL hoặc ảnh minh họa công khai.

## 4. Kiểm quyền tại service và truy vấn dữ liệu

`can(actor, action, resource)` chỉ chấp nhận hành động đã khai báo. Mọi service mới kiểm policy trước DB, sau đó đọc lại UserSession, trạng thái User, gán vai trò và chính sách MFA hiện tại. Các gán sai loại phạm vi, khoa/bộ môn không còn hoạt động bị loại. Cờ mfa trong đối số không thay thế chứng cứ `mfaVerifiedAt` của phiên lưu trong DB.

List/count/detail lớp dùng một bộ lọc chung: SV qua Enrollment chưa rút, GV qua TeachingAssignment, TBM qua departmentId, TK qua facultyId; ĐBCL/LĐ có phạm vi toàn trường trong chức năng xem lớp tối thiểu. ADMIN đơn vai trò có bộ lọc rỗng về quyền, không được xem lớp. Detail gộp ID và scope ngay trong truy vấn; tài nguyên ngoài phạm vi trả 404.

Các thao tác ghi tài khoản/chính sách được tuần tự hóa qua một hàng khóa quản trị ổn định. Service đọc lại actor sau khi lấy khóa, kiểm không làm mất ADMIN ACTIVE cuối, cập nhật quyền/trạng thái và thu hồi phiên/token đích trong transaction. Tự khóa hoặc tự đổi vai trò bị chặn. Đây là quyết định bảo vệ thao tác quản trị, không tự mở quyền cho người dùng khác.

## 5. CSRF, step-up và kiểm toán

Thao tác ghi kiểm Origin và Host khớp APP_URL cố định. Các thao tác quản trị còn cần header `X-CSRF-Token`: token có chữ ký, gắn User ID và access-session ID, nonce ngẫu nhiên và hạn 15 phút. Token không truyền qua URL, không cấp quyền nếu phiên chưa qua MFA.

Tạo tài khoản, đổi vai trò, sửa chính sách MFA và reset MFA người khác yêu cầu mã TOTP mới qua step-up. Vì mã dùng một lần, không được sử dụng lại mã vừa đăng nhập hoặc mã của thao tác trước trong cùng bước thời gian. Người dùng chờ mã mới từ ứng dụng xác thực khi cần.

Audit ghi actor, thời gian, action, loại/ID đối tượng và tóm tắt theo trường được phép. Service tài khoản không ghi password hash, token, email hay nội dung phiếu. Đầu ra AuditLog có allowlist trường và giá trị; bản ghi cũ chứa trường lạ không được phát lại nguyên payload. Màn audit chỉ ADMIN FULL + MFA được xem và có lọc/phân trang. Việc không thấy bí mật trên màn audit không thay thế kiểm tra mọi điểm ghi log khi thêm module mới.

Lý do reset được kiểm tra nhưng không lưu nguyên văn vào AuditLog: chỉ ghi đã cung cấp lý do, độ dài và dấu vết vận hành được giới hạn. Việc này tránh để người dùng vô tình ghi mật khẩu, email hoặc nội dung phản hồi vào trường lý do; quy trình giải trình vận hành chi tiết cần kênh được quản lý riêng khi triển khai.

## 6. Khóa mã hóa và vận hành

`npm run auth:key` tạo JWT_SECRET và MFA_ENCRYPTION_KEY độc lập, mỗi khóa 32 byte ngẫu nhiên trong `.env` bị Git bỏ qua. Script giữ khóa hợp lệ đã có và không in giá trị. MFA_KEY_VERSION mặc định `v1`; cấu hình sai hoặc khóa JWT trùng khóa MFA bị từ chối.

Mã hiện tại chỉ đọc **một phiên bản khóa MFA đang cấu hình**. Không được chỉ đổi khóa/version rồi mong secret cũ tự giải mã. Khi xoay khóa cần sao lưu có kiểm soát, quy trình giải mã bằng khóa cũ rồi mã hóa lại theo khóa mới, xác minh và phương án khôi phục. Tuần 4 chưa có công cụ tự động chuyển toàn bộ ciphertext nhiều phiên bản. Không tự reset 2FA hàng loạt để thay cho quy trình xoay khóa.

`npm run admin:create` và `npm run admin:reset-2fa` là lệnh máy chủ. Mật khẩu nhập bằng prompt che ký tự; không đưa vào tham số CLI hay lịch sử shell. Reset yêu cầu xác nhận mã ADMIN và lý do; thu hồi phiên/recovery code, vô hiệu secret cũ, buộc đăng ký TOTP lại. Trên web, ADMIN khác có MFA và step-up mới được reset; không tự reset qua phiên cá nhân. Quyền chạy script là quyền truy cập máy chủ/DB riêng, cần quản lý ở môi trường triển khai.

## 7. Bằng chứng và phần còn phải làm

Tại thời điểm soạn: 29/29 test RBAC có policy thuần và DB mock đã qua; ESLint tệp thuộc phạm vi qua. Lượt MySQL đầu tìm được lỗi hai ADMIN khóa chéo do snapshot lập trước mutex; bản sửa dùng locking INSERT làm câu lệnh đầu transaction. Kiểm service song song trên MySQL riêng sau sửa cho một yêu cầu thắng, còn một ADMIN ACTIVE; yêu cầu thua INVALID_SESSION. Chưa lấy số kiểm thử toàn dự án hoặc kết luận CI từ các test này. Lượt HTTP đầy đủ và commit/CI phải được bổ sung vào nghiệm thu Tuần 4 sau khi chạy.

Giới hạn có chủ ý: chưa CRUD danh mục, khảo sát, kết quả, phản hồi, báo cáo nghiệp vụ; tùy chọn đơn vị quản trị tối đa 200 mỗi loại và có `hasMore`; mặc định không tin X-Forwarded-For nên nhiều máy dev dùng chung bucket IP. Khi triển khai qua proxy phải bảo đảm proxy thay header đầu vào trước khi bật tin proxy. TOTP cần đồng hồ máy chủ và thiết bị tương đối đồng bộ, không tự mở rộng cửa sổ để che lỗi đồng hồ.

### Câu hỏi nhóm cần tự giải thích

1. Vì sao mật khẩu đúng nhưng ADMIN vẫn chỉ nhận token tạm?
2. Vì sao secret TOTP phải mã hóa, còn recovery code có thể chỉ lưu hash?
3. Vì sao thu hồi phiên trong DB có tác dụng dù access JWT chưa hết hạn?
4. Vì sao chỉ ẩn menu và chỉ kiểm role trong middleware không đủ chống IDOR?
5. Vì sao ADMIN + GIANG_VIEN chỉ được xem lớp qua gán GIANG_VIEN của mình?

## Nghiệm thu cuối ngày 22/10/2026

Full check **121/121 test trong 13 file**, SQL MySQL **10/10**, CLI stdin **5/5**, HTTP hồi quy Tuần 3 **24/24**, HTTP/MySQL Tuần 4 **28/28** và build exit0. [CI 39733168348](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39733168348) của mã `578fd96622b341b0d94228de83c4c8994449e03b` đã qua check và smoke. Hai ADMIN khóa chéo chỉ một thắng, giữ một ADMIN ACTIVE. UI 13 nhóm/6 viewport qua; [nghiệm thu](NGHIEM_THU_TUAN_04.md).
