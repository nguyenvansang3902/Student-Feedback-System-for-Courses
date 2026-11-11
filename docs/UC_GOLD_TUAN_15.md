# Kiểm lại UC-GOLD Tuần 15

Ngày **11/11/2026**, Playwright chạy trên bản trích xuất Git `d39d4ccf6ac01cfd6bd0a9d438578162dfef019b`, phiên bản ứng dụng dùng làm nền cho v1.0. Kết quả **6/6 ca qua**, không có ca bỏ qua hoặc chạy lại, mã thoát 0. Bộ kiểm mất **206,37 giây**, trong đó ca UC-GOLD xuyên suốt mất **87,31 giây**. Đây là thời gian bộ kiểm tự động, không dùng làm thời lượng bảo vệ. [Manifest lượt chạy](assets/tuan-15/uc-gold.json)

## Kết quả theo chặng

| Chặng | Thao tác và kết quả | Cách kiểm |
| --- | --- | --- |
| Lập và mở đợt | ĐBCL tạo mẫu, lập đợt và trình. PĐT xác nhận dữ liệu rồi Lãnh đạo phê duyệt. Đợt mở và tạo 21 nhiệm vụ đúng danh sách. | HTTP và đối chiếu MySQL |
| Nộp phiếu | Một sinh viên nộp và thấy màn hình xác nhận. 19 lượt nộp tiếp tạo tổng cộng 20 phiếu ẩn danh. Nộp lại cùng nhiệm vụ bị từ chối. | Trình duyệt cho lượt đầu, HTTP và MySQL cho các lượt còn lại |
| Tổng hợp và công bố | ĐBCL đóng sớm có lý do, tổng hợp, kiểm duyệt và công bố. Kết quả lớp của giảng viên có điểm 2,00. | HTTP kiểm số liệu và trạng thái, sau đó mở trang kết quả của giảng viên trên trình duyệt |
| Giải trình | Giảng viên gửi giải trình, trưởng bộ môn xem xét và xác nhận. | Trình duyệt và HTTP đối chiếu trạng thái |
| Phản hồi và SLA | Phản hồi ẩn danh đến giảng viên, được trả lời rồi đóng sau khi sinh viên đánh giá. Nhánh quá hạn được kiểm bằng cách chỉnh hạn trong cơ sở dữ liệu thử. | HTTP và MySQL, sinh viên đánh giá trên trình duyệt |
| Khảo thí và Thanh tra | Phản hồi thi đến Khảo thí. Hồ sơ Thanh tra đi qua xác minh, kết luận, thông báo và đóng. Lượt kiểm đối chiếu quyền khi có xung đột lợi ích. | HTTP |
| Cảnh báo | Cảnh báo chứa chỉ số được phép, có thể chuyển sang hồ sơ xác minh. Kết quả đợt vẫn ở trạng thái đã công bố. | HTTP |
| Báo cáo | Lãnh đạo chọn bộ lọc và tải CSV **4.323 byte**, XLSX **8.150 byte**, PDF **19.424 byte**. Bộ kiểm dò định danh thử trong CSV và ô XLSX, đọc được cấu trúc và số trang PDF. | Trình duyệt tải tệp và thư viện đọc tệp |

Năm ca còn lại kiểm các trang tài khoản công khai, khả năng dùng bàn phím và axe ở các trạng thái đã chọn, dashboard đủ 10 vai trò, kiểm quyền và ngưỡng, cùng hiển thị trên desktop và mobile. Mỗi ca và thời gian riêng có trong manifest.

## Cách đối chiếu lại

- Từ bản mã cần kiểm, chuẩn bị môi trường theo README rồi chạy `npm run test:e2e` hoặc `npm.cmd run test:e2e` trên Windows. Ca UC-GOLD bắt đầu bằng dữ liệu giả phục vụ kiểm thử và tự tạo mẫu, đợt, phiếu, phản hồi trong chính lượt chạy. [README](../README.md#kiểm-tra) · [Bộ kiểm](../tests/e2e/uc-gold.spec.ts)
- Lượt chốt sử dụng cổng web 3007 và MySQL thử riêng. Trước thao tác, đã đối chiếu kho Docker, volume và định danh MySQL. Các phiên của tài khoản giả được thu hồi khi kết thúc, dữ liệu thử được giữ để đối chiếu.
- Lượt E2E cấp phiên qua fixture, đóng đợt sớm và chỉnh hạn phản hồi giả để kiểm leo thang. Lượt thao tác tay **04–05/11/2026** quan sát đợt đóng đúng hạn, ĐBCL kiểm duyệt và công bố, giảng viên xem kết quả, xử lý phản hồi và Lãnh đạo cùng ĐBCL tải báo cáo. Các ảnh ở mốc đó thuộc lượt kiểm tay Tuần 13. [Bằng chứng thao tác tay](assets/tuan-13/manual-uc-gold.json) · [Mô tả thao tác](UC_GOLD_TUAN_12.md)
