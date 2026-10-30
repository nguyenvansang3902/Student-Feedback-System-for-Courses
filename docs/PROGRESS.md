# Tiến độ yêu cầu chức năng

Chỉnh câu chữ giao diện ngày 30/10/2026 theo yêu cầu người dùng: [chi tiết và ảnh](CHINH_SUA_GIAO_DIEN_2026_10_30.md). Không thêm FR hoặc điểm; giữ 117/219, 41/84 FR.

Nguồn: Mục7 đặc tả và [Điều chỉnh số01](BO_SUNG_01_TAC_NHAN.md). P0=3, P1=2, P2=1; chỉ tick khi có mã, test qua, nghiệm thu và tài liệu. Mẫu số gồm cả FR chưa xếp tuần.

**Mốc lịch sử trước điều chỉnh:** Tuần6 bắt đầu **22/10**, tiếp tục **28/10/2026**, sớm hơn mốc giả định **04–10/11**, theo yêu cầu người dùng. Thêm FR-30–35: **62/163=38,0%**, M4 **16/16=100%**; M3 vẫn9/9 và M11 vẫn6/11. Tỷ lệ này tính chức năng đã chạy, không tính độ lớn thiết kế. Tuần5 giữ bằng chứng lịch sử46/163.

Người dùng đã cho phép seed khảo sát/phản hồi trước lịch. Ngoại lệ chỉ tạo dữ liệu giả; các FR đợt khảo sát, nộp phiếu, kết quả, xử lý phản hồi vẫn chưa hoàn thành. Runtime31/blueprint39, không reset dữ liệu cũ. [CI mã Tuần6 40633183047](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40633183047) của mã `68087ed7ecc68028ac78475696f4ee69a5d2e056` đã qua `check` và `smoke`; CI main/tài liệu cuối đối chiếu đúng SHA trong Actions.

Bằng chứng: [nghiệm thu Tuần6](NGHIEM_THU_TUAN_06.md), [báo cáo](bao-cao-tien-do/tuan-06.md), [QA](QA_GIAO_DIEN_TUAN_06.md), [sơ đồ](SO_DO_TUAN_06.md), [truy vết](TRUY_VET.md). Full279/279, HTTP20/20, seed11/11, QA14nhóm/10viewport; preview không ghi phiếu. Lịch sử Tuần1–5 giữ kết quả tại thời điểm nghiệm thu; health vẫn database:not_checked. Workflow duyệt đợt tự khóa mẫu chờ Tuần7.

**Nghiệm thu G1 ngày 29/10/2026:** thêm FR-140/141/148 (9 điểm), tổng **71/219 = 32,4%**, 25/84 FR đã xong. Điều chỉnh thêm 21 FR (56 điểm) nên tỷ lệ dùng mẫu số mới; 62/163 phía trên là lịch sử. [CI 40750644805](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40750644805) đúng mã `023b619` đã qua check/smoke; check cục bộ 346/346, build và các bộ HTTP/MySQL/UI qua. [Báo cáo G1](NGHIEM_THU_BO_SUNG_01.md). FR-160/TC-ALL-01 chỉ hoàn thành phần chức năng hiện có, chưa tick toàn bộ; mốc tính kế hoạch của FR-160 là nghiệm thu đầy đủ Tuần 13.

## M1 Xác thực và phiên

- [x] FR-01 [P0] đăng nhập bằng mã định danh (mã SV/GV) hoặc email (Tuần 3)
- [x] FR-02 [P0] phiên JWT, đăng xuất, thu hồi (Tuần 3)
- [x] FR-03 [P0] đổi mật khẩu (Tuần 3)
- [x] FR-04 [P1] quên/đặt lại mật khẩu qua email (token dùng một lần, hết hạn 30 phút) (Tuần 3)
- [x] FR-05 [P0] kích hoạt tài khoản lần đầu hoặc mật khẩu tạm buộc đổi (Tuần 3)
- [x] FR-06 [P0] giới hạn tần suất và khóa tạm (Tuần 3)
- [x] FR-07 [P0] xác thực hai bước TOTP cho ADMIN (đăng ký bằng mã QR, xác nhận, mã khôi phục, đặt lại) (Tuần 4)
- [x] FR-08 [P1] bật 2FA bắt buộc cho các vai trò khác theo cấu hình (Tuần 4)
- [ ] FR-09 [P2] xem và đăng xuất các thiết bị (Chưa xếp tuần; P2 tùy chọn)

