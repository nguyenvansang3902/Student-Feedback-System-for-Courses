# QA giao diện — Tuần 8

Lượt cuối hoàn tất **30/10/2026 lúc 00:58:34 (Asia/Saigon)** bằng Puppeteer và Chrome headless: **13/13 nhóm kiểm, 17 trạng thái × 2 viewport = 34/34 lượt bố cục, 34 PNG đã mở xem**. Không có `pageerror`, lỗi React trùng key/hydration được theo dõi, tràn ngang hoặc trường nhập thiếu nhãn trong phạm vi đo. Kết quả API/MySQL, 20 yêu cầu đồng thời, rollback, kiểm ẩn danh và CI nằm trong [nghiệm thu Tuần 8](NGHIEM_THU_TUAN_08.md).

## Môi trường và dữ liệu

Máy chủ demo `http://127.0.0.1:3001`, Next dev dùng `.next-demo`, là máy chủ Next dev duy nhất trong lượt QA. Harness kiểm marker `isolated-demo`, tên database demo khác database chính và UUID máy chủ MySQL trước mọi ghi. Database demo `survey_feedback_demo_384b8885ffd51ec8` được giữ lại; không reset database hoặc volume.

Fixture cuối có tiền tố `W8UI-20a485d0`: hai tài khoản sinh viên đăng nhập bằng biểu mẫu thật, một tài khoản ĐBCL tạo mẫu, hai học kỳ, một môn, bảy lớp, một mẫu khóa gồm sáu câu thuộc đủ năm loại, bốn đợt và bảy nhiệm vụ của sinh viên thứ nhất. Mẫu có cả Likert 1–4/1–5, câu bắt buộc/tùy chọn và Không áp dụng. Tài khoản sinh viên thứ hai không có nhiệm vụ để kiểm trạng thái rỗng. Mật khẩu, secret và token không được đưa vào ảnh hoặc báo cáo.

Các trạng thái CLOSED/NOT_OPEN/LOCKED và một nhiệm vụ DONE ban đầu được tạo trực tiếp làm fixture hiển thị; không dùng chúng để kết luận đã chạy quy trình phê duyệt hoặc đã tạo phiếu. Hai nhiệm vụ khác được nộp thực qua giao diện/API; nhánh mất phản hồi sau COMMIT được đối chiếu có đúng một phiếu và sáu đáp án.

Cleanup dọn đúng các ID fixture, phiếu/đáp án, nhiệm vụ, lịch sử, thông báo/email, audit, phiên, vai trò, TOTP và rate bucket của tài khoản fixture. Đối chiếu số tài khoản/học kỳ/môn/mẫu/đợt/nhiệm vụ/phiếu/đáp án, toàn bộ cây mẫu, cấu hình, đợt seed và rate bucket gốc: **`cleaned=true`, `seedUnchanged=true`**. Không sửa dữ liệu chính hoặc ảnh các tuần trước. Máy chủ QA đã được dừng bằng PID và command line được đối chiếu sau lượt cuối.

## Kết quả thao tác thực

