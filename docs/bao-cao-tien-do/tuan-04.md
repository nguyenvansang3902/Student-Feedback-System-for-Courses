# BÁO CÁO TIẾN ĐỘ TUẦN 4/15 — cập nhật 22/10/2026

**Đề tài:** Xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học.

**Tiểu luận chuyên ngành HK1 2026–2027 | Nhóm:** [sinh viên điền] **| GVHD:** [sinh viên điền].

**Kế hoạch giả định:** 21–27/10/2026, mỗi tuần 7 ngày từ 30/09; nhóm đối chiếu lịch trường.

**Thực hiện:** từ 22/10/2026, tiếp tục sau gián đoạn theo lệnh người dùng. Không ghi lùi ngày. Đây là bản nháp AI hỗ trợ để nhóm xác minh và viết lại.

**Trạng thái:** đã nghiệm thu FR-07/08/10/11/12 theo phạm vi Tuần 4; có mã, kiểm tra cục bộ và CI đúng SHA.

## 1. Mục tiêu của tuần theo kế hoạch

Gán vai trò và phạm vi, module `can()`, lọc dữ liệu theo phạm vi, quản lý người dùng cho ADMIN; TOTP đầy đủ theo Mục 8.4, mã khôi phục, script `admin:create` và `admin:reset-2fa`; trang nhật ký kiểm toán. ADMIN phải hoàn tất MFA trước quản trị; không có quyền đọc nội dung nghiệp vụ ngầm. Tài liệu gồm ma trận chạy thật và nháp mục bảo mật. Chưa triển khai nghiệp vụ khảo sát.

## 2. Kết quả đạt được và bằng chứng

- Policy từ chối mặc định; service lấy lại User/RoleAssignment/UserSession từ DB, kiểm purpose/MFA/thu hồi và dùng cùng filter cho list/count/detail lớp. Đã có quản lý người dùng, khóa/mở, gán vai trò/phạm vi, audit và chính sách bắt buộc MFA. [Ma trận chạy thật](../PHAN_QUYEN_TUAN_04.md).
- TOTP 6 chữ số, chu kỳ 30 giây, lệch ±1 bước, CAS chống dùng lại; secret AES-256-GCM bằng khóa riêng; 10 mã khôi phục băm dùng một lần. Phiên chờ bước hai tối đa 5 phút, không refresh. ADMIN luôn bắt buộc MFA; vai trò khác theo cấu hình.
- Ghi quản trị kiểm Origin/Host và CSRF ký gắn phiên; thao tác tạo người dùng, đổi vai trò, reset MFA người khác hoặc đổi chính sách cần TOTP mới. CLI không nhận mật khẩu qua argv; reset thu hồi phiên, credential và recovery.
- Runtime **16 model**, blueprint **39**. Migration `20261022004129_week4_rbac_mfa` deploy và diff đồng bộ. Database thử riêng có marker; sau một lần child migrate timeout, chạy lại áp dụng đủ ba migration. Không DROP/reset DB hoặc volume.
- Full `npm run check` cuối **121/121 test trong 13 file**, lint/typecheck/validate/generate/ERD qua. SQL MySQL thật **10/10**, CLI stdin thật **5/5**, build exit0. Targeted auth/MFA 53, policy/service 29 và CSRF 5 đã qua, không cộng lại vào tổng 121.
- Lượt HTTP đầu đã qua 26 ca trước khi phát hiện hai ADMIN khóa chéo đều thành công, không còn ADMIN ACTIVE trong tập fixture. Đã sửa khóa mutex trước mọi SELECT thường; kiểm service/MySQL đồng thời sau sửa có một yêu cầu thắng, còn một ADMIN ACTIVE; bên thua nhận INVALID_SESSION. **HTTP toàn bộ sau sửa qua 28/28**, có đúng một thao tác khóa chéo thành công. Hồi quy HTTP/Mailpit Tuần 3 qua 24/24.
- [QA giao diện](../QA_GIAO_DIEN_TUAN_04.md): **13 nhóm kiểm và 6 lượt trang/viewport**, đã xem sáu PNG; thiết lập TOTP, recovery, tạo/khóa/mở pending và chặn sai vai trò qua. Không lỗi JavaScript, không đổi seed, không chụp QR/secret/recovery. Những nhánh chưa thao tác UI được ghi riêng.
- Production audit **0**; full audit còn **5 high** thuộc dev chain braces→micromatch→fast-glob→ESLint. [Nghiệm thu](../NGHIEM_THU_TUAN_04.md), [ADR-005](../decisions/ADR-005-totp-va-phan-quyen.md), [nháp bảo mật](../BAO_MAT_TUAN_04.md), [5 câu bảo vệ](../GIAI_THICH/tuan-04.md) và truy vết đã có. [CI 39733168348](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39733168348) của mã `578fd96622b341b0d94228de83c4c8994449e03b` đã qua check và smoke. CI Tuần 3 không được dùng thay bằng chứng mã Tuần 4.

