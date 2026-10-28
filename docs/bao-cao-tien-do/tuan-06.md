# BÁO CÁO TIẾN ĐỘ TUẦN 6/15 — cập nhật 28/10/2026

**Đề tài:** Xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học.

**Tiểu luận chuyên ngành HK1 2026–2027 | Nhóm:** [sinh viên điền] **| GVHD:** [sinh viên điền].

**Kế hoạch giả định:** 04–10/11/2026, mỗi tuần 7 ngày từ 30/09; nhóm đối chiếu lịch trường.

**Thực hiện:** bắt đầu **22/10/2026**, tiếp tục **28/10/2026** sau gián đoạn giới hạn sử dụng và xử lý vấn đề mở Docker. Tuần 6 được bắt đầu sớm theo lệnh người dùng. Giữ ngày làm thật; không thay lịch sử các tuần trước.

**Trạng thái:** đã nghiệm thu FR-30–35 trong phạm vi Tuần 6; các gate máy chủ, MySQL, giao diện và CI mã đã qua. CI main sau chốt tài liệu đối chiếu đúng SHA riêng trong Actions. AI hỗ trợ nháp kỹ thuật; nhóm đọc, thử và viết lại bằng lời của mình.

## 1. Mục tiêu của tuần theo kế hoạch

Trình soạn mẫu phiếu với nhóm tiêu chí/câu hỏi/thứ tự, năm loại câu, trọng số, bắt buộc, Không áp dụng; phiên bản và khóa, xem trước, nhân bản và mẫu mặc định. Nghiệm thu mẫu đủ loại, xem trước đúng, mẫu khóa không sửa và phải tạo phiên bản mới theo BR-05. Cập nhật ERD/ảnh. Không làm đợt khảo sát.

## 2. Kết quả đạt được và bằng chứng

- Đã đọc lại đặc tả 5.5, FR-30–35, BR-05, kế hoạch và ma trận quyền; giữ đủ bảy vai trò của hệ thống, chỉ ĐBCL GLOBAL vận hành trình soạn ở phạm vi tuần này.
- Quyết định cấu trúc phiên bản/khóa, revision chống ghi đè, CSRF riêng và giới hạn preview ghi tại [ADR-007](../decisions/ADR-007-mau-phieu-va-phien-ban.md). Phải đối chiếu code cuối và kết quả kiểm tại [nghiệm thu](../NGHIEM_THU_TUAN_06.md).
- Service/policy và route/page trình soạn đã có mã; migration `20261022125000_week6_template_revision` bổ sung revision/updatedAt ở runtime/blueprint. Ngày28/10 status 5 migration đồng bộ, diff không khác, SQL **10/10 qua**. Không xóa dữ liệu hoặc đổi số model 31/39.
- Trên Next/eslint-config-next **16.4.3**, lượt cuối ngày 28/10 full check **279/279 trong 24 file**, validate/generate/ERD/lint/typecheck và build exit0; audit production/full đều 0. HTTP mẫu phiếu **20/20**, auth **24/24**, CLI **5/5**, HTTP Tuần 4 **28/28**, Tuần 5 **22/22** đều qua và dọn fixture. Đây là gate mã Tuần 6, không suy từ CI Tuần 5.
- Seed Tuần 6 dùng họ mới hai nhóm/sáu câu/đủ năm loại và Likert 1–4/1–5. MySQL **11/11 nhóm qua**, giữ mặc định tùy chỉnh. Nâng cấp main giữ cây/ID nguồn khóa, **78 phiếu/3 kết quả/4 tài khoản auth**; kiểm DB thật riêng với unit helper12 đã nằm trong full.
- [CI mã Tuần 6 40633183047](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40633183047) của `68087ed7ecc68028ac78475696f4ee69a5d2e056` đã qua check/smoke ngày 28/10. CI của main sau chốt tài liệu đối chiếu SHA riêng. [Giải thích Tuần 6](../GIAI_THICH/tuan-06.md) có năm câu bảo vệ; nghiệm thu/checklist/truy vết ghi sáu FR đã đạt.
- [QA giao diện](../QA_GIAO_DIEN_TUAN_06.md) ngày 28/10 qua **14 nhóm kiểm/10 viewport**, 10 PNG ở 1440px/390px, không lỗi JavaScript/tràn ngang/ô thiếu nhãn trong phép đo; fixture đã dọn và seed nguyên vẹn. Kiểm xung đột UI bằng tăng revision fixture trong DB, giữ nội dung chưa lưu và tải lại có chủ đích; không nhận đã bấm đồng thời hai cửa sổ. Hai request tranh chấp thật đã qua HTTP/MySQL.
- [Đối chiếu ERD](../SO_DO_TUAN_06.md) ghi 31 runtime / 39 blueprint, ba thân Mermaid giữ nguyên và khối khảo sát chỉ thêm hai trường mới; bốn SVG tổng quan cùng Mermaid mới đã được render và mở xem ở lượt 22/10, giữ ảnh lịch sử.

## 3. Đối chiếu kế hoạch

