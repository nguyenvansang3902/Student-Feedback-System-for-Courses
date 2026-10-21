# Website quản lý khảo sát và phản hồi sinh viên về môn học

Tiểu luận chuyên ngành HK1 2026–2027, kế hoạch 15 tuần từ **30/09/2026**, khởi động thực tế **02/10/2026**. Phần việc **Tuần 2** được thực hiện ngày **21/10/2026**; khoảng **07–13/10/2026** chỉ là mốc kế hoạch giả định 7 ngày/tuần, không phải ngày đã làm.

## Phạm vi hiện tại: Tuần 2 — phân tích và thiết kế

- Giữ khung Next.js, TypeScript strict, Tailwind, trang chủ/sức khỏe, Docker Compose MySQL/Mailpit và CI của Tuần 1.
- Có yêu cầu FR/NFR, sơ đồ use case/hoạt động/trạng thái, ma trận 7 vai trò, ERD, thiết kế kiến trúc/CSDL/ẩn danh, ADR và nháp Chương 2–3.
- `prisma/design.prisma`: **39 model thiết kế toàn hệ thống**, dùng validate và DMMF, output riêng; **không dùng để migrate/db push**.
- `prisma/schema.prisma`: **9 model áp dụng** gồm User, RoleAssignment, Faculty, Department, Semester, Course, CourseSection, TeachingAssignment, Enrollment; migration nền có 11 FK Restrict và 3 CHECK.
- [18 wireframe](docs/wireframes/tuan-02.html) là thư viện HTML tĩnh trong `docs/`, không thuộc giao diện chức năng Next.js. Các nút nghiệp vụ bị vô hiệu hóa; không đăng nhập, nộp phiếu hay ghi dữ liệu.

Chưa có đăng nhập, tài khoản demo, CRUD/import, mẫu/đợt/nộp khảo sát hoặc phản hồi chạy thật. Phân quyền, JWT/bcrypt/TOTP là thiết kế cho các tuần triển khai. Chỉ FR-102 được tick: **3/163 điểm (1,8%)**; schema và tài liệu không làm tăng tỷ lệ hoàn thành chức năng.

## Chạy cục bộ trên PowerShell

