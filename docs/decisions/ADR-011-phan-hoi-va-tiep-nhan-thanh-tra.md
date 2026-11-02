# ADR-011: Phản hồi và tiếp nhận Thanh tra

Ngày thực hiện: 01/11/2026. Phạm vi: Tuần 10, theo lệnh người dùng và Điều chỉnh số 01.

## Quyết định

Phản hồi liên tục giữ tác giả để sinh viên đọc trả lời và trao đổi tiếp. Đây là miền riêng, khác phiếu khảo sát ẩn danh: không thêm liên kết từ SurveyResponse hoặc SurveyAnswer đến User, SurveyTask hay phản hồi. Khi sinh viên chọn ẩn danh, DTO của người xử lý không trả tài khoản, email, tên, ID tác giả; tên tệp tải về dùng tên trung tính. Nội dung do người gửi tự ghi vẫn có thể tiết lộ danh tính; mức bảo vệ là ở ứng dụng, không chống người quản trị database hoặc nhật ký hạ tầng.

Tám loại phản hồi dùng bảng định tuyến tại mục 5.8. Bản sao cho trưởng bộ môn cho phép theo dõi nhưng không giành quyền xử lý của người chính. Người nhận phải còn vai trò và phạm vi phù hợp lúc đọc hoặc ghi. Khi chuyển tiếp, thay người nhận hiện hành và quay về MOI, lưu lý do cùng người chuyển/nhận trong lịch sử. Quyền quản trị hệ thống không cấp quyền đọc nội dung nghiệp vụ.

Mỗi thay đổi kiểm lại phiên và quyền trong giao dịch, kiểm revision và requestId. RequestId đã dùng chỉ được phát lại với cùng người và cùng dữ liệu; không biến một lần gửi thành hai phản hồi hoặc hai chuyển trạng thái. Lịch sử nghiệp vụ chỉ thêm, không cung cấp API sửa hoặc xóa. Khóa chung với thay đổi phân quyền/danh mục giúp kiểm tra kỳ khóa và xung đột không dùng ảnh chụp quyền cũ.

BR-20 được kiểm theo ngày Việt Nam ở máy chủ: các kỳ chứa ngày hiện tại được coi là hiện hành. Nếu cấu hình cho phép kỳ trước, lấy mốc bắt đầu gần nhất đứng trước tập kỳ hiện hành; các kỳ cùng mốc đều được xét. Cách này tránh chọn ngẫu nhiên một UUID khi dữ liệu demo có hai kỳ cùng khoảng ngày. Không có kỳ hiện hành thì chưa cho gửi mới; phản hồi cũ vẫn đọc theo quyền. Kỳ khóa chỉ đọc, kể cả thêm tin nhắn hoặc tệp.

Khiếu nại nghiêm trọng có mức KHIEU_NAI cố định, phải xác nhận cảnh báo và chọn loại vi phạm. Gửi trực tiếp tạo Feedback cùng InspectionCase/TIEP_NHAN và sự kiện khởi tạo trong một giao dịch. Tuần 10 không có hành động xác minh, kết luận, thông báo kết luận, đóng hoặc chuyển từ phản hồi thường sang Thanh tra. FR-154 còn một phần; không tick đủ quy trình chỉ vì enum có tên trạng thái tương lai.

Quyền Thanh tra dùng một policy chung, tính động từ lớp học phần và phạm vi bộ môn/khoa. Giảng viên của lớp, trưởng bộ môn hoặc trưởng khoa liên quan không được xem hoặc nhận hồ sơ, kể cả có vai trò THANH_TRA. ADMIN và Đảm bảo chất lượng không được đọc hồ sơ; lãnh đạo chỉ nhận bản tóm tắt cho phép. Danh tính mặc định AN_DANH_HOAN_TOAN; CHO_THANH_TRA_BIET chỉ mở cho Thanh tra không xung đột, có kiểm toán mỗi lượt xem. Tệp chứng cứ đi qua cùng quyền và có kiểm toán lượt tải.

Tệp tối đa ba tệp trên toàn phản hồi, mỗi tệp 5 MiB; chỉ PNG/JPG/PDF. Máy chủ kiểm cả đuôi và chữ ký nội dung, đặt tên ngẫu nhiên, lưu ngoài public, kiểm quyền trước khi truy cập tệp. Nội dung PDF/ảnh không được chứng nhận an toàn tuyệt đối chỉ từ magic bytes; tải dưới dạng attachment với nosniff và không nhúng tệp người dùng làm nội dung trang. Chưa bổ sung dịch vụ quét mã độc bên ngoài.

## Phạm vi để lại

Các cột hạn tiếp nhận/trả lời đã có từ seed và được khởi tạo để tương thích; chưa chạy SLA/quá hạn/leo thang. Chống spam đối với hồ sơ nghiêm trọng được chặn ngay theo yêu cầu bổ sung; cảnh báo trùng và nghiệp vụ nâng cao theo Tuần 11. Không đánh dấu FR-74/75/80–82/154/156 hoàn tất. Dashboard/xuất file/anomaly theo Tuần 12, ma trận toàn hệ thống theo Tuần 13. Không tự cắt FR-145 còn backlog.

## Kiểm chứng

Xem [nghiệm thu Tuần 10](../NGHIEM_THU_TUAN_10.md), [QA](../QA_GIAO_DIEN_TUAN_10.md), các test gắn BR/TC, bộ HTTP/MySQL riêng và dấu dữ liệu trước/sau. Chỉ dùng dữ liệu giả; không thao tác khóa TOTP của chủ dự án trong tuần này.
