# Sơ đồ tuần tự xác thực — Tuần 3

Khởi động thực tế 21/10/2026, sau mốc kế hoạch giả định 14–20/10. Ba sơ đồ dưới mô tả mã Tuần 3; kết quả test/render ghi riêng tại [nghiệm thu](NGHIEM_THU_TUAN_03.md). Service gọi policy trước truy cập dữ liệu; POST phải qua kiểm Origin/JSON/Zod ở route.

## 1. Đăng nhập và bắt buộc đổi mật khẩu tạm

```mermaid
sequenceDiagram
  actor U as Người dùng
  participant C as Trình duyệt
  participant R as API đăng nhập
  participant S as Dịch vụ xác thực
  participant D as MySQL
  U->>C: Nhập mã định danh hoặc email và mật khẩu
  C->>R: JSON cùng Origin APP_URL
  R->>R: Kiểm Origin, kích thước, Zod
  R->>S: login(null, input, context)
  S->>S: Policy public login
  S->>D: Kiểm rate tài khoản và IP, tìm User
  S->>S: bcrypt.compare với hash thật hoặc hash giả
  alt Sai hoặc không đủ điều kiện
    S->>D: Ghi thất bại, khóa sau lần sai thứ 5
    S->>D: Audit đã che bí mật
    S-->>R: Lỗi chung, không lộ tồn tại tài khoản
    R-->>C: 401 hoặc 429
  else Hợp lệ và ACTIVE
    S->>D: Transaction khóa và kiểm lại hai bucket tài khoản/IP
    S->>D: Khóa và kiểm lại User, tạo UserSession và AuditLog
    S->>S: Ký access JWT, refresh ngẫu nhiên 32 byte
    S-->>R: Token và cờ mustChangePassword
    R-->>C: Cookie httpOnly, refresh path /api/auth
    alt Mật khẩu tạm
      C-->>U: /doi-mat-khau, chưa vào không gian vai trò
    else Mật khẩu bình thường
      C-->>U: /tai-khoan với layout theo vai trò
    end
  end
```

Cookie Secure chỉ ở production HTTPS. Token không nằm trong JSON trả về client hoặc localStorage. Giao diện tài khoản mới là khung theo vai trò; menu khảo sát/phản hồi chưa mở không được xem là FR-50/FR-70 hoàn thành.

## 2. Refresh xoay vòng và phát hiện dùng lại

```mermaid
sequenceDiagram
  participant C as Trình duyệt
  participant R as API refresh
  participant S as Dịch vụ xác thực
  participant D as MySQL
  C->>R: Cookie refresh cũ, JSON, Origin hợp lệ
  R->>S: refreshSession(null, refresh, context)
  S->>S: Policy public refresh, SHA-256 token
  S->>D: Tìm session theo hash
  alt Không tồn tại hoặc sai định dạng
    S-->>R: Phiên không hợp lệ
    R-->>C: 401 và xóa cookie
  else Có session
    S->>D: Transaction khóa row gốc family
    S->>D: Đọc lại session và trạng thái User
    alt Token đã thu hồi hoặc bị dùng đồng thời
      S->>D: Thu hồi cả family và audit replay
      S-->>R: Phiên không hợp lệ
      R-->>C: 401 và xóa cookie
    else Chưa thu hồi và chưa hết hạn
      S->>D: CAS thu hồi row cũ, tạo row con với hash mới và audit
      S->>S: Ký access gắn session mới
      S-->>R: Cặp token mới, hạn tuyệt đối family giữ nguyên
      R-->>C: Thay cookie httpOnly
    end
  end
```

Access của row cũ vô hiệu ngay sau rotation vì service kiểm session trong DB, dù exp của JWT chưa tới. Logout khóa cùng gốc family rồi thu hồi mọi row của family đó. Đổi mật khẩu/reset thu hồi mọi family của user. Client tuần tự hóa refresh; replay có chủ đích hoặc race vẫn thu hồi family theo cùng quy tắc.

## 3. Yêu cầu và hoàn tất đặt lại mật khẩu

