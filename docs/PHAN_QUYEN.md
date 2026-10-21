# Ma trận vai trò, hành động và phạm vi — Tuần 2

Soạn thực tế **21/10/2026**, theo Mục 4, 6 và 8.5 của [đặc tả](DAC_TA_NGHIEP_VU.md). Đây là **thiết kế quyền dự kiến**, chưa phải policy/service đang chạy. Tuần 2 chưa triển khai đăng nhập hay giao diện quản trị. Các test quyền dưới đây là kế hoạch cho tuần chức năng và Tuần 13, không phải kết quả test hiện tại.

## 1. Quy tắc ra quyết định

Mỗi gán vai trò gồm `(userId, role, scopeType, scopeId)`. Phạm vi toàn hệ thống, khoa, bộ môn phải khớp loại vai trò và tài nguyên. Một người có thể có nhiều gán; quyền hợp lệ là hợp của **các gán đã được cấp**, không tự kế thừa chỉ vì chức danh hay có ADMIN. Ví dụ ADMIN + GIANG_VIEN chỉ được xem lớp mình qua gán GIANG_VIEN, giữ nguyên công bố/ngưỡng; ADMIN đơn vai trò không có quyền ấy.

Mọi service nhận actor và gọi policy trước truy cập dữ liệu. Một hành động không có trong ma trận hoặc không đáp ứng đủ điều kiện sẽ **bị từ chối mặc định**. Middleware chỉ sàng lọc phiên; Server Component/Action/Route Handler và service vẫn phải kiểm. Đường list/detail/count/export/download cùng quy tắc và cùng bộ lọc, không chỉ ẩn nút trên giao diện. Không suy ra quyền ghi từ quyền xem. Job chạy bằng danh tính hệ thống được giới hạn đúng tác vụ, không giả actor ADMIN hoặc bỏ kiểm quyền đầu vào.

### Ký hiệu phạm vi

| Mã | Ý nghĩa |
| --- | --- |
| — | Từ chối đối với vai trò này; việc được gán thêm vai trò khác được xét độc lập. |
| A | Luồng xác thực công khai có rate limit và token đúng mục đích, không có quyền nghiệp vụ khi chưa có phiên đầy đủ. |
| O | Chính tài khoản/người nhận/chủ phản hồi của actor; lấy actor từ phiên, không tin userId client. |
| G | Các lớp mà actor là giảng viên được phân công; không phải tất cả lớp của bộ môn. |
| B | Tài nguyên thuộc bộ môn được gán; lớp/môn/giảng viên phải chứng minh thuộc phạm vi bằng dữ liệu máy chủ. |
| K | Tài nguyên thuộc khoa được gán, qua quan hệ khoa–bộ môn–lớp. |
| T | Toàn hệ thống trong đúng hành động nghiệp vụ đã cấp; không có nghĩa đọc mọi dữ liệu/thông tin cá nhân. |
| X | Chỉ phản hồi được định tuyến/chuyển tiếp/leo thang cho chính actor hoặc hàng đợi vai trò hợp lệ, đồng thời khớp G/B/K/T. |
| R(G/B/K/T) | Xem kết quả với phạm vi trong ngoặc và **toàn bộ** điều kiện R ở Mục 3. |
| Q | Chỉ thiết lập hệ thống/quản lý tài khoản/kiểm toán; bắt buộc ADMIN + mfa=true, không mở quyền nghiệp vụ. |
| P | Endpoint công khai trả thông tin vận hành tối thiểu; không tài khoản/bí mật/kết quả/nội dung. |

SV = SINH_VIEN; GV = GIANG_VIEN; TBM = TRUONG_BO_MON; TK = TRUONG_KHOA; ĐBCL = CAN_BO_DBCL; LĐ = LANH_DAO. Các cột viết tắt chỉ để bảng dễ đọc; 7 vai trò vẫn là 7 giá trị riêng.

## 2. Ma trận bao phủ 63 FR

Mỗi ô là quyền cho **hành động ở dòng đó**, không phải quyền toàn module. Ô có điều kiện ở cột cuối chỉ được chấp nhận khi điều kiện đúng. Các thao tác tạo/sửa/xóa dữ liệu trong học kỳ đã khóa đều bị từ chối (BR-17), kể cả ĐBCL. Các thao tác triển khai/khôi phục bằng CLI không tự trở thành quyền web ADMIN.

### M1–M3. Tài khoản, quản trị, danh mục

