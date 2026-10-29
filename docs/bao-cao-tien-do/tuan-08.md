# BÁO CÁO TIẾN ĐỘ TUẦN 8/15 — thực hiện 29–30/10/2026

**Đề tài:** Xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học.

**Tiểu luận chuyên ngành HK1 2026–2027 | Nhóm:** [sinh viên điền] **| GVHD:** [sinh viên điền].

**Mốc kế hoạch giả định:**18–24/11/2026, tính tuần bảy ngày từ 30/09. **Thực hiện:** bắt đầu 29/10, tiếp tục 30/10/2026 theo yêu cầu trực tiếp của người dùng; không ghi lùi ngày. Nhóm đối chiếu lịch trường và tự điền ngày/tên GVHD yêu cầu.

**Trạng thái:** đã nghiệm thu FR-50–54; mã/test/tài liệu/UI và CI nguồn cuối qua. AI hỗ trợ nháp kỹ thuật, nhóm cần đọc, chạy thử và viết lại bằng lời của mình.

## 1. Mục tiêu của tuần

Cho sinh viên xem nhiệm vụ khảo sát đã chốt của mình, làm form động đúng mẫu, kiểm câu bắt buộc/Không áp dụng/loại giá trị, lưu nháp cục bộ, nộp ẩn danh một lần trong transaction và xem xác nhận. Kiểm phân quyền, nộp trùng/ngoài giờ, đồng thời/rollback và ranh giới ẩn danh 5.6. Không làm tổng hợp kết quả.

## 2. Kết quả đạt được và bằng chứng

Có `/khao-sat`, form theo nhiệm vụ và trang đã nộp. Service chỉ dùng task đã chốt, đọc lại actor/phiên/grant trong transaction; ADMIN không có quyền nghiệp vụ ngầm. Câu trả lời được kiểm đúng mẫu/năm loại/cả hai thang, rồi ghi cùng PENDING→DONE; không thêm liên kết danh tính–phiếu, timestamp chính xác hoặc audit nộp. Ngày nghiệp vụ thống nhất theo Việt Nam. Giao diện khôi phục nháp đã kiểm và đọc lại trạng thái khi mất phản hồi nộp, không tự retry POST.

Full `npm run check` ngày 30/10 qua646/646 test trong 39 tệp, schema/ERD/lint/TypeScript qua; build Next 16.4.3 qua. HTTP/MySQL 16/16 nhóm, bao gồm 20 POST đồng thời với 1 thành công/19 bị 409,1 response/6 answers; trigger ép lỗi chèn câu trả lời cho task PENDING/0 response/0 answer, bỏ trigger retry thành công. Fixture được dọn,27 tập main trước/sau khớp hash. UI 13 nhóm/17 trạng thái/34 viewport/34 PNG đã xem,0 lỗi đo được; seed giữ nguyên. Nguồn `6edad31fef16ee11f5ace82645107b0b7153742d` và [CI 40925339620](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40925339620) đúng SHA qua check/smoke; không tính lượt lỗi là nghiệm thu. Kết quả/ảnh/giới hạn tại [nghiệm thu](../NGHIEM_THU_TUAN_08.md), [QA](../QA_GIAO_DIEN_TUAN_08.md) và [truy vết](../TRUY_VET.md). CI main/tài liệu cuối đối chiếu riêng.

## 3. Đối chiếu kế hoạch

| Mục | Hiện trạng | Bằng chứng và giới hạn |
| --- | --- | --- |
| Danh sách khảo sát own/hạn chót/trạng thái | Hoàn thành FR-50 | HTTP ownlist/count/page/IDOR và QA01/02/12 |
| Form động/tiến trình/kiểm hợp lệ | Hoàn thành FR-51 | Năm loại/cả hai thang/NA/bắt buộc qua unit/HTTP/QA04 |
| Nháp phía trình duyệt | Hoàn thành FR-52 | QA reload/nháp hỏng/storage bị chặn/đa tab/logout/đồng hồ/gia hạn qua |
| Nộp một lần/nguyên tử | Hoàn thành FR-53 |16HTTP,20 POST/duplicate409/rollback; QA mất phản hồi, CI qua |
| Xác nhận | Hoàn thành FR-54 | Chỉ trạng thái/ngày; QA09/10 sau commit không đọc/bản sao phiếu |
| Test ẩn danh 5.6 | Schema/DTO/log hiện có được kiểm đúng phạm vi | Export kết quả chưa có; kiểm CSV/Excel/PDF Tuần 12, không nhận đã qua |
| Tài liệu/sơ đồ/giải thích | Hoàn thành | ADR009,3 sơ đồ/ERD,5 câu bảo vệ,báo cáo 10 mục/ảnh/README/truyvết/nhật ký |
| FR-145 ImportBatch/hoàn tác | Chưa thực hiện | P1 có điều kiện giữ backlog; chưa được người dùng cắt |

