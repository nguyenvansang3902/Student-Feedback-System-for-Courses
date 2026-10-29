# Giải thích Tuần 7 — đợt khảo sát và chốt danh sách

Thực hiện ngày **29/10/2026** theo yêu cầu tiếp tục của người dùng, không ghi lùi ngày theo lịch kế hoạch. Đây là nháp AI hỗ trợ để nhóm đọc, thử và diễn đạt lại. Quyết định kỹ thuật tại [ADR-008](../decisions/ADR-008-dot-khao-sat-va-chot-danh-sach.md); kết quả chạy thật phải đối chiếu [nghiệm thu Tuần 7](../NGHIEM_THU_TUAN_07.md), không suy từ phần giải thích này.

## Một đợt khảo sát chứa gì?

Mẫu phiếu quyết định hỏi những câu nào. Đợt khảo sát chọn một phiên bản mẫu, học kỳ, phạm vi, giờ bắt đầu/kết thúc và các ngưỡng áp dụng riêng. Bốn phạm vi là toàn trường, một khoa, một bộ môn hoặc các lớp học phần được chọn trong cùng học kỳ. Ba phạm vi đầu lấy các lớp phù hợp trong dữ liệu hiện tại; phạm vi chọn lớp giữ tập lớp đã chọn.

Thời gian nhập ở giao diện được hiểu theo giờ Việt Nam và chuyển sang thời điểm có múi giờ khi gửi lên máy chủ. Cách này giúp hai máy tính có thiết lập múi giờ khác nhau vẫn hiểu cùng một giờ mở đợt. Máy chủ kiểm thời điểm kết thúc sau bắt đầu; đợt phải còn thời gian để trình, xác nhận hoặc duyệt.

## Ai thực hiện từng bước?

| Bước | Vai trò | Kết quả |
| --- | --- | --- |
| Tạo, sửa, trình đợt | Cán bộ ĐBCL | NHAP → CHO_XAC_NHAN_DL |
| Kiểm dữ liệu và xác nhận | Phòng Đào tạo | CHO_XAC_NHAN_DL → CHO_DUYET |
| Trả dữ liệu kèm lý do | Phòng Đào tạo | CHO_XAC_NHAN_DL → NHAP |
| Duyệt và khóa mẫu | Lãnh đạo | CHO_DUYET → DA_DUYET |
| Từ chối kèm lý do | Lãnh đạo | CHO_DUYET → NHAP |
| Chốt nhiệm vụ khi đến giờ | Hệ thống | DA_DUYET → DANG_MO |
| Đóng khi hết hạn | Hệ thống | DANG_MO → DA_DONG |

ĐBCL có thể hủy trước mở; rút đợt đã duyệt về nháp trước giờ mở để làm lại đầy đủ vòng xác nhận/duyệt. Đợt đang mở có thể được gia hạn đến thời điểm muộn hơn hạn cũ hoặc đóng sớm, đều cần lý do. Rút đợt không mở khóa mẫu đã khóa. Các bước tổng hợp và công bố thuộc tuần sau.

Quyền được kiểm ở máy chủ cho từng hành động và đọc lại từ phiên, tài khoản, grant hiện tại trong DB. ADMIN quản lý hệ thống không tự có quyền duyệt hoặc xem nghiệp vụ đợt. Tài khoản có nhiều vai trò được thực hiện các quyền đã cấp và vẫn phải MFA nếu mang vai trò ADMIN. Prompt không quy định người tạo khác người duyệt, nên không tự thêm điều kiện đó.

## Kiểm tra sẵn sàng giải quyết vấn đề gì?

PĐT quản lý dữ liệu đào tạo; ĐBCL không tự xác nhận danh sách mình dùng để khảo sát. Trước khi chuyển cho lãnh đạo, hệ thống kiểm các lớp thuộc phạm vi đợt:

| Mã | Tình huống | Xử lý |
| --- | --- | --- |
| RS-01 | Lớp chưa được phân công giảng viên | Chặn xác nhận |
| RS-02 | Lớp chưa có sinh viên đăng ký còn hiệu lực | Chặn xác nhận |
| RS-03 | Học kỳ đã khóa sổ | Chặn xác nhận |
| RS-04 | Số giảng viên từ ngưỡng cấu hình, mặc định 2 | Cảnh báo |
| RS-05 | Số đăng ký thấp hơn ngưỡng phiếu tối thiểu của đợt | Cảnh báo |
| RS-06 | Có sinh viên chưa có tài khoản hoạt động hoặc thiếu email | Cảnh báo |

