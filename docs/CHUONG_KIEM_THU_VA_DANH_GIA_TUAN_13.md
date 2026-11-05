# Nháp chương kiểm thử và đánh giá — Tuần 13

**Chốt ngày 05/11/2026:** Check/build cục bộ, UC-GOLD kiểm tay đủ các bước và [CI 41904262769](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41904262769) check/e2e/smoke của nguồn `831d14decd9d6a562a1f9ecc0a53f6a4fadc8248` đều qua. Chốt 10 FR, thêm 23 điểm: **211/219=96,3%,78/84 FR**. Giữ các giới hạn p95, audit, axe và phạm vi quét; không bắt đầu Tuần 14/UI-n.

Ngày tổng hợp 05/11/2026, từ các lượt 03–05/11. Bản nháp chương kiểm thử đã chốt theo check/build, E2E, GUI đủ các bước và CI nguồn831d14d đều qua; giữ các giới hạn bên dưới. Nhóm tự xác minh và diễn đạt theo phần việc thực tế, không tự gán đóng góp cá nhân.

## 1. Mục tiêu và phạm vi

Tuần 13 tập trung kiểm tra hệ thống đã hiện thực tới Tuần 12: tính đúng của quy trình, phân quyền mười vai trò, ẩn danh khảo sát, an toàn tệp và phiên đăng nhập, khả năng xử lý đồng thời, giao diện trên màn hình nhỏ và thao tác bàn phím. Các lỗi được phát hiện trong phạm vi này được sửa và kiểm hồi quy. Giai đoạn nâng cấp giao diện riêng vẫn chưa được kích hoạt.

Cơ sở xây dựng ca kiểm là [đặc tả nghiệp vụ](DAC_TA_NGHIEP_VU.md), [ma trận quyền](MA_TRAN_QUYEN.md), các yêu cầu phi chức năng và chín mã kiểm thử tại Mục F của [Điều chỉnh số 01](BO_SUNG_01_TAC_NHAN.md). Dữ liệu kiểm là dữ liệu giả; các bộ tích hợp sử dụng database có marker riêng để tránh dùng nhầm database đang phục vụ dự án.

Không đánh giá độ an toàn chỉ bằng số lượng test xanh. Một test policy kiểm quyết định cho phép/từ chối; test HTTP còn kiểm route và cấu trúc phản hồi; phép kiểm MySQL xác nhận giao dịch và ràng buộc thực; kiểm trình duyệt mới quan sát được việc hiển thị và thao tác. Các loại bằng chứng này được đối chiếu theo từng yêu cầu.

## 2. Các lớp kiểm thử

| Lớp kiểm | Nội dung chính | Giới hạn khi sử dụng kết quả |
| --- | --- | --- |
| Vitest | Hàm nghiệp vụ, policy, kiểm đầu vào, route có mock, công thức/ngưỡng, thời gian, DTO và log | Không tự chứng minh trạng thái MySQL hoặc khả năng tương tác trong trình duyệt |
| Tích hợp MySQL và HTTP | Quyền đối tượng, chuyển trạng thái, ngưỡng, tệp xuất, race, rollback, giới hạn request | Mỗi bộ có fixture và phạm vi riêng; không cộng số assertion thành số test hoặc request |
| Header/SSR | Đọc header và bytes HTML trên máy chủ development/production riêng | Chưa đo TLS/reverse proxy; nonce trong HTML không tự chứng minh hydration hoặc toàn bộ luồng trình duyệt |
| Playwright | UC-GOLD, dashboard theo vai trò, axe, bàn phím và kích thước 360 px | 6/6 kịch bản,34 trạng thái đã chạy; 7 incomplete/168 node cần kiểm tay, không chứng nhận WCAG toàn hệ thống |
| Tải HTTP | 200 nhiệm vụ riêng và 20 request cùng nhiệm vụ, đối chiếu dữ liệu MySQL | Đo cục bộ, cùng máy sinh tải; không suy thành năng lực tối đa của hạ tầng triển khai |
| Kiểm tay | CUA browser UI trên demo giả, không helper HTTP/đồng hồ giả/main writes | UC-GOLD theo đầy đủ kịch bản đã qua ngày 05/11,8 PNG đã xem; CSV Lãnh đạo/ĐBCL đã kiểm byte và phạm vi; không nhận chờ SLA bằng tay |

### 2.1. Độ phủ mã

V 8 đo các tệp trong `src/server/services`, `src/server/policies` và `src/server/auth`; loại tệp khai báo kiểu và seed. Độ phủ này không bao gồm toàn bộ giao diện hoặc tự động gộp các lượt MySQL/HTTP/E2E chạy ở tiến trình riêng.

