> Điều chỉnh số 01 đã được người dùng yêu cầu áp dụng. Phần thay đổi theo [prompt bổ sung nguyên văn](BO_SUNG_01_TAC_NHAN.md); các quy tắc ẩn danh và bảo mật không nêu thay đổi vẫn giữ nguyên. Phạm vi triển khai hiện tại chỉ là việc bù G1 sau Tuần 6; chưa bắt đầu Tuần 7.

## 3\. BỐI CẢNH ĐỀ TÀI

**Vấn đề.** Trường đại học phải lấy ý kiến người học về môn học và giảng viên mỗi học kỳ phục vụ đảm bảo chất lượng. Làm bằng giấy hoặc Google Form thì khó kiểm soát ai đã làm, khó giữ ẩn danh, khó tổng hợp theo lớp/bộ môn/khoa, và ý kiến sinh viên thường không được xử lý đến nơi đến chốn.

**Giải pháp.** Một website hỗ trợ trọn vòng đời: thiết kế mẫu phiếu, lập và phê duyệt đợt khảo sát, sinh viên làm khảo sát ẩn danh, tổng hợp và công bố kết quả có ngưỡng bảo vệ, kiểm duyệt góp ý, giảng viên giải trình cải tiến; song song là kênh phản hồi/góp ý liên tục của sinh viên với quy trình xử lý, thời hạn và leo thang.

**Ví dụ thực tiễn để hiểu nghiệp vụ** (chỉ để tham khảo, KHÔNG phải quy định của trường mình, nhóm tự kiểm chứng lại nguồn trước khi trích dẫn):

* Phòng đảm bảo chất lượng lập kế hoạch khảo sát mỗi học kỳ rồi trình lãnh đạo trường phê duyệt trước khi triển khai (ví dụ quy trình QT.KT\&ĐBCL.06, Trường ĐH Lâm nghiệp).
* Danh sách sinh viên lấy từ phòng đào tạo, khảo sát trực tuyến trong một khoảng thời gian cố định có thông báo (ví dụ ĐH Công nghệ Thông tin, ĐHQG-HCM).
* Khoa/viện theo dõi và nhắc sinh viên chưa tham gia (ví dụ ĐH Thủ Dầu Một).
* Có trường yêu cầu hoàn thành khảo sát trước khi xem điểm (ví dụ ĐH Kinh tế, ĐHQGHN).
* Phiếu thường có phần thông tin chung và các nhóm tiêu chí đánh giá; có nơi đặt mục tiêu số phiếu tối thiểu cho mỗi môn.

Mọi con số, ngưỡng, thời hạn trong đặc tả là **giá trị mặc định và phải cấu hình được**.

**Trong phạm vi:** toàn bộ chức năng ở Mục 7 theo mức ưu tiên.
**Ngoài phạm vi:** kết nối thật với hệ thống đào tạo/điểm/đăng nhập một lần của trường (chỉ import Excel/CSV và thiết kế sẵn điểm mở rộng), ứng dụng di động native, thanh toán, đa ngôn ngữ ngoài tiếng Việt.

## 4\. VAI TRÒ NGƯỜI DÙNG VÀ PHÂN QUYỀN

Mô hình: mỗi người dùng có một hoặc nhiều **gán vai trò** gồm vai trò và **phạm vi** (toàn hệ thống, khoa, hoặc bộ môn). Cùng một cơ chế policy cho mọi vai trò; không viết kiểm quyền rời rạc.

1. **SINH\_VIEN:** thấy các khảo sát đang mở của lớp học phần mình đã đăng ký; làm khảo sát; gửi, theo dõi và trao đổi phản hồi của mình; đánh giá mức hài lòng sau xử lý. Không xem kết quả tổng hợp.
2. **GIANG\_VIEN:** xem kết quả các lớp mình phụ trách (khi đã công bố và đủ mẫu); xem và trả lời phản hồi gửi đến mình; viết giải trình/kế hoạch cải tiến.
3. **TRUONG\_BO\_MON** (phạm vi bộ môn): xem kết quả, phản hồi, giải trình trong bộ môn; xác nhận giải trình; xử lý phản hồi được định tuyến hoặc leo thang lên bộ môn; xem danh sách sinh viên chưa hoàn thành (không xem nội dung trả lời).
4. **TRUONG\_KHOA** (phạm vi khoa): như trên ở cấp khoa; nhận leo thang cấp khoa.
5. **CAN_BO_DBCL** (toàn hệ thống): thiết kế mẫu phiếu, lập/trình đợt khảo sát, theo dõi tiến độ, đóng/gia hạn, tổng hợp, kiểm duyệt góp ý, công bố và xuất báo cáo. Xử lý phản hồi `KHAC` (gồm phòng học/thiết bị), là tầng leo thang, được chuyển phản hồi sang Thanh tra theo BR-64; không xem hồ sơ Thanh tra. Không còn quyền ghi dữ liệu đào tạo chỉ nhờ gán ĐBCL.
6. **LANH_DAO** (toàn hệ thống): phê duyệt/từ chối đợt sau xác nhận dữ liệu của PĐT, xem dashboard; với hồ sơ Thanh tra chỉ xem loại/trạng thái/kết luận/số liệu tóm tắt, không xem nội dung.
7. **ADMIN** (toàn hệ thống): chỉ quản lý khoa/bộ môn, tài khoản, vai trò, cấu hình và nhật ký; bắt buộc 2FA. Không thao tác dữ liệu đào tạo chỉ nhờ gán ADMIN, không xem dữ liệu nghiệp vụ nhạy cảm hoặc hồ sơ Thanh tra (BR-68).
8. **PHONG_DAO_TAO** (toàn hệ thống, giới hạn dữ liệu đào tạo): chủ sở hữu học kỳ/môn/lớp/phân công/đăng ký/hồ sơ SV-GV phục vụ khảo sát, import; kiểm tra sẵn sàng và xác nhận/trả về đối tượng khảo sát; tiếp nhận `TO_CHUC_LOP_HOC`. Không xem kết quả chi tiết hay phản hồi ngoài loại được giao.
9. **PHONG_KHAO_THI** (toàn hệ thống, giới hạn nghiệp vụ thi): tiếp nhận `THI_KET_THUC_HOC_PHAN`; sau công bố chỉ xem nhóm đánh giá có cờ, gộp theo môn/bộ môn/khoa và đủ ngưỡng BR-57; gửi kiến nghị rà soát. Không xem theo lớp/giảng viên hoặc tự luận, không lưu điểm hay thay quy trình phúc khảo.
10. **THANH_TRA** (toàn hệ thống, giới hạn hồ sơ mật): tiếp nhận/xác minh/kết luận/thông báo khiếu nại nghiêm trọng, giám sát chỉ số bất thường khảo sát. Xung đột lợi ích ưu tiên từ chối kể cả khi có thêm gán Thanh tra. Không thay quy trình kỷ luật/thanh tra chính thức.

Đây là 10 vai trò chức năng, không gắn tên trường cụ thể; không có vai trò Cố vấn học tập hoặc phạm vi lớp sinh hoạt. Phạm vi hợp lệ vẫn chỉ GLOBAL/FACULTY/DEPARTMENT. Ma trận chi tiết ở [MA_TRAN_QUYEN](MA_TRAN_QUYEN.md). Các chức năng tương lai dưới đây là đặc tả, không phải xác nhận đã hiện thực.

## 5\. MÔ HÌNH NGHIỆP VỤ

### 5.1 Kịch bản xuyên suốt (UC-GOLD, phải chạy được từ đầu đến cuối vào tuần 12 và có E2E test)