## 3. Đối chiếu kế hoạch

| Mục | Trạng thái | Bằng chứng và giới hạn |
| --- | --- | --- |
| Vai trò/phạm vi và can() | Hoàn thành Tuần 4 | RBAC 29, HTTP 28 list/count/detail/IDOR và UI guard |
| Quản lý người dùng ADMIN | Hoàn thành Tuần 4 | Tạo pending/khóa-mở/gán quyền/thu hồi; khóa chéo MySQL thật giữ một ADMIN |
| TOTP/QR/xác nhận/recovery/reset | Hoàn thành Tuần 4 | MFA/core 53, HTTP 28 gồm OTP/recovery đồng thời, browser setup/recovery |
| Cấu hình bắt buộc MFA | Hoàn thành Tuần 4 | Không bỏ ADMIN, role mới thu hồi phiên chưa MFA; thử chính sách trên test DB riêng |
| Hai script vận hành | Hoàn thành Tuần 4 | CLI 5 qua stdin thật; không mật khẩu trong argv/log |
| Nhật ký kiểm toán | Hoàn thành Tuần 4 | Lọc/phân trang/redaction, HTTP và UI 6 viewport |
| Migration/check/build/CI | Đạt | Runtime 16, full 121, SQL 10, HTTP 24+28, build và CI xanh |
| Tài liệu | Đã có nháp cần nhóm đọc lại | Ma trận, bảo mật, ADR005, giải thích, báo cáo, QA và sơ đồ render/hash |
| Nghiệp vụ khảo sát/CRUD danh mục | Chưa làm, đúng phạm vi | Danh mục/import Tuần 5, khảo sát/phản hồi các tuần sau |

## 4. Tiến độ lũy kế

Theo checkbox và `npm run progress`, **34/163 điểm = 20,9%**, thêm FR-07/08/10/11/12. Bằng mục tiêu lũy kế phạm vi Tuần 4; không tăng tỷ lệ theo số file/test. M1 **22/23 = 95,7%**, M2 **9/9 = 100%**.

| Module | Điểm đạt/tổng hiện tại | Tỷ lệ |
| --- | ---: | ---: |
| M1 Xác thực và phiên | 22/23 | 95,7% |
| M2 Người dùng, phân quyền, kiểm toán | 9/9 | 100,0% |
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

Tuần 4 thực hiện và nghiệm thu22/10 trong khoảng dự kiến 21–27/10. Tuần 2–3 đã thực hiện muộn; giữ lịch sử này thay vì ghi lại ngày bắt đầu. Nhóm/GVHD đối chiếu lịch thực tế trước khi kết luận đúng/chậm so với kế hoạch của trường.

## 5. Khó khăn, rủi ro và hướng xử lý

- Mock đã không phát hiện snapshot REPEATABLE READ tạo trước mutex khi dùng ORM upsert rỗng. Đã thay bằng locking INSERT đầu transaction, thêm regression thứ tự và kiểm đồng thời MySQL riêng; HTTP toàn bộ sau sửa đã qua 28/28, xác nhận chỉ một thao tác khóa chéo thành công.
- Lượt full check đầu 118/119 phát hiện biểu diễn base64url padding không chuẩn; đã buộc canonical và full cuối 121/121 qua. Không che lượt kiểm thất bại hoặc suy kết quả mới từ lượt cũ.
- MFA hiện chỉ dùng một version khóa cấu hình, chưa tự chuyển ciphertext khi xoay khóa. Giữ MFA_ENCRYPTION_KEY hiện có; không đổi khóa trực tiếp khi còn secret mã hóa bằng khóa cũ.
- Bộ chọn khoa/bộ môn tối đa 200 mỗi loại và hasMore; danh mục lớn cần tìm kiếm/phân trang bổ sung. Danh sách tài khoản/audit/lớp đã phân trang.
- Mặc định chưa có proxy đáng tin nên dùng bucket IP chung; Mailpit mới cục bộ, chưa SMTP Internet/outbox. Full audit còn 5 high dev chain; không force downgrade hay tuyên bố hệ thống hết lỗ hổng.
- Quyền/IDOR mới áp dụng chức năng đang có. Khảo sát, phản hồi, kết quả và upload phải bổ sung action/filter/test đúng tuần, chưa nhận hoàn thành BR toàn hệ thống.
- Không có dữ liệu thật, không công bố bí mật/QR/recovery trong ảnh hoặc log. Nhóm tự đọc, thử và viết lại nháp; AI không điền đóng góp sinh viên.

