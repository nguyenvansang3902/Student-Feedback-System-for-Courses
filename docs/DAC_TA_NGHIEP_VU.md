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
5. **CAN\_BO\_DBCL** (cán bộ đảm bảo chất lượng, toàn hệ thống): tạo mẫu phiếu, lập đợt khảo sát, theo dõi tiến độ, đóng/gia hạn, tổng hợp, kiểm duyệt góp ý, công bố, xuất báo cáo; xử lý phản hồi về cơ sở vật chất/lịch học/khác.
6. **LANH\_DAO** (toàn hệ thống): phê duyệt hoặc từ chối đợt khảo sát; xem dashboard toàn trường.
7. **ADMIN** (quản trị hệ thống): quản lý tài khoản, vai trò, cấu hình, nhật ký kiểm toán. **Không mặc định được xem kết quả khảo sát hay nội dung phản hồi** (tách quyền quản trị khỏi quyền nghiệp vụ). Bắt buộc xác thực hai bước.

## 5\. MÔ HÌNH NGHIỆP VỤ

### 5.1 Kịch bản xuyên suốt (UC-GOLD, phải chạy được từ đầu đến cuối vào tuần 12 và có E2E test)

1. CAN\_BO\_DBCL tạo mẫu phiếu v1 và lập đợt khảo sát cho một học kỳ (phạm vi: một khoa).
2. Trình duyệt, LANH\_DAO phê duyệt.
3. Đến giờ mở, hệ thống chốt danh sách đăng ký và tạo nhiệm vụ khảo sát cho từng (sinh viên, lớp học phần).
4. Sinh viên đăng nhập, thấy các khảo sát cần làm, nộp ẩn danh.
5. Hết hạn, đợt tự đóng; hệ thống tổng hợp; CAN\_BO\_DBCL kiểm duyệt góp ý tự luận rồi công bố.
6. Giảng viên xem kết quả lớp mình; lớp có điểm thấp phát sinh yêu cầu giải trình; giảng viên nộp giải trình; trưởng bộ môn xác nhận.
7. Song song, sinh viên gửi phản hồi ẩn danh về giảng dạy; hệ thống định tuyến cho giảng viên; giảng viên trả lời; sinh viên đánh giá hài lòng; phản hồi đóng. Phản hồi quá hạn tự leo thang lên cấp trên.
8. Lãnh đạo và ĐBCL xem dashboard, xuất báo cáo.

### 5.2 Máy trạng thái: Đợt khảo sát

`NHAP → CHO\_DUYET → DA\_DUYET → DANG\_MO → DA\_DONG → DA\_TONG\_HOP → DA\_CONG\_BO → LUU\_TRU`

* NHAP → CHO\_DUYET: CAN\_BO\_DBCL trình duyệt (kiểm tra có mẫu phiếu, phạm vi, thời gian hợp lệ).
* CHO\_DUYET → DA\_DUYET: LANH\_DAO duyệt. CHO\_DUYET → NHAP: LANH\_DAO từ chối (bắt buộc lý do).
* DA\_DUYET → DANG\_MO: tự động khi đến giờ mở; **chốt danh sách và tạo nhiệm vụ** tại thời điểm này.
* DANG\_MO → DA\_DONG: tự động khi hết hạn, hoặc đóng sớm (CAN\_BO\_DBCL, có lý do).
* DA\_DONG → DA\_TONG\_HOP: chạy tổng hợp kết quả.
* DA\_TONG\_HOP → DA\_CONG\_BO: CAN\_BO\_DBCL công bố sau khi kiểm duyệt.
* DA\_CONG\_BO → LUU\_TRU: khi học kỳ khóa sổ.
* Hủy (HUY) được phép từ NHAP, CHO\_DUYET, DA\_DUYET (có lý do), không được sau khi đã mở.
* Mọi chuyển trạng thái phải **idempotent và an toàn khi chạy đồng thời** (cập nhật có điều kiện theo trạng thái cũ), và ghi lịch sử.

### 5.3 Máy trạng thái: Phản hồi/góp ý

`MOI → DA\_TIEP\_NHAN → DANG\_XU\_LY → DA\_TRA\_LOI → DA\_DONG`

