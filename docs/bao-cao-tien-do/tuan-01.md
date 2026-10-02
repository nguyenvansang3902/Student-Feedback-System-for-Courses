# BÁO CÁO TIẾN ĐỘ TUẦN 1/15 — bản cập nhật đến 02/10/2026

**Đề tài:** Xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học

**Tiểu luận chuyên ngành:** HK1 2026–2027

**Nhóm:** [Sinh viên tự điền] · **GVHD:** [Sinh viên tự điền]
**Thời gian Tuần 1 theo giả định 7 ngày:** 30/09–06/10/2026; cần đối chiếu lịch chính thức của trường. **Ngày bắt đầu làm thực tế:** 02/10/2026. Báo cáo này chỉ ghi kết quả có bằng chứng đến thời điểm lập báo cáo ngày 02/10, chưa phải bản chốt tuần; không ghi công việc cho 30/09–01/10.

## 1. Mục tiêu của tuần

Theo kế hoạch Tuần 1: tạo tài liệu nền và nghiệp vụ v1; dựng khung Next.js + TypeScript + Prisma + MySQL, Docker Compose `db`/`mailpit`, ESLint/Prettier/Vitest và CI; có trang chủ và trang sức khỏe; chạy `npm run check`; soạn nháp Chương 1. Tuần này không làm đăng nhập hay bảng dữ liệu nghiệp vụ. Theo chỉ đạo của người dùng ngày 02/10, tài liệu nghiệp vụ chỉ trình bày quy trình đề xuất, không viết quy trình hiện tại của trường.

## 2. Kết quả đạt được và bằng chứng

- **Tài liệu:** Đã đối chiếu nguyên văn `AGENTS.md` và ba file sao chép Mục 3–10 từ đặc tả. `docs/NGHIEP_VU.md` v1 gồm quy trình đề xuất, vai trò, thuật ngữ và 33 mã BR; `docs/PROGRESS.md` có 63 FR; đã soạn nháp Chương 1 và giải thích Tuần 1. Các bản nháp cần sinh viên đọc, kiểm chứng và viết lại.
- **Khung ứng dụng:** Có trang chủ, `/suc-khoe`, `GET /api/health`, cấu hình Prisma/MySQL, Compose MySQL + Mailpit và workflow CI. API health trả `database: not_checked`: chỉ kiểm tra tiến trình ứng dụng, còn MySQL được thử riêng.
- **Git:** `git log` ngày 02/10 ghi các commit tiêu biểu: `03e1200` (tài liệu nền), `ea31153` (dịch vụ phát triển), `1b72871` (khung Next/Prisma), `acd5342` (trang và health check FR-102), `8850e0f` (build CI), `a789b20` (CI smoke), `3a1bfef` (ghi nghiệm thu CI), `1396bdd` (ghi giới hạn môi trường), `3caaf7f` (giữ nguyên `AGENTS.md` khi chạy dev) và `58c33ea` (làm rõ trang sức khỏe chỉ kiểm tra ứng dụng). Mã nguồn đã có trên `main` tại `58c33ea`; ảnh chụp và báo cáo cập nhật được lưu cùng dự án.
- **CI:** [Lần 36961330459](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36961330459) cho `58c33ea` qua cả `check` (lint, typecheck, **1/1 Vitest**, build) và `smoke` (Compose MySQL/Mailpit, `npm run dev`, HTTP trang chủ/trang sức khỏe/API).
- **Máy Windows:** Sau `npm ci` đúng lockfile, `npm run check` qua lint, typecheck, **1/1 test**; lượt kiểm tra sau sửa cuối lúc **10:39 ngày 02/10** cũng qua. `npm run build` qua; ba route trên trả **HTTP 200**. `docker compose up -d --wait db mailpit` exit 0 và hai dịch vụ healthy. Truy vấn xác nhận MySQL **8.4.11**, `utf8mb4`, `utf8mb4_vi_0900_ai_ci`, `connection_ok=1`; giao diện Mailpit trả HTTP 200. Cấu hình Next `agentRules: false` qua check/build/HTTP; SHA-256 của `AGENTS.md` trước và sau chạy dev trùng nhau.
- **Ảnh chụp thực tế:** [Trang chủ](../assets/tuan-01/trang-chu.png) · [Trang sức khỏe](../assets/tuan-01/suc-khoe.png).

## 3. Đối chiếu kế hoạch

| Hạng mục Tuần 1 | Trạng thái đến 02/10 | Bằng chứng / ghi chú |
|---|---|---|
| Tài liệu nền, nghiệp vụ v1, nháp Chương 1 | Hoàn thành bản nháp | File trong `docs/`; sinh viên cần rà soát và viết lại. |
| Khung Next.js/TypeScript/Prisma/MySQL | Hoàn thành phạm vi khung | Build qua; chưa có bảng dữ liệu nghiệp vụ theo đúng kế hoạch. |
| Docker Compose `db` + `mailpit` | Hoàn thành nghiệm thu kỹ thuật cục bộ | Hai dịch vụ healthy; SQL và giao diện Mailpit đã thử thật. |
| ESLint/Prettier/Vitest, CI | Hoàn thành cấu hình và kiểm tra | `npm run check` 1/1 test cục bộ; CI trên cho mã nguồn `58c33ea`. |
| Trang chủ và trang sức khỏe | Hoàn thành nghiệm thu kỹ thuật cục bộ | HTTP 200, ảnh chụp thật, API health chỉ kiểm tra ứng dụng. |
| Bản chạy được trên `main` và báo cáo cập nhật | Hoàn thành phạm vi đến 02/10 | Mã nguồn `58c33ea` đã qua CI và có trên `main`; báo cáo cập nhật có đủ 9 mục và ảnh thật. Nhóm bổ sung bản chốt cuối tuần nếu trường yêu cầu. |

