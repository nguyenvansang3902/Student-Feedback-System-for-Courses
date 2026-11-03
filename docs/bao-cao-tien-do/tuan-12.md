# BÁO CÁO TIẾN ĐỘ TUẦN 12/15

**Đề tài:** Xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học.

**Tiểu luận chuyên ngành HK1 2026–2027 | Nhóm:** [sinh viên điền] **| GVHD:** [sinh viên điền].

**Mốc kế hoạch giả định:** 16–22/12/2026, tính tuần bảy ngày từ 30/09. **Thực hiện:** 03/11/2026 theo yêu cầu người dùng; nhóm đối chiếu lịch trường, không ghi lùi ngày.

**Trạng thái:** Bản nháp trước nghiệm thu cuối Tuần 12. Đã triển khai chức năng và có các kết quả kiểm từng phần bên dưới; kiểm tổng, build, bảo toàn dữ liệu main và CI của nguồn Tuần 12 còn chờ chốt. Không dùng CI Tuần 11 hoặc các lượt trước sửa cuối để xác nhận mã Tuần 12 đã hoàn tất. Đóng góp thành viên và thông tin GVHD do sinh viên tự điền.

## 1. Mục tiêu của tuần

Xây dựng dashboard theo vai trò, biểu đồ, báo cáo xử lý phản hồi, xuất CSV/Excel/PDF và chạy kịch bản UC-GOLD bằng E2E. Theo Điều chỉnh số 01, bổ sung dashboard dữ liệu Phòng Đào tạo, thống kê phản hồi thi của Khảo thí, thống kê hồ sơ Thanh tra và cảnh báo bất thường khảo sát. Thống kê và tệp xuất không có định danh sinh viên; áp dụng ngưỡng bảo vệ và quyền theo vai trò/phạm vi.

Chỉ làm phạm vi Tuần 12. Giao diện chức năng tiếp tục dùng câu chữ trung tính, không placeholder trong ô nhập và hạn chế slogan. Giai đoạn nâng cấp UI riêng vẫn được hoãn; không chạy UI-0 hoặc tự đưa các việc kiểm định Tuần 13 thành tính năng đã hoàn tất.

## 2. Kết quả đạt được và bằng chứng

Đã có service, API và giao diện báo cáo cho mười vai trò. Sinh viên chỉ có nhiệm vụ/phản hồi của chính tài khoản. ADMIN, kể cả ghép thêm vai trò, chỉ có thông tin vận hành tài khoản và phiên đăng nhập. Giảng viên/trưởng đơn vị dùng đúng phạm vi; Đảm bảo chất lượng và Lãnh đạo xem điểm từ tổng hợp, các vai trò còn lại theo điều kiện công bố. Phòng Đào tạo có độ sẵn sàng dữ liệu và phản hồi tổ chức lớp; Khảo thí chỉ có nhóm đánh giá gộp cùng phản hồi thi; Thanh tra chỉ có dữ liệu hồ sơ không xung đột và đủ mẫu.

Dashboard, biểu đồ và các định dạng xuất dùng chung DTO an toàn. Điểm gộp dùng số đếm/tổng gốc, không lấy trung bình điểm lớp đã làm tròn. Ngưỡng hai giảng viên của Khảo thí chỉ tính người có giá trị LIKERT hợp lệ trong nhóm đánh giá; phiếu toàn NA không giúp vượt ngưỡng. Ô lớp/môn bị che kéo theo tổng bộ môn/khoa bị che để tránh trừ tổng suy ra ô nhỏ. Thời gian, hài lòng và tỷ lệ có kiểm riêng số mẫu; mẫu số 0 trả chưa đủ dữ liệu. Báo cáo thời gian quá khứ dựa các mốc được lưu, không lấy cờ quá hạn hiện tại làm lịch sử.

Cảnh báo bất thường tính chỉ số theo ngưỡng từ dữ liệu đã tổng hợp: tỷ lệ phiếu đồng nhất và chênh lệch với kỳ trước. Thanh tra chỉ xem chỉ số được cho phép, không nhận điểm tuyệt đối, câu trả lời hoặc tự luận. Quyết định xem xét có lý do/lịch sử, có thể báo Đảm bảo chất lượng hoặc tạo hồ sơ xác minh; cảnh báo không tự chặn công bố và không tự kết luận đúng sai.

