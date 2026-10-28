# Ma trận quyền 10 vai trò — Điều chỉnh số 01

Nguồn: [đặc tả](DAC_TA_NGHIEP_VU.md), [prompt bổ sung nguyên văn](BO_SUNG_01_TAC_NHAN.md). Tài liệu này gồm quyền của chức năng đã có trong G1 và thiết kế cho các tuần sau. Bằng chứng chạy thật được ghi ở [TRUY_VET](TRUY_VET.md); các ô quyền không thay cho kết quả test. FR-160/TC-ALL-01 chỉ được nghiệm thu từng phạm vi, chưa thể kết luận toàn hệ thống trước Tuần 13.

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

## 2. Chức năng hiện có — phạm vi G1

Ký hiệu: **R** đọc; **W** tạo/sửa/xóa hoặc thao tác chuyên biệt; **M** quản trị có MFA; **—** từ chối. GLOBAL trong cột scope vẫn chịu giới hạn chức năng; kết quả lớp trong không gian vai trò hiện chỉ là metadata mã/tên môn, kỳ, bộ môn/khoa, chưa có kết quả khảo sát hay danh sách sinh viên.

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

Mẫu đã khóa, mẫu gắn đợt đã duyệt hoặc có đáp án không được sửa cây cũ để thêm cờ. Cờ mới mặc định false; mẫu mặc định họ mới có đúng một nhóm “Kiểm tra, đánh giá” có cờ true. KT chưa được xem trang kết quả chỉ vì đã có cờ.

Nguồn thực thi G1: `src/server/policies/can.ts`, `services/access.ts`, `services/workspace.ts`, `services/users.ts`, `services/catalog.ts`, `services/imports.ts`, `services/templates.ts`, `services/template-input.ts`. Service đọc lại actor/grant từ DB trước thao tác; list/count/detail dùng cùng scope. Menu ẩn không thay kiểm quyền API. Test mới và mã nghiệm thu chỉ được ghi hoàn tất sau khi chạy thật.

## 3. Chức năng tương lai — thiết kế, chưa nghiệm thu trong G1

Ký hiệu thêm: **Q** xử lý đúng hàng đợi/được định tuyến; **G** dữ liệu gộp có ngưỡng; **S** tóm tắt; **I** chỉ số bất thường. Tất cả ô dưới đây là quyền yêu cầu khi tới tuần triển khai, chưa có nghĩa đã mở chức năng.

| Chức năng / mốc | SV | GV | TBM | TK | ĐBCL | LĐ | ADMIN | PĐT | KT | TT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tạo/trình/quản lý đợt — Tuần 7 | — | — | — | — | R/W | R duyệt | — | R phạm vi xác nhận | — | — |
| Readiness/xác nhận/trả về dữ liệu — Tuần 7 | — | — | — | — | R + nhận cảnh báo | R sau xác nhận | — | R/W | — | — |
| Lô nhập/hoàn tác chưa bị đợt chốt dùng — Tuần 7, P1 | — | — | — | — | — | — | — | R/W | — | — |
| Làm khảo sát/nhiệm vụ — Tuần 8 | R/W own | — | — | — | — | — | — | — | — | — |
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

## 4. Điều kiện bắt buộc trên luồng tương lai

- KT: chỉ nhóm isAssessmentGroup, gộp môn/bộ môn/khoa sau DA_CONG_BO, ít nhất 2 giảng viên khác nhau và tổng phiếu ≥ minResponses. Không đủ thì “Chưa đủ dữ liệu gộp”; không lớp/GV/tự luận. Phản hồi thi không lưu điểm hoặc giải quyết phúc khảo; có lời nhắc cấu hình được.
- TT: kiểm xung đột động từ lớp → giảng viên/bộ môn/khoa trước list/count/detail/giao xử lý/tải tệp. Người bị phản ánh, TBM/TK liên quan bị loại kể cả cùng tài khoản có TT; trả 404 để không lộ sự tồn tại. ADMIN/ĐBCL không xem nội dung hồ sơ, LĐ chỉ DTO tóm tắt. Mỗi lần mở hồ sơ/tải tệp có audit.
- Danh tính khiếu nại: mặc định AN_DANH_HOAN_TOAN; CHO_THANH_TRA_BIET chỉ cho TT không xung đột và audit mỗi lần xem. Người bị phản ánh không thấy danh tính; người gửi dùng kênh own, không được xem ghi chú/tệp nội bộ. Hồ sơ là quản lý, không thay thủ tục kỷ luật/Thanh tra chính thức; ẩn danh ở mức ứng dụng.
- Sau chuyển một chiều, người chuyển chỉ xem trạng thái và kết luận tóm tắt, không còn nội dung hồ sơ. Phải giữ lịch sử/lý do và ràng buộc đối tượng liên quan.
- Cảnh báo khảo sát chỉ là chỉ số từ lớp có ≥10 phiếu sau DA_TONG_HOP; TT không xem điểm tuyệt đối/đáp án/tự luận. Không tự chặn công bố hoặc kết luận sai phạm.
- Dashboard/thống kê/tệp xuất ba vai trò mới không có định danh SV và có ngưỡng mẫu tối thiểu. File xuất phải có test riêng khi hiện thực; G1 chưa có luồng xuất để nghiệm thu BR-67 đầy đủ.

## 5. Test và giới hạn nghiệm thu

TC-PDT-01 kiểm ADMIN bị chặn tạo/sửa lớp và import, PĐT làm được; bổ sung kiểm ADMIN chỉ ghi tổ chức, ĐBCL chỉ đọc danh mục, kỳ khóa/mở và audit/thông báo. TC-ALL-01 ở G1 kiểm mười vai trò trên API/chức năng hiện có, grant sai, phiên thiếu MFA, danh sách/chi tiết/IDOR và tổ hợp vai trò. Tên file/kết quả chạy được cập nhật trong [TRUY_VET](TRUY_VET.md).

TC-PDT-02/03 ở Tuần 7; TC-KT-01 ở Tuần 9; TC-KT-02 và TC-TT-01/02/03 ở Tuần 10–11. TC-ALL-01 đầy đủ ở Tuần 13 gồm cả kết quả, hồ sơ, thống kê và tệp xuất khi đã hiện thực. Không dùng fixture/seed hoặc phép thử từ chối action chưa tồn tại để tuyên bố các luồng tương lai đã hoàn thành.
