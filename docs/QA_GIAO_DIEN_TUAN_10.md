# Kiểm tra giao diện Tuần 10

Lượt trình duyệt thực hiện **01/11/2026**; đối chiếu và hoàn thiện báo cáo **02/11/2026**. Phạm vi: FR-70–73/76, FR-146/149/153/155 và phần tiếp nhận ban đầu của FR-154. Không nhận nghiệm thu các bước xác minh/kết luận Thanh tra, SLA, leo thang, hài lòng hoặc mở lại của Tuần 11.

**Kết quả:** đã quan sát bốn vai trò, xem lại đủ **14 ảnh JPG thực tế**, và đi trọn luồng phản hồi thường trên giao diện: sinh viên gửi ẩn danh → giảng viên tiếp nhận/bắt đầu/trả lời → sinh viên đọc và đóng. Các thao tác chưa bấm trên trình duyệt được ghi riêng, không dùng kết quả HTTP để gọi là đã kiểm UI.

## Môi trường và dữ liệu

- Trình duyệt trong ứng dụng, Next dev Webpack tại `http://127.0.0.1:3003`; web chính cổng 3000 dừng trong lượt QA riêng. Đây không phải ảnh bản production.
- Bốn vai trò đã dùng: sinh viên, giảng viên, Thanh tra và lãnh đạo. Chỉ dùng tài khoản/dữ liệu demo giả; không dùng ADMIN của chủ dự án, QR, mã xác minh hoặc mã khôi phục cá nhân.
- Vùng xem mặc định có `innerWidth=1280`; hai lượt mobile đặt 390×844. Ảnh toàn trang có thể hẹp hơn vùng xem do thanh cuộn của trình duyệt.
- Phản hồi thử được tạo mới bằng biểu mẫu; giữ phản hồi và lịch sử giả sau khi thử, không xóa lịch sử trên database chính. ID đối chiếu nằm trong kết quả cục bộ, không cần đưa vào báo cáo công khai.
- Không ghi mật khẩu, cookie hoặc token vào ảnh hay JSON. Tên/tài khoản/email xuất hiện trong ảnh chỉ là dữ liệu demo của trang dành cho chính sinh viên hoặc hồ sơ đã chọn cho Thanh tra biết danh tính.

## Đối chiếu từng nhóm kiểm

| Nhóm | Kết quả thực tế | Phần chưa kiểm bằng UI |
| --- | --- | --- |
| 01 — Sinh viên | Đăng nhập bằng biểu mẫu; thấy menu, danh sách bốn phản hồi seed và mở chi tiết. | Chưa bấm bộ lọc hoặc kiểm danh sách rỗng. |
| 02 — Gửi phản hồi | Tám loại, ba mức độ, mặc định ẩn danh; danh sách lớp có các lựa chọn kỳ khóa bị vô hiệu hóa. Gửi một phản hồi giả mới qua biểu mẫu. | Quyền từng lớp và cửa sổ học kỳ được kiểm rộng hơn bằng HTTP. |
| 03 — Phúc khảo | API cấu hình và lời nhắc đã qua HTTP/MySQL. | Chưa chọn loại thi cuối kỳ rồi quan sát lời nhắc trên trình duyệt. |
| 04 — Khiếu nại chính thức | Đổi loại trên form: mức KHIEU_NAI cố định, năm loại vi phạm, mặc định ẩn danh hoàn toàn, có lựa chọn chỉ Thanh tra biết và ô xác nhận chưa được chọn sẵn. | Chưa gửi khiếu nại nghiêm trọng bằng UI; validation/giới hạn gửi đã qua HTTP và unit. |
| 05 — Giảng viên | Mở phản hồi mới, thấy “Sinh viên ẩn danh” ở thông tin và lịch sử; không thấy tài khoản/email sinh viên. Có thao tác đúng trạng thái tiếp nhận/xử lý/trả lời. | Không nhận đã kiểm toàn bộ hàng đợi và phạm vi chỉ từ một chi tiết; phần đó có HTTP/policy tests. |
| 06 — Quy trình thường | Đã bấm tiếp nhận, bắt đầu xử lý, trả lời; sinh viên đăng nhập lại, đọc trả lời và đóng. Ảnh cuối hiện DA_DONG, năm mốc lịch sử và không còn form ghi. | Không kiểm hài lòng hoặc mở lại vì thuộc Tuần 11. |
| 07 — Trao đổi/tệp | Quan sát form trao đổi, trường có nhãn, hướng dẫn ba tệp/5 MB và cảnh báo tên/nội dung tệp có thể tiết lộ danh tính. | Không tải tệp, gửi tin nhắn riêng, chuyển tiếp hoặc từ chối bằng UI. Các luồng này đã kiểm HTTP/MySQL. |
| 08 — Thanh tra | Danh sách hai hồ sơ TIEP_NHAN; mở hồ sơ mặc định ẩn danh và hồ sơ cho Thanh tra biết danh tính. Hồ sơ chỉ có giao xử lý/trao đổi, không có nút bước Tuần 11. | Chưa thực hiện giao người xử lý bằng UI; chặn người xung đột, audit, giao và tải chứng cứ đã kiểm bằng HTTP. |
| 09 — Lãnh đạo | Mở cùng hồ sơ chỉ thấy loại/trạng thái/kết luận tóm tắt. DOM xác nhận không có tài khoản/email sinh viên hoặc nội dung khiếu nại. | Không suy quyền dashboard/xuất file của các tuần sau. |
| 10 — Đào tạo/Khảo thí/ĐBCL | Hàng đợi và cấu hình theo vai trò đã qua HTTP/MySQL. | Chưa hoàn tất lượt trình duyệt riêng cho ba vai trò; không tính là UI đã qua. |
| 11 — Bố cục/thao tác | Desktop và hai ảnh mobile đã xem; các phép DOM ghi nhận không tràn ngang và không có thuộc tính placeholder ở input/textarea. Nhãn/hướng dẫn nằm ngoài ô nhập, chữ dài xuống dòng. | Chưa rà bàn phím, trình đọc màn hình, tỉ lệ tương phản hoặc toàn bộ console; không chứng nhận WCAG hay mọi thiết bị. |

