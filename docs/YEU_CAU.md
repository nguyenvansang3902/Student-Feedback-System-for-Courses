# Yêu cầu chức năng và phi chức năng — Tuần 2

Ngày soạn thực tế: **21/10/2026**. Tuần 2 theo giả định 7 ngày/tuần của kế hoạch là **07–13/10/2026**; nhóm bắt đầu công việc này muộn, không ghi lùi ngày. Đây là bản phân tích thiết kế do AI hỗ trợ để nhóm rà soát, viết lại và bảo vệ.

## 1. Phạm vi và cách đọc

Nguồn chuẩn: [đặc tả nghiệp vụ](DAC_TA_NGHIEP_VU.md), Mục 3–8; mã FR và ưu tiên dưới đây giữ nguyên Mục 7. Có **63 FR** (41 P0, 18 P1, 4 P2). Tính năng P2 chưa xếp tuần không được tự xem là bắt buộc triển khai trong Tuần 2 hay đã bị bỏ. Các giá trị mặc định trong đặc tả phải cấu hình được.

Tuần 2 tạo yêu cầu, sơ đồ, ma trận quyền, thiết kế dữ liệu và migration nền. **Tiêu chí trong tài liệu này là tiêu chí nghiệm thu dự kiến**, không phải kết quả chạy. Trạng thái chức năng đã nghiệm thu xem [PROGRESS.md](PROGRESS.md); không đánh dấu hoàn thành một FR chỉ vì đã có bảng hoặc sơ đồ. FR-102 có bằng chứng Tuần 1 về sức khỏe ứng dụng; không suy ra rằng health check đã kiểm toàn bộ DB/nghiệp vụ. Không triển khai giao diện hay service chức năng ở Tuần 2.

Không viết quy trình hiện tại của trường theo yêu cầu của người dùng. Quy trình được phân tích là quy trình **đề xuất cho sản phẩm**; không có tuyên bố đã khảo sát trường cụ thể. Ngoài phạm vi: tích hợp thật hệ thống đào tạo/điểm/SSO, ứng dụng native, thanh toán, đa ngôn ngữ ngoài tiếng Việt; chỉ import và điểm mở rộng dự kiến.

## 2. Danh sách 63 yêu cầu chức năng

Các phép thử dưới đây phải chạy bằng dữ liệu giả. Mọi phép đọc/ghi còn chịu [ma trận phân quyền](PHAN_QUYEN.md), thời điểm công bố, ngưỡng mẫu và trạng thái học kỳ; không lặp các điều kiện đó trong từng dòng.

### M1. Xác thực và phiên

| Mã | Ưu tiên | Yêu cầu | Tiêu chí nghiệm thu dự kiến |
| --- | --- | --- | --- |
| FR-01 | P0 | Đăng nhập bằng mã định danh (mã SV/GV) hoặc email. | Cả hai loại định danh hợp lệ đăng nhập được; sai mật khẩu và tài khoản không tồn tại trả lỗi chung, không lộ tài khoản. BR-31, BR-33. |
| FR-02 | P0 | Phiên JWT, đăng xuất, thu hồi. | Access ngắn hạn; refresh xoay vòng lưu băm; dùng lại refresh cũ thu hồi chuỗi; logout/khóa tài khoản khiến phiên không còn dùng được. BR-31. |
| FR-03 | P0 | Đổi mật khẩu. | Kiểm mật khẩu hiện tại; mật khẩu mới đạt quy tắc; sau đổi mọi phiên cũ bị thu hồi, mật khẩu cũ bị từ chối. BR-31. |
| FR-04 | P1 | Quên/đặt lại mật khẩu qua email: token một lần, hết hạn 30 phút. | Mailpit có thư; token hết hạn/đã dùng bị từ chối; DB chỉ lưu băm; thông báo yêu cầu không tiết lộ tài khoản tồn tại. |
| FR-05 | P0 | Kích hoạt lần đầu hoặc mật khẩu tạm buộc đổi. | Tài khoản nhập chưa kích hoạt không truy cập nghiệp vụ; hoàn tất kích hoạt/đổi mật khẩu tạm rồi mới có phiên đầy đủ. |
| FR-06 | P0 | Giới hạn tần suất và khóa tạm. | Sai 5 lần trong 15 phút khóa 15 phút; thử theo tài khoản/IP; quá hạn khóa có thể thử lại; giới hạn cả OTP/reset/nộp phiếu/phản hồi. BR-33. |
| FR-07 | P0 | TOTP cho ADMIN: QR, xác nhận, mã khôi phục, đặt lại. | ADMIN chưa đăng ký chỉ tới đăng ký; token tạm không vào quản trị; kiểm mã sai/hết hạn/dùng lại và mã khôi phục một lần; reset có audit. BR-32. |
| FR-08 | P1 | Bắt buộc 2FA cho vai trò khác theo cấu hình. | Bật chính sách cho một vai trò khiến tài khoản vai trò đó phải hoàn tất 2FA; người không thuộc vai trò không bị buộc ngoài cấu hình. |
| FR-09 | P2 | Xem và đăng xuất các thiết bị. | Chỉ xem phiên của mình; thu hồi thiết bị chọn thì refresh bị chặn; không lộ refresh token hay phiên người khác. |

