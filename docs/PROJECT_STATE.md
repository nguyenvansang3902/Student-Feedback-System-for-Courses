# Trạng thái dự án

- Đề tài: Website quản lý khảo sát và phản hồi sinh viên về môn học; kế hoạch 15 tuần từ 30/09/2026.
- Khởi động thực tế: 02/10/2026; Tuần 2 làm 21/10, không ghi lùi ngày.
- Tuần hiện tại: Tuần 3 — xác thực bcrypt/JWT, thực hiện 21–22/10/2026 theo lệnh người dùng; chưa triển khai Tuần 4.
- Mốc Tuần 3 giả định: 14–20/10; thực hiện muộn 21–22/10, nhóm đối chiếu lịch trường.

## Đã nghiệm thu kỹ thuật

- Tuần 1 có khung Next.js/TypeScript/Tailwind/Prisma, Compose MySQL/Mailpit, CI và FR-102; lịch sử Docker/WSL ở AI_USAGE.
- Tuần 2 có 63 FR/20 NFR, ma trận 7 vai trò, sơ đồ/ERD, 18 wireframe tĩnh, nháp Chương 2–3 và 9 bảng nền.
- Tuần 3 có login/logout, đổi mật khẩu/mật khẩu tạm, kích hoạt/reset Mailpit và layout tài khoản theo vai trò.
- Bcryptjs cost 12, JWT 15 phút, refresh 32 byte lưu hash/rotation/reuse/family revoke, cookie httpOnly; policy trước dữ liệu.
- AuthToken mặc định reset 30 phút/activation 24 giờ, CAS + mật khẩu/session/audit cùng transaction; không mở khóa DISABLED.
- Runtime 13/blueprint 39; thêm UserSession/AuthToken/RateLimitBucket/AuditLog; migration 20261021165346_week3_auth_sessions giữ 9 bảng/volume cũ.
- Migration lỗi 3780 do collation đã xử lý trên 4 bảng mới rỗng/FK, resolve applied; status/diff đồng bộ, CI clean deploy qua.
- Lượt cuối check 61/61 (core 27/recovery 18/schema 13/limits 2/health 1), lint/typecheck/ERD và build qua; SQL nền 10/10, fixture rollback.
- HTTP/MySQL/Mailpit 24/24 qua: reset đồng thời chỉ một lần thắng, refresh replay, logout/revoke, expiry và disabled. Refresh race đồng thời mới unit mock.
- QA 10 lượt route/viewport, keyboard/login/logout và browser reset E2E qua; 3 sơ đồ render và 6/6 hash nguồn/SVG khớp.
- FR-01–06 và FR-102 đạt nghiệm thu: 20/163 = 12,3%; M1 17/23 = 73,9%; chưa tick FR tuần sau.
- Mã 43b937e qua CI 39642730208 cả check/smoke: https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39642730208.
- CI đầu ed7ed60 lỗi test auth trước generate; 43b937e thêm prehook db:seed/test:auth/build tự generate Prisma và chạy lại qua.

## Giới hạn và quyết định

- Chưa TOTP/MFA, ADMIN seed/quản trị, quyền chi tiết, CRUD/import hoặc nộp khảo sát/phản hồi; đúng phạm vi các tuần sau.
- JWT kiểm DB session/User; rotation vô hiệu access cha, replay thu hồi family; logout family, đổi/reset thu hồi mọi phiên.
- Origin/URL/host khớp APP_URL mặc định http://localhost:3000; Secure production, refresh path /api/auth, không localStorage.
- Env kiểm ngay khi server khởi động; limits Zod cấu hình mặc định trong .env.example; AUTH_TRUST_PROXY=false dùng IP tổng untrusted-client.
- Email APP_URL cố định/fragment, Mailpit; sàn 500–599 ms chưa chống hoàn toàn timing SMTP, chưa có outbox bền vững.
- Seed 4 tài khoản giả dev theo README, chặn production/không reset tài khoản đã thử; JWT key 32 byte riêng, không commit .env.
- Audit production 0/full 5 high dev chain; ẩn danh mới 5.6a, chưa 5.6b/c/d; health database: not_checked.
- Giữ 4 file nguồn, không dữ liệu thật/xóa volume/reset/forcepush/deploy công khai hoặc ghi đóng góp thay sinh viên.

## Tiếp theo

- Tuần 3 đạt nghiệm thu mã; CI 43b937e xanh. Tài liệu cuối đi cùng mã, đối chiếu CI đúng SHA trong lịch sử Actions của main.
- Chạy theo README: auth:key, Compose, db:prepare/db:migrate/db:seed, npm run dev; mở http://localhost:3000.
- Nhóm đọc/viết lại nháp, xác nhận lịch/đóng góp; dừng đúng Tuần 3, Tuần 4 chỉ tiếp tục khi được yêu cầu.
