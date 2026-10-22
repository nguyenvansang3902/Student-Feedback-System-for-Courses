# Phân quyền đang hiện thực — Tuần 4

Soạn thực tế **22/10/2026**. Phạm vi: FR-07, FR-08, FR-10, FR-11, FR-12 và phần BR-30, BR-32, BR-34 áp dụng cho các chức năng này. [Ma trận Tuần 2](PHAN_QUYEN.md) là thiết kế toàn hệ thống; bảng dưới chỉ mô tả phần đã có mã Tuần 4. Chưa triển khai khảo sát, kết quả, phản hồi hoặc CRUD danh mục.

**Trạng thái bằng chứng:** hai tệp `rbac-policy.test.ts` và `rbac-services.test.ts` đã chạy **29/29 test** với policy thuần và DB mock; ESLint các tệp này và service tương ứng qua. Test mock không chứng minh đồng thời trên MySQL thật. Lượt HTTP/CI đã được ghi trong nghiệm thu cuối

## 1. Ranh giới kiểm quyền

1. Trang/Route Handler lấy actor từ cookie được xác minh chữ ký JWT và phiên trong DB. Không nhận `userId`, role hoặc `mfa` từ payload để làm danh tính.
2. Service gọi policy trước khi truy cập dữ liệu. Actor thiếu phiên đầy đủ, phải đổi mật khẩu hoặc chưa qua MFA bắt buộc bị từ chối.
3. Service đọc lại phiên và User/RoleAssignment đang lưu. Kiểm chủ phiên, family, hạn dùng, thu hồi, trạng thái ACTIVE, purpose FULL và `mfaVerifiedAt`. Cờ `actor.mfa=true` không đủ khi DB chưa xác minh.
4. Policy `can(actor, action, resource)` từ chối hành động không biết. Gán sai loại phạm vi hoặc đơn vị ngừng hoạt động không tạo quyền.
5. Truy vấn lớp dùng cùng `sectionScopeWhere()` cho list/count/detail. Detail truy vấn đồng thời ID và phạm vi; bản ghi ngoài phạm vi trả 404.

Middleware không phải ranh giới cấp quyền duy nhất. Giao diện ẩn nút chỉ giúp dùng đúng chức năng; service vẫn chặn truy cập trực tiếp.

## 2. Vai trò và phạm vi hợp lệ

| Vai trò | Loại phạm vi | ID phạm vi |
| --- | --- | --- |
| SINH_VIEN | GLOBAL | Không có facultyId/departmentId; giới hạn lớp bằng Enrollment của chính SV, chưa rút đăng ký. |
| GIANG_VIEN | GLOBAL | Không có ID đơn vị; giới hạn lớp bằng TeachingAssignment của chính GV. |
| TRUONG_BO_MON | DEPARTMENT | departmentId của bộ môn đang hoạt động và khoa cha đang hoạt động; không có facultyId trong gán. |
| TRUONG_KHOA | FACULTY | facultyId của khoa đang hoạt động; không có departmentId trong gán. |
| CAN_BO_DBCL | GLOBAL | Không có ID đơn vị. |
| LANH_DAO | GLOBAL | Không có ID đơn vị. |
| ADMIN | GLOBAL | Không có ID đơn vị; chỉ quyền quản trị trong bảng dưới. |

`scopeKey` được service tạo từ dữ liệu đã kiểm (`GLOBAL`, `FACULTY:<id>`, `DEPARTMENT:<id>`); client không được tự đặt. Một người có nhiều gán thì quyền là hợp của các gán hợp lệ. ADMIN + GIANG_VIEN được xem lớp qua gán GIANG_VIEN của mình; ADMIN không mở thêm lớp khác.

## 3. Ma trận phần chạy trong Tuần 4

Điều kiện chung: phiên FULL; tài khoản ACTIVE; đã đổi mật khẩu tạm; MFA nếu chính sách yêu cầu. ADMIN luôn phải MFA. “Lớp” ở đây chỉ là bản xem danh mục tối thiểu để kiểm phạm vi, không chứa phiếu, điểm, danh sách SV hay nội dung phản hồi.

