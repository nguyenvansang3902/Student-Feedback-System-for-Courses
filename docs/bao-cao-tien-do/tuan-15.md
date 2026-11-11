# Báo cáo tiến độ Tuần 15

Đề tài xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học. Tiểu luận chuyên ngành HK1 2026–2027. Nhóm và GVHD do sinh viên điền. Thực hiện ngày **11/11/2026**.

## 1. Mục tiêu

Hoàn thiện tài liệu bảo vệ, kiểm tra lại kịch bản UC-GOLD và chuẩn bị mốc mã nguồn phiên bản 1.0.

## 2. Kết quả đạt được

Đã tập hợp nội dung báo cáo sáu chương và phụ lục, slide bảo vệ, sơ đồ ca sử dụng cho mười tác nhân, kịch bản demo 9 phút 15 giây và 20 câu hỏi phản biện. Các phép kiểm được ghi theo môi trường và lượt chạy. [Hồ sơ nghiệm thu](../NGHIEM_THU_TUAN_15.md)

## 3. Đối chiếu kế hoạch

| Công việc | Kết quả |
| --- | --- |
| Báo cáo, slide và câu hỏi | Có bản kỹ thuật để nhóm rà và bổ sung thông tin học vụ. |
| Kịch bản 7–10 phút | Bản tập dự kiến 9 phút 15 giây. Có hướng dẫn mở các trạng thái và phương án dự phòng. |
| Kiểm tra UC-GOLD | Playwright qua 6/6 ca ngày 11/11. Lượt kiểm tay trọn luồng của Tuần 13 được dẫn riêng. |
| Mốc mã nguồn | Phiên bản gói 1.0.0. Mốc Git v1.0 dùng cho bản bảo vệ. |
| Nghiệm thu cá nhân | Thành viên tự trình bày và ghi đóng góp. |

## 4. Tiến độ lũy kế

**213/219 điểm (97,3%), 79/84 FR** theo `npm run progress`. Mốc kế hoạch lũy kế là 215/219. Chênh 2 điểm thuộc FR-145. [Ma trận FR](../PROGRESS.md)

## 5. Khó khăn và giới hạn

Thời gian mở, đóng đợt và leo thang SLA dài hơn thời lượng trình bày. Kịch bản 9 phút 15 giây dùng các trạng thái đã chuẩn bị và chỉ rõ đâu là cảnh thao tác trực tiếp. p95 3.595,91 ms ở lượt đo 200 nhiệm vụ còn cao hơn mục tiêu 3.000 ms. Ẩn danh áp dụng ở tầng ứng dụng.

## 6. Việc sau Tuần 15

Nhóm điền thông tin học vụ, đọc lại báo cáo, tự tập trình bày và kiểm lại tài khoản, trạng thái dữ liệu trước buổi bảo vệ. Theo dõi FR còn mở và các giới hạn đo được trong hồ sơ.

## 7. Đóng góp từng thành viên

[SINH VIÊN TỰ ĐIỀN]

## 8. Kiểm tra nhanh cho giảng viên

1. Tải mã tại mốc `v1.0` và bật Docker Desktop.
2. Chạy `node scripts/start-demo-compose.mjs`. Đăng nhập bằng tài khoản mẫu trong README.
3. Mở nhiệm vụ còn hạn với tài khoản sinh viên và kết quả đã công bố với tài khoản giảng viên.
4. Dùng tài khoản Lãnh đạo lọc báo cáo và tải CSV. Đối chiếu dữ liệu trên màn hình và phạm vi trong đầu tệp.

## 9. Bản rút gọn để nộp tiến độ

Tuần 15, nhóm tập hợp báo cáo, slide, sơ đồ mười tác nhân, kịch bản demo 9 phút 15 giây và câu hỏi phản biện. Hồ sơ ghi bằng chứng chạy UC-GOLD, sao lưu khôi phục và kiểm thử phân quyền. Tiến độ theo ma trận đạt 79/84 yêu cầu, tương ứng 213/219 điểm có trọng số. Bản bảo vệ ghi rõ p95 của lượt đo còn cao hơn mục tiêu và giới hạn ẩn danh ở tầng ứng dụng. Thông tin đóng góp và kết quả tập bảo vệ do các thành viên xác nhận.

## 10. Điều chỉnh so với kế hoạch

Ngày và tên người yêu cầu do sinh viên điền theo thực tế. Phạm vi trình bày bao gồm ba tác nhân bổ sung theo Điều chỉnh số 01. Báo cáo nêu giới hạn của Thanh tra, Khảo thí và cơ chế ẩn danh.