```mermaid
sequenceDiagram
  actor U as Người dùng
  participant C as Trình duyệt
  participant R as Route xác thực
  participant S as Dịch vụ khôi phục
  participant D as MySQL
  participant M as SMTP Mailpit
  U->>C: Nhập email đã đăng ký
  C->>R: POST /api/auth/forgot-password
  R->>S: requestPasswordReset(null, email, context)
  S->>S: Policy recovery, chuẩn hóa email
  S->>D: Rate limit IP và tài khoản kể cả email không tồn tại
  alt Có tài khoản ACTIVE phù hợp
    S->>S: Tạo token ngẫu nhiên 32 byte
    S->>D: Transaction khóa User, hủy token cũ cùng loại
    S->>D: Lưu hash, hạn 30 phút và audit
    S->>M: Email tới địa chỉ User với APP_URL cố định
    opt SMTP thất bại
      S->>D: Đánh dấu token đã dùng và audit lỗi đã che
    end
  end
  S-->>R: Cùng kết quả trung tính, có sàn thời gian phản hồi
  R-->>C: Nếu tài khoản phù hợp, hướng dẫn sẽ được gửi
  U->>M: Mở liên kết đặt lại với token trong fragment
  M-->>C: Trang nhận token từ fragment, xóa fragment khỏi history
  U->>C: Nhập mật khẩu mới và xác nhận
  C->>R: POST /api/auth/reset-password, token trong JSON
  R->>S: resetPassword(null, input, context)
  S->>S: Policy, rate IP/token, kiểm mật khẩu
  S->>D: Tìm token theo hash, đúng loại/chưa dùng/còn hạn/User ACTIVE
  S->>S: Băm bcrypt
  S->>D: Transaction khóa User và CAS token
  alt CAS thắng và User vẫn ACTIVE
    S->>D: Đổi mật khẩu, hủy mọi session/token, audit và commit
    S-->>R: Thành công, không tự cấp phiên
    R-->>C: Xóa cookie, yêu cầu đăng nhập bằng mật khẩu mới
  else Token đã dùng/hết hạn hoặc User bị khóa
    S->>D: Rollback
    S-->>R: Liên kết không hợp lệ hoặc hết hạn
    R-->>C: 400
  end
```

Kích hoạt dùng cùng cấu trúc, nhưng chỉ PENDING_ACTIVATION và hạn 24 giờ; hoàn tất chuyển ACTIVE. Không mở khóa DISABLED. Phần fragment tránh token trong HTTP URL mở trang, không bảo vệ trước người có quyền đọc hộp thư hoặc mã độc trong trình duyệt. Không ghi payload, mật khẩu, cookie hoặc raw token vào audit/log.

## Bản sơ đồ đã render ngày 22/10

Ba khối Mermaid phía trên được render thành SVG bằng **Mermaid CLI 12.0.0 (`mmdc`) và Chrome**. Các SVG được sao chép nguyên byte vào thư mục bằng chứng. Đã mở từng SVG trong Chrome với hồ sơ tạm, raster hóa và xem ảnh thật của cả ba sơ đồ; không dùng bộ chuyển đổi làm mất nhãn HTML. Ba SVG hiện tại dùng nhãn SVG `text`, không có phần tử `foreignObject`.

| Sơ đồ | SVG đã render | Kích thước viewBox làm tròn |
| --- | --- | --- |
| Đăng nhập | [Mở sơ đồ đăng nhập](assets/tuan-03/dang-nhap-sequence.svg) | 1660 × 1345 |
| Refresh xoay vòng | [Mở sơ đồ refresh](assets/tuan-03/refresh-sequence.svg) | 1437 × 1147 |
| Đặt lại mật khẩu | [Mở sơ đồ đặt lại mật khẩu](assets/tuan-03/reset-sequence.svg) | 2060 × 1763 |

SHA-256 dưới đây xác định phần thân UTF-8 của từng khối Mermaid, bỏ hai dòng hàng rào và giữ xuống dòng trong phần thân, cùng byte của file SVG tương ứng:

- **Đăng nhập** — nguồn: `de1aad6339d484b0e24c9fd636d335f0fab8a39a701529ca7c18c0435a84f0f1`; SVG: `0dbdfc8001eb60cab83f2018e21824e01775e234238fbb21bb84685706bdfe9a`.
- **Refresh** — nguồn: `c2225c89071e32597337235364169abe7edd960e874bd69f59e1f20d89abc630`; SVG: `3183415466aa918fad6934853b4d691024bd58e0f8638d36cc4537284ebd9bc3`.
- **Đặt lại mật khẩu** — nguồn: `a6e97f53cf0e3bf719d7ccb32065949e4eefb838737ad3da1e24e605e5762021`; SVG: `fdc81ce6b73aad851c5961da69e8355ad637baff2f28e0a2aa08309208c4e48b`.

Giới hạn quan sát: sơ đồ rộng, nhãn thông điệp dài nên cần mở SVG riêng và phóng to khi đọc trên điện thoại hoặc trang tài liệu thu nhỏ. Đã rút gọn tên participant để vừa hộp. Renderer từng làm mất hậu tố fragment trong nhãn mở liên kết; đã đổi riêng nhãn thành “Mở liên kết đặt lại với token trong fragment”, render lại 3/3 và xem lại ảnh, chi tiết token trong fragment hiện đọc được. Các thông điệp nghiệp vụ còn lại giữ nguyên. Kết quả render xác nhận sơ đồ đọc được; kiểm đúng nghiệp vụ và API được ghi riêng trong nghiệm thu.
