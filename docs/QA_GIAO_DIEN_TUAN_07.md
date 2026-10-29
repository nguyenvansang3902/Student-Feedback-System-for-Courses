# QA giao diện — Tuần 7

Lượt cuối hoàn tất **29/10/2026 lúc 08:11:12 (Asia/Saigon)** bằng Puppeteer và Chrome headless: **11/11 nhóm kiểm, 13 trạng thái trang × 2 viewport = 26/26 lượt bố cục, 26 PNG đã mở xem**. Không có lỗi JavaScript `pageerror`, lỗi React trùng key/hydration được theo dõi, tràn ngang hoặc trường nhập thiếu nhãn trong phạm vi kiểm. Kết quả API/MySQL, scheduler và CI được ghi riêng trong [nghiệm thu Tuần 7](NGHIEM_THU_TUAN_07.md).

## Môi trường và bảo toàn dữ liệu

Máy chủ demo riêng `http://127.0.0.1:3001`, Next dev dùng output `.next-demo`, là máy chủ Next dev duy nhất trong lượt đo cuối. Harness kiểm marker `isolated-demo`, tên database và UUID máy chủ MySQL, đồng thời xác nhận database demo khác database chính. Không reset database hoặc volume.

Sáu tài khoản fixture riêng có vai trò ĐBCL, PĐT, Lãnh đạo, Sinh viên, Khảo thí và ADMIN đăng nhập qua biểu mẫu trên trình duyệt. ADMIN dùng mật khẩu và mã TOTP thực tính từ secret chỉ dành cho fixture; mã step-up ở trang cấu hình cũng được kiểm thực. Secret được lưu mã hóa trong database fixture; không giả trạng thái MFA của phiên, không đưa mật khẩu/secret/OTP vào ảnh hay báo cáo.

Fixture cuối có tiền tố `W7UI-1b18f61a`: một học kỳ, một môn, hai lớp và đăng ký học phần giả riêng. Tài khoản giảng viên/sinh viên seed được dùng để tạo đăng ký của lớp fixture, không sửa hồ sơ hoặc đăng ký cũ. Mẫu mặc định đang khóa được tái sử dụng. Trường hợp học kỳ khóa dùng bundle readiness seed chỉ để đọc.

Sau kiểm, harness dọn đúng các ID fixture và các nhiệm vụ, bản chụp xác nhận, lịch sử, hàng đợi thông báo/email, phiên, vai trò, TOTP và audit thuộc fixture. Cấu hình ngưỡng demo được phục hồi đúng giá trị, người cập nhật và thời điểm trước lượt chạy. Đối chiếu số tài khoản/học kỳ/môn/đợt/nhiệm vụ/phiếu/đáp án, toàn bộ cây mẫu và cấu hình gốc: **`cleaned=true`, `seedUnchanged=true`**. Không có thao tác trên database chính; ảnh và báo cáo Tuần 6/G1 được giữ nguyên.

## Kết quả thao tác thực

