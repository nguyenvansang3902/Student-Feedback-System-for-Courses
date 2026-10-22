# Giải thích Tuần 3 — tài khoản và phiên đăng nhập

Đây là nháp AI hỗ trợ, sinh viên cần đọc, chạy thử và diễn đạt lại trước khi bảo vệ. Phần việc bắt đầu thực tế 21/10/2026, sau mốc kế hoạch giả định 14–20/10. [Nguyên lý và quyết định](../decisions/ADR-004-xac-thuc.md), [sơ đồ](../SO_DO_XAC_THUC.md), [nghiệm thu](../NGHIEM_THU_TUAN_03.md).

## Web hiện tại dùng để làm gì?

Trang chủ giới thiệu cổng khảo sát và phản hồi môn học. Tuần 3 thêm đăng nhập, kích hoạt, đổi/quên/đặt lại mật khẩu và trang tài khoản có bố cục theo vai trò. Chức năng điền khảo sát, gửi phản hồi, xử lý và báo cáo được làm đúng các tuần sau; các mục “Chưa mở” phản ánh điều đó.

Trang `/suc-khoe` và API `/api/health` dành cho người vận hành kiểm tra ứng dụng đang trả lời, không phải khám sức khỏe sinh viên. Health hiện không kiểm kết nối MySQL; kiểm DB bằng migration/test riêng. Khi xem sản phẩm, bắt đầu ở `/` hoặc `/dang-nhap`.

## Mật khẩu được giữ như thế nào?

DB không giữ mật khẩu rõ; bcrypt biến mật khẩu thành hash một chiều có salt và chi phí tính toán. Ứng dụng dùng cost 12, tối thiểu 10 ký tự, tối đa 72 byte UTF-8 và từ chối một danh sách nhỏ mật khẩu phổ biến. Chữ tiếng Việt có thể chiếm nhiều byte, nên 72 byte khác 72 ký tự. Khi mã tài khoản không tồn tại, hệ thống vẫn thực hiện phép so sánh với hash giả.

Tài khoản demo có mật khẩu cố định công khai chỉ ở dev/demo. Seed bị chặn production; không dùng tài khoản, email hoặc dữ liệu sinh viên thật để thử.

## Access và refresh khác nhau thế nào?

Access giống thẻ ra vào có hạn ngắn, mặc định 15 phút. Refresh giống quyền xin thẻ mới, ngẫu nhiên 256 bit và chỉ lưu hash trong DB. Hai giá trị đều nằm trong cookie httpOnly, không trong localStorage. Mỗi lần refresh đổi sang giá trị mới và thu hồi row cũ. Hệ thống cũng kiểm row phiên và trạng thái User khi dùng access; đăng xuất hoặc khóa tài khoản vì thế có hiệu lực trước lúc JWT hết hạn.

Nếu refresh cũ xuất hiện lại, hệ thống thu hồi cả family. Điều này cũng xảy ra khi hai request dùng cùng refresh đồng thời: một lần có thể trả thành công rồi family bị request còn lại thu hồi. Giao diện tuần tự hóa refresh để tránh tự tạo tình huống đó. Logout thu hồi family hiện tại; đổi mật khẩu/reset thu hồi mọi family của tài khoản.

## Quên mật khẩu và kích hoạt

Người dùng nhập email đã đăng ký, hệ thống trả thông báo chung. Tài khoản phù hợp nhận email trong Mailpit với token một lần: reset 30 phút, kích hoạt 24 giờ. DB chỉ giữ SHA-256 của token; cấp token mới làm token cũ cùng loại hết hiệu lực. Link dùng APP_URL phía máy chủ và fragment; trình duyệt đưa token vào bộ nhớ rồi xóa fragment khỏi history.

Khi hoàn tất, một transaction đồng thời claim token, đổi mật khẩu, thu hồi phiên/token và audit. Nếu token bị dùng lại hoặc tài khoản bị khóa, transaction thất bại. Kích hoạt không mở khóa tài khoản DISABLED. Sau đổi/reset/kích hoạt phải đăng nhập lại.

## Khóa tạm và giới hạn hiện tại

Đăng nhập sai 5 lần trong 15 phút làm tài khoản bị khóa tạm 15 phút. Yêu cầu theo IP cũng được giới hạn. Với cấu hình mặc định không tin proxy header, Next Route Handler chưa có IP socket đáng tin nên các request chung bucket IP `untrusted-client`; giới hạn tài khoản vẫn tách riêng. Đây là hạn chế của môi trường demo, cần proxy đáng tin trước triển khai nhiều người dùng.

Mailpit là hộp thư thử trên máy phát triển. Phản hồi reset có sàn 500–599 ms và giống nhau về nội dung/status cho tài khoản không phù hợp; SMTP có thể chậm hơn nên chưa khẳng định chống hoàn toàn suy luận theo thời gian. Chưa có hàng đợi email bền vững.

## Năm câu hỏi bảo vệ

### 1. Tại sao JWT hết hạn 15 phút mà vẫn cần bảng phiên?

Nếu chỉ kiểm chữ ký và exp, access đã phát vẫn có thể dùng sau logout. Ở đây JWT mang ID phiên; service kiểm row DB còn mở và User ACTIVE. Thu hồi row khiến token cũ bị từ chối ngay. Đổi lại mỗi request xác thực phải truy cập DB.

### 2. Tại sao refresh phải xoay vòng, lưu hash và gắn family?

DB lộ hash không trực tiếp cung cấp raw token. Xoay vòng làm token cũ chỉ được dùng một lần. Family giúp thu hồi toàn chuỗi khi phát hiện replay, kể cả token con vừa được cấp. Khóa row gốc và update có điều kiện bảo vệ khi request đồng thời.

### 3. Hai người bấm cùng link reset có đổi mật khẩu hai lần được không?

Chỉ một transaction claim được token với usedAt=NULL và expiresAt còn hạn. Transaction còn lại không đổi mật khẩu hay ghi audit thành công. Cần integration MySQL thật để chứng minh race/rollback, không chỉ test mock hoặc nhìn schema.

### 4. Có mật khẩu bcrypt và JWT thì ADMIN đã an toàn chưa?

Chưa đủ. ADMIN bắt buộc TOTP ở Tuần 4, và quyền quản trị phải được kiểm tại service. Tuần 3 chưa cấp MFA=true, chưa có seed ADMIN, không mở chức năng quản trị. Có layout theo vai trò chưa thay ma trận quyền/phạm vi chi tiết.

### 5. Tại sao ghi ngày 21–22/10 trong báo cáo Tuần 3?

Tuần là phạm vi công việc theo kế hoạch 15 tuần. Nhóm bắt đầu muộn nên mốc Tuần 3 dự kiến 14–20/10 khác ngày thực hiện. Báo cáo giữ cả hai, chỉ dùng kết quả test/commit/CI đã thực chạy và không tự ghi đóng góp cá nhân của thành viên.

## Nhóm cần tự kiểm

Chạy các bước trong [nghiệm thu](../NGHIEM_THU_TUAN_03.md), giải thích được token nào bị thu hồi khi logout/đổi mật khẩu, xem thư Mailpit, và phân biệt test đơn vị với kết quả MySQL/HTTP. Xác nhận thông tin nhóm/GVHD, đọc và viết lại bản báo cáo; không nhận phần AI viết là phần đã tự làm nếu chưa hiểu.
