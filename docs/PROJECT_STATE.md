# Trạng thái dự án

- Tuần hiện tại: Tuần 13 — theo lệnh ngày 03/11; thực hiện từ 03–05/11/2026. Mốc kế hoạch giả định 23–29/12, không ghi lùi ngày.
- Nguồn chức năng đã đẩy: `831d14decd9d6a562a1f9ecc0a53f6a4fadc8248`. [CI 41904262769](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41904262769) đã qua check/e2e/smoke đúng nguồn. Bản chốt hồ sơ `571fadf` cũng có [CI 41946083006](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41946083006) qua cả ba job; sửa vận hành Docker sau đó không thay mã ứng dụng.
- **Đã chốt Tuần 12–13 ngày 05/11: 211/219=96,3%,78/84 FR.** Chín FR Tuần 12 thêm 20 điểm, FR-160 thêm 3 điểm. Check/build và UC-GOLD kiểm tay đủ các bước đã qua; giữ đầy đủ các giới hạn bên dưới.
- UI-n vẫn tạm dừng, chỉ kích hoạt bằng lệnh giai đoạn riêng sau 15 tuần. Không bắt đầu Tuần 14.

## Kết quả kiểm thử hiện có

- Check Windows ngày05/11: **2.155 passed,1 skipped/2.156 trong93 tệp**, exit0; skipped là symlink bị hệ điều hành từ chối. Lint, TypeScript, runtime/design Prisma và ERD qua. [CI Linux đúng nguồn](assets/tuan-13/ci-source-831d14d.json) qua **2.156/2.156 trong93 tệp**, khôngskip, E2E 6/6; không biến skipped của Windows thành passed.
- Coverage service/policy/auth: statements **78,49%**, branches **73,48%**, functions **82,22%**, lines **79,69%**; vượt ngưỡng 75/70/75/75. Build Next.js 16.4.3 exit 0, 101 route động, ID `Q1SY2ZcIAr3Do--HbL1SZ`. [Manifest check/build](assets/tuan-13/check-build-after-calendar.json) giữ mẫu số, fingerprint và log; hash được ghi khi tổng hợp sau check/build; không có snapshot bất biến trước chạy.
- Ma trận quyền/IDOR **801/801 Vitest**. Hồi quy **227 nhóm trong 15 bộ**, gồm 217 nhóm MySQL/HTTP/service và 10 nhóm parser; demo **19/19** đếm riêng. Chín mã Mục F có bằng chứng runtime. [Manifest](assets/tuan-13/runtime-regression.json) giữ giới hạn các lượt kế thừa, không nhận mọi bộ chạy cùng snapshot bất biến.
- E2E Chromium **6/6**; axe **34 trạng thái**, 0 vi phạm tự động, còn **7 incomplete / 168 node** cần kiểm tay riêng. **17 PNG tự động đã xem**, tách khỏi **8 PNG kiểm tay**.
- Tải sau sửa: **200/200**, 0 HTTP 500/lỗi mạng; race 20 đúng một phiếu. **p95 3.595,91 ms > 3.000 ms** nên NFR-16 chưa đạt toàn bộ. Không nới ngưỡng/pool/timeout để ghi đạt.
- Đã sửa quyền ADMIN đa vai trò đọc kết quả, nonce CSP/header, budget nộp 30 request/60 giây và khóa chia sẻ cho đường nộp ổn định. Scan nguồn partial 40 tệp/8 bề mặt; audit còn 24 moderate tổng/tám production, 0 high/critical. [Bảo mật](BAO_MAT_TUAN_13.md), [phụ thuộc](PHU_THUOC_TUAN_13.md), [tồn tại](LOI_CON_TON_TUAN_13.md).
- HTTP production 7/7 trước đó là bằng chứng riêng. Build mới chưa có lượt HTTP production được xác minh; lỗi APP_URL HTTP/guard HTTPS và lần thử lại bị automatic approval review từ chối không nêu lý do được giữ là lịch sử, không kết luận mã hiện tại lỗi CSP.

## UC-GOLD kiểm tay đã qua

[Bằng chứng kiểm tay](assets/tuan-13/manual-uc-gold.json) ghi các thao tác CUA browser UI trên demo giả riêng, không helper HTTP, đồng hồ giả hoặc ghi database chính: 5 phiếu/100%/2,00; kiểm duyệt rồi công bố 0 tự luận chờ; GV xem kết quả lớp mình và gửi giải trình/TBM xác nhận; xử lý phản hồi, sinh viên đánh giá 4/5 và tự đóng; Khảo thí xử lý thi/xem nhóm đánh giá gộp; Thanh tra thông báo/đóng sau kết luận giả; cả Lãnh đạo và ĐBCL xem/xuất báo cáo. Tám PNG đã mở xem. CSV Lãnh đạo **3.745 byte**, ĐBCL **3.011 byte** có BOM, đúng vai trò/bộ lọc/5 phiếu/100%/mean số **2**, không định danh tài khoản; [kiểm byte CSV](assets/tuan-13/manual-export-verification.json). Nhánh chờ hết SLA kiểm bằng runtime, không nhận đã chờ bằng tay. Các lượt công cụ dừng 03–04/11 là lịch sử đã được tiếp tục.

