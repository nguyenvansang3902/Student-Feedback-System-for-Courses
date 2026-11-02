# Trạng thái dự án

- Đề tài: khảo sát và phản hồi sinh viên về môn học; 15 tuần từ30/09/2026, khởi động thực tế02/10.
- Tuần hiện tại: Tuần 10 — chức năng thực hiện01/11, chốt bàn giao02/11/2026 theo yêu cầu người dùng.
- Mốc kế hoạch giả định:02–08/12/2026; làm sớm theo lệnh, nhóm đối chiếu lịch trường, không ghi lùi ngày.
- Nguồn chức năng ban đầu51f03e2, CI41274448630 check/smoke qua; nguồn bàn giao8ffa99f, CI41414188239 check/smoke qua đúng SHA; Linux1002/1002.

## Đã hoàn thành

- Tuần1–9/G1 và các báo cáo, ảnh, migration lịch sử được giữ; xem NGHIEM_THU_TUAN_09.md.
- Tuần10: FR-70/71/72/73/76/146/149/153/155; gửi/định tuyến tám loại, hàng đợi, trạng thái, trao đổi, chuyển tiếp/từ chối có lý do, lịch sử.
- Đính kèm tối đa3tệp×5MiB PNG/JPG/PDF; kiểm đuôi/magic, tên ngẫu nhiên ngoài public, tải theo quyền và audit chứng cứ.
- PĐT nhận tổ chức lớp; Khảo thí nhận thi cuối kỳ và lời nhắc phúc khảo cấu hình được; ĐBCL cấu hình cửa sổ học kỳ.
- Khiếu nại nghiêm trọng tạo hồ sơ TIEP_NHAN; hai mức danh tính, kiểm xung đột động cả đa vai trò; lãnh đạo chỉ tóm tắt, ADMIN/ĐBCL không đọc hồ sơ.
- CAS/requestId chống trùng; chuyển tiếp thu hồi quyền nội dung người nhận cũ, retry chỉ trả biên nhận. Quyền/phiên/phạm vi được đọc lại trong giao dịch.
- Check cuối1001passed/1skipped(Windows file-symlink),63tệp; build Next16.4.3 qua và hết cảnh báo tracing kho tệp.
- HTTP/MySQL19/19 sạch fixture;8lệnh tiếp nhận=1thành công/7xung đột,6khiếu nại song song chỉ thêm3/chặn3 khi đã có2.
- SQL16/16, demo17/17;8lớp/9phản hồi/2hồ sơ tiếp nhận, seed lặp/tăng size giữ hash; migration sạch trên database thử mới.
- Migration thêm3bảng,37runtime/46design/9chỉthiết kế;34bảng/9.168bản ghi main cũ giữ hash sau migration và seed, không reset.
- UI4vai trò/2kích thước/14JPEG đã xem; luồng giả gửi→GVtrả lời→SVđóng, Thanh tra ẩn danh/cho biết và lãnh đạo tóm tắt.
- Sửa CMD tự đóng02/11: CRLF nguyên vẹn trong Git; đã kiểm cửa sổ CMD tương tác từ System32 và mở lại giữ pause/web200. Check1002passed/1skipped(1003),63tệp; xem SUA_KHOI_DONG_CMD_2026_11_02.md.
- Tiến độ165/219=75,3%,58/84FR; kế hoạch167/219, chênh2điểm FR-145. M8=15/19,M13=18/22,M14=9/13,M15=6/18.

## Cách mở và phần còn lại

- Mở Docker Desktop, đợi chạy xong, bấm đúp KHOI_DONG_DU_AN.cmd tại thư mục dự án; đợi Website đã sẵn sàng rồi vào http://localhost:3000.
- Giữ cửa sổ khởi động mở; Ctrl+C dừng máy chủ do cửa sổ đó mở, dữ liệu vẫn giữ. Docker riêng chưa bật máy chủ web.
- Web3000/scheduler được mở lại sau kiểm tra; xem README.md, NGHIEM_THU_TUAN_10.md và bao-cao-tien-do/tuan-10.md.
- Demo: DEMO-SV00001/DEMO-GV00001/PDT2026001/KT2026001/TT2026001/LD2026001/DBCL2026001; mật khẩu ban đầu Demo2026!HocTap, giữ mật khẩu đã đổi.
- FR-154 chỉ phần khởi tạo, chưa tick đủ; xác minh/kết luận/SLA/leo thang/hài lòng/mở lại theo Tuần11. FR-145 còn backlog, FR-160 đủ ở Tuần13.
- Không tự đặt lại tài khoản/MFA của chủ dự án; QR chuyển chu kỳ do người dùng thực hiện khi sẵn sàng. Giữ đặc tả gốc và ngoại lệ TOTP60 riêng.
- Trang chung dùng ngữ cảnh trung tính/Tài khoản hoặc email; không placeholder hoặc gọi người dùng là bạn, hạn chế slogan.
- Chỉ dữ liệu giả, không deploy công khai; chưa chứng nhận mọi thiết bị/WCAG/kiểm tải1500request hoặc chống DBA/binlog/tự tiết lộ.
- Các thao tác chưa thử tay và kết quả CI theo SHA được ghi rõ trong QA/verification; không suy kiểm HTTP thành kiểm UI.
- Bước tiếp: chỉ bắt đầu Tuần11 khi người dùng yêu cầu; sinh viên tự điền đóng góp, GVHD và ngày yêu cầu, không viết quy trình hiện tại ở trường.
