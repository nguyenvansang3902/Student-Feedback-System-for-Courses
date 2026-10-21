# Thiết kế cơ sở dữ liệu — Tuần 2

Ngày cập nhật thực tế **21/10/2026**; Tuần 2 kế hoạch giả định **07–13/10/2026**. Tài liệu phân biệt schema đã chọn để áp dụng với thiết kế toàn hệ thống; kết quả migration/test phải đọc ở báo cáo phiên và bằng chứng chạy.

## 1. Hai schema và giới hạn áp dụng

| Nguồn                  | Mục đích                                                     | Phạm vi Tuần 2                               |
| ---------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| `prisma/schema.prisma` | Nguồn migration và client runtime                            | Chín model người dùng và danh mục bên dưới   |
| `prisma/design.prisma` | Blueprint toàn hệ thống gồm 39 model; validate/generate DMMF | Thiết kế các tuần sau, không migrate/db push |
| [ERD](ERD.md)          | Sơ đồ suy từ model/quan hệ Prisma                            | Phải phân biệt nền được áp dụng và blueprint |

Quyết định và lý do ở [ADR-002](decisions/ADR-002-schema-theo-tuan.md). Không xem một model có trong blueprint là chức năng đã hiện thực. Đặc biệt chưa có phiên, TOTP, mẫu phiếu, đợt, nhiệm vụ, phiếu, kết quả hay phản hồi trong database ứng dụng Tuần 2.

## 2. Quy ước lưu trữ

- MySQL 8, InnoDB, utf8mb4 và collation hỗ trợ tiếng Việt theo cấu hình dự án. Mã nghiệp vụ cần được chuẩn hóa nhất quán khi import; không dựa chữ hoa/thường tùy ý của người nhập.
- ID đơn dùng UUID trong CHAR(36); các bảng nối dùng khóa ghép khi hợp lý. UUID phiếu/answer không tăng dần. Unique và index phản ánh các truy vấn chính, không thay thế quyền service.
- Thời điểm thông thường lưu UTC, hiển thị Asia/Ho_Chi_Minh; ngày học kỳ, ngày hoàn thành task, ngày nộp phiếu và ngày nhắc dùng DATE.
- Số trọng số/điểm dùng Decimal, không dùng Float để lưu kết quả tiền xử lý. Điểm chỉ làm tròn hai chữ số ở kết quả cuối theo Mục 5.7; Tuần 9 mới hiện thực tính toán.
- Quan hệ nghiệp vụ dùng FK Restrict để tránh xóa dây chuyền. Dữ liệu không còn dùng ưu tiên vô hiệu hóa; không xóa người dùng có lịch sử. Không có FK ra ngoài vùng phiếu ẩn danh theo thiết kế Mục 5.
- Danh sách phân trang; chọn trường cần dùng và tránh N+1; export dùng danh sách trường được phép. Thông số phân trang tối đa sẽ chốt khi triển khai endpoint.

## 3. Chín bảng được áp dụng trong Tuần 2

| Model              | Trường/chìa khóa chính                                                                                      | Ràng buộc và quan hệ                                                              | Kiểm tra nghiệp vụ còn cần                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| User               | UUID, loginCode, email, displayName, passwordHash nullable, status, mustChangePassword, createdAt/updatedAt | loginCode và email unique; index status; có nhiều gán vai trò/phân công/đăng ký   | Chuẩn hóa mã/email, kích hoạt/khóa/phiên Tuần 3; quản lý người dùng Tuần 4                                       |
| RoleAssignment     | UUID, userId, role, scopeType, scopeKey, facultyId?, departmentId?                                          | unique `(userId, role, scopeKey)`; FK người dùng và phạm vi; index hai FK phạm vi | ScopeKey phải khớp loại/FK; tổ hợp role/phạm vi hợp lệ, quyền và MFA Tuần 4                                      |
| Faculty            | UUID, code, name, isActive                                                                                  | code unique; một khoa có nhiều bộ môn và gán vai trò                              | Không cho tạo mới trong khoa ngừng hoạt động theo service danh mục Tuần 5                                        |
| Department         | UUID, code, name, isActive, facultyId                                                                       | code unique; FK Faculty; index facultyId; có nhiều môn                            | Kiểm khoa hợp lệ và giới hạn phạm vi Tuần 5                                                                      |
| Semester           | UUID, code, name, startsOn, endsOn, lockedAt?                                                               | code unique; ngày DATE; có nhiều lớp                                              | Bắt đầu ≤ kết thúc; kỳ khóa chỉ đọc (BR-17)                                                                      |
| Course             | UUID, code, name, credits Decimal(4,1), isActive, departmentId                                              | code unique; FK Department; index departmentId                                    | Tín chỉ dương/giới hạn import; môn thuộc bộ môn hoạt động                                                        |
| CourseSection      | UUID, code, courseId, semesterId                                                                            | unique `(semesterId, code)`; FK Course/Semester; index courseId                   | Không chỉnh dữ liệu ảnh hưởng kỳ khóa; kiểm phân công và phạm vi                                                 |
| TeachingAssignment | sectionId, teacherId, isLead                                                                                | khóa ghép `(sectionId, teacherId)`; FK lớp/User; index teacherId                  | Người được phân công có vai trò giảng viên; cách chọn người nhận chính khi nhiều giảng viên                      |
| Enrollment         | UUID, sectionId, studentId, registeredAt, withdrawnAt?                                                      | unique `(sectionId, studentId)`; FK lớp/User; index `(studentId, withdrawnAt)`    | Người đăng ký có vai trò sinh viên; rút rồi học lại dùng cùng bản ghi cập nhật; snapshot nhiệm vụ chỉ tạo Tuần 7 |

