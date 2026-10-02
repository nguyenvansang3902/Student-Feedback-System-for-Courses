# Bảng truy vết yêu cầu

Mỗi FR/BR được nối với màn hình hoặc luồng, service/policy và test khi tuần triển khai tương ứng hoàn tất. Không đánh dấu hoàn thành khi thiếu bằng chứng.

| Mã yêu cầu | Tuần | Màn hình / luồng | Service / policy | Test gắn mã | Bằng chứng nghiệm thu | Trạng thái |
|---|---:|---|---|---|---|---|
| FR-102 | 1 | `/suc-khoe`, `GET /api/health` | `src/lib/health.ts` | `tests/health.test.ts` (1/1 qua trong CI và Windows cục bộ) | [GitHub Actions 36957548188](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/36957548188): `check` và Compose/dev `smoke` qua; Windows cục bộ qua `npm run check`, build, HTTP 200 ba route, Compose MySQL/Mailpit healthy, MySQL SQL và Mailpit UI. API trả `database: not_checked`, `Cache-Control: no-store`; DB được thử riêng. Cấu hình `agentRules: false` qua check/build/HTTP, SHA-256 `AGENTS.md` trước/sau dev trùng nhau. | Hoàn thành FR-102 — CI và nghiệm thu kỹ thuật cục bộ qua |
