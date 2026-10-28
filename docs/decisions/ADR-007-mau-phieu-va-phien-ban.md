# ADR-007 — Mẫu phiếu, phiên bản và bảo vệ dữ liệu đã chốt

- Ngày thực hiện: bắt đầu **22/10/2026**, tiếp tục **28/10/2026** sau gián đoạn, Asia/Saigon. Mốc Tuần 6 giả định **04–10/11/2026**, mỗi tuần 7 ngày từ 30/09; làm sớm theo lệnh người dùng, không ghi lùi ngày.
- Trạng thái: quyết định hiện thực Tuần 6; kết quả gate cuối phiên được ghi tại [nghiệm thu](../NGHIEM_THU_TUAN_06.md).
- Liên quan: FR-30–35, BR-05/30/34; Mục 5.5 của [đặc tả nguồn](../DAC_TA_NGHIEP_VU.md), [kế hoạch nguồn](../KE_HOACH_15_TUAN.md), [yêu cầu đã phân tích](../YEU_CAU.md) và [ma trận quyền](../PHAN_QUYEN.md).

## Bối cảnh

Mẫu phiếu gồm nhóm tiêu chí, câu hỏi và lựa chọn có thứ tự. Câu hỏi có loại, trạng thái bắt buộc, cho phép Không áp dụng và trọng số; nhóm cũng có trọng số. Khi một đợt đã được duyệt dùng mẫu, thay đổi câu hỏi tại chỗ sẽ làm ý nghĩa của kết quả cũ thay đổi. Vì vậy mẫu có họ phiên bản và khóa một chiều; sửa nội dung đã chốt phải tạo phiên bản mới.

Tuần 5 đã vật chất hóa bảng và dữ liệu seed khảo sát/phản hồi theo quyền người dùng ngày 22/10. Tuần 6 hiện thực chức năng mẫu phiếu, không lập/duyệt/mở đợt và không nộp phiếu sinh viên. Các API phê duyệt ở Tuần 7 phải dùng cùng quy tắc khóa khi được triển khai; kiểm guard trên dữ liệu seed hiện có chưa chứng minh workflow duyệt đã hoàn thành.

## Phương án đã cân nhắc

1. Sửa trực tiếp mẫu đã dùng: đơn giản nhưng thay đổi câu hỏi mà phiếu/kết quả cũ đang tham chiếu, vi phạm BR-05.
2. Sao chép toàn bộ cấu trúc mỗi lần sửa: giữ lịch sử nhưng sinh nhiều bản không có ý nghĩa nghiệp vụ và khó xác định phiên bản dùng trong đợt.
3. Cho sửa bản nháp, khóa bản chốt; tạo phiên bản mới cùng họ hoặc nhân bản thành họ mới khi cần: giữ danh tính của nội dung đã dùng và phân biệt rõ hai mục đích sao chép.

## Quyết định

### 1. Phạm vi quyền và API

- Chọn phương án 3. Chỉ gán `CAN_BO_DBCL` phạm vi `GLOBAL` hợp lệ mới vận hành mẫu. ADMIN đơn vai trò không có quyền nghiệp vụ ngầm; ADMIN đồng thời là ĐBCL vẫn phải đáp ứng MFA của ADMIN.
- Mọi service nhận actor, kiểm policy trước truy cập và đọc lại phiên/quyền hiện tại từ DB. Kiểm UUID của mọi đường dẫn đối tượng; không xem ẩn menu hoặc chỉ kiểm ở page là đủ.
- API ghi cần Origin/Host khớp APP_URL và CSRF ký gắn đúng người/phiên với mục đích riêng cho mẫu phiếu, không nhận CSRF quản trị/danh mục thay thế. DTO chỉ có cấu trúc mẫu và metadata cần thiết.
- Chỉ nhận JSON tối đa 256 KiB theo số byte đọc thực tế, kể cả khi không có hoặc giả `Content-Length`; tên/nhãn được render như văn bản, không đưa nội dung mẫu hoặc giá trị thử vào nhật ký.
- Đường dẫn: `/mau-phieu`, `/mau-phieu/moi`, `/mau-phieu/:id` và `/mau-phieu/:id/xem-truoc`. API `/api/templates` có list/create, `/:id` có read/update, `/:id/lock|version|clone|default` nhận POST; `/csrf` cấp token riêng. Trạng thái cuối của route và kiểm quyền đối chiếu trong nghiệm thu.
- Lãnh đạo xem mẫu đính kèm đợt thuộc workflow Tuần 7. Tuần 6 không cấp quyền sửa mẫu cho lãnh đạo hoặc mở API xem mẫu toàn hệ thống cho vai trò này.

### 2. Cấu trúc và dữ liệu hợp lệ

