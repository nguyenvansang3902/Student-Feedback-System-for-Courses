# Ma trận quyền 10 vai trò — Điều chỉnh số 01

Nguồn: [đặc tả](DAC_TA_NGHIEP_VU.md), [prompt bổ sung nguyên văn](BO_SUNG_01_TAC_NHAN.md). Tài liệu giữ các bảng lịch sử G1/Tuần 7–8 và bổ sung quyền đã hiện thực, kiểm tự động ở Tuần 12 tại mục 6. Bảng thiết kế G1 không phản ánh trạng thái triển khai hiện tại. Bằng chứng chạy thật được ghi ở [TRUY_VET](TRUY_VET.md); các ô quyền không thay cho kết quả test. FR-160/TC-ALL-01 chỉ được nghiệm thu từng phạm vi, chưa thể kết luận toàn hệ thống trước Tuần 13.

## 1. Vai trò và phạm vi hợp lệ

| Viết tắt | Mã vai trò | Phạm vi gán | Giới hạn dữ liệu |
| --- | --- | --- | --- |
| SV | SINH_VIEN | GLOBAL | Tài khoản của mình, lớp đã đăng ký; không suy thành quyền toàn trường |
| GV | GIANG_VIEN | GLOBAL | Tài khoản của mình, lớp được phân công |
| TBM | TRUONG_BO_MON | DEPARTMENT + departmentId | Một bộ môn được gán |
| TK | TRUONG_KHOA | FACULTY + facultyId | Một khoa được gán |
| ĐBCL | CAN_BO_DBCL | GLOBAL | Mẫu phiếu/khảo sát, kết quả và phản hồi theo nghiệp vụ; không hồ sơ Thanh tra |
| LĐ | LANH_DAO | GLOBAL | Phê duyệt/tổng quan; hồ sơ Thanh tra chỉ tóm tắt |
| ADMIN | ADMIN | GLOBAL | Tổ chức, tài khoản, vai trò, cấu hình, audit; bắt buộc MFA |
| PĐT | PHONG_DAO_TAO | GLOBAL | Dữ liệu đào tạo và đối tượng khảo sát; phản hồi TO_CHUC_LOP_HOC |
| KT | PHONG_KHAO_THI | GLOBAL | Phản hồi thi và kết quả nhóm đánh giá gộp theo BR-57 |
| TT | THANH_TRA | GLOBAL | Hồ sơ mật khi không xung đột; chỉ số bất thường theo BR-65 |

Không thêm phạm vi lớp sinh hoạt hoặc vai trò Cố vấn học tập. Grant sai loại phạm vi, thiếu ID, có ID thừa hoặc không còn trong DB phải bị từ chối. Khi một người có nhiều grant, chỉ grant hợp lệ mới cấp quyền; quyền quản trị không tự cấp quyền nghiệp vụ. Có ADMIN thì vẫn phải hoàn thành MFA dù thao tác bằng grant khác. Riêng hồ sơ Thanh tra, xung đột lợi ích luôn ưu tiên từ chối kể cả khi tài khoản có grant TT.

## 2. Chức năng tại mốc G1 — bảng lịch sử

Ký hiệu: **R** đọc; **W** tạo/sửa/xóa hoặc thao tác chuyên biệt; **M** quản trị có MFA; **—** từ chối. GLOBAL trong cột scope vẫn chịu giới hạn chức năng. Ở mốc G1, kết quả lớp trong không gian vai trò chỉ là metadata mã/tên môn, kỳ, bộ môn/khoa, chưa có kết quả khảo sát hay danh sách sinh viên.