1. CAN\_BO\_DBCL tạo mẫu phiếu v1 và lập đợt khảo sát cho một học kỳ (phạm vi: một khoa).
2. CAN_BO_DBCL trình sang CHO_XAC_NHAN_DL; PĐT kiểm tra và xác nhận dữ liệu trước khi LANH_DAO phê duyệt.
3. Đến giờ mở, hệ thống chốt danh sách đăng ký và tạo nhiệm vụ khảo sát cho từng (sinh viên, lớp học phần).
4. Sinh viên đăng nhập, thấy các khảo sát cần làm, nộp ẩn danh.
5. Hết hạn, đợt tự đóng; hệ thống tổng hợp; CAN\_BO\_DBCL kiểm duyệt góp ý tự luận rồi công bố.
6. Giảng viên xem kết quả lớp mình; lớp có điểm thấp phát sinh yêu cầu giải trình; giảng viên nộp giải trình; trưởng bộ môn xác nhận.
7. Song song, sinh viên gửi phản hồi ẩn danh về giảng dạy; hệ thống định tuyến cho giảng viên; giảng viên trả lời; sinh viên đánh giá hài lòng; phản hồi đóng. Phản hồi quá hạn tự leo thang lên cấp trên.
8. Lãnh đạo và ĐBCL xem dashboard, xuất báo cáo.

### 5.2 Máy trạng thái: Đợt khảo sát

`NHAP → CHO_XAC_NHAN_DL → CHO_DUYET → DA_DUYET → DANG_MO → DA_DONG → DA_TONG_HOP → DA_CONG_BO → LUU_TRU`

* NHAP → CHO_XAC_NHAN_DL: CAN_BO_DBCL trình (kiểm tra có mẫu phiếu, phạm vi, thời gian hợp lệ).
* CHO_XAC_NHAN_DL → CHO_DUYET: PHONG_DAO_TAO xác nhận theo BR-52 sau khi hết lỗi CHẶN; cảnh báo cần ghi chú. PĐT trả về NHAP bắt buộc có lý do. Lưu bản chụp xác nhận và mã băm; lúc mở xử lý lệch theo BR-53.
* CHO\_DUYET → DA\_DUYET: LANH\_DAO duyệt. CHO\_DUYET → NHAP: LANH\_DAO từ chối (bắt buộc lý do).
* DA\_DUYET → DANG\_MO: tự động khi đến giờ mở; **chốt danh sách và tạo nhiệm vụ** tại thời điểm này.
* DANG\_MO → DA\_DONG: tự động khi hết hạn, hoặc đóng sớm (CAN\_BO\_DBCL, có lý do).
* DA\_DONG → DA\_TONG\_HOP: chạy tổng hợp kết quả.
* DA\_TONG\_HOP → DA\_CONG\_BO: CAN\_BO\_DBCL công bố sau khi kiểm duyệt.
* DA\_CONG\_BO → LUU\_TRU: khi học kỳ khóa sổ.
* Hủy (HUY) được phép từ NHAP, CHO_XAC_NHAN_DL, CHO_DUYET, DA_DUYET (có lý do), không được sau khi đã mở.
* Mọi chuyển trạng thái phải **idempotent và an toàn khi chạy đồng thời** (cập nhật có điều kiện theo trạng thái cũ), và ghi lịch sử.

### 5.3 Máy trạng thái: Phản hồi/góp ý

`MOI → DA\_TIEP\_NHAN → DANG\_XU\_LY → DA\_TRA\_LOI → DA\_DONG`

* Rẽ nhánh: `CHUYEN\_TIEP` (chuyển người xử lý khác, bắt buộc lý do, quay về MOI ở người nhận), `TU\_CHOI` (ngoài phạm vi/spam, bắt buộc lý do), `MO\_LAI` (từ DA\_DONG về DANG\_XU\_LY, tối đa 1 lần, trong 7 ngày, khi sinh viên đánh giá hài lòng ≤ 2).
* Quá hạn SLA là **thuộc tính** (cờ), không phải trạng thái.
* Lịch sử chuyển trạng thái bất biến (ai, khi nào, từ đâu đến đâu, ghi chú).

### 5.4 Máy trạng thái: Giải trình cải tiến

`CAN\_GIAI\_TRINH → DA\_GUI → CAN\_BO\_SUNG → DA\_XAC\_NHAN` (giảng viên gửi; trưởng bộ môn xác nhận hoặc yêu cầu bổ sung kèm nhận xét).

### 5.5 Mẫu phiếu và phiên bản

Mẫu phiếu gồm các **nhóm tiêu chí**, mỗi nhóm có **câu hỏi**. Loại câu hỏi: thang điểm Likert (mặc định 1-5, cấu hình 1-4/1-5), chọn một, chọn nhiều, tự luận, Có/Không. Mỗi câu có: bắt buộc hay không, cho phép "Không áp dụng" hay không, trọng số. Mỗi nhóm có trọng số và cờ `isAssessmentGroup` mặc định false do CAN_BO_DBCL đặt. Mẫu mặc định có một nhóm **Kiểm tra, đánh giá** mang cờ này; mẫu đã khóa trước đó giữ nguyên, muốn thay đổi tạo phiên bản hoặc họ mới. Trong schema hiện có, nhóm tiêu chí tên `CriterionGroup` (cùng khái niệm `QuestionGroup` ở điều chỉnh). Mẫu có **phiên bản**; khi đã gắn vào một đợt được duyệt thì **khóa**, muốn đổi phải tạo phiên bản mới.

### 5.6 Thiết kế ẩn danh (quan trọng nhất của phần khảo sát)

Yêu cầu: hệ thống biết ai **đã/chưa** làm (để chặn trùng, nhắc nhở) nhưng **không thể** biết ai trả lời gì.

* `SurveyTask`: (campaignId, sectionId, studentId, status PENDING|DONE, doneDate là ngày, không lưu giờ). Unique (campaignId, sectionId, studentId).
* `SurveyResponse`: id UUID, campaignId, sectionId, submittedDate (chỉ ngày). **Không có** studentId, taskId, IP, User-Agent. `SurveyAnswer`: id UUID, responseId, questionId, giá trị số/văn bản/lựa chọn, trạng thái kiểm duyệt.
* Nộp phiếu là **một transaction**: cập nhật có điều kiện task PENDING → DONE (số dòng ảnh hưởng phải bằng 1), chèn response và answers; lỗi thì rollback toàn bộ. Không ghi log chứa nội dung phiếu hoặc định danh.
* Không dùng id tăng dần cho response/answer; khi hiển thị/xuất thì trộn thứ tự; không hiển thị thời điểm nộp chính xác.
* Bản nháp lưu phía trình duyệt (localStorage), **không lưu nháp ở máy chủ**.
* Test bắt buộc: (a) kiểm tra schema (Prisma DMMF) rằng không có đường quan hệ nào từ SurveyResponse/SurveyAnswer tới User/SurveyTask; (b) nộp lần 2 bị từ chối; (c) 20 request đồng thời cho cùng một task chỉ tạo đúng 1 response; (d) mọi file xuất không chứa định danh.
* Phải ghi trong báo cáo phần **hạn chế**: ẩn danh ở mức ứng dụng; người có quyền hạ tầng (DB, log) vẫn có thể suy luận; lớp ít sinh viên dễ bị suy đoán nên có ngưỡng công bố (BR-07).

### 5.7 Tổng hợp điểm và công bố

