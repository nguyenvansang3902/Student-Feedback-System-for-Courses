# BÁO CÁO TIẾN ĐỘ TUẦN 11/15

**Đề tài:** Xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học.

**Tiểu luận chuyên ngành HK1 2026–2027 | Nhóm:** [sinh viên điền] **| GVHD:** [sinh viên điền].

**Mốc kế hoạch giả định:** 09–15/12/2026, tính tuần bảy ngày từ 30/09. **Thực hiện:** 02–03/11/2026 theo yêu cầu trực tiếp của người dùng; nhóm đối chiếu lịch trường, không ghi lùi ngày.

**Trạng thái:** Tuần 11 đã đạt nghiệm thu kỹ thuật cục bộ: kiểm tổng, build và các bộ kiểm MySQL đã qua sau sửa cuối. QA trình duyệt có các giới hạn ghi bên dưới; CI nguồn d60c350 đã qua check/smoke, xem liên kết bên dưới. Đây là nháp kỹ thuật có AI hỗ trợ; nhóm cần thử lại và thuyết minh bằng lời của mình.

## 1. Mục tiêu của tuần

Hoàn thiện SLA, cờ quá hạn và leo thang; giới hạn gửi và cảnh báo nội dung trùng; đánh giá hài lòng và mở lại; giải trình cải tiến; thông báo trong ứng dụng, email và nhắc hạn. Theo Điều chỉnh số 01, hoàn tất quy trình Thanh tra từ xác minh đến kết luận, thông báo và đóng; bổ sung chuyển hồ sơ một chiều và kiến nghị rà soát của Khảo thí. Không triển khai dashboard, báo cáo tổng hợp hoặc cảnh báo bất thường của Tuần 12.

Giao diện chức năng tiếp tục dùng câu chữ trung tính theo vai trò, không placeholder trong ô nhập và hạn chế slogan. Giai đoạn nâng cấp UI riêng vẫn được hoãn theo chỉ đạo người dùng.

## 2. Kết quả đạt được và bằng chứng

Đã hoàn thành dịch vụ và giao diện chức năng cho SLA/ngày làm việc, giới hạn gửi, hài lòng/mở lại, giải trình và kiến nghị, hồ sơ Thanh tra, thông báo và worker email. Các thao tác kiểm lại phiên, vai trò và phạm vi trong giao dịch; dùng revision/requestId để chặn xung đột và xử lý yêu cầu gửi lại. Quá hạn là thuộc tính, không tạo trạng thái mới. Scheduler và lượt truy cập được dùng để bảo đảm công việc đến hạn; các sửa cuối cho truy cập Thanh tra và thứ tự xử lý thông báo đã được kiểm lại.

Lượt `npm run check` cuối sau sửa đạt **1140 passed, 1 skipped / 1141 trong 76 tệp** trên Windows; skipped là phép tạo file symlink bị hệ điều hành từ chối, không tính thành passed. **Build Next.js 16.4.3 thành công**. Các kết quả này thay mốc kiểm trước sửa, không cộng nhẩm từ những lần chạy lẻ.

Bốn bộ kiểm dịch vụ/MySQL riêng đã chạy lại và qua **43 nhóm**, gồm phản hồi nâng cao **14**, Thanh tra **7**, giải trình/kiến nghị **12**, thông báo/SMTP/Mailpit **10**. Các bộ được chạy tuần tự và dọn fixture của từng lượt. Lượt chạy song song ban đầu gây nhiễu các fixture có vai trò GLOBAL, không được dùng làm bằng chứng nghiệm thu. Những tình huống đã kiểm gồm cạnh tranh tiếp nhận/chuyển hồ sơ, leo thang không trùng, giới hạn gửi, hài lòng/mở lại, giải trình cần bổ sung rồi xác nhận, kiến nghị và nhắc hạn, tệp nội bộ, xung đột đa vai trò, worker kiểm lại quyền trước khi gửi và email không chứa nội dung mật.

