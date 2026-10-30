# Nghiệm thu Tuần 9 — tổng hợp, công bố và kiểm duyệt

Bắt đầu **30/10/2026 (Asia/Saigon)** theo yêu cầu trực tiếp của người dùng. Mốc kế hoạch giả định **25/11–01/12/2026**, tính tuần bảy ngày từ 30/09; nhóm đối chiếu lịch trường. Không ghi lùi ngày hoặc điền thay ngày/tên GVHD yêu cầu.

**Đã nghiệm thu FR-47, FR-60–65 và FR-150 ngày 30/10/2026.** Fullcheck **797/797 trong 50 tệp**, production build Next **16.4.3**, HTTP/MySQL **12/12** gồm TOTP thật, seed demo **15/15** và UI **14 nhóm/23 trạng thái/46 bố cục** qua. Toàn bộ 46 ảnh cuối đã được xem: 42 ảnh fixture và bốn ảnh đăng nhập/phạm vi giảng viên chụp lại trên main bằng dữ liệu giả. Nguồn ứng dụng `5eb5a84d19b8a526bbce3ed5e61852533e8b6b1f`, nhánh `feat/week9-survey-results`, có [CI 41079971520](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41079971520) **check và smoke đều thành công đúng SHA**. CI main/tài liệu cuối được đối chiếu riêng; không suy kết quả của SHA đó từ CI nguồn ứng dụng.

## Phạm vi

| Yêu cầu | Hành vi cần nghiệm thu |
| --- | --- |
| FR-47; BR-13 | Danh sách nhiệm vụ PENDING theo phạm vi, audit mỗi lần xem; nhắc thủ công/tự động tối đa một lần/ngày/sinh viên/đợt |
| FR-60; BR-11/12 | Công thức câu → nhóm → tổng chính xác, số nhiệm vụ DONE/tổng; TC-AGG-01 |
| FR-61; BR-07 | Đủ số phiếu và tỉ lệ mới có kết quả lớp; thiếu mẫu không lộ điểm/TEXT |
| FR-62 | Tổng hợp/công bố bằng CAS/requestId, kiểm đủ bản gộp và TEXT được duyệt; học kỳ khóa chỉ đọc |
| FR-63; BR-08/18/68 | ĐBCL/lãnh đạo từ tổng hợp, GV/TBM/TK sau công bố/lưu trữ và đúng phạm vi; ADMIN không có quyền ngầm |
| FR-64 | So sánh bộ môn/khoa/kỳ trước trên toàn bộ phiếu cùng mẫu; thiếu tương thích có thông báo |
| FR-65; BR-09 | TEXT-only, cờ từ khóa, quyết định hiện/ẩn có lý do, audit không nội dung/người nộp |
| FR-150; BR-57 | Khảo thí chỉ nhóm đánh giá gộp môn/bộ môn/khoa sau công bố, ít nhất hai GV và đủ mẫu; DTO không lớp/GV/TEXT |

Giữ FR-145 P1 có điều kiện chưa thực hiện. Không làm phản hồi liên tục, giải trình FR-66, dashboard/xuất file hoặc chỉ số Thanh tra. Seed E8 bổ sung dữ liệu giả cùng môn có ít nhất hai giảng viên; không sửa mẫu/phiếu/kết quả lịch sử.

## Cổng kiểm

