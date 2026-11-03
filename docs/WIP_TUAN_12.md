# Tuần 12 — đang triển khai

Bắt đầu thực tế 03/11/2026 theo lệnh người dùng sau khi chức năng Tuần 11 đã qua kiểm tại máy. Nguồn Tuần 11 d60c350, tài liệu7013f2f; CI đang được theo dõi theo đúng SHA, không dùng run tuần trước. Nhánh thực hiện: feat/week12-reports-anomalies.

- Phạm vi: FR-90/91/92/93/94/147/151/158/159; dashboard theo vai trò, biểu đồ, CSV/XLSX/PDF, thống kê phản hồi, cảnh báo khảo sát và UC-GOLD mở rộng bằng Playwright.
- Cùng DTO đã kiểm quyền cho màn hình và tệp xuất. Ẩn danh, ngưỡng mẫu, xung đột lợi ích, quyền theo vai trò/phạm vi và trạng thái công bố được giữ.
- Thêm SurveyAnomalyFlag và lịch sử xem xét; chỉ chỉ số cho Thanh tra, không điểm tuyệt đối/phiếu/tự luận. Không tự kết luận sai phạm hoặc chặn công bố.
- Migration đang được thử trên database W12 riêng có marker; main chưa áp dụng. Đã chụp hash43bảng dữ liệu chính trước thay đổi. Không reset dữ liệu.
- PDF dùng Noto Sans nhúng cục bộ có OFL và nguồn theo commit; không tải font khi website chạy. Phụ thuộc export chỉ ở máy chủ; Playwright là công cụ test.
- Chưa tick FR mới; các kết quả kiểm, seed, UI và CI sẽ ghi khi chạy xong. FR-145 vẫn backlog, FR-160 hoàn tất ở Tuần13.
- UI: **chưa bắt đầu, chờ nghiệm thu tuần 11** theo ghi chú đã lưu; nghiệm thu11 không tự kích hoạt UI. Chỉ mở giai đoạn sau15tuần bằng lệnh BẮT ĐẦU GIAI ĐOẠN UI-n.