* Điểm câu = trung bình các giá trị hợp lệ (bỏ "Không áp dụng"/bỏ trống).
* Điểm nhóm = Σ(trọng số câu × điểm câu) / Σ(trọng số câu) chỉ trên các câu có ít nhất 1 giá trị hợp lệ.
* Điểm tổng = Σ(trọng số nhóm × điểm nhóm) / Σ(trọng số nhóm). Tính đủ độ chính xác, **chỉ làm tròn 2 chữ số khi hiển thị/lưu kết quả cuối**.
* Tỉ lệ tham gia = số task DONE / tổng số task của lớp học phần.
* Xếp mức (mặc định, cấu hình được): ≥ 4.5 Rất tốt; ≥ 4.0 Tốt; ≥ 3.0 Đạt; ≥ 2.0 Cần cải thiện; còn lại Kém. Ngưỡng cảnh báo giải trình mặc định: điểm tổng < 3.0.
* So sánh: điểm trung bình bộ môn, khoa (tính trên toàn bộ phiếu), học kỳ trước nếu có.
* **Ví dụ kiểm thử TC-AGG-01:** Nhóm A (trọng số 2) có Q1 (trọng số 1) giá trị \[5,4,4,5] và Q2 (trọng số 2) giá trị \[3,4,5,NA]; nhóm B (trọng số 1) có Q3 (trọng số 1) giá trị \[4,4,4,4]. Kỳ vọng: Q1 = 4.50; Q2 = 4.00; nhóm A = 12.5/3 ≈ 4.17; nhóm B = 4.00; điểm tổng = (2×4.1667 + 1×4.0)/3 ≈ 4.11. Với 10 task, 4 DONE thì tỉ lệ tham gia = 40%.

### 5.8 Định tuyến và thời hạn xử lý phản hồi (mặc định, cấu hình được)

| Loại phản hồi | Người nhận chính | Giới hạn và leo thang |
| --- | --- | --- |
| GIANG_DAY | Giảng viên phụ trách lớp | Khiếu nại đồng gửi trưởng bộ môn; chuỗi GV → TBM → TK → ĐBCL |
| NOI_DUNG_DE_CUONG | Trưởng bộ môn | Theo phạm vi bộ môn, chuỗi nghiệp vụ hiện có |
| TAI_LIEU | Giảng viên | Chuỗi GV → TBM → TK → ĐBCL |
| KIEM_TRA_DANH_GIA | Giảng viên, đồng gửi trưởng bộ môn | Kiểm tra thường xuyên/giữa kỳ/thành phần; không chuyển mặc định sang Khảo thí |
| THI_KET_THUC_HOC_PHAN | PHONG_KHAO_THI | KHAO_THI → ĐBCL → LÃNH ĐẠO; không thay đơn phúc khảo |
| TO_CHUC_LOP_HOC | PHONG_DAO_TAO | Lịch/xếp/trùng lịch/sĩ số/đăng ký; PĐT → ĐBCL → LÃNH ĐẠO |
| KHIEU_NAI_NGHIEM_TRONG | THANH_TRA | Mức độ cố định, chống spam BR-26; Thanh tra → Lãnh đạo ở mức tóm tắt |
| KHAC | CAN_BO_DBCL | Gồm phòng học/thiết bị; ĐBCL → LÃNH ĐẠO |

* Mức độ phản hồi thường: GOP_Y, DE_XUAT, KHIEU_NAI. Khiếu nại thường thuộc GV/TBM đồng gửi trưởng bộ môn; hồ sơ nghiêm trọng áp dụng BR-61/62 nên không gửi cho người xung đột.
* SLA ngày làm việc (loại trừ thứ Bảy/Chủ nhật), cấu hình được: phản hồi thường tiếp nhận ≤2, trả lời ≤7 (KHIEU_NAI ≤5); PĐT và Khảo thí tiếp nhận ≤2/trả lời ≤5; Thanh tra tiếp nhận ≤3/hoàn tất ≤30. Quá hạn gắn cờ và leo thang đúng chuỗi, không coi quá hạn là trạng thái mới.
* Phản hồi ẩn danh vẫn trao đổi/thông báo đúng sinh viên, người xử lý chỉ thấy Sinh viên ẩn danh. Hồ sơ nghiêm trọng chọn AN_DANH_HOAN_TOAN mặc định hoặc CHO_THANH_TRA_BIET theo BR-63; báo cáo giữ hạn chế ẩn danh ở mức ứng dụng.
* Đây là thiết kế Tuần10–11. G1 chỉ điều chỉnh enum đã tồn tại và tài liệu; chưa có hàng đợi/định tuyến nghiệp vụ mới.

### 5.9 Dữ liệu và quy trình bổ sung theo lộ trình

* `CampaignDataConfirmation`: đợt, DA_XAC_NHAN/TRA_VE, người/thời điểm, mã băm SHA-256, số lớp/cặp, cảnh báo JSON, lý do trả về (Tuần7).
* `Feedback`: tám loại trên, `identityLevel` cho loại nghiêm trọng và lớp học phần liên quan. Không thêm quan hệ từ vùng SurveyResponse/SurveyAnswer sang User/SurveyTask (Tuần10).
* `InspectionCase`, `InspectionCaseNote`, `InspectionCaseEvent`: hồ sơ mật, ghi chú nội bộ và lịch sử chỉ thêm. Nguồn SV/chuyển từ phản hồi/BAT_THUONG_KHAO_SAT; trạng thái TIEP_NHAN → XAC_MINH → KET_LUAN → THONG_BAO → DONG; rẽ nhánh TU_CHOI/CHUYEN_LAI tại tiếp nhận, bắt buộc lý do. Kết luận CO_CAN_CU/KHONG_CAN_CU/KHONG_DU_THONG_TIN/CHUYEN_DON_VI_KHAC. Khởi tạo và guard xung đột Tuần10, quy trình hoàn tất Tuần11.
* `SurveyAnomalyFlag`: đợt/lớp/mã luật/chỉ số JSON/trạng thái/decision/người/ghi chú; chỉ số bất thường không tự ngăn công bố hoặc kết luận đúng sai (Tuần12).
* `ExamReviewRecommendation` (Tuần11, P1): DA_GUI → DA_PHAN_HOI; TBM chọn DA_TIEP_THU/KHONG_TIEP_THU kèm lý do, mặc định14ngày; quá hạn nhắc TBM và báo TK.
* `ImportBatch` (Tuần7, P1): NHAP → DA_AP_DUNG → DA_HOAN_TAC; chỉ hoàn tác khi chưa bị đợt chốt dùng.
* Xung đột lợi ích tính động từ lớp → giảng viên → bộ môn → khoa trong một policy chung; không suy quyền xem hồ sơ từ menu hoặc vai trò quản trị. Các model/lịch sử tương lai không tự được nghiệm thu bởi thiết kế/seed.

## 6\. QUY TẮC NGHIỆP VỤ (BR)

Mỗi quy tắc phải có ít nhất một test tên gắn mã quy tắc (ví dụ `BR-02 chặn nộp trùng`). P0 = bắt buộc, P1 = cần cho dùng thật, P2 = mở rộng.

**Khảo sát**

