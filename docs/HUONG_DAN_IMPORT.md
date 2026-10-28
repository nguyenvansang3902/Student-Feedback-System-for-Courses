# Hướng dẫn danh mục và import Excel/CSV — cập nhật Điều chỉnh số 01/G1

Chức năng gốc được nghiệm thu Tuần 5 ngày **22/10/2026**; [nghiệm thu Tuần 5](NGHIEM_THU_TUAN_05.md) giữ bằng chứng và phân quyền tại thời điểm đó. Hướng dẫn này áp dụng quyền mới của [Điều chỉnh số 01](BO_SUNG_01_TAC_NHAN.md): **PĐT ghi dữ liệu đào tạo/import; ADMIN có MFA ghi khoa/bộ môn; ĐBCL chỉ đọc danh mục**. Xem [ma trận hiện tại](MA_TRAN_QUYEN.md) và [truy vết](TRUY_VET.md) để đối chiếu nghiệm thu G1. Dùng dữ liệu giả khi thử.

## 1. Mở đúng môi trường và tài khoản

1. Chạy ứng dụng theo [README](../README.md). Môi trường chính thường ở `http://localhost:3000`; `npm.cmd run demo` tạo môi trường demo riêng, mặc định `http://127.0.0.1:3001`.
2. Trong demo, đăng nhập `PDT2026001` bằng mật khẩu mẫu trong README rồi mở **Danh mục** (`/danh-muc`). Tài khoản có grant hợp lệ `PHONG_DAO_TAO` quản lý dữ liệu đào tạo và **Nhập dữ liệu**. ADMIN đã hoàn thành MFA chỉ quản lý khoa/bộ môn; `DBCL2026001` chỉ đọc danh mục, không import.
3. Giữ đúng địa chỉ ứng dụng đã in ra khi chạy. Nếu phiên hết hạn hoặc quyền vừa đổi, đăng nhập lại; tệp đã sửa hoặc xác nhận preview cũ phải chạy thử lại.

Demo chỉ tạo dữ liệu giả cục bộ và bị chặn production. Mỗi `npm run demo` tạo DB mới; dữ liệu đã thử ở DB demo trước vẫn được giữ nhưng không tự xuất hiện trong DB mới. Không chạy lệnh reset để làm theo hướng dẫn này.

## 2. Chuẩn bị danh mục trước khi nhập

ADMIN có MFA tạo **khoa → bộ môn** trước. Sau đó PĐT tạo **môn học → học kỳ → lớp học phần**, nhập hồ sơ sinh viên/giảng viên trước khi nhập đăng ký hoặc phân công. PĐT đọc khoa/bộ môn để chọn liên kết nhưng không sửa cấu trúc tổ chức. Môn/bộ môn/khoa phải hoạt động; học kỳ chưa khóa sổ. Tạo/khóa tài khoản đăng nhập trực tiếp vẫn do ADMIN; import SV/GV giữ hành vi tạo tài khoản chờ kích hoạt, ghi actor PĐT.

- Mỗi mã khoa, bộ môn, môn học, học kỳ là duy nhất. Mã lớp duy nhất trong từng học kỳ.
- Khoa/bộ môn/môn học có trạng thái hoạt động. Dữ liệu đang được tham chiếu không xóa được; ứng dụng trả lỗi rõ thay vì xóa bản ghi phụ thuộc.
- Lớp có thể có nhiều giảng viên; tối đa một người được đánh dấu phụ trách chính. Phân công giảng viên thực hiện tại danh mục, không có loại import phân công trong Tuần 5.
- **Khóa sổ** và **Mở khóa** ở danh sách học kỳ chỉ dành cho PĐT, cần lý do 10–500 ký tự. Khi khóa, học kỳ và dữ liệu liên quan chỉ đọc; sửa/xóa khoa/bộ môn/môn ảnh hưởng lớp trong kỳ khóa cũng bị chặn. Khi mở khóa, hệ thống ghi audit và gửi thông báo cho ĐBCL đang hoạt động. Chỉ thử trên kỳ giả dùng riêng.
- Email mở khóa gửi sau commit. Nếu SMTP lỗi, không có người nhận hoặc không ghi được biên nhận, giao diện báo thông báo chưa hoàn tất; học kỳ vẫn đã mở. Kiểm Mailpit/SMTP và audit, không lặp thao tác như thể dữ liệu chưa đổi. Chưa có outbox hoặc gửi lại nền tự động.

## 3. Tải mẫu và điền đúng cột

Chọn loại nhập, chọn XLSX hoặc CSV rồi bấm tải mẫu. Mẫu có dòng tiêu đề và **một dòng minh họa cần thay**. Giữ nguyên tên và thứ tự cột, sửa hoặc xóa dòng minh họa rồi điền dữ liệu muốn nhập; không thêm cột mật khẩu, vai trò hoặc ID nội bộ. Mã môn/học kỳ/lớp/sinh viên trong mẫu chỉ minh họa và phải đổi thành mã đang có ở môi trường mở.