* Rẽ nhánh: `CHUYEN\_TIEP` (chuyển người xử lý khác, bắt buộc lý do, quay về MOI ở người nhận), `TU\_CHOI` (ngoài phạm vi/spam, bắt buộc lý do), `MO\_LAI` (từ DA\_DONG về DANG\_XU\_LY, tối đa 1 lần, trong 7 ngày, khi sinh viên đánh giá hài lòng ≤ 2).
* Quá hạn SLA là **thuộc tính** (cờ), không phải trạng thái.
* Lịch sử chuyển trạng thái bất biến (ai, khi nào, từ đâu đến đâu, ghi chú).

### 5.4 Máy trạng thái: Giải trình cải tiến

`CAN\_GIAI\_TRINH → DA\_GUI → CAN\_BO\_SUNG → DA\_XAC\_NHAN` (giảng viên gửi; trưởng bộ môn xác nhận hoặc yêu cầu bổ sung kèm nhận xét).

### 5.5 Mẫu phiếu và phiên bản

Mẫu phiếu gồm các **nhóm tiêu chí**, mỗi nhóm có **câu hỏi**. Loại câu hỏi: thang điểm Likert (mặc định 1-5, cấu hình 1-4/1-5), chọn một, chọn nhiều, tự luận, Có/Không. Mỗi câu có: bắt buộc hay không, cho phép "Không áp dụng" hay không, trọng số. Mỗi nhóm có trọng số. Mẫu có **phiên bản**; khi đã gắn vào một đợt được duyệt thì **khóa**, muốn đổi phải tạo phiên bản mới.

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

* Loại phản hồi → người nhận chính: GIANG\_DAY → giảng viên phụ trách lớp; NOI\_DUNG\_DE\_CUONG → trưởng bộ môn; TAI\_LIEU → giảng viên; KIEM\_TRA\_DANH\_GIA → giảng viên (đồng gửi trưởng bộ môn); CSVC\_LICH\_HOC → CAN\_BO\_DBCL; KHAC → CAN\_BO\_DBCL.
* Mức độ: GOP\_Y, DE\_XUAT, KHIEU\_NAI (khiếu nại luôn đồng gửi trưởng bộ môn).
* SLA (ngày làm việc, loại trừ thứ Bảy/Chủ nhật): tiếp nhận ≤ 2; trả lời ≤ 7 (KHIEU\_NAI ≤ 5). Quá hạn thì gắn cờ, thông báo và **leo thang**: giảng viên → trưởng bộ môn → trưởng khoa → CAN\_BO\_DBCL.
* Phản hồi ẩn danh: người xử lý chỉ thấy "Sinh viên ẩn danh", nhưng hệ thống vẫn thông báo và cho trao đổi với đúng sinh viên đó.

## 6\. QUY TẮC NGHIỆP VỤ (BR)

Mỗi quy tắc phải có ít nhất một test tên gắn mã quy tắc (ví dụ `BR-02 chặn nộp trùng`). P0 = bắt buộc, P1 = cần cho dùng thật, P2 = mở rộng.

**Khảo sát**

