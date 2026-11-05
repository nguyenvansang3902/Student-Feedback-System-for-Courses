# Ma trận kiểm thử quyền và IDOR — Tuần 13

**Chốt ngày 05/11/2026:** Check/build cục bộ, UC-GOLD kiểm tay đủ các bước và [CI 41904262769](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41904262769) check/e2e/smoke của nguồn `831d14decd9d6a562a1f9ecc0a53f6a4fadc8248` đều qua. Chốt 10 FR, thêm 23 điểm: **211/219=96,3%,78/84 FR**. Giữ các giới hạn p95, audit, axe và phạm vi quét; không bắt đầu Tuần 14/UI-n.

Ngày thực hiện: **03–04/11/2026**. Phạm vi là chức năng đã hiện thực tới Tuần 12 và Điều chỉnh số 01, không mở tính năng mới hoặc giai đoạn nâng cấp UI. Oracle nghiệp vụ: [đặc tả](DAC_TA_NGHIEP_VU.md), [ma trận quyền](MA_TRAN_QUYEN.md), Mục F của [Điều chỉnh số 01](BO_SUNG_01_TAC_NHAN.md).

## 1. Bộ hồi quy bổ sung và kết quả thực chạy

```powershell
node node_modules/vitest/vitest.mjs run tests/week13-role-matrix.test.ts tests/week13-resource-idor.test.ts
```

Lượt kiểm riêng ngày 03/11/2026: **801/801 test, 2/2 tệp**, thời gian Vitest báo **377 ms**. Đây là phép kiểm Vitest, không phải thời gian đáp ứng website hay kết quả tải. Không gọi `pretest`, generate, build, reset hoặc truy cập database trong bộ này. Kết quả `check`, MySQL/HTTP, E2E và CI của toàn bộ nguồn được chốt riêng bởi phiên chính.

- `week13-role-matrix.test.ts`: **741 test**, gồm **700 ô** của **70 PolicyAction × 10 vai trò**; thêm các nhóm mất grant, scope sai/thừa ID, tài khoản không còn role, phiên tạm/đổi mật khẩu/thiếu MFA, own/foreign scope, vai trò URL khác và action chưa định nghĩa. `Record<PolicyAction, readonly Role[]>` buộc action mới phải được quyết định quyền tường minh khi typecheck. Bảng kỳ vọng được viết theo đặc tả, không suy từ đầu ra `can()`.
- `week13-resource-idor.test.ts`: **60 test** trên tài nguyên cụ thể, gồm giải trình own/foreign và người xác nhận; kiến nghị đúng đơn vị/đúng người nhận; hồ sơ và chỉ số bất thường; ba trường hợp TT kiêm GV/TBM/TK xung đột; ADMIN/ĐBCL đa vai trò; thông báo của đủ mười vai trò; ID không tồn tại và SV đổi tài khoản. Mỗi test có thể chứa nhiều assertion; không cộng assertion thành test hoặc HTTP request.

Hai bộ bổ sung **không thay thế** kiểm service/route/MySQL có sẵn. Chúng không tự chứng minh HTTP trả 404, audit đã ghi thật, file xuất đã được đọc lại hoặc danh tính đã được che ở database. Các điều kiện đó phải đối chiếu đúng lớp bằng chứng bên dưới.

## 2. Phạm vi ma trận

Mười vai trò: `SINH_VIEN`, `GIANG_VIEN`, `TRUONG_BO_MON`, `TRUONG_KHOA`, `CAN_BO_DBCL`, `LANH_DAO`, `ADMIN`, `PHONG_DAO_TAO`, `PHONG_KHAO_THI`, `THANH_TRA`.