Hồi quy Tuần 10 đạt **19 nhóm**, Tuần 9 đạt **12 nhóm**; ràng buộc MySQL **16/16**. Bộ demo chạy lại đạt **18/18**. Migration bổ sung 6 bảng, đưa runtime lên **43 bảng**, so với **46 bảng thiết kế** và **3 bảng chỉ thiết kế**. Sau áp dụng migration và seed, **9.399 bản ghi cũ trong 37 bảng giữ hash**; không reset database hoặc volume. Bundle demo thêm hồ sơ XAC_MINH và yêu cầu giải trình đúng phạm vi Tuần 11; không seed kiến nghị rà soát và không biến hồ sơ Tuần 10 thành dữ liệu lịch sử đã hoàn tất quy trình mới. Kiến nghị đã được tạo và kiểm bằng fixture riêng trong bộ MySQL.

Đã thao tác trong trình duyệt với dữ liệu giả: giảng viên gửi giải trình; trưởng bộ môn xác nhận và đánh dấu thông báo đã đọc; Thanh tra lưu ghi chú, lưu kết luận và chuyển tới trạng thái Thông báo. Ảnh đã lưu cho [giảng viên gửi](../assets/tuan-11/ui/gv-da-gui-giai-trinh.png), [trưởng bộ môn xác nhận](../assets/tuan-11/ui/tbm-da-xac-nhan.png), [thông báo đã đọc](../assets/tuan-11/ui/tbm-thong-bao-da-doc.png), [Thanh tra xác minh](../assets/tuan-11/ui/tt-xac-minh.png) và [Thanh tra kết luận](../assets/tuan-11/ui/tt-ket-luan.png). Công cụ trình duyệt sau đó không truy cập được; **chưa thử tay bước đóng hồ sơ, sinh viên đọc kết quả và Lãnh đạo xem tóm tắt Tuần 11**, dù các nhánh dịch vụ tương ứng đã có kiểm MySQL. Không suy kết quả kiểm dịch vụ thành bằng chứng UI.

Tài liệu bổ sung: [bảng SLA](../SLA_TUAN_11.md), [quy trình Thanh tra](../QUY_TRINH_THANH_TRA_TUAN_11.md), [nháp chương hiện thực](../CHUONG_HIEN_THUC_TUAN_11.md) và ERD Tuần 11. Nguồn bàn giao, SHA và trạng thái CI được đối chiếu tại [nghiệm thu Tuần 11](../NGHIEM_THU_TUAN_11.md); [QA giao diện](../QA_GIAO_DIEN_TUAN_11.md) ghi phạm vi thao tác thật. Tại thời điểm chốt báo cáo này, CI Tuần 11 còn chờ xác nhận; không dùng CI của Tuần 10 để chứng minh mã mới.

## 3. Đối chiếu kế hoạch

