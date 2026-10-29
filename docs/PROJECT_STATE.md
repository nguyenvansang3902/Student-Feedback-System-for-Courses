# Trạng thái dự án

- Đề tài: website khảo sát và phản hồi sinh viên về môn học; 15 tuần từ 30/09/2026, khởi động thực tế 02/10.
- Tuần hiện tại: Tuần 7 — đang nghiệm thu, thực hiện ngày29/10/2026 (Asia/Saigon).
- Đã xác minh Tuần 1–6 hoàn thành ở main5346de9 trước điều chỉnh; không sửa báo cáo tuần cũ hoặc ghi lùi ngày.
- Người dùng đã yêu cầu tiếp tục tuần kế tiếp sau G1 và tiếp tục Tuần7; đây là lệnh bằng lời tự nhiên, không gán đã gõ câu lệnh mẫu.

## Nền và việc bù đã nghiệm thu

- Auth/JWT/refresh, ADMIN TOTP, RBAC, quản lý người dùng, danh mục/import và mẫu phiếu FR30–35 đã có từ Tuần1–6.
- Điều chỉnh:10 vai trò; PĐT ghi dữ liệu đào tạo/import, ADMIN MFA ghi khoa/bộ môn, ĐBCL chỉ đọc danh mục và vẫn soạn mẫu.
- Ba role mới gán GLOBAL hợp lệ; cấu hình MFA nhận đủ10 vai trò, ADMIN vẫn bắt buộc2FA.
- Mở khóa kỳ cần lý do10–500 ký tự; mutex/CAS/fresh guard, audit và email ĐBCL sau commit; UI báo kết quả gửi.
- isAssessmentGroup default false xuyên editor/API/DB/preview/clone/version; mẫu khóa không sửa được.
- Seed thêm PDT2026001/KT2026001/TT2026001/TT2026002, family mặc định3 nhóm7 câu/1 nhóm đánh giá; giữ default tùy chỉnh.
- Migration20261028220000_amendment_01_roles_assessment đã deploy main; npm db:deploy kiểm enum cũ và đúng Docker/cổng/database trước DDL.
- Hash16 tập main khớp trước/sau:1.568 tài khoản cũ, cây2 mẫu cũ, đợt/task/78 phiếu/234 đáp án/3 tổng hợp/phản hồi/lịch sử.
- Runtime31/blueprint46;7 bảng bổ sung và Feedback.identityLevel chỉ thiết kế, chưa migrate/service/UI.
- Lưu prompt nguyên văn; cập nhật đặc tả/kế hoạch/mẫu báo cáo/truy vết/ma trận; AGENTS chỉ thêm3 dòng; giữ5.6/8.3–8.6.

## Bằng chứng và tiến độ

- Check29/10 02:00:346/346 trong25 file; schema/ERD/lint/TypeScript và build Next16.4.3 qua.
- SQL16, HTTP auth24/quản trị28/danh mục23/mẫu20, CLI5, seed12 nhóm qua; fixture dọn.
- UI7 nhóm/16 viewport/16 PNG đã xem;0JSerror/overflow/thiếu nhãn; seed không đổi. ERD4 Mermaid render qua/9 PNG đã xem.
- CI mã023b619: https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40750644805 đã qua check/smoke; CI main/tài liệu cuối đối chiếu đúng SHA trong Actions.
- FR-140/141/148 đã tick: **71/219 = 32,4%**,25/84 FR. Lịch sử Tuần6 là62/163=38,0%; mẫu số tăng do21 FR mới.
- FR-160/TC-ALL-01 đạt phần hiện có; nghiệm thu toàn bộ/kiểm tệp xuất chờ Tuần13 nên chưa tick, mốc tính kế hoạch là13.
- Báo cáo: NGHIEM_THU_BO_SUNG_01.md; QA_GIAO_DIEN_BO_SUNG_01.md; SO_DO_BO_SUNG_01.md; TRUY_VET.md.

## Giới hạn và việc tiếp theo

- SMTP sau commit chưa có outbox/retry bền; FAILED/NO_RECIPIENT hiển thị rõ, không nhận gửi thành công giả.
- Hai tài khoản Thanh tra mới chỉ là nền; chưa có hồ sơ hoặc phép thử xung đột lợi ích tương lai.
- Seed readiness/phản hồi mới/hồ sơ/cảnh báo/kết quả gộp bổ sung khi triển khai đúng Tuần7/9–12.
- Ước lượng trong báo cáo G1; nhóm tự điền ngày/tên GVHD yêu cầu. Không gán công AI thành đóng góp sinh viên.
- Chỉ dữ liệu giả; không reset/xóa DB/volume hoặc deploy công khai. Mốc15 tuần giữ nguyên, không tự cắt tính năng.
- Tuần 7: workflow ĐBCL → PĐT → lãnh đạo, readiness, mở/đóng và chốt task, cấu hình ngưỡng; chưa nghiệm thu. Không làm giao diện trả lời Tuần 8.

## Phiên Tuần 7 đang thực hiện

- Nguồn đang ở nhánh feat/week7-survey-campaigns; không tick FR trước kiểm thử thực tế.
- Người dùng đã chọn chặn khóa học kỳ nếu còn đợt DA_DUYET hoặc DANG_MO (giải quyết tình huống BR-17/53).
- Migration mới gặp MySQL 3780 do collation bảng mới khác khóa ngoại hiện có; đang phục hồi từng DDL đã áp dụng, không reset hoặc xóa bảng/dữ liệu.
- Snapshot hash 24 tập dữ liệu cũ được giữ trong .local để đối chiếu sau migration/seed.
