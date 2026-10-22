# Nghiệm thu Tuần 4 — phân quyền và TOTP cho ADMIN

**Kế hoạch giả định:** 21–27/10/2026. **Thực hiện:** 22/10/2026, Asia/Saigon. Bám Mục 8.3–8.5 và phạm vi Tuần 4; không triển khai CRUD danh mục hoặc nghiệp vụ khảo sát/phản hồi.

## 1. Phạm vi

- FR-07: TOTP ADMIN, QR/khóa nhập tay, xác nhận đầu tiên, 10 mã khôi phục một lần, đặt lại có kiểm soát.
- FR-08: ADMIN luôn bắt buộc 2FA; cấu hình thêm vai trò khác, kiểm lại chính sách khi dùng phiên/refresh.
- FR-10: tạo tài khoản chờ kích hoạt, khóa/mở, gán vai trò và phạm vi; bảo vệ ADMIN cuối.
- FR-11: `can()` tập trung, từ chối mặc định, kiểm DB và lọc list/count/detail; kiểm IDOR của API mới.
- FR-12: xem/lọc/phân trang AuditLog đã lược dữ liệu nhạy cảm.

BR-18/30/31/32/33/34 được kiểm trong những chức năng hiện có. Không nhận đã hoàn thành quyền của module khảo sát/phản hồi chưa triển khai.

## 2. Chuẩn bị

Theo [README](../README.md), giữ `.env`/volume hiện có:

```powershell
npm.cmd ci
npm.cmd run auth:key
docker compose up -d --wait db mailpit
npm.cmd run db:prepare
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run admin:create
npm.cmd run dev
```

`auth:key` giữ JWT đang có và sinh riêng MFA_ENCRYPTION_KEY 32 byte nếu còn trống. Không thay khóa MFA khi còn ciphertext dùng khóa cũ. Script tạo ADMIN hỏi thông tin và mật khẩu không hiển thị; không nhận mật khẩu qua argv. Không có ADMIN seed cố định hoặc đường web công khai tạo quyền quản trị ban đầu.

## 3. Thao tác nghiệm thu nhìn thấy được

1. Mở đúng APP_URL, mặc định `http://localhost:3000`. Đăng nhập ADMIN vừa tạo: phải tới đăng ký TOTP, chưa vào được `/quan-tri` hoặc API quản trị.
2. Quét QR/nhập khóa thủ công vào ứng dụng xác thực, nhập mã đầu. Chỉ khi thành công mới hiện 10 mã khôi phục; lưu riêng, xác nhận đã lưu, vào trang quản trị.
3. Tạo tài khoản giả với mã/email/tên/vai trò. Nhập mã TOTP mới để xác nhận; tài khoản ở trạng thái chờ kích hoạt. Kích hoạt qua luồng Mailpit của Tuần 3.
4. Với tài khoản giả khác, thử khóa/mở hoặc đổi gán vai trò/phạm vi; phiên cũ bị thu hồi. Không tự khóa hoặc tự đổi quyền của ADMIN hiện tại; không làm mất ADMIN ACTIVE cuối.
5. Xem nhật ký, lọc action/actor/loại đối tượng/khoảng ngày. Dữ liệu có phân trang, thời gian hiển thị UTC+7, không có mật khẩu/token/secret/nội dung phiếu.
6. Đăng xuất rồi đăng nhập lại: ADMIN đã bật TOTP phải nhập mã hoặc mã khôi phục; mã đã dùng bị từ chối. ADMIN khác có thể đặt lại 2FA với mã TOTP mới và lý do, hoặc người vận hành dùng `npm.cmd run admin:reset-2fa` trên máy chủ.

Thử khóa/mở/reset bằng tài khoản giả riêng; không sửa tài khoản thật để nghiệm thu. Mã vừa dùng ở bước trước có thể phải chờ chu kỳ 30 giây tiếp theo.

## 4. Kiểm tra tự động

```powershell
npm.cmd run check
npm.cmd run test:integration
npm.cmd run test:auth
npm.cmd run test:week4
npm.cmd run build
npm.cmd run progress
```

`test:week4` chuẩn bị database thử riêng có marker server identity, khác main và shadow; áp dụng migration, kiểm CLI qua stdin, rồi HTTP trên cổng 3003 với output `.next-auth`. Chỉ fixture UUID của lần chạy được dọn; database và volume không bị DROP/reset. Chính sách MFA toàn hệ thống chỉ được thử trong database này. Không chạy đồng thời `test:auth` và `test:week4` vì dùng chung thư mục output thử.

## 5. Bằng chứng và trạng thái gate

