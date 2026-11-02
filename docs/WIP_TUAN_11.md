# Tuần 11 — checkpoint lịch sử triển khai

Checkpoint dưới đây được giữ để giải thích trạng thái giữa phiên; không phải kết quả bàn giao cuối. Kết quả chốt tại [nghiệm thu](NGHIEM_THU_TUAN_11.md), [báo cáo](bao-cao-tien-do/tuan-11.md) và verification.json. Migration đã áp dụng, kiểm cuối đã thay các số sơ bộ bên dưới. Không dùng checkpoint này để suy công việc còn đang dang dở.

Bắt đầu thực tế ngày 02/11/2026 theo lệnh người dùng. Chưa nghiệm thu, chưa đánh dấu hoàn tất các FR Tuần 11.

- Nhánh hiện tại `main`; chưa tạo hoặc chuyển sang `ui/nang-cap-giao-dien`, chưa tạo tag UI. Các thay đổi nghiệp vụ Tuần 11 đang chưa commit.
- UI: **chưa bắt đầu, chờ nghiệm thu tuần 11**. Đã lưu nguyên văn `UI_NANG_CAP_PROMPT.md`; chỉ cập nhật quy định kích hoạt trong AGENTS, kế hoạch và trạng thái. Không làm UI-0, bảng màu, baseline UI hay hỏi năm câu. Luật UI chỉ bật theo lệnh BẮT ĐẦU GIAI ĐOẠN UI-n, dành cho sau 15 tuần theo chỉ đạo mới nhất.
- Đã có SLA, leo thang/nhắc hạn, chống spam, hài lòng/mở lại; giải trình và kiến nghị; quy trình Thanh tra, ghi chú/tệp nội bộ, chuyển một chiều; thông báo và worker email kiểm lại quyền.
- Schema mới: 43 bảng runtime / 46 thiết kế / 3 chỉ thiết kế. Migration đang thử riêng, chưa áp dụng vào database chính. Đã sửa collation bảng mới cho khớp các bảng cũ; giữ database thử lỗi và marker, không reset hoặc xóa.
- Kiểm direct service/MySQL riêng đã chạy: phản hồi nâng cao 13 nhóm, Thanh tra 7 nhóm, giải trình/kiến nghị 12 nhóm, thông báo/SMTP/Mailpit 9 nhóm. Kiểm riêng và tuần tự; lượt chạy song song ban đầu gây nhiễu fixture của các vai trò GLOBAL, không được tính là nghiệm thu.
- Check đầu: 1120 passed, 1 skipped / 1121 trong 73 tệp; hai cảnh báo ghép mã đã được sửa, đang kiểm lại. Chưa chốt build, kiểm HTTP hồi quy, UI thật, seed lặp, bảo toàn dữ liệu chính và CI.
- Tiếp theo: hoàn tất các kiểm tra trên, cập nhật báo cáo/SLA/truy vết/tiến độ theo kết quả thật, commit và đẩy bản chạy được lên GitHub, mở lại web cổng 3000. Không tự thay MFA của chủ dự án hoặc làm Tuần 12.
