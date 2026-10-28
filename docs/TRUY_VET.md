# Bảng truy vết yêu cầu — Điều chỉnh số 01 sau Tuần 6

Tuần 4 thực hiện từ **22/10/2026**, mốc kế hoạch giả định **21–27/10/2026**. Tuần 3 làm **21–22/10**, sau mốc 14–20/10; bằng chứng lịch sử Tuần 2 giữ ngày thực hiện 21/10. Nguồn mã/ưu tiên: [đặc tả](DAC_TA_NGHIEP_VU.md), [YEU_CAU](YEU_CAU.md); tiến độ chính thức ở [PROGRESS](PROGRESS.md).

**Cách đọc mốc lịch sử trước điều chỉnh:** Tuần6 bắt đầu22/10, tiếp tục28/10 (mốc giả định04–10/11). FR-01–08/10–12/20–22/30–35/101/102 đã nghiệm thu trong phạm vi mã hiện có. Tiến độ62/163=38,0%. Không nhận quyền toàn hệ thống hoàn tất khi module nghiệp vụ chưa triển khai. WF là wireframe tĩnh, không thay chức năng thực.

Điều chỉnh số01 thêm 21 FR và 19 BR theo [prompt nguyên văn](BO_SUNG_01_TAC_NHAN.md). Mẫu số mới 219; số 62/163 phía trên giữ nguyên tại mốc nghiệm thu Tuần6. Bằng chứng Tuần1–6 dưới đây có trước điều chỉnh: kiểm bảy vai trò không thay kiểm mười vai trò. G1 đang bổ sung quyền/dữ liệu nền/mẫu; chưa có lệnh **BẮT ĐẦU TUẦN 7**. Ma trận chi tiết: [MA_TRAN_QUYEN](MA_TRAN_QUYEN.md).

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

FR đã nghiệm thu trước điều chỉnh được ghi ở mục2. FR-20–22 hiện chuyển chủ sở hữu: PĐT dữ liệu đào tạo/import, ADMIN khoa/bộ môn; kiểm quyền mới truy vết FR-140/141 và TC-PDT-01. Bằng chứng Tuần5 vẫn giữ đúng thời điểm và không tự chứng minh quyền mới. Các dòng dưới chưa hoàn thành; schema hoặc thiết kế không thay giao diện/service nghiệp vụ.

