# Thời hạn xử lý và nhắc hạn — Tuần 11

Tài liệu đối chiếu đặc tả chính, điều chỉnh số 01 và mã triển khai ngày **02–03/11/2026**. Đây là thời hạn của hệ thống phục vụ đề tài; không thay quy trình phúc khảo, thanh tra hoặc kỷ luật chính thức của trường.

## 1. Bảng thời hạn mặc định

| Nghiệp vụ | Tiếp nhận | Trả lời hoặc hoàn tất | Cách tính |
| --- | --- | --- | --- |
| Phản hồi thường mức góp ý/đề xuất | 2 ngày | 7 ngày | Ngày làm việc |
| Phản hồi thường mức khiếu nại | 2 ngày | 5 ngày | Ngày làm việc |
| Tổ chức lớp học — Phòng Đào tạo | 2 ngày | 5 ngày | Ngày làm việc |
| Thi kết thúc học phần — Phòng Khảo thí | 2 ngày | 5 ngày | Ngày làm việc |
| Hồ sơ Thanh tra | 3 ngày | 30 ngày | Ngày làm việc |
| Giải trình cải tiến | — | 14 ngày mặc định để giảng viên nộp | Ngày theo lịch, tính từ lúc công bố |
| Kiến nghị rà soát của Khảo thí | — | 14 ngày để trưởng bộ môn phản hồi | Ngày theo lịch, tính từ lúc gửi |
| Đánh giá hài lòng | — | 7 ngày từ lúc trả lời | Ngày theo lịch |
| Mở lại sau đánh giá thấp | — | 7 ngày từ lúc đóng; tối đa 1 lần | Ngày theo lịch |

Các hạn tiếp nhận/trả lời của phản hồi và hồ sơ được chốt từ lúc tạo. Việc tiếp nhận không bắt đầu lại hạn trả lời. Chuyển tiếp phản hồi thường giữ thời hạn hiện có. Mở lại phản hồi tạo hạn trả lời mới theo loại và mức độ; lịch sử, đánh giá cũ và số lần mở lại vẫn được giữ.

## 2. Quy ước thời gian và cấu hình

`addBusinessDays` cộng từng ngày, bỏ thứ Bảy và Chủ nhật theo **UTC+7**; giữ thời điểm trong ngày. Ví dụ: tạo lúc 10 giờ thứ Sáu, hạn tiếp nhận 2 ngày làm việc là 10 giờ thứ Ba. Chưa có lịch nghỉ lễ riêng hoặc quy tắc chỉ tính trong giờ hành chính. Bản ghi thời điểm lưu trong database; giao diện hiển thị theo múi giờ Việt Nam.

Đúng thời điểm đến hạn chưa bị tính là trễ; cờ quá hạn xuất hiện khi thời gian máy chủ **lớn hơn** hạn. Cờ này là thuộc tính, không thêm trạng thái vào máy trạng thái phản hồi. Các hạn đánh giá, mở lại, giải trình và kiến nghị tính bằng ngày theo lịch, gồm cả cuối tuần.

Cán bộ Đảm bảo chất lượng cấu hình thời hạn tại mục cấu hình phản hồi. `WORKFLOW_SETTINGS` lưu các hạn tiếp nhận/trả lời, `escalationDays` mặc định 2 ngày làm việc, giới hạn 5 phản hồi/ngày/sinh viên, khoảng cảnh báo trùng 24 giờ, cửa sổ đánh giá/mở lại 7 ngày và hạn kiến nghị 14 ngày. Lưu cấu hình kiểm phiên, quyền, phiên bản và mã yêu cầu trước khi ghi nhật ký. Các hồ sơ đã tạo giữ hạn được chốt; cấu hình mới áp dụng khi tạo hoặc mở lại theo quy trình tương ứng.

Ngưỡng điểm yêu cầu giải trình và hạn nộp là cấu hình của đợt khảo sát: `warningScore` mặc định **3,0**, `explanationDays` mặc định **14**. Không dùng cấu hình toàn cục để sửa ngầm hạn của kế hoạch đã tạo.

## 3. Leo thang phản hồi

