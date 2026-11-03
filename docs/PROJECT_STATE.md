# Trạng thái dự án

- Đề tài khảo sát và phản hồi sinh viên về môn học; 15 tuần từ30/09/2026, khởi động thực tế02/10.
- Tuần hiện tại: Tuần 12 — **chưa nghiệm thu toàn bộ**. Mã chức năng/CI đạt; UC-GOLD kiểm tay còn dang dở.
- Thực hiện03/11/2026 theo lệnh người dùng; mốc kế hoạch giả định16–22/12. Không ghi lùi ngày.
- Nhánh feat/week12-reports-anomalies; main giữ mốc Tuần11 d18565d trong khi chờ kiểm tay.
- UI: **chưa bắt đầu, chờ nghiệm thu tuần 11**. Giữ nguyên UI_NANG_CAP_PROMPT.md; chỉ bật theo BẮT ĐẦU GIAI ĐOẠN UI-n sau15tuần.

## Kết quả và điểm dừng

- Tuần1–11/G1 đã chốt; giữ báo cáo/ảnh/migration lịch sử. Tiến độ nghiệm thu **188/219=85,8%,68/84FR**.
- Tuần12 hiện thực FR-90/91/92/93/94/147/151/158/159: dashboard10vai trò, biểu đồ, CSV/XLSX/PDF, xử lý phản hồi và chỉ số bất thường.
- ADMIN chỉ vận hành; SV chỉ tổng quan cá nhân; Khảo thí gộp đủ mẫu/≥2GV có LIKERT hợp lệ; TT kiểm xung đột trước gộp; che cả tổng có thể suy ngược.
- Cảnh báo từ10phiếu, TT xem xét/khởi tạo hồ sơ; không tự kết luận đúng sai hoặc chặn công bố.
- Nguồn6692854e97088845ce5b263318dfb1f6239fef04, CI41588831428: check/smoke/e2e thành công.
- Linux1285/1285 trong86tệp; Windows1284passed/1skip do quyền tạo symlink; lint/typecheck/schema/design/buildNext16.4.3 qua.
- Tuần12 MySQL13+9 và xuất tệp10=32nhóm; hồi quy Tuần9=12,Tuần10=19,Tuần11=43; SQL16,demo19. E2EChromium3/3.
- Main migration/seed đã áp dụng: runtime45/design47,2model chỉ thiết kế. Hash43bảng/9451bản ghi cũ và seedlặp45bảng/9519bản ghi giữ nguyên lúc15:46 ngày03/11.
- Đã xem12PNG E2E và2PNG kiểm tay; PDF dài5trang cùng mẫu TT1trang đã render/xem.
- Kiểm tay: ĐBCL tạo mẫu/đợt phạm vi khoa, PĐT xác nhậnRS04, LĐ duyệt mở5task; SV1 nộp1phiếu và gửi phản hồi Giảng dạy ẩn danh.
- Công cụ điều khiển Windows dừng vì không xác định URL đủ chắc chắn. Không vượt chặn; helper4phiếuHTTP/đồng hồ giả chưa chạy.
- Còn kiểm tay: đủ mẫu→đóng/tổng hợp/kiểm duyệt/công bố→giải trình/xác nhận→xử lý/đánh giá phản hồi→Khảo thí/Thanh tra→báo cáo/xuất tệp.
- Chưa tick9FR Tuần12. Mục tiêu sau nghiệm thu208/219,77/84FR; kế hoạch210, chênh2điểm FR-145 còn backlog. FR-160 chốt đầy đủ ởTuần13.

## Vận hành và tiếp theo

- Mở Docker Desktop, đợi engine, bấm đúp KHOI_DONG_DU_AN.cmd, đợi Website đã sẵn sàng rồi vào http://localhost:3000; giữ cửa sổ chạy mở.
- Đã mở lại web/scheduler lúc16:04 ngày03/11; HTTP trang chủ/đăng nhập/health đều200 lúc16:08. Health vẫn database:not_checked, không thay bằng chứng MySQL riêng.
- Docker riêng chưa mở máy chủ web; Ctrl+C dừng web/scheduler do cửa sổ mở, không xóa dữ liệu. Không chạy build/generate song song webdev.
- Không đổi mật khẩu/MFA chủ dự án; chuyển TOTP60 cá nhân còn chờ chủ tài khoản. Chỉ dữ liệu giả, không reset hoặc deploy công khai.
- Không placeholder/slogan; trang chung dùng ngữ cảnh trung tính, không xưng bạn. Chưa chứng nhận WCAG/tải1500request/chống DBA hoặc tự tiết lộ.
- Tiếp tục đúng Mục8 UC_GOLD_TUAN_12.md khi công cụ điều khiển hoạt động lại; chưa bắt đầu Tuần13 hoặc UI-n.
- Hồ sơ: NGHIEM_THU_TUAN_12.md,QA_GIAO_DIEN_TUAN_12.md,assets/tuan-12/verification.json,bao-cao-tien-do/tuan-12.md. Nhóm tự điền đóng góp/GVHD/ngày yêu cầu.
