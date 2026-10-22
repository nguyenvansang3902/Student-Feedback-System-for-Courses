# Nghiệm thu Tuần 3 — xác thực tài khoản và phiên

**Mốc kế hoạch giả định:** 14–20/10/2026. **Thực hiện:** khởi động 21/10, tiếp tục 22/10/2026 (Asia/Saigon). Đã nghiệm thu mã Tuần 3 bằng các lượt kiểm dưới đây và CI đúng commit; ngày thực hiện được giữ nguyên dù muộn hơn kế hoạch.

## 1. Phạm vi và đầu ra

FR-01–06: đăng nhập mã/email, JWT/refresh/logout, đổi mật khẩu, reset qua Mailpit, kích hoạt/mật khẩu tạm, giới hạn tần suất/khóa tạm. Có khung AuditLog, service gọi policy và layout tài khoản theo vai trò. BR-30/31/33 được kiểm trong miền xác thực; BR-34 mới khung auth, không hoàn thành toàn bộ IDOR/phân quyền nghiệp vụ. Không mở TOTP/ADMIN, CRUD, khảo sát hoặc phản hồi.

| Thành phần          | File chính                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Password/JWT/rate   | `src/server/auth/password.ts`, `session.ts`, `rate-limit.ts`, `types.ts`                                                          |
| Service và policy   | `src/server/services/auth.ts`, `account-recovery.ts`, `src/server/policies/auth.ts`                                               |
| Route/cookie/Origin | `src/app/api/auth/[action]/route.ts`, `src/server/auth/http.ts`                                                                   |
| Giao diện           | `src/app/dang-nhap`, `tai-khoan`, `doi-mat-khau`, `quen-mat-khau`, `dat-lai-mat-khau`, `kich-hoat`; `src/components/auth`         |
| DB/cấu hình/email   | `src/lib/db.ts`, `env.ts`, `mail.ts`, schema runtime 13 model                                                                     |
| Hướng dẫn           | [README](../README.md), [ADR-004](decisions/ADR-004-xac-thuc.md), [sơ đồ](SO_DO_XAC_THUC.md), [giải thích](GIAI_THICH/tuan-03.md) |

## 2. Chuẩn bị và chạy