## M2 Người dùng, phân quyền, kiểm toán

- [x] FR-10 [P0] quản lý người dùng (tạo, khóa/mở khóa, gán vai trò và phạm vi) (Tuần 4)
- [x] FR-11 [P0] policy tập trung theo vai trò + phạm vi (Tuần 4)
- [x] FR-12 [P0] xem và lọc nhật ký kiểm toán (Tuần 4)

## M3 Danh mục và nhập liệu

- [x] FR-20 [P0] CRUD dữ liệu đào tạo do PHONG_DAO_TAO; khoa/bộ môn do ADMIN; học kỳ có khóa sổ (Tuần 5)
- [x] FR-21 [P0] PHONG_DAO_TAO import Excel/CSV (sinh viên, giảng viên, lớp học phần, đăng ký), chạy thử trước khi ghi và lỗi từng dòng (Tuần 5)
- [x] FR-22 [P0] PHONG_DAO_TAO tải mẫu file import (Tuần 5)

## M4 Mẫu phiếu

- [x] FR-30 [P0] trình soạn mẫu (nhóm tiêu chí, câu hỏi, thứ tự) (Tuần 6)
- [x] FR-31 [P0] các loại câu hỏi, bắt buộc, "Không áp dụng", trọng số (Tuần 6)
- [x] FR-32 [P0] phiên bản và khóa (Tuần 6)
- [x] FR-33 [P0] xem trước (Tuần 6)
- [x] FR-34 [P1] nhân bản mẫu (Tuần 6)
- [x] FR-35 [P1] mẫu mặc định có sẵn (Tuần 6)

## M5 Đợt khảo sát

- [x] FR-40 [P0] tạo/sửa đợt (Tuần 7)
- [x] FR-41 [P0] phạm vi (toàn trường/khoa/bộ môn/danh sách lớp) (Tuần 7)
- [x] FR-42 [P0] trình duyệt, duyệt, từ chối (Tuần 7)
- [x] FR-43 [P0] chốt danh sách và sinh nhiệm vụ khi mở (Tuần 7)
- [x] FR-44 [P0] tự động mở/đóng (idempotent) (Tuần 7)
- [x] FR-45 [P1] gia hạn, đóng sớm, hủy (Tuần 7)
- [x] FR-46 [P0] theo dõi tiến độ và tỉ lệ tham gia (Tuần 7)
- [ ] FR-47 [P1] nhắc sinh viên chưa hoàn thành (Tuần 9)

## M6 Làm khảo sát

- [x] FR-50 [P0] danh sách khảo sát của sinh viên (hạn chót, trạng thái) (Tuần 8)
- [x] FR-51 [P0] form động, thanh tiến trình, kiểm tra hợp lệ (Tuần 8)
- [x] FR-52 [P1] nháp phía trình duyệt (Tuần 8)
- [x] FR-53 [P0] nộp ẩn danh một lần (Tuần 8)
- [x] FR-54 [P0] màn hình xác nhận đã nộp (Tuần 8)

## M7 Kết quả

- [ ] FR-60 [P0] tổng hợp (Tuần 9)
- [ ] FR-61 [P0] ngưỡng công bố (Tuần 9)
- [ ] FR-62 [P0] công bố (Tuần 9)
- [ ] FR-63 [P0] trang kết quả theo vai trò và phạm vi (Tuần 9)
- [ ] FR-64 [P1] so sánh với bộ môn/khoa/kỳ trước (Tuần 9)
- [ ] FR-65 [P1] kiểm duyệt góp ý tự luận (Tuần 9)
- [ ] FR-66 [P1] giải trình và xác nhận (Tuần 11)

