# BÁO CÁO TIẾN ĐỘ TUẦN 3/15 — cập nhật 22/10/2026

**Đề tài:** Xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học.

**Tiểu luận chuyên ngành HK1 2026–2027 | Nhóm:** [sinh viên điền] **| GVHD:** [sinh viên điền].

**Kế hoạch giả định:** 14–20/10/2026, mỗi tuần 7 ngày từ 30/09; nhóm đối chiếu lịch trường.

**Thực hiện:** bắt đầu 21/10, tiếp tục 22/10/2026, không ghi lùi ngày. Đây là bản nháp AI hỗ trợ để nhóm xác minh và viết lại.

## 1. Mục tiêu của tuần theo kế hoạch

Đăng nhập/đăng xuất, bcrypt, access JWT và refresh xoay vòng trong UserSession/cookie httpOnly, đổi mật khẩu, kích hoạt lần đầu/mật khẩu tạm, quên/đặt lại mật khẩu qua Mailpit, giới hạn tần suất/khóa tạm, khung AuditLog và layout theo vai trò. Có sơ đồ tuần tự và ADR. TOTP và phân quyền nghiệp vụ chi tiết thuộc Tuần 4.

## 2. Kết quả đạt được và bằng chứng

- Service nhận actor và gọi policy; bcryptjs cost 12, 10 ký tự đến 72 byte UTF-8, dummy compare; JWT kiểm chữ ký/claim và DB session/User. Refresh 32 byte chỉ lưu SHA-256, xoay vòng, replay thu hồi family. Logout thu hồi family; đổi/reset thu hồi mọi phiên.
- Giao diện trang chủ/đăng nhập/tài khoản/đổi/quên/reset/kích hoạt. Bố cục theo vai trò có các khu vực chưa mở; health chỉ dành kỹ thuật.
- Reset 30 phút/activation 24 giờ mặc định, token một lần/CAS cùng transaction, link APP_URL cố định và fragment, Mailpit nhận thư. Tham số TTL/rate có trong .env.example và được Zod kiểm.
- Runtime 13/blueprint 39. Migration auth sửa collation/FK trên bốn bảng mới rỗng sau lỗi 3780 rồi resolve applied, giữ volume/bảng nền. CI Linux đã áp dụng cả hai migration sạch và kiểm status/diff đồng bộ.
- Full `npm run check` **61/61 test**, lint/typecheck/schema/ERD qua; SQL MySQL thật **10/10**; HTTP/MySQL/Mailpit **24/24** và production build qua. Reset race được chạy thật; refresh race chỉ unit/mock, HTTP kiểm rotation/replay.
- UI **10 lượt route/viewport**, kiểm thêm 360px/Tab/Enter, login/logout và browser reset E2E qua; **3/3 sơ đồ** render, xem ảnh thật, **6/6 hash** khớp. [QA](../QA_GIAO_DIEN_TUAN_03.md), [nghiệm thu](../NGHIEM_THU_TUAN_03.md).
- Mã `ed7ed60`, sửa lifecycle `43b937e`; [CI 39642730208](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39642730208) check+smoke thành công. README, [ADR-004](../decisions/ADR-004-xac-thuc.md), [sơ đồ](../SO_DO_XAC_THUC.md), [5 câu bảo vệ](../GIAI_THICH/tuan-03.md) và truy vết đã cập nhật.

## 3. Đối chiếu kế hoạch

| Mục | Trạng thái | Bằng chứng và giới hạn |
| --- | --- | --- |
| Đăng nhập/logout/JWT/bcrypt/refresh | Hoàn thành Tuần 3 | Unit + HTTP mã/email/rotation/replay/logout; refresh đồng thời chưa kiểm MySQL thật |
| Đổi mật khẩu và buộc đổi mật khẩu tạm | Hoàn thành Tuần 3 | HTTP10–13, thu hồi phiên/mật khẩu cũ |
| Reset/kích hoạt Mailpit | Hoàn thành Tuần 3 | 18 unit recovery, HTTP14–20, browser reset; activation token UI chưa kiểm browser |
| Giới hạn tần suất và khóa tạm | Hoàn thành Tuần 3 | Rate/login-race/limits unit, HTTP23 sai 5 lần và đúng vẫn 429 |
| Khung audit/layout vai trò | Hoàn thành phạm vi tuần | HTTP24 và QA; chưa FR-12/chi tiết quyền |
| Runtime migration và ERD | Hoàn thành kỹ thuật | 13 model, SQL 10/10/schema 13/13, clean migrate Linux, status/diff |
| ADR/sơ đồ/giải thích | Đã có bản nháp cần nhóm đọc lại | Render 3/3, hash 6/6 và QA ảnh |
| Bản chạy được/CI | Đạt trên commit mã 43b937e | Check+smoke xanh; tài liệu cuối nhập main bằng push thường |
| TOTP/phân quyền chi tiết | Chưa làm, đúng Tuần 4 | Không cấp MFA=true hoặc quyền quản trị tạm |

## 4. Tiến độ lũy kế

`npm run progress` tính từ FR có mã, test và bằng chứng nghiệm thu: **20/163 điểm = 12,3%**, gồm FR-01–06 và FR-102. Mục tiêu phạm vi lũy kế Tuần 3 cũng 20/163; thực hiện muộn so lịch 14–20/10. Không tăng tỷ lệ theo số tài liệu, bảng hoặc test.