## 4. Tiến độ lũy kế

`npm run progress` ngày 02/10 trả **1,8% = 3/163 điểm**, bằng mục tiêu lũy kế Tuần 1 **3/163 điểm**. Đây là tỉ lệ có trọng số theo FR, không phải ước lượng cảm tính. FR-102 [P0] đã tick sau khi có test, nghiệm thu và tài liệu. Mốc khởi động thực tế muộn 2 ngày so với kế hoạch, nên mức điểm đạt kế hoạch không xóa đi chênh lệch thời gian này.

| Module | Điểm đạt / tổng | Tỉ lệ |
|---|---:|---:|
| M1 Xác thực và phiên | 0/23 | 0,0% |
| M2 Người dùng, phân quyền, kiểm toán | 0/9 | 0,0% |
| M3 Danh mục và nhập liệu | 0/9 | 0,0% |
| M4 Mẫu phiếu | 0/16 | 0,0% |
| M5 Đợt khảo sát | 0/22 | 0,0% |
| M6 Làm khảo sát | 0/14 | 0,0% |
| M7 Kết quả | 0/18 | 0,0% |
| M8 Phản hồi | 0/19 | 0,0% |
| M9 Thông báo | 0/7 | 0,0% |
| M10 Báo cáo | 0/12 | 0,0% |
| M11 Hệ thống | 3/11 | 27,3% |
| M12 Mở rộng | 0/3 | 0,0% |

## 5. Khó khăn, rủi ro và hướng xử lý

- Khởi động thực tế ngày 02/10 thay vì 30/09. Giữ cả hai mốc trong báo cáo, ưu tiên nghiệm thu Tuần 1, chưa làm trước Tuần 2 hay cắt P0.
- Ban đầu WSL/Docker và Vitest native bị chặn bởi môi trường Windows. Sau khi người dùng bật hai tính năng Windows cần thiết và khởi động lại lúc 10:25 ngày 02/10, WSL/Docker hoạt động; `npm ci` phục hồi thư viện native. Các kết quả đạt được sau đó được ghi riêng, không viết lại lịch sử lần thử lỗi.
- Lịch nộp tuần chính thức chưa được cung cấp. Khoảng 30/09–06/10 là giả định 7 ngày/tuần; cần đối chiếu trước khi dùng làm mốc báo cáo cuối tuần.
- Endpoint health chưa kiểm tra kết nối DB theo phạm vi Tuần 1; kết nối DB đã được xác minh riêng bằng SQL. Việc nâng cấp endpoint cần được quyết định theo kế hoạch tuần sau, không tự thêm trong tuần này.

## 6. Kế hoạch Tuần 2

Sau khi chốt Tuần 1: lập FR/NFR có mã; sơ đồ use case, hoạt động và máy trạng thái bằng Mermaid; ma trận vai trò × chức năng; ERD và Prisma schema kèm thiết kế ẩn danh; quy ước kiến trúc; wireframe; migration bảng người dùng/danh mục; test kiểm tra schema ẩn danh. Chưa triển khai giao diện chức năng theo ranh giới Tuần 2.

## 7. Phân công và đóng góp từng thành viên

**[SINH VIÊN TỰ ĐIỀN]** Tên, phần việc, bằng chứng và mức đóng góp của từng thành viên. AI không xác nhận đóng góp cá nhân thay nhóm.

## 8. Các bước kiểm tra nhanh cho giảng viên

1. Từ thư mục dự án, chạy `npm ci`, rồi `npm run check`. Kỳ vọng lint/typecheck hoàn tất và **1/1 test** qua.
2. Chạy `docker compose up -d --wait db mailpit`, rồi `docker compose ps`. Kỳ vọng `db` và `mailpit` healthy.
3. Chạy `npm run dev`, mở `http://localhost:3000/` và `http://localhost:3000/suc-khoe`. Kỳ vọng thấy trang chủ và thông báo ứng dụng đang phản hồi như ảnh chụp.
4. Mở `http://localhost:3000/api/health`. Kỳ vọng HTTP 200, `application: available`, `database: not_checked`; đây là kiểm tra ứng dụng, không phải truy vấn DB.
5. Mở `http://localhost:8025`. Kỳ vọng thấy giao diện Mailpit; chưa có email nghiệp vụ ở Tuần 1. Không cần tài khoản demo.

## 9. Bản rút gọn để dán vào hệ thống của trường — bản nháp dưới 150 từ

Tuần 1 theo kế hoạch từ 30/09 đến 06/10/2026; nhóm bắt đầu thực tế ngày 02/10 nên báo cáo này chỉ cập nhật kết quả đến ngày 02/10. Chúng em đã dựng khung website Next.js, trang chủ, trang sức khỏe, MySQL và Mailpit bằng Docker Compose; lập tài liệu nghiệp vụ đề xuất và nháp Chương 1. Lệnh kiểm tra cục bộ qua lint, typecheck, 1/1 test; build và các trang kiểm tra đều chạy. CI cũng qua kiểm tra và chạy thử Compose/dev. Tiến độ theo bảng yêu cầu là 3/163 điểm (1,8%), đúng mục tiêu Tuần 1. Phần đóng góp từng thành viên và lịch nộp chính thức sẽ do nhóm xác nhận. Đây là bản cập nhật giữa tuần, chưa phải báo cáo chốt tuần.

> Sinh viên cần rà soát, viết lại đoạn rút gọn bằng lời của mình và bổ sung thông tin còn thiếu trước khi nộp.
