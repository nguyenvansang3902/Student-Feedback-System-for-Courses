# Nghiệm thu Tuần 5 — danh mục và nhập liệu

**Kế hoạch giả định:** 28/10–03/11/2026. **Thực hiện:** 22/10/2026, Asia/Saigon, theo lệnh người dùng làm sớm. Người dùng đã cho phép rõ ngày 22/10 tạo sớm **dữ liệu seed khảo sát/phản hồi**; chỉ bảng/dữ liệu giả, chưa triển khai workflow/API/UI các tuần sau. Không ghi lùi ngày.

## 1. Phạm vi và trạng thái

- FR-20: CRUD học kỳ, khoa, bộ môn, môn học, lớp học phần, phân công giảng viên; khóa sổ không mở lại, kiểm cả ảnh hưởng gián tiếp tới dữ liệu kỳ khóa.
- FR-21: import sinh viên, giảng viên, lớp và đăng ký bằng CSV/XLSX; chạy thử chỉ đọc, lỗi từng dòng, xác nhận gắn đúng tệp/người/phiên, kiểm lại trước ghi toàn bộ trong transaction; tài khoản chờ kích hoạt và email.
- FR-22: tải mẫu CSV/XLSX đúng header của bốn loại nhập.
- FR-101: seed danh mục/người dùng/phân công/đăng ký giả, cỡ small/medium/large và demo cách ly; dữ liệu đợt đóng/có kết quả, đợt mở và phản hồi sáu trạng thái theo quyền người dùng ngày 22/10. Seed MySQL thật **9/9 nhóm qua**, có kiểm khởi tạo mới small/medium. Có dữ liệu không có nghĩa chức năng khảo sát/phản hồi đã hoàn thành.

BR-17/30/34 được kiểm trong chức năng Tuần 5. Quyền và trạng thái của khảo sát/phản hồi tương lai chưa được nhận hoàn tất.

## 2. Chuẩn bị an toàn dữ liệu

Theo [README](../README.md), giữ nguyên `.env`, khóa MFA và volume đang dùng. Kiểm Docker db/mailpit đang khỏe. Nếu cần môi trường demo mới:

```powershell
npm.cmd ci
npm.cmd run auth:key
docker compose up -d --wait db mailpit
npm.cmd run demo
```

Lệnh chuẩn bị kiểm danh tính MySQL và tạo database demo mới có marker; áp dụng migration, seed rồi mở cổng riêng (mặc định `http://127.0.0.1:3001`). Không reset/DROP DB chính hoặc DB demo trước. Chỉ chuẩn bị dữ liệu thì dùng `npm.cmd run demo -- --prepare`; cờ này không khởi động web.

Tài khoản ĐBCL demo: `DBCL2026001`, mật khẩu mẫu xem README. Không có ADMIN seed cố định; ADMIN riêng vẫn phải tạo/hoàn tất TOTP theo tuần trước. Không dùng dữ liệu hoặc email thật khi nghiệm thu.

## 3. Thao tác nghiệm thu nhìn thấy được

1. Đăng nhập ĐBCL, mở `/danh-muc`. Xem/tìm kiếm/chuyển trang và tạo danh mục giả theo thứ tự khoa→bộ môn→môn/học kỳ→lớp; sửa/xóa bản ghi chưa tham chiếu. Dữ liệu đang dùng trả 409, không xóa lan.
2. Phân công nhiều giảng viên hợp lệ vào lớp mở; chỉ có tối đa một người phụ trách chính. Tài khoản không có vai trò giảng viên hoặc bị khóa không được chọn hợp lệ. Thử bằng ADMIN đơn vai trò/sinh viên: trang/API danh mục bị chặn.
3. Chọn từng loại nhập, tải mẫu CSV/XLSX rồi điền mã mới. Chạy thử đúng thấy số dòng hợp lệ và chưa tăng dữ liệu; xác nhận mới ghi đủ số dòng. Tài khoản mới phải PENDING_ACTIVATION; thư kích hoạt trong Mailpit, không có mật khẩu chung trong file.
4. Tạo tệp cố tình sai header/email, trùng mã hoặc mã tham chiếu không tồn tại. Chạy thử phải hiển thị đúng dòng/cột/thông báo và không cho ghi. Sửa tệp và chạy thử lại; đổi tệp sau preview hoặc dùng lại xác nhận đã ghi bị chặn.
5. Với kỳ giả riêng, chạy thử nhập lớp/đăng ký rồi khóa kỳ bằng lý do đủ dài. Xác nhận nhập sau khóa phải bị chặn. Sửa/xóa học kỳ, lớp, phân công và khoa/bộ môn/môn ảnh hưởng lớp kỳ khóa cũng bị chặn; dữ liệu vẫn đọc được.
6. Đối chiếu AuditLog và kết quả kiểm bên dưới. Nếu SMTP lỗi sau commit, tài khoản vẫn có và trả số thư thất bại; sửa SMTP rồi yêu cầu lại ở `/kich-hoat`, không nhập lại tệp. Các bước bấm là hướng dẫn kiểm, không tự chứng minh đã thao tác tất cả qua UI.

