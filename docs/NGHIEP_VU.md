# Nghiệp vụ v1 — Tuần 1

> Bản nháp kỹ thuật do AI hỗ trợ, để sinh viên đọc, hiểu và viết lại bằng lời của mình. Tài liệu này mô tả **quy trình đề xuất cho sản phẩm**, không trình bày quy trình hiện tại tại một trường cụ thể. Quy tắc đầy đủ nằm trong `DAC_TA_NGHIEP_VU.md` (Mục 3–8 của đặc tả nguồn).

## 1. Mục tiêu nghiệp vụ

Website hỗ trợ hai luồng liên quan nhưng riêng biệt:

1. **Khảo sát theo đợt:** phát hành phiếu cho đúng sinh viên đã đăng ký lớp học phần, thu phiếu một lần và ẩn danh, tổng hợp, kiểm duyệt, công bố có ngưỡng bảo vệ, yêu cầu giải trình khi điểm thấp.
2. **Phản hồi liên tục:** sinh viên gửi góp ý hoặc khiếu nại về lớp đã/đang học, hệ thống giao đúng người xử lý, lưu diễn biến, kiểm soát thời hạn, leo thang, cho sinh viên đánh giá mức hài lòng.

Các giá trị số trong đặc tả (ngưỡng công bố, điểm cảnh báo, thời hạn, giới hạn gửi) là mặc định và phải cấu hình được khi chức năng tương ứng được triển khai. Tuần 1 chỉ mô tả, chưa triển khai nghiệp vụ hay dữ liệu nghiệp vụ.

## 2. Quy trình khảo sát đề xuất

| Bước | Tác nhân | Việc thực hiện | Kết quả và điều kiện chính |
|---:|---|---|---|
| 1 | Cán bộ ĐBCL | Tạo phiên bản mẫu phiếu và lập đợt cho học kỳ, phạm vi, thời gian, ngưỡng. | Đợt ở `NHAP`; dữ liệu hợp lệ mới được trình duyệt. |
| 2 | Lãnh đạo | Duyệt hoặc từ chối có lý do. | Chỉ đợt `DA_DUYET` mới có thể mở; mẫu và phạm vi được khóa. |
| 3 | Hệ thống | Đến giờ mở, chốt danh sách đăng ký và tạo nhiệm vụ theo từng sinh viên, lớp học phần. | Đợt `DANG_MO`; thay đổi đăng ký sau khi mở không làm đổi danh sách đã chốt. |
| 4 | Sinh viên | Xem nhiệm vụ của mình, điền và nộp phiếu. | Mỗi nhiệm vụ tối đa một phiếu; câu trả lời không liên kết với danh tính. |
| 5 | Hệ thống, cán bộ ĐBCL | Đóng đợt, tổng hợp điểm, kiểm duyệt góp ý tự luận. | Chỉ công bố lớp có đủ số phiếu và tỉ lệ tham gia theo ngưỡng. |
| 6 | Giảng viên, trưởng đơn vị | Xem kết quả trong phạm vi quyền; giảng viên giải trình khi điểm dưới ngưỡng. | Giải trình được trưởng bộ môn xác nhận hoặc yêu cầu bổ sung. |
| 7 | Lãnh đạo, cán bộ ĐBCL | Xem dashboard, xuất báo cáo. | File xuất không chứa định danh sinh viên trả lời. |

Trạng thái chính của đợt: `NHAP → CHO_DUYET → DA_DUYET → DANG_MO → DA_DONG → DA_TONG_HOP → DA_CONG_BO → LUU_TRU`. Quy tắc hủy, từ chối, gia hạn và đóng sớm nằm ở Mục 5.2 và Mục 6 của đặc tả. Mỗi chuyển trạng thái cần kiểm tra trạng thái cũ, ghi lịch sử và an toàn khi chạy đồng thời.

### Ranh giới ẩn danh

`SurveyTask` lưu việc sinh viên đã/chưa hoàn thành để chặn nộp trùng và hỗ trợ nhắc nhở. `SurveyResponse` và `SurveyAnswer` không chứa `studentId`, `taskId`, IP, User-Agent hay quan hệ về người dùng. Việc cập nhật nhiệm vụ và ghi phiếu diễn ra trong một transaction. Ngày nộp chỉ ở độ chính xác ngày; không hiển thị thời điểm chính xác. Đây là ẩn danh **ở mức ứng dụng**: người có quyền hạ tầng và các lớp rất ít người vẫn có thể suy luận, nên ngưỡng công bố là bắt buộc.

