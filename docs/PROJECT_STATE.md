# Trạng thái dự án

- Đề tài: Website quản lý khảo sát và phản hồi của sinh viên về môn học; kế hoạch 15 tuần từ 30/09/2026.
- Khởi động thực tế: 02/10/2026. Không ghi nhận công việc cho 30/09–01/10.
- Tuần hiện tại: Tuần 2 — phân tích, thiết kế và migration người dùng/danh mục theo lệnh người dùng ngày 21/10/2026.
- Lịch giả định 7 ngày/tuần: Tuần 1 30/09–06/10; Tuần 2 07–13/10/2026. Công việc Tuần 2 thực hiện 21/10, không ghi lùi ngày; chờ nhóm đối chiếu lịch trường.

## Đã thực hiện

- Tuần 1 có khung Next.js/TypeScript/Tailwind/Prisma, Compose MySQL/Mailpit, CI, trang chủ và sức khỏe; FR-102 được nghiệm thu. Lịch sử Docker/WSL và phục hồi đăng nhập ngày 02/10 giữ trong AI_USAGE/báo cáo Tuần 1.
- Tuần 2 có 63 FR và 20 NFR có mã, ma trận 7 vai trò, kiến trúc, ERD, CSDL/ẩn danh, ADR-002/003 và nháp Chương 2–3; 13/13 sơ đồ Mermaid render thành công (`docs/SO_DO_DA_RENDER.md`).
- Có 18 wireframe trong `docs/wireframes/tuan-02.html`; đã kiểm desktop 1440/mobile 390, không tràn ngang hoặc nút nghiệp vụ hoạt động; đây là tài liệu tĩnh, không phải giao diện chức năng.
- Blueprint `prisma/design.prisma` có 39 model; schema áp dụng `prisma/schema.prisma` chỉ có 9 model người dùng/danh mục, output sinh riêng. Không migrate blueprint.
- Migration `20261021160354_week2_users_catalog`: 9 bảng, 11 FK Restrict, 3 CHECK và utf8mb4; migrate dev lần ba đồng bộ, status up-to-date, diff không khác biệt, deploy không có migration chờ; giữ volume cũ.
- Kiểm tích hợp MySQL thật: 10/10 tình huống qua, fixture rollback; kiểm trùng, FK, phạm vi vai trò, ngày kỳ, tín chỉ. Không tạo dữ liệu sinh viên thật.
- `npm run check` sau vá phụ thuộc qua validate/generate/ERD check/lint/typecheck và 14/14 Vitest (13 schema/guard + 1 health); build exit 0.
- Prepare shadow: 6/6 tình huống bảo vệ qua (sai cổng/mật khẩu/Docker override/cùng DB/marker sai server bị chặn; cấu hình hợp lệ chạy lại qua), không grant toàn server.
- HTTP production cổng 3001: trang chủ/sức khỏe/API đều 200, payload health/no-store đúng; Mailpit 8025 HTTP 200. Server 3001 đã dừng sau thử.
- Mã Tuần 2 `723e165` đã qua CI `39634835024`: cả check và smoke thành công, gồm migrate/deploy/diff, MySQL, lint/typecheck/test, build và HTTP dev. Commit `85de07a` bổ sung tài liệu phân tích và SVG.
- Tiến độ FR giữ 3/163 điểm (1,8%), chỉ FR-102 tick; thiết kế/schema không hoàn thành đăng nhập, CRUD hay nộp khảo sát.

## Giới hạn và quyết định

- Chưa có giao diện/service chức năng, đăng nhập, tài khoản demo, policy/MFA chạy thật; không làm trước Tuần 3.
- Ẩn danh ở mức ứng dụng: phiếu chỉ quan hệ Response–Answer, metadata scalar phải được service Tuần 8 xác minh trong transaction; test 5.6b/c/d chưa triển khai.
- Nháp khảo sát chỉ phía trình duyệt khi triển khai; không server draft. Feedback giữ authorId nội bộ và che bằng projection, khác phiếu khảo sát.
- `/api/health` vẫn trả `database: not_checked`; kết nối/ràng buộc MySQL được kiểm riêng, không suy từ health.
- Prisma/client/helper đã vá 7.10.1, Vite 8.3.5; audit production 0, full audit còn 5 high thuộc dev chain braces/micromatch/fast-glob/ESLint, chưa áp dụng force downgrade ESLint; không tuyên bố hết lỗ hổng.
- Không viết quy trình hiện tại ở trường theo yêu cầu người dùng; chỉ quy trình đề xuất. Sinh viên đọc, xác minh và viết lại nháp AI; không ghi đóng góp cá nhân thay nhóm.
- Giữ bốn file chép nguyên văn; chỉ dữ liệu giả; không xóa volume/reset DB, force push, bỏ P0 hoặc deploy công khai.

## Cách chạy và việc tiếp theo

- Xem `README.md`, `docs/NGHIEM_THU_TUAN_02.md`; chạy Compose, `db:prepare`, `db:migrate`, `test:integration`, `check`; xem đồ thị và wireframe tĩnh.
- Báo cáo `docs/bao-cao-tien-do/tuan-02.md` đủ 9 phần và bằng chứng local/CI; nhóm tự điền thông tin và đóng góp, đọc/viết lại nháp.
- Đã đạt nghiệm thu kỹ thuật Tuần 2; nhóm duyệt bản thiết kế. Bước tiếp theo là Tuần 3 khi người dùng yêu cầu.