* BR-01 [P0] Đối tượng khảo sát lấy từ dữ liệu đào tạo do PHONG_DAO_TAO quản lý và được xác nhận theo BR-52. Khi DANG_MO, chốt danh sách hiện tại/tạo SurveyTask; nếu mã băm lệch so xác nhận vẫn chốt đúng lúc, audit và cảnh báo PĐT/ĐBCL theo BR-53. Thay đổi sau chốt không đổi nhiệm vụ.
* BR-02 \[P0] Mỗi sinh viên nộp tối đa 1 phiếu cho mỗi (đợt, lớp học phần); nộp xong không sửa/xóa. Chặn trùng ở tầng DB và chịu được thao tác đồng thời.
* BR-03 \[P0] Ẩn danh theo thiết kế ở Mục 5.6.
* BR-04 \[P0] Chỉ nộp được khi đợt đang DANG\_MO và giờ máy chủ nằm trong \[bắt đầu, kết thúc]; câu bắt buộc phải có trả lời; giá trị phải đúng loại câu hỏi và thang điểm.
* BR-05 \[P0] Mẫu phiếu có phiên bản và bị khóa khi đã gắn vào đợt được duyệt.
* BR-06 \[P0] Đợt phải được LANH\_DAO duyệt trước khi mở; từ chối bắt buộc có lý do; không đổi mẫu/phạm vi sau khi đã duyệt (muốn đổi thì rút về NHAP); sau khi mở chỉ được gia hạn thời gian đóng, có lý do, ghi nhật ký và thông báo cho sinh viên.
* BR-07 \[P0] Chỉ công bố kết quả của một lớp khi số phiếu ≥ minResponses (mặc định 5) **và** tỉ lệ tham gia ≥ minRate (mặc định 30%), cấu hình theo đợt. Không đủ mẫu thì hiển thị "Chưa đủ mẫu để công bố"; số liệu chỉ được xem ở dạng gộp cấp bộ môn/khoa bởi vai trò có quyền.
* BR-08 [P0] Giảng viên/trưởng đơn vị chỉ xem kết quả sau DA_CONG_BO và đủ mẫu; ĐBCL/Lãnh đạo xem từ DA_TONG_HOP. Khảo thí chỉ xem dữ liệu gộp theo BR-57 từ DA_CONG_BO; Thanh tra chỉ xem chỉ số bất thường theo BR-65 từ DA_TONG_HOP.
* BR-09 \[P1] Góp ý tự luận phải qua kiểm duyệt trước khi giảng viên/trưởng đơn vị thấy: CHO\_KIEM\_DUYET → HIEN\_THI hoặc DA\_AN; từ khóa nhạy cảm (danh sách cấu hình) tự gắn cờ; ghi người kiểm duyệt và lý do.
* BR-10 \[P1] Lớp có điểm tổng < ngưỡng cảnh báo thì tự tạo yêu cầu giải trình bắt buộc cho giảng viên trong N ngày (mặc định 14); trưởng bộ môn xác nhận hoặc yêu cầu bổ sung.
* BR-11 \[P0] Công thức tính điểm theo Mục 5.7.
* BR-12 \[P0] Tỉ lệ tham gia theo Mục 5.7.
* BR-13 \[P1] CAN\_BO\_DBCL, trưởng khoa, trưởng bộ môn xem được **danh sách sinh viên chưa hoàn thành** (chỉ trạng thái, không có nội dung trả lời) để nhắc nhở; mỗi lần xem/xuất đều ghi nhật ký; nhắc tự động tối đa 1 lần/ngày/sinh viên/đợt.
* BR-14 \[P2] Cờ "bắt buộc hoàn thành": cung cấp API/tệp trạng thái hoàn thành để hệ thống điểm của trường dùng; không tích hợp thật.
* BR-15 \[P1] Đóng sớm/gia hạn chỉ do CAN\_BO\_DBCL, có lý do, ghi nhật ký.
* BR-16 \[P1] Một đợt áp dụng cho nhiều lớp học phần; lớp có nhiều giảng viên được đánh giá ở mức lớp (P2: đánh giá riêng từng giảng viên).
* BR-17 [P1] Học kỳ khóa sổ thì dữ liệu chỉ đọc, không tạo đợt/phản hồi mới. Khóa/mở khóa do PĐT theo BR-51; mở khóa có lý do, audit và thông báo ĐBCL.
* BR-18 [P0] ADMIN không xem kết quả khảo sát, nội dung phản hồi và hồ sơ Thanh tra; mở rộng theo BR-68, không suy quyền nghiệp vụ nhạy cảm từ quyền quản trị.

**Phản hồi**

* BR-20 \[P0] Sinh viên chỉ gửi phản hồi cho lớp học phần mình đã/đang đăng ký trong học kỳ hiện hành hoặc học kỳ liền trước (cấu hình).
* BR-21 \[P0] Định tuyến tự động theo Mục 5.8; có thể chuyển tiếp kèm lý do; mọi lần chuyển được lưu lịch sử.
* BR-22 \[P0] Chỉ cho phép các chuyển trạng thái hợp lệ ở Mục 5.3, bởi đúng vai trò; lịch sử bất biến.
* BR-23 \[P1] SLA, cờ quá hạn và leo thang theo Mục 5.8, chạy bằng job idempotent.
* BR-24 \[P0] Ẩn danh với người xử lý nếu sinh viên chọn (P2: quy trình tiết lộ danh tính khi có vi phạm: chỉ CAN\_BO\_DBCL, có lý do, ghi nhật ký).
* BR-25 \[P1] Sau khi DA\_TRA\_LOI, sinh viên đánh giá hài lòng 1-5 trong 7 ngày; ≤ 2 cho phép mở lại 1 lần.
* BR-26 \[P1] Chống spam: tối đa N phản hồi/ngày/sinh viên (mặc định 5); cảnh báo nội dung trùng trong 24 giờ.
* BR-27 \[P1] Người kiểm duyệt có thể ẩn hoặc khóa nội dung vi phạm, ghi lý do.
* BR-28 \[P0] Tệp đính kèm: tối đa 3 tệp, mỗi tệp ≤ 5 MB, chỉ PNG/JPG/PDF; kiểm tra phần mở rộng **và** nội dung thực (magic bytes); đổi tên ngẫu nhiên; tải xuống qua route có kiểm quyền, không để trong thư mục public.

**Hệ thống và bảo mật**

* BR-30 \[P0] Mọi thao tác nhạy cảm ghi AuditLog (ai, khi nào, hành động, đối tượng, tóm tắt thay đổi). Không ghi mật khẩu, token, nội dung phiếu.
* BR-31 \[P0] Mật khẩu băm bcrypt; phiên dùng JWT theo Mục 8.3.
* BR-32 \[P0] ADMIN bắt buộc xác thực hai bước (Mục 8.4).
* BR-33 \[P0] Khóa tạm tài khoản sau 5 lần đăng nhập sai trong 15 phút; thông báo lỗi chung chung, không tiết lộ tài khoản có tồn tại hay không.
* BR-34 \[P0] Mọi truy vấn theo ID đều kiểm quyền ở tầng service/dữ liệu (chống IDOR).
* BR-35 \[P2] Chính sách lưu trữ: cấu hình số năm giữ dữ liệu, script ẩn danh hóa/xóa dữ liệu hết hạn.

**Điều chỉnh số 01 — BR-50 đến BR-68**

* **BR-50 [P0]** Dữ liệu đào tạo (học kỳ, môn học, lớp học phần, phân công giảng viên, đăng ký học phần, hồ sơ SV/GV) chỉ do PHONG_DAO_TAO tạo, sửa, xóa, import. Các vai trò khác chỉ đọc theo phạm vi hoặc không thấy. Mọi thay đổi ghi AuditLog. Tài khoản đăng nhập vẫn do ADMIN tạo/khóa; nếu import ở tuần 5 đang tự tạo tài khoản thì giữ nguyên hành vi đó nhưng ghi nhận người thực hiện là PĐT.

