# Câu hỏi phản biện và đáp án ngắn

Khi luyện tập, mỗi thành viên chọn phần đã thực hiện, mở một màn hình hoặc tệp nguồn liên quan rồi giải thích quy tắc, phép kiểm và một giới hạn. Điền tên, đóng góp và bằng chứng của mình trong [TEAM.md](TEAM.md).

## Phạm vi và nghiệp vụ

1. **Điểm khác nhau giữa khảo sát và phản hồi là gì?** Khảo sát theo đợt và nhiệm vụ của lớp. Phản hồi do sinh viên gửi theo loại vấn đề, được định tuyến, trao đổi và theo dõi tới khi đóng.
2. **Ai có thể mở một đợt khảo sát?** ĐBCL chuẩn bị và trình. PĐT xác nhận dữ liệu. Lãnh đạo phê duyệt. Hệ thống chuyển trạng thái và chốt danh sách nhiệm vụ khi đến giờ mở.
3. **Nếu đăng ký thay đổi sau khi PĐT xác nhận thì sao?** Đến giờ mở, hệ thống tính lại mã băm. Nếu lệch, vẫn chốt danh sách hiện tại, ghi nhật ký và cảnh báo PĐT, ĐBCL. Thay đổi sau khi chốt không đổi nhiệm vụ của đợt. [BR-53](BO_SUNG_01_TAC_NHAN.md)
4. **Vì sao khóa phiên bản mẫu?** Đợt đã duyệt cần một tập câu hỏi và trọng số ổn định. Thay đổi nội dung thực hiện qua phiên bản mới để phiếu và kết quả cũ còn đối chiếu được.
5. **Khi nào giảng viên xem được điểm lớp?** Sau công bố, đúng lớp được phân công và lớp đạt cả ngưỡng số phiếu và tỷ lệ tham gia. Giá trị mặc định là ít nhất 5 phiếu và 30%. Cấu hình có thể khác theo đợt.
6. **Vì sao có yêu cầu giải trình?** Lớp dưới ngưỡng cảnh báo sinh yêu cầu để giảng viên ghi nguyên nhân, biện pháp và hạn thực hiện. Trưởng bộ môn xác nhận hoặc yêu cầu bổ sung.
7. **Khảo thí khác Thanh tra ở đâu?** Khảo thí xử lý phản hồi thi và xem nhóm đánh giá gộp đủ điều kiện. Phúc khảo theo quy trình riêng. Thanh tra quản lý hồ sơ nghiêm trọng và cảnh báo bất thường, với quyền bị giới hạn bởi xung đột lợi ích. Trường vẫn chịu trách nhiệm về kết luận và xử lý chính thức.
8. **Quá hạn SLA có phải trạng thái phản hồi?** Quá hạn là cờ tính theo ngày làm việc. Trạng thái vẫn mô tả bước xử lý. Tác vụ nền leo thang theo chuỗi được cấu hình và tránh tạo trùng sự kiện.

## Dữ liệu và bảo mật