| Chức năng / phạm vi dữ liệu | SV | GV | TBM | TK | ĐBCL | LĐ | ADMIN | PĐT | KT | TT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tài khoản/đổi mật khẩu/MFA cá nhân — chính mình | R/W | R/W | R/W | R/W | R/W | R/W | R/W | R/W | R/W | R/W |
| Không gian đúng vai trò được gán | R | R | R | R | R | R | M | R | R | R |
| Metadata lớp — lớp đã đăng ký/được phân công/bộ môn/khoa tương ứng | R own | R own | R bộ môn | R khoa | R GLOBAL | R GLOBAL | — | R GLOBAL | — | — |
| Tài khoản, grant vai trò/phạm vi, khóa-mở và reset MFA — GLOBAL | — | — | — | — | — | — | M | — | — | — |
| Cấu hình chính sách MFA và danh sách audit đã che bí mật — GLOBAL | — | — | — | — | — | — | M | — | — | — |
| Khoa/bộ môn — GLOBAL | — | — | — | — | R | — | R/W + MFA | R | — | — |
| Học kỳ/môn/lớp/phân công — GLOBAL | — | — | — | — | R | — | — | R/W | — | — |
| Danh sách GV để chọn phân công — GLOBAL, chỉ dữ liệu cần thiết | — | — | — | — | R | — | — | R | — | — |
| Khóa/mở khóa sổ học kỳ — GLOBAL | — | — | — | — | — | — | — | W | — | — |
| Mẫu import/chạy thử/xác nhận CSV-XLSX SV, GV, lớp, đăng ký — GLOBAL | — | — | — | — | — | — | — | R/W | — | — |
| Liệt kê/đọc/tạo/sửa/khóa/phiên bản/nhân bản/mặc định mẫu phiếu — GLOBAL | — | — | — | — | R/W | — | — | — | — | — |
| Đặt/xem trước isAssessmentGroup trên mẫu phiếu — GLOBAL | — | — | — | — | R/W | — | — | — | — | — |

PĐT nhập hồ sơ SV/GV và đăng ký qua luồng import sẵn có; G1 không tự nhận đã có màn CRUD hồ sơ riêng. Import giữ hành vi tạo tài khoản PENDING/thư kích hoạt đã có ở Tuần 5, nhưng actor và audit là PĐT. Tạo/khóa tài khoản đăng nhập trực tiếp vẫn thuộc ADMIN. Mở khóa sổ cần lý do, audit và thông báo ĐBCL; mọi ghi dữ liệu theo kỳ phải giữ guard kỳ khóa.

Mẫu đã khóa, mẫu gắn đợt đã duyệt hoặc có đáp án không được sửa cây cũ để thêm cờ. Cờ mới mặc định false; mẫu mặc định họ mới có đúng một nhóm “Kiểm tra, đánh giá” có cờ true. Tại mốc G1, KT chưa được xem trang kết quả chỉ vì đã có cờ; quyền kết quả được triển khai ở tuần sau theo BR-57.

Nguồn thực thi G1: `src/server/policies/can.ts`, `services/access.ts`, `services/workspace.ts`, `services/users.ts`, `services/catalog.ts`, `services/imports.ts`, `services/templates.ts`, `services/template-input.ts`. Service đọc lại actor/grant từ DB trước thao tác; list/count/detail dùng cùng scope. Menu ẩn không thay kiểm quyền API. Test mới và mã nghiệm thu chỉ được ghi hoàn tất sau khi chạy thật.

## 2.1. Phần triển khai Tuần 7

| Chức năng | ĐBCL | PĐT | LĐ | ADMIN MFA | Sáu vai trò còn lại |
| --- | --- | --- | --- | --- | --- |
| Danh sách/chi tiết/lựa chọn/readiness đợt | R | R | R | — | — |
| Tạo/sửa/trình/rút/gia hạn/đóng/hủy | W theo trạng thái | — | — | — | — |
| Xác nhận/trả về dữ liệu | — | W theo trạng thái | — | — | — |
| Duyệt/từ chối | — | — | W theo trạng thái | — | — |
| Tiến độ task/tỉ lệ theo lớp, không định danh SV | R | — | R | — | — |
| Ngưỡng khảo sát mặc định | R | R | R | R/W + TOTP mới khi ghi | — |

