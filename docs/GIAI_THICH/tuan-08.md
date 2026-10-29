# Giải thích Tuần 8 — sinh viên nộp khảo sát ẩn danh

Thực hiện ngày **29/10/2026** theo yêu cầu bắt đầu Tuần 8; không ghi lùi ngày theo lịch kế hoạch. Đây là tài liệu AI hỗ trợ để nhóm thử lại và trình bày bằng lời của mình. [ADR-009](../decisions/ADR-009-nop-phieu-an-danh.md) nêu quyết định kỹ thuật; [sơ đồ Tuần 8](../SO_DO_TUAN_08.md) thể hiện luồng hiện thực. Tài liệu giải thích không thay kết quả nghiệm thu chạy thật.

## 1. Biết ai đã làm mà không biết họ trả lời gì bằng cách nào?

Hãy hình dung hai sổ. Sổ nhiệm vụ ghi sinh viên nào thuộc lớp nào và đã hoàn thành hay chưa. Sổ phiếu chỉ chứa câu trả lời, mã đợt/lớp và ngày nộp. Không ghi số phiếu vào sổ nhiệm vụ; không ghi sinh viên, nhiệm vụ hay phiên đăng nhập vào sổ phiếu. `SurveyResponse` và `SurveyAnswer` chỉ liên kết với nhau, không có đường quan hệ Prisma đi tới User hoặc SurveyTask.

Sinh viên vẫn đăng nhập để máy chủ kiểm tra đúng nhiệm vụ của mình. Sau khi kiểm, máy chủ dùng danh tính để đánh dấu hoàn thành và dùng dữ liệu câu trả lời để ghi một phiếu riêng. Xác nhận chỉ nói “đã hoàn thành” và ngày, không phát ID phiếu cho sinh viên. ID đợt/lớp/câu hỏi trong phiếu là dữ liệu scalar; service phải kiểm chúng đúng mẫu đã khóa, chứ không được bỏ kiểm tra vì không có FK.

## 2. Hai lần bấm hoặc 20 yêu cầu đồng thời có tạo hai phiếu không?

Máy chủ chỉ cập nhật nhiệm vụ khi nó còn `PENDING`. Sau cập nhật, phải có đúng một hàng được đổi sang `DONE` mới được ghi phiếu. Cập nhật nhiệm vụ, thêm response và thêm các answer nằm trong cùng một transaction. Lỗi ở bất kỳ bước nào làm cả nhóm thay đổi bị rollback, nên không có trạng thái “đã hoàn thành nhưng mất đáp án” do lỗi giữa các bước.

Luồng còn dùng mutex DB chung với thay quyền/học kỳ/đợt để đọc trạng thái mới sau khi chờ khóa. Vì vậy khi các yêu cầu cạnh tranh, chỉ lần chiếm được nhiệm vụ còn PENDING được tạo phiếu; lần sau bị chặn. Vô hiệu hóa nút nộp chỉ giúp người dùng, không thay ràng buộc ở máy chủ. Để chứng minh đồng thời cần gửi 20 request tới MySQL thật và đếm dữ liệu sau chạy; unit test giả lập không đủ.

Nếu mất mạng sau khi DB đã commit, sinh viên tải lại trạng thái nhiệm vụ. Khi thấy DONE, giao diện mở xác nhận và xóa nháp; không tự gửi lại phiếu để “thử vận may”. Phiếu đã nộp không có thao tác sửa/xóa trong Tuần 8.

## 3. Ai được mở form và máy chủ kiểm nội dung ra sao?

Chỉ sinh viên có grant GLOBAL, phiên FULL còn hiệu lực và nhiệm vụ thuộc chính họ được mở form. Máy chủ đọc lại quyền từ DB cho từng transaction. Nhiệm vụ lấy từ danh sách đã chốt khi mở đợt; sinh viên vừa được thêm hoặc rút khỏi Enrollment sau chốt không làm thay đổi danh sách này. Đoán ID nhiệm vụ của người khác nhận cùng 404 như ID không tồn tại.

