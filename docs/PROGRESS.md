# Tiến độ yêu cầu chức năng

Nguồn: Mục 7 của đặc tả. Trọng số P0 = 3, P1 = 2, P2 = 1. Chỉ đánh dấu hoàn thành khi có test qua, nghiệm thu được và tài liệu đã cập nhật. Tuần dự kiến bám Mục 9; P2 chưa được xếp trong kế hoạch 15 tuần được ghi rõ là chưa xếp tuần, không tự nhận đã hoàn thành.

Mốc kế hoạch: 30/09/2026. Bắt đầu thực tế: 02/10/2026. Tuần 1 tạm tính 30/09–06/10/2026 theo giả định 7 ngày/tuần, chờ xác nhận lịch của trường.

## M1 Xác thực và phiên

- [ ] FR-01 [P0] đăng nhập bằng mã định danh (mã SV/GV) hoặc email (Tuần 3)
- [ ] FR-02 [P0] phiên JWT, đăng xuất, thu hồi (Tuần 3)
- [ ] FR-03 [P0] đổi mật khẩu (Tuần 3)
- [ ] FR-04 [P1] quên/đặt lại mật khẩu qua email (token dùng một lần, hết hạn 30 phút) (Tuần 3)
- [ ] FR-05 [P0] kích hoạt tài khoản lần đầu hoặc mật khẩu tạm buộc đổi (Tuần 3)
- [ ] FR-06 [P0] giới hạn tần suất và khóa tạm (Tuần 3)
- [ ] FR-07 [P0] xác thực hai bước TOTP cho ADMIN (đăng ký bằng mã QR, xác nhận, mã khôi phục, đặt lại) (Tuần 4)
- [ ] FR-08 [P1] bật 2FA bắt buộc cho các vai trò khác theo cấu hình (Tuần 4)
- [ ] FR-09 [P2] xem và đăng xuất các thiết bị (Chưa xếp tuần; P2 tùy chọn)

## M2 Người dùng, phân quyền, kiểm toán

- [ ] FR-10 [P0] quản lý người dùng (tạo, khóa/mở khóa, gán vai trò và phạm vi) (Tuần 4)
- [ ] FR-11 [P0] policy tập trung theo vai trò + phạm vi (Tuần 4)
- [ ] FR-12 [P0] xem và lọc nhật ký kiểm toán (Tuần 4)

## M3 Danh mục và nhập liệu

- [ ] FR-20 [P0] CRUD học kỳ (có khóa sổ), khoa, bộ môn, môn học, lớp học phần, phân công giảng viên (Tuần 5)
- [ ] FR-21 [P0] import Excel/CSV (sinh viên, giảng viên, lớp học phần, đăng ký) với chạy thử trước khi ghi và báo lỗi từng dòng (Tuần 5)
- [ ] FR-22 [P0] tải mẫu file import (Tuần 5)

## M4 Mẫu phiếu

- [ ] FR-30 [P0] trình soạn mẫu (nhóm tiêu chí, câu hỏi, thứ tự) (Tuần 6)
- [ ] FR-31 [P0] các loại câu hỏi, bắt buộc, "Không áp dụng", trọng số (Tuần 6)
- [ ] FR-32 [P0] phiên bản và khóa (Tuần 6)
- [ ] FR-33 [P0] xem trước (Tuần 6)
- [ ] FR-34 [P1] nhân bản mẫu (Tuần 6)
- [ ] FR-35 [P1] mẫu mặc định có sẵn (Tuần 6)

## M5 Đợt khảo sát

- [ ] FR-40 [P0] tạo/sửa đợt (Tuần 7)
- [ ] FR-41 [P0] phạm vi (toàn trường/khoa/bộ môn/danh sách lớp) (Tuần 7)
- [ ] FR-42 [P0] trình duyệt, duyệt, từ chối (Tuần 7)
- [ ] FR-43 [P0] chốt danh sách và sinh nhiệm vụ khi mở (Tuần 7)
- [ ] FR-44 [P0] tự động mở/đóng (idempotent) (Tuần 7)
- [ ] FR-45 [P1] gia hạn, đóng sớm, hủy (Tuần 7)
- [ ] FR-46 [P0] theo dõi tiến độ và tỉ lệ tham gia (Tuần 7)
- [ ] FR-47 [P1] nhắc sinh viên chưa hoàn thành (Tuần 9)

