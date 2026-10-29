# Chương 4. Hiện thực hệ thống — nháp đến Tuần 8

**[CẦN SINH VIÊN ĐỌC VÀ VIẾT LẠI BẰNG LỜI CỦA MÌNH]**

Viết ngày 29/10, cập nhật30/10/2026. AI hỗ trợ nháp; nhóm phải đọc mã, chạy lại và diễn đạt bằng lời của mình. Chưa phải toàn bộ chương hiện thực của đề tài. Thông số/nghiệm thu nguồn cuối xem [nghiệm thu Tuần 8](../NGHIEM_THU_TUAN_08.md); phần đang kiểm chưa được coi đã nghiệm thu.

## 4.1. Tổ chức mã và ranh giới trách nhiệm

Next.js App Router cung cấp trang /dot-khao-sat và API /api/campaigns. Route kiểm phiên/cookie, Origin, CSRF, kiểu dữ liệu và giới hạn256KiB thực tế. Policy can.ts xác định quyền theo grant hợp lệ; service campaigns.ts kiểm quyền và phiên mới từ DB trước mỗi thao tác. Giao diện chỉ hiện nút phù hợp, API vẫn từ chối thao tác ngoài quyền. Cấu hình ngưỡng đặt tại /quan-tri/cau-hinh-khao-sat, bắt buộc ADMIN MFA và TOTP mới khi lưu.

campaign-readiness.ts giải phạm vi đợt thành lớp và cặp đăng ký, chạy RS-01–06 và tính hash. campaigns.ts thực hiện tạo/sửa/trình/xác nhận/duyệt và vận hành. campaign-lifecycle.ts dùng cùng logic cho ensure ở request và scheduler, chốt nhiệm vụ nguyên tử theo revision. campaign-notifications.ts xếp hàng và gửi thư sau commit. Prisma runtime 34 model chỉ gồm phần đã đến lịch triển khai và bảng seed được cho phép; blueprint 46model giữ phần thiết kế tương lai.

## 4.2. Kịch bản minh họa

ĐBCL chọn học kỳ mở, phiên bản mẫu và phạm vi lớp, nhập lịch theo giờ Việt Nam và trình. PĐT đọc readiness; thiếu giảng viên/đăng ký hoặc kỳ khóa làm nút xác nhận bị chặn ở máy chủ. Có cảnh báo vẫn xác nhận được nếu ghi chú. Lãnh đạo duyệt sẽ khóa mẫu. Đến lịch, cohort được tính lại; thay đổi trước mở tạo cảnh báo và dùng dữ liệu mới, còn thay đổi sau mở không sửa nhiệm vụ đã chốt. Tiến độ được tính từ trạng thái nhiệm vụ, độc lập nội dung phiếu ẩn danh.

## 4.3. Tranh chấp và phục hồi

Transaction khóa mutex chung trước đọc dữ liệu; CAS ngăn hai lần ghi cùng revision. RequestId đảm bảo thao tác trình/xác nhận/duyệt/gia hạn lặp không nhân lịch sử. Mở đợt tạo cohort/task trong cùng transaction, nên lỗi giữa chừng rollback toàn thao tác. Nếu scheduler ngừng, lần truy cập kế tiếp gọi ensure để bắt kịp; lịch sử dùng giờ thực tế. Hàng đợi email lưu trạng thái và lease để worker thử lại; không giữ giao dịch trong thời gian SMTP.

## 4.4. Nhiệm vụ và form khảo sát sinh viên

Tuần 8 bổ sung `/khao-sat`, trang form theo taskId và xác nhận đã nộp. API `/api/student-surveys` kiểm cookie/phiên, Origin và CSRF mục đích riêng; bộ đọc body giới hạn256KiB theo byte thực, kể cả stream không có Content-Length. `student-surveys.ts` đặt logic đọc và nộp; mọi transaction lấy mutex chung rồi đọc lại tài khoản, phiên, grant và yêu cầu MFA. Chỉ grant SINH_VIEN hợp lệ cấp quyền; ADMIN không có quyền ngầm và tài khoản ADMIN+SV vẫn phải MFA.

Danh sách/count/detail đều lấy studentId từ actor và lọc ngay truy vấn. Nhiệm vụ người khác và ID không tồn tại cùng404. Quyền làm bài dựa trên SurveyTask đã chốt, không xét Enrollment hiện tại; rút hoặc thêm đăng ký sau mở không đổi danh sách. Lần đọc/nộp có bước chuẩn bị chạy lifecycle sau khi xác minh chủ nhiệm vụ, để trạng thái hết hạn được commit dù nội dung nộp bị từ chối.

Form chỉ nhận projection của đúng phiên bản mẫu đã khóa. Có nhóm/câu/thứ tự, năm loại câu, thang Likert 1–4/1–5, bắt buộc và Không áp dụng. `student-survey-input.ts` kiểm đủ câu bắt buộc, không trùng/câu ngoài mẫu, không trộn loại giá trị, lựa chọn phải thuộc đúng câu; BOOLEAN=false vẫn là câu đã trả lời. Tự luận tối đa4.000 ký tự, là văn bản và không nhận ký tự điều khiển. Câu tùy chọn trống không tạo answer. Thanh tiến trình/kiểm client hỗ trợ người dùng; server kiểm lại toàn bộ.