| Nhóm kiểm | Kết quả |
| --- | --- |
| FR-40/41/42 — ĐBCL tạo và trình | Tìm học kỳ fixture trong bộ chọn, chọn mẫu đang khóa, chọn phạm vi hai lớp, nhập giờ Việt Nam, lưu bản nháp qua POST 201 rồi trình PĐT qua POST 200. Danh sách hiển thị đủ các đợt seed sau khi dữ liệu tải xong. |
| FR-142/143 — PĐT xác nhận cảnh báo | Hai lớp có 6 cặp sinh viên–lớp; RS-04/05/06 có cảnh báo, không có lỗi chặn. Ghi chú có thuộc tính bắt buộc; PĐT nhập ghi chú và xác nhận qua form, chuyển sang chờ lãnh đạo duyệt. Bản chụp hiển thị số lớp/cặp, thời điểm và tên người xác nhận. |
| FR-42 — Lãnh đạo duyệt | Lãnh đạo mở đợt chờ duyệt và phê duyệt qua form. Trạng thái chờ mở và lịch sử thể hiện đúng người, thời điểm. Mẫu dùng trong phép thử đã khóa từ seed; việc khóa một mẫu nháp lúc duyệt được kiểm riêng trong bộ API/MySQL. |
| FR-43/44/46, FR-144 — Tự mở, drift và tiến độ | Sau xác nhận, harness thêm một đăng ký giả vào lớp fixture để tạo drift. Thời điểm mở **08:11** được nhập trước qua form; không sửa lùi đồng hồ hoặc thời gian trong database. Khi đến lịch, truy cập đầu tiên tự mở đợt mà không chạy daemon scheduler. Database xác nhận đúng 7 nhiệm vụ, gồm sinh viên chờ kích hoạt, và đúng một lịch sử `AUTO_OPEN`. UI hiển thị cảnh báo dữ liệu thay đổi, bản chụp cũ 6 cặp, dữ liệu hiện tại 7 cặp và tiến độ 0/7; không có danh tính hoặc nội dung phiếu của sinh viên. |
| FR-45 — Gia hạn và đóng sớm | ĐBCL nhập hạn mới muộn hơn và lý do, gia hạn qua POST 200; sau đó chọn đóng sớm, nhập lý do và đóng qua POST 200. UI chuyển đã đóng, giữ lịch sử gia hạn/đóng và tiến độ. Gửi SMTP/retry được kiểm riêng; lượt UI này không kết luận email đã phát thành công. |
| BR-17/52 — Dữ liệu kỳ khóa chỉ đọc | PĐT mở đợt seed có đủ RS-01–RS-06: 4 lớp/13 cặp, 3 lỗi chặn/5 cảnh báo. Có thông báo kỳ khóa, không có biểu mẫu sửa nháp hoặc thao tác ghi đợt. |
| Phân quyền — Sinh viên | Không có menu đợt khảo sát dành cho người tổ chức; mở URL trực tiếp chuyển về tài khoản; GET API đợt trả 403. Đây không phải giao diện sinh viên làm bài của Tuần 8. |
| Phân quyền — Khảo thí | Tương tự, không có menu tổ chức đợt; URL chuyển về tài khoản và API trả 403. |
| Phân quyền — ADMIN | ADMIN sau TOTP không có menu nghiệp vụ đợt; URL chuyển về tài khoản và API trả 403. Vẫn mở được trang cấu hình ngưỡng thuộc quản trị. |
| FR-100 — ADMIN cấu hình ngưỡng | Sau đăng nhập mật khẩu + TOTP thực, ADMIN mở cấu hình, đổi số phiếu mặc định từ 5 thành 6, nhập TOTP step-up thực và lưu qua POST 200. UI tải lại thấy 6, database xác nhận giá trị 6. Cleanup phục hồi cấu hình demo gốc sau phép thử. |
| Bố cục/lỗi trình duyệt | Mỗi trạng thái ở desktop 1440 × 1000 và mobile 390 × 844; cả 26 lượt không tràn ngang/thiếu nhãn, `pageErrors=0`, `reactErrors=0`. Các form, cảnh báo và lịch sử đã được mở xem trong PNG cuối. |

## Ảnh đã mở xem

Ảnh toàn trang có thể cao hơn viewport. Mở PNG gốc và phóng to để đọc chi tiết các trang dài.

| Trạng thái | Desktop | Mobile |
| --- | --- | --- |
| ĐBCL danh sách đã tải đủ | [PNG](assets/tuan-07/ui/dbcl-danh-sach-1440.png) | [PNG](assets/tuan-07/ui/dbcl-danh-sach-390.png) |
| ĐBCL tạo đợt, chọn lớp và lịch | [PNG](assets/tuan-07/ui/dbcl-tao-dot-1440.png) | [PNG](assets/tuan-07/ui/dbcl-tao-dot-390.png) |
| ĐBCL bản nháp và readiness | [PNG](assets/tuan-07/ui/dbcl-ban-nhap-1440.png) | [PNG](assets/tuan-07/ui/dbcl-ban-nhap-390.png) |
| PĐT cảnh báo, ghi chú bắt buộc | [PNG](assets/tuan-07/ui/pdt-canh-bao-1440.png) | [PNG](assets/tuan-07/ui/pdt-canh-bao-390.png) |
| PĐT sau xác nhận, bản chụp | [PNG](assets/tuan-07/ui/pdt-da-xac-nhan-1440.png) | [PNG](assets/tuan-07/ui/pdt-da-xac-nhan-390.png) |
| Lãnh đạo trước phê duyệt | [PNG](assets/tuan-07/ui/lanh-dao-cho-duyet-1440.png) | [PNG](assets/tuan-07/ui/lanh-dao-cho-duyet-390.png) |
| Lãnh đạo đã duyệt, chờ mở | [PNG](assets/tuan-07/ui/lanh-dao-da-duyet-1440.png) | [PNG](assets/tuan-07/ui/lanh-dao-da-duyet-390.png) |
| ĐBCL đợt tự mở, drift và tiến độ | [PNG](assets/tuan-07/ui/dbcl-da-mo-drift-tien-do-1440.png) | [PNG](assets/tuan-07/ui/dbcl-da-mo-drift-tien-do-390.png) |
| ĐBCL nhập gia hạn và lý do | [PNG](assets/tuan-07/ui/dbcl-gia-han-1440.png) | [PNG](assets/tuan-07/ui/dbcl-gia-han-390.png) |
| ĐBCL đã đóng sớm, lịch sử | [PNG](assets/tuan-07/ui/dbcl-da-dong-1440.png) | [PNG](assets/tuan-07/ui/dbcl-da-dong-390.png) |
| PĐT xem kỳ khóa, đủ RS | [PNG](assets/tuan-07/ui/pdt-du-lieu-bi-chan-1440.png) | [PNG](assets/tuan-07/ui/pdt-du-lieu-bi-chan-390.png) |
| ADMIN form ngưỡng, TOTP trống | [PNG](assets/tuan-07/ui/admin-cau-hinh-nguong-1440.png) | [PNG](assets/tuan-07/ui/admin-cau-hinh-nguong-390.png) |
| ADMIN lưu ngưỡng thành công | [PNG](assets/tuan-07/ui/admin-da-luu-nguong-1440.png) | [PNG](assets/tuan-07/ui/admin-da-luu-nguong-390.png) |