Các kết quả đã có tại thời điểm lập nháp:

| Nhóm kiểm | Kết quả đã quan sát | Giới hạn cần giữ khi chốt |
| --- | --- | --- |
| Service/MySQL báo cáo | 11/11 nhóm, fixture đã dọn ở lượt trước sửa cuối | Chưa thay thế lượt chạy 13 nhóm sau sửa che tổng cha và phiếu NA; cần chạy lại nguồn cuối |
| Service/MySQL bất thường | 9/9 nhóm, fixture đã dọn ở lượt trước sửa mới nhất | Cần chạy lại sau sửa quyết định lưu ý/thông báo và các kiểm hồi quy liên quan |
| File xuất | 10/10 nhóm; đọc lại byte CSV/XLSX và giải mã nội dung PDF bằng parser | Có kiểm tiếng Việt, ô che, công thức bảng tính và dòng cuối; không thay thế kiểm quyền từ database |
| PDF nhiều trang | 5 trang, đã mở xem bản PDF được tạo | Chỉ nhận phạm vi tệp đã xem, không chứng nhận mọi bộ dữ liệu hoặc mọi trình đọc |
| Demo trên database mới | 19/19 nhóm ở lượt đã chạy | Cần đối chiếu lại cùng nguồn bàn giao và dữ liệu main sau seed |
| E2E Playwright | 3/3 kịch bản, khoảng 2,2 phút | Bao gồm UC-GOLD, kiểm dashboard mười vai trò và kiểm năm vai trò ở desktop/mobile; không tương đương nghiệm thu toàn bộ chức năng của mười vai trò |
| Kiểm tổng, build, main và CI Tuần 12 | Chưa chốt | Chưa ghi số phép qua, SHA hoặc kết luận xanh khi chưa có kết quả cuối |

Nguồn kịch bản: [UC-GOLD và dashboard E2E](../../tests/e2e/uc-gold.spec.ts), [MySQL báo cáo](../../scripts/verify-week12-reports.ts), [đọc file xuất](../../scripts/verify-week12-exports.ts). Các kiểm báo cáo có canary tên/tài khoản/email sinh viên và nội dung riêng tư trong database thử, gọi service xuất thật cho ba vai trò mới. Không suy kiểm synthetic DTO hoặc đọc byte file thành bằng chứng mọi quyền truy cập đã được thử. Ảnh và bản kiểm chứng nguồn cuối được đối chiếu khi chốt nghiệm thu; không dùng ảnh các tuần trước thay cho giao diện mới.

Tài liệu đã có [công thức báo cáo](../CONG_THUC_BAO_CAO.md), [ADR-012 về quyền và ngưỡng](../decisions/ADR-012-bao-cao-va-nguong-du-lieu.md), cùng ERD cập nhật. Migration và seed chỉ dùng dữ liệu giả; bước bảo toàn hash dữ liệu main trước/sau đang chờ kết quả cuối, không ghi đã bảo toàn chỉ từ việc có bản chụp trước sửa.

## 3. Đối chiếu kế hoạch

