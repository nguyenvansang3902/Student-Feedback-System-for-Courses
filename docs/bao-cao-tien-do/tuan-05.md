# BÁO CÁO TIẾN ĐỘ TUẦN 5/15 — cập nhật 22/10/2026

**Đề tài:** Xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học.

**Tiểu luận chuyên ngành HK1 2026–2027 | Nhóm:** [sinh viên điền] **| GVHD:** [sinh viên điền].

**Kế hoạch giả định:** 28/10–03/11/2026, mỗi tuần 7 ngày từ 30/09; nhóm đối chiếu lịch trường.

**Thực hiện:** từ **22/10/2026**, bắt đầu Tuần 5 sớm theo lệnh người dùng. Giữ ngày thực hiện thật; không viết lại lịch sử khởi động muộn Tuần 1–3.

**Trạng thái:** đã nghiệm thu cục bộ FR-20/21/22/101; bằng chứng CI đúng commit đối chiếu trong nghiệm thu. Người dùng cho phép rõ ngày 22/10 tạo sớm dữ liệu seed khảo sát/phản hồi, chỉ bảng/dữ liệu giả, chưa có workflow/UI/API tương lai. AI hỗ trợ nháp kỹ thuật; nhóm đọc, thử và viết lại bằng lời của mình.

## 1. Mục tiêu của tuần theo kế hoạch

CRUD học kỳ có khóa sổ, khoa, bộ môn, môn học, lớp học phần, phân công giảng viên; import Excel/CSV cho sinh viên, giảng viên, lớp và đăng ký với chạy thử/lỗi từng dòng; tải mẫu và hoàn thiện seed demo. Nghiệm thu tệp đúng, tệp cố tình sai và `npm run demo`; tài liệu hướng dẫn import. Ngoại lệ được người dùng chấp thuận ngày 22/10: tạo sớm dữ liệu seed khảo sát/phản hồi, chưa triển khai workflow/UI/API chức năng tương lai.

## 2. Kết quả đạt được và bằng chứng

