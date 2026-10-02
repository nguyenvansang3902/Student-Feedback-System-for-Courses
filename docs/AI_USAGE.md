# Nhật ký sử dụng AI

Tài liệu và mã do AI hỗ trợ là bản nháp kỹ thuật. Sinh viên cần đọc, kiểm chứng, hiểu và viết lại phần thuyết minh bằng lời của mình theo quy định của trường.

| Ngày | Phần việc AI thực hiện | File chính | Người rà soát / ghi chú |
|---|---|---|---|
| 02/10/2026 | Khởi tạo tài liệu Tuần 1 từ đặc tả do người dùng cung cấp; sao chép nguyên văn các mục được chỉ định; lập bảng FR, khung truy vết và bản nháp nghiệp vụ, Chương 1, giải thích Tuần 1. | `AGENTS.md`; `docs/DAC_TA_NGHIEP_VU.md`; `docs/KE_HOACH_15_TUAN.md`; `docs/BAO_CAO_TIEN_DO_MAU.md`; `docs/PROJECT_STATE.md`; `docs/PROGRESS.md`; `docs/TRUY_VET.md`; `docs/NGHIEP_VU.md`; `docs/bao-cao-tieu-luan/chuong-1-tong-quan.md`; `docs/GIAI_THICH/tuan-01.md` | Chờ sinh viên rà soát; chưa gán đóng góp cho cá nhân. |
| 02/10/2026 | Dựng khung Next.js/Prisma, trang chủ và health check, cấu hình Compose/CI, test và script tiến độ; kiểm tra mã và ghi đúng giới hạn môi trường. | `package.json`; `src/`; `tests/`; `scripts/progress.mjs`; `prisma/`; `docker-compose.yml`; `.github/workflows/check.yml`; `README.md` | AI thực hiện. CI [36957106844](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36957106844) qua lint/typecheck/1 Vitest/build; kiểm tra cục bộ Windows bị chặn ở Vitest native. |
| 02/10/2026 | Bổ sung CI smoke Compose/dev và cập nhật tài liệu, bảng tiến độ, truy vết theo bằng chứng thực tế. | `.github/workflows/check.yml`; `README.md`; `docs/PROJECT_STATE.md`; `docs/PROGRESS.md`; `docs/TRUY_VET.md`; `docs/AI_USAGE.md` | CI [36957548188](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36957548188) qua cả `check` và `smoke` (MySQL/Mailpit, trang chủ, trang sức khỏe, API). Docker daemon cục bộ còn bị chặn bởi WSL 2. |
| 02/10/2026 | Theo ủy quyền của người dùng, thử hoàn tất môi trường WSL 2/Docker và cô lập lỗi Vitest cục bộ; cập nhật tài liệu theo kết quả thật. | `README.md`; `docs/PROJECT_STATE.md`; `docs/AI_USAGE.md` | Tải MSI WSL 2.7.14 bị quyền socket sandbox chặn; script quyền quản trị dừng `0xc0000142` trước UAC; DISM trả Error 740. WSL 2 chưa có, Docker Engine chưa chạy, không khởi động lại hay đổi tính năng Windows. Thử WASI lỗi resolver với fixture kế bên; CI Linux vẫn xanh, mã nguồn không đổi. |

Các phiên sau thêm dòng mới theo công việc đã thực sự làm; không ghi thay phần việc của sinh viên.
