# Kiểm tra giao diện Tuần 11

Thực hiện ngày 02–03/11/2026 trên máy Windows, bằng trình duyệt của ứng dụng. Dùng database demo riêng và tài khoản giả, không đăng nhập ADMIN của chủ dự án, không thay MFA. Đây là kiểm chức năng Tuần 11; **UI: chưa bắt đầu, chờ nghiệm thu tuần 11**. Không chạy UI-0 hoặc các tiêu chí nghiệm thu của prompt UI đã hoãn.

| Luồng đã thao tác trực tiếp | Kết quả quan sát |
| --- | --- |
| Giảng viên mở danh sách giải trình của lớp điểm thấp | Hiện yêu cầu bắt buộc từ kết quả đã công bố |
| Giảng viên nhập nguyên nhân, kế hoạch và gửi | Lưu thành Đã gửi, có lịch sử |
| Trưởng bộ môn nhập nhận xét và xác nhận | Thành Đã xác nhận; nội dung chuyển sang chỉ đọc |
| Trưởng bộ môn đọc trung tâm thông báo và đánh dấu tất cả đã đọc | Hai thông báo chuyển từ chưa đọc sang đã đọc, bộ đếm bằng 0 |
| Thanh tra mở hồ sơ XAC_MINH, thêm ghi chú | Hiện Sinh viên ẩn danh, người xử lý đúng, ghi chú mới và lịch sử được lưu |
| Thanh tra kết luận Có căn cứ, nhập lý do | Thành KET_LUAN; biểu mẫu tiếp theo là gửi kết quả cho sinh viên |
| Thanh tra nhập tóm tắt và gửi | Khi mở lại thấy THONG_BAO, phản hồi Đã trả lời, có bước thông báo trong lịch sử |
| Kiểm phần kết luận đã lưu sau sửa | Đã đọc lại trên cây giao diện: Có căn cứ và lý do; chỉ trả ở hồ sơ đầy đủ |

Đã xem và lưu tám ảnh PNG gốc dưới đây. Kích thước đã thử: 937×764, 1280×900 và 390×844. Hai ảnh mobile không có cuộn ngang: scrollWidth 375 ≤ viewport 390. Ở màn giải trình và hồ sơ Thanh tra đã kiểm một h1 và không có placeholder trên ô nhập; đây là kiểm tại các màn đó, không phải chứng nhận mọi trang.

| Ảnh | Nội dung |
| --- | --- |
| [Danh sách giải trình](assets/tuan-11/ui/gv-danh-sach.png) | Giảng viên, 937×764 |
| [Giải trình đã gửi](assets/tuan-11/ui/gv-da-gui-giai-trinh.png) | Giảng viên, 937×764 |
| [Giải trình mobile](assets/tuan-11/ui/gv-giai-trinh-mobile.png) | Giảng viên, 390×844 |
| [Xác nhận mobile](assets/tuan-11/ui/tbm-xac-nhan-mobile.png) | Trưởng bộ môn, 390×844 |
| [Đã xác nhận](assets/tuan-11/ui/tbm-da-xac-nhan.png) | Trưởng bộ môn, 1280×900 |
| [Thông báo đã đọc](assets/tuan-11/ui/tbm-thong-bao-da-doc.png) | Trưởng bộ môn, 1280×900 |
| [Hồ sơ xác minh](assets/tuan-11/ui/tt-xac-minh.png) | Thanh tra, 1280×900 |
| [Hồ sơ kết luận](assets/tuan-11/ui/tt-ket-luan.png) | Thanh tra, 1280×900 |

Trong QA đã sửa liên kết từ trang tài khoản tới giải trình, kiến nghị và thông báo; bỏ thẻ cũ ghi giải trình “chưa mở”; tránh hai h1 trong hồ sơ; đổi nhãn hạn hoàn tất cho hồ sơ Thanh tra; sửa người nhận trong bundle seed mới. Không đổi dữ liệu cũ để tạo ảnh. Có một lượt phiên hết hạn cần mở lại trang; trạng thái THONG_BAO đã lưu được xác nhận sau đó.

Kết nối điều khiển trình duyệt bị gián đoạn sau bước thông báo. Chưa thử tay bước đóng hồ sơ, màn sinh viên/Lãnh đạo sau kết luận, chuyển hồ sơ, đánh giá/mở lại, kiến nghị và cấu hình SLA. Những chức năng đó có kiểm dịch vụ/MySQL/HTTP/kết xuất HTML riêng, không gọi chúng là kiểm trình duyệt. Chưa chạy axe, Lighthouse, khảo sát SUS hoặc chứng nhận WCAG/mọi thiết bị. Các ảnh có chỉ báo Next dev, không phải ảnh production.
