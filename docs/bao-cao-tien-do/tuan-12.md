# BÁO CÁO TIẾN ĐỘ TUẦN 12/15

**Đề tài:** Xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học.

**Tiểu luận chuyên ngành HK 1 2026–2027 | Nhóm:** [sinh viên điền] **| GVHD:** [sinh viên điền].

**Mốc kế hoạch giả định:** 16–22/12/2026, tính tuần bảy ngày từ 30/09. **Thực hiện:** 03/11/2026 theo yêu cầu người dùng; nhóm đối chiếu lịch trường, không ghi lùi ngày.

**Trạng thái chốt 05/11:** Đã nghiệm thu chín FR Tuần 12, thêm 20 điểm; cộng FR-160 Tuần 13 tổng hiện tại 211/219=96,3%,78/84 FR. UC-GOLD kiểm tay đủ các bước,8 PNG đã xem; haiCSV đã kiểm byte/phạm vi. [CI 41904262769](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41904262769) của nguồn 831d14d qua check/e2e/smoke. Kết quả 03/11 bên dưới là lịch sử, không thay bằng chứng nguồn mới.

## 1. Mục tiêu của tuần

Xây dựng dashboard theo vai trò, biểu đồ, báo cáo xử lý phản hồi, xuất CSV/Excel/PDF và chạy kịch bản UC-GOLD bằng E2E. Theo Điều chỉnh số 01, bổ sung dashboard dữ liệu Phòng Đào tạo, thống kê phản hồi thi của Khảo thí, thống kê hồ sơ Thanh tra và cảnh báo bất thường khảo sát. Thống kê và tệp xuất không có định danh sinh viên; áp dụng ngưỡng bảo vệ và quyền theo vai trò/phạm vi.

Chỉ làm phạm vi Tuần 12. Giao diện chức năng tiếp tục dùng câu chữ trung tính, không placeholder trong ô nhập và hạn chế slogan. Giai đoạn nâng cấp UI riêng vẫn được hoãn; không chạy UI-0 hoặc tự đưa các việc kiểm định Tuần 13 thành tính năng đã hoàn tất.

## 2. Kết quả đạt được và bằng chứng

### Tiếp tục GUI ngày 04–05/11

[Manifest kiểm tay](../assets/tuan-13/manual-uc-gold.json) xác nhận 5/5 nhiệm vụ DONE,5 phiếu/100%/2,00. ĐBCL thấy một tự luận chờ chặn công bố, kiểm duyệt có lý do rồi công bố 0 chờ. Giảng viên gửi giải trình/TBM xác nhận; giảng viên xử lý phản hồi, sinh viên đánh giá 4/5 và tự đóng. Khảo thí xử lý đúng hàng đợi thi và xem nhóm đánh giá gộp 5 phiếu/100%/2,00 với ít nhất 2 GV góp LIKERT hợp lệ. Thanh tra đi đủ nhận/xác minh/ghi chú giả/kết luận giả `KHONG_DU_THONG_TIN`/thông báo/đóng. Lãnh đạo áp dụng bộ lọc và tải CSV 3.745 byte; header vai trò/bộ lọc đã đọc lại đúng. Tám PNG đã mở xem, hash ghi trong manifest.

Các bước này thao tác CUA browser UI trên demo giả riêng của cùng hành trình; không helper HTTP, đồng hồ giả hoặc main writes. Nhánh chờ đủ SLA chỉ có bằng chứng runtime, không nhận đã chờ bằng tay. Còn ba thao tác đủ các bước trong kịch bản và gate nguồn cuối như trạng thái đầu báo cáo; đã chốt FR/điểm. [UC-GOLD mục 9](../UC_GOLD_TUAN_12.md) ghi chi tiết.

### Hiện thực và bằng chứng lịch sử 03/11

Đã có service, API và giao diện báo cáo cho mười vai trò. Sinh viên chỉ có nhiệm vụ/phản hồi của chính tài khoản. ADMIN, kể cả ghép thêm vai trò, chỉ có thông tin vận hành tài khoản và phiên đăng nhập. Giảng viên/trưởng đơn vị dùng đúng phạm vi; Đảm bảo chất lượng và Lãnh đạo xem điểm từ tổng hợp, các vai trò còn lại theo điều kiện công bố. Phòng Đào tạo có độ sẵn sàng dữ liệu và phản hồi tổ chức lớp; Khảo thí chỉ có nhóm đánh giá gộp cùng phản hồi thi; Thanh tra chỉ có dữ liệu hồ sơ không xung đột và đủ mẫu.

