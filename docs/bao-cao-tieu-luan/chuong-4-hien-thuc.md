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

Tại mốc Tuần 8, tổng hợp/công bố/kiểm duyệt chờ Tuần 9; phản hồi chờ Tuần 10. ExportCSV/Excel/PDF kết quả phải kiểm khi Tuần 12 hiện thực. Dữ liệu seed không đồng nghĩa API tương lai đã hoàn thành. FR-145 ImportBatch/hoàn tác còn backlog; chỉ đưa số liệu kiểm thử thật vào bản nộp cuối.

## 4.8. Phản hồi và tiếp nhận Thanh tra — Tuần 10

[CẦN SINH VIÊN ĐỌC VÀ VIẾT LẠI BẰNG LỜI CỦA MÌNH]

Phản hồi liên tục dùng các service riêng để kiểm đăng ký học phần, học kỳ được phép và định tuyến tám loại. Người gửi được theo dõi cuộc trao đổi; người xử lý chỉ thấy nhãn Sinh viên ẩn danh khi được chọn. Mọi lượt đọc, thay đổi trạng thái và tải tệp kiểm lại phiên/quyền/phạm vi từ database. Không thêm liên kết danh tính vào miền phiếu khảo sát ẩn danh.

Revision và requestId bảo vệ thay đổi đồng thời và gửi lại sau lỗi mạng. Chuyển tiếp thay người nhận hiện hành; người cũ mất quyền đọc nội dung, nhưng gửi lại đúng yêu cầu đã thành công chỉ nhận biên nhận. Lịch sử chỉ thêm, lý do chuyển hoặc từ chối là bắt buộc. Tệp giới hạn ba tệp trên toàn phản hồi, mỗi tệp 5 MiB; kiểm đuôi/chữ ký nội dung, lưu tên ngẫu nhiên ngoài public và tải qua API có quyền.

Gửi khiếu nại nghiêm trọng tạo đồng thời phản hồi và hồ sơ TIEP_NHAN. Xung đột lợi ích tính động theo lớp, bộ môn và khoa, có hiệu lực cả với tài khoản nhiều vai trò. Mặc định Thanh tra cũng không nhận danh tính; sinh viên có thể chọn cho riêng Thanh tra không xung đột biết, có kiểm toán lượt xem. Lãnh đạo nhận tóm tắt; ADMIN và ĐBCL không đọc hồ sơ. Xác minh, kết luận và thông báo chưa được mở ở Tuần 10.

Nguồn và kiểm thử thực tế đối chiếu ở [nghiệm thu Tuần 10](../NGHIEM_THU_TUAN_10.md), [QA](../QA_GIAO_DIEN_TUAN_10.md) và [ADR-011](../decisions/ADR-011-phan-hoi-va-tiep-nhan-thanh-tra.md). Phạm vi hạn chế gồm tự tiết lộ qua nội dung/tệp, quyền DBA và log hạ tầng, chưa quét mã độc ngoài hoặc chứng nhận mọi thiết bị/WCAG.
# Phần bổ sung Tuần 11

[CẦN SINH VIÊN ĐỌC VÀ VIẾT LẠI BẰNG LỜI CỦA MÌNH]

Nội dung kỹ thuật bổ sung: [SLA, giao dịch, giải trình và kiến nghị](../CHUONG_HIEN_THUC_TUAN_11.md), [quy trình Thanh tra](../QUY_TRINH_THANH_TRA_TUAN_11.md), [bằng chứng nghiệm thu](../NGHIEM_THU_TUAN_11.md). Các phần bên dưới giữ nội dung lịch sử của các tuần trước; không suy chúng đã bao gồm chức năng mới tại thời điểm viết.

# Phần bổ sung Tuần 12

Ngày bổ sung: 03/11/2026, thực hiện sớm theo lệnh người dùng so với mốc kế hoạch 16–22/12/2026. Nội dung các phần trước được giữ theo thời điểm đã viết. AI hỗ trợ nháp phần này; nhóm cần đối chiếu mã, chạy lại và viết bằng lời của mình trước khi nộp.

## 4.9. Dashboard và phạm vi báo cáo

Dashboard và API báo cáo đi qua service kiểm tài khoản, phiên, gán quyền và phạm vi hiện tại trong giao dịch có cùng khóa điều phối với thay đổi phân quyền. Đầu vào chọn một vai trò hợp lệ của tài khoản. Điều kiện phạm vi và bộ lọc được ghép bằng AND; định danh ngoài phạm vi trả lỗi không tìm thấy. Vai trò được chọn quyết định tập dữ liệu, không lấy quyền toàn trường từ vai trò khác để mở rộng kết quả.

