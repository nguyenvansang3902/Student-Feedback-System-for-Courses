# Tiến độ yêu cầu chức năng

**Đã nghiệm thu Tuần 12–13 ngày 05/11/2026: 211/219 = 96,3%, 78/84 FR.** Tuần 12 chốt FR-90/91/92/93/94/147/151/158/159, thêm 20 điểm; Tuần 13 chốt FR-160, thêm 3 điểm. Kế hoạch lũy kế Tuần 13 là 213/219; chênh 2 điểm FR-145 giữ backlog, không tự cắt.

[CI 41904262769](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41904262769) của nguồn `831d14decd9d6a562a1f9ecc0a53f6a4fadc8248` đã qua check/e2e/smoke. [Check/build sau sửa harness](assets/tuan-13/check-build-after-calendar.json):2.155 passed+1 symlinkskipped/2.156 trong 93 tệp; coverage 78,49/73,48/82,22/79,69%; buildID `Q1SY2ZcIAr3Do--HbL1SZ`. [UC-GOLD kiểm tay](assets/tuan-13/manual-uc-gold.json) đã đủ các bước,8 PNG đã xem; [haiCSV](assets/tuan-13/manual-export-verification.json) đúng vai trò/phạm vi.

Giữ p95 3.595,91 ms chưa đạt 3 giây, audit 24 moderate/tám production, axe 7 incomplete/168 node và giới hạn quét nguồn partial. HTTPproduction 7/7 trước đó là bằng chứng riêng; không chạy lại đúng build cuối không phải gate bổ sung để trì hoãn chốtFR. [Nghiệm thu](NGHIEM_THU_TUAN_13.md), [báo cáo 10 mục](bao-cao-tien-do/tuan-13.md).

Còn 6 FR chưa hoàn tất: FR-09/103/110/111/112/145. Không tự bắt đầuTuần 14/UI-n hoặc tự cắt backlog. Các checkbox dưới đây là trạng thái hiện tại; các đoạn mốc/ngày nghiệm thu cũ giữ bằng chứng lịch sử, không đổi số tại thời điểm cũ.

Mốc sửa câu chữ sau Tuần8, trước Tuần9 ngày 30/10/2026: [chi tiết và ảnh](CHINH_SUA_GIAO_DIEN_2026_10_30.md). Tại mốc đó không thêm FR hoặc điểm, giữ 117/219, 41/84 FR.

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
- [x] FR-47 [P1] nhắc sinh viên chưa hoàn thành (Tuần 9)

## M6 Làm khảo sát

- [x] FR-50 [P0] danh sách khảo sát của sinh viên (hạn chót, trạng thái) (Tuần 8)
- [x] FR-51 [P0] form động, thanh tiến trình, kiểm tra hợp lệ (Tuần 8)
- [x] FR-52 [P1] nháp phía trình duyệt (Tuần 8)
- [x] FR-53 [P0] nộp ẩn danh một lần (Tuần 8)
- [x] FR-54 [P0] màn hình xác nhận đã nộp (Tuần 8)

## M7 Kết quả

- [x] FR-60 [P0] tổng hợp (Tuần 9)
- [x] FR-61 [P0] ngưỡng công bố (Tuần 9)
- [x] FR-62 [P0] công bố (Tuần 9)
- [x] FR-63 [P0] trang kết quả theo vai trò và phạm vi (Tuần 9)
- [x] FR-64 [P1] so sánh với bộ môn/khoa/kỳ trước (Tuần 9)
- [x] FR-65 [P1] kiểm duyệt góp ý tự luận (Tuần 9)
- [x] FR-66 [P1] giải trình và xác nhận (Tuần 11)

## M8 Phản hồi

- [x] FR-70 [P0] gửi phản hồi (loại, mức độ, ẩn danh, đính kèm) (Tuần 10)
- [x] FR-71 [P0] định tuyến và hàng đợi xử lý (Tuần 10)
- [x] FR-72 [P0] trạng thái và lịch sử (Tuần 10)
- [x] FR-73 [P0] trao đổi qua lại (Tuần 10)
- [x] FR-74 [P1] SLA, quá hạn, leo thang (Tuần 11)
- [x] FR-75 [P1] đánh giá hài lòng và mở lại (Tuần 11)
- [x] FR-76 [P0] chuyển tiếp/từ chối có lý do (Tuần 10)

## M9 Thông báo