### M2. Người dùng, phân quyền và kiểm toán

| Mã | Ưu tiên | Yêu cầu | Tiêu chí nghiệm thu dự kiến |
| --- | --- | --- | --- |
| FR-10 | P0 | Quản lý người dùng: tạo, khóa/mở, gán vai trò và phạm vi. | ADMIN có MFA tạo/khóa/gán đúng phạm vi; dữ liệu sai bị chặn; thao tác nhạy cảm có audit; khóa thu hồi phiên. BR-18, BR-30, BR-32. |
| FR-11 | P0 | Policy tập trung theo vai trò và phạm vi. | Service nhận actor, kiểm policy trước truy cập; test cả tài nguyên mình/người khác/ngoài phạm vi; ADMIN đơn vai trò bị chặn nội dung nghiệp vụ. BR-18, BR-34. |
| FR-12 | P0 | Xem và lọc nhật ký kiểm toán. | ADMIN có MFA lọc theo actor/hành động/đối tượng/thời gian; người khác bị chặn; nhật ký không chứa bí mật/nội dung phiếu. BR-30. |

### M3. Danh mục và nhập liệu

| Mã | Ưu tiên | Yêu cầu | Tiêu chí nghiệm thu dự kiến |
| --- | --- | --- | --- |
| FR-20 | P0 | CRUD học kỳ (có khóa sổ), khoa, bộ môn, môn, lớp học phần, phân công giảng viên. | Ràng buộc tham chiếu đúng; học kỳ khóa sổ chỉ đọc, không tạo đợt/phản hồi; không xóa dây chuyền dữ liệu nghiệp vụ ngoài chính sách. BR-17. |
| FR-21 | P0 | Import Excel/CSV SV, GV, lớp, đăng ký; chạy thử và lỗi từng dòng. | Dry-run không ghi DB; tệp đúng nhập đúng; tệp sai trả số dòng/cột/lỗi; nhập lặp không sinh đăng ký trùng; không đổi nhiệm vụ đã chốt. BR-01. |
| FR-22 | P0 | Tải mẫu file import. | Mỗi loại import tải được mẫu đúng cột/định dạng, có ví dụ giả và giải thích trường bắt buộc; mẫu được dry-run chấp nhận. |

### M4. Mẫu phiếu

