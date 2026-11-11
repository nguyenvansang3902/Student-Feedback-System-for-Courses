# Nghiệm thu kỹ thuật Tuần 14

Thực hiện ngày **10–11/11/2026** trên nhánh `feat/week14-deployment-operations`. Phạm vi gồm đóng gói demo và triển khai, sao lưu và khôi phục FR-103, hướng dẫn cho mười vai trò và video dự phòng.

| Hạng mục | Cách kiểm tra và bằng chứng |
| --- | --- |
| Demo | Đã chạy lệnh README lần đầu trong checkout và dựng lại từ bản trích xuất sạch với cấu hình riêng của demo đã có. MySQL có đủ 11 migration và 1.573 tài khoản giả. Chrome đăng nhập được và mở phiếu khảo sát với vai trò Sinh viên, mở danh sách đợt với vai trò ĐBCL. [Kiểm tra Docker và trình duyệt](assets/tuan-14/deployment-smoke.json) |
| Cấu hình triển khai | Đã dựng image web standalone và image công cụ trên Linux. Đã thử HTTPS qua proxy loopback với chứng chỉ thử được tin cậy, đăng nhập ADMIN, hoàn tất TOTP 60 giây và mở trang quản trị. Đã kiểm cookie Secure/HttpOnly, CSP và HSTS. SMTP ngoài chưa được thử. [Hướng dẫn](VAN_HANH_TUAN_14.md#chuẩn-bị-cấu-hình-triển-khai) · [Kết quả](assets/tuan-14/deployment-smoke.json) |
| FR-103 | MySQL 8.4.11 đã qua 13 tình huống với bộ dữ liệu nhỏ. Lượt đầy đủ khôi phục **46 bảng, 811 dòng và 1 tệp đính kèm**, đối chiếu từng dòng, metadata cột, định nghĩa bảng đã chuẩn hóa và SHA-256 của tệp. Đã làm theo hướng dẫn để chuẩn bị đích riêng bằng Compose production và xác nhận quyền đọc tệp của tài khoản Linux chạy web. [Lượt đầy đủ](assets/tuan-14/fr-103-full-app.json) · [Lượt theo hướng dẫn](assets/tuan-14/fr-103-restore-guide.json) · [Quy trình](SAO_LUU_KHOI_PHUC.md) |
| Hướng dẫn | 10 ảnh từ Chrome trên dữ liệu giả, ứng với 10 vai trò. Ảnh ADMIN được chụp sau khi đăng nhập và hoàn tất TOTP. [Hướng dẫn](HUONG_DAN_SU_DUNG.md) · [Thông tin ảnh](assets/tuan-14/huong-dan/screenshots.json) |
| Demo dự phòng | Video WebM 33,12 giây gồm 7 cảnh. Có mở phiếu khảo sát, xem kết quả lớp, lọc và tải CSV 6.311 byte, xem hàng đợi Thanh tra. [Video](assets/tuan-14/demo-tuan-14.webm) · [Kịch bản](KICH_BAN_DEMO.md) · [Thông tin video](assets/tuan-14/video.json) |

`npm run check` ngày 11/11 qua schema, ERD, lint, TypeScript và 93 tệp Vitest. Có **2.155 passed, 1 skipped trên tổng 2.156**. Ca skipped cần quyền tạo symlink trên Windows. Lượt Playwright ngày 10/11 qua **6/6** trên bản trích xuất nguồn nền `a2954a6`, với MySQL và Mailpit thử riêng. Đây là hồi quy nghiệp vụ. Kiểm tra Docker và HTTPS dùng môi trường của Tuần 14. [Kết quả hồi quy](assets/tuan-14/regression.json)

GitHub Actions đã hoàn thành **check, e2e và smoke** cho commit triển khai `077fdf461882a4de617c858af6ee93ac3db5b9de`. [Lượt CI](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/42948405304) · [Đối chiếu commit](assets/tuan-14/ci-077fdf4.json)

## Nghiệm thu theo README

1. Trên máy đã có Node.js 24 và Docker Compose, mở thư mục mã nguồn và chạy lệnh tại phần đầu [README](../README.md).
2. Mở [trang đăng nhập demo](http://127.0.0.1:3014/dang-nhap). Đăng nhập bằng `DEMO-SV00001`, mật khẩu demo ban đầu `Demo2026!HocTap`. Chọn **Khảo sát của tôi** để xem nhiệm vụ.
3. Đăng xuất và thử `LD2026001`. Trong **Báo cáo**, chọn đợt, bấm **Xem báo cáo** rồi **Tải CSV**. Mở tệp để đối chiếu bộ lọc.
4. Dừng demo theo README và mở lại bằng cùng lệnh. Kiểm tra dữ liệu minh họa vẫn truy cập được.

Trên image production với dữ liệu đã phục hồi, tài khoản sinh viên giả đăng nhập qua HTTPS, mở phản hồi của mình và tải đúng 68 byte của tệp gốc theo SHA-256. Hệ thống ghi một sự kiện tải. Tệp PNG giả đã có CRC lỗi ở nguồn, nên phép thử xác nhận quyền tải và tính toàn vẹn dữ liệu. [Bằng chứng tải tệp](assets/tuan-14/fr-103-restored-web.json)

Phần người ngoài nhóm tự thao tác theo README cần xác nhận của người thực hiện. Phạm vi kiểm triển khai của tuần là môi trường cục bộ. [Giới hạn hiệu năng Tuần 13](HIEU_NANG_TUAN_13.md)

FR-103 đã đạt nghiệm thu kỹ thuật dựa trên đối chiếu khôi phục và hướng dẫn vận hành. `npm run progress` ghi **213/219 điểm (97,3%), 79/84 FR**. So với mốc kế hoạch 215/219 điểm, còn chênh 2 điểm của FR-145 trong backlog.
