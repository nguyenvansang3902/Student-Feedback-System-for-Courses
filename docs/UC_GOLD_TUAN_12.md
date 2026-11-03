# UC-GOLD Tuần 12 — bằng chứng E2E

Ngày chạy thực tế: **03/11/2026**. Lượt E2E hợp lệ đầu tiên bắt đầu lúc **08:02:21 giờ Việt Nam**, qua **3/3 test** trong **130,75 giây** (log hiển thị 2,2 phút). Lượt cục bộ cuối bắt đầu lúc **08:17:00**, qua lại **3/3 test** trong **65,75 giây** (1,1 phút), không bỏ qua hoặc retry. Lượt cuối có bước chờ giao diện xác nhận ổn định trước khi chụp ảnh trưởng bộ môn. Các thời gian là số đo từng lượt, không phải kết luận hiệu năng.

Đây là kiểm thử tự động kết hợp thao tác trình duyệt và HTTP. **Lượt UC-GOLD thủ công trên Chrome ở demo riêng đã thực hiện một phần rồi dừng do công cụ điều khiển không xác định chắc chắn được URL hiện tại; chưa hoàn tất hoặc được nghiệm thu.** Không xem toàn bộ các bước bên dưới là đã được con người làm bằng tay. Các bước thực tế và phần còn chờ được ghi riêng ở Mục 8.

## 1. Bộ kiểm và môi trường

- [uc-gold.spec.ts](../tests/e2e/uc-gold.spec.ts): ba test chạy tuần tự, một worker, `retries = 0`.
- [fixtures.ts](../tests/e2e/fixtures.ts): kiểm đích database thử, tạo dữ liệu nền và phiên giả; gửi yêu cầu HTTP và chuyển tài khoản trên trình duyệt.
- [playwright.config.ts](../playwright.config.ts): project Chromium, không quay video hoặc lưu trace xác thực; chụp ảnh theo các điểm đã định và khi lỗi.
- [run-week12-e2e.mjs](../scripts/run-week12-e2e.mjs): mở máy chủ thử riêng tại `http://127.0.0.1:3007`, dùng thư mục dựng `.next-week12`, chạy Playwright rồi dừng các tiến trình do runner mở.

Lệnh của kho là `npm.cmd run test:e2e` trên Windows, hoặc `npm run test:e2e` trên môi trường phù hợp. Lệnh này chuẩn bị WEEK12, sinh Prisma client qua `pretest:e2e` rồi gọi runner. Khi database và client đã được chuẩn bị trong lượt kiểm đang điều phối, có thể gọi trực tiếp `node scripts/run-week12-e2e.mjs`.

Phiên bản đối chiếu trong môi trường chạy: **Node.js v24.21.0**, **Playwright 1.64.1**, **Next.js 16.4.3**, máy chủ phát triển dùng webpack. Project trình duyệt là Chromium do Playwright quản lý; không ghi một số phiên bản Chromium chưa được đo riêng trong lượt chạy.

Kết quả lượt hợp lệ đầu tiên nằm ở `.local/week12-e2e.log`; lượt cuối ở `.local/week12-e2e-final.log`, `test-results/week12/results.json`, `.local/week12-e2e-fixture.json` và log máy chủ `.local/week12-e2e-server.log`. Các đường dẫn này là bằng chứng vận hành của lượt chạy, không phải thư mục dữ liệu công khai của website.

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
| UC-GOLD — quy trình từ lập đợt tới báo cáo và các nhánh bổ sung | Passed | 48,65 giây | Chuỗi trong bảng trên; kết hợp HTTP và trình duyệt, không bỏ qua việc lập và xử lý nghiệp vụ bằng trạng thái hoàn tất seed sẵn |
| TC-ALL-01 / BR-67 — dashboard mười vai trò, ngưỡng và IDOR | Passed | 1,04 giây | Dashboard của 10 vai trò; ADMIN chỉ vận hành tài khoản, sinh viên chỉ tổng quan cá nhân; Khảo thí không có lớp/giảng viên; Thanh tra không có cột điểm; dữ liệu nhỏ bị che, giả vai trò hoặc phạm vi bị từ chối |
| FR-90/91 — dashboard desktop/mobile và không tràn trang | Passed | 12,47 giây | ĐBCL, giảng viên, PĐT, Khảo thí, Thanh tra; chọn rõ góc nhìn theo vai trò, lọc học kỳ, kiểm không tràn chiều ngang và chụp ảnh ở hai kích thước |

Test quyền gồm đối chứng bộ môn ngoài phạm vi, sinh viên yêu cầu báo cáo ĐBCL, ADMIN yêu cầu kết quả lớp, cùng các vai trò không được đọc hồ sơ Thanh tra. Đây là phần kiểm tích hợp được nêu cụ thể, không tự hoàn tất toàn bộ ma trận chức năng của FR-160 hoặc thay đợt rà soát bảo mật Tuần 13.