| Mục | Trạng thái hiện tại | Bằng chứng và giới hạn |
| --- | --- | --- |
| Trình soạn nhóm/câu/thứ tự | Đạt FR-30 | Lưu/đọc thứ tự ba cấp qua HTTP/MySQL; UI tạo hai nhóm/bảy câu, đổi thứ tự rồi lưu/mở lại |
| Năm loại, bắt buộc/NA/trọng số | Đạt FR-31 | Đủ loại/Likert 1–4/1–5; cấu hình sai không ghi; UI kiểm trọng số/bắt buộc/NA |
| Phiên bản/khóa | Đạt FR-32 trong phạm vi tuần | BR-05 và CAS/race MySQL thật qua; UI khóa chỉ đọc, tạo v2 cùng họ. Workflow duyệt đợt Tuần 7 chưa làm |
| Xem trước | Đạt FR-33 | Ba lần SSR không ghi DB; UI thử đủ loại/bắt buộc/NA, xóa/tải lại mất lựa chọn, không POST/localStorage/phiếu mới |
| Nhân bản/mặc định | Đạt FR-34/35 | UI nhân bản họ mới/v1 và chọn một mặc định; source bất biến; seed 11 nhóm gồm FR-35 |
| ERD và ảnh | Đạt phạm vi tài liệu | [Sơ đồ](../SO_DO_TUAN_06.md) có hash/render/xem ảnh; QA cuối có 10 PNG desktop/mobile |
| Check/build/CI | Check/build và CI mã qua | Full 279/24file, build16.4.3 exit0; CI40633183047 đúng mã68087ed đã qua check/smoke. CI main cuối chờ đối chiếu SHA |
| Tài liệu | Đã cập nhật | ADR, giải thích năm câu bảo vệ, nghiệm thu, báo cáo và các tài liệu theo dõi kèm bằng chứng |
| Đợt khảo sát | Chưa làm, đúng phạm vi | Lập/duyệt/mở đợt và trigger phê duyệt khóa mẫu chờ Tuần 7 |

## 4. Tiến độ lũy kế

FR-30–33 là P0, FR-34–35 là P1, tổng Tuần 6 thêm **16 điểm** sau khi đủ kiểm thử, nghiệm thu và tài liệu. Lũy kế tăng từ 46/163 của Tuần 5 lên **62/163 điểm = 38,0%**, M4 **16/16 = 100%**. [Checklist](../PROGRESS.md), [truy vết](../TRUY_VET.md) và `npm run progress` đối chiếu cùng cách tính P0=3/P1=2/P2=1; không cộng số test vào tỷ lệ chức năng.

| Module | Điểm đạt/tổng đang được nhận | Tỷ lệ |
| --- | ---: | ---: |
| M1 Xác thực và phiên | 22/23 | 95,7% |
| M2 Người dùng, phân quyền, kiểm toán | 9/9 | 100,0% |
| M3 Danh mục và nhập liệu | 9/9 | 100,0% |
| M4 Mẫu phiếu | 16/16 | 100,0% |
| M5 Đợt khảo sát | 0/22 | 0,0% |
| M6 Làm khảo sát | 0/14 | 0,0% |
| M7 Kết quả | 0/18 | 0,0% |
| M8 Phản hồi | 0/19 | 0,0% |
| M9 Thông báo | 0/7 | 0,0% |
| M10 Báo cáo | 0/12 | 0,0% |
| M11 Hệ thống | 6/11 | 54,5% |
| M12 Mở rộng | 0/3 | 0,0% |

Tuần 6 bắt đầu sớm hơn mốc giả định 04–10/11 theo lệnh người dùng. Không đổi ngày hoặc giảm mẫu số để khớp tiến độ; nhóm/GVHD đối chiếu lịch trường trước khi kết luận tiến độ toàn đề tài.

## 5. Khó khăn, rủi ro và hướng xử lý

