# BÁO CÁO TIẾN ĐỘ TUẦN 7/15 — ngày 29/10/2026

**Đề tài:** Xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học.

**Tiểu luận chuyên ngành HK1 2026–2027 | Nhóm:** [sinh viên điền] **| GVHD:** [sinh viên điền].

**Kế hoạch giả định:** 11–17/11/2026, tính từng tuần7ngày từ30/09. **Thực hiện:** 29/10/2026 theo yêu cầu tiếp tục trực tiếp của người dùng sau G1. Làm sớm theo lệnh, không đổi ngày lịch sử hoặc điền thay ngày GVHD yêu cầu.

**Trạng thái:** đã nghiệm thu phần chính FR-40–46/100/142–144; FR-145 P1 có điều kiện chưa thực hiện. AI hỗ trợ nháp kỹ thuật; nhóm phải đọc, thử và viết lại bằng lời của mình.

## 1. Mục tiêu của tuần

Quản lý đợt khảo sát, bốn phạm vi, thời gian/ngưỡng, trình/xác nhận/duyệt/từ chối, chốt danh sách và tạo nhiệm vụ khi mở; scheduler/ensure, gia hạn/đóng sớm/hủy, tiến độ. Tích hợp Điều chỉnh số01: RS-01–06, PĐT xác nhận/trả về và cảnh báo lệch danh sách. Chưa làm giao diện sinh viên trả lời.

## 2. Kết quả đạt được và bằng chứng

Có trang /dot-khao-sat cho ĐBCL/PĐT/lãnh đạo theo từng quyền. Máy chủ lấy lại quyền/phiên và khóa giao dịch trước đọc; revision/CAS/requestId bảo vệ thao tác lặp và ghi đồng thời. Duyệt khóa mẫu; đến giờ mở chốt cohort hiện tại và task. Đăng ký sau mở không làm đổi nhiệm vụ. Tiến độ chỉ đếm task, không trả danh tính sinh viên hoặc đọc đáp án. ADMIN cấu hình ngưỡng với TOTP mới; đợt lưu ngưỡng riêng.

Theo quyết định người dùng, PĐT không khóa học kỳ khi còn đợt DA_DUYET hoặc DANG_MO. Migration thêm ba bảng phục vụ xác nhận/email; runtime34/blueprint46. Đã xử lý collation và so hash24tập dữ liệu cũ khớp sau nâng cấp/seed. Không reset dữ liệu hoặc thay migration lịch sử.

HTTP nghiệp vụ19/19, cấu hình/email13/13, SQL16/16 và seed14/14 đã qua trên dữ liệu giả; fixture dọn và cấu hình test khôi phục. Build đã qua trước vòng rà soát cuối. Fullcheck572/572 trong32file, build và UI11nhóm/26viewport/26PNG qua. Kết quả cuối xem [nghiệm thu](../NGHIEM_THU_TUAN_07.md), [QA](../QA_GIAO_DIEN_TUAN_07.md), [truy vết](../TRUY_VET.md). Nguồn 39d56485cb42281ed97eb482a317967dfabdce5b; [CI 40858131706](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40858131706) đã qua check/smoke đúng SHA. CI main sau chốt tài liệu được đối chiếu riêng.

## 3. Đối chiếu kế hoạch

| Mục | Hiện trạng | Giới hạn |
| --- | --- | --- |
| Tạo/sửa/phạm vi/lịch/ngưỡng | Đã có mã và kiểm HTTP | Đã qua cổng cuối và tick FR |
| Trình → PĐT → lãnh đạo, khóa mẫu | HTTP và trạng thái qua | Không thêm tách người tạo/người duyệt ngoài prompt |
| Readiness/xác nhận/drift | Đủ RS01–06, snapshot, cảnh báo | Tài khoản pending/disabled vẫn thuộc cohort đăng ký |
| Chốt task/scheduler/ensure |20ensure đồng thời và bắt kịp cửa sổ qua | Scheduler cần chạy để xử lý mà không đợi truy cập |
| Gia hạn/đóng/hủy/tiến độ | HTTP và queue qua | Không làm form/nộp phiếu Tuần8 |
| Cấu hình ngưỡng FR-100 | TOTP thật,10role, CAS qua | Không đổi ngưỡng hồi tố đợt cũ |
| ImportBatch/hoàn tác FR-145 | Chưa thực hiện | P1 có điều kiện theo kế hoạch; giữ backlog, chưa được người dùng cắt |
| Tài liệu/sơ đồ/ảnh/nháp hiện thực | Hoàn thành | Không sửa báo cáo/ảnh tuần cũ |