PDF trong E2E được kiểm việc tải tệp và mở tài liệu. Không suy phép kiểm này thành đã đọc toàn bộ văn bản PDF hoặc đã kiểm bố cục mọi trang. Phần kiểm renderer, ngưỡng trong tệp, Unicode, phân trang và rà ảnh phải đối chiếu các bộ kiểm/QA riêng của Tuần 12.

Lượt cuối tạo **12 PNG**: trang xác nhận nộp của sinh viên, hồ sơ trưởng bộ môn đã xác nhận và 10 ảnh dashboard của năm vai trò trên. Dashboard được chụp ở **1440×1000** và **375×812**. Root đã mở xem đủ 12 ảnh; bản bằng chứng được lưu tại `docs/assets/tuan-12/ui`. [Ảnh sinh viên đã nộp](assets/tuan-12/ui/sv-da-nop-desktop.png) và [ảnh trưởng bộ môn đã xác nhận](assets/tuan-12/ui/tbm-xac-nhan-giai-trinh.png) thuộc bộ cuối; ảnh trưởng bộ môn đã thấy trạng thái xác nhận, không còn chụp giữa lúc tải lại dữ liệu.

| Dashboard đã mở xem | Desktop | Mobile |
| --- | --- | --- |
| ĐBCL | [1440×1000](assets/tuan-12/ui/can_bo_dbcl-desktop.png) | [375×812](assets/tuan-12/ui/can_bo_dbcl-mobile.png) |
| Giảng viên | [1440×1000](assets/tuan-12/ui/giang_vien-desktop.png) | [375×812](assets/tuan-12/ui/giang_vien-mobile.png) |
| PĐT | [1440×1000](assets/tuan-12/ui/phong_dao_tao-desktop.png) | [375×812](assets/tuan-12/ui/phong_dao_tao-mobile.png) |
| Khảo thí | [1440×1000](assets/tuan-12/ui/phong_khao_thi-desktop.png) | [375×812](assets/tuan-12/ui/phong_khao_thi-mobile.png) |
| Thanh tra | [1440×1000](assets/tuan-12/ui/thanh_tra-desktop.png) | [375×812](assets/tuan-12/ui/thanh_tra-mobile.png) |

Việc xem ảnh này xác nhận các màn hình đã chụp; không thay kết quả của lượt thao tác UC-GOLD thủ công còn dang dở trên demo riêng.

Tệp đính kèm của reporter còn có `uc-gold-report.csv`, `.xlsx`, `.pdf`, `dbcl-report.csv` và `uc-gold-steps.json`. Không lưu trace chứa cookie xác thực. Chưa kiểm các trình duyệt khác, thiết bị vật lý, WCAG đầy đủ hoặc kiểm tải trong bộ E2E này.

## 5. Hai lượt lỗi trước khi chốt

1. **Lượt 1:** Playwright từ chối tái sử dụng fixture `{ request }` lấy từ `beforeAll` trong thân test. Lỗi xảy ra trước các bước API nghiệp vụ đầu tiên. Bộ kiểm được sửa để tạo `APIRequestContext` độc lập bằng `requestFactory.newContext()` và `dispose()` trong `afterAll`.
2. **Lượt 2:** chuỗi đã đi tới hồ sơ nguồn `BAT_THUONG_KHAO_SAT`, nhưng helper thông báo luôn gửi `studentSummary`. Hồ sơ không gắn phản hồi/sinh viên bị dịch vụ từ chối đúng với 400 `INVALID_INPUT`. Helper được sửa để chỉ gửi tóm tắt sinh viên khi hồ sơ có `feedbackId`.

Hai sửa đổi thuộc bộ E2E; kiểm đầu vào và quyền nghiệp vụ của ứng dụng giữ nguyên. **Lượt 3** chạy lại từ fixture mới và qua cả ba test trong khoảng 2,2 phút, không bật retry để che lỗi. Không cộng hai lượt lỗi vào số test passed.

Sau khi xem bộ ảnh lượt hợp lệ đầu, root phát hiện ảnh trưởng bộ môn được chụp khi vừa lưu nhưng giao diện còn hiển thị **Đang tải giải trình…**. Trạng thái API đã đúng, nhưng ảnh chưa đủ làm bằng chứng giao diện đã xác nhận. Bộ E2E được bổ sung chờ dòng trạng thái **Đã xác nhận** hiện rõ và thông báo tải biến mất trước khi chụp. Lượt cuối 1,1 phút đã qua cả ba test và tạo lại bộ ảnh ổn định nêu trên.

## 6. Kết thúc và dữ liệu giữ lại

`afterAll` thu hồi mọi phiên và vô hiệu hóa **đúng 21 tài khoản giả của lượt chạy**, rồi đóng kết nối. Runner dừng máy chủ và tiến trình Playwright do nó mở. Marker lượt cuối ghi `status = passed`, `fixtureSessionsRevoked = true`, `dataRetained = true` lúc **08:18:06 giờ Việt Nam**; marker lượt hợp lệ đầu từng kết thúc lúc 08:04:31.