Dùng GLOBAL hợp lệ cho bốn vai trò trên; ADMIN không có quyền ngầm đọc/ghi đợt. Nhiều grant được xét theo từng quyền và vẫn phải đáp ứng MFA. PĐT xem số lớp/cặp của readiness, không được endpoint tiến độ task. Chặn khóa học kỳ khi còn DA_DUYET/DANG_MO, đồng bộ khóa với duyệt/mở. Queue email chỉ xử lý bởi console scheduler, chưa có trung tâm thông báo cho tuần tương lai. Bằng chứng kiểm thật ghi tại nghiệm thu Tuần7.

## 2.2. Phần triển khai Tuần 8

| Chức năng / dữ liệu | SV có grant GLOBAL hợp lệ | Chín vai trò còn lại nếu không có grant SV |
| --- | --- | --- |
| Danh sách/lọc/count nhiệm vụ | R own, lọc studentId ngay truy vấn | — |
| Chi tiết nhiệm vụ/form và xác nhận | R own; nhiệm vụ người khác/ID lạ cùng404 | — |
| Nộp phiếu | W own, chỉ PENDING/đợt mở/đúng giờ/kỳ chưa khóa/mẫu khóa | — |
| Xem lại ID hoặc nội dung phiếu đã nộp | —; chỉ trạng thái/ngày hoàn thành | — |
| Nháp trình duyệt | Cục bộ user/task/templateversion, không API nháp | — |

`student-surveys:list/read/submit` yêu cầu phiên FULL và grant SINH_VIEN hợp lệ; service đọc lại phiên/quyền và kiểm MFA hiện tại sau mutex chung. Tài khoản ADMIN+SV vẫn phải MFA; ADMIN đơn vai trò không được quyền nộp. Lấy studentId từ actor, không nhận từ body; task chốt xác định quyền dù Enrollment đổi sau mở. Không dùng quyền metadata lớp hoặc tiến độ đợt để mở nội dung phiếu. Kết quả chưa có trong Tuần8.

Nguồn: `services/student-surveys.ts`, `student-survey-input.ts`, `policies/can.ts`, CSRF mục đích student-surveys và `/api/student-surveys`. HTTP kiểm10vai trò/IDOR/fresh rights; test privacy đi qua route/service để bắt trường cầu nối và sink log/audit/queue. Kết quả cổng cuối và giới hạn nằm tại [nghiệm thu Tuần8](NGHIEM_THU_TUAN_08.md); không suy toàn bộ FR-160 đã xong.

## 3. Thiết kế các tuần sau tại mốc G1 — bảng lịch sử

Ký hiệu thêm: **Q** xử lý đúng hàng đợi/được định tuyến; **G** dữ liệu gộp có ngưỡng; **S** tóm tắt; **I** chỉ số bất thường. Các ô dưới đây ghi yêu cầu thiết kế tại thời điểm G1, khi các chức năng này chưa được nghiệm thu. Giữ bảng để đối chiếu lịch sử; không hiểu các mốc Tuần 9–12 vẫn chưa có mã nguồn. Phạm vi Tuần 12 đã hiện thực và kiểm tự động được ghi riêng ở mục 6.