* BR-01 \[P0] Đối tượng khảo sát lấy từ đăng ký lớp học phần. Khi đợt chuyển sang DANG\_MO, hệ thống **chốt danh sách** và tạo SurveyTask cho từng (sinh viên, lớp học phần) thuộc phạm vi đợt; thay đổi đăng ký sau đó không ảnh hưởng đợt đang mở.
* BR-02 \[P0] Mỗi sinh viên nộp tối đa 1 phiếu cho mỗi (đợt, lớp học phần); nộp xong không sửa/xóa. Chặn trùng ở tầng DB và chịu được thao tác đồng thời.
* BR-03 \[P0] Ẩn danh theo thiết kế ở Mục 5.6.
* BR-04 \[P0] Chỉ nộp được khi đợt đang DANG\_MO và giờ máy chủ nằm trong \[bắt đầu, kết thúc]; câu bắt buộc phải có trả lời; giá trị phải đúng loại câu hỏi và thang điểm.
* BR-05 \[P0] Mẫu phiếu có phiên bản và bị khóa khi đã gắn vào đợt được duyệt.
* BR-06 \[P0] Đợt phải được LANH\_DAO duyệt trước khi mở; từ chối bắt buộc có lý do; không đổi mẫu/phạm vi sau khi đã duyệt (muốn đổi thì rút về NHAP); sau khi mở chỉ được gia hạn thời gian đóng, có lý do, ghi nhật ký và thông báo cho sinh viên.
* BR-07 \[P0] Chỉ công bố kết quả của một lớp khi số phiếu ≥ minResponses (mặc định 5) **và** tỉ lệ tham gia ≥ minRate (mặc định 30%), cấu hình theo đợt. Không đủ mẫu thì hiển thị "Chưa đủ mẫu để công bố"; số liệu chỉ được xem ở dạng gộp cấp bộ môn/khoa bởi vai trò có quyền.
* BR-08 \[P0] Kết quả chỉ hiển thị cho giảng viên/trưởng đơn vị khi đợt ở DA\_CONG\_BO; CAN\_BO\_DBCL và LANH\_DAO xem được từ DA\_TONG\_HOP.
* BR-09 \[P1] Góp ý tự luận phải qua kiểm duyệt trước khi giảng viên/trưởng đơn vị thấy: CHO\_KIEM\_DUYET → HIEN\_THI hoặc DA\_AN; từ khóa nhạy cảm (danh sách cấu hình) tự gắn cờ; ghi người kiểm duyệt và lý do.
* BR-10 \[P1] Lớp có điểm tổng < ngưỡng cảnh báo thì tự tạo yêu cầu giải trình bắt buộc cho giảng viên trong N ngày (mặc định 14); trưởng bộ môn xác nhận hoặc yêu cầu bổ sung.
* BR-11 \[P0] Công thức tính điểm theo Mục 5.7.
* BR-12 \[P0] Tỉ lệ tham gia theo Mục 5.7.
* BR-13 \[P1] CAN\_BO\_DBCL, trưởng khoa, trưởng bộ môn xem được **danh sách sinh viên chưa hoàn thành** (chỉ trạng thái, không có nội dung trả lời) để nhắc nhở; mỗi lần xem/xuất đều ghi nhật ký; nhắc tự động tối đa 1 lần/ngày/sinh viên/đợt.
* BR-14 \[P2] Cờ "bắt buộc hoàn thành": cung cấp API/tệp trạng thái hoàn thành để hệ thống điểm của trường dùng; không tích hợp thật.
* BR-15 \[P1] Đóng sớm/gia hạn chỉ do CAN\_BO\_DBCL, có lý do, ghi nhật ký.
* BR-16 \[P1] Một đợt áp dụng cho nhiều lớp học phần; lớp có nhiều giảng viên được đánh giá ở mức lớp (P2: đánh giá riêng từng giảng viên).
* BR-17 \[P1] Học kỳ đã khóa sổ thì dữ liệu chỉ đọc, không tạo đợt hay phản hồi mới.
* BR-18 \[P0] ADMIN không mặc định xem được kết quả khảo sát hay nội dung phản hồi.

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

## 7\. YÊU CẦU CHỨC NĂNG (FR) THEO MODULE

Dùng danh sách này để tạo `docs/PROGRESS.md` (mỗi FR một dòng checkbox, kèm mức ưu tiên và tuần dự kiến). Chỉ tick khi đã có test qua và đã nghiệm thu được.

**M1 Xác thực và phiên:** FR-01 \[P0] đăng nhập bằng mã định danh (mã SV/GV) hoặc email; FR-02 \[P0] phiên JWT, đăng xuất, thu hồi; FR-03 \[P0] đổi mật khẩu; FR-04 \[P1] quên/đặt lại mật khẩu qua email (token dùng một lần, hết hạn 30 phút); FR-05 \[P0] kích hoạt tài khoản lần đầu hoặc mật khẩu tạm buộc đổi; FR-06 \[P0] giới hạn tần suất và khóa tạm; FR-07 \[P0] xác thực hai bước TOTP cho ADMIN (đăng ký bằng mã QR, xác nhận, mã khôi phục, đặt lại); FR-08 \[P1] bật 2FA bắt buộc cho các vai trò khác theo cấu hình; FR-09 \[P2] xem và đăng xuất các thiết bị.

