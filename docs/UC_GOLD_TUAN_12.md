# UC-GOLD Tuần 12 — bằng chứng E2E

Ngày chạy thực tế: **03/11/2026**. Lượt chốt bắt đầu lúc **08:02:21 giờ Việt Nam**; Playwright ghi **3/3 test passed**, không bỏ qua, thời gian tổng **130,75 giây** (log hiển thị 2,2 phút). Đây là kiểm thử tự động kết hợp thao tác trình duyệt và HTTP. Không xem toàn bộ các bước bên dưới là đã được con người làm bằng tay.

## 1. Bộ kiểm và môi trường

- [uc-gold.spec.ts](../tests/e2e/uc-gold.spec.ts): ba test chạy tuần tự, một worker, `retries = 0`.
- [fixtures.ts](../tests/e2e/fixtures.ts): kiểm đích database thử, tạo dữ liệu nền và phiên giả; gửi yêu cầu HTTP và chuyển tài khoản trên trình duyệt.
- [playwright.config.ts](../playwright.config.ts): project Chromium, không quay video hoặc lưu trace xác thực; chụp ảnh theo các điểm đã định và khi lỗi.
- [run-week12-e2e.mjs](../scripts/run-week12-e2e.mjs): mở máy chủ thử riêng tại `http://127.0.0.1:3007`, dùng thư mục dựng `.next-week12`, chạy Playwright rồi dừng các tiến trình do runner mở.

Lệnh của kho là `npm.cmd run test:e2e` trên Windows, hoặc `npm run test:e2e` trên môi trường phù hợp. Lệnh này chuẩn bị WEEK12, sinh Prisma client qua `pretest:e2e` rồi gọi runner. Khi database và client đã được chuẩn bị trong lượt kiểm đang điều phối, có thể gọi trực tiếp `node scripts/run-week12-e2e.mjs`.

Phiên bản đối chiếu trong môi trường chạy: **Node.js v24.21.0**, **Playwright 1.64.1**, **Next.js 16.4.3**, máy chủ phát triển dùng webpack. Project trình duyệt là Chromium do Playwright quản lý; không ghi một số phiên bản Chromium chưa được đo riêng trong lượt chạy.

Kết quả cục bộ nằm ở `.local/week12-e2e.log`, `test-results/week12/results.json`, `.local/week12-e2e-fixture.json` và log máy chủ `.local/week12-e2e-server.log`. Các đường dẫn này là bằng chứng vận hành của lượt chạy, không phải thư mục dữ liệu công khai của website.

## 2. Tách database và tạo dữ liệu nền

Trước khi gọi `getDb()` hoặc ghi fixture, bộ kiểm đối chiếu `.local/week12-test-database.json`, mục đích `isolated-week12-tests`, tên main, tiền tố database WEEK12, host/cổng/tài khoản kết nối và việc khác main, shadow cùng các database thử tuần trước. Sau khi đổi kết nối sang WEEK12, bộ kiểm đọc lại `@@server_uuid` và `DATABASE()` để xác nhận đích. Runner từ chối dùng cổng 3007 nếu cổng đã bị tiến trình khác chiếm.

Phần **bootstrap trực tiếp bằng database/dịch vụ xác thực** gồm khoa, bộ môn, học kỳ, môn học, lớp, phân công, đăng ký học phần, 21 tài khoản giả và phiên đăng nhập của các tài khoản này. Một giảng viên được gán thêm Thanh tra để đối chứng xung đột lợi ích. Có bộ môn ngoài phạm vi để kiểm IDOR. Không có đợt, phiếu đã nộp, phản hồi đã xử lý hoặc kết quả công bố được seed sẵn thay cho các bước nghiệp vụ của UC-GOLD.

Mười sinh viên giả đăng ký hai lớp cùng môn học, mỗi lớp có một giảng viên phụ trách. Một sinh viên còn đăng ký lớp nhỏ của môn khác. Khi mở đợt sẽ có **21 nhiệm vụ**: 20 nhiệm vụ của hai lớp chính và một nhiệm vụ lớp nhỏ. Lớp nhỏ được giữ để kiểm dữ liệu thiếu mẫu.

Phiên xác thực được cấp bằng `createAuthenticatedSession` và token của dịch vụ xác thực, sau đó dùng cookie của tài khoản giả trên HTTP/trình duyệt. Vì vậy lượt E2E này **không kiểm thao tác nhập mật khẩu, quét QR hay đăng ký TOTP bằng giao diện**. Các phiên ADMIN của fixture không liên quan tài khoản hoặc MFA của chủ dự án.

## 3. Các bước thực sự đã chạy

