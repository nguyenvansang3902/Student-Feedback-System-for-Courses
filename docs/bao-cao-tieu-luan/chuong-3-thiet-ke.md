[CẦN SINH VIÊN ĐỌC VÀ VIẾT LẠI BẰNG LỜI CỦA MÌNH]

# Chương 3. Thiết kế hệ thống — bản nháp Tuần 2

Ngày soạn thực tế **21/10/2026**. Tuần 2 theo giả định mỗi tuần 7 ngày là **07–13/10/2026**. Nội dung trình bày thiết kế toàn hệ thống; chỉ schema người dùng/danh mục được chọn để áp dụng trong tuần. Không mô tả các chức năng xác thực, khảo sát và phản hồi là đã chạy.

## 3.1. Nguyên tắc thiết kế

Hệ thống chọn Next.js full stack với TypeScript strict, Prisma và MySQL 8 theo công nghệ cố định của đề tài. Ứng dụng được chia thành các module nghiệp vụ trong cùng codebase, cùng database, giúp giữ transaction qua nhiệm vụ và phiếu. Module chính gồm auth, danh mục, mẫu phiếu, đợt, nộp khảo sát, kết quả, phản hồi, thông báo và báo cáo. Mỗi module có service chịu trách nhiệm quy tắc, policy kiểm quyền và DTO chỉ trả trường phù hợp.

Quy tắc thiết kế là: logic nghiệp vụ không nằm trong component/route, mọi service nhận actor từ máy chủ, gọi policy trước truy cập dữ liệu và mặc định từ chối. Middleware chỉ kiểm tra thô, không là lớp quyền duy nhất. Mọi ID tài nguyên được kiểm phạm vi; UI ẩn nút không được coi là kiểm quyền. Sơ đồ lớp trách nhiệm và quy ước chi tiết ở [KIEN_TRUC](../KIEN_TRUC.md).

## 3.2. Thiết kế dữ liệu và phân kỳ schema

Theo [ADR-002](../decisions/ADR-002-schema-theo-tuan.md), dự án tách `prisma/schema.prisma` là nguồn migration runtime và `prisma/design.prisma` là blueprint toàn hệ thống. Hai file được validate và đối chiếu DMMF cho nhóm nền; blueprint có output riêng, không dùng để migrate trước các tuần chức năng.

Chín model Tuần 2 là User, RoleAssignment, Faculty, Department, Semester, Course, CourseSection, TeachingAssignment và Enrollment. Khoa có các bộ môn; môn thuộc bộ môn; lớp thuộc môn và học kỳ; phân công/đăng ký nối User với lớp. User có nhiều RoleAssignment theo phạm vi. Unique bảo vệ mã nghiệp vụ, mã lớp trong kỳ, cặp phân công và cặp đăng ký; FK Restrict tránh xóa dây chuyền lịch sử. `passwordHash` nullable phục vụ trạng thái chờ kích hoạt, chưa tạo đăng nhập không mật khẩu.

RoleAssignment dùng scopeKey không NULL với dạng GLOBAL/FACULTY:UUID/DEPARTMENT:UUID và unique `(userId, role, scopeKey)`. Lựa chọn này tránh trường hợp unique trên FK nullable cho phép nhiều NULL trong MySQL. Loại phạm vi và các FK phải nhất quán; quyền gán vai trò và chuẩn hóa scopeKey sẽ do service Tuần 4 kiểm. Kiểm tính đúng vai trò giảng viên/sinh viên trong phân công/đăng ký không thể suy chỉ từ FK User.

Blueprint gồm các nhóm phiên/TOTP/audit, mẫu/câu hỏi, đợt/lớp/nhiệm vụ, hai model phiếu ẩn danh, kết quả/giải trình, phản hồi/tệp/lịch sử/SLA và thông báo/outbox. Chúng được triển khai theo tuần, không phải bảng đã có trong database ứng dụng Tuần 2. ERD từ model/quan hệ và từ điển dữ liệu nằm ở [ERD](../ERD.md), [THIET_KE_CSDL](../THIET_KE_CSDL.md).

## 3.3. Thiết kế ẩn danh khảo sát

SurveyTask lưu sinh viên, đợt, lớp, PENDING/DONE và ngày hoàn thành, để chặn trùng và nhắc nhở. SurveyResponse dùng UUID, campaignId/sectionId scalar và submittedDate kiểu DATE. SurveyAnswer dùng UUID, responseId, questionId scalar, giá trị và kiểm duyệt. Hai model phiếu chỉ có quan hệ với nhau; không liên kết trực tiếp hoặc gián tiếp tới User/SurveyTask.