| Chức năng / mốc | SV | GV | TBM | TK | ĐBCL | LĐ | ADMIN | PĐT | KT | TT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tạo/trình/quản lý đợt — đã chuyển sang mục2.1 | — | — | — | — | R/W | R duyệt | — | R phạm vi xác nhận | — | — |
| Readiness/xác nhận/trả về dữ liệu — đã chuyển sang mục2.1 | — | — | — | — | R + nhận cảnh báo | R sau xác nhận | — | R/W | — | — |
| Lô nhập/hoàn tác chưa bị đợt chốt dùng — Tuần 7, P1 | — | — | — | — | — | — | — | R/W | — | — |
| Làm khảo sát/nhiệm vụ — đã chuyển sang mục2.2 | R/W own | — | — | — | — | — | — | — | — | — |
| Tiến độ hoàn thành, không nội dung phiếu — Tuần 7–9 | R own | — | R bộ môn | R khoa | R GLOBAL | R GLOBAL | — | Chỉ phạm vi dữ liệu xác nhận | — | — |
| Kết quả thông thường — Tuần 9 | — | R own, đã công bố | R bộ môn, đã công bố | R khoa, đã công bố | R từ tổng hợp | R từ tổng hợp | — | — | G theo BR-57 | I theo BR-65 từ Tuần 12 |
| Góp ý tự luận đã kiểm duyệt — Tuần 9 | — | R lớp mình | R bộ môn | R khoa | R/kiểm duyệt | Theo quyền nghiệp vụ | — | — | — | — |
| Phản hồi thường — Tuần 10–11 | R/W own | Q | Q bộ môn | Q khoa/leo thang | Q KHAC/leo thang | Q leo thang | — | Q TO_CHUC_LOP_HOC | Q THI_KET_THUC_HOC_PHAN | — |
| Kiến nghị rà soát — Tuần 11, P1 | — | — | Q phản hồi có lý do | R khi quá hạn | — | — | — | — | R/W | — |
| Gửi khiếu nại nghiêm trọng — Tuần 10 | W own | — | — | — | — | — | — | — | — | Q không xung đột |
| Nội dung đầy đủ/ghi chú/tệp hồ sơ Thanh tra — Tuần 10–11 | Chỉ kênh trao đổi của mình | — | — | — | — | — | — | — | — | R/W không xung đột |
| Chuyển phản hồi một chiều sang Thanh tra — Tuần 11, P1 | — | — | W/Q bộ môn | W/Q khoa | W/Q | — | — | W/Q | W/Q | Q nhận |
| Tóm tắt hồ sơ sau chuyển/kết luận — Tuần 11 | Kênh thông báo own | — | S nếu là người chuyển | S nếu là người chuyển | S nếu là người chuyển | S loại/trạng thái/kết luận/số liệu | — | S nếu là người chuyển | S nếu là người chuyển | R không xung đột |
| Xem/xử lý chỉ số bất thường — Tuần 12, P1 | — | — | — | — | Nhận cảnh báo CAN_LUU_Y | S nếu có căn cứ/quá hạn | — | — | — | I/R/W |
| Dashboard/thống kê/tệp xuất của vai trò mới — Tuần 12 | — | — | — | — | Theo quyền sẵn có | Theo quyền sẵn có | — | G PĐT | G thi | G hồ sơ |

Không cấp quyền PĐT/KT/TT đọc toàn bộ danh sách lớp, câu trả lời hoặc phản hồi bằng cách tái sử dụng một trang có DTO rộng hơn nhu cầu. PĐT chỉ có dữ liệu đào tạo và hàng đợi của mình; quyền metadata lớp G1 không mở kết quả. Quyền xem góp ý tự luận của các vai trò hiện có vẫn tuân BR-08/09; không dùng ô thiết kế để vượt ngưỡng hoặc trạng thái công bố.

## 4. Điều kiện nghiệp vụ ghi tại mốc G1

- KT: chỉ nhóm isAssessmentGroup, gộp môn/bộ môn/khoa sau DA_CONG_BO, ít nhất 2 giảng viên khác nhau và tổng phiếu ≥ minResponses. Không đủ thì “Chưa đủ dữ liệu gộp”; không lớp/GV/tự luận. Phản hồi thi không lưu điểm hoặc giải quyết phúc khảo; có lời nhắc cấu hình được.
- TT: kiểm xung đột động từ lớp → giảng viên/bộ môn/khoa trước list/count/detail/giao xử lý/tải tệp. Người bị phản ánh, TBM/TK liên quan bị loại kể cả cùng tài khoản có TT; trả 404 để không lộ sự tồn tại. ADMIN/ĐBCL không xem nội dung hồ sơ, LĐ chỉ DTO tóm tắt. Mỗi lần mở hồ sơ/tải tệp có audit.
- Danh tính khiếu nại: mặc định AN_DANH_HOAN_TOAN; CHO_THANH_TRA_BIET chỉ cho TT không xung đột và audit mỗi lần xem. Người bị phản ánh không thấy danh tính; người gửi dùng kênh own, không được xem ghi chú/tệp nội bộ. Hồ sơ là quản lý, không thay thủ tục kỷ luật/Thanh tra chính thức; ẩn danh ở mức ứng dụng.
- Sau chuyển một chiều, người chuyển chỉ xem trạng thái và kết luận tóm tắt, không còn nội dung hồ sơ. Phải giữ lịch sử/lý do và ràng buộc đối tượng liên quan.
- Cảnh báo khảo sát chỉ là chỉ số từ lớp có ≥10 phiếu sau DA_TONG_HOP; TT không xem điểm tuyệt đối/đáp án/tự luận. Không tự chặn công bố hoặc kết luận sai phạm.
- Dashboard/thống kê/tệp xuất ba vai trò mới không có định danh SV và có ngưỡng mẫu tối thiểu. File xuất phải có test riêng khi hiện thực; G1 chưa có luồng xuất để nghiệm thu BR-67 đầy đủ.