## 3. Quy trình phản hồi đề xuất

1. Sinh viên chọn lớp học phần hợp lệ, loại phản hồi, mức độ, có hoặc không ẩn danh, rồi gửi nội dung và tệp hợp lệ nếu có.
2. Hệ thống định tuyến theo loại. Phản hồi về giảng dạy/tài liệu/kiểm tra được chuyển tới người phụ trách theo quy tắc; cơ sở vật chất, lịch học và loại khác tới cán bộ ĐBCL. Khiếu nại đồng gửi trưởng bộ môn.
3. Người nhận tiếp nhận, xử lý và trả lời; chuyển tiếp hoặc từ chối phải ghi lý do. Toàn bộ trạng thái và trao đổi có lịch sử bất biến.
4. Hệ thống đánh dấu quá hạn theo ngày làm việc và leo thang theo cấp. Cờ quá hạn là thuộc tính, không phải một trạng thái xử lý.
5. Sinh viên xem câu trả lời, đánh giá hài lòng và có thể mở lại tối đa một lần trong điều kiện quy định.

Trạng thái chính: `MOI → DA_TIEP_NHAN → DANG_XU_LY → DA_TRA_LOI → DA_DONG`. Nhánh `CHUYEN_TIEP`, `TU_CHOI`, `MO_LAI` cần kiểm tra vai trò, lý do và điều kiện thời gian theo Mục 5.3.

## 4. Vai trò và phạm vi

Một người dùng có thể có nhiều gán vai trò, mỗi gán kèm phạm vi toàn hệ thống, khoa hoặc bộ môn. Kiểm quyền thống nhất tại service, mặc định từ chối và kiểm cả quyền với dữ liệu cụ thể.

| Vai trò | Trách nhiệm chính | Giới hạn nổi bật |
|---|---|---|
| `SINH_VIEN` | Làm khảo sát lớp mình đăng ký; gửi, theo dõi và đánh giá phản hồi. | Không xem kết quả tổng hợp. |
| `GIANG_VIEN` | Xem kết quả lớp phụ trách sau công bố, trả lời phản hồi, viết giải trình. | Không thấy danh tính người gửi khi phản hồi ẩn danh. |
| `TRUONG_BO_MON` | Xem dữ liệu trong bộ môn; xác nhận giải trình, xử lý phản hồi được chuyển/leo thang. | Danh sách chưa hoàn thành không đi kèm câu trả lời. |
| `TRUONG_KHOA` | Xem và xử lý trong phạm vi khoa; nhận leo thang cấp khoa. | Không vượt phạm vi khoa. |
| `CAN_BO_DBCL` | Quản lý mẫu, đợt, tiến độ, kiểm duyệt, công bố, báo cáo và một số phản hồi. | Chỉ theo quyền nghiệp vụ được cấp. |
| `LANH_DAO` | Duyệt/từ chối đợt, xem dashboard toàn trường. | Duyệt/từ chối phải lưu lịch sử; từ chối có lý do. |
| `ADMIN` | Quản lý tài khoản, vai trò, cấu hình và kiểm toán; bắt buộc 2FA. | Không mặc định xem nội dung phản hồi hoặc kết quả khảo sát. |

## 5. Thuật ngữ

| Thuật ngữ | Nghĩa trong sản phẩm |
|---|---|
| Học kỳ | Khoảng đào tạo chứa lớp học phần; có trạng thái khóa sổ. |
| Lớp học phần | Lần mở một môn học trong học kỳ, có sinh viên đăng ký và giảng viên phụ trách. |
| Mẫu phiếu/phiên bản | Bộ nhóm tiêu chí và câu hỏi; phiên bản được duyệt cho đợt thì khóa. |
| Đợt khảo sát | Lần phát hành mẫu phiếu theo phạm vi và thời gian, có vòng đời duyệt–mở–đóng–công bố. |
| Nhiệm vụ khảo sát (`SurveyTask`) | Bản ghi một sinh viên cần/đã làm khảo sát cho một lớp trong một đợt. |
| Phiếu trả lời (`SurveyResponse`) | Phiếu nộp ẩn danh, tách khỏi nhiệm vụ và người dùng. |
| Ngưỡng công bố | Điều kiện tối thiểu về số phiếu **và** tỉ lệ tham gia để hiện kết quả một lớp. |
| Phản hồi | Góp ý/đề xuất/khiếu nại gửi trong kênh xử lý liên tục. |
| SLA | Thời hạn cam kết tiếp nhận và trả lời, tính theo ngày làm việc. |
| Leo thang | Chuyển thông báo/xử lý lên cấp trên khi quá hạn. |
| Giải trình cải tiến | Bản trả lời và kế hoạch cải tiến của giảng viên khi kết quả dưới ngưỡng cảnh báo. |
| Kiểm toán (`AuditLog`) | Nhật ký thao tác nhạy cảm, không chứa mật khẩu, token hay nội dung phiếu. |

