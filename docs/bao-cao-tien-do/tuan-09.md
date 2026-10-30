# BÁO CÁO TIẾN ĐỘ TUẦN 9/15 — bắt đầu 30/10/2026

**Đề tài:** Xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học.

**Tiểu luận chuyên ngành HK1 2026–2027 | Nhóm:** [sinh viên điền] **| GVHD:** [sinh viên điền].

**Mốc kế hoạch giả định:** 25/11–01/12/2026, tính tuần bảy ngày từ 30/09. **Thực hiện:** bắt đầu 30/10/2026 theo yêu cầu trực tiếp; nhóm đối chiếu lịch trường, không ghi lùi ngày.

**Trạng thái:** mã, kiểm thử cục bộ và bản dựng đã qua; đang đối chiếu CI nguồn cuối trước chốt nghiệm thu. AI hỗ trợ nháp kỹ thuật; nhóm cần thử và viết lại bằng lời của mình.

## 1. Mục tiêu của tuần

Tổng hợp đúng Mục 5.7/TC-AGG-01; công bố theo ngưỡng; trang kết quả theo vai trò/phạm vi, so sánh bộ môn/khoa/kỳ trước; kiểm duyệt tự luận; danh sách chưa hoàn thành và nhắc nhở. Bổ sung kết quả gộp Khảo thí theo FR-150/BR-57 và seed E8. Giữ câu chữ giao diện ngắn, dùng tên chức năng/hướng dẫn cần thiết, hạn chế slogan theo yêu cầu người dùng.

## 2. Kết quả đạt được và bằng chứng

Đã hiện thực tính điểm bằng phân số, gộp số liệu gốc, ảnh chụp version2, cấu hình xếp mức/từ khóa, tổng hợp/công bố có mutex/freshactor/CAS/requestId, TEXT-only, đọc theo phạm vi, so sánh, kiểm duyệt và nhắc. Fullcheck gần nhất **797/797 trong 50 tệp** qua. HTTP/MySQL cuối **12/12**: 10 lệnh tổng hợp đồng thời chỉ 1 thành công/9 bị 409; dữ liệu sai ở lớp cuối rollback DA_DONG/revision1/0 kết quả/lịch sử/audit, rồi retry thành công. Cấu hình được lưu bằng TOTP thật, mã dùng lại/CAS cũ bị chặn và từ khóa gắn cờ ba góp ý. Fixture sạch, cấu hình thử đã khôi phục. Không gọi tình huống rollback này là trigger lỗi SQL.

UI **14 nhóm/23 trạng thái/46 PNG đã xem**, không lỗi trong phép đo; [QA](../QA_GIAO_DIEN_TUAN_09.md). Seed MySQL **15/15 nhóm**, E8 hai đợt/bốn lớp/18 phiếu/40 nhiệm vụ, hai giảng viên cùng môn, kỳ trước và lớp thiếu mẫu; seed lặp/tăng size giữ hash. 27 tập main cũ khớp hash, không reset. Ba sơ đồ nghiệp vụ, 4 Mermaid ERD và 4 thẻ, 11 PNG đã xem, không nhãn vượt biên. Production build Next **16.4.3** qua. Nhánh `feat/week9-survey-results` xuất phát từ `8af1dee2063187fe167f8ace99317ec9e0eb32e5`; CI nguồn cuối còn đối chiếu tại [nghiệm thu](../NGHIEM_THU_TUAN_09.md). [Bằng chứng máy đọc](../assets/tuan-09/verification.json) ghi riêng các cổng đã qua và cổng còn chờ.

## 3. Đối chiếu kế hoạch

