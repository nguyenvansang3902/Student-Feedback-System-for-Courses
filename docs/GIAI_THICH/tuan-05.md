# Giải thích Tuần 5 — danh mục và nhập liệu

Thực hiện ngày **22/10/2026**; mốc Tuần 5 giả định **28/10–03/11/2026**. Bản nháp AI hỗ trợ để nhóm đọc, thử và diễn đạt lại. Xem [nghiệm thu](../NGHIEM_THU_TUAN_05.md), [hướng dẫn import](../HUONG_DAN_IMPORT.md) và [ADR-006](../decisions/ADR-006-danh-muc-va-nhap-lieu.md).

## Danh mục phục vụ việc gì?

Khoa có bộ môn, bộ môn có môn học; mỗi lớp học phần gắn một môn và một học kỳ. Phân công nối giảng viên với lớp, đăng ký nối sinh viên với lớp. Các dữ liệu này giúp hệ thống biết ai phụ trách hoặc học lớp nào khi triển khai khảo sát các tuần sau.

ĐBCL vận hành danh mục. ADMIN quản lý tài khoản và cấu hình; nếu chỉ có vai trò ADMIN thì không được thao tác danh mục. Máy chủ kiểm quyền tại service và lấy lại phiên/quyền hiện tại từ DB, nên gõ URL hoặc sửa ID không cấp thêm quyền.

## Vì sao cần khóa sổ?

Khóa sổ là chốt dữ liệu học kỳ. Sau khi khóa, không sửa/xóa học kỳ, không thêm/đổi lớp hoặc phân công của kỳ đó. Nếu đổi tên hay chuyển khoa của một môn đang có lớp trong kỳ khóa, dữ liệu lịch sử cũng thay đổi, nên trường hợp gián tiếp này bị chặn.

Khóa cần lý do và có nhật ký người/thời điểm/đối tượng. Bản hiện tại lưu cờ có lý do và độ dài, không phát lại nguyên văn người dùng nhập. Không có thao tác mở lại. Chỉ thử khóa trên học kỳ giả dành riêng để nghiệm thu.

## Chạy thử có tạo dữ liệu chưa?

Chưa. Người vận hành tải mẫu, điền đúng header rồi chọn tệp. Máy chủ kiểm các giá trị, dòng trùng và mã tham chiếu hiện có, trả lỗi từng dòng/cột. Cần sửa mọi lỗi rồi chạy thử lại. Tệp đúng mới có xác nhận sống 15 phút, gắn người/phiên và nội dung tệp; trình duyệt không tự quyết định dòng nào được ghi.

Khi bấm ghi, máy chủ kiểm lại quyền, dữ liệu trùng và học kỳ khóa. Ví dụ, chạy thử lúc kỳ mở nhưng người khác khóa kỳ trước khi xác nhận thì lệnh nhập phải bị từ chối. Toàn bộ dòng ghi trong một transaction: lỗi trước commit thì không ghi dòng nào.

## Gửi thư lỗi thì tài khoản có mất không?

Không. Tạo tài khoản và cấp vai trò đã commit trước khi gửi SMTP. Tài khoản mới ở PENDING_ACTIVATION, chưa có mật khẩu; email giúp người nhận tự tạo mật khẩu lần đầu. Kết quả nhập cho biết số thư gửi được và thất bại. Hệ thống thu hồi đúng token thư lỗi; nếu DB cũng mất kết nối sau commit thì báo số chưa thu hồi được, token vẫn giữ hạn ban đầu. Sau khi khôi phục DB/SMTP, người dùng yêu cầu lại ở `/kich-hoat`. Không nhập lại tệp vì mã/email đã tồn tại.

## Có dữ liệu khảo sát/phản hồi thì đã chạy được các chức năng đó chưa?

