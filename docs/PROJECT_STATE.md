# Trạng thái dự án

- Đề tài: website khảo sát và phản hồi sinh viên về môn học;15tuần từ30/09/2026, khởi động thực tế02/10.
- Tuần hiện tại: Tuần 7 — đã nghiệm thu phần chính ngày29/10/2026 (Asia/Saigon).
- Người dùng yêu cầu tiếp tục tuần kế tiếp sau G1 và tiếp tục Tuần7 bằng lời tự nhiên; không gán là đã gõ câu lệnh mẫu.
- Tuần1–6/G1 và báo cáo lịch sử được giữ. Mốc Tuần7 giả định11–17/11; làm sớm theo lệnh, không ghi lùi ngày.

## Phần đã nghiệm thu

- ĐBCL tạo/sửa/trình đợt; bốn phạm vi, lịch giờ Việt Nam và ngưỡng riêng.
- PĐT kiểm RS-01–06, lỗi chặn/cảnh báo cần ghi chú; xác nhận/trả về và lưu snapshot/hash/người/thời gian.
- Lãnh đạo duyệt/từ chối, duyệt khóa phiên bản mẫu cùng transaction; duyệt muộn có thể mở ngay khi đến giờ.
- Scheduler/ensure mở và đóng idempotent, chốt task từ đăng ký hiện tại; drift vẫn mở/audit/cảnh báo PĐT-ĐBCL; sau mở không resync task.
- Rút trước mở cần vòng xác nhận/duyệt mới; gia hạn tăng hạn, đóng sớm/hủy theo trạng thái có lý do; tiến độ task không trả định danh sinh viên/đáp án.
- FR-100: ADMIN MFA ghi cấu hình bằng TOTP mới/CAS; ĐBCL/PĐT/LĐ chỉ đọc. Bốn ngưỡng lưu riêng theo đợt, ngưỡng RS-04 dùng cấu hình readiness hiện tại.
- Người dùng chọn chặn khóa học kỳ khi còn DA_DUYET hoặc DANG_MO; mutex chung với duyệt/mở, đã kiểm race.
- Queue email có dedup/lease/CAS/renew trước SMTP/retry5lần; SMTP ngoài giao dịch, scheduler xử lý thư qua Mailpit cục bộ.

## Bằng chứng nguồn cuối

- Nguồn 39d56485cb42281ed97eb482a317967dfabdce5b; [CI 40858131706](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40858131706) check/smoke thành công đúng SHA. CI main/tài liệu cuối đối chiếu SHA riêng trong Actions.
- npm run check:572/572 trong32file; schema/ERD/lint/TypeScript qua. npm run build Next16.4.3 qua.
- SQL16; HTTP Tuần7 19/19, ngưỡng/email13/13; seed14/14; fixture dọn, cấu hình test khôi phục.
- UI11nhóm/26viewport/26PNG đã xem, không pageerror/Reacterror/tràn ngang/thiếu nhãn trong phép đo; ADMIN TOTP thật. Sơ đồ5Mermaid/10PNG đã xem.
- Bảy migration đồng bộ; runtime34/blueprint46. Sửa collation migration mới dở bằng DDL đã đối chiếu, không reset/drop. Hash24tập dữ liệu cũ khớp sau migration/seed; giữ78phiếu/234đáp án/3tổng hợp cũ.
- Dependency audit0; kiểm648liên kết nội bộ,5mục bảo vệ,48tệp lịch sử và AGENTS/prompt bổ sung không đổi.
- Tiến độ:103/219=47,0%,36/84FR. FR-40–46/100/142–144 tick; FR-145/160 chưa tick.

## Cách mở và phần còn lại

- Web chính http://localhost:3000/dot-khao-sat; demo DBCL2026001/PDT2026001/LD2026001 theo README. Web và scheduler nền đã được mở trong phiên; sau tắt máy khởi động lại theo README.
- FR-145 ImportBatch/hoàn tác là P1 có điều kiện, chưa thực hiện, giữ backlog; chưa có quyết định cắt của người dùng.
- Tuần8 là danh sách nhiệm vụ/form/nộp ẩn danh; chỉ bắt đầu khi người dùng yêu cầu. Kết quả/công bố/Khảo thí/Thanh tra theo tuần sau, không suy hoàn thành từ seed.
- Scheduler cần chạy để xử lý theo lịch mà không đợi truy cập. SMTP vẫn có cửa sổ gửi lặp sau crash giữa SMTP nhận và ghi SENT; không nhận exactly-once email.
- Chưa kiểm tải1500request/WCAG hoặc mọi thiết bị. Chỉ dữ liệu giả, không deploy công khai. Đóng góp/ngày yêu cầu/tên GVHD do sinh viên tự xác minh.
- Tài liệu: NGHIEM_THU_TUAN_07.md, QA_GIAO_DIEN_TUAN_07.md, SO_DO_TUAN_07.md, ADR-008, bao-cao-tien-do/tuan-07.md và nháp chương4.
