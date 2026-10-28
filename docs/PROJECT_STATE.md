# Trạng thái dự án

- Đề tài: website khảo sát và phản hồi sinh viên về môn học; kế hoạch15tuần từ30/09/2026, khởi động thực tế02/10.
- Tuần hiện tại: Tuần 6 — đã nghiệm thu; chốt việc bù G1 của Điều chỉnh số01, thực hiện28–29/10/2026 (Asia/Saigon).
- Tuần1–6 đã hoàn thành ở main5346de9 trước điều chỉnh; không ghi lùi ngày hoặc sửa báo cáo tuần cũ.
- Chưa có lệnh BẮT ĐẦU TUẦN 7. Chỉ làm G1; sau G1 dừng, không triển khai workflow các tuần sau.

## Nền đã nghiệm thu trước điều chỉnh

- Auth/JWT/refresh, ADMIN TOTP, RBAC, quản lý người dùng, danh mục/import và mẫu phiếu FR30–35.
- Tuần6:279test/24file, SQL10, HTTPauth24+quản trị28+danh mục22+mẫu20, CLI5, seed11; build qua.
- CI mã68087ed đã qua check/smoke; bằng chứng lịch sử: NGHIEM_THU_TUAN_06.md và báo cáo tuan-06.md.
- Tiến độ lịch sử62/163=38,0%; Điều chỉnh01 thêm21FR, mẫu số mới219. Không so hai tỷ lệ như cùng phạm vi.

## Việc bù G1

- Lưu nguyên văn BO_SUNG_01_TAC_NHAN.md; cập nhật đặc tả, kế hoạch, mẫu báo cáo, ma trận10vai trò và truy vết; AGENTS chỉ thêm3dòng.
- Role thêm PHONG_DAO_TAO/PHONG_KHAO_THI/THANH_TRA; gán GLOBAL hợp lệ; MFA cấu hình được đủ10vai trò.
- PĐT ghi dữ liệu đào tạo/import; ADMIN MFA ghi khoa/bộ môn; ĐBCL chỉ đọc danh mục và vẫn quản lý mẫu phiếu.
- Mở khóa kỳ cần lý do10–500ký tự, CAS/mutex/fresh guard, audit và email ĐBCL sau commit; UI hiển thị kết quả gửi.
- isAssessmentGroup defaultfalse đi xuyên editor/DTO/DB/preview/version/clone; mẫu khóa không sửa được.
- Seed thêm PDT2026001, KT2026001, TT2026001, TT2026002 và family mặc định3nhóm7câu/1nhóm đánh giá; giữ lựa chọn tùy chỉnh.
- Migration20261028220000_amendment_01_roles_assessment đã deploy main; npm db:deploy có preflight enum cũ và đúng Docker/cổng đích.
- Đã đối chiếu16tập hash:1.568tài khoản cũ, cây2mẫu cũ, đợt/task/78phiếu/234đáp án/3tổng hợp/phản hồi/lịch sử không đổi.
- Runtime31/blueprint46;7bảng bổ sung và Feedback.identityLevel chỉ thiết kế, chưa migrate/chưa có service/UI.
- Kiểm cục bộ và UI đã qua trong phạm vi ghi tại NGHIEM_THU_BO_SUNG_01.md; đang chốt gate/CI trước tick FR mới.

## Giới hạn và việc tiếp theo

- FR160/TC-ALL-01 chỉ kiểm chức năng hiện có; kiểm kết quả/hồ sơ/thống kê/tệp xuất còn chờ tuần tương ứng, chưa tick toàn bộ.
- SMTP sau commit chưa có outbox/retry bền; FAILED/NO_RECIPIENT được báo rõ, không nhận thông báo thành công giả.
- Hai tài khoản Thanh tra phục vụ demo nền; chưa có hồ sơ hoặc phép thử xung đột lợi ích tương lai.
- Seed readiness, phản hồi mới, hồ sơ TT, cảnh báo và kết quả gộp bổ sung khi triển khai Tuần7/9–12.
- Mốc15tuần giữ nguyên; ước lượng tác động trong báo cáo G1, sinh viên tự điền ngày/tên GVHD yêu cầu.
- Chỉ dữ liệu giả; không reset/xóa DB/volume, không deploy công khai, không ghi công AI thành đóng góp sinh viên.
- Chạy theo README; PĐT dùng /danh-muc, ĐBCL dùng /mau-phieu. Chờ đúng lệnh BẮT ĐẦU TUẦN 7 sau G1.
