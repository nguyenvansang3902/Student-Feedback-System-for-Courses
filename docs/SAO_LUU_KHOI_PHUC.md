# Sao lưu và khôi phục dữ liệu

FR-103 dùng `node scripts/database-backup.mjs` để xuất một schema MySQL và các tệp đính kèm được schema tham chiếu, rồi nhập sang một dự án Compose riêng. Gói gồm `database.sql`, `manifest.json` và thư mục `attachments` nếu có tệp. Manifest lưu phiên bản MySQL, collation, số dòng từng bảng, kích thước và SHA-256 của SQL, cùng metadata của các tệp. Cách xuất dùng snapshot InnoDB và giới hạn ở schema ứng dụng. [Tài liệu sao lưu MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/mysqldump-sql-format.html)

## Chuẩn bị

1. Xác nhận `docker context show`, tên dự án Compose, `MYSQL_DATABASE` và named volume của dịch vụ `db`. MySQL phải ở trạng thái healthy. Trên máy Windows của nhóm, dùng [quy trình đối chiếu kho Docker](DOCKER_MOT_KHO_DU_LIEU.md) trước khi thao tác với dữ liệu cần giữ.
2. Dừng `web`, `scheduler` và mọi tiến trình ghi trong suốt thao tác, kể cả tiến trình chạy trực tiếp trên máy, tác vụ migration hoặc công cụ quản trị. Giữ `db` chạy. `--quiesced` xác nhận người vận hành đã thực hiện bước này. Script kiểm tra các container đang chạy trong dự án, còn người vận hành chịu trách nhiệm về các tiến trình bên ngoài.
3. Chọn một thư mục riêng ngoài repo, có thư mục cha sẵn và quyền truy cập hạn chế. Gói có dữ liệu ứng dụng, băm mật khẩu và nội dung tệp đính kèm. Lưu trên ổ đã mã hóa hoặc trong kho sao lưu có kiểm soát truy cập.

## Sao lưu

Ví dụ cho demo Compose trên Windows, sau khi đã tạo thư mục cha `D:/BanSao`. Đổi đường dẫn gói nếu thư mục đã tồn tại.

```powershell
docker --context desktop-linux compose --env-file .local/week14-demo/.env -f compose.demo.yml -p sfs-week14-demo stop scheduler web
node scripts/database-backup.mjs backup --context desktop-linux --project sfs-week14-demo --database sfs_demo --bundle "D:/BanSao/sfs-demo-20261110" --attachments volume:sfs-week14-demo_feedback_attachments --quiesced
```

Trên Linux, dùng tên context và đường dẫn tương ứng trên máy đó. Với phiên chạy web trực tiếp trên máy, `--attachments` nhận đường dẫn thư mục `FEEDBACK_STORAGE_DIR` thay cho cú pháp `volume:<tên-volume>`. Nếu schema có bản ghi `Attachment`, script yêu cầu nguồn tệp và đối chiếu từng tệp theo kích thước và SHA-256 đã lưu. Nếu không có tệp, có thể bỏ tham số này.

Chỉ dùng gói sau khi lệnh báo hoàn tất và có `manifest.json`. Nếu lệnh lỗi, giữ thư mục dở để kiểm tra và chọn tên gói mới cho lần chạy lại. Sau đó có thể mở lại các tiến trình đã dừng ở nguồn.

## Khôi phục thử

1. Sao chép [mẫu biến môi trường triển khai](../deploy/.env.example) vào `.local/restore/.env` và điền cấu hình riêng cho đích thử. Ví dụ này dùng `SFS_PROD_DB_NAME=sfs_restore_demo` và tên dự án `sfs-restore-demo`. Khởi động **chỉ** service `db` để MySQL tạo schema trống trong volume mới. Giữ cùng phiên bản MySQL và collation đã ghi trong manifest. Chưa chạy migrate, seed, web hoặc scheduler.

   ```powershell
   $restoreCompose = @('--env-file', '.local/restore/.env', '-f', 'compose.production.yml', '-p', 'sfs-restore-demo')
   docker --context desktop-linux compose @restoreCompose up -d --wait db
   ```