| Mục | Trạng thái trước chốt | Bằng chứng và việc còn phải hoàn tất |
| --- | --- | --- |
| FR-90: dashboard theo vai trò | Đã triển khai, chờ chốt | Service scope, API/UI, E2E mười vai trò; chờ kiểm tổng và CI nguồn cuối |
| FR-91: biểu đồ và so sánh | Đã triển khai, chờ chốt | Biểu đồ dùng dữ liệu DTO đã kiểm quyền/ngưỡng, không thay ô che bằng 0; kiểm desktop/mobile đã chạy |
| FR-92: CSV/Excel | Đã triển khai, chờ chốt | Đọc lại byte/tệp, tiếng Việt và chặn công thức; chờ đối chiếu service quyền từ database nguồn cuối |
| FR-93: PDF | Đã triển khai, chờ chốt | Parser đọc nội dung, bảng nhiều trang và dòng cuối; bản PDF 5 trang đã được mở xem |
| FR-94: báo cáo xử lý phản hồi | Đã triển khai, chờ chốt | Số lượng, thời gian, quá hạn, hài lòng; tỷ lệ có mẫu số rõ ràng, ô nhỏ và tổng cha được bảo vệ |
| FR-147: dashboard Phòng Đào tạo | Đã triển khai, chờ chốt | Độ sẵn sàng, lớp có lỗi và phản hồi tổ chức lớp; không đưa roster/email/mã băm danh sách vào DTO |
| FR-151: thống kê Khảo thí | Đã triển khai, chờ chốt | Chỉ phản hồi thi và nhóm đánh giá gộp đủ mẫu/từ công bố; không có lớp, giảng viên hoặc tự luận |
| FR-158: bất thường khảo sát | Đã triển khai, chờ chốt | Chỉ số, ngưỡng, xem xét, thông báo và mở hồ sơ; cần chạy lại bộ kiểm sau sửa cuối |
| FR-159: thống kê Thanh tra | Đã triển khai, chờ chốt | Loại/trạng thái/thời gian/tỷ lệ quá hạn, loại xung đột trước gộp, không có định danh hoặc nội dung hồ sơ |
| UC-GOLD, E2E và báo cáo | E2E đã qua, tài liệu đang chốt | 3/3 kịch bản đã chạy; chưa nhận mọi nhánh thủ công/mọi thiết bị đã được kiểm |
| FR-145 và FR-160 | Giữ nguyên tồn đọng/phạm vi | FR-145 còn backlog; FR-160 mới một phần, nghiệm thu đầy đủ ở Tuần 13 |

Chưa đánh dấu chín FR Tuần 12 hoàn thành trước khi kiểm tổng, build, các bộ dịch vụ sau sửa, dữ liệu main và CI nguồn bàn giao được đối chiếu. Các sửa hồi quy để bảo vệ ngưỡng không được tính thêm FR mới.

## 4. Tiến độ lũy kế

Mốc đã nghiệm thu trước Tuần 12 là **188/219 = 85,8%, 68/84 FR**. Chín FR-90/91/92/93/94/147/151/158/159 có tổng **20 điểm**; khi đủ điều kiện chốt sẽ nâng tiến độ lên **208/219 = 95,0%, 77/84 FR**. Đây là mốc mục tiêu chốt, chưa phải số đã đánh dấu hoàn thành tại thời điểm bản nháp. Kế hoạch lũy kế Tuần 12 là **210/219 = 95,9%**, chênh **2 điểm** của FR-145.

| Module | Đã nghiệm thu đến Tuần 11 | Mục tiêu khi chốt Tuần 12 |
| --- | --- | --- |
| M1 Xác thực và phiên | 22/23 | 22/23 |
| M2 Người dùng, phân quyền, kiểm toán | 9/9 | 9/9 |
| M3 Danh mục và nhập liệu | 9/9 | 9/9 |
| M4 Mẫu phiếu | 16/16 | 16/16 |
| M5 Đợt khảo sát | 22/22 | 22/22 |
| M6 Làm khảo sát | 14/14 | 14/14 |
| M7 Kết quả | 18/18 | 18/18 |
| M8 Phản hồi | 19/19 | 19/19 |
| M9 Thông báo | 7/7 | 7/7 |
| M10 Báo cáo | 0/12 | 12/12 |
| M11 Hệ thống | 9/11 | 9/11 |
| M12 Mở rộng | 0/3 | 0/3 |
| M13 Phòng Đào tạo | 18/22 | 20/22 |
| M14 Phòng Khảo thí | 11/13 | 13/13 |
| M15 Phòng Thanh tra | 14/18 | 18/18 |
| M16 Ma trận quyền mở rộng | 0/3 | 0/3 |

