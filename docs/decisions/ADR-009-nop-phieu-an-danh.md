# ADR-009: Nộp khảo sát một lần và giữ ranh giới ẩn danh

- Ngày thực hiện: 29/10/2026 (Asia/Saigon), theo yêu cầu bắt đầu Tuần 8.
- Trạng thái: quyết định hiện thực Tuần 8; kết quả chạy thật ghi riêng trong nghiệm thu của tuần.
- Liên quan: FR-50–54; BR-01/02/03/04/17/30/34; Mục 5.6; [ADR-003](ADR-003-an-danh.md) và [thiết kế ẩn danh](../THIET_KE_AN_DANH.md).

## Bối cảnh và lựa chọn

Sinh viên phải có nhiệm vụ để làm khảo sát, và mỗi nhiệm vụ chỉ hoàn thành một lần. Danh tính cần thiết để xác minh quyền và cập nhật nhiệm vụ, nhưng không được lưu kèm nội dung phiếu. Chỉ bỏ tên khỏi giao diện hoặc dùng một ID bí mật nối nhiệm vụ với phiếu đều không đáp ứng hợp đồng 5.6. Vì vậy giữ vùng dữ liệu hai model đã chọn trong ADR-003: chỉ `SurveyResponse`–`SurveyAnswer` có quan hệ với nhau; metadata đợt/lớp/câu hỏi là scalar, do service kiểm tra.

Không thay schema ẩn danh, không thêm token nộp, bảng nháp, bảng ánh xạ, audit nộp hay sự kiện hàng đợi mang đồng thời danh tính sinh viên và ID/nội dung phiếu. Kết quả, kiểm duyệt và công bố thuộc Tuần 9; xuất kết quả thuộc Tuần 12.

## Quyền, dữ liệu chốt và thời hạn

Route xác thực cookie, kiểm Origin/Host và CSRF riêng cho chức năng khảo sát; HTTP dùng `Cache-Control: no-store`. Service yêu cầu grant `SINH_VIEN` phạm vi `GLOBAL` và phiên `FULL`. Trong transaction, lấy `ADMIN_MUTATION_LOCK` trước lần SELECT thường, rồi đọc lại phiên, tài khoản, grant và yêu cầu MFA hiện tại. Cách này dùng chung thứ tự khóa với thay quyền, mẫu, học kỳ và đợt, tránh đọc snapshot quyền cũ sau khi chờ mutex.

Mọi lần đọc/nộp theo ID đều lọc `SurveyTask.id` cùng `studentId` của actor mới đọc lại. ID lạ và nhiệm vụ người khác cùng trả 404; không chuyển trạng thái đợt qua một nhiệm vụ ngoài quyền. Nhiệm vụ từ `CampaignSection` đã chốt xác định lớp được làm; không đọc lại Enrollment để cấp hoặc rút quyền sau chốt (BR-01/34).

Trước đọc chi tiết/nộp, một transaction chuẩn bị xác minh chủ nhiệm vụ và chạy lifecycle của đợt. Transaction này commit riêng để chuyển trạng thái hết hạn không bị rollback chỉ vì phiếu nộp sau đó không hợp lệ. Transaction nộp sau đó kiểm lại toàn bộ điều kiện. Việc chuyển đợt có thể ghi lịch sử/audit/thông báo của **đợt** theo Tuần 7; không mang ID hay nội dung phiếu và không tạo audit nộp của sinh viên.

Chỉ nhận phiếu khi đợt `DANG_MO`, giờ máy chủ trong khoảng đóng `[startsAt, endsAt]`, học kỳ chưa khóa và phiên bản mẫu `DA_KHOA` có `lockedAt`. Đúng `endsAt` còn được nộp; sau mốc đó bị chặn. Đợt đóng sớm/hủy hoặc mẫu không sẵn sàng cũng bị chặn. Đồng hồ trình duyệt chỉ phục vụ hiển thị.

## Giao dịch nộp

`submitStudentSurvey` đọc nhiệm vụ và mẫu trong transaction đang giữ mutex. `parseStudentSurveyAnswers` kiểm đúng phiên bản mẫu, đủ câu bắt buộc, không lặp câu/câu ngoài mẫu, đúng một loại giá trị, thang Likert 1–4/1–5, lựa chọn thuộc câu và cờ Không áp dụng. Câu tự luận tối đa 4.000 ký tự, giữ như văn bản, không cho ký tự điều khiển. Body JSON bị giới hạn 256 KiB theo byte stream thực; tối đa 100 câu trả lời. Client không tự chỉ định campaignId/sectionId hay metadata nộp.

Thứ tự ghi bắt buộc:

1. Cập nhật có điều kiện đúng nhiệm vụ/chủ/đợt/lớp, trạng thái `PENDING`, đồng thời còn thỏa thời hạn, học kỳ và mẫu. Số dòng phải bằng 1.
2. Tạo UUID ngẫu nhiên cho `SurveyResponse`, lấy campaignId/sectionId từ nhiệm vụ phía server. Tạo UUID cho các answer đã kiểm, nối duy nhất bằng responseId, trạng thái kiểm duyệt ban đầu `CHO_KIEM_DUYET`.
3. Commit cả nhiệm vụ lẫn phiếu. Mọi lỗi trước commit rollback toàn bộ, kể cả lỗi chèn answer sau khi đã cập nhật nhiệm vụ và tạo response.