Chi tiết định dạng, ví dụ, giới hạn và xử lý lỗi: [hướng dẫn import](HUONG_DAN_IMPORT.md).

## 4. Các lệnh kiểm tra

```powershell
npm.cmd run check
npm.cmd run test:integration
npm.cmd run test:auth
npm.cmd run test:week4
npm.cmd run test:week5
npm.cmd run build
npm.cmd run progress
```

Chạy các bộ HTTP tuần tự. Tuần 5 dùng lại database thử riêng do `prepare-week4-test.mjs` kiểm marker/server identity và xác nhận khác main/shadow; máy chủ thử cổng 3004/output `.next-week5`. Chỉ dọn fixture thuộc lần kiểm; không DROP/reset DB hoặc volume. Dùng kết quả của lần chạy cuối sau sửa, không cộng test targeted lặp vào tổng full.

## 5. Bằng chứng và trạng thái gate

**Các gate cục bộ bên dưới đã qua trên mã Tuần 5 ngày 22/10/2026.** CI phải đối chiếu riêng đúng commit, không dùng kết quả Tuần 4 thay thế. Báo cáo vẫn là bản nháp AI hỗ trợ để nhóm đọc, thử và viết lại.

| Hạng mục | Kết quả thực tế đã biết |
| --- | --- |
| Catalog unit | **27/27 qua**, cùng RBAC cũ **56/56** trong lượt targeted; gồm deny trước DB, fresh actor, thứ tự mutex, khóa trực tiếp/gián tiếp, CAS, FK/unique, teacher/lead, DTO/list/count. Nằm trong tổng full, không cộng lặp |
| CSRF/parser/import/audit/seed unit | Đã nằm trong **219/219 test full**: CSRF tách mục đích/phiên, parser CSV/XLSX và giới hạn nén/ô, preview không ghi, kiểm lại/rollback/SMTP lỗi sau commit, metadata audit và dữ liệu seed. Riêng seed **17/17 targeted** sau sửa; không cộng targeted vào tổng full lần nữa |
| SQL/migration/schema | **10/10 SQL nền MySQL thật qua**, migration `20261022072500_week5_demo_data` DB chính deploy và diff không khác. 16 bảng cũ + 15 bảng chỉ seed được người dùng cho phép, runtime31/blueprint39. Không có workflow/UI/API nghiệp vụ tương lai |
| HTTP/MySQL Tuần 5 | **22/22 qua ngày 22/10**, fixture dọn. Gồm cả 8 mẫu tải/đọc lại, CSV/XLSX đúng/sai, preview chỉ đọc, quyền/IDOR, token gắn tệp/phiên/hạn, hai commit chỉ một thắng, tài khoản pending/thư Mailpit, khóa so với import thật, audit/log không lộ nội dung |
| Hồi quy Tuần 3/4 | **HTTP Tuần 3 24/24**, **CLI 5/5 và HTTP Tuần 4 28/28 qua trên mã Tuần 5** ngày 22/10, fixture dọn. Lượt auth 24 mới đã chạy lại sau sửa cuối. Gồm OTP/recovery đồng thời và hai ADMIN khóa chéo còn đúng một ADMIN ACTIVE |
| Seed/demo | MySQL thật **9/9 nhóm qua**, kết thúc 18:50 ngày 22/10. Medium mới **3 khoa/8 bộ môn/40 môn/120 lớp/60 GV/1.500 SV/4.501 đăng ký**, 2 đợt/6 cohort/78 phiếu/234 câu trả lời/6 phản hồi. Tăng medium→large **3/8/80/240/120/3.000/9.001**, giữ nguyên UUID phiếu, danh sách chốt và kết quả. Khởi tạo mới small bằng `demo -- --prepare` **3/8/8/12/6/30/91**, 2 đợt/4 cohort/10 phiếu/30 câu trả lời/6 phản hồi. Đã kiểm điểm trọng số từ câu trả lời và sáu trạng thái; chạy lại giữ mật khẩu/tài khoản đã khóa, không có hai GV chính, không giảm/xóa dữ liệu khi chọn size nhỏ. Từ chối production/actor/size sai/kỳ khóa |
| Demo chạy web và seed DB chính | `npm run demo` bình thường đã tạo mới medium, migration/seed xong và máy chủ **Ready tại http://127.0.0.1:3001**; HTTP 200. Ứng dụng chính cổng 3000 vẫn HTTP 200. Seed medium trong DB chính cũng qua, đối chiếu **bốn tài khoản auth demo cũ không đổi**. Chưa có lượt tạo mới large riêng; large được kiểm bằng tăng size trên DB demo |
| Full check/build | **219/219 test trong 19 file qua**, lượt cuối 18:52 ngày 22/10; validate/generate hai schema, ERD, ESLint và TypeScript qua. **Production build exit 0**. Kết quả 202 trước khi bổ sung test seed không thay lượt cuối |
| Giao diện/ảnh | [QA trình duyệt](QA_GIAO_DIEN_TUAN_05.md): **13 nhóm thao tác, 10 lượt viewport 1440/390px qua**, không lỗi JavaScript/tràn ngang/thiếu nhãn theo phép đo DOM. Đã tạo sáu danh mục, phân trang, chạy thử CSV sai/đúng, xác nhận nhập sinh viên pending, tải 8 mẫu và khóa kỳ. **10/10 PNG đã mở xem**, không chứa bí mật; fixture dọn, seed giữ nguyên. Chưa thao tác đủ sửa/xóa hoặc commit mọi loại import qua UI |
| Sơ đồ | [Đối chiếu ERD](SO_DO_TUAN_05.md): 31 runtime/39 blueprint; **4/4 thân Mermaid khớp HEAD** nên giữ render lịch sử. Bốn SVG tổng quan mới đã raster và mở xem đủ, nhãn seed/tương lai rõ |
| Dependency audit | **Production 0**, full audit còn **5 high** ở dev chain braces→micromatch→fast-glob→ESLint. ExcelJS dùng override uuid11.1.1 theo bản vá [uuid v11.1.1](https://github.com/uuidjs/uuid/releases/tag/v11.1.1); đối chiếu nguồn ExcelJS chỉ gọi `uuid.v4()` không tham số. Không force downgrade hoặc nhận toàn hệ thống hết lỗ hổng |
| CI/commit | **Chờ root điền URL run và đúng SHA Tuần 5**; CI Tuần 4 không chứng minh mã Tuần 5 |
| Progress | `npm run progress` thực tế: **46/163 = 28,2%**, M3 **9/9 = 100%**, M11 **6/11 = 54,5%**; đã tick FR-20/21/22/101. FR chức năng khảo sát/phản hồi tương lai vẫn chưa tick |

## 6. Giới hạn còn lại

- Dữ liệu seed khảo sát/phản hồi được phép tạo sớm, nhưng chưa có workflow/UI/API tương ứng. Không tick FR chức năng tương lai chỉ vì có bảng/bản ghi seed. Bằng chứng seed được kiểm riêng với kiểm chức năng nghiệp vụ.
- Mutex toàn cục ưu tiên tính đúng, các lệnh ghi chờ nhau; chưa có kiểm tải production. Tệp tối đa 2 MiB, tài khoản 500 dòng, lớp/đăng ký 2.000 dòng; chỉ CSV UTF-8/XLSX một sheet với header cố định.
- Import chỉ tạo mới, không có cập nhật hàng loạt, phục hồi đăng ký rút hoặc cấp vai trò tùy ý. Mỗi tệp ghi toàn bộ hoặc không ghi trước commit; không có bỏ qua dòng lỗi.
- SMTP gửi sau commit có thể lỗi một phần. Có kết quả gửi được/thất bại; nếu DB cũng ngắt lúc thu hồi token thư lỗi thì báo số chưa thu hồi, token giữ TTL ban đầu. Khôi phục rồi yêu cầu lại kích hoạt; chưa có outbox/retry nền hoặc SMTP Internet đã nghiệm thu.
- Khóa sổ không có mở lại; lưu audit lý do ở dạng cờ/độ dài. Không đổi khóa MFA hoặc reset dữ liệu để thử.
- Nhóm phải đọc/thử/viết lại nháp, tự điền đóng góp thật; AI không xác nhận thay phần sinh viên đã làm.

## 7. Tài liệu liên quan

[Hướng dẫn import](HUONG_DAN_IMPORT.md), [ADR-006](decisions/ADR-006-danh-muc-va-nhap-lieu.md), [giải thích và 5 câu bảo vệ](GIAI_THICH/tuan-05.md), [báo cáo tuần](bao-cao-tien-do/tuan-05.md), [QA giao diện](QA_GIAO_DIEN_TUAN_05.md), [đối chiếu sơ đồ](SO_DO_TUAN_05.md), [truy vết](TRUY_VET.md), [tiến độ](PROGRESS.md). Giữ nguyên bốn file nguồn; 15 bảng seed từ blueprint được bổ sung theo ngoại lệ người dùng đã cho phép ngày 22/10, không triển khai workflow/UI/API các tuần sau.