- [x] FR-80 [P0] thông báo trong ứng dụng (Tuần 11)
- [x] FR-81 [P1] email (Mailpit khi phát triển, SMTP khi triển khai) (Tuần 11)
- [x] FR-82 [P1] nhắc hạn (Tuần 11)

## M10 Báo cáo

- [x] FR-90 [P0] dashboard theo vai trò (Tuần 12)
- [x] FR-91 [P1] biểu đồ (Tuần 12)
- [x] FR-92 [P0] xuất Excel/CSV (Tuần 12)
- [x] FR-93 [P1] xuất PDF (Tuần 12)
- [x] FR-94 [P1] báo cáo xử lý phản hồi (số lượng, thời gian xử lý, quá hạn, hài lòng) (Tuần 12)

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
- [x] FR-146 [P0] hàng đợi phản hồi TO_CHUC_LOP_HOC của PĐT (Tuần 10)
- [x] FR-147 [P1] dashboard PĐT: độ sẵn sàng, lớp lỗi, phản hồi đang chờ (Tuần 12)

## M14 Phòng Khảo thí

- [x] FR-148 [P0] cờ isAssessmentGroup trong trình soạn/xem trước và một nhóm mặc định Kiểm tra, đánh giá — việc bù G1 (Tuần 6)
- [x] FR-149 [P0] hàng đợi THI_KET_THUC_HOC_PHAN và lời nhắc không thay phúc khảo (Tuần 10)
- [x] FR-150 [P0] Khảo thí xem điểm nhóm kiểm tra–đánh giá gộp theo BR-57 (Tuần 9)
- [x] FR-151 [P1] thống kê phản hồi thi không định danh, có ngưỡng (Tuần 12)
- [x] FR-152 [P1] kiến nghị rà soát của Khảo thí và phản hồi trưởng bộ môn (Tuần 11)

## M15 Phòng Thanh tra

- [x] FR-153 [P0] gửi KHIEU_NAI_NGHIEM_TRONG với cảnh báo, loại vi phạm và mức độ danh tính (Tuần 10)
- [x] FR-154 [P0] hồ sơ Thanh tra và máy trạng thái tiếp nhận/xác minh/kết luận/thông báo/đóng — khởi tạo TIEP_NHAN ở Tuần 10 (Tuần 11)
- [x] FR-155 [P0] loại người xung đột lợi ích khỏi hàng đợi, quyền xem và giao hồ sơ (Tuần 10)
- [x] FR-156 [P0] kết luận hồ sơ Thanh tra và thông báo đúng mức tiết lộ (Tuần 11)
- [x] FR-157 [P1] chuyển hồ sơ một chiều từ vai trò được phép sang Thanh tra (Tuần 11)
- [x] FR-158 [P1] cảnh báo bất thường khảo sát và màn hình xem xét chỉ số (Tuần 12)
- [x] FR-159 [P1] thống kê Thanh tra không định danh, có ngưỡng (Tuần 12)

## M16 Ma trận quyền mở rộng

- [x] FR-160 [P0] ma trận quyền 10 vai trò và IDOR; G1 chỉ phần chức năng hiện có — hoàn thiện toàn bộ TC-ALL-01 ở Tuần 13 (Tuần 13)

## Theo dõi BR bổ sung (không cộng vào mẫu số FR)