| Hành động | SV | GV | TBM | TK | ĐBCL | LĐ | ADMIN |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Vào không gian của vai trò | Đúng gán SV | Đúng gán GV | Đúng gán TBM | Đúng gán TK | Đúng gán ĐBCL | Đúng gán LĐ | Đúng gán ADMIN + MFA |
| List/count/detail lớp tối thiểu | Lớp đang đăng ký | Lớp được phân công | Bộ môn được gán | Khoa được gán và các bộ môn con | Toàn trường | Toàn trường | Từ chối nếu chỉ có ADMIN |
| Xem/lọc tài khoản và chi tiết | — | — | — | — | — | — | Cho phép |
| Tạo tài khoản PENDING | — | — | — | — | — | — | MFA + CSRF + mã TOTP mới |
| Khóa/mở tài khoản | — | — | — | — | — | — | MFA + CSRF; chặn tự khóa |
| Đổi vai trò/phạm vi người khác | — | — | — | — | — | — | MFA + CSRF + mã TOTP mới; chặn tự đổi vai trò |
| Xem/lọc AuditLog đã lược bí mật | — | — | — | — | — | — | Cho phép |
| Xem/sửa vai trò bắt buộc MFA | — | — | — | — | — | — | Sửa cần CSRF + mã TOTP mới; không bỏ ADMIN |
| Đặt lại MFA người khác | — | — | — | — | — | — | ADMIN khác, CSRF + mã TOTP mới, có audit |
| Xem kết quả/nội dung phản hồi | Chưa có | Chưa có | Chưa có | Chưa có | Chưa có | Chưa có | Chưa có; không được suy quyền từ ADMIN |

URL `/khong-gian/[role]` kiểm đúng vai trò đã gán; gõ URL của vai trò khác không cấp quyền. Khi một người có nhiều gán, danh sách lớp là hợp phạm vi của tất cả gán được cấp và giao diện giải thích điều này.

## 4. Thay đổi tài khoản và chính sách

- Tài khoản tạo qua web ở PENDING_ACTIVATION, `passwordHash=null`; người nhận dùng luồng kích hoạt đã có. Không tạo mật khẩu mặc định qua web.
- Mở lại tài khoản chưa có mật khẩu trả về PENDING_ACTIVATION; có mật khẩu mới trở về ACTIVE. Thay trạng thái/vai trò thu hồi mọi phiên và AuthToken chưa dùng của tài khoản đích.
- Thay đổi quản trị cùng khóa hàng `SystemSetting.ADMIN_MUTATION_LOCK` trước khi đọc lại actor và cập nhật. Không được vô hiệu ADMIN ACTIVE cuối cùng. Test mock đã kiểm thứ tự khóa; kiểm chứng tranh chấp MySQL thật vẫn phải có bằng chứng riêng.
- Tự khóa/tự sửa vai trò bị chặn để tránh mất quyền hoặc tự cấp thêm quyền ngoài ý định; cần ADMIN khác thực hiện. Script máy chủ là quyền vận hành riêng, không phải quyền web suy từ ADMIN.
- Thêm một vai trò bắt buộc MFA khóa các User liên quan trước khi cập nhật chính sách; thu hồi phiên chưa MFA của họ. `getActor`, refresh và service cũng đọc lại chính sách. Bỏ một vai trò khỏi chính sách không được bỏ ADMIN.
- Các danh sách tài khoản, audit và lớp có phân trang, tối đa 50 dòng/trang. Tùy chọn khoa/bộ môn chỉ đọc đơn vị đang hoạt động, tối đa 200 mỗi loại và cờ `hasMore`; chưa có màn tìm kiếm đơn vị lớn trong Tuần 4.

## 5. Truy vết bằng chứng hiện có