| Loại | Chuỗi xử lý |
| --- | --- |
| Giảng dạy, tài liệu, kiểm tra/đánh giá thành phần | Giảng viên → Trưởng bộ môn → Trưởng khoa → Đảm bảo chất lượng |
| Nội dung/đề cương | Trưởng bộ môn → Trưởng khoa → Đảm bảo chất lượng |
| Tổ chức lớp học | Phòng Đào tạo → Đảm bảo chất lượng → Lãnh đạo |
| Thi kết thúc học phần | Phòng Khảo thí → Đảm bảo chất lượng → Lãnh đạo |
| Khác, gồm cơ sở vật chất | Đảm bảo chất lượng → Lãnh đạo |
| Hồ sơ Thanh tra | Thanh tra tiếp tục giữ hồ sơ; báo quá hạn cho Lãnh đạo ở mức tóm tắt |

Lần leo thang đầu xảy ra sau khi quá hạn tiếp nhận hoặc trả lời. Các lần tiếp theo cách lần trước theo `escalationDays`; mặc định phải qua 2 ngày làm việc. Người nhận mới phải có gán vai trò và phạm vi phù hợp, còn hoạt động; không suy quyền từ ADMIN. Khi giao thành công, hệ thống thu hồi quyền nội dung của người nhận cũ, lưu người xử lý mới, tăng phiên bản và thêm lịch sử `LEO_THANG`. Thiếu người nhận phù hợp thì chưa chuyển giao, giữ dữ liệu để đơn vị quản lý bổ sung phân công.

Hồ sơ Thanh tra có luồng riêng, không bị chuyển vào hàng đợi phản hồi thường do quá hạn. Lãnh đạo chỉ nhận thông báo chung và mở bản tóm tắt theo quyền; không nhận nội dung phản ánh, ghi chú xác minh, tệp nội bộ hoặc danh tính sinh viên. Người xung đột lợi ích vẫn bị loại kể cả có nhiều vai trò.

## 4. Đánh giá, mở lại và chống gửi trùng

Chỉ sinh viên sở hữu phản hồi thường được đánh giá mức hài lòng từ 1 đến 5 sau khi đã trả lời, trong thời hạn cho phép. Mỗi phản hồi giữ một đánh giá. Ghi đánh giá đóng phản hồi; đánh giá 1 hoặc 2 cho phép mở lại từ `DA_DONG` sang `DANG_XU_LY`, tối đa một lần và trong cửa sổ mở lại. Sau lần xử lý tiếp theo, không tự cho thêm lượt mở lại. Hồ sơ Thanh tra đang thuộc quy trình mật không dùng cơ chế đánh giá/mở lại của phản hồi thường.

Mọi thao tác kiểm lại phiên, quyền sở hữu, trạng thái, phiên bản và khóa học kỳ ở máy chủ. Mã yêu cầu đã dùng chỉ nhận lại kết quả của cùng thao tác; cùng mã nhưng nội dung khác bị từ chối. Cập nhật có điều kiện theo phiên bản/trạng thái ngăn hai yêu cầu đồng thời cùng ghi thành công.

Giới hạn gửi mới mặc định là 5 phản hồi trong ngày theo UTC+7 cho mỗi sinh viên. Nội dung trùng của cùng sinh viên, cùng lớp trong 24 giờ được cảnh báo; cảnh báo không tự thay thế quy trình xem xét hoặc từ chối có lý do. Việc gửi lại đúng mã yêu cầu đã hoàn thành không được tính thành một phản hồi mới.

## 5. Giải trình và kiến nghị rà soát

Chỉ lớp đã được công bố và đủ ngưỡng bảo vệ công bố mới tạo yêu cầu giải trình bắt buộc khi điểm tổng **nhỏ hơn** ngưỡng cảnh báo. Không tạo yêu cầu chỉ từ dữ liệu lớp thiếu mẫu. Mỗi giảng viên đủ điều kiện của lớp có tối đa một kế hoạch cho cặp đợt/lớp; gọi lại không tạo thêm bản sao. Luồng: `CAN_GIAI_TRINH → DA_GUI`, trưởng bộ môn xác nhận `DA_XAC_NHAN` hoặc yêu cầu `CAN_BO_SUNG` có nhận xét. Giảng viên nộp bổ sung rồi trưởng bộ môn xem xét lại. Khi đã gửi, việc chờ trưởng bộ môn xem xét không bị tính là giảng viên chưa nộp.

Kiến nghị của Khảo thí gắn môn học và đợt có dữ liệu đã công bố, đáp ứng điều kiện dữ liệu gộp của Khảo thí: ít nhất 2 giảng viên và đủ số phiếu. Khảo thí không được dùng luồng này để đọc kết quả lớp, giảng viên hay tự luận. Trưởng bộ môn được giao chọn tiếp thu hoặc không tiếp thu, bắt buộc có lý do. Quá hạn nhắc trưởng bộ môn và báo trưởng khoa đúng phạm vi.

