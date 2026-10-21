# ADR-003: Tách nhiệm vụ có danh tính khỏi nội dung phiếu khảo sát

- Trạng thái: chấp nhận thiết kế; hiện thực transaction ở Tuần 8.
- Ngày thực tế: 21/10/2026.
- Liên quan: FR-43/46/50/52/53/54/60/65/92; BR-01/02/03/04/07/09/13/24/30/34, Mục 5.6.

## Bối cảnh

Hệ thống cần biết sinh viên đã làm để chặn nộp trùng và nhắc nhở, nhưng ứng dụng không được ghép người đó với nội dung khảo sát. Kiểm tra 5.6a yêu cầu không có **bất kỳ đường quan hệ Prisma nào**, kể cả gián tiếp, từ SurveyResponse/SurveyAnswer đến User hoặc SurveyTask.

## Phương án

1. FK từ phiếu tới SurveyTask/User rồi ẩn cột trên UI: không đáp ứng 5.6a, dễ lộ qua include/export; loại.
2. Bỏ studentId nhưng nối phiếu → CampaignSection → SurveyTask hoặc phiếu → Question → Template → createdBy(User): vẫn có đường gián tiếp; loại.
3. **Vùng hai model chỉ liên kết Response–Answer; metadata là scalar**: chọn.

## Quyết định

SurveyTask có studentId, campaignId, sectionId, trạng thái và doneDate kiểu DATE; unique bộ ba. SurveyResponse dùng UUID, campaignId/sectionId dạng scalar và submittedDate DATE. SurveyAnswer dùng UUID, responseId FK duy nhất tới SurveyResponse, questionId scalar và các giá trị/trạng thái kiểm duyệt. campaignId/sectionId/questionId không có FK hay relation Prisma ra ngoài vùng này. Không đặt taskId, người tạo, IP, userAgent, request/session ID hoặc timestamp chính xác trên response/answer; không dùng ID tăng dần.

Đây là chủ ý để cắt đồ thị quan hệ, **không phải bỏ kiểm tra metadata**. Service Tuần 8 phải xác minh campaign/lớp đã chốt, task thuộc actor, câu hỏi thuộc đúng mẫu khóa của đợt, loại/giá trị/lựa chọn hợp lệ; cập nhật đúng một task PENDING → DONE và ghi response/answers trong một transaction. Bất kỳ lỗi nào rollback toàn bộ. Kiểm tra trong cùng transaction và áp dụng quy tắc khóa mẫu/phạm vi sau duyệt để tránh TOCTOU. Metadata không hợp lệ bị từ chối, không nhận nhãn/đợt tùy ý từ client.

Audit kiểm duyệt có actor là cán bộ, objectId là answer, lý do và thời điểm; đây là scalar audit theo danh sách cho phép, không relation ngược từ phiếu. Luồng nộp **cấm** log actor sinh viên cùng response/answer ID hoặc nội dung; không tạo bảng ánh xạ trung gian, sự kiện outbox hay correlation ID nối danh tính với phiếu. Thông báo hoàn thành dựa task. DTO xác nhận không trả ID phiếu để ghép với request xác thực.

Nháp chỉ ở localStorage trình duyệt, không server draft; xóa sau nộp/đăng xuất và có cảnh báo thiết bị dùng chung khi hiện thực. Khi xem/xuất, trộn thứ tự và không hiển thị thời điểm chính xác. Phản hồi liên tục (Feedback) **khác** khảo sát: giữ authorId để đối thoại và thông báo, che danh tính bằng DTO với người xử lý khi isAnonymous; không tuyên bố Feedback không liên kết người dùng.

## Hệ quả và giới hạn

- Test DMMF 5.6a phải duyệt đồ thị quan hệ từ cả hai model, không chỉ tìm studentId; kiểm cả cột metadata/timestamp và model ngoài vùng không tạo quan hệ ngược vào phiếu.
- Không có FK metadata nên toàn vẹn phụ thuộc service đã kiểm transaction và test dữ liệu. Chưa hiện thực Tuần 8 thì chưa có bảo đảm runtime; b/c/d chưa được đánh dấu qua.
- Ẩn danh **ở mức ứng dụng**, không bảo đảm chống DBA hoặc người đọc transaction/binlog/hạ tầng. Scalar IDs vẫn cho phép truy vấn thủ công suy luận tập người thuộc lớp; thứ tự request, thời điểm ngoài DB, nội dung tự nhận diện và nhóm nhỏ có thể lộ người viết. Ngưỡng BR-07 và kiểm duyệt giảm rủi ro, không tạo ẩn danh tuyệt đối.
- Khi cần mở rộng schema, giữ vùng hai model biệt lập và chạy lại 5.6a. Thiết kế thay đổi mức bảo vệ phải được người dùng xem xét, không thêm FK để tiện include.

Chi tiết hợp đồng nộp, kiểm thử còn lại và các điểm có thể lộ dữ liệu: [Thiết kế ẩn danh](../THIET_KE_AN_DANH.md).