Đối chiếu số cuối bằng `npm run progress` sau khi điều kiện nghiệm thu được thỏa mãn. Không suy phần trăm từ số ảnh, số bảng hoặc số dòng mã; không tự cắt FR-145 để làm khớp kế hoạch.

## 5. Khó khăn, rủi ro và hướng xử lý

Ẩn một ô ít mẫu nhưng giữ tổng bộ môn/khoa có thể làm lộ ô đó bằng phép trừ. Đã thêm truyền trạng thái ẩn từ nhóm con lên tổng cha và kiểm hồi quy cho lớp 5 phiếu/lớp 1 phiếu, cũng như môn thiếu ngưỡng hai giảng viên. Những kết quả kiểm trước sửa không được dùng thay lượt sau sửa. Trường hợp giảng viên có phiếu nhưng toàn NA cũng đã được tách khỏi số người thực sự đóng góp điểm đánh giá.

Quyền đa vai trò phải được kiểm ở service: chọn giao diện giảng viên không được lấy quyền toàn trường của Đảm bảo chất lượng, ADMIN không được đọc nội dung nghiệp vụ, Thanh tra bị loại hồ sơ xung đột trước khi tính số lượng. Chỉ che giao diện hoặc lọc sau khi đếm không đủ. File xuất dùng cùng DTO với dashboard để giảm khả năng có một đường xuất bỏ qua quyền/ngưỡng.

Cảnh báo bất thường chỉ là gợi ý quản lý, không phải kết luận vi phạm. Thời gian xử lý trong báo cáo là ngày lịch; SLA dùng ngày làm việc. Phản hồi mở lại có thể đổi mốc trả lời, nên thống kê ghi rõ chu kỳ gần nhất còn lưu, không khẳng định đã phục dựng toàn bộ lịch sử thời hạn.

Ẩn danh vẫn ở mức ứng dụng, không chống quyền hạ tầng, kết hợp dữ liệu bên ngoài hoặc tự tiết lộ. Chưa chứng nhận mọi thiết bị, WCAG, kiểm tải 1.500 request hoặc toàn bộ ma trận quyền/tệp xuất của mọi tính năng; đó là phạm vi kiểm định Tuần 13. Chưa triển khai công khai hoặc dùng dữ liệu thật. Bảo toàn main và CI nguồn mới chỉ được nhận sau kết quả cuối, không từ các lượt từng phần.

## 6. Kế hoạch Tuần 13

Chỉ bắt đầu khi người dùng yêu cầu: kiểm thử hệ thống, bảo mật và hiệu năng; hoàn thiện ma trận mười vai trò, IDOR, tệp xuất và các ca kiểm bắt buộc của Điều chỉnh số 01. Rà soát header/cookie/giới hạn tần suất/upload, kiểm tải nộp phiếu và điều chỉnh responsive/khả năng tiếp cận. Không tự thêm tính năng mới ngoài kế hoạch.

Giữ FR-145 trong backlog và FR-160 ở trạng thái một phần cho đến khi có bằng chứng đủ. Tiếp tục bảo toàn dữ liệu và khóa MFA của chủ dự án. Giai đoạn nâng cấp UI riêng chưa bắt đầu; chỉ kích hoạt bằng lệnh tương ứng sau khi hoàn thành 15 tuần.

## 7. Phân công và đóng góp thành viên

**[SINH VIÊN TỰ ĐIỀN]** Họ tên, phần thực làm, bằng chứng commit, kiểm thử và nội dung thuyết minh. AI không điền tên, số giờ hoặc đóng góp thay thành viên. Các phần do agent hỗ trợ không được ghi thành đóng góp thực tế của sinh viên.

## 8. Các bước kiểm tra nhanh cho giảng viên

