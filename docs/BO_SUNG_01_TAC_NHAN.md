# PROMPT BỔ SUNG SỐ 01: THÊM 3 TÁC NHÂN (PHÒNG ĐÀO TẠO, PHÒNG KHẢO THÍ, PHÒNG THANH TRA)

Dùng kèm prompt chính "Website quản lý khảo sát và phản hồi của sinh viên về môn học" (Next.js + MySQL, 15 tuần). Thêm 3 tác nhân theo yêu cầu của GVHD: Phòng Đào tạo, Phòng Khảo thí, Phòng Thanh tra.

=== BẮT ĐẦU PROMPT BỔ SUNG ===

## A. TÍNH CHẤT VÀ THỨ TỰ ƯU TIÊN

- Đây là **ĐIỀU CHỈNH SỐ 01** của prompt chính. GVHD yêu cầu thêm tác nhân: **Phòng Đào tạo, Phòng Khảo thí, Phòng Thanh tra**. Sau điều chỉnh hệ thống có **10 vai trò**.
- Điều chỉnh này **thắng** prompt chính ở các điểm nêu tên trong Mục E. Mọi thứ khác giữ nguyên: quy tắc làm việc (Mục 2), bảo mật (8.3 đến 8.6), thiết kế ẩn danh phiếu khảo sát (5.6), báo cáo hằng tuần.
- **Tuần 1-6 đã xong; chuẩn bị bắt đầu tuần 7.** Hãy xác minh bằng `docs/PROJECT_STATE.md`, `docs/PROGRESS.md` và code thật. Nếu thực tế khác, báo người dùng, đừng tự làm bù ngoài phạm vi.
- Vẫn "từng bước một". Ngoại lệ duy nhất là "việc bù" ở Mục G1. Không làm trước chức năng của tuần sau, kể cả tuần 7 cho tới khi người dùng gõ `BẮT ĐẦU TUẦN 7`.
- **Bài kiểm tra bám đề tài:** mọi chức năng của 3 tác nhân mới phải trả lời được ít nhất một câu: (1) nó cung cấp hoặc xác nhận dữ liệu cho khảo sát? (2) nó xem hoặc dùng kết quả khảo sát? (3) nó tiếp nhận hoặc xử lý phản hồi của sinh viên về môn học? Không trả lời được thì **không làm**.
- Mỗi tác nhân phải có quy trình riêng, dữ liệu riêng, quy tắc riêng và test riêng. Không thêm vai trò cho đủ số.
- **Đọc code đã có (tuần 3-6) trước khi sửa. Không viết lại từ đầu; thay đổi nhỏ nhất có thể.**
- Nếu phát hiện mâu thuẫn mà điều chỉnh này không nêu, báo cho người dùng, đừng tự quyết.

## B. HIỆN TRẠNG: 7 VAI TRÒ GIỮ NGUYÊN

SINH_VIEN, GIANG_VIEN, TRUONG_BO_MON, TRUONG_KHOA, CAN_BO_DBCL, LANH_DAO, ADMIN. Giảng viên đã đảm nhiệm vai trò đồng hành với sinh viên nên **không có tác nhân Cố vấn học tập**. Phạm vi gán vai trò chỉ gồm: toàn hệ thống, khoa, bộ môn (không có phạm vi lớp sinh hoạt).

## C. QUY ƯỚC MÃ VÀ TÊN GỌI

- Mã mới trong điều chỉnh này: quy tắc nghiệp vụ **BR-50 đến BR-68**, chức năng **FR-140 đến FR-160**, luật kiểm tra sẵn sàng **RS-01 đến RS-06**, test **TC-...** (Mục F). Không trùng mã của prompt chính (BR-01 đến BR-35, FR-01 đến FR-112). Các số bị bỏ trống là chủ ý, không phải thiếu sót.
- Tên hiển thị trên giao diện (tiếng Việt): Phòng Đào tạo, Phòng Khảo thí, Phòng Thanh tra. Tên vai trò trong code theo đúng mã ở Mục D.
- Đây là **vai trò chức năng**; tên và cơ cấu đơn vị thật của mỗi trường có thể khác, không gắn cứng vào tên đơn vị của một trường cụ thể.

## D. BA TÁC NHÂN THÊM MỚI

### D1. PHONG_DAO_TAO (Phòng Đào tạo): chủ sở hữu dữ liệu đối tượng khảo sát [P0]

Vai trò trong đề tài: cung cấp và xác nhận "sinh viên nào khảo sát lớp học phần nào của giảng viên nào". Phạm vi: toàn hệ thống nhưng **chỉ dữ liệu đào tạo**. Không xem kết quả khảo sát chi tiết và không xem nội dung phản hồi ngoài loại `TO_CHUC_LOP_HOC`.