* **BR-51 [P0]** Khóa/mở khóa sổ học kỳ chỉ do PĐT thực hiện (cơ chế khóa theo BR-17 của prompt chính). Mở khóa bắt buộc có lý do, ghi nhật ký và thông báo CAN_BO_DBCL.

* **BR-52 [P0]** Trước khi đợt khảo sát từ `CHO_XAC_NHAN_DL` sang `CHO_DUYET`, hệ thống chạy **kiểm tra sẵn sàng** trên phạm vi của đợt, rồi PĐT xác nhận hoặc trả về. Các luật kiểm tra (mã RS, ngưỡng cấu hình được):
  - RS-01 **CHẶN**: lớp học phần chưa có giảng viên phụ trách.
  - RS-02 **CHẶN**: lớp học phần chưa có sinh viên đăng ký.
  - RS-03 **CHẶN**: học kỳ của đợt đã khóa sổ.
  - RS-04 CẢNH BÁO: lớp có từ 2 giảng viên trở lên (đánh giá ở mức lớp theo BR-16).
  - RS-05 CẢNH BÁO: lớp có số sinh viên đăng ký nhỏ hơn `minResponses` của đợt (kết quả chắc chắn không đủ mẫu để công bố theo BR-07).
  - RS-06 CẢNH BÁO: sinh viên chưa có tài khoản hoạt động hoặc thiếu email (sẽ không nhận được nhắc).
  - Còn lỗi CHẶN thì không được xác nhận; cảnh báo thì được xác nhận kèm ghi chú. Lưu **bản chụp xác nhận**: số lớp, số cặp (sinh viên, lớp học phần), mã băm SHA-256 của danh sách đã sắp xếp, người xác nhận, thời điểm, danh sách cảnh báo.

* **BR-53 [P0]** Khi đợt chuyển sang `DANG_MO`, tính lại mã băm. Nếu khác lúc xác nhận thì **vẫn chốt danh sách theo dữ liệu hiện tại** (để không trễ lịch) nhưng ghi nhật ký và gửi cảnh báo "dữ liệu thay đổi sau khi xác nhận" cho PĐT và CAN_BO_DBCL. Thay đổi dữ liệu sau thời điểm chốt không làm đổi các `SurveyTask` đã tạo (BR-01).

* **BR-54 [P0]** Phản hồi `TO_CHUC_LOP_HOC` chuyển cho PĐT; tiếp nhận ≤ 2 và trả lời ≤ 5 ngày làm việc; quá hạn leo thang PĐT → CAN_BO_DBCL → LANH_DAO. PĐT được chuyển tiếp (kèm lý do) sang giảng viên hoặc trưởng bộ môn khi nội dung thuộc chuyên môn của họ.

* **BR-55 [P1]** Lô nhập (`ImportBatch`): mỗi lần import ghi tên tệp, mã băm, số dòng hợp lệ/lỗi, người nhập; trạng thái `NHAP → DA_AP_DUNG → DA_HOAN_TAC`. Chỉ hoàn tác được khi dữ liệu của lô chưa được đợt khảo sát nào chốt dùng.

* **BR-56 [P0]** Phản hồi `THI_KET_THUC_HOC_PHAN` chuyển cho PHONG_KHAO_THI; tiếp nhận ≤ 2 và trả lời ≤ 5 ngày làm việc; quá hạn leo thang KHAO_THI → CAN_BO_DBCL → LANH_DAO. Khi sinh viên chọn loại này, giao diện hiện nhắc (nội dung nhắc cấu hình được): "Phản hồi này không thay thế đơn phúc khảo theo quy chế; xem hướng dẫn của Phòng Khảo thí". **Hệ thống không lưu điểm và không giải quyết phúc khảo thay quy trình chính thức.** Khảo thí được chuyển tiếp (kèm lý do) sang giảng viên hoặc trưởng bộ môn nếu nội dung thuộc chuyên môn đề thi.

* **BR-57 [P0]** Nhóm tiêu chí trong mẫu phiếu có cờ `isAssessmentGroup` (do CAN_BO_DBCL đặt ở trình soạn mẫu). Sau khi đợt `DA_CONG_BO`, Khảo thí xem **điểm của các nhóm có cờ này, gộp theo môn học, bộ môn, khoa**. Quy tắc bảo vệ: chỉ hiển thị khi số liệu gộp đến từ **ít nhất 2 giảng viên khác nhau** và tổng số phiếu ≥ `minResponses` (BR-07); nếu không thì hiển thị "Chưa đủ dữ liệu gộp" (khi đó chỉ xem ở mức bộ môn hoặc khoa). **Khảo thí không xem kết quả theo lớp hay theo giảng viên, không xem góp ý tự luận.**

* **BR-58 [P1]** Kiến nghị rà soát (`ExamReviewRecommendation`): Khảo thí gửi trưởng bộ môn, kèm môn học, đợt khảo sát và nội dung; trạng thái `DA_GUI → DA_PHAN_HOI` (TBM chọn `DA_TIEP_THU` hoặc `KHONG_TIEP_THU`, bắt buộc lý do); hạn mặc định 14 ngày, quá hạn nhắc TBM và báo trưởng khoa.

* **BR-59 [P1]** Thống kê phản hồi thi theo môn học, học kỳ, bộ môn; không có định danh sinh viên; chỉ hiển thị khi số phản hồi gộp đủ ngưỡng cấu hình.

* **BR-60 [P0]** Hạn xử lý mặc định (ngày làm việc, cấu hình được): tiếp nhận ≤ 3, hoàn tất ≤ 30. Quá hạn gửi thông báo mức tóm tắt cho LANH_DAO.

* **BR-61 [P0] Xung đột lợi ích.** Giảng viên bị phản ánh (giảng viên của lớp học phần liên quan), trưởng bộ môn của bộ môn đó và trưởng khoa của khoa đó **không được thấy hồ sơ và không được giao xử lý**, kể cả khi cùng tài khoản đó có thêm vai trò THANH_TRA. Truy cập bị từ chối trả về "không tìm thấy" (không tiết lộ hồ sơ có tồn tại). Phản hồi nghiêm trọng không bao giờ được định tuyến vào những người này.

* **BR-62 [P0] Quyền xem.** Chỉ THANH_TRA (trừ người bị xung đột) xem đầy đủ hồ sơ. LANH_DAO chỉ xem mức tóm tắt (loại, trạng thái, kết luận, số liệu), không xem nội dung. **ADMIN và CAN_BO_DBCL không xem hồ sơ.** Mỗi lần mở hồ sơ hoặc tải tệp đính kèm ghi AuditLog; tệp chỉ tải qua route có kiểm quyền (BR-28).

* **BR-63 [P0] Mức độ danh tính** khi gửi loại này: `AN_DANH_HOAN_TOAN` (mặc định; Thanh tra chỉ thấy "Sinh viên ẩn danh" nhưng hệ thống vẫn trao đổi và thông báo đúng sinh viên như BR-24) hoặc `CHO_THANH_TRA_BIET` (chỉ Thanh tra thấy danh tính, mỗi lần xem ghi AuditLog). Danh tính sinh viên không lộ cho người bị phản ánh ở bất kỳ bước nào. Giao diện gửi có cảnh báo rõ đây là khiếu nại chính thức và khuyến nghị nêu cụ thể sự việc, thời điểm, lớp học phần. Báo cáo tiểu luận phải ghi hạn chế: ẩn danh ở mức ứng dụng.