## 4. Tiến độ lũy kế

Sau nghiệm thu11FR, npm run progress trả **103/219=47,0%**,36/84FR. Trọng số P0=3/P1=2/P2=1; mốc G1 là71/219=32,4%,25FR. Kế hoạch lũy kế Tuần7 là105/219=47,9%, còn2điểm do FR-145 P1 có điều kiện chưa thực hiện; không tự coi là đã cắt.

| Module | Tiến độ thực tế |
| --- | --- |
| M1 Xác thực và phiên | 95.7% (22/23 điểm) |
| M2 Người dùng, phân quyền, kiểm toán | 100.0% (9/9 điểm) |
| M3 Danh mục và nhập liệu | 100.0% (9/9 điểm) |
| M4 Mẫu phiếu | 100.0% (16/16 điểm) |
| M5 Đợt khảo sát | 90.9% (20/22 điểm) |
| M6 Làm khảo sát | 0.0% (0/14 điểm) |
| M7 Kết quả | 0.0% (0/18 điểm) |
| M8 Phản hồi | 0.0% (0/19 điểm) |
| M9 Thông báo | 0.0% (0/7 điểm) |
| M10 Báo cáo | 0.0% (0/12 điểm) |
| M11 Hệ thống | 81.8% (9/11 điểm) |
| M12 Mở rộng | 0.0% (0/3 điểm) |
| M13 Phòng Đào tạo | 68.2% (15/22 điểm) |
| M14 Phòng Khảo thí | 23.1% (3/13 điểm) |
| M15 Phòng Thanh tra | 0.0% (0/18 điểm) |
| M16 Ma trận quyền mở rộng | 0.0% (0/3 điểm) |

Mốc lịch giả định của Tuần7 ở11–17/11, phiên thực hiện29/10 là sớm theo yêu cầu người dùng; điều này không thay kết luận tiến độ chức năng theo checkbox. Không bịa lịch trường hoặc thời gian đóng góp sinh viên.

## 5. Khó khăn, rủi ro và cách xử lý

- DDL MySQL tự commit làm migration dở khi FK khác collation. Đối chiếu trạng thái thật, chỉ sửa ba bảng mới rỗng và bổ sung FK, diffzero rồi resolve; hash dữ liệu cũ khớp. Không reset để vượt lỗi.
- Race khóa kỳ/duyệt được giải bằng quyết định người dùng và mutex dùng chung. Không tự chọn nghiệp vụ chưa được quy định.
- Queue email dùng lease/CAS và SMTP ngoài giao dịch. Vòng rà soát bổ sung kiểm mất lease trước gửi; không gọi gửi thành công nếu hàng đã thuộc worker khác. SMTP vẫn có cửa sổ gửi lặp khi worker chết sau khi SMTP chấp nhận trước ghi DB.
- Nhiều Next dev dùng dist khác nhau có thể thay next-env và gây HMR liên tục khi QA. Kiểm giao diện phải chạy trong cửa sổ chỉ có một devserver; lượt lỗi không tính là nghiệm thu. Guard HTTPS production được giữ, không dùng cấu hình giả để lách.
- Chưa kiểm tải1500request, toàn bộ trình duyệt/thiết bị hoặc chứng nhận WCAG. Chưa triển khai ImportBatch/hoàn tác, form trả lời hoặc tổng hợp/công bố.

## 6. Kế hoạch Tuần 8