Lịch sử, phiếu ẩn danh và các dữ liệu nghiệp vụ fixture vẫn được giữ trong WEEK12 để truy vết. **Không ghi database thử là sạch hoặc trống**, không reset database, không xóa dữ liệu chính và không đổi tài khoản/MFA của chủ dự án. Tính bảo toàn dữ liệu chính và kết quả check/build phải đối chiếu các bằng chứng riêng; bộ E2E này không tự chứng nhận các phần đó.

## 7. Đối chiếu CI của nguồn chức năng

[GitHub Actions run 41588831428](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41588831428) hoàn tất thành công trên đúng nguồn **`6692854e97088845ce5b263318dfb1f6239fef04`**, nhánh `feat/week12-reports-anomalies`. Ba job `smoke`, `check` và `e2e` đều thành công. Riêng job E2E chạy Chromium trên **Ubuntu 24.04**, qua **3/3 test trong khoảng 1,3 phút**; log có đúng SHA checkout và ba tên test tương ứng ở Mục 4.

Thông tin này được đối chiếu từ `.local/week12-ci-proof.json`, gồm trạng thái run/job và các dòng kết quả đã lọc; không lưu toàn bộ log hoặc biến môi trường trong bằng chứng. Đây là CI của SHA nguồn nêu trên, không phải tuyên bố rằng mọi commit tài liệu hoặc nhánh chính sau đó đã có cùng lượt CI. Lượt Linux vẫn là bộ kiểm kết hợp HTTP/trình duyệt; không cộng thành hoàn tất nghiệm thu thủ công.

## 8. Lượt thao tác GUI riêng ngày 03/11/2026 — chưa hoàn tất

Sau các lượt E2E, đã thử một hành trình riêng trên Chrome bằng công cụ điều khiển giao diện, dùng demo riêng và tài khoản giả. Phần chuẩn bị chỉ tạo khoa, bộ môn, học kỳ, môn, một lớp đồng giảng bởi hai giảng viên, năm sinh viên cùng các tài khoản vai trò; không tạo sẵn mẫu, đợt, phiếu hoàn tất hoặc phản hồi để thay thao tác nghiệp vụ.

| Thao tác thực tế trên GUI | Kết quả đã quan sát |
| --- | --- |
| ĐBCL tạo mẫu và đợt khảo sát trong phạm vi khoa giả | Tạo được mẫu và đợt mới để dùng cho chính hành trình này |
| PĐT kiểm tra và xác nhận dữ liệu | Xác nhận được với cảnh báo RS-04 |
| Lãnh đạo phê duyệt đợt | Đợt sang `DANG_MO`, chốt năm nhiệm vụ khảo sát |
| SV1 chọn mức 2 ở cả hai câu Likert, nhập góp ý tự luận và nộp phiếu | Nộp được một phiếu qua giao diện |
| SV1 gửi phản hồi ẩn danh loại Giảng dạy | Tạo được phản hồi ẩn danh qua giao diện; chưa đi tiếp chuỗi xử lý của giảng viên |

Lượt này **dừng tại đây** vì công cụ điều khiển Windows không xác định đủ chắc chắn URL hiện tại và chặn thao tác tiếp theo theo quy tắc của công cụ. Đây là giới hạn của lượt điều khiển, không phải kết luận website lỗi hoặc đã đạt toàn bộ UC-GOLD. Không tiếp tục giao diện bằng một cách khác để vượt chặn trong cùng lượt.

Đã chuẩn bị helper riêng để bổ sung bốn phiếu bằng HTTP đăng nhập/CSRF/nhiệm vụ/nộp phiếu và helper truyền thời điểm `endsAt + 1 ms` cho lifecycle của đúng đợt giả. **Cả hai chưa được thực thi**: không ghi nhận bốn phiếu đó, không suy năm nhiệm vụ thành năm phiếu trả lời và không ghi rằng đã mô phỏng đóng đợt. Helper không phải thao tác GUI; nếu được chạy ở lượt sau, số phiếu phụ trợ và cách thực hiện phải được tách riêng trong bằng chứng. Không đổi thời gian bắt đầu/kết thúc trong database hoặc đồng hồ hệ thống.

Phần còn chờ của hành trình GUI gồm đủ mẫu, đóng và tổng hợp đợt, kiểm duyệt/công bố, giảng viên xem kết quả và gửi giải trình, trưởng bộ môn xác nhận, xử lý phản hồi ẩn danh rồi sinh viên đánh giá/đóng, cùng các nhánh Khảo thí/Thanh tra và báo cáo/tải tệp của hành trình thủ công. Kết quả tự động ở các mục trước được giữ nguyên; **chưa đánh dấu hoàn tất nghiệm thu thủ công hoặc nghiệm thu toàn bộ Tuần 12**.