* **BR-64 [P1] Chuyển hồ sơ.** TRUONG_BO_MON, TRUONG_KHOA, CAN_BO_DBCL, PHONG_DAO_TAO, PHONG_KHAO_THI được chuyển một phản hồi sang Thanh tra kèm lý do (một chiều, ghi lịch sử). Sau khi chuyển, người chuyển chỉ thấy trạng thái và kết luận tóm tắt.

* **BR-65 [P1] Cảnh báo bất thường của khảo sát.** Sau `DA_TONG_HOP`, hệ thống tính **chỉ số** cho từng lớp học phần có từ 10 phiếu: số phiếu, tỉ lệ tham gia, tỉ lệ phiếu có mọi câu thang điểm cùng một giá trị, mức chênh điểm so với học kỳ trước. Lớp vượt ngưỡng (mặc định: tỉ lệ phiếu đồng nhất ≥ 70%, hoặc chênh ≥ 1,5 điểm; cấu hình được) tạo `SurveyAnomalyFlag`. Thanh tra xem **chỉ số**, không xem điểm tuyệt đối, câu trả lời hay góp ý tự luận. Thanh tra chọn `BINH_THUONG` (ghi chú), `CAN_LUU_Y` (ghi chú, thông báo CAN_BO_DBCL) hoặc `CHUYEN_XAC_MINH` (mở hồ sơ nguồn BAT_THUONG_KHAO_SAT). Cảnh báo chỉ là gợi ý, **không tự động chặn công bố hay kết luận ai đúng sai**.

* **BR-66 [P1]** Thống kê của Thanh tra (số hồ sơ theo loại, thời gian xử lý, tỉ lệ quá hạn) không có định danh và chỉ hiển thị khi số liệu gộp đủ ngưỡng cấu hình.

* **BR-67 [P0]** Mọi thống kê, dashboard và tệp xuất của 3 vai trò mới **không chứa định danh sinh viên** và áp dụng ngưỡng mẫu tối thiểu khi gộp. Test kiểm tra tệp xuất.

* **BR-68 [P0]** ADMIN không xem kết quả khảo sát, nội dung phản hồi và hồ sơ Thanh tra (mở rộng BR-18).

## 7\. YÊU CẦU CHỨC NĂNG (FR) THEO MODULE

Dùng danh sách này để tạo `docs/PROGRESS.md` (mỗi FR một dòng checkbox, kèm mức ưu tiên và tuần dự kiến). Chỉ tick khi đã có test qua và đã nghiệm thu được.

**M1 Xác thực và phiên:** FR-01 \[P0] đăng nhập bằng mã định danh (mã SV/GV) hoặc email; FR-02 \[P0] phiên JWT, đăng xuất, thu hồi; FR-03 \[P0] đổi mật khẩu; FR-04 \[P1] quên/đặt lại mật khẩu qua email (token dùng một lần, hết hạn 30 phút); FR-05 \[P0] kích hoạt tài khoản lần đầu hoặc mật khẩu tạm buộc đổi; FR-06 \[P0] giới hạn tần suất và khóa tạm; FR-07 \[P0] xác thực hai bước TOTP cho ADMIN (đăng ký bằng mã QR, xác nhận, mã khôi phục, đặt lại); FR-08 \[P1] bật 2FA bắt buộc cho các vai trò khác theo cấu hình; FR-09 \[P2] xem và đăng xuất các thiết bị.

**M2 Người dùng, phân quyền, kiểm toán:** FR-10 \[P0] quản lý người dùng (tạo, khóa/mở khóa, gán vai trò và phạm vi); FR-11 \[P0] policy tập trung theo vai trò + phạm vi; FR-12 \[P0] xem và lọc nhật ký kiểm toán.

**M3 Danh mục và nhập liệu (sau điều chỉnh số01):** PHONG_DAO_TAO quản lý dữ liệu đào tạo và import; ADMIN chỉ quản lý khoa/bộ môn. FR-20 \[P0] CRUD học kỳ (có khóa sổ), khoa, bộ môn, môn học, lớp học phần, phân công giảng viên; FR-21 \[P0] import Excel/CSV (sinh viên, giảng viên, lớp học phần, đăng ký) với chạy thử trước khi ghi và báo lỗi từng dòng; FR-22 \[P0] tải mẫu file import.

**M4 Mẫu phiếu:** FR-30 \[P0] trình soạn mẫu (nhóm tiêu chí, câu hỏi, thứ tự); FR-31 \[P0] các loại câu hỏi, bắt buộc, "Không áp dụng", trọng số; FR-32 \[P0] phiên bản và khóa; FR-33 \[P0] xem trước; FR-34 \[P1] nhân bản mẫu; FR-35 \[P1] mẫu mặc định có sẵn.

**M5 Đợt khảo sát:** FR-40 \[P0] tạo/sửa đợt; FR-41 \[P0] phạm vi (toàn trường/khoa/bộ môn/danh sách lớp); FR-42 \[P0] trình duyệt, duyệt, từ chối; FR-43 \[P0] chốt danh sách và sinh nhiệm vụ khi mở; FR-44 \[P0] tự động mở/đóng (idempotent); FR-45 \[P1] gia hạn, đóng sớm, hủy; FR-46 \[P0] theo dõi tiến độ và tỉ lệ tham gia; FR-47 \[P1] nhắc sinh viên chưa hoàn thành.

**M6 Làm khảo sát:** FR-50 \[P0] danh sách khảo sát của sinh viên (hạn chót, trạng thái); FR-51 \[P0] form động, thanh tiến trình, kiểm tra hợp lệ; FR-52 \[P1] nháp phía trình duyệt; FR-53 \[P0] nộp ẩn danh một lần; FR-54 \[P0] màn hình xác nhận đã nộp.

**M7 Kết quả:** FR-60 \[P0] tổng hợp; FR-61 \[P0] ngưỡng công bố; FR-62 \[P0] công bố; FR-63 \[P0] trang kết quả theo vai trò và phạm vi; FR-64 \[P1] so sánh với bộ môn/khoa/kỳ trước; FR-65 \[P1] kiểm duyệt góp ý tự luận; FR-66 \[P1] giải trình và xác nhận.

**M8 Phản hồi:** FR-70 \[P0] gửi phản hồi (loại, mức độ, ẩn danh, đính kèm); FR-71 \[P0] định tuyến và hàng đợi xử lý; FR-72 \[P0] trạng thái và lịch sử; FR-73 \[P0] trao đổi qua lại; FR-74 \[P1] SLA, quá hạn, leo thang; FR-75 \[P1] đánh giá hài lòng và mở lại; FR-76 \[P0] chuyển tiếp/từ chối có lý do.

**M9 Thông báo:** FR-80 \[P0] thông báo trong ứng dụng; FR-81 \[P1] email (Mailpit khi phát triển, SMTP khi triển khai); FR-82 \[P1] nhắc hạn.

**M10 Báo cáo:** FR-90 \[P0] dashboard theo vai trò; FR-91 \[P1] biểu đồ; FR-92 \[P0] xuất Excel/CSV; FR-93 \[P1] xuất PDF; FR-94 \[P1] báo cáo xử lý phản hồi (số lượng, thời gian xử lý, quá hạn, hài lòng).

**M11 Hệ thống:** FR-100 \[P0] cấu hình ngưỡng; FR-101 \[P0] dữ liệu demo (seed); FR-102 \[P0] health check; FR-103 \[P1] script sao lưu/khôi phục.

**M12 Mở rộng:** FR-110 \[P2] gợi ý chủ đề/cảm xúc cho góp ý tự luận bằng AI (tắt mặc định, ẩn danh hóa trước khi gửi, cần người dùng đồng ý); FR-111 \[P2] API trạng thái hoàn thành; FR-112 \[P2] đánh giá riêng từng giảng viên.