## M8 Phản hồi

- [ ] FR-70 [P0] gửi phản hồi (loại, mức độ, ẩn danh, đính kèm) (Tuần 10)
- [ ] FR-71 [P0] định tuyến và hàng đợi xử lý (Tuần 10)
- [ ] FR-72 [P0] trạng thái và lịch sử (Tuần 10)
- [ ] FR-73 [P0] trao đổi qua lại (Tuần 10)
- [ ] FR-74 [P1] SLA, quá hạn, leo thang (Tuần 11)
- [ ] FR-75 [P1] đánh giá hài lòng và mở lại (Tuần 11)
- [ ] FR-76 [P0] chuyển tiếp/từ chối có lý do (Tuần 10)

## M9 Thông báo

- [ ] FR-80 [P0] thông báo trong ứng dụng (Tuần 11)
- [ ] FR-81 [P1] email (Mailpit khi phát triển, SMTP khi triển khai) (Tuần 11)
- [ ] FR-82 [P1] nhắc hạn (Tuần 11)

## M10 Báo cáo

- [ ] FR-90 [P0] dashboard theo vai trò (Tuần 12)
- [ ] FR-91 [P1] biểu đồ (Tuần 12)
- [ ] FR-92 [P0] xuất Excel/CSV (Tuần 12)
- [ ] FR-93 [P1] xuất PDF (Tuần 12)
- [ ] FR-94 [P1] báo cáo xử lý phản hồi (số lượng, thời gian xử lý, quá hạn, hài lòng) (Tuần 12)

## M11 Hệ thống

- [x] FR-100 [P0] cấu hình ngưỡng (Tuần 7)
- [x] FR-101 [P0] dữ liệu demo (seed) (Tuần 5)
- [x] FR-102 [P0] health check (Tuần 1)
- [ ] FR-103 [P1] script sao lưu/khôi phục (Tuần 14)

## M12 Mở rộng

- [ ] FR-110 [P2] gợi ý chủ đề/cảm xúc cho góp ý tự luận bằng AI (tắt mặc định, ẩn danh hóa trước khi gửi, cần người dùng đồng ý) (Chưa xếp tuần; P2 tùy chọn)
- [ ] FR-111 [P2] API trạng thái hoàn thành (Chưa xếp tuần; P2 tùy chọn)
- [ ] FR-112 [P2] đánh giá riêng từng giảng viên (Chưa xếp tuần; P2 tùy chọn)

## M13 Phòng Đào tạo

- [x] FR-140 [P0] đổi quyền CRUD dữ liệu đào tạo và import sang PHONG_DAO_TAO; khoa/bộ môn do ADMIN — việc bù G1 (Tuần 6)
- [x] FR-141 [P0] PĐT khóa/mở khóa học kỳ, mở khóa có lý do, audit và thông báo ĐBCL — việc bù G1 (Tuần 6)
- [x] FR-142 [P0] kiểm tra sẵn sàng của đợt theo RS-01–RS-06 (Tuần 7)
- [x] FR-143 [P0] PĐT xác nhận hoặc trả về dữ liệu đối tượng khảo sát (Tuần 7)
- [x] FR-144 [P0] cảnh báo lệch dữ liệu khi mở đợt, chốt theo dữ liệu hiện tại (Tuần 7)
- [ ] FR-145 [P1] lô nhập ImportBatch và hoàn tác khi chưa bị đợt chốt dùng — tùy thời gian, không tự cắt (Tuần 7)
- [ ] FR-146 [P0] hàng đợi phản hồi TO_CHUC_LOP_HOC của PĐT (Tuần 10)
- [ ] FR-147 [P1] dashboard PĐT: độ sẵn sàng, lớp lỗi, phản hồi đang chờ (Tuần 12)

