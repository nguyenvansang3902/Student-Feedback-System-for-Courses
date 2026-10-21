[CẦN SINH VIÊN ĐỌC VÀ VIẾT LẠI BẰNG LỜI CỦA MÌNH]

# Chương 2. Phân tích nghiệp vụ và yêu cầu — bản nháp Tuần 2

Ngày viết thực tế: **21/10/2026**. Theo giả định một tuần là 7 ngày từ 30/09/2026, Tuần 2 có mốc kế hoạch 07–13/10/2026; bản nháp này được thực hiện muộn hơn mốc đó. Phần dưới phân tích **quy trình đề xuất trong đặc tả**, không ghi nhận nhóm đã khảo sát thực địa, phỏng vấn hay áp dụng quy định cụ thể của một trường.

## 2.1. Phạm vi phân tích

Đề tài gồm hai kênh thu thập ý kiến: khảo sát định kỳ về môn học/lớp học phần và phản hồi liên tục cần người xử lý. Khảo sát tạo ra số liệu gộp sau khi đủ mẫu; phản hồi tạo ra một hồ sơ có trao đổi, thời hạn và lịch sử. Hai kênh liên quan cùng danh mục học tập và vai trò nhưng có yêu cầu ẩn danh khác nhau. Phạm vi chức năng đầy đủ giữ theo [đặc tả nghiệp vụ](../DAC_TA_NGHIEP_VU.md); danh sách có mã tại [YEU_CAU](../YEU_CAU.md).

Hệ thống sử dụng dữ liệu giả và import Excel/CSV. Kết nối thật hệ thống đào tạo/điểm/SSO, ứng dụng di động native, thanh toán và đa ngôn ngữ ngoài tiếng Việt không thuộc phạm vi. Các ví dụ trường khác trong đặc tả chỉ là gợi ý tham khảo, không phải kết quả khảo sát của nhóm và chưa dùng làm quy định trong chương này. Theo yêu cầu của người dùng, chương không viết phần quy trình hiện tại tại trường.

## 2.2. Tác nhân và phạm vi quyền

| Tác nhân          | Nhu cầu chính                                                                     | Giới hạn cần bảo vệ                                                         |
| ----------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Sinh viên         | Biết các khảo sát của lớp đã đăng ký, làm phiếu một lần, gửi và theo dõi phản hồi | Không xem kết quả tổng hợp; không thao tác khảo sát/trao đổi của người khác |
| Giảng viên        | Xem kết quả lớp phụ trách sau công bố, xử lý phản hồi được giao, giải trình       | Không xem danh tính người nộp phiếu; không xem lớp ngoài phân công          |
| Trưởng bộ môn     | Theo dõi kết quả/phản hồi trong bộ môn, xác nhận giải trình, nhận leo thang       | Giới hạn bộ môn; danh sách chưa làm chỉ có trạng thái, không nội dung phiếu |
| Trưởng khoa       | Theo dõi và xử lý trong khoa, nhận leo thang                                      | Giới hạn khoa, tuân thủ trạng thái công bố và ngưỡng                        |
| Cán bộ ĐBCL       | Mẫu phiếu, đợt, tiến độ, kiểm duyệt, tổng hợp/công bố, nhắc hạn, báo cáo          | Không có công cụ ghép phiếu với sinh viên; truy cập nhạy cảm phải có audit  |
| Lãnh đạo          | Duyệt/từ chối đợt, xem dashboard toàn trường                                      | Không bỏ qua quy trình phê duyệt, ngưỡng bảo vệ và quyền dữ liệu            |
| Quản trị hệ thống | Quản lý tài khoản, gán vai trò, cấu hình và audit                                 | ADMIN bắt buộc MFA, không mặc định được xem kết quả hay nội dung phản hồi   |

Một người dùng có nhiều gán vai trò; mỗi gán có phạm vi toàn hệ thống, khoa hoặc bộ môn. Quyền không chỉ là tên vai trò mà còn phụ thuộc tài nguyên, quan hệ phân công/đăng ký, trạng thái đợt và MFA. Ma trận chi tiết dùng để thiết kế test được đặt tại [PHAN_QUYEN](../PHAN_QUYEN.md). Đây là ma trận thiết kế, policy chạy thật thuộc Tuần 4 và tiếp tục bổ sung theo module.

## 2.3. Các đối tượng nghiệp vụ chính

Khoa gồm các bộ môn; bộ môn quản lý môn học; môn học được mở thành lớp học phần trong một học kỳ. Một lớp có các sinh viên đăng ký và có thể có nhiều giảng viên phụ trách. Đợt khảo sát thuộc học kỳ, dùng một phiên bản mẫu phiếu, có phạm vi lớp và khoảng thời gian cụ thể. Khi mở đợt, danh sách nhiệm vụ được chốt theo đăng ký tại thời điểm đó; đăng ký thay đổi sau khi mở không làm thay đổi nhiệm vụ của đợt (BR-01).