| Nhóm | Kiểm thực tế và kết quả |
| --- | --- |
| 01 — Đăng nhập/menu | Sinh viên đăng nhập qua form, đến tài khoản và có liên kết Khảo sát của tôi. |
| 02 — FR-50 danh sách | Chỉ thấy bảy nhiệm vụ fixture của mình; lọc PENDING có sáu, DONE có một. Có lịch giờ Việt Nam và nhãn đang nhận/đã nộp/chưa mở/đã kết thúc/kỳ khóa. |
| 03 — FR-54 và lịch | Mở thẳng URL xác nhận khi PENDING chuyển về form. CLOSED/NOT_OPEN/LOCKED chỉ hiển thị trạng thái/lịch, không có trường đáp án. |
| 04 — FR-51/52 form và nháp | Hiển thị đủ năm loại, cả hai thang Likert. Bỏ câu bắt buộc có lỗi và focus câu đầu. BOOLEAN=false vẫn được tính đã trả lời; chọn Không áp dụng xóa/tách giá trị cũ và vô hiệu lựa chọn. Tiến trình 6/6, bắt buộc 5/5. Reload phục hồi đúng TEXT, false và N/A. |
| 05 — BR-04 giờ và gia hạn | Cho đồng hồ thiết bị nhanh 30 ngày: form vẫn dùng được và nháp còn. Sau khi fixture được gia hạn, focus phát GET mới, hiển thị hạn mới và giữ nháp. Quyền nộp do máy chủ quyết định. |
| 06 — Nháp không hợp lệ | JSON hỏng bị bỏ có thông báo tiếng Việt. Đổi namespace nháp sang phiên bản 999 rồi reload không phục hồi nội dung vào mẫu khóa phiên bản 1. |
| 07 — Storage bị chặn | Giả lập getter localStorage ném SecurityError: vẫn trả lời được form, có cảnh báo không thể lưu nháp, không có lỗi JavaScript không xử lý. |
| 08 — POST chưa commit | Chặn yêu cầu nộp trước khi tới máy chủ: chỉ một lần POST, GET đối chiếu PENDING, nháp còn; giao diện cho người dùng kiểm tra rồi tự nộp lại. |
| 09 — POST đã commit, mất phản hồi | CDP bỏ phản hồi POST sau khi máy chủ xử lý. Client không tự gửi lại POST, chỉ GET trạng thái rồi chuyển xác nhận. Database có đúng một phiếu/sáu đáp án; nháp bị xóa, trang xác nhận không có textarea hoặc nội dung tự luận đã nộp. Tổng hai nhánh mạng là đúng hai lần POST do hai lần người dùng chủ động bấm. |
| 10 — Hai tab và GET cũ | Tab B nộp nhiệm vụ thứ hai; tab A xóa cả memory/storage và dừng autosave. Giữ một phản hồi GET PENDING ở CDP rồi trả về sau DONE: tab A vẫn khóa form, TEXT rỗng và không tái tạo nháp. GET trạng thái mới đưa tab A đến xác nhận. Ảnh cuối chụp sau bước GET mới, không dùng ảnh làm bằng chứng duy nhất cho nhánh phản hồi muộn. |
| 11 — Đăng xuất giữa hai tab | Nhập nháp nhiệm vụ thứ ba, đăng xuất thật ở tab B: cả hai tab về đăng nhập và mọi nháp trong namespace bị xóa, không lưu trở lại sau khi chờ. |
| 12 — Sinh viên không có nhiệm vụ | Tài khoản sinh viên thứ hai đăng nhập thật và thấy trạng thái rỗng, không thấy nhiệm vụ của sinh viên đầu. IDOR/phân quyền các vai trò khác được kiểm ở bộ HTTP riêng. |
| 13 — Bố cục/lỗi | Cả 34 lượt ở desktop 1440 × 1000 và mobile 390 × 844 không tràn ngang, không trường thiếu label/aria-label trong phép đo, không lộ responseId/answerId hoặc tên cookie token trong chữ hiển thị. `pageErrors=0`, `reactErrors=0`. |

## Ảnh cuối đã mở xem

Ảnh toàn trang có thể cao hơn viewport. Mở PNG gốc để đọc các form dài.

| Trạng thái | Desktop | Mobile |
| --- | --- | --- |
| Danh sách tất cả bảy nhiệm vụ | [PNG](assets/tuan-08/ui/sv-danh-sach-1440.png) | [PNG](assets/tuan-08/ui/sv-danh-sach-390.png) |
| Lọc sáu nhiệm vụ chưa hoàn thành | [PNG](assets/tuan-08/ui/sv-chua-hoan-thanh-1440.png) | [PNG](assets/tuan-08/ui/sv-chua-hoan-thanh-390.png) |
| Lọc nhiệm vụ đã hoàn thành | [PNG](assets/tuan-08/ui/sv-da-hoan-thanh-1440.png) | [PNG](assets/tuan-08/ui/sv-da-hoan-thanh-390.png) |
| Form ban đầu, năm loại câu | [PNG](assets/tuan-08/ui/sv-form-ban-dau-1440.png) | [PNG](assets/tuan-08/ui/sv-form-ban-dau-390.png) |
| Nhiệm vụ đã kết thúc | [PNG](assets/tuan-08/ui/sv-da-ket-thuc-1440.png) | [PNG](assets/tuan-08/ui/sv-da-ket-thuc-390.png) |
| Nhiệm vụ chưa đến giờ | [PNG](assets/tuan-08/ui/sv-chua-den-gio-1440.png) | [PNG](assets/tuan-08/ui/sv-chua-den-gio-390.png) |
| Học kỳ đã khóa | [PNG](assets/tuan-08/ui/sv-hoc-ky-khoa-1440.png) | [PNG](assets/tuan-08/ui/sv-hoc-ky-khoa-390.png) |
| Thiếu câu bắt buộc và focus | [PNG](assets/tuan-08/ui/sv-thieu-cau-bat-buoc-1440.png) | [PNG](assets/tuan-08/ui/sv-thieu-cau-bat-buoc-390.png) |
| Trả lời đủ, có N/A/false | [PNG](assets/tuan-08/ui/sv-form-da-tra-loi-1440.png) | [PNG](assets/tuan-08/ui/sv-form-da-tra-loi-390.png) |
| Nháp phục hồi sau reload | [PNG](assets/tuan-08/ui/sv-nhap-khoi-phuc-1440.png) | [PNG](assets/tuan-08/ui/sv-nhap-khoi-phuc-390.png) |
| Gia hạn giữ nháp | [PNG](assets/tuan-08/ui/sv-gia-han-giu-nhap-1440.png) | [PNG](assets/tuan-08/ui/sv-gia-han-giu-nhap-390.png) |
| Thông báo nháp JSON hỏng | [PNG](assets/tuan-08/ui/sv-nhap-hong-1440.png) | [PNG](assets/tuan-08/ui/sv-nhap-hong-390.png) |
| Trình duyệt chặn lưu nháp | [PNG](assets/tuan-08/ui/sv-storage-bi-chan-1440.png) | [PNG](assets/tuan-08/ui/sv-storage-bi-chan-390.png) |
| POST lỗi trước commit, giữ nháp | [PNG](assets/tuan-08/ui/sv-loi-mang-giu-nhap-1440.png) | [PNG](assets/tuan-08/ui/sv-loi-mang-giu-nhap-390.png) |
| Xác nhận sau mất phản hồi POST | [PNG](assets/tuan-08/ui/sv-xac-nhan-da-nop-1440.png) | [PNG](assets/tuan-08/ui/sv-xac-nhan-da-nop-390.png) |
| Tab cũ đã xóa nháp, GET mới xác nhận | [PNG](assets/tuan-08/ui/sv-tab-cu-da-xoa-nhap-1440.png) | [PNG](assets/tuan-08/ui/sv-tab-cu-da-xoa-nhap-390.png) |
| Sinh viên không có nhiệm vụ | [PNG](assets/tuan-08/ui/sv-chua-co-nhiem-vu-1440.png) | [PNG](assets/tuan-08/ui/sv-chua-co-nhiem-vu-390.png) |

