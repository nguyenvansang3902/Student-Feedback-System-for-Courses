# Giải thích Tuần 11

[CẦN SINH VIÊN ĐỌC VÀ VIẾT LẠI BẰNG LỜI CỦA MÌNH]

Tuần này bổ sung cách theo dõi một phản hồi đến khi xử lý xong: tính ngày làm việc, nhắc hạn và chuyển tới cấp tiếp theo nếu chậm. Sinh viên có thể đánh giá trả lời và mở lại một lần nếu chưa hài lòng. Lớp có kết quả công bố dưới ngưỡng sinh yêu cầu để giảng viên giải thích nguyên nhân, đề xuất cải tiến và được trưởng bộ môn xem xét. Khảo thí có kênh kiến nghị riêng từ dữ liệu gộp đủ mẫu.

Thanh tra ghi nhận xác minh, lưu kết luận rồi gửi bản tóm tắt cho sinh viên. Nội dung nội bộ được tách khỏi bản tóm tắt của Lãnh đạo và người chuyển hồ sơ. Thông báo và email chỉ dẫn người nhận về ứng dụng; quyền hiện tại vẫn được kiểm khi đọc.

1. **Quá hạn có phải trạng thái mới không?** Không. Đây là cờ tính từ thời hạn và trạng thái đang xử lý; không làm sai máy trạng thái phản hồi.
2. **Vì sao job chạy lại không chuyển hai lần?** Mỗi cấp có khóa duy nhất, thao tác nằm trong giao dịch có khóa điều phối; retry kiểm marker đã lưu.
3. **Vì sao ít nhất hai giảng viên mới đủ dữ liệu cho kiến nghị Khảo thí?** Nhằm dùng kết quả gộp thay vì suy ngược về một giảng viên; lớp không có phiếu không được tính cho điều kiện này.
4. **Nếu giảng viên đồng thời có vai trò Thanh tra thì sao?** Dịch vụ kiểm xung đột với lớp/phân công hiện tại và từ chối hồ sơ liên quan, không cộng vai trò để vượt bảo vệ.
5. **Email có bảo đảm không bao giờ gửi lặp không?** Không tuyệt đối. Lease và khóa sự kiện hạn chế trùng; nếu SMTP nhận thư rồi tiến trình dừng trước khi ghi SENT, lần thử lại có thể gửi thêm.

[Nghiệm thu và giới hạn](../NGHIEM_THU_TUAN_11.md), [bảng SLA](../SLA_TUAN_11.md), [nháp chương hiện thực](../CHUONG_HIEN_THUC_TUAN_11.md). Kiểm tự động không thay việc nhóm tự thử và giải thích trước hội đồng.