| Mục | Kết quả nghiệm thu kỹ thuật | Bằng chứng và giới hạn |
| --- | --- | --- |
| FR-74; BR-23/54/56/60 | Hoàn thành | SLA cấu hình, ngày làm việc, cờ quá hạn, chuỗi leo thang và thông báo Thanh tra; truy cập đầu tiên và worker đã có kiểm hồi quy |
| FR-75; BR-25 | Hoàn thành | Đánh giá 1–5 trong cửa sổ cho phép, đánh giá thấp được mở lại một lần, chặn thao tác đồng thời và sinh viên khác |
| BR-26 | Hoàn thành | Giới hạn phản hồi/ngày, cảnh báo trùng nội dung theo thời gian cấu hình; không tự chặn một phản hồi chỉ vì giống nội dung |
| FR-66; BR-10 | Hoàn thành | Tạo yêu cầu cho lớp điểm thấp đủ điều kiện; gửi, bổ sung có nhận xét, xác nhận; kiểm quyền và nhắc hạn; UI đã thử gửi/xác nhận |
| FR-80/81/82 | Hoàn thành | Thông báo riêng từng người, đánh dấu đọc, nhắc hạn, lease/retry và kiểm lại quyền trước SMTP; kiểm MySQL/Mailpit và hồi quy qua |
| FR-152; BR-58 | Hoàn thành | Khảo thí gửi kiến nghị gắn môn/đợt; TBM tiếp thu hoặc không tiếp thu kèm lý do, nhắc hạn và báo trưởng khoa; kiểm bằng fixture riêng |
| FR-154/156; BR-61/62/63 | Hoàn thành kỹ thuật, UI một phần | Tiếp nhận → xác minh → kết luận → thông báo → đóng; ghi chú/tệp nội bộ; đúng mức tiết lộ; chưa thử tay đủ nhánh sinh viên/Lãnh đạo/đóng |
| FR-157; BR-64 | Hoàn thành | Chuyển thường sang Thanh tra có lý do, thu hồi quyền nội dung người cũ, chỉ giữ tóm tắt; cạnh tranh 6 lệnh chỉ tạo 1 hồ sơ |
| Tài liệu, seed và bảo toàn dữ liệu | Hoàn thành cục bộ | SLA, chương hiện thực, ERD, demo 18 nhóm và hash dữ liệu cũ; CI nguồn bàn giao theo dõi riêng |
| FR-145, FR-160 và phạm vi Tuần 12 | Chưa hoàn tất hoặc chưa đến tuần | FR-145 vẫn backlog; ma trận quyền đầy đủ ở Tuần 13; không triển khai dashboard, xuất báo cáo hoặc cảnh báo bất thường trong tuần này |

Mười FR Tuần 11 được chốt theo mã, kiểm thử và tài liệu. Giới hạn QA trình duyệt và trạng thái CI được ghi riêng, không nhận các kiểm tra chưa chạy là đã hoàn tất.

## 4. Tiến độ lũy kế

Chốt thêm 10 FR-66/74/75/80/81/82/152/154/156/157, tương ứng **23 điểm**, nâng mốc Tuần 10 từ 165/219 lên **188/219 = 85,8%, 68/84 FR**. Kế hoạch lũy kế Tuần 11 là **190/219 = 86,8%**; chênh **2 điểm** do FR-145 P1 vẫn còn backlog. Cách tính giữ trọng số P0 = 3, P1 = 2, P2 = 1 và mẫu số gồm cả FR chưa xếp tuần.

| Module | Điểm đã nghiệm thu |
| --- | --- |
| M1 Xác thực và phiên | 22/23 |
| M2 Người dùng, phân quyền, kiểm toán | 9/9 |
| M3 Danh mục và nhập liệu | 9/9 |
| M4 Mẫu phiếu | 16/16 |
| M5 Đợt khảo sát | 22/22 |
| M6 Làm khảo sát | 14/14 |
| M7 Kết quả | 18/18 |
| M8 Phản hồi | 19/19 |
| M9 Thông báo | 7/7 |
| M10 Báo cáo | 0/12 |
| M11 Hệ thống | 9/11 |
| M12 Mở rộng | 0/3 |
| M13 Phòng Đào tạo | 18/22 |
| M14 Phòng Khảo thí | 11/13 |
| M15 Phòng Thanh tra | 14/18 |
| M16 Ma trận quyền mở rộng | 0/3 |

M15 đạt 14/18: FR-153/154/155/156 đều P0, được 12 điểm; FR-157 P1 được 2 điểm. FR-158/159 còn 4 điểm ở Tuần 12, không được tính vào Tuần 11. Đối chiếu bảng với `npm run progress`; không ước lượng phần trăm từ số bảng, số dòng mã hoặc số ảnh.

## 5. Khó khăn, rủi ro và hướng xử lý

Các tiến trình thử có vai trò toàn hệ thống có thể tác động fixture của nhau nếu dùng chung database và chạy song song. Đã chuyển sang chạy từng bộ riêng, kiểm marker/database trước khi tạo fixture và dọn theo các UUID thuộc lượt chạy. Những lần bị nhiễu được giữ là lần chưa qua, không cộng vào số kiểm thành công.