- Đã có service/route/giao diện danh mục và nhập liệu; policy chỉ cấp ĐBCL GLOBAL hợp lệ, ADMIN đơn vai trò không có quyền nghiệp vụ ngầm. Service kiểm phiên/quyền hiện tại từ DB; thao tác ghi kiểm Origin/Host và CSRF mục đích riêng.
- CRUD sáu danh mục, phân trang/tìm kiếm, bộ chọn giảng viên không chứa bí mật. Khóa sổ có lý do/CAS/audit; chặn dữ liệu kỳ khóa trực tiếp và gián tiếp qua khoa/bộ môn/môn. Nhiều giảng viên được phân công, tối đa một người phụ trách chính theo quyết định hiện thực.
- Import CSV UTF-8/XLSX một sheet có header cố định; chạy thử chỉ đọc, lỗi theo dòng/cột; xác nhận 15 phút gắn user/session/tệp, kiểm lại DB rồi ghi toàn bộ trong transaction. Tài khoản mới chờ kích hoạt; gửi thư sau commit, có đếm gửi lỗi và yêu cầu lại tại `/kich-hoat`.
- Full `npm run check` cuối **219/219 test trong 19 file qua**; validate/generate hai schema, ERD, ESLint và TypeScript qua, build exit 0. Catalog 27, CSRF 6 và seed 17 targeted thuộc tổng full, không cộng hai lần. SQL nền **10/10**, HTTP/MySQL Tuần 5 **22/22** qua: đủ 8 mẫu, CSV/XLSX đúng/sai, preview chỉ đọc, quyền/IDOR, token gắn tệp/phiên/hạn, hai commit chỉ một thắng và khóa kỳ tranh chấp thật. Hồi quy HTTP Tuần 3 **24/24**, CLI **5/5**, HTTP Tuần 4 **28/28** trên mã mới qua; fixture dọn. CI đúng commit ghi riêng trong [nghiệm thu](../NGHIEM_THU_TUAN_05.md).
- [QA giao diện](../QA_GIAO_DIEN_TUAN_05.md): **13 nhóm thao tác/10 lượt viewport 1440 và 390px qua**, đã mở xem đủ 10 PNG, không lỗi JavaScript/tràn ngang/thiếu nhãn theo DOM. Tạo đủ sáu danh mục, CSV đúng/sai/commit pending, tám mẫu và khóa kỳ đã chạy; chưa nhận đã thử đủ sửa/xóa hoặc mọi loại import qua UI. Fixture dọn, seed giữ nguyên. [ERD](../SO_DO_TUAN_05.md) 31/39 đã đối chiếu: bốn thân Mermaid không đổi, giữ render lịch sử; bốn SVG tổng quan mới đã raster và xem.
- Seed MySQL thật **9/9 nhóm qua**: medium mới có **3 khoa, 8 bộ môn, 40 môn, 120 lớp, 60 giảng viên, 1.500 sinh viên, 4.501 đăng ký**; tăng lên large 3/8/80/240/120/3.000/9.001 giữ nguyên danh sách chốt, UUID phiếu/câu trả lời và kết quả. Small tạo DB mới có 3/8/8/12/6/30/91. Medium có 2 đợt, 78 phiếu/234 câu trả lời/6 phản hồi; small có 10 phiếu/30 câu trả lời. Đã đối chiếu điểm trọng số từ câu trả lời, sáu trạng thái và giữ mật khẩu/tài khoản đã khóa khi seed lại. Runtime bổ sung 15 bảng từ blueprint (31/39) theo quyền người dùng ngày 22/10. Demo tạo DB mới riêng, giữ DB chính; chọn size nhỏ không xóa dữ liệu đã có.
- Lệnh `npm run demo` bình thường đã tạo medium mới, seed và chạy web cổng 3001 Ready/HTTP 200; ứng dụng chính 3000 vẫn HTTP 200. Seed medium DB chính đã qua, giữ nguyên bốn tài khoản auth demo cũ. Large được kiểm bằng tăng size, chưa có lượt tạo mới large riêng.
- Audit production **0**, full audit còn **5 high** trong dev chain braces→micromatch→fast-glob→ESLint. Đã thay uuid phụ thuộc ExcelJS bằng override 11.1.1 và kiểm tương thích lời gọi; không force downgrade. Đã có [hướng dẫn import](../HUONG_DAN_IMPORT.md), [ADR-006](../decisions/ADR-006-danh-muc-va-nhap-lieu.md), [giải thích với 5 câu bảo vệ](../GIAI_THICH/tuan-05.md) và [nghiệm thu](../NGHIEM_THU_TUAN_05.md); CI phải đối chiếu đúng mã Tuần 5.

## 3. Đối chiếu kế hoạch

| Mục | Trạng thái hiện tại | Bằng chứng và giới hạn |
| --- | --- | --- |
| CRUD và khóa sổ danh mục | Hoàn thành Tuần 5 | Catalog 27; HTTP 22 gồm mutex/fresh guard/CAS/ảnh hưởng gián tiếp và quyền/IDOR |
| Import bốn loại CSV/XLSX | Hoàn thành Tuần 5 | HTTP 22: chạy thử không ghi, lỗi dòng, xác nhận gắn tệp, tranh chấp thật, pending/email Mailpit |
| Tải mẫu CSV/XLSX | Hoàn thành Tuần 5 | HTTP 22 tải/đọc lại đủ 8 mẫu; dòng minh họa có mã tham chiếu cần thay |
| Seed danh mục/người dùng/đăng ký | Hoàn thành Tuần 5 | MySQL 9 nhóm, small/medium tạo mới và tăng lên large, giữ dữ liệu cũ/DB chính |
| Seed toàn hệ thống FR-101 | Hoàn thành dữ liệu được phép bổ sung sớm | Hai đợt mở/đóng, task/phiếu/kết quả thật, sáu trạng thái phản hồi; không workflow/UI/API tương lai |
| HTTP/UI/sơ đồ | Đạt các lượt đã ghi | HTTP 22, hồi quy HTTP 24/CLI 5/HTTP 28; UI 13 nhóm/10 viewport/10 ảnh đã xem; bốn SVG tổng quan đã raster/xem |
| Check/build | Đạt cục bộ | 219/219, 19 file; hai schema/ERD/lint/typecheck, build exit 0; CI đúng SHA ghi tại nghiệm thu |
| Tài liệu | Đã có nháp cần nhóm đọc lại | Hướng dẫn, ADR006, nghiệm thu, giải thích, báo cáo, QA, đối chiếu sơ đồ và truy vết |
| Workflow/UI/API mẫu phiếu/đợt/phản hồi | Chưa làm, đúng giới hạn quyền mới | Chỉ tạo sớm dữ liệu seed; chức năng vẫn chờ tuần tương ứng |

