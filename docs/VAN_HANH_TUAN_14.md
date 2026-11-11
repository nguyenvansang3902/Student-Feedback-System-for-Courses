# Cài đặt và vận hành website khảo sát

Hai môi trường dùng Docker Compose riêng. Demo chạy ở `127.0.0.1:3014`, kèm dữ liệu giả và hộp thư Mailpit. Cấu hình triển khai dựng image Next.js production và dành cổng loopback cho reverse proxy HTTPS. Mỗi môi trường có database, volume tệp phản hồi và khóa riêng.

## Mở demo cục bộ

Cài Node.js 24, bật Docker Linux containers rồi chạy tại thư mục mã nguồn:

```powershell
node scripts/start-demo-compose.mjs
```

Sau khi hiện địa chỉ, mở [đăng nhập](http://127.0.0.1:3014/dang-nhap). Thử `DEMO-SV00001` với mật khẩu giả `Demo2026!HocTap`, sau đó chọn **Khảo sát của tôi**. Nếu tài khoản đã đổi mật khẩu, dùng mật khẩu đang có. Có thể mở [Mailpit](http://127.0.0.1:8034) để xem thư kích hoạt và thông báo giả.

```powershell
$demoCompose = @('--env-file', '.local/week14-demo/.env', '-f', 'compose.demo.yml', '-p', 'sfs-week14-demo')
docker compose @demoCompose ps -a
docker compose @demoCompose logs --tail 40 seed web scheduler
docker compose @demoCompose stop
```

Lệnh `stop` dừng dịch vụ và giữ dữ liệu. Dùng lại lệnh khởi động khi cần mở tiếp. Nếu port 3014 hoặc 8034 đang bận, tìm tiến trình đang dùng cổng trước khi chạy. Nếu có volume demo nhưng mất `.local/week14-demo/.env`, lấy lại bản cấu hình đã lưu để khớp mật khẩu database và khóa MFA. Docker cần đúng context cục bộ trước khi thao tác.

Để thêm tài khoản quản trị vào demo, chạy lệnh sau và nhập thông tin giả tại lời nhắc:

```powershell
docker compose @demoCompose exec web node node_modules/tsx/dist/cli.mjs scripts/admin-console.ts create
```

Mở trang đăng nhập bằng tài khoản vừa tạo, hoàn tất TOTP và cất mã khôi phục ở nơi riêng. Phần **Quản trị** chỉ mở sau khi xác minh hai bước.

## Chuẩn bị cấu hình triển khai

1. Tạo `.local/production/.env` từ [mẫu biến môi trường](../deploy/.env.example). Điền origin HTTPS đầy đủ, ví dụ `https://khao-sat.example.invalid` là địa chỉ minh họa cần thay bằng origin của hệ thống. Điền tên DB, tài khoản DB, hai mật khẩu DB dạng hex, hai khóa 32 byte dạng hex và cấu hình SMTP. Lưu tệp với quyền đọc dành cho người vận hành.
2. Dùng reverse proxy TLS trên cùng máy trỏ tới `127.0.0.1:3016` hoặc cổng `SFS_PROD_LOCAL_PORT` đã chọn. Giữ `Host` khớp origin trong `SFS_PROD_APP_URL` và chuyển tiếp HTTPS. Để `SFS_PROD_TRUST_PROXY=false` nếu chưa có proxy đáng tin ghi đè header IP. Cổng DB chỉ có trong mạng Compose.
3. Cấu hình SMTP theo nhà cung cấp. Cổng 465 dùng TLS ngay khi kết nối. Cổng 587 dùng STARTTLS khi máy chủ công bố hỗ trợ. Kiểm thư gửi thực tế trên môi trường thử trước khi mở cho người dùng.
4. Tạo bản sao lưu trước khi cập nhật một môi trường đã có dữ liệu, rồi dựng và mở dịch vụ:

   ```powershell
   $prodCompose = @('--env-file', '.local/production/.env', '-f', 'compose.production.yml', '-p', 'sfs-production')
   docker compose @prodCompose up --build -d --wait
   docker compose @prodCompose ps -a
   ```

   `migrate` chạy một lần trước web và scheduler. Nếu lỗi, đọc log riêng của bước này, kiểm tra database/biến môi trường rồi chạy lại sau khi xử lý. Trên máy mới, MySQL tự tạo database rỗng. Biến mật khẩu của MySQL chỉ khởi tạo khi volume còn mới, nên đổi tệp env sau đó không tự đổi mật khẩu đã lưu.

5. Tạo quản trị qua CLI nếu đây là môi trường mới:

   ```powershell
   docker compose @prodCompose run --rm migrate node node_modules/tsx/dist/cli.mjs scripts/admin-console.ts create
   ```

   Hoàn tất đăng nhập HTTPS, đăng ký TOTP và kiểm quyền quản trị. Dùng tài khoản thử đúng vai trò để kiểm tra danh sách và dữ liệu theo phạm vi.

`GET /api/health` kiểm việc web phản hồi. MySQL được Compose kiểm riêng bằng truy vấn `SELECT 1` và bằng kết quả migration. Scheduler xử lý lịch đợt và gửi thư nền. Chạy `docker compose @prodCompose stop` khi bảo trì cần dừng toàn bộ dịch vụ.

Ví dụ cấu hình Nginx để kiểm HTTPS trên máy cục bộ. Dùng `SFS_PROD_APP_URL=https://localhost:3443` và tệp chứng chỉ được máy thử tin cậy, có tên `localhost`.

```nginx
server {
    listen 127.0.0.1:3443 ssl;
    server_name localhost;
    ssl_certificate /path/to/localhost.crt;
    ssl_certificate_key /path/to/localhost.key;
    client_max_body_size 8m;

    location / {
        proxy_pass http://127.0.0.1:3016;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_buffering off;
    }
}
```

## Sao lưu và phục hồi

MySQL lưu bản ghi, còn volume `feedback_attachments` lưu nội dung tệp phản hồi. Giữ bản sao cho cả hai và giữ riêng khóa MFA cùng phiên bản tương ứng để mở lại 2FA sau khi phục hồi. Dừng các tiến trình ghi trong thời gian lấy bản sao đồng bộ. Khôi phục vào Compose project có database và kho tệp rỗng, đối chiếu trước khi quyết định đưa vào sử dụng.

Xem lệnh, trình tự bảo trì và các trường hợp từ chối ở [hướng dẫn FR-103](SAO_LUU_KHOI_PHUC.md).

Tài liệu kỹ thuật tham khảo: [Docker Compose](https://docs.docker.com/reference/compose-file/services/) và [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting).
