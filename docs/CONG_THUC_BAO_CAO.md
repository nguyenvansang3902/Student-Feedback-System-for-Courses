# Công thức báo cáo và cách ẩn ô nhỏ

Ngày đối chiếu: 03/11/2026. Áp dụng Tuần 12. Quyết định kiến trúc và quyền xem: [ADR-012](decisions/ADR-012-bao-cao-va-nguong-du-lieu.md).

## 1. Kết quả khảo sát

Điểm nhóm/tổng và tỷ lệ tham gia giữ [công thức tổng hợp đã có](CONG_THUC_TONG_HOP.md). Báo cáo gộp số đếm, phân bố và tổng giá trị gốc bằng `poolSurveyScores`, không lấy trung bình các điểm lớp. Dữ liệu khác mẫu hoặc thiếu ảnh chụp hợp lệ trả chưa đủ dữ liệu.

Ví dụ nhóm kiểm tra có 5 phiếu ở mức 5 và 10 phiếu ở mức 3: điểm gộp là `(5×5 + 10×3) / 15 = 3,666…`, hiển thị **3,67**. Không lấy `(5 + 3) / 2 = 4`. Hai giảng viên phải có ít nhất một giá trị LIKERT hợp lệ trong nhóm có cờ kiểm tra, đánh giá. Giảng viên chỉ có phiếu NA không được tính là người đóng góp điểm cho ngưỡng hai giảng viên.

Lớp thiếu ngưỡng số phiếu/tỷ lệ tham gia bị ẩn. Bộ môn chứa một lớp bị ẩn cũng bị ẩn, khoa chứa một bộ môn bị ẩn cũng bị ẩn. Với Khảo thí, nhóm lá là môn học, không phải lớp: môn không đủ hai giảng viên hoặc thiếu mẫu bị ẩn, kéo theo tổng bộ môn/khoa. Ví dụ lớp A có 5 phiếu mức 5, B có 1 phiếu mức 1: không trả tổng bộ môn 6 phiếu/điểm 4,33 cùng với A, vì phép trừ có thể suy ra B.

## 2. Xử lý phản hồi

Nhóm cố định theo học kỳ, môn học và loại phản hồi. Phòng Đào tạo chỉ dùng `TO_CHUC_LOP_HOC`; Khảo thí chỉ dùng `THI_KET_THUC_HOC_PHAN`. Phản hồi đang thuộc hồ sơ Thanh tra không vào thống kê thường. Giảng viên chỉ có phản hồi được nhận trong lớp đang phân công; trưởng đơn vị và vai trò giám sát gộp theo quyền/phạm vi báo cáo của mình.

| Chỉ số | Công thức hoặc điều kiện |
| --- | --- |
| Số phản hồi | Số bản ghi trong nhóm đã lọc quyền |
| Đang xử lý | `MOI`, `DA_TIEP_NHAN`, `DANG_XU_LY` |
| Đã trả lời | `DA_TRA_LOI` |
| Đã đóng | `DA_DONG` |
| Từ chối | `TU_CHOI` |
| Đang quá hạn | Còn đang xử lý và đã qua hạn trả lời; hoặc còn `MOI` và đã qua hạn tiếp nhận |
| Tỷ lệ đang quá hạn | Số đang quá hạn / số đang xử lý |
| Trả lời trễ gần nhất | Có `answeredAt > replyDueAt` ở chu kỳ hiện tại/gần nhất còn được lưu |
| Tỷ lệ trả lời trễ | Số trả lời trễ gần nhất / số bản ghi có `answeredAt` |
| Xử lý trung bình | Trung bình `(closedAt − createdAt) / 86.400.000` của các phản hồi `DA_DONG` có mốc hợp lệ |
| Hài lòng trung bình | Trung bình các đánh giá 1–5 thực sự đã được lưu |

Ví dụ 10 phản hồi đang xử lý, trong đó 5 quá hạn, cùng 10 phản hồi đã có mốc trả lời, trong đó 5 trả lời trễ: hai tỷ lệ là **50%**. Không dùng tổng 20 phản hồi làm mẫu số cho tỷ lệ đang quá hạn. Số ngày giữ hai chữ số thập phân ở đầu ra; tỷ lệ trong DTO là số từ 0 đến 1 để renderer định dạng phần trăm.

## 3. Hồ sơ Thanh tra