## Ảnh đã mở xem

Tất cả ảnh bên dưới được chụp từ trình duyệt đang chạy, giữ nguyên tệp gốc và được mở xem lại ngày 02/11. Không dựng lại giao diện bằng ảnh minh họa.

| Nhóm ảnh | Bằng chứng |
| --- | --- |
| Danh sách và form sinh viên | [Danh sách](assets/tuan-10/ui/sinh-vien-danh-sach.jpg), [form thường](assets/tuan-10/ui/sinh-vien-form.jpg), [form nghiêm trọng](assets/tuan-10/ui/sinh-vien-nghiem-trong.jpg), [form mobile](assets/tuan-10/ui/sinh-vien-mobile.jpg) |
| Phản hồi mới và quyền giảng viên | [Sinh viên xem chi tiết](assets/tuan-10/ui/sinh-vien-chi-tiet.jpg), [giảng viên thấy ẩn danh](assets/tuan-10/ui/giang-vien-an-danh.jpg) |
| Trả lời và đóng | [Giảng viên đã trả lời](assets/tuan-10/ui/giang-vien-da-tra-loi.jpg), [sinh viên nhận trả lời](assets/tuan-10/ui/sinh-vien-nhan-tra-loi.jpg), [sinh viên đã đóng](assets/tuan-10/ui/sinh-vien-da-dong.jpg) |
| Thanh tra | [Danh sách](assets/tuan-10/ui/thanh-tra-danh-sach.jpg), [ẩn danh](assets/tuan-10/ui/thanh-tra-an-danh.jpg), [danh tính được cho phép](assets/tuan-10/ui/thanh-tra-danh-tinh-cho-phep.jpg), [hồ sơ mobile](assets/tuan-10/ui/thanh-tra-mobile.jpg) |
| Lãnh đạo | [Bản tóm tắt](assets/tuan-10/ui/lanh-dao-tom-tat.jpg) |

Quan sát ảnh: các khối nội dung, thông tin và lịch sử không chồng lấn trong phần ứng dụng; mobile chuyển sang một cột, tiêu đề và lời nhắc xuống dòng. Có biểu tượng/chỉ báo Next dev ở góc hoặc cạnh trái; ảnh hồ sơ mobile có chữ “Compiling…”. Chỉ báo phát triển có thể che một phần nhỏ của trường, vì vậy không gọi các ảnh này là bằng chứng hiển thị production hoàn hảo. Chưa đo tương phản bằng công cụ.

## Bằng chứng tự động riêng

[HTTP/MySQL](../scripts/verify-week10.ts) trên database kiểm thử riêng qua **19/19 nhóm**, kết thúc **11:04:43 ngày 01/11/2026 (Asia/Saigon)**; kết quả cục bộ ghi `status=passed`, `cleaned=true`. Máy chủ thử cổng 3010 đã dừng, không ghi nghiệp vụ vào database chính.