| Loại nhập | Header đúng thứ tự | Ý nghĩa |
| --- | --- | --- |
| Sinh viên | `loginCode,email,displayName` | Mã đăng nhập, email, họ tên; chỉ tạo vai trò SINH_VIEN |
| Giảng viên | `loginCode,email,displayName` | Mã đăng nhập, email, họ tên; chỉ tạo vai trò GIANG_VIEN |
| Lớp học phần | `code,courseCode,semesterCode` | Mã lớp, mã môn đã có, mã học kỳ đã có |
| Đăng ký học phần | `semesterCode,sectionCode,studentCode` | Mã kỳ, mã lớp trong kỳ, mã đăng nhập sinh viên |

Giới hạn mỗi tệp **2 MiB**: sinh viên/giảng viên **1–500 dòng dữ liệu**; lớp/đăng ký **1–2.000 dòng**. Header không tính vào số dòng dữ liệu.

### Quy tắc điền

- Mã nhập dài 2–32 ký tự, bắt đầu bằng chữ không dấu hoặc số; phần sau cho phép chữ không dấu, số, `.`, `_`, `-`. Email hợp lệ, tối đa 254 ký tự. Họ tên 1–160 ký tự, không có ký tự điều khiển.
- Excel: dùng `.xlsx`, đúng **một sheet**, ô văn bản/số thuần. Đặt cột mã thành Text để giữ số 0 đầu. Không gộp ô, công thức, hyperlink, rich text, ô ngày, lỗi Excel, macro hoặc đối tượng nhúng. Tệp `.xls` không được hỗ trợ.
- CSV: chọn **CSV UTF-8**, dấu phân cách là dấu phẩy. Nếu Excel xuất dấu `;`, dùng mẫu XLSX hoặc xuất lại đúng dấu phẩy. Nội dung có dấu phẩy phải bọc bằng dấu ngoặc kép; dấu ngoặc kép bên trong viết hai lần.
- Không bắt đầu giá trị bằng `=`, `+`, `-`, `@`; ứng dụng chặn để tránh công thức khi mở bảng tính. Không có dòng trắng ở giữa; dòng trắng cuối tệp được bỏ qua.
- Chỉ nhập bản ghi mới. Mã/email đã tồn tại, đăng ký đã có hoặc đã rút đều được báo lỗi; import không ghi đè hay phục hồi dữ liệu cũ.

Ví dụ CSV sinh viên giả, chưa tồn tại trong DB:

```csv
loginCode,email,displayName
SV_IMPORT_001,sv.import001@demo.invalid,"Sinh viên thử, nhóm 1"
```

Ví dụ lớp mới trong demo medium; mã môn/học kỳ cần đối chiếu tại môi trường đang mở:

```csv
code,courseCode,semesterCode
LOP_IMPORT_001,DEMO-MH001,DEMO-HK1-2026
```

Ví dụ đăng ký sinh viên demo vào lớp vừa nhập:

```csv
semesterCode,sectionCode,studentCode
DEMO-HK1-2026,LOP_IMPORT_001,DEMO-SV00001
```

## 4. Chạy thử rồi xác nhận ghi

1. Chọn đúng loại nhập và tệp, bấm **Chạy thử**. Bước này chỉ đọc; chưa tạo bản ghi nghiệp vụ hoặc batch/audit trong DB.
2. Xem tổng số dòng, số dòng hợp lệ, tối đa 10 dòng mẫu và bảng lỗi **dòng/cột/mã lỗi/thông báo**. Dòng 1 là header; dòng 2 là dòng dữ liệu đầu tiên. Một dòng có thể có nhiều lỗi.
3. Sửa toàn bộ lỗi trong tệp, lưu rồi chọn lại và chạy thử lại. Tệp có lỗi không được xác nhận ghi; không có lựa chọn bỏ qua dòng sai.
4. Khi toàn bộ hợp lệ, bấm xác nhận ghi trong **15 phút**, với cùng tài khoản/phiên và nguyên tệp đã kiểm. Máy chủ gắn kết quả với SHA-256 của nội dung; sửa tệp hoặc thay phiên cần chạy thử lại.
5. Máy chủ kiểm lại dữ liệu hiện tại trong transaction. Nếu kỳ vừa khóa, mã vừa được tạo hoặc quyền bị thu hồi, lệnh bị chặn; lỗi dòng được trả khi áp dụng. **Không ghi dòng nào** khi lỗi xảy ra trước commit. Gửi lại cùng xác nhận đã thành công trả 409, không tạo bản ghi trùng.

## 5. Kích hoạt tài khoản và email gửi lỗi