Các ID đợt/lớp/câu hỏi không có FK trong vùng phiếu vì FK đó sẽ tạo đường gián tiếp qua danh sách nhiệm vụ, đăng ký hoặc người tạo mẫu. Sự đánh đổi là service Tuần 8 phải kiểm metadata thuộc đúng đợt/mẫu khóa/lớp đã chốt, không chỉ tin client. Cập nhật đúng một task PENDING → DONE và chèn phiếu/answers phải nằm trong cùng transaction; lỗi rollback toàn bộ. Unique task ngăn tạo nhiệm vụ trùng, transaction mới bảo đảm nộp một lần khi đồng thời.

Phiếu không có studentId/taskId/IP/User-Agent, session/request ID hoặc timestamp chính xác; không dùng ID tăng dần. Nháp chỉ ở trình duyệt; không có server draft. Xác nhận không trả ID phiếu cùng người nộp. Khi hiển thị/xuất, trộn thứ tự, bỏ thời điểm nộp chính xác. Kiểm duyệt lưu actor cán bộ trong audit scalar; không thêm relation người kiểm duyệt vào Answer. Cấm audit/log nối actor sinh viên với response/answer và không log nội dung phiếu.

Thiết kế là ẩn danh **ở mức ứng dụng**: DBA, binlog, log hạ tầng, thông tin tự nhận diện trong tự luận và nhóm ít sinh viên vẫn có thể bị suy luận. Ngưỡng công bố giúp giảm rủi ro, không chứng minh ẩn danh tuyệt đối. [THIET_KE_AN_DANH](../THIET_KE_AN_DANH.md) và [ADR-003](../decisions/ADR-003-an-danh.md) nêu hợp đồng, rủi ro và bốn kiểm thử 5.6. Tuần 2 chỉ kiểm cấu trúc (a); nộp trùng, 20 request và export (b/c/d) chưa hiện thực.

## 3.4. Thiết kế phân quyền và xác thực

Actor được xây từ phiên máy chủ đã xác minh, gồm người dùng, gán vai trò/phạm vi và trạng thái MFA. Policy tập trung `can(actor, action, resource)`, cùng bộ lọc truy vấn trong phạm vi; mặc định từ chối. ADMIN quản lý hệ thống, không tự có quyền xem kết quả/nội dung phản hồi. Người có nhiều vai trò chỉ dùng quyền từ gán hợp lệ; học kỳ khóa, trạng thái đợt và ngưỡng vẫn là điều kiện bắt buộc.

Tuần 3 dự kiến băm bcrypt cost ≥ 12, mật khẩu tối thiểu 10 ký tự/tối đa 72 byte, chặn danh sách phổ biến và so sánh giả khi tài khoản không tồn tại. JWT access mặc định 15 phút kiểm thuật toán cố định, iss/aud/exp/sub và gắn với trạng thái phiên còn hiệu lực; refresh ngẫu nhiên 256-bit lưu hash, xoay mỗi lần dùng và thu hồi chuỗi phiên khi phát hiện reuse. Token trong cookie httpOnly, Secure production, SameSite=Lax; refresh chỉ path `/api/auth`, không localStorage. Đăng xuất, khóa tài khoản và đổi mật khẩu phải vô hiệu access cũ nhờ kiểm trạng thái phiên/tài khoản phía server, không chỉ chờ exp. Reset token một lần hạn 30 phút; sai 5 lần/15 phút khóa tạm 15 phút, lỗi chung không tiết lộ tài khoản.

Tuần 4 dự kiến TOTP cho ADMIN: 6 chữ số, 30 giây, lệch ±1 bước; secret AES-256-GCM, có keyVersion; đăng ký QR/nhập tay, xác nhận mã đầu; 10 mã khôi phục hiện một lần và lưu hash; chặn dùng lại cùng bước, 5 sai khóa 15 phút. Token tạm chỉ dùng MFA trong 5 phút, ADMIN chưa bật chỉ vào đăng ký; mọi hành động quản trị kiểm ADMIN và mfa=true. Reset bởi admin khác hoặc script máy chủ có audit; thao tác nhạy cảm P1 có step-up. Đây là ràng buộc thiết kế, chưa có mã xác thực trong Tuần 2.