## 5. Test và giới hạn nghiệm thu

TC-PDT-01 kiểm ADMIN bị chặn tạo/sửa lớp và import, PĐT làm được; bổ sung kiểm ADMIN chỉ ghi tổ chức, ĐBCL chỉ đọc danh mục, kỳ khóa/mở và audit/thông báo. TC-ALL-01 ở G1 kiểm mười vai trò trên API/chức năng hiện có, grant sai, phiên thiếu MFA, danh sách/chi tiết/IDOR và tổ hợp vai trò. Tên file/kết quả chạy được cập nhật trong [TRUY_VET](TRUY_VET.md).

TC-PDT-02/03 ở Tuần 7; TC-KT-01 ở Tuần 9; TC-KT-02 và TC-TT-01/02/03 ở Tuần 10–11. TC-ALL-01 đầy đủ ở Tuần 13 gồm cả kết quả, hồ sơ, thống kê và tệp xuất khi đã hiện thực. Không dùng fixture/seed hoặc phép thử từ chối action chưa tồn tại để tuyên bố các luồng tương lai đã hoàn thành.

## 6. Tuần 12 — quyền đã hiện thực và được kiểm tự động

Ngày đối chiếu: 03/11/2026. Mục này mô tả dashboard, báo cáo, tệp xuất và cảnh báo bất thường đã có mã nguồn; không thay các quyền thao tác nghiệp vụ chi tiết của từng quy trình. CI nguồn [`6692854e97088845ce5b263318dfb1f6239fef04`](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/commit/6692854e97088845ce5b263318dfb1f6239fef04), [run 41588831428](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41588831428), có ba job `check`, `smoke`, `e2e` thành công. Đây là bằng chứng kiểm tự động, chưa phải nghiệm thu toàn bộ Tuần 12.

### 6.1. Dữ liệu dashboard/báo cáo theo 10 vai trò