**M13 Phòng Đào tạo:** FR-140 [P0] đổi quyền CRUD dữ liệu đào tạo và import sang PHONG_DAO_TAO; khoa/bộ môn do ADMIN (Tuần 6; việc bù G1); FR-141 [P0] PĐT khóa/mở khóa học kỳ, mở khóa có lý do, audit và thông báo ĐBCL (Tuần 6; việc bù G1); FR-142 [P0] kiểm tra sẵn sàng của đợt theo RS-01–RS-06 (Tuần 7); FR-143 [P0] PĐT xác nhận hoặc trả về dữ liệu đối tượng khảo sát (Tuần 7); FR-144 [P0] cảnh báo lệch dữ liệu khi mở đợt, chốt theo dữ liệu hiện tại (Tuần 7); FR-145 [P1] lô nhập ImportBatch và hoàn tác khi chưa bị đợt chốt dùng (Tuần 7; tùy thời gian, không tự cắt); FR-146 [P0] hàng đợi phản hồi TO_CHUC_LOP_HOC của PĐT (Tuần 10); FR-147 [P1] dashboard PĐT: độ sẵn sàng, lớp lỗi, phản hồi đang chờ (Tuần 12).

**M14 Phòng Khảo thí:** FR-148 [P0] cờ isAssessmentGroup trong trình soạn/xem trước và một nhóm mặc định Kiểm tra, đánh giá (Tuần 6; việc bù G1); FR-149 [P0] hàng đợi THI_KET_THUC_HOC_PHAN và lời nhắc không thay phúc khảo (Tuần 10); FR-150 [P0] Khảo thí xem điểm nhóm kiểm tra–đánh giá gộp theo BR-57 (Tuần 9); FR-151 [P1] thống kê phản hồi thi không định danh, có ngưỡng (Tuần 12); FR-152 [P1] kiến nghị rà soát của Khảo thí và phản hồi trưởng bộ môn (Tuần 11).

**M15 Phòng Thanh tra:** FR-153 [P0] gửi KHIEU_NAI_NGHIEM_TRONG với cảnh báo, loại vi phạm và mức độ danh tính (Tuần 10); FR-154 [P0] hồ sơ Thanh tra và máy trạng thái tiếp nhận/xác minh/kết luận/thông báo/đóng (Tuần 11; khởi tạo TIEP_NHAN ở Tuần 10); FR-155 [P0] loại người xung đột lợi ích khỏi hàng đợi, quyền xem và giao hồ sơ (Tuần 10); FR-156 [P0] kết luận hồ sơ Thanh tra và thông báo đúng mức tiết lộ (Tuần 11); FR-157 [P1] chuyển hồ sơ một chiều từ vai trò được phép sang Thanh tra (Tuần 11); FR-158 [P1] cảnh báo bất thường khảo sát và màn hình xem xét chỉ số (Tuần 12); FR-159 [P1] thống kê Thanh tra không định danh, có ngưỡng (Tuần 12).

**M16 Ma trận quyền mở rộng:** FR-160 [P0] ma trận quyền 10 vai trò và IDOR; G1 chỉ phần chức năng hiện có (Tuần 6; hoàn thiện toàn bộ TC-ALL-01 ở Tuần 13).

## 8\. CÔNG NGHỆ, KIẾN TRÚC VÀ BẢO MẬT

### 8.1 Công nghệ (cố định, không đổi nếu chưa được người dùng đồng ý)

* **Next.js full-stack** (App Router) + **TypeScript** (strict) trên Node.js bản LTS. **MySQL 8** (utf8mb4). Lấy phiên bản ổn định mới nhất tại thời điểm làm và kiểm tra tài liệu chính thức khi không chắc; khóa phiên bản bằng lockfile.
* ORM: **Prisma** (provider mysql). Kiểm tra dữ liệu: **Zod**.
* Giao diện: Tailwind CSS, shadcn/ui, React Hook Form, TanStack Table, Recharts. Thiết kế mobile-first (sinh viên chủ yếu dùng điện thoại), tiếng Việt, đủ tương phản và dùng được bằng bàn phím.
* Bảo mật: **bcrypt** (gói `bcrypt` hoặc `bcryptjs`, chọn gói cài ổn định trên máy nhóm và ghi lý do), **JWT** bằng thư viện `jose`, **TOTP** bằng `otplib` (hoặc thư viện tương đương còn được bảo trì), `qrcode` để tạo mã QR.
* Khác: `nodemailer` (email), `exceljs` (import/xuất Excel), `date-fns` (múi giờ Asia/Ho\_Chi\_Minh, lưu UTC), `@faker-js/faker` (dữ liệu giả, locale vi), PDF bằng thư viện thuần JS dễ cài (`pdfkit` hoặc `@react-pdf/renderer`).
* Kiểm thử: **Vitest** (đơn vị + tích hợp trên MySQL thật bằng Docker), **Playwright** (E2E), ESLint + Prettier, `autocannon` hoặc k6 cho tải nhẹ.
* Hạ tầng: Docker Compose gồm `db` (MySQL) và `mailpit`; ứng dụng chạy bằng `npm run dev` khi phát triển và có profile compose đầy đủ để demo/triển khai. CI bằng GitHub Actions (lint, typecheck, test với dịch vụ MySQL).
* Ghi các quyết định lớn thành ADR ngắn trong `docs/decisions/` (Bối cảnh, Phương án, Quyết định, Hệ quả).

### 8.2 Cấu trúc gợi ý (bạn được tinh chỉnh)

`prisma/` (schema, migrations, seed) · `src/app/` (route theo vai trò + `api/`) · `src/components/` · `src/server/services/` (logic nghiệp vụ theo miền: surveys, feedback, reports...) · `src/server/policies/` (phân quyền) · `src/server/jobs/` (mở/đóng đợt, SLA, nhắc hạn) · `src/lib/` (auth, db, env, audit, mail, crypto, rate-limit) · `src/validation/` (Zod) · `tests/{unit,integration,e2e}` · `scripts/` · `docs/`.

Quy tắc: **logic nghiệp vụ nằm trong `services`, không nằm trong component hay route handler.** Mọi hàm service nhận `actor` (người thực hiện) và gọi policy trước khi truy cập dữ liệu. Biến môi trường kiểm tra bằng Zod ngay khi khởi động (`src/lib/env.ts`), thiếu là báo lỗi rõ ràng.

### 8.3 Xác thực và phiên (bcrypt + JWT)

