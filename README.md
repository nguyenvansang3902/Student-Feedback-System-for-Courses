# Website quản lý khảo sát và phản hồi sinh viên về môn học

Tiểu luận chuyên ngành HK1 2026–2027. Dự án theo kế hoạch 15 tuần, bắt đầu theo lịch từ **30/09/2026**; nhóm thực tế khởi động vào **02/10/2026**. Mốc thực tế này cần được giữ nguyên trong báo cáo tiến độ.

## Phạm vi hiện tại: Tuần 1

Tuần 1 dựng khung Next.js, TypeScript, Prisma, MySQL, Mailpit, kiểm tra chất lượng và tài liệu nghiệp vụ ban đầu. Chưa có đăng nhập, bảng dữ liệu nghiệp vụ, tài khoản demo hoặc chức năng khảo sát. Nội dung nghiệp vụ trong `docs/` là bản nháp theo đề tài để nhóm đọc, hiểu và viết lại bằng lời của mình. Mã nguồn và lịch sử Tuần 1 có tại [GitHub](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/tree/feat/week-1); kết quả nghiệm thu xem `docs/PROJECT_STATE.md`.

## Môi trường phát triển hiện tại

- Máy người dùng đã cài Node.js **24.21.0**, npm **11.19.0**, Docker Desktop CLI **29.8.1** và Docker Compose **5.5.1** trên PATH của người dùng. Git đã có.
- WSL 2 **chưa có** và Docker Engine cục bộ **chưa hoạt động**, nên Compose, MySQL và Mailpit chưa được xác minh trên máy Windows này. Lệnh `wsl --install --no-distribution` gặp `REGDB_E_CLASSNOTREG`. Thử tải MSI WSL chính thức 2.7.14 bị quyền socket của sandbox chặn. Thử chạy script quản trị bằng `Start-Process -Verb RunAs` dừng với `0xc0000142` trước UAC; DISM bật `VirtualMachinePlatform` với `/norestart` trả Error 740 (cần quyền quản trị). Chưa khởi động lại máy hay bật được tính năng Windows. **Quyền quản trị Windows là điểm chặn tiếp theo** để hoàn tất WSL/Docker; các bản CLI đã cài không có nghĩa Docker Engine chạy được.
- Terminal Codex đã mở trước khi cài có thể còn PATH cũ (thấy Node `v24.19.0` và chưa nhận `npm`/`docker`); mở PowerShell hoặc Codex mới để nhận PATH đã cập nhật, rồi kiểm tra bằng `node --version`, `npm --version`, `docker --version`, `docker compose version` và `docker info`. Lệnh `docker info` chỉ thành công khi daemon chạy.

Việc chạy Compose và trang web đã được xác minh riêng trong [GitHub Actions lần 36957548188](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36957548188). Kết quả này không được ghi là kiểm tra cục bộ Windows đã qua.

Để tiếp tục kiểm tra trên máy Windows, cần thực hiện phần WSL 2/`VirtualMachinePlatform` trong PowerShell có quyền quản trị ngoài sandbox, khởi động lại theo yêu cầu của Windows, rồi mở Docker Desktop và xác nhận `docker info` chạy được. Chỉ sau đó mới chạy các lệnh Compose bên dưới. Không xóa volume hoặc dữ liệu trong quá trình xử lý môi trường.

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

Lệnh `check` chạy lint, kiểm tra kiểu TypeScript và test. [GitHub Actions lần 36957106844](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36957106844) đã chạy qua lint, typecheck, **1/1 Vitest** và build; [lần 36957548188](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36957548188) chạy qua tiếp hai job `check` và `smoke`. Job `smoke` dùng Compose khởi động MySQL/Mailpit, chạy `npm run dev`, rồi kiểm tra HTTP của trang chủ, `/suc-khoe` và `/api/health`. Trên máy Windows hiện tại, `npm run check` bị Windows Application Control chặn Rolldown native. Thử WASI tiếp tục lỗi resolver ngay cả khi import fixture ở thư mục kế bên; lỗi đã được cô lập trong môi trường cục bộ, mã nguồn dự án không đổi và CI Linux vẫn qua. Không xem đây là kết quả chạy cục bộ đạt. Xem `docs/PROJECT_STATE.md` để biết trạng thái phiên gần nhất.

## Prisma và dữ liệu

Tuần 1 chỉ tạo khung Prisma; chưa có migration cho bảng nghiệp vụ. Tài khoản MySQL `survey_dev` do Compose tạo chỉ có quyền trên database `survey_feedback`. Từ Tuần 2, `prisma migrate dev` cần thêm quyền tạo shadow database hoặc một shadow database và tài khoản migration riêng; cấu hình đó sẽ được bổ sung cùng migration đầu tiên. Không tự xóa volume hay chạy lệnh reset khi đang có dữ liệu cần giữ.

## Tài liệu

- `docs/KE_HOACH_15_TUAN.md`: phạm vi và nghiệm thu từng tuần.
- `docs/NGHIEP_VU.md`: bản nháp hiểu nghiệp vụ ở Tuần 1.
- `docs/PROJECT_STATE.md`: trạng thái thực tế và việc tiếp theo.
- `docs/AI_USAGE.md`: nhật ký phần việc do AI hỗ trợ.
