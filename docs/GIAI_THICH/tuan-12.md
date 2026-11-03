# Giải thích Tuần 12

Ngày viết: 03/11/2026. AI hỗ trợ soạn tài liệu; nhóm cần đọc mã, chạy lại và diễn đạt bằng lời của mình trước khi dùng trong báo cáo hoặc bảo vệ.

Tuần 12 bổ sung dashboard theo vai trò, báo cáo khảo sát và xử lý phản hồi, biểu đồ, so sánh học kỳ, xuất CSV/Excel/PDF và cảnh báo bất thường khảo sát. Phòng Đào tạo có số liệu về độ sẵn sàng dữ liệu và phản hồi tổ chức lớp. Khảo thí xem kết quả nhóm kiểm tra, đánh giá đã công bố và thống kê phản hồi thi. Thanh tra xem thống kê hồ sơ không xung đột lợi ích và các chỉ số cần xác minh.

Máy chủ kiểm lại tài khoản, phiên, vai trò và phạm vi mỗi lần đọc hoặc xuất. Tài khoản nhiều vai trò phải chọn vai trò đang xem báo cáo; quyền của vai trò khác không tự mở rộng phạm vi này. ADMIN chỉ có số liệu quản trị tài khoản/phiên. ĐBCL không đọc hồ sơ Thanh tra; tài khoản có thêm vai trò Thanh tra vẫn chịu các giới hạn kết hợp vai trò và xung đột lợi ích.

Dashboard và ba loại tệp xuất dùng chung dữ liệu đã được giới hạn trường và ẩn ô nhỏ. Không xuất danh tính sinh viên, nội dung phản hồi, câu trả lời hay ghi chú nội bộ Thanh tra. Điểm được gộp từ số đếm và tổng giá trị gốc. Khảo thí cần ít nhất hai giảng viên có đóng góp LIKERT hợp lệ trong nhóm đánh giá; phiếu toàn Không áp dụng hoặc trống không giúp đủ số giảng viên. Nếu tổng cha có thể làm lộ một nhóm con bị ẩn bằng phép trừ, tổng cha cũng bị ẩn.

Cảnh báo khảo sát chỉ nêu dấu hiệu cần xem xét. Mặc định lớp cần ít nhất 10 phiếu; cảnh báo khi tỷ lệ phiếu đồng nhất đạt 70% hoặc chênh lệch tuyệt đối với kỳ trước đạt 1,5 điểm. Dữ liệu so sánh phải cùng môn, cùng mẫu và đủ điều kiện. Thanh tra chỉ nhận chỉ số, không nhận điểm tuyệt đối, câu trả lời hoặc danh tính người nộp. Quyết định chuyển xác minh tạo một hồ sơ riêng, không tạo sinh viên gửi hay phản hồi giả; cảnh báo không tự chặn công bố khảo sát.

Năm câu hỏi có thể dùng khi giải thích:

1. **Tại sao tài khoản có nhiều vai trò vẫn phải chọn một vai trò xem báo cáo?** Để giới hạn dữ liệu theo đúng công việc đang thực hiện; máy chủ không cộng quyền của các vai trò để mở rộng số liệu.
2. **Vì sao đã ẩn lớp ít phiếu mà còn phải ẩn tổng bộ môn hoặc khoa?** Nếu biết tổng và các lớp còn lại, người xem có thể lấy phép trừ để suy ra dữ liệu lớp đã ẩn. Với Khảo thí, quy tắc tương tự bắt đầu từ môn học.
3. **Có hai giảng viên trong dữ liệu là đủ cho Khảo thí chưa?** Chưa. Mỗi giảng viên được tính phải thuộc tập có phiếu và có ít nhất một giá trị LIKERT hợp lệ trong nhóm kiểm tra, đánh giá; vẫn cần đủ ngưỡng mẫu. Nhóm toàn NA, trống hoặc chỉ có tự luận không giúp vượt ngưỡng hai giảng viên.
4. **Cờ bất thường có chứng minh vi phạm không?** Không. Thanh tra xem xét và ghi lý do trước khi kết luận hoặc mở hồ sơ xác minh. Chỉ số đồng nhất/chênh lệch không xác định người viết phiếu hay tự thay quy trình thanh tra chính thức.
5. **E2E đạt 3/3 có nghĩa đã thử tay toàn bộ chức năng chưa?** Không. Đây là ba bài kiểm tự động có kết hợp API và trình duyệt. Việc thử tay đầy đủ, kiểm tổng, build và CI Tuần 12 phải đọc theo kết quả nghiệm thu riêng; tại thời điểm viết, kiểm tổng, build và CI chưa được chốt.

Đối chiếu [công thức và bảo vệ dữ liệu báo cáo](../CONG_THUC_BAO_CAO.md), [cảnh báo bất thường](../CANH_BAO_BAT_THUONG_TUAN_12.md), [ADR-012](../decisions/ADR-012-bao-cao-va-nguong-du-lieu.md), [UC-GOLD](../UC_GOLD_TUAN_12.md), [QA giao diện](../QA_GIAO_DIEN_TUAN_12.md) và [nghiệm thu Tuần 12](../NGHIEM_THU_TUAN_12.md). Các ngưỡng và giới hạn ứng dụng giảm suy ngược trực tiếp; không bảo đảm chống mọi cách kết hợp nhiều lần tải, kiến thức bên ngoài hoặc quyền quản trị hạ tầng.
