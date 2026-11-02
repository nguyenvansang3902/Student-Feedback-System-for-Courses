# BÁO CÁO TIẾN ĐỘ TUẦN 10/15

**Đề tài:** Xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học.

**Tiểu luận chuyên ngành HK1 2026–2027 | Nhóm:** [sinh viên điền] **| GVHD:** [sinh viên điền].

**Mốc kế hoạch giả định:** 02–08/12/2026, tính tuần bảy ngày từ 30/09. **Thực hiện:** 01–02/11/2026 theo yêu cầu trực tiếp của người dùng; nhóm đối chiếu lịch trường, không ghi lùi ngày.

**Trạng thái:** Tuần 10 đã hoàn thành trên nguồn 8ffa99f; tệp khởi động và tài liệu đã được kiểm, xem [nghiệm thu](../NGHIEM_THU_TUAN_10.md). Đây là nháp kỹ thuật do AI hỗ trợ; nhóm cần thử lại và viết bằng lời của mình.

## 1. Mục tiêu của tuần

Gửi phản hồi theo loại/mức độ/ẩn danh; định tuyến tám loại; hàng đợi và trạng thái xử lý, trao đổi, tệp an toàn, chuyển tiếp/từ chối có lý do và lịch sử. Bổ sung hàng đợi Phòng Đào tạo/Khảo thí, lời nhắc không thay phúc khảo, form khiếu nại nghiêm trọng và hồ sơ TIEP_NHAN có kiểm xung đột lợi ích. Giữ câu chữ tự nhiên, không placeholder trong ô nhập và không dùng “bạn” trong giao diện.

## 2. Kết quả đạt được và bằng chứng

Nguồn `8ffa99f6e67b06b579a3576506395e9856d1dd1d`, nhánh `feat/week10-feedback-core`, có [CI 41414188239](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41414188239) qua `check`/`smoke` đúng SHA, **1002/1002 kiểm thử trong 63 tệp trên Linux** và bản dựng Next 16.4.3 qua. Cục bộ Windows **1001 passed, 1 skipped / 1002**; skipped là phép tạo file symlink bị hệ điều hành từ chối. Bản dựng cuối và CI nguồn này đã hết hai cảnh báo tracing kho tệp; kiểm tra quyền/kho được giữ nguyên.

HTTP/MySQL **19/19 nhóm**, fixture sạch: tám lệnh tiếp nhận đồng thời chỉ một thành công/bảy xung đột; retry không nhân bản; sáu khiếu nại đồng thời khi đã có hai phản hồi chỉ thêm ba/chặn ba. Nội dung tiếng Việt 10.000 ký tự lưu đúng; tệp giả đuôi, quá số lượng/dung lượng và truy cập ngoài quyền bị chặn. Kiểm ẩn danh, hai mức danh tính, hồ sơ ngoài phạm vi, xung đột mới, thu hồi quyền/phiên và audit tải chứng cứ đều qua.

MySQL ràng buộc **16/16**; seed **17/17 nhóm** trên database mới riêng, chín migration sạch. Bundle Tuần 10 gồm tám lớp/chín phản hồi/tám loại/hai hồ sơ TIEP_NHAN, hai mức danh tính; hash giữ nguyên khi seed lặp và đổi kích thước. Sau migration và seed main, **9.168 bản ghi cũ trong 34 bảng giữ hash**, không reset database/volume. UI đã chụp **14 JPEG** của bốn vai trò ở desktop/mobile: luồng gửi ẩn danh → giảng viên tiếp nhận/xử lý/trả lời → sinh viên đọc/đóng; Thanh tra ẩn danh/có đồng ý danh tính và lãnh đạo chỉ xem tóm tắt. [QA](../QA_GIAO_DIEN_TUAN_10.md) ghi rõ ảnh đã xem và thao tác chưa thử tay.

## 3. Đối chiếu kế hoạch

