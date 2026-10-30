# ADR-010: Tổng hợp, công bố có ngưỡng và kiểm duyệt tự luận

- Ngày thực hiện: 30/10/2026 (Asia/Saigon), theo yêu cầu bắt đầu Tuần 9.
- Trạng thái: quyết định hiện thực; bằng chứng kiểm thật ghi riêng tại [nghiệm thu Tuần 9](../NGHIEM_THU_TUAN_09.md).
- Liên quan: FR-47/60–65/150; BR-07/08/09/11/12/13/17/18/57/68; Mục 5.6–5.7; [ADR-003](ADR-003-an-danh.md), [ADR-009](ADR-009-nop-phieu-an-danh.md).

## Quyết định và phạm vi

Tuần 9 hiện thực tổng hợp, công bố, kiểm duyệt, quyền đọc, so sánh và nhắc sinh viên chưa hoàn thành. Không hiện thực phản hồi liên tục, giải trình, dashboard/xuất báo cáo hoặc chỉ số bất thường Thanh tra. Giữ dữ liệu và bằng chứng các tuần trước; seed E8 bổ sung cây dữ liệu mới, không viết lại mẫu/phiếu/kết quả cũ.

## Tính điểm và ảnh chụp

`survey-score.ts` tính câu Likert → nhóm → tổng theo Mục 5.7 bằng phân số nguyên lớn. Không chuẩn hóa thang 1–4 hoặc tự gán điểm cho lựa chọn/Có–Không/TEXT. NA/trống bị loại khỏi số hợp lệ; toàn NA trả điểm `null`. Xếp mức dựa trên giá trị trước làm tròn. `AggregateResult.details` phiên bản 2 lưu mẫu/trọng số, thống kê đủ để gộp lại, cấu hình xếp mức và danh sách giảng viên đóng góp dùng nội bộ. Không lưu ID phiếu/đáp án/sinh viên hoặc nội dung tự luận trong bản gộp.

Gộp theo toàn bộ phiếu, không trung bình các điểm lớp. Chỉ gộp cùng phiên bản mẫu; thiếu dữ liệu tương thích thì trả thông báo rõ. Bản dữ liệu seed lịch sử có cấu trúc cũ không bị ghi lại để ép thành phiên bản mới; đường đọc tương thích phải tính tạm từ dữ liệu hợp lệ hoặc báo không có dữ liệu, không bịa điểm.

Khi cùng mẫu nhưng khác cấu hình xếp mức đã chụp, vẫn tính điểm gộp từ số liệu gốc và trả mức `null`. Không chọn cấu hình theo thứ tự UUID của đợt để gán mức chung.

Ngưỡng xếp mức và từ khóa kiểm duyệt nằm trong `SURVEY_RESULT_SETTINGS`, tách khỏi năm trường cấu hình đợt hiện có. Chỉ ADMIN có MFA mới được ghi, route yêu cầu step-up TOTP; service đọc lại phiên dưới mutex, kiểm CAS timestamp và audit. Cấu hình mới không tự sửa ảnh chụp lịch sử.

## Chuyển trạng thái và tính nguyên tử

ĐBCL tổng hợp `DA_DONG → DA_TONG_HOP`, công bố `DA_TONG_HOP → DA_CONG_BO`. Mỗi lệnh có UUID requestId và expectedRevision. Trong transaction lấy mutex chung trước đọc quyền, đọc lại phiên/grant, kiểm kỳ chưa khóa/trạng thái/revision, thực hiện các ghi rồi CAS đợt, thêm lịch sử và audit. Lỗi bất kỳ phải rollback cả nhóm thay đổi. Retry cùng người/hành động/hash trả trạng thái hiện tại; dùng lại requestId với payload khác bị 409. Client không tự retry POST khi chưa biết kết quả.