| Nhóm chức năng | Quyền đầu vào trong ma trận 70 action | IDOR/dữ liệu có kiểm riêng | Bộ đã có cần chạy hồi quy cùng nguồn |
| --- | --- | --- | --- |
| Không gian vai trò, danh mục, người dùng, grant, MFA, audit | Mỗi action ×10; ADMIN cần MFA; chỉ PĐT ghi dữ liệu đào tạo; ADMIN chỉ tổ chức | SV/GV own, TBM bộ môn, TK khoa; URL vai trò khác; quyền bị thu hồi | `rbac-policy`, `rbac-services`, `catalog-services`, `import-services`, `verify-week4.ts`, `verify-week5.ts` |
| Mẫu phiếu | Chỉ ĐBCL list/read/write | ID đọc/sửa/khóa/nhân bản/phiên bản/mặc định; chín vai trò khác bị chặn | `templates`, `templates-csrf`, `verify-week6.ts` |
| Đợt/xác nhận/phê duyệt/tiến độ | ĐBCL quản lý, PĐT xác nhận, LĐ duyệt; ADMIN không nhận quyền ngầm | Revision, khóa kỳ, readiness, cảnh báo lệch, nhiệm vụ chốt | `campaign-services`, `campaign-readiness`, `campaign-lifecycle`, `verify-week7.ts`, `verify-week7-settings.ts` |
| Sinh viên nộp phiếu | Chỉ grant SV hợp lệ; mọi phiên chưa đủ điều kiện bị chặn | Task của chính SV, task ID khác/không tồn tại, body không chọn studentId | `student-surveys`, `student-survey-privacy`, `student-survey-body`, `verify-week8.ts` |
| Kết quả và PENDING | Quyền lớp riêng với quyền Khảo thí; chỉ ĐBCL tổng hợp/công bố/kiểm duyệt | Own/foreign; trước công bố; thiếu mẫu; KT không lớp/GV/tự luận; PENDING có audit riêng | `survey-results-read`, `survey-results-mutations`, `survey-reminders`, `verify-week9.ts` |
| Phản hồi và tệp | SV tạo/đính kèm; người xử lý phải đúng hàng đợi; ADMIN bị chặn | Chủ phản hồi/người nhận/ID khác, mất phân công, tải tệp, giả đuôi/traversal, phản hồi chuyển TT | `feedback-core-access`, `feedback-attachments`, `attachment-routes`, `attachment-storage`, `verify-week10.ts` |
| Thanh tra | LĐ chỉ mức tóm tắt; TT đầy đủ khi không xung đột; ADMIN/ĐBCL kể cả đa vai trò bị chặn | GV/TBM/TK kiêm TT, phân công thay đổi, ID lạ, xem/tải phải audit, hai mức danh tính | `feedback-core-access`, `inspection-workflow`, `inspection-first-access`, `verify-week10.ts`, `verify-week11-inspection.ts` |
| Giải trình và kiến nghị | GV gửi, TBM xác nhận; KT gửi kiến nghị, TBM nhận mới trả lời | Own/foreign, tự xác nhận, mất phân công, đổi người nhận/đơn vị | `improvement-workflows`, `verify-week11-workflows.ts`, `week13-resource-idor` |
| Thông báo/email | Cả mười vai trò chỉ nhận phần còn được phép | Không dùng notification làm vé cấp quyền; ID lạ, scope/recipient thu hồi, hồ sơ xung đột, SV khác | `notification-access`, `notifications`, `verify-week11-notifications.ts`, `week13-resource-idor` |
| Dashboard/xuất file/cảnh báo | Mười vai trò có báo cáo khác nhau; cấu hình thuộc ĐBCL; chỉ TT xem chỉ số không xung đột | Vai trò được chọn giữ scope riêng; ADMIN chỉ vận hành; ba vai trò mới không định danh; thiếu mẫu/tổng có thể suy ngược bị che | `reports-services`, `reports-route`, `reports-export`, `survey-anomalies`, `verify-week12-reports.ts`, `verify-week12-anomalies.ts`, `verify-week12-exports.ts` |

## 3. Chín mã bắt buộc của Điều chỉnh số 01

Bảng bên dưới ánh xạ điều kiện theo mã. [Manifest runtime](assets/tuan-13/runtime-regression.json) đã tổng hợp **227 nhóm qua trong 15 bộ**, gồm 217 nhóm MySQL/HTTP/service và 10 nhóm parser tệp; thêm **demo 19/19**, đủ **9/9 mã có bằng chứng runtime**. Không cộng mã yêu cầu, nhóm, request và test Vitest thành một tổng.

| Bộ | Nhóm qua |
| --- | --- |
| Tuần 4 / Tuần 5 / Tuần 6 | 29 /23 /20 |
| Tuần 7 / cấu hìnhTuần 7 | 19 /13 |
| Tuần 8 / Tuần 9 / Tuần 10 | 17 /12 /19 |
| Tuần 11: phản hồi / Thanh tra / workflow / thông báo | 14 /7 /12 /10 |
| Tuần 12: báo cáo / bất thường / parser tệp xuất | 13 /9 /10 |
| **Tổng 15 bộ** | **227** |
| Demo/seed, đếm riêng | **19** |