| FR / hành động | SV | GV | TBM | TK | ĐBCL | LĐ | ADMIN | Điều kiện bổ sung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-01 Đăng nhập | A | A | A | A | A | A | A | Chưa kích hoạt/khóa/2FA chưa xong không có phiên nghiệp vụ. |
| FR-02 Làm mới, đăng xuất/thu hồi phiên mình | O | O | O | O | O | O | O | Refresh đúng mục đích, xoay vòng; không thu hồi phiên người khác qua API cá nhân. |
| FR-03 Đổi mật khẩu mình | O | O | O | O | O | O | O | Xác minh mật khẩu hiện tại; thu hồi mọi phiên sau đổi. |
| FR-04 Yêu cầu/đặt lại mật khẩu | A | A | A | A | A | A | A | Token một lần ≤30 phút, không lộ tài khoản. |
| FR-05 Kích hoạt/đổi mật khẩu tạm mình | A | A | A | A | A | A | A | Token tạm/khởi tạo chỉ tới đúng bước này. |
| FR-06 Chịu rate limit/khóa tạm | O | O | O | O | O | O | O | Không vai trò nào được bỏ qua rate limit của luồng người dùng. |
| FR-07 Đăng ký/xác nhận/dùng mã khôi phục 2FA mình | O | O | O | O | O | O | O | Bắt buộc cho ADMIN; vai trò khác tùy FR-08; chưa xác nhận mã đầu chưa bật. |
| FR-08 Cấu hình vai trò bắt buộc 2FA | — | — | — | — | — | — | Q | Người bị áp chính sách thực hiện quy trình O của FR-07, không sửa chính sách. |
| FR-09 Xem/thu hồi thiết bị mình (P2) | O | O | O | O | O | O | O | Không đọc token hoặc phiên người khác. |
| FR-10 Tạo/khóa/mở/gán vai trò/phạm vi | — | — | — | — | — | — | Q | Audit thay đổi; không cấp quyền ngầm qua danh mục. |
| FR-11 Được policy kiểm mọi hành động | O | G | B | K | T | T | Q | Đây là ràng buộc bắt buộc, không phải nút “bỏ qua policy”. |
| FR-12 Xem/lọc AuditLog | — | — | — | — | — | — | Q | Nhật ký đã lược bí mật, không chứa nội dung phiếu/phản hồi. |
| FR-20 CRUD/khóa sổ danh mục | — | — | — | — | T | — | — | Đề xuất thiết kế: giao ĐBCL vận hành danh mục; khóa sổ có lý do/audit, không tự mở lại. |
| FR-21 Import SV/GV/lớp/đăng ký | — | — | — | — | T | — | — | Đề xuất ĐBCL; dry-run và commit riêng; không tự gán vai trò quản trị; import tài khoản qua luồng được kiểm soát. |
| FR-22 Tải mẫu import | — | — | — | — | T | — | — | Mẫu giả cùng quyền import, không phải xuất dữ liệu thật. |

FR-07 bao gồm việc đặt lại 2FA của người khác: chỉ ADMIN khác có MFA hoặc người vận hành máy chủ dùng script, có audit; không dùng quyền O để tự bỏ 2FA. Thao tác rất nhạy cảm (đổi vai trò/reset 2FA) cần step-up TOTP ở mức P1. FR-20/21 chưa được đặc tả gán tường minh vai trò vận hành: đây là đề xuất ít quyền để hiện thực ở Tuần 5; quyền quản lý người dùng của ADMIN ở FR-10 vẫn riêng biệt.

### M4–M6. Mẫu, đợt, sinh viên làm khảo sát