| BR | Ưu tiên | Tuần/phạm vi dự kiến | Trạng thái tại lúc cập nhật tài liệu |
| --- | --- | --- | --- |
| BR-50 | P0 | G1/Tuần6 | Đạt G1: policy/service/API/UI và TC-PDT-01 đã qua |
| BR-51 | P0 | G1/Tuần6 | Đạt G1: lý do/CAS/audit/thư Mailpit thật; SMTP lỗi có trạng thái rõ |
| BR-52 | P0 | Tuần7 | Đạt: RS-01–06, snapshot, ghi chú cảnh báo và trả về có lý do; TC-PDT-02 qua unit/HTTP/UI |
| BR-53 | P0 | Tuần7 | Đạt: drift vẫn chốt hiện tại, audit/queue PĐT-ĐBCL, sau mở task bất biến; TC-PDT-03 qua |
| BR-54 | P0 | Tuần10–11 | Đạt Tuần11: tuyến PĐT, SLA ngày làm việc, quá hạn/leo thang và hồi quy; xem nghiệm thu Tuần11 |
| BR-55 | P1 | Tuần7 (P1) | Chưa nhận nghiệm thu mới; đối chiếu TRUY_VET và kết quả chạy thật |
| BR-56 | P0 | Tuần10–11 | Đạt Tuần11: tuyến Khảo thí, lời nhắc phúc khảo, SLA ngày làm việc/leo thang và hồi quy |
| BR-57 | P0 | Cờ G1/Tuần6; quyền xem gộp Tuần9 | Đạt Tuần9; Tuần12 bổ sung kiểm hai GV thực sự có đáp án LIKERT hợp lệ, không tính nhóm toàn NA; unit/MySQL/CI qua |
| BR-58 | P1 | Tuần11 | Đạt Tuần11: kiến nghị rà soát đủ điều kiện, phản hồi TBM/nhắc hạn; MySQL và CI nguồn Tuần11 qua |
| BR-59 | P1 | Tuần12 | Tuần12 đã hiện thực thống kê phản hồi thi có ngưỡng; MySQL/xuất tệp/CI qua, nghiệm thu toàn tuần chờ UC-GOLD kiểm tay |
| BR-60 | P0 | Tuần11 | Đạt Tuần11: hồ sơ đi đủ xác minh/kết luận/thông báo/đóng; Tuần12 bổ sung hồ sơ nguồn bất thường không gắn SV |
| BR-61 | P0 | Tuần10–13 | Tuần13 đã đối chiếu xung đột động GV/TBM/TK kể cả đa vai trò trên đọc/list/count/giao/tải/thống kê/thông báo; runtime và CI đúng nguồn qua. Không nhận mọi tổ hợp dữ liệu đều đã thử |
| BR-62 | P0 | Tuần10–13 | Đạt Tuần11: quyền TT, kết luận/thông báo đúng mức tiết lộ, LĐ chỉ tóm tắt; Tuần12 giữ giới hạn trên thống kê/xuất tệp |
| BR-63 | P0 | Tuần10–13 | Đạt tiếp nhận: mặc định ẩn danh hoàn toàn, danh tính chỉ mở cho TT khi sinh viên chọn, audit; giới hạn ẩn danh mức ứng dụng được ghi rõ |
| BR-64 | P1 | Tuần11 | Đạt Tuần11: chuyển hồ sơ một chiều có lý do, kiểm quyền/xung đột động và audit |
| BR-65 | P1 | Tuần12 | Tuần12 đã hiện thực chỉ số/ngưỡng/xem xét/CAS/hồ sơ bất thường; unit/MySQL/E2E/CI qua, kiểm tay toàn luồng còn chờ |
| BR-66 | P1 | Tuần12 | Tuần12 đã hiện thực thống kê Thanh tra có ngưỡng, không định danh; MySQL/xuất tệp/CI qua, kiểm tay còn chờ |
| BR-67 | P0 | Theo luồng; Tuần13 đã chốt | DTO/tệp CSV/XLSX/PDF, ngưỡng và che tổng suy ngược đã đối chiếu; TC-ALL-01/FR-160 nghiệm thu Tuần13 qua runtime/E2E/GUI và CI. Giữ giới hạn ẩn danh ứng dụng, không chứng nhận chống mọi phép suy luận |
| BR-68 | P0 | G1 từ chối mặc định; Tuần13 đã chốt | Đã vá ADMIN đa vai trò ở miền results:*, giữ chặn dữ liệu phản hồi/hồ sơ/báo cáo nhạy cảm; tái hiện trước sửa và hồi quy sau sửa, CI nguồn831d14d qua |

## Nghiệm thu phần chính Tuần 7 — 29/10/2026

FR-40–46, FR-100 và FR-142–144 đã qua check572/572 (32file), build, SQL16, HTTP19+13, seed14, UI11nhóm/26viewport/26PNG. [CI nguồn 39d5648](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40858131706) đã qua check/smoke đúng SHA. Thêm32điểm: **103/219=47,0%**,36/84FR. FR-145 P1 có điều kiện chưa thực hiện, giữ backlog và chưa được người dùng cắt; FR-160 còn chờ đủ phạm vi Tuần13. [Báo cáo Tuần7](bao-cao-tien-do/tuan-07.md).

## Nghiệm thu Tuần 8 — 30/10/2026

