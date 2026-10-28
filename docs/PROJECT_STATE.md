# Trạng thái dự án

- Đề tài: website quản lý khảo sát và phản hồi sinh viên về môn học; 15 tuần từ 30/09/2026.
- Khởi động 02/10; Tuần 2 làm 21/10, Tuần 3 làm 21–22/10, Tuần 4–5 làm 22/10; không ghi lùi ngày.
- Tuần hiện tại: Tuần 6 — mẫu phiếu khảo sát; bắt đầu 22/10, tiếp tục 28/10/2026 theo lệnh người dùng.
- Mốc kế hoạch Tuần 6 giả định 04–10/11; làm sớm theo yêu cầu, nhóm đối chiếu lịch trường.

## Nền đã nghiệm thu đến Tuần 5

- Auth/MFA/RBAC, CRUD danh mục/khóa kỳ, import CSV/XLSX, demo riêng: FR cũ 46/163 = 28,2%.
- Main 4969ad7 có CI 39776322662 check+smoke xanh; giữ dữ liệu, bốn file nguồn và bằng chứng lịch sử.
- Seed 3 size, 2 đợt và phản hồi giả được phép làm sớm; không có UI/API nghiệp vụ các tuần sau.

## Tuần 6 đã nghiệm thu

- Service/policy mẫu phiếu: nhóm/câu/thứ tự, đủ 5 loại, trọng số, bắt buộc/NA, phiên bản/khóa/nhân bản/mặc định.
- Chỉ ĐBCL GLOBAL thao tác; kiểm đủ 7 vai trò, ADMIN không có quyền ngầm. Origin/CSRF riêng templates.
- Ghi giữ mutex đầu transaction, đọc lại phiên/quyền và CAS expectedRevision; khóa/đợt đã duyệt/có đáp án chặn sửa.
- Migration 20261022125000_week6_template_revision đã deploy main: thêm revision1+updatedAt, không xóa dữ liệu.
- Runtime31/blueprint39; bốn bảng mẫu có chức năng, 11 bảng khác còn chỉ seed. Hai schema đồng bộ qua kiểm thiết kế.
- Thêm family seed mặc định mới đủ 5 loại, giữ nội dung/ID mẫu cũ và lựa chọn mặc định tùy chỉnh.
- Check279/279 trong24file, lint/typecheck/ERD, SQL10 và build Next16.4.3 qua ngày28/10; audit full/production0.
- HTTP/MySQL Tuần6 20/20; hồi quy auth24, CLI5, Tuần4 28, Tuần5 22 qua, fixture dọn. Seed11/11 qua.
- UI14nhóm/10viewport qua,0JSerror/overflow/thiếu nhãn; fixture dọn, seed giữ nguyên. 10PNG và ERD mới đã xem.
- CI40633183047 đúng mã68087ed đã qua check+smoke; CI main/tài liệu cuối đối chiếu đúng SHA trong Actions.
- FR30–35 đã tick:62/163=38,0%, M4=16/16; ADR007, giải thích5câu, nghiệm thu/báo cáo9mục/QA đã cập nhật.

## Giới hạn

- Đợt khảo sát/phê duyệt, nộp phiếu, kết quả và xử lý phản hồi vẫn theo các tuần sau.
- Preview chỉ thử giao diện; không tạo task/response/answer. SMTP chưa outbox; MFA chưa xoay ciphertext tự động.
- Chỉ dữ liệu giả; không reset/xóa DB/volume, không deploy công khai, không gán đóng góp sinh viên.

## Chạy và tiếp theo

- README: Compose, auth:key, db:prepare/db:deploy/db:seed, dev; mở localhost:3000; DBCL2026001 để thử mẫu.
- Dừng đúng Tuần6; khi được yêu cầu Tuần7 mới làm đợt/phê duyệt, tích hợp khóa mẫu trong transaction duyệt.
