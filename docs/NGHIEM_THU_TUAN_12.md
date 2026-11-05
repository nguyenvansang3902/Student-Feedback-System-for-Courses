# Nghiệm thu kỹ thuật Tuần 12

Thực hiện 03–05/11/2026; mốc kế hoạch giả định 16–22/12. Đã nghiệm thu chín FR-90/91/92/93/94/147/151/158/159, thêm 20 điểm, lũy kế sau Tuần 12 là 208/219,77/84 FR. Tuần 13 chốt thêm FR-160, tổng hiện tại 211/219=96,3%,78/84 FR. [CI 41904262769](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41904262769) của nguồn `831d14decd9d6a562a1f9ecc0a53f6a4fadc8248` qua check/e2e/smoke; [check/build](assets/tuan-13/check-build-after-calendar.json), [kiểm tay](assets/tuan-13/manual-uc-gold.json), [CSV](assets/tuan-13/manual-export-verification.json) đều có bằng chứng.

## Cập nhật kiểm tay ngày 04–05/11

[Bằng chứng kiểm tay](assets/tuan-13/manual-uc-gold.json):5/5 nhiệm vụ DONE,5 phiếu,100%, điểm 2,00; tự luận chờ duyệt chặn công bố, sau kiểm duyệt có lý do đã công bố với 0 chờ. Giảng viên gửi giải trình/TBM xác nhận; phản hồi giảng dạy được xử lý, sinh viên đánh giá 4/5 và tự đóng. Khảo thí xử lý đúng hàng đợi thi và xem nhóm đánh giá gộp có 5 phiếu/100%/2,00 với ít nhất 2 GV góp điểm hợp lệ. Thanh tra đi đủ nhận/xác minh/ghi chú giả/kết luận giả `KHONG_DU_THONG_TIN`/thông báo/đóng. Lãnh đạo xem đúng đợt và tải CSV 3.745 byte; header vai trò/bộ lọc đã đọc lại đúng. Tám PNG kiểm tay đã mở xem, tách khỏi ảnh E2E.

UC-GOLD kiểm tay đã qua đủ các bước trong kịch bản ngày 05/11: GV xem kết quả lớp mình, ĐBCL xem/xuất báo cáo và các nhánh công bố, giải trình/TBM, phản hồi đánh giá 4/5, Khảo thí/Thanh tra, Lãnh đạo CSV đều đã quan sát trên GUI. Tám PNG đã mở xem; CSV Lãnh đạo 3.745 byte và ĐBCL 3.011 byte có BOM, đúng vai trò/bộ lọc/5 phiếu/100%/mean số 2, không định danh tài khoản. Chỉ CUA browser UI trên demo giả, không helper HTTP/đồng hồ giả/main writes; không nhận chờ SLA bằng tay. Check/build nguồn mới đã qua, CI đã qua; các kết quả 03/11 bên dưới là lịch sử.

## Phạm vi đã hiện thực

| FR | Chức năng và bảo vệ |
| --- | --- |
| FR-90/91 | Dashboard theo 10 vai trò, bộ lọc có kiểm quyền, biểu đồ và bảng dùng cùng DTO; ô thiếu mẫu không đổi thành 0 hoặc vẽ thanh |
| FR-92/93 | CSV có BOM, Excel giữ kiểu số, PDF tiếng Việt có font nhúng cục bộ/phân trang; cùng phạm vi đã áp dụng, audit xuất tệp, chống công thức bảng tính |
| FR-94 | Số lượng/trạng thái, thời gian xử lý, quá hạn và hài lòng; tỉ lệ có mẫu số rõ, không dùng cờ hiện tại để giả số liệu lịch sử |
| FR-147 | PĐT xem sẵn sàng dữ liệu, lỗi/cảnh báo và thống kê phản hồi tổ chức lớp; không nhận danh sách sinh viên trong DTO báo cáo |
| FR-151 | Khảo thí chỉ nhận nhóm đánh giá gộp sau công bố, đủ mẫu và ít nhất 2 GV có đóng góp LIKERT hợp lệ; không lớp/GV/tự luận |
| FR-158 | Chỉ số đồng nhất/chênh kỳ trước từ 10 phiếu, ngưỡng cấu hình; Thanh tra xem xét và tạo hồ sơ nguồn BAT_THUONG, không tự chặn công bố |
| FR-159 | Thống kê hồ sơ Thanh tra không định danh, kiểm xung đột trước khi gộp; ô nhỏ và tổng có thể suy ngược cùng được che |

ADMIN chỉ có dashboard vận hành, kể cả tài khoản đa vai trò. Sinh viên chỉ có trạng thái công việc của chính mình. Chọn vai trò không cộng quyền các vai trò để mở rộng phạm vi. Ngưỡng mẫu khảo sát/công bố được giữ; ngưỡng thống kê phản hồi/hồ sơ riêng mặc định 5, ĐBCL cấu hình có revision/requestId và audit. Kết quả gộp dùng phân bố/tổng gốc, không lấy trung bình các điểm đã làm tròn.

## Kết quả chạy thật tại máy