- Thứ tự nhóm/câu/lựa chọn lấy từ cấu trúc được xác thực phía máy chủ; client không được tự gắn ID câu hỏi vào mẫu khác. Khi sao chép, tạo ID mới cho toàn bộ nhóm/câu/lựa chọn.
- Hỗ trợ đúng năm loại: Likert, chọn một, chọn nhiều, tự luận, Có/Không. Likert có cận dưới 1, cận trên 4 hoặc 5; chọn một/nhiều cần lựa chọn hợp lệ; các loại khác không giữ cấu hình thang hoặc lựa chọn thừa.
- Kiểm chuỗi rỗng sau trim, ký tự điều khiển, độ dài, số lượng, trọng số hữu hạn/dương, giá trị boolean và cấu hình đúng loại. Tối đa 20 nhóm, 100 câu toàn mẫu, 20 lựa chọn/câu; câu chọn cần ít nhất 2 lựa chọn không trùng nội dung/thứ tự. Trọng số từ 0,0001 đến 1.000, tối đa 4 chữ số thập phân; tên mẫu/nhóm 200, nhãn câu 1.000, nhãn lựa chọn 500 ký tự. Không coi TypeScript phía trình duyệt là kiểm dữ liệu máy chủ.
- Đây là kiểm cấu hình mẫu. Quy tắc nộp câu bắt buộc, tính điểm và loại Không áp dụng khỏi mẫu số ở luồng phiếu thật vẫn phải nghiệm thu tại tuần tương ứng.

### 3. Revision, khóa và lịch sử

- Bổ sung `revision` mặc định 1 và `updatedAt` trên `SurveyTemplate` ở runtime lẫn blueprint; không tăng số model 31/39. Migration bổ sung cột, không reset/DROP và không viết lại câu hỏi/phiếu/kết quả seed đã có.
- `version` là phiên bản nghiệp vụ của cùng một `familyId`; `revision` là số lần thay đổi bản ghi để phát hiện hai trình soạn đang sửa đồng thời. Không dùng hai khái niệm thay nhau.
- Ghi vào mẫu hiện có phải gửi revision đã đọc; cập nhật có điều kiện trong transaction. Bản cũ trả 409 và người dùng tải lại dữ liệu trước khi quyết định sửa; không tự ghi đè bản nháp đang mở.
- Khóa một chiều; không API mở khóa. Ngoài `status`/`lockedAt`, guard phải kiểm mẫu đã được tham chiếu bởi đợt được duyệt hoặc giai đoạn tiếp theo. Metadata thiếu không được dùng để sửa nội dung đã có ý nghĩa lịch sử.
- Mẫu khóa vẫn đọc/xem trước được. Tạo phiên bản mới cùng họ dùng số phiên bản tiếp theo, ở trạng thái nháp và ID con mới; bản gốc cùng mọi tham chiếu cũ giữ nguyên. Nhân bản tạo họ mới và phiên bản 1 độc lập.
- Ghi và tạo số phiên bản phải giữ mutex DB trước mọi SELECT thường, cùng thứ tự khóa với quản trị/danh mục/import. Sau khóa đọc lại actor/dữ liệu hiện tại; cập nhật có điều kiện và unique `(familyId, version)` bảo vệ thêm. Không dùng ORM upsert rỗng tạo snapshot trước khi chờ khóa dưới REPEATABLE READ.
- Audit chỉ ghi loại hành động/đối tượng/phiên bản/số lượng phù hợp, không ghi toàn bộ nội dung câu hỏi, câu trả lời thử hoặc bí mật. Nhóm kiểm kết quả bằng test và MySQL thật trước khi nhận nghiệm thu.

### 4. Xem trước và mẫu mặc định

