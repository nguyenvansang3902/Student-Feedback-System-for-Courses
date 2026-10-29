# Nghiệm thu Tuần 7 — đợt khảo sát và xác nhận dữ liệu

Thực hiện ngày **29/10/2026**, theo yêu cầu người dùng tiếp tục Tuần7 sau G1. Lệnh bằng lời tự nhiên được ghi nhận đúng nội dung; không gán người dùng đã gõ câu lệnh mẫu. Mốc kế hoạch giả định của Tuần7 là **11–17/11/2026**; nhóm đối chiếu lịch trường. Không ghi lùi ngày hoặc tự điền ngày/tên GVHD yêu cầu.

**Trạng thái phiên:** đã nghiệm thu FR-40–46/100/142–144. [CI nguồn 39d5648](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40858131706) qua check và smoke đúng SHA; main/tài liệu cuối có lượt CI riêng. FR-145 P1 có điều kiện vẫn chưa thực hiện.

## Phạm vi và hành vi

- FR-40/41: ĐBCL tạo/sửa đợt nháp, bốn phạm vi toàn trường/khoa/bộ môn/chọn lớp, lịch theo UTC+7 và ngưỡng riêng.
- FR-42/142/143: trình → PĐT kiểm RS-01–06 và xác nhận/trả về → lãnh đạo duyệt/từ chối. Lý do bắt buộc khi trả/từ chối; cảnh báo cần ghi chú. Bản xác nhận có hash, số lớp/cặp, người/thời gian và cảnh báo.
- FR-43/44/144: duyệt khóa mẫu, mở/chốt nhiệm vụ từ đăng ký hiện tại theo lịch; drift vẫn mở và xếp cảnh báo. Đăng ký sau mở không đồng bộ lại task. Scheduler và ensure dùng chung logic, lặp an toàn; bắt kịp cửa sổ bị bỏ lỡ với giờ xử lý thật.
- FR-45/46: rút trước mở để trình lại; hủy trước mở, gia hạn tăng hạn, đóng sớm có lý do; tiến độ theo task/lớp và tỉ lệ, không trả định danh sinh viên hay đọc nội dung phiếu.
- FR-100: ngưỡng mặc định do ADMIN MFA cấu hình với TOTP mới, CAS; ĐBCL/PĐT/lãnh đạo chỉ đọc. Đổi mặc định không sửa hồi tố đợt đã tạo.
- Người dùng quyết định: chặn khóa học kỳ khi còn bất kỳ đợt đã duyệt hoặc đang mở. Guard dùng cùng mutex với duyệt/mở để không lọt cuộc đua.

Giao diện sinh viên trả lời thuộc Tuần8; tổng hợp/công bố thuộc Tuần9. **FR-145 ImportBatch/hoàn tác là P1 có điều kiện, chưa thực hiện/nghiệm thu, vẫn giữ trong backlog; không coi là đã được người dùng cắt.** Import CSV/XLSX hiện có tiếp tục theo Tuần5/G1.

## Kiểm thực tế đã ghi nhận

| Cổng | Kết quả hiện tại | Bằng chứng |
| --- | --- | --- |
| Migration main | 7 migration đồng bộ; diff không khác | Prisma status/diff và .local/week7-migration-recovery.json |
| Bảo toàn main | Hash24 tập dòng/cột cũ khớp sau migration và seed | .local/week7-preservation-before.json và -after.json; không in nội dung |
| SQL/MySQL | 16/16, rollback fixture | scripts/verify-database.mjs |
| HTTP nghiệp vụ | 19/19, cleanup=true | scripts/verify-week7.ts, .local/week7-http-result.json |
| HTTP ngưỡng/email | 13/13, cleanup=true, phục hồi cấu hình | scripts/verify-week7-settings.ts, .local/week7-settings-http-result.json |
| Seed mới riêng | 14/14, nâng cấp lặp giữ mật khẩu/trạng thái/mẫu/phiếu cũ | scripts/test-demo.mjs và verify-demo.ts |
| Build | Next16.4.3 qua, gồm routes/pages mới | next build; chạy lại sau mọi sửa runtime còn phát sinh |
| Audit phụ thuộc | 0 ở cả năm mức | npm audit JSON, ngày29/10; không thay kiểm bảo mật toàn hệ thống |
| Full check |572/572 trong32file, schema/ERD/lint/TypeScript qua | npm run check trên nguồn cuối |
| Giao diện |11nhóm/26viewport/26PNG,0pageerror/Reacterror/tràn ngang/thiếu nhãn | QA_GIAO_DIEN_TUAN_07.md |
| CI nguồn |check/smoke qua đúng 39d5648; gồm hồi quy các tuần trước | [Actions](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40858131706) |