| Mục | Trạng thái tại lượt soạn | Phần còn thiếu trước nghiệm thu |
| --- | --- | --- |
| FR-60 tính điểm; BR-11/12 | Mã/unit/HTTP/UI qua, chờ chốt nguồn | TC-AGG-01, NA/trống, phân số, xếp mức trước làm tròn |
| FR-61/62 ngưỡng/công bố | Mã/unit/HTTP/UI qua, chờ chốt nguồn | Đồng thời1/9, rollback thật, thiếu mẫu/TEXT-only/requestId/CAS |
| FR-63 quyền và phạm vi | Unit/HTTP/UI qua, chờ chốt nguồn |10vai trò, đa vai trò, IDOR404, phiên/grant bị thu hồi |
| FR-64 so sánh | Unit/HTTP/UI qua, chờ chốt nguồn | Gộp toàn phiếu, bộ môn/khoa/kỳ trước và thiếu tương thích |
| FR-65 kiểm duyệt | Unit/HTTP/UI qua, chờ chốt nguồn | Ba góp ý được duyệt thật, reason/flags/audit, DTO không danh tính |
| FR-47 danh sách/nhắc | Unit/HTTP/UI qua, chờ chốt nguồn | Audit mỗi lượt xem kể cả rỗng; cùng ngày nhiều lớp/vai trò vẫn1lần/SV/đợt |
| FR-150 Khảo thí và E8 | HTTP/UI/seed qua, chờ chốt nguồn | ≥2GV snapshot/đủ mẫu, không lớp/GV/TEXT; E8 seed lặp giữ hash |
| Tài liệu/sơ đồ/kiểm cuối | Bản dựng qua, còn đối chiếu CI | Check 797, HTTP 12, seed 15, UI 46 ảnh, sơ đồ 11 ảnh đã qua; chưa nhận CI cuối |
| FR-145 | Chưa làm | P1 có điều kiện, giữ backlog; không tự cắt |

## 4. Tiến độ lũy kế

Lệnh `node scripts/progress.mjs` ngày 30/10 khi chưa tick FR Tuần 9 trả **117/219=53,4%, 41/84 FR**. Kế hoạch lũy kế Tuần 9 là **140/219=63,9%**. Tám FR Tuần 9 gồm FR-47/60–65/150 có trọng số 21 điểm; chỉ cộng sau khi đủ mã/test/nghiệm thu/tài liệu. Không dùng số dòng mã hoặc số bảng để ước lượng phần trăm.

| Module | Điểm đã nghiệm thu tại lượt soạn |
| --- | --- |
| M1 Xác thực và phiên | 22/23 |
| M2 Người dùng, phân quyền, kiểm toán | 9/9 |
| M3 Danh mục và nhập liệu | 9/9 |
| M4 Mẫu phiếu | 16/16 |
| M5 Đợt khảo sát | 20/22 |
| M6 Làm khảo sát | 14/14 |
| M7 Kết quả | 0/18 |
| M8 Phản hồi | 0/19 |
| M9 Thông báo | 0/7 |
| M10 Báo cáo | 0/12 |
| M11 Hệ thống | 9/11 |
| M12 Mở rộng | 0/3 |
| M13 Phòng Đào tạo | 15/22 |
| M14 Phòng Khảo thí | 3/13 |
| M15 Phòng Thanh tra | 0/18 |
| M16 Ma trận quyền mở rộng | 0/3 |

## 5. Khó khăn, rủi ro và cách xử lý

Ngưỡng tỉ lệ và xếp mức có thể sai nếu làm tròn sớm; dùng phân số và kiểm đúng biên. Gộp lớp khác số phiếu cần số liệu gốc; khác phiên bản mẫu thì báo không tương thích. Khảo thí dùng projection riêng và ảnh chụp GV nội bộ; danh sách PENDING không ghép phiếu. Bộ kiểm seed cũ đếm mẫu toàn DB nên gặp3thay vì2 sau thêm mẫu riêng Week9; đã tách phép đếm lịch sử và mẫu mới, giữ tất cả hash, chạy lại15/15 qua. Không sửa dữ liệu seed để ép test. Kiểm thật không thay giới hạn DBA/binlog/log hạ tầng hoặc mọi thiết bị.

## 6. Kế hoạch Tuần 10

