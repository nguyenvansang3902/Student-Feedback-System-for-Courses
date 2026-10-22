# Website quản lý khảo sát và phản hồi sinh viên về môn học

Tiểu luận chuyên ngành HK1 2026–2027, kế hoạch 15 tuần từ **30/09/2026**, khởi động thực tế **02/10/2026**. Tuần 3 thực hiện **21–22/10/2026**. Tuần 4 theo mốc giả định **21–27/10/2026**, bắt đầu thực tế **22/10/2026**; nhóm đối chiếu lịch trường, không ghi lùi ngày.

## Phạm vi hiện tại — Tuần 4: phân quyền và TOTP

Web có các luồng tài khoản của Tuần 3, thêm đăng ký/xác minh TOTP, mã khôi phục, quản trị tài khoản, gán vai trò/phạm vi, chính sách MFA và nhật ký kiểm toán. ADMIN phải có phiên đầy đủ và MFA; quyền quản trị không tự cấp quyền xem kết quả/nội dung phản hồi. Danh sách lớp tối thiểu dùng để kiểm bộ lọc phạm vi; phần điền khảo sát, gửi/xử lý phản hồi, dashboard kết quả và CRUD/import được làm đúng các tuần sau.

- `prisma/schema.prisma`: **16 model đã migrate**, thêm TotpCredential/TotpRecoveryCode/SystemSetting và trạng thái MFA của UserSession ở Tuần 4; giữ 9 bảng nền và 4 bảng auth/audit.
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

## Tạo ADMIN và dùng giao diện quản trị

Từ thư mục dự án, chạy:

```powershell
npm.cmd run admin:create
```

Nhập mã ADMIN, lý do, email, tên và mật khẩu riêng theo lời nhắc; mật khẩu không hiển thị và không truyền qua tham số dòng lệnh. Script ghi audit với danh tính máy chủ. Không có ADMIN seed hoặc API công khai tạo quản trị ban đầu.