Ngưỡng kiểm chất lượng nội bộ trong Vitest được đặt ở **statements 75%, branches 70%, functions 75%, lines 75%**. Đây là ngưỡng của dự án, không phải bằng chứng rằng mọi nhánh nghiệp vụ quan trọng đã được kiểm đủ. Các quy tắc P 0 như quyền đối tượng, ẩn danh và nộp một lần vẫn cần ca kiểm cụ thể dù tổng độ phủ đã vượt ngưỡng.

Lượt đo ban đầu, trước các sửa nguồn cuối, ghi nhận statements **77,70%**, branches **72,85%**, functions **81,61%**, lines **79,00%**. Lượt kiểm cuối ngày **04/11/2026** đã thay các số ban đầu bằng kết quả dưới đây; [manifest check/build](assets/tuan-13/check-build-after-calendar.json) giữ số đếm, log/hash và phạm vi đo.

| Chỉ số cuối | Được phủ / tổng | Tỷ lệ | Gate |
| --- | --- | --- | --- |
| Statements | 4.544/5.789 | **78,49%** |75%, qua |
| Branches | 3.337/4.541 | **73,48%** |70%, qua |
| Functions | 985/1.198 | **82,22%** |75%, qua |
| Lines | 4.082/5.122 | **79,69%** |75%, qua |

| Mục cần chốt từ nguồn bàn giao | Trạng thái khi viết nháp |
| --- | --- |
| `npm run check` ngày 04/11: số tệp, passed/skipped/failed | **Exit 0; 93/93 tệp; 2.155 passed,1 skipped/2.156**,0 failed; symlink Windows bị EPERM |
| Coverage cuối trong `npm run check` | **Vượt cả bốn gate**, số đếm ở bảng trên; không gộp HTTP/E2E vào độ phủ |
| Build production và nguồn tương ứng | Bản đo cũ `U4gfXxiSSrhNoZev0uDYX`; build bàn giao ngày 04/11 **exit 0**, `.next`,101 route động, ID `Q1SY2ZcIAr3Do--HbL1SZ` |
| HTTP production trên build bàn giao | **Chưa xác minh,0/7 đường dẫn**; APP_URL HTTP bị guard HTTPS từ chối, thử lại HTTPS chỉ trong process bị automatic approval review từ chối không nêu lý do |
| Playwright/axe/bàn phím và ảnh đã xem | **6/6**,34 trạng thái,0 vi phạm tự động; 7 incomplete/168 node; 17 PNG cuối đã mở xem |
| CI trên SHA nguồn bàn giao | **Check/e2e/smoke thành công**, Linux 2.156/2.156 trong 93 tệp, khôngskip; [proof](assets/tuan-13/ci-source-831d14d.json) đúng nguồn831d14d |

## 3. Kiểm quyền và truy cập đối tượng

Bộ bổ sung có **801/801 test qua trong hai tệp** ở lượt riêng ngày 03/11/2026. Trong đó `week13-role-matrix.test.ts` có 741 test: **700 ô của 70 hành động × 10 vai trò** và 41 trường hợp grant, scope, phiên tạm, MFA hoặc đầu vào ngoài tập khai báo. `week13-resource-idor.test.ts` có 60 test trên tài nguyên và người dùng cụ thể. Bảng kỳ vọng được viết theo đặc tả, không được sinh từ kết quả của chính hàm policy đang kiểm.

Kiểm IDOR thay ID hợp lệ bằng ID thuộc người khác, đơn vị khác hoặc ID không tồn tại. Với khảo sát, sinh viên chỉ đọc/nộp task của chính tài khoản; quyền không được suy lại từ danh sách đăng ký sau khi đã chốt. Với hồ sơ Thanh tra, các tổ hợp Thanh tra kiêm giảng viên, trưởng bộ môn hoặc trưởng khoa liên quan vẫn phải bị loại vì xung đột lợi ích. Dashboard, thông báo và tệp tải không được trở thành đường vòng để đọc dữ liệu đã bị chặn ở trang chi tiết.

700 ô ma trận bao phủ các hành động policy hiện khai báo, không bao phủ mọi trạng thái dữ liệu hoặc mọi tổ hợp đa vai trò. Chín mã `TC-PDT-01/02/03`, `TC-KT-01/02`, `TC-TT-01/02/03`, `TC-ALL-01` đã có bằng chứng runtime tại [ma trận kiểm thử](MA_TRAN_KIEM_THU_TUAN_13.md) và [manifest](assets/tuan-13/runtime-regression.json): **227 nhóm trong 15 bộ**, gồm 217 nhóm MySQL/HTTP/service và 10 nhóm parser tệp, thêm **demo 19/19**. Fingerprint khi tổng hợp không phải fingerprint bất biến của từng lượt kế thừa; Tuần 4–7 có bộ chạy trước sửa khóa nộp cuối, Tuần 8 trở đi đã kiểm đường thay đổi. Không coi việc chín mã có bằng chứng là mọi điều kiện nghiệm thu toàn tuần đã chốt.

