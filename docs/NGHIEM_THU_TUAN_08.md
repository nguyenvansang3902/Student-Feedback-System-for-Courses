# Nghiệm thu Tuần 8 — sinh viên làm khảo sát ẩn danh

Bắt đầu **29/10/2026**, tiếp tục **30/10/2026** (Asia/Saigon), theo yêu cầu trực tiếp của người dùng. Mốc kế hoạch giả định **18–24/11/2026**, tính tuần bảy ngày từ 30/09; nhóm đối chiếu lịch trường. Không ghi lùi ngày hoặc điền thay ngày/tên GVHD yêu cầu.

**Trạng thái:** đã nghiệm thu FR-50–54 trên nguồn `6edad31fef16ee11f5ace82645107b0b7153742d`; check/build/HTTP/MySQL/UI và CI đúng SHA đều qua. Tiến độ sau nghiệm thu: **117/219=53,4%, 41/84 FR**. FR-145 ImportBatch/hoàn tác vẫn P1 có điều kiện chưa thực hiện, không tự cắt.

## Phạm vi và hành vi

- FR-50: `/khao-sat` chỉ liệt kê nhiệm vụ của chính sinh viên, có môn/lớp, hạn chót, trạng thái, lọc và phân trang. Nhiệm vụ đã chốt quyết định quyền, không xét lại đăng ký sau mở.
- FR-51: form từ đúng phiên bản mẫu đã khóa, nhóm/thứ tự, năm loại câu hỏi, cả thang Likert 1–4/1–5, bắt buộc và Không áp dụng; thanh tiến trình và kiểm hợp lệ phía client, kiểm lại phía server.
- FR-52: nháp chỉ lưu cục bộ theo tài khoản/nhiệm vụ/phiên bản, không lưu token, không có API nháp. Dữ liệu khôi phục phải qua kiểm, giới hạn số lượng/thời gian lưu; xóa khi nhận DONE, hết hạn do server xác nhận hoặc đăng xuất. Trang nhắc rủi ro máy dùng chung.
- FR-53: kiểm phiên/quyền mới, chủ nhiệm vụ, trạng thái, học kỳ, mẫu và thời hạn; cập nhật PENDING→DONE có điều kiện cùng response/answers trong một transaction. Chỉ lưu ngày Việt Nam, UUID ngẫu nhiên; không thêm cầu nối định danh hoặc audit nộp.
- FR-54: xác nhận chỉ hiển thị trạng thái/ngày hoàn thành, không trả ID hoặc nội dung phiếu. Truy cập trang xác nhận khi PENDING chuyển về form; mất phản hồi POST thì đọc lại trạng thái, không tự nộp lại.

Khoảng nhận phiếu là `[startsAt, endsAt]` theo BR-04: đúng giờ kết thúc vẫn được nhận, sau đó bị chặn. Lifecycle Tuần 7 được chỉnh đóng khi `now > endsAt`; test biên riêng bảo vệ điều này. Giao diện dùng giờ server và đồng hồ đơn điệu để hiển thị; server luôn quyết định quyền nộp.

Không triển khai tổng hợp/công bố/kiểm duyệt nội dung Tuần 9, xử lý phản hồi hoặc xuất kết quả của tuần sau. Seed đã có dữ liệu tương lai không thay nghiệm thu chức năng.

## Cổng kiểm và bằng chứng

| Cổng | Kết quả đã xác minh tại lượt cập nhật | Bằng chứng |
| --- | --- | --- |
| Full check |646/646 test trong 39 tệp; schema/ERD/lint/TypeScript qua ngày 30/10 | `npm run check` chạy lại trên nguồn 6edad31 sau sửa FR-52 |
| Build | Next 16.4.3 qua ngày 30/10 | `npm run build` chạy lại sau sửa FR-52 |
| HTTP/MySQL Tuần 8 |16/16 nhóm, cleaned=true | `scripts/verify-week8.ts`, `.local/week8-http-result.json` ngoài Git |
| Nộp đồng thời |20 request:1 thành công/19 bị 409, đúng 1 response+6 answers | MySQL thật trong HTTP suite; không suy từ mock |
| Rollback cưỡng bức | HTTP 500 do trigger lỗi answer:task PENDING/0 response/0 answer; bỏ trigger rồi retry thành công | MySQL thật, helper chỉ giới hạn DB và câu hỏi fixture; đã dọn trigger |
| Quyền và giao thức |16 nhóm đã qua gồm 10 vai trò, IDOR, fresh grant/phiên, CSRF/Origin, body 256 KiB | HTTP dùng fixture/phiên do service phát, không nhận là E2E đăng nhập thật |
| Giao diện |13/13 nhóm,17 trạng thái×2 viewport=34 lượt/34 PNG đã mở xem;0 pageerror/React error/tràn ngang/thiếu nhãn | [QA Tuần 8](QA_GIAO_DIEN_TUAN_08.md), nguồn 6edad31; fixture sạch/seed giữ nguyên |
| Dữ liệu main |27 tập trước/sau khớp hash, không reset dữ liệu | `.local/week8-preservation-before.json` và `-after.json`; helper đối chiếu, không xuất nội dung |
| CI nguồn |check/smoke thành công đúng6edad31fef16ee11f5ace82645107b0b7153742d, nhánh feat/week8-anonymous-surveys | [Actions40925339620](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40925339620); CI main/tài liệu cuối đối chiếu riêng |

