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
- Vai trò: SINH_VIEN, GIANG_VIEN, TRUONG_BO_MON, TRUONG_KHOA, CAN_BO_DBCL, LANH_DAO, ADMIN, PHONG_DAO_TAO, PHONG_KHAO_THI, THANH_TRA.
- Điều chỉnh số01 và phạm vi việc bù G1: [docs/BO_SUNG_01_TAC_NHAN.md](docs/BO_SUNG_01_TAC_NHAN.md); chưa làm Tuần7 khi chưa có lệnh BẮT ĐẦU TUẦN 7.
- ADMIN không xem dữ liệu nghiệp vụ nhạy cảm/hồ sơ Thanh tra.

## Docker trong môi trường Windows này

- Khởi động Docker Desktop bằng shortcut trong Windows Explorer. Không khởi tạo backend bằng `Start-Process`, `sky.launch_app`, `cua.computer.launch_app` hoặc `docker desktop start` từ tiến trình Codex: AppData có thể bị chuyển hướng sang bản dữ liệu riêng của ứng dụng. CLI được dùng sau khi Docker đã mở đúng từ Windows.
- Nếu schema hoặc dữ liệu khác checkpoint, đối chiếu ngữ cảnh khởi chạy và bản sao trước khi ghi. Không migrate, seed hoặc reset để xử lý chênh lệch dữ liệu chưa rõ nguyên nhân. Bằng chứng Tuần 13: `docs/assets/tuan-13/main-data-verification.json`; hướng dẫn mở dự án ở README.

## Giai đoạn nâng cấp giao diện

- Trạng thái UI: **chưa bắt đầu, chờ nghiệm thu tuần 11**. Prompt được giữ nguyên tại [docs/UI_NANG_CAP_PROMPT.md](docs/UI_NANG_CAP_PROMPT.md) để dùng sau khi hoàn thành 15 tuần và có lệnh riêng.
- Các luật, ngoại lệ và quy trình trong mục này và prompt UI **chỉ áp dụng khi người dùng gõ BẮT ĐẦU GIAI ĐOẠN UI-n**. Lệnh BẮT ĐẦU TUẦN n tiếp tục nghiệp vụ theo prompt chính và điều chỉnh số 01; không tự kích hoạt UI-0 hoặc hỏi năm câu UI.
- Khi được kích hoạt: chỉ sửa hiển thị trong phạm vi giai đoạn; giữ nghiệp vụ, quyền, xác thực, ẩn danh, schema, định danh form/test và các ngưỡng bảo vệ. Chỉ dùng các ngoại lệ E1/E2/E3 đúng giới hạn và quyền đã cấp.
- Giữ nhận diện teal, dùng token/thành phần chung, minh họa tự vẽ và một bộ icon; trang chủ vai trò, AppShell và luồng sinh viên tuân theo giai đoạn được duyệt. WCAG 2.2 AA, riêng viền ô nhập tối thiểu 3:1; không suy công bố khi thiếu mẫu.
- Không tải tài nguyên bên thứ ba lúc chạy, không nới CSP, không thêm thư viện ngoài danh sách cho phép nếu chưa hỏi; giữ bản quyền và microcopy tự nhiên theo các yêu cầu người dùng đã chốt.
- Đo thật, giữ ảnh trước/sau, test và báo cáo trung thực; không bịa số liệu, SUS, lời chứng thực; không hoạt ảnh phô trương hoặc sửa dữ liệu thật/bí mật/cấu hình triển khai. Không gộp giai đoạn, chỉ tiếp tục sau lệnh nghiệm thu; phạm vi P0 của tuần luôn được ưu tiên.