## 4. Các phát hiện và kiểm tra bảo mật

Lượt Codex Security Standard ban đầu rà **40 tệp nguồn/cấu hình**, ghi nhận **8 bề mặt** và một lỗi mức thấp, độ tin cậy cao. Báo cáo của lượt rà giữ trạng thái bao phủ **partial** cùng phần việc còn hoãn; không nhận đã rà toàn bộ kho hoặc mã các thư viện bên thứ ba.

Lỗi xác nhận được là ADMIN có thêm vai trò nghiệp vụ có thể được policy cấp quyền đọc kết quả khảo sát, trái BR-68. Bản vá từ chối ADMIN ở toàn bộ miền `results:*` trước khi xét grant nghiệp vụ khác. Các test tái hiện đã thất bại trước sửa và qua sau sửa. Tách quyền này được thực hiện tại policy mà route/service sử dụng, không chỉ bằng việc ẩn nút trên giao diện.

Header được bổ sung cùng nonce CSP mới theo từng request SSR; nonce do client gửi bị ghi đè và root layout dùng render động. Kiểm HTTP development qua **7/7 đường dẫn**, production qua **7/7 đường dẫn**; chính sách production bỏ `unsafe-eval` của script và WebSocket phát triển, có HSTS. API và route tải tệp vẫn giữ chính sách riêng phù hợp. Lượt production dùng HTTP loopback làm chặng nội bộ với origin ứng dụng chuẩn HTTPS, không nới guard HTTPS. Đây là kiểm header/bytes HTML, chưa là kiểm chứng TLS hoặc cookie Secure trên trình duyệt. Chi tiết và phạm vi OWASP được giữ tại [hồ sơ bảo mật](BAO_MAT_TUAN_13.md).

Rà giới hạn tần suất phát hiện route nộp phiếu chưa tiêu budget request trước khi đọc body. Đã dùng bộ đếm MySQL theo tài khoản, mặc định **30 request/60 giây**, khóa 60 giây khi vượt. Origin, phiên/quyền, CSRF và route/query phải hợp lệ trước khi tiêu budget; budget được kiểm trước đọc body/gọi service. Việc đổi task, phiên hoặc IP header không tạo budget mới cho cùng tài khoản; các sinh viên dùng chung IP vẫn có budget riêng.

Lượt HTTP/MySQL Tuần 8 chạy lại ngày 04/11/2026 qua **17/17 nhóm**, gồm request thứ 31 bị 429 trước body, 20 request nộp cùng task chỉ có một thành công, trigger MySQL gây lỗi insert đáp án làm rollback và bỏ trigger rồi nộp lại thành công. Phép kiểm privacy của bộ này không thay cho kiểm bytes CSV/XLSX/PDF thuộc bộ báo cáo.

`npm audit` ghi 24 mục moderate trên toàn cây, 8 mục khi bỏ dev; các mục này lan truyền từ một advisory minimatch. Không diễn giải thành 24 lỗ hổng độc lập hoặc dùng số 0 high/critical làm kết luận an toàn. Chưa thấy đường HTTP truyền glob pattern vào nhánh được advisory mô tả; các cảnh báo vẫn được giữ, không ép hạ major hay override toàn cây để làm báo cáo xanh. Snapshot giấy phép gồm 677 đường dẫn gói đang cài và 36 phụ thuộc trực tiếp, có một mục `NOASSERTION`; chi tiết và giới hạn tại [hồ sơ phụ thuộc](PHU_THUOC_TUAN_13.md).

## 5. Kiểm đồng thời và hiệu năng nộp phiếu

### 5.1. Tính đúng khi chia sẻ khóa

Đường nộp cũ lấy khóa độc quyền toàn cục ở transaction lifecycle rồi lại lấy khóa ở transaction nộp, kể cả khi đợt đang mở ổn định. Bản sửa cho phép đọc/nộp ổn định lấy khóa chia sẻ trên hàng guard, là current read đầu tiên trước khi đọc lại phiên/quyền. Các thay đổi quản trị, phạm vi, danh mục, mẫu và trạng thái đợt vẫn dùng khóa độc quyền.

