# Giải thích Tuần 13

**Chốt ngày 05/11/2026:** Check/build cục bộ, UC-GOLD kiểm tay đủ các bước và [CI 41904262769](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41904262769) check/e2e/smoke của nguồn `831d14decd9d6a562a1f9ecc0a53f6a4fadc8248` đều qua. Chốt 10 FR, thêm 23 điểm: **211/219=96,3%,78/84 FR**. Giữ các giới hạn p95, audit, axe và phạm vi quét; không bắt đầu Tuần 14/UI-n.

Ngày viết: **04/11/2026**. AI hỗ trợ soạn nháp từ mã và bằng chứng kiểm thử. Nhóm cần đọc, thử lại và giải thích bằng lời của mình; tài liệu không xác định đóng góp của từng thành viên.

Tuần 13 kiểm chức năng đã có, sửa lỗi quyền/giới hạn request/header/CSP và đo giao dịch đồng thời. Đã chốt với check/build, E2E, GUI đủ các bước và CI đúng nguồn qua; các số liệu sau giữ cả kết quả và giới hạn.

## 1. Có 801 test quyền qua thì đã chứng minh hệ thống an toàn chưa?

Chưa. Bộ bổ sung kiểm 700 ô của 70 hành động × 10 vai trò, thêm 41 tình huống grant/scope/phiên và 60 test tài nguyên cụ thể. Chúng giúp phát hiện việc cho nhầm vai trò, ID thuộc người khác, xung đột lợi ích hoặc thông báo mở đường đọc dữ liệu ngoài phạm vi. Đây là Vitest; một số đối tượng và thao tác database được mô phỏng.

Để kết luận về API hoặc database, phải kiểm HTTP/MySQL và đọc tệp xuất thật. Chín mã Điều chỉnh 01 đã có bằng chứng runtime trong [ma trận](../MA_TRAN_KIEM_THU_TUAN_13.md) và [manifest](../assets/tuan-13/runtime-regression.json):227 nhóm/15 bộ, thêmdemo 19/19. Manifest giữ giới hạn nguồn của các lượt kế thừa, không nhận mọi bộ chạy cùng snapshot bất biến. Lượt rà nguồn chỉ bao phủ partial 40 tệp/8 bề mặt. Số test xanh không thay phần chưa kiểm hoặc xác minh database chính.

## 2. Tại sao sinh viên chỉ nộp một lần mà phiếu vẫn không cần lưu người nộp?

`SurveyTask` cho biết sinh viên có nhiệm vụ nào và nhiệm vụ còn PENDING hay đã DONE. Khi nộp, máy chủ kiểm owner và chuyển đúng task PENDING sang DONE bằng cập nhật có điều kiện. Nếu không đổi được đúng một hàng thì từ chối nộp lại. Trong cùng transaction, hệ thống tạo `SurveyResponse` với UUID và các `SurveyAnswer`; phần phiếu không có userId, taskId hoặc sessionId để nối ngược về tài khoản.

Nếu insert đáp án lỗi, MySQL rollback cả task và phiếu. Bộ HTTP/MySQL Tuần 8 đã thử 20 request cùng task: một thành công, 19 lỗi 409; trigger gây lỗi insert làm dữ liệu trở về PENDING/không phiếu, rồi thử lại thành công. Kiểm khóa mới xác nhận lại nguyên tắc đó. Đây là ẩn danh ở mức ứng dụng; nhóm không nên nói hệ thống chống được DBA, log hạ tầng hoặc nội dung tự tiết lộ danh tính.

## 3. Vì sao đổi sang khóa chia sẻ giúp nhanh hơn mà vẫn phải giữ khóa độc quyền?

Trước sửa, các lần nộp lấy chung khóa độc quyền cả khi đợt đã mở ổn định, khiến nhiều sinh viên phải chờ nhau. Bản sửa cho phép các lượt đọc/nộp ổn định cùng giữ khóa chia sẻ. Lệnh khóa là current read đầu tiên, sau đó mới đọc lại phiên và quyền; thay đổi quản trị/quyền/danh mục/đợt vẫn cần khóa độc quyền nên không chen vào giữa phần xử lý đang được bảo vệ.

Nếu chưa có guard, trạng thái cần chuyển hoặc thời gian qua hạn sau đọc mẫu, transaction chia sẻ kết thúc rồi mới chạy lifecycle độc quyền và kiểm lại quyền. Không nâng S thành X trong một transaction. CAS của task và việc ghi phiếu/đáp án vẫn nguyên tử. Tám nhóm MySQL thật đã kiểm S/S, S chặn X, hai nhiệm vụ tiến đồng thời, thay quyền/thu hồi phiên trong X, race, rollback và biên hết hạn. Khóa này không thay toàn bộ cơ chế khóa phiên của logout/reset mật khẩu và không có nghĩa hạn nộp được kiểm tại đúng lúc commit.

