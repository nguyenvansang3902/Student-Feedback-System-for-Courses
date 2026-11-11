# Trạng thái dự án

- Tuần hiện tại: Tuần 14, thực hiện 10–11/11/2026 theo yêu cầu tiếp tục đề tài.
- Phạm vi: đóng gói demo và triển khai, sao lưu và khôi phục FR-103, hướng dẫn sử dụng có ảnh và demo dự phòng. Chi tiết ở [hồ sơ nghiệm thu](NGHIEM_THU_TUAN_14.md) và [báo cáo tuần](bao-cao-tien-do/tuan-14.md).
- FR-103 đã qua sao lưu và phục hồi thử 46 bảng, 811 dòng, một tệp đính kèm. Tiến độ hiện tại **213/219 điểm (97,3%), 79/84 FR**. [Danh sách FR](PROGRESS.md)

## Chạy và kiểm tra

- Demo trên máy mới: bật Docker Linux containers, cài Node.js 24 và chạy `node scripts/start-demo-compose.mjs`. Website ở `http://127.0.0.1:3014`, Mailpit ở `http://127.0.0.1:8034`. Demo có volume MySQL và kho đính kèm riêng. [README](../README.md)
- Máy đang dùng dữ liệu dự án: mở Docker và chạy `KHOI_DONG_DU_AN.cmd` ở thư mục dự án. Website cục bộ ở `http://localhost:3000`. Máy này dùng kho Docker WSL `D:\DockerData\DockerDesktopWSL`. [Hồ sơ Docker](DOCKER_MOT_KHO_DU_LIEU.md)
- [Vận hành Compose và biến production](VAN_HANH_TUAN_14.md), [sao lưu và khôi phục FR-103](SAO_LUU_KHOI_PHUC.md), [hướng dẫn 10 vai trò](HUONG_DAN_SU_DUNG.md), [kịch bản và video](KICH_BAN_DEMO.md).
- Check Windows qua 93 tệp, 2.155 passed và 1 skipped trên 2.156. Hồi quy Playwright qua 6/6 trên nguồn nền và database thử riêng. GitHub Actions của commit triển khai `077fdf4` qua check, e2e và smoke. [Số liệu tại máy](assets/tuan-14/regression.json) · [CI](assets/tuan-14/ci-077fdf4.json)

## Việc cần xác nhận

- Môi trường triển khai được kiểm cục bộ. Mốc người ngoài nhóm tự chạy theo README cần người thực hiện xác nhận.
- Tải Tuần 13 có p95 3.595,91 ms, cao hơn mục tiêu 3.000 ms. Báo cáo giữ các giới hạn bảo mật, kiểm thử và khả năng tiếp cận. [Các mục còn tồn tại](LOI_CON_TON_TUAN_13.md)
- Tiếp tục theo lệnh bắt đầu Tuần 15 để làm báo cáo, slide và bảo vệ. Nâng cấp giao diện cần lệnh giai đoạn riêng theo AGENTS.md.
