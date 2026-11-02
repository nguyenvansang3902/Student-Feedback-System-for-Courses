# Nghiệm thu Tuần 10 — phản hồi và tiếp nhận Thanh tra

**Thực hiện:** 01–02/11/2026 (Asia/Saigon), theo yêu cầu trực tiếp của người dùng. **Mốc kế hoạch giả định:** 02–08/12/2026, tính tuần bảy ngày từ 30/09; nhóm đối chiếu lịch trường. Không ghi lùi ngày hoặc điền thay ngày/tên người yêu cầu của GVHD.

Đã nghiệm thu phần chức năng **FR-70/71/72/73/76/146/149/153/155** trên nguồn `8ffa99f6e67b06b579a3576506395e9856d1dd1d`, nhánh `feat/week10-feedback-core`. [CI 41414188239](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41414188239) đã qua cả `check` và `smoke` đúng SHA: **1002/1002 kiểm thử trong 63 tệp trên Linux**, bản dựng Next 16.4.3 qua. Tệp khởi động, tài liệu và ảnh đã được chốt; chỉ ghi nhận phần tiếp nhận Thanh tra trong phạm vi tuần này. Các commit tài liệu sau nguồn trên giữ nguyên mã chạy, CI main đối chiếu riêng trên Actions.

## Phạm vi được nghiệm thu

| Yêu cầu | Hành vi đã hiện thực và kiểm tra |
| --- | --- |
| FR-70; BR-17/20/24/28 | Sinh viên gửi cho lớp đã đăng ký trong kỳ được phép; loại, mức độ, ẩn danh; tối đa ba tệp PNG/JPG/PDF, mỗi tệp 5 MiB; kỳ khóa chỉ đọc |
| FR-71; BR-21 | Đủ tám loại và định tuyến mục 5.8; người chính xử lý, người đồng gửi theo dõi; quyền và phạm vi được kiểm lại trên máy chủ |
| FR-72; BR-22 | MOI → DA_TIEP_NHAN → DANG_XU_LY → DA_TRA_LOI → DA_DONG; lịch sử chỉ thêm; revision/requestId chống ghi đè và gửi lặp |
| FR-73; BR-24/30/34 | Trao đổi qua lại, người xử lý chỉ thấy nhãn ẩn danh khi được chọn; không trả tài khoản/email/ID tác giả trong DTO ẩn danh |
| FR-76; BR-21/22 | Chuyển tiếp/từ chối phải có lý do; chuyển về MOI, người nhận cũ mất quyền đọc/ghi; gửi lại cùng lệnh chuyển chỉ nhận biên nhận, không thêm lịch sử |
| FR-146; BR-54 phần lõi | Phòng Đào tạo nhận và xử lý TO_CHUC_LOP_HOC; SLA và leo thang còn Tuần 11 |
| FR-149; BR-56 phần lõi | Phòng Khảo thí nhận THI_KET_THUC_HOC_PHAN; lời nhắc không thay thủ tục phúc khảo có thể cấu hình; kiểm tra thành phần không tự chuyển sang Khảo thí |
| FR-153; BR-26/63 phần tiếp nhận | Form nghiêm trọng có năm loại vi phạm, KHIEU_NAI cố định, cảnh báo chính thức, hai mức danh tính; mặc định ẩn danh hoàn toàn, giới hạn gửi được kiểm đồng thời |
| FR-155; BR-61/62 | Tạo hồ sơ TIEP_NHAN; loại giảng viên/trưởng bộ môn/trưởng khoa liên quan khỏi danh sách, quyền xem và giao xử lý, kể cả đa vai trò Thanh tra; kiểm toán lượt mở/tải chứng cứ |

**FR-154 chỉ hoàn thành phần khởi tạo TIEP_NHAN, chưa tick toàn bộ.** Không có hành động xác minh, kết luận, thông báo kết luận, đóng hồ sơ, chuyển từ phản hồi thường sang Thanh tra, SLA/quá hạn/leo thang, hài lòng hoặc mở lại. Các enum và cột hạn tương lai không được tính là nghiệp vụ đã hoàn thành. FR-145 vẫn còn backlog; FR-160 kiểm đầy đủ ở Tuần 13.

## Các cổng kiểm đã chạy