- `npm run check`: **1284 passed,1 skipped/1285 trong 86 tệp** trên Windows; skip là file-symlink bị hệ điều hành từ chối. Lint/typecheck/schema/design qua.
- Bản dựng Next 16.4.3 thành công; đã kiểm thông tin truy vết font PDF cục bộ.
- Tuần 12: báo cáo **13 nhóm MySQL**, cảnh báo **9 nhóm MySQL**, tệp xuất **10 nhóm** đọc bytes CSV/XLSX và giải mã PDF bằng pypdf; tổng 32 nhóm. Fixture của hai bộ dịch vụ được dọn theo UUID, không reset DB.
- Hồi quy Tuần 9 **12/12**, Tuần 10 **19/19**, Tuần 11 **43 nhóm**. SQL **16/16**, demo **19/19**.
- Playwright **3/3**: UC-GOLD mở rộng, quyền/ngưỡng 10 vai trò, dashboard 5 vai trò desktop/mobile. Lượt cuối qua trong khoảng 1,1 phút; [chi tiết bước HTTP/trình duyệt](UC_GOLD_TUAN_12.md).
- Đã xem 12 PNG chức năng; ảnh chờ tải của TBM được chụp lại sau khi trạng thái xác nhận hiện rõ. PDF 5 trang đã render và xem cả 5 trang, cùng mẫu Thanh tra 1 trang.
- Runtime **45 model**, thiết kế **47**, hai model chỉ thiết kế là SurveyReminder và ImportBatch. Migration thêm SurveyAnomalyFlag/SurveyAnomalyReviewEvent và liên kết nguồn hồ sơ.
- Main sau migration/seed giữ hash **43 bảng/9451 bản ghi cũ**. Seed lặp giữ **45 bảng/9519 bản ghi**. Chỉ thêm bundle giả 10 phiếu/20 đápán và 1 cờ chờ xem xét; không sửa các bundle cũ hoặc MFA.

Một lượt test cảnh báo sau E2E chọn nhầm kỳ liền trước do lịch fixture; đã sửa lịch thử và assertion, giữ nguyên nghiệp vụ. Lượt lint đầu đọc nhầm thư mục build thử đã được sửa bằng ignore đúng thư mục sinh tự động. Các lượt lỗi không được tính là kết quả qua.

Lượt `check` bàn giao lúc 15:47 ngày 03/11 tiếp tục qua 1284 test/1 skip trong 86 tệp. Sau khi dừng preview riêng và đối chiếu hash, đã mở lại web/scheduler chính bằng trình khởi động của kho lúc 16:04; trang chủ, đăng nhập và health trả 200 lúc 16:08. Health vẫn ghi database:not_checked; kiểm MySQL và hash ở trên là bằng chứng riêng. Scheduler tiếp tục công việc đến hạn bình thường sau thời điểm đối chiếu hash.

## Giao diện, dữ liệu và giới hạn

[CI 41588831428](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41588831428) trên đúng nguồn `6692854e97088845ce5b263318dfb1f6239fef04`: `check`, `smoke`, `e2e` đều thành công. Linux qua **1285/1285 test trong 86 tệp**, không skip; các bộ MySQL/xuất tệp, build và Chromium E2E 3/3 cũng qua. Commit hồ sơ sau đó được phân biệt với SHA nguồn này.

**Lịch sử 03/11:** lượt GUI dừng sau một phiếu/một phản hồi do không xác định URL đủ chắc chắn; helper HTTP/đồng hồ giả chưa chạy. Đã tiếp tục đủ bước đủ các bước trong kịch bản 04–05/11 tại UC-GOLD mục 9, không coi checkpoint bị chặn là trạng thái hiện tại.

[QA giao diện](QA_GIAO_DIEN_TUAN_12.md) phân biệt ảnh tự động, thao tác trực tiếp và phần chưa kiểm. E2E kết hợp HTTP và trình duyệt, không gọi mọi bước là thao tác tay. Catalog/tài khoản fixture được tạo trước; các bước nghiệp vụ được thực hiện qua ứng dụng. Sau E2E, phiên fixture bị thu hồi/tài khoản bị vô hiệu hóa, lịch sử còn lại trong DB thử; không nhận DB thử hoàn toàn trống.

Tệp xuất không chứa định danh sinh viên hoặc nội dung phản hồi/tự luận. Chưa chứng nhận chống mọi phép suy luận qua nhiều lần đọc và thay đổi tập dữ liệu. Ẩn danh ở mức ứng dụng, không chống DBA/log hạ tầng/tự tiết lộ. Chưa kiểm tải 1500 request, toàn bộ thiết bị, axe/Lighthouse hoặc chứng nhận WCAG. Hồ sơ Thanh tra chỉ quản lý quy trình, không thay thủ tục chính thức.

Bằng chứng 03/11 tại [verification.json](assets/tuan-12/verification.json) giữ lịch sử; phần tiếp tục và nghiệm thu 05/11 theo [kiểm tay](assets/tuan-13/manual-uc-gold.json) và [CI nguồn mới](assets/tuan-13/ci-source-831d14d.json). Đã chốtTuần 12 thêm 20 điểm; hiện tại sau Tuần 13 là 211/219,78/84 FR. FR-145 backlog; không bắt đầu Tuần 14/UI-n. Main mã vẫnTuần 11 đến khi phiên chính commit hồ sơ/gộp nguồn.

[Công thức báo cáo](CONG_THUC_BAO_CAO.md), [cảnh báo bất thường](CANH_BAO_BAT_THUONG_TUAN_12.md), [ADR-012](decisions/ADR-012-bao-cao-va-nguong-du-lieu.md), [báo cáo tuần](bao-cao-tien-do/tuan-12.md), [giải thích](GIAI_THICH/tuan-12.md).
