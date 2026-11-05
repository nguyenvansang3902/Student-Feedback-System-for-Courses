# Kiểm tra giao diện Tuần 13

**Chốt ngày 05/11/2026:** Check/build cục bộ, UC-GOLD kiểm tay đủ các bước và [CI 41904262769](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41904262769) check/e2e/smoke của nguồn `831d14decd9d6a562a1f9ecc0a53f6a4fadc8248` đều qua. Chốt 10 FR, thêm 23 điểm: **211/219=96,3%,78/84 FR**. Giữ các giới hạn p95, audit, axe và phạm vi quét; không bắt đầu Tuần 14/UI-n.

Tài liệu phân biệt lượt thao tác trực tiếp, E2E tự động và kiểm HTTP. Giai đoạn nâng cấp UI vẫn tạm dừng; kiểm responsive/khả năng tiếp cận thuộc phạm vi Tuần 13.

## Thao tác trực tiếp — cập nhật 05/11

Luồng GUI cốt lõi đã qua trên demo giả riêng:5/5 nhiệm vụ DONE,5 phiếu/100%/2,00; tự luận chờ duyệt chặn công bố, sau kiểm duyệt có lý do đã công bố 0 chờ; GV gửi giải trình/TBM xác nhận; xử lý phản hồi và sinh viên đánh giá 4/5/tự đóng; Khảo thí xử lý thi và xem nhóm đánh giá gộp đủ hai GV hợp lệ; Thanh tra nhận/xác minh/kết luận giả/thông báo/đóng; Lãnh đạo xem đúng bộ lọc và tải CSV 3.745 byte, header vai trò/bộ lọc đã đọc lại đúng. [Manifest kiểm tay](assets/tuan-13/manual-uc-gold.json) giữ dữ kiện gộp/hash, không ID hoặc credential.

UC-GOLD kiểm tay đã qua đủ các bước trong kịch bản ngày 05/11: GV xem kết quả lớp mình, ĐBCL xem/xuất báo cáo và các nhánh công bố, giải trình/TBM, phản hồi đánh giá 4/5, Khảo thí/Thanh tra, Lãnh đạo CSV đều đã quan sát trên GUI. Tám PNG đã mở xem; CSV Lãnh đạo 3.745 byte và ĐBCL 3.011 byte có BOM, đúng vai trò/bộ lọc/5 phiếu/100%/mean số 2, không định danh tài khoản. Chỉ CUA browser UI trên demo giả, không helper HTTP/đồng hồ giả/main writes; không nhận chờ SLA bằng tay. [Manifest](assets/tuan-13/manual-uc-gold.json), [CSV](assets/tuan-13/manual-export-verification.json). Check/build 05/11 qua; CI nguồn cuối đã qua, đã chốt FR/điểm.

Tám PNG kiểm tay đã được phiên chính mở xem, tách khỏi 17 PNG E2E: [công bố](assets/tuan-13/ui/uc-gold-da-cong-bo.png), [TBM xác nhận](assets/tuan-13/ui/uc-gold-tbm-xac-nhan.png), [sinh viên đánh giá](assets/tuan-13/ui/uc-gold-sv-danh-gia.png), [Khảo thí báo cáo](assets/tuan-13/ui/uc-gold-khao-thi-bao-cao.png), [Thanh tra đóng](assets/tuan-13/ui/uc-gold-thanh-tra-dong.png), [Lãnh đạo báo cáo](assets/tuan-13/ui/uc-gold-lanh-dao-bao-cao.png), [ĐBCL báo cáo](assets/tuan-13/ui/uc-gold-dbcl-bao-cao.png), [GV kết quả lớp](assets/tuan-13/ui/uc-gold-gv-ket-qua-lop.png).

### Lịch sử checkpoint 03–04/11 — không phải trạng thái hiện tại

Checkpoint riêng ngày 03/11 ghi nhận đợt thử mới đã có năm phiếu nộp qua giao diện và ba phản hồi giả thuộc luồng giảng dạy, thi kết thúc học phần và nghiêm trọng. Đây là checkpoint của lượt trước; không gọi nó là quan sát mới của lượt 04/11. Không dùng helper HTTP hoặc sửa đồng hồ/dữ liệu để ghi thêm thao tác trực tiếp.

Lượt tiếp tục ngày **04/11/2026** đã đọc đầy đủ kỹ năng Computer Use cập nhật cùng hướng dẫn API và xác nhận. Hướng dẫn bắt buộc: **“Use `node_repl` JavaScript for all Computer Use actions.”** Tác vụ phụ không được cung cấp runtime này nên không thực hiện GUI. Sau đó phiên chính được bổ sung `node_repl`, đã khởi tạo Sky, tìm đúng cửa sổ Chrome từ inventory và thử mở tab kiểm riêng. Công cụ tự dừng trước khi điều khiển website vì không xác định đủ chắc chắn URL trình duyệt Windows để thực thi chính sách. Theo hướng dẫn **“If Computer Use reports that the turn ended or that the user stopped Computer Use, stop issuing app input”**, phiên chính dừng mọi đầu vào ứng dụng của lượt đó. Không nhập tài khoản, không có quan sát/ảnh nghiệp vụ mới hoặc helper HTTP thay phần GUI. Máy chủ preview và Docker đã được bật lại riêng; lỗi điều khiển không chứng minh website lỗi.

Cập nhật vận hành ngày 04/11: sau giữ bản sao ngoại tuyến và hash hai VHDX, mở shortcut Docker Desktop qua Windows Explorer đã chọn đúng ngữ cảnh, compose `db`/`mailpit` healthy. Kiểm chỉ đọc 45 bảng/1.575 người dùng, migration mới nhất Tuần 12 và chủ dự án tồn tại; guard 45 bảng/9.709 bản ghi cũ giữ hash. Không áp dụng migration mới, không seed/reset/đổi credential/MFA, chưa kiểm reboot. Đây là bằng chứng database, không phải thao tác GUI hoàn tất.

