# Công thức tổng hợp khảo sát — Tuần 9

Ngày viết: **30/10/2026 (Asia/Saigon)**. Tài liệu diễn giải Mục 5.7, BR-07/11/12/57; không thay đặc tả nguồn. Mã tính thuần nằm trong `src/server/services/survey-score.ts`, dịch vụ ghi kết quả trong `survey-results-mutations.ts`. Bằng chứng nghiệm thu cuối xem [Tuần 9](NGHIEM_THU_TUAN_09.md).

## 1. Các đại lượng

| Đại lượng | Cách tính | Trường hợp không có giá trị |
| --- | --- | --- |
| Điểm câu Likert | Tổng giá trị hợp lệ / số giá trị hợp lệ | `null`; loại khỏi mẫu số trọng số nhóm |
| Điểm nhóm | Σ(trọng số câu × điểm câu) / Σ(trọng số các câu có điểm) | `null`; loại khỏi mẫu số trọng số tổng |
| Điểm tổng | Σ(trọng số nhóm × điểm nhóm) / Σ(trọng số các nhóm có điểm) | `null`, không biến thành 0 hoặc mức Kém |
| Tỉ lệ tham gia | Số nhiệm vụ `DONE` / tổng số nhiệm vụ đã chốt của lớp | 0 khi không có nhiệm vụ |
| Đủ mẫu công bố lớp | Số phiếu ≥ `minResponses` **và** tỉ lệ tham gia ≥ `minRate` | Hiện “Chưa đủ mẫu để công bố”, không trả điểm/tự luận của lớp |

“Không áp dụng” và bỏ trống không được cộng vào số giá trị hợp lệ. Câu chọn một/chọn nhiều/Có–Không được thống kê theo phân bố, tự luận theo số lượng và luồng kiểm duyệt; chúng không có quy tắc đổi thành điểm số trong đặc tả nên không tham gia điểm nhóm/tổng. Likert 1–4 giữ nguyên giá trị gốc; không tự chuẩn hóa lên thang 5.

Các phép chia, nhân trọng số và so sánh ngưỡng dùng phân số nguyên lớn. Chỉ chuyển sang số đã làm tròn ở đầu ra hoặc lưu kết quả cuối. Ngưỡng số phiếu và tỉ lệ dùng giá trị chính xác: 12.000/40.001 hiển thị 30,00% nhưng vẫn thấp hơn ngưỡng 30%.

## 2. Ví dụ tính tay TC-AGG-01

| Nhóm | Trọng số nhóm | Câu | Trọng số câu | Giá trị | Điểm câu |
| --- | --- | --- | --- | --- | --- |
| A | 2 | Q1 | 1 | 5, 4, 4, 5 | 18/4 = 4,50 |
| A | 2 | Q2 | 2 | 3, 4, 5, Không áp dụng | 12/3 = 4,00 |
| B | 1 | Q3 | 1 | 4, 4, 4, 4 | 16/4 = 4,00 |

Nhóm A = (1 × 4,5 + 2 × 4) / (1 + 2) = 12,5/3 = 25/6. Hiển thị **4,17**.

Nhóm B = 4. Hiển thị **4,00**.

Điểm tổng = (2 × 25/6 + 1 × 4) / 3 = 37/9. Hiển thị **4,11**, mức mặc định **Tốt**. Không lấy 4,17 đã làm tròn để tính tiếp.

Với 10 nhiệm vụ, 4 `DONE`, tỉ lệ tham gia = 4/10 = **40%**. Nếu ngưỡng là 4 phiếu và 40% thì vừa đủ; nếu ngưỡng mặc định là 5 phiếu và 30% thì thiếu số phiếu, dù điểm tổng vẫn tính được nội bộ.

## 3. Gộp bộ môn, khoa và so sánh

Không lấy trung bình các điểm lớp. Ví dụ một lớp có 1 phiếu điểm 5 và lớp khác có 9 phiếu điểm 1: kết quả gộp câu = (1 × 5 + 9 × 1) / 10 = **1,40**, không phải (5 + 1) / 2 = 3,00.

Ảnh chụp tổng hợp lưu số hợp lệ/NA/trống, tổng giá trị Likert, phân bố lựa chọn, mẫu/trọng số và số nhiệm vụ/phiếu. Gộp các số liệu gốc rồi tính lại công thức. Câu chọn nhiều vẫn giữ số người trả lời câu riêng với số lượt chọn; tổng lượt chọn có thể lớn hơn số phiếu.

Chỉ gộp dữ liệu tương thích cùng phiên bản mẫu. Không có quy tắc ánh xạ giữa hai phiên bản hoặc hai thang đo khác nhau; khi thiếu dữ liệu tương thích, giao diện ghi **“Không có dữ liệu tương thích”**. So sánh kỳ trước dùng kỳ trước thực tế có dữ liệu phù hợp, không lấy một đợt bất kỳ làm kỳ trước.

Nếu cùng phiên bản mẫu nhưng các đợt đã chụp cấu hình xếp mức khác nhau, điểm gộp vẫn tính được từ số liệu gốc. Khi đó không gán một mức chung (`rating: null`), tránh chọn tùy ý cấu hình của đợt đứng trước theo UUID. Đây là khác biệt về nhãn xếp mức, không phải dữ liệu câu hỏi không tương thích.

## 4. Xếp mức và cấu hình

| Ngưỡng mặc định | Mức |
| --- | --- |
| ≥ 4,5 | Rất tốt |
| ≥ 4,0 | Tốt |
| ≥ 3,0 | Đạt |
| ≥ 2,0 | Cần cải thiện |
| Còn lại | Kém |

Xếp mức dùng điểm trước làm tròn. Ví dụ 4,499 hiển thị 4,50 nhưng vẫn thuộc **Tốt**. ADMIN đã xác thực hai bước có thể đổi dãy ngưỡng giảm dần, nhãn và danh sách từ khóa kiểm duyệt; thay đổi có kiểm phiên mới, CAS và audit. Ngưỡng xếp mức được chụp khi tổng hợp để giải thích kết quả lịch sử; thay cấu hình không tự viết lại bản tổng hợp cũ.

## 5. Khảo thí và giới hạn riêng tư

Khảo thí chỉ đọc sau công bố/lưu trữ, chỉ nhóm `isAssessmentGroup`, gộp theo môn/bộ môn/khoa. Tập gộp phải đến từ ít nhất **hai giảng viên khác nhau**, đủ số phiếu và tỉ lệ; thiếu điều kiện hiện **“Chưa đủ dữ liệu gộp”**. Dữ liệu trả về không chứa lớp, tên/mã giảng viên, nội dung tự luận, ID phiếu hay ID đáp án. Danh sách giảng viên đóng góp được giữ trong ảnh chụp nội bộ để kiểm ngưỡng, không đưa vào DTO Khảo thí.

Kết quả lớp thiếu mẫu bị ẩn; vai trò có quyền có thể xem kết quả gộp đủ điều kiện ở đơn vị. Danh sách chưa hoàn thành là luồng trạng thái nhiệm vụ riêng, không ghép với câu trả lời. Các bảo vệ này giảm nguy cơ suy đoán; không chứng minh ẩn danh tuyệt đối trước DBA, binlog, log hạ tầng hoặc tự luận tự tiết lộ danh tính.