Manifest runtime ghi fingerprint khi tổng hợp, không phải snapshot bất biến riêng từng lượt. Các bộ Tuần 4–7 có lượt trước sửa khóa cuối; Tuần 8 trở đi kiểm đường thay đổi. [Check/build sau sửa harness](assets/tuan-13/check-build-after-calendar.json) và [CI nguồn831d14d](assets/tuan-13/ci-source-831d14d.json) đều qua; FR-160/TC-ALL-01 đã nghiệm thu. HTTP đúng build mới chưa chạy lại là giới hạn bổ sung. Main kiểm riêng 45 bảng/1.575 người dùng,9.709 bản ghi giữ hash trước scheduler; không áp dụng migration mới, không seed/reset/đổi credential/MFA.

| Mã | Bộ kiểm runtime hiện có và điều kiện chính | Bổ sung Tuần 13 / giới hạn |
| --- | --- | --- |
| TC-PDT-01 | `npm run test:week5`: ADMIN tạo/sửa lớp và import bị từ chối, PĐT thành công; audit actor đúng. `test:week6` giữ giới hạn mẫu phiếu | Matrix 70 action kiểm riêng dữ liệu đào tạo/tổ chức và imports ở đủ 10 vai trò. Chính matrix không ghi database |
| TC-PDT-02 | `npm run test:week7`, `npm run test:week7:settings`, `npm run test:demo`: RS-01–06; RS-01/02/03 chặn, cảnh báo cần ghi chú, không xác nhận khi còn chặn | Quyền `campaigns:confirm` chỉ PĐT; readiness/snapshot phải kiểm runtime |
| TC-PDT-03 | Hai bộ Tuần 7: xác nhận→đổi đăng ký→mở; hash lệch/cảnh báo; task theo lúc chốt và giữ sau mở; ensure đồng thời | Không thay scenario bằng assertion policy; queue/SMTP phải kiểm trong bộ settings |
| TC-KT-01 | `npm run test:week9` và `npm run test:week12`: nhóm cờ đã công bố, ≥2 GV có LIKERT hợp lệ, đủ mẫu; không lớp/GV/TEXT; một GV không đạt | Matrix tách `results:assessment` khỏi `results:read`; chọn vai trò báo cáo không cộng scope; DTO/tệp kiểm qua bộ Tuần 12 |
| TC-KT-02 | `npm run test:week10`, `npm run test:week11`: đúng hàng đợi thi, không lộ danh tính, lời nhắc phúc khảo, SLA/chuỗi KT→ĐBCL→LĐ | Matrix không suy quyền KT từ loại kiểm tra thành phần; notification không mở dữ liệu ngoài quyền |
| TC-TT-01 | Bộ Tuần 10/11/12: GV/TBM/TK liên quan kể cả kiêm TT bị loại list/count/detail/assign/download, ID trả 404, conflict động trước gộp | Bổ sung ba tổ hợp TT+GV/TBM/TK ở tài nguyên và thông báo; có đối chứng lớp khác không xung đột |
| TC-TT-02 | Bộ Tuần 10/11: ADMIN/ĐBCL chặn; LĐ summary; TT đầy đủ; audit mở/tải, không dùng thông báo để vượt quyền | Bổ sung matrix 10 vai trò và ADMIN/ĐBCL đa vai trò; audit/tóm tắt phải kiểm bytes/DB bằng bộ runtime |
| TC-TT-03 | Bộ Tuần 10/11: `AN_DANH_HOAN_TOAN` và `CHO_THANH_TRA_BIET`; chỉ TT hợp lệ thấy danh tính khi cho phép, có audit; không cho người bị phản ánh | Không tự tạo test policy thay kiểm field danh tính; giữ bằng chứng runtime hai mức |
| TC-ALL-01 | `npm run check`; hồi quy Tuần 4–12 và `npm run test:e2e`: quyền, IDOR, refresh rights, CSRF/attachments, 10 dashboard, dữ liệu đủ/thiếu mẫu | Bổ sung 801 test; BR-67 cần cả DTO thật, parserCSV/XLSX/PDF và ngưỡng của ba vai trò mới. Không nhận thử đủ mọi tổ hợp dữ liệu/thiết bị |

## 4. Các giới hạn phải giữ khi nghiệm thu