Yêu cầu: Node.js LTS **24 trở lên**, npm, Git, Docker Desktop chạy Linux containers/WSL 2; Docker Compose dùng được. Các cổng cục bộ 3306, 1025, 8025 và 3000 cần khả dụng. Dùng thư mục gốc dự án, không chạy trong `C:\Windows\system32`.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm ci
docker compose up -d --wait --wait-timeout 180 db mailpit
docker compose ps
npm run db:prepare
npm run db:migrate
npm run test:integration
npm run check
npm run dev
```

Mở [trang chủ](http://127.0.0.1:3000), [trang sức khỏe](http://127.0.0.1:3000/suc-khoe), [API health](http://127.0.0.1:3000/api/health), [Mailpit](http://127.0.0.1:8025). API vẫn trả `database: not_checked`: chỉ xác nhận ứng dụng, kiểm database riêng bằng migration/SQL. Chưa có email nghiệp vụ để xem ở Mailpit.

`.env.example` chỉ chứa thông tin mẫu cho dev. Trước lần khởi tạo volume đầu tiên, đổi mật khẩu mẫu nếu cần và đồng bộ MYSQL_DATABASE/MYSQL_USER/MYSQL_PASSWORD với DATABASE_URL; ký tự đặc biệt trong URL phải được mã hóa đúng. Không commit `.env`, không dùng dữ liệu sinh viên thật. Đổi `.env` sau khi volume đã có **không tự đổi** tài khoản/mật khẩu trong MySQL.

Compose công bố MySQL/SMTP/Mailpit trên `127.0.0.1`. Nếu xung đột cổng 3306, xác định dịch vụ đang chiếm cổng trước; cơ chế chuẩn bị DB kiểm endpoint để tránh trỏ nhầm server, nên không đổi riêng DATABASE_URL sang cổng khác rồi tiếp tục migrate. `docker compose down` dừng dịch vụ nhưng giữ volume `mysql_data`; không dùng `down -v`, `migrate reset` hoặc xóa DB để vượt lỗi.

## Shadow database và migration

Prisma migrate dev dùng một database tạm để kiểm lịch sử/drift. Shadow phải có **tên khác database chính**, không chứa dữ liệu cần giữ; Prisma có thể làm rỗng nó. Không dùng database chính dưới tên tài khoản/alias host khác làm shadow.

`npm run db:prepare` kiểm cấu hình MySQL Compose cục bộ, chuẩn bị shadow riêng, giới hạn quyền trên database đó và lưu marker dưới `.local/` cùng SHADOW_DATABASE_URL trong `.env`. Cơ chế kiểm server identity/marker nhằm tránh chấp nhận DB tồn tại trên server khác là shadow do script tạo. `.env` và `.local/` bị Git bỏ qua; không gửi nội dung cấu hình riêng vào báo cáo.

- Tài khoản ứng dụng chỉ cần quyền trong database chính và shadow được chuẩn bị; không grant toàn server `*.*` để giải quyết lỗi.
- Nếu SHADOW_DATABASE_URL trỏ DB đã tồn tại không được marker xác nhận, script phải từ chối; chọn database shadow mới, không tắt guard.
- Nếu `.env` và tài khoản trong volume cũ không khớp, khôi phục cấu hình đúng hoặc xử lý tài khoản có kiểm soát; không xóa volume để cài lại.
- `npm run db:migrate` dùng schema runtime mặc định. Migration `20261021160354_week2_users_catalog` có trong thư mục `prisma/migrations/`; chạy lại sau áp dụng phải báo đồng bộ, không cần tạo migration rỗng.
- `npm run db:deploy` áp migration đã duyệt ở CI. **Không thêm `--schema prisma/design.prisma`** vào migrate hoặc db push. Không tự chạy reset khi Prisma báo drift; đọc nguyên nhân và xử lý giữ dữ liệu.

Quyết định: [ADR-002](docs/decisions/ADR-002-schema-theo-tuan.md). Chuẩn bị shadow chỉ liên quan DB phát triển tạm; không triển khai công khai hoặc xóa dữ liệu ứng dụng.

## Kiểm tra chất lượng và kết quả

```powershell
npm run db:validate
npm run db:generate
npm run test:integration
npm run check
npm run build
npm run progress
```

| Lệnh               | Kiểm tra                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `db:validate`      | Schema runtime và blueprint hợp lệ                                                                                                       |
| `db:generate`      | Sinh client và DMMF vào các output riêng; không migrate DB                                                                               |
| `test:integration` | MySQL thật, đúng 9 bảng, trùng/FK/CHECK; fixture transaction được rollback                                                               |
| `check`            | Validate/generate, kiểm ERD đồng bộ DMMF (`design:check`), ESLint, TypeScript và Vitest; không thay build hoặc kiểm MySQL tích hợp riêng |
| `build`            | Next.js production build                                                                                                                 |
| `progress`         | Tính FR có trọng số từ checkbox, không ước lượng bằng cảm tính                                                                           |

Đã chạy ngày 21/10 sau vá phụ thuộc: migrate dev lần ba đồng bộ, status/diff/deploy không có thay đổi hoặc migration chờ; **10/10 SQL tích hợp qua**, fixture rollback, giữ volume. `npm run check` qua validate/generate/ERD/lint/typecheck và **14/14 Vitest** (13 schema/guard + 1 health), build exit 0; prepare safety **6/6 qua**. HTTP production thử tại 127.0.0.1:3001 trả 200 cho trang chủ/sức khỏe/API, payload/no-store đúng; Mailpit 8025 trả 200; server thử 3001 đã dừng. Chi tiết ở [nghiệm thu Tuần 2](docs/NGHIEM_THU_TUAN_02.md). Code `723e165` đã push nhánh feature; [CI 39634835024](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39634835024) đã qua cả `check` và `smoke`, gồm migration/deploy/diff, MySQL, check/build và HTTP dev trên Linux. Không dùng CI Tuần 1 thay cho mã mới.

Prisma/client/helper đã vá **7.10.1**, Vite **8.3.5**. Audit production hiện **0** cảnh báo; full audit còn **5 high** ở dev chain braces → micromatch → fast-glob → ESLint, chưa áp dụng đề nghị force downgrade ESLint của npm audit. Không tuyên bố toàn bộ dependency hết lỗ hổng hoặc tắt cảnh báo để vượt kiểm tra.

Test DMMF kiểm cấu trúc ẩn danh 5.6a, UUID/DATE, whitelist/đồ thị quan hệ, đồng bộ nền và shadow guard. **Chưa có** 5.6b/c/d cho nộp trùng, 20 request và export vì service nộp/xuất thuộc các tuần sau. Phiếu là ẩn danh mức ứng dụng, không chống suy luận từ quyền DB/log/hạ tầng. [Giải thích chi tiết](docs/THIET_KE_AN_DANH.md).

## Xem sơ đồ và wireframe

- Mở [SO_DO_NGHIEP_VU](docs/SO_DO_NGHIEP_VU.md) và [ERD](docs/ERD.md) bằng trình xem Markdown có hỗ trợ Mermaid; [gallery sơ đồ đã render](docs/SO_DO_DA_RENDER.md) có bằng chứng 13/13 sơ đồ render thành công.
- Mở `docs/wireframes/tuan-02.html` trực tiếp bằng trình duyệt; mục lục dẫn tới WF-01–18, xem trên điện thoại/desktop. Đây là bản thiết kế tĩnh và dùng dữ liệu giả, không phải ảnh chứng minh chức năng đã chạy.
- [WIREFRAME](docs/WIREFRAME.md) nối từng màn hình với vai trò/FR/BR; đã kiểm 18 màn ở desktop 1440/mobile 390, không tràn ngang và không điều khiển nghiệp vụ được bật. [NGHIEM_THU_TUAN_02](docs/NGHIEM_THU_TUAN_02.md) cung cấp checklist và kết quả.

## Lịch sử Docker Desktop

Ngày 02/10/2026, WSL/Docker đã được phục hồi sau khi người dùng bật tính năng Windows và khởi động lại; lỗi registry ban đầu chưa xác định nguyên nhân gốc. Đăng nhập web không chuyển về Desktop đã được giải quyết bằng [luồng mã thiết bị Docker](https://docs.docker.com/reference/cli/docker/login/) và restart Desktop. Đây là kết quả lịch sử, không khẳng định trạng thái đăng nhập hiện tại nếu máy đã đổi từ đó. Không gửi token/mật khẩu/mã đăng nhập vào chat hoặc Git. Nhật ký giữ tại [AI_USAGE](docs/AI_USAGE.md).

## Tài liệu chính

- [Trạng thái dự án](docs/PROJECT_STATE.md), [tiến độ FR](docs/PROGRESS.md), [truy vết](docs/TRUY_VET.md), [nhật ký AI](docs/AI_USAGE.md).
- [Đặc tả nguồn](docs/DAC_TA_NGHIEP_VU.md), [kế hoạch 15 tuần](docs/KE_HOACH_15_TUAN.md), [yêu cầu FR/NFR](docs/YEU_CAU.md), [ma trận quyền](docs/PHAN_QUYEN.md).
- [Kiến trúc](docs/KIEN_TRUC.md), [CSDL](docs/THIET_KE_CSDL.md), [ẩn danh](docs/THIET_KE_AN_DANH.md), [ADR-002](docs/decisions/ADR-002-schema-theo-tuan.md), [ADR-003](docs/decisions/ADR-003-an-danh.md).
- [Giải thích Tuần 2](docs/GIAI_THICH/tuan-02.md), [báo cáo Tuần 2](docs/bao-cao-tien-do/tuan-02.md), [nháp Chương 2](docs/bao-cao-tieu-luan/chuong-2-phan-tich-nghiep-vu.md), [nháp Chương 3](docs/bao-cao-tieu-luan/chuong-3-thiet-ke.md).

Tài liệu do AI hỗ trợ cần sinh viên đọc, xác minh và viết lại bằng lời của nhóm. Không viết quy trình hiện tại của trường theo yêu cầu người dùng; không điền đóng góp cá nhân thay nhóm. Chỉ chuyển Tuần 3 sau lệnh tiếp theo của người dùng.