Hết lỗi chặn mới được xác nhận. Nếu còn cảnh báo, PĐT phải ghi chú ít nhất 10 ký tự; ghi chú không được dùng để vượt lỗi chặn. Sinh viên chờ kích hoạt hoặc bị khóa tài khoản vẫn thuộc danh sách đăng ký còn hiệu lực, không bị âm thầm loại khỏi đối tượng khảo sát. Việc họ có đăng nhập và nộp được hay không do quy tắc tài khoản/thời gian ở luồng sinh viên quyết định.

Lần xác nhận lưu hash, số lớp, số cặp sinh viên/lớp, cảnh báo, người thực hiện và revision. Hash chứa cả danh sách lớp rỗng, nên thêm/bớt lớp cũng được phát hiện ngay cả khi lớp chưa có sinh viên. Hash hỗ trợ so sánh dữ liệu; không phải chữ ký số của PĐT và không thay phân quyền hoặc nhật ký.

## Danh sách được chốt vào lúc nào?

Danh sách được chốt khi đợt chuyển sang DANG_MO. Hệ thống tính lại lớp và đăng ký học phần hiện tại, so với bản PĐT đã xác nhận. Nếu khác, BR-53 yêu cầu vẫn mở theo dữ liệu hiện tại để không bỏ lỡ lịch; đồng thời lưu cờ lệch, lịch sử, audit và xếp thông báo cho PĐT/ĐBCL kiểm tra.

Các cặp sinh viên/lớp được ghi thành `SurveyTask` trong cùng transaction chuyển trạng thái và chốt `CampaignSection`. Sau mở, sửa hoặc rút đăng ký học phần không đồng bộ lại tập nhiệm vụ này. Tiến độ đếm DONE/PENDING theo lớp từ nhiệm vụ, không cần đọc đáp án hoặc trả định danh sinh viên về màn hình tiến độ.

Người dùng đã chọn **chặn khóa học kỳ khi còn bất kỳ đợt DA_DUYET hoặc DANG_MO**, kể cả đợt chưa đến giờ mở. Quyết định này tránh vừa duyệt lịch mở vừa khóa dữ liệu của chính học kỳ đó. Sau khi các đợt liên quan đóng, hủy hoặc rút về nháp thì PĐT mới có thể khóa; học kỳ khóa giữ nguyên tính chỉ đọc.

## Scheduler, ensure và email hoạt động thế nào?

Scheduler là tiến trình chạy định kỳ để mở/đóng đợt và chuyển thư trong hàng đợi. Các trang đọc danh sách/chi tiết và thao tác đợt cũng gọi cùng logic `ensure`, nên không phụ thuộc hoàn toàn vào việc tiến trình định kỳ đang chạy. Khi tiến trình vắng, đợt chỉ được xử lý lúc có lượt gọi tiếp theo; không nhận là đã mở đúng từng giây khi máy đang tắt.

Nếu vắng cả cửa sổ khảo sát, lần gọi tiếp theo ghi đúng chuỗi mở rồi đóng, tạo nhiệm vụ một lần và dùng thời điểm xử lý thật. Không sửa lịch sử thành thời điểm giả trong quá khứ. Đồng hồ máy chủ và vận hành scheduler vẫn là điều kiện để xử lý gần lịch đặt.

Gia hạn xếp email cho sinh viên có nhiệm vụ; dữ liệu lệch xếp email cho PĐT/ĐBCL. Notification và EmailOutbox được lưu cùng transaction nghiệp vụ, còn SMTP chạy sau đó ở worker. HTTP không chờ gửi từng thư cho hàng nghìn sinh viên. Scheduler cần hoạt động để rút queue, kể cả khi trạng thái đợt đã được ensure cập nhật từ trang web.