## M14 Phòng Khảo thí

- [x] FR-148 [P0] cờ isAssessmentGroup trong trình soạn/xem trước và một nhóm mặc định Kiểm tra, đánh giá — việc bù G1 (Tuần 6)
- [ ] FR-149 [P0] hàng đợi THI_KET_THUC_HOC_PHAN và lời nhắc không thay phúc khảo (Tuần 10)
- [ ] FR-150 [P0] Khảo thí xem điểm nhóm kiểm tra–đánh giá gộp theo BR-57 (Tuần 9)
- [ ] FR-151 [P1] thống kê phản hồi thi không định danh, có ngưỡng (Tuần 12)
- [ ] FR-152 [P1] kiến nghị rà soát của Khảo thí và phản hồi trưởng bộ môn (Tuần 11)

## M15 Phòng Thanh tra

- [ ] FR-153 [P0] gửi KHIEU_NAI_NGHIEM_TRONG với cảnh báo, loại vi phạm và mức độ danh tính (Tuần 10)
- [ ] FR-154 [P0] hồ sơ Thanh tra và máy trạng thái tiếp nhận/xác minh/kết luận/thông báo/đóng — khởi tạo TIEP_NHAN ở Tuần 10 (Tuần 11)
- [ ] FR-155 [P0] loại người xung đột lợi ích khỏi hàng đợi, quyền xem và giao hồ sơ (Tuần 10)
- [ ] FR-156 [P0] kết luận hồ sơ Thanh tra và thông báo đúng mức tiết lộ (Tuần 11)
- [ ] FR-157 [P1] chuyển hồ sơ một chiều từ vai trò được phép sang Thanh tra (Tuần 11)
- [ ] FR-158 [P1] cảnh báo bất thường khảo sát và màn hình xem xét chỉ số (Tuần 12)
- [ ] FR-159 [P1] thống kê Thanh tra không định danh, có ngưỡng (Tuần 12)

## M16 Ma trận quyền mở rộng

- [ ] FR-160 [P0] ma trận quyền 10 vai trò và IDOR; G1 chỉ phần chức năng hiện có — hoàn thiện toàn bộ TC-ALL-01 ở Tuần 13 (Tuần 13)

## Theo dõi BR bổ sung (không cộng vào mẫu số FR)