| Mã FR  | Tuần dự kiến | Wireframe / luồng thiết kế                                                     | Miền service/policy dự kiến                                  | Test nghiệm thu FR                                                                                 |
| ------ | ------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| FR-09  | P2, chưa xếp | [WF-01](wireframes/tuan-02.html#wf-01)                                         | phiên/thiết bị; chưa triển khai                              | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-40  | 7            | [WF-08](wireframes/tuan-02.html#wf-08)                                         | campaigns; có bảng/seed, chưa service/UI                                     | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-41  | 7            | [WF-08](wireframes/tuan-02.html#wf-08)                                         | campaigns; có bảng/seed, chưa service/UI                                     | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-42  | 7            | [WF-09](wireframes/tuan-02.html#wf-09)                                         | campaigns / phê duyệt; có bảng/seed, chưa service/UI                         | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-43  | 7            | [WF-04](wireframes/tuan-02.html#wf-04), [WF-08](wireframes/tuan-02.html#wf-08) | campaigns / snapshot tasks; có bảng/seed, chưa service/UI                    | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-44  | 7            | [WF-08](wireframes/tuan-02.html#wf-08)                                         | campaigns / ensure*; chưa triển khai                         | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-45  | 7            | [WF-08](wireframes/tuan-02.html#wf-08)                                         | campaigns / ensure*; chưa triển khai                         | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-46  | 7            | [WF-04](wireframes/tuan-02.html#wf-04), [WF-08](wireframes/tuan-02.html#wf-08) | campaigns / snapshot tasks; chỉ blueprint                    | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-47  | 9            | [WF-08](wireframes/tuan-02.html#wf-08)                                         | nhắc chưa hoàn thành; chưa triển khai                        | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-50  | 8            | [WF-04](wireframes/tuan-02.html#wf-04)                                         | surveys / task của actor; chưa triển khai                    | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-51  | 8            | [WF-05](wireframes/tuan-02.html#wf-05)                                         | surveys / form và nháp browser; chưa triển khai              | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-52  | 8            | [WF-05](wireframes/tuan-02.html#wf-05)                                         | surveys / form và nháp browser; chưa triển khai              | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-53  | 8            | [WF-06](wireframes/tuan-02.html#wf-06)                                         | surveys / submit transaction; chưa triển khai                | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-54  | 8            | [WF-06](wireframes/tuan-02.html#wf-06)                                         | surveys / submit transaction; chưa triển khai                | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
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
| FR-100 | 7            | [WF-17](wireframes/tuan-02.html#wf-17)                                         | Settings nền đã migrate; chưa cấu hình ngưỡng khảo sát                                      | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-103 | 14           | CLI sao lưu/phục hồi; chưa có script                                           | backup / restore; chưa triển khai                            | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-110 | P2, chưa xếp | Chưa có màn riêng; AI tắt mặc định                                             | mở rộng AI, cần người dùng đồng ý; chưa triển khai           | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-111 | P2, chưa xếp | [WF-08](wireframes/tuan-02.html#wf-08)                                         | API trạng thái hoàn thành; chưa triển khai                   | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-112 | P2, chưa xếp | [WF-10](wireframes/tuan-02.html#wf-10)                                         | đánh giá riêng giảng viên; chưa triển khai                   | Chưa có; triển khai đúng tuần nêu bên trái                                                         |

| FR-140 | G1 / bù Tuần6 | Danh mục đào tạo/import; ADMIN khoa/bộ môn | can.ts, catalog.ts, imports.ts và menu; điều chỉnh từ code ĐBCL cũ | Chưa nghiệm thu mới: TC-PDT-01, TC-ALL-01 phần hiện có; chờ kết quả chạy thật |
| FR-141 | G1 / bù Tuần6 | PĐT khóa/mở khóa học kỳ | catalog.ts, audit.ts, mail.ts; guard kỳ khóa | Chưa nghiệm thu mới: BR-51, lý do mở khóa/audit/thư; chờ kết quả chạy thật |
| FR-142 | 7 | Readiness đợt RS-01–RS-06 | campaign readiness/confirmation; chưa triển khai | Chưa nghiệm thu mới: TC-PDT-02; blocking/warning/snapshot/hash |
| FR-143 | 7 | PĐT xác nhận/trả về dữ liệu đợt | CampaignDataConfirmation và transition; chưa triển khai | Chưa nghiệm thu mới: TC-PDT-02; CHO_XAC_NHAN_DL→CHO_DUYET/trả NHAP có lý do |
| FR-144 | 7 | Cảnh báo dữ liệu đổi khi đợt mở | recompute hash/freeze/notifications; chưa triển khai | Chưa nghiệm thu mới: TC-PDT-03; vẫn chốt hiện tại, không đổi task sau chốt |
| FR-145 | 7, P1 | Lô nhập/hoàn tác chưa dùng trong đợt đã chốt | ImportBatch; chưa triển khai, không tự cắt | Chưa nghiệm thu mới: BR-55; thiếu test, chỉ hiện thực nếu đủ thời gian |
| FR-146 | 10 | Hàng đợi TO_CHUC_LOP_HOC | feedback routing/PĐT; chưa triển khai | Chưa nghiệm thu mới: BR-54; scope, SLA, forward, privacy Tuần10–11 |
| FR-147 | 12, P1 | Dashboard PĐT | reports/readiness/feedback; chưa triển khai | Chưa nghiệm thu mới: BR-67; ngưỡng và không định danh, kiểm tệp xuất |
| FR-148 | G1 / bù Tuần6 | Trình soạn/xem trước cờ nhóm đánh giá và mẫu mặc định mới | CriterionGroup.isAssessmentGroup, templates/template-input/default seed | Chưa nghiệm thu mới: Kiểm cờ lưu/đọc/clone/version, giữ mẫu khóa cũ; chờ kết quả chạy thật |
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
| FR-160 | G1 một phần / đầy đủ Tuần13 | Ma trận 10 vai trò; IDOR chức năng hiện có | MA_TRAN_QUYEN, can/access/workspace và service hiện có | Chưa nghiệm thu mới: TC-ALL-01 một phần; tương lai hồ sơ/thống kê/tệp xuất chưa nghiệm thu |

## 4. Truy vết 33 BR gốc và điểm mở rộng

Mã giữ nguyên đặc tả, không có BR-19 hoặc BR-29. Test cấu trúc đáp ứng **một phần BR-03**. Tuần 3 thêm kiểm BR-30/31/33 trong miền auth và guard BR-34; không tuyên bố quy tắc đã hoàn thành trên các module chưa có. Các CHECK SQL là hỗ trợ dữ liệu nền, không thay service/policy nghiệp vụ.

| BR    | Wireframe / luồng                                                                                                      | Thiết kế / miền phụ trách                                                                 | Test hiện có hoặc phần cần viết                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| BR-01 | [WF-04](wireframes/tuan-02.html#wf-04), [WF-08](wireframes/tuan-02.html#wf-08)                                         | CampaignSection/SurveyTask snapshot lúc mở; bổ sung xác nhận/hash BR-52/53                   | Chưa có; Tuần 7 kiểm đăng ký sau mở không đổi task                                                                 |
| BR-02 | [WF-06](wireframes/tuan-02.html#wf-06)                                                                                 | Cập nhật có điều kiện task + response/answers cùng transaction                            | Chưa có; Tuần 8 kiểm nộp lần hai và 20 request                                                                     |
| BR-03 | [WF-05](wireframes/tuan-02.html#wf-05), [WF-06](wireframes/tuan-02.html#wf-06), [WF-16](wireframes/tuan-02.html#wf-16) | THIET_KE_AN_DANH, ADR-003; vùng phiếu biệt lập                                            | Có test DMMF 5.6a; chưa có 5.6b/c/d và log/export runtime                                                          |
| BR-04 | [WF-04](wireframes/tuan-02.html#wf-04), [WF-05](wireframes/tuan-02.html#wf-05), [WF-06](wireframes/tuan-02.html#wf-06) | Service submit kiểm thời gian/trạng thái/mẫu/giá trị                                      | Chưa có; Tuần 8 kiểm ngoài giờ, câu bắt buộc, sai metadata/loại                                                    |
| BR-05 | /mau-phieu, trình soạn/khóa/phiên bản | services/templates.ts, mutex/CAS, family/version/lock | Tuần6 unit/HTTP20/UI14 qua, gồm trạng thái đợt đã duyệt và cây/phiếu cũ bất biến; workflow phê duyệt tự khóa trong cùng transaction chờ Tuần7 |
| BR-06 | [WF-08](wireframes/tuan-02.html#wf-08), [WF-09](wireframes/tuan-02.html#wf-09)                                         | Campaign state machine / history / quyền / thời gian                                      | Chưa có; Tuần 7 kiểm duyệt, lý do, không đổi phạm vi/mẫu                                                           |
| BR-07 | [WF-10](wireframes/tuan-02.html#wf-10), [WF-16](wireframes/tuan-02.html#wf-16)                                         | Results / ngưỡng số phiếu và tỷ lệ / policy                                               | Chưa có; Tuần 9 kiểm cả hai ngưỡng và dữ liệu gộp                                                                  |
| BR-08 | [WF-03](wireframes/tuan-02.html#wf-03), [WF-10](wireframes/tuan-02.html#wf-10)                                         | Results policy / trạng thái công bố và phạm vi; thêm KT BR-57, TT BR-65                                            | Chưa có; Tuần 9 kiểm trước/sau công bố theo role                                                                   |
| BR-09 | [WF-11](wireframes/tuan-02.html#wf-11)                                                                                 | Moderation + audit actor cán bộ, không ghép sinh viên                                     | Chưa có; Tuần 9 kiểm ẩn/hiện, lý do và audit đã che dữ liệu                                                        |
| BR-10 | [WF-15](wireframes/tuan-02.html#wf-15)                                                                                 | ImprovementPlan / history / hạn và người xác nhận                                         | Chưa có; Tuần 9/11 kiểm sinh yêu cầu, gửi/bổ sung/xác nhận                                                         |
| BR-11 | [WF-10](wireframes/tuan-02.html#wf-10)                                                                                 | Aggregation / Decimal / làm tròn cuối                                                     | Chưa có; Tuần 9 viết TC-AGG-01, NA và dữ liệu không hợp lệ                                                         |
| BR-12 | [WF-04](wireframes/tuan-02.html#wf-04), [WF-08](wireframes/tuan-02.html#wf-08), [WF-10](wireframes/tuan-02.html#wf-10) | Tỷ lệ DONE / snapshot task                                                                | Chưa có; Tuần 9 kiểm 4/10=40% và mẫu số bằng 0                                                                     |
| BR-13 | [WF-08](wireframes/tuan-02.html#wf-08), [WF-16](wireframes/tuan-02.html#wf-16)                                         | Task status list / scope / reminder / audit                                               | Chưa có; Tuần 9 kiểm không kèm nội dung, audit và tối đa 1 nhắc/ngày                                               |
| BR-14 | [WF-08](wireframes/tuan-02.html#wf-08)                                                                                 | API/tệp trạng thái hoàn thành, P2                                                         | Chưa có; chưa xếp tuần, không tích hợp hệ thống điểm thật                                                          |
| BR-15 | [WF-08](wireframes/tuan-02.html#wf-08)                                                                                 | Campaign gia hạn/đóng sớm, reason/history/notification                                    | Chưa có; Tuần 7 kiểm đúng quyền, lý do và thông báo                                                                |
| BR-16 | [WF-08](wireframes/tuan-02.html#wf-08), [WF-10](wireframes/tuan-02.html#wf-10), [WF-18](wireframes/tuan-02.html#wf-18) | Nhiều TeachingAssignment, đánh giá ở mức lớp                                              | Có SQL nền chặn phân công trùng; chưa test khảo sát chung lớp Tuần 7–9                                             |
| BR-17 | [WF-08](wireframes/tuan-02.html#wf-08), [WF-12](wireframes/tuan-02.html#wf-12), [WF-18](wireframes/tuan-02.html#wf-18) | Semester.lockedAt, service mọi thao tác ghi theo kỳ; chủ sở hữu PĐT BR-51                                       | Bằng chứng lịch sử: SQL W2-DB-07 chỉ kiểm ngày; Tuần5 có guard khóa sổ. Đổi quyền PĐT và mở khóa có lý do/thông báo truy vết BR-51 trong G1                                          |
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
| BR-50 | FR-140; FR-20–22 | G1 bù Tuần6 | can/catalog/import + audit actor PĐT | TC-PDT-01; chờ nghiệm thu G1 |
| BR-51 | FR-141 | G1 bù Tuần6 | khóa/mở học kỳ: reason/audit/thông báo ĐBCL | BR-51; chờ nghiệm thu G1 |
| BR-52 | FR-142/143 | 7 | readiness RS-01–RS-06 + bản chụp xác nhận | TC-PDT-02; chưa triển khai |
| BR-53 | FR-144; FR-43 | 7 | mã băm khi mở, chốt hiện tại/cảnh báo/không đổi task sau chốt | TC-PDT-03; chưa triển khai |
| BR-54 | FR-146 | 10–11 | PĐT đúng loại/lý do chuyển/SLA2–5/leo thang | Chưa triển khai/test |
| BR-55 | FR-145 | 7, P1 | ImportBatch/hash/hoàn tác chỉ khi chưa chốt | Chưa triển khai/test; không tự cắt |
| BR-56 | FR-149 | 10–11 | KT đúng loại/SLA2–5/lời nhắc phúc khảo | TC-KT-02; chưa triển khai |
| BR-57 | FR-148/150 | Cờ G1; kết quả9 | cờ nhóm/mẫu mặc định; gộp2GV/đủ phiếu/sau công bố | Cờ chờ nghiệm thu G1; TC-KT-01 kết quả chưa triển khai |
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
| BR-68 | FR-160 | G1 nền; đầy đủ13 | ADMIN không kết quả/nội dung phản hồi/hồ sơ TT | Deny default G1 chờ nghiệm thu; module tương lai chưa có |

## 4.2. Đăng ký chín mã test Mục F

Đây là kế hoạch kiểm và chỗ ghi bằng chứng. Trước khi nghiệm thu G1, không gán PASS/CI cho các mã mới. Các test tương lai chỉ viết/chạy khi đến tuần tương ứng; tên TC là mã nghiệm thu, không nhất thiết một file mỗi TC.

| Mã test | Tuần/phạm vi | Yêu cầu | Điều phải chứng minh | Trạng thái/bằng chứng hiện tại |
| --- | --- | --- | --- | --- |
| TC-PDT-01 | G1 bù Tuần6 | FR-140, BR-50 | ADMIN tạo/sửa lớp và import bị chặn; PĐT thành công. Kiểm DBCL mất quyền ghi, ADMIN chỉ tổ chức, actor audit. | Chờ kết quả G1; không dùng HTTP22 của Tuần5 để nhận quyền mới. |
| TC-PDT-02 | 7 | FR-142/143, BR-52 | RS-01/02/03 chặn, RS-04/05/06 cảnh báo; không xác nhận khi còn chặn; lưu hash/snapshot, trả về phải có lý do. | Chưa triển khai. |
| TC-PDT-03 | 7 | FR-144, BR-01/53 | Xác nhận → đổi đăng ký → mở: vẫn chốt theo dữ liệu hiện tại, có audit/cảnh báo PĐT+ĐBCL; đổi sau chốt không đổi task. | Chưa triển khai. |
| TC-KT-01 | 9 | FR-150, BR-57 | Chỉ nhóm cờ sau công bố; ≥2 GV khác nhau/tổng phiếu đủ ngưỡng; không lớp/GV/tự luận, thiếu ngưỡng có thông báo. | Chưa triển khai; G1 chỉ có cờ, chưa có kết quả gộp. |
| TC-KT-02 | 10–11 | FR-149, BR-56 | Đúng hàng đợi thi/lời nhắc phúc khảo, ẩn danh, chuyển có lý do, tiếp nhận2/trả lời5ngày và leo thang. | Chưa triển khai. |
| TC-TT-01 | 10 | FR-153/155, BR-61 | GV/TBM/TK liên quan không thấy/không được giao; kể cả tài khoản có TT; list/count/detail/attachment không lộ và trả404. | Chưa triển khai. |
| TC-TT-02 | 10–11 | FR-154/156, BR-62 | ADMIN/ĐBCL bị chặn, LĐ chỉ tóm tắt, TT không xung đột mới đầy đủ; audit mở hồ sơ/tải tệp. | Chưa triển khai. |
| TC-TT-03 | 10–11 | FR-153/156, BR-63 | Mặc định hoàn toàn ẩn danh; cho TT biết thì chỉ TT hợp lệ thấy/audit; người bị phản ánh không thấy danh tính. | Chưa triển khai. |
| TC-ALL-01 | G1 một phần / đầy đủ13 | FR-160, BR-34/61/62/67/68 | Ma trận10vai trò + IDOR trên từng function/scope; nhiều grant/MFA; sau này bổ sung kết quả, hồ sơ, dashboard và kiểm tệp xuất. | G1 hiện có chờ kết quả; đầy đủ Tuần13. Không coi deny action chưa tồn tại là đã kiểm luồng. |

## 4.3. Cập nhật nghiệm thu G1

Chỗ này dành cho mã commit/command/số test/ảnh/CI thật sau kiểm thử. Hiện chưa thêm bằng chứng G1. Bằng chứng Tuần6 ở mục1.4 giữ đúng bộ bảy vai trò và mẫu phiếu trước điều chỉnh; không ghi ngược như đã có ba tác nhân mới. FR-160 còn phạm vi tương lai và kiểm tệp xuất; chỉ tick khi có quyết định nghiệm thu xác định rõ phạm vi.

## 5. Quy tắc cập nhật

Khi hiện thực mỗi tuần, thay tên miền dự kiến bằng đường dẫn service/policy thật và tên test gắn mã, ghi command/commit/CI/ảnh thật; chỉ tick PROGRESS sau test và nghiệm thu. Tệp xuất/trạng thái chưa hoàn thành là luồng riêng, không ghép với phiếu. Các sơ đồ, wireframe, blueprint và checklist là thiết kế có thể review, không thay bằng chứng runtime.
