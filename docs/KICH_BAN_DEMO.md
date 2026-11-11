# Kịch bản demo website khảo sát và phản hồi

Khởi động bản demo theo [README](../README.md) và kiểm tra có thể mở trang **Đăng nhập**. Dùng tài khoản mẫu trên dữ liệu giả. Mở một cửa sổ riêng cho mỗi vai trò cần dùng hoặc đăng xuất trước khi đổi. Chuẩn bị một đợt đang mở, một đợt đã công bố và một hồ sơ Thanh tra giả. Nếu buổi trình bày có thao tác nộp phiếu, dùng một nhiệm vụ chưa hoàn thành của sinh viên demo.

[Video dự phòng 33 giây](assets/tuan-14/demo-tuan-14.webm) ghi lại các màn hình Sinh viên, Giảng viên, Lãnh đạo và Thanh tra, có thao tác tải CSV thật. Mở tệp WebM bằng Chrome hoặc Edge. [Thông tin lượt ghi](assets/tuan-14/video.json)

| Cảnh | Thao tác trình diễn | Điều cần chỉ ra |
| --- | --- | --- |
| 1. Sinh viên làm khảo sát | `DEMO-SV00001` → **Khảo sát của tôi** → mở nhiệm vụ đang nhận phiếu, xem câu bắt buộc và bước xác nhận. Nếu dùng nhiệm vụ thử riêng, nộp rồi trở về danh sách. | Sinh viên chỉ thấy nhiệm vụ được giao. Phiếu nộp xong chỉ hiện trạng thái hoàn thành và thời điểm. |
| 2. Phối hợp mở đợt | `DBCL2026001` → **Đợt khảo sát**, giải thích mẫu, lịch và ngưỡng. Trình bày các bước **Trình PĐT xác nhận**, **Xác nhận dữ liệu** và **Phê duyệt đợt** qua ba vai trò. | ĐBCL chuẩn bị, PĐT kiểm tra dữ liệu, Lãnh đạo quyết định. Có thể dùng đợt mẫu để trình bày trạng thái mà không tạo lịch mới trong buổi demo. |
| 3. Công bố và xem theo phạm vi | ĐBCL mở **Kết quả khảo sát**, chỉ ra bước tổng hợp, kiểm duyệt góp ý và công bố. Chuyển sang `DEMO-GV00001`, mở một lớp của đợt đã công bố. | Góp ý tự luận chờ duyệt chặn công bố. Kết quả lớp chỉ hiện cho đúng phạm vi và khi đủ mẫu. |
| 4. Phản hồi và chuyển đúng đầu mối | Mở **Phản hồi** với sinh viên hoặc giảng viên, rồi đổi sang `KT2026001` để xem phản hồi thi và `TT2026001` để xem **Hồ sơ Thanh tra**. | Hàng đợi tách theo loại phản hồi và vai trò. Khảo thí xử lý phản hồi thi trong hệ thống, còn phúc khảo theo quy trình riêng. |
| 5. Báo cáo và xuất tệp | `LD2026001` → **Báo cáo**, chọn học kỳ và đợt, bấm **Xem báo cáo**. Tải CSV hoặc Excel và mở tệp xuất. | Phạm vi trên đầu tệp khớp bộ lọc đã áp dụng. Dữ liệu kết quả được tổng hợp theo quyền. |
| 6. Các góc nhìn bổ sung | Dùng [hướng dẫn theo vai trò](HUONG_DAN_SU_DUNG.md) để mở nhanh màn hình Trưởng bộ môn, Trưởng khoa, Phòng Đào tạo và Quản trị. | Trưởng bộ môn xác nhận giải trình, Trưởng khoa xem số liệu của khoa, Phòng Đào tạo chạy thử nhập dữ liệu, Quản trị dùng MFA để vận hành. |

Khi giải thích ẩn danh, phân biệt phiếu khảo sát với phản hồi. Phiếu không lưu liên kết từ câu trả lời tới người dùng trong mô hình ứng dụng. Phản hồi có kênh trao đổi và cơ chế hiển thị danh tính theo lựa chọn và quyền. Mẫu nhỏ có thể bị ẩn số liệu; ảnh hướng dẫn dùng để minh họa khi không có bản ghi phù hợp trong buổi demo.

Kịch bản sử dụng các mốc đã seed để chuyển cảnh. Bằng chứng chạy đủ các bước nghiệp vụ của UC-GOLD nằm ở [hồ sơ Tuần 12](UC_GOLD_TUAN_12.md) và [nghiệm thu Tuần 13](NGHIEM_THU_TUAN_13.md).
