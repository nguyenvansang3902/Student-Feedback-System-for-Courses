# Sơ đồ Tuần 10: phản hồi và hồ sơ tiếp nhận

Ngày thực hiện: 01/11/2026. Các sơ đồ thể hiện hành vi Tuần 10; trạng thái Thanh tra sau tiếp nhận được để lại Tuần 11.

```mermaid
sequenceDiagram
    actor SV as Sinh viên
    participant UI as Trang phản hồi
    participant API as API
    participant S as Service và policy
    participant DB as MySQL
    actor XL as Người xử lý
    SV->>UI: Chọn lớp, loại, nội dung và mức ẩn danh
    UI->>API: POST với Origin, CSRF và requestId
    API->>S: Actor và dữ liệu đã kiểm định
    S->>DB: Giao dịch: kiểm phiên/quyền mới, đăng ký và kỳ khóa
    S->>DB: Lưu Feedback/MOI, người nhận và lịch sử GUI
    DB-->>UI: ID và revision
    opt Có tệp đính kèm
        UI->>API: Upload tối đa ba tệp
        API->>S: Kiểm quyền, dung lượng, đuôi và magic bytes
        S->>DB: Lưu metadata, kiểm tổng tệp trong giao dịch
    end
    XL->>API: Mở hàng đợi và phản hồi thuộc quyền
    API->>S: Kiểm người nhận và phạm vi hiện hành
    S-->>XL: DTO với nhãn Sinh viên ẩn danh
    XL->>API: Tiếp nhận, xử lý rồi trả lời
    API->>S: Kiểm revision/requestId và chuyển trạng thái
    S->>DB: Cập nhật có điều kiện, thêm tin nhắn/lịch sử
    SV->>API: Mở phản hồi đã gửi
    S-->>SV: Nội dung trả lời và lịch sử
    SV->>API: Xác nhận đóng
    S->>DB: DA_TRA_LOI sang DA_DONG, thêm lịch sử
```

```mermaid
flowchart TD
    A[Gửi khiếu nại nghiêm trọng] --> B[Kiểm đăng ký, kỳ, xác nhận cảnh báo và giới hạn gửi]
    B --> C[Chọn Thanh tra không xung đột]
    C --> D[Giao dịch tạo Feedback và InspectionCase TIEP_NHAN]
    D --> E{Người mở hồ sơ}
    E -->|Sinh viên gửi| F[Nội dung của chính sinh viên]
    E -->|Thanh tra| G{Giảng viên hoặc trưởng đơn vị liên quan?}
    G -->|Có| H[404, không có trong hàng đợi hoặc danh sách giao]
    G -->|Không| I[Nội dung và chứng cứ, kiểm toán lượt xem/tải]
    I --> J{Mức danh tính}
    J -->|Ẩn danh hoàn toàn| K[Sinh viên ẩn danh]
    J -->|Cho Thanh tra biết| L[Danh tính, kiểm toán lượt xem]
    E -->|Lãnh đạo| M[Tóm tắt loại, trạng thái và kết luận nếu có]
    E -->|ADMIN hoặc ĐBCL| H
```

Luồng thường: `MOI → DA_TIEP_NHAN → DANG_XU_LY → DA_TRA_LOI → DA_DONG`. Chuyển tiếp phải có lý do, thay người nhận và quay về MOI; từ chối phải có lý do. Không sửa lịch sử. Đóng không tự kích hoạt đánh giá hài lòng hoặc mở lại ở Tuần 10.

[ERD hiện tại](ERD.md) được sinh từ DMMF; [ADR-011](decisions/ADR-011-phan-hoi-va-tiep-nhan-thanh-tra.md) giải thích quyền và giới hạn. Có thể xem trực tiếp Mermaid trong trình xem Markdown hỗ trợ Mermaid hoặc đưa đoạn sơ đồ vào công cụ Mermaid để xuất SVG.