Quy trình riêng:
1. Quản lý dữ liệu đào tạo: học kỳ (mở, khóa sổ), môn học, lớp học phần, phân công giảng viên, đăng ký học phần, hồ sơ sinh viên và giảng viên phục vụ khảo sát, import Excel/CSV. **FR-20, FR-21, FR-22 của prompt chính chuyển từ ADMIN sang PHONG_DAO_TAO.** ADMIN giữ khoa và bộ môn (cấu trúc tổ chức dùng cho phạm vi phân quyền), tài khoản, vai trò, cấu hình, nhật ký.
2. Kiểm tra độ sẵn sàng của dữ liệu và **xác nhận** trước khi một đợt khảo sát được trình lãnh đạo (bước mới).
3. Tiếp nhận phản hồi loại `TO_CHUC_LOP_HOC`: lịch học, xếp lớp, trùng lịch, sĩ số, đăng ký lớp học phần. Không gồm phòng học hay thiết bị (loại đó thuộc `KHAC`).

Quy tắc và chức năng:
- **BR-50 [P0]** Dữ liệu đào tạo (học kỳ, môn học, lớp học phần, phân công giảng viên, đăng ký học phần, hồ sơ SV/GV) chỉ do PHONG_DAO_TAO tạo, sửa, xóa, import. Các vai trò khác chỉ đọc theo phạm vi hoặc không thấy. Mọi thay đổi ghi AuditLog. Tài khoản đăng nhập vẫn do ADMIN tạo/khóa; nếu import ở tuần 5 đang tự tạo tài khoản thì giữ nguyên hành vi đó nhưng ghi nhận người thực hiện là PĐT.
- **BR-51 [P0]** Khóa/mở khóa sổ học kỳ chỉ do PĐT thực hiện (cơ chế khóa theo BR-17 của prompt chính). Mở khóa bắt buộc có lý do, ghi nhật ký và thông báo CAN_BO_DBCL.
- **BR-52 [P0]** Trước khi đợt khảo sát từ `CHO_XAC_NHAN_DL` sang `CHO_DUYET`, hệ thống chạy **kiểm tra sẵn sàng** trên phạm vi của đợt, rồi PĐT xác nhận hoặc trả về. Các luật kiểm tra (mã RS, ngưỡng cấu hình được):
  - RS-01 **CHẶN**: lớp học phần chưa có giảng viên phụ trách.
  - RS-02 **CHẶN**: lớp học phần chưa có sinh viên đăng ký.
  - RS-03 **CHẶN**: học kỳ của đợt đã khóa sổ.
  - RS-04 CẢNH BÁO: lớp có từ 2 giảng viên trở lên (đánh giá ở mức lớp theo BR-16).
  - RS-05 CẢNH BÁO: lớp có số sinh viên đăng ký nhỏ hơn `minResponses` của đợt (kết quả chắc chắn không đủ mẫu để công bố theo BR-07).
  - RS-06 CẢNH BÁO: sinh viên chưa có tài khoản hoạt động hoặc thiếu email (sẽ không nhận được nhắc).
  - Còn lỗi CHẶN thì không được xác nhận; cảnh báo thì được xác nhận kèm ghi chú. Lưu **bản chụp xác nhận**: số lớp, số cặp (sinh viên, lớp học phần), mã băm SHA-256 của danh sách đã sắp xếp, người xác nhận, thời điểm, danh sách cảnh báo.
- **BR-53 [P0]** Khi đợt chuyển sang `DANG_MO`, tính lại mã băm. Nếu khác lúc xác nhận thì **vẫn chốt danh sách theo dữ liệu hiện tại** (để không trễ lịch) nhưng ghi nhật ký và gửi cảnh báo "dữ liệu thay đổi sau khi xác nhận" cho PĐT và CAN_BO_DBCL. Thay đổi dữ liệu sau thời điểm chốt không làm đổi các `SurveyTask` đã tạo (BR-01).
- **BR-54 [P0]** Phản hồi `TO_CHUC_LOP_HOC` chuyển cho PĐT; tiếp nhận ≤ 2 và trả lời ≤ 5 ngày làm việc; quá hạn leo thang PĐT → CAN_BO_DBCL → LANH_DAO. PĐT được chuyển tiếp (kèm lý do) sang giảng viên hoặc trưởng bộ môn khi nội dung thuộc chuyên môn của họ.
- **BR-55 [P1]** Lô nhập (`ImportBatch`): mỗi lần import ghi tên tệp, mã băm, số dòng hợp lệ/lỗi, người nhập; trạng thái `NHAP → DA_AP_DUNG → DA_HOAN_TAC`. Chỉ hoàn tác được khi dữ liệu của lô chưa được đợt khảo sát nào chốt dùng.
- FR-140 [P0] đổi quyền CRUD danh mục và import sang PĐT (policy, menu, test). FR-141 [P0] khóa/mở khóa học kỳ. FR-142 [P0] kiểm tra sẵn sàng của đợt. FR-143 [P0] xác nhận hoặc trả về dữ liệu đối tượng khảo sát. FR-144 [P0] cảnh báo lệch dữ liệu khi mở đợt. FR-145 [P1] lô nhập và hoàn tác. FR-146 [P0] hàng đợi `TO_CHUC_LOP_HOC`. FR-147 [P1] dashboard PĐT (độ sẵn sàng theo đợt, số lớp lỗi, phản hồi đang chờ).

