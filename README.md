# Website quản lý khảo sát và phản hồi sinh viên về môn học

Tiểu luận chuyên ngành HK1 2026–2027. Dự án theo kế hoạch 15 tuần, bắt đầu theo lịch từ **30/09/2026**; nhóm thực tế khởi động vào **02/10/2026**. Mốc thực tế này cần được giữ nguyên trong báo cáo tiến độ.

## Phạm vi hiện tại: Tuần 1

Tuần 1 dựng khung Next.js, TypeScript, Prisma, MySQL, Mailpit, kiểm tra chất lượng và tài liệu nghiệp vụ ban đầu. Chưa có đăng nhập, bảng dữ liệu nghiệp vụ, tài khoản demo hoặc chức năng khảo sát. Nội dung nghiệp vụ trong `docs/` là bản nháp theo đề tài để nhóm đọc, hiểu và viết lại bằng lời của mình.

## Cần có trên máy

- Node.js **24 LTS** kèm npm; kiểm tra bằng `node --version` và `npm --version`.
- Docker Desktop có Docker Compose; kiểm tra bằng `docker --version` và `docker compose version`.
- Git để theo dõi thay đổi.

Nếu máy Windows chưa có môi trường này:

1. Mở PowerShell với quyền quản trị, chạy `wsl --install` để bật WSL 2, rồi khởi động lại Windows theo hướng dẫn trên màn hình. Nếu máy đã có WSL 2 thì bỏ qua bước này.
2. Cài [Docker Desktop cho Windows](https://docs.docker.com/desktop/setup/install/windows-install/), khởi động ứng dụng và dùng WSL 2 backend. Chờ Docker Desktop báo engine đang chạy, rồi kiểm tra `docker --version` và `docker compose version`.
3. Cài [Node.js 24 LTS bản Windows](https://nodejs.org/en/download) có kèm npm, mở PowerShell mới, rồi kiểm tra `node --version` và `npm --version`.

Trong môi trường Codex khi khởi động dự án ngày 02/10/2026, đã thấy Git và Node `v24.19.0`; `npm`, Docker Desktop và WSL chưa sẵn sàng. Vì vậy việc chạy Compose trên máy này **chưa được xác minh**. Hướng dẫn trên dành cho máy phát triển của nhóm.

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

Lệnh `check` chạy lint, kiểm tra kiểu TypeScript và test. CI GitHub Actions chạy cùng lệnh với một dịch vụ MySQL 8.4 riêng và `npm ci` từ lockfile. Chỉ xem kiểm tra là đạt khi các lệnh kết thúc với mã thoát 0; xem `docs/PROJECT_STATE.md` để biết kết quả chạy thực tế của phiên gần nhất.

## Prisma và dữ liệu

Tuần 1 chỉ tạo khung Prisma; chưa có migration cho bảng nghiệp vụ. Tài khoản MySQL `survey_dev` do Compose tạo chỉ có quyền trên database `survey_feedback`. Từ Tuần 2, `prisma migrate dev` cần thêm quyền tạo shadow database hoặc một shadow database và tài khoản migration riêng; cấu hình đó sẽ được bổ sung cùng migration đầu tiên. Không tự xóa volume hay chạy lệnh reset khi đang có dữ liệu cần giữ.

## Tài liệu

- `docs/KE_HOACH_15_TUAN.md`: phạm vi và nghiệm thu từng tuần.
- `docs/NGHIEP_VU.md`: bản nháp hiểu nghiệp vụ ở Tuần 1.
- `docs/PROJECT_STATE.md`: trạng thái thực tế và việc tiếp theo.
- `docs/AI_USAGE.md`: nhật ký phần việc do AI hỗ trợ.
