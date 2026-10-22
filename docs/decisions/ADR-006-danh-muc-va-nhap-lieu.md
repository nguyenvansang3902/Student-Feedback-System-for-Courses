# ADR-006 — Danh mục, khóa học kỳ và nhập liệu có chạy thử

- Ngày thực hiện: **22/10/2026**, Asia/Saigon; mốc Tuần 5 giả định **28/10–03/11/2026**. Làm sớm theo lệnh người dùng, không ghi lùi ngày.
- Trạng thái: quyết định hiện thực Tuần 5; bằng chứng kiểm tra cuối phiên đối chiếu trong [nghiệm thu](../NGHIEM_THU_TUAN_05.md).
- Liên quan: FR-20/21/22/101; BR-17/30/34; Mục 8.3, 8.5 và 8.7–8.8 của [đặc tả nguồn](../DAC_TA_NGHIEP_VU.md), [kế hoạch nguồn](../KE_HOACH_15_TUAN.md).

## Bối cảnh

Danh mục là dữ liệu đầu vào cho khảo sát các tuần sau. Import nhiều dòng cần chỉ rõ dòng nào sai, không ghi một phần rồi khiến người vận hành phải đoán phần còn thiếu. Quyền quản lý tài khoản của ADMIN và quyền vận hành danh mục phải được kiểm riêng. Một học kỳ khóa sổ phải giữ dữ liệu lịch sử, kể cả khi người dùng sửa khoa/bộ môn/môn học ở phía trên lớp.

Tuần 5 yêu cầu hoàn thiện seed nhưng đồng thời cấm làm mẫu phiếu và đợt khảo sát. Đặc tả seed toàn hệ thống còn đòi đợt đóng/có kết quả, đợt mở và phản hồi ở nhiều trạng thái. Sau khi được nêu phụ thuộc này, **người dùng đã cho phép rõ ngày 22/10/2026 bổ sung sớm dữ liệu seed khảo sát/phản hồi**. Đây là ngoại lệ được người dùng chấp thuận, không phải tự đổi phạm vi: chỉ vật chất hóa bảng và dữ liệu giả tối thiểu để seed, chưa làm workflow, API hoặc giao diện nghiệp vụ các tuần sau. FR-101 chỉ được tick sau khi đủ seed và kiểm thực tế.

## Phương án đã cân nhắc

1. Nhập trực tiếp từng dòng và bỏ qua dòng lỗi: dễ hiện thực nhưng tạo kết quả một phần, khó đối soát và dễ lặp dữ liệu khi thử lại.
2. Chạy thử trên máy chủ, trả lỗi theo dòng; chỉ cho ghi toàn bộ tệp đã hợp lệ, kiểm lại DB trong transaction: thêm một bước thao tác nhưng kết quả rõ ràng và có thể kiểm tranh chấp.
3. Cho trình duyệt tự xác nhận các dòng hợp lệ: giảm truy vấn nhưng máy chủ không thể tin kết quả do client gửi, cũng không biết học kỳ/quyền đã đổi sau khi xem trước.

## Quyết định

### 1. Quyền và ranh giới dữ liệu

- Chọn phương án 2. `can()` có `catalog:list/read/write` và `imports:manage`, chỉ gán GLOBAL hợp lệ của `CAN_BO_DBCL` được cấp. Đây là quyết định vận hành đã đề xuất trong [ma trận quyền](../PHAN_QUYEN.md); ADMIN đơn vai trò không có quyền danh mục ngầm. ADMIN+ĐBCL vẫn phải đáp ứng MFA của ADMIN.
- Mỗi service kiểm policy trước truy cập DB, rồi kiểm lại phiên/role/chính sách MFA từ DB. ID của danh mục/phân công phải hợp lệ; không dùng ẩn menu làm lớp bảo vệ duy nhất.
- API ghi cần Origin/Host cùng APP_URL và CSRF ký gắn đúng người/phiên. CSRF danh mục có mục đích riêng, không nhận token CSRF quản trị thay thế.
- List/count dùng cùng điều kiện lọc; các danh sách và bộ chọn đều có phân trang/tìm kiếm. DTO không trả passwordHash, token hay dữ liệu bí mật của tài khoản giảng viên.

