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
- HMR lặp sau build/khôi phục tệp kiểu đã được xử lý bằng giữ cache trong .local và khởi động lại dev; không sửa nghiệp vụ/xóa dữ liệu.
- FR-145 ImportBatch/hoàn tác P1 có điều kiện còn backlog, chưa tự cắt; FR-160 đầy đủ chờ Tuần13.
- Chưa làm phản hồi liên tục/giải trình/dashboard/xuất file; 5.6(d) xuất CSV/Excel/PDF phải kiểm khi Tuần12 hiện thực.
- Chưa kiểm tải1500 request/WCAG/mọi thiết bị/log proxy; ẩn danh mức ứng dụng, không chống DBA/binlog hoặc tự tiết lộ.
- Chỉ dữ liệu giả, không deploy công khai; đóng góp/ngày yêu cầu/GVHD do sinh viên xác minh, không viết quy trình hiện tại ở trường.
- CI main/tài liệu cuối đối chiếu riêng sau push; không dùng CI nguồn để nhận SHA main khác đã qua.
- Luôn hạn chế slogan, dùng câu chữ tự nhiên/ngắn; ô đăng nhập không có ví dụ placeholder. Giữ yêu cầu này ở các tuần tiếp theo.
- Bước tiếp: chỉ bắt đầu Tuần10 khi người dùng yêu cầu; xem NGHIEM_THU_TUAN_09.md và báo cáo Tuần9.