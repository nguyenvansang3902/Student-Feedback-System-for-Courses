# Giải thích Tuần 6 — mẫu phiếu và phiên bản

Bắt đầu ngày **22/10/2026**, tiếp tục ngày **28/10/2026** sau gián đoạn; mốc Tuần 6 giả định **04–10/11/2026**. Làm sớm theo lệnh người dùng, giữ ngày thực hiện thật. Đây là nháp AI hỗ trợ để nhóm đọc, thử và diễn đạt lại; kết quả chạy thật đối chiếu trong [nghiệm thu](../NGHIEM_THU_TUAN_06.md) và quyết định tại [ADR-007](../decisions/ADR-007-mau-phieu-va-phien-ban.md).

## Mẫu phiếu khác đợt khảo sát như thế nào?

Mẫu phiếu mô tả câu hỏi sẽ hỏi: nhóm tiêu chí, loại câu, thứ tự, trọng số và các cờ bắt buộc/Không áp dụng. Đợt khảo sát dùng một phiên bản mẫu, xác định học kỳ, phạm vi, thời gian và quy trình duyệt. Tuần 6 chỉ làm mẫu phiếu; không tạo workflow đợt hoặc màn hình sinh viên nộp phiếu.

ĐBCL soạn mẫu theo quyền GLOBAL. ADMIN chỉ quản lý hệ thống sẽ không tự có quyền nghiệp vụ này; khi đồng thời có ĐBCL vẫn phải đáp ứng MFA của ADMIN. Máy chủ lấy lại quyền/phiên hiện tại tại service, nên sửa URL hoặc gửi API trực tiếp không cấp thêm quyền.

## Có những loại câu hỏi nào?

| Loại | Cấu hình cần kiểm | Ví dụ dùng |
| --- | --- | --- |
| Likert | Thang 1–4 hoặc 1–5, trọng số | Mức độ rõ ràng khi giảng bài |
| Chọn một | Danh sách lựa chọn có thứ tự | Kênh học liệu dùng nhiều nhất |
| Chọn nhiều | Danh sách lựa chọn có thứ tự | Những hoạt động hỗ trợ học tập |
| Tự luận | Nội dung câu hỏi, bắt buộc/Không áp dụng | Đề xuất cải tiến môn học |
| Có/Không | Hai giá trị rõ ràng | Đề cương có được giới thiệu đầu môn? |

Trọng số nhóm/câu phải là số dương hợp lệ; cấu hình thang chỉ dành cho Likert, lựa chọn chỉ dành cho câu chọn một/nhiều. Cờ bắt buộc và Không áp dụng cần hiện rõ ở preview. Kiểm form preview giúp phát hiện cấu hình chưa phù hợp; tính điểm và nộp phiếu thật vẫn phải kiểm ở các tuần tương ứng.

## Vì sao có cả phiên bản và revision?

Phiên bản là thay đổi nghiệp vụ có ý nghĩa, ví dụ mẫu đánh giá v1 đã dùng và mẫu v2 thay một tiêu chí cho đợt sau. Hai phiên bản có cùng họ mẫu nhưng ID và ID câu hỏi riêng; kết quả cũ vẫn tham chiếu câu hỏi của v1.

Revision giúp phát hiện ghi đè khi hai cửa sổ cùng sửa một bản nháp. Cả hai tải revision 3, cửa sổ A lưu thành 4 thì cửa sổ B không được gửi bản 3 để ghi đè. Máy chủ trả xung đột 409; người dùng tải bản hiện tại và quyết định nội dung cần giữ.

## Khóa mẫu bảo vệ điều gì?

Khi mẫu đã chốt, sửa trực tiếp nội dung sẽ làm lịch sử khó giải thích: câu trả lời cũ được thu theo câu hỏi cũ nhưng màn hình lại hiển thị câu hỏi mới. Khóa là một chiều. Muốn đổi tạo phiên bản mới, nguồn cũ cùng nhóm/câu/lựa chọn và kết quả giữ nguyên.

Tuần 6 có bảo vệ bản khóa và bản đã được đợt duyệt/giai đoạn sau tham chiếu. Workflow người lãnh đạo bấm duyệt đợt thuộc Tuần 7, chưa được nhận đã hiện thực chỉ vì có dữ liệu seed đợt được duyệt. Khi bổ sung workflow phải khóa mẫu trong cùng transaction phê duyệt theo BR-05.