### 2. Khóa sổ và transaction

- Khóa sổ bắt buộc lý do 10–500 ký tự; cập nhật có điều kiện `lockedAt IS NULL` trong transaction. Không có đường mở khóa. Audit lưu actor/thời điểm/đối tượng, cờ có lý do và độ dài; không phát lại nguyên văn lý do do người dùng nhập.
- Không sửa/xóa học kỳ đã khóa; không tạo, chuyển, sửa, xóa lớp hay phân công trong kỳ khóa. Sửa/xóa khoa, bộ môn, môn học cũng bị chặn nếu tác động tới lớp thuộc bất kỳ kỳ đã khóa nào. Tạo danh mục mới độc lập không làm thay đổi lịch sử.
- Khóa sổ, CRUD, import và đổi quyền dùng chung hàng mutex `ADMIN_MUTATION_LOCK`. Câu lệnh đầu transaction là locking `INSERT ... ON DUPLICATE KEY UPDATE`, tiếp theo `SELECT ... FOR UPDATE`, rồi mới đọc actor/dữ liệu. Giữ bài học REPEATABLE READ từ ADR-005: không dùng ORM upsert rỗng tạo snapshot trước khi chờ khóa.
- Xóa vật lý chỉ thành công khi FK cho phép; đối tượng đang được sử dụng trả 409. Khoa/bộ môn/môn học có `isActive` để ngừng hoạt động khi không ảnh hưởng kỳ đã khóa. Không tự xóa bản ghi phụ thuộc.
- Một lớp có thể có nhiều giảng viên. Tối đa một phân công `isLead=true` là quyết định hiện thực để tránh hai người phụ trách chính; không thêm mã BR giả vào đặc tả nguồn. ID ghép lớp/giảng viên của phân công không đổi khi cập nhật; muốn chuyển phải xóa và tạo lại trong kỳ mở.

### 3. Tệp, chạy thử và xác nhận ghi

- Dùng ExcelJS 4.4.0 theo công nghệ nguồn; nhận CSV UTF-8 hoặc XLSX một sheet với header cố định. Tệp tối đa 2 MiB; tối đa 500 dòng tài khoản hoặc 2.000 dòng lớp/đăng ký. Mẫu tải xuống có header và một dòng minh họa cần thay; mã tham chiếu lớp/đăng ký phải đổi thành mã hiện có trong môi trường đang mở.
- Parser kiểm nội dung phù hợp định dạng, CSV có trích dẫn, header/thứ tự cột, kích thước, mã/email/họ tên, trùng trong tệp; không chạy công thức. XLSX kiểm giới hạn ZIP trước giải nén; từ chối công thức, hyperlink, đối tượng nhúng và cấu trúc không hỗ trợ. [Hướng dẫn import](../HUONG_DAN_IMPORT.md) ghi giới hạn cụ thể.
- Chạy thử chỉ đọc, không tạo tài khoản, AuditLog, batch hay token trong DB. Trả lỗi theo dòng/cột/mã lỗi, số dòng hợp lệ và tối đa 10 dòng mẫu. Tệp có lỗi không được cấp xác nhận ghi.
- Tệp hợp lệ nhận token HMAC sống 15 phút, gắn user/session, loại nhập, SHA-256 của byte tệp và nonce. Xác nhận phải gửi lại đúng nội dung; sửa tệp, đổi phiên, giả chữ ký hoặc quá hạn phải chạy thử lại.
- Khi ghi, giữ mutex, kiểm lại actor, tham chiếu, trùng và học kỳ khóa trên DB hiện tại. Bất kỳ lỗi nào đều rollback toàn bộ bản ghi nhập. Không tin kết quả preview cũ. Nonce được ghi trong AuditLog cùng transaction; gửi lại một lần xác nhận đã thành công trả 409.
- Import chỉ tạo mới sinh viên/giảng viên/lớp/đăng ký, không cập nhật tài khoản có sẵn, khôi phục đăng ký đã rút, đặt lại mật khẩu hoặc cấp ADMIN. Tài khoản mới `PENDING_ACTIVATION`, passwordHash null, buộc tự tạo mật khẩu bằng email kích hoạt.
- Tạo token kích hoạt băm trong transaction, gửi SMTP sau commit với tối đa 5 tác vụ song song. Lỗi gửi thư không rollback dữ liệu đã ghi; phản hồi đếm gửi được/thất bại, thu hồi đúng token gửi lỗi và có audit. Nếu cả SMTP lẫn DB ngắt sau commit, trả thêm số token chưa thu hồi được (`revocationPending`); không trả token ra ngoài, hạn ban đầu vẫn còn hiệu lực. Người dùng yêu cầu lại tại `/kich-hoat`; chưa có outbox hoặc retry nền tự động.