Dashboard, biểu đồ và các định dạng xuất dùng chung DTO an toàn. Điểm gộp dùng số đếm/tổng gốc, không lấy trung bình điểm lớp đã làm tròn. Ngưỡng hai giảng viên của Khảo thí chỉ tính người có giá trị LIKERT hợp lệ trong nhóm đánh giá; phiếu toàn NA không giúp vượt ngưỡng. Ô lớp/môn bị che kéo theo tổng bộ môn/khoa bị che để tránh trừ tổng suy ra ô nhỏ. Thời gian, hài lòng và tỷ lệ có kiểm riêng số mẫu; mẫu số 0 trả chưa đủ dữ liệu. Báo cáo thời gian quá khứ dựa các mốc được lưu, không lấy cờ quá hạn hiện tại làm lịch sử.

Cảnh báo bất thường tính chỉ số theo ngưỡng từ dữ liệu đã tổng hợp: tỷ lệ phiếu đồng nhất và chênh lệch với kỳ trước. Thanh tra chỉ xem chỉ số được cho phép, không nhận điểm tuyệt đối, câu trả lời hoặc tự luận. Quyết định xem xét có lý do/lịch sử, có thể báo Đảm bảo chất lượng hoặc tạo hồ sơ xác minh; cảnh báo không tự chặn công bố và không tự kết luận đúng sai.

Các kết quả đã chạy tại máy sau các sửa được ghi ở [nghiệm thu kỹ thuật Tuần 12](../NGHIEM_THU_TUAN_12.md):

| Nhóm kiểm | Kết quả đã quan sát | Giới hạn cần giữ khi chốt |
| --- | --- | --- |
| Service/MySQL báo cáo | 13/13 nhóm, fixture đã dọn | Gồm hồi quy che tổng cha, phiếu NA, scope mười vai trò và canary trong database thử |
| Service/MySQL bất thường | 9/9 nhóm, fixture đã dọn ở lượt chạy lại | Gồm quyết định xem xét, thông báo đúng quyền, xung đột và việc không chặn công bố |
| File xuất | 10/10 nhóm; đọc lại byte CSV/XLSX và giải mã nội dung PDF bằng parser | Có kiểm tiếng Việt, ô che, công thức bảng tính và dòng cuối; không thay thế kiểm quyền từ database |
| PDF nhiều trang | 5 trang, đã mở xem bản PDF được tạo | Chỉ nhận phạm vi tệp đã xem, không chứng nhận mọi bộ dữ liệu hoặc mọi trình đọc |
| Demo trên database mới | 19/19 nhóm | Seed giả đã áp dụng lên main và kiểm lặp; số liệu bảo toàn ghi bên dưới |
| E2E Playwright | 3/3 kịch bản; lượt cuối khoảng 1,1 phút | Bao gồm UC-GOLD, kiểm dashboard mười vai trò và kiểm năm vai trò ở desktop/mobile; kết hợp HTTP và trình duyệt, không tương đương thử tay toàn bộ chức năng |
| Kiểm tổng | 1284 passed, 1 skipped / 1285 trong 86 tệp trên Windows | Lint/typecheck/schema/design qua; skipped là file-symlink bị hệ điều hành từ chối, không tính thành passed |
| Build | Next.js 16.4.3 thành công | Đã kiểm truy vết font PDF cục bộ; không coi là đã triển khai công khai |
| SQL và hồi quy | SQL 16/16; Tuần 9: 12/12, Tuần 10: 19/19, Tuần 11: 43 nhóm | Chạy các bộ tuần tự trên database thử riêng; không reset main |
| Main sau migration/seed | 43 bảng / 9.451 bản ghi cũ giữ hash | Seed lặp giữ nguyên 45 bảng / 9.519 bản ghi; không sửa bundle cũ hoặc MFA của chủ dự án |
| CI nguồn Tuần 12 | smoke, check và e2e đều thành công; Linux 1285/1285 phép kiểm, 86/86 tệp, không skipped | Đúng nguồn `6692854`; không suy kết quả sang commit hoặc tài liệu được sửa sau lượt CI này |
| UC-GOLD thủ công | Checkpoint 03/11 được tiếp tục 04–05/11, đã đủ các bước trên GUI | GV đã xem lớp mình; cảLãnh đạo/ĐBCL xem/xuất báo cáo,8 PNG đã xem, CSV đã kiểm byte/phạm vi; CI nguồn mới qua |