### D2. PHONG_KHAO_THI (Phòng Khảo thí): đầu mối về thi và đánh giá kết quả học phần [P0 lát cắt tối thiểu, còn lại P1]

Vai trò trong đề tài: xử lý phản hồi của sinh viên về thi cử và theo dõi nhóm tiêu chí "kiểm tra, đánh giá" của khảo sát. Phạm vi: toàn hệ thống nhưng dữ liệu bị giới hạn như bên dưới.

Quy trình riêng:
1. Tiếp nhận phản hồi loại `THI_KET_THUC_HOC_PHAN`: đề thi, lịch thi, coi thi, quy trình chấm, công bố điểm, thủ tục phúc khảo. Loại `KIEM_TRA_DANH_GIA` (kiểm tra thường xuyên, giữa kỳ, thang điểm thành phần do giảng viên chịu trách nhiệm) vẫn thuộc giảng viên như prompt chính.
2. Xem kết quả **gộp** của các nhóm tiêu chí kiểm tra, đánh giá.
3. Gửi kiến nghị rà soát đề thi hoặc hình thức kiểm tra cho trưởng bộ môn.

Quy tắc và chức năng:
- **BR-56 [P0]** Phản hồi `THI_KET_THUC_HOC_PHAN` chuyển cho PHONG_KHAO_THI; tiếp nhận ≤ 2 và trả lời ≤ 5 ngày làm việc; quá hạn leo thang KHAO_THI → CAN_BO_DBCL → LANH_DAO. Khi sinh viên chọn loại này, giao diện hiện nhắc (nội dung nhắc cấu hình được): "Phản hồi này không thay thế đơn phúc khảo theo quy chế; xem hướng dẫn của Phòng Khảo thí". **Hệ thống không lưu điểm và không giải quyết phúc khảo thay quy trình chính thức.** Khảo thí được chuyển tiếp (kèm lý do) sang giảng viên hoặc trưởng bộ môn nếu nội dung thuộc chuyên môn đề thi.
- **BR-57 [P0]** Nhóm tiêu chí trong mẫu phiếu có cờ `isAssessmentGroup` (do CAN_BO_DBCL đặt ở trình soạn mẫu). Sau khi đợt `DA_CONG_BO`, Khảo thí xem **điểm của các nhóm có cờ này, gộp theo môn học, bộ môn, khoa**. Quy tắc bảo vệ: chỉ hiển thị khi số liệu gộp đến từ **ít nhất 2 giảng viên khác nhau** và tổng số phiếu ≥ `minResponses` (BR-07); nếu không thì hiển thị "Chưa đủ dữ liệu gộp" (khi đó chỉ xem ở mức bộ môn hoặc khoa). **Khảo thí không xem kết quả theo lớp hay theo giảng viên, không xem góp ý tự luận.**
- **BR-58 [P1]** Kiến nghị rà soát (`ExamReviewRecommendation`): Khảo thí gửi trưởng bộ môn, kèm môn học, đợt khảo sát và nội dung; trạng thái `DA_GUI → DA_PHAN_HOI` (TBM chọn `DA_TIEP_THU` hoặc `KHONG_TIEP_THU`, bắt buộc lý do); hạn mặc định 14 ngày, quá hạn nhắc TBM và báo trưởng khoa.
- **BR-59 [P1]** Thống kê phản hồi thi theo môn học, học kỳ, bộ môn; không có định danh sinh viên; chỉ hiển thị khi số phản hồi gộp đủ ngưỡng cấu hình.
- FR-148 [P0] cờ nhóm tiêu chí kiểm tra, đánh giá trong trình soạn mẫu (mẫu mặc định có 1 nhóm như vậy). FR-149 [P0] hàng đợi `THI_KET_THUC_HOC_PHAN` kèm lời nhắc phúc khảo. FR-150 [P0] trang kết quả gộp theo BR-57. FR-151 [P1] thống kê phản hồi thi. FR-152 [P1] kiến nghị rà soát và phản hồi của TBM.

