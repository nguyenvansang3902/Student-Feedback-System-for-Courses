# Đối chiếu sơ đồ — Tuần 6

Kiểm thực tế ngày **22/10/2026**, Asia/Saigon. Kế hoạch Tuần 6 giả định **04–10/11/2026**, làm sớm theo yêu cầu người dùng. [ERD hiện tại](ERD.md) có **31 model runtime / 39 model thiết kế**, đã đọc DMMF thật để đối chiếu. Blueprint DMMF SHA-256: `0f8ac7726c236f1ba0f622af90bce726dad84321256ee1b875eaf1d24d78b6ff`.

## Phạm vi thay đổi

Tuần 6 hiện thực bốn bảng mẫu phiếu đã migrate để seed trong Tuần 5: `SurveyTemplate`, `CriterionGroup`, `Question`, `QuestionOption`. Bổ sung `SurveyTemplate.revision` mặc định 1 để kiểm cập nhật có điều kiện và `updatedAt` làm metadata; runtime và blueprint cùng hai trường này. Không tăng số bảng, không thêm định danh hoặc thời gian nộp chính xác vào vùng phiếu ẩn danh.

**11 bảng còn chỉ seed:** SurveyCampaign, CampaignSection, CampaignHistory, SurveyTask, SurveyResponse, SurveyAnswer, AggregateResult, Feedback, FeedbackRecipient, FeedbackMessage, FeedbackHistory. Chưa có UI/API lập/duyệt/mở đợt, nộp phiếu, kết quả hoặc phản hồi. **8 model chưa migrate:** ImprovementPlan, ImprovementHistory, FeedbackRating, Attachment, SlaEscalation, SurveyReminder, Notification, EmailOutbox. Số bảng không tự chứng minh chức năng đã nghiệm thu.

Mỗi model có đúng một miền chính: **9 + 14 + 7 + 9 = 39**; model ngữ cảnh lặp để đọc FK không cộng vào tổng. `SurveyResponse`/`SurveyAnswer` chỉ có FK với nhau; metadata campaignId/sectionId/questionId không bị vẽ thành FK giả.

## Đối chiếu bốn thân Mermaid

Đã trích bốn khối hiện tại và snapshot đầu Tuần 6 **`4969ad7d8afdc3d911d86da086450de1e6748277`** bằng `git show HEAD:docs/ERD.md`, chuẩn hóa CRLF thành LF, bỏ khoảng trắng cuối khối rồi kết thúc một LF. **Ba khối khớp từng nội dung/hash; khối khảo sát chỉ thêm đúng hai dòng revision và updatedAt**, không xóa dòng nào.

| Miền | SHA-256 nguồn hiện tại | So snapshot Tuần 5 | Bản render |
| --- | --- | --- | --- |
| Nền người dùng/danh mục | `7af6cd198b47b32b22f0a7df0c9af4f978e55c91a96d057305cb0e9c2ed09dd0` | Khớp | [Mermaid Tuần 2 giữ nguyên](assets/tuan-02/mermaid/07-erd-nen-danh-muc.svg) |
| Khảo sát/giải trình/nhắc hạn | `b01a2471a5b59ed94535612403b4b05cbdf81a52943f677327abbf07acd4c3fa` | Trước: `40d9def46040c12d0aca6a9601e9b65fc8d2ee2ca1179ad40da91b6b8a72616a`; chỉ hai trường mới | [Mermaid mới Tuần 6](assets/tuan-06/mermaid/erd-khao-sat.svg) |
| Phản hồi | `f7380a9072b2909c07bbcdbe988f5d1c0cd58b0c66db289a493e0868cd67c226` | Khớp | [Mermaid Tuần 2 giữ nguyên](assets/tuan-02/mermaid/09-erd-phan-hoi.svg) |
| Xác thực/hệ thống | `0755adbcd09c0230a99b27cb3203f534bb8e73ca5de6f666ebe19aedfed671f4` | Khớp | [Mermaid Tuần 4 giữ nguyên](assets/tuan-04/erd-he-thong-tuan-04.svg) |

Đã render khối khảo sát mới bằng Mermaid CLI 12/Chrome cài sẵn. SVG mới có viewBox **4076 × 3684**, SHA-256 **`5232ba67319b2d9343b3545649e50f7a45573b4bfed30b65ad89d2ecff775f54`**. Đã raster toàn sơ đồ tại chiều rộng 2400px và mở xem, đồng thời crop/mở xem riêng SurveyTemplate để đọc đủ `revision`, `updatedAt`, `familyId`, `version` và khóa. Không thấy cắt bảng/thuộc tính trong ảnh đã xem; sơ đồ toàn miền lớn nên cần mở SVG phóng to để đọc chi tiết.

Các render lịch sử Tuần 2/4 và SVG tổng quan tại `assets/tuan-02` giữ nguyên; không ghi đè bằng chứng có hash của [Tuần 5](SO_DO_TUAN_05.md). Chỉ render lại thân Mermaid đã thay đổi.

## Bốn SVG tổng quan mới đã xem

Exporter ghi bốn SVG dạng thẻ DMMF vào `assets/tuan-06`; đây **không phải bản render Mermaid**. Đã dùng Puppeteer/Chrome headless mở từng SVG, raster và mở xem đủ bốn ảnh, đọc nhãn/khóa và chân trang. Metadata phân biệt bốn bảng mẫu Tuần 6 với bảng chỉ seed hoặc thiết kế tương lai.

| SVG tổng quan | Raster | SHA-256 SVG tại thời điểm xem |
| --- | --- | --- |
| [Nền người dùng/danh mục](assets/tuan-06/erd-nen-danh-muc.svg) | 1632 × 884 | `003d702ad93aecec24ed9220948d3150bd318032cfa07a3b7cd343354f0d3809` |
| [Khảo sát](assets/tuan-06/erd-khao-sat.svg) | 1632 × 1789 | `ae4505555daa82939efca4ab32d8f59b7f3dc12e47e236f7bdb9dc0b61b615b2` |
| [Phản hồi](assets/tuan-06/erd-phan-hoi.svg) | 1632 × 861 | `b6af6a05756e3297277c46e8d9e0cebf479cbcfa6b05d61c69978855c1f4a01f` |
| [Xác thực/hệ thống](assets/tuan-06/erd-he-thong.svg) | 1632 × 1070 | `f2f9cc2304d63ce1535c4d41db49d2fac890fe3446475dc778b9b86bd00dcf3f` |

Các nhãn, viền và nội dung khóa không bị cắt trong bốn ảnh đã xem. Chân trang ghi 31 runtime Tuần 6, bốn bảng mẫu và 11 bảng chỉ seed. SVG khảo sát có 11 scalar trên SurveyTemplate; vùng Response/Answer màu riêng và không có đường nối người dùng.

## Tái tạo và giới hạn bằng chứng

```powershell
npm.cmd run db:generate
npm.cmd run design:diagrams
npm.cmd run design:check
```

Script đối chiếu/raster và kết quả máy nằm ngoài repository tại `work/week6-erd/prepare.mjs`, `hashes.json`, `raster.mjs`, `raster.json`, bốn ảnh `erd-*-cards.png`, ảnh toàn Mermaid và `SurveyTemplate.png`. Mã snapshot ghi rõ phía trên để không nhầm với HEAD sau commit. Đã mở xem **sáu PNG**: bốn tổng quan, một toàn Mermaid, một crop. Kiểm sơ đồ không thay kiểm migration MySQL, quyền, preview không ghi dữ liệu, seed, build hoặc CI; các gate chức năng đối chiếu tại [nghiệm thu Tuần 6](NGHIEM_THU_TUAN_06.md).
