# ADR-012: Báo cáo theo vai trò và ngưỡng bảo vệ dữ liệu

Ngày thực hiện: 03/11/2026. Phạm vi: Tuần 12, FR-90/91/94/147/151/159 và phần dữ liệu dùng để xuất FR-92/93. Công thức chi tiết ở [Công thức báo cáo](../CONG_THUC_BAO_CAO.md).

## Quyết định

Dashboard, biểu đồ và các định dạng xuất dùng chung `ReportsDashboard`. Service tạo DTO bằng danh sách trường cho phép, không trả nguyên model hoặc kết quả `include` chứa người gửi. DTO không có ID, tên, tài khoản, email sinh viên, nội dung phản hồi, ghi chú Thanh tra, danh tính người xử lý, câu trả lời hoặc thời điểm nộp phiếu. Nhãn bộ lọc lấy từ danh mục đã kiểm quyền; mã kỹ thuật của dòng và bộ lọc không phải cột xuất.

Đầu vào chọn một vai trò đang được gán hợp lệ. Không dùng quyền toàn trường của một vai trò để mở rộng phạm vi của vai trò đang được chọn. Mọi lần đọc/xuất kiểm lại phiên và gán quyền hiện tại trong transaction giữ cùng mutex với thay đổi phân quyền. Điều kiện phạm vi và điều kiện bộ lọc được ghép bằng AND; mã ngoài phạm vi trả lỗi không tìm thấy. ADMIN, kể cả ghép vai trò khác, chỉ có dashboard tài khoản/phiên đăng nhập. Đảm bảo chất lượng ghép Thanh tra không được chọn báo cáo hồ sơ mật. Xung đột Thanh tra từ giảng viên, bộ môn và khoa được loại ở truy vấn trước khi đếm hoặc gộp.

Sinh viên chỉ nhận số nhiệm vụ và phản hồi của chính tài khoản. Giảng viên xem các lớp đang được phân công; trưởng bộ môn/khoa xem đơn vị đang được phân quyền và còn hoạt động. Điểm khảo sát của các vai trò này chỉ lấy sau công bố/lưu trữ. Đảm bảo chất lượng và Lãnh đạo xem từ tổng hợp. Phòng Đào tạo có độ sẵn sàng đợt và phản hồi tổ chức lớp; Phòng Khảo thí có điểm nhóm đánh giá gộp cùng phản hồi thi cuối kỳ. Thanh tra chỉ có thống kê hồ sơ thuộc phạm vi không xung đột; Lãnh đạo có số liệu tóm tắt khi được phép đọc mức tóm tắt, không có nội dung hồ sơ.

Kết quả khảo sát được cộng từ ảnh chụp thống kê đủ cấu trúc bằng `poolSurveyScores`. Không lấy trung bình của điểm lớp đã làm tròn. Khảo thí chỉ tính nhóm có cờ `isAssessmentGroup`; ít nhất hai giảng viên phải thực sự có câu LIKERT hợp lệ trong các nhóm này. Lớp của giảng viên chỉ có giá trị NA không giúp đạt ngưỡng hai giảng viên. Cùng helper kiểm đóng góp được dùng ở báo cáo và các luồng đọc kết quả/kiến nghị.

Ngưỡng lớp/mẫu tham gia vẫn thuộc từng đợt. Ngưỡng báo cáo phản hồi/hồ sơ được lưu riêng trong `REPORT_SETTINGS`, mặc định 5, cho phép cấu hình từ 2 đến 1000. Chỉ Đảm bảo chất lượng được đọc/đổi ngưỡng báo cáo; cấu hình dùng revision, requestId, mã băm dữ liệu và audit. Không sửa ngưỡng công bố của các đợt khi đổi ngưỡng báo cáo.

Không chỉ ẩn ô nhỏ rồi giữ tổng. Với khảo sát thường, khả năng hiển thị truyền từ lớp lên bộ môn rồi khoa; với Khảo thí, truyền từ môn lên bộ môn rồi khoa. Một nhóm con bị ẩn hoặc có ảnh chụp thiếu/sai thì tổng cha cũng bị ẩn. Với phản hồi/hồ sơ, ô trạng thái, quá hạn hoặc kết luận có số lượng dương dưới ngưỡng làm cả hàng bị ẩn; tổng học kỳ không hiện nếu có nhóm lá bị ẩn. Các trung bình/tỷ lệ còn kiểm riêng kích thước mẫu của chính chỉ số, không dùng tổng hồ sơ lớn để che việc chỉ có một đánh giá hài lòng.