FR-50–54 đã qua check 646/646 trong 39 tệp, build Next 16.4.3, HTTP/MySQL 16/16 và UI 13 nhóm/17 trạng thái/34 viewport/34 PNG đã xem. Nguồn `6edad31fef16ee11f5ace82645107b0b7153742d` và [CI 40925339620](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40925339620) đã qua check/smoke đúng SHA; main/tài liệu cuối đối chiếu riêng. 20 POST đồng thời chỉ 1 thành công/19 bị 409, lỗi chèn đáp án rollback nguyên tử; fixture sạch và 27 tập main giữ hash. Chốt thêm 14 điểm: **117/219=53,4%, 41/84 FR**, M6=14/14. Kế hoạch lũy kế Tuần 8 là 119/219=54,3%; còn 2 điểm FR-145 P1 có điều kiện, chưa thực hiện hoặc được người dùng cắt. FR-160 vẫn chưa tick. Xem [nghiệm thu](NGHIEM_THU_TUAN_08.md), [báo cáo 10 mục](bao-cao-tien-do/tuan-08.md) và [QA](QA_GIAO_DIEN_TUAN_08.md). 5.6(d) kiểm DTO/log hiện có; chưa nhận export CSV/Excel/PDF kết quả ở Tuần 12 đã qua. Chưa bắt đầu Tuần 9.

## Nghiệm thu Tuần 9 — 30/10/2026

Chốt FR-47/60–65/150 trên nguồn `5eb5a84d19b8a526bbce3ed5e61852533e8b6b1f`, [CI41079971520](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41079971520) check/smoke đúng SHA thành công. Fullcheck 797/797 trong 50 tệp, build Next16.4.3, HTTP/MySQL 12/12 (TOTP thật/rollback/concurrency), seed 15/15 và UI14 nhóm/23 trạng thái/46 PNG cuối đã xem qua. Fixture sạch, cấu hình thử khôi phục, 27 tập dữ liệu main cũ giữ hash. Thêm 21 điểm: **138/219=63,0%, 49/84 FR**; kế hoạch 140/219, còn chênh hai điểm FR-145 P1 có điều kiện. M5=22/22, M7=16/18, M14=6/13; FR-66, FR-80–82 và FR-160 chưa tick. Xem [nghiệm thu](NGHIEM_THU_TUAN_09.md), [báo cáo](bao-cao-tien-do/tuan-09.md) và [QA](QA_GIAO_DIEN_TUAN_09.md). CI main/tài liệu cuối đối chiếu riêng; chưa bắt đầu Tuần10.

Góp ý câu chữ đăng nhập cùng ngày: dùng “mã số sinh viên” ở hướng dẫn/nhãn/lỗi bỏ trống, giữ input không có ví dụ. Không thêm FR hoặc thay tỷ lệ; vẫn138/219,49/84FR. CI main Tuần9 đã qua trên43da7f8/run41082112228; kết quả commit sửa câu chữ theo dõi riêng.

Góp ý tiếp ngày30/10: bỏ toàn bộ chữ gợi ý nằm trong ô nhập/tìm kiếm/tự luận ở các trang đang có và giữ quy ước cho các tuần sau; nhãn/hướng dẫn ngoài ô giữ nguyên. Không thêm FR hoặc thay điểm138/219; kiểm mã không còn placeholder và check797/797 qua.

Góp ý tiếp về danh xưng cùng ngày: nội dung hướng tới sinh viên dùng “sinh viên”, bỏ Bạn/bạn khỏi câu chữ hệ thống; áp dụng tiếp ở các tuần sau. Sửa câu chữ không thêm FR hoặc điểm; vẫn138/219=63,0%,49/84FR.

Điều chỉnh ngữ cảnh và cấp ADMIN riêng, hoàn tất 31/10/2026: trang chủ/đăng nhập/kích hoạt/khôi phục/email dùng chung trung tính; nhãn mã ở tài khoản theo vai trò thực tế, kể cả đa vai trò. Đã cấp ADMIN cục bộ bằng CLI, kiểm đăng nhập và buộc tự đăng ký TOTP lần đầu. Check797/797 trong50tệp; QA44/44 bố cục của10vai trò+đa vai trò,8PNG đã xem; ADMIN QA được vô hiệu hóa/thu hồi quyền và giữ audit. Xem [bằng chứng](NGU_CANH_TAI_KHOAN_VA_ADMIN_2026_10_31.md). Yêu cầu mới thay quy ước “mã số sinh viên” ở trang dùng chung; không đổi nghiệp vụ, cộng điểm hoặc bắt đầu Tuần10. Vẫn138/219=63,0%,49/84FR.