9. **Biết sinh viên đã nộp mà vẫn ẩn danh bằng cách nào?** `SurveyTask` giữ sinh viên và trạng thái. `SurveyResponse` cùng `SurveyAnswer` giữ nội dung mà không có khóa liên kết về sinh viên hoặc nhiệm vụ. Phần hiển thị dùng ngày và ngưỡng mẫu.
10. **Hai yêu cầu nộp cùng lúc thì sao?** Giao dịch chỉ đổi nhiệm vụ từ PENDING sang DONE khi còn hợp lệ và đúng một hàng được cập nhật. Phiếu và câu trả lời được ghi trong cùng giao dịch. Lượt thử 20 yêu cầu đồng thời cho một nhiệm vụ tạo đúng một phiếu. [Kiểm tra đồng thời](NGHIEM_THU_TUAN_13.md)
11. **Mức ẩn danh bảo vệ đến đâu?** Ở tầng ứng dụng và mô hình lưu. Quản trị hạ tầng, log bên ngoài hoặc sinh viên tự để lại thông tin vẫn có thể tạo khả năng suy đoán. Ngưỡng giúp giảm rủi ro ở nhóm nhỏ.
12. **Vì sao không cho ADMIN xem mọi thứ?** ADMIN vận hành tài khoản, vai trò, cấu hình và nhật ký. Quyền đọc kết quả, phản hồi hoặc hồ sơ thuộc quy trình nghiệp vụ. Mọi đường nhạy cảm kiểm cả vai trò và phạm vi tài nguyên tại máy chủ, với MFA bắt buộc cho quản trị. [BR-68](BO_SUNG_01_TAC_NHAN.md)
13. **JWT và TOTP có vai trò gì?** Access JWT ngắn hạn đi qua cookie HttpOnly. Refresh được xoay vòng và lưu dưới dạng băm ở máy chủ. TOTP bổ sung lớp xác minh với ADMIN. Xác thực xong vẫn phải qua kiểm tra quyền theo tài nguyên.
14. **Tệp đính kèm được bảo vệ thế nào?** Tệp nằm ngoài thư mục công khai, có kiểm giới hạn, định dạng và quyền khi tải. Hồ sơ nhạy cảm có audit. Kiểm định dạng là một lớp bảo vệ, chưa bao gồm quét mã độc.
15. **CSV, Excel và PDF bảo vệ ngưỡng thế nào?** Tệp xuất lấy dữ liệu từ báo cáo đã áp dụng quyền và bộ lọc. Các đối chứng kiểm định danh giả, nhóm ít mẫu và tổng có thể dùng để suy ngược. [Hồ sơ kiểm thử](NGHIEM_THU_TUAN_13.md)

## Kiểm thử, vận hành và hạn chế

16. **UC-GOLD chứng minh điều gì?** Luồng nối nhiều vai trò từ tạo đợt, xác nhận, nộp phiếu, tổng hợp, công bố, giải trình, xử lý phản hồi đến báo cáo. Bộ tự động kết hợp API và trình duyệt. Lượt kiểm tay lịch sử ghi rõ các màn hình và hành động quan sát được. [UC-GOLD Tuần 12](UC_GOLD_TUAN_12.md) · [Kiểm tay Tuần 13](assets/tuan-13/manual-uc-gold.json)
17. **p95 có ý nghĩa gì và kết quả đạt chưa?** Khoảng 95% mẫu có độ trễ không cao hơn p95. Lượt nộp 200 nhiệm vụ giả qua 200/200, p95 3.595,91 ms, cao hơn mục tiêu 3.000 ms. Số liệu áp dụng cho điều kiện đo đã ghi. [Báo cáo hiệu năng](HIEU_NANG_TUAN_13.md)
18. **Bản sao lưu đã được kiểm thế nào?** Dừng tiến trình ghi, xuất MySQL cùng tệp đính kèm tham chiếu rồi phục hồi vào dự án riêng. Đối chiếu 46 bảng, 811 dòng và 1 tệp. Sinh viên thử đăng nhập và tải tệp có SHA-256 khớp bản gốc. [FR-103](SAO_LUU_KHOI_PHUC.md)
19. **Vì sao có hai cấu hình Compose?** Demo có seed giả, Mailpit và cổng loopback dễ chạy. Production dùng image đã build, HTTPS qua reverse proxy, kho tệp riêng và SMTP cấu hình theo môi trường.
20. **97,3% nghĩa là gì và còn thiếu gì?** Tổng điểm đã nghiệm thu là 213/219 theo trọng số P0, P1, P2, tương ứng 79/84 yêu cầu. FR-145 về lô nhập và hoàn tác, cùng bốn FR P2 còn mở. Tỷ lệ này là tiến độ chức năng theo ma trận. [Tiến độ](PROGRESS.md)