| Cổng | Kết quả đã xác minh | Bằng chứng và giới hạn |
| --- | --- | --- |
| Tính điểm/chuyển trạng thái/cấu hình targeted | **69/69 trong 3 tệp qua**, targeted ESLint và tsc qua ngày 30/10 | `survey-score.test.ts`, `survey-results-mutations.test.ts`, `survey-results-settings.test.ts`; không cộng vào tổng fullcheck |
| Full `npm run check` | **797/797 test trong 50 tệp qua** ngày 30/10 | Schema/ERD/lint/TypeScript qua; không cộng lượt targeted vào tổng |
| Production build | **Next 16.4.3 qua** ngày 30/10 | Chạy sau lượt sửa cuối ứng dụng; CI đúng nguồn còn đối chiếu riêng |
| HTTP/MySQL | **12/12 nhóm qua, cleaned=true** ngày 30/10 | `scripts/verify-week9.ts`, `.local/week9-http-result.json`; ma trận/quyền mới, ngưỡng, TEXT-only, IDOR, nhắc/audit, KT projection/logscan |
| Cấu hình bằng TOTP thật | **Lưu thành công, chặn replay và CAS cũ**, cấu hình thử được khôi phục | Hai ADMIN giả với bí mật TOTP riêng; thiếu/sai CSRF hoặc mã sai bị chặn. Một audit cấu hình, ba góp ý được gắn cờ; không thay dữ liệu main |
| Đồng thời và rollback | **10 POST tổng hợp: 1 thành công/9 bị409**; lỗi dữ liệu lớp cuối rollback nguyên transaction | DA_DONG/revision1/0aggregate/0history/0audit, HTTP409 đã che chi tiết; sửa fixture rồi retry thành công. Không phải trigger ép lỗi SQL |
| UI | **14 nhóm/23 trạng thái/46 viewport qua**, toàn bộ 46 PNG cuối đã xem | [QA Tuần 9](QA_GIAO_DIEN_TUAN_09.md); 42 ảnh fixture +4 ảnh main demo. Bốn ảnh chụp lại xác minh biểu mẫu đăng nhập sẵn sàng, không placeholder và phạm vi GV đúng nguồn cuối; không lỗi đo được, fixture dọn |
| Seed E8 | **15/15 nhóm demo MySQL thật qua** | `.local/demo/verification.json`; E8 riêng2đợt/4lớp/18phiếu/40task,2GV cùngmôn,2lớpđủ/1lớpthiếu,kỳtrước; seed lặp/tăng size giữ hash |
| Dữ liệu main | **27 tập dữ liệu cũ trước/sau khớp hash** sau thêm bundle E8 | Helper bảo toàn chỉ đối chiếu hàng nền cũ; không reset DB/volume, không viết lại cây mẫu/phiếu/kết quả cũ |
| Sơ đồ/tài liệu | **3 sơ đồ nghiệp vụ +4 Mermaid ERD/4 thẻ qua**, 11PNG đã xem,0nhãn vượt biên | [Sơ đồ](SO_DO_TUAN_09.md), công thức, ADR010,5 câu bảo vệ,báo cáo10mục; kiểm bảo vệ5mục đặc tả/AGENTS/181tệp lịch sử/84FR qua |
| CI nguồn ứng dụng | **check và smoke thành công** trong [41079971520](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41079971520), đúng `5eb5a84d19b8a526bbce3ed5e61852533e8b6b1f` | Gồm migration sạch, hồi quy tuần trước, 12 nhóm HTTP Tuần 9, 15 nhóm demo, check và build trên Linux. CI main/tài liệu cuối đối chiếu riêng |

Không nhận một suite đã qua khi còn nhóm lỗi hoặc fixture chưa dọn. Mọi sửa runtime sau lượt kiểm phải chạy lại phần liên quan. Số kiểm cuối phải lấy từ kết quả thực, không suy từ bảng này.

[Bằng chứng máy đọc](assets/tuan-09/verification.json) lưu các số liệu và CI nguồn ứng dụng đã xác minh; CI main/tài liệu cuối được ghi riêng khi có kết quả. Tệp này chỉ chứa kết quả kiểm, số đếm và hash bảo toàn; không có SQL, mã hàng dữ liệu, token, mật khẩu hoặc nội dung phiếu.

Lượt seed đầu vấp assertion tổng số mẫu cũ 2 vì Week9 thêm một mẫu riêng. Bộ kiểm đã giữ phép đếm các họ lịch sử, tách rõ mẫu Week9 và kiểm nó tồn tại đúng một lần; toàn bộ hash cây mẫu/phiếu/kết quả cũ vẫn giữ. Chạy lại toàn suite trên database demo mới cho 15/15 nhóm qua; lượt lỗi không được tính là nghiệm thu. Không thay seed để ép kết quả mong muốn.

Lượt check trước đó còn quét output `.next-week9` chưa được loại khỏi ESLint; đã bổ sung đường dẫn output thử và `.local`, rồi chạy lại toàn check/build thành công. Đây là sửa cấu hình kiểm tệp sinh, không bỏ kiểm source hay quy tắc nghiệp vụ.

