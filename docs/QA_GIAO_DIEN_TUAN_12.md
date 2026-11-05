# Kiểm tra giao diện Tuần 12

Ngày 03/11/2026, dữ liệu giả trên database thử riêng, không dùng tài khoản ADMIN/MFA của chủ dự án. Đây là giao diện chức năng Tuần 12, không kích hoạt giai đoạn UI-n.

## Kiểm tự động và ảnh đã xem

Playwright Chromium 1.64.1 chạy 3/3 test qua. UC-GOLD có bước nộp khảo sát, gửi/xác nhận giải trình, đánh giá phản hồi và tải tệp bằng trình duyệt; các bước điều phối khác qua HTTP thật. Kiểm dashboard 10 vai trò,5 vai trò ở 1440×1000 và 375×812; bảng dài cuộn trong khối, không làm tràn ngang cả trang. Không placeholder trong ô nhập ở các màn đã kiểm. Đầu vào/bộ lọc áp dụng trước khi xuất tệp, không xuất theo bộ lọc đang sửa dở.

Đã mở và xem 12 ảnh PNG dưới đây. Mười ảnh dashboard và ảnh sinh viên từ lượt E2E qua đầu tiên; ảnh xác nhận TBM từ lượt qua cuối sau khi bổ sung chờ trạng thái ổn định. Các tiền tố giả khác nhau giữa hai lượt, không phải cùng tài khoản thực tế.

| Nội dung | Desktop | Mobile |
| --- | --- | --- |
| ĐBCL | [Ảnh](assets/tuan-12/ui/can_bo_dbcl-desktop.png) | [Ảnh](assets/tuan-12/ui/can_bo_dbcl-mobile.png) |
| Giảng viên | [Ảnh](assets/tuan-12/ui/giang_vien-desktop.png) | [Ảnh](assets/tuan-12/ui/giang_vien-mobile.png) |
| PĐT | [Ảnh](assets/tuan-12/ui/phong_dao_tao-desktop.png) | [Ảnh](assets/tuan-12/ui/phong_dao_tao-mobile.png) |
| Khảo thí | [Ảnh](assets/tuan-12/ui/phong_khao_thi-desktop.png) | [Ảnh](assets/tuan-12/ui/phong_khao_thi-mobile.png) |
| Thanh tra | [Ảnh](assets/tuan-12/ui/thanh_tra-desktop.png) | [Ảnh](assets/tuan-12/ui/thanh_tra-mobile.png) |

[Sinh viên đã nộp](assets/tuan-12/ui/sv-da-nop-desktop.png), [TBM đã xác nhận](assets/tuan-12/ui/tbm-xac-nhan-giai-trinh.png). Bản chụp TBM đầu tiên còn tải dữ liệu nên không được dùng để nhận đã hiện trạng thái; bản lưu ở đây đã chờ trạng thái xác nhận.

Quan sát: nhãn/bộ lọc xuống dòng trên mobile; bảng rộng có khung cuộn riêng. Ô thiếu mẫu thể hiện Chưa đủ dữ liệu, không vẽ thanh hoặc thay thành 0. Trên dữ liệu thử, PĐT chưa có phản hồi tổ chức lớp và thống kê Thanh tra còn ít hồ sơ nên các phần đó trống/bị che đúng điều kiện; không gọi ảnh này là bằng chứng đã xem biểu đồ có đủ mẫu cho hai vai trò đó. Ảnh có chỉ báo Next dev, chưa phải chứng nhận giao diện production hoàn hảo.

## PDF

Đã giải mã nội dung CSV/XLSX/PDF cho ba vai trò mới và xem mẫu PDF Thanh tra 1 trang, báo cáo dài 5 trang. Tiếng Việt không lỗi dấu, có font nhúng, bảng tiếp trang lặp tiêu đề và đủ dòng cuối 80, số trang 1–5 đúng. PDF/Excel/CSV dùng DTO đã kiểm quyền, không đọc thêm dữ liệu tại renderer. Hai bản PDF giả tại output/pdf dùng để kiểm chức năng, không thay báo cáo tiểu luận.

