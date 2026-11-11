# Nghiệm thu kỹ thuật Tuần 15

Ngày thực hiện **11/11/2026**. Bản bảo vệ dùng metadata gói `1.0.0` và mốc Git `v1.0`. Tiến độ tính theo ma trận yêu cầu là **213/219 điểm (97,3%), 79/84 FR**. [Tiến độ](PROGRESS.md)

## Tài liệu bàn giao

- Báo cáo Word gồm sáu chương và hai phụ lục, 17 trang. Nội dung dùng mười tác nhân theo Điều chỉnh số 01, đối chiếu mã và bằng chứng từ hồ sơ các tuần. Thông tin trường, GVHD, thành viên và đóng góp do nhóm xác nhận. [Nguồn báo cáo](bao-cao-tieu-luan/bao-cao-tong-hop-tuan-15.md)
- Bộ PowerPoint 14 slide trình bày bài toán, phạm vi quyền, UC-GOLD, thiết kế ẩn danh, kiểm thử, triển khai và giới hạn. [Dàn ý slide](DAN_Y_SLIDE_TUAN_15.md)
- Sơ đồ ca sử dụng có đủ mười tác nhân. Kịch bản dự kiến 9 phút 15 giây, có 20 câu hỏi phản biện và đáp án ngắn. [Sơ đồ](SO_DO_CA_SU_DUNG_TUAN_15.md) · [Kịch bản](KICH_BAN_BAO_VE_TUAN_15.md) · [Câu hỏi](CAU_HOI_PHAN_BIEN_TUAN_15.md)

## Kiểm tra và giới hạn

`npm run check` tại Windows đã qua schema, ERD, lint, TypeScript và **93/93 tệp Vitest**. Có **2.155 passed, 1 skipped / 2.156**. Ca skipped cần quyền tạo symlink. [Bằng chứng](assets/tuan-15/check.json)

GitHub Actions đã qua cả ba job **check, smoke và e2e** trên commit ứng dụng `e53d083` (metadata 1.0.0). Commit sau đó bổ sung hồ sơ bàn giao. [Run GitHub Actions](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/42982583192) · [Kết quả](assets/tuan-15/ci-e53d083.json)

Playwright ngày 11/11 đã qua **6/6 ca** trên mã ứng dụng `d39d4cc`, nền cho bản 1.0. Ca chính UC-GOLD qua tám chặng trong **87,31 giây**, có tải CSV, Excel và PDF. Bộ này kết hợp trình duyệt và HTTP trên MySQL thử. Lượt kiểm tay trọn luồng ngày 04–05/11/2026 được ghi riêng. [Lượt kiểm Tuần 15](UC_GOLD_TUAN_15.md) · [Kiểm tay Tuần 13](assets/tuan-13/manual-uc-gold.json)

Bản Docker demo báo phiên bản `1.0.0`. Lượt rà cảnh bảo vệ đăng nhập qua biểu mẫu với năm vai trò, mở phiếu còn hạn, đợt khảo sát, kết quả đúng lớp, báo cáo Lãnh đạo và hàng đợi Thanh tra. Đã lọc và tải CSV **6.311 byte** trên màn hình. Các cảnh dùng dữ liệu mẫu đã chuẩn bị. [Kết quả rà demo](assets/tuan-15/demo-rehearsal.json)

- Chỉ số p95 **3.595,91 ms** trong lượt đo 200 nhiệm vụ nộp phiếu cao hơn mục tiêu 3.000 ms. Dữ liệu kiểm khả năng tiếp cận còn các mục cần đánh giá thủ công. [Hiệu năng](HIEU_NANG_TUAN_13.md) · [Giới hạn kiểm thử](LOI_CON_TON_TUAN_13.md)
- Mô hình bảo vệ danh tính ở tầng ứng dụng. Quyền hạ tầng, log ngoài ứng dụng và nội dung tự tiết lộ có thể tạo khả năng suy đoán. Thanh tra dùng hệ thống để quản lý hồ sơ. Phản hồi thi của Khảo thí và thủ tục phúc khảo có phạm vi riêng. [Đặc tả](DAC_TA_NGHIEP_VU.md) · [Điều chỉnh số 01](BO_SUNG_01_TAC_NHAN.md)
- FR-145 (P1) còn mở phần theo dõi lô nhập và hoàn tác khi dữ liệu chưa được chốt vào đợt. Đây là phần chênh 2 điểm so với mốc kế hoạch 215/219.
- Bốn yêu cầu P2 còn mở gồm quản lý phiên theo thiết bị (FR-09), gợi ý chủ đề và cảm xúc cho góp ý (FR-110), API trạng thái hoàn thành (FR-111) và đánh giá riêng từng giảng viên (FR-112). [Ma trận yêu cầu](PROGRESS.md)
- Xác nhận cá nhân còn cần nhóm tự trình bày phần đã thực hiện. Lượt người ngoài nhóm tự chạy README cần người thực hiện xác nhận. [Bảng thành viên](TEAM.md) · [Vận hành](VAN_HANH_TUAN_14.md)

## Chạy bản bảo vệ

1. Tải mã nguồn tại mốc `v1.0`. Bật Docker Linux containers và mở terminal ở thư mục dự án.
2. Chạy `node scripts/start-demo-compose.mjs`. Mở [đăng nhập demo](http://127.0.0.1:3014/dang-nhap) bằng tài khoản mẫu trong README.
3. Mở khảo sát sinh viên, kết quả giảng viên và báo cáo Lãnh đạo theo kịch bản. Dùng video dự phòng nếu cần trình bày khi máy demo gián đoạn. [README](../README.md) · [Video](assets/tuan-14/demo-tuan-14.webm)