## 4. Tiến độ lũy kế

Sau nghiệm thu FR-50–54, `npm run progress` trả **117/219=53,4%, 41/84 FR**, M6=14/14 điểm; thêm 14 điểm so với mốc Tuần 7 là103/219=47,0%. Kế hoạch lũy kế Tuần 8 là **119/219=54,3%**, chênh2 điểm do FR-145 P1 có điều kiện chưa thực hiện; không tự cắt hoặc loại khỏi mẫu số. Tỷ lệ tính từ checkbox có trọng số, không từ số dòng mã hoặc độ lớn schema.

| Module | Điểm đã nghiệm thu tại lượt cập nhật |
| --- | --- |
| M1 Xác thực và phiên |22/23 |
| M2 Người dùng, phân quyền, kiểm toán |9/9 |
| M3 Danh mục và nhập liệu |9/9 |
| M4 Mẫu phiếu |16/16 |
| M5 Đợt khảo sát |20/22 |
| M6 Làm khảo sát |14/14=100% |
| M7 Kết quả |0/18 |
| M8 Phản hồi |0/19 |
| M9 Thông báo |0/7 |
| M10 Báo cáo |0/12 |
| M11 Hệ thống |9/11 |
| M12 Mở rộng |0/3 |
| M13 Phòng Đào tạo |15/22 |
| M14 Phòng Khảo thí |3/13 |
| M15 Phòng Thanh tra |0/18 |
| M16 Ma trận quyền mở rộng |0/3 |

Thực hiện sớm hơn mốc lịch giả định theo yêu cầu người dùng không có nghĩa đã hoàn thành những tuần chưa làm. Nhóm cần tự xác minh lịch trường và đóng góp cá nhân.

## 5. Khó khăn, rủi ro và cách xử lý

- Cần biết ai hoàn thành nhưng không nối người với phiếu. Tách Task khỏi Response/Answer, whitelist ghi/DTO, UUID ngẫu nhiên và DATE; không log hoặc audit nội dung nộp. Không tuyên bố chống DBA/binlog hoặc tự luận tự nhận diện.
- BR-04 nhận đúng thời điểm kết thúc, nên sửa lifecycle đóng sau mốc endsAt và thêm test đúng biên. Server vẫn quyết định, đồng hồ client chỉ hiển thị.
- Mất phản hồi sau commit có thể làm người dùng bấm lại. Client đọc trạng thái trước; nếu cả POST lẫn GET không rõ kết quả thì khóa nộp tới khi đọc lại được. Kiểm CAS và transaction phía DB vẫn là lớp chống trùng.
- Nháp localStorage trên máy dùng chung có rủi ro riêng. Không chứa token; kiểm version/giới hạn/hạn lưu, dọn theo trạng thái server/đăng xuất và đồng bộ tín hiệu xóa giữa tab.
- QA phát hiện thông báo nháp hỏng bị mất khi StrictMode chạy lại effect; đã giữ cache chỉ chứa thông báo và dọn ref ở các nhánh kết thúc. Harness cũng sửa polling tab nền/chờ repaint sau lỗi chụp lặp mảng; đã chạy lại toàn bộ và chỉ dùng 34 ảnh cuối đã xem.
- MySQL không cho user ứng dụng tạo trigger khi binlog yêu cầu quyền cao hơn. Bộ kiểm rollback dùng helper giới hạn đúng DB marker/server UUID/câu hỏi fixture; sửa guard chuỗi tab để đối chiếu kết quả batch đúng, không đổi GLOBAL hoặc nâng quyền user runtime. Fixture bị kẹt được dọn đúng prefix và hash34 model còn lại khớp; chạy lại suite 16/16 qua, trigger cuối dọn sạch.
- 20 request không chứng minh tải 1.500 request; chưa chứng nhận WCAG hoặc mọi thiết bị. Kiểm export và log hạ tầng tương lai còn riêng.

## 6. Kế hoạch Tuần 9

