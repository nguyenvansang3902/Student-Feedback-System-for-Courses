# Báo cáo tiến độ Tuần 14

Đề tài xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học. Tiểu luận chuyên ngành HK1 2026–2027. Nhóm và GVHD do sinh viên điền. Thực hiện từ **10 đến 11/11/2026**.

## 1. Mục tiêu

Đóng gói ứng dụng để có thể chạy demo trên máy mới, chuẩn bị cấu hình triển khai HTTPS, thực hiện FR-103 và viết tài liệu sử dụng theo vai trò.

## 2. Kết quả đạt được

Dockerfile nhiều giai đoạn và hai cấu hình Compose cho demo và triển khai. README có lệnh mở demo cục bộ và cách dừng để giữ dữ liệu. FR-103 có lệnh sao lưu SQL, lưu tệp đính kèm theo dữ liệu tham chiếu và khôi phục vào một dự án Compose rỗng. Nhóm có hướng dẫn 10 vai trò bằng ảnh, kịch bản và video dự phòng. [Hồ sơ nghiệm thu](../NGHIEM_THU_TUAN_14.md)

## 3. Đối chiếu kế hoạch

| Công việc | Kết quả |
| --- | --- |
| Đóng gói, biến môi trường, cài đặt và vận hành | Demo đã chạy bằng lệnh README. Image production đã qua thử HTTPS và ADMIN TOTP cục bộ. |
| Sao lưu và khôi phục | Đã đối chiếu 46 bảng, 811 dòng và một tệp trên bản khôi phục thử. |
| Hướng dẫn theo vai trò | Đã có đủ 10 vai trò và 10 ảnh giao diện chạy thật với dữ liệu giả. |
| Kịch bản và video dự phòng | Có kịch bản thao tác và video WebM 33,12 giây. |
| Người ngoài nhóm chạy theo README | Chờ người thực hiện xác nhận. |

## 4. Tiến độ lũy kế

`npm run progress` ghi **213/219 điểm (97,3%), 79/84 FR**. FR-103 thêm 2 điểm. Mốc kế hoạch lũy kế là 215/219 điểm. Chênh lệch 2 điểm là FR-145 trong backlog. [Danh sách FR](../PROGRESS.md)

## 5. Khó khăn và cách xử lý

Build production cần Prisma Client, metadata và font xuất PDF. Docker build chọn đầu vào theo danh sách cần thiết, dùng volume riêng cho database và tệp phản hồi. Việc khôi phục có thể dừng giữa chừng khi MySQL đã tạo một phần bảng. Khi đó giữ bản đích để chẩn đoán và dùng dự án đích rỗng khác cho lượt thử mới.

## 6. Kế hoạch Tuần 15

Theo kế hoạch, hoàn thiện báo cáo, slide, câu hỏi phản biện, kịch bản bảo vệ và chốt phiên bản sau khi có yêu cầu bắt đầu Tuần 15.

## 7. Đóng góp từng thành viên

[SINH VIÊN TỰ ĐIỀN]

## 8. Kiểm tra nhanh cho giảng viên

1. Bật Docker Desktop ở chế độ Linux containers.
2. Chạy `node scripts/start-demo-compose.mjs` ở thư mục mã nguồn.
3. Mở `http://127.0.0.1:3014/dang-nhap`. Đăng nhập `DEMO-SV00001` với mật khẩu ban đầu `Demo2026!HocTap` và mở danh sách khảo sát.
4. Dùng `LD2026001` để xem báo cáo và tải tệp CSV theo bộ lọc. Có thể mở video dự phòng từ kịch bản demo.

## 9. Bản rút gọn để nộp tiến độ

Tuần 14, nhóm chuẩn bị bộ chạy Docker cho demo và triển khai. Bản demo dùng một lệnh, kèm MySQL và dữ liệu giả. Nhóm bổ sung lệnh sao lưu và khôi phục SQL cùng tệp đính kèm trên database riêng. Hướng dẫn có ảnh cho mười vai trò và video dự phòng minh họa khảo sát, kết quả lớp, tải CSV và hồ sơ Thanh tra. Check qua 2.155 ca, một ca symlink được bỏ qua trên Windows. Playwright qua sáu ca hồi quy. Người ngoài nhóm còn cần xác nhận lượt chạy theo README.

## 10. Điều chỉnh so với kế hoạch

Ngày và tên người yêu cầu do sinh viên xác minh và điền. Hướng dẫn có thêm hình ảnh cho Phòng Đào tạo, Phòng Khảo thí và Phòng Thanh tra theo Điều chỉnh số 01. Các phép thử triển khai thực hiện trên máy cục bộ.