Theo [README](../README.md), dùng Node.js 24+, Docker Linux engine, chỉ dữ liệu giả. Không ghi đè `.env` đã có; `auth:key` giữ khóa hợp lệ. `db:seed` tạo bốn tài khoản còn thiếu ở dev, không đặt lại các mật khẩu/trạng thái đã thử.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
npm.cmd run auth:key
docker compose up -d --wait --wait-timeout 180 db mailpit
npm.cmd run db:prepare
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run test:integration
npm.cmd run test:auth
npm.cmd run check
npm.cmd run dev
```

Mở đúng **http://localhost:3000** theo APP_URL, Mailpit **http://localhost:8025**. Không thay riêng localhost bằng 127.0.0.1 hoặc cổng khác, vì Origin ghi phải khớp cấu hình. Giữ terminal chạy. Email demo `@demo.invalid` chỉ được Mailpit bắt trong môi trường này.

## 3. Checklist thao tác nhìn thấy được

| Mã                  | Thao tác                                                                         | Kết quả mong đợi, không mặc định là đã qua                                                     |
| ------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| W3-UI-01 / FR-01    | Trang chủ → Đăng nhập; dùng SV2026001 và mật khẩu demo trong README              | Vào `/tai-khoan`, hiện vai trò sinh viên và các khu vực chưa mở                                |
| W3-UI-02 / FR-01    | Logout; đăng nhập bằng email `giangvien@demo.invalid`                            | Vào bố cục giảng viên, thông tin từ phiên/DB phía máy chủ                                      |
| W3-UI-03 / FR-05    | TEMP2026001 + mật khẩu demo                                                      | Bị đưa tới `/doi-mat-khau`; chưa vào không gian tài khoản trước đổi                            |
| W3-UI-04 / FR-03    | Nhập đúng mật khẩu hiện tại và mật khẩu mới hợp lệ                               | Xóa cookie, yêu cầu đăng nhập lại; mật khẩu cũ và các phiên cũ không dùng được                 |
| W3-UI-05 / FR-04    | Quên mật khẩu cho tài khoản ACTIVE; mở thư mới đúng recipient trong Mailpit      | Link reset mở form; token không ở query URL; hoàn tất rồi đăng nhập mới, dùng lại link bị chặn |
| W3-UI-06 / FR-05    | `/kich-hoat`, nhập `moikichhoat@demo.invalid`, mở thư và đặt mật khẩu            | NEW2026001 thành ACTIVE và đăng nhập được; link chỉ dùng một lần                               |
| W3-UI-07 / FR-06    | Dùng tài khoản demo thử sai 5 lần trong 15 phút                                  | Thông báo chung; bị khóa tạm 15 phút, đúng mật khẩu cũng chưa vào khi đang khóa                |
| W3-UI-08 / FR-01/06 | Thử mã không tồn tại, tài khoản pending/disabled và sai mật khẩu                 | Không lộ tài khoản có tồn tại qua nội dung lỗi; giới hạn cả yêu cầu không tồn tại              |
| W3-UI-09            | Mở trang xác thực ở desktop và mobile, dùng Tab/Enter, mật khẩu rỗng/yếu/quá dài | Nhãn/lỗi tiếng Việt, không tràn ngang, trạng thái gửi ngăn bấm lặp                             |

Các thao tác đổi/reset/kích hoạt sẽ thay đổi tài khoản demo; giữ mật khẩu vừa đặt. Khóa tạm là trạng thái thật trong DB, chờ hết hạn để thử lại; không reset DB hoặc xóa bucket chung để vượt nghiệm thu.

## 4. Kiểm thử kỹ thuật cần có

| Nhóm             | Điều phải chứng minh                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| Cookie/CSRF      | httpOnly, SameSite=Lax, refresh path `/api/auth`, Secure production; JSON/no-store, POST sai/thiếu Origin bị chặn |
| Password         | Cost≥12; 10 ký tự, ≤72 byte UTF-8; mật khẩu phổ biến bị chặn; tài khoản không tồn tại có dummy compare            |
| Rotation         | Refresh mới khác cũ; row cha revoked; access cũ bị từ chối dù chưa exp; hạn family không kéo dài                  |
| Replay/race      | Dùng lại refresh hoặc gửi đồng thời cùng token thu hồi family; không có hai nhánh phiên còn hiệu lực              |
| Logout           | Thu hồi family hiện tại; access/refresh của family đều không dùng lại được                                        |
| Đổi/reset        | Mọi family user bị thu hồi; old password không dùng; khóa User/CAS ngăn request cũ ghi đè sau reset               |
| Reset/activation | Hash-only, đúng loại/expiry/usedAt/status; hai POST cùng token chỉ một thành công; rollback nếu CAS thua          |
| Audit            | Có action/actor/object cần thiết, không có raw token/password/cookie/email content; SMTP lỗi không leak exception |
| Role/admin       | Trang cần phiên hợp lệ; mật khẩu tạm bị chặn workspace; không cấp MFA=true hay quyền ADMIN                        |

Không lưu raw cookie/token/password vào artifact kiểm thử. Giá trị so sánh cần giữ tạm trong tiến trình; báo cáo chỉ kết quả boolean/status/count đã che.

## 5. Bằng chứng đã chạy

| Hạng mục                     | Kết quả thực tế tại bản cập nhật này                                                                                                                                                                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime/blueprint            | 13/39 model; thêm đúng 4 model auth/audit, không migrate blueprint                                                                                                                                                                                                          |
| Migration                    | `20261021165346_week3_auth_sessions`: lỗi MySQL3780 do collation FK đã được xử lý ở bốn bảng mới còn rỗng, thêm FK tương ứng và `resolve --applied`; status/diff đồng bộ. Không xóa/reset volume hoặc chín bảng nền                                                         |
| SQL nền MySQL thật           | `node scripts/verify-database.mjs`: **10/10 qua**, đúng 13 bảng, fixture rollback                                                                                                                                                                                           |
| Schema/ẩn danh/parity        | `vitest run tests/schema-anonymity.test.ts`: **13/13 qua**; 5.6a tiếp tục xanh, không nhận 5.6b/c/d đã có                                                                                                                                                                   |
| Core targeted                | **27/27 qua**: JWT/password 10, session/service 10, rate 4, login race 3; nằm trong full check, không cộng hai lần |
| Recovery targeted            | `vitest run tests/account-recovery.test.ts`: **18/18 qua**; ESLint ba file recovery/mail/test và tsc tại lượt targeted exit0                                                                                                                                                |
| ERD                          | `design:check` qua; bốn Mermaid body giữ nguyên SHA-256, bốn SVG overview cập nhật runtime13                                                                                                                                                                                |
| Full `npm run check`         | **61/61 test, 8 file qua** sau sửa cuối: core27 + recovery18 + schema13 + cấu hình limits2 + health1; validate/generate hai schema, ERD, ESLint và TypeScript đều qua |
| Production build             | **Exit0** sau sửa cuối; `prebuild` tự sinh Prisma Client. Build không thay kiểm vận hành HTTPS production |
| HTTP/MySQL auth/Mailpit/race | `npm run test:auth`: **24/24 qua** sau sửa cuối; login mã/email, rotation/replay/logout, đổi mật khẩu/thu hồi, Mailpit, expiry/reuse, hai POST reset đồng thời chỉ một thành công, activation, DISABLED và khóa sau 5 lần sai. Logout sai Origin không xóa cookie. **Refresh đồng thời chỉ kiểm bằng unit/mock**, chưa chạy race refresh trên MySQL thật |
| Giao diện desktop/mobile     | [QA thực tế](QA_GIAO_DIEN_TUAN_03.md): 5 route × 2 viewport = **10 lượt qua**, kiểm thêm 360px/Tab/Enter/form rỗng, login/logout; browser reset nhận thư → fragment được xóa → đổi mật khẩu → đăng nhập mới qua. Chưa browser-test token kích hoạt; API activation đã qua |
| Render 3 Mermaid mới         | **3/3 render, raster và xem ảnh thật**, **6/6 hash nguồn/SVG khớp**; [SVG và hash](SO_DO_XAC_THUC.md). Gallery Tuần 2 giữ nguyên |
| Dependency audit             | Lượt Tuần 3: `npm audit --omit=dev` **0 cảnh báo**; full audit **5 high ở dev chain braces → micromatch → fast-glob → ESLint**. Chưa force downgrade ESLint; không coi audit0 là hết lỗ hổng |
| Commit/CI                    | Mã `ed7ed60`, sửa lifecycle `43b937e3057a42e81719fe33c14f67055a2dea6d`; [CI 39642730208](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39642730208) **check + smoke thành công**, gồm clean migration/status/diff, SQL, HTTP/Mailpit, check và build trên Linux |

Đã tick **FR-01–06** theo kết quả trên, giữ FR-102: **20/163 điểm = 12,3%**, M1 **17/23 = 73,9%**. Các module nghiệp vụ còn lại giữ chưa hoàn thành. `npm run progress` tính lại từ checkbox, không tính phần trăm theo số file/test.

CI đầu ở `ed7ed60` đã áp dụng cả hai migration sạch và qua smoke nhưng lỗi auth do chưa sinh Prisma Client trước `test:auth`. Commit `43b937e` bổ sung `predb:seed`, `pretest:auth` và `prebuild`; chạy lại HTTP local 24/24 và CI mới thành công. Không dùng kết quả CI thất bại hoặc CI Tuần 2 để chứng minh bản cuối.

Mã và tài liệu được nhập `main` bằng fast-forward/push thường sau khi chốt tài liệu. Kết quả CI của commit tài liệu cuối đối chiếu trong lịch sử Actions; CI mã đã kiểm được liên kết ở trên, không tự tham chiếu một SHA tài liệu chưa tồn tại.

## 6. Giới hạn và điều kiện trước dùng thật

- Không TOTP/ADMIN, chi tiết quyền/phạm vi, màn tra AuditLog/thiết bị hoặc nghiệp vụ khảo sát/phản hồi. Khung audit chỉ trong auth không hoàn thành toàn bộ BR-30 của các module chưa có.
- AUTH_TRUST_PROXY=false dùng IP tổng `untrusted-client`; cần proxy tin cậy trước nhiều người dùng, không tin header từ Internet.
- SMTP Mailpit, chưa gửi Internet hoặc outbox bền vững; phản hồi có sàn thời gian nhưng chưa hằng thời gian khi SMTP chậm.
- Seed chặn production và không reset tài khoản đã thử. JWT key nằm `.env` riêng; thay khóa làm access cũ vô hiệu, refresh còn phải thu hồi khi xử lý sự cố.
- Health chỉ kiểm app. Ẩn danh mới có cấu trúc; không kiểm chức năng nộp/export chưa được triển khai.
- Nhóm phải kiểm lịch trường, tự đọc/viết lại nháp và điền đóng góp thật; AI không xác nhận việc thành viên đã làm.