Chỉ bắt đầu khi người dùng yêu cầu: danh sách nhiệm vụ sinh viên, form động, kiểm câu bắt buộc/NA/thang/lựa chọn, nháp trình duyệt, nộp ẩn danh một lần và xác nhận. Kiểm20request nộp đồng thời chỉ một thành công theo thiết kế5.6. Giữ lịch sử và ranh giới Task/Response không nối định danh. FR-145 vẫn theo dõi riêng, không tự coi là cắt hoặc hoàn thành.

## 7. Phân công và đóng góp thành viên

**[SINH VIÊN TỰ ĐIỀN]** Tên, phần thực làm, bằng chứng commit/kiểm thử/thuyết minh. AI không gán tên, số giờ hoặc công việc cho thành viên; phần AI hỗ trợ ghi riêng trong AI_USAGE.

## 8. Các bước kiểm tra nhanh cho giảng viên

1. Theo README mở MySQL/Mailpit/web và scheduler. Đăng nhập ĐBCL, vào Đợt khảo sát, tạo đợt kỳ mở/phạm vi lớp/mẫu/lịch/ngưỡng và trình. Kỳ khóa không tạo được.
2. Đăng nhập PĐT, mở đợt chờ xác nhận. Kiểm lỗi chặn/cảnh báo; còn chặn không xác nhận được, có cảnh báo cần ghi chú. Xác nhận lưu người/thời gian/hash/số lớp/cặp; trả về cần lý do.
3. Đăng nhập lãnh đạo, duyệt hoặc từ chối. Sau duyệt mẫu bị khóa. Thử khóa học kỳ có đợt đã duyệt/đang mở bị chặn; đến lịch có đủ nhiệm vụ.
4. Đổi đăng ký trước mở để quan sát cảnh báo lệch; sau mở đổi đăng ký không đổi task. ĐBCL xem tiến độ, gia hạn có lý do và xem thư giả trong Mailpit, rồi đóng sớm theo trạng thái.
5. ADMIN vào Cấu hình ngưỡng bằng MFA, lưu với mã TOTP mới. Vai trò khác không được ghi. Đổi mặc định áp vào đợt mới, đợt đã tạo giữ ngưỡng cũ.
6. Chạy check, các bộ HTTP và progress theo README; xem mã/CI đúng SHA và ảnh QA. Phần form trả lời chưa có trong Tuần7.

## 9. Bản rút gọn để dán vào hệ thống của trường

Nhóm triển khai quản lý đợt khảo sát với quy trình ĐBCL trình, Phòng Đào tạo xác nhận dữ liệu và lãnh đạo duyệt. Hệ thống kiểm sáu luật sẵn sàng, chốt danh sách khi mở, cảnh báo khi đăng ký thay đổi và giữ nhiệm vụ sau chốt. Đã bổ sung lịch mở/đóng, gia hạn, tiến độ và cấu hình ngưỡng có TOTP. Các phép kiểm dùng dữ liệu giả; giao diện sinh viên trả lời thuộc tuần sau. Lô nhập/hoàn tác P1 chưa thực hiện. Nhóm cần tự xác minh số liệu cuối trong báo cáo nghiệm thu và bổ sung đóng góp thành viên.

## 10. Điều chỉnh so với kế hoạch

**Ngày yêu cầu:** [SINH VIÊN TỰ ĐIỀN]. **Tên người yêu cầu:** [SINH VIÊN TỰ ĐIỀN]. Lý do theo GVHD: [nhóm tự xác minh]. Điều chỉnh số01 bổ sung PĐT/Khảo thí/Thanh tra; G1 hoàn thành28–29/10, Tuần7 tích hợp PĐT vào workflow và dữ liệu readiness. Giữ đủ P0; FR-145 P1 có điều kiện chưa triển khai, chưa được quyết định cắt. Ngày thao tác kỹ thuật29/10 không thay ngày yêu cầu GVHD. Không viết phần quy trình hiện tại ở trường theo yêu cầu người dùng.