| FR / hành động | SV | GV | TBM | TK | ĐBCL | LĐ | ADMIN | Điều kiện bổ sung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-30 Tạo/sửa nhóm và câu hỏi | — | — | — | — | T | — | — | Chỉ phiên bản chưa khóa; mẫu dùng ở đợt duyệt đã khóa. |
| FR-31 Đổi loại/bắt buộc/NA/trọng số | — | — | — | — | T | — | — | Cùng giới hạn phiên bản; server validate thang và trọng số. |
| FR-32 Tạo phiên bản/khóa mẫu | — | — | — | — | T | — | — | Khóa tự động khi duyệt; không sửa/khôi phục bản đã khóa để đổi lịch sử. |
| FR-33 Xem trước mẫu | — | — | — | — | T | T | — | ĐBCL soạn; LĐ chỉ xem bản đính kèm đợt chờ duyệt/duyệt, không sửa; preview không nộp phiếu. |
| FR-34 Nhân bản mẫu | — | — | — | — | T | — | — | Tạo bản mới độc lập, không sửa bản nguồn. |
| FR-35 Dùng mẫu mặc định | — | — | — | — | T | — | — | Nạp mẫu vào đợt nháp; seed bằng CLI do người vận hành. |
| FR-40 Tạo/sửa đợt nháp | — | — | — | — | T | — | — | Không sửa mẫu/phạm vi sau duyệt; xem thêm rút duyệt ở Mục 4. |
| FR-41 Chọn phạm vi đợt | — | — | — | — | T | — | — | Toàn trường/khoa/bộ môn/lớp hợp lệ trong học kỳ chưa khóa. |
| FR-42 Trình / duyệt / từ chối đợt | — | — | — | — | T trình | T duyệt/từ chối | — | NHAP→CHO_DUYET; LĐ chỉ xử lý CHO_DUYET; từ chối có lý do. |
| FR-43 Chốt đăng ký, sinh task | — | — | — | — | — | — | — | Tác vụ hệ thống khi DA_DUYET→DANG_MO; không endpoint tùy ý sửa task. |
| FR-44 Tự động mở/đóng | — | — | — | — | — | — | — | Hệ thống/ensure kiểm giờ, trạng thái, học kỳ; lặp/đồng thời an toàn. |
| FR-45 Gia hạn/đóng sớm/hủy | — | — | — | — | T | — | — | Có lý do/audit; gia hạn/đóng sớm DANG_MO; hủy chỉ NHAP/CHO_DUYET/DA_DUYET. |
| FR-46 Xem tiến độ tổng hợp | O trạng thái task | — | B | K | T | T tổng quan | — | Không có câu trả lời; LĐ xem chỉ số dashboard, không danh sách định danh SV chưa làm. |
| FR-47 Xem/xuất danh sách chưa làm, gửi nhắc | — | — | B | K | T | — | — | Chỉ PENDING; audit mọi lần xem/xuất, ≤1 nhắc/ngày/SV/đợt; không nội dung phiếu. |
| FR-50 Xem task được chốt | O | — | — | — | — | — | — | Tài khoản phải được gán SV và task.studentId = actor.id. |
| FR-51 Điền/kiểm form nhiệm vụ | O | — | — | — | — | — | — | DANG_MO, trong giờ mở–đóng máy chủ; task của mình, PENDING. |
| FR-52 Lưu/khôi phục nháp trình duyệt | O | — | — | — | — | — | — | Chỉ localStorage nháp, không token, không server; kiểm đúng task/phiên bản trước khôi phục. |
| FR-53 Nộp phiếu ẩn danh | O | — | — | — | — | — | — | PENDING→DONE + insert response/answer cùng transaction; không chuyển userId sang response. |
| FR-54 Xem xác nhận đã nộp | O | — | — | — | — | — | — | Từ trạng thái task mình; không trả lại nội dung/định danh phiếu. |

### M7–M8. Kết quả, giải trình và phản hồi