| Mã | Ưu tiên | Yêu cầu | Tiêu chí nghiệm thu dự kiến |
| --- | --- | --- | --- |
| FR-30 | P0 | Soạn mẫu: nhóm tiêu chí, câu hỏi, thứ tự. | Tạo/sửa/sắp xếp được mẫu chưa khóa; lưu và xem lại đúng nhóm/câu/thứ tự; mẫu khóa không sửa được. BR-05. |
| FR-31 | P0 | Loại câu hỏi, bắt buộc, Không áp dụng, trọng số. | Đủ Likert 1–4/1–5, chọn một/nhiều, tự luận, Có/Không; câu bắt buộc, NA và trọng số được kiểm phía máy chủ. BR-04, BR-11. |
| FR-32 | P0 | Phiên bản và khóa mẫu. | Phê duyệt đợt khóa phiên bản đã tham chiếu; đổi mẫu phải tạo phiên bản mới; kết quả cũ vẫn đọc đúng câu hỏi cũ. BR-05. |
| FR-33 | P0 | Xem trước mẫu. | Xem trước phản ánh cấu hình form và không tạo SurveyTask/SurveyResponse hay tính vào kết quả. |
| FR-34 | P1 | Nhân bản mẫu. | Bản sao độc lập có mã/phiên bản riêng, chỉnh bản sao không đổi mẫu nguồn đã khóa. |
| FR-35 | P1 | Mẫu mặc định có sẵn. | Seed tạo mẫu tiếng Việt đủ loại câu; chọn được mẫu/phiên bản mặc định cho đợt nháp. |

### M5. Đợt khảo sát

| Mã | Ưu tiên | Yêu cầu | Tiêu chí nghiệm thu dự kiến |
| --- | --- | --- | --- |
| FR-40 | P0 | Tạo/sửa đợt. | Nháp có học kỳ, mẫu, thời gian hợp lệ; đợt duyệt không đổi mẫu/phạm vi nếu chưa rút về nháp; kỳ khóa sổ bị chặn. BR-06, BR-17. |
| FR-41 | P0 | Phạm vi toàn trường/khoa/bộ môn/danh sách lớp. | Mỗi loại phạm vi chọn đúng lớp; lớp lặp chỉ tạo một nhiệm vụ; lớp nhiều GV mặc định đánh giá ở mức lớp. BR-01, BR-16. |
| FR-42 | P0 | Trình, duyệt, từ chối. | Chỉ ĐBCL trình và lãnh đạo duyệt/từ chối; từ chối thiếu lý do bị chặn; lưu lịch sử; không mở khi chưa duyệt. BR-06. |
| FR-43 | P0 | Chốt danh sách và sinh nhiệm vụ khi mở. | Unique đợt/lớp/SV; sau mở đổi đăng ký không ảnh hưởng danh sách đã chốt; chạy mở lặp/đồng thời không thêm trùng. BR-01. |
| FR-44 | P0 | Tự động mở/đóng, idempotent. | Scheduler và truy cập đầu tiên sau hạn đều bảo đảm trạng thái đúng; chạy đồng thời chỉ một chuyển trạng thái/hành động; giờ máy chủ quyết định. BR-04, BR-06. |
| FR-45 | P1 | Gia hạn, đóng sớm, hủy. | ĐBCL có lý do/audit; chỉ gia hạn lúc đang mở, không giảm hạn; hủy chỉ trước mở; không mở lại đợt đóng qua gia hạn; thông báo SV. BR-06, BR-15. |
| FR-46 | P0 | Theo dõi tiến độ, tỉ lệ tham gia. | DONE/tổng task theo lớp và phạm vi đúng; tổng bằng 0 xử lý rõ; không hiện nội dung phiếu hoặc ghép với danh tính. BR-12, BR-13. |
| FR-47 | P1 | Nhắc SV chưa hoàn thành. | Chỉ nhắc PENDING, tối đa 1 lần/ngày/SV/đợt kể cả job lặp; xem/xuất danh sách có audit và không kèm phiếu. BR-13. |

### M6. Làm khảo sát

