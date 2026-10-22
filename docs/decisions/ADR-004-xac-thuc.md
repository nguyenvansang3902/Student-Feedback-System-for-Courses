# ADR-004 — xác thực bcrypt, JWT và thu hồi phiên thật

- Trạng thái: đã triển khai và đạt nghiệm thu kỹ thuật Tuần 3 ngày 22/10/2026; [NGHIEM_THU_TUAN_03](../NGHIEM_THU_TUAN_03.md) giữ bằng chứng từng gate.
- Khởi động thực tế: 21/10/2026; mốc Tuần 3 trong kế hoạch giả định: 14–20/10/2026.
- Áp dụng: FR-01–06, BR-30/31/33 và khung policy BR-34; TOTP/ma trận quyền chi tiết thuộc Tuần 4.

## Bối cảnh

Đặc tả 8.3 yêu cầu bcrypt cost tối thiểu 12, mật khẩu 10 ký tự đến 72 byte UTF-8, JWT access ngắn hạn, refresh ngẫu nhiên lưu băm và xoay vòng. JWT chỉ được kiểm chữ ký thì đăng xuất, đổi mật khẩu hoặc khóa tài khoản chưa có hiệu lực ngay. Máy Windows của nhóm cần thư viện cài được bằng `npm ci` mà không phải dựng trình biên dịch native cho bcrypt.

## Các phương án đã xét

| Quyết định      | Phương án chọn                                             | Lý do và hệ quả                                                                                                                                         |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Băm mật khẩu    | `bcryptjs` 3.0.3, cost 12 mặc định                         | JavaScript, không cần native build; tuân theo lựa chọn bcrypt/bcryptjs của đặc tả. Tốn CPU hơn nên giới hạn tần suất trước so sánh                      |
| JWT             | `jose` 6.2.13, HS256 cố định khi xác minh                  | Kiểm issuer, audience, expiry, subject, phiên và mfa; không nhận thuật toán do client chọn                                                              |
| Lưu token       | Cookie httpOnly, SameSite=Lax; Secure ở production         | Refresh chỉ path `/api/auth`; không dùng localStorage. Origin bắt buộc khớp APP_URL cho thao tác POST                                                   |
| Thu hồi phiên   | DB UserSession và family, kiểm lại mỗi request             | Mất lợi thế JWT hoàn toàn không cần DB, đổi lại logout/khóa/đổi mật khẩu có hiệu lực thật                                                               |
| Refresh         | Chuỗi ngẫu nhiên 32 byte, DB chỉ SHA-256                   | Mỗi lần dùng tạo row mới, thu hồi row cũ; replay thu hồi cả family, không chấp nhận đồng thời hai lần                                                   |
| Rate limit      | RateLimitBucket trên MySQL                                 | Giữ trạng thái qua restart tiến trình, có khóa row chống đếm thiếu khi đồng thời; cần dọn bucket theo chính sách vận hành về sau                        |
| Email khôi phục | SMTP Mailpit cục bộ, APP_URL cố định, token trong fragment | Liên kết không nhận host từ request; fragment tránh đưa token vào URL request mở trang. Trình duyệt giữ token trong bộ nhớ và xóa fragment khỏi history |