| Hạng mục | Kết quả thực tế |
| --- | --- |
| Migration | `20261022004129_week4_rbac_mfa` đã áp dụng; collation ba bảng mới sửa cho khớp FK trước apply; diff không khác. Runtime 16/blueprint 39. Test DB áp dụng đủ ba migration từ đầu sau một lần child migrate timeout và chạy lại |
| Policy/service | 29/29 targeted policy/RBAC service mock qua, gồm hồi quy thứ tự lấy khóa; phân biệt với HTTP/MySQL thật |
| MFA/core | 53/53 targeted auth/MFA qua; RFC vector, cửa sổ, mã hóa/tamper, purpose, reuse, recovery, policy và refresh |
| CSRF | 5/5 qua sau siết biểu diễn base64url chữ ký; không chuyển token sang user/phiên khác, hết hạn bị chặn |
| CLI thật | 5/5 qua: tạo ADMIN qua stdin, trùng bị chặn, xác nhận sai không thay dữ liệu, reset thu hồi phiên/mã khôi phục và audit, không nhận mật khẩu qua argv |
| SQL nền | 10/10 MySQL thật qua trên runtime 16, fixture rollback |
| Full check | **121/121 test, 13 file qua**; validate/generate hai schema, ERD, ESLint và TypeScript qua. Lượt đầu 118/119 phát hiện phép sửa bit padding có thể giải mã cùng byte; đã siết canonical base64url. Đã sửa kiểu optional của QR trong script kiểm thử trước lượt tổng cuối |
| Build | **Production build exit0 sau sửa cuối**, có đủ route MFA/admin/workspace; không thay kiểm HTTPS production |
| HTTP Tuần 3/4 | Hồi quy **24/24** và Tuần 4 **28/28** qua sau sửa cuối; gồm OTP/recovery đồng thời, mọi ID quản trị, 6 vai trò/scope list-count-detail, CSRF, policy, reset và ADMIN cuối. Fixture dọn, kết quả bền vững ignored có passed28/cleanedtrue |
| Giao diện | [QA thực tế](QA_GIAO_DIEN_TUAN_04.md): **13 nhóm thao tác và 6 lượt route/viewport qua**, không lỗi JavaScript, thiếu nhãn hoặc tràn ngang. Luồng ADMIN đăng ký/xác nhận TOTP → lưu 10 mã → quản trị → tạo user với step-up/CSRF → khóa/mở pending → đăng nhập lại bằng recovery và guard sinh viên qua. **6 PNG đã xem**, không chứa bí mật; fixture dọn, seed trước/sau giữ nguyên |
| Dependency audit | Production0; full audit còn5high ở dev chain braces→micromatch→fast-glob→ESLint; không force downgrade |
| CI/commit | [CI 39733168348](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39733168348) của mã `578fd96622b341b0d94228de83c4c8994449e03b` đã qua check và smoke; clean Linux migration/main+test DB, SQL, HTTP 24, CLI 5, HTTP 28, full 121 và build đều qua |

Đã tick FR-07/08/10/11/12: **34/163 = 20,9%**, M1 **22/23 = 95,7%**, M2 **9/9 = 100%**. Tính lại bằng npm run progress từ checkbox.

### Lỗi đã tái hiện và sửa

Trong lượt HTTP đầu, hai ADMIN khóa chéo cùng trả 200 và không còn ADMIN ACTIVE trong **database thử cô lập**. Nguyên nhân là Prisma `upsert(update:{})` có thể đọc trước khi chờ hàng khóa, tạo snapshot REPEATABLE READ cũ; các lần đọc quyền/số ADMIN sau đó chưa thấy giao dịch vừa commit. Đã thay câu đầu transaction bằng `INSERT ... ON DUPLICATE KEY UPDATE` lấy khóa, rồi `SELECT ... FOR UPDATE` trước mọi lần đọc nhất quán. Cùng sửa cho reset MFA. Unit kiểm thứ tự khóa qua; lượt MySQL tập trung sau sửa có **một thắng, một ADMIN còn hoạt động, bên thua INVALID_SESSION**. Lượt HTTP đầy đủ sau sửa đã chạy lại **28/28 qua**, có đúng một thao tác khóa chéo thành công. Không suy kết quả cuối từ log cũ bị gián đoạn.

## 6. Giới hạn

- Chỉ một phiên bản khóa MFA đang cấu hình; chưa chuyển ciphertext tự động khi xoay khóa. Không đổi khóa trực tiếp rồi nhận hệ thống vẫn hoạt động.
- Bộ chọn đơn vị lấy tối đa200 khoa/bộ môn với `hasMore`; chưa tối ưu danh mục lớn. List người dùng/audit/lớp có phân trang.
- Khóa tạm theo IP mặc định dùng bucket chung vì chưa cấu hình proxy đáng tin. Mailpit phục vụ cục bộ, chưa SMTP Internet/outbox.
- Ma trận và query filter mới áp dụng các chức năng đã triển khai. Quyền/IDOR của khảo sát, kết quả, phản hồi và upload bổ sung theo tuần chức năng.
- Nhóm phải đọc/viết lại nháp và tự điền đóng góp; AI không xác nhận phần sinh viên đã làm.

## 7. Tài liệu

[Sơ đồ ERD đã render và hash](SO_DO_TUAN_04.md), [ma trận chạy thật](PHAN_QUYEN_TUAN_04.md), [nháp mục bảo mật](BAO_MAT_TUAN_04.md), [ADR-005](decisions/ADR-005-totp-va-phan-quyen.md), [giải thích 5 câu](GIAI_THICH/tuan-04.md), [báo cáo](bao-cao-tien-do/tuan-04.md), [QA giao diện](QA_GIAO_DIEN_TUAN_04.md).

Mã và tài liệu cuối được đưa lên main bằng fast-forward/push thường; kết quả CI của commit tài liệu cuối đối chiếu đúng SHA trong lịch sử Actions. Giữ nguyên bốn file nguồn của đề tài.
