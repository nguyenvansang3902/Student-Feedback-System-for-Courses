# Đổi cách gọi mã số sinh viên ở trang đăng nhập — 30/10/2026

Theo góp ý của người dùng, thay “mã định danh” bằng “mã số sinh viên” ở ba vị trí trong `src/components/auth/auth-form.tsx`:

- Hướng dẫn dưới tiêu đề: “Nhập mã số sinh viên hoặc email và mật khẩu.”
- Nhãn ô nhập: “Mã số sinh viên hoặc email”.
- Thông báo khi bỏ trống: “Nhập mã số sinh viên hoặc email của bạn.”

Ô đăng nhập tiếp tục để trống, không có ví dụ placeholder. Đây là chỉnh câu chữ sau khi chốt Tuần 9, không thêm FR hoặc thay đổi tiến độ và logic xác thực.

## Kiểm tra

`npm run check` đã qua **797/797 kiểm thử trong 50 tệp**, cùng schema/ERD/lint/TypeScript theo lượt chạy cuối của người điều phối. Kiểm Chrome trên web cục bộ `http://localhost:3000/dang-nhap`: **4/4 bố cục** ở 1440×1000 và 390×844, gồm biểu mẫu sẵn sàng và lỗi bỏ trống. Không tràn ngang, thiếu nhãn, placeholder hoặc lỗi JS/React trong phép đo; không còn “mã định danh” trong chữ hiển thị. Không gửi yêu cầu đăng nhập hoặc ghi dữ liệu nghiệp vụ.

Đã xem cả bốn ảnh gốc. Đây là kiểm câu chữ và bố cục ở hai kích thước, không phải kiểm lại mọi luồng xác thực hoặc chứng nhận WCAG. Harness và kết quả máy đọc được giữ cục bộ tại `.local/login-copy-qa.mjs`, `.local/login-copy-qa-result.json`. Bộ 46 ảnh nghiệm thu Tuần 9 được giữ nguyên.

| Trạng thái | Máy tính | Điện thoại |
| --- | --- | --- |
| Biểu mẫu sẵn sàng | [1440px](assets/chinh-sua-dang-nhap-2026-10-30/san-sang-1440.png) | [390px](assets/chinh-sua-dang-nhap-2026-10-30/san-sang-390.png) |
| Lỗi bỏ trống | [1440px](assets/chinh-sua-dang-nhap-2026-10-30/bo-trong-1440.png) | [390px](assets/chinh-sua-dang-nhap-2026-10-30/bo-trong-390.png) |