Tổng hợp không ghi đè một bản đã tồn tại ngoài requestId được lưu. Công bố kiểm đủ bản gộp của các lớp và không còn TEXT thực sự có nội dung đang chờ duyệt. Trạng thái chờ mặc định của đáp án nonTEXT không chặn công bố. Cho công bố đợt dù có lớp thiếu mẫu; lớp đó tiếp tục bị ẩn. Khi PĐT khóa sổ, các đợt đã công bố chuyển `LUU_TRU` trong cùng giao dịch; mở khóa không tự đưa đợt lưu trữ về trạng thái cũ.

## Phân quyền và ngưỡng

Policy từ chối mặc định. ĐBCL/lãnh đạo đọc kết quả từ DA_TONG_HOP; giảng viên/trưởng đơn vị sau công bố hoặc lưu trữ và đúng lớp/phạm vi. ADMIN/PĐT/sinh viên/Thanh tra không có quyền đọc chỉ nhờ vai trò đó. Quyền của người đa vai trò được hợp từng chức năng, không lấy grant Khảo thí để mở rộng phạm vi kết quả lớp.

Mỗi lớp cần đồng thời đủ số phiếu và tỉ lệ tham gia chính xác. Lớp thiếu mẫu chỉ có trạng thái/số đếm được phép, không điểm hoặc TEXT; hiển thị “Chưa đủ mẫu để công bố”. Dữ liệu gộp cấp đơn vị cũng kiểm ngưỡng. Khảo thí chỉ nhận nhóm `isAssessmentGroup` ở mức môn/bộ môn/khoa sau công bố/lưu trữ, ít nhất hai giảng viên đóng góp và đủ mẫu. DTO không có lớp, giảng viên, TEXT hoặc ID phiếu/đáp án; thiếu điều kiện hiển thị “Chưa đủ dữ liệu gộp”.

## Kiểm duyệt và danh sách chưa hoàn thành

ĐBCL quyết định CHO_KIEM_DUYET → HIEN_THI/DA_AN với lý do bắt buộc. Không thêm moderatorUser hoặc timestamp chính xác vào vùng đáp án. Audit cán bộ/mã đáp án scalar và metadata quyết định không tạo đường nối tới người trả lời. Khi xuất nội dung đã duyệt, trộn thứ tự và bỏ ID đáp án/phiếu/ngày nộp. Dữ liệu TEXT chỉ hiển thị như văn bản.

Danh sách PENDING dùng SurveyTask, không ghép phiếu. ĐBCL/TBM/TK xem theo phạm vi, mọi lần đọc có audit. Thao tác nhắc và scheduler cùng khóa theo đợt–sinh viên–ngày Việt Nam, dùng Notification/EmailOutbox hiện có; không cần một model nối danh tính với phiếu. Worker gửi thư ngoài transaction. Giữ giới hạn SMTP có thể lặp nếu crash sau khi gửi nhưng trước ghi SENT.

## Kiểm và hệ quả

Unit phải kiểm TC-AGG-01, NA/trống/đủ sát ngưỡng/xếp mức trước làm tròn, gộp không trung bình lớp, đa vai trò/phạm vi, TEXT-only, khóa kỳ, requestId/CAS và DTO riêng tư. HTTP/MySQL phải kiểm quyền thật, đồng thời, rollback, kiểm duyệt → công bố, ngưỡng Khảo thí, nhắc/dedup/audit và dữ liệu cũ. Giao diện cần xem desktop/mobile, trạng thái thiếu mẫu/lỗi/trống/quyền và cách diễn đạt.

Mutex giúp thứ tự quyền và nghiệp vụ nhất quán nhưng có thể giới hạn thông lượng. Chưa nhận đạt tải 1.500 request hoặc mọi thiết bị/WCAG từ các kiểm tuần này. Ngưỡng, trộn thứ tự và whitelist DTO không bảo đảm chống DBA/binlog/log hạ tầng hoặc tự tiết lộ danh tính. Xuất CSV/Excel/PDF kết quả vẫn chờ Tuần 12; không nhận 5.6(d) hoàn tất phần xuất khi endpoint chưa tồn tại.
