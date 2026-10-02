# Trạng thái dự án

- Đề tài: Website quản lý khảo sát và phản hồi của sinh viên về môn học.
- Kế hoạch: 15 tuần từ 30/09/2026; nếu mỗi tuần 7 ngày, Tuần 1 là 30/09–06/10/2026 (giả định, chờ đối chiếu lịch học).
- Khởi động thực tế: 02/10/2026. Không ghi nhận công việc cho 30/09–01/10.
- Tuần hiện tại: Tuần 1 — đã có bằng chứng nghiệm thu kỹ thuật trên CI; kiểm tra cục bộ Windows còn chờ môi trường.

## Đã thực hiện

- Tạo tài liệu nền theo Mục 14; bốn phần chép nguyên văn đã đối chiếu với nguồn. Có đủ 63 FR, 33 BR, bản nháp nghiệp vụ, Chương 1 và giải thích Tuần 1.
- Dựng Next.js, TypeScript strict, Tailwind, Prisma MySQL chưa có bảng nghiệp vụ, Docker Compose, CI, trang chủ và health check ứng dụng.
- Mã nguồn Tuần 1 đã được đẩy lên [nhánh `feat/week-1` trên GitHub](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/tree/feat/week-1); xem lịch sử Git để kiểm tra các nhánh.
- [CI 36957106844](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36957106844) qua lint, typecheck, 1/1 Vitest và build.
- [CI 36957548188](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36957548188) qua cả `check` và `smoke`: Compose MySQL/Mailpit, `npm run dev`, HTTP trang chủ, `/suc-khoe`, `/api/health`.
- FR-102 được tick sau test và nghiệm thu trên CI; tiến độ từ `docs/PROGRESS.md` là 3/163 điểm, bằng mục tiêu lũy kế Tuần 1 là 3/163 điểm.

## Giới hạn và tồn đọng

- Trên máy Windows, `npm run check` cục bộ vẫn không qua: Windows Application Control chặn Rolldown native; khi thử WASI, resolver lỗi cả với import fixture ở thư mục kế bên. CI Linux vẫn xanh và mã nguồn không đổi; không ghi là kiểm tra cục bộ đã đạt.
- Node.js 24.21.0/npm 11.19.0 và Docker Desktop CLI 29.8.1/Compose 5.5.1 đã cài trên PATH của người dùng; terminal Codex cũ có thể còn PATH trước khi cài.
- WSL 2 vẫn chưa có, Docker Engine cục bộ chưa dùng được. Tải MSI WSL chính thức 2.7.14 bị quyền socket của sandbox chặn; trước đó `wsl --install --no-distribution` gặp `REGDB_E_CLASSNOTREG`.
- Thử mở script quản trị bằng `Start-Process -Verb RunAs` dừng với `0xc0000142` trước khi hiện UAC/chạy script. Chạy DISM bật `VirtualMachinePlatform` với `/norestart` trả Error 740 (cần quyền quản trị). Chưa khởi động lại máy hoặc bật được tính năng Windows.
- Kết quả CI xác minh Compose/dev trong môi trường GitHub Actions, không phải trên máy Windows này.
- Bắt đầu muộn 2 ngày; không cắt P0 hoặc làm trước Tuần 2 để bù tiến độ.

## Quyết định

- Luôn tách mốc kế hoạch 30/09/2026 khỏi ngày thực tế 02/10/2026 trong báo cáo.
- Người dùng đã cho phép cài các thành phần môi trường; các lần thử trên chưa vượt qua bước quyền quản trị Windows. Không ghi WSL 2 hoặc Docker Engine là đã cài xong.
- Theo yêu cầu ngày 02/10/2026, không viết phần quy trình hiện tại tại trường; tài liệu nghiệp vụ chỉ mô tả quy trình đề xuất.
- Chỉ dùng dữ liệu giả, không ghi đóng góp sinh viên thay nhóm; bản nháp AI cần sinh viên rà soát và viết lại.

## Cách chạy và việc tiếp theo

- Xem `README.md` để chạy cục bộ sau khi Docker daemon hoạt động; xem hai link CI ở trên để kiểm tra bằng chứng đã chạy.
- Kiểm tra trạng thái CI của các lần cập nhật tiếp theo và lập báo cáo phiên/tuần từ bằng chứng thật.