## 4.5. Giao dịch nộp và ranh giới ẩn danh

Chỉ nhận phiếu khi task PENDING, đợt DANG_MO, mẫu DA_KHOA, kỳ chưa khóa và giờ server trong khoảng đóng `[startsAt, endsAt]`. Lifecycle đóng sau endsAt; đúng mốc kết thúc vẫn hợp lệ theo BR-04. Kiểm điều kiện được lặp ngay trước cập nhật. Lệnh cập nhật có điều kiện PENDING→DONE phải đổi đúng một hàng, sau đó tạo response và các answer trong cùng transaction. Lỗi tạo answer rollback cả task và response; lần nộp cạnh tranh hoặc nộp lại nhận409, không có đường sửa phiếu đã nộp.

Task lưu sinh viên và doneDate; Response lưu UUID ngẫu nhiên, đợt/lớp scalar và submittedDate; Answer chỉ quan hệ với Response và lưu questionId scalar/giá trị. doneDate và submittedDate cùng lấy ngày nghiệp vụ Asia/Ho_Chi_Minh, không lưu giờ chính xác. Không có studentId/taskId/IP/User-Agent/session/request/correlation ID, token nộp hoặc bảng ánh xạ ở vùng phiếu. Không ghi audit/notification/outbox chứa người nộp cùng ID/nội dung phiếu; lifecycle vẫn có thể ghi sự kiện của đợt độc lập theo Tuần 7.

Kết quả POST chỉ có trạng tháiDONE/ngày. DetailDONE có template=null, không đọc response/answer hoặc trả bản sao/ID phiếu. Lỗi ORM được chuyển thành thông báo chung trước route để tránh SQL params hoặc nội dung thoát ra; Prisma không bật query logging. Đây là ẩn danh ở mức ứng dụng: DBA/binlog/timing, lớp ít người hoặc tự luận tự nhận diện vẫn có thể làm lộ người viết; không nhận chống mọi suy luận.

## 4.6. Nháp và phục hồi sau mất phản hồi

Nháp chỉ ở localStorage theo tài khoản/task/phiên bản mẫu, không có endpoint nháp hoặc token. Dữ liệu khôi phục được kiểm lại đúng metadata mẫu; giới hạn20 nháp,256KiB và7 ngày lưu. Client ghi khi thay đổi, dọn khi server xác nhậnDONE/hết hạn/kỳ khóa hoặc đăng xuất. Tín hiệu xóa giữa các tab chỉ mang metadata; phiên xử lý cũ bị vô hiệu trước xóa để GET đến muộn không phục hồi hoặc ghi lại nháp đã dọn. Đọc/xóa localStorage không bảo đảm xóa bản sao ngoài ứng dụng, nên trang nhắc người dùng về máy chung.

Giờ server cùng `performance.now()` hỗ trợ hiển thị đếm hạn, tránh đồng hồ máy người dùng làm đóng form/xóa nháp quá sớm; server vẫn quyết định. Mất phản hồi POST sau commit dẫn tới GET lại task: DONE mở xác nhận, PENDING mới cho thử tiếp. Nếu GET cũng lỗi thì giữ trạng thái chưa xác định và khóa nộp tới khi xác minh được, không tự gửi lại POST.

## 4.7. Bằng chứng và phần còn lại của chương

Các kiểm DMMF, service/input, body, client/clock/draft và privacy route→service bảo vệ từng ranh giới. HTTP/MySQL kiểm10 vai trò, taskown/IDOR, fresh quyền, dữ liệu câu trả lời, duplicate,20 POST đồng thời và rollback lỗi answer. Kết quả thực từng gate/build/UI/CI được chốt tại [nghiệm thu](../NGHIEM_THU_TUAN_08.md) và [truy vết](../TRUY_VET.md), không suy từ thiết kế hoặc mock. Sơ đồ/giải thích tại [SO_DO_TUAN_08](../SO_DO_TUAN_08.md), [ADR-009](../decisions/ADR-009-nop-phieu-an-danh.md) và [5 câu bảo vệ](../GIAI_THICH/tuan-08.md).

Tuần 9 mới tổng hợp/công bố/kiểm duyệt; các tuần sau xử lý phản hồi, SLA, báo cáo và kiểm tải. Phần5.6(d) hiện kiểm DTO/payload/lỗi/log có thật; exportCSV/Excel/PDF kết quả chưa có và phải kiểm khi Tuần 12 hiện thực. Dữ liệu từ seed được người dùng cho phép không đồng nghĩa API tương lai đã hoàn thành. FR-145 ImportBatch/hoàn tác còn backlog; chỉ đưa số liệu kiểm thử thật vào bản nộp cuối.