| Vai trò được chọn | Dữ liệu được đọc và xuất CSV/XLSX/PDF | Giới hạn áp dụng |
| --- | --- | --- |
| SV | Số nhiệm vụ, số đã/chưa nộp và số phản hồi chưa đóng/đã đóng của chính tài khoản | Không điểm khảo sát, nội dung/ID phiếu hoặc số liệu sinh viên khác; không suy quyền GLOBAL thành toàn trường |
| GV | Điểm khảo sát của lớp đang được phân công; thống kê phản hồi thường được giao trong các lớp này | Chỉ kết quả đã công bố/lưu trữ; dữ liệu gộp qua ngưỡng; không mở rộng sang lớp ngoài phân công |
| TBM | Điểm khảo sát và thống kê phản hồi thường trong bộ môn được gán | Bộ môn/khoa còn hoạt động; kết quả đã công bố/lưu trữ và có ngưỡng; bộ lọc ngoài phạm vi bị chặn |
| TK | Điểm khảo sát và thống kê phản hồi thường trong khoa được gán | Khoa/bộ môn còn hoạt động; kết quả đã công bố/lưu trữ và có ngưỡng; không đọc khoa khác |
| ĐBCL | Điểm khảo sát từ tổng hợp; thống kê phản hồi thường; cấu hình ngưỡng báo cáo và cảnh báo bất thường | Không thống kê/nội dung hồ sơ Thanh tra hay chỉ số đầy đủ của cờ bất thường; chỉ nhận thông báo chung khi TT chọn Cần lưu ý |
| LĐ | Điểm khảo sát từ tổng hợp, thống kê phản hồi thường và thống kê hồ sơ ở mức tóm tắt khi có quyền tương ứng | Không nội dung, danh tính, ghi chú/tệp hoặc lý do kết luận hồ sơ; không quyền đọc/xem xét cờ bất thường chỉ nhờ vai trò LĐ |
| ADMIN | Số tài khoản, tài khoản hoạt động và phiên còn hiệu lực | Bắt buộc MFA; chỉ dashboard quản trị, kể cả khi tài khoản có thêm vai trò khác; không dữ liệu nghiệp vụ nhạy cảm |
| PĐT | Số liệu độ sẵn sàng đợt và thống kê phản hồi `TO_CHUC_LOP_HOC` | Không điểm/đáp án/tự luận, roster hoặc hồ sơ Thanh tra; readiness chỉ chiếu số lớp/lỗi/cảnh báo, không danh sách sinh viên |
| KT | Điểm nhóm kiểm tra, đánh giá gộp theo môn/bộ môn/khoa và thống kê phản hồi `THI_KET_THUC_HOC_PHAN` | BR-57: sau công bố/lưu trữ, đủ mẫu và ít nhất hai giảng viên thực sự đóng góp điểm; không theo lớp/GV, không tự luận hoặc hồ sơ Thanh tra |
| TT | Thống kê hồ sơ trong phạm vi không xung đột; đọc và xem xét chỉ số cảnh báo qua luồng riêng | Dashboard/tệp xuất chỉ số liệu gộp có ngưỡng; luồng cảnh báo không có điểm tuyệt đối/đáp án/tự luận/danh tính sinh viên; không đọc kết quả khảo sát thường chỉ nhờ vai trò TT |

Mỗi lần đọc/xuất kiểm lại phiên và grant hiện tại trong giao dịch. Vai trò báo cáo được chọn riêng; không lấy quyền của vai trò khác để mở rộng tập dữ liệu. ADMIN luôn bị giới hạn ở dashboard quản trị; ĐBCL ghép TT không được chọn báo cáo hồ sơ hoặc đọc/xem xét chỉ số TT. Với TT ghép GV/TBM/TK, xung đột được loại trước truy vấn danh sách, tổng và thống kê; truy cập ID hồ sơ/cờ xung đột trả 404.

### 6.2. Ngưỡng và dữ liệu được phép chiếu — BR-57/65/67/68

- **BR-57:** ngưỡng hai giảng viên dựa trên ảnh chụp thống kê đã kiểm cấu trúc. Mỗi giảng viên được tính phải thuộc tập có phản hồi và có ít nhất một giá trị LIKERT hợp lệ trong nhóm `isAssessmentGroup`. Nhóm toàn NA/trống, nhóm rỗng hoặc chỉ có câu khác loại không giúp đủ hai giảng viên. Cùng helper được dùng trong báo cáo, đường đọc kết quả và bằng chứng tạo kiến nghị; vẫn phải đạt ngưỡng mẫu của từng luồng.
- **BR-65:** TT không xung đột xem cờ từ `DA_TONG_HOP`, `DA_CONG_BO` hoặc `LUU_TRU`; kỳ khóa sổ chỉ đọc. Mặc định cần ít nhất 10 phiếu, tỷ lệ đồng nhất từ 70% hoặc chênh lệch tuyệt đối với kỳ trước từ 1,5 điểm. Chỉ TT được xem xét với lý do; chuyển xác minh tạo một hồ sơ duy nhất, không tạo phản hồi giả hoặc thông báo kết luận cho toàn bộ sinh viên. Cờ không tự kết luận vi phạm hay chặn công bố. ĐBCL quản lý ngưỡng và nhận thông báo Cần lưu ý chung, không có quyền đọc chỉ số đầy đủ.
- **BR-67:** dashboard, biểu đồ và tệp xuất dùng chung DTO đã kiểm quyền/ngưỡng, không xuất tên/tài khoản/email sinh viên, câu trả lời, nội dung phản hồi hoặc ghi chú/tệp Thanh tra. Ô số bị ẩn giữ `null`, không thay bằng 0. Lớp/môn bị ẩn kéo theo tổng cha để tránh suy ngược bằng phép trừ; ô trạng thái/quá hạn/kết luận nhỏ có thể làm ẩn cả hàng. Trung bình và tỷ lệ kiểm riêng số mẫu của chính chỉ số. Xuất có audit và nhãn phạm vi đã kiểm; không có nhánh đọc bảng thô để xuất.
- **BR-68:** quyền quản trị không tạo quyền nghiệp vụ nhạy cảm. Mọi tổ hợp vai trò vẫn chịu giới hạn ADMIN/ĐBCL và xung đột TT nêu trên; không dựa vào việc ẩn menu để bảo vệ dữ liệu. Cấu hình ngưỡng báo cáo/cảnh báo thuộc ĐBCL hợp lệ, không cấp cho ADMIN chỉ vì có quyền quản trị.