| Module | Điểm đạt/tổng | Tỷ lệ |
| --- | ---: | ---: |
| M1 Xác thực và phiên | 17/23 | 73,9% |
| M2 Người dùng, phân quyền, kiểm toán | 0/9 | 0,0% |
| M3 Danh mục và nhập liệu | 0/9 | 0,0% |
| M4 Mẫu phiếu | 0/16 | 0,0% |
| M5 Đợt khảo sát | 0/22 | 0,0% |
| M6 Làm khảo sát | 0/14 | 0,0% |
| M7 Kết quả | 0/18 | 0,0% |
| M8 Phản hồi | 0/19 | 0,0% |
| M9 Thông báo | 0/7 | 0,0% |
| M10 Báo cáo | 0/12 | 0,0% |
| M11 Hệ thống | 3/11 | 27,3% |
| M12 Mở rộng | 0/3 | 0,0% |

## 5. Khó khăn, rủi ro và hướng xử lý

- Làm ngày 21–22/10 sau mốc 14–20/10; nhóm/GVHD đối chiếu lịch và kế hoạch bù, giữ ngày thật.
- Migration từng lỗi collation3780; đã sửa trên bốn bảng mới rỗng, không reset dữ liệu, và clean migration CI qua.
- CI lần đầu thiếu Prisma Client trước HTTP auth; đã thêm predb:seed/pretest:auth/prebuild sinh hai client, chạy lại 24/24 và CI thành công.
- Refresh dùng khóa family và reset dùng khóa User/CAS. Đã chạy reset race MySQL thật; còn cần kiểm concurrent refresh MySQL khi mở rộng kiểm thử.
- AUTH_TRUST_PROXY=false dùng IP chung; cần proxy đáng tin trước dùng nhiều người. Mailpit chưa chứng minh SMTP Internet; sàn phản hồi chưa bảo đảm hằng thời gian khi SMTP chậm, chưa có outbox.
- Audit production 0; full audit còn 5 high dev chain braces→micromatch→fast-glob→ESLint. Chưa force downgrade. UI còn 404 favicon, activation token UI chưa kiểm browser; API đã kiểm.
- Nhóm cần đọc/viết lại bản nháp, hiểu mã và tự điền đóng góp thật.

## 6. Kế hoạch Tuần 4

Khi có lệnh tiếp tục: gán vai trò/phạm vi, policy can() và lọc phạm vi, quản lý người dùng, ADMIN TOTP theo 8.4, mã khôi phục/mã hóa secret/chống reuse, admin:create/admin:reset-2fa, trang audit và test ma trận/IDOR. Chưa làm khảo sát. Không cấp quyền ADMIN bỏ qua MFA.

## 7. Phân công và đóng góp từng thành viên

**[SINH VIÊN TỰ ĐIỀN]** Tên, phần thực làm, commit/kiểm thử/ảnh hoặc thuyết minh đã tự đọc và xác minh. AI không gán tên, số giờ hoặc đóng góp thay nhóm. Phần AI hỗ trợ ghi tại [AI_USAGE](../AI_USAGE.md).

## 8. Các bước kiểm tra nhanh cho giảng viên

1. Theo README chạy Compose/migration/seed/web; mở localhost:3000, đăng nhập SV2026001 → tài khoản sinh viên.
2. Logout, đăng nhập TEMP2026001 → buộc đổi mật khẩu; hoàn tất và đăng nhập bằng mật khẩu mới.
3. Quên mật khẩu tài khoản ACTIVE → Mailpit có thư, mở link/đặt mới; dùng lại link bị chặn.
4. Yêu cầu kích hoạt NEW2026001 → thư Mailpit, đặt mật khẩu → đăng nhập được. Không tự mở khóa DISABLED.
5. Chạy check, test:integration và test:auth; đối chiếu61/10/24 với nghiệm thu và CI. Các bước 2–4 làm đổi trạng thái demo, giữ mật khẩu vừa đặt.
6. Thử sai 5 lần bằng tài khoản chuyên thử → khóa 15 phút mặc định. Xem layout, sơ đồ và ADR; không reset DB để vượt khóa.

## 9. Bản rút gọn để dán vào hệ thống của trường — nháp dưới 150 từ

Tuần 3 thực hiện ngày 21–22/10/2026, sau mốc dự kiến 14–20/10. Đã có đăng nhập, đăng xuất, đổi mật khẩu, kích hoạt và đặt lại qua Mailpit; bcrypt, JWT và refresh xoay vòng, giới hạn tần suất, audit và bố cục theo vai trò. Full check qua 61 test; 10 kiểm tra SQL, 24 kiểm tra HTTP/MySQL/Mailpit, build và CI đều qua. Giao diện desktop/mobile và luồng đặt lại mật khẩu đã được kiểm trên trình duyệt; ba sơ đồ đã render. Tiến độ có trọng số đạt 20/163 điểm, tương đương 12,3%. Nhóm cần đọc, thử và viết lại bản nháp, điền đóng góp thật. Tuần 4 dự kiến phân quyền và TOTP cho ADMIN khi được yêu cầu.
