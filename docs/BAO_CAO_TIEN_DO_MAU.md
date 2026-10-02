## 10\. BÁO CÁO TIẾN ĐỘ HẰNG TUẦN

Khi nhận lệnh `BÁO CÁO TUẦN N`, tạo `docs/bao-cao-tien-do/tuan-NN.md` theo mẫu dưới (lưu mẫu vào `docs/BAO\_CAO\_TIEN\_DO\_MAU.md`). Dữ liệu lấy từ thực tế: `git log` của tuần, kết quả `npm run check`, `npm run progress`. **Không ước lượng phần trăm bằng cảm tính.**

```
BÁO CÁO TIẾN ĐỘ TUẦN {N}/15
Đề tài: Xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học
Tiểu luận chuyên ngành HK1 2026-2027 | Nhóm: \[sinh viên điền] | GVHD: \[sinh viên điền]
Thời gian: từ \[ngày] đến \[ngày]

1. Mục tiêu của tuần (theo kế hoạch)
2. Kết quả đạt được (kèm bằng chứng: commit/PR, ảnh chụp màn hình, kết quả test)
3. Đối chiếu kế hoạch: từng mục Hoàn thành / Một phần / Chưa làm, kèm lý do
4. Tiến độ lũy kế: X% tổng thể (từ npm run progress); bảng theo module; so với kế hoạch: đúng/chậm/vượt
5. Khó khăn, rủi ro và hướng xử lý
6. Kế hoạch tuần {N+1}
7. Phân công và đóng góp từng thành viên: \[SINH VIÊN TỰ ĐIỀN, AI không điền]
8. Các bước kiểm tra nhanh cho giảng viên (3-6 bước bấm kèm kết quả mong đợi)
9. BẢN RÚT GỌN ĐỂ DÁN VÀO HỆ THỐNG CỦA TRƯỜNG (tối đa 150 từ, văn phong sinh viên, trung thực)
```

Tiến độ: `docs/PROGRESS.md` gồm mỗi FR một dòng `- \[ ] FR-xx \[P?] tên (tuần dự kiến)`. Trọng số P0 = 3, P1 = 2, P2 = 1. `npm run progress` in tỉ lệ tổng, theo module và so với tỉ lệ kế hoạch lũy kế đến tuần hiện tại. Chỉ tick khi đủ: có test qua, nghiệm thu được, tài liệu cập nhật.

Nếu trường có mẫu báo cáo riêng, người dùng sẽ dán vào và bạn chỉnh mẫu cho khớp, không đổi nội dung thực.

