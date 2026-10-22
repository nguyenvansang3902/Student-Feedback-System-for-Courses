# Trạng thái dự án

- Đề tài: website quản lý khảo sát và phản hồi sinh viên về môn học; kế hoạch 15 tuần từ 30/09/2026.
- Khởi động 02/10; Tuần 2 làm 21/10, Tuần 3 làm 21–22/10. Giữ ngày thực hiện thật.
- Tuần hiện tại: Tuần 4 — phân quyền và TOTP cho ADMIN, nghiệm thu thực tế ngày 22/10/2026.
- Mốc Tuần 4 giả định 21–27/10; nhóm đối chiếu lịch trường. Chưa triển khai Tuần 5.

## Đã nghiệm thu

- Runtime 16/blueprint 39; migration 20261022004129_week4_rbac_mfa đã deploy, diff đồng bộ, giữ dữ liệu cũ.
- can() từ chối mặc định, guard đọc DB, lọc list/count/detail theo gán vai trò/phạm vi; ADMIN không có quyền nghiệp vụ ngầm.
- Quản trị tài khoản chờ kích hoạt, khóa/mở, gán phạm vi, chính sách MFA và AuditLog có lọc/phân trang.
- TOTP 6 số/30 giây/±1 bước, chống dùng lại; AES-256-GCM, 10 mã khôi phục băm dùng một lần.
- Phiên chờ tối đa 5 phút, không refresh; ADMIN cần FULL+mfa, thao tác ghi kiểm Origin/CSRF và TOTP mới khi nhạy cảm.
- admin:create/admin:reset-2fa có audit, không nhận mật khẩu qua argv; CLI thật 5/5 qua.
- Full check 121/121 trong 13 file, lint/typecheck/schema/ERD qua; SQL 10/10 và build exit0.
- HTTP hồi quy Tuần 3 24/24, HTTP/MySQL Tuần 4 28/28 qua, gồm OTP/recovery đồng thời và bảo vệ ADMIN cuối.
- Lỗi snapshot khi khóa chéo đã sửa bằng locking INSERT trước mọi SELECT thường; kiểm MySQL thật chỉ một thắng.
- QA 13 nhóm/6 lượt desktop-mobile qua; sáu PNG đã xem, không chứa bí mật, fixture dọn và seed giữ nguyên.
- ERD khối 4 đổi theo trạng thái phiên: render/xem ảnh và hash mới qua; 3 khối và gallery lịch sử giữ nguyên.
- FR-07/08/10/11/12 và các FR cũ được tick: 34/163 = 20,9%; M1 22/23 = 95,7%, M2 9/9 = 100%.
- Mã 578fd96 có CI 39733168348 check+smoke xanh; CI commit tài liệu cuối đối chiếu đúng SHA trong Actions của main.

## Giới hạn và quyết định

- Chưa CRUD/import danh mục hoặc nghiệp vụ khảo sát/phản hồi; ẩn danh mới 5.6a. Health chỉ kiểm app.
- Một version khóa MFA, chưa chuyển ciphertext tự động; scope options tối đa 200 mỗi loại, có hasMore.
- AUTH_TRUST_PROXY=false dùng bucket IP chung; Mailpit chưa SMTP Internet/outbox.
- Audit production 0; full audit còn 5 high ở dev chain braces→micromatch→fast-glob→ESLint.
- Giữ nguyên 4 file nguồn, không quy trình hiện tại ở trường theo lệnh đã có; chỉ dữ liệu giả, không bí mật trong Git/ảnh/log.
- Không reset volume/DB, force push, deploy công khai hoặc gán đóng góp thay sinh viên.

## Cách chạy và tiếp theo

- Theo README: auth:key, Compose, db:prepare/db:migrate/db:seed, npm run dev; mở http://localhost:3000.
- Tạo ADMIN riêng bằng npm run admin:create; đăng nhập/đăng ký TOTP rồi mở /quan-tri. Giữ khóa và mã khôi phục riêng.
- Nhóm đọc, thử và viết lại nháp; điền đóng góp thật. Dừng đúng Tuần 4, chỉ làm Tuần 5 khi được yêu cầu.
