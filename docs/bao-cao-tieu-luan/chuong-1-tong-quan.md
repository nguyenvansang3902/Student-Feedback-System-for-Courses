[CẦN SINH VIÊN ĐỌC VÀ VIẾT LẠI BẰNG LỜI CỦA MÌNH]

# Chương 1. Tổng quan đề tài — bản nháp Tuần 1

## 1.1. Lý do chọn đề tài

Khảo sát môn học là một kênh để cơ sở đào tạo thu thập ý kiến người học phục vụ cải tiến chất lượng. Ngoài điểm đánh giá, sinh viên còn cần một kênh phản hồi về giảng dạy, tài liệu, kiểm tra đánh giá, cơ sở vật chất và lịch học. Bản đặc tả đề tài yêu cầu theo dõi trọn vòng đời của hai kênh này: từ phát hành, tham gia, tổng hợp, công bố đến xử lý và giải trình.

Nếu chỉ dùng biểu mẫu rời, nhóm khó chứng minh được các quy tắc như sinh viên chỉ đánh giá lớp mình học, mỗi người chỉ nộp một lần, phiếu trả lời ẩn danh và kết quả chỉ được công bố khi đủ mẫu. Phản hồi cũng cần người tiếp nhận, thời hạn, lịch sử xử lý và cơ chế leo thang. Vì vậy, đề tài tập trung vào quy trình và các quy tắc có thể kiểm thử, thay vì chỉ xây các màn hình nhập dữ liệu.

## 1.2. Mục tiêu

Mục tiêu tổng quát là xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học, phục vụ nhiều vai trò trong một trường đại học giả định. Hệ thống dự kiến cho phép cán bộ đảm bảo chất lượng tạo mẫu và đợt khảo sát, lãnh đạo phê duyệt, sinh viên nộp phiếu ẩn danh, người có thẩm quyền xem kết quả sau công bố, giảng viên giải trình khi cần, và sinh viên theo dõi phản hồi của mình.

Các mục tiêu cụ thể gồm: (1) mô hình hóa quyền và phạm vi dữ liệu theo vai trò; (2) bảo vệ tính ẩn danh ở mức ứng dụng, đồng thời kiểm soát nộp trùng; (3) tính điểm, áp dụng ngưỡng công bố và lưu lịch sử các trạng thái; (4) định tuyến phản hồi, theo dõi thời hạn và đánh giá mức hài lòng; (5) có dữ liệu giả, kiểm thử và tài liệu để nhóm có thể trình bày, nghiệm thu. Đây là **mục tiêu dự kiến**, chưa phải kết quả đã đạt.

## 1.3. Phạm vi

Phạm vi chức năng và mức ưu tiên được ghi trong `docs/DAC_TA_NGHIEP_VU.md` và `docs/PROGRESS.md`. Kịch bản xuyên suốt UC-GOLD là tiêu chí tích hợp dự kiến vào Tuần 12. Theo đặc tả, kết nối trực tiếp với hệ thống đào tạo, hệ thống điểm hoặc đăng nhập một lần của trường, ứng dụng di động native, thanh toán và ngôn ngữ ngoài tiếng Việt không nằm trong phạm vi hiện tại. Dữ liệu thử nghiệm chỉ là dữ liệu giả.

## 1.4. Cách tiếp cận và kế hoạch

Nhóm dự kiến phân tích nghiệp vụ, lập danh sách yêu cầu và sơ đồ trước khi triển khai các module theo kế hoạch 15 tuần. Mỗi quy tắc nghiệp vụ BR cần ít nhất một test có mã tương ứng. Mỗi tuần phải có bản chạy được và báo cáo dựa trên commit, kết quả kiểm tra thực tế và bảng tiến độ. Kế hoạch bắt đầu ngày **30/09/2026**; công việc thực tế bắt đầu ngày **02/10/2026**. Nếu tính tuần là 7 ngày liên tiếp, Tuần 1 dự kiến từ **30/09 đến 06/10/2026**, nhưng lịch này cần xác nhận theo yêu cầu của trường. Không ghi nhận công việc nào cho ngày 30/09–01/10. Chênh lệch khởi động cần được ghi đúng trong báo cáo Tuần 1 và các báo cáo lũy kế.

## 1.5. Bố cục báo cáo dự kiến

Chương 2 trình bày yêu cầu và quy trình nghiệp vụ đề xuất. Chương 3 mô tả thiết kế kiến trúc, dữ liệu, phân quyền và bảo vệ ẩn danh. Chương 4 trình bày hiện thực. Chương 5 báo cáo kiểm thử, đánh giá và giới hạn. Chương 6 tổng kết và hướng phát triển. Các chương sau chưa được viết tại thời điểm khởi động Tuần 1.

## Việc sinh viên cần xác minh trước khi dùng trong báo cáo chính thức

1. Tên trường, khoa, môn học, thành viên, giảng viên hướng dẫn và mẫu báo cáo của khoa.
2. Nguồn tài liệu được phép trích dẫn; không xem ví dụ trường khác trong đặc tả là quy định của trường mình.
3. Mức độ phù hợp của các mục tiêu và phạm vi với hướng dẫn chính thức của GVHD.