Các thao tác ghi dùng Origin check và CSRF token bổ sung cho quản trị nhạy cảm; Zod kiểm đầu vào server, key lấy env được kiểm khi khởi động. Dữ liệu người dùng được render như văn bản, query tham số hóa. Tệp Tuần 10 theo giới hạn 3 × 5 MB, kiểm đuôi và magic bytes, ngoài public, tải qua route có quyền. Header, OWASP, kiểm phụ thuộc/giấy phép và đo tải được rà soát ở Tuần 13 bằng kết quả thật.

## 3.5. Thiết kế nghiệp vụ đồng thời và tổng hợp

Chuyển trạng thái dùng cập nhật có điều kiện trạng thái cũ trong transaction, kiểm số dòng ảnh hưởng và ghi lịch sử. Các hàm ensure cho mở/đóng/tổng hợp được gọi cả từ scheduler lẫn truy cập sau hạn; unique và outbox idempotency hỗ trợ chạy lại an toàn. Cron không phải điều kiện duy nhất để dữ liệu đúng. Email được xử lý sau commit, không gửi rồi rollback trạng thái.

Tổng hợp Tuần 9 theo Mục 5.7: điểm câu từ các giá trị hợp lệ; điểm nhóm có trọng số câu; điểm tổng có trọng số nhóm; chỉ làm tròn hai chữ số ở cuối. Tỷ lệ là task DONE/tổng task đã chốt. Công bố lớp cần đủ cả minResponses và minRate; giảng viên/trưởng đơn vị cần DA_CONG_BO, ĐBCL/lãnh đạo được xem từ DA_TONG_HOP. Tự luận chưa kiểm duyệt không được hiện cho người nhận kết quả. TC-AGG-01 là kỳ vọng để viết test khi hiện thực, chưa phải hàm tổng hợp đã chạy.

## 3.6. Thiết kế phản hồi và giao diện

Feedback giữ authorId nội bộ để đối thoại/nhắc thông báo; người xử lý xem DTO đã loại định danh nếu isAnonymous=true. Projection phải áp dụng cả tin nhắn, lịch sử, tệp, thông báo và export, không chỉ ẩn tên trên một màn hình. Điều này khác phiếu khảo sát không có quan hệ về User. Routing/SLA/lịch sử bất biến và rating mở lại một lần sẽ triển khai Tuần 10–11.

Wireframe các màn hình chính được trình bày tại [WIREFRAME](../WIREFRAME.md), gắn vai trò, dữ liệu, trạng thái rỗng/lỗi và các hành động. Thiết kế ưu tiên điện thoại cho sinh viên, tiếng Việt và bàn phím. Các màn hình xác thực, danh mục, mẫu, đợt, khảo sát, kết quả, phản hồi, quản trị trong wireframe chỉ là tài liệu; chưa tạo giao diện chức năng Tuần 2.

## 3.7. Migration, vận hành và kiểm chứng

Database phát triển dùng volume giữ dữ liệu; database shadow có tên riêng, cấp quyền trong đúng database, không grant toàn server. Guard từ chối shadow cùng tên database chính kể cả URL khác alias/tài khoản, vì Prisma có thể reset shadow. Không reset/xóa volume để vượt lỗi; mất dữ liệu cần người dùng đồng ý. Blueprint không được dùng migrate/db push. CI dùng migration đã commit trên DB test riêng.

Nghiệm thu Tuần 2 gồm đọc sơ đồ, validate/generate schema, migrate dev không lỗi và test DMMF 5.6a. Kết quả command/SQL/test thật được ghi sau khi chạy trong báo cáo Tuần 2; chương này không ghi trước số test xanh hoặc claim migration thành công. Kiểm thiết kế không thay thế test API, đồng thời, log/export; UC-GOLD/E2E chỉ thực hiện khi đủ chức năng ở Tuần 12. Mọi FR/BR được nối với màn hình/test ở [TRUY_VET](../TRUY_VET.md).

## 3.8. Kết luận thiết kế và việc sinh viên cần hoàn thiện

Thiết kế chọn ranh giới service/policy rõ, schema theo tuần và vùng phiếu tách danh tính. Phần còn lại của đề tài phải tiếp tục hiện thực đúng kế hoạch, bổ sung test BR, kiểm thử bảo mật và báo cáo bằng kết quả thật. Sinh viên cần viết lại chương, kiểm tra sơ đồ/thuật ngữ với GVHD, xác nhận phạm vi và lịch, giải thích được đánh đổi không FK metadata và giới hạn ẩn danh; không sử dụng bản nháp như xác nhận đóng góp cá nhân hoặc kết quả hệ thống đã hoàn tất.