Chỉ bắt đầu sau khi hoàn tất Tuần 9 và có yêu cầu người dùng: gửi phản hồi, tám loại/định tuyến, hàng đợi PĐT/Khảo thí, trạng thái/trao đổi/chuyển tiếp/từ chối, đính kèm an toàn và tiếp nhận hồ sơ Thanh tra với guard xung đột. Không làm trước SLA/giải trình/báo cáo tương lai. Tiếp tục theo dõi FR-145 chưa được cắt.

## 7. Phân công và đóng góp thành viên

**[SINH VIÊN TỰ ĐIỀN]** Họ tên, phần thực làm, bằng chứng commit/kiểm thử/thuyết minh. AI không gán tên, số giờ hoặc đóng góp cho thành viên; hỗ trợ AI được khai báo riêng trong AI_USAGE.

## 8. Các bước kiểm tra nhanh cho giảng viên

Các bước dưới hướng dẫn nhóm thử lại. Lượt UI đã qua trên fixture giả riêng; không thay thử bằng tài khoản của nhóm hoặc đăng nhập/TOTP thật.

1. Theo README mở Docker Compose, web và scheduler; đăng nhập ĐBCL, mở **Kết quả khảo sát** và một đợt đã đóng. Bấm tổng hợp, đối chiếu ví dụ TC-AGG-01 trong tài liệu công thức.
2. Mở kiểm duyệt, thử quyết định thiếu lý do rồi duyệt từng góp ý. Khi còn TEXT chờ duyệt, công bố phải bị chặn; nonTEXT mặc định chờ không chặn.
3. Công bố rồi đăng nhập GV/trưởng đơn vị. Chỉ thấy kết quả trong phạm vi; lớp thiếu mẫu hiện “Chưa đủ mẫu để công bố”, không có điểm/tự luận. ADMIN đơn vai trò không đọc được.
4. Đăng nhập Khảo thí, chỉ xem nhóm đánh giá gộp theo môn/bộ môn/khoa. Tập dưới hai GV hoặc thiếu mẫu hiện “Chưa đủ dữ liệu gộp”; không có lớp/GV/TEXT.
5. ĐBCL/TBM/TK mở danh sách chưa hoàn thành, đối chiếu audit; nhắc hai lần cùng ngày không xếp thêm thư cho cùng SV/đợt. Thử học kỳ khóa và phiên bị thu hồi.
6. Chạy check/build/test:week9/progress, đối chiếu kết quả thật và CI đúng SHA trong nghiệm thu. Không reset dữ liệu để tạo lại tình huống.

## 9. Bản rút gọn để dán vào hệ thống của trường

Nhóm đã hiện thực tổng hợp, công bố, kiểm duyệt góp ý, so sánh và nhắc sinh viên chưa hoàn thành. Tính điểm dùng phân số và số liệu gốc; lớp thiếu mẫu bị ẩn. Khảo thí chỉ xem nhóm đánh giá gộp đủ điều kiện. Kiểm gần nhất qua 797 test, 12 nhóm HTTP, 15 nhóm seed và 46 ảnh giao diện; bản dựng cũng qua. Đang đối chiếu CI nguồn cuối trước nghiệm thu; tiến độ đã chốt vẫn 117/219 điểm. Lô nhập và hoàn tác P1 còn backlog. Nhóm cần thử lại và điền đóng góp cá nhân.

## 10. Điều chỉnh so với kế hoạch

**Ngày yêu cầu:** [SINH VIÊN TỰ ĐIỀN]. **Tên người yêu cầu:** [SINH VIÊN TỰ ĐIỀN]. Lý do theo GVHD: [nhóm tự xác minh]. Tuần 9 giữ FR-47/60–65 và bổ sung FR-150/E8 theo Điều chỉnh số01; không làm trước phản hồi/giải trình. Theo yêu cầu câu chữ ngày phiên 30/10, hạn chế slogan, giữ hướng dẫn cần thiết và không khôi phục ví dụ placeholder đăng nhập. FR-145 P1 có điều kiện vẫn backlog. Không viết quy trình hiện tại ở trường; ngày thao tác kỹ thuật không thay ngày GVHD yêu cầu.
