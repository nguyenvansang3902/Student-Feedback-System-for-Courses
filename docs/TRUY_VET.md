# Bảng truy vết yêu cầu — Tuần 13 sau Điều chỉnh số 01

Cập nhật 05/11/2026. Nguồn chức năng `831d14decd9d6a562a1f9ecc0a53f6a4fadc8248`; [CI 41904262769](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41904262769) đã qua check/e2e/smoke đúng nguồn đã sửa harness lịch. Đã chốt FR/điểm ngày 05/11; các mốc dưới bảng là lịch sử.

| Yêu cầu | Bằng chứng hiện có | Giới hạn |
| --- | --- | --- |
| FR-160, TC-ALL-01; BR-61/62/67/68 |801/801 test:700 ô 70 action×10 vai trò+41 tình huống+60 tài nguyên; [runtime](assets/tuan-13/runtime-regression.json)227 nhóm/15 bộ+demo 19,9 mã Mục F | Manifest giữ các lượt kế thừa, không nhận cùng snapshot bất biến; FR-160 đã nghiệm thu 05/11 |
| NFR kiểm thử/build | [Check/build 05/11](assets/tuan-13/check-build-after-calendar.json):2.155 passed+1 Windows symlink skipped/2.156 trong 93 tệp; coverage 78,49/73,48/82,22/79,69%; build 101 route động, ID `Q1SY2ZcIAr3Do--HbL1SZ` | Check cục bộ và CI nguồn mới đều qua; lỗi harness lượt trước giữ là lịch sử |
| UC-GOLD; 9 FR Tuần 12 | [Kiểm tay đủ các bước](assets/tuan-13/manual-uc-gold.json) đã qua,8 PNG đã xem; [CSV Lãnh đạo/ĐBCL](assets/tuan-13/manual-export-verification.json)3.745/3.011 byte có BOM, đúng vai trò/phạm vi/5 phiếu/100%/mean số 2 | Chỉ CUA browser UI trên demo giả; không helper HTTP/đồng hồ giả/ghi database chính. Chờ hết SLA kiểm runtime riêng; FR đã nghiệm thu sau CI đúng nguồn |
| NFR-15 | E2E 6/6, axe 34 trạng thái 0 vi phạm,17 PNG tự động đã xem |7 incomplete/168 node cần kiểm tay khả năng tiếp cận; không chứng nhận WCAG |
| NFR-16; BR-04/33 | Khóa MySQL 8/8, tải 200/200,0 HTTP 500/lỗi mạng, race 20 một phiếu | **p95 3.595,91 ms>3.000 ms**, chưa đạt toàn bộ |
| BR-68; bảo mật | Bản vá policy ADMIN đa vai trò, nonce CSP/header, budget nộp 30 request/60 giây | Scan partial 40 tệp/8 bề mặt, audit 24 moderate/tám production, HTTP productionbuild mới chưa xác minh |
| Database/vận hành | [Main](assets/tuan-13/main-data-verification.json)45 bảng/1.575 người dùng,9.709 bản ghi cũ giữ hash; restore độc lập 46 bảng/9.722 dòng khớp | Guard trước mở scheduler; [runtime](assets/tuan-13/local-runtime-verification.json)3 HTTP 200, không áp dụng migration mới/seed/reset/đổi credential; không nhận hash bất biến sau công việc runtime bình thường |

Đã chốt 211/219=96,3%,78/84 FR; chín FR Tuần 12 và FR-160 hoàn tất. FR-145 backlog, sáu FR 09/103/110/111/112/145 chưa xong. [Nghiệm thu](NGHIEM_THU_TUAN_13.md), [báo cáo](bao-cao-tien-do/tuan-13.md); không làmTuần 14/UI-n.

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

## 3. Truy vết FR sau mốc lịch sử Tuần 1–6

FR đã nghiệm thu trước điều chỉnh được ghi ở mục2. FR-20–22 hiện chuyển chủ sở hữu: PĐT dữ liệu đào tạo/import, ADMIN khoa/bộ môn; kiểm quyền mới truy vết FR-140/141 và TC-PDT-01. Bằng chứng Tuần5 vẫn giữ đúng thời điểm và không tự chứng minh quyền mới. Các tuần đã triển khai có bằng chứng theo mốc ở các mục bên dưới; schema hoặc thiết kế không thay giao diện/service nghiệp vụ. Tuần11 đã chốt theo hồ sơ riêng. Các dòng Tuần12 ghi mã và kiểm đã qua, gồm CI đúng SHA; nghiệm thu toàn tuần vẫn chờ kiểm tay lõi, không tự cộng FR từ bảng truy vết này.

