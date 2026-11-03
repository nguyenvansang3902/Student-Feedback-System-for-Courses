# Trạng thái dự án

- Đề tài: khảo sát và phản hồi sinh viên về môn học; 15 tuần từ 30/09/2026, khởi động thực tế 02/10.
- Tuần hiện tại: Tuần 12 — bắt đầu 03/11/2026 theo lệnh người dùng; đang triển khai, chưa nghiệm thu.
- Mốc kế hoạch giả định 16–22/12/2026; làm sớm theo lệnh, nhóm đối chiếu lịch trường, không ghi lùi ngày.
- UI: **chưa bắt đầu, chờ nghiệm thu tuần 11**. Prompt giữ nguyên tại UI_NANG_CAP_PROMPT.md; chỉ bật khi có BẮT ĐẦU GIAI ĐOẠN UI-n sau 15 tuần.

## Kết quả

- Tuần1–10/G1 và báo cáo/ảnh/migration lịch sử được giữ; xem NGHIEM_THU_TUAN_10.md.
- Tuần11: FR-66/74/75/80/81/82/152/154/156/157; SLA ngày làm việc, leo thang/nhắc hạn idempotent, chống spam, hài lòng/mở lại.
- Giải trình bắt buộc từ lớp điểm thấp, trưởng bộ môn xem xét; Khảo thí kiến nghị dựa dữ liệu gộp đủ mẫu ≥2GV.
- Thanh tra xác minh/kết luận/thông báo/đóng; ghi chú/tệp nội bộ, chuyển một chiều, xung đột động, LĐ/người chuyển chỉ tóm tắt.
- Thông báo riêng theo quyền, đánh dấu đọc, outbox/SMTP có lease/retry; kiểm lại quyền trước gửi, không sao chép nội dung nhạy cảm.
- Check Windows 1140 passed/1 skipped(1141),76tệp; skip là symlink bị Windows từ chối. Lint/typecheck/schema/design và build Next16.4.3 qua.
- MySQL Tuần11:14+7+12+10=43nhóm sạch fixture; hồi quy HTTP/MySQL Tuần10=19,Tuần9=12; SQL16,demo18.
- Runtime43/design46/3chỉ thiết kế; migration thêm6bảng. Hash37bảng/9399bản ghi main cũ giữ nguyên; seed lặp43bảng/9451bản ghi giữ nguyên.
- UI thật3vai trò/8PNG: GV gửi→TBM xác nhận,thông báo đã đọc,TT ghi chú→kết luận→thông báo; desktop/mobile. Bước chưa thử tay ghi tại QA_GIAO_DIEN_TUAN_11.md.
- Tiến độ188/219=85,8%,68/84FR; kế hoạch190/219,chênh2điểm FR-145. FR-160 đầy đủ ở Tuần13.

## Mở dự án và tiếp theo

- Mở Docker Desktop, đợi engine chạy, bấm đúp KHOI_DONG_DU_AN.cmd, đợi Website đã sẵn sàng rồi vào http://localhost:3000; giữ cửa sổ chạy mở.
- Docker riêng chưa mở máy chủ web; Ctrl+C dừng web/scheduler do cửa sổ mở, không xóa dữ liệu.
- Tài khoản demo theo README; không tự đổi mật khẩu/MFA của chủ dự án hoặc reset dữ liệu. Chuyển TOTP60 riêng còn chờ chủ tài khoản thao tác.
- Người dùng đã cho phép hoàn tất11 rồi làm12: dashboard/báo cáo/xuất file/cảnh báo bất thường/UC-GOLD và E2E; không kích hoạt UI-n.
- Không placeholder/slogan,dùng ngữ cảnh trung tính ở trang chung. Không gọi người dùng là bạn.
- Chỉ dữ liệu giả,không deploy công khai. Chưa chứng nhận WCAG/mọi thiết bị/tải1500request hoặc chống DBA/binlog/tự tiết lộ.
- Xem NGHIEM_THU_TUAN_11.md,assets/tuan-11/verification.json,bao-cao-tien-do/tuan-11.md; sinh viên tự điền đóng góp/GVHD/ngày yêu cầu.