Demo Tuần 5 có danh mục, người dùng, phân công và đăng ký giả với ba kích thước. Lệnh demo tạo database mới/cổng riêng, giữ nguyên DB chính; chạy lại không reset dữ liệu đang có. Cỡ medium có 3 khoa, 8 bộ môn, 40 môn, 120 lớp, 60 giảng viên và 1.500 sinh viên giả.

Seed toàn hệ thống trong đặc tả còn cần đợt khảo sát, kết quả và phản hồi mẫu. Ngày 22/10/2026 người dùng đã cho phép rõ tạo sớm phần **dữ liệu seed** này. Vì vậy runtime bổ sung 15 bảng từ blueprint, tổng 31 bảng; dữ liệu giả được tạo bằng CLI. Đây là ngoại lệ đã được người dùng chấp thuận, không phải tự làm trước chức năng.

Các phiếu/câu trả lời mẫu dùng UUID ngẫu nhiên và không có khóa người dùng hoặc nhiệm vụ. Nhiệm vụ đánh dấu đã làm được tạo riêng; ngày nộp dùng chung theo nhóm, thứ tự ghi phiếu/câu trả lời được trộn độc lập. Kết quả mẫu được tính từ chính câu trả lời với trọng số, có đối chiếu số phiếu và tỉ lệ tham gia. Những kiểm tra này xác minh dữ liệu giả, chưa chứng minh luồng nộp ẩn danh thật đã được hiện thực.

Có bảng/bản ghi không đồng nghĩa có màn hình hoặc quy trình nghiệp vụ. Tuần 5 chưa có API/UI lập và duyệt đợt, sinh viên nộp phiếu, tổng hợp/công bố hay xử lý phản hồi. Những phần đó vẫn triển khai đúng các tuần sau. FR-101 đã được tick dựa trên seed chạy và kiểm thật; không tick FR của các chức năng tương lai.

## Năm câu hỏi bảo vệ

### 1. Chạy thử đúng rồi vì sao lúc ghi vẫn phải kiểm lại?

Giữa hai bước, người khác có thể tạo trùng mã, khóa học kỳ hoặc thu hồi quyền. Máy chủ kiểm lại trong transaction trên dữ liệu hiện tại; preview không phải quyền ghi vĩnh viễn.

### 2. Làm sao tránh hai lệnh nhập cùng tạo trùng hoặc một lệnh vượt qua khóa sổ?

Các lệnh ghi danh mục/import/đổi quyền dùng chung mutex DB trước mọi lần đọc thường, sau đó kiểm quyền và điều kiện hiện tại. Unique/FK và transaction bảo vệ thêm; khóa sổ cập nhật có điều kiện. Tranh chấp cần được kiểm trên MySQL thật, mock không thay thế được bằng chứng này.

### 3. Vì sao không thêm cột password hoặc role vào mẫu tài khoản?

Import chỉ cấp SINH_VIEN hoặc GIANG_VIEN theo loại tệp, không cho tăng quyền. Tài khoản chờ kích hoạt, tự đặt mật khẩu bằng token một lần; file mẫu không chứa mật khẩu dùng chung và không đặt lại tài khoản cũ.

### 4. Đổi đuôi tệp thành XLSX có đủ để được nhập không?

Không. Máy chủ kiểm nội dung tệp/ZIP, giới hạn nén và giải nén, số sheet/cột/dòng cùng loại giá trị ô. Công thức, hyperlink và cấu trúc không hỗ trợ bị chặn; CSV phải UTF-8 với header đúng.

### 5. Vì sao thêm bảng khảo sát sớm mà chưa tính hoàn thành chức năng khảo sát?

Người dùng chỉ cho phép thêm sớm dữ liệu seed, không cho nhận hoàn thành workflow/UI/API chưa có. FR-101 được nghiệm thu theo seed đủ và kiểm qua; FR về mẫu phiếu, đợt, nộp phiếu, kết quả, phản hồi vẫn chưa tick cho tới đúng tuần chức năng và bằng chứng tương ứng. Báo cáo ghi rõ ngoại lệ được chấp thuận và ngày làm thật.
