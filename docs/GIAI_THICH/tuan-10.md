# Giải thích Tuần 10

Đây là nháp kỹ thuật do AI hỗ trợ. Sinh viên cần đọc, thử và diễn đạt lại bằng lời của mình khi bảo vệ.

## 1. Vì sao phản hồi ẩn danh vẫn có người gửi trong database?

Phản hồi liên tục cần chuyển trả lời và giữ cuộc trao đổi cho đúng sinh viên. Ứng dụng giữ tác giả bên trong nhưng bỏ danh tính khỏi dữ liệu trả cho người xử lý nếu chọn ẩn danh. Phiếu khảo sát dùng thiết kế khác: không có quan hệ từ câu trả lời đến sinh viên. Không được ghép hai miền này lại.

## 2. Vì sao kiểm vai trò ở menu chưa đủ?

Một người có thể đoán ID hoặc gọi API trực tiếp. Mỗi service phải kiểm quyền trên đúng phản hồi và phạm vi lớp, kiểm lại phiên/quyền trong giao dịch. Với Thanh tra còn phải loại người liên quan lớp/bộ môn/khoa, kể cả người đó có thêm vai trò Thanh tra. Đường tải tệp cũng dùng cùng kiểm tra.

## 3. Hai người bấm tiếp nhận cùng lúc thì sao?

Mỗi phản hồi có revision. Giao dịch đầu đổi trạng thái và tăng revision; lệnh dùng revision cũ bị từ chối, không thêm một lịch sử thứ hai. RequestId giúp gửi lại cùng yêu cầu sau lỗi mạng mà không nhân đôi. Dùng lại requestId với nội dung khác bị báo xung đột.

## 4. Đổi tên một tệp thành .png có vượt qua được kiểm tra không?

Máy chủ kiểm cả phần mở rộng và chữ ký đầu tệp. Nội dung không đúng PNG/JPG/PDF bị chặn, dù trình duyệt khai loại tệp hợp lệ. Tệp được đặt tên ngẫu nhiên ngoài public; chỉ người được phép mới tải qua API. Magic bytes không thay thế hoàn toàn việc quét mã độc; hệ thống chưa có dịch vụ quét ngoài.

## 5. Tuần 10 đã hoàn tất toàn bộ quy trình Thanh tra chưa?

Chưa. Tuần này nhận đơn, tạo hồ sơ TIEP_NHAN, bảo vệ danh tính, chứng cứ và quyền giao người không xung đột. Xác minh, kết luận, thông báo và đóng theo Tuần 11. Các enum tương lai trong schema không có nghĩa nghiệp vụ đã làm xong; FR-154 chỉ được ghi một phần, không cộng điểm hoàn tất.
