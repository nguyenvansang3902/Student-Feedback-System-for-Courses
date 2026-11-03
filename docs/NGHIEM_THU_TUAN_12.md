# Nghiệm thu kỹ thuật Tuần 12

Thực hiện ngày03/11/2026 theo lệnh người dùng, sau Tuần11. Mốc kế hoạch giả định16–22/12/2026 tính từ30/09; nhóm đối chiếu lịch trường, không ghi lùi ngày. Nhánh `feat/week12-reports-anomalies`. Mã chức năng và CI đã đạt; **chưa nghiệm thu toàn bộ Tuần12 vì UC-GOLD bằng tay còn dang dở**. Không tick chín FR hoặc cộng 20 điểm trước khi hoàn tất điều kiện này.

## Phạm vi đã hiện thực

| FR | Chức năng và bảo vệ |
| --- | --- |
| FR-90/91 | Dashboard theo10vai trò, bộ lọc có kiểm quyền, biểu đồ và bảng dùng cùng DTO; ô thiếu mẫu không đổi thành0 hoặc vẽ thanh |
| FR-92/93 | CSV có BOM, Excel giữ kiểu số, PDF tiếng Việt có font nhúng cục bộ/phân trang; cùng phạm vi đã áp dụng, audit xuất tệp, chống công thức bảng tính |
| FR-94 | Số lượng/trạng thái, thời gian xử lý, quá hạn và hài lòng; tỉ lệ có mẫu số rõ, không dùng cờ hiện tại để giả số liệu lịch sử |
| FR-147 | PĐT xem sẵn sàng dữ liệu, lỗi/cảnh báo và thống kê phản hồi tổ chức lớp; không nhận danh sách sinh viên trong DTO báo cáo |
| FR-151 | Khảo thí chỉ nhận nhóm đánh giá gộp sau công bố, đủ mẫu và ít nhất2GV có đóng góp LIKERT hợp lệ; không lớp/GV/tự luận |
| FR-158 | Chỉ số đồng nhất/chênh kỳ trước từ10phiếu, ngưỡng cấu hình; Thanh tra xem xét và tạo hồ sơ nguồn BAT_THUONG, không tự chặn công bố |
| FR-159 | Thống kê hồ sơ Thanh tra không định danh, kiểm xung đột trước khi gộp; ô nhỏ và tổng có thể suy ngược cùng được che |

ADMIN chỉ có dashboard vận hành, kể cả tài khoản đa vai trò. Sinh viên chỉ có trạng thái công việc của chính mình. Chọn vai trò không cộng quyền các vai trò để mở rộng phạm vi. Ngưỡng mẫu khảo sát/công bố được giữ; ngưỡng thống kê phản hồi/hồ sơ riêng mặc định5, ĐBCL cấu hình có revision/requestId và audit. Kết quả gộp dùng phân bố/tổng gốc, không lấy trung bình các điểm đã làm tròn.

## Kết quả chạy thật tại máy

- `npm run check`: **1284 passed,1 skipped/1285 trong86tệp** trên Windows; skip là file-symlink bị hệ điều hành từ chối. Lint/typecheck/schema/design qua.
- Bản dựng Next16.4.3 thành công; đã kiểm thông tin truy vết font PDF cục bộ.
- Tuần12: báo cáo **13nhóm MySQL**, cảnh báo **9nhóm MySQL**, tệp xuất **10nhóm** đọc bytes CSV/XLSX và giải mã PDF bằng pypdf; tổng32nhóm. Fixture của hai bộ dịch vụ được dọn theo UUID, không reset DB.
- Hồi quy Tuần9 **12/12**, Tuần10 **19/19**, Tuần11 **43nhóm**. SQL **16/16**, demo **19/19**.
- Playwright **3/3**: UC-GOLD mở rộng, quyền/ngưỡng10vai trò, dashboard5vai trò desktop/mobile. Lượt cuối qua trong khoảng1,1phút; [chi tiết bước HTTP/trình duyệt](UC_GOLD_TUAN_12.md).
- Đã xem12PNG chức năng; ảnh chờ tải của TBM được chụp lại sau khi trạng thái xác nhận hiện rõ. PDF5trang đã render và xem cả5trang, cùng mẫu Thanh tra1trang.
- Runtime **45model**, thiết kế **47**, hai model chỉ thiết kế là SurveyReminder và ImportBatch. Migration thêm SurveyAnomalyFlag/SurveyAnomalyReviewEvent và liên kết nguồn hồ sơ.
- Main sau migration/seed giữ hash **43bảng/9451bản ghi cũ**. Seed lặp giữ **45bảng/9519bản ghi**. Chỉ thêm bundle giả10phiếu/20đápán và1cờ chờ xem xét; không sửa các bundle cũ hoặc MFA.