[CI 41588831428](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41588831428) hoàn tất thành công ngày 03/11/2026 trên nhánh `feat/week12-reports-anomalies`, đúng SHA `6692854e97088845ce5b263318dfb1f6239fef04`. Lượt Linux chạy đủ phép kiểm file-symlink mà Windows bỏ qua; hai số kiểm tổng được ghi riêng theo môi trường.

Lượt thủ công riêng trên Chrome đã thực hiện: Đảm bảo chất lượng tạo mẫu và đợt trong phạm vi khoa giả; Phòng Đào tạo xác nhận với cảnh báo RS-04; Lãnh đạo phê duyệt để mở và chốt **5 nhiệm vụ**; SV 1 chọn **2/2** ở hai câu Likert, nhập tự luận và nộp **1 phiếu**; SV 1 gửi **1 phản hồi ẩn danh loại Giảng dạy**. Sau đó công cụ điều khiển Windows không xác định đủ chắc chắn URL hiện tại nên chặn thao tác tiếp, lượt kiểm đã dừng. Không coi đây là website lỗi hoặc UC-GOLD đã hoàn tất. Helper nộp thêm bốn phiếu qua HTTP và helper truyền thời điểm `endsAt + 1 ms` **đều chưa chạy**; không có bốn phiếu phụ trợ, không nhận đã đóng đợt bằng mô phỏng thời gian. Đóng/tổng hợp/kiểm duyệt/công bố, giải trình, xử lý phản hồi, các nhánh Khảo thí/Thanh tra và báo cáo/tải tệp của lượt thủ công còn chờ. [Nhật ký UC-GOLD mục 8](../UC_GOLD_TUAN_12.md#8-lượt-thao-tác-gui-riêng-ngày-03112026--chưa-hoàn-tất) tách các bước này khỏi E2E.

Nhánh mã `main` vẫn Tuần 11; công việc Tuần 12 tiếp tục trong nhánh Tuần 13. Chờ ba thao tác đủ các bước trong kịch bản và check/CI đúng nguồn cuối trước chốt FR/gộp. Việc này khác bằng chứng database chính được kiểm bảo toàn riêng.

Nguồn kịch bản: [UC-GOLD và dashboard E2E](../../tests/e2e/uc-gold.spec.ts), [MySQL báo cáo](../../scripts/verify-week12-reports.ts), [đọc file xuất](../../scripts/verify-week12-exports.ts). Ba bộ Tuần 12 qua tổng **32 nhóm**: 13 báo cáo, 9 bất thường và 10 file xuất. Các kiểm báo cáo có canary tên/tài khoản/email sinh viên và nội dung riêng tư trong database thử, gọi service xuất thật cho ba vai trò mới. Không suy kiểm synthetic DTO hoặc đọc byte file thành bằng chứng mọi quyền truy cập đã được thử. Ảnh tự động và thao tác trực tiếp được phân biệt tại [QA giao diện](../QA_GIAO_DIEN_TUAN_12.md); hành trình thủ công còn thiếu các bước đã nêu trên, không dùng ảnh các tuần trước thay cho giao diện mới.

Tài liệu đã có [công thức báo cáo](../CONG_THUC_BAO_CAO.md), [ADR-012 về quyền và ngưỡng](../decisions/ADR-012-bao-cao-va-nguong-du-lieu.md), cùng ERD cập nhật. Migration đã áp dụng lên database chính, thêm hai bảng cảnh báo/lịch sử xem xét; runtime có **45 model**, thiết kế **47**, còn **2 model chỉ thiết kế** là SurveyReminder và ImportBatch. Hash **43 bảng / 9.451 bản ghi cũ** được giữ sau migration và seed; seed lặp giữ **45 bảng / 9.519 bản ghi**. Chỉ thêm bundle giả 10 phiếu, 20 đáp án và một cờ chờ xem xét, không reset dữ liệu hoặc đổi MFA.

Lượt kiểm bảo toàn sau khi dừng GUI ngày 03/11/2026 lúc **08:46 UTC** tiếp tục xác nhận cả **43 bảng / 9.451 bản ghi cũ** và **45 bảng / 9.519 bản ghi sau seed** giữ nguyên.

## 3. Đối chiếu kế hoạch

| Mục | Trạng thái trước chốt | Bằng chứng và việc còn phải hoàn tất |
| --- | --- | --- |
| FR-90: dashboard theo vai trò | Đã nghiệm thu 05/11 | GV đã xem kết quả lớp mình; cả Lãnh đạo/ĐBCL xem và xuất báo cáo, CSV đã kiểm byte/phạm vi; FR đã chốt |
| FR-91: biểu đồ và so sánh | Đã nghiệm thu 05/11 | Biểu đồ dùng dữ liệu DTO đã kiểm quyền/ngưỡng, không thay ô che bằng 0; kiểm desktop/mobile đã chạy |
| FR-92: CSV/Excel | Đã nghiệm thu 05/11 | Đọc lại byte/tệp, tiếng Việt, chặn công thức và canary từ service/database đã qua |
| FR-93: PDF | Đã nghiệm thu 05/11 | Parser đọc nội dung, bảng nhiều trang và dòng cuối; bản PDF 5 trang đã được mở xem |
| FR-94: báo cáo xử lý phản hồi | Đã nghiệm thu 05/11 | Số lượng, thời gian, quá hạn, hài lòng; tỷ lệ có mẫu số rõ ràng, ô nhỏ và tổng cha được bảo vệ |
| FR-147: dashboard Phòng Đào tạo | Đã nghiệm thu 05/11 | Độ sẵn sàng, lớp có lỗi và phản hồi tổ chức lớp; không đưa roster/email/mã băm danh sách vào DTO |
| FR-151: thống kê Khảo thí | Đã nghiệm thu 05/11 | Chỉ phản hồi thi và nhóm đánh giá gộp đủ mẫu/từ công bố; không có lớp, giảng viên hoặc tự luận |
| FR-158: bất thường khảo sát | Đã nghiệm thu 05/11 | Chỉ số, ngưỡng, xem xét, thông báo và mở hồ sơ; bộ 9 nhóm đã chạy lại qua |
| FR-159: thống kê Thanh tra | Đã nghiệm thu 05/11 | Loại/trạng thái/thời gian/tỷ lệ quá hạn, loại xung đột trước gộp, không có định danh hoặc nội dung hồ sơ |
| UC-GOLD, E2E và báo cáo | GUI 04–05/11 đã qua đủ các bước trong kịch bản,8 PNG đã xem; E2E giữ bằng chứng riêng | [Manifest](../assets/tuan-13/manual-uc-gold.json), [CSV](../assets/tuan-13/manual-export-verification.json); check/build 05/11 qua, CI nguồn cuối đã qua |
| FR-145 và FR-160 | Giữ nguyên tồn đọng/phạm vi | FR-145 còn backlog; FR-160 mới một phần, nghiệm thu đầy đủ ở Tuần 13 |

Kết quả 03/11 giữ theo SHA lịch sử. UC-GOLD kiểm tay, check/build và CI nguồn 831d14d đã qua; chín FR Tuần 12 đã nghiệm thu, thêm 20 điểm. Tuần 13 chốt thêm FR-160, tổng hiện tại 211/219,78/84 FR.

## 4. Tiến độ lũy kế

Mốc trước Tuần 12 là 188/219,68/84 FR. Đã nghiệm thu chín FR-90/91/92/93/94/147/151/158/159 với 20 điểm, lũy kế sau Tuần 12 **208/219=95,0%,77/84 FR**. Kế hoạch Tuần 12 là 210/219, chênh 2 điểm FR-145 backlog. Sau khi chốtFR-160 Tuần 13, tổng hiện tại **211/219=96,3%,78/84 FR**; kế hoạch Tuần 13 là 213/219.

| Module | Đã nghiệm thu đến Tuần 11 | Sau nghiệm thu Tuần 12 |
| --- | --- | --- |
| M 1 Xác thực và phiên | 22/23 | 22/23 |
| M 2 Người dùng, phân quyền, kiểm toán | 9/9 | 9/9 |
| M 3 Danh mục và nhập liệu | 9/9 | 9/9 |
| M 4 Mẫu phiếu | 16/16 | 16/16 |
| M 5 Đợt khảo sát | 22/22 | 22/22 |
| M 6 Làm khảo sát | 14/14 | 14/14 |
| M 7 Kết quả | 18/18 | 18/18 |
| M 8 Phản hồi | 19/19 | 19/19 |
| M 9 Thông báo | 7/7 | 7/7 |
| M 10 Báo cáo | 0/12 | 12/12 |
| M 11 Hệ thống | 9/11 | 9/11 |
| M 12 Mở rộng | 0/3 | 0/3 |
| M 13 Phòng Đào tạo | 18/22 | 20/22 |
| M 14 Phòng Khảo thí | 11/13 | 13/13 |
| M 15 Phòng Thanh tra | 14/18 | 18/18 |
| M 16 Ma trận quyền mở rộng | 0/3 | 0/3 |

Đối chiếu số cuối bằng `npm run progress` sau khi điều kiện nghiệm thu được thỏa mãn. Không suy phần trăm từ số ảnh, số bảng hoặc số dòng mã; không tự cắt FR-145 để làm khớp kế hoạch.

## 5. Khó khăn, rủi ro và hướng xử lý

Ẩn một ô ít mẫu nhưng giữ tổng bộ môn/khoa có thể làm lộ ô đó bằng phép trừ. Đã thêm truyền trạng thái ẩn từ nhóm con lên tổng cha và kiểm hồi quy cho lớp 5 phiếu/lớp 1 phiếu, cũng như môn thiếu ngưỡng hai giảng viên. Bộ báo cáo 13 nhóm đã chạy lại qua sau sửa; không dùng lượt 11 nhóm trước đó thay kết quả cuối. Trường hợp giảng viên có phiếu nhưng toàn NA cũng đã được tách khỏi số người thực sự đóng góp điểm đánh giá.

Quyền đa vai trò phải được kiểm ở service: chọn giao diện giảng viên không được lấy quyền toàn trường của Đảm bảo chất lượng, ADMIN không được đọc nội dung nghiệp vụ, Thanh tra bị loại hồ sơ xung đột trước khi tính số lượng. Chỉ che giao diện hoặc lọc sau khi đếm không đủ. File xuất dùng cùng DTO với dashboard để giảm khả năng có một đường xuất bỏ qua quyền/ngưỡng.

Cảnh báo bất thường chỉ là gợi ý quản lý, không phải kết luận vi phạm. Thời gian xử lý trong báo cáo là ngày lịch; SLA dùng ngày làm việc. Phản hồi mở lại có thể đổi mốc trả lời, nên thống kê ghi rõ chu kỳ gần nhất còn lưu, không khẳng định đã phục dựng toàn bộ lịch sử thời hạn.

Một lượt kiểm bất thường sau E2E chọn nhầm kỳ liền trước do lịch fixture; đã sửa lịch thử và assertion, giữ nguyên nghiệp vụ. Lượt lint đầu đọc nhầm thư mục build thử đã được sửa bằng ignore đúng thư mục sinh tự động. Các lượt lỗi không được tính thành lượt qua. Sau E2E, phiên fixture bị thu hồi và tài khoản bị vô hiệu hóa; lịch sử ở database thử được giữ, không nhận database thử hoàn toàn trống.

Ẩn danh vẫn ở mức ứng dụng; lượt GUI không chứng nhận mọi thiết bị/WCAG/tải 1.500 request hoặc chống quyền hạ tầng/tự tiết lộ. Checkpoint công cụ dừng là lịch sử đã tiếp tục; UC-GOLD theo đầy đủ kịch bản đã qua, CI nguồn cuối đã qua.

## 6. Kế hoạch Tuần 13

Chỉ bắt đầu khi người dùng yêu cầu: kiểm thử hệ thống, bảo mật và hiệu năng; hoàn thiện ma trận mười vai trò, IDOR, tệp xuất và các ca kiểm bắt buộc của Điều chỉnh số 01. Rà soát header/cookie/giới hạn tần suất/upload, kiểm tải nộp phiếu và điều chỉnh responsive/khả năng tiếp cận. Không tự thêm tính năng mới ngoài kế hoạch.

Giữ FR-145 trong backlog; FR-160 đã chốt ởTuần 13 theo đầy đủ bằng chứng. Tiếp tục bảo toàn dữ liệu và khóa MFA của chủ dự án. Giai đoạn nâng cấp UI riêng chưa bắt đầu; chỉ kích hoạt bằng lệnh tương ứng sau khi hoàn thành 15 tuần.

## 7. Phân công và đóng góp thành viên

**[SINH VIÊN TỰ ĐIỀN]** Họ tên, phần thực làm, bằng chứng commit, kiểm thử và nội dung thuyết minh. AI không điền tên, số giờ hoặc đóng góp thay thành viên. Các phần do agent hỗ trợ không được ghi thành đóng góp thực tế của sinh viên.

## 8. Các bước kiểm tra nhanh cho giảng viên

1. Mở Docker rồi chạy `KHOI_DONG_DU_AN.cmd` theo [README](../../README.md), giữ cửa sổ máy chủ mở. Chỉ dùng dữ liệu giả; không reset database, mật khẩu đã đổi hoặc MFA của chủ dự án.
2. Vào **Báo cáo** bằng tài khoản sinh viên, giảng viên/trưởng đơn vị và ADMIN: kiểm dữ liệu thuộc đúng tài khoản/phạm vi; ADMIN chỉ có vận hành tài khoản. Chọn học kỳ/đợt/đơn vị và đối chiếu nhãn phạm vi áp dụng; người ngoài phạm vi không đọc được khi đổi ID trên URL.
3. Dùng Phòng Đào tạo, Khảo thí và Thanh tra: Phòng Đào tạo chỉ thấy độ sẵn sàng/phản hồi tổ chức lớp; Khảo thí không có bảng lớp/giảng viên/tự luận; Thanh tra không thấy hồ sơ xung đột. Nhóm ít mẫu hiện chưa đủ dữ liệu và không suy ra được từ tổng cha.
4. Tải CSV/Excel/PDF, mở lại để kiểm tiếng Việt, phạm vi và ô bị che; không có tên/tài khoản/email/ID sinh viên hoặc nội dung phản hồi. Đối chiếu tỷ lệ với mẫu số ghi ở cột, không coi ô `null` là 0%.
5. Dùng Thanh tra vào luồng **Bất thường khảo sát**, xem chỉ số, ghi nhận xem xét hoặc tạo hồ sơ xác minh theo quyền. Đảm bảo chất lượng nhận lời nhắc chung khi được báo lưu ý nhưng không được mở chỉ số mật; có cờ bất thường không tự chặn công bố.
6. Đối chiếu manifest GUI, check/build và CI 41904262769 đúng nguồn 831d14d đều qua; chín FR Tuần 12 và FR-160 Tuần 13 đã chốt. Giữ riêng kết quả Windows/Linux và các giới hạn đã ghi.

## 9. Bản rút gọn để dán vào hệ thống của trường

Nhóm đã hoàn tất dashboard, báo cáo và xuất tệp. UC-GOLD kiểm tay đã đủ các bước, gồmGV xem kết quả lớp mình và cảLãnh đạo/ĐBCL xem, xuất báo cáo; tám PNG đã xem. HaiCSV đã kiểm byte, vai trò/phạm vi và không định danh tài khoản. Check/build và CI nguồn 831d14d đều qua. Tuần 12 nghiệm thu chín FR, thêm 20 điểm; Tuần 13 thêm FR-160, tổng 211/219 điểm,78/84 FR. Giữ giới hạn ẩn danh, hiệu năng và khả năng tiếp cận trong hồ sơ; FR-145 chưa tự cắt, không làmTuần 14/UI-n. Sinh viên tự điền đóng góp.

## 10. Điều chỉnh so với kế hoạch

**Ngày yêu cầu:** [SINH VIÊN TỰ ĐIỀN]. **Tên người yêu cầu:** [SINH VIÊN TỰ ĐIỀN]. **Lý do theo yêu cầu GVHD:** [nhóm tự xác minh]. Ngày thực hiện 03/11 là ngày phiên làm, không thay ngày hoặc tên người yêu cầu mà nhóm cần xác nhận.

Tuần 12 thực hiện FR-147/151/158/159 theo Điều chỉnh số 01 cùng năm FR báo cáo gốc; dữ liệu cảnh báo bất thường chỉ được thêm khi luồng tương ứng đã có. Không tự cắt cảnh báo hoặc thống kê P 1. Bổ sung bảo vệ tổng cha và cách đếm giảng viên đóng góp điểm là sửa để đáp ứng yêu cầu quyền/ngưỡng, không cộng thêm FR hoặc thay công thức gốc.

Giữ giới hạn Khảo thí/Thanh tra/ẩn danh và UI-n chưa kích hoạt. Không bịa quy trình trường hoặc đóng góp. UC-GOLD theo đầy đủ kịch bản/check/build đã qua; CI nguồn cuối đã qua trước nghiệm thu/chốt checkbox.