2. Nếu có tệp đính kèm trong gói, dựng image `web` rồi chạy một lệnh kiểm tra để Compose tạo named volume `feedback_attachments` trống. Lệnh kiểm tra chạy bằng cùng tài khoản Linux với web và xác nhận có thể ghi vào volume.

   ```powershell
   docker --context desktop-linux compose @restoreCompose build web
   docker --context desktop-linux compose @restoreCompose run --rm --no-deps --entrypoint sh web -ec 'test -w "$FEEDBACK_STORAGE_DIR"'
   ```

3. Nhập gói, thay context và đường dẫn theo máy. Với kho đính kèm trên host, chỉ định một đường dẫn thư mục mới có thư mục cha sẵn.

   ```powershell
   node scripts/database-backup.mjs restore --context desktop-linux --project sfs-restore-demo --database sfs_restore_demo --bundle "D:/BanSao/sfs-demo-20261110" --attachments volume:sfs-restore-demo_feedback_attachments --quiesced
   ```

4. Kiểm tra kết quả đếm bảng, số dòng và tệp đính kèm. Sau khi khởi động bản thử ở địa chỉ riêng, kiểm tra đăng nhập đúng vai trò và mở một tệp đính kèm qua màn hình có quyền. Nếu lệnh báo lỗi giữa chừng, đích có thể đã chứa một phần dữ liệu do DDL của MySQL. Giữ đích để chẩn đoán và thử lại với một dự án cùng volume mới.

Script từ chối schema đích đã có bảng, volume đính kèm đích có dữ liệu, tệp không khớp checksum và cấu hình Docker không trùng các tham số đã chọn. Checksum phát hiện thay đổi hoặc hỏng trong quá trình lưu trữ. Chỉ khôi phục từ gói do nhóm kiểm soát và có nguồn gốc xác minh được.

## Khóa và cấu hình

Giữ tệp cấu hình và khóa bí mật trong kho riêng có phân quyền. Khi khôi phục dữ liệu có tài khoản TOTP, cần đúng `MFA_ENCRYPTION_KEY` và `MFA_KEY_VERSION` tương ứng. Trong mẫu Compose production, điền hai giá trị này vào `SFS_PROD_MFA_KEY` và `SFS_PROD_MFA_KEY_VERSION`. Giữ thông tin phiên bản ứng dụng và cấu hình liên quan để dựng bản khôi phục tương thích. Kết quả đối chiếu của script xác nhận các bảng, số dòng, metadata và checksum tệp. Việc thử đăng nhập và mở tệp qua ứng dụng xác nhận bản khôi phục dùng được trong kịch bản vận hành.

## Kết quả kiểm thử

- Bộ dữ liệu nhỏ dùng MySQL 8.4.11 và volume tệp đính kèm riêng. Đã kiểm 13 tình huống, gồm từ chối sai Docker context, gói lỗi checksum và schema đích đã có bảng. [Kết quả 13 tình huống](assets/tuan-14/fr-103-roundtrip.json)
- Bản thử lược đồ ứng dụng gồm **46 bảng, 811 dòng và 1 tệp đính kèm giả**. Sau khôi phục, nội dung từng dòng, bộ mã và collation của cột, định nghĩa bảng đã chuẩn hóa và SHA-256 của tệp khớp. Nhập lần hai vào cùng đích bị từ chối. [Đối chiếu bản thử ứng dụng](assets/tuan-14/fr-103-full-app.json)
- Đã làm theo các lệnh chuẩn bị trong hướng dẫn với `compose.production.yml`, khôi phục sang schema tên khác và kiểm lại SHA-256 từ tài khoản Linux chạy image web. Phạm vi kiểm tra tới quyền đọc tệp của image và dữ liệu MySQL. [Kết quả chạy theo hướng dẫn](assets/tuan-14/fr-103-restore-guide.json)
- Lượt kiểm tiếp theo trên website đã phục hồi qua HTTPS. Sinh viên đăng nhập, mở phản hồi của mình và tải tệp. Tệp tải khớp 68 byte và SHA-256 của nguồn, có một sự kiện tải trong nhật ký. PNG minh họa có CRC lỗi từ nguồn. [Kết quả kiểm qua trình duyệt](assets/tuan-14/fr-103-restored-web.json)
