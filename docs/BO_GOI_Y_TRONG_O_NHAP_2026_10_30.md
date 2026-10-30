# Bỏ chữ gợi ý bên trong ô nhập — 30/10/2026

Theo yêu cầu người dùng, các ô nhập, tìm kiếm và tự luận không dùng chữ gợi ý bên trong. Nhãn và hướng dẫn bên ngoài ô được giữ. Quy ước này áp dụng cả khi làm các tuần sau; đây là chỉnh giao diện, không thêm FR hoặc tăng tiến độ.

## Thay đổi

- `auth-form.tsx`: bỏ ví dụ email dùng chung cho kích hoạt tài khoản và quên mật khẩu, bỏ lớp CSS dành cho placeholder.
- `campaign-form.tsx`: bỏ ví dụ tên đợt và chữ gợi ý tìm mã/tên trong các bộ chọn.
- `campaign-list.tsx`: bỏ chữ gợi ý tìm tên đợt.
- Rà soát toàn bộ `src` ngoài mã sinh: không còn `placeholder`, `aria-placeholder`, `data-placeholder` hoặc lớp phủ gợi ý. Lựa chọn dropdown và dữ liệu đang có vẫn là giá trị của trường.

## Kiểm tra

- `npm run check`: **797/797 kiểm thử trong 50 tệp** qua; schema/ERD/lint/TypeScript qua.
- Chrome ở 1440×1000 và 390×844: **10/10 bố cục** của năm trang kích hoạt, quên mật khẩu, đăng nhập, danh sách đợt và tạo đợt qua. Không có thuộc tính placeholder trên input/textarea, thiếu nhãn, tràn ngang hoặc lỗi JavaScript/React trong phép đo.
- Đã xem cả bốn ảnh mới dưới đây. Chỉ đăng nhập tài khoản ĐBCL giả để đọc hai trang đợt; không gửi email hoặc tạo/sửa đợt. Ảnh nghiệm thu Tuần9 và các lượt sửa trước được giữ nguyên.
- Harness/kết quả cục bộ: `.local/no-placeholders-qa.mjs` và `.local/no-placeholders-qa-result.json`. Không dùng kết quả CI của commit trước để nhận commit thay đổi này đã qua CI.

| Trang | Máy tính | Điện thoại |
| --- | --- | --- |
| Kích hoạt tài khoản | [Ảnh 1440](assets/bo-goi-y-o-nhap-2026-10-30/kich-hoat-1440.png) | [Ảnh 390](assets/bo-goi-y-o-nhap-2026-10-30/kich-hoat-390.png) |
| Tạo đợt khảo sát | [Ảnh 1440](assets/bo-goi-y-o-nhap-2026-10-30/tao-dot-khao-sat-1440.png) | [Ảnh 390](assets/bo-goi-y-o-nhap-2026-10-30/tao-dot-khao-sat-390.png) |

Cách xưng hô được chỉnh tiếp theo yêu cầu cùng ngày; xem [danh xưng sinh viên](XUNG_HO_SINH_VIEN_2026_10_30.md). Các ảnh ở trên ghi lại đúng lượt bỏ chữ gợi ý, không thay bằng ảnh của lượt sau.