Sinh viên nhận số nhiệm vụ và phản hồi của chính tài khoản. Giảng viên nhận tập lớp đang được phân công; trưởng bộ môn/khoa nhận phạm vi đơn vị được gán. Điểm của các vai trò này chỉ được xem sau công bố/lưu trữ, còn ĐBCL và Lãnh đạo xem từ khi tổng hợp theo quyền. Phòng Đào tạo có độ sẵn sàng đợt và thống kê phản hồi tổ chức lớp; Khảo thí có điểm nhóm đánh giá gộp và phản hồi thi; Thanh tra có thống kê hồ sơ không xung đột. ADMIN, kể cả khi ghép vai trò khác, chỉ nhận dashboard tài khoản/phiên. ĐBCL ghép Thanh tra không được chọn báo cáo hồ sơ mật. Lãnh đạo chỉ nhận số liệu tóm tắt hồ sơ, không có nội dung xác minh.

Độ sẵn sàng dùng kiểm tra dữ liệu nội bộ nhưng chỉ trả số lớp, số lớp có lỗi, số lỗi/cảnh báo và trạng thái. Không đưa danh sách sinh viên, cặp đăng ký, email hoặc mã băm danh sách vào dashboard. Khi chọn một đơn vị, đợt giao với đơn vị đó vẫn được kiểm trên toàn phạm vi đợt để tránh nhận định đủ điều kiện từ một phần dữ liệu.

## 4.10. Tính chỉ số và bảo vệ ô nhỏ

Điểm khảo sát dùng lại `poolSurveyScores` để cộng số phiếu, phân bố và tổng giá trị gốc; không lấy trung bình điểm lớp đã làm tròn. Khảo thí chỉ nhận điểm nhóm có cờ `isAssessmentGroup`, gộp theo môn/bộ môn/khoa. Ngưỡng hai giảng viên chỉ tính người thuộc tập có phản hồi và có ít nhất một giá trị LIKERT hợp lệ ở nhóm đánh giá. Giảng viên chỉ có câu đánh giá NA/trống không giúp đạt ngưỡng, dù nhóm giảng dạy của cùng lớp có điểm. Helper này được dùng chung ở báo cáo, đường đọc kết quả và bằng chứng tạo kiến nghị để tránh ba cách áp dụng khác nhau.

Với khảo sát thường, lớp thiếu mẫu bị ẩn và kéo theo tổng bộ môn/khoa; với Khảo thí, quy tắc bắt đầu từ môn. Cách ẩn này ngăn việc công bố tổng cha cùng các nhóm còn lại rồi suy ra nhóm bị ẩn bằng phép trừ. Dữ liệu mẫu không tương thích hoặc ảnh chụp không hợp lệ không được gộp thành điểm chung.

Báo cáo phản hồi và hồ sơ dùng ngưỡng riêng, mặc định 5 bản ghi, tách khỏi ngưỡng công bố đợt. Ô trạng thái/quá hạn/kết luận có số dương dưới ngưỡng làm cả hàng bị ẩn, gồm tổng; tổng học kỳ không hiện khi nhóm lá bị ẩn. Trung bình thời gian, hài lòng và các tỷ lệ còn kiểm riêng số mẫu của chính chỉ số. Không có mẫu số hoặc không đủ mẫu trả `null`; biểu đồ không đổi thành 0 hay tự tính lại từ ô đã ẩn. Thời gian xử lý là ngày lịch; hạn SLA vẫn tính ngày làm việc. Tỷ lệ đang quá hạn dùng số đang xử lý làm mẫu số; tỷ lệ trả lời trễ dùng bản ghi có mốc trả lời gần nhất, không được hiểu là toàn bộ lịch sử sau các lần mở lại. Công thức và ví dụ đối chiếu ở [CONG_THUC_BAO_CAO](../CONG_THUC_BAO_CAO.md).

## 4.11. Xuất CSV, Excel và PDF

Dashboard, biểu đồ và ba renderer nhận cùng DTO đã kiểm quyền và ngưỡng. Không có nhánh xuất đọc lại bảng thô. Dữ liệu xuất gồm nhãn phạm vi/bộ lọc được phép và các ô tổng hợp, không gồm tài khoản/email sinh viên, nội dung phản hồi, câu trả lời, ghi chú hoặc tệp Thanh tra. Dòng bị ẩn giữ các ô số là `null` trong cả ba định dạng. Chuỗi CSV/Excel được xử lý để không trở thành công thức bảng tính; PDF dùng phông tiếng Việt đi kèm dự án.