Một lượt test cảnh báo sau E2E chọn nhầm kỳ liền trước do lịch fixture; đã sửa lịch thử và assertion, giữ nguyên nghiệp vụ. Lượt lint đầu đọc nhầm thư mục build thử đã được sửa bằng ignore đúng thư mục sinh tự động. Các lượt lỗi không được tính là kết quả qua.

Lượt `check` bàn giao lúc15:47 ngày03/11 tiếp tục qua1284test/1skip trong86tệp. Sau khi dừng preview riêng và đối chiếu hash, đã mở lại web/scheduler chính bằng trình khởi động của kho lúc16:04; trang chủ, đăng nhập và health trả200 lúc16:08. Health vẫn ghi database:not_checked; kiểm MySQL và hash ở trên là bằng chứng riêng. Scheduler tiếp tục công việc đến hạn bình thường sau thời điểm đối chiếu hash.

## Giao diện, dữ liệu và giới hạn

[CI41588831428](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41588831428) trên đúng nguồn `6692854e97088845ce5b263318dfb1f6239fef04`: `check`, `smoke`, `e2e` đều thành công. Linux qua **1285/1285 test trong86tệp**, không skip; các bộ MySQL/xuất tệp, build và Chromium E2E3/3 cũng qua. Commit hồ sơ sau đó được phân biệt với SHA nguồn này.

Lượt kiểm tay riêng đã tạo mẫu/đợt qua giao diện, PĐT xác nhận RS-04, lãnh đạo duyệt và mở năm nhiệm vụ; một sinh viên nộp phiếu và gửi phản hồi giảng dạy ẩn danh. Công cụ điều khiển Windows sau đó chặn tiếp tục vì không xác định đủ chắc chắn URL để thực thi chính sách. Không vượt chặn bằng cách khác trong cùng lượt. Còn chờ đủ mẫu, đóng/tổng hợp/kiểm duyệt/công bố, giải trình/xác nhận, xử lý/đánh giá phản hồi và các nhánh Khảo thí/Thanh tra, xem/xuất báo cáo bằng tay. Hai ảnh kiểm trực tiếp được lưu riêng; các helper bổ sung bốn phiếu/đồng hồ giả **chưa chạy**. Xem Mục8 của UC-GOLD.

[QA giao diện](QA_GIAO_DIEN_TUAN_12.md) phân biệt ảnh tự động, thao tác trực tiếp và phần chưa kiểm. E2E kết hợp HTTP và trình duyệt, không gọi mọi bước là thao tác tay. Catalog/tài khoản fixture được tạo trước; các bước nghiệp vụ được thực hiện qua ứng dụng. Sau E2E, phiên fixture bị thu hồi/tài khoản bị vô hiệu hóa, lịch sử còn lại trong DB thử; không nhận DB thử hoàn toàn trống.

Tệp xuất không chứa định danh sinh viên hoặc nội dung phản hồi/tự luận. Chưa chứng nhận chống mọi phép suy luận qua nhiều lần đọc và thay đổi tập dữ liệu. Ẩn danh ở mức ứng dụng, không chống DBA/log hạ tầng/tự tiết lộ. Chưa kiểm tải1500request, toàn bộ thiết bị, axe/Lighthouse hoặc chứng nhận WCAG. Hồ sơ Thanh tra chỉ quản lý quy trình, không thay thủ tục chính thức.

Nguồn/CI theo SHA, số đo và hash ảnh ghi tại [verification.json](assets/tuan-12/verification.json). Kiểm tay toàn luồng còn chờ; nhánh chính vẫn giữ mốc Tuần11, mã Tuần12 được lưu trên nhánh tính năng để tiếp tục đúng chỗ. Tiến độ nghiệm thu giữ **188/219,68/84FR**; sau khi đủ điều kiện mới chốt mục tiêu208/219,77/84FR. FR-145 vẫn backlog, FR-160 chỉ nghiệm thu toàn bộ ởTuần13. UI-n vẫn chưa bắt đầu; không tự tiếp tục Tuần13.

[Công thức báo cáo](CONG_THUC_BAO_CAO.md), [cảnh báo bất thường](CANH_BAO_BAT_THUONG_TUAN_12.md), [ADR-012](decisions/ADR-012-bao-cao-va-nguong-du-lieu.md), [báo cáo tuần](bao-cao-tien-do/tuan-12.md), [giải thích](GIAI_THICH/tuan-12.md).