### 4. Demo và giới hạn phạm vi

- `npm run demo` tạo database demo mới có tên ngẫu nhiên/marker, áp dụng migration, seed và chạy cổng riêng. Không DROP/reset DB chính, DB demo cũ hay volume. `--prepare` chỉ chuẩn bị dữ liệu để kiểm; lần chạy demo tiếp theo vẫn tạo DB mới.
- Có `small|medium|large`; medium có 3 khoa, 8 bộ môn, 40 môn, 120 lớp, 60 giảng viên và 1.500 sinh viên giả cùng đăng ký/phân công. Seed giữ mật khẩu/trạng thái/quyền đã đổi của tài khoản có sẵn; trùng mã/email không thuộc dữ liệu demo phải dừng. Demo bị chặn production và host ngoài cục bộ.
- Theo quyền người dùng ngày 22/10, thêm 15 bảng runtime từ blueprint có sẵn để lưu dữ liệu seed: mẫu/nhóm/câu hỏi/lựa chọn; đợt/phạm vi/lịch sử/nhiệm vụ; phiếu/câu trả lời/kết quả tổng hợp; phản hồi/người nhận/tin nhắn/lịch sử. Tổng runtime 31, blueprint 39 giữ nguyên; còn 8 bảng thiết kế tương lai chưa migrate.
- Seed bổ sung đợt đã đóng/có kết quả, đợt đang mở và phản hồi ở sáu trạng thái. Task tách khỏi phiếu/câu trả lời; UUID vùng phiếu ngẫu nhiên, không FK tới user/task, ngày chung theo nhóm và trộn thứ tự ghi độc lập. Kết quả tính từ câu trả lời bằng trọng số, kiểm số phiếu/task/tỉ lệ; seed lại hoặc đổi size giữ nguyên danh sách chốt, UUID và kết quả đã có.
- Không có workflow/UI/API để lập, duyệt, mở, nộp, tổng hợp hoặc xử lý phản hồi. Kiểm dữ liệu và full gate cuối nằm trong nghiệm thu; chỉ tick FR-101 khi bằng chứng thật đủ, không suy từ việc có bảng. Quy tắc của dữ liệu seed không thay thế nghiệm thu luồng nộp ẩn danh thật ở tuần triển khai.

## Hệ quả và kiểm chứng

Mutex toàn cục làm các lệnh ghi nối tiếp, phù hợp quy mô demo; cần đo lại trước khi mở rộng. Gửi email sau commit có thể thành công một phần và cần người dùng yêu cầu lại. Token preview một lần phụ thuộc AuditLog batch; không xóa audit để dùng lại xác nhận cũ. Tệp/import chỉ là dữ liệu giả trong nghiệm thu, không có mật khẩu hay token kích hoạt trong file mẫu/log/ảnh/Git.

Đã kiểm catalog/CSRF/import/seed trong full check 219 test, SQL/MySQL/HTTP thật, giao diện desktop/mobile và build. Seed small/medium tạo mới, tăng medium lên large và lệnh demo chạy web đã được kiểm riêng; chưa có lượt large tạo mới riêng. Kết quả thực tế cùng CI đúng SHA nằm tại [nghiệm thu Tuần 5](../NGHIEM_THU_TUAN_05.md), không suy kết quả mới từ CI Tuần 4.