Trước khi trả dữ liệu cho renderer, service ghi sự kiện `REPORT_EXPORTED` chứa vai trò, định dạng và nhóm báo cáo, không ghi nội dung riêng tư vào audit. Cấu hình ngưỡng báo cáo do ĐBCL quản lý, kiểm revision, requestId, hash và ghi nhật ký. Đổi ngưỡng báo cáo không sửa ngưỡng công bố của các đợt. Quyết định kiến trúc và các giới hạn được ghi ở [ADR-012](../decisions/ADR-012-bao-cao-va-nguong-du-lieu.md).

## 4.12. Cảnh báo bất thường và hồ sơ xác minh

Sau tổng hợp, bộ phát hiện xét hai luật với mặc định tối thiểu 10 phiếu: tỷ lệ phiếu đồng nhất từ 70% hoặc chênh lệch tuyệt đối so với kỳ trước từ 1,5 điểm. Một phiếu đồng nhất cần ít nhất hai giá trị LIKERT hợp lệ và bằng nhau; NA/trống không tham gia so sánh, mẫu số là toàn bộ phiếu của lớp. Đối chiếu kỳ trước chỉ dùng cùng môn, cùng mẫu, dữ liệu đã công bố/lưu trữ và đủ ngưỡng. So ngưỡng trước làm tròn; thiếu dữ liệu tương thích được ghi là chưa xác định, không thay bằng 0.

Mỗi lớp/đợt/luật có tối đa một cờ, lưu chỉ số và ngưỡng tại lúc tạo. Thanh tra không xung đột xem chỉ số, ghi lý do và chọn Bình thường, Cần lưu ý hoặc Chuyển xác minh. Quyền và xung đột kiểm lại khi đọc và ghi, gồm cả tài khoản nhiều vai trò. Đầu ra không có điểm tuyệt đối, câu trả lời, tự luận hay danh tính người nộp. Thông báo Cần lưu ý cho ĐBCL chỉ là thông báo chung, không cấp quyền đọc hồ sơ hoặc toàn bộ chỉ số.

Chuyển xác minh tạo một hồ sơ nguồn `BAT_THUONG_KHAO_SAT` trong cùng giao dịch; revision, requestId, hash và khóa duy nhất ngăn gửi lặp/cạnh tranh tạo thêm hồ sơ. Hồ sơ đi qua quy trình Thanh tra đã có, giữ ghi chú/tệp nội bộ và lịch sử xem xét. Không tạo phản hồi giả, không nối đến sinh viên hoặc phiếu cụ thể và không gửi thông báo kết luận cho toàn bộ sinh viên. Scheduler và lần mở danh sách bù các lần tính chưa thực hiện; cờ không tự ngăn công bố và không tự kết luận vi phạm. Chi tiết ở [cảnh báo bất thường Tuần 12](../CANH_BAO_BAT_THUONG_TUAN_12.md).

## 4.13. Kiểm chứng và giới hạn tại thời điểm bổ sung

UC-GOLD đã có kết quả tự động 3/3 bài đạt bằng tổ hợp thao tác API và trình duyệt. Đây không phải xác nhận đã thử tay toàn bộ kịch bản hoặc mọi vai trò/thiết bị. Kịch bản, cách dựng dữ liệu giả, bước đã kiểm và phần còn lại được ghi riêng tại [UC_GOLD_TUAN_12](../UC_GOLD_TUAN_12.md) và [QA giao diện](../QA_GIAO_DIEN_TUAN_12.md). Tại thời điểm bổ sung đoạn này, kiểm tra tổng, build và CI Tuần 12 chưa được chốt; kết quả cuối phải lấy từ [nghiệm thu Tuần 12](../NGHIEM_THU_TUAN_12.md), không suy từ việc có mã nguồn hoặc test.

Ẩn ô nhỏ và tổng cha giảm suy ngược trực tiếp trong tập dữ liệu xuất; chưa bảo đảm chống mọi phép kết hợp nhiều báo cáo, kiến thức bên ngoài hoặc quyền quản trị database/hạ tầng. Không có đường nối người nộp với phiếu khảo sát được bổ sung ở tuần này. Cảnh báo chỉ hỗ trợ xem xét ở mức ứng dụng, không thay quy trình thanh tra, kỷ luật hoặc phúc khảo chính thức. Phần giải thích bằng lời thường và năm câu hỏi ngắn nằm ở [GIAI_THICH/tuan-12](../GIAI_THICH/tuan-12.md).