* **Băm mật khẩu bằng bcrypt**, cost factor ≥ 12 (cấu hình được). Giới hạn mật khẩu tối đa 72 byte (giới hạn của bcrypt) và báo lỗi rõ ràng; tối thiểu 10 ký tự; từ chối mật khẩu nằm trong danh sách mật khẩu phổ biến (danh sách nhỏ trong repo). So sánh bằng hàm so sánh của thư viện. Khi không tìm thấy tài khoản vẫn chạy một phép so sánh giả để tránh lộ qua thời gian phản hồi.
* **Phiên bằng JWT:** access token ngắn hạn (mặc định 15 phút) ký bằng `jose`, khai báo cố định thuật toán khi xác minh, có `iss`, `aud`, `exp`, `sub`, vai trò và cờ `mfa`. Refresh token là chuỗi ngẫu nhiên 256-bit, **lưu băm trong bảng `UserSession`** (kèm hạn dùng, user agent, thời điểm thu hồi), **xoay vòng mỗi lần dùng** và có phát hiện dùng lại (nếu refresh token đã bị thu hồi mà xuất hiện lại thì thu hồi cả chuỗi phiên). Nhờ đó đăng xuất và khóa tài khoản có hiệu lực thật.
* **Cookie:** access và refresh trong cookie `httpOnly`, `Secure` ở môi trường thật, `SameSite=Lax`; cookie refresh giới hạn path ở `/api/auth`. **Không** lưu token trong localStorage.
* **CSRF:** mọi thao tác ghi dùng POST/PUT/DELETE và kiểm tra header `Origin` khớp host; bổ sung CSRF token cho thao tác quản trị nhạy cảm.
* Khóa bí mật JWT và khóa mã hóa lấy từ biến môi trường (≥ 32 byte ngẫu nhiên), có script sinh khóa và hướng dẫn xoay khóa.
* Giới hạn tần suất (ghi trong bảng MySQL hoặc bộ nhớ khi phát triển) cho: đăng nhập (theo tài khoản và IP), nhập mã OTP, đặt lại mật khẩu, nộp phiếu, gửi phản hồi.
* Đặt lại mật khẩu: token ngẫu nhiên, lưu băm, hạn 30 phút, dùng một lần; khi đổi mật khẩu thì thu hồi mọi phiên.
* Tài khoản nhập từ file: tạo ở trạng thái chờ kích hoạt, gửi liên kết kích hoạt hoặc mật khẩu tạm buộc đổi lần đầu. Mật khẩu demo cố định chỉ tồn tại trong dữ liệu seed môi trường dev/demo và bị chặn ở production.

### 8.4 Xác thực hai bước cho ADMIN (TOTP)

* Dùng TOTP chuẩn (RFC 6238, 6 chữ số, chu kỳ 30 giây, cho phép lệch ±1 chu kỳ), tương thích Google Authenticator/Authy.
* **Đăng ký:** tạo secret, hiển thị mã QR + khóa nhập tay, yêu cầu nhập mã đầu tiên để xác nhận mới bật; sau đó hiển thị **10 mã khôi phục một lần** (hiện đúng một lần, lưu băm).
* Secret lưu **mã hóa** (AES-256-GCM, khóa từ biến môi trường), không lưu dạng rõ. Chống dùng lại cùng một mã trong cùng chu kỳ. Sai quá 5 lần thì khóa 15 phút.
* **Luồng đăng nhập:** bước 1 kiểm tra mật khẩu; nếu vai trò yêu cầu 2FA thì chỉ cấp token tạm (5 phút, chỉ dùng cho bước 2); bước 2 nhập mã TOTP hoặc mã khôi phục; thành công mới cấp phiên đầy đủ có `mfa: true`. ADMIN chưa đăng ký 2FA chỉ được vào trang đăng ký 2FA, không vào được chức năng nào khác.
* Mọi route/hành động quản trị phải kiểm `role = ADMIN` **và** `mfa = true` ở phía máy chủ.
* Đặt lại 2FA của một admin: do admin khác thực hiện, ghi nhật ký; hoặc bằng script dòng lệnh `npm run admin:reset-2fa` chạy trên máy chủ. Thao tác rất nhạy cảm (đổi vai trò, đặt lại 2FA của người khác) yêu cầu nhập lại mã TOTP (step-up) ở mức P1.
* Có test cho: sai mã, mã hết hạn, dùng lại mã, mã khôi phục dùng một lần, bỏ qua bước 2, token tạm dùng sai mục đích.

### 8.5 Phân quyền

* Gán vai trò gồm (người dùng, vai trò, loại phạm vi, id phạm vi). Một module `can(actor, action, resource)` tập trung; truy vấn danh sách dùng hàm lọc theo phạm vi (ví dụ chỉ các lớp của giảng viên đó). **Từ chối mặc định.**
* **Không dùng middleware làm lớp phân quyền duy nhất** (Next.js từng có lỗ hổng cho phép vượt qua middleware). Middleware chỉ kiểm tra thô (có phiên hợp lệ chưa); kiểm quyền thật nằm ở Server Component, Server Action, Route Handler và service.
* Bộ test ma trận quyền (vai trò × hành động × tài nguyên của mình/của người khác) và test IDOR cho mọi route có ID. Mỗi tuần thêm test cho chức năng mới.

### 8.6 Bảo mật ứng dụng khác

* Kiểm tra mọi đầu vào bằng Zod ở phía máy chủ; thông báo lỗi bằng tiếng Việt, không lộ chi tiết nội bộ.
* Chống XSS: không dùng `dangerouslySetInnerHTML` với dữ liệu người dùng; thiết lập header bảo mật trong `next.config` (CSP chặt, `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS ở production). Chống SQL injection bằng Prisma tham số hóa; truy vấn thô chỉ dùng khi tham số hóa.
* Tải tệp theo BR-28. Log có cấu trúc, che dữ liệu nhạy cảm, không log nội dung phiếu hay định danh trong luồng nộp phiếu.
* `npm audit` và kiểm tra giấy phép thư viện trước mỗi mốc lớn; checklist OWASP Top 10 ở tuần 13.

### 8.7 Dữ liệu và MySQL

* Tạo database với `utf8mb4` và collation hỗ trợ tiếng Việt. Dùng InnoDB, khóa ngoại, unique và index cho mọi truy vấn chính; phân trang mọi danh sách; tránh N+1.
* Chuyển trạng thái và chặn trùng bằng **cập nhật có điều kiện** (`updateMany` kèm trạng thái cũ, kiểm tra số dòng) trong transaction.
* Thời gian lưu UTC; hiển thị theo Asia/Ho\_Chi\_Minh; trường chỉ cần ngày dùng kiểu DATE.
* Job mở/đóng đợt, SLA, nhắc hạn: **đúng đắn không phụ thuộc cron**. Trạng thái hiển thị tính theo thời gian thực; các hàm `ensure\*` (chốt danh sách, đóng, tổng hợp) idempotent, an toàn khi chạy đồng thời, được gọi cả bởi một tiến trình scheduler (`npm run scheduler`, chạy `node-cron` hoặc tương đương) lẫn khi có truy cập đầu tiên sau thời điểm đến hạn.
* Prisma migrate cần quyền tạo shadow database ở môi trường dev: ghi rõ trong README cách cấu hình user MySQL.
* Dữ liệu demo bằng `npm run db:seed`: 3 khoa, \~8 bộ môn, \~40 môn, \~120 lớp học phần, \~60 giảng viên, \~1.500 sinh viên giả, đăng ký học phần, 1 đợt đã đóng có kết quả và 1 đợt đang mở, phản hồi mẫu ở nhiều trạng thái. Kích thước chỉnh được (`small|medium|large`). Tài khoản demo cho mỗi vai trò ghi trong README, chỉ dùng cho dev/demo.

### 8.8 Chất lượng và lệnh npm

* Bật TypeScript strict, ESLint, Prettier. Không có test fail khi kết thúc phiên.
* Script bắt buộc: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `check` (= lint + typecheck + test), `db:migrate`, `db:seed`, `db:reset`, `demo` (reset + seed + chạy), `scheduler`, `progress` (tính tiến độ từ `docs/PROGRESS.md`), `admin:create`, `admin:reset-2fa`.
* Bảng truy vết `docs/TRUY\_VET.md`: mã FR/BR ↔ màn hình ↔ test. Cập nhật mỗi tuần.
* Hiệu năng: test tải nhẹ cho luồng nộp phiếu (hàng trăm request đồng thời, không phát sinh phiếu trùng, thời gian phản hồi chấp nhận được), ghi số liệu thật vào báo cáo.