Migration `20261021160354_week2_users_catalog` được viết cho chín bảng, 11 FK Restrict và ba CHECK bổ sung: `RoleAssignment_scope_valid` kiểm role/loại phạm vi/FK/scopeKey nhất quán; `Semester_dates_valid` kiểm bắt đầu ≤ kết thúc; `Course_credits_positive` kiểm tín chỉ > 0. Các CHECK này nằm trong SQL migration, không suy ra từ DMMF hoặc Prisma validate. Việc áp dụng vào MySQL và kết quả thử ràng buộc phải có bằng chứng chạy riêng.

`passwordHash` là chỗ dành trước cho xác thực; nullable hỗ trợ tài khoản chờ kích hoạt, **không cho đăng nhập không mật khẩu**. Chưa seed tài khoản/mật khẩu demo hay làm chức năng đăng nhập trong Tuần 2. `TeachingAssignment.isLead` hỗ trợ chọn người nhận chính, nhưng unique cặp không tự bảo đảm chỉ một lead mỗi lớp; service Tuần 5/10 phải kiểm và quy tắc định tuyến phải thống nhất khi có nhiều giảng viên. Một lớp vẫn được khảo sát ở mức lớp (BR-16).

### Phạm vi gán vai trò

| scopeType  | scopeKey chuẩn                 | facultyId           | departmentId        |
| ---------- | ------------------------------ | ------------------- | ------------------- |
| GLOBAL     | `GLOBAL`                       | NULL                | NULL                |
| FACULTY    | `FACULTY:<faculty UUID>`       | Bắt buộc, khớp khóa | NULL                |
| DEPARTMENT | `DEPARTMENT:<department UUID>` | NULL                | Bắt buộc, khớp khóa |

Không dùng unique `(userId, role, facultyId, departmentId)` với NULL để chống trùng; scopeKey không NULL giải quyết trường hợp phạm vi toàn cục. Migration CHECK chỉ cho TRUONG_KHOA ở FACULTY, TRUONG_BO_MON ở DEPARTMENT; SINH_VIEN/GIANG_VIEN/CAN_BO_DBCL/LANH_DAO/ADMIN ở GLOBAL. Service vẫn tự tạo scopeKey từ loại/FK và kiểm quyền gán, không tin khóa do client gửi. Sự tồn tại của User trong TeachingAssignment/Enrollment không tự xác nhận vai trò; policy/service kiểm các điều kiện đó.

## 4. Blueprint toàn hệ thống theo nhóm

Các model sau chỉ là thiết kế; tuần triển khai là mốc dự kiến, không phải trạng thái hoàn thành.

