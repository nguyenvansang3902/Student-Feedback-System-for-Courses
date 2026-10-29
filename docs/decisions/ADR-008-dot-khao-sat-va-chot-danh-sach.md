# ADR-008: Đợt khảo sát, xác nhận dữ liệu và chốt nhiệm vụ

- Ngày thực hiện: 29/10/2026 (Asia/Saigon).
- Trạng thái: hiện thực Tuần 7; kết quả kiểm cuối xem NGHIEM_THU_TUAN_07.md.
- Nguồn: đặc tả5.2, FR-40–46/100/142–144, BR-01/05/17/30/34/52/53; quyết định khóa kỳ do người dùng chọn trong phiên.

## Quyết định

ĐBCL tạo đợt ở NHAP, trình sang CHO_XAC_NHAN_DL. PĐT kiểm RS-01–06 và xác nhận sang CHO_DUYET hoặc trả về NHAP có lý do. Lãnh đạo duyệt sang DA_DUYET hoặc từ chối về NHAP có lý do. Duyệt và khóa phiên bản mẫu dùng cùng transaction; xác nhận lại nội dung mẫu trước khóa. Không tự thêm ràng buộc người tạo khác người duyệt, vì prompt cấp quyền theo grant và không quy định tách cá nhân. Tài khoản nhiều vai trò vẫn chịu MFA nếu có ADMIN.

Mọi ghi dữ liệu đào tạo, mẫu, đợt và khóa kỳ dùng ADMIN_MUTATION_LOCK trước SELECT thường để tránh snapshot cũ dưới MySQL REPEATABLE READ. Service lấy lại phiên, tài khoản, grant và MFA từ DB. Revision/CAS chặn ghi đè; requestId UUID và requestHash lưu trong CampaignHistory cho thao tác chuyển trạng thái: lặp cùng actor/hành động/nội dung trả kết quả hiện tại, dùng lại khóa cho nội dung khác bị409. Lịch sử cũ không bị sửa.

Bản chụp gồm danh sách lớp đã sắp xếp và các cặp sinh viên/lớp đăng ký chưa rút. SHA-256 chứa cả lớp rỗng để phát hiện thêm/bớt lớp dù chưa có sinh viên. Phạm vi GLOBAL/FACULTY/DEPARTMENT được tính lại từ danh mục hiện tại, SECTIONS giữ tập lớp đã chọn. Tài khoản chưa kích hoạt/bị khóa vẫn thuộc danh sách đăng ký; RS-06 cảnh báo, không tự loại khỏi nhiệm vụ.

RS-01 thiếu giảng viên, RS-02 không đăng ký, RS-03 kỳ khóa là lỗi chặn. RS-04 số giảng viên từ ngưỡng cấu hình (mặc định2), RS-05 số đăng ký dưới minResponses, RS-06 tài khoản chưa hoạt động hoặc thiếu email là cảnh báo. PĐT phải ghi chú khi xác nhận còn cảnh báo. Bản xác nhận lưu số lớp/cặp, hash và cảnh báo theo revision; không tạo phiếu trả lời.

Đến giờ mở, tính lại cohort. Nếu lệch bản xác nhận, vẫn chốt dữ liệu hiện tại theo BR-53, lưu openedAt/hash/cờ lệch, thêm lịch sử/audit và xếp email cho PĐT/ĐBCL. SurveyTask và CampaignSection được tạo trong transaction đổi trạng thái; không đồng bộ lại từ Enrollment sau mở. Khóa học kỳ bị chặn khi có bất kỳ đợt DA_DUYET hoặc DANG_MO, kể cả chưa đến giờ mở, theo lựa chọn trực tiếp của người dùng. Sau khi các đợt đóng/hủy/rút về nháp thì PĐT mới có thể khóa; kỳ khóa chỉ đọc.