## 6. Bảng mã quy tắc nghiệp vụ

Mỗi BR phải có ít nhất một test gắn mã khi được triển khai. `P0` bắt buộc, `P1` cần cho dùng thật, `P2` mở rộng. Nội dung chính xác và ngoại lệ của từng mã xem Mục 6 của `DAC_TA_NGHIEP_VU.md`.

| Mã | Ưu tiên | Tóm tắt |
|---|---|---|
| BR-01 | P0 | Chốt đối tượng khảo sát từ đăng ký lúc mở đợt. |
| BR-02 | P0 | Nộp tối đa một phiếu cho mỗi đợt và lớp, chịu được đồng thời. |
| BR-03 | P0 | Tách phiếu trả lời khỏi danh tính theo thiết kế ẩn danh. |
| BR-04 | P0 | Chỉ nộp đúng thời gian và với câu trả lời hợp lệ. |
| BR-05 | P0 | Khóa phiên bản mẫu khi đã gắn vào đợt được duyệt. |
| BR-06 | P0 | Đợt phải được duyệt trước khi mở; các thay đổi có kiểm soát. |
| BR-07 | P0 | Công bố khi đủ số phiếu và tỉ lệ tham gia. |
| BR-08 | P0 | Kiểm soát thời điểm xem kết quả theo vai trò. |
| BR-09 | P1 | Kiểm duyệt góp ý tự luận trước khi hiển thị. |
| BR-10 | P1 | Điểm thấp sinh yêu cầu giải trình, trưởng bộ môn xác nhận. |
| BR-11 | P0 | Tính điểm đúng công thức trọng số. |
| BR-12 | P0 | Tính tỉ lệ tham gia từ nhiệm vụ hoàn thành. |
| BR-13 | P1 | Xem và nhắc danh sách chưa hoàn thành, không lộ phiếu. |
| BR-14 | P2 | Cung cấp trạng thái hoàn thành cho hệ thống điểm, chưa tích hợp thật. |
| BR-15 | P1 | Gia hạn/đóng sớm có quyền, lý do và nhật ký. |
| BR-16 | P1 | Một đợt có nhiều lớp; mặc định đánh giá ở mức lớp. |
| BR-17 | P1 | Học kỳ khóa sổ chỉ đọc. |
| BR-18 | P0 | ADMIN không mặc định có quyền xem dữ liệu nghiệp vụ. |
| BR-20 | P0 | Sinh viên chỉ gửi phản hồi cho lớp đã/đang đăng ký trong kỳ hợp lệ. |
| BR-21 | P0 | Định tuyến phản hồi và lưu lịch sử chuyển tiếp. |
| BR-22 | P0 | Chỉ chuyển trạng thái phản hồi hợp lệ bởi đúng vai trò. |
| BR-23 | P1 | SLA và leo thang qua job chạy lặp an toàn. |
| BR-24 | P0 | Ẩn danh người gửi với người xử lý khi sinh viên chọn. |
| BR-25 | P1 | Đánh giá hài lòng và mở lại có giới hạn. |
| BR-26 | P1 | Giới hạn và cảnh báo phản hồi trùng để chống spam. |
| BR-27 | P1 | Kiểm duyệt hoặc khóa nội dung vi phạm có lý do. |
| BR-28 | P0 | Giới hạn và kiểm tra tệp đính kèm, tải có kiểm quyền. |
| BR-30 | P0 | Ghi AuditLog cho thao tác nhạy cảm, loại trừ bí mật và nội dung phiếu. |
| BR-31 | P0 | Băm mật khẩu bcrypt, phiên JWT theo đặc tả. |
| BR-32 | P0 | ADMIN bắt buộc xác thực hai bước. |
| BR-33 | P0 | Khóa tạm sau nhiều lần đăng nhập sai, lỗi không lộ tài khoản. |
| BR-34 | P0 | Kiểm quyền truy vấn theo ID tại tầng service/dữ liệu. |
| BR-35 | P2 | Cấu hình lưu trữ và xử lý dữ liệu hết hạn. |
