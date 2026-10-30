# Giải thích Tuần 9 — kết quả, công bố và kiểm duyệt

Thực hiện từ **30/10/2026**, theo yêu cầu của người dùng; không ghi lùi ngày theo lịch kế hoạch. Đây là nháp kỹ thuật do AI hỗ trợ, nhóm cần đọc, thử và trình bày lại bằng lời của mình. Xem [công thức](../CONG_THUC_TONG_HOP.md), [ADR-010](../decisions/ADR-010-tong-hop-cong-bo-va-kiem-duyet.md) và [nghiệm thu](../NGHIEM_THU_TUAN_09.md) để phân biệt thiết kế với bằng chứng chạy thật.

## 1. Vì sao không lấy trung bình điểm các lớp để ra điểm bộ môn?

Lớp đông và lớp ít người có số phiếu khác nhau. Nếu một lớp có một phiếu điểm 5, lớp khác có chín phiếu điểm 1, lấy trung bình hai điểm lớp sẽ ra 3; tính trên mười phiếu phải ra 1,4. Hệ thống vì vậy lưu số đếm, tổng và phân bố gốc, gộp chúng rồi tính lại điểm câu, điểm nhóm và điểm tổng. Các bước tính dùng phân số để tránh làm tròn sớm. Ví dụ TC-AGG-01 cho tổng 37/9, hiển thị 4,11. Câu không có giá trị hợp lệ được bỏ khỏi mẫu số trọng số, không thay bằng 0.

## 2. Có điểm rồi thì vì sao vẫn hiện “Chưa đủ mẫu để công bố”?

Tính được điểm không đồng nghĩa được phép tiết lộ điểm. Một lớp cần đủ cả số phiếu và tỉ lệ nhiệm vụ đã hoàn thành theo ngưỡng của đợt. Tỉ lệ được so sánh trước làm tròn, nên con số hiển thị gần ngưỡng chưa chắc đủ. Khi thiếu mẫu, giao diện lớp không nhận điểm hay góp ý tự luận. Người có quyền vẫn có thể đọc kết quả gộp bộ môn/khoa nếu tập gộp đạt điều kiện. Cả đợt có thể công bố với một số lớp bị ẩn; không phải bắt mọi lớp đều đủ mẫu.

## 3. ADMIN, Khảo thí và giảng viên xem kết quả khác nhau thế nào?

ADMIN quản trị tài khoản/cấu hình, không tự có quyền xem dữ liệu khảo sát. ĐBCL và lãnh đạo đọc từ khi tổng hợp; giảng viên chỉ đọc lớp mình sau công bố, trưởng bộ môn/khoa theo đúng phạm vi được giao. Mọi lần đọc kiểm lại phiên và grant, không chỉ ẩn nút trên giao diện. Khi một người có nhiều vai trò, quyền của từng chức năng vẫn có phạm vi riêng.

Khảo thí chỉ xem nhóm có cờ đánh giá, gộp theo môn/bộ môn/khoa sau công bố và từ ít nhất hai giảng viên khác nhau, đủ mẫu. DTO Khảo thí không có lớp, giảng viên hay tự luận. Quyền Khảo thí không mở rộng tập lớp của một giảng viên đồng thời giữ vai trò này. Kết quả đã công bố vẫn đọc được sau lưu trữ; khóa sổ ngăn ghi mới.

## 4. Kiểm duyệt có làm mất tính ẩn danh của phiếu không?

ĐBCL đọc từng góp ý cùng câu hỏi và trạng thái, không nhận sinh viên, ID phiếu hay giờ nộp. Chỉ góp ý TEXT có nội dung, không phải NA, mới cần duyệt. Chuyển từ chờ sang hiện/ẩn phải có lý do. Audit ghi cán bộ thực hiện và mã đáp án scalar, trạng thái và việc có lý do; không sao chép nội dung hoặc nối đáp án với người nộp. Không thêm quan hệ từ SurveyResponse/SurveyAnswer tới User.

Giảng viên/trưởng đơn vị chỉ nhận góp ý đã được cho hiển thị của lớp đủ mẫu, thứ tự được trộn và không có nhóm theo phiếu. Từ khóa cấu hình chỉ gắn cờ để cán bộ xem xét, không tự kết luận hay tự xóa câu trả lời. Việc kiểm duyệt vẫn không ngăn người viết tự xưng danh tính trong nội dung; đây là giới hạn cần nói rõ khi bảo vệ.

## 5. Nhắc người chưa hoàn thành có cần đọc câu trả lời của họ không?

Không. Danh sách này đọc SurveyTask ở trạng thái PENDING cùng thông tin sinh viên/lớp trong phạm vi được giao, hoàn toàn không dùng SurveyResponse/SurveyAnswer. Mỗi lần xem đều có audit. Nhắc thủ công và scheduler dùng chung khóa theo đợt, sinh viên và ngày Việt Nam để tối đa một lần/ngày, kể cả người đó có nhiều nhiệm vụ trong cùng đợt. Thư được xếp hàng trong transaction, worker gửi sau; không đưa nội dung phiếu vào thông báo.

Các kiểm unit không thay kiểm HTTP/MySQL thật, giao dịch rollback, giao diện hay CI. Mức tải lớn, tệp xuất kết quả và ma trận đầy đủ chức năng tương lai vẫn phải kiểm ở đúng tuần. Nhóm cần đối chiếu trạng thái và số liệu mới nhất trong báo cáo nghiệm thu, không nhận hoàn thành chỉ từ tài liệu này.