| FR / hành động | SV | GV | TBM | TK | ĐBCL | LĐ | ADMIN | Điều kiện bổ sung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-60 Yêu cầu tổng hợp/xem kết quả tổng hợp | — | — | — | — | T tổng hợp | R(T) xem | — | Job/ensure thực thi sau DA_DONG; chỉ ĐBCL khởi động nghiệp vụ, LĐ không sửa số liệu. |
| FR-61 Xem kết quả đã áp ngưỡng | — | R(G) | R(B) | R(K) | R(T) | R(T) | — | Thiếu mẫu chỉ thông báo hoặc số liệu gộp đúng quyền. |
| FR-62 Công bố kết quả | — | — | — | — | T | — | — | DA_TONG_HOP và hoàn tất kiểm duyệt; công bố không bỏ ngưỡng. |
| FR-63 Xem kết quả | — | R(G) | R(B) | R(K) | R(T) | R(T) | — | Tất cả điều kiện R ở Mục 3. |
| FR-64 So sánh đơn vị/kỳ trước | — | R(G) | R(B) | R(K) | R(T) | R(T) | — | GV thấy lớp mình và đối sánh gộp được phép, không mở lớp khác; không suy ngược lớp thiếu mẫu. |
| FR-65 Xem hàng đợi/ẩn/hiện tự luận | — | — | — | — | T | — | — | Người, lý do, từ khóa gắn cờ; người xem kết quả chỉ thấy HIEN_THI theo R. |
| FR-66 Xem/gửi/xác nhận giải trình | — | G gửi | B xem/xác nhận/bổ sung | K xem | T xem | T chỉ số | — | Đúng GV phụ trách; TBM xác nhận từ DA_GUI; TK không mặc định xác nhận thay; LĐ không sửa nội dung. |
| FR-70 Gửi phản hồi/tệp | O | — | — | — | — | — | — | SV đăng ký lớp kỳ hiện hành/liền trước cấu hình, kỳ chưa khóa; giới hạn/tệp đúng BR-20/26/28. |
| FR-71 Xem hàng đợi, nhận phản hồi | O xem phản hồi mình | G,X | B,X | K,X | T,X | — | — | ĐBCL xử lý CSVC/lịch học/khác hoặc leo thang tới mình; đồng gửi chỉ cấp quyền đọc theo Mục 4. |
| FR-72 Xem trạng thái/lịch sử | O | G,X | B | K | T,X | — | — | Người được đọc cũng chỉ thấy danh tính theo lựa chọn ẩn danh; không sửa/xóa lịch sử. |
| FR-73 Trao đổi | O | G,X | B,X | K,X | T,X | — | — | Chỉ chủ phản hồi/người xử lý hiện hành; người chỉ đồng gửi hoặc chỉ xem không được tự trả lời thay. |
| FR-74 Xem cờ SLA/nhận leo thang | O xem cờ | G,X | B,X | K,X | T,X | — | — | Job hệ thống gắn cờ/chuyển cấp; actor không tự đổi deadline/cờ để tránh SLA. |
| FR-75 Đánh giá hài lòng/mở lại | O | — | — | — | — | — | — | Điểm1–5 trong 7 ngày sau trả lời; mở lại từ DA_DONG, điểm≤2, một lần, trong hạn. |
| FR-76 Chuyển tiếp/từ chối | — | G,X | B,X | K,X | T,X | — | — | Người xử lý hiện hành; lý do bắt buộc; đích nhận đúng phạm vi/quy tắc định tuyến; không tự mở lại phản hồi đóng. |

Việc TBM/TK xem phản hồi trong đơn vị không đồng nghĩa nhận quyền xử lý tất cả. ĐBCL không mặc định đọc mọi phản hồi giảng dạy toàn trường: chỉ các loại/hàng đợi hoặc leo thang được giao. Dashboard tổng hợp có thể tính chỉ số không kèm nội dung chi tiết. LĐ được xem dashboard và kết quả theo BR-08, không mặc định đọc trao đổi/tệp phản hồi; ADMIN không được các quyền đó.

### M9–M12. Thông báo, báo cáo và hệ thống