## M6 Làm khảo sát

- [ ] FR-50 [P0] danh sách khảo sát của sinh viên (hạn chót, trạng thái) (Tuần 8)
- [ ] FR-51 [P0] form động, thanh tiến trình, kiểm tra hợp lệ (Tuần 8)
- [ ] FR-52 [P1] nháp phía trình duyệt (Tuần 8)
- [ ] FR-53 [P0] nộp ẩn danh một lần (Tuần 8)
- [ ] FR-54 [P0] màn hình xác nhận đã nộp (Tuần 8)

## M7 Kết quả

- [ ] FR-60 [P0] tổng hợp (Tuần 9)
- [ ] FR-61 [P0] ngưỡng công bố (Tuần 9)
- [ ] FR-62 [P0] công bố (Tuần 9)
- [ ] FR-63 [P0] trang kết quả theo vai trò và phạm vi (Tuần 9)
- [ ] FR-64 [P1] so sánh với bộ môn/khoa/kỳ trước (Tuần 9)
- [ ] FR-65 [P1] kiểm duyệt góp ý tự luận (Tuần 9)
- [ ] FR-66 [P1] giải trình và xác nhận (Tuần 11)

## M8 Phản hồi

- [ ] FR-70 [P0] gửi phản hồi (loại, mức độ, ẩn danh, đính kèm) (Tuần 10)
- [ ] FR-71 [P0] định tuyến và hàng đợi xử lý (Tuần 10)
- [ ] FR-72 [P0] trạng thái và lịch sử (Tuần 10)
- [ ] FR-73 [P0] trao đổi qua lại (Tuần 10)
- [ ] FR-74 [P1] SLA, quá hạn, leo thang (Tuần 11)
- [ ] FR-75 [P1] đánh giá hài lòng và mở lại (Tuần 11)
- [ ] FR-76 [P0] chuyển tiếp/từ chối có lý do (Tuần 10)

## M9 Thông báo

- [ ] FR-80 [P0] thông báo trong ứng dụng (Tuần 11)
- [ ] FR-81 [P1] email (Mailpit khi phát triển, SMTP khi triển khai) (Tuần 11)
- [ ] FR-82 [P1] nhắc hạn (Tuần 11)

## M10 Báo cáo

- [ ] FR-90 [P0] dashboard theo vai trò (Tuần 12)
- [ ] FR-91 [P1] biểu đồ (Tuần 12)
- [ ] FR-92 [P0] xuất Excel/CSV (Tuần 12)
- [ ] FR-93 [P1] xuất PDF (Tuần 12)
- [ ] FR-94 [P1] báo cáo xử lý phản hồi (số lượng, thời gian xử lý, quá hạn, hài lòng) (Tuần 12)

## M11 Hệ thống

- [ ] FR-100 [P0] cấu hình ngưỡng (Tuần 7)
- [ ] FR-101 [P0] dữ liệu demo (seed) (Tuần 5)
- [ ] FR-102 [P0] health check (Tuần 1)
- [ ] FR-103 [P1] script sao lưu/khôi phục (Tuần 14)

## M12 Mở rộng

- [ ] FR-110 [P2] gợi ý chủ đề/cảm xúc cho góp ý tự luận bằng AI (tắt mặc định, ẩn danh hóa trước khi gửi, cần người dùng đồng ý) (Chưa xếp tuần; P2 tùy chọn)
- [ ] FR-111 [P2] API trạng thái hoàn thành (Chưa xếp tuần; P2 tùy chọn)
- [ ] FR-112 [P2] đánh giá riêng từng giảng viên (Chưa xếp tuần; P2 tùy chọn)

