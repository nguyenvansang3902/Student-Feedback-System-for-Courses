# Nghiệm thu kỹ thuật Tuần 13 — hoàn tất kiểm thử, giữ các giới hạn

**Thực hiện:**03–05/11/2026. Đã hoàn tất kiểm thử, bảo mật và hiệu năng trong phạm vi chức năng tới Tuần 12; check/build, E2E, UC-GOLD kiểm tay và CI đúng nguồn đều qua. Chốt FR-160 cùng chín FR Tuần 12, đạt 211/219 điểm,78/84 FR; p95 và các giới hạn khác được ghi trung thực, không tuyên bố đạt mọi NFR. Không bắt đầuTuần 14/UI-n.

## 1. Nguồn và phương pháp

Nguồn chức năng `831d14decd9d6a562a1f9ecc0a53f6a4fadc8248` có [CI 41904262769](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41904262769) check/e2e/smoke thành công. [Manifest check/build mới](assets/tuan-13/check-build-after-calendar.json) ghi hash khi tổng hợp sau kiểm, không có snapshot bất biến trước chạy. Chỉ harness Tuần 11 đổi cách dựng thời điểm; ứng dụng/E2E và bằng chứng GUI giữ nguyên. Hồ sơ sau nguồn chức năng được commit riêng.

**Lịch sử CI:** [run 41901861781](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41901861781) của nguồn d952d61 có smoke/e2e thành công nhưng check thất bại: harness Tuần 11 cộng bốn ngày lịch từ thứ Năm 05/11, rơi đúng hạn hai ngày làm việc vào thứ Hai. Service từ chối leo thang tại đúng hạn là đúng. Nguồn `831d14d` chỉ sửa thời điểm kiểm theo hạn ngày làm việc cấu hình cộng 1 ms, không đổi ứng dụng hoặc nới assertion. [Bằng chứng sửa harness](assets/tuan-13/ci-business-deadline-fix.json) qua bốn bộ/43 nhóm hiện có; không cộng thành 43 ca mới hoặc chạy lại GUI. Run 41904262769 của nguồn sửa đã thành công đầy đủ, theo manifest CI mới.

[Manifest runtime](assets/tuan-13/runtime-regression.json) giữ các lượt kế thừa: một số bộ Tuần 4–7 chạy trước sửa khóa nộp cuối; Tuần 8 trở đi kiểm đường thay đổi. Không gọi mọi bộ là một lượt trên cùng snapshot. Test Vitest, nhóm tích hợp, kịch bản E2E, trạng thái axe và request tải là các đơn vị riêng.

## 2. Kết quả đã chạy

| Phép kiểm | Kết quả | Giới hạn/bằng chứng |
| --- | --- | --- |
| Check ngày 05/11 | **Exit 0; 93/93 tệp; 2.155 passed,1 skipped/2.156** | Lint/TypeScript/Prisma runtime+design/ERD qua; symlink Windows bị EPERM, không tính skipped thành passed |
| Coverage V 8 | Statements **4.544/5.789=78,49%**; branches **3.337/4.541=73,48%**; functions **985/1.198=82,22%**; lines **4.082/5.122=79,69%** | Service/policy/auth, loại khai báo kiểu/seed; vượt 75/70/75/75, không gộp HTTP/E2E |
| Build ngày 05/11 | **Exit 0; 101 route động**, Next 16.4.3 | `.next`, ID `Q1SY2ZcIAr3Do--HbL1SZ`; [manifest check/build](assets/tuan-13/check-build-after-calendar.json) |
| Policy/tài nguyên | **801/801 test**,2 tệp |700 ô 70 action×10 vai trò+41 tình huống+60 test tài nguyên; không thay HTTP/MySQL |
| Runtime/xuất tệp | **227 nhóm/15 bộ**, thêm **demo 19/19** |217 MySQL/HTTP/service+10 parser; chín mã Mục F có bằng chứng, [ma trận](MA_TRAN_KIEM_THU_TUAN_13.md) |
| Khóa/transaction MySQL | **8/8 nhóm** | S/S, S chặn X, current read/quyền/phiên, fallback, race, rollback; [JSON](assets/tuan-13/survey-lock-result.json) |
| Playwright Chromium | **6/6** | [JSON E2E](assets/tuan-13/ui/e2e-accessibility-summary.json); fixture/HTTP/trình duyệt, không thay kiểm tay |
| Axe/ảnh tự động | **34 trạng thái,0 vi phạm; 17 PNG đã xem** | **7 incomplete/168 node** còn cần kiểm tay khả năng tiếp cận, không chứng nhận WCAG |
| UC-GOLD kiểm tay | **Đã qua đủ các bước trên GUI; 8 PNG đã xem** | [Manifest](assets/tuan-13/manual-uc-gold.json), tách khỏi E2E; SLA chờ thật không kiểm bằng tay |
| CSV qua GUI | Lãnh đạo **3.745 byte**, ĐBCL **3.011 byte** | [Kiểm byte](assets/tuan-13/manual-export-verification.json): BOM, vai trò/phạm vi,5 phiếu/100%/mean số 2, không định danh tài khoản |
| Tải 200 nhiệm vụ | **200/200 HTTP 200**,0 HTTP 500/lỗi mạng | **p95 3.595,91 ms >3.000 ms**, NFR-16 chưa đạt toàn bộ; [hiệu năng](HIEU_NANG_TUAN_13.md) |
| Race 20 cùng task | **1 HTTP 200/19 HTTP 409**, đúng 1 phiếu | Không trùng hoặc nửa giao dịch trong mẫu đã kiểm |
| Database chính | **45 bảng/1.575 người dùng**, migration mới nhất Tuần 12, chủ dự án tồn tại | Guard 45 bảng/9.709 bản ghi cũ giữ hash trước scheduler; [bằng chứng main](assets/tuan-13/main-data-verification.json) |
| Bản sao logic/restore kiểm riêng | **46 bảng/9.722 dòng khớp chính xác**, gồm 13 dòng Prisma | Dump 1.734.124 byte single-transaction, so bảng/khóa/hash; SQL/VHDX giữ riêng |
| CI đúng nguồn | **Check/e2e/smoke thành công; Linux 2.156/2.156 trong 93 tệp, khôngskip; E2E 6/6** | [Bằng chứng CI](assets/tuan-13/ci-source-831d14d.json); lượt 41901861781 lỗi harness lịch giữ riêng |

