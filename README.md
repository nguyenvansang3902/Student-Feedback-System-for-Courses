# Website quản lý khảo sát và phản hồi sinh viên về môn học

Tiểu luận chuyên ngành HK1 2026–2027, kế hoạch 15 tuần từ **30/09/2026**, khởi động thực tế **02/10/2026**. Tuần 3 theo kế hoạch giả định **14–20/10/2026**, thực hiện **21–22/10/2026**; không ghi lùi ngày.

## Phạm vi hiện tại — Tuần 3: xác thực

Web có trang chủ, đăng nhập, đăng xuất, trang tài khoản theo vai trò, đổi mật khẩu, kích hoạt lần đầu và quên/đặt lại mật khẩu qua Mailpit. Phần điền khảo sát, gửi/xử lý phản hồi, dashboard kết quả, CRUD/import và TOTP chưa mở; làm theo các tuần sau. ADMIN chưa được cấp quyền quản trị hoặc mfa=true.

- `prisma/schema.prisma`: **13 model đã migrate**, gồm 9 bảng nền Tuần 2 và UserSession/AuthToken/RateLimitBucket/AuditLog của Tuần 3.
- `prisma/design.prisma`: **39 model thiết kế đầy đủ**, output riêng, không dùng migrate/db push.
- [18 wireframe Tuần 2](docs/wireframes/tuan-02.html) là tài liệu HTML tĩnh. Web chức năng hiện tại chạy bằng Next.js.
- Trang `/suc-khoe` và `/api/health` dành cho kỹ thuật kiểm ứng dụng; không phải màn khảo sát và chưa kiểm kết nối database.

## Chạy lần đầu trên PowerShell

