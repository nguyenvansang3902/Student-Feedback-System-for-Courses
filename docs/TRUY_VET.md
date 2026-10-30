# Bảng truy vết yêu cầu — Tuần 9 sau Điều chỉnh số 01

Chỉnh giao diện 30/10/2026 theo yêu cầu người dùng, liên quan FR-01/50/54: bỏ slogan thừa và ví dụ trong ô đăng nhập, dùng tiêu đề chức năng; không đổi chính sách hay luồng nộp. Check 646/646, QA 5 nhóm/8 bố cục qua. [Bằng chứng và ảnh mới](CHINH_SUA_GIAO_DIEN_2026_10_30.md); kiểm HTTP và CI smoke dùng tiêu đề mới, bằng chứng Tuần 8 cũ giữ nguyên.

Tuần 4 thực hiện từ **22/10/2026**, mốc kế hoạch giả định **21–27/10/2026**. Tuần 3 làm **21–22/10**, sau mốc 14–20/10; bằng chứng lịch sử Tuần 2 giữ ngày thực hiện 21/10. Nguồn mã/ưu tiên: [đặc tả](DAC_TA_NGHIEP_VU.md), [YEU_CAU](YEU_CAU.md); tiến độ chính thức ở [PROGRESS](PROGRESS.md).

**Cách đọc mốc lịch sử trước điều chỉnh:** Tuần6 bắt đầu22/10, tiếp tục28/10 (mốc giả định04–10/11). FR-01–08/10–12/20–22/30–35/101/102 đã nghiệm thu trong phạm vi mã hiện có. Tiến độ62/163=38,0%. Không nhận quyền toàn hệ thống hoàn tất khi module nghiệp vụ chưa triển khai. WF là wireframe tĩnh, không thay chức năng thực.

Điều chỉnh số01 thêm 21 FR và 19 BR theo [prompt nguyên văn](BO_SUNG_01_TAC_NHAN.md). Mẫu số mới 219; số 62/163 phía trên giữ nguyên tại mốc nghiệm thu Tuần6. Bằng chứng Tuần1–6 dưới đây có trước điều chỉnh: kiểm bảy vai trò không thay kiểm mười vai trò. G1 đã hoàn tất quyền/dữ liệu nền/mẫu; người dùng sau đó yêu cầu tiếp tục tuần kế và tiếp tục Tuần7. Phiên29/10 triển khai theo lệnh tự nhiên đó, không ghi nhận đã gõ câu lệnh nguyên văn. Bằng chứng mới ở mục4.4. Ma trận chi tiết: [MA_TRAN_QUYEN](MA_TRAN_QUYEN.md).

## 1. Bằng chứng lịch sử Tuần 2 tại thời điểm nghiệm thu

| Đầu ra                      | File / kiểm tra                                                                                                                | Phạm vi đã kiểm và giới hạn                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema runtime              | `prisma/schema.prisma`, migration `20261021160354_week2_users_catalog`                                                         | 9 bảng nền, 11 FK Restrict, 3 CHECK; migrate dev chạy lại đồng bộ; chưa giao diện chức năng                                                                                               |
| MySQL tích hợp              | `scripts/verify-database.mjs`, W2-DB-01–10                                                                                     | 10/10 qua trên MySQL thật; fixture rollback; không thay kiểm quyền/BR của service                                                                                                         |
| Thiết kế ẩn danh 5.6a       | `tests/schema-anonymity.test.ts`, `tests/helpers/schema-anonymity.ts`                                                          | DMMF, graph hai chiều, whitelist/kind/type/đích quan hệ, UUID/DATE; không thay 5.6b/c/d                                                                                                   |
| Parity và shadow            | Cùng file test; `prisma/database-urls.ts`                                                                                      | So scalar/enum/quan hệ nền/PK/unique; từ chối main và shadow cùng DB; kiểm thủ công prepare 6/6 qua: sai cổng/mật khẩu/endpoint/cùng DB/marker server bị chặn, cấu hình đúng chạy lại qua |
| Chất lượng sau vá phụ thuộc | `npm run check`, `npm run build`                                                                                               | 14/14 Vitest (13 schema/guard + 1 health), validate/generate/ERD/lint/typecheck và build qua trên Prisma 7.10.1                                                                           |
| Tài liệu và bố cục          | Sơ đồ/ERD, 18 WF, Chương 2–3                                                                                                   | Thiết kế; gallery sơ đồ [SO_DO_DA_RENDER](SO_DO_DA_RENDER.md); không chứng minh chức năng thực                                                                                            |
| CI mã Tuần 2                | [CI 39634835024](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39634835024), `723e165` | Cả check và smoke thành công; migration/deploy/diff, MySQL, check/build và HTTP dev trên Linux                                                                                            |

## 1.1. Bằng chứng Tuần 3

| Đầu ra | File / kiểm tra | Kết quả và giới hạn |
| --- | --- | --- |
| Auth runtime | Auth/recovery services, helpers/policy/route | Login/logout/change/reset/activate/rate, cookie/Origin và thu hồi phiên qua HTTP thật |
| DB hiện tại | Runtime13/blueprint 39, migration `20261021165346_week3_auth_sessions` | Thêm UserSession/AuthToken/RateLimitBucket/AuditLog; sửa collation/FK bốn bảng mới rỗng, status/diff đồng bộ; clean migration Linux qua |
| Full check | 8 file Vitest, validate/generate/ERD/lint/typecheck | **61/61**: core27, recovery18, schema13, limits2, health1; không cộng lượt targeted hai lần |
| SQL/HTTP | `scripts/verify-database.mjs`, `scripts/verify-auth.ts` | SQL **10/10**, auth HTTP/MySQL/Mailpit **24/24**; reset đồng thời thật, refresh race chỉ unit/mock, HTTP có rotation/replay |
| UI/sơ đồ | [QA](QA_GIAO_DIEN_TUAN_03.md), [SVG/hash](SO_DO_XAC_THUC.md) | 10 route/viewport, bàn phím, login/logout và browser reset qua; 3/3 SVG render/xem ảnh, 6/6 hash khớp |
| Build/CI | [CI 39642730208](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39642730208), `43b937e` | Build exit0; CI check+smoke xanh. Production audit 0, full audit còn 5 high dev ESLint chain |

## 1.2. Bằng chứng Tuần 4

| Đầu ra | Bằng chứng | Kết quả và giới hạn |
| --- | --- | --- |
| MFA/core | Auth/MFA 53 targeted trong full 121 | TOTP, AES, purpose, replay/recovery, rate và centralresetguard; không cộng test hai lần |
| Policy/quản trị | RBAC 29 targeted trong full 121 | Matrix 13/service 16, scope và freshDBguard; ADMIN không ngầm có quyền nghiệp vụ |
| Giao thức/thực thi | CLI 5, HTTP hồi quy24, HTTP Tuần 4 28 | TOTP/recovery và ADMIN khóa chéo đồng thời thật; CSRF, expiry, policy, reset, filter/IDOR và redaction qua |
| Migration/SQL | Runtime 16/blueprint 39, SQL 10 | Ba migration áp dụng sạch trên DB thử/CI Linux; main giữ dữ liệu, diff đồng bộ |
| UI/sơ đồ | [QA](QA_GIAO_DIEN_TUAN_04.md), [ERD](SO_DO_TUAN_04.md) | UI 13nhóm/6 viewport,6PNG; ERD khối 4 render/hash mới,3 khối giữ hash lịch sử |
| CI/build | [CI 39733168348](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39733168348) của mã `578fd96622b341b0d94228de83c4c8994449e03b` đã qua check và smoke | Full121/lint/typecheck/ERD/build qua; audit production0/full5high dev |

## 1.3. Bằng chứng Tuần5

| Đầu ra | Bằng chứng | Kết quả và giới hạn |
| --- | --- | --- |
| Danh mục/import | [nghiệm thu](NGHIEM_THU_TUAN_05.md), [hướng dẫn](HUONG_DAN_IMPORT.md) | HTTP22/22 và SQL10/10; previewreadonly, ghi nguyên tử, kiểm lại quyền/kỳ khóa, thư Mailpit |
| Seed | demo services, verify-demo.ts | MySQL9/9; medium1.500SV/120lớp/78phiếu/234đáp án/6phản hồi, giữ seed cũ và chặn production |
| Quyền làm trước | Lệnh người dùng ngày22/10/2026 | Chỉ dữ liệu seed khảo sát/phản hồi;31runtime/39blueprint không có nghĩa hoàn thành các FR tuần6–11 |
| Giao diện/sơ đồ | [QA](QA_GIAO_DIEN_TUAN_05.md), [sơ đồ](SO_DO_TUAN_05.md) | 13nhóm/10viewport,10PNG đã xem;4thânMermaid khớp,4SVG nhãn31 đã raster/xem |

[CI 39775473219](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39775473219) của mã `a844f3f2f9fdcd8a71ef5587358c8446075b5294` đã qua cả `check` và `smoke`. Pipeline gồm migration/diff, SQL10, HTTP auth24, CLI5/HTTP28, HTTP Tuần5 22, seed9, full219 và build. CI main/tài liệu cuối đối chiếu SHA trong Actions.

## 1.4. Bằng chứng Tuần6