### D3. THANH_TRA (Phòng Thanh tra): tiếp nhận khiếu nại nghiêm trọng và giám sát liêm chính khảo sát [P0 lát cắt tối thiểu, còn lại P1]

Vai trò trong đề tài: xử lý các phản hồi của sinh viên về môn học ở mức nghiêm trọng, và giám sát để quy trình khảo sát không bị can thiệp. Hồ sơ là **hồ sơ mật**. Hệ thống chỉ ghi nhận tiếp nhận, xác minh, kết luận ở mức quản lý, **không thay thế quy trình kỷ luật hay thanh tra chính thức của trường**.

Quy trình riêng:
1. Hồ sơ khiếu nại nghiêm trọng: máy trạng thái `TIEP_NHAN → XAC_MINH → KET_LUAN → THONG_BAO → DONG`.
   - Loại vi phạm: `VI_PHAM_QUY_CHE_GIANG_DAY` (bỏ giờ, dạy thiếu, không đúng đề cương), `GAY_AP_LUC_KHI_KHAO_SAT` (ép hoặc gợi ý sinh viên đánh giá), `HANH_VI_KHONG_PHU_HOP` (đạo đức nhà giáo, xúc phạm, quấy rối), `VI_PHAM_QUY_CHE_THI_KIEM_TRA`, `KHAC_NGHIEM_TRONG`.
   - Ở `TIEP_NHAN`, Thanh tra có thể `TU_CHOI` (ngoài phạm vi hoặc không đủ thông tin, bắt buộc lý do) hoặc `CHUYEN_LAI` về luồng phản hồi thường (kèm lý do). Ở `XAC_MINH` ghi chú xác minh và tệp nội bộ. Ở `KET_LUAN` chọn `CO_CAN_CU | KHONG_CAN_CU | KHONG_DU_THONG_TIN | CHUYEN_DON_VI_KHAC` kèm lý do. Ở `THONG_BAO` gửi tóm tắt kết quả cho sinh viên (qua kênh vẫn ẩn danh), và cho LANH_DAO khi `CO_CAN_CU`.
2. Nguồn mở hồ sơ: (a) sinh viên chọn loại `KHIEU_NAI_NGHIEM_TRONG` khi gửi phản hồi; (b) người xử lý khác chuyển sang (BR-64); (c) cảnh báo bất thường của khảo sát (BR-65).
3. Giám sát liêm chính khảo sát (xem BR-65).