Tài khoản nhập vào ở trạng thái **PENDING_ACTIVATION**, chưa có mật khẩu. Người nhận mở email kích hoạt rồi tự tạo mật khẩu; import không cấp quyền quản trị, không đặt mật khẩu chung. Với Mailpit cục bộ, mở địa chỉ Mailpit trong README để xem thư thử.

Sau khi dữ liệu đã commit, hệ thống mới gửi email và trả số **gửi được/thất bại**. Nếu gửi thư lỗi, tài khoản đã tạo vẫn được giữ và hệ thống thu hồi đúng token của thư lỗi. Nếu DB cũng ngắt lúc thu hồi, kết quả báo thêm số trường hợp chưa thu hồi được; token không bị trả ra ngoài nhưng còn hạn dùng ban đầu. Không nhập lại cùng tệp vì mã/email đã tồn tại. Khôi phục DB/SMTP rồi vào `/kich-hoat`, yêu cầu lại liên kết bằng mã/email và thực hiện kích hoạt bình thường. Chưa có outbox hoặc gửi lại nền tự động.

Không đưa token, liên kết kích hoạt hay mật khẩu vào Git, log hoặc ảnh báo cáo. Không dùng email thật trong nghiệm thu.

## 6. Xử lý lỗi thường gặp

| Thông báo/mã | Cách xử lý |
| --- | --- |
| `INVALID_HEADER` / dòng 1 | Tải lại mẫu đúng loại, giữ nguyên thứ tự cột |
| `ROW_LIMIT` | Điền ít nhất một dòng, tách tệp đúng giới hạn 500 hoặc 2.000 |
| `INVALID_VALUE`, `COLUMN_COUNT` | Sửa giá trị/cột ngay dòng được báo; kiểm CSV UTF-8 dấu phẩy |
| `UNSAFE_CELL`, `FORMULA_NOT_ALLOWED` | Chuyển ô thành giá trị văn bản/số thuần, bỏ công thức/liên kết |
| `DUPLICATE_IN_FILE`, `ALREADY_EXISTS` | Loại bản ghi trùng; kiểm danh mục/tài khoản đang có; import chỉ tạo mới |
| `REFERENCE_NOT_FOUND`, `INACTIVE_REFERENCE`, `INVALID_STUDENT` | Tạo/kiểm mã tham chiếu và trạng thái hoạt động; sinh viên cần gán vai trò hợp lệ |
| `SEMESTER_LOCKED` | Chọn kỳ còn mở hoặc để PĐT mở khóa tại danh sách học kỳ, kèm lý do và kiểm thông báo ĐBCL; quay lại chạy thử tệp từ đầu |
| `SEMESTER_ALREADY_OPEN` / `SEMESTER_STATE_CHANGED` | Tải lại danh sách và kiểm trạng thái hiện tại trước khi thao tác; không lặp lệnh mở khóa cũ |
| `INVALID_IMPORT_PREVIEW`, `IMPORT_VALIDATION_FAILED`, `IMPORT_CONFLICT` | Tải dữ liệu mới, chọn lại tệp và chạy thử lại |
| `IMPORT_ALREADY_COMMITTED` | Lần nhập đã ghi; kiểm danh sách, không cần bấm lại |
| 401/403 hoặc CSRF hết hạn | Đăng nhập lại đúng tài khoản PĐT để nhập tệp; ADMIN chỉ khoa/bộ môn, ĐBCL chỉ đọc. Tải lại trang và chạy thử lại |

## 7. Kịch bản kiểm tra tối thiểu

Tạo kỳ và mã riêng để thử, tải mẫu rồi nhập một bản ghi mới hợp lệ. Xác nhận số lượng tăng đúng một. Tiếp theo tạo tệp hai dòng gồm một dòng đúng và một email sai: chạy thử phải chỉ đúng dòng lỗi và chưa tăng số lượng. Sửa tệp, chạy thử rồi khóa kỳ bằng fixture riêng trước khi xác nhận nhập lớp/đăng ký: máy chủ phải từ chối ghi.

Các bước này là hướng dẫn cho người nghiệm thu. Kết quả bộ test, tranh chấp MySQL và giao diện thực sự đã chạy được ghi riêng trong [nghiệm thu](NGHIEM_THU_TUAN_05.md), không suy từ hướng dẫn.

Với G1, kiểm thêm bằng tài khoản riêng: PĐT ghi lớp/import được; ADMIN có MFA ghi khoa/bộ môn nhưng bị chặn ghi lớp/import; ĐBCL chỉ đọc; Khảo thí/Thanh tra không được mở dữ liệu danh mục thô. Thử mở khóa kỳ giả phải có lý do, audit và thư ĐBCL; nếu thư lỗi thì trạng thái kỳ vẫn mở và thông báo phải phản ánh đúng. Các bước này chưa thay kết quả nghiệm thu G1 tại [TRUY_VET](TRUY_VET.md).