Mẫu gồm nhóm tiêu chí có trọng số và các câu hỏi có loại, thứ tự, trọng số, điều kiện bắt buộc, tùy chọn Không áp dụng. Mẫu đã gắn vào đợt được duyệt phải khóa; thay đổi bằng phiên bản mới (BR-05). Mỗi sinh viên có trạng thái nhiệm vụ riêng nhưng phiếu trả lời không giữ liên kết người nộp. Phản hồi liên tục lại giữ người gửi nội bộ để trao đổi đúng người; khi chọn ẩn danh, danh tính được che đối với người xử lý.

## 2.4. Quy trình khảo sát đề xuất

1. Cán bộ ĐBCL chuẩn bị mẫu và tạo đợt theo học kỳ, phạm vi, thời gian, ngưỡng công bố.
2. ĐBCL trình duyệt; lãnh đạo phê duyệt hoặc từ chối có lý do. Đợt chưa duyệt không được mở.
3. Đến giờ mở, hệ thống chốt lớp/đăng ký và tạo nhiệm vụ từng sinh viên–lớp. Mở/đóng phải idempotent, không chỉ dựa việc cron có chạy đúng giờ.
4. Sinh viên chỉ thấy nhiệm vụ của mình, nhập form theo mẫu, có thể lưu nháp ở trình duyệt. Khi nộp, service kiểm quyền, thời hạn, dữ liệu và cập nhật nhiệm vụ cùng ghi phiếu trong một transaction.
5. Hết hạn, đợt đóng; dữ liệu được tổng hợp theo công thức, tự luận được kiểm duyệt, kết quả chỉ công bố khi đáp ứng ngưỡng và vai trò được phép.
6. Lớp có điểm dưới ngưỡng cảnh báo phát sinh yêu cầu giải trình; giảng viên nộp nội dung/kế hoạch, trưởng bộ môn xác nhận hoặc yêu cầu bổ sung.

Luồng chính của đợt là NHAP → CHO_DUYET → DA_DUYET → DANG_MO → DA_DONG → DA_TONG_HOP → DA_CONG_BO → LUU_TRU. Các nhánh từ chối/rút, hủy, gia hạn và đóng sớm cần lý do/quyền theo đặc tả; sơ đồ chi tiết ở [SO_DO_NGHIEP_VU](../SO_DO_NGHIEP_VU.md). Chương này không coi các trạng thái đã có endpoint hoặc UI triển khai.

## 2.5. Quy trình phản hồi đề xuất

Sinh viên chỉ gửi cho lớp đã/đang đăng ký trong học kỳ hiện hành hoặc học kỳ liền trước theo cấu hình (BR-20). Loại phản hồi quyết định người nhận: giảng dạy/tài liệu/kiểm tra chủ yếu tới giảng viên, nội dung đề cương tới trưởng bộ môn, cơ sở vật chất/lịch học/khác tới ĐBCL. Kiểm tra đánh giá đồng gửi trưởng bộ môn; khiếu nại luôn đồng gửi trưởng bộ môn.

Hồ sơ đi qua MOI → DA_TIEP_NHAN → DANG_XU_LY → DA_TRA_LOI → DA_DONG; chuyển tiếp hoặc từ chối phải có lý do và lưu lịch sử bất biến. Người gửi tiếp tục trao đổi trên hồ sơ của mình. Phản hồi chọn ẩn danh chỉ hiển thị “Sinh viên ẩn danh” cho người xử lý; người gửi vẫn nhận thông báo và đánh giá hài lòng đúng hồ sơ.

SLA mặc định tính ngày làm việc, trừ thứ Bảy/Chủ nhật: tiếp nhận trong 2 ngày, trả lời trong 7 ngày hoặc 5 ngày với khiếu nại. Quá hạn gắn cờ và leo thang giảng viên → trưởng bộ môn → trưởng khoa → ĐBCL bằng job idempotent. Sau trả lời, sinh viên đánh giá 1–5 trong 7 ngày; điểm ≤ 2 cho phép mở lại một lần. Các con số là mặc định cấu hình được, không được trình bày là quy định của trường. Phản hồi/ngày mặc định tối đa 5; nội dung trùng 24 giờ được cảnh báo. Các chức năng này dự kiến Tuần 10–11.

## 2.6. Phân nhóm yêu cầu chức năng

| Nhóm                                      | Mã FR      | Tuần triển khai dự kiến                                    |
| ----------------------------------------- | ---------- | ---------------------------------------------------------- |
| Xác thực, phiên, MFA                      | FR-01–09   | 3–4; quản lý thiết bị là P2                                |
| Người dùng, quyền, audit                  | FR-10–12   | 3–4 và bổ sung theo ca sử dụng                             |
| Danh mục/import                           | FR-20–22   | Schema nền 2, chức năng 5                                  |
| Mẫu phiếu                                 | FR-30–35   | Thiết kế 2, chức năng 6                                    |
| Đợt, duyệt, nhiệm vụ, theo dõi            | FR-40–47   | 7; nhắc hoàn thành 9/11                                    |
| Làm khảo sát                              | FR-50–54   | 8                                                          |
| Tổng hợp, công bố, kiểm duyệt, giải trình | FR-60–66   | 9/11                                                       |
| Phản hồi                                  | FR-70–76   | 10–11                                                      |
| Thông báo/email/nhắc hạn                  | FR-80–82   | 11, bổ sung đúng luồng                                     |
| Dashboard/xuất/báo cáo xử lý              | FR-90–94   | 12                                                         |
| Cấu hình, demo, health, backup            | FR-100–103 | Theo kế hoạch; health Tuần 1, hoàn thiện demo 5, backup 14 |
| Mở rộng                                   | FR-110–112 | P2, không làm trước chức năng lõi hoặc tự bật AI           |