| FR / hành động | SV | GV | TBM | TK | ĐBCL | LĐ | ADMIN | Điều kiện bổ sung |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-80 Xem/đánh dấu thông báo mình | O | O | O | O | O | O | O | Thông báo không tự cấp quyền vào đối tượng; ADMIN chỉ thông báo quản trị/hợp lệ với vai trò đã cấp. |
| FR-81 Nhận email thuộc quyền | O | O | O | O | O | O | O | Hệ thống gửi, không có API tùy ý gửi thay vai trò; không lộ danh tính ẩn danh. |
| FR-82 Nhắc hạn | O nhận | G,X nhận | B,X nhận | K,X nhận | T,X nhận | — | — | Hệ thống thực hiện; nhắc khảo sát thủ công chỉ TBM/TK/ĐBCL theo FR-47; không gửi trùng. |
| FR-90 Dashboard | O việc cá nhân | R(G) | R(B) | R(K) | R(T) | R(T) | Q vận hành | Nội dung tương ứng chức năng được cấp; Q không có kết quả/nội dung; SV không kết quả tổng hợp. |
| FR-91 Xem biểu đồ | — | R(G) | R(B) | R(K) | R(T) | R(T) | — | Biểu đồ nghiệp vụ giữ ngưỡng; số liệu vận hành Q nếu có là màn hình riêng không lộ nghiệp vụ. |
| FR-92 Xuất Excel/CSV kết quả | — | R(G) | R(B) | R(K) | R(T) | R(T) | — | Đề xuất kế thừa quyền xem; không định danh phiếu; PENDING xuất riêng chỉ FR-47. |
| FR-93 Xuất PDF kết quả | — | R(G) | R(B) | R(K) | R(T) | R(T) | — | Đề xuất như FR-92, không tạo lối bỏ qua ngưỡng. |
| FR-94 Xem/xuất báo cáo xử lý phản hồi | — | G chỉ số được giao | B | K | T tổng hợp | T tổng hợp | — | ĐBCL/LĐ toàn trường chỉ số gộp, không ngầm cấp đọc nội dung mọi phản hồi; lọc không lộ ẩn danh. |
| FR-100 Chỉnh cấu hình | — | — | — | — | T ngưỡng đợt | — | Q mặc định hệ thống | ĐBCL theo vòng đời đợt; ADMIN không sửa kết quả/ngưỡng đợt để mở quyền; lịch sử thay đổi. |
| FR-101 Tạo seed demo | — | — | — | — | — | — | — | CLI người vận hành dev/demo; không route web; không tự reset DB. |
| FR-102 Xem health check | P | P | P | P | P | P | P | Có thể xem không đăng nhập; app-only phải nói database:not_checked nếu không thử DB. |
| FR-103 Backup/restore | — | — | — | — | — | — | — | CLI người vận hành, quyền hạ tầng riêng; xin phép trước xóa/ghi đè dữ liệu; không suy ra quyền web từ ADMIN. |
| FR-110 AI gợi ý tự luận (P2) | — | — | — | — | T | — | — | Tắt mặc định, đồng ý trước, ẩn danh hóa; gợi ý không tự quyết kiểm duyệt. |
| FR-111 API trạng thái hoàn thành (P2) | — | — | — | — | T xuất có kiểm soát | — | — | Thiết kế API hệ thống tích hợp có principal riêng, chỉ trạng thái; không token ADMIN dùng chung, không tích hợp thật. |
| FR-112 Đánh giá riêng GV (P2) | O nộp | R(G) | R(B) | R(K) | R(T) cấu hình | R(T) | — | Chưa triển khai/xếp tuần; chính sách chi tiết phải duyệt, giữ ẩn danh/ngưỡng và một lần nộp theo thiết kế được duyệt. |

## 3. Điều kiện R: kết quả và quyền xem dữ liệu

1. GV/TBM/TK chỉ xem khi đợt ở **DA_CONG_BO**; dữ liệu lưu trữ từng được công bố có thể đọc với cùng giới hạn (đề xuất bảo toàn quyền đọc khi LUU_TRU). ĐBCL/LĐ được xem từ **DA_TONG_HOP** theo BR-08; trạng thái trước đó chỉ xem tiến độ có quyền, không nội dung kết quả chưa tổng hợp.
2. Chi tiết lớp chỉ khi `responseCount >= minResponses` **và** `doneTasks / totalTasks >= minRate`; mặc định 5 phiếu/30%. Khi tổng task=0 không đạt. Điều kiện có hiệu lực cả ĐBCL/LĐ; quyền xem sớm không bỏ ngưỡng bảo vệ.
3. Thiếu ngưỡng thì lớp hiện “Chưa đủ mẫu để công bố”; chỉ số gộp bộ môn/khoa chỉ dành người có phạm vi tương ứng. Đề xuất áp ngưỡng bảo vệ cho nhóm gộp và chặn lọc/so sánh/hiệu số làm suy ra lớp thiếu mẫu; chưa có thuật toán chống suy luận hoàn chỉnh ở Tuần 2.
4. GV xem lớp mình và số đối sánh gộp đã được phép; không drill-down sang lớp khác. TBM/TK xem đúng đơn vị. Các chỉ số có sẵn trong API/tooltip/export/cache cũng phải lọc, không chỉ bảng hiển thị.
5. Góp ý chỉ hiện khi `HIEN_THI`, ngoài điều kiện công bố/phạm vi/ngưỡng. `CHO_KIEM_DUYET`/`DA_AN` chỉ hàng đợi ĐBCL; không cho ADMIN đọc qua AuditLog.
6. Quyền xem danh sách SV chưa hoàn thành tách hẳn quyền xem phiếu: chỉ tên/định danh và trạng thái cần nhắc theo BR-13, có audit mọi lần xem/xuất; không tạo một đường quan hệ User–SurveyResponse, không xuất chung cùng nội dung.

## 4. Hành động chuyển trạng thái và thao tác nhạy cảm bổ sung