## 4. ADMIN có thêm vai trò giảng viên thì vì sao vẫn bị chặn xem kết quả?

BR-68 yêu cầu tách việc quản trị kỹ thuật khỏi dữ liệu nghiệp vụ nhạy cảm. Nếu policy chỉ kiểm “có một vai trò được đọc” thì tài khoản ADMIN kiêm giảng viên hoặc ĐBCL có thể được cấp quyền kết quả từ vai trò bổ sung. Lỗi này đã được tái hiện ở nguồn trước sửa.

Bản vá từ chối ADMIN ở toàn bộ miền `results:*` trước khi xét grant khác, đồng thời giữ kiểm ở route/service. Một vai trò nghiệp vụ bình thường vẫn chịu phạm vi lớp/bộ môn/khoa, thời điểm công bố và ngưỡng mẫu. Việc ẩn nút hoặc đường dẫn trên giao diện không đủ, vì người dùng có thể gọi API trực tiếp. Chi tiết kiểm và giới hạn tại [hồ sơ bảo mật](../BAO_MAT_TUAN_13.md).

## 5. Sau tối ưu nộp đủ 200 phiếu thì có thể ghi hiệu năng đã đạt không?

Chỉ được ghi đúng từng điều kiện. Lượt nền có 196/200 HTTP 200, bốn HTTP 500, p95 12.092,56 ms. Sau sửa có **200/200 HTTP 200, không lỗi mạng/HTTP 500**, p95 **3.595,91 ms**; race 20 vẫn chỉ tạo một phiếu. Đây là cải thiện quan sát được trên máy thử, nhưng p95 còn vượt mục tiêu đề xuất 3.000 ms **595,91 ms**, nên không được đánh dấu NFR-16 đạt toàn bộ hoặc đổi ngưỡng để báo xanh.

Phép đo dùng production riêng, dữ liệu giả, HTTP loopback/MySQL thật; không đo Internet/TLS hoặc đăng nhập đồng thời. E 2 E 6/6, axe 34 trạng thái 0 vi phạm,7 incomplete/168 node và 17 PNG tự động đã xem. Check/build và CI nguồn831d14d đã qua. CI cũ 41901861781 thất bại vì harness cộng ngày lịch đúng biên hạn làm việc; chỉ harness được sửa, service đúng và không cần chạy lại GUI. HTTP đúng build cuối chưa chạy lại là giới hạn, không phải gate nghiệm thu còn thiếu.

UC-GOLD kiểm tay đã qua đủ các bước trong kịch bản ngày 05/11: GV xem kết quả lớp mình, ĐBCL xem/xuất báo cáo và các nhánh công bố, giải trình/TBM, phản hồi đánh giá 4/5, Khảo thí/Thanh tra, Lãnh đạo CSV đều đã quan sát trên GUI. Tám PNG đã mở xem; CSV Lãnh đạo 3.745 byte và ĐBCL 3.011 byte có BOM, đúng vai trò/bộ lọc/5 phiếu/100%/mean số 2, không định danh tài khoản. Chỉ CUA browser UI trên demo giả, không helper HTTP/đồng hồ giả/main writes; không nhận chờ SLA bằng tay. [Kiểm tay](../assets/tuan-13/manual-uc-gold.json), [CSV](../assets/tuan-13/manual-export-verification.json). CI nguồn cuối đã qua; đã chốt FR/điểm.

Khác biệt 31 bảng thuộc ngữ cảnh Docker/AppData đã được giải thích. Lượt kiểm Tuần 13 đúng ngữ cảnh qua shortcut Explorer có 45 bảng/1.575 người dùng, migrationTuần 12 và chủ dự án tồn tại;45 bảng/9.709 bản ghi giữ hash trước scheduler. Không áp dụng migration mới, không seed/reset/đổi credential/MFA. Số 9.519 cũ là lịch sử; chưa kiểm reboot. Công việc thống nhất một kho Docker lâu dài là yêu cầu vận hành riêng, không đổi bằng chứng Tuần 13.

Đối chiếu [nháp chương kiểm thử](../CHUONG_KIEM_THU_VA_DANH_GIA_TUAN_13.md), [hiệu năng](../HIEU_NANG_TUAN_13.md), [ma trận quyền/IDOR](../MA_TRAN_KIEM_THU_TUAN_13.md) và [phụ thuộc](../PHU_THUOC_TUAN_13.md). Các mục đang chờ phải được cập nhật từ bằng chứng chạy thật trước khi dùng làm kết luận cuối.