| Điều kiện | Mã và test |
| --- | --- |
| Deny mặc định, 7 vai trò, own/other, cùng/khác khoa/bộ môn, hợp scope, ADMIN không có quyền nghiệp vụ ngầm | `src/server/policies/can.ts`; `tests/rbac-policy.test.ts` |
| Chặn trước DB; phiên thu hồi/sai chủ/sai mục đích; DB chưa MFA; thay chính sách; scope ngừng hoạt động | `src/server/services/access.ts`; `tests/rbac-services.test.ts` |
| List/count/detail cùng filter, ID sai và ID ngoài phạm vi | `src/server/services/workspace.ts`; `tests/rbac-services.test.ts`; cần bổ sung kết quả HTTP/MySQL thực tế khi hoàn tất |
| Tạo PENDING; scopeKey máy chủ; thu hồi phiên/token; tự đổi quyền/tự khóa; bảo vệ ADMIN cuối | `src/server/services/users.ts`; `tests/rbac-services.test.ts` |
| Lọc AuditLog và chặn trường/chuỗi bí mật trong bản ghi cũ ở đầu ra | `src/server/services/audit.ts`; `tests/rbac-services.test.ts` |
| ADMIN không được tắt MFA, bổ sung vai trò và thu hồi phiên chưa MFA | `src/server/services/mfa-policy.ts`; `tests/rbac-services.test.ts` |

Các route có ID mới phải được kiểm trực tiếp qua HTTP: chi tiết/sửa vai trò/khóa-mở/reset MFA tài khoản và chi tiết lớp. Báo cáo nghiệm thu cuối phải ghi lệnh, số ca thực sự chạy và commit/CI tương ứng; không đánh dấu toàn bộ ma trận các tuần sau là đã đạt.

## 6. Lỗi tranh chấp được phát hiện khi kiểm MySQL thật

Lượt đầu trong DB kiểm thử riêng đã cho hai ADMIN khóa chéo nhau đồng thời. Cả hai yêu cầu trả 200 và không còn ADMIN ACTIVE trong tập fixture: test đã tìm ra lỗi mà mock không phát hiện. Không thao tác trên dữ liệu hoặc phiên người dùng/seed của DB phát triển.

Nguyên nhân: ORM `upsert` với `update: {}` có thể thực hiện SELECT thường trước khi chờ hàng khóa. Ở MySQL REPEATABLE READ, SELECT đó lập snapshot sớm; transaction đợi mutex xong vẫn đọc phiên và số ADMIN theo snapshot cũ.

Bản sửa dùng `INSERT ... ON DUPLICATE KEY UPDATE` có khóa hiện tại làm câu lệnh DB đầu tiên trong transaction, rồi SELECT FOR UPDATE. Chỉ sau khi đã giữ mutex mới có SELECT thường để kiểm lại actor/quyền/số ADMIN. Regression mock kiểm thứ tự này và không cho quay lại ORM upsert rỗng.

Kiểm service song song trên MySQL riêng sau bản sửa: **một yêu cầu thành công, còn một ADMIN ACTIVE; yêu cầu thua nhận INVALID_SESSION** vì phiên đã bị yêu cầu thắng thu hồi. Phép thử dùng đúng hai User UUID và hai phiên FULL đã MFA, kiểm dấu nhận dạng DB trước khi chạy, dọn đúng fixture sau kiểm. Đây là bằng chứng service/MySQL; lượt HTTP đầy đủ vẫn cần chạy lại và ghi riêng.

## Nghiệm thu cuối ngày 22/10/2026

Full check **121/121 test trong 13 file**, SQL MySQL **10/10**, CLI stdin **5/5**, HTTP hồi quy Tuần 3 **24/24**, HTTP/MySQL Tuần 4 **28/28** và build exit0. [CI 39733168348](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39733168348) của mã `578fd96622b341b0d94228de83c4c8994449e03b` đã qua check và smoke. Hai ADMIN khóa chéo chỉ một thắng, giữ một ADMIN ACTIVE. UI 13 nhóm/6 viewport qua; [nghiệm thu](NGHIEM_THU_TUAN_04.md).