| Mã | Ưu tiên | Yêu cầu | Tiêu chí nghiệm thu dự kiến |
| --- | --- | --- | --- |
| FR-50 | P0 | Danh sách khảo sát của SV: hạn chót, trạng thái. | Chỉ nhiệm vụ của chính SV, lớp đã chốt đúng; biết còn phải làm/đã làm/hết hạn; đổi ID không xem nhiệm vụ người khác. BR-01, BR-34. |
| FR-51 | P0 | Form động, tiến trình, kiểm tra hợp lệ. | Câu hỏi phản ánh phiên bản; server chặn bỏ câu bắt buộc/giá trị sai; chỉ nộp khi DANG_MO và giờ trong đoạn bắt đầu–kết thúc. BR-04. |
| FR-52 | P1 | Nháp phía trình duyệt. | Nháp lưu cục bộ, khôi phục đúng phiên bản; không có API/bảng lưu nháp trên server; không lưu token trong localStorage. BR-03. |
| FR-53 | P0 | Nộp ẩn danh một lần. | Task PENDING→DONE và insert phiếu/câu trả lời trong một transaction; 20 request đồng thời chỉ 1 phiếu; schema không có đường tới User/SurveyTask. BR-02, BR-03. |
| FR-54 | P0 | Xác nhận đã nộp. | Thành công hiện đã nộp từ trạng thái task, không hiện nội dung hoặc ID giúp ghép phiếu; không cho sửa/xóa/nộp lại. BR-02, BR-03. |

### M7. Kết quả

| Mã | Ưu tiên | Yêu cầu | Tiêu chí nghiệm thu dự kiến |
| --- | --- | --- | --- |
| FR-60 | P0 | Tổng hợp. | TC-AGG-01 ra tổng 4,11 và tham gia 40%; loại NA/bỏ trống; chỉ làm tròn cuối 2 số; tổng hợp lặp không nhân bản. BR-11, BR-12. |
| FR-61 | P0 | Ngưỡng công bố. | Mặc định số phiếu ≥5 **và** tỉ lệ ≥30%; test đúng biên/thiếu một điều kiện/0 task; thiếu mẫu chỉ hiện thông báo và gộp đúng quyền. BR-07. |
| FR-62 | P0 | Công bố. | Chỉ ĐBCL, từ DA_TONG_HOP sau kiểm duyệt; không công bố chi tiết lớp thiếu ngưỡng; audit và thông báo; chuyển lặp an toàn. BR-07, BR-09. |
| FR-63 | P0 | Trang kết quả theo vai trò và phạm vi. | GV/trưởng đơn vị chỉ sau DA_CONG_BO; ĐBCL/lãnh đạo từ DA_TONG_HOP; SV/ADMIN không được; không vượt lớp/bộ môn/khoa và ngưỡng. BR-07, BR-08, BR-18. |
| FR-64 | P1 | So sánh bộ môn/khoa/kỳ trước. | Trung bình đơn vị tính trên toàn phiếu, không lấy trung bình trung bình lớp sai trọng số; thiếu kỳ trước hiển thị rõ; không suy ngược lớp thiếu mẫu. BR-07, BR-11. |
| FR-65 | P1 | Kiểm duyệt góp ý tự luận. | ĐBCL HIEN_THI/DA_AN có người, lý do; từ khóa chỉ gắn cờ; GV/trưởng đơn vị không xem CHO_KIEM_DUYET hoặc DA_AN. BR-09. |
| FR-66 | P1 | Giải trình và xác nhận. | Điểm dưới 3,0 mặc định sinh một yêu cầu, hạn 14 ngày; đúng GV gửi, TBM yêu cầu bổ sung/xác nhận; bổ sung gửi lại DA_GUI rồi xét. BR-10. |

### M8. Phản hồi

