# QA giao diện — Điều chỉnh số 01, việc bù G1

Kiểm thực tế **29/10/2026 lúc 01:56 (Asia/Saigon)** bằng Puppeteer và Chrome headless. Kết quả cuối: **7/7 nhóm kiểm, 16/16 lượt bố cục, 16 PNG đã mở xem**, không có `pageerror`, tràn ngang hoặc trường nhập thiếu nhãn trong phạm vi kiểm. Đây là kiểm giao diện G1; kết quả API/MySQL và CI được ghi riêng trong [truy vết](TRUY_VET.md).

## Môi trường và dữ liệu

Máy chủ demo riêng ở `http://127.0.0.1:3001`, Next dev dùng output `.next-demo`. Harness xác minh marker `isolated-demo`, tên database và UUID máy chủ MySQL; database demo khác database chính. Bốn tài khoản kiểm riêng có vai trò ĐBCL, PĐT, Khảo thí và Thanh tra đăng nhập qua biểu mẫu trên trình duyệt; mật khẩu chỉ sinh cho lượt chạy, không ghi vào ảnh hoặc báo cáo.

Mẫu và học kỳ thử đều có tiền tố `G1UI-c33b35fb`. Sau lượt chạy, harness đã dọn đúng các tài khoản, phiên, vai trò, cây mẫu, học kỳ, audit và khóa giới hạn đăng nhập của fixture do mình tạo. `cleaned=true`, `seedUnchanged=true`: đối chiếu đầy đủ cây mẫu seed trước/sau giống nhau; số tài khoản, học kỳ, phiếu và đáp án seed giữ nguyên. Không reset hoặc xóa database/volume và không thay ảnh Tuần 6.

## Kết quả thao tác thật

| Nhóm kiểm | Kết quả |
| --- | --- |
| FR-148 — trình soạn và xem trước | ĐBCL dùng mẫu mặc định tạo bản nháp có 3 nhóm/7 câu, ban đầu cờ `[false,false,true]`. Bấm ô chọn để chuyển cờ sang nhóm 1, lưu qua API và tải lại vẫn là `[true,false,false]`; trang xem trước hiển thị đúng nhãn nhóm đánh giá. |
| FR-140 — ĐBCL chỉ đọc danh mục | Trang lớp học phần có thông báo chỉ đọc; không có nút thêm/sửa/xóa/khóa hoặc liên kết nhập dữ liệu. |
| FR-140/141 — PĐT | PĐT đọc khoa/bộ môn để tra cứu, không có nút ghi tổ chức. PĐT tạo học kỳ riêng thành công, khóa sổ rồi mở khóa bằng biểu mẫu có lý do bắt buộc 10–500 ký tự và xác nhận; database xác nhận `lockedAt=null` sau mở khóa. |
| FR-140 — nhập dữ liệu | PĐT mở được trang Excel/CSV, chọn loại/tải mẫu/chọn tệp có nhãn. Lượt UI này chưa áp dụng một lô nhập; ghi thật và các trường hợp bị từ chối được kiểm riêng trong bộ HTTP. |
| TC-ALL-01 một phần — Khảo thí | Tài khoản hiển thị tên vai trò tiếng Việt, không có menu danh mục. Mở trực tiếp URL danh mục/lớp/nhập liệu chuyển về tài khoản; API danh sách lớp trả 403. |
| TC-ALL-01 một phần — Thanh tra | Tương tự, không có menu danh mục; URL bị chuyển về tài khoản và API lớp trả 403. Trang ghi rõ khu vực hồ sơ chưa mở. |
| Bố cục và lỗi JavaScript | Tám trạng thái trang × hai viewport: desktop 1440 × 1000 và mobile 390 × 844. Cả 16 lượt không tràn ngang/thiếu nhãn; không có lỗi JavaScript `pageerror`. |

## Ảnh đã mở xem

Ảnh chụp toàn trang nên chiều cao PNG có thể lớn hơn viewport. Với trang dài, mở ảnh gốc để phóng to khi đọc nhãn.

| Trạng thái | Desktop | Mobile |
| --- | --- | --- |
| ĐBCL soạn cờ đánh giá sau lưu/tải lại | [PNG](assets/bo-sung-01/ui/dbcl-soan-co-danh-gia-1440.png) | [PNG](assets/bo-sung-01/ui/dbcl-soan-co-danh-gia-390.png) |
| ĐBCL xem trước | [PNG](assets/bo-sung-01/ui/dbcl-xem-truoc-1440.png) | [PNG](assets/bo-sung-01/ui/dbcl-xem-truoc-390.png) |
| ĐBCL danh mục chỉ đọc | [PNG](assets/bo-sung-01/ui/dbcl-danh-muc-chi-doc-1440.png) | [PNG](assets/bo-sung-01/ui/dbcl-danh-muc-chi-doc-390.png) |
| PĐT thêm học kỳ | [PNG](assets/bo-sung-01/ui/pdt-tao-hoc-ky-1440.png) | [PNG](assets/bo-sung-01/ui/pdt-tao-hoc-ky-390.png) |
| PĐT mở khóa có lý do | [PNG](assets/bo-sung-01/ui/pdt-mo-khoa-co-ly-do-1440.png) | [PNG](assets/bo-sung-01/ui/pdt-mo-khoa-co-ly-do-390.png) |
| PĐT nhập liệu | [PNG](assets/bo-sung-01/ui/pdt-nhap-lieu-1440.png) | [PNG](assets/bo-sung-01/ui/pdt-nhap-lieu-390.png) |
| Tài khoản Khảo thí | [PNG](assets/bo-sung-01/ui/khao-thi-tai-khoan-1440.png) | [PNG](assets/bo-sung-01/ui/khao-thi-tai-khoan-390.png) |
| Tài khoản Thanh tra | [PNG](assets/bo-sung-01/ui/thanh-tra-tai-khoan-1440.png) | [PNG](assets/bo-sung-01/ui/thanh-tra-tai-khoan-390.png) |

## Giới hạn và lần chạy chưa đạt

Lượt trước bị dừng ở đăng nhập: harness cố đọc lại response body sau khi trình duyệt đã chuyển trang. Đã sửa harness để kiểm status và điều hướng ở bước này. Một lượt tiếp theo dừng vì Next dev liên tục tải lại trong lúc dùng chung repository với tiến trình build; đã dọn fixture, rồi khởi động lại máy chủ demo và chạy lại toàn bộ sau build. Những lượt dừng không được tính là nghiệm thu; lượt cuối trong báo cáo này đã qua đầy đủ. Cũng đã sửa kỳ vọng của harness về khoa/bộ môn: PĐT được đọc danh mục tra cứu nhưng không được ghi tổ chức.

Chưa kiểm UI ADMIN/TOTP mới trong lượt này, chưa kiểm thực thi nhập file trên UI, chưa kiểm mọi trình duyệt hoặc mọi kích thước màn hình. Không kết luận đã hoàn tất FR-160/TC-ALL-01 toàn hệ thống hay các luồng Khảo thí/Thanh tra của các tuần sau. G1 chỉ bổ sung nền và cờ nhóm; chưa bắt đầu Tuần 7.

Harness và kết quả riêng: `work/bo-sung-01-ui/check.mts`, `result.json`, `server.log` ở workspace ngoài repository. Kết quả cuối có timestamp UTC `2026-10-28T18:56:16.536Z` (tức 29/10/2026 01:56:16 tại Việt Nam).