| Bước | Tác nhân và thao tác | Cách thực hiện | Điều kiện đã kiểm |
| --- | --- | --- | --- |
| 1 | ĐBCL tạo mẫu gồm hai câu Likert bắt buộc và một câu tự luận không bắt buộc; nhóm có cờ kiểm tra, đánh giá | HTTP API | Mẫu được tạo mới, dùng tiếp cho chính đợt của lượt chạy |
| 2 | ĐBCL lập đợt cho ba lớp, trình xác nhận dữ liệu | HTTP API | Chuyển sang `CHO_XAC_NHAN_DL`; ngưỡng 5 phiếu, 30% tham gia, cảnh báo giải trình dưới 3 điểm |
| 3 | PĐT xem readiness và xác nhận có ghi chú | HTTP API | Không có lỗi chặn; lớp nhỏ phát sinh RS-05; đợt sang `CHO_DUYET` |
| 4 | Lãnh đạo phê duyệt | HTTP API | Giờ mở được đặt trước hiện tại 60 giây, giờ kết thúc còn ở tương lai; phê duyệt tự mở đợt và tạo đúng 21 nhiệm vụ |
| 5 | Một sinh viên chọn hai mức điểm 2, viết góp ý rồi nộp phiếu | **Trình duyệt** | Hiện trang **Đã nộp khảo sát**; có ảnh xác nhận |
| 6 | Nộp các nhiệm vụ còn lại của hai lớp chính | **19 lần nộp thành công qua HTTP API** | Tổng cộng 20 `SurveyResponse`; yêu cầu nộp lại nhiệm vụ đầu bị từ chối 409. Một nhiệm vụ lớp nhỏ còn chưa nộp |
| 7 | ĐBCL đóng sớm có lý do, tổng hợp, kiểm duyệt góp ý và công bố | HTTP API | Đợt lần lượt qua `DA_DONG`, `DA_TONG_HOP`, `DA_CONG_BO`; góp ý được cho phép hiển thị trước công bố |
| 8 | Giảng viên đọc kết quả lớp mình | HTTP API; sau đó mở trang kết quả trên trình duyệt | Giá trị được đối chiếu bằng API là **2,00**, lớp đủ điều kiện công bố. Việc mở trang không được tính thêm thành một phép kiểm số liệu độc lập trên giao diện |
| 9 | Giảng viên nhập giải trình/kế hoạch; trưởng bộ môn nhập nhận xét và xác nhận | **Trình duyệt**, đối chiếu trạng thái bằng API | `CAN_GIAI_TRINH → DA_GUI → DA_XAC_NHAN`; có ảnh hồ sơ đã xác nhận |
| 10 | Sinh viên gửi phản hồi ẩn danh; giảng viên tiếp nhận, bắt đầu xử lý và trả lời | HTTP API | Giảng viên thấy **Sinh viên ẩn danh**, không có đối tượng danh tính người gửi hoặc canary sinh viên trong DTO |
| 11 | Sinh viên đánh giá mức hài lòng 5 và gửi nhận xét | **Trình duyệt**, đối chiếu bằng API | Phản hồi chuyển `DA_DONG` |
| 12 | Tạo một phản hồi khác để kiểm quá hạn | Tạo bằng API; **chỉ chỉnh hạn của fixture bằng database**; mở hàng đợi qua API | Có đúng một mốc leo thang, mức leo thang 1 và cờ quá hạn. Đây là kiểm phần đến hạn qua truy cập, không phải bằng chứng đã chạy cron ngoài runner |
| 13 | Gửi phản hồi thi; Khảo thí tiếp nhận, xử lý và trả lời | HTTP API | Đến đúng Khảo thí, có lời nhắc không thay phúc khảo và không hiện danh tính sinh viên |
| 14 | Sinh viên gửi khiếu nại nghiêm trọng ẩn danh; Thanh tra xác minh, ghi chú, kết luận, thông báo và đóng | HTTP API | Đi đủ `TIEP_NHAN → XAC_MINH → KET_LUAN → THONG_BAO → DONG`. Sinh viên nhận tóm tắt; Lãnh đạo chỉ có DTO tóm tắt. Giảng viên có thêm vai trò Thanh tra vẫn bị trả 404 với hồ sơ liên quan |
| 15 | Thanh tra xem cảnh báo đồng nhất, đánh dấu cần lưu ý; chuyển cảnh báo khác sang hồ sơ xác minh rồi hoàn tất hồ sơ đó | HTTP API | Có ít nhất hai cảnh báo của chính đợt; DTO chỉ có chỉ số được phép. Hồ sơ nguồn bất thường không có tóm tắt gửi một sinh viên cụ thể. Công bố vẫn giữ `DA_CONG_BO` |
| 16 | Lãnh đạo chọn học kỳ và tải CSV, Excel, PDF; ĐBCL tải CSV | **Trình duyệt** | Nhận các tệp tải về thật. CSV và ô Excel không chứa canary sinh viên; PDF có đầu tệp `%PDF-` và mở được ít nhất một trang bằng thư viện PDF |

Các giá trị canary là ID, tài khoản, email và tên của **sinh viên giả** do chính fixture tạo. Chúng được dùng làm đối chứng tự động cho dữ liệu đọc/xuất. Không dùng thông tin sinh viên thật.

## 4. Ba test và giới hạn bằng chứng