| Mã | Ưu tiên | Yêu cầu | Tiêu chí nghiệm thu dự kiến |
| --- | --- | --- | --- |
| FR-70 | P0 | Gửi phản hồi: loại, mức độ, ẩn danh, tệp. | Chỉ lớp đã/đang học kỳ hiện hành/liền trước cấu hình; tối đa 3 tệp ≤5 MB PNG/JPG/PDF đúng magic bytes; tải riêng có policy; không lộ danh tính ẩn danh. BR-20, BR-24, BR-28. |
| FR-71 | P0 | Định tuyến và hàng đợi xử lý. | Mỗi loại đúng người nhận, kiểm tra/đánh giá đồng gửi TBM, khiếu nại luôn đồng gửi TBM; không thấy hàng đợi khác phạm vi. BR-21. |
| FR-72 | P0 | Trạng thái và lịch sử. | Chỉ cạnh hợp lệ trong sơ đồ được chấp nhận; cạnh sai không đổi dữ liệu; lịch sử bất biến; SLA không phải trạng thái. BR-22. |
| FR-73 | P0 | Trao đổi qua lại. | SV của phản hồi và người xử lý được phân công trao đổi; ẩn danh giữ nguyên; đổi ID người ngoài bị chặn; học kỳ khóa chỉ đọc. BR-17, BR-24, BR-34. |
| FR-74 | P1 | SLA, quá hạn, leo thang. | Bỏ T7/CN; nhận ≤2 ngày làm việc, trả lời ≤7 hoặc ≤5 cho khiếu nại; quá hạn gắn cờ và leo GV→TBM→TK→ĐBCL đúng một lần/mốc. BR-23. |
| FR-75 | P1 | Hài lòng và mở lại. | Chỉ SV chủ phản hồi đánh giá 1–5 trong 7 ngày sau trả lời; điểm ≤2, đã đóng, trong hạn và chưa mở lại mới được MO_LAI về DANG_XU_LY. BR-25. |
| FR-76 | P0 | Chuyển tiếp/từ chối có lý do. | Người có trách nhiệm mới thực hiện; thiếu lý do/đích không hợp lệ bị chặn; chuyển tiếp là sự kiện về MOI tại người nhận, từ chối về TU_CHOI và giữ lịch sử. BR-21, BR-22. |

### M9. Thông báo

| Mã | Ưu tiên | Yêu cầu | Tiêu chí nghiệm thu dự kiến |
| --- | --- | --- | --- |
| FR-80 | P0 | Thông báo trong ứng dụng. | Chỉ người nhận xem/đánh dấu đã đọc; liên kết vẫn kiểm quyền; không chứa nội dung phiếu hoặc danh tính bị ẩn; gửi lặp không nhân đôi cùng sự kiện. |
| FR-81 | P1 | Email: Mailpit dev, SMTP triển khai. | Mailpit nhận đúng người/sự kiện; lỗi gửi có thể thử lại an toàn; không lộ token trong log hoặc danh tính SV ẩn danh cho người xử lý. |
| FR-82 | P1 | Nhắc hạn. | Chỉ đối tượng chưa hoàn thành/còn trách nhiệm; áp giới hạn khảo sát 1 lần/ngày/SV/đợt; job lặp không gửi trùng và ngừng khi xong/khóa sổ. BR-13, BR-23. |

### M10. Báo cáo

| Mã | Ưu tiên | Yêu cầu | Tiêu chí nghiệm thu dự kiến |
| --- | --- | --- | --- |
| FR-90 | P0 | Dashboard theo vai trò. | Số liệu đúng quyền/phạm vi, thời điểm công bố và ngưỡng; SV chỉ số việc cá nhân, ADMIN chỉ vận hành, không hiển thị kết quả/nội dung nghiệp vụ. BR-07, BR-08, BR-18. |
| FR-91 | P1 | Biểu đồ. | Khớp bảng số liệu cùng bộ lọc, có nhãn tiếng Việt/bảng thay thế, không rò dữ liệu lớp thiếu mẫu qua tooltip hoặc API. |
| FR-92 | P0 | Xuất Excel/CSV. | File giữ đúng bộ lọc/quyền/ngưỡng như màn hình, không định danh phiếu hoặc thứ tự nộp; tách riêng danh sách PENDING có audit theo BR-13. BR-03, BR-07. |
| FR-93 | P1 | Xuất PDF. | Dữ liệu và điều kiện bằng xuất Excel/CSV, tiếng Việt không lỗi dấu, in đúng trang, không có trường ẩn nhạy cảm. |
| FR-94 | P1 | Báo cáo phản hồi: số lượng, thời gian, quá hạn, hài lòng. | Số liệu từ lịch sử, tính theo bộ lọc/phạm vi; không lộ danh tính ẩn danh hoặc cho lãnh đạo/ADMIN quyền đọc nội dung chi tiết ngoài ma trận. |

