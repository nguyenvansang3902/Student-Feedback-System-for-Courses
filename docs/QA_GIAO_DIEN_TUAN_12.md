# Kiểm tra giao diện Tuần 12

Ngày03/11/2026, dữ liệu giả trên database thử riêng, không dùng tài khoản ADMIN/MFA của chủ dự án. Đây là giao diện chức năng Tuần12, không kích hoạt giai đoạn UI-n.

## Kiểm tự động và ảnh đã xem

Playwright Chromium1.64.1 chạy3/3test qua. UC-GOLD có bước nộp khảo sát, gửi/xác nhận giải trình, đánh giá phản hồi và tải tệp bằng trình duyệt; các bước điều phối khác qua HTTP thật. Kiểm dashboard10vai trò,5vai trò ở1440×1000 và375×812; bảng dài cuộn trong khối, không làm tràn ngang cả trang. Không placeholder trong ô nhập ở các màn đã kiểm. Đầu vào/bộ lọc áp dụng trước khi xuất tệp, không xuất theo bộ lọc đang sửa dở.

Đã mở và xem12ảnh PNG dưới đây. Mười ảnh dashboard và ảnh sinh viên từ lượt E2E qua đầu tiên; ảnh xác nhận TBM từ lượt qua cuối sau khi bổ sung chờ trạng thái ổn định. Các tiền tố giả khác nhau giữa hai lượt, không phải cùng tài khoản thực tế.

| Nội dung | Desktop | Mobile |
| --- | --- | --- |
| ĐBCL | [Ảnh](assets/tuan-12/ui/can_bo_dbcl-desktop.png) | [Ảnh](assets/tuan-12/ui/can_bo_dbcl-mobile.png) |
| Giảng viên | [Ảnh](assets/tuan-12/ui/giang_vien-desktop.png) | [Ảnh](assets/tuan-12/ui/giang_vien-mobile.png) |
| PĐT | [Ảnh](assets/tuan-12/ui/phong_dao_tao-desktop.png) | [Ảnh](assets/tuan-12/ui/phong_dao_tao-mobile.png) |
| Khảo thí | [Ảnh](assets/tuan-12/ui/phong_khao_thi-desktop.png) | [Ảnh](assets/tuan-12/ui/phong_khao_thi-mobile.png) |
| Thanh tra | [Ảnh](assets/tuan-12/ui/thanh_tra-desktop.png) | [Ảnh](assets/tuan-12/ui/thanh_tra-mobile.png) |

[Sinh viên đã nộp](assets/tuan-12/ui/sv-da-nop-desktop.png), [TBM đã xác nhận](assets/tuan-12/ui/tbm-xac-nhan-giai-trinh.png). Bản chụp TBM đầu tiên còn tải dữ liệu nên không được dùng để nhận đã hiện trạng thái; bản lưu ở đây đã chờ trạng thái xác nhận.

Quan sát: nhãn/bộ lọc xuống dòng trên mobile; bảng rộng có khung cuộn riêng. Ô thiếu mẫu thể hiện Chưa đủ dữ liệu, không vẽ thanh hoặc thay thành0. Trên dữ liệu thử, PĐT chưa có phản hồi tổ chức lớp và thống kê Thanh tra còn ít hồ sơ nên các phần đó trống/bị che đúng điều kiện; không gọi ảnh này là bằng chứng đã xem biểu đồ có đủ mẫu cho hai vai trò đó. Ảnh có chỉ báo Next dev, chưa phải chứng nhận giao diện production hoàn hảo.

## PDF

Đã giải mã nội dung CSV/XLSX/PDF cho ba vai trò mới và xem mẫu PDF Thanh tra1trang, báo cáo dài5trang. Tiếng Việt không lỗi dấu, có font nhúng, bảng tiếp trang lặp tiêu đề và đủ dòng cuối80, số trang1–5 đúng. PDF/Excel/CSV dùng DTO đã kiểm quyền, không đọc thêm dữ liệu tại renderer. Hai bản PDF giả tại output/pdf dùng để kiểm chức năng, không thay báo cáo tiểu luận.

## Thao tác trực tiếp

Đang tiếp tục kiểm tay UC-GOLD trên dữ liệu giả riêng. Trình duyệt trong ứng dụng từng không kết nối được, nên không nhận kiểm tự động là kiểm tay; kết quả kiểm trực tiếp sẽ ghi ở đây sau khi thực hiện. Không thay thông tin đăng nhập, QR hoặc cấu hình MFA của chủ dự án.

Chưa chạy axe/Lighthouse/SUS, không chứng nhận WCAG hoặc mọi thiết bị. Bằng chứng dịch vụ, CLI, E2E và kiểm trực tiếp được ghi tách biệt tại [nghiệm thu](NGHIEM_THU_TUAN_12.md), [UC-GOLD](UC_GOLD_TUAN_12.md) và verification.json.