Mỗi lần chuẩn bị xuất ghi `REPORT_EXPORTED` trước khi trả DTO cho renderer. Audit chỉ ghi vai trò, định dạng và nhóm báo cáo, không ghi dữ liệu, nội dung hoặc danh tính nằm trong báo cáo. CSV/XLSX/PDF cùng nhận DTO đã bảo vệ; không có đường xuất riêng đọc lại bảng thô hoặc danh sách sinh viên chưa hoàn thành.

## Độ sẵn sàng dữ liệu

`readCampaignReadiness` có thể đọc roster để kiểm nội bộ, nhưng service chỉ chiếu số lớp, số lớp có lỗi, số lỗi/cảnh báo và trạng thái đủ điều kiện. Không trả `cohort`, cặp sinh viên/lớp, hồ sơ sinh viên, email, số sinh viên lỗi từng lớp hoặc mã băm roster. Các chỉ số này phục vụ Phòng Đào tạo quản lý dữ liệu; không phải kết quả trả lời khảo sát. Khi lọc đơn vị, đợt có lớp giao với đơn vị được chọn vẫn được kiểm trên toàn bộ phạm vi đợt, tránh ghi nhầm đợt đủ điều kiện khi chỉ một phần dữ liệu hợp lệ.

## Giới hạn và cách đọc số liệu

- Phản hồi không liên kết với phiếu khảo sát ẩn danh. Bộ lọc đợt dùng học kỳ của đợt cho thống kê phản hồi liên tục; không xác định ai đã trả lời phiếu nào.
- Thời gian xử lý là số ngày lịch từ lúc tạo đến lúc đóng, gồm cả cuối tuần. Đây là chỉ số thời gian thực tế, khác SLA ngày làm việc.
- Tỷ lệ đang quá hạn dùng hồ sơ còn mở làm mẫu số. Tỷ lệ trả lời/hoàn tất trễ dùng những bản ghi có mốc hoàn tất tương ứng. Mẫu số bằng 0 hoặc thiếu mẫu trả `null`, không ghi 0%.
- Phản hồi mở lại có thể thay mốc trả lời/hạn hiện tại. Báo cáo ghi rõ lần trả lời gần nhất, không nhận đó là thống kê toàn bộ mọi chu kỳ trong quá khứ. Không dùng cờ `isOverdue` hiện tại để khẳng định một phản hồi đã đóng từng trễ hạn.
- Các bảng gộp bộ môn/khoa chỉ đại diện cho tập lớp thuộc phạm vi đang được xem và bộ lọc đã áp dụng; không tự mở rộng thành toàn trường. So sánh điểm giữa các ảnh chụp mẫu không tương thích không được gộp thành một điểm chung.
- Việc ẩn ngưỡng và tổng cha bảo vệ các suy ngược trực tiếp trong DTO. Đây không phải cam kết chống mọi cách kết hợp nhiều lần tải, kiến thức bên ngoài, người quản trị hạ tầng hoặc nội dung do người dùng tự tiết lộ.

## Kiểm chứng

Các phép kiểm nằm tại [reports-policy](../../tests/reports-policy.test.ts), [reports-metrics](../../tests/reports-metrics.test.ts), [reports-services](../../tests/reports-services.test.ts) và [kiểm MySQL báo cáo](../../scripts/verify-week12-reports.ts). Kiểm MySQL dùng marker/database Tuần 12 riêng, tạo canary tên/tài khoản/email và nội dung riêng tư, gọi service xuất thật cho Phòng Đào tạo/Khảo thí/Thanh tra, rồi dọn đúng fixture. Kết quả cuối cùng lấy từ lần chạy nghiệm thu thực tế; ADR không thay thế kiểm UI, đọc file xuất hoặc chứng nhận toàn bộ hệ thống.