| Mục | Kết quả | Bằng chứng và giới hạn |
| --- | --- | --- |
| FR-70/71; BR-20/21/24/28 | Hoàn thành | Gửi, tám tuyến, ẩn danh, kỳ được phép, tệp riêng tư; HTTP và luồng UI thật |
| FR-72/73; BR-22 | Hoàn thành | Trạng thái/lịch sử/trao đổi; revision/requestId; cạnh tranh 1/7 và retry |
| FR-76 | Hoàn thành | Chuyển/từ chối có lý do, chuyển về MOI, người cũ mất quyền; biên nhận retry không lộ nội dung |
| FR-146/149 | Hoàn thành phần Tuần 10 | Hàng đợi PĐT/Khảo thí và lời nhắc phúc khảo cấu hình được; SLA/leo thang Tuần 11 |
| FR-153/155 | Hoàn thành | Cảnh báo, năm vi phạm, hai mức danh tính, tạo hồ sơ TIEP_NHAN; xung đột động/đa vai trò/IDOR/audit |
| FR-154 | Một phần, chưa tick | Chỉ khởi tạo hồ sơ; xác minh/kết luận/thông báo/đóng theo Tuần 11 |
| Tài liệu và khởi động | Đã hoàn thành | CMD cold-start và mở lại qua, không trùng tiến trình, giữ .env; sơ đồ/ADR/giải thích/14 ảnh và CI nguồn bàn giao đã xác minh |
| FR-145 và FR-160 | Chưa hoàn tất | FR-145 P1 vẫn backlog; FR-160 đầy đủ ở Tuần 13, không tự cắt |

## 4. Tiến độ lũy kế

Chín FR P0 thêm **27 điểm**, nâng mốc Tuần 9 từ 138/219 lên **165/219 = 75,3%, 58/84 FR**. Kế hoạch lũy kế Tuần 10 **167/219 = 76,3%**; chênh hai điểm do FR-145 chưa thực hiện. Tỉ lệ được tính từ checkbox có trọng số, không dựa trên số dòng mã hoặc số bảng.

| Module | Điểm đã nghiệm thu |
| --- | --- |
| M1 Xác thực và phiên | 22/23 |
| M2 Người dùng, phân quyền, kiểm toán | 9/9 |
| M3 Danh mục và nhập liệu | 9/9 |
| M4 Mẫu phiếu | 16/16 |
| M5 Đợt khảo sát | 22/22 |
| M6 Làm khảo sát | 14/14 |
| M7 Kết quả | 16/18 |
| M8 Phản hồi | 15/19 |
| M9 Thông báo | 0/7 |
| M10 Báo cáo | 0/12 |
| M11 Hệ thống | 9/11 |
| M12 Mở rộng | 0/3 |
| M13 Phòng Đào tạo | 18/22 |
| M14 Phòng Khảo thí | 9/13 |
| M15 Phòng Thanh tra | 6/18 |
| M16 Ma trận quyền mở rộng | 0/3 |

## 5. Khó khăn, rủi ro và hướng xử lý

Quyền nhận phản hồi phải khác quyền chỉ được đồng gửi; dữ liệu seed cũ thiếu cờ mới được suy theo tuyến, không tự sửa bản ghi cũ. Chuyển tiếp thu hồi quyền đọc nên retry chỉ trả biên nhận đã lưu, tránh truy cập nội dung sau chuyển. Hạn mức gửi được kiểm trong cùng giao dịch để không vượt khi gửi đồng thời. Migration thử phát hiện khác collation với bảng cũ; đã sửa trước khi áp dụng main, giữ dữ liệu và kiểm bản migration sạch trên database demo mới.

Ẩn danh là ở mức ứng dụng; nội dung/tệp tự tiết lộ, DBA/binlog hoặc log hạ tầng vẫn là giới hạn. Magic bytes không chứng nhận tệp sạch mã độc toàn diện. Lượt UI kéo dài có phiên access hết hạn và thao tác chờ trang bất đồng bộ; đã làm mới/đăng nhập lại rồi hoàn tất luồng, không nhận mọi lượt đầu đều qua. Chưa chứng nhận WCAG, mọi thiết bị hoặc tải 1.500 request.

## 6. Kế hoạch Tuần 11

Chỉ bắt đầu khi người dùng yêu cầu: SLA/quá hạn/leo thang, chống spam nâng cao, hài lòng/mở lại, giải trình cải tiến, trung tâm thông báo/email và nhắc hạn. Hoàn tất quy trình Thanh tra từ xác minh đến kết luận/thông báo; các mục P1 theo lộ trình và quyết định phạm vi. Không làm trước dashboard, xuất file hoặc cảnh báo bất thường của Tuần 12; tiếp tục theo dõi FR-145.

## 7. Phân công và đóng góp thành viên