## Thao tác trực tiếp — cập nhật 05/11/2026

Luồng GUI cốt lõi tiếp tục ngày 04–05/11 đã qua:5/5 nhiệm vụ DONE,5 phiếu/100%/2,00; một tự luận chờ chặn công bố, kiểm duyệt có lý do rồi công bố 0 chờ; giảng viên gửi giải trình/TBM xác nhận; phản hồi giảng dạy được trả lời và sinh viên đánh giá 4/5/tự đóng. Khảo thí xử lý phản hồi thi và xem đúng nhóm đánh giá gộp 5 phiếu/100%/2,00 với ít nhất 2 GV góp điểm hợp lệ. Thanh tra nhận/xác minh/ghi chú giả/kết luận giả `KHONG_DU_THONG_TIN`/thông báo/đóng. Lãnh đạo xem đúng bộ lọc và tải CSV 3.745 byte, header vai trò/bộ lọc đã đọc lại đúng.

Phiên chính đã mở xem tám PNG kiểm tay tại [UC-GOLD mục 9](UC_GOLD_TUAN_12.md), hash tại [manifest](assets/tuan-13/manual-uc-gold.json); tách khỏi 12 ảnh E2E lịch sử. Tất cả thao tác tiếp tục qua CUA browser UI trên demo giả riêng, không helper HTTP/đồng hồ giả/main writes. Chưa nhận đã chờ hết SLA bằng tay.

**UC-GOLD kiểm tay đủ các bước trong kịch bản đã qua.** GV xem kết quả lớp mình, ĐBCL xem dashboard và tải CSV đều đã thực hiện lúc 02:58–02:59 ngày 05/11. Tám PNG đã xem; CSV Lãnh đạo 3.745 byte/ĐBCL 3.011 byte đã kiểm byte, vai trò/phạm vi và mean số 2. [Bằng chứng](assets/tuan-13/manual-export-verification.json). Check/build 05/11 đã qua, CI đã qua; đã chốt FR/điểm.

### Lịch sử checkpoint 03/11 — đã được tiếp tục

Đã kiểm trực tiếp trên Chrome với demo và tài khoản giả riêng: tạo mẫu/đợt phạm vi khoa, PĐT xác nhận cảnh báo RS-04, lãnh đạo duyệt mở năm nhiệm vụ, SV 1 nộp hai câu Likert cùng góp ý tự luận và gửi phản hồi Giảng dạy ẩn danh. Có **một phiếu đã nộp**, không suy năm nhiệm vụ thành năm phiếu.

Đã xem và lưu [tiến độ năm nhiệm vụ sau mở](assets/tuan-12/ui/manual-dot-da-mo.png), [xác nhận sinh viên đã nộp](assets/tuan-12/ui/manual-sv-da-nop.png). Đây là ảnh viewport kiểm trực tiếp, tách khỏi 12 ảnh E2E ở trên. Không thay tài khoản, QR hoặc MFA của chủ dự án.

Checkpoint 03/11 bị dừng là lịch sử đã được tiếp tục. [UC-GOLD mục 9](UC_GOLD_TUAN_12.md) và manifest mới ghi đủ bước GUI đã qua, tách khỏi E2E; CI nguồn cuối đã qua.

Lượt03/11 chưa chạy axe/Lighthouse/SUS. Tuần 13 đã bổ sung axe34trạng thái,0vi phạm tự động nhưng còn7incomplete/168 node; không chứng nhận WCAG hoặc mọi thiết bị. Bằng chứng dịch vụ, E2E và kiểm trực tiếp được ghi tách biệt tại [nghiệm thu](NGHIEM_THU_TUAN_12.md), [UC-GOLD](UC_GOLD_TUAN_12.md) và [QA Tuần 13](QA_GIAO_DIEN_TUAN_13.md).
