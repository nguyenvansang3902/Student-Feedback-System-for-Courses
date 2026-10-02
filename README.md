# Website quản lý khảo sát và phản hồi sinh viên về môn học

Tiểu luận chuyên ngành HK1 2026–2027. Dự án theo kế hoạch 15 tuần, bắt đầu theo lịch từ **30/09/2026**; nhóm thực tế khởi động vào **02/10/2026**. Mốc thực tế này cần được giữ nguyên trong báo cáo tiến độ.

## Phạm vi hiện tại: Tuần 1

Tuần 1 dựng khung Next.js, TypeScript, Prisma, MySQL, Mailpit, kiểm tra chất lượng và tài liệu nghiệp vụ ban đầu. Chưa có đăng nhập, bảng dữ liệu nghiệp vụ, tài khoản demo hoặc chức năng khảo sát. Nội dung nghiệp vụ trong `docs/` là bản nháp theo đề tài để nhóm đọc, hiểu và viết lại bằng lời của mình. Mã nguồn và lịch sử Tuần 1 có tại [GitHub](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/tree/feat/week-1); kết quả nghiệm thu xem `docs/PROJECT_STATE.md`.

## Môi trường phát triển hiện tại

- Máy người dùng đã cài Node.js **24.21.0**, npm **11.19.0**, Docker Desktop CLI/server **29.8.1** và Docker Compose **5.5.1**. Git đã có.
- Ngày 02/10/2026, người dùng đã bật thành công hai tính năng Windows cần cho WSL bằng DISM với quyền quản trị và khởi động lại lúc **10:25** (Asia/Saigon). Bản MSI WSL 2.7.14 x64 chính thức được kiểm tra chữ ký Microsoft hợp lệ và SHA-256 trước khi cài; lệnh cài nâng quyền kết thúc mã 0. `wsl --version` báo **2.7.14.0**, kernel **6.18.33.2-2**, phiên bản mặc định **2**.
- Docker Desktop đang chạy; `docker info` đã nhận server **29.8.1** và distro `docker-desktop` ở trạng thái Running trên WSL 2. `docker compose up -d --wait db mailpit` cục bộ kết thúc mã 0 và hai dịch vụ healthy. Truy vấn MySQL cho thấy phiên bản **8.4.11**, charset `utf8mb4`, collation `utf8mb4_vi_0900_ai_ci`, `connection_ok=1`; giao diện Mailpit tại `http://127.0.0.1:8025` trả HTTP **200** với tiêu đề Mailpit.
- Sau `npm ci` đúng lockfile, các thư viện native Rolldown/SWC/Oxide đã tải và nạp được. `npm run check` cục bộ qua lint, typecheck và **1/1 Vitest**; `npm run build` qua; HTTP trả **200** cho trang chủ, `/suc-khoe`, `/api/health`. API health ở Tuần 1 chỉ kiểm tra tiến trình ứng dụng, không kiểm tra kết nối database.

[GitHub Actions lần 36961330459](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36961330459) đã chạy qua `check` và Compose/dev smoke trên Linux cho mã nguồn `58c33ea`, hiện có trên `main`. Cấu hình Next `agentRules: false` đã được kiểm tra cục bộ bằng `npm run check`, build, HTTP ba route; SHA-256 của `AGENTS.md` trước/sau lần chạy dev giống nhau. Trạng thái Tuần 1 xem `docs/PROJECT_STATE.md`.

## Chạy cục bộ (PowerShell)

Tại thư mục gốc dự án:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d db mailpit
docker compose ps
npm ci
npm run dev
```

Mở [trang chủ](http://localhost:3000), [trang sức khỏe](http://localhost:3000/suc-khoe) và [hộp thư thử Mailpit](http://localhost:8025). Endpoint `http://localhost:3000/api/health` trả về trạng thái tiến trình ứng dụng; ở Tuần 1, nó **chưa xác nhận kết nối cơ sở dữ liệu**. Mailpit chưa được ứng dụng dùng để gửi email ở tuần này.

`.env.example` chỉ chứa mật khẩu **mẫu cho máy phát triển**. Trước lần chạy Compose đầu tiên, có thể đổi `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD` và cập nhật `DATABASE_URL` cho khớp. Khi volume MySQL đã được khởi tạo, đổi `.env` đơn thuần sẽ không đổi mật khẩu trong database. Không dùng các giá trị mẫu cho máy chủ thật, không đưa `.env` vào Git, và không dùng dữ liệu sinh viên thật để thử nghiệm. MySQL, SMTP và giao diện Mailpit trong Compose chỉ được mở tại `127.0.0.1`.

Nếu cổng `3306`, `1025` hoặc `8025` đã được chương trình khác sử dụng, chỉnh cổng phía máy chủ trong `docker-compose.yml` và cập nhật `.env` tương ứng trước khi chạy lại. Dữ liệu MySQL nằm trong volume `mysql_data`; `docker compose down` dừng dịch vụ nhưng giữ volume.

## Kiểm tra chất lượng

Ở terminal khác, tại thư mục gốc dự án:

```powershell
npm run check
```

Lệnh `check` chạy lint, kiểm tra kiểu TypeScript và test. Trên máy Windows sau `npm ci`, lệnh này đã qua với **1/1 Vitest**; `npm run build` cũng qua. [GitHub Actions lần 36957106844](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36957106844) đã qua lint, typecheck, Vitest và build; [lần 36957548188](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36957548188) qua tiếp hai job `check` và `smoke`. Job `smoke` dùng Compose khởi động MySQL/Mailpit, chạy `npm run dev`, rồi kiểm tra HTTP của trang chủ, `/suc-khoe` và `/api/health`. Xem `docs/PROJECT_STATE.md` để biết trạng thái phiên gần nhất.

## Prisma và dữ liệu

Tuần 1 chỉ tạo khung Prisma; chưa có migration cho bảng nghiệp vụ. Tài khoản MySQL `survey_dev` do Compose tạo chỉ có quyền trên database `survey_feedback`. Từ Tuần 2, `prisma migrate dev` cần thêm quyền tạo shadow database hoặc một shadow database và tài khoản migration riêng; cấu hình đó sẽ được bổ sung cùng migration đầu tiên. Không tự xóa volume hay chạy lệnh reset khi đang có dữ liệu cần giữ.

## Tài liệu

- `docs/KE_HOACH_15_TUAN.md`: phạm vi và nghiệm thu từng tuần.
- `docs/NGHIEP_VU.md`: bản nháp hiểu nghiệp vụ ở Tuần 1.
- `docs/PROJECT_STATE.md`: trạng thái thực tế và việc tiếp theo.
- `docs/AI_USAGE.md`: nhật ký phần việc do AI hỗ trợ.