### M11. Hệ thống

| Mã | Ưu tiên | Yêu cầu | Tiêu chí nghiệm thu dự kiến |
| --- | --- | --- | --- |
| FR-100 | P0 | Cấu hình ngưỡng. | ADMIN có MFA chỉnh mặc định hệ thống; ĐBCL chỉnh ngưỡng theo đợt khi hợp lệ; minResponses, minRate, SLA, cảnh báo, giới hạn gửi được validate/audit, không âm/sai miền. |
| FR-101 | P0 | Dữ liệu demo (seed). | Có small/medium/large, đủ 7 vai trò và dữ liệu nghiệp vụ mẫu theo 8.7; chỉ giả; mật khẩu demo bị chặn production; không tự reset DB có dữ liệu. |
| FR-102 | P0 | Health check. | Endpoint báo sức khỏe ứng dụng, không lộ bí mật; nói rõ DB có/không được kiểm. Tuần 1 đã kiểm app, việc kiểm DB riêng phải có bằng chứng riêng. |
| FR-103 | P1 | Script sao lưu/khôi phục. | Sao lưu rồi khôi phục vào DB kiểm thử riêng, đối chiếu số bản ghi/ràng buộc; tài liệu quyền/biến môi trường; không tự ghi đè/xóa DB đang dùng. |

### M12. Mở rộng

| Mã | Ưu tiên | Yêu cầu | Tiêu chí nghiệm thu dự kiến |
| --- | --- | --- | --- |
| FR-110 | P2 | AI gợi ý chủ đề/cảm xúc tự luận. | Tắt mặc định; chỉ gửi sau đồng ý và ẩn danh hóa; gợi ý không tự công bố/kiểm duyệt; khóa API không lộ; chưa xếp tuần. |
| FR-111 | P2 | API trạng thái hoàn thành. | Chỉ hệ thống/tài khoản được cấp quyền, trả trạng thái trong phạm vi, không trả câu trả lời; không tích hợp thật hệ thống điểm; chưa xếp tuần. BR-14. |
| FR-112 | P2 | Đánh giá riêng từng giảng viên. | Giữ phân biệt lớp/GV, không nhân số lần nộp ngoài quy tắc đã duyệt, có ngưỡng bảo vệ; mô hình chi tiết phải được duyệt trước triển khai; chưa xếp tuần. |

## 3. Yêu cầu phi chức năng có mã

Mức bắt buộc dưới đây là yêu cầu kỹ thuật rút từ đặc tả, không tạo FR mới hay thay trọng số tiến độ. Các mục “mục tiêu đề xuất” chưa có kết quả đo và không được ghi là đã đạt.