## Nhân bản khác tạo phiên bản mới ở đâu?

Phiên bản mới tiếp tục cùng họ, có số tiếp theo và bản nháp riêng. Nhân bản phục vụ bắt đầu một mẫu độc lập: họ mới, v1, ID nhóm/câu/lựa chọn mới. Cả hai đều không sửa nội dung mẫu nguồn; sao chép một mẫu khóa không mở khóa bản nguồn.

Mẫu mặc định cung cấp điểm bắt đầu bằng tiếng Việt. Seed Tuần 6 bổ sung một họ riêng với hai nhóm, sáu câu, đủ năm loại và cả hai thang Likert; giữ nội dung/ID mẫu ba câu đã khóa của Tuần 5 vì phiếu và kết quả giả đang tham chiếu nó. Dùng mẫu tạo bản nháp độc lập để điều chỉnh theo môn/đơn vị. Đặt một phiên bản đủ điều kiện làm mặc định chỉ đổi lựa chọn khởi đầu trên toàn hệ thống, không sửa nội dung đã dùng. Nếu người vận hành đã chọn mẫu tùy chỉnh, seed lại không tự thay lựa chọn đó; họ tích hợp đã tồn tại thì không reset nội dung. Gắn mẫu vào đợt nháp vẫn triển khai tại Tuần 7.

## Xem trước có lưu câu trả lời không?

Không. Xem trước là kiểm hình thức và thao tác với cấu hình mẫu. Giá trị thử giữ trong bộ nhớ trang và mất khi tải lại; không tạo nhiệm vụ/phiếu/câu trả lời thật, không tính kết quả, không đưa nội dung thử vào AuditLog hoặc localStorage. Nhãn xem trước phải rõ để tránh nhầm với bài khảo sát đang nộp.

## Năm câu hỏi bảo vệ

### 1. Chỉ ẩn nút sửa ở mẫu khóa đã đủ chưa?

Chưa. Người dùng có thể gửi request trực tiếp hoặc giữ trang mở từ trước khi khóa. Service phải đọc lại quyền, trạng thái khóa và tham chiếu đợt trong transaction; cập nhật có điều kiện. UI chỉ giúp người dùng hiểu trạng thái.

### 2. Tại sao tạo phiên bản phải sinh ID câu hỏi mới?

Nếu dùng lại ID, sửa v2 có thể làm câu trả lời v1 trỏ sang nội dung mới. Sao chép cấu trúc với ID mới giữ nguyên đồ thị câu hỏi mà các phiếu/kết quả cũ đang tham chiếu.

### 3. Hai người cùng bấm tạo phiên bản có thể trùng số không?

Lệnh ghi được tuần tự hóa bằng khóa DB trước khi đọc trạng thái; server tính phiên bản tiếp theo và có unique `(familyId, version)` bảo vệ thêm. Lượt HTTP/MySQL thật ngày 28/10 cho hai lệnh tạo phiên bản đồng thời nhận số 2 và 3, cùng họ, ID cây mới, bản khóa nguồn không đổi. Bằng chứng này khác test mock; không suy tính chất khóa/snapshot chỉ từ mock.

### 4. Vì sao phải kiểm loại câu hỏi và cấu hình thừa ở máy chủ?

Trình duyệt không phải nguồn dữ liệu tin cậy. Nếu câu tự luận vẫn gửi lựa chọn hoặc thang Likert sai, dữ liệu lưu có thể mâu thuẫn với cách preview/tính điểm sau này. Máy chủ chặn cấu hình sai và giới hạn kích thước, số lượng, độ dài, trọng số ngay tại biên service.

### 5. Có preview đủ loại câu hỏi thì đã hoàn thành sinh viên làm khảo sát chưa?

Chưa. Preview không tạo phiếu hoặc nhiệm vụ thật. Luồng nộp ẩn danh, chặn nộp trùng, giao dịch PENDING→DONE và kiểm 20 request đồng thời thuộc Tuần 8. Tuần 6 chỉ nghiệm thu FR-30–35 và phần bảo vệ mẫu của BR-05 với bằng chứng thực tế.
