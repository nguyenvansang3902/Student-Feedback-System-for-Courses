# Trạng thái dự án

- Đề tài: khảo sát và phản hồi sinh viên về môn học; 15 tuần từ 30/09/2026, khởi động thực tế 02/10.
- Tuần hiện tại: Tuần 8 — đã nghiệm thu FR-50–54 ngày 30/10/2026, theo yêu cầu bắt đầu 29/10 và tiếp tục của người dùng.
- Mốc kế hoạch giả định: 18–24/11; làm sớm theo lệnh, không ghi lùi ngày, nhóm đối chiếu lịch trường.
- Nguồn ứng dụng: 6edad31fef16ee11f5ace82645107b0b7153742d, nhánh feat/week8-anonymous-surveys; CI 40925339620 qua check/smoke đúng SHA.

## Đã hoàn thành

- Tuần 1–6/G1 và phần chính Tuần 7 đã nghiệm thu; báo cáo và ảnh lịch sử giữ nguyên, xem NGHIEM_THU_TUAN_07.md.
- Tuần 8: nhiệm vụ của chính sinh viên, form năm loại/NA/hai thang, nháp cục bộ, nộp ẩn danh một lần và xác nhận.
- Nộp bằng CAS task PENDING→DONE, UUID phiếu/đáp án trong cùng giao dịch; ngày Việt Nam, không cầu nối danh tính hoặc audit nộp.
- Đọc lại phiên/quyền, IDOR trả 404, CSRF riêng và body 256 KiB; nhiệm vụ đã chốt quyết định quyền, không xét lại Enrollment.
- BR-04 nhận đúng endsAt, đóng sau mốc; server quyết định, đồng hồ client chỉ hiển thị.
- Check cuối: 646/646 trong 39 tệp, schema/ERD/lint/TypeScript và build Next 16.4.3 qua trên nguồn 6edad31.
- HTTP 16/16, fixture sạch;20 POST chỉ 1 thành công/19 bị 409; lỗi chèn đáp án rollback PENDING/0 phiếu/0 đáp án rồi retry thành công.
- UI: 13 nhóm/17 trạng thái/34 viewport/34 PNG đã xem; không lỗi/tràn ngang/thiếu nhãn trong phép đo, fixture sạch và seed giữ nguyên.
- Không migration mới: 34 runtime/46 design/12 model chỉ thiết kế;27 tập dữ liệu main trước/sau khớp hash, không reset DB/volume.
- ADR009, 5 câu bảo vệ, 3 sơ đồ mới/ERD, báo cáo 10 mục, ảnh, README, truy vết và nhật ký AI đã cập nhật.
- Tiến độ: 117/219=53,4%, 41/84 FR; M6=14/14. Kế hoạch Tuần 8 là 119/219, còn 2 điểm của FR-145.

## Quyết định, cách chạy và phần còn lại

- Người dùng chọn chặn khóa học kỳ khi còn DA_DUYET/DANG_MO; mutex chung với duyệt/mở/khóa.
- Web chính http://localhost:3000/khao-sat và scheduler đã mở lại; MySQL/Mailpit healthy, khách vào khảo sát chuyển về đăng nhập.
- Xem form: DEMO-SV00001/Demo2026!HocTap, chọn đợt còn hạn. SV2026001 có thể trống; hướng dẫn chi tiết theo README.
- ĐBCL/PĐT/lãnh đạo dùng /dot-khao-sat; tài khoản demo theo README. Sau tắt máy khởi động lại theo README.
- FR-145 ImportBatch/hoàn tác là P1 có điều kiện chưa làm, giữ backlog và chưa được người dùng cắt; FR-160 đầy đủ chờ Tuần 13.
- 5.6(d) đã kiểm DTO/log hiện có; export CSV/Excel/PDF kết quả chưa có, phải kiểm khi Tuần 12 hiện thực. Giữ đặc tả bảo vệ.
- Chưa kiểm tải 1.500 request/WCAG/mọi thiết bị/log proxy; ẩn danh ở mức ứng dụng, không chống DBA/binlog/tự tiết lộ.
- CI main/tài liệu cuối đối chiếu riêng sau push; chưa dùng CI nguồn để nhận SHA main khác đã qua.
- Chỉ dữ liệu giả, không deploy công khai. Đóng góp/ngày yêu cầu/tên GVHD do sinh viên tự xác minh; không viết quy trình hiện tại ở trường.
- Bước tiếp: giữ nghiệm thu Tuần 8, theo dõi FR-145; chỉ bắt đầu Tuần 9 khi người dùng yêu cầu.
