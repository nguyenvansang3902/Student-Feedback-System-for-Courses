# Trạng thái dự án

- Đề tài: Website quản lý khảo sát và phản hồi của sinh viên về môn học.
- Kế hoạch: 15 tuần từ 30/09/2026; nếu mỗi tuần 7 ngày, Tuần 1 là 30/09–06/10/2026 (giả định, chờ đối chiếu lịch học).
- Khởi động thực tế: 02/10/2026. Không ghi nhận công việc cho 30/09–01/10.
- Tuần hiện tại: Tuần 1 — nghiệm thu kỹ thuật đã qua trên CI và cục bộ; báo cáo hiện là bản cập nhật đến 02/10/2026, trước mốc kết thúc tuần giả định.

## Đã thực hiện

- Tạo tài liệu nền theo Mục 14; bốn phần chép nguyên văn đã đối chiếu với nguồn. Có đủ 63 FR, 33 BR, bản nháp nghiệp vụ, Chương 1 và giải thích Tuần 1.
- Dựng Next.js, TypeScript strict, Tailwind, Prisma MySQL chưa có bảng nghiệp vụ, Docker Compose, CI, trang chủ và health check ứng dụng.
- Mã nguồn và báo cáo Tuần 1 đã có trên [nhánh `main`](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/tree/main) tại `c26b713`; giữ nguyên lịch sử Git ban đầu, không force push.
- [CI main 36961609369](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36961609369) cho `c26b713` qua lint, typecheck, 1/1 Vitest và build (`check`); trạng thái được đọc lại lúc 20:30 ngày 02/10.
- Cùng lần CI trên qua `smoke`: Compose MySQL/Mailpit, `npm run dev`, HTTP trang chủ, `/suc-khoe`, `/api/health`.
- FR-102 được tick sau test và nghiệm thu trên CI; tiến độ từ `docs/PROGRESS.md` là 3/163 điểm, bằng mục tiêu lũy kế Tuần 1 là 3/163 điểm.
- Người dùng bật thành công hai tính năng Windows cần cho WSL bằng DISM và khởi động lại lúc 10:25 ngày 02/10/2026 (Asia/Saigon); WSL MSI 2.7.14 x64 chính thức có chữ ký Microsoft hợp lệ và SHA-256 đã kiểm tra, cài nâng quyền exit 0.
- `wsl --version` báo 2.7.14.0, kernel 6.18.33.2-2, mặc định WSL 2; Docker Desktop chạy, server 29.8.1 và distro `docker-desktop` Running.
- Sau `npm ci`, Rolldown/SWC/Oxide native nạp được; build đã qua. Kiểm tra lại lúc 20:29 ngày 02/10: `npm run check` exit 0, 1/1 Vitest; trang chủ, `/suc-khoe`, `/api/health` đều HTTP 200; SHA-256 `AGENTS.md` không đổi.
- `docker compose up -d --wait db mailpit` cục bộ exit 0, hai dịch vụ healthy. MySQL 8.4.11 kết nối được (`connection_ok=1`), `utf8mb4`/`utf8mb4_vi_0900_ai_ci`; Mailpit UI tại `http://127.0.0.1:8025` trả HTTP 200 và tiêu đề Mailpit.
- Đăng nhập Docker bằng mã thiết bị qua `docker login` thành công; sau restart lúc 20:37, nhật ký xác nhận tự đăng nhập, Dashboard có tài khoản. Lúc 20:41 db/mailpit healthy, SQL thành công, HTTP ba route và Mailpit 200.

## Giới hạn và tồn đọng

- Tuần 1 chưa đến mốc kết thúc 06/10 theo giả định 7 ngày; báo cáo hiện tại không thay cho bản chốt tuần nếu trường yêu cầu cuối tuần.
- Lúc 10:50 Docker báo thiếu registry key. Đã sao lưu ổ dữ liệu; hai cold start qua shortcut/app ID thành công sau khi bỏ khóa thử, restart lúc 20:37 cũng qua. Nguyên nhân registry ban đầu và việc Chrome không mở callback chưa chứng minh; đã phục hồi đăng nhập bằng mã thiết bị, giữ volume MySQL.
- `/api/health` trả `database: not_checked`: endpoint chỉ kiểm tra ứng dụng ở Tuần 1; kết nối MySQL được thử riêng qua SQL.
- Bắt đầu muộn 2 ngày; không cắt P0 hoặc làm trước Tuần 2 để bù tiến độ.

## Quyết định

- Luôn tách mốc kế hoạch 30/09/2026 khỏi ngày thực tế 02/10/2026 trong báo cáo.
- Người dùng đã cho phép cài các thành phần môi trường; lịch sử các lần thử chưa thành công được giữ trong `docs/AI_USAGE.md`, kết quả sau khi khởi động lại được ghi bằng bằng chứng thực tế.
- Theo yêu cầu ngày 02/10/2026, không viết phần quy trình hiện tại tại trường; tài liệu nghiệp vụ chỉ mô tả quy trình đề xuất.
- Chỉ dùng dữ liệu giả, không ghi đóng góp sinh viên thay nhóm; bản nháp AI cần sinh viên rà soát và viết lại.

## Cách chạy và việc tiếp theo

- Xem `README.md` để chạy cục bộ; trang chủ `http://127.0.0.1:3000`, Mailpit `http://127.0.0.1:8025` đang phản hồi.
- Bản cập nhật tiến độ đến 02/10/2026: `docs/bao-cao-tien-do/tuan-01.md`; chưa thay cho báo cáo chốt cuối Tuần 1.
- Nhóm nghiệm thu trang chủ/trang sức khỏe, đọc và viết lại bản nháp báo cáo; chỉ bắt đầu Tuần 2 khi người dùng ra lệnh.