Sửa phiên xem web tự tải lại —31/10/2026: đã đổi script dev sang next dev --webpack, giữ cache cũ trong .local. Check797/797 trong50tệp; IAB1265×720 giữ chuỗi thử hơn156giây, hết vòng HMR lặp trong phép đo; đăng nhập/đăng xuất demo qua và hai JPEG đã xem. Lần thử production preview bị guardHTTPS chặn đã bỏ, không nới guard hoặc reset database/TOTP. Chưa xác định tệp invalidation gốc; [hồ sơ sửa lỗi](SUA_TAI_LAI_TRANG_2026_10_31.md) ghi giới hạn kiểm. Đây là sửa vận hành, không thêm FR/điểm; vẫn138/219=63,0%,49/84FR và chưa bắt đầu Tuần10.

QR60giây và nhãn tài khoản —31/10/2026: QR chờ xác nhận có hạn60giây, tự cấp lại tại chỗ và đếm ngược cả phiên5phút. TOTP30giây/tài khoản đã bậtMFA giữ nguyên; hết phiên thì dừng cấp và hiện thông báo. Check816/816 trong51tệp; HTTP/MySQL29/29 và CLI5/5 qua trên DB thử riêng; UI quan sát5lần cấp theo khoảng60,25giây, sau hếtphiên không cònQR. Theo góp ý tiếp, đổi nhãn chung thành “Tài khoản”, “Tài khoản hoặc email”; giữ MSSV/Mã giảng viên. [Bằng chứng](QR_60_GIAY_2026_10_31.md). Không thêm FR/điểm hoặc mở Tuần10: vẫn138/219,49/84FR.

Mã xác minh 6 chữ số 60 giây — 31/10/2026: theo lệnh mới, đăng ký mới dùng TOTP60; credential 30 giây cũ tiếp tục dùng cho đến khi chủ tài khoản nhập mã cũ mới, quét QR60 và xác nhận thành công. Chỉ chu kỳ 30 giây ở mục8.4 được điều chỉnh theo yêu cầu này; giữ bản đặc tả gốc và ghi [hồ sơ thay đổi](TOTP_60_GIAY_2026_10_31.md) riêng. Check **841/841 trong52tệp**, HTTP/MySQL **12/12** và dọn bí mật fixture qua; migration thêm6cột, hash34bảng dữ liệu cũ giữ nguyên. ADMIN chính chưa được chuyển hộ hoặc đổi khóa, vẫn dùng30 cho đến bước xác nhận cá nhân. UI/CI bản mới đang được kiểm, không suy từ kết quả cũ. Không thêm FR hoặc bắt đầu Tuần10; tiến độ giữ **138/219=63,0%,49/84FR**.

Tiếp tục01/11: check cuối **850/850 trong53tệp**, build qua; UI tài khoản giả kiểm đăng nhập30, đường chuyển, QR/hướng dẫn60, hủy giữ30 và ảnh đã xem. Bổ sung9kiểm SSR, khóa biểu mẫu trước khi phía máy khách sẵn sàng và POST dự phòng sau khi phát hiện gửi mã giả qua GET lúc bấm quá sớm. HTTP TOTP60 có database/marker riêng, không ghi lịch sử fixture vào database thửTuần4. Kết quả CI theo SHA bản cập nhật; chủ tài khoản tự quét/xác nhận QR mới, tiến độ không đổi.

## Nghiệm thu chức năng Tuần 10 — 01–02/11/2026

Chốt FR-70/71/72/73/76/146/149/153/155 trên nguồn `51f03e26f47d17279af0b681d11994d7abd10d39`, [CI41274448630](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41274448630) check/smoke đúng SHA thành công. Linux985/985 trong62tệp; Windows984passed/1skipped do không tạo được file symlink; HTTP/MySQL19/19, SQL16/16, seed17/17, build Next16.4.3 qua. Luồng UI giả từ gửi ẩn danh tới trả lời/đóng đã chạy;14JPEG của4vai trò/2kích thước được ghi phạm vi tại [QA](QA_GIAO_DIEN_TUAN_10.md). Migration thêm3bảng, tổng37runtime/46design/9chỉthiết kế;34bảng/9.168bản ghi main cũ giữ hash sau migration và seed. Chín FR P0 thêm27điểm: **165/219=75,3%,58/84FR**; kế hoạch167/219, chênh2điểm FR-145. M8=15/19,M13=18/22,M14=9/13,M15=6/18. FR-154 chỉ TIEP_NHAN, FR-160 vẫn một phần; không tick SLA/hài lòng/kết luận/giải trình/thông báo tương lai. Bản sửa tracing, khởi động đơn giản, tài liệu và CI giao cuối đối chiếu riêng tại [nghiệm thu](NGHIEM_THU_TUAN_10.md) và [báo cáo](bao-cao-tien-do/tuan-10.md).

