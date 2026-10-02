# Bảng truy vết yêu cầu

Mỗi FR/BR được nối với màn hình hoặc luồng, service/policy và test khi tuần triển khai tương ứng hoàn tất. Không đánh dấu hoàn thành khi thiếu bằng chứng.

| Mã yêu cầu | Tuần | Màn hình / luồng | Service / policy | Test gắn mã | Bằng chứng nghiệm thu | Trạng thái |
|---|---:|---|---|---|---|---|
| FR-102 | 1 | `/suc-khoe`, `GET /api/health` | `src/lib/health.ts` | `tests/health.test.ts` (1/1 qua trong CI và Windows cục bộ) | [CI main 36961609369](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36961609369) cho `c26b713` qua `check` và Compose/dev `smoke`; sau sự cố 10:50, hai cold start thành công. Lúc 20:29: check exit 0, 1/1 test, HTTP 200 ba route và Mailpit, Compose healthy, SQL MySQL thành công; giữ volume dữ liệu. API trả `database: not_checked`, `Cache-Control: no-store`; DB thử riêng. `agentRules: false` giữ SHA-256 `AGENTS.md`. Build đã qua trong phiên trước. Đăng nhập Docker Desktop phục hồi bằng mã thiết bị và restart lúc 20:37, db/mailpit healthy. | Hoàn thành FR-102 — CI và nghiệm thu cục bộ sau restart qua |