Quy tắc và chức năng:
- **BR-60 [P0]** Hạn xử lý mặc định (ngày làm việc, cấu hình được): tiếp nhận ≤ 3, hoàn tất ≤ 30. Quá hạn gửi thông báo mức tóm tắt cho LANH_DAO.
- **BR-61 [P0] Xung đột lợi ích.** Giảng viên bị phản ánh (giảng viên của lớp học phần liên quan), trưởng bộ môn của bộ môn đó và trưởng khoa của khoa đó **không được thấy hồ sơ và không được giao xử lý**, kể cả khi cùng tài khoản đó có thêm vai trò THANH_TRA. Truy cập bị từ chối trả về "không tìm thấy" (không tiết lộ hồ sơ có tồn tại). Phản hồi nghiêm trọng không bao giờ được định tuyến vào những người này.
- **BR-62 [P0] Quyền xem.** Chỉ THANH_TRA (trừ người bị xung đột) xem đầy đủ hồ sơ. LANH_DAO chỉ xem mức tóm tắt (loại, trạng thái, kết luận, số liệu), không xem nội dung. **ADMIN và CAN_BO_DBCL không xem hồ sơ.** Mỗi lần mở hồ sơ hoặc tải tệp đính kèm ghi AuditLog; tệp chỉ tải qua route có kiểm quyền (BR-28).
- **BR-63 [P0] Mức độ danh tính** khi gửi loại này: `AN_DANH_HOAN_TOAN` (mặc định; Thanh tra chỉ thấy "Sinh viên ẩn danh" nhưng hệ thống vẫn trao đổi và thông báo đúng sinh viên như BR-24) hoặc `CHO_THANH_TRA_BIET` (chỉ Thanh tra thấy danh tính, mỗi lần xem ghi AuditLog). Danh tính sinh viên không lộ cho người bị phản ánh ở bất kỳ bước nào. Giao diện gửi có cảnh báo rõ đây là khiếu nại chính thức và khuyến nghị nêu cụ thể sự việc, thời điểm, lớp học phần. Báo cáo tiểu luận phải ghi hạn chế: ẩn danh ở mức ứng dụng.
- **BR-64 [P1] Chuyển hồ sơ.** TRUONG_BO_MON, TRUONG_KHOA, CAN_BO_DBCL, PHONG_DAO_TAO, PHONG_KHAO_THI được chuyển một phản hồi sang Thanh tra kèm lý do (một chiều, ghi lịch sử). Sau khi chuyển, người chuyển chỉ thấy trạng thái và kết luận tóm tắt.
- **BR-65 [P1] Cảnh báo bất thường của khảo sát.** Sau `DA_TONG_HOP`, hệ thống tính **chỉ số** cho từng lớp học phần có từ 10 phiếu: số phiếu, tỉ lệ tham gia, tỉ lệ phiếu có mọi câu thang điểm cùng một giá trị, mức chênh điểm so với học kỳ trước. Lớp vượt ngưỡng (mặc định: tỉ lệ phiếu đồng nhất ≥ 70%, hoặc chênh ≥ 1,5 điểm; cấu hình được) tạo `SurveyAnomalyFlag`. Thanh tra xem **chỉ số**, không xem điểm tuyệt đối, câu trả lời hay góp ý tự luận. Thanh tra chọn `BINH_THUONG` (ghi chú), `CAN_LUU_Y` (ghi chú, thông báo CAN_BO_DBCL) hoặc `CHUYEN_XAC_MINH` (mở hồ sơ nguồn BAT_THUONG_KHAO_SAT). Cảnh báo chỉ là gợi ý, **không tự động chặn công bố hay kết luận ai đúng sai**.
- **BR-66 [P1]** Thống kê của Thanh tra (số hồ sơ theo loại, thời gian xử lý, tỉ lệ quá hạn) không có định danh và chỉ hiển thị khi số liệu gộp đủ ngưỡng cấu hình.
- FR-153 [P0] gửi `KHIEU_NAI_NGHIEM_TRONG` (cảnh báo, loại vi phạm, mức độ danh tính). FR-154 [P0] hồ sơ và máy trạng thái. FR-155 [P0] tự động loại người xung đột khỏi hàng đợi và quyền truy cập. FR-156 [P0] kết luận và thông báo. FR-157 [P1] chuyển hồ sơ từ vai trò khác. FR-158 [P1] cảnh báo bất thường khảo sát và màn hình xem xét. FR-159 [P1] thống kê không định danh.

### D4. Quy tắc chung của 3 tác nhân mới

- **BR-67 [P0]** Mọi thống kê, dashboard và tệp xuất của 3 vai trò mới **không chứa định danh sinh viên** và áp dụng ngưỡng mẫu tối thiểu khi gộp. Test kiểm tra tệp xuất.
- **BR-68 [P0]** ADMIN không xem kết quả khảo sát, nội dung phản hồi và hồ sơ Thanh tra (mở rộng BR-18).
- **FR-160 [P0]** `docs/MA_TRAN_QUYEN.md` cho 10 vai trò × chức năng × phạm vi, cùng bộ test ma trận và IDOR cho cả 10 vai trò.

## E. ĐIỀU CHỈNH CÁC PHẦN HIỆN CÓ CỦA PROMPT CHÍNH

**E1. Mục 4 (vai trò):** thay bằng 10 vai trò: SINH_VIEN, GIANG_VIEN, TRUONG_BO_MON, TRUONG_KHOA, CAN_BO_DBCL, LANH_DAO, ADMIN, PHONG_DAO_TAO, PHONG_KHAO_THI, THANH_TRA. Cập nhật mô tả:
- ADMIN: chỉ quản lý khoa/bộ môn, tài khoản, vai trò, cấu hình, nhật ký; bắt buộc 2FA; **không** thao tác dữ liệu đào tạo và không xem dữ liệu nghiệp vụ nhạy cảm.
- CAN_BO_DBCL: bỏ phần "xử lý phản hồi về cơ sở vật chất/lịch học"; xử lý loại `KHAC` và là tầng leo thang; được chuyển phản hồi sang Thanh tra; không xem hồ sơ Thanh tra.

**E2. Mục 5.2 (đợt khảo sát):** thêm trạng thái `CHO_XAC_NHAN_DL`. Chuỗi mới: `NHAP → CHO_XAC_NHAN_DL → CHO_DUYET → DA_DUYET → DANG_MO → DA_DONG → DA_TONG_HOP → DA_CONG_BO → LUU_TRU`.
- NHAP → CHO_XAC_NHAN_DL: CAN_BO_DBCL trình (kiểm tra có mẫu phiếu, phạm vi, thời gian hợp lệ).
- CHO_XAC_NHAN_DL → CHO_DUYET: PHONG_DAO_TAO xác nhận theo BR-52. PĐT trả về NHAP phải có lý do.
- Có thể HUY từ CHO_XAC_NHAN_DL. Các chuyển trạng thái còn lại giữ nguyên.