Khóa học kỳ chuyển dữ liệu liên quan sang chỉ đọc. Không dùng job nhắc hạn để bỏ qua khóa sổ hoặc mở rộng quyền đọc.

## 6. Nhắc hạn, chống chạy lặp và thông báo

Scheduler gọi kiểm hạn, tạo yêu cầu giải trình còn thiếu, nhắc hạn và xử lý email theo từng lô. Truy cập đầu tiên vào các luồng liên quan cũng kiểm lại công việc đến hạn; giao diện tính cờ quá hạn theo thời gian máy chủ, không chỉ đọc cờ từ lần cron trước. Cursor của lượt SLA quét theo ID và quay lại đầu sau khi hết lô, tránh chỉ kiểm mãi các hồ sơ đầu danh sách.

Phản hồi được nhắc khi hạn còn trong khoảng 24 giờ hoặc đã trễ, tối đa một thông báo cho sự kiện/ngày/người nhận. Giải trình nhắc giảng viên và trưởng bộ môn khi gần hạn hoặc quá hạn trong trạng thái còn chờ giảng viên. Kiến nghị quá hạn nhắc trưởng bộ môn và báo trưởng khoa. Hồ sơ Thanh tra có thông báo quá hạn theo giai đoạn tiếp nhận/hoàn tất. Các thông báo này chỉ chứa lời nhắc chung; phải mở tài nguyên mới nhận nội dung theo quyền hiện tại.

`SlaEscalation` có khóa duy nhất `(feedbackId, level)` làm dấu đã xử lý. Cùng transaction giữ mutex, ghi lần leo thang, người nhận mới, lịch sử và thông báo. Các thao tác người dùng dùng phiên bản và mã yêu cầu để chống ghi lặp. Lịch sử chỉ thêm, không sửa lại sự kiện cũ.

Notification và email outbox được tạo cùng transaction nghiệp vụ. Khóa chống trùng dựa trên bộ **loại tài nguyên, ID tài nguyên, mã sự kiện, người nhận**: dùng cùng mã yêu cầu ở hai phản hồi khác nhau vẫn giữ hai thông báo. Khóa outbox băm SHA-256 nên không vượt giới hạn cột. Danh sách, số lượng chưa đọc, đánh dấu đã đọc và worker đều kiểm quyền tài nguyên hiện tại; quyền bị thu hồi hoặc phát sinh xung đột không làm thông báo cũ trở thành đường đọc vượt quyền.

Worker email có lease, so sánh token khi cập nhật, thử tối đa 5 lần với thời gian chờ tăng dần; SMTP chạy ngoài transaction. Email nghiệp vụ chỉ báo có cập nhật và mời đăng nhập, không chứa nội dung hồ sơ hoặc danh tính. Không cam kết email đến đúng một lần trong mọi lỗi hạ tầng: nếu SMTP đã nhận thư nhưng worker dừng trước khi lưu `SENT`, lần thử lại có thể gửi lại. Khóa outbox và lease ngăn tạo trùng sự kiện hoặc hai worker cùng xử lý bình thường.

## 7. Nguồn đối chiếu và kiểm tra

- [Đặc tả nghiệp vụ](DAC_TA_NGHIEP_VU.md), Mục 5.3–5.8 và BR-10/23/25/26/54/56/58/60–64.
- [Điều chỉnh số 01 nguyên văn](BO_SUNG_01_TAC_NHAN.md), D2–D3.
- [Tính hạn và điều kiện đánh giá/mở lại](../src/server/services/feedback-deadlines.ts), [SLA](../src/server/services/feedback-sla.ts), [đánh giá/mở lại](../src/server/services/feedback-satisfaction.ts), [cấu hình](../src/server/services/workflow-settings.ts).
- [Giải trình/nhắc hạn](../src/server/services/improvements.ts), [kiến nghị](../src/server/services/exam-recommendations.ts), [hàng đợi thông báo](../src/server/services/domain-notifications.ts), [worker email](../src/server/services/notifications.ts).
- Bộ kiểm chạy trên database thử riêng: [phản hồi](../scripts/verify-week11-feedback.ts), [quy trình cải tiến](../scripts/verify-week11-workflows.ts), [Thanh tra](../scripts/verify-week11-inspection.ts), [thông báo và Mailpit](../scripts/verify-week11-notifications.ts). Kết quả nghiệm thu cuối phải lấy từ lần chạy thực tế, không suy từ tài liệu này.