| Mã | Thuộc tính / yêu cầu | Cách nghiệm thu dự kiến và bằng chứng cần lưu |
| --- | --- | --- |
| NFR-01 | Ẩn danh khảo sát ở mức ứng dụng. UUID cho response/answer; ngày DATE, không IP/UA/định danh; không nối về User/Task. | Test DMMF duyệt đường quan hệ có hướng từ SurveyResponse/SurveyAnswer; kiểm trường bị cấm cả scalar/quan hệ; rà log/export; trộn thứ tự hiển thị/xuất. Tuần 2 chỉ nghiệm thu schema, các test nộp/export thuộc tuần sau. |
| NFR-02 | Chặn trùng và nguyên tử. | 20 request cùng task chỉ 1 response; giả lập lỗi insert answer rollback task và phiếu; unique DB task và conditional update. Chạy trên MySQL thật, lưu số đếm thực. |
| NFR-03 | Phân quyền tại service/dữ liệu, từ chối mặc định. | Bộ test 7 vai trò × hành động × own/other/different-scope; bỏ middleware vẫn bị chặn; list/detail/export/download cùng policy. Không có actor hoặc không có gán đúng phạm vi phải từ chối. |
| NFR-04 | Mật khẩu bcrypt cost ≥12, 10 ký tự tối thiểu, ≤72 byte, chặn phổ biến. | Thử đúng biên byte tiếng Việt, mật khẩu phổ biến; xem hash không phải plaintext; tài khoản không có vẫn chạy compare giả; không log mật khẩu. |
| NFR-05 | Access JWT mặc định 15 phút, cố định thuật toán, iss/aud/exp/sub; refresh 256-bit lưu băm và xoay vòng. | Thử JWT sai chữ ký/thuật toán/audience/hết hạn, refresh dùng lại và khóa/logout; không có token trong localStorage, log hay DB dạng rõ. |
| NFR-06 | Cookie và CSRF. | Cookie httpOnly, Secure production, SameSite=Lax, refresh path /api/auth; Origin lạ bị chặn với ghi; quản trị nhạy cảm còn kiểm CSRF token; GET không gây ghi nghiệp vụ. |
| NFR-07 | TOTP ADMIN bắt buộc. | RFC 6238, 6 số/30 giây/±1; 10 mã phục hồi lưu băm; secret AES-256-GCM; thử sai/hết hạn/replay/bỏ bước 2/token tạm; mọi route quản trị kiểm ADMIN và mfa=true. |
| NFR-08 | Khóa và rate limit chống dò/chống spam. | Sai 5 lần/15 phút khóa 15 phút; thử login/OTP/reset/nộp/gửi; phản hồi mặc định 5/ngày và cảnh báo trùng 24h; lỗi không tiết lộ tài khoản. |
| NFR-09 | Tệp an toàn. | Tối đa 3 ×5 MB PNG/JPG/PDF; thử đổi đuôi giả, magic bytes sai, path traversal, tải ID khác; tên ngẫu nhiên, ngoài public, route kiểm policy trước đọc. |
| NFR-10 | Audit bất biến, log che nhạy cảm. | Ghi actor/thời gian/action/object/tóm tắt cho thao tác nhạy cảm và xem/xuất PENDING; không cung cấp sửa/xóa lịch sử nghiệp vụ; kiểm mẫu log không có password/token/phiếu hoặc liên kết danh tính–phiếu. |
| NFR-11 | Chuyển trạng thái/job idempotent, an toàn đồng thời, không phụ thuộc cron đúng giờ. | Gọi đồng thời/lặp scheduler và ensure từ request; chỉ một tác dụng/lịch sử/thông báo theo khóa sự kiện; chuyển sai trạng thái bị chặn; tắt scheduler rồi truy cập sau hạn vẫn đúng. |
| NFR-12 | Toàn vẹn, thời gian và tiếng Việt trong DB. | MySQL8/InnoDB/utf8mb4, FK/unique/index, thời gian UTC hiển thị Asia/Ho_Chi_Minh; ngày nộp chỉ DATE; test ranh giới ngày, T7/CN và SLA; học kỳ khóa chỉ đọc. |
| NFR-13 | Đúng công thức và ngưỡng bảo vệ. | TC-AGG-01 =4,11/40%; NA không làm giảm điểm; làm tròn cuối; thử cả hai ngưỡng 5/30% và ngưỡng tùy cấu hình; API/export không lộ lớp thiếu mẫu. |
| NFR-14 | Đầu vào và bảo mật nội dung. | Zod server cho mọi đầu vào; Prisma tham số hóa; thử HTML/script/SQL và dữ liệu không hợp lệ; thông báo tiếng Việt không lộ stack; CSP/frame-ancestors/nosniff/referrer/permissions/HSTS production được đọc từ HTTP thực. |
| NFR-15 | Khả dụng trên điện thoại và bàn phím. | Mục tiêu thiết kế đề xuất: ở 360px và desktop không mất trường/nút; hoàn thành form bằng bàn phím; focus rõ, label/lỗi đọc được, biểu đồ có bảng thay thế; nhóm kiểm thực khi có UI, chưa nhận chứng nhận WCAG. |
| NFR-16 | Hiệu năng đo được với tải nhẹ. | Mục tiêu đề xuất cho mốc Tuần 13: 200 request nộp đồng thời trên máy/DB ghi cấu hình, p95 ≤3s, lỗi ngoài từ chối hợp lệ <1%, không phiếu trùng; báo số đo thật và chênh lệch, chưa có benchmark ở Tuần 2. Danh sách phải phân trang, kiểm N+1. |
| NFR-17 | Chất lượng và tái lập. | TypeScript strict; lint/typecheck/test không fail; lockfile; CI dùng MySQL thật; mỗi BR ít nhất một test gắn mã khi triển khai; npm run check trước báo xong; không coi test thiết kế là E2E nghiệp vụ. |
| NFR-18 | Khôi phục và vận hành. | Mục tiêu đề xuất Tuần 14: hướng dẫn chạy lại từ checkout bằng env giả; diễn tập backup/restore DB riêng, ghi thời gian và kiểm toàn vẹn; chưa cam kết RPO/RTO khi chưa có đo, không tự xóa DB. |
| NFR-19 | Bí mật và cấu hình. | Env kiểm Zod fail rõ khi thiếu; khóa ≥32 byte ngẫu nhiên, có hướng dẫn xoay; chỉ .env.example trong Git; demo/password seed không chạy production; không gửi dữ liệu thật hoặc AI ngoài đồng ý. |
| NFR-20 | Khả năng truy vết và trung thực báo cáo. | Mã FR/BR liên kết thiết kế–màn hình dự kiến–test; log ngày thực và kết quả thật; chỉ tick sau test và nghiệm thu; P2/mục tiêu hiệu năng chưa chạy ghi đúng trạng thái; không bịa đóng góp nhóm. |

