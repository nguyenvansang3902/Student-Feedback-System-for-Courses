# Website quản lý khảo sát và phản hồi sinh viên về môn học

Tiểu luận chuyên ngành HK1 2026–2027, kế hoạch 15 tuần từ **30/09/2026**, khởi động thực tế **02/10/2026**. Tuần 3 thực hiện **21–22/10/2026**. Tuần 4 theo mốc giả định **21–27/10/2026**, bắt đầu thực tế **22/10/2026**; nhóm đối chiếu lịch trường, không ghi lùi ngày.

## Phạm vi hiện tại — Tuần 6: mẫu phiếu khảo sát

Tuần 6 bắt đầu **22/10**, tiếp tục **28/10/2026**, sớm hơn mốc giả định **04–10/11** theo lệnh người dùng. ĐBCL GLOBAL có trình soạn nhóm/câu/thứ tự, năm loại câu, trọng số, bắt buộc/Không áp dụng, khóa/phiên bản mới, nhân bản, mặc định và xem trước. Các vai trò khác vẫn được kiểm quyền; ADMIN đơn vai trò không có quyền nghiệp vụ ngầm.

Mở [Mẫu phiếu khảo sát](http://localhost:3000/mau-phieu) bằng tài khoản demo `DBCL2026001`. Chọn **Dùng mẫu mặc định** để tạo bản nháp riêng, sửa và lưu, rồi **Xem trước**. Khóa mẫu là một chiều; muốn sửa nội dung đã khóa hãy tạo phiên bản mới. Xem trước chỉ thử trên trang hiện tại, không gửi phiếu hoặc tạo kết quả. Mỗi lần ghi kiểm tra lại quyền/trạng thái và phiên cập nhật; khi có người khác vừa sửa, tải lại bản mới trước khi lưu tiếp.

Seed Tuần 6 thêm một họ mẫu mặc định riêng có hai nhóm/sáu câu, đủ năm loại và cả Likert 1–4/1–5. Mẫu ba câu cũ, câu hỏi/phiếu/kết quả và lựa chọn mặc định tùy chỉnh được giữ. Sau khi kéo mã mới, chạy `npm.cmd ci`, `npm.cmd run db:deploy`, `npm.cmd run db:seed` rồi mở lại server. Migration mới chỉ thêm `revision`/`updatedAt`; runtime vẫn31/blueprint39. Đợt khảo sát/phê duyệt và nộp phiếu vẫn theo các tuần sau.

Chi tiết và gate cuối: [nghiệm thu Tuần 6](docs/NGHIEM_THU_TUAN_06.md), [báo cáo](docs/bao-cao-tien-do/tuan-06.md), [QA giao diện](docs/QA_GIAO_DIEN_TUAN_06.md), [giải thích](docs/GIAI_THICH/tuan-06.md), [ADR-007](docs/decisions/ADR-007-mau-phieu-va-phien-ban.md), [ERD](docs/SO_DO_TUAN_06.md). Các kết quả Tuần 5 dưới đây là bằng chứng lịch sử.

Nghiệm thu Tuần6 ngày28/10: **279/279 test trong24file**, lint/typecheck/ERD và build16.4.3 qua; SQL10, HTTP mẫu20, hồi quyHTTP24+28+22/CLI5, seed11nhóm. UI14nhóm/10viewport,10PNG đã mở xem; dữ liệu seed giữ nguyên. Audit production/full0 tại lượt kiểm. Tiến độ **62/163=38,0%**, M4=16/16. [CI mã68087ed](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40633183047) đã qua check/smoke; CI main/tài liệu cuối đối chiếu đúng SHA trong Actions.

### Nền chức năng đến Tuần 5

Tuần 5 thực hiện ngày **22/10/2026**, sớm hơn mốc giả định **28/10–03/11/2026**, theo yêu cầu người dùng. Cán bộ ĐBCL có thể CRUD học kỳ/khoa/bộ môn/môn/lớp/phân công, khóa sổ, nhập CSV/XLSX qua chạy thử và tải mẫu. Quyền quản trị ADMIN vẫn cần MFA và không tự cấp quyền ĐBCL.

- `prisma/schema.prisma`: **31 model đã migrate**, gồm 16 bảng nền/xác thực và 15 bảng phục vụ seed khảo sát/phản hồi được người dùng cho phép làm trước ngày 22/10. Có seed dữ liệu không đồng nghĩa đã có màn hình hoặc API khảo sát/phản hồi/kết quả; các chức năng đó triển khai đúng tuần sau.
- `prisma/design.prisma`: **39 model thiết kế đầy đủ**, output riêng, không dùng migrate/db push.
- [18 wireframe Tuần 2](docs/wireframes/tuan-02.html) là tài liệu HTML tĩnh. Web chức năng hiện tại chạy bằng Next.js.
- Trang `/suc-khoe` và `/api/health` dành cho kỹ thuật kiểm ứng dụng; không phải màn khảo sát và chưa kiểm kết nối database.

Nghiệm thu Tuần5: **219/219 test**, SQL10, HTTP24+28+22, CLI5, seed9nhóm, QA13nhóm/10viewport, build qua; **46/163=28,2%**. [CI 39775473219](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39775473219) của mã `a844f3f2f9fdcd8a71ef5587358c8446075b5294` đã qua cả `check` và `smoke`. Xem [nghiệm thu](docs/NGHIEM_THU_TUAN_05.md); CI main/tài liệu cuối đối chiếu đúng SHA trong Actions.

## Chạy lần đầu trên PowerShell

Cần Git, Node.js LTS 24+, npm và Docker Desktop Linux containers/WSL 2 đang chạy. Mở terminal tại thư mục gốc dự án có `package.json`; không chạy trong `C:\Windows\system32`.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
npm.cmd run auth:key
docker compose up -d --wait --wait-timeout 180 db mailpit
npm.cmd run db:prepare
npm.cmd run db:deploy
npm.cmd run db:seed
npm.cmd run dev
```

Mở **[http://localhost:3000](http://localhost:3000)** hoặc [đăng nhập](http://localhost:3000/dang-nhap). Đợi terminal báo Ready, giữ terminal chạy; Ctrl+C dừng web. Mailpit: [http://localhost:8025](http://localhost:8025). Từ lần sau chỉ cần mở Docker, `docker compose up -d --wait db mailpit`, rồi `npm.cmd run dev`; sau khi kéo migration/dependency mới đọc lại bước cài tương ứng.

**Dùng đúng origin APP_URL.** Mặc định `APP_URL=http://localhost:3000`; thao tác ghi kiểm Origin và URL chính xác. Mở bằng `127.0.0.1:3000` hoặc tự đổi cổng mà chưa đổi APP_URL sẽ bị từ chối. Nếu cần đổi, cập nhật APP_URL trong `.env` riêng và khởi động lại server; liên kết email sinh theo giá trị đó.

### Tài khoản demo dev

Chạy `db:seed` trước. Tài khoản demo ACTIVE có mật khẩu ban đầu **`Demo2026!HocTap`**; tài khoản chờ kích hoạt chưa có mật khẩu. Chỉ dùng dữ liệu giả ở dev/demo:

| Mã định danh | Email                    | Trạng thái và cách thử                                          |
| ------------ | ------------------------ | --------------------------------------------------------------- |
| SV2026001    | sinhvien@demo.invalid    | ACTIVE, sinh viên; đăng nhập xem bố cục                         |
| GV2026001    | giangvien@demo.invalid   | ACTIVE, giảng viên; đăng nhập xem bố cục                        |
| TEMP2026001  | tam@demo.invalid         | ACTIVE, mật khẩu tạm; bắt buộc đổi trước khi vào tài khoản      |
| NEW2026001   | moikichhoat@demo.invalid | PENDING_ACTIVATION; vào Kích hoạt, yêu cầu thư rồi đặt mật khẩu |
| DBCL2026001 | dbcl2026001@seed.demo.invalid | Cán bộ ĐBCL; mở **Mẫu phiếu khảo sát** hoặc **Danh mục và nhập dữ liệu** từ trang Tài khoản |
| TK2026001 | tk2026001@seed.demo.invalid | Trưởng khoa, phạm vi khoa minh họa 1 |
| TBM2026001 | tbm2026001@seed.demo.invalid | Trưởng bộ môn, phạm vi bộ môn minh họa 1 |
| LD2026001 | ld2026001@seed.demo.invalid | Lãnh đạo, phạm vi toàn trường |

Seed chỉ tạo tài khoản demo còn thiếu, không phải công cụ đặt lại mật khẩu hoặc trạng thái đã đổi. Seed bị chặn production; không dùng ADMIN/demo cố định trong môi trường thật. Nếu thử đổi/reset/kích hoạt, giữ lại mật khẩu bạn vừa chọn để đăng nhập lần sau.

### Xem chức năng Tuần 5 và chạy demo riêng

Đăng nhập `DBCL2026001`, mở [Danh mục và nhập dữ liệu](http://localhost:3000/danh-muc). Nhập file tại **Nhập dữ liệu**: tải mẫu, thay dòng ví dụ bằng dữ liệu giả/mã danh mục đang có, chọn file, **Chạy thử**, xem lỗi từng dòng rồi mới **Xác nhận nhập**. Tài khoản nhập chờ kích hoạt; thư tới Mailpit. Xem [hướng dẫn nhập file](docs/HUONG_DAN_IMPORT.md).

```powershell
npm.cmd run demo
```

Lệnh này cần `.env`, khóa auth, dependencies và Docker Compose đã chuẩn bị theo phần chạy lần đầu. Nó tạo **database demo mới riêng**, deploy migration, seed rồi chạy web tại **[http://127.0.0.1:3001](http://127.0.0.1:3001)**. Không đổi `DATABASE_URL` của ứng dụng chính, không DROP/reset dữ liệu cũ. Ctrl+C dừng web; database demo được giữ. Mỗi lần gọi tạo môi trường mới, nên dữ liệu của lần demo cũ vẫn chiếm dung lượng; không tự động xóa.

Mặc định `DEMO_SIZE=medium`: 3 khoa, 8 bộ môn, 40 môn, 120 lớp, 60 giảng viên, 1.500 sinh viên giả, 4.501 đăng ký (gồm sinh viên demo chính). Có mẫu mặc định mới sáu câu đủ năm loại và mẫu ba câu của dữ liệu lịch sử, một đợt mở, một đợt đã đóng/công bố có phiếu và kết quả khớp toán học, sáu trạng thái phản hồi giả. Các tài khoản trên dùng được; ADMIN tạo riêng bằng CLI với mật khẩu riêng và TOTP.

| DEMO_SIZE | Khoa / bộ môn / môn / lớp | Giảng viên / sinh viên | Đăng ký trên DB mới |
| --- | --- | --- | --- |
| small | 3 / 8 / 8 / 12 | 6 / 30 | 91 |
| medium | 3 / 8 / 40 / 120 | 60 / 1.500 | 4.501 |
| large | 3 / 8 / 80 / 240 | 120 / 3.000 | 9.001 |

Đổi size trong `.env`, hoặc `$env:DEMO_SIZE='small'` trước lệnh demo. `npm.cmd run demo -- --prepare` chỉ chuẩn bị dữ liệu, không mở server. `db:seed` bổ sung vào DB đang cấu hình, không giảm/xóa dữ liệu khi đổi xuống size nhỏ, không cân lại đăng ký đã có hay danh sách khảo sát đã chốt; từ chối nếu học kỳ demo đã khóa. Dữ liệu đợt đang mở giữ mốc đã tạo khi seed lại, nên chạy demo mới khi cần mốc thời gian mới.

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
npm.cmd run test:week5
npm.cmd run test:week6
npm.cmd run test:demo
npm.cmd run check
npm.cmd run build
npm.cmd run progress
```

| Lệnh               | Phạm vi                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `test:integration` | MySQL thật đúng 31 bảng; 10 test ràng buộc nền dùng fixture transaction rồi rollback                            |
| `test:auth`        | HTTP/MySQL/Mailpit với fixture giả riêng, server thử cổng 3002; cleanup đúng fixture, không dùng tài khoản demo |
| `check`            | Validate/generate runtime+blueprint, ERD đồng bộ DMMF, ESLint, TypeScript, Vitest                               |
| `build`            | Next.js production build, không thay thử giao diện/HTTP                                                         |
| `progress`         | Tính FR từ checkbox có trọng số, không ước lượng khối lượng thiết kế                                            |
| `auth:key`         | Sinh khóa JWT riêng lần đầu, giữ khóa đã có                                                                     |
| `db:seed`          | Bổ sung dữ liệu giả và tài khoản còn thiếu, chặn production, không reset tài khoản đã thử                      |
| `test:week5` | HTTP/MySQL/Mailpit cổng 3004, output `.next-week5`, dùng lại DB thử có marker Tuần 4; chạy tuần tự các suite |
| `test:week6` | HTTP/MySQL cổng 3005/output `.next-week6`, dùng DB thử có marker; bảy vai trò, phiên bản/khóa/CAS/preview không ghi |
| `test:demo` | Tạo DB demo mới, kiểm seed/size/idempotent, dữ liệu khảo sát và phép tính thật; giữ DB sau kiểm |

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

- Tuần 6: [nghiệm thu](docs/NGHIEM_THU_TUAN_06.md), [báo cáo](docs/bao-cao-tien-do/tuan-06.md), [giải thích](docs/GIAI_THICH/tuan-06.md), [ADR-007](docs/decisions/ADR-007-mau-phieu-va-phien-ban.md), [sơ đồ](docs/SO_DO_TUAN_06.md).

- Tuần 5: [nghiệm thu](docs/NGHIEM_THU_TUAN_05.md), [hướng dẫn import](docs/HUONG_DAN_IMPORT.md), [ADR-006](docs/decisions/ADR-006-danh-muc-va-nhap-lieu.md), [giải thích](docs/GIAI_THICH/tuan-05.md), [báo cáo](docs/bao-cao-tien-do/tuan-05.md), [QA giao diện](docs/QA_GIAO_DIEN_TUAN_05.md), [sơ đồ](docs/SO_DO_TUAN_05.md).

- [Sơ đồ ERD Tuần 4 đã render và hash](docs/SO_DO_TUAN_04.md).

- Tuần 4: [nghiệm thu](docs/NGHIEM_THU_TUAN_04.md), [ma trận chạy thật](docs/PHAN_QUYEN_TUAN_04.md), [bảo mật](docs/BAO_MAT_TUAN_04.md), [ADR-005](docs/decisions/ADR-005-totp-va-phan-quyen.md), [giải thích](docs/GIAI_THICH/tuan-04.md), [báo cáo](docs/bao-cao-tien-do/tuan-04.md), [QA giao diện](docs/QA_GIAO_DIEN_TUAN_04.md).

- [Trạng thái](docs/PROJECT_STATE.md), [tiến độ FR](docs/PROGRESS.md), [truy vết](docs/TRUY_VET.md), [nhật ký AI](docs/AI_USAGE.md).
- [Đặc tả nguồn](docs/DAC_TA_NGHIEP_VU.md), [kế hoạch 15 tuần](docs/KE_HOACH_15_TUAN.md), [FR/NFR](docs/YEU_CAU.md), [ma trận thiết kế](docs/PHAN_QUYEN.md).
- [Sơ đồ xác thực](docs/SO_DO_XAC_THUC.md), [ADR-004](docs/decisions/ADR-004-xac-thuc.md), [giải thích và 5 câu bảo vệ](docs/GIAI_THICH/tuan-03.md), [báo cáo Tuần 3](docs/bao-cao-tien-do/tuan-03.md), [nghiệm thu Tuần 3](docs/NGHIEM_THU_TUAN_03.md).
- [ERD hiện tại](docs/ERD.md), [kiến trúc](docs/KIEN_TRUC.md), [thiết kế ẩn danh](docs/THIET_KE_AN_DANH.md), [gallery sơ đồ Tuần 2](docs/SO_DO_DA_RENDER.md).
- [Báo cáo Tuần 1](docs/bao-cao-tien-do/tuan-01.md), [Tuần 2](docs/bao-cao-tien-do/tuan-02.md) giữ nguyên bằng chứng tại thời điểm thực hiện.

AI hỗ trợ mã/tài liệu, sinh viên cần đọc, thử và viết lại bản nháp; không tự gán đóng góp cá nhân. Không viết quy trình hiện tại ở trường theo yêu cầu người dùng. Sau nghiệm thu dừng đúng phạm vi Tuần 6; Tuần 7 cần lệnh tiếp tục. Ngoại lệ làm trước chỉ dành cho dữ liệu seed khảo sát/phản hồi đã được người dùng đồng ý.
