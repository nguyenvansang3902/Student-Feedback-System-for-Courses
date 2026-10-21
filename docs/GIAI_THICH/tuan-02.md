# Giải thích Tuần 2 — phân tích và thiết kế

**Bản nháp cho nhóm, cập nhật thực tế ngày 21/10/2026.** Theo giả định mỗi tuần 7 ngày từ 30/09, Tuần 2 có mốc kế hoạch 07–13/10/2026. Công việc ở phiên này thực hiện ngày 21/10, không được ghi là đã làm trong khoảng 07–13/10 nếu chưa có bằng chứng. Người dùng đã yêu cầu tiếp tục Tuần 2; phạm vi là phân tích, thiết kế và migration nhóm bảng người dùng/danh mục.

## 1. Tuần này tạo ra điều gì?

Tuần 2 biến đặc tả thành bản thiết kế có thể kiểm tra: yêu cầu có mã FR/NFR, sơ đồ use case/hoạt động/trạng thái, ma trận quyền, thiết kế dữ liệu, quy ước kiến trúc và wireframe màn hình. Những màn hình trong [thư viện wireframe](../wireframes/tuan-02.html) là tài liệu tĩnh; chúng chưa đăng nhập, duyệt đợt, nộp phiếu hoặc xuất báo cáo được.

Thiết kế dữ liệu được tách thành hai mức:

- `prisma/schema.prisma` là schema chạy thật của Tuần 2: 9 bảng nền `User`, `RoleAssignment`, `Faculty`, `Department`, `Semester`, `Course`, `CourseSection`, `TeachingAssignment`, `Enrollment`. Migration chỉ tạo nhóm bảng này.
- `prisma/design.prisma` là bản thiết kế đầy đủ các module cho các tuần tiếp theo. Client và DMMF của bản thiết kế dùng đường dẫn sinh riêng; **không dùng file này để migrate vào DB đang chạy**. Có model trong bản thiết kế không có nghĩa chức năng đã được triển khai.

Các bảng nền cho biết ai là người dùng, họ được gán vai trò/phạm vi gì, học kỳ/khoa/bộ môn nào quản lý lớp, ai dạy và ai đăng ký học. Đăng nhập thật thuộc Tuần 3; phân quyền chi tiết và 2FA thuộc Tuần 4; CRUD/import danh mục thuộc Tuần 5. Tuần 2 chưa làm giao diện chức năng của các phần này.

## 2. Điểm thiết kế quan trọng nhất: hai loại ẩn danh

**Phiếu khảo sát:** nhiệm vụ cho biết sinh viên đã/chưa làm; nội dung phiếu nằm ở miền dữ liệu riêng, không có quan hệ Prisma quay về `User` hoặc `SurveyTask`, kể cả qua bảng trung gian. Mã đợt/lớp/câu hỏi trên phiếu được lưu như tham chiếu vô hướng và kiểm tra ở service khi triển khai; không thêm quan hệ có thể tạo đường nối gián tiếp về nhiệm vụ/người dùng. Phiếu và câu trả lời dùng UUID; ngày nộp chỉ có ngày, không có IP, User-Agent hay giờ chính xác.

Khi triển khai nộp phiếu ở Tuần 8, một transaction sẽ đổi nhiệm vụ từ PENDING sang DONE có điều kiện và thêm phiếu/câu trả lời; chỉ chấp nhận đúng một dòng nhiệm vụ bị đổi. Lỗi thì rollback toàn bộ. Không lưu nội dung phiếu trong audit hoặc log, không có nháp trên máy chủ.

**Phản hồi liên tục:** hệ thống cần biết chủ sở hữu để gửi thông báo, cho sinh viên xem và đối thoại đúng luồng. Vì vậy phản hồi còn liên kết với người gửi trong miền nội bộ, nhưng người xử lý chỉ được thấy “Sinh viên ẩn danh” khi sinh viên chọn ẩn danh. Không được hứa rằng kiểu ẩn danh này giống việc tách rời định danh của phiếu khảo sát.