| Đầu ra | Bằng chứng | Kết quả và giới hạn |
| --- | --- | --- |
| Mẫu phiếu | [Nghiệm thu](NGHIEM_THU_TUAN_06.md), templates.ts, template-input.ts | FR30–35: đủ năm loại, thứ tự ba cấp, trọng số/bắt buộc/NA, phiên bản/khóa/nhân bản/mặc định; chỉ ĐBCL GLOBAL |
| MySQL/HTTP | scripts/verify-week6.ts, tests/templates.test.ts | HTTP20/20: CAS lưu/khóa chỉ một thắng, tạo phiên bản đồng thời2/3, cây cũ và phiếu bất biến; bảy vai trò/IDOR/Origin/CSRF/giới hạn stream/audit |
| Preview/UI | [QA](QA_GIAO_DIEN_TUAN_06.md) | 14nhóm/10viewport/10PNG,0JSerror/overflow/thiếu nhãn, fixture dọn/seed nguyên. UI409 giả lập bằng tăng revision fixture DB; HTTP tranh chấp thật kiểm riêng. Preview không POST/localStorage/phiếu mới |
| Seed/migration | verify-demo.ts, migration20261022125000, [sơ đồ](SO_DO_TUAN_06.md) | Seed11/11, mẫu mặc định họ mới đủ5loại; giữ cây/ID mẫu cũ,78phiếu/3kết quả/4tài khoản khi nâng cấp. Thêm revision/updatedAt,31runtime/39blueprint |
| Chất lượng/CI | [CI40633183047](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40633183047), commit68087ed7ecc68028ac78475696f4ee69a5d2e056 | Check279/24file, build16.4.3, SQL10, hồi quyHTTP24+28+22/CLI5; check/smoke xanh. Audit full/production0. Main cuối đối chiếu đúng SHA trong Actions |

BR-05 đã kiểm bảo vệ mẫu khóa/được đợt đã duyệt tham chiếu và tạo phiên bản mới. Workflow trình/duyệt đợt tự khóa mẫu trong cùng transaction vẫn thuộc Tuần7. Không có chức năng đợt, nộp phiếu hoặc kết quả mới chỉ vì seed có dữ liệu tương lai.

## 2. FR đã nghiệm thu ở mốc lịch sử Tuần 1–6

| Mã     | Tuần | Màn hình / luồng thật          | Service / policy hiện có | Test                   | Bằng chứng                                                                                                                                                                                                                               | Trạng thái                                     |
| ------ | ---- | ------------------------------ | ------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| FR-102 | 1    | `/suc-khoe`, `GET /api/health` | `src/lib/health.ts`      | `tests/health.test.ts` | [CI Tuần 1 36961609369](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36961609369), nghiệm thu Windows 02/10 và health test trong lượt check mới; API trả `database: not_checked`, DB kiểm riêng | Hoàn thành FR-102; không nâng phạm vi endpoint |
| FR-01 | 3 | `/dang-nhap` → `/tai-khoan` | `services/auth.ts`, `policies/auth.ts` | JWT/password, login throttle unit; HTTP01–04/22–23 | Đăng nhập mã/email, cookie và UI login thật; [nghiệm thu](NGHIEM_THU_TUAN_03.md) | Hoàn thành trong phạm vi Tuần 3 |
| FR-02 | 3 | Cookie phiên, refresh/logout | `auth.ts`, `auth/session.ts`, `auth/http.ts` | Session unit + HTTP05–09/21 | Rotation/replay/logout và khóa User vô hiệu access/refresh; [nghiệm thu](NGHIEM_THU_TUAN_03.md) | Hoàn thành trong phạm vi Tuần 3 |
| FR-03 | 3 | `/doi-mat-khau` | `auth.ts::changePassword`, policy own action | Session/security unit; HTTP11–13 | Đổi mật khẩu thu hồi mọi phiên, mật khẩu cũ bị từ chối; [nghiệm thu](NGHIEM_THU_TUAN_03.md) | Hoàn thành trong phạm vi Tuần 3 |
| FR-04 | 3 | `/quen-mat-khau`, `/dat-lai-mat-khau`, Mailpit | `account-recovery.ts`, `lib/mail.ts` | Recovery unit; HTTP14–17; browser reset E2E | Hash/expiry/one-use, race reset MySQL và thư Mailpit; [nghiệm thu](NGHIEM_THU_TUAN_03.md) | Hoàn thành trong phạm vi Tuần 3 |
| FR-05 | 3 | `/kich-hoat`, `/doi-mat-khau` | Recovery/auth services, workspace guard | Recovery/session unit; HTTP10/18–20 | PENDING→ACTIVE, mật khẩu tạm buộc đổi; activation UI token chưa kiểm bằng browser; [nghiệm thu](NGHIEM_THU_TUAN_03.md) | Hoàn thành trong phạm vi Tuần 3 |
| FR-06 | 3 | Lỗi auth/email và khóa tạm | `auth/rate-limit.ts`, `limits.ts`, auth/recovery services | Rate/login-race/limits unit; HTTP23 | 5 lần sai bằng mã/email vẫn chung bucket tài khoản; lần sau đúng bị429; [nghiệm thu](NGHIEM_THU_TUAN_03.md) | Hoàn thành trong phạm vi Tuần 3 |
| FR-07 | 4 | TOTP setup/verify/recovery/reset và CLI | mfa.ts, mfa-crypto.ts, admin-console.ts | MFA 53 unit, HTTP 28, CLI 5, browser setup/recovery | QR/secret mã hóa/one-use/purpose, reset và thu hồi; [nghiệm thu](NGHIEM_THU_TUAN_04.md) | Hoàn thành Tuần 4 |
| FR-08 | 4 | Chính sách hai bước | services/mfa-policy.ts, auth/mfa-policy.ts | HTTP 28 policy+revoke, RBAC/MFA unit | ADMIN luôn bắt buộc, vai trò khác theo cấu hình; [nghiệm thu](NGHIEM_THU_TUAN_04.md) | Hoàn thành Tuần 4 |
| FR-10 | 4 | Quản trị tài khoản/vai trò/phạm vi | services/users.ts, access.ts, can.ts | HTTP 28, CLI 5, RBAC 29, UI | Tạo pending/khóa-mở/gán phạm vi, một ADMIN còn hoạt động khi khóa chéo; [nghiệm thu](NGHIEM_THU_TUAN_04.md) | Hoàn thành Tuần 4 |
| FR-11 | 4 | Workspace theo vai trò và lớp theo scope | policies/can.ts, access.ts, workspace.ts | Matrix 13/service 16, HTTP 28, UI role guard | Deny default, list/count/detail và các ID route trong phạm vi đã có; [nghiệm thu](NGHIEM_THU_TUAN_04.md) | Hoàn thành Tuần 4 |
| FR-12 | 4 | Xem/lọc AuditLog | services/audit.ts, can.ts | RBAC unit, HTTP 28, UI desktop/mobile | Phân trang/lọc/UTC+7 và allowlist summary; không bí mật; [nghiệm thu](NGHIEM_THU_TUAN_04.md) | Hoàn thành Tuần 4 |
| FR-20 | 5 | /danh-muc/hoc-ky,khoa,bo-mon,mon-hoc,lop-hoc-phan,phan-cong | services/catalog.ts, can.ts, access.ts | catalog-services + catalog-csrf; W5-HTTP01–06/17–20, UI | CRUD/khóa sổ/IDOR/mutex/freshguard; [nghiệm thu](NGHIEM_THU_TUAN_05.md) | Hoàn thành Tuần5 |
| FR-21 | 5 | /danh-muc/nhap-lieu → chạy thử → xác nhận; Mailpit | services/imports.ts, import-file.ts, catalog mutex | import-file/import-services; W5-HTTP08–19/21–22, UI CSV | 4loại CSV/XLSX, không ghi ở preview, lỗi dòng, token ràng buộc tệp/phiên, account pending+thư; [hướng dẫn](HUONG_DAN_IMPORT.md) | Hoàn thành Tuần5 |
| FR-22 | 5 | Tải mẫu CSV/XLSX cho4loại | imports.ts::downloadImportTemplate, import-file.ts | parser/template tests; W5-HTTP07; UI tải8tệp | Mẫu đúng header +1dòng giả phải thay, Origin/CSRF áp dụng khi upload; [QA](QA_GIAO_DIEN_TUAN_05.md) | Hoàn thành Tuần5 |
| FR-101 | 5 | npm run db:seed / npm run demo | demo-seed.ts, demo-survey-seed.ts, console policy | demo-survey-seed tests + scripts/verify-demo.ts9nhóm MySQL | 3size,2đợt/phiếu/kết quả/6phản hồi, dữ liệu tương lai được user cho phép; không tính các FR nghiệp vụ chưa làm | Hoàn thành Tuần5 |
| FR-30 | 6 | /mau-phieu/moi và /mau-phieu/:id | services/templates.ts, template-input.ts, can.ts | templates38, HTTP20, UI14 | Nhóm/câu/lựa chọn, thứ tự ba cấp và lưu/đọc/sửa; [nghiệm thu](NGHIEM_THU_TUAN_06.md) | Hoàn thành Tuần6 |
| FR-31 | 6 | Trình soạn và xem trước đủ loại | template-input.ts, templates.ts, template-preview.tsx | templates38, HTTP20, UI14 | 5loại, Likert1–4/1–5, trọng số4sốlẻ, bắt buộc/NA, validation; [QA](QA_GIAO_DIEN_TUAN_06.md) | Hoàn thành Tuần6 |
| FR-32 | 6 | Khóa một chiều/tạo phiên bản mới | templates.ts, mutex/CAS, revision migration | BR-05 unit, HTTP20/MySQL race, UI14 | Bản khóa/đã duyệt/có đáp án chặn sửa, cây mới độc lập; workflow phê duyệt tự khóa chờ Tuần7 | Hoàn thành phạm vi Tuần6 |
| FR-33 | 6 | /mau-phieu/:id/xem-truoc | templates.ts::getTemplate, template-preview.tsx | HTTP20 SSR không ghi, UI14 | Thử đủ loại/bắt buộc/NA, xóa/tải lại mất lựa chọn; không POST/localStorage/task/response/answer mới | Hoàn thành Tuần6 |
| FR-34 | 6 | Nhân bản mẫu phiếu | templates.ts::cloneTemplate | templates38, HTTP20, UI14 | Họ mới/v1, UUID cây mới, sửa bản sao không đổi nguồn | Hoàn thành Tuần6 |
| FR-35 | 6 | Dùng/chọn mẫu mặc định | templates.ts, seed-template-default.ts | seedunit12, MySQL11, HTTP20, UI14 | Tiếng Việt đủ5loại/2thang; chỉ một mặc định, seed lại giữ lựa chọn tùy chỉnh và cây cũ | Hoàn thành Tuần6 |

