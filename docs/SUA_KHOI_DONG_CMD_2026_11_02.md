# Sửa tệp khởi động tự đóng — 02/11/2026

Người dùng báo bấm đúp KHOI_DONG_DU_AN.cmd thì cửa sổ hiện rồi tắt ngay. Đã tái hiện bằng CMD trong cửa sổ tương tác: Windows báo `'ist' is not recognized`, không tìm thấy đường dẫn và sai cú pháp, thoát mã1 trước khi tới `pause`.

Tệp ban đầu là UTF-8 không BOM nhưng dùng21 dấu xuống dòng LF, không có CR. Chỉ đổi sang21 cặp CRLF, giữ nguyên nội dung lệnh, thì cùng cách mở đã chạy Docker/Prisma/Next và hiện **Website đã sẵn sàng: http://localhost:3000**. Liên kết mở `.cmd` của Windows vẫn bình thường; không sửa registry hoặc cấu hình Docker.

Lượt nghiệm thu trước đã chạy tệp qua tiến trình nền và kiểm website lên, chưa bao phủ cách CMD đọc tệp trong cửa sổ tương tác. Bằng chứng đó chưa đủ để khẳng định thao tác mở trực tiếp không lỗi. Bản sửa này bổ sung trường hợp đã bỏ sót; giữ nguyên báo cáo lịch sử.

## Cách sửa và kiểm tra

- Lưu tệp CMD bằng CRLF, UTF-8 không BOM. Git giữ nguyên byte của riêng tệp này (`-text`) để file trong checkout hoặc bản ZIP vẫn có CRLF, không bị chuẩn hóa thành LF.
- Thêm kiểm tra trên chính tệp checkout: dòng đầu có CRLF và không có LF đơn. Không thay các lệnh khởi động hay cơ chế giữ dữ liệu.
- Mở từ thư mục `C:\Windows\System32` bằng đường dẫn tuyệt đối trong CMD tương tác: máy chủ lên cổng3000 và in thông báo sẵn sàng; không cần đứng sẵn ở thư mục dự án.
- Mở lần nữa khi web đã chạy: cửa sổ hiện thông báo dùng lại máy chủ và giữ tại **Press any key to continue**. Sau khi nhấn phím, riêng cửa sổ thông báo thoát mã0, web vẫn trả HTTP200.
- `npm run check`: **1002 passed, 1 skipped /1003**,63tệp. Phép skipped là file-symlink bị Windows từ chối, không tính thành passed. Kiểm startup tăng từ17 lên18trường hợp; không cộng FR hoặc thay tiến độ165/219.

Lần sau vẫn mở Docker Desktop rồi bấm đúp **KHOI_DONG_DU_AN.cmd** ở thư mục dự án. Giữ cửa sổ khởi động mở trong lúc sử dụng; nếu thông báo website đã chạy ở cửa sổ khác thì chỉ cần mở [localhost:3000](http://localhost:3000). Không thay tài khoản, khóa2FA, dữ liệu hoặc chuyển sang Tuần11.
