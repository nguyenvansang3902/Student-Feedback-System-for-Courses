# Tuần 13 — đã chốt kiểm thử với giới hạn được ghi nhận

Chốt ngày 05/11/2026 theo lệnh bắt đầu 03/11. [CI 41904262769](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41904262769) của nguồn `831d14decd9d6a562a1f9ecc0a53f6a4fadc8248` đã qua check/e2e/smoke. Không làm Tuần 14/UI-n.

## Kết quả hiện tại

- Check/build ngày 05/11 sau sửa package qua: **2.155 passed, 1 symlink skipped / 2.156 trong 93 tệp**, exit 0; coverage statements/branches/functions/lines **78,49/73,48/82,22/79,69%**, vượt ngưỡng. Build **101 route động**, ID `Q1SY2ZcIAr3Do--HbL1SZ`; [manifest](assets/tuan-13/check-build-after-calendar.json).
- Quyền/IDOR **801/801**; hồi quy **227 nhóm/15 bộ + demo 19/19**, chín mã Mục F có bằng chứng runtime. [Manifest](assets/tuan-13/runtime-regression.json) giữ giới hạn từng lượt kế thừa.
- E2E **6/6**; axe **34 trạng thái**, 0 vi phạm tự động, **7 incomplete/168 node** còn cần kiểm tay khả năng tiếp cận. **17 PNG tự động đã xem**.
- **UC-GOLD kiểm tay đã qua đủ các bước trong kịch bản**, gồm GV xem kết quả lớp mình và cả Lãnh đạo/ĐBCL xem, tải báo cáo. **8 PNG kiểm tay đã xem**; CSV **3.745/3.011 byte** được kiểm BOM/vai trò/phạm vi/5 phiếu/100%/mean số 2, không định danh tài khoản. [Kiểm tay](assets/tuan-13/manual-uc-gold.json), [CSV](assets/tuan-13/manual-export-verification.json). Chỉ CUA browser UI trên demo giả; không helper HTTP/đồng hồ giả/main writes. Nhánh chờ hết SLA kiểm runtime riêng.
- Main đúng ngữ cảnh Explorer/Docker: **45 bảng/1.575 người dùng**, guard **45 bảng/9.709 bản ghi cũ giữ hash** trước mở scheduler. Dump/restore độc lập qua, không áp dụng migration mới, seed/reset hoặc đổi credential/MFA. [Bằng chứng main](assets/tuan-13/main-data-verification.json). Web/scheduler đã mở lại khoảng 03:03 ngày 05/11; HTTP trang chủ/đăng nhập/health 200, health database:not_checked. Không nhận hash bất biến sau các tác vụ runtime bình thường; chưa kiểm reboot.

## Giới hạn còn giữ

p95 tải **3.595,91 ms** vẫn vượt mục tiêu 3.000 ms; audit còn 24 moderate tổng/tám production; scan nguồn partial; axe còn 7 incomplete/168 node. HTTP production 7/7 trước đó không thay kiểm build mới; giới hạn môi trường/automatic approval review được ghi trong manifest. Không chứng nhận toàn bộ OWASP/WCAG hoặc chống DBA/tự tiết lộ.

**Đã chốt 10 FR, thêm 23 điểm: 211/219=96,3%,78/84 FR.** Kế hoạch lũy kế 213/219, chênh 2 điểm FR-145 còn backlog. Sáu FR 09/103/110/111/112/145 chưa hoàn tất; không tự cắt hoặc bắt đầuTuần 14/UI-n. [Nghiệm thu](NGHIEM_THU_TUAN_13.md), [báo cáo 10 mục](bao-cao-tien-do/tuan-13.md).