- Xem trước phản ánh loại câu, thứ tự, lựa chọn, thang Likert, bắt buộc, Không áp dụng và trọng số. Câu trả lời thử chỉ ở bộ nhớ component; không tạo SurveyTask/SurveyResponse/SurveyAnswer, không gửi API nộp phiếu, không lưu localStorage.
- Có nhãn rõ đây là xem trước. Hành vi tương tác của form preview phục vụ kiểm cấu hình, không phải luồng sinh viên làm khảo sát.
- Mẫu mặc định phải là cấu trúc tiếng Việt có sẵn; dùng mẫu mặc định tạo nháp độc lập, không sửa bản chốt. Không tự seed lười qua HTTP. Khi chưa có mẫu trong DB cần hướng dẫn người vận hành chạy seed theo README.
- Seed CLI bổ sung một họ mẫu Tuần 6 riêng bằng tiếng Việt: hai nhóm, sáu câu, đủ năm loại và cả Likert 1–4/1–5; bản tích hợp ở trạng thái đã khóa hợp lệ. Giữ nguyên nội dung/ID của mẫu seed khóa ba câu từ Tuần 5 và kết quả đang tham chiếu nó. Chỉ chuyển cờ mặc định của seed cũ khi nó vẫn đang được chọn hoặc chưa có mặc định; chỉ tăng revision metadata của nguồn cũ, không ghi đè mẫu tùy chỉnh do người vận hành đã chọn. Khi họ tích hợp đã tồn tại, chạy lại không sửa cây hoặc chọn lại mặc định.
- `seedDefaultTemplate` chỉ dùng trong CLI tin cậy, nhận transaction đã mở từ `seedDemo`. Helper tự kiểm danh tính console và chặn production trước DB; điều kiện MySQL/APP_URL localhost và mutex đầu transaction do parent kiểm trước khi gọi. Helper không tự mở transaction hoặc chứng minh host cục bộ khi bị gọi tách rời; không phơi hàm này thành HTTP bootstrap.
- Mặc định là metadata chọn phiên bản dùng làm điểm bắt đầu trên toàn hệ thống. Chỉ chọn mẫu đã khóa hợp lệ, tuần tự hóa transaction để chỉ một mẫu mặc định; đổi lựa chọn tăng revision của bản ghi metadata liên quan, không đổi cấu trúc câu hỏi. Dùng mẫu tạo bản nháp độc lập. Chọn mẫu cho đợt nháp vẫn thuộc Tuần 7, chưa có workflow đợt ở phiên này. Các điều kiện/tranh chấp và tính lặp an toàn của seed phải kiểm trong nghiệm thu.

## Hệ quả và kiểm chứng

Lưu cả cấu trúc trong một transaction giúp thứ tự và điều kiện khóa nhất quán nhưng cần giới hạn kích thước yêu cầu. Mutex toàn cục làm các lệnh ghi nối tiếp; ưu tiên tính đúng ở quy mô demo, chưa thay kiểm tải production. Revision chỉ giải quyết ghi đè từ trình soạn đồng thời, không thay thế fresh guard, FK/unique hoặc kiểm trạng thái đã dùng.

Ngày 28/10, cập nhật `next` và `eslint-config-next` lên [16.4.3](https://github.com/vercel/next.js/releases/tag/v16.4.3), sau khi đối chiếu các advisory hiện hành [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) và [GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr). Các advisory ghi bản sửa từ 16.4.1; dự án chọn bản ổn định 16.4.3. Lockfile cập nhật phụ thuộc gián tiếp [fast-uri 3.1.9](https://github.com/fastify/fast-uri/releases/tag/v3.1.9) có các bản sửa URI. Đây là cập nhật phụ thuộc trong stack đã chọn, không phải kết quả quét bảo mật toàn repository hoặc bằng chứng hệ thống không còn lỗ hổng.

Lượt cuối ngày 28/10 trên bản đã cập nhật: **279/279 test trong 24 file**, validate/generate hai schema, ERD, ESLint, TypeScript và build exit0; audit production/full đều 0 tại thời điểm chạy. HTTP/MySQL mẫu phiếu **20/20 nhóm**, SQL nền 10/10, auth 24/24, CLI 5/5, HTTP Tuần 4 28/28 và Tuần 5 22/22 qua; fixture dọn. Các ca MySQL thật có CAS sửa đồng thời, khóa so với sửa, hai phiên bản mới nhận số 2/3, một mặc định và bảo toàn phiếu/câu hỏi cũ. Seed **11/11 nhóm** và nâng cấp main giữ cây cũ/78 phiếu/3 kết quả/4 tài khoản auth. Targeted core 38/helper12 đã nằm trong full, không cộng lặp. [CI mã Tuần 6 40633183047](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40633183047) của `68087ed7ecc68028ac78475696f4ee69a5d2e056` đã qua check/smoke ngày 28/10. QA giao diện ngày 28/10 qua 14 nhóm kiểm/10 viewport, có 10 PNG desktop/mobile; không lỗi JavaScript/tràn ngang/ô thiếu nhãn trong phép đo, fixture dọn và seed giữ nguyên. Ca UI xung đột được tạo bằng tăng revision fixture trong DB, không phải thao tác hai cửa sổ; tranh chấp hai request thật được kiểm riêng qua HTTP/MySQL. Xem [QA](../QA_GIAO_DIEN_TUAN_06.md) và [nghiệm thu](../NGHIEM_THU_TUAN_06.md). FR-30–35 thêm 16 điểm, lũy kế 62/163=38,0%, M4 16/16; CI main sau chốt tài liệu đối chiếu đúng SHA riêng. Không suy kết quả từ CI Tuần 5.