Đợt phải đang DANG_MO, học kỳ chưa khóa, mẫu đúng phiên bản đã khóa và giờ máy chủ nằm trong `[bắt đầu, kết thúc]`. Đúng giờ kết thúc còn hợp lệ; sau mốc đó bị chặn. Mẫu động hỗ trợ Likert, chọn một, chọn nhiều, tự luận, Có/Không. Câu bắt buộc phải trả lời; Không áp dụng chỉ hợp lệ khi câu cho phép. Giá trị khác loại, sai thang, lựa chọn của câu khác, câu lặp hoặc câu ngoài mẫu đều bị từ chối trước ghi phiếu.

Trình duyệt hiển thị tiến trình theo số câu đã điền và nhắc lỗi tại câu. Máy chủ vẫn kiểm lại toàn bộ, vì dữ liệu gửi từ trình duyệt có thể bị sửa. Nội dung tự luận là văn bản, không thực thi HTML.

## 4. Nháp và ngày nộp có làm lộ danh tính không?

Nháp ở localStorage của trình duyệt, phân biệt tài khoản/nhiệm vụ/phiên bản mẫu, không gửi lên máy chủ và không chứa token. Giao diện chỉ phục hồi dữ liệu đúng mẫu, còn hạn; xóa khi xác nhận DONE hoặc đăng xuất. localStorage vẫn đọc được bởi người dùng chung trình duyệt hoặc mã độc/XSS trong cùng ứng dụng; đây là lý do phải cảnh báo thiết bị dùng chung. Không được nói nháp được mã hóa hay an toàn tuyệt đối.

Nhiệm vụ và phiếu cùng lưu một **ngày** theo giờ Việt Nam, không lưu giờ/phút/giây nộp. Ví dụ 18:20 UTC ngày 31/12 đã là 01:20 ngày 01/01 tại Việt Nam: cả doneDate và submittedDate đều phải là 01/01. UUID ngẫu nhiên không cho biết thứ tự nộp. Tuy vậy, ngày nộp và lớp vẫn thu hẹp tập người, nên không thể coi chỉ đổi timestamp thành DATE là đủ ẩn danh.

## 5. Test xanh có chứng minh ẩn danh tuyệt đối và mọi file xuất đã an toàn không?

Không. Bốn phần 5.6 đo những điều khác nhau: (a) cấu trúc quan hệ DB; (b) nộp lần hai; (c) cạnh tranh 20 request và rollback; (d) định danh không lọt ra các kênh dữ liệu/xuất file. Tuần 8 có test các DTO, ghi DB, lỗi và sink log/audit/queue đang có. Test cố tình chèn trường định danh vào input, đưa trường thừa vào hàng DB và gây lỗi chứa nội dung riêng tư để phát hiện hồi quy. Prisma runtime tắt query logging và luồng nộp không tạo audit chứa sinh viên cùng ID phiếu.

Xuất kết quả CSV/Excel/PDF thuộc Tuần 12, chưa được coi đã qua chỉ vì chưa có endpoint xuất ở Tuần 8. Khi có export phải kiểm mọi tệp, metadata và sheet ẩn. Tổng hợp, ngưỡng công bố, trộn thứ tự phiếu và kiểm duyệt thuộc Tuần 9; Tuần 8 không có màn hình xem kết quả hoặc nội dung phiếu đã nộp.

Ứng dụng không giữ cầu nối danh tính–phiếu, nhưng người có quyền DB/binlog/hạ tầng có thể suy luận các thay đổi cùng giao dịch hoặc thời điểm request. Lớp ít sinh viên, proxy log, nội dung “tôi là lớp trưởng…” cũng có thể làm lộ người viết. Vì vậy báo cáo phải nói rõ **ẩn danh ở mức ứng dụng**, không tuyên bố chống được DBA/hạ tầng hoặc tự tiết lộ. Kết quả test cụ thể và các phần chưa kiểm phải đối chiếu bằng chứng nghiệm thu cuối tuần.