Hàm ensure chạy khi đọc danh sách/chi tiết hoặc trước thao tác; scheduler gọi cùng logic. Nếu scheduler vắng cả cửa sổ, lần truy cập tiếp theo thực hiện mở rồi đóng trong transaction, giữ thời điểm xử lý thực tế. Không ghi lùi thời gian hoặc nhận mở chính xác theo đồng hồ khi tiến trình không hoạt động. Chạy scheduler giúp xử lý đúng lịch mà không đợi người truy cập. Duyệt muộn khi đã đến giờ mở thực hiện mở ngay cùng transaction.

Gia hạn chỉ từ DANG_MO, hạn mới muộn hơn hạn cũ và có lý do; xếp thông báo cho sinh viên có nhiệm vụ. Đóng sớm cần lý do. Hủy chỉ trước mở. Rút DA_DUYET trước mở về NHAP phải trình/xác nhận/duyệt lại; mẫu đã khóa vẫn khóa. Tiến độ đếm SurveyTask theo lớp (DONE/PENDING) và tỉ lệ, không đọc câu trả lời hoặc trả định danh sinh viên. Giao diện sinh viên làm bài thuộc Tuần8.

## Cấu hình và email

FR-100 dùng SURVEY_DEFAULTS cho minResponses/minRate/warningScore/explanationDays/multiTeacherWarningThreshold. ADMIN MFA đọc/ghi cấu hình; ghi qua HTTP cần mã TOTP mới, CSRF và Origin. ĐBCL/PĐT/LĐ chỉ đọc. CAS updatedAt chặn ghi đè, cấu hình không tắt RS-01–03. Bốn ngưỡng minResponses/minRate/warningScore/explanationDays lưu riêng trong đợt, đổi mặc định không đổi hồi tố bốn giá trị đó. Ngưỡng số giảng viên RS-04 dùng cấu hình readiness hiện tại khi kiểm, không sao chép vào đợt.

Promotion CampaignDataConfirmation, Notification, EmailOutbox lên runtime phục vụ thông báo bắt buộc của Tuần7. Chưa làm trung tâm thông báo/SLA tương lai. Queue có idempotencyKey, SMTP ngoài transaction, lease CAS60giây và thử tối đa5 lần có backoff; lease quá hạn được thu hồi, hết lượt chuyển FAILED. Địa chỉ sai/tài khoản khóa không gửi. Scheduler chỉ xử lý targetType SurveyCampaign. Email có thể gửi lại nếu tiến trình chết sau SMTP nhận nhưng trước ghi SENT (at-least-once); không tuyên bố exactly-once SMTP. Trạng thái/chốt nhiệm vụ có tính nguyên tử và lặp an toàn.

## Migration và bảo toàn

Migration20261029030000_week7_campaigns chỉ thêm metadata, bảng và khóa ngoại. Dùng utf8mb4_vi_0900_ai_ci khớp các bảng cũ; lần deploy đầu phát hiện MySQL3780 do bản sinh mặc định unicode_ci. Bản migration mới chưa commit được sửa collation cho cài mới; DB đang dở được đối chiếu DDL, đổi collation ba bảng mới rỗng, bổ sung bốn FK còn thiếu, diffzero rồi resolveapplied. Không reset/drop bảng/volume, không sửa migration lịch sử. Hash24 tập dòng cũ khớp sau phục hồi. Seed readiness W7 có marker riêng và không viết đè mật khẩu/trạng thái/cây mẫu/phiếu cũ.

## Giới hạn

Giới hạn giao dịch30giây và lô task500/mail250 cần đo lại với tải lớn ngoài bộ demo; chưa nhận đạt kiểm tải1500request. SMTP cần scheduler chạy để rút queue. FR-145 ImportBatch/hoàn tác là P1 có điều kiện trong kế hoạch, chưa nằm trong quyết định này; không tick trước hiện thực/kiểm. Không thay đổi thiết kế ẩn danh5.6 hoặc tiêu chí8.3–8.6.