Test DMMF kiểm tra cấu trúc quan hệ, không chứng minh tất cả mã ứng dụng và hạ tầng đều giữ bí mật. Người có quyền DB/log vẫn có thể suy luận từ dữ liệu hoặc thời điểm; báo cáo phải nêu giới hạn này. Lớp ít người còn phải qua ngưỡng công bố đồng thời về số phiếu và tỉ lệ tham gia.

## 3. Vì sao phải tách vai trò và phạm vi?

Một người có thể là giảng viên ở một số lớp và trưởng bộ môn ở một bộ môn. Quyền không chỉ phụ thuộc tên vai trò mà còn tài nguyên có thuộc phạm vi đó hay không. `RoleAssignment` mô tả gán vai trò; thiết kế policy dùng `can(actor, action, resource)` tập trung, mặc định từ chối. Mọi service phải kiểm quyền trước truy cập dữ liệu. Menu chỉ giúp điều hướng; việc giấu menu hoặc kiểm tra middleware không thay cho kiểm quyền phía máy chủ.

ADMIN quản lý tài khoản, vai trò, cấu hình và nhật ký; theo ma trận thiết kế FR-20/21, ĐBCL vận hành danh mục và nhập liệu. ADMIN không mặc định đọc được kết quả khảo sát hoặc nội dung phản hồi, cũng không được quyền danh mục chỉ vì có vai trò ADMIN. 2FA bảo vệ chức năng quản trị, không tự cấp quyền nghiệp vụ. Các quy tắc này hiện là thiết kế, sẽ có kiểm thử ma trận quyền/IDOR ở các tuần triển khai tương ứng.

## 4. Quy trình nghiệm thu Tuần 2 cho nhóm

Các bước dưới đây là cách chạy nghiệm thu, **không phải khẳng định đã chạy thành công**. Kết quả thực tế, số test và lỗi còn lại phải lấy từ lần chạy của phiên rồi ghi vào báo cáo tiến độ/AI_USAGE.

### A. Đọc thiết kế

1. Mở các sơ đồ Mermaid trong `docs/` bằng công cụ có hỗ trợ Mermaid, đối chiếu với đặc tả gốc: UC-GOLD, trạng thái đợt, phản hồi, giải trình, phạm vi quyền.
2. Mở `docs/wireframes/tuan-02.html` trực tiếp bằng trình duyệt. Kiểm tra 18 màn, mục lục bàn phím, độ rộng 360 px và desktop. Tất cả nút nghiệp vụ/trường nhập đều bị vô hiệu hóa và có nhãn “bản thiết kế”.
3. Đối chiếu [bảng ánh xạ wireframe](../WIREFRAME.md) với FR/BR. Đi qua luồng đủ mẫu/thiếu mẫu, từ chối thiếu lý do, phản hồi ẩn danh và quản trị không có quyền nghiệp vụ.

### B. Kiểm tra schema và migration

Chạy ở thư mục gốc dự án, dùng Node LTS và `.env` cục bộ đã cấu hình. Không đưa `.env` vào Git hoặc báo cáo. DB phát triển và shadow DB phải là hai database riêng; user MySQL cần đủ quyền trên shadow DB. Không dùng DB thật để nghiệm thu.

```powershell
docker compose up -d --wait db mailpit
npm run db:validate
npm run db:prepare
npm run db:migrate -- --name week2_foundation
npm run test:integration
```

- `db:validate` kiểm tra cả schema runtime và bản thiết kế đầy đủ; không ghi DB.
- `db:prepare` chuẩn bị database phát triển/shadow theo script đã cung cấp; đọc README trước khi chạy.
- `db:migrate` dùng schema runtime mặc định. Nếu migration nền đã có và đã áp dụng, lệnh chỉ cần xác nhận không có thay đổi; không tạo thêm migration rỗng. **Không thêm `--schema prisma/design.prisma`** và không chạy `db:reset`/`migrate reset` để “làm sạch”. Nếu Prisma đề nghị reset DB đang có dữ liệu, dừng và báo nhóm xử lý drift có kiểm soát.
- `test:integration` kiểm tra DB thật sau migration; kết quả phải đúng nhóm 9 bảng nền và ràng buộc dự kiến. Dữ liệu của các module khảo sát/phản hồi không được triển khai sớm qua migration.

### C. Kiểm tra test DMMF và hồi quy

