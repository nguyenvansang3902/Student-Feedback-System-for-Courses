# Nghiệm thu kỹ thuật Tuần 11

Thực hiện 02–03/11/2026 theo lệnh người dùng. Tuần kế hoạch giả định 09–15/12/2026 tính từ 30/09; nhóm đối chiếu lịch trường. Nguồn làm việc ở `main`, không chuyển sang nhánh UI. UI: **chưa bắt đầu, chờ nghiệm thu tuần 11**; giữ nguyên prompt để dùng sau 15 tuần và lệnh giai đoạn riêng.

## Chức năng

| FR | Kết quả |
| --- | --- |
| FR-66 / BR-10 | Kết quả lớp dưới ngưỡng sinh yêu cầu giải trình bắt buộc; giảng viên gửi, trưởng bộ môn xác nhận hoặc yêu cầu bổ sung, có nhắc hạn |
| FR-74 / BR-23,54,56,60 | SLA ngày làm việc; cờ quá hạn; leo thang đúng tuyến bằng job idempotent và kiểm khi truy cập; Thanh tra chỉ gửi tóm tắt cho Lãnh đạo |
| FR-75 / BR-25,26 | Hài lòng 1–5 trong 7 ngày, điểm ≤2 mở lại một lần; giới hạn gửi và cảnh báo trùng 24 giờ có cấu hình |
| FR-80/81/82 | Trung tâm thông báo, đọc một/tất cả, email outbox, nhắc hạn; kiểm lại quyền trước khi hiển thị/gửi |
| FR-152 / BR-58 | Khảo thí kiến nghị rà soát dựa trên dữ liệu gộp đủ mẫu của ít nhất hai giảng viên; đúng trưởng bộ môn phản hồi, nhắc hạn |
| FR-154/156 | Hồ sơ xác minh → kết luận → thông báo → đóng, ghi chú/chứng cứ riêng, hai mức danh tính, kết luận đầy đủ chỉ cho Thanh tra |
| FR-157 / BR-64 | Chuyển một chiều phản hồi sang hồ sơ; người chuyển chỉ xem tiến độ/kết luận tóm tắt; chuyển lại không lộ ghi chú nội bộ |

Ghi và kiểm quyền ở service, đọc lại phiên/quyền/phạm vi trong giao dịch, dùng revision/requestId/hash chống thao tác trùng. Các job quét lô dùng con trỏ tránh bỏ đói bản ghi. Đơn vị ngừng hoạt động không được nhận leo thang trái quyền. Hai GET Thanh tra cũng kích hoạt kiểm hạn sau xác thực/kiểm quyền.

## Kiểm tra và dữ liệu

- `npm run check`: **1140 passed, 1 skipped / 1141**, 76 tệp, Windows; phép symlink bị hệ điều hành từ chối được ghi skipped. Lint/typecheck/schema/design qua.
- MySQL Tuần 11: 14 nhóm phản hồi nâng cao, 7 nhóm Thanh tra, 12 nhóm giải trình/kiến nghị, 10 nhóm thông báo/SMTP, tổng **43 nhóm**; chạy tuần tự trên database thử riêng, dọn fixture.
- Hồi quy HTTP/MySQL Tuần 10 **19/19**, Tuần 9 **12/12**; SQL **16/16**; demo **18/18**. Các lượt lỗi/fixture nhiễu trước đó không tính là qua.
- Runtime **43 model**, thiết kế **46**, ba model chỉ thiết kế: SurveyReminder, SurveyAnomalyFlag, ImportBatch. Migration mới thêm sáu bảng, sửa collation trước khi áp dụng.
- Database chính: so sánh hash trên cột và khóa cũ xác nhận **37 bảng, 9.399 bản ghi cũ giữ nguyên** sau migration và seed; seed lặp giữ **43 bảng, 9.451 bản ghi**. Không reset dữ liệu hoặc MFA.
- Bundle giả Tuần 11 thêm một lớp điểm thấp với năm phiếu ẩn danh, một giải trình bắt buộc, một hồ sơ đang xác minh. Seed chỉ bổ sung, không viết lại dữ liệu các tuần cũ.
- [QA giao diện](QA_GIAO_DIEN_TUAN_11.md): ba vai trò, tám ảnh đã xem, desktop/mobile; ghi rõ thao tác chưa thử tay khi kết nối bị gián đoạn.

Bản dựng cuối và CI theo SHA sẽ ghi ở [verification.json](assets/tuan-11/verification.json) sau khi chạy xong; không dùng CI Tuần 10 thay cho mã mới.

## Giới hạn và tài liệu

SMTP có retry/lease và chống hai worker gửi đồng thời; vẫn có cửa sổ gửi lặp nếu SMTP đã nhận nhưng tiến trình dừng trước khi ghi SENT. Ẩn danh ở mức ứng dụng, không chống DBA/binlog/hạ tầng hoặc nội dung tự tiết lộ. Kiểm magic/hash/đuôi/quyền không thay antivirus/CDR. Lịch sử bất biến qua service không có nghĩa DBA không thể sửa. Không chứng nhận WCAG, tải 1.500 request hoặc toàn bộ thiết bị.

Tiến độ chức năng sau nghiệm thu **188/219 = 85,8%, 68/84 FR**; kế hoạch 190/219, chênh hai điểm FR-145 vẫn backlog. FR-160 chỉ hoàn tất toàn bộ ở Tuần 13. Không tự cắt FR-145 hoặc tính model thiết kế thành chức năng.

[Bảng SLA](SLA_TUAN_11.md), [quy trình Thanh tra](QUY_TRINH_THANH_TRA_TUAN_11.md), [nháp chương hiện thực và câu bảo vệ](CHUONG_HIEN_THUC_TUAN_11.md), [báo cáo tuần](bao-cao-tien-do/tuan-11.md). Nhóm sinh viên tự kiểm lại, điền đóng góp và GVHD. Sau khi chốt kiểm tra, tiếp tục Tuần 12 theo lệnh mới; không kích hoạt prompt UI.