| Mã FR  | Tuần dự kiến | Wireframe / luồng                                                     | Service/policy và mức hiện thực                                  | Test và trạng thái nghiệm thu FR                                                                                 |
| ------ | ------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| FR-09  | P2, chưa xếp | [WF-01](wireframes/tuan-02.html#wf-01)                                         | phiên/thiết bị; chưa triển khai                              | Chưa có; triển khai đúng tuần nêu bên trái                                                         |
| FR-40 | 7 | /dot-khao-sat/moi và /dot-khao-sat/:id | campaigns.ts::createCampaign/updateCampaign, campaign-input.ts, can.ts | Unit campaign-services; W7-HTTP04/14 kiểm bốn phạm vi và CAS; bảng bằng chứng mục4.4 |
| FR-41 | 7 | GLOBAL/FACULTY/DEPARTMENT/SECTIONS | campaign-input.ts, campaigns.ts, campaign-readiness.ts | W7-HTTP04: đúng lớp hiện tại, paging, chặn lớp khác kỳ và payload sai scope |
| FR-42 | 7 | ĐBCL trình → PĐT xác nhận → lãnh đạo duyệt/từ chối | campaigns.ts::performCampaignAction, khóa mẫu cùng transaction | W7-HTTP05–07/13/16, campaign-services; lý do, vòng xác nhận mới, duyệt muộn mở ngay |
| FR-43 | 7 | Chốt lớp/nhiệm vụ khi mở | campaign-lifecycle.ts::advanceCampaignState, campaign-readiness.ts | W7-HTTP08/09:20ensure, hash lệch chốt hiện tại, đăng ký sau mở không đổi task |
| FR-44 | 7 | Scheduler và ensure qua list/detail/action | scripts/scheduler.ts, campaign-lifecycle.ts, campaigns.ts | W7-HTTP08/12/15/16: CLI thật, first access, catch-up OPEN→CLOSE/giờ thật, lặp an toàn |
| FR-45 | 7 | Gia hạn/đóng sớm/hủy/rút trước mở | campaigns.ts, campaign-notifications.ts, mail.ts | W7-HTTP11–13; W7-SETTINGS10–12: reason/state, queue/dedup, SMTP/backoff/lease; giới hạn SMTP mục4.4 |
| FR-46 | 7 | /dot-khao-sat/:id, tiến độ theo lớp | campaigns.ts::getCampaignProgress, SurveyTask groupBy | W7-HTTP10:4task/1DONE=25%, paging, không định danh SV/phiếu/đáp án, PĐT403 |
| FR-47 | 9 | /chua-hoan-thanh | survey-reminders.ts, scheduler, Notification/EmailOutbox | Đã nghiệm thu Tuần9 ở mục4.6: HTTP/UI kiểm scope/PENDING/count và tối đa1nhắc/SV/đợt/ngày; không ghép phiếu |
| FR-50 | 8 | /khao-sat, [WF-04](wireframes/tuan-02.html#wf-04) | student-surveys.ts::listStudentSurveys; can.ts; survey-list.tsx | Unit/HTTP taskown/list/count/paging/IDOR; gate cuối mục4.5 đã qua |
| FR-51 | 8 | /khao-sat/:taskId, [WF-05](wireframes/tuan-02.html#wf-05) | getStudentSurvey, student-survey-input.ts, survey-form.tsx | Năm loại/cả hai thang/NA/bắtbuộc, server kiểm lại; unit/HTTP, QA cuối mục4.5 |
| FR-52 | 8 | Form/nháp cục bộ | survey-draft.ts, survey-form.tsx, logout-button.tsx | Unit whitelist/version/quota/retention, epoch/đa tab/clock; QA cuối mục4.5 đã qua |
| FR-53 | 8 | POST /api/student-surveys/:taskId/submit | submitStudentSurvey: CAS task+response+answers cùng transaction, DATE Việt Nam | HTTP20POST chỉ1success/19x409, duplicate/frozen; rollback/DTO/log và gate cuối mục4.5 |
| FR-54 | 8 | /khao-sat/:taskId/da-nop | survey-confirmation.tsx, getStudentSurvey; POST chỉ status/day | PENDING chuyển form, DONE template=null, không đọc/ID/bản sao phiếu; mất phản hồi đọc lại task, QA cuối mục4.5 |
| FR-60 | 9 | Tổng hợp đợt, /ket-qua | survey-score.ts, survey-results-mutations.ts, AggregateResult.details | Đã nghiệm thu Tuần9 ở mục4.6: unit phân số/NA/thang gốc, HTTP12nhóm có TC-AGG-01 và kết quả tính tay |
| FR-61 | 9 | Kết quả đủ/thiếu điều kiện công bố | eligibleToPublish, read DTO suppression | Đã nghiệm thu Tuần9: kiểm ngưỡng số phiếu/tỷ lệ chính xác; lớp thiếu mẫu không có điểm/TEXT, đợt vẫn công bố được |
| FR-62 | 9 | Tổng hợp/công bố đợt | aggregateSurveyResults/publishSurveyResults, mutex/CAS/history/requestId | Đã nghiệm thu Tuần9:10POST chỉ1thắng, rollback lớp cuối/retry, kỳ khóa; bằng chứng mục4.6 |
| FR-63 | 9 | /ket-qua và chi tiết lớp | resultSectionScopeWhere, survey-results.ts | Đã nghiệm thu Tuần9: unit/HTTP/UI10vai trò, scope/IDOR/fresh grant, KT+GV và ADMIN bị giữ đúng quyền |
| FR-64 | 9 | So sánh bộ môn/khoa/kỳ trước | poolSurveyScores, survey-results.ts | Đã nghiệm thu Tuần9: gộp theo số đếm/tổng gốc, unit tính tay/HTTP/UI; Tuần12 tái sử dụng công thức, không lấy trung bình điểm đã làm tròn |
| FR-65 | 9 | /kiem-duyet | survey-moderation.ts, survey-results-settings.ts | Đã nghiệm thu Tuần9: TEXT-only/reason/CAS/freshMFA/audit, UI duyệt3gópý rồi công bố; bằng chứng mục4.6 |
| FR-66 | 11 | /giai-trinh và chi tiết giải trình | improvements.ts, improvement-workflows policy; publish hook tạo yêu cầu bắt buộc | Đã nghiệm thu Tuần11: improvement-workflows tests, verify-week11-workflows.ts; gửi/bổ sung/xác nhận và nhắc hạn, bằng chứng cuối tệp |
| FR-70 | 10 | /phan-hoi/gui, /phan-hoi/:id | feedback.ts/createFeedback, feedback-types, feedback-attachments và kho riêng | Hoàn thành: HTTP19/19 có BR-20/24/28, nội dung10.000ký tự, tệp giả/quá số/quá dung lượng; UI gửi thật |
| FR-71 | 10 | /phan-hoi và hàng đợi theo actor | policies/feedback.ts, recipientsFor/queueWhere, policy can.ts | Hoàn thành: tám tuyến, primary/copy, danh sách/tổng số/IDOR và quyền mới; HTTP/ma trận10vai trò |
| FR-72 | 10 | /phan-hoi/:id | transitionFeedback, FeedbackHistory, revision/requestId | Hoàn thành: tám lệnh đồng thời1thành công/7x409, một lịch sử; retry/hash conflict/kỳ khóa, không API sửa lịch sử |
| FR-73 | 10 | /phan-hoi/:id | addFeedbackMessage, DTO và feedback-detail.tsx | Hoàn thành: trao đổi retry không trùng; handlerẩn danh, SV đọc trả lời và đóng qua UI; không liên kết vùng phiếu khảo sát |
| FR-74 | 11 | Hàng đợi, chi tiết phản hồi và scheduler | feedback-sla.ts, workflow-settings.ts, feedback-deadlines.ts; ledger, CAS và con trỏ | Đã nghiệm thu Tuần11: verify-week11-feedback.ts, feedback-sla-access tests; ngày làm việc, nhắc/leo thang lặp an toàn, đơn vị inactive bị loại |
| FR-75 | 11 | Sinh viên đánh giá và mở lại tại chi tiết phản hồi | feedback-satisfaction.ts, feedback.ts | Đã nghiệm thu Tuần11: verify-week11-feedback.ts; hài lòng7ngày, điểm≤2 mở lại tối đa1lần, tranh chấp/retry và giới hạn gửi |
| FR-76 | 10 | /phan-hoi/:id | transitionFeedback và FeedbackRecipient.isActive | Hoàn thành: lý do bắt buộc, chuyển về MOI, người cũ GET/ghi404; receipt retry không nhân lịch sử hoặc lộ nội dung |
| FR-80 | 11 | /thong-bao, đọc một/tất cả | notifications.ts, domain-notifications.ts, notification-access.ts | Đã nghiệm thu Tuần11: notifications/domain-notifications/CSRF/UI tests và verify-week11-notifications.ts; chỉ thông báo riêng còn quyền |
| FR-81 | 11 | Email chung mời đăng nhập, Mailpit | Domain outbox, mail.ts, worker có lease/retry và kiểm lại quyền | Đã nghiệm thu Tuần11: 10nhóm MySQL/SMTP cùng FR-80; hai worker, retry và đổi scope; cửa sổ SMTP gửi lặp được ghi trong hồ sơ |
| FR-82 | 11 | Nhắc khảo sát, SLA, giải trình và kiến nghị | campaign/SLA/workflow jobs; khóa chống trùng và con trỏ | Đã nghiệm thu Tuần11: verify-week11-feedback/workflows/notifications.ts; nhắc đúng quyền, không nhân thông báo khi chạy lại |
| FR-90 | 12 | /bao-cao, bộ lọc/góc nhìn10vai trò | reports.ts, policies/reports.ts, reports-http.ts, reports-dashboard.tsx | Đã hiện thực; reports-policy/services/route/client/UI tests, MySQL13nhóm, E2E10vai trò và CI nguồn qua; chờ kiểm tay lõi để chốt tuần |
| FR-91 | 12 | /bao-cao, biểu đồ và so sánh theo kỳ | reports.ts và report-view.tsx dùng cùng DTO, ô che không vẽ thành0 | Đã hiện thực; reports-metrics/UI/client tests, E2E5vai trò desktop/mobile và CI nguồn qua; phạm vi xem ảnh ghi ở QA |
| FR-92 | 12 | /api/reports/export, CSV/Excel | prepareReportsExport, reports-export.ts; audit trước trả DTO, cùng quyền/ngưỡng | Đã hiện thực; MySQL canary từ service, reports-export tests và bộ đọc file10nhóm qua; CI nguồn qua, chờ chốt tuần |
| FR-93 | 12 | /api/reports/export, PDF tiếng Việt | reports-export.ts, Noto Sans cục bộ có giấy phép, phân trang | Đã hiện thực; parser PDF/bytes cùng bộ10nhóm qua, PDF5trang đã mở xem; CI nguồn qua, không suy mọi bố cục đã kiểm |
| FR-94 | 12 | /bao-cao, thống kê xử lý phản hồi | reports-metrics.ts, reports.ts; số lượng/thời gian/quá hạn/hài lòng, ngưỡng từng mẫu số | Đã hiện thực; metrics unit và MySQL13nhóm qua, tỷ lệ có mẫu số, giữ mốc lịch sử, CI nguồn qua; chờ chốt tuần |
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
| FR-146 | 10–11 | /phan-hoi?view=queue cho PĐT | initialFeedbackRoles/queueWhere, feedback.ts, feedback-sla.ts | Lõi nghiệm thu Tuần10, SLA/leo thang nghiệm thu Tuần11: verify-week11-feedback.ts kiểm tuyến PĐT→ĐBCL→LĐ và fresh scope |
| FR-147 | 12, P1 | /bao-cao, góc nhìn PĐT | reports.ts/readiness, policies/reports.ts; TO_CHUC_LOP_HOC | Đã hiện thực; MySQL13nhóm kiểm readiness/đơn vị/DTO không roster và canary xuất; E2E/CI nguồn qua, chờ kiểm tay lõi |
| FR-148 | G1 / bù Tuần6 | Trình soạn/xem trước cờ nhóm đánh giá và mẫu mặc định mới | CriterionGroup.isAssessmentGroup, templates/template-input/default seed | Đạt G1: TC-FR148-01–09 trong templates/default-template-seed tests; HTTP20, demo12, UI lưu/reload/preview; giữ cây mẫu khóa cũ |
| FR-149 | 10–11 | /phan-hoi và /phan-hoi/cau-hinh | tuyến Khảo thí, feedback-settings, examNotice DTO, feedback-sla.ts | Lõi nghiệm thu Tuần10; verify-week11-feedback.ts kiểm SLA/leo thang tuyến KT→ĐBCL→LĐ, không mở mặc định loại kiểm tra thành phần |
| FR-150 | 9; hồi quy12 | Kết quả nhóm đánh giá gộp | projection ASSESSMENT trong survey-results.ts, helper đóng góp LIKERT | Đã nghiệm thu Tuần9 ở mục4.6: TC-KT-01 ≥2GV/đủ mẫu/không lớp-GV-TEXT; Tuần12 thêm hồi quy all-NA cho helper dùng chung |
| FR-151 | 12, P1 | /bao-cao, góc nhìn Khảo thí | reports.ts, reports-metrics.ts; nhóm đánh giá gộp và phản hồi thi | Đã hiện thực; MySQL13nhóm/canary, ngưỡng2GV thực sự góp LIKERT, ô môn/tổng cha và phản hồi thi; E2E/CI nguồn qua, chờ chốt tuần |
| FR-152 | 11, P1 | /kien-nghi và phản hồi TBM | exam-recommendations.ts, improvement-workflows policy, nhắc hạn | Đã nghiệm thu Tuần11: verify-week11-workflows.ts; dữ liệu gộp đủ mẫu, đúng TBM, lý do/14ngày/nhắc TBM/báo TK, CAS/retry |
| FR-153 | 10 | /phan-hoi/gui loại nghiêm trọng | createFeedbackSchema/createFeedback, InspectionCase TIEP_NHAN | Hoàn thành: năm vi phạm, mức KHIEU_NAI cố định, cảnh báo/ack, hai mức danh tính; quota6request đồng thời thêm đúng3 khi đã có2 |
| FR-154 | 10 tiếp nhận / 11 hoàn tất | /thanh-tra và /thanh-tra/:id | inspection-workflow.ts, InspectionCase/Event/Note, private attachments; SLA | Đã nghiệm thu Tuần11: verify-week11-inspection.ts7nhóm và feedback14nhóm; xác minh→kết luận→thông báo→đóng, ghi chú/tệp nội bộ,3/30ngày làm việc |
| FR-155 | 10 | /thanh-tra, /phan-hoi, route tải tệp | hasInspectionConflict/canReadInspection/inspectionScope; fresh actor | Hoàn thành: GV/TBM/TK liên quan kể cả đaTT bị loại list/count/404/giao/tải; conflict mới có hiệu lực ngay; TC-TT-01/02/03 phần hiện có |
| FR-156 | 11 | Kết luận/thông báo đúng mức tiết lộ | inspection-workflow.ts, notifications, kênh own của SV | Đã nghiệm thu Tuần11: verify-week11-inspection.ts; TT đầy đủ, LĐ/SV chỉ tóm tắt phù hợp, danh tính/audit/conflict động |
| FR-157 | 11, P1 | Chuyển một chiều sang Thanh tra | inspection-workflow.ts, feedback→inspection history, summary DTO | Đã nghiệm thu Tuần11: verify-week11-inspection.ts;6lệnh chuyển chỉ1hồ sơ, sender chỉ trạng thái/kết luận tóm tắt; không lộ ghi chú |
| FR-158 | 12, P1 | /thanh-tra/bat-thuong và chi tiết; cấu hình ngưỡng | survey-anomaly-detection/metrics/settings.ts, survey-anomalies.ts, policy và API | Đã hiện thực; anomaly unit/UI, MySQL9nhóm, E2E và CI nguồn qua; ≥10phiếu, chỉ số/decision/nguồn hồ sơ, không tự chặn công bố; chờ chốt tuần |
| FR-159 | 12, P1 | /bao-cao, góc nhìn Thanh tra | reports.ts, reports-metrics.ts; conflict trước gộp, ngưỡng riêng | Đã hiện thực; MySQL13nhóm/canary và E2E/CI nguồn qua; loại/trạng thái/thời gian/tỷ lệ quá hạn, ô nhỏ/tổng cha bị che; chờ kiểm tay lõi |
| FR-160 | G1–Tuần12 một phần / đầy đủ Tuần13 | Ma trận10vai trò, IDOR chức năng hiện có | MA_TRAN_QUYEN, can/access, feedback/inspection/reports services và routes | Chưa tick toàn bộ: Tuần12 thêm kiểm dashboard10vai trò, đa vai trò/IDOR/DTO/file xuất qua MySQL và E2E; không tự thay toàn bộ TC-ALL-01/Tuần13 |

## 4. Truy vết 33 BR gốc và điểm mở rộng

Mã giữ nguyên đặc tả, không có BR-19 hoặc BR-29. Test cấu trúc đáp ứng **một phần BR-03**. Tuần 3 thêm kiểm BR-30/31/33 trong miền auth và guard BR-34; không tuyên bố quy tắc đã hoàn thành trên các module chưa có. Các CHECK SQL là hỗ trợ dữ liệu nền, không thay service/policy nghiệp vụ.

| BR    | Wireframe / luồng                                                                                                      | Thiết kế / miền phụ trách                                                                 | Test hiện có hoặc phần cần viết                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| BR-01 | Đợt mở và tiến độ nhiệm vụ | CampaignSection/SurveyTask tạo cùng transaction DANG_MO; xác nhận/hash BR-52/53 | W7-HTTP08/09: chốt4SV hiện tại khi hash lệch, 20ensure không nhân đôi; thay đăng ký/thêm lớp sau mở không đổi task |
| BR-02 | [WF-06](wireframes/tuan-02.html#wf-06) | student-surveys.ts: CAS task + response/answers cùng transaction | Tuần8 HTTP lần2x409/20POSTchỉ1phiếu; rollback cưỡng bức và gate cuối mục4.5 |
| BR-03 | [WF-05](wireframes/tuan-02.html#wf-05), [WF-06](wireframes/tuan-02.html#wf-06), [WF-16](wireframes/tuan-02.html#wf-16) | THIET_KE_AN_DANH, ADR003/009/012, vùng phiếu biệt lập, DTO/log whitelist | Giữ DMMF5.6a/privacy/HTTP5.6b/c; Tuần12 thêm MySQL canary qua service xuất, đọc CSV/XLSX và parser PDF/ô che; bằng chứng cuối tệp. Không suy thành chống mọi phép suy luận hoặc quyền hạ tầng |
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
| BR-54 | FR-146 | 10–11 | PĐT đúng loại/lý do chuyển/SLA2–5/leo thang | Lõi Tuần10 và SLA Tuần11 đã nghiệm thu: verify-week11-feedback.ts, feedback-sla-access tests; tuyến PĐT→ĐBCL→LĐ, ngày làm việc, ledger/CAS và scope active |
| BR-55 | FR-145 | 7, P1 | ImportBatch/hash/hoàn tác chỉ khi chưa chốt | Chưa triển khai/test; không tự cắt |
| BR-56 | FR-149 | 10–11 | KT đúng loại/SLA2–5/lời nhắc phúc khảo | TC-KT-02 phần Tuần10–11 qua: verify-week10.ts, verify-week11-feedback.ts, feedback policy/rules; đúng loại thi, phúc khảo cấu hình được, KT→ĐBCL→LĐ |
| BR-57 | FR-148/150 | Cờ G1; kết quả9 | cờ nhóm/mẫu mặc định; gộp2GV/đủ phiếu/sau công bố | Cờ/default đạt G1; kết quả Tuần9 có bằng chứng mục4.6. Tuần12 đồng bộ helper chỉ đếm GV có LIKERT hợp lệ, kiểm NA hồi quy; dashboard KT kiểm thêm MySQL13nhóm |
| BR-58 | FR-152 | 11, P1 | kiến nghị/TBM phản hồi lý do/hạn14ngày | Đã nghiệm thu Tuần11: verify-week11-workflows.ts; đúng TBM, lý do/14ngày/nhắc TBM/báo TK, CAS/retry và từ chối ADMIN |
| BR-59 | FR-151 | 12, P1 | thống kê thi gộp/ngưỡng/không định danh | reports policy/services/metrics, MySQL13nhóm và canary xuất qua; gộp đánh giá sau công bố/đủ mẫu/2GV thực sự góp điểm, phản hồi thi đúng tuyến; CI nguồn qua, chờ chốt tuần |
| BR-60 | FR-154 | 10 tiếp nhận / 11 SLA | Thanh tra3/30ngày làm việc; LĐ tóm tắt quá hạn | Đã nghiệm thu Tuần11: verify-week11-feedback.ts/inspection.ts; first-access và scheduler có con trỏ, báo LĐ bằng tóm tắt, không giao người xung đột |
| BR-61 | FR-155 | 10–12 | xung đột động/404/list-count-detail-assign và trước gộp | TC-TT-01 Tuần10–11 qua trong verify-week10.ts/verify-week11-inspection.ts; Tuần12 MySQL reports/anomalies kiểm xung đột trước thống kê/chỉ số |
| BR-62 | FR-154/156 | 10–11 | TT đầy đủ không xung đột; LĐ tóm tắt; audit mở/tải | Đã nghiệm thu Tuần11: inspection-workflow/first-access tests, MySQL7nhóm; ADMIN/ĐBCL bị chặn, LĐ không nội dung/ghi chú, audit mở/tải |
| BR-63 | FR-153/156 | 10–11 | hai mức danh tính/kênh own/audit/không lộ người bị phản ánh | Đã nghiệm thu Tuần11: verify-week11-inspection.ts; mặc định ẩn danh, chỉ TT hợp lệ được danh tính khi có đồng ý; SV chỉ đọc tóm tắt riêng |
| BR-64 | FR-157 | 11, P1 | chuyển một chiều/lý do/lịch sử; sender chỉ tóm tắt | Đã nghiệm thu Tuần11: verify-week11-inspection.ts kiểm6lệnh đồng thời chỉ1hồ sơ, lý do/lịch sử/retry và sender không đọc ghi chú nội bộ |
| BR-65 | FR-158 | 12, P1 | ≥10phiếu, chỉ số/cảnh báo/decision, không kết luận tự động | MySQL9nhóm và anomaly metrics/services/UI tests qua; threshold/NA, chỉ số cho TT, quyết định/audit/thông báo, liên kết nguồn hồ sơ và không chặn công bố; CI nguồn qua, chờ kiểm tay lõi |
| BR-66 | FR-159 | 12, P1 | thống kê hồ sơ có ngưỡng/không định danh | reports-metrics/services, MySQL13nhóm và canary xuất qua; xung đột trước gộp, mẫu số riêng, tỷ lệ quá hạn, che ô nhỏ/tổng cha; CI nguồn qua, chờ chốt tuần |
| BR-67 | FR-147/151/159/160 | Theo luồng; đầy đủ13 | dashboard/thống kê/tệp xuất3vai trò không định danh | Tuần12 MySQL13nhóm từ service thật có canary,10nhóm đọc tệp và E2E10vai trò qua; safe DTO, ngưỡng và che tổng cha. Chưa tự hoàn tất toàn bộ TC-ALL-01/Tuần13 |
| BR-68 | FR-160 | G1 nền; đầy đủ13 | ADMIN không kết quả/nội dung phản hồi/hồ sơ TT | Giữ deny ở kết quả/phản hồi/hồ sơ đã kiểm Tuần9–11; Tuần12 reports policy/services/MySQL/E2E kiểm ADMIN đa vai trò chỉ có vận hành tài khoản, không cộng quyền nghiệp vụ. Kiểm toàn bộ ma trận vẫn Tuần13 |

## 4.2. Đăng ký chín mã test Mục F

Đây là bảng phạm vi kiểm và bằng chứng theo từng mốc. G1 và các tuần đã triển khai có đối chiếu ở các mục bên dưới; chỉ nhận phần chức năng/thao tác thực sự đã kiểm. Tên TC là mã nghiệm thu, không nhất thiết một file mỗi TC; FR-160 vẫn chờ kiểm đầy đủ ở Tuần13.

| Mã test | Tuần/phạm vi | Yêu cầu | Điều phải chứng minh | Trạng thái/bằng chứng hiện tại |
| --- | --- | --- | --- | --- |
| TC-PDT-01 | G1 bù Tuần6 | FR-140, BR-50 | ADMIN tạo/sửa lớp và import bị chặn; PĐT thành công. Kiểm DBCL mất quyền ghi, ADMIN chỉ tổ chức, actor audit. | Đạt G1: tests/rbac-policy, catalog-services, import-services; scripts/verify-week5.ts HTTP01/04/07–19/22, tổng23/23; CI mục4.3 |
| TC-PDT-02 | 7 | FR-142/143, BR-52 | RS01/02/03 chặn, RS04/05/06 cảnh báo; lưu hash/snapshot; trả về cần lý do. | Đạt kiểm W7-HTTP05–07/13; campaign-readiness/services; W7-SETTINGS07 và seed W7. Nghiệm thu cuối mục4.4. |
| TC-PDT-03 | 7 | FR-144, BR-01/53 | Xác nhận → đổi đăng ký → mở chốt hiện tại, cảnh báo PĐT/ĐBCL; thay sau chốt không đổi task. | Đạt kiểm W7-HTTP08/09/12:20ensure, drift/audit/queue, chốt4SV, thay đăng ký sau mở; W7-SETTINGS10–12 SMTP thật. Mục4.4. |
| TC-KT-01 | 9; hồi quy12 | FR-150, BR-57 | Chỉ nhóm cờ sau công bố; ≥2 GV khác nhau/tổng phiếu đủ ngưỡng; không lớp/GV/tự luận, thiếu ngưỡng có thông báo. | Bằng chứng kết quả gộp Tuần9 ở mục4.6; Tuần12 thêm hồi quy một GV có điểm/một GV toàn NA không giúp đạt ngưỡng, dùng chung helper cho đọc kết quả/kiến nghị/dashboard. |
| TC-KT-02 | 10–11 | FR-149, BR-56 | Đúng hàng đợi thi/lời nhắc phúc khảo, ẩn danh, chuyển có lý do, tiếp nhận2/trả lời5ngày và leo thang. | Lõi verify-week10.ts19nhóm; SLA verify-week11-feedback.ts14nhóm qua, kiểm KT→ĐBCL→LĐ và lời nhắc cấu hình. Không nhận mọi bước đã thử tay. |
| TC-TT-01 | 10–12 | FR-153/155, BR-61 | GV/TBM/TK liên quan không thấy/không được giao; kể cả tài khoản có TT; list/count/detail/attachment không lộ và trả404. | HTTP/MySQL Tuần10 và verify-week11-inspection.ts qua; Tuần12 thêm báo cáo/chỉ số, E2E đối chứng đa vai trò và ngoài scope. Giữ giới hạn ma trận đầy đủ ở Tuần13. |
| TC-TT-02 | 10–11 | FR-154/156, BR-62 | ADMIN/ĐBCL bị chặn, LĐ chỉ tóm tắt, TT không xung đột mới đầy đủ; audit mở hồ sơ/tải tệp. | Inspection workflow/first-access tests và MySQL7nhóm Tuần11 qua; đi đủ xác minh/kết luận/thông báo/đóng, kiểm ghi chú/tệp riêng và các DTO tóm tắt. |
| TC-TT-03 | 10–11 | FR-153/156, BR-63 | Mặc định hoàn toàn ẩn danh; cho TT biết thì chỉ TT hợp lệ thấy/audit; người bị phản ánh không thấy danh tính. | verify-week11-inspection.ts qua hai mức danh tính, conflict động, audit và kênh tóm tắt sinh viên; E2E12 kiểm hồ sơ ẩn danh bằng HTTP. Không suy mọi nhánh danh tính đã thử tay. |
| TC-ALL-01 | G1–Tuần12 một phần / đầy đủ13 | FR-160, BR-34/61/62/67/68 | Ma trận10vai trò + IDOR trên từng function/scope; nhiều grant/MFA, kết quả, hồ sơ, dashboard và tệp xuất. | Giữ kiểm G1/Tuần4–11; Tuần12 MySQL báo cáo13nhóm có canary và E2E10vai trò/IDOR qua, file xuất10nhóm đọc lại. Chưa tick FR-160 hoặc coi bộ này thay toàn bộ ma trận và kiểm bảo mật Tuần13. |

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

## 4.7. Truy vết hiện thực Tuần 10 — 01–02/11/2026

Người dùng yêu cầu tiếp tục đến khi hoàn tất Tuần10, giữ câu chữ tự nhiên và hướng dẫn mở dự án. Chín FR-70/71/72/73/76/146/149/153/155 được nghiệm thu trên nguồn `51f03e26f47d17279af0b681d11994d7abd10d39`, [CI41274448630](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41274448630) check/smoke đúng SHA thành công. Lần chốt khởi động/tài liệu/sửa tracing và CI commit giao cuối được đối chiếu riêng tại [nghiệm thu](NGHIEM_THU_TUAN_10.md), không suy từ nguồn này.

| Yêu cầu/quy tắc | Hiện thực | Bằng chứng và giới hạn |
| --- | --- | --- |
| FR-70/71; BR-17/20/21 | feedback-types.ts, feedback.ts, policies/feedback.ts, /api/feedback và /phan-hoi | HTTP19/19: lớp đăng ký/kỳ hiện hành-liền trước/kỳ khóa, tám tuyến và vai trò; tạo retry cùngID, đổi payload cùngrequestId409 |
| FR-72/73/76; BR-22/24 | transitionFeedback/addFeedbackMessage, FeedbackHistory/Recipient, feedback-client/detail | Tám accept1thắng7x409, một lịch sử; trao đổi retry, chuyển có lý do/vô hiệu hóa người cũ/receipt retry; UI giả gửi→trả lời→đóng |
| BR-28/30/34 | attachment-files/storage, feedback-attachments và hai API upload/download | Tệp spoof/quá số/quá dung lượng, privateUUID/public/path/header/authorization-before-I/O, tảiPDF đúngbyte, IDOR/audit; Windows file-symlink skipped, LinuxCI đã qua |
| FR-146/149; BR-54/56 phần lõi | tuyến PĐT/KT, feedback-settings.ts và examNotice | HTTP xác nhận đúng queue, KT không nhận mặc định kiểm tra thành phần, ĐBCL sửa lời nhắc/cửa sổ kỳ; SLA/leo thang Tuần11 chưa nghiệm thu |
| FR-153; BR-26/63 phần tiếp nhận | formnghiêmtrọng/schemaack/fixedseverity/identity, createcase trongtransaction | Năm vi phạm/hai mức danh tính; sáu request sauhai phản hồi chỉ thêmba/chặnba; TTonlyidentity/audit, UI hai chế độ; spam nâng cao Tuần11 |
| FR-155; BR-61/62/68 | policy chung hasInspectionConflict/canReadInspection, scope list/count/detail/assign/tải | Ba xung đột GV/TBM/TK đaTT trả404, không có trongqueue/targets; ADMIN/ĐBCL403; lãnh đạo summarykhôngcontent/PII/tệp; quyền/phiên/xung đột mới hiệu lực ngay |
| FR-154/160 | InspectionCase/Event TIEP_NHAN, ma trận chức năng hiện có | Một phần: chưaNote/xác minh/kết luận/thông báo/đóng, thống kê/xuất file; không tick toàn bộ |
| Migration/seed/ẩn danh khảo sát | 20261101020000_week10_feedback_core, week10-demo-seed, DMMF/ERD | 37runtime/46design/9chỉthiết kế;9migrationdemo sạch, seed17/17, bundle8lớp/9phản hồi/2TIEP_NHAN lặp giữhash;34bảng/9168rows main cũ giữhash, không nối SurveyResponse/Answer tới User/Task |
| Tài liệu/UI | [ADR011](decisions/ADR-011-phan-hoi-va-tiep-nhan-thanh-tra.md), [sơ đồ](SO_DO_TUAN_10.md), [năm câu bảo vệ](GIAI_THICH/tuan-10.md), [QA](QA_GIAO_DIEN_TUAN_10.md) | 14JPEG đã chụp với4vai trò/2kích thước; QA ghi đúng phạm vi ảnh xem/thao tác, không nhận mọi vai trò/manual hoặcWCAG đầy đủ |

Fullcheck nguồn chức năng: Windows984passed/1skipped trong985test/62tệp; LinuxCI985/985. HTTP19/19/cleaned=true, SQL16/16, seed17/17, buildNext16.4.3exit0; hai cảnh báo tracing kho tệp được sửa và kiểm lại ở lần giao cuối. [Báo cáo10mục](bao-cao-tien-do/tuan-10.md) giữ ngày thực tế01–02/11, không thay ngày/tên GVHD yêu cầu; chỉ dữ liệu giả, không deploy công khai hoặc đổi MFA của chủ dự án. Tiến độ **165/219=75,3%,58/84FR**, kế hoạch167/219, còn2điểm FR-145. FR-154/160 chưa tick, không cộng FR tương lai từ enum/seed.

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

### Ngữ cảnh dùng chung và ADMIN riêng — hoàn tất 31/10/2026

| Yêu cầu liên quan | Điều chỉnh và bằng chứng |
| --- | --- |
| FR-01/04/05 | Giữ một trang đăng nhập mã/email; auth-form, kích hoạt, khôi phục, API và email dùng câu trung tính. Trang chủ đưa về chức năng tài khoản. Không thay đầu vào hay quyền đăng nhập |
| FR-01/10 | accountCodeLabel theo tập vai trò đã xác thực: sinh viên đơn vai trò=Mã số sinh viên, giảng viên đơn vai trò=Mã giảng viên, cán bộ/ADMIN/đa vai trò=Mã tài khoản. Danh sách chức năng vẫn theo policy hiện có |
| FR-07; BR-32/34 | ADMIN riêng tạo bằng admin:create, ACTIVE/GLOBAL; HTTP đăng nhập200/MFA_SETUP, chưa TOTP bị chuyển khỏi quản trị. TOTP của chủ tài khoản chưa được cấu hình hộ. ADMIN giả QA xác nhận TOTP thật, xem quản trị và thử đa vai trò rồi vô hiệu hóa/thu hồi quyền, giữ AuditLog |
| Kiểm hồi quy | Check797/797 trong50tệp qua; UI10vai trò+1caseđa vai trò,44/44 bố cục ở1440/390,8ảnh đã xem. Không Bạn/placeholder/thiếu nhãn/tràn ngang/lỗiJS hoặcReact trong phép đo. Email đặt lại cục bộ trung tính, token dùng qua service chính thức và phiên thử đăng xuất |

[Báo cáo và ảnh mới](NGU_CANH_TAI_KHOAN_VA_ADMIN_2026_10_31.md). Chỉnh ngữ cảnh không cộng FR/điểm, không thay bộ test quyền đầy đủ chờ Tuần13. Không ghi mật khẩu/QR/secret vào Git hoặc ảnh. Yêu cầu mới thay cách gọi sinh viên trên các trang công khai dùng chung; bằng chứng trước được giữ đúng thời điểm.

### Trang đăng nhập tự tải lại —31/10/2026

| Phần liên quan | Ghi nhận và điều chỉnh |
| --- | --- |
| FR-01; phiên xem giao diện | Quan sát trực tiếp Fast Refresh/HMR lặp trên /dang-nhap. Luồng khách me401→refresh401 kết thúc, không tự điều hướng lặp. Không sửa quyền hoặc nới điều kiện xác thực |
| Công cụ chạy cục bộ | npm run dev dùng next dev --webpack, bộ biên dịch tích hợp của cùng Next.js thay Turbopack, không thêm thư viện. Dừng dev trước check/generate/build để tránh tác động vào output đang được theo dõi |
| Guard cấu hình giữ nguyên | Thử production preview trên localhostHTTP trả500 vì getAuthConfig bắt buộc HTTPS trong production. Đã bỏ hướng preview, không nới guard hoặc sửa đặc tả được bảo vệ |
| Bảo toàn và giới hạn | Dừng đúng tiến trình dev, giữ cache cũ trong .local; database/tài khoản/TOTP giữ nguyên. Chưa xác định tệp gây invalidation; theo dõi12giây không thấy thay đổi source |
| Kiểm lại webpack | Check797/797 trong50tệp; IAB1265×720 giữ chuỗi thử hơn156giây, form nhập được và console không có vòng HMR lặp mới. Đăng nhập/đăng xuất demo qua; đã xem hai JPEG. Không nhận đã kiểm mọi trình duyệt/thiết bị |

[Hồ sơ sửa lỗi](SUA_TAI_LAI_TRANG_2026_10_31.md). Sửa cách chạy không cộng FR/điểm hoặc mở Tuần10; bằng chứng nghiệm thu và CI trước giữ đúng thời điểm/SHA.

### QR60giây và nhãn tài khoản —31/10/2026

| Yêu cầu | Hiện thực và kiểm thực tế |
| --- | --- |
| FR-07; BR-32 | mfa.ts: pendingTTL60giây, metadata server/phiên, khóa User/Credential, reusekhônggia hạn; mã403/MFA_SETUP_EXPIRED khôngtăngsaiOTP. Unit19mfa-service; HTTP29nhóm gồm1nhómQRmới, concurrencythật chỉ1rotation/audit và TOTP30giây xác nhậnFULL |
| FR-07, trải nghiệm thiết lập | mfa-form/mfa-setup-clock: QR/sessioncountdown, tự cập nhật, RTT/backgroundcatchup, clear/hideexpired, dừng/abort/lỗimạngthửtay. Clock12test và QA5lầncấp khoảng60,25giây, hếtphiênẩnQR; không đọc/đổiMFAchủdựán |
| FR-01/10, góp ý nhãn | “Tài khoản hoặc email” ở login/helper/lỗi; “Tài khoản” ở thông tin chung/adminusers. Giữ MSSV/Mãgiảngviên theo vai trò; khôngplaceholder/đổi quyền |

Check816/816 trong51tệp; [bằng chứng và giới hạn](QR_60_GIAY_2026_10_31.md). Không sửa phần đặc tả8.4 được bảo vệ, không cộng FR hoặc mở Tuần10.

### Mã xác minh 6 chữ số 60 giây — 31/10/2026

| Yêu cầu | Hiện thực và bằng chứng |
| --- | --- |
| FR-07; BR-32, chỉ đạo mới | Đăng ký mới dùng60giây; giữ nguyên đặc tả gốc và ghi ngoại lệ chu kỳ30giây ở [hồ sơ TOTP60](TOTP_60_GIAY_2026_10_31.md). Giữ6chữsố/±1chu kỳ/chặn replay/rate/ADMIN bắt buộcMFA |
| Credential cũ và migration | `periodSeconds` mặc định30, năm trường chờ chuyển đổi; migration `20261031090000_totp_period_60` chỉ thêm6cột. Runtime34/design46 giữ nguyên; hash34bảng dữ liệu cũ khớp trên cột cũ, ADMIN chính giữ30/chưa đổi khóa |
| Chuyển đổi đã xác minh | `mfa-period-change.ts`, policy/route và `/bao-mat/chu-ky`: FULL+mfa, mã cũ mới bắt buộc, QR60 gắn phiên/luồng5phút; xác nhận60 thành công mới promote/counter/revoke phiên khác, giữ recovery; hủy/sai/hết hạn giữ cấu hình cũ |
| Đăng nhập và thao tác nhạy cảm | `mfa.ts`/`mfa-crypto.ts` dùng chu kỳ riêng cho setup/verify/step-up. Reset qua web/CLI xóa cả dữ liệu chờ chuyển đổi; không tự reset chủ tài khoản |
| Kiểm thực tế | Check841/841 trong52tệp; `test:totp60` HTTP/MySQL12/12, cleanedtrue, phiên/Origin/ID/replay/race/expiry/hủy/step-up/recovery và audit/log qua. Lượt lỗi TypeScript trước đã sửa và không tính là qua; UI/CI bản mới đang kiểm |

Đây là điều chỉnh trong FR-07 đã có, không thêm FR/điểm hoặc mở Tuần10. Việc hiện thực và migration không có nghĩa tài khoản chủ dự án đã60giây: chủ tài khoản còn phải tự quét/xác nhận mã mới. Kết quả CI phải đối chiếu đúng SHA mới, không dùng runcũ.

Tiếp tục01/11: fullcheck850/850(53tệp), build qua. `use-client-ready` và9kiểm SSR chặn nhập/gửi trước hydration, biểu mẫu xác thực dùng POST dự phòng; lỗi MFA gửi GET kèm mã giả đã được tái hiện rồi sửa. UI thật đã kiểm login30→Tài khoản/link→mã cũ→QR60/hướng dẫn60→hủy về30; ảnh form trống đã xem. HTTP12nhóm dùng database TOTP60 riêng, giữ User/AuditLog sau dọn bí mật và không ảnh hưởng database thửTuần4. Không tự cấu hình 2FA cho chủ tài khoản.

Nguồn bàn giao02/11: `8ffa99f6e67b06b579a3576506395e9856d1dd1d`, [CI41414188239](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41414188239) check/smoke thành công, Linux1002/1002 trong63tệp. Windows1001passed/1skipped; bản dựng hết cảnh báo tracing. Khởi động CMD từ web tắt và tái sử dụng web đang chạy đều qua, không trùng tiến trình hoặc sinh lại client trên phiên dev; .env giữ nguyên. Không cộng FR mới cho tiện ích khởi động. Nhãn nhóm kiểm định tuyến đã sửa BR-55 thành BR-54; BR-55/FR-145 vẫn chưa nghiệm thu.

Sửa CMD ngày 02/11: KHOI_DONG_DU_AN.cmd, Gitattributes và test local-start bảo vệ CRLF của tệp thực tế. Đối chứng LF trong cửa sổ tương tác thoát mã 1; bản CRLF khởi động từ System32 hiện thông báo sẵn sàng, mở lại giữ `pause`, nhấn phím thoát mã 0 và web vẫn trả HTTP 200. Check: 1002 passed, 1 skipped / 1003, trong 63 tệp. Lượt kiểm nền cũ chưa bao phủ lỗi này; xem [hồ sơ sửa](SUA_KHOI_DONG_CMD_2026_11_02.md). Không thay FR/BR nghiệp vụ hoặc tiến độ.

Mốc khởi động Tuần11 đã được ghi tại [checkpoint](WIP_TUAN_11.md); kết quả chốt ngày03/11/2026 đối chiếu ngay dưới đây và [nghiệm thu Tuần11](NGHIEM_THU_TUAN_11.md). Không áp dụng hoặc nhận đã kiểm các TC-UI từ prompt nâng cấp đã hoãn.

### Tuần 11 — nghiệm thu kỹ thuật 03/11/2026

| Yêu cầu | Hiện thực, bằng chứng |
| --- | --- |
| FR-66; BR-10 | improvements.ts, publish hook, form gửi/xác nhận/bổ sung, remindercursor; MySQL12nhóm chung, UI GV→TBM |
| FR-74; BR-23/54/56/60 | feedback-sla.ts, workflow-settings.ts, feedback-deadlines.ts; unique marker+mutex+cursor, ngày làm việc, quyền đơn vị active; MySQL14nhóm chung + firstaccess7unit |
| FR-75; BR-25/26 | feedback-satisfaction.ts, feedback.ts và UI; rating7ngày/1lần, reopen≤2/1lần, quota+duplicatewarning; MySQLrace/retry/IDOR |
| FR-80/81/82 | notifications.ts/domain-notifications.ts/notification-access.ts, ownCSRF/center, workerSMTP; 10nhóm MySQL/Mailpit, tuplekey không xung đột tài nguyên |
| FR-152; BR-57/58 | exam-recommendations.ts, từ dữ liệu gộp cóphiếu≥2GV; đúng TBM phản hồi,14ngày nhắc+báoTK; MySQL12nhóm chung |
| FR-154/156/157; BR-61/62/63/64 | inspection-workflow.ts/notes/privateattachments; CAS/state/conflicts/summaryonly/transferoneway; 7nhóm MySQL,23unit+7firstaccess; UI xácminh→kếtluận→thôngbáo |
| Schema/seed/quyền | 43runtime/46design; migration6bảng đúngcollation; old9399rows/37tables hashpreserved; repeat9451/43; demo18nhóm |

Nguồn/bản dựng/CI và giới hạn UI cụ thể xem [nghiệm thu](NGHIEM_THU_TUAN_11.md), [QA](QA_GIAO_DIEN_TUAN_11.md), [verification](assets/tuan-11/verification.json). Không dùng CI lịch sử thay mã mới. Không thêm dashboard/xuất file/cờ bất thường trong commit tuần11; giai đoạn UI chưa bắt đầu.

### Tuần 12 — mã và CI đã qua, chưa nghiệm thu thủ công 03/11/2026

Tuần12 triển khai theo lệnh người dùng trên nhánh `feat/week12-reports-anomalies`, mốc kế hoạch giả định16–22/12/2026. Bảng này ghi hiện thực và kết quả đã quan sát; **chưa nghiệm thu toàn tuần vì lượt thủ công đã dừng trước khi hoàn tất UC-GOLD**. Nhánh tính năng đã đẩy GitHub; nhánh mã `main` vẫn ở Tuần11, chưa gộp Tuần12. Không sửa các ghi chú lịch sử ở Tuần8/9 vốn ghi đúng rằng tệp xuất chưa có tại thời điểm đó.

| Yêu cầu | Hiện thực | Kiểm đã qua và giới hạn |
| --- | --- | --- |
| FR-90/91 | [reports.ts](../src/server/services/reports.ts), [policy](../src/server/policies/reports.ts), [API](../src/app/api/reports/[[...path]]/route.ts), [giao diện](../src/components/reports/reports-dashboard.tsx) và report-view.tsx | reports-policy/services/route/client/UI tests; [MySQL báo cáo](../scripts/verify-week12-reports.ts)13nhóm, [E2E](../tests/e2e/uc-gold.spec.ts)10vai trò và5vai trò desktop/mobile; quyền kiểm ở service, biểu đồ dùng ô an toàn, không đổi ô che thành0 |
| FR-92/93; BR-03/67 | prepareReportsExport, [renderer](../src/server/services/reports-export.ts), font Noto Sans nhúng cục bộ | MySQL service thật có canary tên/tài khoản/email/nội dung riêng tư; [bộ đọc file](../scripts/verify-week12-exports.ts)10nhóm kiểm CSV/XLSX/PDF, công thức bảng tính, tiếng Việt/ô che/phân trang. Parser và ảnh PDF5trang đã xem là bằng chứng riêng, không coi kiểm synthetic DTO thay kiểm quyền database |
| FR-94; BR-66 | [reports-metrics.ts](../src/server/services/reports-metrics.ts), reports.ts | Mẫu số tỉ lệ quá hạn ghi rõ đang xử lý/đã đóng; thời gian/hài lòng có ngưỡng riêng, mẫu số0 không thành0%. Dựa mốc hạn/chu kỳ được lưu, không lấy cờ hiện tại giả lịch sử; unit và MySQL báo cáo qua |
| FR-147; BR-67 | reports/readiness và phản hồi TO_CHUC_LOP_HOC, cùng DTO cho dashboard/xuất | MySQL và E2E qua; PĐT không nhận roster, định danh sinh viên hoặc hash danh sách. Các bộ lọc được kiểm phạm vi và nhãn áp dụng |
| FR-151; BR-57/59/67 | Nhóm đánh giá sau công bố, poolSurveyScores và assessmentContributingTeachers; phản hồi THI_KET_THUC_HOC_PHAN | MySQL13nhóm có hồi quy một GV có điểm/một GV toàn NA, môn thiếu ngưỡng hai GV, lớp5phiếu/lớp1phiếu. Che cả tổng cha có thể suy ra nhóm bị che, không lộ lớp/GV/tự luận cho KT |
| FR-158; BR-61/65 | [phát hiện](../src/server/services/survey-anomaly-detection.ts), [chỉ số](../src/server/services/survey-anomaly-metrics.ts), [xem xét](../src/server/services/survey-anomalies.ts), [policy](../src/server/policies/survey-anomalies.ts), API/UI và cấu hình | [MySQL bất thường](../scripts/verify-week12-anomalies.ts)9nhóm, unit và E2E qua; từ10phiếu, loại NA theo công thức, kiểm scope/xung đột và quyết định có lịch sử; chỉ số không đưa điểm/đáp án/tự luận cho TT, không tự chặn công bố hoặc kết luận vi phạm |
| FR-159; BR-61/66/67 | reports.ts/metrics, lọc xung đột trước gộp hồ sơ, ngưỡng thống kê phản hồi/hồ sơ mặc định5 | MySQL/canary/E2E qua: số lượng/loại/trạng thái/thời gian/tỉ lệ quá hạn; ô nhỏ, tổng và mẫu số nhạy cảm cùng bị che. Không trả nội dung hồ sơ, danh tính hoặc thời điểm nộp chính xác |
| BR-68; FR-160 một phần | Fresh actor/scope, góc nhìn vai trò riêng, ADMIN kể cả đa vai trò chỉ có vận hành tài khoản | MySQL và E2E10vai trò qua; sinh viên chỉ số liệu công việc của chính mình, chọn role không cộng grant để mở rộng quyền. Chưa tự hoàn tất toàn bộ ma trận10vai trò/IDOR/tệp xuất của mọi tính năng; FR-160 giữ Tuần13 |

**Đối chiếu kết quả:** Windows fullcheck **1284 passed,1 skipped/1285 trong86tệp**; skipped là file-symlink bị hệ điều hành từ chối. Lint/typecheck/schema/design và build Next16.4.3 qua. Tuần12 có **32nhóm**:13báo cáo MySQL,9bất thường MySQL và10đọc tệp; hồi quy Tuần9 **12/12**, Tuần10 **19/19**, Tuần11 **43nhóm**, SQL **16/16**, demo **19/19**. Các bộ dịch vụ chạy tuần tự trên database thử riêng, dọn fixture theo UUID; không reset main.

[CI41588831428](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41588831428) ngày03/11/2026 của đúng SHA `6692854e97088845ce5b263318dfb1f6239fef04` có cả **smoke/check/e2e success**; Linux **1285/1285 trong86/86tệp**, không skipped. Bằng chứng chỉ áp dụng cho SHA đã chạy, không tự chứng minh các commit hoặc tài liệu sửa sau đó.

E2E cục bộ cuối **3/3**, khoảng **1,1phút**, kết hợp HTTP và thao tác trình duyệt: dữ liệu nền/phiên giả được chuẩn bị trước; chuỗi nghiệp vụ thực hiện qua ứng dụng. Không nhận đã kiểm nhập mật khẩu/QR/TOTP hoặc mọi bước là thử tay. Phiên fixture đã bị thu hồi/tài khoản bị vô hiệu hóa; lịch sử trong database thử được giữ, không gọi database thử là trống. Chi tiết tại [UC-GOLD](UC_GOLD_TUAN_12.md) và [QA](QA_GIAO_DIEN_TUAN_12.md).

Lượt GUI riêng trên Chrome chỉ hoàn tất: ĐBCL tạo mẫu/đợt phạm vi khoa giả; PĐT xác nhận với RS-04; Lãnh đạo phê duyệt/mở và chốt **5 nhiệm vụ**; SV1 chọn **2/2** hai câu Likert, nhập tự luận và nộp **1 phiếu**; SV1 gửi **1 phản hồi ẩn danh loại Giảng dạy**. Công cụ Windows không xác định đủ chắc chắn URL hiện tại nên chặn thao tác tiếp, lượt kiểm đã dừng. Helper bổ sung **4 phiếu HTTP** và helper truyền thời điểm **endsAt + 1 ms** đều **chưa thực thi**; không suy5nhiệm vụ thành5phiếu hoặc nhận đã mô phỏng đóng đợt. Phần còn lại của UC-GOLD thủ công chưa chạy trong lượt này; [mục8 của nhật ký](UC_GOLD_TUAN_12.md#8-lượt-thao-tác-gui-riêng-ngày-03112026--chưa-hoàn-tất) nêu đủ các nhánh còn thiếu. Đây là giới hạn lượt kiểm, không phải kết luận website lỗi.

Migration/seed trên **database chính** đã áp dụng riêng với nhánh mã: runtime45model/thiết kế47, còn SurveyReminder và ImportBatch chỉ thiết kế; hash **43bảng/9.451bản ghi cũ** giữ nguyên, seed lặp giữ **45bảng/9.519bản ghi**. Kiểm lại sau khi dừng GUI ngày03/11/2026 lúc **08:46 UTC** tiếp tục qua cả hai mốc. Không sửa bundle cũ, reset dữ liệu hoặc đổi MFA chủ dự án. Xem [nghiệm thu kỹ thuật](NGHIEM_THU_TUAN_12.md), [bằng chứng](assets/tuan-12/verification.json), [công thức](CONG_THUC_BAO_CAO.md) và [ADR-012](decisions/ADR-012-bao-cao-va-nguong-du-lieu.md).

Tiến độ nghiệm thu giữ **188/219 = 85,8%,68/84FR**; **208/219 = 95,0%,77/84FR** là mục tiêu khi chốt chín FR/20điểm, chưa tick. FR-145 còn backlog; FR-160 chưa đủ toàn bộ Tuần13. Cần bổ sung phần thủ công còn thiếu trước khi nghiệm thu/gộp nguồn; không tự bắt đầu Tuần13 hoặc UI-n.
