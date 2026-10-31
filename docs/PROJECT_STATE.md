# Trạng thái dự án

- Đề tài: khảo sát và phản hồi sinh viên về môn học; 15 tuần từ 30/09/2026, khởi động thực tế 02/10.
- Tuần hiện tại: Tuần 9 — đã nghiệm thu FR-47/60–65/150 ngày 30/10/2026 theo yêu cầu người dùng.
- Mốc kế hoạch giả định: 25/11–01/12; làm sớm theo lệnh, không ghi lùi ngày, nhóm đối chiếu lịch trường.
- Nguồn ứng dụng: 5eb5a84d19b8a526bbce3ed5e61852533e8b6b1f, feat/week9-survey-results; CI41079971520 check/smoke đúng SHA thành công.

## Đã hoàn thành

- Tuần 1–8/G1 đã nghiệm thu; báo cáo và ảnh lịch sử giữ nguyên, xem NGHIEM_THU_TUAN_08.md.
- Tuần 9: tổng hợp chính xác câu/nhóm/tổng, ngưỡng số phiếu và tỉ lệ, CAS/requestId/lịch sử, khóa kỳ lưu trữ.
- Kết quả theo quyền/phạm vi mới; lớp thiếu mẫu ẩn điểm/TEXT. ADMIN/PĐT/SV/Thanh tra không có quyền kết quả ngầm.
- Khảo thí chỉ nhóm đánh giá gộp môn/bộ môn/khoa sau công bố, đủ mẫu và ít nhất hai GV snapshot; không lớp/GV/TEXT/ID trả lời trong DTO.
- So sánh bộ môn/khoa/kỳ trước trên thống kê gốc cùng mẫu; khác cấu hình xếp mức vẫn có điểm, bỏ mức chung tùy ý.
- Kiểm duyệt TEXT có lý do, cờ từ khóa, audit cán bộ/mã đáp án scalar; không tạo quan hệ danh tính–phiếu hoặc giờ nộp chính xác.
- Danh sách PENDING theo phạm vi, audit mỗi lần xem; nhắc tay/tự động chung khóa ngày Việt Nam, cursor không bỏ đợt sau.
- Check 797/797 trong 50 tệp, schema/ERD/lint/TypeScript; build Next16.4.3 qua trên nguồn ứng dụng cuối.
- HTTP/MySQL 12/12 sạch fixture: TC-AGG-01=4,11/40%; 10POST tổng hợp một thành công/chín409; lỗi lớp cuối rollback không lưu kết quả/history/audit rồi retry qua.
- TOTP thật lưu cấu hình, chặn replay/CAS cũ, gắn cờ ba góp ý; cấu hình và ratebucket thử khôi phục nguyên vẹn.
- UI 14 nhóm/23 trạng thái/46PNG desktop/mobile đã xem; bốn ảnh cuối chụp lại mainE8 qua, không lỗi trong phép đo.
- Demo MySQL 15/15; E8 riêng hai đợt/bốn lớp/18 phiếu/40 nhiệm vụ, hai GV cùng môn, đủ/thiếu mẫu và kỳ trước; seed lặp giữ hash.
- Không migration mới: 34 runtime/46 design/12 model chỉ thiết kế; 27 tập main cũ khớp hash sau seed và UI đọc, không reset DB/volume.
- Công thức, ADR010, năm câu bảo vệ, báo cáo 10 mục, ba sơ đồ nghiệp vụ/ERD/ảnh/README/truy vết/nhật ký AI đã cập nhật.
- Tiến độ 138/219=63,0%, 49/84FR; M5=22/22, M7=16/18, M14=6/13. Kế hoạch 140/219, chênh hai điểm FR-145.

## Cách chạy và phần còn lại

- Web chính http://localhost:3000/ket-qua và scheduler đã mở lại; MySQL/Mailpit healthy, health/đăng nhập200.
- Xem kết quả: DEMO-GV00001 hoặc KT2026001/DBCL2026001, mật khẩu Demo2026!HocTap; chọn đợt giả Tuần9 theo README.
- Lỗi tải lại31/10: dev dùng --webpack; check797/797 qua, IAB giữ nội dung thử hơn156giây và đăng nhập/đăng xuất demo qua. Dừng dev trước check/generate/build; xem SUA_TAI_LAI_TRANG_2026_10_31.md.
- FR-145 ImportBatch/hoàn tác P1 có điều kiện còn backlog, chưa tự cắt; FR-160 đầy đủ chờ Tuần13.
- Chưa làm phản hồi liên tục/giải trình/dashboard/xuất file; 5.6(d) xuất CSV/Excel/PDF phải kiểm khi Tuần12 hiện thực.
- Chưa kiểm tải1500 request/WCAG/mọi thiết bị/log proxy; ẩn danh mức ứng dụng, không chống DBA/binlog hoặc tự tiết lộ.
- Chỉ dữ liệu giả, không deploy công khai; đóng góp/ngày yêu cầu/GVHD do sinh viên xác minh, không viết quy trình hiện tại ở trường.
- CI main Tuần9: 43da7f8017a16759f9883af49cfff29b44eabfcb/run41082112228 qua check/smoke; không suy kết quả này cho commit sửa câu chữ sau đó.
- Câu chữ các tuần sau: trang chủ/xác thực/email dùng chung trung tính, đăng nhập dùng “Mã tài khoản hoặc email”; không gọi “bạn”, hạn chế slogan và không placeholder.
- Sau xác thực: chỉ SINH_VIEN dùng “Mã số sinh viên”, chỉ GIANG_VIEN dùng “Mã giảng viên”; cán bộ/ADMIN/đa vai trò dùng “Mã tài khoản”. Giữ danh xưng sinh viên ở màn hình riêng cho sinh viên.
- Đã tạo ADMIN riêng cục bộ bằng CLI, kiểm đăng nhập/MFA_SETUP và chặn quản trị trước TOTP; mật khẩu bàn giao riêng, chủ tài khoản tự đăng ký TOTP lần đầu.
- QA ngữ cảnh 30–31/10: 10 vai trò +đa vai trò,44/44 bố cục/8PNG đã xem; ADMIN thử đã vô hiệu hóa/thu hồi quyền, giữ audit. Xem NGU_CANH_TAI_KHOAN_VA_ADMIN_2026_10_31.md.
- Bước tiếp: chỉ bắt đầu Tuần10 khi người dùng yêu cầu; xem NGHIEM_THU_TUAN_09.md và báo cáo Tuần9.