Chuyển sang Thanh tra phải đồng bộ thời hạn và thu hồi quyền của người nhận cũ; chuyển lại luồng thường phải đặt lại thời hạn nhưng không mang lý do/ghi chú mật ra ngoài. Panel kết luận đã bổ sung phần chỉ đọc để cán bộ Thanh tra đọc lại phân loại và lý do trước khi gửi; trường lý do chỉ có ở mức xem đầy đủ. Truy cập đầu tiên của Thanh tra cũng bảo đảm xử lý hạn khi scheduler chưa chạy. Các sửa cuối đã qua kiểm tổng, build và lượt MySQL chạy lại; CI nguồn bàn giao được đối chiếu riêng.

Luồng SMTP có lease và kiểm quyền ngay trước gửi; việc gửi thư ra dịch vụ ngoài giao dịch database vẫn có giới hạn khi tiến trình dừng đúng lúc SMTP đã nhận thư nhưng trạng thái chưa kịp ghi. Không khẳng định gửi thư đúng một lần tuyệt đối. Kiểm nội dung thực và hash tệp không chứng nhận tệp sạch mã độc toàn diện. Ẩn danh là ở mức ứng dụng; DBA, nhật ký hạ tầng hoặc nội dung tự tiết lộ vẫn là giới hạn.

Công cụ trình duyệt không truy cập được ở phần cuối nên QA giao diện còn các nhánh chưa thử tay, phải ghi rõ trong bản giao. Chưa chứng nhận mọi thiết bị, WCAG hoặc kiểm tải 1.500 request; các mục này thuộc kiểm định sau. Các hạn chế không được thay bằng ảnh cũ hoặc số liệu suy đoán.

## 6. Kế hoạch Tuần 12

Chỉ bắt đầu khi người dùng yêu cầu: dashboard theo vai trò, biểu đồ, báo cáo xử lý phản hồi, xuất Excel/CSV/PDF; bổ sung dashboard Phòng Đào tạo, thống kê Khảo thí/Thanh tra và cảnh báo bất thường theo Điều chỉnh số 01. Mọi thống kê/tệp xuất áp dụng ngưỡng và không có định danh sinh viên; mở rộng UC-GOLD và E2E theo đúng kế hoạch.

Giữ FR-145 trong backlog để tiếp tục theo dõi, không tự cắt. Giai đoạn nâng cấp UI riêng chưa bắt đầu và chỉ kích hoạt theo lệnh tương ứng sau 15 tuần; không chạy UI-0 trong phiên này.

## 7. Phân công và đóng góp thành viên

**[SINH VIÊN TỰ ĐIỀN]** Họ tên, phần thực làm, bằng chứng commit, kiểm thử và nội dung thuyết minh. AI không gán tên, số giờ hoặc đóng góp cho thành viên. Việc chia phần cho các agent là hỗ trợ kỹ thuật của AI, không được ghi thành đóng góp của sinh viên.

## 8. Các bước kiểm tra nhanh cho giảng viên

1. Mở Docker, khởi động bằng `KHOI_DONG_DU_AN.cmd` theo [README](../../README.md) và giữ cửa sổ máy chủ mở. Chỉ dùng dữ liệu demo; không reset database, mật khẩu đã đổi hoặc MFA của chủ dự án.
2. Dùng tài khoản sinh viên/giảng viên demo với phản hồi thường: theo dõi hạn, trả lời, đánh giá hài lòng thấp rồi mở lại theo điều kiện. Lượt mở lại thứ hai hoặc tài khoản sinh viên khác phải bị chặn. Dữ liệu mô phỏng quá hạn phải chuyển đúng cấp và không nhân đôi lịch sử khi job chạy lại.
3. Dùng `DEMO-GV00001` vào **Giải trình cải tiến**, gửi giải trình cho lớp demo điểm thấp; dùng trưởng bộ môn đúng phạm vi để yêu cầu bổ sung hoặc xác nhận. Thông báo phải xuất hiện đúng người và có thể đánh dấu đã đọc.
4. Dùng `KT2026001` vào **Kiến nghị rà soát**, gửi kiến nghị gắn môn/đợt hợp lệ. Trưởng bộ môn trả lời tiếp thu hoặc không tiếp thu phải có lý do; người ngoài phạm vi và ADMIN không có quyền đọc nội dung.
5. Dùng `TT2026001` mở hồ sơ demo đang xác minh, thêm ghi chú và PDF nội bộ, lưu kết luận, gửi tóm tắt rồi đóng. Sinh viên chỉ nhận tóm tắt đã thông báo; Lãnh đạo chỉ có mức tóm tắt, người xung đột không tìm thấy hồ sơ. Đây là kịch bản kiểm lại; báo cáo chưa nhận toàn bộ bước bấm đã hoàn tất trong UI.
6. Đối chiếu `test:week11`, hồi quy Tuần 9/10, `test:integration`, `test:demo`, `check`, `progress` và CI đúng SHA sau khi chốt. Với luồng email, chỉ dùng Mailpit trong môi trường phát triển; không gửi thông tin thật hoặc cấu hình SMTP thật để thử.

