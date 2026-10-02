# Giải thích Tuần 1 — bản nháp cho nhóm

Tuần 1 dùng để thống nhất đề tài và tạo nền kỹ thuật. Về nghiệp vụ, website có hai luồng: **khảo sát theo đợt** (phiếu ẩn danh, tổng hợp và công bố) và **phản hồi liên tục** (tiếp nhận, xử lý, trả lời, đánh giá hài lòng). Hai luồng có quyền, trạng thái và thời hạn riêng; không nên gộp chúng thành một form góp ý chung.

Tài liệu `NGHIEP_VU.md` là bản tóm tắt quy trình đề xuất, vai trò và thuật ngữ. `DAC_TA_NGHIEP_VU.md` giữ nguyên đặc tả nguồn để tra cứu các chi tiết và ngoại lệ. `PROGRESS.md` chia công việc theo mã FR để tránh báo tiến độ bằng cảm tính. Mọi quy tắc BR sẽ cần test gắn mã ở tuần triển khai tương ứng.

Mốc kế hoạch bắt đầu **30/09/2026**, nhóm khởi động thực tế **02/10/2026**. Tuần 1 tạm hiểu là **30/09–06/10/2026** nếu tính 7 ngày liên tiếp; lịch chính thức cần đối chiếu với yêu cầu nộp tiến độ. Không ghi phần việc cho 30/09–01/10 khi không có bằng chứng. Khung kỹ thuật đã qua kiểm tra và chạy thử Compose/dev trong [GitHub Actions lần 36957548188](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36957548188). Sau khi người dùng hoàn tất bước DISM và khởi động lại, kiểm tra cục bộ Windows cũng qua `npm run check` (1/1 test), build, HTTP 200 cho ba route, MySQL/Mailpit healthy. Cấu hình Next mới qua test và `AGENTS.md` không bị sửa khi chạy dev. Đây là kết quả tính đến 02/10, chưa phải báo cáo chốt tuần.

## Năm câu hỏi có thể được hỏi khi bảo vệ

1. **Vì sao cần cả khảo sát và phản hồi?** Khảo sát thu ý kiến có cấu trúc theo đợt để tổng hợp; phản hồi là kênh liên tục để giải quyết từng vấn đề và theo dõi kết quả xử lý.
2. **Làm sao vừa biết ai đã làm khảo sát vừa giữ ẩn danh?** Hệ thống lưu trạng thái đã/chưa làm trong nhiệm vụ, còn phiếu trả lời không có liên kết tới người dùng hoặc nhiệm vụ. Hai việc được ghi cùng một transaction để chặn nộp trùng.
3. **Tại sao cần ngưỡng công bố?** Kết quả của lớp quá ít người dễ bị suy đoán và thiếu độ tin cậy; ngưỡng yêu cầu đồng thời số phiếu tối thiểu và tỉ lệ tham gia tối thiểu.
4. **ADMIN có xem được toàn bộ dữ liệu không?** Không. ADMIN quản trị tài khoản và cấu hình, nhưng quyền xem kết quả hay nội dung phản hồi là quyền nghiệp vụ riêng, không tự động đi kèm.
5. **Bắt đầu trễ 2 ngày thì báo cáo ra sao?** Ghi mốc dự kiến và mốc thực tế tách biệt, nêu đúng việc đã làm và bằng chứng, ưu tiên hoàn thành nghiệm thu Tuần 1 trước khi sang tuần khác.

> Sinh viên cần đọc, kiểm chứng và diễn đạt lại bằng lời của mình trước khi dùng khi bảo vệ.