Chi tiết công thức và giới hạn suy ngược: [CONG_THUC_BAO_CAO](CONG_THUC_BAO_CAO.md), [cảnh báo bất thường](CANH_BAO_BAT_THUONG_TUAN_12.md), [ADR-012](decisions/ADR-012-bao-cao-va-nguong-du-lieu.md). Ẩn ngưỡng ở mức ứng dụng không phải cam kết chống mọi phép kết hợp nhiều báo cáo, kiến thức bên ngoài hoặc quyền database/hạ tầng.

### 6.3. Bằng chứng và trạng thái nghiệm thu

CI nguồn nêu trên kiểm **32 nhóm riêng của Tuần 12**: 13 nhóm service/MySQL báo cáo, 9 nhóm service/MySQL bất thường và 10 nhóm renderer xuất CSV/XLSX/PDF bằng DTO giả. Không gọi cả 32 nhóm là kiểm HTTP: 22 nhóm dùng database thử riêng, còn 10 nhóm xuất không truy cập database. Các kiểm gồm 10 vai trò, phạm vi/IDOR, đa vai trò, dữ liệu trước công bố, ngưỡng hai giảng viên/all-NA, ẩn tổng cha, cạnh tranh và thu hồi phiên. E2E có 3/3 bài đạt bằng tổ hợp API/HTTP và trình duyệt Chromium, gồm dashboard 10 vai trò và xuất theo quyền; không tương đương thử tay toàn bộ giao diện.

Nguồn kiểm: `policies/reports.ts`, `policies/survey-anomalies.ts`, `services/reports.ts`, `services/reports-export.ts`, `services/survey-anomalies.ts`, các route `/api/reports` và `/api/survey-anomalies`; bộ riêng tại `scripts/verify-week12-reports.ts`, `scripts/verify-week12-anomalies.ts`, `scripts/verify-week12-exports.ts` và `tests/e2e/uc-gold.spec.ts`.

Kiểm tay mới đi đến lượt sinh viên nộp khảo sát và gửi phản hồi. Bước tiếp theo bị gián đoạn khi công cụ điều khiển trình duyệt trên Windows không xác định đủ chắc chắn URL hiện tại để thực thi chính sách và chặn tiếp tục; chưa đi hết UC-GOLD bằng tay qua các vai trò. Vì vậy **Tuần 12 chưa được nghiệm thu toàn bộ**, không đánh dấu hoàn tất FR chỉ từ kết quả CI. FR-160/TC-ALL-01 toàn hệ thống vẫn thuộc phạm vi nghiệm thu Tuần 13. Đối chiếu [UC-GOLD](UC_GOLD_TUAN_12.md), [QA giao diện](QA_GIAO_DIEN_TUAN_12.md) và [nghiệm thu Tuần 12](NGHIEM_THU_TUAN_12.md) để phân biệt bước đã chạy với phần còn lại.