## 3. Kiểm tay và bảo toàn dữ liệu

Ngày 04–05/11, mọi thao tác nghiệp vụ tiếp tục qua CUA browser UI trên demo giả riêng: đợt hết hạn tự nhiên,5 nhiệm vụ DONE/5 phiếu/100%/2,00; tự luận chờ duyệt chặn công bố, nhập lý do kiểm duyệt rồi công bố 0 chờ. GV xem kết quả lớp mình và gửi giải trình/TBM xác nhận. Phản hồi được xử lý, sinh viên đánh giá 4/5/tự đóng. Khảo thí xử lý đúng hàng đợi thi và xem nhóm đánh giá gộp đủ hai GV có LIKERT hợp lệ. Thanh tra đi tới thông báo/đóng sau kết luận giả `KHONG_DU_THONG_TIN`. Cả Lãnh đạo và ĐBCL xem/tải CSV theo đúng đợt. Không helper HTTP, đồng hồ giả hoặc main writes; không nhận đã chờ hết SLA bằng tay.

Ngữ cảnh Docker khác gây quan sát 31 bảng ban đầu đã được xác định và khép lại. Sau bản sao ngoại tuyến/mở độc quyền/đối chiếu hash cả hai VHDX, mở shortcut Docker Desktop qua Windows Explorer chọn đúng ngữ cảnh; compose db/mailpit healthy. Guard sau toàn bộ GUI qua lúc **03:01:13 ngày 05/11**,45 bảng/9.709 bản ghi giữ hash. Số 9.519 ở hồ sơ cũ là lịch sử.

Sau check/build mới, web/scheduler đã mở lại bằng trình khởi động hiện có. [Kiểm HTTP03:16:32 ngày05/11](assets/tuan-13/local-runtime-verification.json) có trang chủ/đăng nhập/health200; health vẫn database:not_checked, tách khỏi SQL. Migration deploy báo không có migration cần áp dụng; không áp dụng migration mới, không seed/reset/restore main hoặc đổi credential/MFA. Scheduler có thể ghi audit/email/trạng thái đến hạn bình thường; không nhận hash sau runtime vẫn bất biến. Chưa kiểm reboot.

## 4. Sửa lỗi và giới hạn

Đã sửa quyền ADMIN đa vai trò ở results:*, nonce CSP/header, budget nộp 30 request/60 giây và khóa chia sẻ cho đường nộp ổn định; mutator giữ khóa độc quyền, CAS/phiếu/đáp án nguyên tử. Sửa nhãn thương hiệu/vùng bảng cuộn cho bàn phím trong phạm vi Tuần 13.

Giữ p95 chưa đạt 3 giây, audit 24 moderate tổng/tám production, scan partial 40 tệp/8 bề mặt và licenseNOASSERTION. Axe 7 incomplete/168 node chưa được giải quyết chỉ từ lượt kiểm tay nghiệp vụ. Ẩn danh ở mức ứng dụng, không chống DBA/log hạ tầng/tự tiết lộ hoặc mọi phép suy luận qua nhiều tập dữ liệu.

HTTP development/production 7/7 trước đó giữ bằng chứng riêng. Build mới chưa được xác minh HTTP production; lỗi APP_URL HTTP/guard HTTPS và lần thử lại process-onlyHTTPS bị automatic approval review từ chối không nêu lý do là lịch sử, không kết luận mã hiện tại lỗi CSP. Không nới guard hoặc thay .env để vượt kiểm. Phép đối chiếu bổ sung đúng build cuối chưa chạy lại được giữ là giới hạn, không phải gate còn thiếu để trì hoãn nghiệmthu.

## 5. Quyết định nghiệm thu

**Đã chốt ngày 05/11:** FR-90/91/92/93/94/147/151/158/159 thêm 20 điểm, FR-160 thêm 3 điểm, tổng **211/219=96,3%,78/84 FR**. Kế hoạch Tuần 13 là 213/219; chênh 2 điểm FR-145 giữ backlog. Sáu FR 09/103/110/111/112/145 chưa hoàn tất, không tự cắt hoặc chuyển Tuần 14/UI-n. Nhóm tự điền đóng góp/GVHD/ngày yêu cầu.

[Báo cáo 10 mục](bao-cao-tien-do/tuan-13.md), [QA](QA_GIAO_DIEN_TUAN_13.md), [bảo mật](BAO_MAT_TUAN_13.md), [tồn tại](LOI_CON_TON_TUAN_13.md).