1. 700 ô matrix là **toàn bộ action khai báo tại mốc hiện tại**, không phải toàn bộ trạng thái dữ liệu, thời điểm, phân công, grant kết hợp hoặc mọi route HTTP có thể tồn tại. Typecheck buộc cập nhật oracle khi thêm action nhưng không tự phát hiện route mới bỏ qua service.
2. Một test mã TC có thể trải qua nhiều bộ runtime. Không cộng một mã ở nhiều tuần thành nhiều yêu cầu đã đạt. Chín mã chỉ được chốt khi điều kiện của từng mã đã chạy trên nguồn bàn giao, không dựa riêng vào tên test hoặc tài liệu.
3. Thống kê/file xuất là dữ liệu gộp không định danh trong phạm vi ứng dụng và ngưỡng hiện có; chưa chứng minh chống mọi phép suy luận qua nhiều lần đọc hoặc thay đổi tập dữ liệu. Không tuyên bố chống DBA, log hạ tầng hoặc tự tiết lộ.
4. Không thay credential/MFA chủ dự án; fixture giả ở database kiểm riêng. Những tệp `.local` có thể chứa cấu hình/bằng chứng riêng không được đưa vào Git chỉ để làm bằng chứng công khai.

## 5. Hồi quy giới hạn yêu cầu nộp phiếu

Rà soát NFR-08/BR-33 phát hiện route POST nộp phiếu chưa có budget request dù đã có giới hạn body, CSRF và transaction chống trùng. Đã thêm bộ đếm MySQL hiện có, dùng khóa băm từ userId và miền riêng `survey-submit-user`, không đưa taskId, sessionId, IP hoặc nội dung phiếu vào khóa. Actor/quyền/Origin/CSRF và route/query phải hợp lệ trước khi tiêu budget; budget được kiểm trước đọc body hoặc gọi service. Vì vậy task không có thật, body sai và lỗi nghiệp vụ cũng không giúp tài khoản vượt giới hạn bằng cách đổi task/phiên.

Mặc định **30 request trong 60 giây; khóa 60 giây khi vượt**, cấu hình qua `SURVEY_SUBMIT_REQUEST_LIMIT`, `SURVEY_SUBMIT_WINDOW_SECONDS`, `SURVEY_SUBMIT_LOCK_SECONDS` trong `.env.example`; Zod chặn 0, số âm, không nguyên/không phải số và vượt miền. Mỗi sinh viên có budget riêng, không khóa chung các sinh viên dùng cùng IP. Mọi quyền sở hữu/task và transaction nộp một lần ở service vẫn được kiểm như trước. Bộ đếm không ghi nội dung phiếu, không thêm liên kết phiếu–tài khoản vào SurveyResponse/SurveyAnswer và không xuất khóa ra HTTP/log.

`tests/week13-survey-submit-rate.test.ts` có **9 test**. Lượt tái hiện trước sửa: sau 30 request hợp lệ, request 31 vẫn đọc body hỏng và trả 400, thay vì bị chặn 429 trước body. Sau sửa: request 31 trả 429 chung, không gọi reader/service; đổi task, phiên và header IP không tạo budget mới. Kiểm các gate bị từ chối không tiêu budget; body hỏng vẫn tiêu; cửa sổ/khóa hết hạn cấp lại budget. Kiểm đơn vị mô phỏng service giữ 1 thành công+19 x 409 trong 20 request và 200 user cùng IP không chặn nhau; **hai phép mô phỏng này không thay số đo tải/concurrency trên MySQL thật**.

Lệnh kiểm riêng:

```powershell
node node_modules/vitest/vitest.mjs run tests/week13-survey-submit-rate.test.ts tests/student-survey-privacy.test.ts tests/auth-limits.test.ts tests/auth-rate-limit.test.ts tests/student-survey-body.test.ts tests/student-surveys.test.ts
```

Kết quả lượt 03/11/2026: **63/63 test trong 6 tệp**,848 ms; ESLint các tệp sửa qua. Fixture privacy chỉ thêm mô phỏng rate bucket; assertion ẩn danh/log/DTO giữ nguyên. HTTP/MySQL Tuần 8 ngày 04/11 đã qua **17/17 nhóm**, request 31 trả 429 trước parser, đổi task không vượt budget, Origin/CSRF sai không tạo bucket và dữ liệu vẫn một phiếu/sáu đáp án. Fullcheck cuối đã qua ngày 04/11 theo manifest; không dùng riêng bộ unit/nhóm runtime để tự chứng nhận đóng mọi điều kiện nghiệm thu.
