# Chương 4. Hiện thực hệ thống — nháp Tuần 7

Ngày viết29/10/2026. AI hỗ trợ nháp; nhóm phải đọc mã, chạy lại và diễn đạt bằng lời của mình. Chưa phải toàn bộ chương hiện thực của đề tài. Thông số/nghiệm thu cuối xem báo cáo Tuần7.

## 4.1. Tổ chức mã và ranh giới trách nhiệm

Next.js App Router cung cấp trang /dot-khao-sat và API /api/campaigns. Route kiểm phiên/cookie, Origin, CSRF, kiểu dữ liệu và giới hạn256KiB thực tế. Policy can.ts xác định quyền theo grant hợp lệ; service campaigns.ts kiểm quyền và phiên mới từ DB trước mỗi thao tác. Giao diện chỉ hiện nút phù hợp, API vẫn từ chối thao tác ngoài quyền. Cấu hình ngưỡng đặt tại /quan-tri/cau-hinh-khao-sat, bắt buộc ADMIN MFA và TOTP mới khi lưu.

campaign-readiness.ts giải phạm vi đợt thành lớp và cặp đăng ký, chạy RS-01–06 và tính hash. campaigns.ts thực hiện tạo/sửa/trình/xác nhận/duyệt và vận hành. campaign-lifecycle.ts dùng cùng logic cho ensure ở request và scheduler, chốt nhiệm vụ nguyên tử theo revision. campaign-notifications.ts xếp hàng và gửi thư sau commit. Prisma runtime34model chỉ gồm phần đã đến lịch triển khai và bảng seed được cho phép; blueprint46model giữ phần thiết kế tương lai.

## 4.2. Kịch bản minh họa

ĐBCL chọn học kỳ mở, phiên bản mẫu và phạm vi lớp, nhập lịch theo giờ Việt Nam và trình. PĐT đọc readiness; thiếu giảng viên/đăng ký hoặc kỳ khóa làm nút xác nhận bị chặn ở máy chủ. Có cảnh báo vẫn xác nhận được nếu ghi chú. Lãnh đạo duyệt sẽ khóa mẫu. Đến lịch, cohort được tính lại; thay đổi trước mở tạo cảnh báo và dùng dữ liệu mới, còn thay đổi sau mở không sửa nhiệm vụ đã chốt. Tiến độ được tính từ trạng thái nhiệm vụ, độc lập nội dung phiếu ẩn danh.

## 4.3. Tranh chấp và phục hồi

Transaction khóa mutex chung trước đọc dữ liệu; CAS ngăn hai lần ghi cùng revision. RequestId đảm bảo thao tác trình/xác nhận/duyệt/gia hạn lặp không nhân lịch sử. Mở đợt tạo cohort/task trong cùng transaction, nên lỗi giữa chừng rollback toàn thao tác. Nếu scheduler ngừng, lần truy cập kế tiếp gọi ensure để bắt kịp; lịch sử dùng giờ thực tế. Hàng đợi email lưu trạng thái và lease để worker thử lại; không giữ giao dịch trong thời gian SMTP.

## 4.4. Phần còn lại của chương

Tuần8 bổ sung form động và nộp phiếu ẩn danh; Tuần9 tổng hợp/công bố; các tuần sau xử lý phản hồi, SLA, báo cáo và kiểm tải. Dữ liệu phiếu có từ seed được người dùng cho phép không đồng nghĩa các API tương lai đã hoàn thành. Chỉ đưa số liệu kiểm thử thật từ TRUY_VET vào bản nộp cuối.