| Hành động cụ thể | SV | GV | TBM | TK | ĐBCL | LĐ | ADMIN | Ràng buộc |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rút trình/rút duyệt đợt về NHAP | — | — | — | — | T | — | — | Đề xuất ĐBCL; từ CHO_DUYET/DA_DUYET trước mở, có lý do, cần duyệt lại; không tự mở khóa mẫu cũ. |
| Duyệt/từ chối đợt của ĐBCL | — | — | — | — | — | T | — | Chỉ CHO_DUYET; từ chối có lý do, kiểm trạng thái cũ. |
| Đổi mẫu/phạm vi đợt đã duyệt | — | — | — | — | — | — | — | Phải rút về NHAP trước; đợt đã mở không cho rút. |
| Gia hạn thời gian đóng | — | — | — | — | T | — | — | DANG_MO, hạn mới lớn hơn hạn cũ, lý do/audit/thông báo; không mở lại đợt đã đóng. |
| Hủy đợt | — | — | — | — | T | — | — | Đề xuất ĐBCL là người lập; chỉ NHAP/CHO_DUYET/DA_DUYET, lý do, HUY kết thúc. |
| Tiếp nhận/bắt đầu/trả lời phản hồi | — | G,X | B,X | K,X | T,X | — | — | Chỉ người xử lý hiện hành; người đồng gửi chỉ đọc, TBM/TK chỉ xem đơn vị không được chiếm quyền ghi. |
| Đọc phản hồi đồng gửi | O nếu chủ | G nếu được gửi | B nếu được gửi/thuộc đơn vị | K thuộc đơn vị | T,X | — | — | Quyền đọc không tự cấp chuyển tiếp/trả lời; luôn che danh tính theo lựa chọn. |
| Chuyển tiếp phản hồi | — | G,X | B,X | K,X | T,X | — | — | Từ MOI/DA_TIEP_NHAN/DANG_XU_LY, lý do + đích hợp lệ, cập nhật người nhận và về MOI trong cùng transaction. |
| Từ chối phản hồi | — | G,X | B,X | K,X | T,X | — | — | Cùng tập trạng thái xử lý trước trả lời, lý do ngoài phạm vi/spam; lưu TU_CHOI; không xóa nội dung/lịch sử. |
| Đóng phản hồi sau trả lời | O xác nhận | — | — | — | — | — | — | Đề xuất chủ phản hồi xác nhận hoặc hệ thống đóng hết7 ngày; không tự đóng từ trạng thái chưa trả lời. |
| Mở lại phản hồi | O | — | — | — | — | — | — | DA_DONG→DANG_XU_LY, ≤2 điểm, ≤7 ngày từ lần trả lời, reopenCount<1; hệ thống giữ người nhận hợp lệ. |
| Ẩn/khóa nội dung phản hồi vi phạm | — | — | — | — | T kiểm duyệt | — | — | BR-27 chưa chỉ danh vai trò; đề xuất ĐBCL với mục đích kiểm duyệt, lý do/audit, không lộ danh tính/đọc tràn ngoài nghiệp vụ kiểm duyệt. |
| Tiết lộ danh tính phản hồi (P2) | — | — | — | — | T có quy trình | — | — | Tắt/chưa triển khai mặc định; chỉ khi có quy trình vi phạm, lý do và audit theo BR-24, không gộp vào quyền đọc thông thường. |
| Gửi/gửi lại giải trình | — | G | — | — | — | — | — | CAN_GIAI_TRINH/CAN_BO_SUNG→DA_GUI; phải đúng GV chịu trách nhiệm và kỳ chưa khóa. |
| Yêu cầu bổ sung/xác nhận giải trình | — | — | B | — | — | — | — | Chỉ DA_GUI; yêu cầu bổ sung kèm nhận xét, không xác nhận thẳng CAN_BO_SUNG. |
| Tải tệp phản hồi | O | G,X | B đọc | K đọc | T,X | — | — | Kiểm cùng quyền đọc phản hồi trước đọc file; không đường public, không lộ tệp ẩn/khóa ngoài policy. |
| Đặt lại 2FA ADMIN khác | — | — | — | — | — | — | Q | Actor là ADMIN khác, MFA; audit/step-up P1; CLI máy chủ là quy trình vận hành riêng. |