## 4. Tiến độ lũy kế

Theo checkbox và kết quả thực tế `npm run progress`, **46/163 điểm = 28,2%**, thêm FR-20/21/22/101 với 12 điểm P0. Bằng mục tiêu lũy kế phạm vi Tuần 5, tăng từ 34/163 của Tuần 4. Không tính thêm FR chức năng khảo sát/phản hồi chỉ vì có bảng và dữ liệu seed; không ước lượng tỷ lệ theo số file hoặc số dòng dữ liệu.

| Module | Điểm đạt/tổng hiện tại | Tỷ lệ |
| --- | ---: | ---: |
| M1 Xác thực và phiên | 22/23 | 95,7% |
| M2 Người dùng, phân quyền, kiểm toán | 9/9 | 100,0% |
| M3 Danh mục và nhập liệu | 9/9 | 100,0% |
| M4 Mẫu phiếu | 0/16 | 0,0% |
| M5 Đợt khảo sát | 0/22 | 0,0% |
| M6 Làm khảo sát | 0/14 | 0,0% |
| M7 Kết quả | 0/18 | 0,0% |
| M8 Phản hồi | 0/19 | 0,0% |
| M9 Thông báo | 0/7 | 0,0% |
| M10 Báo cáo | 0/12 | 0,0% |
| M11 Hệ thống | 6/11 | 54,5% |
| M12 Mở rộng | 0/3 | 0,0% |

Tuần 5 bắt đầu 22/10 sớm hơn khoảng giả định 28/10–03/11. Mục tiêu lũy kế cuối Tuần 5 trong checklist gồm cả FR-101; chỉ dùng kết quả đã kiểm, không đổi mốc hoặc giảm mẫu số để khớp tiến độ. Nhóm/GVHD đối chiếu lịch trường trước khi kết luận tiến độ toàn đề tài.

## 5. Khó khăn, rủi ro và hướng xử lý

- Seed toàn hệ thống và ranh giới tuần có phụ thuộc chưa triển khai. Đã nêu xung đột và người dùng cho phép tạo sớm dữ liệu seed khảo sát/phản hồi ngày 22/10; chỉ thêm bảng/dữ liệu, không workflow/UI/API. Giữ bốn file nguồn nguyên vẹn, ghi ngoại lệ tại ADR006; FR-101 được tick theo dữ liệu đã kiểm, các FR chức năng tương lai chưa tick.
- Khóa đồng thời dưới REPEATABLE READ cần mutex trước mọi SELECT thường. Catalog/import/đổi quyền dùng cùng hàng khóa và có CAS khi khóa sổ. HTTP 22 đã kiểm tranh chấp MySQL thật giữa khóa kỳ và commit; HTTP 28 hồi quy giữ đúng một ADMIN khi khóa chéo.
- XLSX có nén và giá trị ô phức tạp; parser giới hạn ZIP, kích thước, một sheet và loại ô; CSV chỉ UTF-8/dấu phẩy/header cố định. Tệp tài khoản tối đa 500 dòng, lớp/đăng ký 2.000 dòng, mỗi tệp 2 MiB.
- SMTP có thể lỗi sau commit. Phản hồi đếm gửi được/thất bại, thu hồi đúng token thư lỗi; nếu DB cũng ngắt thì báo số chưa thu hồi, token giữ TTL ban đầu. Tài khoản giữ pending và yêu cầu lại kích hoạt sau khôi phục. Chưa có outbox/retry nền hoặc nghiệm thu SMTP Internet.
- Seed lại từng kiểm cohort đã chốt và có thể sinh lịch sử tiếp nhận/từ chối ở tương lai khi chạy cuối tuần. Đã chuyển kiểm enrollment sang trường hợp tạo đợt còn thiếu, tính ngày nghiệp vụ theo ngày làm việc và thêm regression 17; MySQL 9 nhóm sau sửa qua. Seed không thay đổi danh sách chốt hay kết quả cũ khi tăng size.
- Mutex toàn cục làm lệnh ghi nối tiếp, ưu tiên tính đúng ở quy mô demo; chưa kiểm tải production. Full audit vẫn có 5 high dev chain sau thêm ExcelJS/faker; không tuyên bố hệ thống hết lỗ hổng.
- Không thử trên dữ liệu thật hoặc reset DB/volume; không đưa token/mật khẩu vào file nhập hay ảnh báo cáo. Nhóm tự xác minh và điền đóng góp thực tế.

