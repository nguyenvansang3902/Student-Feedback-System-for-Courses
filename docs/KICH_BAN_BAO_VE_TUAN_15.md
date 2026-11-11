# Kịch bản bảo vệ và demo

Thời lượng dự kiến **9 phút 15 giây**. Dùng dữ liệu giả và hai hoặc ba trạng thái đã chuẩn bị trước để có thể trình bày cả bước mở và bước đóng đợt trong thời gian bảo vệ. Mỗi lần chuyển sang trạng thái chuẩn bị trước, nói rõ đó là đợt mẫu hoặc ảnh của lượt kiểm. Các thao tác ghi trong buổi demo dùng dữ liệu tập riêng.

## Chuẩn bị trước khi trình bày

1. Mở Docker Desktop ở chế độ Linux containers. Chạy `node scripts/start-demo-compose.mjs` trong thư mục dự án. Mở [trang đăng nhập](http://127.0.0.1:3014/dang-nhap). Dùng mật khẩu demo ban đầu `Demo2026!HocTap` cho các tài khoản seed. Tài khoản ADMIN được tạo riêng và hoàn tất TOTP trước giờ trình bày. [README](../README.md)
2. Kiểm tra trước ba màn hình hoặc đợt mẫu. Chọn một đợt có thể chỉ ra tiến trình xác nhận, một phiếu của sinh viên còn thời hạn và một đợt đã công bố có đủ mẫu. Nếu dùng đợt mới, chuẩn bị đúng khoa, lớp, giảng viên, sinh viên và đăng ký. Xác minh trạng thái và giờ kết thúc ngay trước lượt demo. Dùng cửa sổ hoặc hồ sơ trình duyệt riêng cho từng tài khoản để tránh dùng nhầm phiên.
3. Chuẩn bị thêm phản hồi giảng dạy có thể xử lý, một phản hồi thi và một hồ sơ Thanh tra giả. Mở sẵn kết quả lớp giảng viên, yêu cầu giải trình của lớp điểm thấp và báo cáo Lãnh đạo. Tải thử CSV trước để biết thư mục lưu. Đóng tab chứa cấu hình, QR, mã khôi phục hoặc dữ liệu riêng.
4. Lưu sẵn [video dự phòng](assets/tuan-14/demo-tuan-14.webm), [hướng dẫn có ảnh](HUONG_DAN_SU_DUNG.md) và [bằng chứng UC-GOLD kiểm tay](assets/tuan-13/manual-uc-gold.json). Mỗi người tập phần phụ trách một lượt và tự ghi thời gian đo được.

## Trình tự bảo vệ

| Thời gian | Thao tác và lời dẫn | Dấu hiệu cần chỉ ra |
| --- | --- | --- |
| 0:00–0:50 | Giới thiệu bài toán theo dõi khảo sát môn học và xử lý phản hồi. Mở sơ đồ ca sử dụng, chỉ ba nhóm việc gồm đào tạo, khảo sát và xử lý phản hồi. | Hệ thống có 10 tác nhân. Vai trò và phạm vi dữ liệu quyết định màn hình và hành động. |
| 0:50–2:05 | Trên màn hình **Đợt khảo sát**, dùng `DBCL2026001` chỉ phiên bản mẫu, phạm vi khoa và lịch. Chuyển qua cảnh `PDT2026001` xác nhận đối tượng và `LD2026001` phê duyệt. Dùng đợt mẫu hoặc ảnh của lượt chạy để trình bày các trạng thái kế tiếp. | Thứ tự là ĐBCL trình, PĐT xác nhận, Lãnh đạo duyệt, hệ thống chốt danh sách khi mở. Giải thích vì sao mẫu đã duyệt được khóa. |
| 2:05–3:20 | Dùng `DEMO-SV00001`, mở **Khảo sát của tôi**. Chọn một nhiệm vụ còn hạn. Nếu lượt diễn tập đã dành riêng phiếu này, nhập câu bắt buộc, xem lại và xác nhận nộp. Nếu nhiệm vụ đã hoàn tất, mở xác nhận của lượt trước và nói rõ. | Danh sách đúng lớp. Hệ thống hiện đã nộp và mỗi nhiệm vụ chỉ được nộp một lần. Dùng sơ đồ `SurveyTask` và `SurveyResponse` để giải thích ẩn danh. |
| 3:20–4:40 | Mở một đợt đã đóng hoặc đã công bố. Trình bày tổng hợp, kiểm duyệt góp ý và ngưỡng bằng màn hình của ĐBCL. Dùng `DEMO-GV00001` mở lớp được phân công. Mở ảnh giải trình đã được trưởng bộ môn xác nhận. | Phiếu chưa duyệt chặn công bố. Dùng số liệu đang hiện trên màn hình. Trạng thái lớp ít mẫu bị che. Giảng viên giải trình và trưởng bộ môn xác nhận theo phạm vi. |
| 4:40–5:55 | Mở một phản hồi giảng dạy ẩn danh đã được xử lý. Chỉ trạng thái tiếp nhận, xử lý, trả lời và đánh giá. Sau đó mở hàng đợi Khảo thí và hồ sơ Thanh tra giả. | Phản hồi thi đi đến Khảo thí. Phản hồi nghiêm trọng vào Thanh tra theo mức hiển thị danh tính và kiểm tra xung đột. Thanh tra dùng phần mềm để quản lý hồ sơ. Phúc khảo theo quy trình riêng. |
| 5:55–7:05 | Dùng `LD2026001` chọn đợt trong **Báo cáo**, bấm **Xem báo cáo**, tải CSV rồi chỉ đầu tệp. Nêu màn hình tương ứng của ĐBCL, Trưởng khoa và ADMIN bằng sơ đồ vai trò hoặc ảnh. | Tệp khớp bộ lọc. ADMIN vận hành tài khoản, quyền và cấu hình. Phạm vi dữ liệu của từng vai trò có thể đối chiếu trong hướng dẫn. |
| 7:05–8:15 | Mở slide kiểm thử. Giải thích 200/200 lượt nộp thành công, p95 3.595,91 ms so với mục tiêu 3.000 ms, và thử 20 yêu cầu đồng thời trên cùng nhiệm vụ. Trình bày chứng cứ khôi phục và tải tệp. | Đọc đúng mẫu số và điều kiện đo. Mức p95 còn thiếu mục tiêu. Thử khôi phục đối chiếu 46 bảng, 811 dòng và 1 tệp, sau đó tải đúng nội dung qua website thử. |
| 8:15–9:15 | Kết luận phạm vi hoàn thành và việc còn lại. Mở bản báo cáo hoặc thẻ phát hành nếu hội đồng muốn xem mã. | 79/84 FR, 213/219 điểm có trọng số. Nêu FR-145 và nhóm P2 còn mở. Ẩn danh ở mức ứng dụng. Mỗi thành viên nêu phần mình đã thực hiện dựa vào chứng cứ nhóm tự điền. |

## Khi demo bị gián đoạn

- Nếu môi trường chưa lên hoặc màn hình chờ quá lâu, chuyển sang video 33 giây và nói rõ đó là bản quay trước trên dữ liệu giả.
- Nếu trạng thái đợt thay đổi sau buổi tập, chuyển sang đợt mẫu đã chuẩn bị hoặc ảnh có mốc ngày rõ ràng. Giữ nguyên kỳ vọng nghiệp vụ trong lời dẫn.
- Khi cần chứng minh toàn bộ UC-GOLD, mở hồ sơ nghiệm thu. Kịch bản ngắn dùng các điểm dừng để giải thích, còn lượt kiểm kỹ thuật đi qua trọn chuỗi.

[Sơ đồ ca sử dụng](SO_DO_CA_SU_DUNG_TUAN_15.md) · [Câu hỏi phản biện](CAU_HOI_PHAN_BIEN_TUAN_15.md) · [Kết quả hiệu năng](HIEU_NANG_TUAN_13.md)