Danh sách FR đầy đủ có 63 mục; bảng này gom nhóm để trình bày, không thay thế danh sách từng yêu cầu và ưu tiên. Chỉ tick tiến độ khi test qua và nghiệm thu được; phân tích hoặc tạo bảng không đồng nghĩa hoàn thành FR chức năng.

## 2.7. Quy tắc nghiệp vụ cần chứng minh

Các nhóm BR khảo sát 01–18, phản hồi 20–28, hệ thống 30–35 được giữ nguyên trong đặc tả (không tự thêm BR-19/29 để lấp số trống). Mỗi quy tắc phải có test gắn mã khi chức năng được triển khai. Các điểm quyết định thiết kế gồm:

- BR-02/03: nộp một lần bằng transaction và cập nhật task có điều kiện; phiếu không có đường quan hệ về người dùng/nhiệm vụ.
- BR-04/05/06/17: kiểm thời gian máy chủ, mẫu khóa, đợt đã duyệt và học kỳ khóa.
- BR-07/08: công bố cần đủ số phiếu và tỷ lệ; người xem còn bị giới hạn theo trạng thái và phạm vi.
- BR-11/12: điểm câu bỏ NA/trống, điểm nhóm và tổng có trọng số; tỷ lệ bằng task DONE/tổng task; làm tròn hai chữ số ở cuối.
- BR-18/24/30/34: tách quản trị khỏi quyền nghiệp vụ, che người gửi phản hồi, audit không chứa phiếu/bí mật, kiểm quyền mọi ID.
- BR-28/31/32/33: tệp an toàn, bcrypt/JWT, ADMIN TOTP và khóa đăng nhập sai.

Ngưỡng mặc định là 5 phiếu và 30%; cảnh báo giải trình điểm < 3.0 trong 14 ngày. Dữ liệu giả TC-AGG-01 dự kiến cho điểm tổng khoảng 4.11 và tỷ lệ 40%; đây là **kỳ vọng trong đặc tả**, chưa phải kết quả chạy hàm tổng hợp ở Tuần 2.

## 2.8. Yêu cầu phi chức năng và tiêu chí kiểm chứng

Hệ thống cần bảo vệ bí mật phiên, kiểm quyền phía máy chủ, chống IDOR, giới hạn tần suất và tách nội dung phiếu khỏi danh tính. Giao diện tiếng Việt, mobile-first, tương phản phù hợp và dùng bằng bàn phím. MySQL dùng utf8mb4, ràng buộc/index, phân trang và transaction. Các số liệu hiệu năng/độ phủ phải được đo khi có luồng thực tế, không ấn định rằng đã đạt trước khi kiểm thử. Danh sách NFR có mã và tiêu chí tại [YEU_CAU](../YEU_CAU.md).

Tính đúng của job không phụ thuộc cron; các thao tác ensure phải gọi lại an toàn khi nhiều request tới đồng thời. Dự án dùng TypeScript strict, lint, unit/integration test trên MySQL thật, E2E khi đủ luồng; theo dõi FR/BR tới màn hình và test tại [TRUY_VET](../TRUY_VET.md). UC-GOLD dự kiến chạy trọn bằng tay và E2E Tuần 12, chưa được báo hoàn thành ở Tuần 2.

## 2.9. Kết quả phân tích và phần chưa thực hiện

Tuần 2 tạo cơ sở thiết kế gồm yêu cầu có mã, use case/hoạt động/máy trạng thái, ma trận quyền, wireframe, kiến trúc, ERD và hai schema. Migration giới hạn chín bảng người dùng/danh mục; không hiện thực giao diện chức năng. Test DMMF 5.6a xem cấu trúc ẩn danh, không chứng minh service nộp/export. Kết quả chạy lệnh, số test và migration thực tế được ghi riêng trong báo cáo phiên Tuần 2 sau kiểm tra.

## Việc sinh viên cần hoàn thiện

1. Đọc và viết lại chương bằng lời của nhóm; đối chiếu mã FR/BR với đặc tả và GVHD.
2. Điền tên thành viên, phân công và đóng góp dựa công việc thực tế; AI không xác nhận thay nhóm.
3. Xác nhận lịch tuần chính thức; giữ phân biệt ngày kế hoạch và ngày thực hiện 21/10/2026.
4. Dẫn nguồn học thuật được phép nếu bổ sung lý thuyết; không xem ví dụ tham khảo trong đặc tả là bằng chứng khảo sát tại trường.
