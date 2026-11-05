# ADR-013: Khóa chia sẻ khi nộp phiếu và ngưỡng kiểm thử

Ngày thực hiện: 03–04/11/2026. Phạm vi Tuần 13: NFR-02/03/08/11/16/17, BR-02/03/33/68, FR-160. Không thêm chức năng nghiệp vụ hoặc thay thiết kế ẩn danh.

## Vấn đề

Lượt đo nền trên bản dựng production nhận 196/200 yêu cầu nộp thành công, bốn HTTP 500, p95 12.092,56 ms. Đường nộp đang giữ mutex quản trị độc quyền ở cả bước kiểm lifecycle và bước ghi phiếu, kể cả khi đợt đang mở ổn định. Số đo chưa đủ để quy mọi lỗi 500 cho một nguyên nhân duy nhất; log dịch vụ đã che lỗi ORM để giữ riêng tư.

## Quyết định

Chỉ đường đọc/nộp một nhiệm vụ của chính sinh viên được thử dưới `SELECT ... FOR SHARE` trên hàng guard quản trị ổn định. Đây phải là current read đầu tiên, trước snapshot phiên/quyền. Các lượt này có thể chạy đồng thời; tác vụ thay đổi quyền, chính sách, học kỳ và đợt vẫn dùng khóa độc quyền.

Đường này chỉ tiếp tục nếu đợt đang mở, học kỳ chưa khóa và thời điểm hiện tại trong cửa sổ. Thiếu guard, cần chuyển trạng thái hoặc hết hạn trong lúc đọc mẫu thì kết thúc transaction chia sẻ trước, chạy lifecycle độc quyền rồi kiểm lại phiên/quyền. Không nâng khóa S thành X trong cùng transaction. Danh sách có thể chuyển trạng thái nhiều đợt vẫn dùng đường độc quyền.

CAS task PENDING cùng việc tạo UUID phiếu và đáp án nằm trong một transaction. Không thêm userId, taskId, IP, session hoặc thời điểm chính xác vào phiếu. Mốc hạn được kiểm lại trước CAS; không nhận đã kiểm ở đúng thời điểm commit. Các luồng logout/reset dùng khóa phiên từ trước, không tuyên bố guard này tuyến tính hóa mọi thao tác xác thực.

Route nộp thêm budget mặc định 30 request/user/60 giây, khóa 60 giây khi vượt. Kiểm phiên, quyền, Origin và CSRF trước budget; kiểm budget trước đọc body và service. Khóa bộ đếm là băm theo người dùng và miền hành động, không chứa nội dung phiếu; đổi phiên, task hoặc IP không tạo budget mới.

## Kiểm chứng và hệ quả

- [Tám nhóm MySQL thật](../assets/tuan-13/survey-lock-result.json) kiểm tương thích S/S, S chặn X, phiên/quyền sau thay đổi, hai lời gọi nộp tiến đồng thời, CAS20, rollback và đóng sau hết hạn. Fault injection chỉ ở tiến trình thử, không đổi đồng hồ hệ thống.
- [Báo cáo hiệu năng](../HIEU_NANG_TUAN_13.md) giữ cả số đo nền và số đo sau sửa. Không kéo dài timeout, tăng pool hoặc đổi ngưỡng để làm báo cáo đạt.
- Vitest V8 đo service/policy/auth, loại tệp kiểu và seed; ngưỡng nội bộ statements/branches/functions/lines lần lượt 75/70/75/75%. `npm run check` kiểm cùng ngưỡng; HTTP/MySQL/E2E là bằng chứng riêng.
- [Ma trận kiểm thử](../MA_TRAN_KIEM_THU_TUAN_13.md) gắn chín mã của điều chỉnh số 01 với kiểm ở đúng lớp. Số ô quyền, số test và số request được báo riêng.
- ADMIN có vai trò nghiệp vụ đi kèm vẫn bị từ chối toàn bộ `results:*` theo BR-68; không dùng hợp quyền để mở kết quả. Phạm vi danh mục/lớp ngoài miền kết quả giữ chính sách hiện có.

Khóa chia sẻ làm tác vụ quản trị có thể chờ các transaction nộp đang chạy xong; có budget và giới hạn body để giảm lạm dụng. Đây là tối ưu có phạm vi, chưa là chứng minh tải tối đa của mọi môi trường production.