**[SINH VIÊN TỰ ĐIỀN]** Họ tên, phần thực làm, bằng chứng commit/kiểm thử/thuyết minh. AI không gán tên, số giờ hoặc đóng góp cho thành viên; hỗ trợ AI được ghi riêng trong AI_USAGE.

## 8. Các bước kiểm tra nhanh cho giảng viên

1. Khởi động dự án theo [README](../../README.md). Mở Docker chưa đủ: máy chủ web phải chạy thì `localhost:3000` mới truy cập được. Giữ cửa sổ chạy web mở trong lúc dùng.
2. Đăng nhập `DEMO-SV00001`, mở **Phản hồi của tôi → Gửi phản hồi**, chọn lớp W10-LHP01 và ẩn danh. Gửi nội dung giả; tệp đổi đuôi giả phải bị từ chối.
3. Đăng nhập `DEMO-GV00001`, mở hàng đợi và phản hồi vừa gửi. Phải chỉ thấy **Sinh viên ẩn danh**; tiếp nhận, bắt đầu xử lý và trả lời. Sinh viên đăng nhập lại phải đọc được trả lời và có thể xác nhận đóng.
4. Dùng `PDT2026001`/`KT2026001` đối chiếu hàng đợi tổ chức lớp/thi cuối kỳ; loại kiểm tra thành phần vẫn vào giảng viên. Phản hồi thi có lời nhắc không thay thủ tục phúc khảo; ĐBCL có thể cấu hình lời nhắc.
5. Dùng `TT2026001` mở hai hồ sơ giả TIEP_NHAN: mặc định không thấy danh tính, chỉ hồ sơ được chọn cho Thanh tra biết mới hiện. Dùng `LD2026001` mở cùng hồ sơ phải chỉ có tóm tắt, không nội dung/chứng cứ; ADMIN không có quyền đọc hồ sơ.
6. Đối chiếu `check`, `test:week10`, `test:demo`, `progress` và CI đúng SHA ở [nghiệm thu](../NGHIEM_THU_TUAN_10.md). Không reset dữ liệu hoặc đổi khóa TOTP của chủ dự án để thử lại.

Mật khẩu demo ban đầu theo README; seed không đặt lại mật khẩu đã được đổi. Chỉ dùng dữ liệu giả.

## 9. Bản rút gọn để dán vào hệ thống của trường

Nhóm hoàn thành phần lõi phản hồi: gửi ẩn danh, định tuyến tám loại, hàng đợi, trao đổi, lịch sử và chuyển tiếp có lý do. Phòng Đào tạo, Khảo thí có hàng đợi riêng; khiếu nại nghiêm trọng tạo hồ sơ tiếp nhận, chặn người xung đột và bảo vệ danh tính. CI nguồn chức năng qua 985 kiểm thử, 19 nhóm HTTP và 17 nhóm seed. Luồng giao diện từ gửi đến trả lời, đóng đã chạy bằng dữ liệu giả. Tiến độ đạt 165/219 điểm, 58/84 FR. SLA và quy trình Thanh tra sau tiếp nhận để Tuần 11. Nhóm cần kiểm tra bản giao cuối, thử lại hướng dẫn khởi động và tự điền đóng góp cá nhân.

## 10. Điều chỉnh so với kế hoạch

**Ngày yêu cầu:** [SINH VIÊN TỰ ĐIỀN]. **Tên người yêu cầu:** [SINH VIÊN TỰ ĐIỀN]. Lý do theo GVHD: [nhóm tự xác minh]. Tuần 10 bổ sung FR-146/149/153/155 và phần khởi tạo FR-154 theo Điều chỉnh số 01. Không tự chuyển seed Thanh tra sang XAC_MINH hoặc làm trước SLA/kết luận. Người dùng yêu cầu hoàn tất và bổ sung cách mở dự án ngày phiên 02/11; thao tác này không cộng FR mới hoặc thay ngày GVHD yêu cầu. FR-145 P1 còn backlog. Không viết quy trình hiện tại ở trường hoặc bịa đóng góp thành viên.

Chốt thêm ngày02/11: kiểm khởi động gồm17test và thử CMD thật từ trạng thái tắt/mở lại; Linux1002/1002, Windows1001passed/1skipped trong63tệp. .env giữ nguyên; không có tiến trình web/scheduler trùng. Bản dựng và CI nguồn8ffa99f đã hết cảnh báo tracing kho tệp.
