# Quy trình Thanh tra — Tuần 11

Ngày thực hiện: **02–03/11/2026**. Phạm vi: FR-154, FR-156, FR-157 và các quy tắc BR-28, BR-60–64. Quy trình ghi nhận tiếp nhận, xác minh và kết luận trong đề tài; không thay thủ tục thanh tra hoặc kỷ luật chính thức của trường.

## Sinh viên gửi và theo dõi hồ sơ

1. Vào **Phản hồi → Gửi phản hồi**, chọn lớp học phần đã đăng ký và loại **Khiếu nại nghiêm trọng**.
2. Chọn loại vi phạm, nhập sự việc và xác nhận đây là khiếu nại chính thức. Mức danh tính mặc định là **Ẩn danh hoàn toàn**; lựa chọn **Cho Thanh tra biết** chỉ cho cán bộ Thanh tra hợp lệ xem danh tính.
3. Mở lại phản hồi đã gửi để theo dõi trạng thái và trao đổi qua kênh của sinh viên. Ghi chú xác minh và tệp nội bộ không hiển thị tại đây.
4. Kết luận và tóm tắt kết quả chỉ được gửi tới sinh viên sau bước **Thông báo**. Khi hồ sơ mới ở **Kết luận**, sinh viên chưa nhận nội dung kết luận.

Thông báo trong ứng dụng và email chỉ nhắc có cập nhật; nội dung hồ sơ và tóm tắt dành cho sinh viên được đọc sau khi hệ thống kiểm quyền tại phản hồi.

## Cán bộ Thanh tra xử lý

Tại **Hồ sơ Thanh tra**, chọn hồ sơ được phép truy cập. Hệ thống loại người có xung đột lợi ích khỏi danh sách và kiểm lại khi mở hồ sơ hoặc tải tệp; việc có thêm vai trò Thanh tra không bỏ qua xung đột.

| Bước | Thao tác |
| --- | --- |
| Tiếp nhận | Có thể giao cho cán bộ Thanh tra không xung đột. Cán bộ được giao chọn **Tiếp nhận và bắt đầu xác minh**. Hồ sơ chưa được giao có thể do cán bộ hợp lệ tiếp nhận và nhận xử lý. |
| Xác minh | Cán bộ được giao thêm ghi chú và chứng cứ nội bộ. Cần ít nhất một ghi chú xác minh trước khi lưu kết luận. Có thể giao lại cho cán bộ hợp lệ trong bước này. |
| Kết luận | Chọn Có căn cứ, Không có căn cứ, Không đủ thông tin hoặc Chuyển đơn vị khác; nhập lý do. |
| Thông báo | Nhập tóm tắt kết quả được phép gửi sinh viên. Nếu kết luận Có căn cứ, Lãnh đạo nhận thông báo và chỉ xem mức tóm tắt. |
| Đóng | Đóng hồ sơ sau khi đã thông báo; phản hồi của sinh viên được đồng bộ sang Đã đóng. |

Chỉ ở bước **Tiếp nhận**, cán bộ được giao có thể **Từ chối tiếp nhận** hoặc **Chuyển về phản hồi thường**; cả hai thao tác cần lý do. Khi chuyển về luồng thường, chọn loại phản hồi để hệ thống xác định đơn vị nhận, đặt lại thời hạn và giữ ẩn danh. Lý do trong hồ sơ mật không được sao chép vào lịch sử phản hồi thường.

Hạn mặc định là **3 ngày làm việc để tiếp nhận, 30 ngày làm việc để hoàn tất**, không tính thứ Bảy và Chủ nhật. Các giá trị được cấu hình tại phần thời hạn xử lý. Quá hạn là cờ hiển thị và cơ sở thông báo; không tạo một trạng thái hồ sơ mới.

## Chuyển từ phản hồi thường sang Thanh tra

Trưởng bộ môn, Trưởng khoa, Đảm bảo chất lượng, Phòng Đào tạo hoặc Phòng Khảo thí có quyền với phản hồi có thể chọn **Chuyển sang Thanh tra**, chọn loại vi phạm và ghi lý do.

Sau khi chuyển, quyền đọc nội dung phản hồi của người xử lý cũ bị thu hồi. Người chuyển theo dõi tại mục **Phản hồi đã chuyển sang Thanh tra** trong trang phản hồi; trang chi tiết tóm tắt có đường dẫn `/phan-hoi/chuyen/<feedbackId>`. Nội dung trả về chỉ gồm tham chiếu hồ sơ, trạng thái và kết luận phân loại, không gồm nội dung phản hồi, danh tính, lý do kết luận, ghi chú hoặc tệp nội bộ. Quyền và phạm vi của người chuyển vẫn được kiểm lại khi đọc tóm tắt.

Lãnh đạo chỉ xem loại, trạng thái và kết luận tóm tắt. ADMIN và Đảm bảo chất lượng không được mở hồ sơ mật. Người chuyển không được dùng đường dẫn hồ sơ Thanh tra để lấy thêm nội dung.

## Chứng cứ nội bộ và kết quả kiểm tra

Mỗi ghi chú nhận tối đa 3 tệp PNG, JPG hoặc PDF, mỗi tệp tối đa 5 MB. Máy chủ kiểm phần mở rộng và chữ ký nội dung, đổi tên lưu thành UUID và giữ tệp ngoài `public`. Liên kết tải không cấp quyền thay cho tài khoản; mỗi lượt tải kiểm hồ sơ, xung đột lợi ích và hash nội dung, đồng thời ghi nhật ký. Tên tệp gốc và khóa lưu trữ không có trong dữ liệu trả về giao diện.

Đã chạy **7 nhóm kiểm tra dịch vụ với MySQL thật** trên database Tuần 11 riêng và dọn sạch fixture của lần chạy. Kết quả có trong `.local/week11-inspection-result.json`: sáu lệnh tiếp nhận đồng thời chỉ tạo một bước xác minh; sáu lệnh chuyển đồng thời chỉ tạo một hồ sơ; quyền đa vai trò, tệp riêng, thông báo đúng mức, chuyển lại và thu hồi phiên đều qua. Bộ **23 phép kiểm tra trong 3 tệp unit** cũng đã qua, gồm đầu vào, quyền, trạng thái, luồng multipart và kết xuất HTML phía máy chủ:

- [Kiểm dịch vụ và quyền](../tests/inspection-workflow.test.ts).
- [Kiểm đọc ghi chú và tệp](../tests/inspection-note-http.test.ts).
- [Kiểm kết xuất biểu mẫu](../tests/inspection-workflow-ui.test.ts).
- [Bộ kiểm MySQL riêng](../scripts/verify-week11-inspection.ts).

Các số liệu trên không có nghĩa đã kiểm thao tác bằng trình duyệt hoặc nghiệm thu giao diện. Kết quả thao tác trình duyệt và CI theo đúng nguồn được ghi tại [QA Tuần 11](QA_GIAO_DIEN_TUAN_11.md) và [nghiệm thu](NGHIEM_THU_TUAN_11.md); không suy kiểm unit thành kiểm trình duyệt. Hai GET Thanh tra đã có thêm 7 kiểm first-access sau xác thực và kiểm quyền.

Ẩn danh được bảo vệ ở mức ứng dụng. Người có quyền hạ tầng, database hoặc nhật ký có thể suy luận; nội dung sinh viên tự nhập cũng có thể tự tiết lộ danh tính. Hệ thống không chứng nhận ẩn danh tuyệt đối trước quản trị viên hạ tầng.

