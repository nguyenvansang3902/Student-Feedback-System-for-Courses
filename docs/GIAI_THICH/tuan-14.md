# Giải thích công việc Tuần 14

Tuần này đóng gói cách chạy website để giảng viên hoặc thành viên mới có thể mở bản demo bằng một lệnh. Docker tạo riêng website, MySQL, hộp thư thử và tiến trình xử lý lịch. Nếu dùng máy đã có dữ liệu chính, bản demo vẫn dùng volume và cổng khác.

Dockerfile chia các bước cài thư viện, sinh Prisma Client, build và chạy. Image production chỉ mang phần cần để phục vụ website. Lệnh migration và scheduler dùng image có công cụ cần thiết. Reverse proxy nhận kết nối HTTPS rồi chuyển đến web ở cổng loopback.

Bản sao lưu giữ SQL cùng các tệp đính kèm mà bản ghi MySQL tham chiếu. Phục hồi thử vào database và kho tệp rỗng giúp kiểm tra bản sao trước khi cân nhắc sử dụng. Hướng dẫn theo vai trò cho biết mở màn hình nào, được thao tác ở đâu và vì sao cùng một chức năng có thể hiện kết quả khác nhau với hai tài khoản.

## Câu hỏi hội đồng có thể hỏi

1. **Vì sao dùng Dockerfile nhiều giai đoạn?** Giai đoạn build cần công cụ và mã nguồn. Image web khi chạy chỉ cần phần đầu ra đã đóng gói, thư viện runtime và tài nguyên được dùng.
2. **Vì sao demo và cấu hình triển khai dùng Compose riêng?** Demo cần seed giả và Mailpit để thử nhanh. Bản triển khai dùng HTTPS, SMTP cấu hình riêng và volume dành cho dữ liệu vận hành.
3. **Chỉ sao lưu MySQL có đủ không?** SQL chứa metadata của tệp phản hồi. Cần lưu kèm nội dung tệp và giữ riêng khóa MFA cùng phiên bản để khôi phục khả năng đăng nhập.
4. **Tại sao khôi phục vào dự án mới?** Có thể xác minh bản sao và quyền trước khi chuyển sang sử dụng. Đích rỗng cũng giúp script từ chối thao tác có nguy cơ đè lên dữ liệu hiện có.
5. **Tại sao kiểm MySQL riêng với health của web?** Health xác nhận tiến trình HTTP phản hồi. Compose dùng truy vấn DB và kết quả migration để kiểm riêng kết nối và chuẩn bị schema.