| Nhóm / tuần dự kiến                             | Model và dữ liệu                                                                                                                                                                                     | Unique/index hoặc điều kiện quan trọng                                                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phiên, kích hoạt, reset — 3                     | UserSession: refreshTokenHash, familyId, expiresAt/revokedAt, rotatedFromId, userAgent; AuthToken: userId/kind/tokenHash/expiresAt/usedAt; RateLimitBucket: keyHash/attempts/windowStart/lockedUntil | Hash token unique; previous/next phiên; index user/family; token một lần và reuse phải được xử lý trong service                                    |
| TOTP — 4                                        | TotpCredential: encryptedSecret, keyVersion, enabledAt, pendingExpiresAt, lastUsedStep, failedAttempts/lockedUntil; TotpRecoveryCode: codeHash/usedAt                                                | Một credential/user; recovery hash unique; không lưu secret dạng rõ; dùng mã một lần bằng cập nhật có điều kiện                                    |
| Kiểm toán/cấu hình — 3–4 và mở rộng theo module | AuditLog: actor/action/objectType/objectId/redactedSummary/occurredAt; SystemSetting: key/value/updatedBy/updatedAt                                                                                  | Audit bất biến theo service; lọc nội dung nhạy cảm; objectId scalar, không quan hệ phiếu; cấu hình giá trị hợp lệ bằng Zod                         |
| Mẫu khảo sát — 6                                | SurveyTemplate, CriterionGroup, Question, QuestionOption                                                                                                                                             | Unique family/version; unique position trong mẫu/nhóm/câu; trọng số Decimal; phiên bản khóa khi gắn đợt duyệt                                      |
| Đợt — 7                                         | SurveyCampaign: kỳ/mẫu/phạm vi/thời gian/trạng thái/ngưỡng; CampaignSection; CampaignHistory                                                                                                         | Unique cặp đợt/lớp; index trạng thái/thời gian; lý do và actor lưu lịch sử; không đổi mẫu/phạm vi sau duyệt                                        |
| Nhiệm vụ — 7                                    | SurveyTask: campaignId/sectionId/studentId, PENDING hoặc DONE, doneDate DATE                                                                                                                         | Unique bộ ba; FK tới CampaignSection và User; index student/status; snapshot đăng ký lúc mở                                                        |
| Phiếu ẩn danh — 8                               | SurveyResponse, SurveyAnswer                                                                                                                                                                         | Chỉ Response ↔ Answer có relation; metadata scalar; UUID và DATE, không timestamp chính xác/định danh người nộp                                    |
| Kết quả/kiểm duyệt — 9                          | AggregateResult: responseCount/taskCount/rate/score/details/eligibleToPublish; trạng thái kiểm duyệt ở SurveyAnswer                                                                                  | Một kết quả/(đợt,lớp); công thức BR-11/12; BR-07 đủ cả số phiếu và tỷ lệ; người kiểm duyệt/lý do trong audit, không thêm relation actor vào phiếu  |
| Giải trình — 9/11                               | ImprovementPlan; ImprovementHistory                                                                                                                                                                  | Unique đợt/lớp/giảng viên; hạn/trạng thái/nội dung/người xác nhận; chuyển trạng thái đúng vai trò, lịch sử bất biến                                |
| Phản hồi lõi — 10                               | Feedback, FeedbackRecipient, FeedbackMessage, FeedbackHistory, Attachment                                                                                                                            | Feedback giữ authorId; index người gửi/người nhận/trạng thái/hạn; recipient unique cặp; storageKey unique, file ngoài public; che tác giả bằng DTO |
| Phản hồi nâng cao — 11                          | FeedbackRating, SlaEscalation                                                                                                                                                                        | Một rating/phản hồi; unique phản hồi/cấp leo thang; chặn mở lại > 1; ngày làm việc và job idempotent ở service                                     |
| Nhắc hạn/thông báo/email — 9/11                 | SurveyReminder, Notification, EmailOutbox                                                                                                                                                            | Unique đợt/sinh viên/ngày; outbox idempotencyKey unique; trạng thái retry, không email nội dung phiếu                                              |
| Báo cáo — 12                                    | Đọc AggregateResult và dữ liệu nghiệp vụ theo policy; không bảng xuất chứa bản sao phiếu gắn tác giả                                                                                                 | DTO/export theo danh sách trường cho phép, test không định danh; không mặc định cho ADMIN quyền xem                                                |

Schema không tự mô tả hết BR: kiểm trạng thái, ngày làm việc, ngưỡng, một lead, giá trị JSON các câu nhiều lựa chọn, loại giá trị tương ứng Question.type, tính nhất quán scope và cấm sửa audit là trách nhiệm service/test. `SystemSetting` cung cấp chỗ cấu hình ngưỡng, thời hạn, từ khóa; mỗi cấu hình vẫn phải có schema hợp lệ và quyền cập nhật.

## 5. Vùng ẩn danh và sự đánh đổi toàn vẹn