| Cổng | Kết quả | Bằng chứng và giới hạn |
| --- | --- | --- |
| Fullcheck Windows | **1001 passed, 1 skipped / 1002**, 63 tệp | Validate/generate/ERD/lint/TypeScript qua. Windows không cho tạo file symlink nên phép kiểm đó ghi skipped, không tính thành passed |
| CI Linux | **1002/1002**, check/smoke thành công | [Nguồn 8ffa99f, run 41414188239](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41414188239); phép kiểm file symlink đã chạy và qua |
| Bản dựng | **Next 16.4.3, exit 0** | Đã hết hai cảnh báo tracing kho tệp trong bản dựng cuối và CI nguồn 8ffa99f; giữ nguyên các kiểm tra quyền/kho |
| HTTP/MySQL | **19/19 nhóm**, `cleaned=true` | `scripts/verify-week10.ts`, kết quả riêng `.local/week10-http-result.json`; kiểm dữ liệu, quyền, trạng thái, tệp và hạn mức trên database thử riêng |
| Cạnh tranh và retry | **8 lệnh tiếp nhận → 1 thành công, 7 xung đột** | Một lịch sử chuyển; tạo/trao đổi/chuyển tiếp retry không nhân bản, cùng requestId đổi nội dung bị chặn |
| Hạn mức nghiêm trọng | **6 yêu cầu đồng thời khi đã có 2 → thêm 3, chặn 3** | Tổng năm phản hồi/ngày; phần chống spam/trùng nội dung nâng cao vẫn Tuần 11 |
| Ràng buộc MySQL | **16/16**, fixture rollback sạch | `scripts/verify-database.mjs`; danh sách đúng 37 bảng runtime |
| Seed | **17/17 nhóm** trên database demo mới | Chín migration áp dụng sạch; bundle tám lớp/chín phản hồi/tám loại/hai hồ sơ TIEP_NHAN, hai mức danh tính; hash giữ nguyên khi seed lặp và đổi kích thước |
| Bảo toàn main | **34 bảng, 9.168 bản ghi cũ giữ hash** | Kiểm sau migration và bổ sung seed; không reset database hoặc volume. Các bản ghi giả tạo thêm khi thử UI được giữ riêng, không sửa dữ liệu cũ |
| UI thực tế | **4 vai trò, 2 kích thước, 14 JPEG đã chụp** | Sinh viên/giảng viên/Thanh tra/lãnh đạo; luồng thật từ gửi đến đóng, hai mức danh tính và tóm tắt lãnh đạo. [QA](QA_GIAO_DIEN_TUAN_10.md) ghi phạm vi ảnh đã xem; không nhận đã thử tay mọi vai trò/thao tác |

Nội dung tiếng Việt 10.000 ký tự được gửi/lưu đúng; 10.001 ký tự, trường tác giả tự chèn và tham số lạ bị chặn. Kiểm tệp gồm đổi đuôi giả, tổng số, dung lượng, tải đúng byte, tên trung tính, IDOR và audit chứng cứ Thanh tra. Vai trò/phiên bị thu hồi và xung đột mới có hiệu lực ngay trên token cũ. Danh sách lẫn tổng số hồ sơ đều lọc xung đột trước phân trang.

## Ẩn danh và quyền xem

Phản hồi liên tục giữ tác giả trong miền nghiệp vụ để sinh viên nhận trả lời. Khi chọn ẩn danh, người xử lý nhận DTO đã bỏ danh tính; tên tệp tải xuống là tên trung tính. Phiếu khảo sát vẫn theo thiết kế riêng: không thêm quan hệ từ SurveyResponse/SurveyAnswer đến User hoặc SurveyTask.

Khiếu nại nghiêm trọng mặc định AN_DANH_HOAN_TOAN; CHO_THANH_TRA_BIET chỉ mở danh tính cho Thanh tra không xung đột và có audit. ADMIN/Đảm bảo chất lượng không xem hồ sơ; lãnh đạo chỉ nhận loại, trạng thái, kết luận tóm tắt. Kiểm ẩn danh không thay khả năng tự tiết lộ qua nội dung, tệp hoặc metadata; không chứng nhận chống DBA/binlog/log hạ tầng hoặc mọi suy luận.

Tệp lưu ngoài public dưới tên ngẫu nhiên; route tải kiểm quyền mới trước I/O. Magic bytes không thay thế dịch vụ quét mã độc toàn diện. Chưa deploy công khai, kiểm tải 1.500 request hoặc chứng nhận WCAG/mọi thiết bị. TOTP của tài khoản chủ dự án được giữ nguyên; việc quét QR chuyển chu kỳ được người dùng hoãn, không làm thay trong Tuần 10.

## Tiến độ và hướng nghiệm thu lại

Chín FR P0 thêm **27 điểm** so với Tuần 9: **165/219 = 75,3%, 58/84 FR**. Kế hoạch lũy kế Tuần 10 là **167/219 = 76,3%**; chênh hai điểm của FR-145 P1, không tự cắt khỏi mẫu số. M8 đạt 15/19, M13 18/22, M14 9/13, M15 6/18.

Đọc [báo cáo 10 mục](bao-cao-tien-do/tuan-10.md), [ADR-011](decisions/ADR-011-phan-hoi-va-tiep-nhan-thanh-tra.md), [sơ đồ tuần tự](SO_DO_TUAN_10.md), [giải thích và năm câu bảo vệ](GIAI_THICH/tuan-10.md), [truy vết](TRUY_VET.md) và [README](../README.md). Khởi động Docker và máy chủ web theo README, rồi dùng tài khoản demo để thử luồng; không reset dữ liệu hoặc thay xác thực của chủ dự án để tạo lại tình huống.

## Chốt giao cuối ngày 02/11/2026

Đã hoàn tất phần còn lại và hướng dẫn mở dự án. Nguồn `8ffa99f6e67b06b579a3576506395e9856d1dd1d` có [CI 41414188239](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41414188239) check/smoke thành công: Linux **1002/1002 trong 63 tệp**, Windows **1001 passed/1 skipped**. Bản dựng cuối hết cảnh báo tracing kho tệp. Đã thử chính KHOI_DONG_DU_AN.cmd từ khi web tắt, rồi mở lại khi đang chạy: web/scheduler giữ đúng tiến trình, không generate lại trên phiên web và .env giữ nguyên. Website đã mở lại ở [localhost:3000](http://localhost:3000); [ảnh khởi động](assets/tuan-10/khoi-dong-website.jpg). Giữ cửa sổ khởi động mở; hướng dẫn ba bước nằm đầu README. Commit tài liệu sau nguồn này được đối chiếu CI main riêng, không gán CI cho SHA khác.
