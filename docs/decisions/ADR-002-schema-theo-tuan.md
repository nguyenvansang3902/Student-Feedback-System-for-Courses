# ADR-002: Blueprint đầy đủ, migration theo tuần

- Trạng thái: chấp nhận cho thiết kế Tuần 2.
- Ngày thực tế: 21/10/2026. Mốc Tuần 2 giả định: 07–13/10/2026.
- Liên quan: FR-10, FR-20, BR-03, BR-17, BR-34; kế hoạch Tuần 2–11.

## Bối cảnh

Tuần 2 yêu cầu Prisma schema đầy đủ và test ẩn danh 5.6a, đồng thời chỉ migration nhóm người dùng và danh mục. Bảng phiên thuộc Tuần 3; TOTP/kiểm toán Tuần 4; mẫu phiếu, đợt, phiếu và phản hồi thuộc các tuần sau. Dùng một file đầy đủ cho migrate sẽ áp dụng sớm bảng ngoài phạm vi.

## Phương án và quyết định

1. Migrate toàn bộ ngay: dễ gọi lệnh nhưng đi trước kế hoạch; không chọn.
2. Chỉ thiết kế chín bảng: đúng migration nhưng thiếu thiết kế toàn đề tài và không kiểm được 5.6a; không chọn.
3. **Tách schema áp dụng và blueprint**: chọn.

`prisma/schema.prisma` chứa đúng chín model User, RoleAssignment, Faculty, Department, Semester, Course, CourseSection, TeachingAssignment, Enrollment ở Tuần 2. `prisma/design.prisma` chứa 39 model, gồm nhóm nền và thiết kế các module còn lại. Prisma Client/metadata của hai file dùng output riêng. Blueprint không được app runtime import để truy vấn các bảng chưa tồn tại; chỉ validate, generate metadata phục vụ đối chiếu và ERD/test thiết kế. Lệnh migrate mặc định dùng schema áp dụng; không dùng `--schema prisma/design.prisma` với migrate hoặc db push.

Khi tới một tuần triển khai, chuyển đúng nhóm model cần thiết vào schema áp dụng, bổ sung migration, kiểm tra khác biệt và test nghiệp vụ trước nghiệm thu. Hai định nghĩa nền phải được đối chiếu bằng DMMF để tránh sửa một file rồi quên file còn lại. Số bảng/model thực tế và kết quả validate nằm trong bằng chứng chạy, không được coi bản ADR là test đã qua.

## Quyết định dữ liệu nền

`RoleAssignment.scopeKey` là chuỗi không NULL: `GLOBAL`, `FACULTY:<uuid>` hoặc `DEPARTMENT:<uuid>`; unique `(userId, role, scopeKey)`. Không dùng unique chỉ trên các FK nullable để ngăn gán trùng: MySQL cho phép nhiều NULL trong unique index. `scopeKey`, `scopeType` và các FK vẫn cần tính nhất quán: GLOBAL không có FK, FACULTY có đúng facultyId, DEPARTMENT có đúng departmentId. CHECK SQL `RoleAssignment_scope_valid` giới hạn GLOBAL cho SINH_VIEN/GIANG_VIEN/CAN_BO_DBCL/LANH_DAO/ADMIN, FACULTY cho TRUONG_KHOA, DEPARTMENT cho TRUONG_BO_MON và kiểm khóa khớp ID. Service Tuần 4 vẫn phải tạo khóa chuẩn từ phạm vi và kiểm quyền gán, không nhận scopeKey tùy ý từ client; policy theo ma trận vẫn bắt buộc.

Các FK nền dùng Restrict để không xóa dây chuyền dữ liệu học tập. Dừng dùng danh mục bằng isActive; khóa học kỳ bằng lockedAt. Unique mã người dùng/email, mã danh mục, mã lớp trong học kỳ và các cặp phân công/đăng ký tránh tạo trùng. Khóa/index không thay thế kiểm vai trò giảng viên/sinh viên, ngày kỳ hợp lệ hoặc credits ở service.

## Migration và shadow database

MySQL dev dùng database chính và **database shadow có tên riêng**. Prisma có thể reset schema shadow khi `migrate dev`; không dùng chung tên dù khác tài khoản hoặc alias host. Guard tại `prisma/database-urls.ts` từ chối hai URL có cùng tên database. `scripts/prepare-database.mjs` tạo shadow riêng khi chưa cấu hình, có marker quản lý và cấp quyền đúng shadow; `scripts/verify-database.mjs` kiểm dữ liệu nền bằng fixture rollback. Không cấp quyền toàn cục `*.*` cho tài khoản ứng dụng chỉ để chạy migrate. Không xóa volume MySQL hoặc reset database chính để vượt qua lỗi migration. Nếu Prisma yêu cầu reset do drift, dừng, đọc nguyên nhân và chọn giải pháp giữ dữ liệu; xóa DB cần người dùng đồng ý theo AGENTS.

CI áp migration đã commit bằng `migrate deploy` vào database test riêng; `migrate dev` dành cho phát triển. Đây là quy ước, kết quả thực thi từng lệnh phải được ghi riêng.

## Hệ quả

- Đáp ứng thiết kế toàn hệ thống mà không triển khai nghiệp vụ tuần sau.
- Có chi phí duy trì đồng bộ hai schema; test DMMF là cổng chống lệch và chỉ chứng minh cấu trúc.
- Test ẩn danh chạy trên blueprint không chứng minh transaction/API/export đã an toàn; 5.6b/c/d vẫn chờ các module tương ứng.
- Giữ lịch sử migration và volume cũ; shadow là vùng tạm có thể bị Prisma reset, tuyệt đối không chứa dữ liệu cần giữ.

## Nguồn chính thức đã đối chiếu

- [MySQL 8.4: CREATE INDEX](https://dev.mysql.com/doc/refman/8.4/en/create-index.html): unique index chấp nhận nhiều NULL.
- [Prisma: shadow database](https://www.prisma.io/docs/orm/v7/prisma-migrate/understanding-prisma-migrate/shadow-database): reset shadow khi migrate dev, cảnh báo không dùng cùng URL database chính.