- Kiểm đăng ký, định tuyến, cửa sổ học kỳ, kỳ khóa, cấu hình phúc khảo; nội dung tiếng Việt 10.000 ký tự lưu đúng, quá dài/khóa lạ bị từ chối.
- Gửi lại cùng request không tạo phản hồi trùng; đổi nội dung dưới requestId cũ bị chặn.
- Tám lệnh tiếp nhận đồng thời: **một thành công, bảy xung đột**, một lịch sử chuyển trạng thái.
- Chuyển tiếp có biên nhận gửi lại, người nhận cũ mất quyền đọc/ghi; giữ bản ghi nhận và lịch sử. Lý do chuyển/từ chối bắt buộc.
- Kiểm ẩn danh DTO, truy vấn danh sách/total có lọc xung đột; ba kiểu xung đột đa vai trò, thay đổi vai trò/phiên/phân công có hiệu lực ngay.
- Kiểm tệp giả đuôi, quá tổng số/quá dung lượng; tải PDF đúng byte, tên trung tính, IDOR và audit chứng cứ.
- Sáu lệnh khiếu nại đồng thời khi đã có hai phản hồi: thêm đúng ba, chặn ba; tổng không vượt năm/ngày.

[Kiểm thành phần](../tests/feedback-ui.test.ts) và [client](../tests/feedback-client.test.ts) có **6/6 trường hợp**: giới hạn tệp, escape nội dung, POST/khóa trước hydration, chỉ thử lại GET sau làm mới phiên, không tự gửi lại POST và giữ boundary multipart. Đây không phải sáu lượt thao tác trình duyệt.

Tại nguồn `51f03e26f47d17279af0b681d11994d7abd10d39`, [CI 41274448630](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41274448630) đã qua `check` và `smoke`; Linux **985/985 test trong 62 tệp**, bao gồm kiểm file symlink. Cục bộ Windows **984 qua, một bỏ qua** vì hệ điều hành từ chối tạo file symlink trong phép thử. Không dùng CI này để khẳng định mọi thay đổi sau SHA trên đã được kiểm; nguồn/bản dựng bàn giao cuối đối chiếu tại [nghiệm thu](NGHIEM_THU_TUAN_10.md).

## Gián đoạn và giới hạn

Một số locator hết thời gian chờ khi trang còn tải bất đồng bộ. Trong lượt kéo dài, access token hết hạn và luồng làm mới phiên đã đưa trang về tài khoản hai lần; điều phối viên đã đăng nhập/làm mới rồi hoàn tất luồng được ghi bằng ảnh cuối. Không ghi các lần thử chưa tới trạng thái mong đợi là đã qua và không tuyên bố không có mọi lỗi console. Khi máy chủ dev đang được dùng để quan sát, không chạy generate/build hoặc sửa mã sinh tự động để tránh làm trang tải lại.

Lượt này chỉ bao phủ bốn vai trò, dữ liệu giả và các kích thước nêu trên. Không chứng nhận mọi trình duyệt, thiết bị, WCAG hoặc tải hệ thống. Kiểm UI không thay kiểm DTO/policy/audit/tệp. Ẩn danh ở mức ứng dụng; nội dung hoặc metadata tệp do người gửi cung cấp có thể tự tiết lộ danh tính. Các thao tác thuộc Tuần 11–13 chưa làm trước; giới hạn của lượt UI không được đổi thành số FR đã hoàn tất theo cảm tính.

## Kiểm tra khởi động và giao diện bàn giao ngày02/11

Đã thử KHOI_DONG_DU_AN.cmd lúc web tắt, sau đó chạy lại khi web đang hoạt động. Trang chủ/đăng nhập/health trả200; web và scheduler không bị nhân đôi, không generate khi tái sử dụng và .env giữ nguyên. Trang chủ tại localhost:3000 được mở lại trong trình duyệt, đã xem [ảnh thực tế](assets/tuan-10/khoi-dong-website.jpg); ảnh này tách khỏi14ảnh luồng nghiệp vụ phía trên. Không truy cập QR hoặc nhập thông tin xác thực của chủ dự án.

Nguồn bàn giao8ffa99f đã có [CI41414188239](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41414188239) check/smoke qua, Linux1002/1002 trong63tệp. Windows1001passed/1skipped; build cuối hết hai cảnh báo tracing của nguồn ban đầu. Đây là bổ sung kiểm khởi động/bản dựng, không mở rộng số thao tác UI nghiệp vụ đã ghi.
