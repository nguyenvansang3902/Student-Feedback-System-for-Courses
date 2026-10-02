# Trạng thái dự án

- Đề tài: Website quản lý khảo sát và phản hồi của sinh viên về môn học.
- Kế hoạch: 15 tuần từ 30/09/2026; nếu mỗi tuần 7 ngày, Tuần 1 là 30/09–06/10/2026 (giả định, chờ đối chiếu lịch học).
- Khởi động thực tế: 02/10/2026. Không ghi nhận công việc cho 30/09–01/10.
- Tuần hiện tại: Tuần 1 — khởi động và hiểu nghiệp vụ; **chưa nghiệm thu xong**.

## Đã thực hiện

- Tạo tài liệu nền theo Mục 14; bốn phần yêu cầu chép nguyên văn đã đối chiếu với nguồn. Có đủ 63 FR, 33 BR, bản nháp nghiệp vụ, Chương 1 và giải thích Tuần 1.
- Dựng Next.js, TypeScript strict, Tailwind, Prisma MySQL chưa có bảng nghiệp vụ, Docker Compose, CI, trang chủ và health check ứng dụng.
- ESLint, typecheck, `prisma validate`, định dạng YAML và `npm run progress` chạy qua. Tiến độ ghi nhận: 0/163 điểm; mục tiêu lũy kế Tuần 1 là 3/163 điểm.
- Build với Webpack và SWC WebAssembly tạm thời chạy qua; bản build trả HTTP 200 cho `/`, `/suc-khoe`, `/api/health`. API trả `database: not_checked`, `Cache-Control: no-store`.
- Các commit nhỏ đã tạo trên nhánh `feat/week-1`; chưa đưa lên `main` khi cổng nghiệm thu chưa qua.

## Đang thực hiện và tồn đọng

- `npm run check` **chưa đạt**: lint và typecheck qua; Vitest dừng lúc khởi động, chưa chạy test nào. Windows Application Control chặn Rolldown native; thử WebAssembly cũng lỗi.
- Build chuẩn với native SWC cũng bị Windows Application Control chặn. Build tạm bằng WebAssembly xác minh mã nguồn, không thay cho cổng chuẩn.
- Máy hiện không có npm trên PATH, Docker Desktop hoặc WSL; npm CLI tạm được gọi qua pnpm. Chưa thể chạy `docker compose up` và xác minh MySQL/Mailpit ở đây.
- CI GitHub Actions chưa chạy vì chưa có remote. FR-102 vẫn chưa tick trong `PROGRESS.md` do test tự động chưa qua; Tuần 1 chưa được báo hoàn thành.
- Bắt đầu muộn 2 ngày; không cắt P0 hoặc làm trước Tuần 2 để bù tiến độ.

## Quyết định

- Luôn tách mốc kế hoạch 30/09/2026 khỏi ngày thực tế 02/10/2026 trong báo cáo.
- Theo yêu cầu ngày 02/10/2026, không viết phần quy trình hiện tại tại trường; tài liệu nghiệp vụ chỉ mô tả quy trình đề xuất.
- Chỉ dùng dữ liệu giả, không ghi đóng góp sinh viên thay nhóm; bản nháp AI cần sinh viên rà soát và viết lại.

## Cách chạy và việc tiếp theo

- Xem `README.md` để cài Node.js/npm, WSL 2 và Docker Desktop, rồi chạy ứng dụng, Compose và `npm run check`.
- Khi môi trường cho phép: xác minh `docker compose up -d db mailpit`, `npm run check`, trang chủ và trang sức khỏe; ghi log thực tế, cập nhật truy vết/tiến độ rồi mới nghiệm thu Tuần 1.
- Sau khi Tuần 1 đạt cổng kiểm tra, tạo báo cáo tuần từ bằng chứng thật và đưa bản chạy được lên `main`.