Worker nhận lease ngắn bằng CAS, gửi số thư đồng thời có giới hạn và thử lại có backoff, tối đa 5 lần. Tài khoản bị khóa hoặc địa chỉ không hợp lệ kết thúc FAILED. Khi SMTP nhận thư rồi tiến trình chết trước khi ghi SENT, lần thử lại có thể gửi trùng; đây là giới hạn gửi ít nhất một lần, không phải cam kết SMTP đúng một lần. Phần chuyển trạng thái/chốt nhiệm vụ vẫn có bảo vệ nguyên tử và chống lặp riêng.

## Ngưỡng mặc định khác ngưỡng của đợt như thế nào?

ADMIN đã MFA quản lý năm giá trị mặc định: số phiếu tối thiểu, tỉ lệ tham gia, điểm cảnh báo, số ngày giải trình và ngưỡng nhiều giảng viên RS-04. Ghi qua HTTP cần mã TOTP mới, CSRF và Origin hợp lệ. ĐBCL/PĐT/lãnh đạo chỉ đọc cấu hình. Không có tùy chọn tắt các lỗi chặn RS-01–03.

Khi tạo đợt, bốn ngưỡng nghiệp vụ của đợt được lấy làm giá trị khởi đầu rồi lưu riêng; đổi mặc định sau đó không sửa các đợt đã tạo. Ngưỡng RS-04 là cấu hình kiểm dữ liệu được dùng khi chạy readiness. `updatedAt` của cấu hình và `revision` của đợt giúp phát hiện hai cửa sổ cùng sửa dữ liệu cũ: một lượt đã lưu thì lượt còn lại phải tải lại, không được ghi đè âm thầm.

## Năm câu hỏi bảo vệ

### 1. Đã có xác nhận của PĐT, tại sao lúc mở vẫn tính lại danh sách?

Dữ liệu đào tạo có thể thay đổi từ lúc xác nhận đến giờ mở. BR-53 yêu cầu chốt dữ liệu hiện tại và cảnh báo nếu hash lệch. Sau thời điểm mở, nhiệm vụ được giữ cố định để mẫu số tiến độ và điều kiện làm khảo sát không thay đổi theo các lần sửa đăng ký về sau.

### 2. Hai tiến trình cùng mở một đợt có tạo nhiệm vụ trùng không?

Các lệnh cùng khóa một hàng mutex trong DB trước khi đọc trạng thái, rồi cập nhật bằng điều kiện trạng thái/revision. Chuyển trạng thái, chốt lớp, tạo nhiệm vụ và ghi lịch sử cùng transaction; unique của nhiệm vụ bảo vệ thêm. Lượt sau đọc trạng thái đã mở sẽ không tạo lại. Cần đối chiếu test MySQL thật trong nghiệm thu; test mock riêng không chứng minh hành vi khóa của DB.

### 3. Vì sao cần cả revision và requestId?

Revision phát hiện lệnh dựa trên dữ liệu đã cũ. RequestId nhận diện cùng một lần thao tác bị gửi lại do mạng hoặc bấm lặp: cùng actor/hành động/nội dung được trả kết quả hiện tại mà không thêm lịch sử. Dùng lại requestId cho nội dung khác bị xung đột. Hai cơ chế giải quyết hai trường hợp khác nhau và cùng được kiểm ở service.

### 4. Nếu scheduler tắt trong lúc đợt đến hạn, hệ thống có mất lịch sử không?

Hàm ensure dùng cùng máy trạng thái với scheduler và chạy khi truy cập. Nếu lúc đó đã qua cả giờ mở và đóng, hệ thống tạo hai chuyển trạng thái theo thứ tự trong cùng transaction, giữ thời điểm xử lý thật. Cơ chế này giúp dữ liệu nhất quán khi khôi phục; vận hành scheduler vẫn cần thiết để mở/đóng gần giờ dự kiến và gửi email kịp thời.

### 5. Có nhiệm vụ và tiến độ rồi thì sinh viên đã nộp khảo sát được chưa?

Chưa. Tuần 7 xử lý người có nhiệm vụ, lịch mở và quy trình duyệt. Giao diện sinh viên, form động, lưu nháp, nộp một lần và transaction tách danh tính khỏi phiếu thuộc Tuần 8. `SurveyResponse`/`SurveyAnswer` không được nối thêm tới User/SurveyTask chỉ để phục vụ màn hình tiến độ; seed phiếu có sẵn cũng không thay nghiệm thu luồng nộp thật.