## 3. FR đang triển khai hoặc còn ở mức thiết kế

FR đã nghiệm thu trước điều chỉnh được ghi ở mục2. FR-20–22 hiện chuyển chủ sở hữu: PĐT dữ liệu đào tạo/import, ADMIN khoa/bộ môn; kiểm quyền mới truy vết FR-140/141 và TC-PDT-01. Bằng chứng Tuần5 vẫn giữ đúng thời điểm và không tự chứng minh quyền mới. Các dòng tương lai vẫn chưa hoàn thành; ba FR G1 và các FR Tuần7 có bằng chứng riêng dưới đây/mục4.4. Schema hoặc thiết kế không thay giao diện/service nghiệp vụ.

| Mã FR  | Tuần dự kiến | Wireframe / luồng thiết kế                                                     | Miền service/policy dự kiến                                  | Test nghiệm thu FR                                                                                 |
| ------ | ------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| FR-09  | P2, chưa xếp | [WF-01](wireframes/tuan-02.html#wf-01)                                         | phiên/thiết bị; chưa triển khai                              | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-40 | 7 | /dot-khao-sat/moi và /dot-khao-sat/:id | campaigns.ts::createCampaign/updateCampaign, campaign-input.ts, can.ts | Unit campaign-services; W7-HTTP04/14 kiểm bốn phạm vi và CAS; bảng bằng chứng mục4.4 |
| FR-41 | 7 | GLOBAL/FACULTY/DEPARTMENT/SECTIONS | campaign-input.ts, campaigns.ts, campaign-readiness.ts | W7-HTTP04: đúng lớp hiện tại, paging, chặn lớp khác kỳ và payload sai scope |
| FR-42 | 7 | ĐBCL trình → PĐT xác nhận → lãnh đạo duyệt/từ chối | campaigns.ts::performCampaignAction, khóa mẫu cùng transaction | W7-HTTP05–07/13/16, campaign-services; lý do, vòng xác nhận mới, duyệt muộn mở ngay |
| FR-43 | 7 | Chốt lớp/nhiệm vụ khi mở | campaign-lifecycle.ts::advanceCampaignState, campaign-readiness.ts | W7-HTTP08/09:20ensure, hash lệch chốt hiện tại, đăng ký sau mở không đổi task |
| FR-44 | 7 | Scheduler và ensure qua list/detail/action | scripts/scheduler.ts, campaign-lifecycle.ts, campaigns.ts | W7-HTTP08/12/15/16: CLI thật, first access, catch-up OPEN→CLOSE/giờ thật, lặp an toàn |
| FR-45 | 7 | Gia hạn/đóng sớm/hủy/rút trước mở | campaigns.ts, campaign-notifications.ts, mail.ts | W7-HTTP11–13; W7-SETTINGS10–12: reason/state, queue/dedup, SMTP/backoff/lease; giới hạn SMTP mục4.4 |
| FR-46 | 7 | /dot-khao-sat/:id, tiến độ theo lớp | campaigns.ts::getCampaignProgress, SurveyTask groupBy | W7-HTTP10:4task/1DONE=25%, paging, không định danh SV/phiếu/đáp án, PĐT403 |
| FR-47  | 9            | [WF-08](wireframes/tuan-02.html#wf-08)                                         | nhắc chưa hoàn thành; chưa triển khai                        | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-50 | 8 | /khao-sat, [WF-04](wireframes/tuan-02.html#wf-04) | student-surveys.ts::listStudentSurveys; can.ts; survey-list.tsx | Unit/HTTP taskown/list/count/paging/IDOR; gate cuối mục4.5 đã qua |
| FR-51 | 8 | /khao-sat/:taskId, [WF-05](wireframes/tuan-02.html#wf-05) | getStudentSurvey, student-survey-input.ts, survey-form.tsx | Năm loại/cả hai thang/NA/bắtbuộc, server kiểm lại; unit/HTTP, QA cuối mục4.5 |
| FR-52 | 8 | Form/nháp cục bộ | survey-draft.ts, survey-form.tsx, logout-button.tsx | Unit whitelist/version/quota/retention, epoch/đa tab/clock; QA cuối mục4.5 đã qua |
| FR-53 | 8 | POST /api/student-surveys/:taskId/submit | submitStudentSurvey: CAS task+response+answers cùng transaction, DATE Việt Nam | HTTP20POST chỉ1success/19x409, duplicate/frozen; rollback/DTO/log và gate cuối mục4.5 |
| FR-54 | 8 | /khao-sat/:taskId/da-nop | survey-confirmation.tsx, getStudentSurvey; POST chỉ status/day | PENDING chuyển form, DONE template=null, không đọc/ID/bản sao phiếu; mất phản hồi đọc lại task, QA cuối mục4.5 |
| FR-60  | 9            | [WF-10](wireframes/tuan-02.html#wf-10)                                         | results / aggregation / công bố; chưa triển khai             | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-61  | 9            | [WF-10](wireframes/tuan-02.html#wf-10)                                         | results / aggregation / công bố; chưa triển khai             | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-62  | 9            | [WF-10](wireframes/tuan-02.html#wf-10)                                         | results / aggregation / công bố; chưa triển khai             | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-63  | 9            | [WF-10](wireframes/tuan-02.html#wf-10)                                         | results / aggregation / công bố; chưa triển khai             | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-64  | 9            | [WF-10](wireframes/tuan-02.html#wf-10)                                         | results / aggregation / công bố; chưa triển khai             | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-65  | 9            | [WF-11](wireframes/tuan-02.html#wf-11)                                         | results / kiểm duyệt; chưa triển khai                        | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-66  | 11           | [WF-15](wireframes/tuan-02.html#wf-15)                                         | improvements; chỉ blueprint                                  | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-70  | 10           | [WF-12](wireframes/tuan-02.html#wf-12)                                         | feedback / upload; chưa triển khai                           | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-71  | 10           | [WF-13](wireframes/tuan-02.html#wf-13)                                         | feedback / định tuyến; chưa triển khai                       | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-72  | 10           | [WF-13](wireframes/tuan-02.html#wf-13), [WF-14](wireframes/tuan-02.html#wf-14) | feedback / trạng thái, lịch sử; chưa triển khai              | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-73  | 10           | [WF-14](wireframes/tuan-02.html#wf-14)                                         | feedback / đối thoại; chưa triển khai                        | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-74  | 11           | [WF-13](wireframes/tuan-02.html#wf-13)                                         | feedback / SLA / job; chưa triển khai                        | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-75  | 11           | [WF-14](wireframes/tuan-02.html#wf-14)                                         | feedback / rating / mở lại; chưa triển khai                  | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-76  | 10           | [WF-13](wireframes/tuan-02.html#wf-13), [WF-14](wireframes/tuan-02.html#wf-14) | feedback / trạng thái, lịch sử; chưa triển khai              | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-80  | 11           | [WF-03](wireframes/tuan-02.html#wf-03)                                         | notifications; chỉ blueprint                                 | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-81  | 11           | Email / Mailpit (chưa có luồng gửi)                                            | mail / outbox; chỉ blueprint                                 | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-82  | 11           | [WF-08](wireframes/tuan-02.html#wf-08), [WF-13](wireframes/tuan-02.html#wf-13) | nhắc hạn / jobs; chưa triển khai                             | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-90  | 12           | [WF-03](wireframes/tuan-02.html#wf-03), [WF-16](wireframes/tuan-02.html#wf-16) | reports / dashboard; chưa triển khai                         | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-91  | 12           | [WF-03](wireframes/tuan-02.html#wf-03), [WF-16](wireframes/tuan-02.html#wf-16) | reports / dashboard; chưa triển khai                         | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-92  | 12           | [WF-16](wireframes/tuan-02.html#wf-16)                                         | reports / export; chưa triển khai                            | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-93  | 12           | [WF-16](wireframes/tuan-02.html#wf-16)                                         | reports / export; chưa triển khai                            | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-94  | 12           | [WF-16](wireframes/tuan-02.html#wf-16)                                         | reports / export; chưa triển khai                            | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-100 | 7 | /quan-tri/cau-hinh-khao-sat | survey-settings.ts, API survey-settings, ADMIN MFA/TOTP/CSRF/Origin | W7-SETTINGS01–09:10roles, biên ngưỡng, actual TOTP/replay, CAS, mặc định đợt, audit, fresh revoke |
| FR-103 | 14           | CLI sao lưu/phục hồi; chưa có script                                           | backup / restore; chưa triển khai                            | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-110 | P2, chưa xếp | Chưa có màn riêng; AI tắt mặc định                                             | mở rộng AI, cần người dùng đồng ý; chưa triển khai           | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-111 | P2, chưa xếp | [WF-08](wireframes/tuan-02.html#wf-08)                                         | API trạng thái hoàn thành; chưa triển khai                   | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-112 | P2, chưa xếp | [WF-10](wireframes/tuan-02.html#wf-10)                                         | đánh giá riêng giảng viên; chưa triển khai                   | Chưa có; triển khai đúng tuần nêu bên trái                                                         |

| FR-140 | G1 / bù Tuần6 | Danh mục đào tạo/import; ADMIN khoa/bộ môn | can.ts, catalog.ts, imports.ts và menu; điều chỉnh từ code ĐBCL cũ | Đạt G1: TC-PDT-01/TC-ALL-01 phần hiện có; rbac-policy/rbac-services/catalog/import tests, verify-week5 HTTP23, UI; CI mục4.3 |
| FR-141 | G1 / bù Tuần6 | PĐT khóa/mở khóa học kỳ | catalog.ts, audit.ts, mail.ts; guard kỳ khóa | Đạt G1: BR-51; HTTP19 của verify-week5 kiểm lý do/CAS/audit/Mailpit, unit SMTP fail/no-recipient; UI khóa/mở thật |
| FR-142 | 7 | Readiness RS-01–RS-06 trong chi tiết đợt | campaign-readiness.ts, survey-settings.ts | TC-PDT-02: W7-HTTP05/06, W7-SETTINGS07, readiness unit và seed W7; RS01–03 chặn/RS04–06 cần note |
| FR-143 | 7 | PĐT xác nhận hoặc trả về NHAP có lý do | campaigns.ts, CampaignDataConfirmation theo revision | TC-PDT-02: W7-HTTP05/07/13, campaign-services; snapshot/hash/người xác nhận bất biến và vòng xác nhận mới |
| FR-144 | 7 | Hash lệch khi mở: chốt hiện tại và cảnh báo PĐT/ĐBCL | campaign-lifecycle.ts, campaign-notifications.ts, EmailOutbox | TC-PDT-03: W7-HTTP08/09/12, W7-SETTINGS10–12; audit/queue/Mailpit, không resync nhiệm vụ |
| FR-145 | 7, P1 | Lô nhập/hoàn tác chưa dùng trong đợt đã chốt | ImportBatch; chưa triển khai, không tự cắt | Chưa nghiệm thu mới: BR-55; thiếu test, chỉ hiện thực nếu đủ thời gian |
| FR-146 | 10 | Hàng đợi TO_CHUC_LOP_HOC | feedback routing/PĐT; chưa triển khai | Chưa nghiệm thu mới: BR-54; scope, SLA, forward, privacy Tuần10–11 |
| FR-147 | 12, P1 | Dashboard PĐT | reports/readiness/feedback; chưa triển khai | Chưa nghiệm thu mới: BR-67; ngưỡng và không định danh, kiểm tệp xuất |
| FR-148 | G1 / bù Tuần6 | Trình soạn/xem trước cờ nhóm đánh giá và mẫu mặc định mới | CriterionGroup.isAssessmentGroup, templates/template-input/default seed | Đạt G1: TC-FR148-01–09 trong templates/default-template-seed tests; HTTP20, demo12, UI lưu/reload/preview; giữ cây mẫu khóa cũ |
| FR-149 | 10 | Hàng đợi THI_KET_THUC_HOC_PHAN/lời nhắc | feedback routing/KT; chưa triển khai | Chưa nghiệm thu mới: TC-KT-02; SLA/leo thang Tuần11 |
| FR-150 | 9 | Kết quả nhóm đánh giá gộp | results/policy KT; chưa triển khai | Chưa nghiệm thu mới: TC-KT-01; ≥2 GV/đủ phiếu, không lớp/GV/tự luận |
| FR-151 | 12, P1 | Thống kê phản hồi thi | reports KT; chưa triển khai | Chưa nghiệm thu mới: BR-59/67; ngưỡng, không định danh và tệp xuất |
| FR-152 | 11, P1 | Kiến nghị rà soát và phản hồi TBM | ExamReviewRecommendation; chưa triển khai | Chưa nghiệm thu mới: BR-58; lý do, hạn14ngày, nhắc TBM/báo TK |
| FR-153 | 10 | Form khiếu nại nghiêm trọng/loại vi phạm/danh tính | feedback nghiêm trọng; chưa triển khai | Chưa nghiệm thu mới: TC-TT-01/02/03; BR-26/61/62/63 |
| FR-154 | 10 tiếp nhận / 11 hoàn tất | Hồ sơ và máy trạng thái Thanh tra | InspectionCase/Note/Event; chưa triển khai | Chưa nghiệm thu mới: BR-60/62; reject/return/reason, SLA, lịch sử bất biến |
| FR-155 | 10 | Chặn xung đột lợi ích/list/detail/assign | inspection policy chung; chưa triển khai | Chưa nghiệm thu mới: TC-TT-01; 404 không lộ tồn tại, kể cả nhiều vai trò |
| FR-156 | 11 | Kết luận/thông báo đúng mức tiết lộ | inspection conclusion/notifications; chưa triển khai | Chưa nghiệm thu mới: TC-TT-02/03; tóm tắt LĐ, kênh SV, danh tính và audit |
| FR-157 | 11, P1 | Chuyển một chiều sang Thanh tra | feedback→inspection history; chưa triển khai | Chưa nghiệm thu mới: BR-64; sender chỉ trạng thái/kết luận tóm tắt |
| FR-158 | 12, P1 | Chỉ số và xem xét cảnh báo khảo sát | SurveyAnomalyFlag; chưa triển khai | Chưa nghiệm thu mới: BR-65; ≥10phiếu, ngưỡng, không điểm/đáp án/tự luận |
| FR-159 | 12, P1 | Thống kê Thanh tra không định danh | inspection reports; chưa triển khai | Chưa nghiệm thu mới: BR-66/67; ngưỡng mẫu, tệp xuất |
| FR-160 | G1 một phần / đầy đủ Tuần13 | Ma trận 10 vai trò; IDOR chức năng hiện có | MA_TRAN_QUYEN, can/access/workspace và service hiện có | G1 phần hiện có đạt: ma trận10vai trò, IDOR/unit/HTTP/UI; toàn bộ hồ sơ/thống kê/tệp xuất chờ Tuần13, chưa tick |

## 4. Truy vết 33 BR gốc và điểm mở rộng

Mã giữ nguyên đặc tả, không có BR-19 hoặc BR-29. Test cấu trúc đáp ứng **một phần BR-03**. Tuần 3 thêm kiểm BR-30/31/33 trong miền auth và guard BR-34; không tuyên bố quy tắc đã hoàn thành trên các module chưa có. Các CHECK SQL là hỗ trợ dữ liệu nền, không thay service/policy nghiệp vụ.

| BR    | Wireframe / luồng                                                                                                      | Thiết kế / miền phụ trách                                                                 | Test hiện có hoặc phần cần viết                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| BR-01 | Đợt mở và tiến độ nhiệm vụ | CampaignSection/SurveyTask tạo cùng transaction DANG_MO; xác nhận/hash BR-52/53 | W7-HTTP08/09: chốt4SV hiện tại khi hash lệch, 20ensure không nhân đôi; thay đăng ký/thêm lớp sau mở không đổi task |
| BR-02 | [WF-06](wireframes/tuan-02.html#wf-06) | student-surveys.ts: CAS task + response/answers cùng transaction | Tuần8 HTTP lần2x409/20POSTchỉ1phiếu; rollback cưỡng bức và gate cuối mục4.5 |
| BR-03 | [WF-05](wireframes/tuan-02.html#wf-05), [WF-06](wireframes/tuan-02.html#wf-06), [WF-16](wireframes/tuan-02.html#wf-16) | THIET_KE_AN_DANH, ADR003/009, vùng phiếu biệt lập, DTO/log whitelist | DMMF5.6a, privacy unit route→service, HTTP5.6b/c và DTO/log hiện có; export CSV/Excel/PDF Tuần12 chưa kiểm |
| BR-04 | [WF-04](wireframes/tuan-02.html#wf-04), [WF-05](wireframes/tuan-02.html#wf-05), [WF-06](wireframes/tuan-02.html#wf-06) | student-survey-input.ts/submit: mẫu khóa/nămloại/NA/time; lifecycle đóng now>endsAt | Unit đúng endsAt vẫn nhận; HTTP ngoài giờ/sai trạng thái/kỳ khóa/mẫu/loại/option/bắtbuộc; gate cuối mục4.5 |
| BR-05 | Mẫu phiếu và lãnh đạo duyệt đợt | templates.ts; campaigns.ts::validateTemplateForApproval, mutex/CAS | Tuần6 bảo vệ cây mẫu; W7-HTTP07/13 khóa mẫu cùng transaction duyệt, rút đợt vẫn giữ mẫu khóa; campaign-services unit |
| BR-06 | Máy trạng thái và lịch sử đợt | campaigns.ts, campaign-lifecycle.ts; revision/requestId/requestHash | W7-HTTP07/11/13–16: lý do, sai trạng thái, idempotency, CAS, first access/catch-up và duyệt trễ; [sơ đồ](assets/tuan-07/campaign-state.svg) |
| BR-07 | [WF-10](wireframes/tuan-02.html#wf-10), [WF-16](wireframes/tuan-02.html#wf-16)                                         | Results / ngưỡng số phiếu và tỷ lệ / policy                                               | Chưa có; Tuần 9 kiểm cả hai ngưỡng và dữ liệu gộp                                                                  |
| BR-08 | [WF-03](wireframes/tuan-02.html#wf-03), [WF-10](wireframes/tuan-02.html#wf-10)                                         | Results policy / trạng thái công bố và phạm vi; thêm KT BR-57, TT BR-65                                            | Chưa có; Tuần 9 kiểm trước/sau công bố theo role                                                                   |
| BR-09 | [WF-11](wireframes/tuan-02.html#wf-11)                                                                                 | Moderation + audit actor cán bộ, không ghép sinh viên                                     | Chưa có; Tuần 9 kiểm ẩn/hiện, lý do và audit đã che dữ liệu                                                        |
| BR-10 | [WF-15](wireframes/tuan-02.html#wf-15)                                                                                 | ImprovementPlan / history / hạn và người xác nhận                                         | Chưa có; Tuần 9/11 kiểm sinh yêu cầu, gửi/bổ sung/xác nhận                                                         |
| BR-11 | [WF-10](wireframes/tuan-02.html#wf-10)                                                                                 | Aggregation / Decimal / làm tròn cuối                                                     | Chưa có; Tuần 9 viết TC-AGG-01, NA và dữ liệu không hợp lệ                                                         |
| BR-12 | [WF-04](wireframes/tuan-02.html#wf-04), [WF-08](wireframes/tuan-02.html#wf-08), [WF-10](wireframes/tuan-02.html#wf-10) | Tỷ lệ DONE / snapshot task                                                                | Chưa có; Tuần 9 kiểm 4/10=40% và mẫu số bằng 0                                                                     |
| BR-13 | [WF-08](wireframes/tuan-02.html#wf-08), [WF-16](wireframes/tuan-02.html#wf-16)                                         | Task status list / scope / reminder / audit                                               | Chưa có; Tuần 9 kiểm không kèm nội dung, audit và tối đa 1 nhắc/ngày                                               |
| BR-14 | [WF-08](wireframes/tuan-02.html#wf-08)                                                                                 | API/tệp trạng thái hoàn thành, P2                                                         | Chưa có; chưa xếp tuần, không tích hợp hệ thống điểm thật                                                          |
| BR-15 | Gia hạn và đóng sớm đợt đang mở | campaigns.ts::performCampaignAction, Notification/EmailOutbox | W7-HTTP11/12 và W7-SETTINGS10–12: đúng quyền/state, hạn mới muộn hơn, lý do, queue theo cohort/Mailpit/retry |
| BR-16 | [WF-08](wireframes/tuan-02.html#wf-08), [WF-10](wireframes/tuan-02.html#wf-10), [WF-18](wireframes/tuan-02.html#wf-18) | Nhiều TeachingAssignment, đánh giá ở mức lớp                                              | Có SQL nền chặn phân công trùng; chưa test khảo sát chung lớp Tuần 7–9                                             |
| BR-17 | Dữ liệu học kỳ khóa chỉ đọc; PĐT BR-51 | catalog.ts và campaigns.ts dùng chung mutex; quyết định người dùng29/10 chặn khóa khi có DA_DUYET/DANG_MO | W7-HTTP06/07/09/17: chặn ghi và race khóa kỳ/duyệt; kỳ khóa không đồng thời có đợt đã duyệt/đang mở |
| BR-18 | Không gian vai trò và API lớp tối thiểu Tuần 4 | `policies/can.ts`, `services/workspace.ts`; ADMIN không suy quyền nghiệp vụ; mở rộng BR-68 | Policy/service targeted và UI chặn vai trò qua; khảo sát/kết quả/phản hồi chưa có mã nên chưa kiểm nội dung các module đó |
| BR-20 | [WF-12](wireframes/tuan-02.html#wf-12)                                                                                 | Feedback policy theo Enrollment và kỳ hiện hành/liền trước                                | Chưa có; Tuần 10 kiểm lớp người khác và kỳ ngoài cấu hình                                                          |
| BR-21 | [WF-12](wireframes/tuan-02.html#wf-12), [WF-13](wireframes/tuan-02.html#wf-13)                                         | Routing/recipients/assignee/history                                                       | Chưa có; Tuần 10 kiểm từng loại, khiếu nại và chuyển tiếp                                                          |
| BR-22 | [WF-13](wireframes/tuan-02.html#wf-13), [WF-14](wireframes/tuan-02.html#wf-14)                                         | Feedback state machine / cập nhật có điều kiện / lịch sử bất biến                         | Chưa có; Tuần 10 kiểm mọi chuyển hợp lệ/sai quyền/sai trạng thái                                                   |
| BR-23 | [WF-13](wireframes/tuan-02.html#wf-13)                                                                                 | SLA ngày làm việc, job idempotent, SlaEscalation unique                                   | Chưa có; Tuần 11 kiểm T7/CN, quá hạn và chạy job lặp                                                               |
| BR-24 | [WF-12](wireframes/tuan-02.html#wf-12), [WF-14](wireframes/tuan-02.html#wf-14)                                         | Feedback giữ authorId, DTO che cho người xử lý                                            | Chưa có; Tuần 10 kiểm tin nhắn/tệp/history/notification/export không lộ tác giả                                    |
| BR-25 | [WF-14](wireframes/tuan-02.html#wf-14)                                                                                 | Rating 1–5 trong 7 ngày, reopenCount tối đa 1                                             | Chưa có; Tuần 11 kiểm thời hạn, điểm ≤2 và mở lại lần hai                                                          |
| BR-26 | [WF-12](wireframes/tuan-02.html#wf-12)                                                                                 | Rate limit phản hồi, cảnh báo nội dung trùng                                              | Chưa có; Tuần 11 kiểm N/ngày và 24 giờ                                                                             |
| BR-27 | [WF-13](wireframes/tuan-02.html#wf-13), [WF-14](wireframes/tuan-02.html#wf-14)                                         | Feedback/message moderation, isHidden/isLocked, reason                                    | Chưa có; Tuần 11 kiểm quyền, lý do và ngăn thao tác khi khóa                                                       |
| BR-28 | [WF-12](wireframes/tuan-02.html#wf-12), [WF-14](wireframes/tuan-02.html#wf-14)                                         | Attachment / kiểm magic bytes / route download có policy                                  | Chưa có; Tuần 10 kiểm 3×5MB, đuôi giả, tên/path và tải ngoài quyền                                                 |
| BR-30 | Auth/recovery/MFA, người dùng, chính sách và nhật ký quản trị | AuditLog cùng transaction; `services/audit.ts` lọc DTO, allowlist summary và che bí mật cũ | Unit/auth lịch sử và CLI 5 qua; UI xem/lọc audit qua. HTTP Tuần 4 28/28 và CI qua; chỉ các thao tác đã có, chưa hoàn thành audit toàn hệ thống |
| BR-31 | `/dang-nhap`, đổi/reset/kích hoạt và refresh/logout                                                                    | `auth.ts`, `account-recovery.ts`, `auth/password.ts`, `session.ts`, `http.ts`             | Core27/recovery18 nằm trong full61; HTTP 24 qua, gồm reset race MySQL; refresh race chỉ unit/mock                                      |
| BR-32 | `/bao-mat/thiet-lap`, `/bao-mat/xac-thuc`, quản trị/CLI | `services/mfa.ts`, MFA crypto/rate/policy, session purpose và DB mfaVerifiedAt | Auth/MFA 53 targeted, CSRF 5, CLI 5 và browser setup/recovery qua. HTTP/MySQL cuối 28/28 qua; không nhận token tạm hoặc actor.mfa tự khai là đủ |
| BR-33 | Đăng nhập và yêu cầu email/token                                                                                       | RateLimitBucket, `auth/rate-limit.ts` và service                                          | Rate/login-race/limits unit và HTTP23 qua: sai5lần khóa15phút mặc định, mã/email cùng bucket, lỗi trung tính           |
| BR-34 | API chi tiết/khóa-mở/đổi quyền/reset MFA tài khoản và lớp tối thiểu | `services/access.ts`, `users.ts`, `workspace.ts`, `policies/can.ts`; ID cùng scope trong query | Policy/service 29 targeted qua; service đọc lại DB, list/count/detail cùng filter. HTTP28/IDOR và CI qua; các module Tuần 5+ phải bổ sung khi triển khai |
| BR-35 | Luồng quản lý lưu trữ / CLI                                                                                            | Retention setting/script, P2; không tự xóa dữ liệu                                        | Chưa có; chưa xếp tuần, xóa dữ liệu cần người dùng đồng ý                                                          |

## 4.1. Truy vết 19 BR bổ sung

| BR | FR liên quan | Tuần/phạm vi | Miền thực thi/điều kiện | Test và trạng thái |
| --- | --- | --- | --- | --- |
| BR-50 | FR-140; FR-20–22 | G1 bù Tuần6 | can/catalog/import + audit actor PĐT | Đạt G1: TC-PDT-01, verify-week5 HTTP23; actor audit và quyền đọc/ghi theo entity |
| BR-51 | FR-141 | G1 bù Tuần6 | khóa/mở học kỳ: reason/audit/thông báo ĐBCL | Đạt G1: catalog-services tests, verify-week5 HTTP19, UI; thư Mailpit và audit sau commit |
| BR-52 | FR-142/143 | 7 | readiness RS01–06 và snapshot theo revision | TC-PDT-02 đạt kiểm W7-HTTP05–07/13, W7-SETTINGS07; unit campaign-readiness/services, seed W7 |
| BR-53 | FR-144; FR-43 | 7 | Tính lại hash khi mở, chốt hiện tại/cảnh báo/giữ task sau chốt | TC-PDT-03 đạt kiểm W7-HTTP08/09/12, unit lifecycle/notifications và queueDB/Mailpit W7-SETTINGS10–12 |
| BR-54 | FR-146 | 10–11 | PĐT đúng loại/lý do chuyển/SLA2–5/leo thang | Chưa triển khai/test |
| BR-55 | FR-145 | 7, P1 | ImportBatch/hash/hoàn tác chỉ khi chưa chốt | Chưa triển khai/test; không tự cắt |
| BR-56 | FR-149 | 10–11 | KT đúng loại/SLA2–5/lời nhắc phúc khảo | TC-KT-02; chưa triển khai |
| BR-57 | FR-148/150 | Cờ G1; kết quả9 | cờ nhóm/mẫu mặc định; gộp2GV/đủ phiếu/sau công bố | Cờ/default đạt G1 (FR-148); TC-KT-01 kết quả gộp chưa triển khai |
| BR-58 | FR-152 | 11, P1 | kiến nghị/TBM phản hồi lý do/hạn14ngày | Chưa triển khai/test |
| BR-59 | FR-151 | 12, P1 | thống kê thi gộp/ngưỡng/không định danh | Chưa triển khai/test |
| BR-60 | FR-154 | 10 tiếp nhận / 11 SLA | Thanh tra3/30ngày làm việc; LĐ tóm tắt quá hạn | Chưa triển khai/test |
| BR-61 | FR-155 | 10 | xung đột động/404/list-count-detail-assign | TC-TT-01; chưa triển khai |
| BR-62 | FR-154/156 | 10–11 | TT đầy đủ không xung đột; LĐ tóm tắt; audit mở/tải | TC-TT-02; chưa triển khai |
| BR-63 | FR-153/156 | 10–11 | hai mức danh tính/kênh own/audit/không lộ người bị phản ánh | TC-TT-03; chưa triển khai |
| BR-64 | FR-157 | 11, P1 | chuyển một chiều/lý do/lịch sử; sender chỉ tóm tắt | Chưa triển khai/test |
| BR-65 | FR-158 | 12, P1 | ≥10phiếu, chỉ số/cảnh báo/decision, không kết luận tự động | Chưa triển khai/test |
| BR-66 | FR-159 | 12, P1 | thống kê hồ sơ có ngưỡng/không định danh | Chưa triển khai/test |
| BR-67 | FR-147/151/159/160 | Theo luồng; đầy đủ13 | dashboard/thống kê/tệp xuất3vai trò không định danh | TC-ALL-01, kiểm tệp xuất Tuần12–13; chưa triển khai |
| BR-68 | FR-160 | G1 nền; đầy đủ13 | ADMIN không kết quả/nội dung phản hồi/hồ sơ TT | G1 giữ deny default/ADMIN không có quyền nghiệp vụ ngầm; nội dung kết quả/hồ sơ tương lai chưa có |

## 4.2. Đăng ký chín mã test Mục F

Đây là kế hoạch kiểm và chỗ ghi bằng chứng. G1 đã có bằng chứng chạy thật ở mục4.3; các mã tương lai tiếp tục ghi chưa triển khai. Các test tương lai chỉ viết/chạy khi đến tuần tương ứng; tên TC là mã nghiệm thu, không nhất thiết một file mỗi TC.

| Mã test | Tuần/phạm vi | Yêu cầu | Điều phải chứng minh | Trạng thái/bằng chứng hiện tại |
| --- | --- | --- | --- | --- |
| TC-PDT-01 | G1 bù Tuần6 | FR-140, BR-50 | ADMIN tạo/sửa lớp và import bị chặn; PĐT thành công. Kiểm DBCL mất quyền ghi, ADMIN chỉ tổ chức, actor audit. | Đạt G1: tests/rbac-policy, catalog-services, import-services; scripts/verify-week5.ts HTTP01/04/07–19/22, tổng23/23; CI mục4.3 |
| TC-PDT-02 | 7 | FR-142/143, BR-52 | RS01/02/03 chặn, RS04/05/06 cảnh báo; lưu hash/snapshot; trả về cần lý do. | Đạt kiểm W7-HTTP05–07/13; campaign-readiness/services; W7-SETTINGS07 và seed W7. Nghiệm thu cuối mục4.4. |
| TC-PDT-03 | 7 | FR-144, BR-01/53 | Xác nhận → đổi đăng ký → mở chốt hiện tại, cảnh báo PĐT/ĐBCL; thay sau chốt không đổi task. | Đạt kiểm W7-HTTP08/09/12:20ensure, drift/audit/queue, chốt4SV, thay đăng ký sau mở; W7-SETTINGS10–12 SMTP thật. Mục4.4. |
| TC-KT-01 | 9 | FR-150, BR-57 | Chỉ nhóm cờ sau công bố; ≥2 GV khác nhau/tổng phiếu đủ ngưỡng; không lớp/GV/tự luận, thiếu ngưỡng có thông báo. | Chưa triển khai; G1 chỉ có cờ, chưa có kết quả gộp. |
| TC-KT-02 | 10–11 | FR-149, BR-56 | Đúng hàng đợi thi/lời nhắc phúc khảo, ẩn danh, chuyển có lý do, tiếp nhận2/trả lời5ngày và leo thang. | Chưa triển khai. |
| TC-TT-01 | 10 | FR-153/155, BR-61 | GV/TBM/TK liên quan không thấy/không được giao; kể cả tài khoản có TT; list/count/detail/attachment không lộ và trả404. | Chưa triển khai. |
| TC-TT-02 | 10–11 | FR-154/156, BR-62 | ADMIN/ĐBCL bị chặn, LĐ chỉ tóm tắt, TT không xung đột mới đầy đủ; audit mở hồ sơ/tải tệp. | Chưa triển khai. |
| TC-TT-03 | 10–11 | FR-153/156, BR-63 | Mặc định hoàn toàn ẩn danh; cho TT biết thì chỉ TT hợp lệ thấy/audit; người bị phản ánh không thấy danh tính. | Chưa triển khai. |
| TC-ALL-01 | G1 một phần / đầy đủ13 | FR-160, BR-34/61/62/67/68 | Ma trận10vai trò + IDOR trên từng function/scope; nhiều grant/MFA; sau này bổ sung kết quả, hồ sơ, dashboard và kiểm tệp xuất. | Đạt phần G1: rbac-policy/rbac-services và HTTP10role trong verify-week5/6, IDOR lớp theo scope ở verify-week4; UI KT/TT403. Toàn bộ kết quả/hồ sơ/thống kê/tệp xuất chờ Tuần13. |

## 4.3. Cập nhật nghiệm thu G1

Mã hiện thực G1: `023b619134c58ee79a7ebbdd5882d24cdb034f59`; [CI 40750644805](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40750644805) đã qua **check và smoke**, đúng SHA. Ngày thực hiện kỹ thuật28–29/10/2026; không điền thay ngày/tên GVHD yêu cầu.

- `npm run check` lúc02:00 ngày29/10: **346/346 test trong25file**, schema/ERD/lint/TypeScript qua; `npm run build` Next16.4.3 qua.
- MySQL16/16; HTTP auth24/quản trị28/danh mục23/mẫu20; CLI5, seed12nhóm qua; fixture dọn. Verify-week4 đã kiểm cấu hình đủ10vai trò MFA qua API.
- [UI G1](QA_GIAO_DIEN_BO_SUNG_01.md):7nhóm/16viewport/16PNG đã xem,0JSerror/overflow/thiếu nhãn; seed giữ nguyên. [Sơ đồ](SO_DO_BO_SUNG_01.md):4Mermaid render qua,4SVG mới/9PNG đã xem.
- Migration deploy main, diff không lệch; hash16tập trước/sau giữ1.568tài khoản cũ, cây2mẫu cũ, đợt/task/78phiếu/234đáp án/3tổng hợp/phản hồi/lịch sử. Supplement SHA-256 khớp file người dùng; kiểm604liên kết nội bộ,5mục bảo vệ,3dòng AGENTS,84FR duy nhất qua. Báo cáo/ảnh Tuần6 và Git blob migration cũ không đổi.

[Báo cáo phiên](NGHIEM_THU_BO_SUNG_01.md) mô tả tệp, mâu thuẫn, giới hạn và ước lượng. Chốt **FR-140/141/148**, tổng71/219=32,4%; FR-160/TC-ALL-01 chỉ phần hiện có, **chưa tick toàn bộ**. Bằng chứng Tuần6 ở mục1.4 giữ đúng bảy vai trò tại thời điểm đó. Không nhận kiểm chức năng hoặc tệp xuất chưa hiện thực; chưa bắt đầu Tuần7.

## 4.4. Truy vết hiện thực và kiểm Tuần 7 — 29/10/2026

Lệnh người dùng cho phép tiếp tục Tuần7 sau G1; quyết định bổ sung chặn khóa kỳ khi còn DA_DUYET hoặc DANG_MO. Không thay bằng chứng lịch sử Tuần1–6/G1. Các dòng Tuần7 phía trên được nối với đường dẫn hiện thực và kiểm thật; tick tiến độ, build, UI và CI cuối đối chiếu trong [nghiệm thu Tuần7](NGHIEM_THU_TUAN_07.md).

| Yêu cầu / quy tắc | Hiện thực | Kiểm đã chạy và giới hạn |
| --- | --- | --- |
| FR-40/41; BR-17/34 | campaigns.ts, campaign-input.ts, can.ts; /dot-khao-sat | W7-HTTP01–04/14:10roles, API/CSRF/Origin/bytecap,4scopes/paging, CAS. campaign-services/ui-boundaries unit. |
| FR-42/142/143; BR-05/06/52; TC-PDT-02 | campaign-readiness.ts, campaigns.ts, CampaignDataConfirmation | W7-HTTP05–07/13/16: RS01–06, warning note, snapshot, return/reject/withdraw/reconfirm, khóa mẫu, duyệt muộn. Seed W7 riêng không viết lại cây mẫu/phiếu. |
| FR-43/44/144; BR-01/06/53; TC-PDT-03 | campaign-lifecycle.ts, scripts/scheduler.ts, Notification/EmailOutbox | W7-HTTP08/09/12/15/16:20ensure đồng thời, chốt cohort hiện tại/hash lệch, task cố định, CLI/first access/catch-up/giờ thật. Không nhận đã có API sinh viên nộp phiếu. |
| FR-45; BR-15/30 | campaigns.ts, campaign-notifications.ts, mail.ts | W7-HTTP11–13 và W7-SETTINGS10–12: reason/state/idempotency, queue/dedup, Mailpit, retry/backoff, lease và FAILED rõ. SMTP có thể gửi lại sau crash ở khoảng đã nhận thư/chưa ghiSENT; không cam kết exactly-once SMTP. |
| FR-46 | campaigns.ts::getCampaignProgress, SurveyTask groupBy | W7-HTTP10:4task/1DONE=25%, paging lớp, không studentId/response/answer; PĐT không có quyền tiến độ. Chưa tính/tổng hợp kết quả môn học. |
| FR-100; BR-30/32/34/52 | survey-settings.ts; API survey-settings; ADMIN MFA và step-up | W7-SETTINGS01–09:10roles, actualencryptedTOTP HTTPsave/replay, ngưỡng/JSON/8KiB, CAS2phiên, default dùng ở đợt mới/không hồi tố, RS04threshold3, audit và freshrevocation. |
| BR-17/51 và quyết định người dùng | catalog.ts::lockSemester dùng mutex cùng approve/ensure | W7-HTTP06/07/09/17: kỳ khóa chỉ đọc, không khóa khi đã duyệt/mở; race khóa/duyệt giữ invariant. |
| BR-30/34; TC-ALL-01 phần hiện có | access.ts, can.ts, csrf.ts, audit.ts, các service mới | W7-HTTP18/19 và W7-SETTINGS08/09/13: quyền/phiên bị thu hồi có hiệu lực, audit/log không payload/bí mật. FR-160 toàn bộ và kiểm tệp xuất vẫn chờ Tuần13. |
| Sơ đồ và giải thích | [ERD](ERD.md), [sơ đồ trạng thái](assets/tuan-07/campaign-state.svg), [giải thích](GIAI_THICH/tuan-07.md) | [SO_DO_TUAN_07](SO_DO_TUAN_07.md):46design/34runtime/12design-only,5Mermaid render qua/10PNG cuối đã xem. Không suy nghiệp vụ đúng chỉ từ ảnh. |
| FR-145 / BR-55 | ImportBatch vẫn chỉ thiết kế | P1 có điều kiện trong Tuần7, chưa hiện thực/kiểm/tick; không ghi nhận đã hoàn tất hoặc tự cắt. |

Lượt HTTP/MySQL đợt **19/19** và cấu hình/queue **13/13** đã qua, fixture được dọn và cấu hình thử được khôi phục; kết quả máy nằm trong .local/week7-http-result.json và .local/week7-settings-http-result.json ngoài Git. Các sửa tiếp sau phải chạy lại kiểm liên quan; tổng test/CI cuối lấy từ báo cáo nghiệm thu, không cộng lượt targeted thành test riêng. Mốc Tuần7 này không thay tiêu chí ẩn danh5.6 hoặc nhận hoàn thành workflow tương lai.

## 4.5. Truy vết hiện thực và kiểm Tuần 8 — 29–30/10/2026

Người dùng yêu cầu bắt đầu và tiếp tục đến khi hoàn tất Tuần 8. Chốt FR-50–54 sau check/build/HTTP/MySQL/UI và CI đúng nguồn 6edad31 đều qua. Chưa tổng hợp/công bố; không sửa bằng chứng lịch sử để nhận chức năng mới.

| Yêu cầu / quy tắc | Hiện thực | Kiểm đã qua và giới hạn |
| --- | --- | --- |
| FR-50; BR-01/34 | student-surveys.ts::listStudentSurveys/readOwnedTask; survey-list; can.ts | HTTP 16/16 gồm 10 vai trò, list/count/page/filter của actor, ID lạ/người khác cùng 404; Enrollment đổi sau chốt không đổi quyền; phiên/grant/MFA mới |
| FR-51; BR-04/05 | student-survey-input.ts; template projection; survey-form | Unit/HTTP năm loại, hai thang Likert, BOOLEAN=false, TEXTtrim4000, bắt buộc/NA/tùy chọn; câu/option lạ, lặp và trộn loại bị chặn |
| FR-52; BR-03 | survey-draft/client/clock, logout-button | Nháp chỉ localStorage theo user/task/version,20 nháp/7 ngày/256KiB, không token; QA khôi phục/nháp hỏng/storage bị chặn/đa tab/logout/đồng hồ/gia hạn/GET muộn qua |
| FR-53; BR-02/03/04 | submitStudentSurvey, transaction helper | HTTP nộp lại 409;20 POST chỉ 1 response/6 answers; UUIDv4 và2 DATE cùng ngày Việt Nam. Trigger lỗi chèn đáp án cho HTTP 500/PENDING/0 response/0 answer, bỏ trigger rồi retry thành công, fixture dọn |
| FR-54; BR-03/34 | DONE DTO/template=null, survey-confirmation, GET task | PENDING chuyển về form, DONE chỉ trạng thái/ngày, không đọc response/answer hoặc nội dung; QA mất phản hồi sau commit và tab cũ qua |
| BR-04/17 | availability/lifecycle/CAS; giờ server | Đúng endsAt còn mở,1 ms sau đóng; HTTP trước giờ/đã đóng/kỳ khóa/mẫu chưa khóa bị chặn |
| BR-03/30/34;5.6(d) hiện có | student-survey-body, CSRF riêng, DTO whitelist, normalizedError, Prisma log[] | Unit route→service kiểm danh sách trường ghi/DTO, trường cầu nối, sentinel, lỗi và sink console/audit/queue; HTTP Origin/CSRF/bytecap 256 KiB/logscan qua. Export kết quả Tuần 12 chưa có |
| Sơ đồ/giải thích | [ADR009](decisions/ADR-009-nop-phieu-an-danh.md), [giải thích](GIAI_THICH/tuan-08.md), [sơ đồ](SO_DO_TUAN_08.md) | Nguồn Mermaid/SVG mới, ERD46 design/34 runtime/12 design-only; không migration mới hoặc sửa assets lịch sử |

Unit liên quan: student-surveys, student-survey-input/body/client/clock/draft/privacy, campaign-lifecycle và schema-anonymity. Fullcheck 646/646 trong 39 tệp/schema/ERD/lint/TS và build 16.4.3 qua ngày 30/10; HTTP/MySQL test:week8 qua 16/16/cleaned=true, kết quả riêng .local/week8-http-result.json ngoài Git.27 tập main trước/sau khớp hash. UI 13 nhóm/34 PNG đã xem và [CI nguồn 6edad31](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40925339620) qua check/smoke đúng SHA. Chốt 117/219=53,4%, 41/84 FR tại [nghiệm thu Tuần 8](NGHIEM_THU_TUAN_08.md); không cộng lượt targeted/lượt lỗi vào số đạt. CI main/tài liệu cuối đối chiếu riêng.

## 4.6. Truy vết hiện thực Tuần 9 — từ 30/10/2026

Người dùng yêu cầu bắt đầu Tuần 9 và tiếp tục phần dang dở, giữ yêu cầu hạn chế slogan/câu chữ tự nhiên. **Đã nghiệm thu FR-47/60–65/150** sau kiểm cục bộ và [CI nguồn 5eb5a84](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41079971520) check/smoke thành công đúng SHA. Đối chiếu tổng kiểm/build/CI tại [nghiệm thu Tuần 9](NGHIEM_THU_TUAN_09.md). CI main/tài liệu cuối kiểm riêng; không thay bằng chứng lịch sử ở các mục trên.

| Yêu cầu / quy tắc | Hiện thực Tuần 9 | Kiểm đã qua và giới hạn |
| --- | --- | --- |
| FR-60; BR-11/12; TC-AGG-01 | survey-score.ts, survey-results-mutations.ts, AggregateResult.details version2 | Fullcheck 797/797 trong 50 tệp; HTTP 12/12 có TC-AGG-01 4,11/40%; unit phân số/NA/trống/allNA/thang gốc 1–4 và không đổi choice/BOOLEAN thành điểm |
| FR-61; BR-07 | eligibleToPublish từ số phiếu và tỉ lệ chính xác; read DTO suppression | Unit đúng ngưỡng/tỷ lệ làm tròn; HTTP/UI lớp thiếu mẫu không có điểm/TEXT, đợt vẫn công bố được |
| FR-62; BR-17/34 | aggregateSurveyResults/publishSurveyResults, mutex/freshactor/CAS/history/requestId | HTTP10POST tổng hợp1thành công/9x409; lỗi lớp cuối rollback DA_DONGrev1/0aggregate/history/audit,rồi retry; khóa kỳ lưu trữ và cấm ghi qua |
| FR-63; BR-08/18/68 | can.ts::resultSectionScopeWhere, survey-results.ts, /ket-qua và class detail | Unit/HTTP/UI10vai trò, ownscope/IDOR404, fresh grant/session, KT+GV không nới quyền lớp; ADMIN không quyền ngầm |
| FR-64; BR-11 | poolSurveyScores; so sánh bộ môn/khoa/kỳ trước | Unit 1 phiếu điểm 5 + 9 phiếu điểm 1 = 1,40/khác mẫu; HTTP gộp 4,64 và UI so sánh cùng mẫu qua; E8 kỳ trước. Cấu hình xếp mức khác nhau vẫn trả điểm nhưng không gán mức chung |
| FR-65; BR-09 | survey-moderation.ts, survey-results-settings.ts; /kiem-duyet | Unit/schema/CAS/freshMFA, HTTP lý do/TEXT-only/idempotency/audit; UI duyệt3gópý thật/hếtqueue/côngbố; không User relation vào Answer |
| FR-47; BR-13 | survey-reminders.ts, scheduler, Notification/EmailOutbox; /chua-hoan-thanh | HTTPscope/PENDING/count/audit kể cảtrangrỗng;2lớp/2vai trò cùngngày vẫn1nhắc/SV/đợt; UI lần2queued0; không ghép phiếu |
| FR-150; BR-57; TC-KT-01 | projection ASSESSMENT trong survey-results.ts, teacherIds snapshot nội bộ, seed E8 mới | HTTP/UI ≥2GV/đủ mẫu, nhóm4,68; không lớp/GV/TEXT/phiếu/đápán; demo15/15,E8haiGVcùngmôn/18phiếu/40task/repeathash |
| BR-03/30/34; 5.6(d) phần hiện có | CSRF kết quả riêng, body256KiB, DTO whitelist, no-store, normalizedError, Prisma log[] | Unit/HTTPCSRF/Origin/bytecap/sentinel/logscan qua; audit không nội dung/responseID; chưa có export CSV/Excel/PDF kết quả Tuần12 |
| Tài liệu và sơ đồ | [công thức](CONG_THUC_TONG_HOP.md), [ADR010](decisions/ADR-010-tong-hop-cong-bo-va-kiem-duyet.md), [5 câu bảo vệ](GIAI_THICH/tuan-09.md), [sơ đồ](SO_DO_TUAN_09.md) | 3/3 Mermaid render và 3PNG mở xem, 0 nhãn vượt biên; báo cáo10mục, tóm tắt≤150từ; chưa thay kiểm app |

Lượt HTTP cuối **12/12**, `cleaned=true` ở `.local/week9-http-result.json`; lưu cấu hình bằng TOTP thật qua, chặn mã dùng lại/CAS cũ, ba góp ý được gắn cờ và cấu hình thử đã khôi phục. Demo **15/15** trên database mới; **27 tập** dữ liệu main cũ khớp hash. [UI](QA_GIAO_DIEN_TUAN_09.md) có **14 nhóm/23 trạng thái/46 PNG cuối đã xem**, không lỗi trong phép đo: 42 ảnh fixture +4 ảnh main demo. Lượt bổ sung đã thử đăng nhập biểu mẫu bằng GV demo giả; thiết lập TOTP không thuộc harness UI. Fullcheck **797/797 trong 50 tệp** và production build **Next 16.4.3** qua. Tài liệu/sơ đồ giữ 5 mục bảo vệ, AGENTS, 181 tệp lịch sử và 84 FR. Nguồn `5eb5a84d19b8a526bbce3ed5e61852533e8b6b1f` có [CI 41079971520](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41079971520) check/smoke thành công; CI main/tài liệu cuối kiểm riêng. [Bằng chứng máy đọc](assets/tuan-09/verification.json) không chứa SQL, mã hàng hoặc thông tin xác thực.

Tám FR-47/60–65/150 thêm **21 điểm**, tiến độ **138/219=63,0%, 49/84 FR**; kế hoạch Tuần 9 là **140/219**, còn chênh hai điểm của FR-145. M5 đạt 22/22, M7 16/18, M14 6/13. FR-145 còn backlog, FR-160 chờ Tuần 13; nhắc khảo sát không tự hoàn thành FR-80–82 của các tuần sau.

## 5. Quy tắc cập nhật

Khi hiện thực mỗi tuần, thay tên miền dự kiến bằng đường dẫn service/policy thật và tên test gắn mã, ghi command/commit/CI/ảnh thật; chỉ tick PROGRESS sau test và nghiệm thu. Tệp xuất/trạng thái chưa hoàn thành là luồng riêng, không ghép với phiếu. Các sơ đồ, wireframe, blueprint và checklist là thiết kế có thể review, không thay bằng chứng runtime.

### Chốt bằng chứng nguồn Tuần 7

Nguồn 39d56485cb42281ed97eb482a317977dfabdce5b, [CI 40858131706](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40858131706) đã qua check/smoke đúng SHA, gồm migration sạch Linux và hồi quy tuần trước. Check572/32file; build; HTTP19+13 trên nguồn saufixlease; seed14; UI11nhóm26viewport26PNG; sơ đồ5Mermaid/10PNG. Hash24tập main khớp,648link nội bộ/5mục bảo vệ/48tệp lịch sử/AGENTS/prompt bổ sung qua. Chấp nhận FR-40–46/100/142–144,103/219=47,0%; FR-145/160 chưa tick. Main/tài liệu cuối theo CI riêng.

### Chốt CI main Tuần 9 và thuật ngữ đăng nhập — 30/10/2026

[CI main41082112228](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41082112228) đã qua check/smoke đúng SHA43da7f8017a16759f9883af49cfff29b44eabfcb. Sau đó người dùng yêu cầu cách gọi “mã số sinh viên” ở đăng nhập; auth-form.tsx thống nhất hướng dẫn, nhãn và lỗi bỏ trống, giữ input không có ví dụ. Check bản sửa qua797/797 trong50tệp; thay câu chữ không đổi nghiệp vụ hoặc cộng FR. Bằng chứng ảnh mới xem CHINH_SUA_DANG_NHAP_2026_10_30.md; giữ ảnh nghiệm thu Tuần9 làm lịch sử.

### Bỏ chữ gợi ý trong ô nhập — 30/10/2026

Theo yêu cầu áp dụng toàn hệ thống, auth-form.tsx bỏ ví dụ email dùng chung (kích hoạt/quên mật khẩu); campaign-form.tsx bỏ ví dụ tên đợt và gợi ý tìm mã/tên; campaign-list.tsx bỏ gợi ý tìm tên đợt. Rà soát src không còn placeholder; nhãn, hướng dẫn ngoài ô và lựa chọn có nghĩa được giữ. Check797/797 trong50tệp qua; đây là chỉnh giao diện, không đổi FR-01/40/41 hoặc tăng điểm. Bằng chứng xem BO_GOI_Y_TRONG_O_NHAP_2026_10_30.md.

### Danh xưng trong giao diện — 30/10/2026

Theo yêu cầu mới, kích hoạt dùng “Bắt đầu với tài khoản của sinh viên”; auth-form, tài khoản, các trang khảo sát, trang quản lý và thông báo/email bỏ từ xưng hô Bạn/bạn. Các câu hướng tới sinh viên dùng danh xưng sinh viên; thông báo quản trị được viết trung tính. Nguồn mẫu mặc định áp dụng cho lần tạo mới, không ghi lại dữ liệu/mẫu khóa. Không đổi nghiệp vụ hoặc mã lỗi. Check797/797 qua; bằng chứng XUNG_HO_SINH_VIEN_2026_10_30.md, tiến độ giữ138/219.
