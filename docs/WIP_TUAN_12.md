# Tuần 12 — checkpoint, chưa nghiệm thu toàn bộ

Thực hiện thực tế 03/11/2026 theo lệnh người dùng; mốc kế hoạch giả định 16–22/12. Nhánh `feat/week12-reports-anomalies`. Nguồn Tuần 11 d60c350 và tài liệu 7013f2f được giữ; CI Tuần 11 không thay cho CI của mã Tuần 12.

Nhánh tính năng đã đẩy lên GitHub, CI nguồn Tuần 12 qua; nhánh mã `main` vẫn ở Tuần 11 và chưa gộp khi nghiệm thu thủ công chưa xong. Database chính đã được áp dụng migration/seed riêng, có kiểm bảo toàn bên dưới.

## Đã kiểm tại máy

- Phạm vi đã hiện thực: FR-90/91/92/93/94/147/151/158/159; dashboard theo vai trò, biểu đồ, CSV/XLSX/PDF, thống kê phản hồi, cảnh báo khảo sát và UC-GOLD mở rộng bằng Playwright.
- Dashboard và tệp xuất cùng DTO đã kiểm quyền/ngưỡng. ADMIN đa vai trò chỉ vận hành tài khoản; sinh viên chỉ dữ liệu công việc của mình. Khảo thí chỉ nhóm đánh giá gộp đủ mẫu với ít nhất hai giảng viên có đóng góp LIKERT hợp lệ; Thanh tra bị loại xung đột trước khi gộp. Ô nhỏ và tổng cha có thể suy ngược cùng bị che.
- Kiểm tổng Windows: **1284 passed, 1 skipped / 1285 trong 86 tệp**; lint/typecheck/schema/design qua. Skipped là file-symlink bị hệ điều hành từ chối, không tính thành passed. Build Next.js 16.4.3 qua, đã kiểm truy vết font PDF cục bộ.
- [CI 41588831428](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41588831428) ngày 03/11/2026, đúng SHA nguồn `6692854e97088845ce5b263318dfb1f6239fef04` trên nhánh Tuần 12: **smoke, check và e2e đều success**. Linux qua **1285/1285 phép kiểm, 86/86 tệp**, không skipped. Kết quả chỉ áp dụng cho SHA này; tài liệu hoặc nguồn sửa tiếp đối chiếu riêng.
- Tuần 12 sau sửa: báo cáo **13/13 nhóm MySQL**, bất thường **9/9 nhóm MySQL**, file xuất **10/10 nhóm**; tổng 32 nhóm. Kiểm CSV/XLSX bằng byte và PDF bằng parser; PDF 5 trang đã được mở xem. Không suy kiểm file synthetic thành kiểm quyền database.
- Hồi quy Tuần 9: **12/12**; Tuần 10: **19/19**; Tuần 11: **43 nhóm**. SQL/ràng buộc MySQL **16/16**, demo **19/19** trên database mới. Các bộ dịch vụ chạy tuần tự, dọn fixture theo UUID của lượt chạy.
- E2E **3/3**, lượt cuối khoảng **1,1 phút**: UC-GOLD mở rộng, dashboard mười vai trò, năm vai trò ở desktop/mobile. Kịch bản kết hợp HTTP và trình duyệt; ảnh tự động không được gọi thành thao tác tay. Phiên fixture đã thu hồi/tài khoản bị vô hiệu hóa; lịch sử trong database thử được giữ.
- Migration đã áp dụng lên database chính, thêm SurveyAnomalyFlag và SurveyAnomalyReviewEvent cùng liên kết nguồn hồ sơ. Runtime **45 model**, thiết kế **47**, còn SurveyReminder và ImportBatch chỉ thiết kế.
- Sau migration/seed, hash **43 bảng / 9.451 bản ghi main cũ** giữ nguyên. Seed lặp giữ **45 bảng / 9.519 bản ghi**. Chỉ thêm bundle giả 10 phiếu, 20 đáp án và một cờ chờ xem xét; không sửa bundle cũ, reset dữ liệu hoặc đổi MFA của chủ dự án.
- Sau khi dừng lượt GUI, kiểm lại ngày 03/11/2026 lúc **08:46 UTC** tiếp tục qua cả mốc **43 bảng / 9.451 bản ghi cũ** và **45 bảng / 9.519 bản ghi sau seed**.
- PDF dùng Noto Sans nhúng cục bộ có OFL và nguồn theo commit; không tải font khi website chạy. Phụ thuộc export chỉ ở máy chủ; Playwright là công cụ kiểm thử.

## Lượt GUI đã dừng

- Chrome/demo riêng đã làm: ĐBCL tạo mẫu/đợt phạm vi khoa giả; PĐT xác nhận RS-04; Lãnh đạo phê duyệt để mở và chốt **5 nhiệm vụ**; SV1 chọn **2/2** hai câu Likert, nhập tự luận và nộp **1 phiếu**; SV1 gửi **1 phản hồi ẩn danh loại Giảng dạy**.
- Công cụ điều khiển Windows không xác định đủ chắc chắn URL hiện tại nên chặn thao tác tiếp; lượt kiểm dừng tại đây, không kết luận website lỗi. Helper bổ sung **4 phiếu qua HTTP** và helper truyền thời điểm **endsAt + 1 ms** đều **chưa chạy**; không nhận đã đủ5phiếu hoặc mô phỏng đóng đợt.
- Phần thủ công còn thiếu: đủ mẫu, đóng/tổng hợp/kiểm duyệt/công bố, kết quả/giải trình/xác nhận, xử lý phản hồi/hài lòng, nhánh Khảo thí/Thanh tra và báo cáo/tải tệp. Xem [UC-GOLD mục 8](UC_GOLD_TUAN_12.md#8-lượt-thao-tác-gui-riêng-ngày-03112026--chưa-hoàn-tất); kết quả E2E tự động được giữ riêng.

## Phần còn chờ trước khi chốt

- **Tuần 12 chưa nghiệm thu toàn bộ vì UC-GOLD thủ công chưa hoàn tất.** CI đã qua đúng SHA ghi trên; không dùng CI hoặc E2E để thay phần GUI còn thiếu. Chín FR mới chưa tick. Bằng chứng và giới hạn ở [nghiệm thu kỹ thuật](NGHIEM_THU_TUAN_12.md), [QA](QA_GIAO_DIEN_TUAN_12.md) và [báo cáo tuần](bao-cao-tien-do/tuan-12.md).
- Mốc đã nghiệm thu trước Tuần 12: **188/219 = 85,8%, 68/84 FR**. Mục tiêu sau chốt chín FR/20 điểm: **208/219 = 95,0%, 77/84 FR**; kế hoạch 210/219, chênh hai điểm FR-145. Không dùng checkpoint để tự tick FR trước khi điều kiện chốt được xác nhận.
- FR-145 vẫn backlog; FR-160 chỉ nghiệm thu đầy đủ ở Tuần 13. Không tự bắt đầu Tuần 13. Giữ nguyên các báo cáo lịch sử, dữ liệu giả và khóa MFA của chủ dự án; không deploy công khai.
- UI nâng cấp riêng chưa bắt đầu. Ghi chú điều phối đã lưu vẫn là **“UI: chưa bắt đầu, chờ nghiệm thu tuần 11”**; nghiệm thu tuần hoặc các trang chức năng mới không tự kích hoạt UI-n. Chỉ mở giai đoạn sau 15 tuần bằng lệnh tương ứng của người dùng.