Check/build đã chạy lại sau sửa thông báo nháp FR-52 trên nguồn 6edad31 và đều qua; QA cuối30/10 lúc 00:58:34 và CI cùng nguồn đã thành công. Không cộng các lượt targeted vào tổng unit; lượt lỗi/fixture chưa dọn không được tính là suite qua. Sau mọi thay đổi runtime phát sinh phải chạy lại gate liên quan.

## Tiêu chí ẩn danh 5.6 và ranh giới dữ liệu

| Tiêu chí | Cách kiểm Tuần 8 | Giới hạn |
| --- | --- | --- |
| (a) Không cầu nối schema | `schema-anonymity.test.ts`: DMMF runtime/design, đồ thị quan hệ và mutation test; schema không thêm model/field/FK | Không ngăn DBA tự truy vấn hoặc đọc binlog |
| (b) Nộp lại bị chặn | MySQL thật: lần hai 409, số response/answer giữ nguyên | Kiểm theo task đã chốt |
| (c) Đồng thời/nguyên tử |20 POST cùng task chỉ 1 phiếu; trigger ép lỗi chèn câu trả lời rollback task PENDING/0 response/0 answer, sau bỏ trigger retry thành công | Đã qua MySQL thật, fixture/trigger dọn sạch |
| (d) Phần hiện có | `student-survey-privacy.test.ts` đi qua route→service, DTO/payload ghi/lỗi/console/audit/queue; HTTP sentinel/log scan | Không có export kết quả ở Tuần 8, không nhận CSV/Excel/PDF tương lai đã qua |

`SurveyTask` biết sinh viên và ngày hoàn thành. `SurveyResponse` chỉ có UUID/đợt/lớp/ngày; `SurveyAnswer` chỉ nối response và lưu giá trị theo câu hỏi scalar. Không có taskId/studentId/IP/User-Agent/session/request/correlation ID, timestamp nộp chính xác, token nộp hay bản sao phiếu ở vùng nhiệm vụ. POST trả trạng thái/ngày; DONE detail không đọc đáp án và có template=null. Prisma không log query; lỗi driver được che trước route.

Đây là ẩn danh ở mức ứng dụng. DBA/binlog/timing/hạ tầng, lớp ít người và tự luận tự nhận diện vẫn có thể làm lộ người viết; không tuyên bố chống mọi suy luận. Kiểm xuất CSV/Excel/PDF và metadata thuộc Tuần 12; cần bổ sung kiểm đúng thời điểm, giữ nguyên tiêu chí đặc tả 5.6.

## Dữ liệu, tài liệu và giới hạn

Không có migration Tuần 8: runtime 34/blueprint 46/12 model chỉ thiết kế. Hai bảng response/answer đã tồn tại từ seed được đưa vào luồng chức năng; schema chỉ cập nhật chú thích mốc. Fixture HTTP/UI ở DB có marker/server UUID riêng, chỉ dọn dữ liệu do bộ kiểm tạo; không reset/drop DB, VHD hoặc volume. Bằng chứng bảo toàn main được đối chiếu27 tập trước/sau.

Tài liệu: [ADR-009](decisions/ADR-009-nop-phieu-an-danh.md), [giải thích và5 câu bảo vệ](GIAI_THICH/tuan-08.md), [sơ đồ](SO_DO_TUAN_08.md), [báo cáo 10 mục](bao-cao-tien-do/tuan-08.md), README, trạng thái/tiến độ/truy vết/ma trận quyền và nhật ký AI. Không sửa phần đặc tả 5.6/8.3–8.6, prompt/AGENTS, báo cáo hoặc ảnh lịch sử.

Mutex chung ưu tiên đúng quyền và nguyên tử, có thể hạn chế thông lượng;20 request không chứng minh tải 1.500 request. Chưa chứng nhận WCAG/mọi trình duyệt/thiết bị, chưa kiểm log proxy/APM bên ngoài, chỉ dữ liệu giả và không deploy công khai. Đóng góp/ngày yêu cầu/tên GVHD do sinh viên tự xác minh. FR-160 vẫn nghiệm thu từng phạm vi hiện có, chưa tick toàn bộ trước Tuần 13.

## Chốt phiên

Chốt FR-50–54, thêm 14 điểm; `npm run progress` trả **117/219=53,4%, 41/84 FR**, M6=14/14. Kế hoạch lũy kế Tuần 8 là 119/219; còn 2 điểm do FR-145 chưa thực hiện, không tự loại khỏi mẫu số. FR-160 đầy đủ còn chờ Tuần 13. Tệp xuất kết quả chưa có nên 5.6(d) được nghiệm thu đúng các DTO/log hiện có, không nhận export tương lai đã qua.

Web chính3000 và scheduler đã mở lại: `/dang-nhap` trả200, khách vào `/khao-sat` được chuyển về đăng nhập; MySQL/Mailpit healthy. Đăng nhập `DEMO-SV00001` theo README để xem nhiệm vụ còn hạn; `SV2026001` thử xác thực có thể chưa có task. Báo cáo10 mục,5 câu bảo vệ, ảnh/sơ đồ và các tệp theo dõi đã cập nhật. Main/tài liệu cuối có lượt CI riêng sau push, chưa dùng CI nguồn để nhận SHA main khác đã qua. Tuần 9 chỉ bắt đầu khi người dùng yêu cầu; FR-145 giữ backlog.