SurveyResponse có campaignId/sectionId, SurveyAnswer có questionId nhưng **không FK** sang đợt/lớp/câu hỏi. Nếu nối các FK đó, đồ thị có thể đi đến User/SurveyTask qua đăng ký lớp, người tạo mẫu hoặc danh sách nhiệm vụ; test 5.6a sẽ không đạt. Vì vậy ERD chỉ vẽ quan hệ Response–Answer trong vùng này; liên hệ metadata được giải thích bằng văn bản, không giả là FK.

Service nộp Tuần 8 phải kiểm các scalar tồn tại và đúng tổ hợp đợt/mẫu khóa/lớp đã chốt; mọi option thuộc đúng câu, không chứa ID người dùng. Cập nhật task PENDING → DONE, chèn response và answers cùng transaction; lỗi ghi hoặc kiểm tra thất bại rollback toàn bộ. Không cho query/route tạo phiếu bỏ qua service. Khi blueprint chưa được migrate và service chưa hiện thực, tài liệu này **chưa chứng minh toàn vẹn metadata khi chạy**. Chi tiết tại [THIET_KE_AN_DANH](THIET_KE_AN_DANH.md) và [ADR-003](decisions/ADR-003-an-danh.md).

Audit kiểm duyệt có thể lưu objectType/objectId scalar là SurveyAnswer và actor cán bộ đã kiểm quyền, để đáp ứng BR-09. Cấm ghi actor sinh viên cùng ID phiếu/answer khi nộp. Không thêm moderator relation vào SurveyAnswer vì tạo đường tới User; truy vết kiểm duyệt dựa audit có giới hạn.

## 6. Migration, shadow và an toàn dữ liệu

`npm run db:migrate` dùng schema áp dụng. Blueprint chỉ được validate/generate metadata; không chạy migrate toàn bộ. Database shadow có tên khác database chính, cấu hình riêng bằng SHADOW_DATABASE_URL; guard từ chối cùng tên kể cả khác host alias/tài khoản. `scripts/prepare-database.mjs` chuẩn bị database shadow tên ngẫu nhiên riêng khi chưa cấu hình, lưu marker cục bộ và chỉ grant trên shadow đó; script từ chối tái dùng DB tồn tại không có marker quản lý. Không cấp quyền toàn server cho app. [Tài liệu Prisma](https://www.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/shadow-database) cảnh báo shadow có thể bị reset và không được dùng cùng URL với database chính.

Giữ volume MySQL hiện có; không dùng down -v, migrate reset hoặc db reset để xử lý lỗi. Nếu có drift, đọc SQL/checksum và xin ý kiến trước hành động làm mất dữ liệu. Dữ liệu giả là ràng buộc xuyên suốt. Database test phải tách biệt; không chạy test ghi lên dữ liệu cần giữ.

## 7. Cách kiểm chứng thiết kế

| Kiểm tra                   | Bằng chứng cần có                                                                                                                                | Điều không được suy ra                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Prisma validate hai schema | Kết quả lệnh thật, schema hợp lệ cú pháp/quan hệ                                                                                                 | Nghiệp vụ hoặc bảo mật đã hoàn thành                                                   |
| DMMF nhóm nền              | `tests/schema-anonymity.test.ts` đối chiếu trường scalar, enum, quan hệ/FK nền, khóa chính và unique giữa hai file; kiểm đúng chín model runtime | Không thay kiểm SQL CHECK/index trong MySQL; các model tuần sau chưa có trong database |
| DMMF 5.6a                  | Duyệt toàn đồ thị quan hệ, không đến User/SurveyTask từ Response/Answer; không trường định danh/timestamp ngoài hợp đồng                         | Nộp đồng thời, log và export đã an toàn                                                |
| Migration dev/deploy       | Chín bảng nghiệp vụ và _prisma_migrations; FK/unique/index đúng; không bảng tuần sau                                                             | Các FK thay thế policy hoặc đảm bảo mọi BR                                             |
| Tích hợp MySQL             | `scripts/verify-database.mjs` thử ràng buộc trùng/FK/phạm vi/ngày/tín chỉ trên dữ liệu giả và rollback fixture                                   | UI/CRUD/import/đăng nhập đã có                                                         |

Chi tiết lệnh chạy và số test thực tế được root ghi ở báo cáo Tuần 2. Các test 5.6b/c cần service nộp Tuần 8; 5.6d cần xuất file và được hoàn thiện cùng Tuần 12. Không tick FR chỉ vì schema được thiết kế.