## Lỗi đã sửa và các lượt chưa đạt

Review trước QA sửa nút phân trang thành `type="button"`, tránh trình duyệt gửi nhầm form khi chuyển trang bộ chọn; giữ nhãn của mục đã chọn khi tìm kiếm/phân trang; hiển thị người xác nhận/lịch sử; ẩn thao tác ghi của kỳ khóa; co trang readiness khi số lỗi giảm. Bộ ranh giới JSON/thời gian nhập giờ Việt Nam có **7/7 test** qua, gồm múi giờ UTC/Mỹ/Việt Nam, ngày không tồn tại và giới hạn byte thực khi client khai sai hoặc thiếu Content-Length.

Lượt đầu bị HMR tải lại liên tục do có nhiều Next dev với output khác nhau cùng ghi `next-env.d.ts`; fixture đã dọn và seed giữ nguyên. Một phép thử đổi sang `next start` HTTP trả 500 vì guard production yêu cầu HTTPS; không thay hoặc vượt guard. Lượt dev kế tiếp đăng nhập ADMIN/TOTP thành công nhưng harness chờ sai URL `/quan-tri`, trong khi trang thực chuyển tới `/quan-tri/nguoi-dung`; đã sửa kỳ vọng harness và dọn fixture.

Lượt hoàn chỉnh trước cùng đã qua các thao tác nhưng log React báo hai sibling `CampaignForm`/`ActionPanel` dùng cùng key và một số ảnh chụp khi dữ liệu còn tải. Đã sửa key thành tiền tố `edit:`/`actions:`, thêm chờ dữ liệu và theo dõi lỗi React cho harness, rồi **chạy lại toàn bộ**. Chỉ lượt cuối 08:11:12 được dùng cho 26 ảnh và kết luận ở đầu báo cáo.

## Giới hạn

Lượt UI kiểm đầy đủ luồng chính với phạm vi danh sách lớp; ba phạm vi động, nhánh trả về/từ chối/rút/hủy, request đồng thời và scheduler daemon được kiểm trong unit/API/MySQL, không suy diễn từ ảnh. Đây là kiểm Chrome trên hai kích thước, chưa phải chứng nhận mọi trình duyệt hay tiêu chuẩn accessibility đầy đủ. Kiểm thiếu nhãn dựa trên `label`/`aria-label`, không thay kiểm bằng trình đọc màn hình.

Deadline hiển thị trong thông tin đợt là lịch đã cấu hình; khi đóng sớm, thời điểm thực hiện nằm trong lịch sử. Không kết luận đã hoàn tất FR-160/TC-ALL-01 toàn hệ thống hoặc giao diện làm khảo sát của Tuần 8. Những đợt seed đã công bố trong ảnh danh sách là dữ liệu giả được cho phép từ trước; lượt này không thực hiện tổng hợp/công bố kết quả mới.

Harness và kết quả riêng ở workspace ngoài repository: `work/week7-ui/check.mts`, `result.json`; log server `.local/week7-demo.stdout.log`/`.stderr.log`. Timestamp kết quả cuối UTC `2026-10-29T01:11:12.390Z`, tương ứng giờ Việt Nam đã ghi ở đầu báo cáo.