## 4. Các quyết định cần phân biệt với yêu cầu nguồn

1. Vai trò vận hành danh mục/import và báo cáo xuất chưa được đặc tả gán tường minh từng nút. [PHAN_QUYEN.md](PHAN_QUYEN.md) đề xuất ĐBCL quản lý danh mục; quyền xuất kế thừa quyền xem cùng phạm vi, nội dung, trạng thái và ngưỡng. ADMIN không được xem nghiệp vụ qua nhập/xuất. Đây là chính sách thiết kế sẽ kiểm lại trước tuần chức năng tương ứng.
2. Đặc tả yêu cầu có thể rút đợt được duyệt về NHAP để thay mẫu/phạm vi; đề xuất ĐBCL thực hiện có lý do trước mở, cần duyệt lại. Không dùng thao tác này sau DANG_MO và không tự mở khóa phiên bản đã khóa vì có thể dùng ở đợt khác.
3. Cách đóng phản hồi, nguồn thời gian 7 ngày mở lại và ai được chuyển/từ chối được làm rõ trong [sơ đồ nghiệp vụ](SO_DO_NGHIEP_VU.md) như quyết định đề xuất; không ngầm coi CHUYEN_TIEP/MO_LAI là trạng thái DB.
4. P2 đánh giá riêng GV có yêu cầu, nhưng chi tiết thang đo/mỗi người nộp còn phải được duyệt trước triển khai. Không thêm mô hình nghiệp vụ hoàn thiện hoặc tick FR-112 chỉ vì đã giữ mã trong tài liệu.

## 5. Hồ sơ nghiệm thu Tuần 2

- Đối chiếu đủ 63 mã/ưu tiên với Mục 7; NFR-01…NFR-20 mỗi mục có phép kiểm dự kiến.
- Mở Mermaid trong [SO_DO_NGHIEP_VU.md](SO_DO_NGHIEP_VU.md); đọc cùng ma trận quyền, ERD và tài liệu kiến trúc do nhóm cập nhật.
- Nghiệm thu kỹ thuật riêng: migration nền chạy sạch và test DMMF ẩn danh xanh, có kết quả thật do phiên chính ghi. Việc có schema thiết kế đầy đủ không có nghĩa các bảng khảo sát/phản hồi hay service đã được triển khai.
- Kết quả test, migration, CI và phần còn tồn tại được ghi tại PROJECT_STATE/AI_USAGE/báo cáo Tuần 2 bởi phiên chính; tài liệu yêu cầu này không tự nhận các phép kiểm tương lai đã chạy.