## Database và vận hành

- **Sửa lâu dài ngày 05/11:** kho WSL được chuyển bằng giao diện Docker tới `D:\DockerData\DockerDesktopWSL`, đồng bộ hai cấu hình vật lý ngoài ảnh hưởng chuyển hướng AppData của MSIX. Bốn cách mở trực tiếp/CLI/CUA/shortcut Explorer cùng dùng kho D:, giữ engine/container/volume/MySQL; toàn bộ **46 bảng/9.840 dòng** gồm 13 dòng Prisma khớp checkpoint mới, **45 bảng/9.827 dòng ứng dụng và 1.575 người dùng**. Ba lần mở có nhật ký riêng chứng minh dừng hoàn toàn và tiến trình mới; lần trực tiếp có dấu vết phiên và guard, không lưu cặp nhật ký tiến trình riêng. [Hồ sơ sửa](DOCKER_MOT_KHO_DU_LIEU.md), [bằng chứng](assets/van-hanh/docker-single-store-20261105.json).
- Checkpoint mới tách khỏi mốc 9.709 dòng dưới đây: runtime trước khi sửa đã thêm 118 dòng, cập nhật tám hàng, không xóa hàng. Các bản sao SQL/VHDX giữ ngoài Git; không reset/seed/đổi credential/MFA. Bản SQL mới chưa restore thử; kết quả restore dưới đây chỉ áp dụng cho bản xuất lịch sử. Chưa kiểm reboot hoặc toàn bộ DDL/index/FK.
- Sau sửa đã mở lại web/scheduler bằng launcher, không có migration cần áp dụng. [Kiểm runtime mới](assets/van-hanh/docker-runtime-20261105.json) có ba HTTP 200; health vẫn `database:not_checked`, tách khỏi guard MySQL. Scheduler có thể ghi nghiệp vụ bình thường sau checkpoint.
- Các đoạn tiếp theo giữ bằng chứng trước lần sửa thống nhất kho:
- Sau bản sao ngoại tuyến/mở độc quyền/đối chiếu hash cả hai Docker VHDX, mở shortcut Docker Desktop qua Windows Explorer đã chọn đúng ngữ cảnh AppData. Compose `db`/`mailpit` healthy; đọc được **45 bảng ứng dụng, 1.575 người dùng**, migration mới nhất Tuần 12 và chủ dự án tồn tại.
- [Bằng chứng main](assets/tuan-13/main-data-verification.json): 45 bảng/**9.709 bản ghi cũ** giữ hash; dump single-transaction và restore database mới độc lập khớp chính xác 46 bảng/9.722 dòng gồm Prisma. SQL/VHDX giữ riêng. Số 9.451/9.519 trong hồ sơ Tuần 12 là lịch sử.
- Guard sau toàn bộ GUI qua lúc 03:01:13 ngày 05/11, trước mở scheduler. Sau check/build mới, web/scheduler đã mở lại; [kiểm HTTP 03:16:32](assets/tuan-13/local-runtime-verification.json) có trang chủ/đăng nhập/health 200, health vẫn `database:not_checked`, tách khỏi SQL. Launcher gọi migration deploy nhưng không có migration cần áp dụng; không áp dụng migration mới, không seed/reset hoặc đổi credential/MFA. Runtime bình thường có thể ghi audit/email/trạng thái đến hạn, không nhận hash sau scheduler vẫn bất biến. Chưa kiểm reboot.

## Tiến độ đã chốt

Đã chốt **211/219=96,3%,78/84 FR**: chín FR Tuần 12 và FR-160 đã tick; kế hoạch 213/219, chênh 2 điểm FR-145 giữ backlog. Sáu FR 09/103/110/111/112/145 chưa hoàn tất; không tự cắt hoặc bắt đầu Tuần 14/UI-n. Nhóm tự điền đóng góp/GVHD/ngày yêu cầu. Công việc vận hành thống nhất kho Docker đã hoàn tất trong phạm vi bốn cách mở được kiểm; không cộng thêm FR hoặc điểm.

[Hồ sơ nghiệm thu](NGHIEM_THU_TUAN_13.md), [báo cáo 10 mục](bao-cao-tien-do/tuan-13.md), [chương kiểm thử](CHUONG_KIEM_THU_VA_DANH_GIA_TUAN_13.md), [QA](QA_GIAO_DIEN_TUAN_13.md).
