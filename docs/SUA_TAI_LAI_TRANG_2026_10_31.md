# Sửa phiên xem web tự tải lại —31/10/2026

Người dùng thấy trang đăng nhập liên tục giật và tải lại, nhiều lần trở về trạng thái “Đang kiểm tra phiên đăng nhập…”. Đây là lỗi phiên xem cần kiểm tra thực tế, không thể kết luận trang ổn chỉ từ phản hồi HTTP200 hoặc ảnh chụp tại một thời điểm.

## Quan sát và giới hạn kết luận

- Trên trang đăng nhập trong trình duyệt thực tế, Fast Refresh/HMR chạy lặp khoảng nửa giây một lượt; console lặp thông báo và trang tải lại. Log dev liên tục báo Compiled, GET/dang-nhap và các yêu cầu kiểm tra phiên.
- Rà luồng auth không thấy vòng điều hướng của khách chưa đăng nhập: effect restore chạy khi mount; me401 thử refresh đúng một lần; refresh401 trả null rồi mở form. Điều hướng chỉ xảy ra khi có user hoặc đăng nhập thành công. Không cần nới guard phiên hoặc MFA.
- Theo dõi hệ thống tệp trong12giây không thấy thay đổi mã nguồn. **Chưa xác định chính xác tệp hoặc sự kiện gây invalidation.** Việc HMR lặp là quan sát đã có; không gán một tệp cụ thể là nguyên nhân khi chưa có bằng chứng.
- CI trước đó trên18a1a6d/run41159857052 đã qua check/smoke; kết quả này chỉ thuộc bản sửa ngữ cảnh trước, không chứng minh phiên dev đang ổn hoặc bản sửa cách chạy mới đã qua CI.

## Cách chạy cục bộ sau điều chỉnh

Đổi npm script dev từ `next dev` sang `next dev --webpack`, dùng lựa chọn bộ biên dịch tích hợp của cùng Next.js thay Turbopack. Tiếp tục mở bằng `npm run dev` và xem tại [localhost:3000](http://localhost:3000); giữ cùng ứng dụng, database và chính sách bảo mật, không thêm thư viện. Tham khảo [tài liệu dòng lệnh Next.js](https://nextjs.org/docs/app/api-reference/cli/next).

Lần thử bản production preview trên localhostHTTP trảHTTP500: getAuthConfig chủ động yêu cầu HTTPS trong production. Đã bỏ hướng preview, không nới guard hoặc thay đặc tả được bảo vệ để vượt lỗi. Lần thử này không được tính là một kết quả chạy qua.

Trước khi chạy check, generate hoặc build, dừng máy chủ dev đang dùng cùng checkout/output. Chạy xong các bước kiểm tra mới mở lại bằng npm run dev. Không mở hai máy chủ trên cùng cổng3000 hoặc build vào output đang được dev sử dụng. Việc đổi sang webpack cần được đo lại thực tế trước khi kết luận đã hết vòng tải lại.

Đã dừng đúng tiến trình dev và giữ thư mục cache .next cũ trong .local/reload-cache... để có thể đối chiếu. Không reset database, không đặt lại mật khẩu hoặc TOTP, không xóa dữ liệu nghiệp vụ và không thay phân quyền.

## Kiểm lại

- npm run check cuối qua **797/797 kiểm thử trong50tệp**, schema/ERD/lint/TypeScript qua. Nhật ký cục bộ ở .local/reload-final-check-20261031.log. Không viết test so khớp đơn thuần tùy chọn dòng lệnh.
- Máy chủ hiện tại là **Next16.4.3 (webpack)** trên127.0.0.1:3000; HTTP trang đăng nhập200. Dùng cùng .env/database; không có migration/seed mới.
- IAB thực tế **1265×720**: form hết trạng thái kiểm phiên và nhập được. Sau ít nhất **156giây**, ảnh vẫn hiển thị nguyên chuỗi thử KIEM_TRA_ON_DINH, nút đăng nhập hoạt động và console không thêm vòng HMR/DevTools lặp sau thời điểm bắt đầu đo. Có một lần rebuild ban đầu trước khi bắt đầu phép đo; không tính nó là tải lại lặp.
- Phép đọc giá trị input bằng DOM bị công cụ che, nên xác nhận việc giữ nội dung trực tiếp bằng ảnh. Không khẳng định có bộ đếm main-frame navigation tự động. Không thấy tải lại trong khoảng quan sát; chưa kiểm mọi thiết bị/trình duyệt hoặc mọi thao tác sửa mã.
- Đã đăng nhập tài khoản demo sinh viên qua biểu mẫu thật, vào /tai-khoan đúng vai trò rồi đăng xuất, trở lại form trống nhập được. Không gửi khảo sát, email, đổi mật khẩu hoặc cấu hình TOTP. Hai tab cũ từng về trang lỗi kết nối trong lúc dừng server; đã mở một tab đăng nhập mới và giữ làm trang bàn giao.
- Đã xem hai ảnh mới: [giữ nội dung sau hơn hai phút](assets/sua-tai-lai-2026-10-31/dang-nhap-sau-2-phut.jpg), [đăng nhập sẵn sàng sau đăng xuất](assets/sua-tai-lai-2026-10-31/dang-nhap-san-sang.jpg). Không ghi mật khẩu/cookie/token vào ảnh.
- CI của commit sửa cách chạy được theo dõi riêng đúng SHA; CI41159857052 trước đó thuộc18a1a6d, không dùng thay kết quả mới.

## Phạm vi

Đây là sửa cách chạy và độ ổn định khi xem, liên quan trải nghiệm FR-01; không thay nghiệp vụ, cộng FR hoặc điểm. Tiến độ giữ **138/219=63,0%,49/84FR**, chưa bắt đầu Tuần10. Bằng chứng và báo cáo nghiệm thu cũ được giữ nguyên. Chủ tài khoản tiếp tục tự thiết lập TOTP theo quy trình đã bàn giao.