Chỉ bắt đầu khi người dùng yêu cầu: tổng hợp theo5.7/TC-AGG-01, ngưỡng/công bố, quyền xem kết quả, so sánh, kiểm duyệt tự luận, danh sách chưa hoàn thành/nhắc nhở. Tích hợp Khảo thí theo BR-57/FR-150: nhóm đánh giá gộp sau công bố, ít nhất2giảng viên và đủ mẫu; không lớp/GV/tự luận. Giữ FR-145 theo dõi riêng, chưa tự cắt hoặc làm trước phản hồi.

## 7. Phân công và đóng góp thành viên

**[SINH VIÊN TỰ ĐIỀN]** Họ tên, phần thực làm, bằng chứng commit/kiểm thử/thuyết minh. AI không gán tên, số giờ hoặc đóng góp cho thành viên. Phần AI hỗ trợ được ghi riêng trong AI_USAGE.

## 8. Các bước kiểm tra nhanh cho giảng viên

1. Theo README mở Docker Compose, web và scheduler. Đăng nhập sinh viên seed `DEMO-SV00001` với mật khẩu ban đầu `Demo2026!HocTap`, mở **Khảo sát của tôi** và chọn đợt còn hạn; danh sách chỉ có nhiệm vụ đã chốt của chính tài khoản. `SV2026001` thử xác thực có thể chưa có task. Nếu mọi đợt đã hết hạn/hoàn thành, tạo đợt mới theo workflow Tuần 7, không reset hoặc lùi đồng hồ.
2. Mở nhiệm vụ đang nhận bài. Thử bỏ câu bắt buộc/chọn sai thang; giao diện báo chưa hợp lệ, server vẫn kiểm lại. Làm năm loại câu khi dùng mẫu mặc định hiện hành; mẫu lịch sử có thể ít loại hơn.
3. Nhập một phần rồi tải lại để kiểm nháp. Đăng xuất hoặc hoàn thành khảo sát để kiểm nháp bị dọn; dùng dữ liệu giả và không lưu trên máy dùng chung nếu không muốn giữ nháp.
4. Nộp đủ câu trong thời hạn. Trang xác nhận chỉ hiện đã nộp/ngày, không có ID hoặc bản sao nội dung. Mở lại nhiệm vụ/nộp lần hai bị chặn; nhiệm vụ ngoài thời hạn cũng không nhận.
5. Đăng nhập SV khác/thử ID nhiệm vụ không thuộc mình: không đọc/nộp được. ADMIN đơn vai trò không được trang khảo sát sinh viên. Chạy bộ HTTP để xem 20 POST chỉ 1 thành công và rollback thực tế.
6. Chạy check/build/test:week8/progress theo README; đối chiếu CI đúng SHA, ảnh QA và phạm vi 5.6(d) trong nghiệm thu. Chưa có trang kết quả/công bố Tuần 9.

## 9. Bản rút gọn để dán vào hệ thống của trường

Nhóm hoàn thành danh sách khảo sát cá nhân, form động, kiểm hợp lệ, nháp trình duyệt và xác nhận đã nộp. Luồng nộp cập nhật nhiệm vụ và lưu phiếu trong cùng giao dịch, dùng UUID ngẫu nhiên và chỉ ngày, không lưu liên kết từ phiếu tới sinh viên. Check 646test/build,16 nhómHTTP và13 nhómUI/34 ảnh đã qua;20 yêu cầu nộp chỉ một thành công, lỗi chèn đáp án rollback toàn bộ. CI nguồn cuối thành công, dữ liệu cũ giữ nguyên. Tiến độ117/219=53,4%. Tổng hợp/công bố thuộc tuần sau; lô nhập/hoàn tác P1 chưa thực hiện. Nhóm cần thử lại và bổ sung đóng góp thành viên.

## 10. Điều chỉnh so với kế hoạch

**Ngày yêu cầu:** [SINH VIÊN TỰ ĐIỀN]. **Tên người yêu cầu:** [SINH VIÊN TỰ ĐIỀN]. Lý do theo GVHD: [nhóm tự xác minh]. Tuần 8 giữ FR-50–54, không thêm tổng hợp/công bố. Tiêu chí export trong5.6(d) được giữ nguyên, nhưng chưa có chức năng xuất kết quả để nhận đã kiểm; phần hiện có là DTO/payload/log, phải tiếp tục kiểm export đúng Tuần 12. FR-145 P1 có điều kiện vẫn backlog. Không viết phần quy trình hiện tại ở trường theo yêu cầu người dùng; ngày thao tác kỹ thuật29–30/10 không thay ngày GVHD yêu cầu.
