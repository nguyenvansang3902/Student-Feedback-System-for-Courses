# Trạng thái dự án

- Tuần hiện tại: Tuần 15, thực hiện 11/11/2026.
- Bản bảo vệ dùng mốc Git `v1.0` và phiên bản gói `1.0.0`. [Hồ sơ nghiệm thu](NGHIEM_THU_TUAN_15.md) · [Báo cáo tuần](bao-cao-tien-do/tuan-15.md)
- Tiến độ **213/219 điểm (97,3%), 79/84 FR**. Kế hoạch lũy kế 215/219. FR-145 và bốn FR P2 còn mở. [Ma trận FR](PROGRESS.md)

## Chạy và kiểm tra

- Bản demo dùng Docker Linux containers và Node.js 24. Chạy `node scripts/start-demo-compose.mjs`. Website ở `http://127.0.0.1:3014`, Mailpit ở `http://127.0.0.1:8034`. [README](../README.md)
- Dữ liệu dự án trên máy hiện tại dùng launcher `KHOI_DONG_DU_AN.cmd` và cổng 3000. Kho Docker WSL trên máy ở `D:\DockerData\DockerDesktopWSL`. [Hồ sơ Docker](DOCKER_MOT_KHO_DU_LIEU.md)
- Check Windows trên gói 1.0.0 qua 93 tệp, 2.155 passed và 1 skipped do quyền symlink. [Kết quả](assets/tuan-15/check.json)
- CI trên commit ứng dụng `e53d083` qua cả check, smoke và e2e. [GitHub Actions](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/42982583192) · [Kết quả](assets/tuan-15/ci-e53d083.json)
- Hồi quy UC-GOLD qua 6/6 ca ngày 11/11 trên mã ứng dụng nền `d39d4cc`. Lượt kiểm tay trọn chuỗi ngày 04–05/11 lưu riêng. [UC-GOLD Tuần 15](UC_GOLD_TUAN_15.md)
- [Sơ đồ 10 tác nhân](SO_DO_CA_SU_DUNG_TUAN_15.md), [kịch bản bảo vệ](KICH_BAN_BAO_VE_TUAN_15.md), [câu hỏi phản biện](CAU_HOI_PHAN_BIEN_TUAN_15.md) và [hướng dẫn sử dụng](HUONG_DAN_SU_DUNG.md).

## Việc nhóm cần xác nhận

- Điền thông tin học vụ và đóng góp thực tế. Mỗi thành viên tập giải thích phần mình đã thực hiện. Lượt người ngoài nhóm tự cài theo README cần người thực hiện xác nhận. [Bảng thành viên](TEAM.md)
- Lượt đo Tuần 13 có p95 3.595,91 ms, cao hơn mục tiêu 3.000 ms. Ẩn danh áp dụng ở mức ứng dụng. Các giới hạn kiểm thử, quét nguồn, khả năng tiếp cận và vận hành được ghi trong hồ sơ. [Giới hạn Tuần 13](LOI_CON_TON_TUAN_13.md)
- Nâng cấp giao diện thực hiện theo lệnh giai đoạn riêng khi người dùng yêu cầu. [AGENTS.md](../AGENTS.md)
