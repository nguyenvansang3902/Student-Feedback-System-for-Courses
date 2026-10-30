# Xưng hô trên giao diện — 30/10/2026

Theo góp ý người dùng, nội dung dành cho sinh viên dùng danh xưng “sinh viên”, không dùng “bạn”. Trang kích hoạt có tiêu đề **“Bắt đầu với tài khoản của sinh viên”**. Các màn hình quản lý dùng câu trung tính hoặc đúng vai trò; không gọi cán bộ là sinh viên.

Đã rà hướng dẫn, nhãn, thông báo và lỗi cố định trong mã. Các ô nhập vẫn để trống, không có chữ gợi ý bên trong. Đây là chỉnh câu chữ, không thêm FR hoặc tăng tiến độ. Không chạy seed để sửa lại mẫu đã khóa, câu trả lời hoặc nội dung do người dùng đã lưu.

## Kiểm tra đã chạy

- `npm run check`: **797/797 kiểm thử trong 50 tệp** qua; schema/ERD/lint/TypeScript qua trên bản sửa.
- Chrome ở **1440×1000** và **390×844**: **18/18 bố cục**, gồm tám trang/chín trạng thái. Các trang: kích hoạt, quên mật khẩu, đăng nhập, đặt lại mật khẩu, tài khoản sinh viên, danh sách khảo sát, tài khoản ĐBCL và danh sách đợt; thêm trạng thái đăng nhập bỏ trống.
- Không thấy cách gọi cũ trong nội dung giao diện của các trang kiểm tra, không có thuộc tính placeholder trên input/textarea, tràn ngang, thiếu nhãn hoặc lỗi JavaScript/React trong phép đo.
- Đã đăng nhập qua biểu mẫu bằng hai tài khoản **giả** (sinh viên và ĐBCL). Không gửi email, nộp khảo sát, tạo/sửa đợt hoặc xem nội dung câu hỏi đã khóa để thay đổi dữ liệu. Đăng nhập tạo phiên/nhật ký theo cơ chế hiện có.
- Đã xem cả bốn ảnh mới dưới đây. Giữ nguyên ảnh nghiệm thu Tuần9 và các lượt chỉnh giao diện trước.

| Trang | Máy tính | Điện thoại |
| --- | --- | --- |
| Kích hoạt | [Ảnh 1440](assets/xung-ho-sinh-vien-2026-10-30/kich-hoat-1440.png) | [Ảnh 390](assets/xung-ho-sinh-vien-2026-10-30/kich-hoat-390.png) |
| Đăng nhập | [Ảnh 1440](assets/xung-ho-sinh-vien-2026-10-30/dang-nhap-1440.png) | [Ảnh 390](assets/xung-ho-sinh-vien-2026-10-30/dang-nhap-390.png) |

Harness/kết quả giữ ngoài Git ở `.local/address-copy-qa.mjs` và `.local/address-copy-qa-result.json`; không lưu thông tin xác thực vào ảnh hoặc tài liệu. Lượt đầu harness mở token thử ở query trong khi ứng dụng đọc fragment nên chờ sai trạng thái; đã sửa URL thử sang `#token`, đóng trình duyệt cũ và chạy lại đầy đủ 18 bố cục. Không sửa ứng dụng để ép phép kiểm qua; chỉ tính lượt cuối thành công. Các kết quả này không thay bằng chứng CI đúng SHA của commit mới.