- Khóa mẫu liên quan phê duyệt đợt nhưng tuần này cấm làm đợt. Triển khai guard bảo vệ bản khóa/đã dùng, kiểm với fixture/seed hiện có; trigger workflow duyệt sẽ tích hợp và kiểm tại Tuần 7, không nhận đã hoàn thành trước.
- Có dữ liệu mẫu/phiếu/kết quả seed khóa từ Tuần 5. Không sửa nội dung/ID của mẫu đó để làm đủ năm loại; phương án mặc định đủ loại phải giữ dữ liệu lịch sử và đối chiếu FR-35 đã phân tích.
- Hai cửa sổ cùng sửa cần revision/CAS; khóa và tạo phiên bản cần transaction/unique/mutex trước mọi đọc thường, tránh snapshot cũ dưới REPEATABLE READ. HTTP/MySQL đã kiểm lưu/khóa chỉ một thắng và phiên bản đồng thời số 2/3. UI dùng revision fixture tăng trong DB để tạo 409, xác nhận giữ nội dung đang soạn và tải lại rõ ràng; không nhận đã thao tác đồng thời hai cửa sổ.
- Preview dễ nhầm với bài nộp thật. Có nhãn rõ, chỉ dùng bộ nhớ trang và không endpoint tạo phiếu; nghiệm thu dữ liệu không tăng khi thử preview.
- Bản phụ thuộc cũ được cập nhật sang Next/eslint-config-next 16.4.3 và fast-uri 3.1.9 sau đối chiếu nguồn chính thức tại [ADR-007](../decisions/ADR-007-mau-phieu-va-phien-ban.md). Full 279, build và hồi quy đều qua sau cập nhật; audit 0 là kết quả công cụ, không thay quét bảo mật toàn repository.
- Hai prehook Prisma generate từng chạy đồng thời làm lượt typecheck thiếu file sinh `AuditLog.ts`; chạy lại gate tuần tự và full 279/24 file qua. Không nhận lượt lỗi là kết quả nghiệm thu, không dựa client sinh sẵn trên máy tác giả.
- Giao diện cuối đã qua; CI mã Tuần 6 đã qua, còn CI main sau chốt tài liệu cần đối chiếu đúng SHA. Phép đo nhãn/tràn ngang và mở ảnh không phải chứng nhận WCAG hoặc kiểm mọi thiết bị. Không suy kết quả từ Tuần 5. Chỉ dữ liệu giả; không reset DB/volume, đổi khóa MFA hoặc đưa bí mật vào ảnh/log/Git.
- Công việc gián đoạn giữa 22/10 và 28/10. Ngày 28/10 đã sửa thư mục làm việc của shortcut Docker và xác nhận cửa sổ Containers/Engine hoạt động; không sửa Registry hoặc reset dữ liệu. Lượt UI đầu 22/10 dừng vì máy chủ demo khởi động lại, đã dọn fixture và giữ seed; phải chạy lại toàn luồng trước nghiệm thu.

## 6. Kế hoạch Tuần 7

Sau khi chốt Tuần 6 và được yêu cầu tiếp tục: đợt khảo sát, phạm vi/thời gian/ngưỡng, trạng thái trình/duyệt/từ chối, chốt danh sách/tạo task, ensure/scheduler, gia hạn/đóng/hủy và theo dõi tiến độ. Tích hợp phê duyệt khóa phiên bản mẫu trong cùng transaction theo BR-05. Chưa làm giao diện sinh viên nộp phiếu trong Tuần 7; phiên hiện tại dừng đúng Tuần 6.

## 7. Phân công và đóng góp từng thành viên

**[SINH VIÊN TỰ ĐIỀN]** Tên, phần thực làm và bằng chứng commit/kiểm thử/ảnh/thuyết minh đã tự xác minh. AI không gán tên, số giờ hoặc phần việc cho thành viên; công việc AI hỗ trợ ghi riêng trong [AI_USAGE](../AI_USAGE.md).

## 8. Các bước kiểm tra nhanh cho giảng viên

1. Theo README mở môi trường dev/demo với dữ liệu giả, đăng nhập ĐBCL và vào `/mau-phieu`. ADMIN đơn vai trò/sinh viên bị chặn ở page/API.
2. Tạo ít nhất hai nhóm và đủ năm loại câu hỏi, sắp xếp và đặt trọng số/bắt buộc/Không áp dụng; lưu và mở lại đúng cấu trúc, dữ liệu không hợp lệ bị chặn.
3. Xem trước và thao tác thử. Các control đúng cấu hình; không tăng nhiệm vụ/phiếu/câu trả lời, giá trị thử mất khi tải lại.
4. Mở hai cửa sổ cùng bản nháp: lưu A rồi lưu B cũ nhận 409; không ghi đè. Khóa mẫu thì không sửa/mở khóa được; tạo v tiếp theo sửa độc lập, bản cũ nguyên vẹn.
5. Nhân bản thành họ mới v1, dùng mẫu mặc định thành nháp riêng; đối chiếu mẫu/câu/phiếu/kết quả nguồn không đổi.
6. Chạy các lệnh theo [nghiệm thu](../NGHIEM_THU_TUAN_06.md), đối chiếu QA/ERD và CI đúng SHA; bước hướng dẫn không tự chứng minh đã bấm đủ qua UI.

## 9. Bản rút gọn để dán vào hệ thống của trường — dưới 150 từ

Tuần 6 bắt đầu 22/10, tiếp tục 28/10/2026. Đã nghiệm thu trình soạn mẫu đủ năm loại, nhóm/câu/thứ tự, trọng số, bắt buộc/Không áp dụng, phiên bản, khóa, xem trước, nhân bản và mặc định. Bản Next.js 16.4.3 qua 279 test, build, SQL 10, HTTP 20+24+28+22, CLI 5, seed 11 nhóm và CI mã. QA giao diện qua 14 nhóm/10 viewport, có 10 ảnh; fixture dọn, dữ liệu cũ giữ nguyên. ERD/tài liệu cập nhật. FR-30–35 thêm 16 điểm, lũy kế 62/163=38,0%; M4 đạt 100%. Đợt khảo sát và nộp phiếu thật thuộc tuần sau. Nhóm cần đọc, thử, viết lại nháp và điền đóng góp thật.