## 6. Kế hoạch Tuần 5

Sau khi chốt Tuần 4 và nhận lệnh: CRUD học kỳ có khóa sổ, khoa, bộ môn, môn học, lớp học phần, phân công giảng viên; import Excel/CSV với chạy thử, lỗi từng dòng và tải mẫu; hoàn thiện seed demo. Kiểm file mẫu đúng/sai và `npm run demo`, cập nhật hướng dẫn import. Không tự triển khai trước hoặc thêm mẫu phiếu/đợt khảo sát.

## 7. Phân công và đóng góp từng thành viên

**[SINH VIÊN TỰ ĐIỀN]** Tên, phần thực làm, commit/kiểm thử/ảnh hoặc thuyết minh đã tự đọc và xác minh. AI không gán tên, số giờ hay phần việc cho thành viên. Phần AI hỗ trợ ghi tại [AI_USAGE](../AI_USAGE.md).

## 8. Các bước kiểm tra nhanh cho giảng viên

1. Theo README giữ volume/`.env`, chạy migration/seed, dùng `npm.cmd run admin:create` tạo ADMIN giả rồi mở đúng APP_URL. Không có ADMIN seed cố định.
2. Đăng nhập ADMIN mới: bị buộc vào thiết lập TOTP; mở quản trị trước bước hai vẫn bị chặn. Quét QR bằng ứng dụng xác thực, xác nhận mã, lưu riêng 10 mã khôi phục rồi mới vào quản trị. Không chụp hoặc gửi các bí mật này vào báo cáo.
3. Tạo tài khoản giả với TOTP chu kỳ mới; thấy PENDING_ACTIVATION. Thử khóa/mở: tài khoản chưa có mật khẩu trở về PENDING, không tự ACTIVE. Xem vai trò/phạm vi và audit tương ứng.
4. Đăng nhập sinh viên giả, gõ URL quản trị/không gian giảng viên: bị chặn. Đối chiếu dữ liệu lớp theo tài khoản và filter phạm vi; chưa có phiếu hoặc kết quả khảo sát.
5. Đăng xuất ADMIN rồi đăng nhập lại: cần TOTP hoặc recovery chưa dùng. Mã đã dùng bị chặn; reset bằng ADMIN khác/CLI có audit và thu hồi phiên. Chỉ thử reset trên fixture riêng, giữ khóa MFA.
6. Chạy `check`, `test:integration`, `test:auth`, `test:week4`, `build`, `progress` theo README và đối chiếu [nghiệm thu](../NGHIEM_THU_TUAN_04.md). Không chạy đồng thời hai bộ HTTP dùng chung output; đối chiếu HTTP 24+28 và CI đúng SHA trong nghiệm thu; các bước bấm trên là hướng dẫn cho người kiểm, không tự chứng minh đã chạy mọi nhánh qua UI.

## 9. Bản rút gọn để dán vào hệ thống của trường — nháp dưới 150 từ

Tuần 4 thực hiện và nghiệm thu ngày 22/10/2026, trong mốc dự kiến 21–27/10. Đã có phân quyền theo vai trò/phạm vi, quản lý tài khoản, nhật ký, TOTP, mã khôi phục và cấu hình MFA. Hai script vận hành đã được kiểm qua stdin. Full check 121 test, SQL 10, CLI 5, HTTP hồi quy 24 và HTTP Tuần 4 28 tình huống đều qua; build và CI thành công. Lỗi hai ADMIN khóa chéo đã sửa và kiểm lại trên MySQL thật, giữ một ADMIN hoạt động. Giao diện desktop/mobile và sơ đồ đã kiểm. Tiến độ đạt 34/163 điểm, tương đương 20,9%. Nhóm cần đọc, thử, viết lại nháp và điền đóng góp thật. Tuần 5 dự kiến danh mục/import khi được yêu cầu.