Chốt giao02/11: nguồn `8ffa99f6e67b06b579a3576506395e9856d1dd1d`, [CI41414188239](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41414188239) check/smoke thành công; Linux1002/1002 và Windows1001passed/1skipped trong63tệp. Bản dựng hết cảnh báo tracing, thêm17test khởi động và kiểm CMD cold-start/mở lại thật, không trùng tiến trình, giữ .env. Hướng dẫn ba bước đầu README; web3000/scheduler đã mở lại. Không cộng thêm FR/điểm cho tiện ích mở dự án.

Sửa tệp CMD tự đóng ngày 02/11: tái hiện lỗi ở cửa sổ tương tác do LF, đổi sang CRLF và giữ byte trong Git/ZIP, thêm một test trên tệp checkout. Check: 1002 passed, 1 skipped / 1003, trong 63 tệp; khởi động từ System32 và mở lại giữ `pause`, web trả HTTP 200. Đây là sửa vận hành, không thêm FR hoặc chuyển Tuần 11; vẫn 165/219 = 75,3%, 58/84 FR. Xem [hồ sơ sửa](SUA_KHOI_DONG_CMD_2026_11_02.md).

Bắt đầu Tuần 11 ngày 02/11 theo lệnh người dùng; đang kiểm và chưa tick các FR mới. UI chưa bắt đầu, chờ nghiệm thu tuần 11 và lệnh giai đoạn riêng sau 15 tuần. [Checkpoint đang làm](WIP_TUAN_11.md).


## Nghiệm thu Tuần 11 — 02–03/11/2026

Hoàn tất FR-66/74/75/80/81/82/152/154/156/157; thêm 23 điểm, tổng188/219=85,8%,68/84FR. Check1140passed/1skipped trong76tệp, buildNext16.4.3, MySQL43nhóm, hồi quy Tuần10=19/Tuần9=12,SQL16,demo18. Hash37bảng/9399bản ghi cũ và seedlặp43bảng/9451bản ghi giữ nguyên. [Nghiệm thu](NGHIEM_THU_TUAN_11.md), [QA](QA_GIAO_DIEN_TUAN_11.md), [bằng chứng](assets/tuan-11/verification.json). FR-145 còn backlog, FR-160 chưa tick toàn bộ. CI nguồn mới phải đối chiếu SHA riêng. Người dùng đã yêu cầu tiếp tục Tuần12 sau khi chốt11; UI vẫn hoãn.

## Hiện thực và kiểm thử Tuần12 — 03/11/2026, chưa nghiệm thu toàn tuần

Chín FR-90/91/92/93/94/147/151/158/159 đã có mã, tài liệu và kiểm tự động. Nguồn6692854e97088845ce5b263318dfb1f6239fef04, [CI41588831428](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41588831428) qua check/smoke/e2e; Linux1285/1285 trong86tệp, E2E3/3; Windows1284passed/1skip, build qua. MySQL báo cáo13+bất thường9, xuất tệp10; hồi quy12/19/43,SQL16,demo19.

Kiểm tay đã tạo mẫu/đợt, xác nhận/phê duyệt, nộp một phiếu và gửi phản hồi ẩn danh. Công cụ điều khiển Windows dừng vì không xác định URL đủ chắc chắn, nên còn các bước cuối UC-GOLD tại [Mục8](UC_GOLD_TUAN_12.md). Không nhận E2E thay kiểm tay. Giữ **188/219=85,8%,68/84FR**, chưa tick chín FR; mục tiêu sau nghiệm thu208/219=95,0%,77/84FR. Main giữ Tuần11; nhánh tính năng lưu toàn bộ công việc Tuần12. Không bắt đầu Tuần13/UI-n.