Cần Git, Node.js LTS 24+, npm và Docker Desktop Linux containers/WSL 2 đang chạy. Mở terminal tại thư mục gốc dự án có `package.json`; không chạy trong `C:\Windows\system32`.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
npm.cmd run auth:key
docker compose up -d --wait --wait-timeout 180 db mailpit
npm.cmd run db:prepare
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Mở **[http://localhost:3000](http://localhost:3000)** hoặc [đăng nhập](http://localhost:3000/dang-nhap). Đợi terminal báo Ready, giữ terminal chạy; Ctrl+C dừng web. Mailpit: [http://localhost:8025](http://localhost:8025). Từ lần sau chỉ cần mở Docker, `docker compose up -d --wait db mailpit`, rồi `npm.cmd run dev`; sau khi kéo migration/dependency mới đọc lại bước cài tương ứng.

**Dùng đúng origin APP_URL.** Mặc định `APP_URL=http://localhost:3000`; thao tác ghi kiểm Origin và URL chính xác. Mở bằng `127.0.0.1:3000` hoặc tự đổi cổng mà chưa đổi APP_URL sẽ bị từ chối. Nếu cần đổi, cập nhật APP_URL trong `.env` riêng và khởi động lại server; liên kết email sinh theo giá trị đó.

### Tài khoản demo dev

Chạy `db:seed` trước. Ba tài khoản ACTIVE có mật khẩu ban đầu **`Demo2026!HocTap`**; tài khoản chờ kích hoạt chưa có mật khẩu. Chỉ dùng dữ liệu giả ở dev/demo:

| Mã định danh | Email                    | Trạng thái và cách thử                                          |
| ------------ | ------------------------ | --------------------------------------------------------------- |
| SV2026001    | sinhvien@demo.invalid    | ACTIVE, sinh viên; đăng nhập xem bố cục                         |
| GV2026001    | giangvien@demo.invalid   | ACTIVE, giảng viên; đăng nhập xem bố cục                        |
| TEMP2026001  | tam@demo.invalid         | ACTIVE, mật khẩu tạm; bắt buộc đổi trước khi vào tài khoản      |
| NEW2026001   | moikichhoat@demo.invalid | PENDING_ACTIVATION; vào Kích hoạt, yêu cầu thư rồi đặt mật khẩu |

Seed chỉ tạo tài khoản demo còn thiếu, không phải công cụ đặt lại mật khẩu hoặc trạng thái đã đổi. Seed bị chặn production; không dùng ADMIN/demo cố định trong môi trường thật. Nếu thử đổi/reset/kích hoạt, giữ lại mật khẩu bạn vừa chọn để đăng nhập lần sau.

## Cấu hình riêng và bảo vệ dữ liệu

`.env.example` là mẫu dev. `auth:key` sinh JWT_SECRET 32 byte vào `.env`, không in khóa và không đổi khóa hợp lệ đã có. `src/lib/env.ts` kiểm biến xác thực bằng Zod. Không commit/gửi `.env`, cookie, token hoặc ảnh chứa bí mật. Mỗi máy có khóa, volume và DB riêng; GitHub không chuyển dữ liệu MySQL từ máy này sang máy khác.

`src/instrumentation.ts` kiểm cấu hình ngay khi server Node.js khởi động. APP_URL chỉ dùng HTTP/HTTPS, khớp URL/Origin của request; production yêu cầu HTTPS. Thời hạn và ngưỡng được kiểm bằng Zod trong `src/server/auth/limits.ts`; `.env.example` ghi các mặc định đã dùng để nghiệm thu:

| Biến môi trường                                               | Mặc định                           |
| ------------------------------------------------------------- | ---------------------------------- |
| `LOGIN_MAX_FAILURES`                                          | 5 lần sai                          |
| `LOGIN_WINDOW_SECONDS`, `LOGIN_LOCK_SECONDS`                  | 900 giây (15 phút) cho mỗi giá trị |
| `PASSWORD_RESET_TTL_SECONDS`                                  | 1800 giây (30 phút)                |
| `ACTIVATION_TTL_SECONDS`                                      | 86400 giây (24 giờ)                |
| `RECOVERY_WINDOW_SECONDS`, `RECOVERY_LOCK_SECONDS`            | 900 giây cho mỗi giá trị           |
| `RECOVERY_REQUEST_IP_LIMIT`, `RECOVERY_REQUEST_ACCOUNT_LIMIT` | 10 lần/IP, 3 lần/tài khoản         |
| `RECOVERY_COMPLETE_IP_LIMIT`, `RECOVERY_COMPLETE_TOKEN_LIMIT` | 20 lần/IP, 5 lần/token             |

Access mặc định `ACCESS_TTL_SECONDS=900`, refresh `REFRESH_TTL_DAYS=30`, bcrypt `BCRYPT_COST=12`. Giữ các mặc định để tái hiện nghiệm thu; không tăng hạn hay tắt giới hạn để vượt kiểm thử. Thay cấu hình riêng cần khởi động lại server.

MySQL Compose công bố cổng 3306, Mailpit SMTP 1025/UI 8025 ở loopback. MYSQL_DATABASE/MYSQL_USER/MYSQL_PASSWORD phải khớp DATABASE_URL và tài khoản trong volume. Đổi `.env` không tự đổi mật khẩu MySQL đã tạo. Không dùng `down -v`, migrate reset hay xóa DB để vượt lỗi.

### Shadow và migration

`npm.cmd run db:prepare` tạo shadow riêng với marker identity trong `.local/` và lưu SHADOW_DATABASE_URL vào `.env`; cả hai bị Git bỏ qua. Guard kiểm cổng/tài khoản/endpoint/server identity và tên DB để tránh chấp nhận nhầm dữ liệu thật làm shadow. Không grant toàn server `*.*`. Shadow là DB tạm Prisma có thể làm rỗng; luôn khác DB chính.

Migrate dùng schema runtime mặc định; **không thêm `--schema prisma/design.prisma`**. Tuần 2 migration 9 bảng vẫn giữ; Tuần 3 thêm `20261021165346_week3_auth_sessions`. Migration auth đã xử lý collation `utf8mb4_vi_0900_ai_ci` để FK CHAR(36) khớp bảng cũ. Gặp drift/lỗi migration phải đọc nguyên nhân và giữ volume, không reset.

## Kiểm tra

```powershell
npm.cmd run db:validate
npm.cmd run test:integration
npm.cmd run test:auth
npm.cmd run check
npm.cmd run build
npm.cmd run progress
```

| Lệnh               | Phạm vi                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `test:integration` | MySQL thật đúng 13 bảng; 10 test ràng buộc nền dùng fixture transaction rồi rollback                            |
| `test:auth`        | HTTP/MySQL/Mailpit với fixture giả riêng, server thử cổng 3002; cleanup đúng fixture, không dùng tài khoản demo |
| `check`            | Validate/generate runtime+blueprint, ERD đồng bộ DMMF, ESLint, TypeScript, Vitest                               |
| `build`            | Next.js production build, không thay thử giao diện/HTTP                                                         |
| `progress`         | Tính FR từ checkbox có trọng số, không ước lượng khối lượng thiết kế                                            |
| `auth:key`         | Sinh khóa JWT riêng lần đầu, giữ khóa đã có                                                                     |
| `db:seed`          | Tạo demo auth còn thiếu, chặn production, không reset tài khoản đã thử                                          |

`db:seed`, `test:auth` và `build` tự chạy `db:generate` qua npm prehook, nên máy clone mới không cần có Prisma client đã sinh sẵn trong Git. CI ban đầu ở `ed7ed60` từng lỗi vì chạy test auth trước generate; mã `43b937e` đã sửa thứ tự này.

Nghiệm thu cuối ngày **22/10/2026**: **61/61 Vitest** (27 core auth, 18 recovery, 13 schema/guard, 2 cấu hình limits, 1 health), lint/typecheck/ERD qua, **build exit 0**, **24/24 HTTP/MySQL/Mailpit**, **10/10 SQL nền**. HTTP đã kiểm reset đồng thời chỉ một lần thành công và refresh replay; race refresh đồng thời mới kiểm bằng unit mock, chưa kiểm đồng thời qua HTTP/MySQL. [CI 39642730208](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39642730208) của mã **`43b937e`** qua cả `check` và `smoke`.

[QA giao diện](docs/QA_GIAO_DIEN_TUAN_03.md) kiểm 10 lượt trang/viewport, bàn phím, đăng nhập/đăng xuất và luồng email → reset → đăng nhập trên trình duyệt. Ba sơ đồ xác thực đã render, đối chiếu 6/6 hash nguồn/SVG. FR-01–06 và FR-102 đã nghiệm thu: **20/163 điểm = 12,3%**, M1 **17/23 = 73,9%**. Trạng thái từng gate ở [nghiệm thu Tuần 3](docs/NGHIEM_THU_TUAN_03.md); khi lấy bản mới, đối chiếu CI đúng SHA trong lịch sử Actions của main. Chưa triển khai Tuần 4.

Đăng nhập sai 5 lần trong 15 phút khóa tạm 15 phút. Request email/reset cũng bị giới hạn. Mặc định `AUTH_TRUST_PROXY=false`, IP ở Next Route Handler dùng bucket tổng `untrusted-client`; các tài khoản vẫn có bucket riêng. Chỉ bật trust proxy sau khi có proxy tin cậy ghi đè header và chặn truy cập trực tiếp. Xem [ADR-004](docs/decisions/ADR-004-xac-thuc.md) về JWT, refresh/replay, cookie, CSRF, xoay khóa và giới hạn SMTP timing.

Audit dependency cuối Tuần 3: **production 0**, full audit còn **5 high** trong dev chain; không áp dụng force downgrade hoặc tuyên bố hết lỗ hổng. DMMF chỉ chứng minh cấu trúc ẩn danh 5.6a; test nộp trùng/đồng thời/export 5.6b/c/d thuộc các tuần chức năng khảo sát.

## Chia sẻ cho bạn cùng nhóm

Gửi [kho GitHub](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses), dùng `git clone`, rồi làm các bước chạy lần đầu trên máy bạn ấy. Không gửi `.env` hoặc volume. Để push cùng kho, chủ kho thêm GitHub collaborator, bạn ấy chấp nhận lời mời.

Trước mỗi phần việc: `git switch main`, `git pull --ff-only`, tạo nhánh `feat/...`, đọc AGENTS và PROJECT_STATE, làm đúng tuần/phân công, chạy check rồi commit/push và tạo Pull Request. Chờ CI/kiểm tra trước khi nhập main; không force push. Nếu đã có thay đổi cục bộ, giữ lại/commit hợp lệ trước khi đổi nhánh.

## Tài liệu

- [Trạng thái](docs/PROJECT_STATE.md), [tiến độ FR](docs/PROGRESS.md), [truy vết](docs/TRUY_VET.md), [nhật ký AI](docs/AI_USAGE.md).
- [Đặc tả nguồn](docs/DAC_TA_NGHIEP_VU.md), [kế hoạch 15 tuần](docs/KE_HOACH_15_TUAN.md), [FR/NFR](docs/YEU_CAU.md), [ma trận thiết kế](docs/PHAN_QUYEN.md).
- [Sơ đồ xác thực](docs/SO_DO_XAC_THUC.md), [ADR-004](docs/decisions/ADR-004-xac-thuc.md), [giải thích và 5 câu bảo vệ](docs/GIAI_THICH/tuan-03.md), [báo cáo Tuần 3](docs/bao-cao-tien-do/tuan-03.md), [nghiệm thu Tuần 3](docs/NGHIEM_THU_TUAN_03.md).
- [ERD hiện tại](docs/ERD.md), [kiến trúc](docs/KIEN_TRUC.md), [thiết kế ẩn danh](docs/THIET_KE_AN_DANH.md), [gallery sơ đồ Tuần 2](docs/SO_DO_DA_RENDER.md).
- [Báo cáo Tuần 1](docs/bao-cao-tien-do/tuan-01.md), [Tuần 2](docs/bao-cao-tien-do/tuan-02.md) giữ nguyên bằng chứng tại thời điểm thực hiện.

AI hỗ trợ mã/tài liệu, sinh viên cần đọc, thử và viết lại bản nháp; không tự gán đóng góp cá nhân. Không viết quy trình hiện tại ở trường theo yêu cầu người dùng. Sau nghiệm thu dừng đúng phạm vi Tuần 3; Tuần 4 cần lệnh tiếp tục.