1. Mở Docker rồi chạy `KHOI_DONG_DU_AN.cmd` theo [README](../../README.md), giữ cửa sổ máy chủ mở. Chỉ dùng dữ liệu giả; không reset database, mật khẩu đã đổi hoặc MFA của chủ dự án.
2. Vào **Báo cáo** bằng tài khoản sinh viên, giảng viên/trưởng đơn vị và ADMIN: kiểm dữ liệu thuộc đúng tài khoản/phạm vi; ADMIN chỉ có vận hành tài khoản. Chọn học kỳ/đợt/đơn vị và đối chiếu nhãn phạm vi áp dụng; người ngoài phạm vi không đọc được khi đổi ID trên URL.
3. Dùng Phòng Đào tạo, Khảo thí và Thanh tra: Phòng Đào tạo chỉ thấy độ sẵn sàng/phản hồi tổ chức lớp; Khảo thí không có bảng lớp/giảng viên/tự luận; Thanh tra không thấy hồ sơ xung đột. Nhóm ít mẫu hiện chưa đủ dữ liệu và không suy ra được từ tổng cha.
4. Tải CSV/Excel/PDF, mở lại để kiểm tiếng Việt, phạm vi và ô bị che; không có tên/tài khoản/email/ID sinh viên hoặc nội dung phản hồi. Đối chiếu tỷ lệ với mẫu số ghi ở cột, không coi ô `null` là 0%.
5. Dùng Thanh tra vào luồng **Bất thường khảo sát**, xem chỉ số, ghi nhận xem xét hoặc tạo hồ sơ xác minh theo quyền. Đảm bảo chất lượng nhận lời nhắc chung khi được báo lưu ý nhưng không được mở chỉ số mật; có cờ bất thường không tự chặn công bố.
6. Đối chiếu các bộ MySQL Tuần 12, `test:e2e`, `test:demo`, `check`, `build`, `progress`, hash main và CI đúng SHA nguồn cuối. Các số đang chờ trong bản nháp phải được cập nhật từ lượt chạy thật trước khi nộp báo cáo.

## 9. Bản rút gọn để dán vào hệ thống của trường

Nhóm đã triển khai dashboard theo vai trò, báo cáo xử lý phản hồi, xuất CSV/Excel/PDF và cảnh báo bất thường khảo sát. Ba kịch bản E2E đã qua, gồm UC-GOLD, dashboard mười vai trò và kiểm desktop/mobile. Bộ đọc file xuất qua 10 nhóm; PDF 5 trang đã được xem. Các bộ MySQL bước đầu qua 11 nhóm báo cáo và 9 nhóm bất thường; đang chờ chạy lại sau sửa cuối. Kiểm tổng, build, dữ liệu main và CI Tuần 12 chưa chốt. Mốc đã nghiệm thu là 188/219 điểm; mục tiêu sau nghiệm thu chín FR mới là 208/219, 77/84 FR. FR-145 còn backlog, FR-160 tiếp tục ở Tuần 13. Đóng góp cá nhân do sinh viên tự điền.

## 10. Điều chỉnh so với kế hoạch

**Ngày yêu cầu:** [SINH VIÊN TỰ ĐIỀN]. **Tên người yêu cầu:** [SINH VIÊN TỰ ĐIỀN]. **Lý do theo yêu cầu GVHD:** [nhóm tự xác minh]. Ngày thực hiện 03/11 là ngày phiên làm, không thay ngày hoặc tên người yêu cầu mà nhóm cần xác nhận.

Tuần 12 thực hiện FR-147/151/158/159 theo Điều chỉnh số 01 cùng năm FR báo cáo gốc; dữ liệu cảnh báo bất thường chỉ được thêm khi luồng tương ứng đã có. Không tự cắt cảnh báo hoặc thống kê P1. Bổ sung bảo vệ tổng cha và cách đếm giảng viên đóng góp điểm là sửa để đáp ứng yêu cầu quyền/ngưỡng, không cộng thêm FR hoặc thay công thức gốc.

Các giới hạn Khảo thí không thay phúc khảo, Thanh tra không thay quy trình chính thức và ẩn danh ở mức ứng dụng vẫn giữ nguyên. UI nâng cấp riêng chưa được kích hoạt. Không viết quy trình hiện tại ở trường hoặc bịa đóng góp của thành viên. Tất cả kết quả còn chờ ở mục 2 cần được cập nhật từ bằng chứng nguồn cuối trước khi chuyển báo cáo từ nháp sang đã nghiệm thu.
