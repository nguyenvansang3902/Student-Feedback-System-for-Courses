# Bảng truy vết yêu cầu

Mỗi FR/BR được nối với màn hình hoặc luồng, service/policy và test khi tuần triển khai tương ứng hoàn tất. Không đánh dấu hoàn thành khi thiếu bằng chứng.

| Mã yêu cầu | Tuần | Màn hình / luồng | Service / policy | Test gắn mã | Bằng chứng nghiệm thu | Trạng thái |
|---|---:|---|---|---|---|---|
| FR-102 | 1 | `/suc-khoe`, `GET /api/health` | `src/lib/health.ts` | `tests/health.test.ts` (Vitest chưa chạy do Windows Application Control) | HTTP 200 cho trang và API; API trả `database: not_checked`, `Cache-Control: no-store`; commit `acd5342` | Một phần — chờ test tự động và Compose |
