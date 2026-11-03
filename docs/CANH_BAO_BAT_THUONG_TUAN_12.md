# Cảnh báo bất thường khảo sát — Tuần 12

FR-158/BR-65 bổ sung bước xem xét chỉ số sau khi đợt đã tổng hợp. Cờ cảnh báo là thông tin cần kiểm tra; không tự kết luận vi phạm, không tự thay đổi trạng thái đợt và không chặn công bố.

## Chỉ số và ngưỡng

Giá trị mặc định: ít nhất 10 phiếu trong lớp, tỉ lệ phiếu đồng nhất từ 70%, hoặc chênh lệch tuyệt đối với học kỳ trước từ 1,5 điểm. Đảm bảo chất lượng có thể thay ngưỡng; số phiếu tối thiểu có sàn 10 để giữ giới hạn bảo vệ mẫu nhỏ.

- Chỉ xét các câu LIKERT của mẫu đã tổng hợp. Câu trống và Không áp dụng không tham gia phép so sánh. Một phiếu cần ít nhất hai câu LIKERT hợp lệ; nếu các giá trị đó bằng nhau thì được tính là phiếu đồng nhất. Mẫu số là toàn bộ số phiếu của lớp, kể cả các phiếu không đủ hai giá trị hợp lệ. Mẫu chỉ có một câu LIKERT không tạo chỉ số đồng nhất.
- So với học kỳ có ngày bắt đầu gần nhất trước kỳ hiện tại. Dữ liệu tham chiếu phải cùng môn và đúng mẫu phiếu, đã công bố hoặc lưu trữ, đủ ngưỡng khi gộp. Dùng phân bố và tổng giá trị gốc, không lấy trung bình các điểm lớp đã làm tròn. Không có dữ liệu tương thích thì chênh lệch là không xác định; không suy thành 0.
- So ngưỡng trước khi làm tròn: đúng 7/10 phiếu đồng nhất đạt 70%; 69,999% không đạt. Chênh lệch 1,49996 chưa đạt 1,5 dù làm tròn hai số có thể hiện 1,50. Giao diện chỉ hiển thị mức chênh tuyệt đối, không nhận điểm hiện tại hoặc điểm kỳ trước.

Mỗi lớp/đợt/luật có tối đa một cờ. Hai luật cùng vượt ngưỡng có thể tạo hai cờ độc lập; mỗi cờ chỉ được mở tối đa một hồ sơ xác minh. Chỉ số và ngưỡng tại lúc tạo được giữ cùng cờ; thay cấu hình không xóa hoặc ghi lại kết quả xem xét trước đó.

## Quyền và xem xét

Thanh tra vào **Cảnh báo bất thường khảo sát**, đọc số phiếu, tỉ lệ tham gia, tỉ lệ đồng nhất và mức chênh lệch; không đọc câu trả lời, tự luận, điểm tuyệt đối hoặc danh tính sinh viên. Giảng viên của lớp, trưởng bộ môn và trưởng khoa liên quan bị loại khỏi danh sách và truy cập theo ID, kể cả khi có thêm gán Thanh tra. Quyền và xung đột được đọc lại trong giao dịch.

Mỗi cờ ở Chờ xem xét nhận một trong ba quyết định, bắt buộc có ghi chú:

| Quyết định | Kết quả |
| --- | --- |
| Bình thường | Lưu quyết định và lịch sử; không sửa dữ liệu khảo sát. |
| Cần lưu ý | Lưu quyết định và gửi thông báo chung tới Đảm bảo chất lượng, không cấp quyền đọc đầy đủ chỉ số hoặc hồ sơ Thanh tra. |
| Chuyển xác minh | Tạo hồ sơ Thanh tra nguồn BAT_THUONG_KHAO_SAT, giao cho cán bộ đang xem xét và bắt đầu ở Tiếp nhận để đi theo máy trạng thái hiện có. |

Mã yêu cầu, revision và hash nội dung bảo vệ thao tác gửi lại hoặc gửi đồng thời. Lịch sử xem xét chỉ thêm qua service. Học kỳ khóa sổ chỉ cho đọc, không cho quyết định mới.

## Hồ sơ không có sinh viên gửi

Hồ sơ bất thường giữ liên kết tới cờ, đợt và lớp, không tạo phản hồi giả và không liên kết tới một phiếu hoặc sinh viên. Thanh tra tiếp nhận, ghi chú/tệp xác minh, lưu kết luận, ghi nhận thông báo và đóng theo quy trình hiện có. Loại này không có nhánh chuyển về phản hồi thường và không yêu cầu tóm tắt gửi sinh viên. Khi kết luận Có căn cứ, chỉ Lãnh đạo phù hợp nhận thông báo chung và xem mức tóm tắt; không gửi thông báo tới toàn bộ danh sách sinh viên.

ADMIN và Đảm bảo chất lượng không đọc hồ sơ mật hoặc chỉ số Thanh tra nhờ quyền quản trị. Thông báo kiểm lại quyền tài nguyên khi hiển thị và ngay trước gửi thư. Tệp nội bộ tiếp tục đi qua route kiểm quyền, kiểm hash và audit của quy trình Thanh tra.

## Điểm tích hợp và kiểm chứng

Tính cờ trong giao dịch tổng hợp sau khi chuyển sang DA_TONG_HOP. Scheduler và lần mở danh sách cảnh báo bảo đảm tính lại theo lô, có cursor và không nhân bản cờ đã có. Chức năng công bố không xét điều kiện phải xử lý hết cờ trước khi công bố.

Các phép kiểm riêng ở `tests/survey-anomaly-*.test.ts`, `tests/survey-anomalies.test.ts` và bộ MySQL `scripts/verify-week12-anomalies.ts` kiểm biên ngưỡng, quyền đa vai trò, cạnh tranh tạo cờ/hồ sơ, mức tiết lộ, nhánh hồ sơ không có người gửi và không chặn công bố. Kết quả chạy thật được ghi tại `.local/week12-anomalies-result.json`; việc có script hoặc có mã nguồn không thay kết quả nghiệm thu, QA trình duyệt và CI phải ghi riêng.

Ẩn danh ở mức ứng dụng; quyền database, nhật ký hạ tầng hoặc nội dung tự nhập có thể làm lộ thông tin. Hệ thống không dùng chỉ số cảnh báo để tự xác định ai đúng sai.
