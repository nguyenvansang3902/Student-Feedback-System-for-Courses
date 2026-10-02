# AGENTS.md: Website quản lý khảo sát và phản hồi SV (Next.js + MySQL)

## Mục tiêu

Tiểu luận chuyên ngành HK1 2026-2027, 15 tuần, nhóm tối đa 3 sinh viên, GVHD chấm. Trọng tâm: NGHIỆP VỤ rõ ràng, bảo mật (bcrypt, JWT, 2FA cho ADMIN, phân quyền), tiến độ báo cáo trung thực mỗi tuần.

## Đầu mỗi phiên

1. Đọc docs/PROJECT\_STATE.md và tuần hiện tại trong docs/KE\_HOACH\_15\_TUAN.md; đọc docs/DAC\_TA\_NGHIEP\_VU.md khi đụng nghiệp vụ.
2. Nêu kế hoạch tối đa 10 dòng, rồi làm.
3. Chạy `npm run check` trước khi báo xong.
4. Cập nhật docs/PROJECT\_STATE.md, docs/PROGRESS.md, docs/AI\_USAGE.md, docs/TRUY\_VET.md.
5. Kết thúc bằng BÁO CÁO PHIÊN (đã làm, cách kiểm tra, kết quả chạy thật, tồn tại, việc tiếp theo).

## Lệnh người dùng

BẮT ĐẦU TUẦN N · NGHIỆM THU · BÁO CÁO TUẦN N · THAY ĐỔI: ... · GIẢI THÍCH: ... · AUDIT · TRẠNG THÁI

## Quy tắc cứng

* Chỉ làm đúng phạm vi tuần hiện tại; không làm trước.
* Không bịa kết quả, tỉ lệ, ảnh chụp, đóng góp thành viên. Việc không chạy được thì nói rõ.
* Hỏi trước khi: chi tiền, deploy công khai, dùng dữ liệu thật, xóa dữ liệu/DB, force push, đổi công nghệ, bỏ hoặc đổi tính năng P0, thêm thư viện nặng.
* Không commit bí mật; chỉ commit .env.example. Chỉ dữ liệu giả.
* Logic nghiệp vụ nằm trong src/server/services; mọi service nhận actor và gọi policy trước khi truy cập dữ liệu; từ chối mặc định.
* Không dùng middleware làm lớp phân quyền duy nhất.
* Mật khẩu bcrypt (cost >= 12, tối đa 72 byte); phiên JWT access ngắn + refresh xoay vòng lưu băm; cookie httpOnly; không dùng localStorage cho token.
* ADMIN bắt buộc TOTP; route quản trị kiểm role = ADMIN và mfa = true.
* Phiếu trả lời ẩn danh: SurveyResponse/SurveyAnswer không có liên kết tới người dùng; không log nội dung phiếu.
* Mọi quy tắc nghiệp vụ (BR-xx) có test gắn mã.
* Giao diện, thông báo, tài liệu bằng tiếng Việt; tên biến/hàm bằng tiếng Anh; commit theo conventional commits và nhắc mã FR/BR.

## Công nghệ

Next.js (App Router) + TypeScript strict, Prisma + MySQL 8 (utf8mb4), Zod, Tailwind + shadcn/ui, jose, bcrypt/bcryptjs, otplib, nodemailer, exceljs, Vitest, Playwright. Docker Compose: db + mailpit.

## Lệnh npm

dev · build · start · lint · typecheck · test · test:e2e · check · db:migrate · db:seed · db:reset · demo · scheduler · progress · admin:create · admin:reset-2fa