**E3. Mục 5.5 (mẫu phiếu):** nhóm tiêu chí có thêm thuộc tính `isAssessmentGroup` (mặc định false). Mẫu mặc định có 1 nhóm "Kiểm tra, đánh giá" với cờ này.

**E4. Mục 5.8 (định tuyến và hạn xử lý phản hồi):** thay bảng loại phản hồi bằng 8 loại:
- `GIANG_DAY` → giảng viên phụ trách lớp (khiếu nại đồng gửi trưởng bộ môn).
- `NOI_DUNG_DE_CUONG` → trưởng bộ môn.
- `TAI_LIEU` → giảng viên.
- `KIEM_TRA_DANH_GIA` → giảng viên (đồng gửi trưởng bộ môn).
- `THI_KET_THUC_HOC_PHAN` → PHONG_KHAO_THI.
- `TO_CHUC_LOP_HOC` → PHONG_DAO_TAO.
- `KHIEU_NAI_NGHIEM_TRONG` → THANH_TRA (mức độ cố định; dùng chung chống spam BR-26).
- `KHAC` → CAN_BO_DBCL (gồm cả phản hồi về phòng học, thiết bị; hệ thống không có tác nhân riêng cho cơ sở vật chất).

Chuỗi leo thang: loại thuộc giảng viên/trưởng bộ môn: giảng viên → trưởng bộ môn → trưởng khoa → CAN_BO_DBCL (giữ như prompt chính); `TO_CHUC_LOP_HOC`: PĐT → CAN_BO_DBCL → LANH_DAO; `THI_KET_THUC_HOC_PHAN`: KHAO_THI → CAN_BO_DBCL → LANH_DAO; `KHIEU_NAI_NGHIEM_TRONG`: THANH_TRA → LANH_DAO (mức tóm tắt); `KHAC`: CAN_BO_DBCL → LANH_DAO. Phản hồi chưa triển khai (tuần 10), nên chỉ cập nhật tài liệu và thiết kế; nếu enum đã có trong schema thì sửa bằng migration.

**E5. Mục 6 (quy tắc):**
- BR-01 sửa thành: đối tượng khảo sát lấy từ dữ liệu đào tạo do PHONG_DAO_TAO quản lý và đã được xác nhận theo BR-52.
- BR-08 mở rộng: Khảo thí xem theo BR-57 từ `DA_CONG_BO`; Thanh tra chỉ xem chỉ số bất thường theo BR-65 từ `DA_TONG_HOP`.
- BR-17 và BR-18 theo BR-51 và BR-68.

**E6. Mục 7 (chức năng):** thêm FR-140 đến FR-160 vào `docs/PROGRESS.md` (kèm mức ưu tiên và tuần dự kiến ở Mục G); FR-20 đến FR-22 ghi chú "do PHONG_DAO_TAO".

**E7. Dữ liệu mới (thiết kế chi tiết do bạn quyết, bảng lịch sử chỉ thêm, không sửa):**
- Enum vai trò thêm 3 giá trị; `SurveyCampaign` thêm trạng thái `CHO_XAC_NHAN_DL`.
- `CampaignDataConfirmation`: đợt, trạng thái (`DA_XAC_NHAN | TRA_VE`), người, thời điểm, mã băm, số lớp, số cặp, cảnh báo (JSON), lý do trả về.
- `QuestionGroup.isAssessmentGroup`.
- `Feedback`: thêm loại mới, `identityLevel` (cho loại nghiêm trọng), liên kết `lớp học phần`.
- `InspectionCase` (nguồn, loại vi phạm, trạng thái, kết luận, lý do, hạn, người xử lý), `InspectionCaseNote` (ghi chú nội bộ), `InspectionCaseEvent` (lịch sử bất biến).
- `SurveyAnomalyFlag` (đợt, lớp học phần, mã luật, chỉ số JSON, trạng thái xem xét, quyết định, người xem xét, ghi chú).
- `ExamReviewRecommendation` (P1), `ImportBatch` (P1).
- Xung đột lợi ích (BR-61) tính động từ lớp học phần → giảng viên → bộ môn → khoa, đặt ở một hàm policy duy nhất.