Tại checkpoint trước khi tiếp tục, các bước được ghi còn chờ như sau; kết quả mới đã thay bằng mục cập nhật 05/11 ở trên:

1. ĐBCL tổng hợp, kiểm duyệt và công bố; giảng viên gửi giải trình, trưởng bộ môn xác nhận.
2. Giảng viên xử lý phản hồi thường; sinh viên đánh giá hài lòng và đóng.
3. Khảo thí xử lý phản hồi thi, chỉ xem kết quả nhóm đánh giá gộp đủ điều kiện.
4. Thanh tra ghi xác minh giả, kết luận, thông báo và đóng hồ sơ; kiểm người xung đột không thấy hồ sơ.
5. Lãnh đạo/ĐBCL xem báo cáo và tải CSV qua giao diện; đối chiếu quyền, ngưỡng và nội dung tệp.

Danh sách này là lịch sử đã được kiểm tiếp đầy đủ ngày 05/11; UC-GOLD GUI đủ các bước trong kịch bản đã qua. CI nguồn cuối đã qua; không dùng E2E hoặc số bản ghi thay bằng chứng kiểm tay.

## Kiểm tự động

Bộ Playwright Chromium ngày 04/11 qua **6/6 kịch bản**, không failed/skipped, theo [tóm tắt có hash tệp nguồn](assets/tuan-13/ui/e2e-accessibility-summary.json). Ba kịch bản khả năng tiếp cận và ba kịch bản UC-GOLD/dashboard là các phần riêng trong cùng lượt chạy. HEAD nền `e059856` đi cùng thay đổi chưa commit; không chỉ dùng SHA nền để gọi đây là nguồn bất biến cuối.

`tests/e2e/accessibility.spec.ts` đã kiểm **34 trạng thái** desktop/360 px, đủ dashboard mười vai trò cùng trang tài khoản/biểu mẫu, có kiểm bàn phím, focus, nhãn/lỗi và tràn ngang. Axe ghi **0 lượt quy tắc vi phạm/0 node vi phạm**, còn **7 lượt quy tắc incomplete/168 node** cần kiểm tay. Các mục chưa quyết định không phải đã qua; JSON giữ tên trạng thái, quy tắc, lý do và node đại diện.

Đã mở xem **17 PNG cuối** trong trường `screenshots` của tóm tắt: đăng nhập desktop/360 px, form khảo sát 360 px, ADMIN/Thanh tra 360 px, dashboard ĐBCL/GV/PĐT/Khảo thí/Thanh tra desktop/mobile, xác nhận nộp và TBM xác nhận giải trình. Ảnh `axe-before-*` và mẫu chuyển trạng thái giữ làm dấu vết, không cộng vào 17 ảnh cuối. Đã sửa tên truy cập nhãn thương hiệu và vùng bảng cuộn cho bàn phím; đây là sửa lỗi Tuần 13, không kích hoạt giai đoạn UI.

Các lượt incomplete đều thuộc `color-contrast` ở 360 px. `shortTextContent` nghĩa là công cụ không đủ dữ liệu chữ để quyết định; `elmPartiallyObscured` nghĩa là phần tử bị che một phần trong vùng cuộn, không phải kết luận tương phản đạt hoặc không đạt.

| Trạng thái | Node cần kiểm tay | Lý do axe |
| --- | --- | --- |
| Sinh viên mobile 360 | 5 | shortTextContent |
| ĐBCL mobile 360 | 34 | elmPartiallyObscured |
| Lãnh đạo mobile 360 | 54 | elmPartiallyObscured |
| ADMIN mobile 360 | 3 | elmPartiallyObscured |
| PĐT mobile 360 | 28 | shortTextContent, elmPartiallyObscured |
| Khảo thí mobile 360 | 24 | elmPartiallyObscured |
| Thanh tra mobile 360 | 20 | elmPartiallyObscured |
| **Tổng 7 lượt quy tắc** | **168** | Chưa quyết định tự động |

UC-GOLD tự động và kiểm quyền trong `tests/e2e/uc-gold.spec.ts` là bằng chứng riêng. Các thao tác chuẩn bị fixture/HTTP phải được mô tả đúng phương thức; không gọi toàn bộ bài E2E là làm bằng tay.

## Header HTTP và giới hạn kết luận

Lượt kiểm HTTP development ngày 03/11 qua bảy đường dẫn; production ngày 04/11 trước bản dựng cuối cũng qua 7/7, theo bằng chứng riêng trong [hồ sơ bảo mật](BAO_MAT_TUAN_13.md). Check/coverage/build cuối ngày 04/11 đã qua, buildID `Q1SY2ZcIAr3Do--HbL1SZ`, nhưng **HTTP production của build này chưa xác minh**: APP_URL HTTP bị guard HTTPS từ chối và trả 500; lượt thử lại HTTPS chỉ trong process bị automatic approval review từ chối, không nêu lý do. [Manifest](assets/tuan-13/check-build-after-calendar.json) giữ lượt lỗi và giới hạn; không lấy 7/7 trước thay lượt cuối hoặc nới guard. Bytes HTML không thay ảnh/hydration; E2E 6/6 là lớp bằng chứng riêng.

Chỉ nhận các màn hình/kích thước và hành trình đã kiểm thật. Kết quả axe không tự tạo chứng nhận WCAG cho toàn hệ thống; các mục cần kiểm tay vẫn phải được ghi lại.