Hai ngày `doneDate` và `submittedDate` lấy từ cùng một lần tính ngày nghiệp vụ `Asia/Ho_Chi_Minh`, lưu `DATE`; không lưu giờ nộp chính xác. UUID không mang thứ tự nộp. Không dựa vào unique studentId trên phiếu để chống trùng. Điều kiện `PENDING → DONE` và transaction của DB là lớp quyết định; nút bấm bị khóa trên giao diện chỉ hỗ trợ thao tác.

Lần nộp lại bị 409, không sửa/xóa hoặc tạo phiếu mới. Nếu mất mạng sau commit, giao diện đọc lại nhiệm vụ của mình để xác nhận `DONE`, không tự retry POST bằng UUID mới và không truy vấn lại nội dung phiếu.

## DTO, lỗi và nháp

Kết quả nộp chỉ có `{ status: "DONE", doneDate: "YYYY-MM-DD" }` bên trong envelope HTTP. Chi tiết nhiệm vụ đã xong trả trạng thái/ngày và `template: null`, không đọc response/answer, không trả ID hay bản sao phiếu. Danh sách/chi tiết dùng projection tường minh thay vì spread hàng DB. Ngày hoàn thành không phải biên nhận có ID phiếu.

Lỗi dữ liệu trả thông báo tiếng Việt chung; lỗi ORM/driver được đổi thành lỗi chung trước route để không thoát SQL params hoặc nội dung phiếu. Prisma runtime khởi tạo `log: []`. Service không ghi nội dung/ID phiếu ra console, audit, thông báo hay email/outbox. Không gắn request/session/correlation/IP/User-Agent vào response hoặc answer.

Nháp chỉ ở localStorage, khóa theo tài khoản/nhiệm vụ/phiên bản mẫu; không có endpoint nháp và không lưu token vào nháp. Dữ liệu khôi phục được kiểm lại theo mẫu hiện tại, loại trường lạ, dữ liệu hỏng/hết hạn hoặc sai phiên bản. Xóa nháp khi nhận `DONE` hoặc đăng xuất. localStorage chứa nội dung cá nhân trên thiết bị nên giao diện nhắc người dùng dùng máy chung; xóa nháp không có nghĩa là xóa lịch sử hoặc bản sao ngoài ứng dụng.

## Bằng chứng cần giữ và phạm vi tiêu chí 5.6(d)

| Tiêu chí | Bằng chứng phù hợp |
| --- | --- |
| 5.6(a) | DMMF runtime và thiết kế: đồ thị quan hệ, hợp đồng scalar/UUID/DATE và mutation test hiện có trong `schema-anonymity.test.ts`. |
| 5.6(b) | Nộp thành công rồi nộp lại trên MySQL; lần hai bị từ chối, số response/answer không tăng. |
| 5.6(c) | 20 request đồng thời cùng nhiệm vụ trên MySQL; đúng một phiếu, đủ answer và task DONE; lỗi cưỡng bức phải rollback. Mock đơn lẻ không thay bằng chứng này. |
| 5.6(d), phần Tuần 8 | Kiểm DTO qua route/service, payload ghi DB, lỗi có sentinel nhạy cảm, các sink console/audit/queue và cấu hình Prisma. Test có chủ đích đưa trường cầu nối vào input và trường nhạy cảm thừa vào hàng DB để bắt hồi quy. |
| 5.6(d), phần xuất file | Chưa có xuất kết quả khảo sát ở Tuần 8. Khi hiện thực Tuần 12 phải kiểm tất cả CSV/Excel/PDF và metadata/sheet ẩn; chưa được ghi phần này đã qua. Mẫu tệp nhập danh mục hiện có không phải export phiếu. |

Privacy unit test dùng giả lập xác thực/CSRF/lifecycle và DB để kiểm các biên dữ liệu đang có; không chứng minh MySQL đồng thời, proxy/APM hoặc cấu hình triển khai bên ngoài. Kết quả từng lệnh phải được ghi từ lượt chạy thật, không suy từ ADR hay sơ đồ.

## Giới hạn và hệ quả

Đây là ẩn danh ở mức ứng dụng. DBA hoặc người đọc binlog/transaction trace có thể suy luận những hàng đổi cùng giao dịch. Scalar đợt/lớp cho phép người có quyền DB tự JOIN để thu hẹp tập người; không có FK không ngăn truy vấn thủ công. Request timing, log proxy/hạ tầng, lớp ít người và tự luận tự nhận diện vẫn có thể lộ người viết. Ngưỡng công bố/trộn thứ tự/kiểm duyệt được làm ở tuần sau, không được coi đã bảo vệ nội dung Tuần 8.

Mutex chung ưu tiên tính đúng đắn, đồng thời tuần tự hóa các thao tác đang giữ nó; chưa thể nhận đạt tải 1.500 request chỉ từ test 20 request. Mở rộng hiệu năng phải giữ kiểm quyền mới, atomicity và ranh giới ẩn danh. Phản hồi liên tục vẫn giữ tác giả để đối thoại theo BR-24, có mức ẩn danh khác khảo sát.

Sơ đồ nguồn và ảnh: [SO_DO_TUAN_08.md](../SO_DO_TUAN_08.md). Phần diễn giải phục vụ bảo vệ: [Giải thích Tuần 8](../GIAI_THICH/tuan-08.md).