1. Đăng nhập ADMIN tại [trang đăng nhập](http://localhost:3000/dang-nhap).
2. Quét QR hoặc nhập khóa thủ công vào Google Authenticator/Authy, nhập mã sáu chữ số đầu tiên để bật TOTP.
3. Lưu riêng mười mã khôi phục đang hiển thị; chỉ xuất hiện một lần. Không đưa QR/khóa/mã khôi phục vào GitHub, ảnh báo cáo hoặc localStorage.
4. Vào [quản trị](http://localhost:3000/quan-tri): tài khoản, nhật ký, chính sách MFA. Tạo tài khoản mới sẽ ở trạng thái chờ kích hoạt; dùng email/Mailpit theo luồng Tuần 3.

Đổi quyền, tạo tài khoản, sửa chính sách MFA hoặc đặt lại 2FA yêu cầu một mã TOTP mới. Mã vừa dùng bị chặn dùng lại, nên có thể cần chờ chu kỳ 30 giây tiếp theo. Mã khôi phục chỉ dùng để đăng nhập, không thay xác nhận thao tác nhạy cảm. ADMIN luôn bắt buộc MFA; có thể bật bắt buộc cho các vai trò khác.

Không tự khóa hoặc tự đổi vai trò của ADMIN hiện tại. ADMIN khác thực hiện thay đổi; service còn bảo vệ ADMIN ACTIVE cuối cùng. Mất thiết bị/mã khôi phục: ADMIN khác đặt lại 2FA trên web, hoặc người vận hành có quyền máy chủ chạy:

```powershell
npm.cmd run admin:reset-2fa
```

Script yêu cầu lý do và nhập lại chính xác mã ADMIN; thu hồi các phiên/mã khôi phục, lần đăng nhập sau phải đăng ký TOTP lại. Đây là công cụ máy chủ, không phải đường bỏ qua MFA trên web. Quyền chạy script/đọc `.env` phải giới hạn cho người vận hành.

### Khóa MFA và bảo trì

Giữ bản sao bảo vệ của `.env` cùng bản sao database. Không thay trực tiếp MFA_ENCRYPTION_KEY khi còn credential dùng khóa cũ: ciphertext sẽ không giải mã được. Bản này dùng một phiên bản khóa, chưa có công cụ chuyển ciphertext tự động. Xoay khóa cần dừng ứng dụng, chuyển ciphertext ngoại tuyến đã kiểm trên bản sao hoặc đặt lại/đăng ký TOTP có kiểm soát cho các tài khoản liên quan, thu hồi phiên, rồi kiểm lại trước mở ứng dụng. Thay JWT_SECRET chỉ làm access cũ vô hiệu; refresh vẫn cần được thu hồi khi xử lý sự cố. Xem [ADR-005](docs/decisions/ADR-005-totp-va-phan-quyen.md).

## Cấu hình riêng và bảo vệ dữ liệu

`.env.example` là mẫu dev. `auth:key` sinh JWT_SECRET và MFA_ENCRYPTION_KEY riêng, mỗi khóa 32 byte vào `.env`, không in khóa và không đổi khóa hợp lệ đã có. Khóa MFA dùng AES-256-GCM với MFA_KEY_VERSION mặc định v1; không dùng chung khóa JWT. `src/lib/env.ts` kiểm biến xác thực bằng Zod. Không commit/gửi `.env`, cookie, token hoặc ảnh chứa bí mật. Mỗi máy có khóa, volume và DB riêng; GitHub không chuyển dữ liệu MySQL từ máy này sang máy khác.

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

Migrate dùng schema runtime mặc định; **không thêm `--schema prisma/design.prisma`**. Tuần 2 migration 9 bảng vẫn giữ; Tuần 3 thêm `20261021165346_week3_auth_sessions`, Tuần 4 thêm `20261022004129_week4_rbac_mfa`. Migration auth đã xử lý collation `utf8mb4_vi_0900_ai_ci` để FK CHAR(36) khớp bảng cũ. Gặp drift/lỗi migration phải đọc nguyên nhân và giữ volume, không reset.

## Kiểm tra

```powershell
npm.cmd run db:validate
npm.cmd run test:integration
npm.cmd run test:auth
npm.cmd run test:week4
npm.cmd run check
npm.cmd run build
npm.cmd run progress
```

| Lệnh               | Phạm vi                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `test:integration` | MySQL thật đúng 16 bảng; 10 test ràng buộc nền dùng fixture transaction rồi rollback                            |
| `test:auth`        | HTTP/MySQL/Mailpit với fixture giả riêng, server thử cổng 3002; cleanup đúng fixture, không dùng tài khoản demo |
| `check`            | Validate/generate runtime+blueprint, ERD đồng bộ DMMF, ESLint, TypeScript, Vitest                               |
| `build`            | Next.js production build, không thay thử giao diện/HTTP                                                         |
| `progress`         | Tính FR từ checkbox có trọng số, không ước lượng khối lượng thiết kế                                            |
| `auth:key`         | Sinh khóa JWT riêng lần đầu, giữ khóa đã có                                                                     |
| `db:seed`          | Tạo demo auth còn thiếu, chặn production, không reset tài khoản đã thử                                          |

`db:seed`, `test:auth` và `build` tự chạy `db:generate` qua npm prehook, nên máy clone mới không cần có Prisma client đã sinh sẵn trong Git. CI ban đầu ở `ed7ed60` từng lỗi vì chạy test auth trước generate; mã `43b937e` đã sửa thứ tự này.

### Kiểm thử Tuần 4 trên database riêng

`test:week4` tự chuẩn bị một database MySQL riêng có marker gắn server identity, lưu URL trong `.env` riêng. Nó khác main và shadow; không sao chép main, không DROP/reset database hoặc volume. Lệnh kiểm CLI qua stdin rồi chạy HTTP/TOTP/phân quyền trên cổng3003; chỉ fixture UUID được dọn. Giữ Docker chạy. Không chạy cùng lúc với `test:auth` vì cả hai dùng output `.next-auth`; ứng dụng đang mở cổng3000 dùng output riêng.

Nghiệm thu Tuần 4: Full check **121/121 test trong 13 file**, SQL MySQL **10/10**, CLI stdin **5/5**, HTTP hồi quy Tuần 3 **24/24**, HTTP/MySQL Tuần 4 **28/28** và build exit0. **Tiến độ 34/163 = 20,9%**. [CI 39733168348](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39733168348) của mã `578fd96622b341b0d94228de83c4c8994449e03b` đã qua check và smoke. UI 13 nhóm/6 viewport và 6 PNG qua. Kết quả và giới hạn được ghi tại [nghiệm thu Tuần 4](docs/NGHIEM_THU_TUAN_04.md). Lượt Tuần 3 dưới đây là bằng chứng lịch sử, không thay gate mới.

Nghiệm thu **Tuần 3** ngày **22/10/2026**: **61/61 Vitest** (27 core auth, 18 recovery, 13 schema/guard, 2 cấu hình limits, 1 health), lint/typecheck/ERD qua, **build exit 0**, **24/24 HTTP/MySQL/Mailpit**, **10/10 SQL nền**. HTTP đã kiểm reset đồng thời chỉ một lần thành công và refresh replay; race refresh đồng thời mới kiểm bằng unit mock, chưa kiểm đồng thời qua HTTP/MySQL. [CI 39642730208](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39642730208) của mã **`43b937e`** qua cả `check` và `smoke`.

[QA giao diện](docs/QA_GIAO_DIEN_TUAN_03.md) kiểm 10 lượt trang/viewport, bàn phím, đăng nhập/đăng xuất và luồng email → reset → đăng nhập trên trình duyệt. Ba sơ đồ xác thực đã render, đối chiếu 6/6 hash nguồn/SVG. Tỷ lệ sau Tuần 3 là **20/163 = 12,3%**; tiến độ hiện tại và bằng chứng mới xem [PROGRESS](docs/PROGRESS.md) và [nghiệm thu Tuần 4](docs/NGHIEM_THU_TUAN_04.md). Khi lấy bản mới, đối chiếu CI đúng SHA trong lịch sử Actions của main.

Đăng nhập sai 5 lần trong 15 phút khóa tạm 15 phút. Request email/reset cũng bị giới hạn. Mặc định `AUTH_TRUST_PROXY=false`, IP ở Next Route Handler dùng bucket tổng `untrusted-client`; các tài khoản vẫn có bucket riêng. Chỉ bật trust proxy sau khi có proxy tin cậy ghi đè header và chặn truy cập trực tiếp. Xem [ADR-004](docs/decisions/ADR-004-xac-thuc.md) về JWT, refresh/replay, cookie, CSRF, xoay khóa và giới hạn SMTP timing.

Audit dependency cuối Tuần 3: **production 0**, full audit còn **5 high** trong dev chain; không áp dụng force downgrade hoặc tuyên bố hết lỗ hổng. DMMF chỉ chứng minh cấu trúc ẩn danh 5.6a; test nộp trùng/đồng thời/export 5.6b/c/d thuộc các tuần chức năng khảo sát.

## Chia sẻ cho bạn cùng nhóm

Gửi [kho GitHub](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses), dùng `git clone`, rồi làm các bước chạy lần đầu trên máy bạn ấy. Không gửi `.env` hoặc volume. Để push cùng kho, chủ kho thêm GitHub collaborator, bạn ấy chấp nhận lời mời.

Trước mỗi phần việc: `git switch main`, `git pull --ff-only`, tạo nhánh `feat/...`, đọc AGENTS và PROJECT_STATE, làm đúng tuần/phân công, chạy check rồi commit/push và tạo Pull Request. Chờ CI/kiểm tra trước khi nhập main; không force push. Nếu đã có thay đổi cục bộ, giữ lại/commit hợp lệ trước khi đổi nhánh.

## Tài liệu

- [Sơ đồ ERD Tuần 4 đã render và hash](docs/SO_DO_TUAN_04.md).

- Tuần 4: [nghiệm thu](docs/NGHIEM_THU_TUAN_04.md), [ma trận chạy thật](docs/PHAN_QUYEN_TUAN_04.md), [bảo mật](docs/BAO_MAT_TUAN_04.md), [ADR-005](docs/decisions/ADR-005-totp-va-phan-quyen.md), [giải thích](docs/GIAI_THICH/tuan-04.md), [báo cáo](docs/bao-cao-tien-do/tuan-04.md), [QA giao diện](docs/QA_GIAO_DIEN_TUAN_04.md).

- [Trạng thái](docs/PROJECT_STATE.md), [tiến độ FR](docs/PROGRESS.md), [truy vết](docs/TRUY_VET.md), [nhật ký AI](docs/AI_USAGE.md).
- [Đặc tả nguồn](docs/DAC_TA_NGHIEP_VU.md), [kế hoạch 15 tuần](docs/KE_HOACH_15_TUAN.md), [FR/NFR](docs/YEU_CAU.md), [ma trận thiết kế](docs/PHAN_QUYEN.md).
- [Sơ đồ xác thực](docs/SO_DO_XAC_THUC.md), [ADR-004](docs/decisions/ADR-004-xac-thuc.md), [giải thích và 5 câu bảo vệ](docs/GIAI_THICH/tuan-03.md), [báo cáo Tuần 3](docs/bao-cao-tien-do/tuan-03.md), [nghiệm thu Tuần 3](docs/NGHIEM_THU_TUAN_03.md).
- [ERD hiện tại](docs/ERD.md), [kiến trúc](docs/KIEN_TRUC.md), [thiết kế ẩn danh](docs/THIET_KE_AN_DANH.md), [gallery sơ đồ Tuần 2](docs/SO_DO_DA_RENDER.md).
- [Báo cáo Tuần 1](docs/bao-cao-tien-do/tuan-01.md), [Tuần 2](docs/bao-cao-tien-do/tuan-02.md) giữ nguyên bằng chứng tại thời điểm thực hiện.

AI hỗ trợ mã/tài liệu, sinh viên cần đọc, thử và viết lại bản nháp; không tự gán đóng góp cá nhân. Không viết quy trình hiện tại ở trường theo yêu cầu người dùng. Sau nghiệm thu dừng đúng phạm vi Tuần 4; Tuần 5 cần lệnh tiếp tục.