HTTP nghiệp vụ kiểm ma trận10vai trò; CSRF/Origin/giới hạn thực256KiB; bốn phạm vi; đủ RS và trạng thái; xác nhận rồi đổi đăng ký;20 ensure đồng thời chỉ mở/chốt một lần; đóng/gia hạn/rút/hủy; tiến độ25% từ4task/1DONE; mất grant/phiên có hiệu lực ngay; race khóa kỳ/duyệt. Scheduler CLI hai lượt: lượt đầu gửi4thư thật,2địa chỉ/tài khoản không gửi được ghi FAILED; lượt hai không gửi lại. Đây là dữ liệu giả trong DB có marker riêng.

HTTP cấu hình kiểm10vai trò, phiên MFA hạn chế, TOTP từ secret mã hóa được tiêu thụ thật và chặn replay; CAS ghi đồng thời; mặc định áp vào đợt mới và RS-04; quyền bị thu hồi; giới hạn payload/field; audit không chứa bí mật. Outbox kiểm dedup, worker đồng thời, retry sau lỗi SMTP thật, lease hết hạn và giới hạn thử. Thư giả giữ trong Mailpit để đối chiếu.

## Migration và dữ liệu

Migration mới chỉ bổ sung metadata và ba bảng CampaignDataConfirmation/Notification/EmailOutbox lên runtime; runtime34, blueprint46. Lần áp đầu gặp MySQL3780 do collation mặc định của bảng mới khác bảng cũ. Đã kiểm ba bảng mới còn rỗng, đổi sang utf8mb4_vi_0900_ai_ci, bổ sung bốn khóa ngoại, đối chiếu diffzero rồi đánh dấu áp dụng. Migration mới chưa commit được sửa cùng collation để cài mới chạy sạch. Không reset/drop DB/bảng/volume, không sửa migration lịch sử, không sửa/xóa dòng lịch sử hoặc câu trả lời cũ.

Seed W7 có marker riêng, hai đợt nháp và tám lớp trong hai kỳ để xem RS-01–06. Không tạo đợt đã duyệt trên kỳ khóa. Tài khoản pending vẫn nằm trong cohort đăng ký, chỉ cảnh báo. Hai đợt/78phiếu/234đáp án/3tổng hợp cũ được giữ; dữ liệu seed tương lai được người dùng cho phép trước đó không biến thành chức năng đã triển khai.

## Tài liệu và giới hạn

[ADR-008](decisions/ADR-008-dot-khao-sat-va-chot-danh-sach.md), [giải thích/5 câu bảo vệ](GIAI_THICH/tuan-07.md), [sơ đồ](SO_DO_TUAN_07.md), [nháp chương4](bao-cao-tieu-luan/chuong-4-hien-thuc.md), [báo cáo tuần](bao-cao-tien-do/tuan-07.md), [truy vết](TRUY_VET.md), [ma trận](MA_TRAN_QUYEN.md), README được cập nhật. Các báo cáo/ảnh tuần cũ và phần5.6/8.3–8.6 không thay đổi.

Lịch cần scheduler hoạt động để xử lý mà không đợi truy cập. Email có retry bền nhưng vẫn có thể gửi lặp nếu tiến trình chết sau SMTP nhận trước ghi SENT; không nhận exactly-once email. Chưa kiểm tải đồng thời1500request hoặc tuyên bố chứng nhận WCAG. Kết quả lint/typecheck/unit/build không thay kiểm UI/HTTP/MySQL; các lượt lỗi không được tính là nghiệm thu. Chỉ dữ liệu giả, không deploy công khai hoặc gửi thư ra dịch vụ thật.

## Chốt phiên

Chấp nhận11FR nêu trên, thêm32điểm:103/219=47,0%,36/84FR; không tick FR-145/160. Lượt fullcheck đầu vướng hai output Next mới chưa được ESLint bỏ qua; đã thêm ignore đúng thư mục sinh tự động và chạy lại toàn cổng572qua. Rà soát phát hiện lease email lô sau có thể bị nhận lại: CAS claim thêm leaseUntil và renew/kiểm owner ngay trước SMTP; unit22 cùng HTTP19+13 trên nguồn cuối qua. MySQL20worker chỉ nhận/gửi1thư, retry0 và fixture dọn. Build cuối qua sau sửa. Không tính các lượt lỗi là nghiệm thu.

Đã cập nhật báo cáo10mục/nháp chương4/5câu bảo vệ/README/progress/truy vết/nhật ký AI. Web3000 và scheduler nền hoạt động với DB chính; health200 chỉ xác nhận ứng dụng, database:not_checked vẫn giữ đúng thiết kế. Bằng chứng bảo toàn dữ liệu là hash24tập và Prisma/SQL riêng.