Giới hạn 72 byte là giới hạn đầu vào bcrypt, không phải 72 ký tự. Ứng dụng kiểm rõ và từ chối trước khi thư viện cắt phần dư; danh sách mật khẩu phổ biến nhỏ nằm trong `src/server/auth/password.ts`. Tài khoản không tìm thấy vẫn chạy phép so sánh với hash giả. [Tài liệu bcrypt.js](https://github.com/dcodeIO/bcrypt.js/) mô tả giới hạn byte và cách dùng thư viện; thư viện JWT hỗ trợ ký/xác minh cùng kiểm claim theo [tài liệu jose](https://github.com/panva/jose).

## Quyết định chi tiết

1. Access mặc định 15 phút. Refresh family có hạn tuyệt đối mặc định 30 ngày, không được kéo dài vô hạn mỗi lần refresh. Claim chứa user, session/family và mfa=false; vai trò/trạng thái dùng cho quyền phải được đối chiếu DB.
2. Khóa ổn định trên row gốc family tuần tự hóa refresh, logout và phát hiện dùng lại. Sau refresh, access gắn row cha cũng vô hiệu vì row cha đã thu hồi. Hai request dùng cùng refresh có thể khiến cả family bị thu hồi: client tuần tự hóa refresh để tránh tự tạo replay.
3. Logout thu hồi family hiện tại. Đổi mật khẩu và hoàn tất reset/kích hoạt thu hồi mọi phiên và token tài khoản chưa dùng. Đổi mật khẩu khóa User trước family, kiểm lại phiên và băm cũ trong transaction; không để request đã kiểm mật khẩu cũ ghi đè kết quả reset vừa hoàn tất.
4. Token reset 32 byte, chỉ lưu SHA-256, hạn 30 phút, đúng mục đích và dùng một lần. Kích hoạt dùng cùng cơ chế với hạn 24 giờ; chỉ tài khoản PENDING_ACTIVATION được chuyển ACTIVE, không mở khóa DISABLED. Claim token bằng update có điều kiện trong cùng transaction với mật khẩu, thu hồi phiên và audit.
5. Request reset/kích hoạt trả thông báo chung cho email không tồn tại, trạng thái không phù hợp và SMTP lỗi. Rate limit cả IP/tài khoản, kể cả email không tồn tại. Có sàn phản hồi 500–599 ms để giảm chênh lệch thường gặp, **không cam kết hằng thời gian qua SMTP**; SMTP vẫn có thể làm lộ chênh lệch độ trễ. Mailpit phục vụ demo, chưa có hàng đợi gửi email bền vững. Các biện pháp token ngẫu nhiên, một lần, hết hạn và phản hồi chung đối chiếu [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
6. Mặc định đăng nhập sai đủ 5 lần trong 15 phút khóa tạm 15 phút. Sau bcrypt, transaction còn khóa và kiểm lại cả bucket tài khoản/IP trước khóa User và tạo phiên, tránh cấp phiên từ kết quả kiểm rate đã cũ. Không phân biệt tài khoản không tồn tại/sai mật khẩu/chờ kích hoạt/bị vô hiệu trong thông báo lỗi. Throttling khác mặc định của request email cho phép 3 lần/tài khoản hoặc 10 lần/IP mỗi 15 phút, lần kế tiếp mới bị chặn; completion cho phép 5 lần/token hoặc 20 lần/IP.
7. `AUTH_TRUST_PROXY=false` mặc định: không tin X-Forwarded-For do client tự gửi. Next Route Handler chưa có IP socket đáng tin nên dùng bucket IP tổng `untrusted-client`; guard theo tài khoản vẫn hoạt động. Chỉ bật trust proxy khi proxy tin cậy ghi đè header và chặn truy cập trực tiếp; đây là giới hạn triển khai cần cấu hình trước dùng thật.
8. Audit chỉ ghi action, actor, loại/ID đối tượng và tóm tắt được cho phép. Không log mật khẩu, raw token, cookie, nội dung email hay exception có thể chứa SQL/bí mật. Chưa có trang xem AuditLog; FR-12 thuộc Tuần 4.

## Cấu hình và xoay khóa

`src/instrumentation.ts` gọi kiểm cấu hình khi server Node.js khởi động; `src/lib/env.ts` kiểm biến bằng Zod. Thiếu trường báo tên trường, không in giá trị. APP_URL chỉ HTTP/HTTPS, kiểm khớp Origin/URL/host; HTTPS bắt buộc ở production runtime. `npm run auth:key` tạo JWT_SECRET 32 byte dạng hex trong `.env` riêng và giữ nguyên khóa hợp lệ đã có. Không đưa khóa vào README/ảnh/test log/Git.

`src/server/auth/limits.ts` kiểm cấu hình ngưỡng/thời hạn bằng Zod. Mặc định ghi trong `.env.example`: login 5 lần/900 giây và khóa 900 giây; reset TTL 1800 giây, activation TTL 86400 giây; recovery window/lock 900 giây, request IP/account 10/3 và complete IP/token 20/5. Đây là các giá trị dùng để nghiệm thu; thay cấu hình cần đối chiếu đặc tả và chạy lại kiểm thử liên quan. `db:seed`, `test:auth`, `build` đều có npm prehook generate Prisma, không phụ thuộc client đã sinh cục bộ của tác giả.

Để xoay khóa thủ công trong môi trường dev: dừng server, sao lưu `.env` riêng ở nơi được bảo vệ, làm trống giá trị JWT_SECRET, chạy `npm run auth:key` rồi khởi động lại. Access ký khóa cũ bị từ chối. Refresh là token opaque nên **không tự bị vô hiệu chỉ vì đổi JWT_SECRET**; khi nghi lộ bí mật, phải thu hồi UserSession đang mở qua quy trình quản trị có kiểm soát trước khi mở lại. Tuần 3 chưa có CLI thu hồi toàn hệ thống hoặc hỗ trợ hai khóa trong thời gian chuyển tiếp. Không xóa database để xoay khóa.

## Kiểm chứng và giới hạn

- Lượt cuối local ngày 22/10: `npm run check` qua 61/61 test (27 core, 18 recovery, 13 schema, 2 limits, 1 health), lint/typecheck/ERD; build qua; SQL nền 10/10 và HTTP/MySQL/Mailpit 24/24 qua. CI mã `43b937e` [39642730208](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39642730208) qua cả check/smoke. Xem [nghiệm thu](../NGHIEM_THU_TUAN_03.md).
- Reset đồng thời đã được thử qua HTTP/MySQL, chỉ một lần thành công; refresh replay đã kiểm qua HTTP. Refresh đồng thời mới kiểm CAS/race bằng unit mock, chưa có chứng minh race refresh qua HTTP/MySQL thật. Không suy phạm vi này từ tổng số test.
- [QA giao diện](../QA_GIAO_DIEN_TUAN_03.md) có 10 lượt trang/viewport, thao tác bàn phím/login/logout và browser reset E2E; ba sơ đồ đã render và hash nguồn/SVG 6/6 khớp. Audit production 0, full audit còn 5 high thuộc dev chain; còn giới hạn nêu trong nghiệm thu.
- DB thêm UserSession/AuthToken/RateLimitBucket/AuditLog, tổng runtime 13; blueprint vẫn 39. Có bảng không hoàn thành quyền CRUD, FR-09 xem thiết bị hay FR-12 tra cứu audit.
- Chưa cấp MFA=true hoặc đặc quyền quản trị; chưa có ADMIN seed, TOTP, step-up hay phân quyền nghiệp vụ chi tiết.
- Giới hạn rate IP tổng có thể làm nhiều người dùng chung bị chặn trong demo; không tắt guard để lách kiểm thử, chờ hết hạn hoặc dùng fixture độc lập có kiểm soát.
- Email Mailpit không chứng minh SMTP Internet, khả năng gửi thật hoặc cơ chế phục hồi tài khoản của trường.
