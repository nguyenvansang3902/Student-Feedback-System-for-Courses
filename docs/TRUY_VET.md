# Bảng truy vết yêu cầu

Mỗi FR/BR được nối với màn hình hoặc luồng, service/policy và test khi tuần triển khai tương ứng hoàn tất. Không đánh dấu hoàn thành khi thiếu bằng chứng.

| Mã yêu cầu | Tuần | Màn hình / luồng | Service / policy | Test gắn mã | Bằng chứng nghiệm thu | Trạng thái |
|---|---:|---|---|---|---|---|
| FR-102 | 1 | `/suc-khoe`, `GET /api/health` | `src/lib/health.ts` | `tests/health.test.ts` (1/1 qua trong CI) | [GitHub Actions 36957548188](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36957548188): `check` (lint, typecheck, Vitest, build) và `smoke` (Compose MySQL/Mailpit, dev, HTTP trang chủ/trang sức khỏe/API) đều qua; API trả `database: not_checked`, `Cache-Control: no-store` | Hoàn thành — nghiệm thu trên CI; kiểm tra cục bộ Windows còn bị chặn |
