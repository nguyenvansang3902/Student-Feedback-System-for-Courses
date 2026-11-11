# Sơ đồ ca sử dụng phiên bản 1.0

Sơ đồ thể hiện các ca sử dụng chính của 10 tác nhân. Phạm vi và điều kiện được kiểm trên máy chủ theo vai trò, lớp học phần, bộ môn hoặc khoa, trạng thái nghiệp vụ và MFA khi bắt buộc. [Đặc tả](DAC_TA_NGHIEP_VU.md) · [Điều chỉnh số 01](BO_SUNG_01_TAC_NHAN.md)

```mermaid
flowchart LR
    subgraph survey["Khảo sát và cải tiến"]
        direction LR
        SV["Sinh viên"] --- A(["Nộp khảo sát<br/>Gửi và theo dõi phản hồi"])
        GV["Giảng viên"] --- B(["Xem kết quả lớp<br/>Trả lời phản hồi, giải trình"])
        TBM["Trưởng bộ môn"] --- C(["Xác nhận giải trình<br/>Xem xét kiến nghị"])
        TK["Trưởng khoa"] --- D(["Xem tổng hợp khoa<br/>Theo dõi việc quá hạn"])
        DBCL["Cán bộ ĐBCL"] --- E(["Soạn mẫu, lập đợt<br/>Kiểm duyệt và công bố"])
    end
    subgraph operations["Điều phối và vận hành"]
        direction LR
        LD["Lãnh đạo"] --- F(["Phê duyệt đợt<br/>Xem và xuất báo cáo"])
        ADMIN["Quản trị hệ thống"] --- G(["Vận hành tài khoản<br/>Phân quyền và cấu hình"])
        PDT["Phòng Đào tạo"] --- H(["Quản lý dữ liệu đào tạo<br/>Xác nhận đối tượng"])
        KT["Phòng Khảo thí"] --- I(["Xử lý phản hồi thi<br/>Xem chỉ số đánh giá gộp"])
        TT["Phòng Thanh tra"] --- J(["Xử lý hồ sơ<br/>Xem cảnh báo bất thường"])
    end
    survey ~~~ operations

    classDef actor fill:#f2f5f9,stroke:#52657b,color:#142638,stroke-width:1.2px
    classDef useCase fill:#e8f5f3,stroke:#207875,color:#123d3b,stroke-width:1.2px
    class SV,GV,TBM,TK,DBCL,LD,ADMIN,PDT,KT,TT actor
    class A,B,C,D,E,F,G,H,I,J useCase
    style survey fill:#ffffff,stroke:#6ba5a1,color:#123d3b
    style operations fill:#ffffff,stroke:#6ba5a1,color:#123d3b
```

[Ảnh sơ đồ dùng trong báo cáo](assets/tuan-15/use-case-v1.png) · [Hướng dẫn 10 vai trò](HUONG_DAN_SU_DUNG.md)

Phòng Thanh tra dùng phần mềm để quản lý và theo dõi hồ sơ. Kết luận và xử lý chính thức vẫn theo thẩm quyền của trường. Phòng Khảo thí xử lý phản hồi thi trong phạm vi được giao, còn phúc khảo thực hiện theo quy trình riêng. Kết quả khảo sát bảo vệ danh tính ở mức ứng dụng và chịu ngưỡng công bố.
