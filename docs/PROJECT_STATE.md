# Trạng thái dự án

- Đề tài: website quản lý khảo sát và phản hồi sinh viên về môn học; 15 tuần từ 30/09/2026.
- Khởi động 02/10; Tuần 2 làm 21/10, Tuần 3 làm 21–22/10, Tuần 4 làm 22/10; không ghi lùi ngày.
- Tuần hiện tại: Tuần 5 — danh mục và nhập liệu, thực hiện 22/10/2026 theo yêu cầu người dùng.
- Mốc Tuần 5 giả định 28/10–03/11; làm sớm theo lệnh, nhóm đối chiếu lịch trường.

## Đã nghiệm thu

- CRUD 6 danh mục, khóa sổ một chiều có lý do; dữ liệu liên quan học kỳ khóa chỉ đọc, kể cả sửa cha gián tiếp.
- ĐBCL GLOBAL vận hành; ADMIN không có quyền nghiệp vụ ngầm. Mỗi service kiểm policy và đọc lại quyền trong DB.
- Origin + CSRF riêng catalog; mutex đầu transaction dùng chung quản trị/import/khóa học kỳ, tránh snapshot cũ.
- CSV/XLSX: chạy thử không ghi DB, lỗi dòng/cột; xác nhận ký gắn người/phiên/tệp/loại/hạn 15 phút; commit nguyên tử.
- 8 mẫu có dòng ví dụ; 2 MiB/tệp, 500 tài khoản hoặc 2.000 dòng danh mục; từ chối công thức/ZIP bất thường.
- Tài khoản nhập PENDING/null password/quyền SV hoặc GV cố định; thư kích hoạt sau commit, báo sent/failed.
- Seed small/medium/large, giữ tài khoản đã đổi; demo tạo DB mới riêng, không DROP/reset main/volume.
- Người dùng cho phép làm trước dữ liệu seed khảo sát/phản hồi ngày 22/10; UI/quy trình vẫn theo kế hoạch.
- Runtime 31/blueprint 39: thêm 15 bảng seed qua migration `20261022072500_week5_demo_data`; deploy/diff đồng bộ.
- Medium: 3 khoa/8 bộ môn/40 môn/120 lớp/60 GV/1.500 SV/4.501 đăng ký; 2 đợt/78 phiếu/234 đáp án/6 phản hồi.
- Seed MySQL 9/9: điểm khớp phiếu, UUID ẩn danh, giữ dữ liệu đã chốt; giữ mật khẩu đã đổi; chặn production.
- Full check 219/219 trong 19 file; SQL 10/10, HTTP auth 24/24, Tuần 4 CLI 5/HTTP 28, Tuần 5 HTTP 22; build exit0.
- UI 13 nhóm/10 viewport, 10 PNG đã xem; 4 thân Mermaid khớp lịch sử, 4 SVG nhãn 31 đã raster/xem ảnh.
- FR-20/21/22/101 đã nghiệm thu; tiến độ 46/163 = 28,2%, M3 = 9/9, M11 = 6/11.

- [CI 39775473219](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39775473219) xanh cho mã a844f3f; main/tài liệu cuối đối chiếu đúng SHA trong Actions.

## Giới hạn

- Chưa có UI/API làm khảo sát, mẫu phiếu, đợt, xử lý phản hồi/kết quả. Ẩn danh mới chứng minh cấu trúc và seed.
- SMTP sau commit không phải outbox; nếu SMTP/DB cùng lỗi có thể chưa thu hồi token thư lỗi, giữ TTL 24 giờ.
- Khôi phục DB/SMTP rồi yêu cầu lại /kich-hoat; không nhập lại file đã tạo tài khoản thành công.
- AUTH_TRUST_PROXY=false dùng bucket IP chung; một version khóa MFA; chưa dịch vụ SMTP Internet.
- Audit production 0; full 5 high dev ESLint chain. ExcelJS dùng uuid 11.1.1 override đã kiểm tương thích.
- Giữ nguyên 4 file nguồn; chỉ dữ liệu giả, không bí mật trong Git/ảnh/log, không gán đóng góp sinh viên.

## Chạy và tiếp theo

- README: Compose, auth:key, db:prepare, db:deploy, db:seed, dev; mở http://localhost:3000.
- Đăng nhập DBCL2026001 để mở /danh-muc; demo riêng: npm run demo, http://127.0.0.1:3001.
- Nhóm kiểm tra theo NGHIEM_THU_TUAN_05, tự viết lại nháp và điền đóng góp thật. Dừng đúng Tuần 5.