Khi thiếu guard, đợt chưa ổn định hoặc thời gian qua hạn sau đọc mẫu, transaction chia sẻ kết thúc rồi mới dùng lifecycle độc quyền và đọc lại quyền. Không nâng khóa chia sẻ thành độc quyền trong cùng transaction. Điều kiện CAS của task PENDING và việc ghi phiếu/đáp án vẫn nằm trong cùng giao dịch.

**8/8 nhóm trên MySQL thật** đã qua: cold-start thiếu guard; hai khóa chia sẻ cùng hoạt động; khóa chia sẻ chặn người ghi độc quyền; hai nhiệm vụ riêng cùng tiến tới đọc mẫu; quyền/phiên bị thay đổi trong X được đọc lại và từ chối; race 20; rollback insert đáp án rồi thử lại; hết hạn sau đọc mẫu vẫn commit đúng một AUTO_CLOSE. Barrier, delay và lỗi insert có chủ ý chỉ nằm trong tiến trình kiểm thử; không thay đồng hồ hệ thống. Bằng chứng cụ thể xem [hồ sơ hiệu năng](HIEU_NANG_TUAN_13.md).

### 5.2. Số đo HTTP

Hai lượt dùng cùng kiểu phiếu năm câu Likert, 200 sinh viên/nhiệm vụ khác nhau, phiên JWT/CSRF riêng được cấp trước thời gian đo. Máy chủ production và bộ sinh tải chạy trên cùng máy Windows, Node 24.21.0, Core i 5-12500 H, 16 logical CPU, RAM máy 15,73 GiB; MySQL 8.4.11 chạy qua Docker, pool Prisma giữ 5 kết nối. Mẫu độ trễ tính cả lỗi và thời gian chờ đến khi đọc xong phản hồi; không đo đăng nhập, TLS hoặc mạng Internet.

| Số đo của 200 nhiệm vụ riêng | Trước tối ưu | Sau tối ưu |
| --- | --- | --- |
| HTTP 200 | 196/200 | **200/200** |
| HTTP 500 | 4 | **0** |
| Lỗi mạng | 0 | 0 |
| p 50 | 7.338,21 ms | 2.735,16 ms |
| p95 | 12.092,56 ms | **3.595,91 ms** |
| p 99 | 12.311,97 ms | 3.675,08 ms |
| Throughput theo lần thử | 16,10 request/s | 54,15 request/s |

Sau tối ưu, MySQL có 201 phiếu/1.005 đáp án/201 DONE nếu tính cả một phiếu khởi động. Đợt 20 request vào một task mới có một HTTP 200 và 19 HTTP 409, chỉ tăng một phiếu/năm đáp án. Không ghi nhận trùng phiếu hoặc ghi nửa giao dịch trong các số đếm đã kiểm. Phiên fixture đã thu hồi, tài khoản vô hiệu hóa; dữ liệu thử được giữ trong database riêng.

Lượt sau sửa đạt mục tiêu lỗi ngoài dự kiến dưới 1% với số đo 0%, nhưng **p95 vẫn vượt mục tiêu đề xuất 3 giây 595,91 ms**. Do đó không đánh dấu NFR-16 đạt toàn bộ. Không tăng pool/timeout hoặc thay ngưỡng để che kết quả. Hai lượt chạy cục bộ ở hai thời điểm không chứng minh mức cải thiện thống kê trên mọi môi trường; các mẫu gốc và build ID đều được giữ để đối chiếu.

## 6. Giao diện và kiểm tay

Playwright Chromium đã qua **6/6 kịch bản**, không failed/skipped. Axe kiểm **34 trạng thái** desktop/360 px,0 lượt quy tắc vi phạm/0 node vi phạm; còn **7 incomplete/168 node** cần kiểm tay. Đã mở xem **17 PNG cuối** trong [tóm tắt E2E](assets/tuan-13/ui/e2e-accessibility-summary.json). Đã sửa tên truy cập nhãn thương hiệu và vùng bảng cuộn cho bàn phím. Không gọi incomplete là passed hoặc công bố đạt WCAG toàn hệ thống. JSON giữ hash tệp kiểm/nguồn, tên trạng thái, viewport và node đại diện; HEAD nền `e059856` đi cùng thay đổi chưa commit.