## Lượt chưa đạt và sửa chữa

Hai lượt đầu dừng ở chờ thông báo nháp JSON hỏng. Đã xác định effect được React StrictMode replay: lần đọc đầu xóa nháp hỏng, lần sau đọc rỗng và ghi đè thông báo. Sửa form giữ riêng trạng thái thông báo invalid/expired cho cùng initial props; ref không giữ đáp án, được xóa ở mọi nhánh DONE/CLOSED/LOCKED/logout/task-cleared. Guard epoch của microtask và GET muộn được giữ. Lượt cuối đã qua nhánh này và các nhánh xóa nháp.

Lượt kế tiếp dừng ở chờ tab nền bằng requestAnimationFrame của harness. Chuyển polling sang timer 100 ms rồi chạy lại đủ 13 nhóm. Khi mở xem PNG của lượt đã qua chức năng, phát hiện hai ảnh tab nền bị Chrome compositor lặp mảng dù DOM đo không tràn ngang. Đã sửa harness đưa đúng tab ra trước khi chụp và chờ repaint; giữ nguyên assertion form khóa/rỗng sau GET cũ, sau đó GET mới đến xác nhận rồi chụp tab cũ. **Chạy lại toàn bộ**, chỉ dùng 34 ảnh của lượt cuối 00:58:34 và đã mở xem lại đủ 34 ảnh. Tất cả lượt trước đều cleanup thành công và giữ seed; không reset dữ liệu để che lỗi.

## Giới hạn và bằng chứng riêng

Đây là QA Chrome trên hai kích thước, chưa phải chứng nhận mọi trình duyệt, mọi thiết bị hoặc WCAG. Kiểm label/aria-label không thay thế trình đọc màn hình. Thay đổi đồng hồ chỉ là phép thử client; không sửa đồng hồ máy chủ. Gia hạn fixture ở bước kiểm nhận hạn mới là cập nhật có kiểm soát phục vụ UI, không dùng thay nghiệm thu quy trình gia hạn Tuần 7.

Không suy diễn kiểm ẩn danh toàn hệ thống từ ảnh. Bộ schema/service/HTTP riêng kiểm ranh giới task–response, không ghi nội dung phiếu/log cầu nối, nộp đồng thời và rollback. Xuất kết quả khảo sát CSV/XLSX/PDF của Tuần 12 chưa được triển khai hoặc kiểm bởi lượt này. Không có tổng hợp, kiểm duyệt hay công bố kết quả mới trong Tuần 8.

Harness, kết quả JSON và log nằm ngoài repository tại workspace `work/week8-ui/`; server log ở `.local/week7-demo.stdout.log`/`.stderr.log` (tệp nối tiếp nên có cả log các lượt trước). Timestamp kết quả cuối UTC là `2026-10-29T17:58:34.424Z`, tương ứng giờ Việt Nam ở đầu báo cáo. Commit nguồn ứng dụng đã kiểm: `6edad31fef16ee11f5ace82645107b0b7153742d`; việc retake chỉ đổi harness/ảnh QA, không đổi mã ứng dụng.