## 6. Kế hoạch Tuần 6

Sau khi chốt Tuần 5 và có lệnh tiếp tục: trình soạn mẫu phiếu với nhóm/câu hỏi/loại câu/trọng số/bắt buộc/không áp dụng; phiên bản, khóa, xem trước, nhân bản và mẫu mặc định. Nghiệm thu mẫu đủ loại câu hỏi, mẫu khóa không sửa được (BR-05); cập nhật ERD và ảnh. Chưa làm đợt khảo sát hoặc tự triển khai Tuần 6 trong phiên này.

## 7. Phân công và đóng góp từng thành viên

**[SINH VIÊN TỰ ĐIỀN]** Tên, phần thực làm và bằng chứng commit/kiểm thử/ảnh/thuyết minh đã tự xác minh. AI không gán tên, số giờ hoặc phần việc cho thành viên. Công việc AI hỗ trợ ghi riêng trong [AI_USAGE](../AI_USAGE.md).

## 8. Các bước kiểm tra nhanh cho giảng viên

1. Theo README chạy `npm.cmd run demo`, mở đúng URL cổng riêng và đăng nhập DBCL2026001. Danh mục có dữ liệu giả, DB chính được giữ; dữ liệu seed khảo sát/phản hồi có thể kiểm trong DB, chưa có workflow/UI/API tương ứng.
2. Mở Danh mục & nhập liệu, tìm kiếm/chuyển trang và tạo một môn/lớp giả theo cây danh mục; phân công giảng viên. ADMIN đơn vai trò hoặc sinh viên không mở được chức năng này.
3. Tải mẫu sinh viên CSV/XLSX, điền mã/email giả mới rồi chạy thử: hiện dòng hợp lệ nhưng chưa tạo tài khoản. Xác nhận mới tạo pending; kiểm thư Mailpit và kích hoạt theo hướng dẫn.
4. Dùng tệp có dòng email sai/trùng/mã tham chiếu không có: thấy đúng dòng/cột và không ghi. Sửa tệp, chọn lại và chạy thử; xác nhận cũ/tệp đổi bị chặn.
5. Trên kỳ giả riêng, chạy thử nhập lớp rồi khóa kỳ bằng lý do đủ dài. Xác nhận sau khóa và sửa danh mục ảnh hưởng kỳ khóa đều bị chặn; xem AuditLog, không mở lại kỳ.
6. Chạy `check`, `test:integration`, `test:auth`, `test:week4`, `test:week5`, `build`, `progress` tuần tự và đối chiếu [nghiệm thu](../NGHIEM_THU_TUAN_05.md), CI đúng SHA. Đây là hướng dẫn cho người kiểm, không tự chứng minh mọi nhánh đã chạy qua UI.

## 9. Bản rút gọn để dán vào hệ thống của trường — nháp dưới 150 từ

Tuần 5 thực hiện ngày 22/10/2026 theo yêu cầu làm sớm. Đã hoàn thành danh mục, khóa sổ, phân công, import CSV/XLSX có chạy thử, lỗi từng dòng và tải mẫu. Seed đủ dữ liệu giả, khảo sát/phản hồi được cho phép bổ sung sớm; chưa có workflow/UI khảo sát. Check 219 test, SQL 10, CLI 5, HTTP 24+28+22, seed 9 nhóm, giao diện 13 nhóm/10 viewport và build đều qua. CI mã `a844f3f` xanh, chi tiết trong nghiệm thu. Demo đã chạy web bằng DB riêng, giữ dữ liệu chính. Tiến độ 46/163 điểm, đạt 28,2%. Nhóm cần đọc, thử, viết lại nháp và điền đóng góp thật. Tuần 6 dự kiến mẫu phiếu khi được yêu cầu.
