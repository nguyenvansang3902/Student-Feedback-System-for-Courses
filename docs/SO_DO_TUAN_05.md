# Đối chiếu sơ đồ — Tuần 5

Kiểm thực tế ngày **22/10/2026**, múi giờ Asia/Saigon. Kế hoạch Tuần 5 giả định 28/10–03/11; thực hiện sớm theo yêu cầu người dùng. [ERD.md](ERD.md) hiện thể hiện **31 model runtime / 39 model thiết kế**. Đã đọc DMMF được Prisma sinh để xác nhận hai số này.

## Phạm vi dữ liệu được bổ sung

Người dùng ngày 22/10/2026 cho phép làm trước **dữ liệu seed khảo sát/phản hồi**. Vì vậy Tuần 5 vật chất hóa thêm **15 model** đã có trong blueprint: SurveyTemplate, CriterionGroup, Question, QuestionOption, SurveyCampaign, CampaignSection, CampaignHistory, SurveyTask, SurveyResponse, SurveyAnswer, AggregateResult, Feedback, FeedbackRecipient, FeedbackMessage, FeedbackHistory.

Các bảng này dùng cho dữ liệu giả trong demo. Chưa có workflow/UI/API nghiệp vụ tạo mẫu phiếu, duyệt/mở đợt, nộp khảo sát, công bố kết quả hay xử lý phản hồi. Số bảng đã migrate không phải số chức năng đã nghiệm thu; ngoại lệ seed không tự cho phép triển khai các chức năng tuần sau.

**8 model thiết kế chưa migrate:** ImprovementPlan, ImprovementHistory, FeedbackRating, Attachment, SlaEscalation, SurveyReminder, Notification, EmailOutbox. Tổng model theo miền vẫn là **9 + 14 + 7 + 9 = 39**, không cộng model ngữ cảnh lặp trong sơ đồ.

## Bốn thân Mermaid giữ nguyên

Đã trích cả bốn thân Mermaid hiện tại và bản `HEAD` đầu phiên (`1e3844e`), chuẩn hóa CRLF thành LF, bỏ khoảng trắng cuối khối và kết thúc một LF. Kết quả **4/4 khớp từng nội dung và SHA-256**; schema thiết kế không đổi khi chuyển các model đã thiết kế sang runtime.

| Khối | SHA-256 nguồn hiện tại và HEAD | Bản render dùng lại |
| --- | --- | --- |
| Nền người dùng/danh mục | `7af6cd198b47b32b22f0a7df0c9af4f978e55c91a96d057305cb0e9c2ed09dd0` | [Mermaid Tuần 2](assets/tuan-02/mermaid/07-erd-nen-danh-muc.svg) |
| Khảo sát/giải trình/nhắc hạn | `40d9def46040c12d0aca6a9601e9b65fc8d2ee2ca1179ad40da91b6b8a72616a` | [Mermaid Tuần 2](assets/tuan-02/mermaid/08-erd-khao-sat.svg) |
| Phản hồi liên tục | `f7380a9072b2909c07bbcdbe988f5d1c0cd58b0c66db289a493e0868cd67c226` | [Mermaid Tuần 2](assets/tuan-02/mermaid/09-erd-phan-hoi.svg) |
| Xác thực/hệ thống | `0755adbcd09c0230a99b27cb3203f534bb8e73ca5de6f666ebe19aedfed671f4` | [Mermaid cập nhật Tuần 4](assets/tuan-04/erd-he-thong-tuan-04.svg) |

Không render lại thân Mermaid không đổi. [Thư viện lịch sử Tuần 2](SO_DO_DA_RENDER.md), các SVG Mermaid lịch sử và [bằng chứng cập nhật Tuần 4](SO_DO_TUAN_04.md) được giữ nguyên. Nhãn tiến độ mới nằm ở phần dẫn và bốn SVG tổng quan do exporter sinh, không thay bằng chứng lịch sử.

## SVG tổng quan đã raster và xem thật

`scripts/export-erd.mjs` sinh SVG tổng quan dạng thẻ trực tiếp từ DMMF; đây **không phải** bản render Mermaid đầy đủ. Đã dùng Chrome headless/Puppeteer mở bốn SVG hiện tại, raster ra PNG ngoài repository và mở đủ bốn ảnh để đọc nhãn, khóa và bố cục.

| SVG tổng quan hiện tại | Kích thước raster | Quan sát |
| --- | --- | --- |
| [Nền người dùng/danh mục](assets/tuan-02/erd-nen-danh-muc.svg) | 1632 × 884 | Chín model nền, khóa ghép/quan hệ đọc được; chân trang ghi 31 runtime/39 thiết kế. |
| [Khảo sát](assets/tuan-02/erd-khao-sat.svg) | 1632 × 1789 | Nhãn chỉ seed Tuần 5 tách với model tương lai; SurveyResponse/SurveyAnswer thể hiện vùng ẩn danh và không thêm FK người dùng. |
| [Phản hồi](assets/tuan-02/erd-phan-hoi.svg) | 1632 × 861 | Bốn model phản hồi chỉ seed; FeedbackRating/Attachment/SlaEscalation vẫn ghi chưa migration. |
| [Xác thực/hệ thống](assets/tuan-02/erd-he-thong.svg) | 1632 × 1070 | Các model xác thực đã migrate; Notification/EmailOutbox ghi rõ thiết kế tương lai. |

Nhãn “Đã migrate đến Tuần 4” trên model nền/xác thực chỉ thời điểm bảng đã tồn tại; chân trang nêu tổng runtime hiện tại Tuần 5. Nội dung không bị cắt trong các raster đã xem. Mở SVG để phóng to khi chữ nhỏ trong trang Markdown.

Script đối chiếu và bằng chứng máy nằm ngoài repository tại `work/week5-qa/close-visuals.mjs`, `visual-close.json` và `erd-*-cards.png`; JSON lưu hash bốn SVG tại thời điểm xem. Các PNG giao diện được ghi riêng tại [QA giao diện Tuần 5](QA_GIAO_DIEN_TUAN_05.md). Kiểm sơ đồ không thay cho kiểm migration, seed, phân quyền hoặc CI.