**E8. Dữ liệu demo (seed):** thêm tài khoản demo cho 3 vai trò mới (Thanh tra có 2 tài khoản để thử xung đột); dữ liệu có chủ ý để readiness ra đủ các mã RS (một lớp chưa giảng viên, một lớp chưa sinh viên, một lớp 2 giảng viên, một lớp ít sinh viên); vài phản hồi mỗi loại mới; 1 hồ sơ Thanh tra ở `XAC_MINH`; 1 cảnh báo bất thường; một đợt đã `DA_CONG_BO` có ≥ 2 giảng viên cùng môn để thử BR-57.

**E9. Báo cáo tuần (Mục 10):** thêm mục "Điều chỉnh so với kế hoạch": ngày, lý do (yêu cầu của GVHD), phần việc thêm/bớt, tác động tiến độ. **Sinh viên tự điền ngày và tên người yêu cầu; AI không điền.** Phần việc bù ghi rõ "việc bù" và làm vào tuần nào.

**E10. `AGENTS.md`:** chỉ thêm tối đa 3 dòng: danh sách 10 vai trò, con trỏ tới `docs/BO_SUNG_01_TAC_NHAN.md`, và "ADMIN không xem dữ liệu nghiệp vụ nhạy cảm/hồ sơ Thanh tra". Giữ file ngắn.

## F. TEST BẮT BUỘC (đặt tên test có mã, ghi vào `docs/TRUY_VET.md`)

- TC-PDT-01: ADMIN gọi API tạo/sửa lớp học phần hoặc import → bị từ chối; PĐT → thành công.
- TC-PDT-02: readiness trên dữ liệu seed trả đúng danh sách RS-01 đến RS-06; còn lỗi CHẶN thì không xác nhận được.
- TC-PDT-03: xác nhận → sửa 1 đăng ký → mở đợt → có cảnh báo lệch, `SurveyTask` đúng theo dữ liệu lúc chốt.
- TC-KT-01: Khảo thí không thấy kết quả theo lớp hay giảng viên và không thấy tự luận; chỉ có 1 giảng viên trong môn thì hiện "Chưa đủ dữ liệu gộp".
- TC-KT-02: phản hồi `THI_KET_THUC_HOC_PHAN` tới đúng hàng đợi, không lộ danh tính sinh viên; quá hạn thì leo thang đúng chuỗi.
- TC-TT-01: giảng viên bị phản ánh, trưởng bộ môn và trưởng khoa liên quan (kể cả khi tài khoản có thêm vai trò THANH_TRA) không thấy và không được giao hồ sơ; truy cập trả "không tìm thấy".
- TC-TT-02: ADMIN và CAN_BO_DBCL không xem được hồ sơ; LANH_DAO chỉ xem tóm tắt; mỗi lần mở hồ sơ/tệp có AuditLog.
- TC-TT-03: sinh viên chọn `AN_DANH_HOAN_TOAN` → Thanh tra không thấy danh tính; chọn `CHO_THANH_TRA_BIET` → chỉ Thanh tra thấy và có AuditLog.
- TC-ALL-01: ma trận quyền và IDOR cho 10 vai trò; tệp xuất và thống kê của 3 vai trò mới không chứa định danh sinh viên (BR-67).

## G. CHÈN VÀO KẾ HOẠCH 15 TUẦN (đã xong tuần 6, chuẩn bị tuần 7)

**G1. Việc bù (làm trọn trong phiên này rồi dừng; nếu khối lượng vượt dự kiến thì báo người dùng và đề xuất tách đôi):**
1. Cập nhật tài liệu (Mục I).
2. Enum vai trò và migration cho 3 vai trò mới; cập nhật `can()`; tài khoản seed.
3. Chuyển quyền CRUD danh mục và import (tuần 5) từ ADMIN sang PHONG_DAO_TAO: policy, menu, test (FR-140, TC-PDT-01); khóa/mở khóa học kỳ (FR-141).
4. `docs/MA_TRAN_QUYEN.md` và test ma trận quyền cho phần đã có chức năng (FR-160, TC-ALL-01 một phần).
5. Bổ sung vào trình soạn mẫu phiếu đã làm ở tuần 6: cờ `isAssessmentGroup` cho nhóm tiêu chí (migration, ô chọn trong form nhóm, hiển thị ở màn xem trước); mẫu mặc định có 1 nhóm "Kiểm tra, đánh giá" mang cờ này (FR-148, E3). Mẫu đã khóa trước đó giữ nguyên, không tự đổi.