Web chính `http://localhost:3000` đã mở lại; health và đăng nhập trả HTTP 200, MySQL/Mailpit healthy. Scheduler đã chạy lại, lượt đầu gửi 38 thông báo cục bộ và không có lỗi gửi. Hash 27 tập dữ liệu nền được kiểm lại sau lượt đăng nhập/đọc demo. Cache build/dev cũ gây vòng HMR khi chụp ảnh đã được giữ trong `.local`, dev khởi động bằng cache mới; không sửa mã nghiệp vụ hoặc reset dữ liệu.

## Công thức, ngưỡng và ranh giới dữ liệu

[Bảng công thức](CONG_THUC_TONG_HOP.md) có TC-AGG-01: Q1 4,50; Q2 4,00; A 25/6; B 4,00; tổng 37/9 hiển thị 4,11; 4/10 nhiệm vụ hoàn thành = 40%. Chỉ Likert tham gia điểm số; không chuẩn hóa thang 1–4 hoặc tự đổi choice/BOOLEAN thành điểm. NA/trống bị loại khỏi mẫu số; toàn NA trả `null`. Mức 4,499 vẫn Tốt dù hiển thị 4,50. Ngưỡng công bố so sánh số chính xác, không lấy tỉ lệ đã làm tròn.

Kết quả gộp dùng thống kê gốc, không lấy trung bình điểm lớp. Dữ liệu khác phiên bản mẫu không bị ánh xạ tự động. Khảo thí chỉ nhận nhóm có cờ ở cấp gộp, không nhận lớp/giảng viên/TEXT/ID đáp án/phiếu. TeacherIds nội bộ chỉ dùng xác minh số GV đóng góp và không được lan ra DTO Khảo thí. Lớp thiếu mẫu luôn ẩn điểm/TEXT dù đợt đã công bố.

So sánh chỉ gộp dữ liệu cùng `templateId`. Nếu các đợt dùng cấu hình xếp mức khác nhau, vẫn trả điểm gộp nhưng không gán một mức chung; không chọn tùy ý cấu hình của đợt đứng trước theo UUID.

Kiểm duyệt không thêm quan hệ User vào SurveyResponse/SurveyAnswer hoặc timestamp chính xác; audit cán bộ và mã đáp án scalar không có danh tính người nộp. Góp ý đã duyệt được chiếu riêng, trộn thứ tự, không nhóm theo phiếu hoặc kèm ngày nộp. Danh sách chưa hoàn thành chỉ đọc nhiệm vụ, không ghép câu trả lời. Kiểm 5.6(d) ở tuần này áp dụng các DTO/lỗi/log đang có; xuất CSV/Excel/PDF thuộc Tuần 12, chưa nhận đã qua.

## Tiến độ và giới hạn

Nghiệm thu tám FR trong phạm vi Tuần 9 thêm **21 điểm** so với mốc Tuần 8. Tiến độ đạt **138/219=63,0%, 49/84 FR**; kế hoạch lũy kế Tuần 9 **140/219=63,9%**. M5 đạt **22/22**, M7 **16/18**, M14 **6/13**. Chênh hai điểm so với kế hoạch là FR-145 P1 có điều kiện còn backlog; không tự cắt hoặc loại khỏi mẫu số. FR-160 đầy đủ chờ Tuần 13. Tỉ lệ dựa trên checkbox có trọng số, không dựa trên số dòng mã hoặc số bảng.

Ẩn danh ở mức ứng dụng, không chống mọi suy luận bởi DBA/binlog/timing/log hạ tầng hoặc tự luận tự tiết lộ. Không nhận đạt tải 1.500 request, WCAG hay mọi thiết bị từ unit hiện tại. Chỉ dữ liệu giả; không deploy công khai. Đóng góp cá nhân, lịch trường và ngày/tên GVHD yêu cầu do sinh viên xác minh.

Tài liệu liên quan: [báo cáo](bao-cao-tien-do/tuan-09.md), [giải thích](GIAI_THICH/tuan-09.md), [ADR010](decisions/ADR-010-tong-hop-cong-bo-va-kiem-duyet.md), [sơ đồ](SO_DO_TUAN_09.md). Tuần 10 chỉ bắt đầu khi người dùng yêu cầu; nghiệm thu này không nhận hoàn thành phản hồi liên tục, giải trình hoặc báo cáo tương lai.
