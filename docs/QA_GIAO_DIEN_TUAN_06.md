# Kiểm tra giao diện Tuần 6 — mẫu phiếu khảo sát

Tuần 6 khởi động ngày **22/10/2026** và tiếp tục kiểm thử ngày **28/10/2026**, Asia/Saigon. Kế hoạch giả định là 04–10/11/2026; thực hiện sớm theo yêu cầu người dùng, không ghi lùi ngày.

## Môi trường và phạm vi

- Chrome qua Puppeteer trong phiên thử riêng, không dùng phiên trình duyệt cá nhân.
- Web thử ở `http://127.0.0.1:3001`, database demo riêng có marker gắn định danh MySQL; không dùng database chính hoặc shadow.
- Tài khoản và mẫu thử mang UUID/mã `UI6-*` do lượt kiểm tạo. Mật khẩu giả riêng chỉ tồn tại trong bộ nhớ của script; không đưa vào ảnh hoặc log.
- Desktop 1440px và mobile 390px; ảnh lưu tại `docs/assets/tuan-06/`.
- Kiểm mẫu phiếu và bản xem trước. Không nhận đã thử quy trình duyệt đợt, nộp phiếu khảo sát, tổng hợp hoặc xử lý phản hồi.

## Kết quả chạy thật

Lượt ngày 22/10 đã xác nhận người chưa đăng nhập bị chuyển về trang đăng nhập, sau đó dừng ở bước đăng nhập khi máy chủ thử khởi động lại. Kết quả cũ không được dùng để nhận hoàn tất giao diện. Fixture của lượt đó đã dọn, seed giữ nguyên.

Lượt cuối hoàn tất **15:29:13 ngày 28/10/2026** (Asia/Saigon), trên mã `68087ed7ecc68028ac78475696f4ee69a5d2e056`, Next.js 16.4.3. Script thoát mã **0**: **14/14 nhóm kiểm tra**, **10/10 tổ hợp trang/kích thước**, `pageErrors: 0`, `cleaned: true`, `seedUnchanged: true`. Kết quả bền vững nằm trong `work/week6-qa/result.json` ngoài Git.

Các lượt thử trước đã gặp lỗi đồng bộ của bộ kiểm: bấm nút HTML trước khi React gắn xử lý sự kiện và bấm liên tiếp nhiều checkbox trong cùng một lượt JavaScript. Bộ kiểm đã được sửa để đợi trang tương tác được và chọn từng phương án qua sự kiện trình duyệt. Không thay mã sản phẩm để làm lượt kiểm này qua. Mỗi lượt đều dọn fixture và đối chiếu seed.

## Các luồng đã qua

| Nhóm | Kết quả quan sát |
|---|---|
| 1–2. Phiên và đường vào | Khách mở mẫu phiếu được chuyển về đăng nhập; ĐBCL đăng nhập thật và có liên kết từ trang tài khoản. |
| 3. Dùng mẫu mặc định | Tạo họ mẫu nháp độc lập, phiên bản 1, đủ năm loại, không mang cờ mặc định. |
| 4–5. Tạo và sửa | Tạo qua UI hai nhóm/bảy câu; đủ năm loại và hai thang Likert 1–4/1–5. Đổi thứ tự nhóm/câu/lựa chọn, trọng số, bắt buộc/NA; dữ liệu đọc lại đúng. Lưu lần sau tăng revision. |
| 6. Xem trước | Thử chọn thang điểm, một lựa chọn, hai lựa chọn cùng lúc, Có/Không và tự luận. Thiếu câu bắt buộc hiện lỗi; chọn NA được chấp nhận và vô hiệu hóa ô trả lời. Xóa/tải lại mất lựa chọn; không POST, không localStorage, không tăng số phiếu/đáp án. |
| 7. Xung đột | Tăng revision của đúng fixture trực tiếp trong DB để giả lập thay đổi ở phiên khác, rồi lưu qua UI nhận 409. Nội dung chưa lưu được giữ; chỉ bỏ khi chọn nút tải lại rõ ràng. Đây không phải thử hai cửa sổ trình duyệt đồng thời. |
| 8. Khóa | Có bước xác nhận; sau khóa không còn ô sửa tên/câu hỏi, nội dung chỉ đọc. |
| 9–10. Phiên bản và nhân bản | Phiên bản mới cùng họ nhận số 2, nhóm/câu có ID mới; nguồn vẫn khóa. Nhân bản tạo họ khác ở phiên bản 1. |
| 11. Mặc định | Chọn mẫu đã khóa qua UI; database còn đúng một mẫu mặc định. |
| 12. Danh sách | Tạo 21 fixture riêng để thử tìm kiếm và phân trang 20+1; quay lại trang trước, lọc trạng thái và hiện trạng thái không có kết quả đều đúng. |
| 13. Sai vai trò | Đăng nhập sinh viên, mở trực tiếp danh sách/chi tiết/xem trước đều được chuyển về tài khoản. Kiểm đủ bảy vai trò qua HTTP được ghi ở nghiệm thu. |
| 14. Lỗi JavaScript | Không có sự kiện `pageerror` trong toàn bộ luồng. |

## Ảnh đã mở xem

Đã mở xem trực tiếp **cả 10 PNG cuối** ngày 28/10. Chữ, khung, nút và lựa chọn không đè nhau; màn hình 390px xuống dòng và xếp dọc. Phép đo DOM tại cả mười vị trí cho `overflow: false`, `unlabeled: 0`. Các ảnh trình soạn/xung đột là ảnh phần đang hiển thị trong viewport; các ảnh còn lại chụp toàn trang. Nội dung ngoài viewport được cuộn và thao tác trong lượt thử, không suy ra chỉ từ ảnh.

| Màn hình | Desktop 1440px | Mobile 390px |
|---|---|---|
| Danh sách và mặc định | [Ảnh](assets/tuan-06/danh-sach-1440.png) | [Ảnh](assets/tuan-06/danh-sach-390.png) |
| Trình soạn mẫu mới | [Ảnh](assets/tuan-06/trinh-soan-1440.png) | [Ảnh](assets/tuan-06/trinh-soan-390.png) |
| Xem trước đủ loại/NA | [Ảnh](assets/tuan-06/xem-truoc-1440.png) | [Ảnh](assets/tuan-06/xem-truoc-390.png) |
| Giữ bản nháp khi xung đột | [Ảnh](assets/tuan-06/xung-dot-1440.png) | [Ảnh](assets/tuan-06/xung-dot-390.png) |
| Mẫu đã khóa chỉ đọc | [Ảnh](assets/tuan-06/mau-da-khoa-1440.png) | [Ảnh](assets/tuan-06/mau-da-khoa-390.png) |

## Bằng chứng và giới hạn

Script thử và kết quả chi tiết nằm ngoài Git trong `work/week6-qa/`; các ảnh được chụp từ dữ liệu giả. Phép đo DOM về tràn ngang/nhãn không phải chứng nhận WCAG, và lượt này chỉ dùng Chrome với hai kích thước nêu trên. Kiểm các nhánh API, quyền, transaction/race trên MySQL thật với dữ liệu giả được ghi riêng trong [nghiệm thu Tuần 6](NGHIEM_THU_TUAN_06.md).

Sau cleanup, script đã đối chiếu cây mẫu có trước lượt kiểm, cờ/revision/thời điểm cập nhật mẫu mặc định, hash mật khẩu/trạng thái/cờ buộc đổi mật khẩu của tài khoản seed và số phiếu/đáp án: giữ nguyên. Chỉ fixture do chính lượt kiểm tạo trong database demo đã xác minh được dọn. Không reset database hoặc volume.