UC-GOLD kiểm tay đã qua đủ các bước trong kịch bản ngày 05/11: GV xem kết quả lớp mình, ĐBCL xem/xuất báo cáo và các nhánh công bố, giải trình/TBM, phản hồi đánh giá 4/5, Khảo thí/Thanh tra, Lãnh đạo CSV đều đã quan sát trên GUI. Tám PNG đã mở xem; CSV Lãnh đạo 3.745 byte và ĐBCL 3.011 byte có BOM, đúng vai trò/bộ lọc/5 phiếu/100%/mean số 2, không định danh tài khoản. Chỉ CUA browser UI trên demo giả, không helper HTTP/đồng hồ giả/main writes; không nhận chờ SLA bằng tay. [Manifest](assets/tuan-13/manual-uc-gold.json), [CSV](assets/tuan-13/manual-export-verification.json). Checkpoint công cụ dừng 03–04/11 là lịch sử đã tiếp tục.

## 7. Đánh giá sau nghiệm thu

Các bằng chứng xác nhận bản sửa giữ chặn trùng/rollback, cải thiện nộp dưới tải và bổ sung quyền đa vai trò. Check/build, E2E, GUI đủ các bước và CI đúng nguồn đã qua; Tuần 13 đã chốt kiểm thử với các giới hạn dưới đây.

| Nội dung | Đánh giá hiện tại / việc cần hoàn tất |
| --- | --- |
| Quyền/IDOR | 801 test bổ sung đã qua; chín mã có bằng chứng runtime,227 nhóm/15 bộ vàdemo 19; nguồn/lượt kế thừa được giữ trong manifest |
| Đồng thời và rollback | 17 nhóm HTTP/MySQL Tuần 8 và 8 nhóm khóa đã qua trong phạm vi nêu trên |
| Độ phủ, fullcheck, build, CI | Check 2.155 passed/1 skipped trong 93 tệp, coverage 78,49/73,48/82,22/79,69%, build exit 0/101 route động đã qua ngày 04/11; **CI đã qua** |
| HTTP production build cuối | Chưa xác minh: guard từ chối APP_URL HTTP; lượt khởi động lại HTTPS chỉ trong process bị automatic approval review từ chối, không nêu lý do. Bằng chứng 7/7 cũ giữ riêng |
| Playwright/axe/kiểm tay | E2E 6/6,34 trạng thái,0 vi phạm,17 PNG tự động đã xem; 7 incomplete/168 node. GUI đủ các bước trong kịch bản đã qua,8 PNG riêng đã xem; không gộp kiểm tay nghiệp vụ với việc xử lý axe incomplete |
| Hiệu năng | Không lỗi/trùng trong lượt sau sửa; p95 3.595,91 ms chưa đạt mục tiêu đề xuất 3.000 ms |
| Rà nguồn bảo mật | Bao phủ partial; phần hoãn và giới hạn phải được giữ trong báo cáo |
| Phụ thuộc | Còn 24 cảnh báo tổng/8 production theo audit và mục license chưa xác minh; theo dõi cập nhật phù hợp |
| Database chính | Đã mở đúng ngữ cảnh bằng shortcut Docker Desktop qua Windows Explorer sau sao chép ngoại tuyến/đối chiếu hash hai VHDX. Compose `db`/`mailpit` healthy; chỉ đọc 45 bảng/1.575 người dùng, migration mới nhất Tuần 12 và chủ dự án tồn tại. Guard 45 bảng/9.709 bản ghi cũ giữ hash; không áp dụng migration mới, không seed/reset/đổi credential/MFA; chưa kiểm reboot |
| Bản sao logic/restore kiểm riêng | [Bằng chứng](assets/tuan-13/main-data-verification.json): dump single-transaction 1.734.124 byte, restore database mới độc lập; 46 bảng/9.722 dòng gồm Prisma khớp chính xác bảng/khóa/hash từng dòng. Nguồn trước/sau và 9.709 dòng cũ không đổi; SQL/VHDX giữ riêng, không suy nghiệm thu GUI |
| Ẩn danh | Bảo vệ ở mức ứng dụng; không chứng minh chống DBA, log hạ tầng, tự tiết lộ trong văn bản hoặc mọi phép suy luận qua nhiều tập dữ liệu |

Các kết quả đã chốt cùng bằng chứng tương ứng; nhóm giữ p95 chưa đạt, audit moderate, scan partial và axe incomplete khi ghép báo cáo. Không tự điền đóng góp thành viên, đánh giá giảng viên hoặc kết quả chưa chạy.

## 8. Tài liệu đối chiếu

[Ma trận kiểm thử](MA_TRAN_KIEM_THU_TUAN_13.md), [bảo mật](BAO_MAT_TUAN_13.md), [hiệu năng và mẫu đo gốc](HIEU_NANG_TUAN_13.md), [phụ thuộc/giấy phép](PHU_THUOC_TUAN_13.md), [UC-GOLD Tuần 12](UC_GOLD_TUAN_12.md), [giải thích cho nhóm](GIAI_THICH/tuan-13.md).