**G2. Chèn vào các tuần:**
- **Tuần 7 (đợt khảo sát):** trạng thái `CHO_XAC_NHAN_DL`, kiểm tra sẵn sàng, xác nhận/trả về, cảnh báo lệch (FR-142, 143, 144; TC-PDT-02, 03); `ImportBatch` (FR-145, P1; tuần này nặng nên chỉ làm nếu còn thời gian).
- **Tuần 8:** không thêm gì (tuần nặng về nộp phiếu ẩn danh).
- **Tuần 9 (tổng hợp, công bố):** Khảo thí xem kết quả gộp (FR-150, BR-57, TC-KT-01).
- **Tuần 10 (phản hồi lõi):** 8 loại phản hồi và định tuyến mới (E4); hàng đợi PĐT, Khảo thí (FR-146, FR-149); form `KHIEU_NAI_NGHIEM_TRONG` với cảnh báo và mức độ danh tính (FR-153); tạo hồ sơ `TIEP_NHAN`, loại người xung đột (FR-155, BR-61).
- **Tuần 11 (phản hồi nâng cao):** hồ sơ Thanh tra từ xác minh đến kết luận và thông báo (FR-154, 156); hạn xử lý và leo thang cho 3 vai trò; chuyển hồ sơ từ vai trò khác (FR-157, P1); kiến nghị rà soát của Khảo thí (FR-152, P1).
- **Tuần 12 (dashboard):** dashboard cho 3 vai trò (FR-147, FR-151, FR-159, P1); cảnh báo bất thường khảo sát (FR-158, P1); mở rộng UC-GOLD với nhánh xác nhận dữ liệu, nhánh phản hồi thi và nhánh hồ sơ Thanh tra.
- **Tuần 13:** chạy đủ bộ test ở Mục F; rà soát xung đột lợi ích và rò rỉ định danh.
- **Tuần 14:** hướng dẫn sử dụng cho từng vai trò mới (có ảnh).
- **Tuần 15:** báo cáo thêm mục tác nhân, bảng use case theo tác nhân, slide có sơ đồ 10 tác nhân; mục hạn chế (Thanh tra chỉ ghi nhận ở mức quản lý; Khảo thí không thay phúc khảo; ẩn danh ở mức ứng dụng).

**G3. Nếu chậm, cắt theo thứ tự (người dùng quyết):** cảnh báo bất thường khảo sát (FR-158) → kiến nghị rà soát (FR-152) → lô nhập (FR-145) → các thống kê P1 (FR-147, 151, 159) → chuyển hồ sơ (FR-157). **Không cắt lát cắt P0 của cả 3 tác nhân**, để mỗi tác nhân còn một quy trình thật trong bản demo. Nếu buộc phải cắt thêm, báo người dùng trước; hệ thống tối thiểu phải còn 8 vai trò.

## H. RANH GIỚI ĐỀ TÀI (KHÔNG LÀM)

Không quản lý điểm số, phúc khảo, lịch thi chính thức, kỷ luật, cơ sở vật chất, thiết bị, công tác sinh viên, cố vấn học tập, chương trình đào tạo đầy đủ. Ba tác nhân mới chỉ dùng để cung cấp dữ liệu khảo sát, dùng kết quả khảo sát, và xử lý phản hồi của sinh viên về môn học theo đúng các luồng ở Mục D.

## I. VIỆC LÀM NGAY KHI NHẬN PROMPT NÀY

1. Trả lời tối đa 5 dòng: xác nhận hiểu, nêu trạng thái hiện tại (tuần 1-6 đã xong, chờ tuần 7), và đã xác minh trạng thái repo chưa.
2. Lưu nguyên văn prompt bổ sung này vào `docs/BO_SUNG_01_TAC_NHAN.md`.
3. Cập nhật tài liệu: `docs/DAC_TA_NGHIEP_VU.md` (Mục 4, 5.2, 5.5, 5.8, 6, 7 theo Mục E), `docs/KE_HOACH_15_TUAN.md` (theo Mục G), `docs/PROGRESS.md` (thêm FR-140 đến FR-160 và BR-50 đến BR-68 kèm tuần dự kiến), `docs/TRUY_VET.md` (thêm mã test ở Mục F), `docs/PROJECT_STATE.md`, `docs/AI_USAGE.md`, và `AGENTS.md` (theo E10).
4. Tạo bản nháp `docs/MA_TRAN_QUYEN.md`.
5. Làm việc bù (G1) rồi **dừng**. Không làm phạm vi tuần 7 hay các tuần sau cho tới khi người dùng gõ `BẮT ĐẦU TUẦN 7`.
6. Kết thúc bằng BÁO CÁO PHIÊN: file đã sửa, mâu thuẫn phát hiện (nếu có), kết quả `npm run check` chạy thật, và tác động tiến độ (ghi rõ là ước lượng).

=== HẾT PROMPT BỔ SUNG ===