| Test | Kết quả lượt chốt | Thời gian | Phạm vi |
| --- | --- | --- | --- |
| UC-GOLD — quy trình từ lập đợt tới báo cáo và các nhánh bổ sung | Passed | 98,96 giây | Chuỗi trong bảng trên; kết hợp HTTP và trình duyệt, không bỏ qua việc lập và xử lý nghiệp vụ bằng trạng thái hoàn tất seed sẵn |
| TC-ALL-01 / BR-67 — dashboard mười vai trò, ngưỡng và IDOR | Passed | 1,76 giây | Dashboard của 10 vai trò; ADMIN chỉ vận hành tài khoản, sinh viên chỉ tổng quan cá nhân; Khảo thí không có lớp/giảng viên; Thanh tra không có cột điểm; dữ liệu nhỏ bị che, giả vai trò hoặc phạm vi bị từ chối |
| FR-90/91 — dashboard desktop/mobile và không tràn trang | Passed | 25,25 giây | ĐBCL, giảng viên, PĐT, Khảo thí, Thanh tra; chọn rõ góc nhìn theo vai trò, lọc học kỳ, kiểm không tràn chiều ngang và chụp ảnh ở hai kích thước |

Test quyền gồm đối chứng bộ môn ngoài phạm vi, sinh viên yêu cầu báo cáo ĐBCL, ADMIN yêu cầu kết quả lớp, cùng các vai trò không được đọc hồ sơ Thanh tra. Đây là phần kiểm tích hợp được nêu cụ thể, không tự hoàn tất toàn bộ ma trận chức năng của FR-160 hoặc thay đợt rà soát bảo mật Tuần 13.

PDF trong E2E được kiểm việc tải tệp và mở tài liệu. Không suy phép kiểm này thành đã đọc toàn bộ văn bản PDF hoặc đã kiểm bố cục mọi trang. Phần kiểm renderer, ngưỡng trong tệp, Unicode, phân trang và rà ảnh phải đối chiếu các bộ kiểm/QA riêng của Tuần 12.

Lượt chạy tạo **12 PNG**: trang xác nhận nộp của sinh viên, hồ sơ trưởng bộ môn đã xác nhận và 10 ảnh dashboard của năm vai trò trên. Dashboard được chụp ở **1440×1000** và **375×812**. Ảnh nằm trong `test-results/week12`; lúc viết tài liệu này chỉ xác nhận đã sinh tệp, **chưa ghi là đã được xem và duyệt bằng mắt**. Việc chọn ảnh đưa vào `docs/assets/tuan-12` và kết luận giao diện thuộc lượt QA của root.

Tệp đính kèm của reporter còn có `uc-gold-report.csv`, `.xlsx`, `.pdf`, `dbcl-report.csv` và `uc-gold-steps.json`. Không lưu trace chứa cookie xác thực. Chưa kiểm các trình duyệt khác, thiết bị vật lý, WCAG đầy đủ hoặc kiểm tải trong bộ E2E này.

## 5. Hai lượt lỗi trước khi chốt

1. **Lượt 1:** Playwright từ chối tái sử dụng fixture `{ request }` lấy từ `beforeAll` trong thân test. Lỗi xảy ra trước các bước API nghiệp vụ đầu tiên. Bộ kiểm được sửa để tạo `APIRequestContext` độc lập bằng `requestFactory.newContext()` và `dispose()` trong `afterAll`.
2. **Lượt 2:** chuỗi đã đi tới hồ sơ nguồn `BAT_THUONG_KHAO_SAT`, nhưng helper thông báo luôn gửi `studentSummary`. Hồ sơ không gắn phản hồi/sinh viên bị dịch vụ từ chối đúng với 400 `INVALID_INPUT`. Helper được sửa để chỉ gửi tóm tắt sinh viên khi hồ sơ có `feedbackId`.

Hai sửa đổi thuộc bộ E2E; kiểm đầu vào và quyền nghiệp vụ của ứng dụng giữ nguyên. **Lượt 3** chạy lại từ fixture mới và qua cả ba test, không bật retry để che lỗi. Không cộng hai lượt lỗi vào số test passed của lượt chốt.

## 6. Kết thúc và dữ liệu giữ lại

`afterAll` thu hồi mọi phiên và vô hiệu hóa **đúng 21 tài khoản giả của lượt chạy**, rồi đóng kết nối. Runner dừng máy chủ và tiến trình Playwright do nó mở. Marker kết thúc ghi `status = passed`, `fixtureSessionsRevoked = true`, `dataRetained = true` lúc **08:04:31 giờ Việt Nam**.

Lịch sử, phiếu ẩn danh và các dữ liệu nghiệp vụ fixture vẫn được giữ trong WEEK12 để truy vết. **Không ghi database thử là sạch hoặc trống**, không reset database, không xóa dữ liệu chính và không đổi tài khoản/MFA của chủ dự án. Tính bảo toàn dữ liệu chính, kết quả check/build cuối và CI phải được nghiệm thu riêng; bộ E2E này không tự chứng nhận các phần đó.