Loại trừ hồ sơ xung đột trước khi nhóm theo học kỳ/loại vi phạm hoặc nguồn hồ sơ. Không trả ID hồ sơ, lớp, người gửi, nội dung, ghi chú, tệp nội bộ hoặc lý do kết luận trong thống kê.

| Chỉ số | Công thức hoặc điều kiện |
| --- | --- |
| Số theo trạng thái/loại kết luận | Số hồ sơ thuộc trạng thái/loại tương ứng |
| Đang mở | Không thuộc `DONG`, `TU_CHOI`, `CHUYEN_LAI` |
| Đang quá hạn | Đang mở và chưa tiếp nhận mà đã qua `acceptDueAt`, hoặc đã qua `completeDueAt` |
| Tỷ lệ đang quá hạn | Số đang quá hạn / số đang mở |
| Hoàn tất trễ | Thuộc `DONG`, có `closedAt > completeDueAt` |
| Tỷ lệ hoàn tất trễ | Số hoàn tất trễ / số hồ sơ `DONG` có mốc đóng |
| Xử lý trung bình | Trung bình ngày lịch từ tạo đến đóng của các hồ sơ `DONG` có thời gian không âm |

Số liệu quá khứ so sánh trực tiếp các mốc đã lưu, không đọc cờ quá hạn hiện tại. Không có mẫu số hoặc mẫu số chưa đạt ngưỡng thì tỷ lệ là `null`.

## 4. Quy tắc ngưỡng và tổng

Hai ngưỡng báo cáo mặc định là 5 bản ghi phản hồi và 5 hồ sơ Thanh tra, cấu hình riêng với ngưỡng công bố của đợt. Ngưỡng cho phép từ 2 đến 1000. Quy tắc được áp dụng trước khi trả DTO cho dashboard, biểu đồ hoặc renderer xuất file.

1. Tổng số nhóm dưới ngưỡng: mọi ô số của hàng là `null`, `suppressed = true`.
2. Một ô trạng thái/quá hạn/kết luận có số dương dưới ngưỡng: cả hàng bị ẩn, gồm tổng, để tránh suy ra ô bằng phép trừ. Số 0 không tự tạo ô nhỏ.
3. Thời gian trung bình chỉ hiện khi có đủ số mốc đóng hợp lệ; hài lòng chỉ hiện khi có đủ số đánh giá. Không lấy tổng phản hồi làm số mẫu cho hai trung bình này.
4. Tỷ lệ chỉ hiện khi chính mẫu số đạt ngưỡng. Mẫu số 0 trả `null`, không chia cho 0 và không coi là 0%.
5. Tổng học kỳ bị ẩn khi một nhóm lá bị ẩn. Nếu một trung bình/tỷ lệ của nhóm lá bị ẩn, chỉ số tương ứng ở tổng cũng bị ẩn.
6. Số liệu chỉ ở dạng `null` đi qua biểu đồ; giao diện không tự thay bằng 0 hoặc gộp lại từ các ô đã ẩn.

Ví dụ một môn có 5 phản hồi đã đóng và chỉ 1 đánh giá hài lòng: có thể hiện số phản hồi và thời gian đóng nếu đủ mốc; hài lòng trung bình vẫn bị ẩn. Một nhóm có 5 phản hồi đang xử lý và 1 phản hồi đã đóng thì cả hàng bị ẩn, vì `6 − 5` sẽ làm lộ ô có 1 người.

## 5. Giới hạn số liệu

Thời gian xử lý trong báo cáo là ngày lịch, khác hạn SLA ngày làm việc. Sau mở lại, thời điểm trả lời/hạn hiện tại có thể thay thế chu kỳ trước; báo cáo không khẳng định đã phục dựng mọi lần trễ trong lịch sử. Bộ lọc đợt đối với phản hồi liên tục chọn học kỳ tương ứng, không nối phản hồi với người nộp phiếu khảo sát.

Số lớp/lỗi/cảnh báo ở dashboard Phòng Đào tạo là thông tin vận hành danh mục và độ sẵn sàng, không phải số phiếu hoặc danh tính sinh viên. Báo cáo không xuất roster hay danh sách sinh viên chưa hoàn thành. Cảnh báo bất thường khảo sát được trình bày ở luồng riêng dưới quyền Thanh tra; không trộn điểm tuyệt đối vào thống kê Thanh tra.

Kết quả chạy thật và giới hạn kiểm tra UI/file xuất được ghi trong nghiệm thu Tuần 12. Các ví dụ trên là phép tính kỳ vọng để đối chiếu, không phải số liệu của một trường thực tế.