```powershell
npm run check
npm run build
npm run progress
```

`check` sinh metadata DMMF từ schema trước khi chạy test. Đọc `tests/schema-anonymity.test.ts` và `tests/helpers/schema-anonymity.ts`: kiểm tra trường cấm, UUID/ngày và duyệt đồ thị quan hệ; không có đường từ `SurveyResponse` hoặc `SurveyAnswer` tới `User`/`SurveyTask`, kể cả đường nhiều cạnh. Các trường hợp kiểm tra chủ động thêm liên kết sai vào metadata phải bị phát hiện, để tránh test xanh chỉ vì kiểm mỗi tên cột.

Phân biệt bốn mức bằng chứng: Prisma validate chứng minh schema hợp lệ; DMMF test chứng minh ràng buộc thiết kế ẩn danh; migrate/integration chứng minh DB nền chạy được; nộp trùng/20 request đồng thời/file xuất không định danh chỉ nghiệm thu khi triển khai ở Tuần 8 và các tuần liên quan. Không ghi các test chưa triển khai là đã qua.

### D. Ghi kết quả và giới hạn

Ghi ngày thực tế, command đã chạy, exit code/số test và đường dẫn bằng chứng; không ghi mật khẩu/token/nội dung phiếu. Cập nhật trạng thái, tiến độ, AI_USAGE, truy vết và báo cáo Tuần 2; chỉ tick FR khi đã có test và nghiệm thu chức năng tương ứng. Có wireframe hoặc schema thiết kế chưa đủ để tick chức năng đăng nhập, khảo sát hay phản hồi.

## 5. Năm câu hỏi có thể được hỏi khi bảo vệ

1. **Vì sao Tuần 2 có schema đầy đủ nhưng DB chỉ có 9 bảng nền?** Schema đầy đủ mô tả thiết kế để kiểm tra quan hệ và dự kiến các module; schema runtime kiểm soát việc triển khai đúng tuần. Chỉ migration nhóm người dùng/danh mục ở Tuần 2, tránh vô tình triển khai nghiệp vụ trước khi có service, policy và test tương ứng.
2. **Không có studentId trong phiếu đã đủ ẩn danh chưa?** Chưa. Nếu phiếu liên kết tới đợt/lớp và đợt/lớp lại nối tới nhiệm vụ/người dùng thì vẫn có đường quan hệ gián tiếp. Nhóm tách đồ thị phiếu khỏi các miền đó và dùng test DMMF duyệt toàn đồ thị; khi triển khai còn phải kiểm log, transaction và tệp xuất.
3. **Làm sao vẫn chặn được nộp trùng khi phiếu không nối với sinh viên?** Nhiệm vụ có unique theo đợt/lớp/sinh viên; cùng transaction, service đổi có điều kiện PENDING→DONE và thêm phiếu rời định danh. Chỉ một request đổi được nhiệm vụ, những request còn lại thất bại; test đồng thời được triển khai ở Tuần 8.
4. **ADMIN đã qua 2FA thì có xem mọi phản hồi không?** Không. 2FA xác nhận người dùng; quyền nghiệp vụ còn phụ thuộc vai trò và phạm vi. ADMIN chỉ có quyền quản trị mặc định. Người xử lý phản hồi ẩn danh không thấy danh tính, nhưng hệ thống vẫn gắn chủ sở hữu để hỗ trợ đối thoại đúng người.
5. **Bốn phiếu, mười nhiệm vụ, điểm 4.11 có công bố được không?** Tỉ lệ là 40%, vượt ngưỡng 30% mặc định; nhưng 4 phiếu thấp hơn ngưỡng 5 phiếu nên chưa được công bố kết quả lớp. Phải đạt đồng thời hai điều kiện. Điểm 4.11 là ví dụ tính công thức, không phải bằng chứng đủ mẫu hay kết quả chạy thật.

> Nhóm cần đọc đặc tả gốc, chạy lại nghiệm thu và diễn đạt phần giải thích bằng lời của mình. Không ghi đóng góp thành viên, phỏng vấn hay quy trình hiện tại tại trường khi chưa có thông tin; người dùng đã yêu cầu bỏ phần quy trình hiện tại.