Các mục ghi “đề xuất” làm rõ chỗ nguồn chưa chỉ định từng actor/cạnh; chúng không thay mã/ưu tiên FR/BR, không được biến thành kết quả nghiệm thu. Khi hiện thực phải thống nhất trong ADR và cập nhật ma trận/test, không tự mở rộng quyền ADMIN. Đặc biệt BR-27 và truy cập hàng đợi kiểm duyệt phản hồi cần thiết kế truy xuất tối thiểu riêng, không dùng quyền kiểm duyệt để xem tất cả phản hồi tự do.

## 5. Kế hoạch test ma trận và IDOR khi hiện thực

Mỗi test ghi mã FR/BR và dùng tối thiểu: SV-A/SV-B; GV-A/GV-B; TBM bộ môn A/B cùng khoa và khác khoa; TK khoa A/B; ĐBCL; LĐ; ADMIN đơn vai trò; ADMIN+GV-A; tài khoản không vai trò/khóa/chưa kích hoạt; gán vai trò hết hiệu lực nếu có. Không thể nghiệm thu bằng cách chỉ thấy menu đúng.

| Nhóm kiểm | Trường hợp dương | Trường hợp âm bắt buộc |
| --- | --- | --- |
| Own / other | SV-A xem task/phản hồi/thông báo/phiên mình, GV-A xem lớp mình hợp lệ. | Thay ID sang SV-B; GV-A lấy lớp GV-B dù cùng bộ môn; đổi studentId trong payload; tài khoản chỉ ĐBCL không được nộp thay SV. |
| Same / different scope | TBM-A xem bộ môn A; TK-A xem đơn vị con khoa A; nhiều gán đúng phạm vi hoạt động độc lập. | TBM-A đọc bộ môn B cùng khoa; TK-A đọc khoa B; gán scopeId đúng nhưng scopeType sai; null scope hoặc tham số client giả toàn trường. |
| State / sample | Đợt đã công bố + đủ cả 2 ngưỡng; ĐBCL/LĐ xem sớm từ tổng hợp trong giới hạn. | Trước công bố; thiếu 1 phiếu/thiếu tỉ lệ; bằng0 task; truy cập lớp thiếu mẫu qua chart/export/so sánh; SV/ADMIN đọc kết quả bất kỳ. |
| Role / MFA | ADMIN mfa=true vào tài khoản/kiểm toán; ADMIN+GV chỉ lớp G được cấp. | ADMIN mfa=false/token tạm; ADMIN đơn vai trò đọc nghiệp vụ; LĐ tự lập/sửa đợt; TK xác nhận giải trình thay TBM; vai trò sai nhưng ID hợp lệ. |
| Feedback ownership | SV chủ trao đổi/đánh giá; người được giao tiếp nhận/chuyển tiếp; TBM/TK đọc trong đơn vị. | Người chỉ đồng gửi ghi/trả lời; người xử lý cũ ghi sau chuyển; LĐ/ADMIN tải file/nội dung; SV khác mở lại; lộ tên SV ẩn danh qua message/file/email. |
| State mutation | Chuyển hợp lệ có reason/expectedStatus; job lặp một tác dụng; gửi lại giải trình từ CAN_BO_SUNG. | Thiếu lý do, cạnh sai, actor sai, lặp và 20 lệnh đồng thời; sửa mẫu/phạm vi sau duyệt; gia hạn sau đóng; mở lại lần 2/hết7 ngày/điểm>2; kỳ khóa ghi. |
| Read surfaces | List/detail/count/search/export/download trả cùng phạm vi và ngưỡng. | Bypass URL trực tiếp, Server Action/Route Handler, ID của bản ghi tồn tại ngoài phạm vi, phân trang/cursor của người khác; middleware bị bỏ vẫn không vượt service. |
| Sensitive payload | Audit tóm tắt hợp lệ, PENDING chỉ trạng thái, response không liên kết danh tính. | Overfetch ORM/include; serialized hidden fields; export/log/cache trả token/nội dung phiếu/định danh; audit chứa payload gốc; dựa tham số client để quyết actor. |

Ngoài test cho phép/từ chối, kiểm **không có tác dụng phụ** khi từ chối: không đổi DB, không gửi email, không ghi file tệp mới; audit từ chối nếu thiết kế có cũng không chứa dữ liệu nhạy cảm. Test dùng dữ liệu giả và MySQL thật cho ràng buộc/đồng thời. Đến Tuần 13 kiểm phủ đủ cả ma trận; mỗi tuần chức năng thêm phép thử tương ứng, không chờ cuối dự án mới kiểm quyền.