| BR | Ưu tiên | Tuần/phạm vi dự kiến | Trạng thái tại lúc cập nhật tài liệu |
| --- | --- | --- | --- |
| BR-50 | P0 | G1/Tuần6 | Đạt G1: policy/service/API/UI và TC-PDT-01 đã qua |
| BR-51 | P0 | G1/Tuần6 | Đạt G1: lý do/CAS/audit/thư Mailpit thật; SMTP lỗi có trạng thái rõ |
| BR-52 | P0 | Tuần7 | Đạt: RS-01–06, snapshot, ghi chú cảnh báo và trả về có lý do; TC-PDT-02 qua unit/HTTP/UI |
| BR-53 | P0 | Tuần7 | Đạt: drift vẫn chốt hiện tại, audit/queue PĐT-ĐBCL, sau mở task bất biến; TC-PDT-03 qua |
| BR-54 | P0 | Tuần10–11 | Chưa nhận nghiệm thu mới; đối chiếu TRUY_VET và kết quả chạy thật |
| BR-55 | P1 | Tuần7 (P1) | Chưa nhận nghiệm thu mới; đối chiếu TRUY_VET và kết quả chạy thật |
| BR-56 | P0 | Tuần10–11 | Chưa nhận nghiệm thu mới; đối chiếu TRUY_VET và kết quả chạy thật |
| BR-57 | P0 | Cờ G1/Tuần6; quyền xem gộp Tuần9 | Cờ nhóm/default đạt G1; kết quả gộp và TC-KT-01 chờ Tuần9 |
| BR-58 | P1 | Tuần11 | Chưa nhận nghiệm thu mới; đối chiếu TRUY_VET và kết quả chạy thật |
| BR-59 | P1 | Tuần12 | Chưa nhận nghiệm thu mới; đối chiếu TRUY_VET và kết quả chạy thật |
| BR-60 | P0 | Tuần11 | Chưa nhận nghiệm thu mới; đối chiếu TRUY_VET và kết quả chạy thật |
| BR-61 | P0 | Tuần10–13 | Chưa nhận nghiệm thu mới; đối chiếu TRUY_VET và kết quả chạy thật |
| BR-62 | P0 | Tuần10–13 | Chưa nhận nghiệm thu mới; đối chiếu TRUY_VET và kết quả chạy thật |
| BR-63 | P0 | Tuần10–13 | Chưa nhận nghiệm thu mới; đối chiếu TRUY_VET và kết quả chạy thật |
| BR-64 | P1 | Tuần11 | Chưa nhận nghiệm thu mới; đối chiếu TRUY_VET và kết quả chạy thật |
| BR-65 | P1 | Tuần12 | Chưa nhận nghiệm thu mới; đối chiếu TRUY_VET và kết quả chạy thật |
| BR-66 | P1 | Tuần12 | Chưa nhận nghiệm thu mới; đối chiếu TRUY_VET và kết quả chạy thật |
| BR-67 | P0 | Theo luồng; kiểm đầy đủ Tuần13 | Chưa nhận nghiệm thu mới; đối chiếu TRUY_VET và kết quả chạy thật |
| BR-68 | P0 | G1 từ chối mặc định; kiểm đủ luồng Tuần13 | G1 giữ deny default/ADMIN không có quyền ngầm; kiểm module tương lai chờ Tuần13 |

## Nghiệm thu phần chính Tuần 7 — 29/10/2026

FR-40–46, FR-100 và FR-142–144 đã qua check572/572 (32file), build, SQL16, HTTP19+13, seed14, UI11nhóm/26viewport/26PNG. [CI nguồn 39d5648](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40858131706) đã qua check/smoke đúng SHA. Thêm32điểm: **103/219=47,0%**,36/84FR. FR-145 P1 có điều kiện chưa thực hiện, giữ backlog và chưa được người dùng cắt; FR-160 còn chờ đủ phạm vi Tuần13. [Báo cáo Tuần7](bao-cao-tien-do/tuan-07.md).

## Nghiệm thu Tuần 8 — 30/10/2026

FR-50–54 đã qua check 646/646 trong 39 tệp, build Next 16.4.3, HTTP/MySQL 16/16 và UI 13 nhóm/17 trạng thái/34 viewport/34 PNG đã xem. Nguồn `6edad31fef16ee11f5ace82645107b0b7153742d` và [CI 40925339620](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40925339620) đã qua check/smoke đúng SHA; main/tài liệu cuối đối chiếu riêng. 20 POST đồng thời chỉ 1 thành công/19 bị 409, lỗi chèn đáp án rollback nguyên tử; fixture sạch và 27 tập main giữ hash. Chốt thêm 14 điểm: **117/219=53,4%, 41/84 FR**, M6=14/14. Kế hoạch lũy kế Tuần 8 là 119/219=54,3%; còn 2 điểm FR-145 P1 có điều kiện, chưa thực hiện hoặc được người dùng cắt. FR-160 vẫn chưa tick. Xem [nghiệm thu](NGHIEM_THU_TUAN_08.md), [báo cáo 10 mục](bao-cao-tien-do/tuan-08.md) và [QA](QA_GIAO_DIEN_TUAN_08.md). 5.6(d) kiểm DTO/log hiện có; chưa nhận export CSV/Excel/PDF kết quả ở Tuần 12 đã qua. Chưa bắt đầu Tuần 9.