**M2 Người dùng, phân quyền, kiểm toán:** FR-10 \[P0] quản lý người dùng (tạo, khóa/mở khóa, gán vai trò và phạm vi); FR-11 \[P0] policy tập trung theo vai trò + phạm vi; FR-12 \[P0] xem và lọc nhật ký kiểm toán.

**M3 Danh mục và nhập liệu:** FR-20 \[P0] CRUD học kỳ (có khóa sổ), khoa, bộ môn, môn học, lớp học phần, phân công giảng viên; FR-21 \[P0] import Excel/CSV (sinh viên, giảng viên, lớp học phần, đăng ký) với chạy thử trước khi ghi và báo lỗi từng dòng; FR-22 \[P0] tải mẫu file import.

**M4 Mẫu phiếu:** FR-30 \[P0] trình soạn mẫu (nhóm tiêu chí, câu hỏi, thứ tự); FR-31 \[P0] các loại câu hỏi, bắt buộc, "Không áp dụng", trọng số; FR-32 \[P0] phiên bản và khóa; FR-33 \[P0] xem trước; FR-34 \[P1] nhân bản mẫu; FR-35 \[P1] mẫu mặc định có sẵn.

**M5 Đợt khảo sát:** FR-40 \[P0] tạo/sửa đợt; FR-41 \[P0] phạm vi (toàn trường/khoa/bộ môn/danh sách lớp); FR-42 \[P0] trình duyệt, duyệt, từ chối; FR-43 \[P0] chốt danh sách và sinh nhiệm vụ khi mở; FR-44 \[P0] tự động mở/đóng (idempotent); FR-45 \[P1] gia hạn, đóng sớm, hủy; FR-46 \[P0] theo dõi tiến độ và tỉ lệ tham gia; FR-47 \[P1] nhắc sinh viên chưa hoàn thành.

**M6 Làm khảo sát:** FR-50 \[P0] danh sách khảo sát của sinh viên (hạn chót, trạng thái); FR-51 \[P0] form động, thanh tiến trình, kiểm tra hợp lệ; FR-52 \[P1] nháp phía trình duyệt; FR-53 \[P0] nộp ẩn danh một lần; FR-54 \[P0] màn hình xác nhận đã nộp.

**M7 Kết quả:** FR-60 \[P0] tổng hợp; FR-61 \[P0] ngưỡng công bố; FR-62 \[P0] công bố; FR-63 \[P0] trang kết quả theo vai trò và phạm vi; FR-64 \[P1] so sánh với bộ môn/khoa/kỳ trước; FR-65 \[P1] kiểm duyệt góp ý tự luận; FR-66 \[P1] giải trình và xác nhận.

**M8 Phản hồi:** FR-70 \[P0] gửi phản hồi (loại, mức độ, ẩn danh, đính kèm); FR-71 \[P0] định tuyến và hàng đợi xử lý; FR-72 \[P0] trạng thái và lịch sử; FR-73 \[P0] trao đổi qua lại; FR-74 \[P1] SLA, quá hạn, leo thang; FR-75 \[P1] đánh giá hài lòng và mở lại; FR-76 \[P0] chuyển tiếp/từ chối có lý do.

**M9 Thông báo:** FR-80 \[P0] thông báo trong ứng dụng; FR-81 \[P1] email (Mailpit khi phát triển, SMTP khi triển khai); FR-82 \[P1] nhắc hạn.

**M10 Báo cáo:** FR-90 \[P0] dashboard theo vai trò; FR-91 \[P1] biểu đồ; FR-92 \[P0] xuất Excel/CSV; FR-93 \[P1] xuất PDF; FR-94 \[P1] báo cáo xử lý phản hồi (số lượng, thời gian xử lý, quá hạn, hài lòng).

**M11 Hệ thống:** FR-100 \[P0] cấu hình ngưỡng; FR-101 \[P0] dữ liệu demo (seed); FR-102 \[P0] health check; FR-103 \[P1] script sao lưu/khôi phục.

**M12 Mở rộng:** FR-110 \[P2] gợi ý chủ đề/cảm xúc cho góp ý tự luận bằng AI (tắt mặc định, ẩn danh hóa trước khi gửi, cần người dùng đồng ý); FR-111 \[P2] API trạng thái hoàn thành; FR-112 \[P2] đánh giá riêng từng giảng viên.

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