Mật khẩu demo ban đầu và tài khoản trưởng bộ môn theo README; giữ mật khẩu đã được đổi. Nếu cần quay lại trạng thái demo để thử, tạo dữ liệu giả mới thay vì ghi lùi lịch sử đã thao tác.

## 9. Bản rút gọn để dán vào hệ thống của trường

Nhóm hoàn thành phần phản hồi nâng cao, giải trình, kiến nghị, thông báo và quy trình Thanh tra. Kiểm tổng đạt 1140 phép qua, một phép bỏ qua; build thành công. Bốn bộ MySQL qua 43 nhóm, hồi quy Tuần 9 và 10 qua 31 nhóm, dữ liệu cũ giữ hash. Giao diện đã thử giảng viên gửi, trưởng bộ môn xác nhận và Thanh tra lưu kết luận, thông báo. Bước đóng hồ sơ và giao diện sinh viên, Lãnh đạo còn chưa thử tay do công cụ trình duyệt không truy cập được; các nhánh dịch vụ đã có kiểm MySQL. Tiến độ đạt 188/219 điểm, 68/84 FR; FR-145 còn backlog. CI nguồn bàn giao chờ xác nhận. Đóng góp cá nhân do sinh viên tự điền.

## 10. Điều chỉnh so với kế hoạch

**Ngày yêu cầu:** [SINH VIÊN TỰ ĐIỀN]. **Tên người yêu cầu:** [SINH VIÊN TỰ ĐIỀN]. **Lý do theo yêu cầu GVHD:** [nhóm tự xác minh]. Ngày thực hiện 02–03/11 là ngày phiên làm, không thay ngày hoặc tên người yêu cầu mà nhóm cần xác nhận.

Tuần 11 bổ sung phần còn lại FR-154, FR-156, SLA/leo thang cho Phòng Đào tạo, Khảo thí và Thanh tra; đồng thời thực hiện FR-152 và FR-157 theo Điều chỉnh số 01, không tự cắt các mục P1 này. Seed XAC_MINH chỉ được thêm khi quy trình tương ứng đã triển khai. Các giới hạn đã nêu của Thanh tra, Khảo thí và ẩn danh vẫn giữ nguyên.

Người dùng gửi prompt nâng cấp UI riêng rồi yêu cầu hoãn; trạng thái giữ nguyên **“UI: chưa bắt đầu, chờ nghiệm thu tuần 11”**. Không chạy UI-0, không tạo nhánh/tag nâng cấp UI và không tính các trang chức năng Tuần 11 thành giai đoạn thiết kế lại. FR-145 vẫn tồn đọng từ Tuần 7, không được ghi lại như đã hoàn tất. Không viết quy trình hiện tại ở trường hoặc bịa đóng góp thành viên.

Chốt nguồn bàn giao: d60c3508c034ad3de4915a6fd03d65a3e2aa982f, [CI41513829941](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41513829941) check/smoke qua, Linux1141/1141 trong76tệp; buildNext16.4.3 qua. 7013f2f chỉ bổ sung tài liệu giải thích. Các giới hạn QA ở trên vẫn được giữ.
