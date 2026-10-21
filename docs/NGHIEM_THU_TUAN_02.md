# Nghiệm thu Tuần 2 — phân tích và thiết kế

**Thực hiện:** 21/10/2026 (Asia/Saigon). **Kế hoạch giả định:** 07–13/10/2026 nếu mỗi tuần 7 ngày từ 30/09. Đây là phần việc được làm muộn theo lệnh tiếp tục Tuần 2, không phải kết quả đã có trong tuần kế hoạch.

## 1. Phạm vi nghiệm thu

Yêu cầu có mã, sơ đồ nghiệp vụ, ma trận quyền, ERD/schema đầy đủ, thiết kế ẩn danh 5.6, quy ước kiến trúc, wireframe, migration người dùng/danh mục và nháp Chương 2–3. Không có giao diện/service chức năng. Không đăng nhập thử tài khoản demo vì Tuần 2 chưa có xác thực hoặc tài khoản demo.

## 2. Đọc và đối chiếu thiết kế

| Đầu ra    | Đường dẫn                                                                                                         | Điều cần kiểm tra                                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| FR/NFR    | [YEU_CAU](YEU_CAU.md)                                                                                             | 63 FR giữ mã/ưu tiên; NFR có mã và tiêu chí, không tự bỏ P0                                                            |
| Sơ đồ     | [SO_DO_NGHIEP_VU](SO_DO_NGHIEP_VU.md)                                                                             | Use case, hoạt động, trạng thái đợt/phản hồi/giải trình khớp nguồn; mở bằng trình hỗ trợ Mermaid                       |
| Quyền     | [PHAN_QUYEN](PHAN_QUYEN.md)                                                                                       | 7 vai trò, phạm vi, từ chối mặc định, ADMIN không tự xem nội dung nghiệp vụ                                            |
| Dữ liệu   | [ERD](ERD.md), [THIET_KE_CSDL](THIET_KE_CSDL.md)                                                                  | 39 model blueprint và 9 model runtime; quan hệ/khóa/CHECK; không migrate model tuần sau                                |
| Ẩn danh   | [THIET_KE_AN_DANH](THIET_KE_AN_DANH.md), [ADR-003](decisions/ADR-003-an-danh.md)                                  | Không đường quan hệ trực tiếp/gián tiếp tới User/SurveyTask; scalar metadata được service xác minh; không server draft |
| Kiến trúc | [KIEN_TRUC](KIEN_TRUC.md), [ADR-002](decisions/ADR-002-schema-theo-tuan.md)                                       | Service nhận actor, policy trước truy cập, DTO theo vai trò; runtime/blueprint và shadow tách biệt                     |
| Wireframe | [18 màn HTML tĩnh](wireframes/tuan-02.html), [bảng ánh xạ](WIREFRAME.md)                                          | WF-01–18, điện thoại/desktop, Tab/Enter, nhãn bản thiết kế; nút nghiệp vụ không chạy                                   |
| Báo cáo   | [Chương 2](bao-cao-tieu-luan/chuong-2-phan-tich-nghiep-vu.md), [Chương 3](bao-cao-tieu-luan/chuong-3-thiet-ke.md) | Có nhãn nháp AI, sinh viên viết lại; không quy trình hiện tại của trường, không kết quả/đóng góp bịa                   |

Không dùng sơ đồ hoặc wireframe làm bằng chứng chức năng đã chạy. Số liệu TC-AGG-01 trong thiết kế là kỳ vọng để test Tuần 9, không kết quả hàm tổng hợp hiện tại.

## 3. Tái chạy kỹ thuật bằng dữ liệu giả

Tại thư mục gốc dự án, Node.js 24+ và Docker Desktop Linux engine đã chạy. Nếu chưa có `.env`, sao chép `.env.example`; giữ cấu hình đúng volume cũ, không đổi mật khẩu chỉ bằng việc sửa file. Xem [README](../README.md) trước khi chuẩn bị shadow.

```powershell
npm ci
docker compose up -d --wait --wait-timeout 180 db mailpit
npm run db:validate
npm run db:prepare
npm run db:migrate
npm run test:integration
npm run check
npm run build
npm run progress
```

Kỳ vọng:

- Validate cả hai schema; metadata DMMF từ Prisma thật, không tự phân tích quan hệ bằng regex.
- Prepare chỉ chấp nhận cấu hình/server phù hợp, tạo hoặc nhận đúng shadow có marker và tên khác DB chính; quyền theo database, không toàn server.
- Migrate dùng `prisma/schema.prisma`. Lần đầu áp migration `20261021160354_week2_users_catalog`; lần sau báo đồng bộ, không tạo thêm bảng khảo sát/phiên/TOTP/phản hồi.
- Tích hợp đúng 9 bảng nghiệp vụ (ngoài `_prisma_migrations`), FK Restrict/unique/CHECK hợp lệ, không để lại fixture.
- Check không lỗi, test DMMF kiểm 5.6a/UUID/DATE/whitelist và parity nền/shadow guard; build chạy riêng.
- Progress 3/163 điểm = 1,8%, mục tiêu có trọng số đến Tuần 2 cũng 3/163; vẫn phải ghi chậm mốc lịch vì làm ngày 21/10.

**Không** thêm `--schema prisma/design.prisma` vào migrate/db push; không reset/xóa volume để xử lý drift. Nếu lệnh đề nghị reset database có dữ liệu, dừng để đọc nguyên nhân, giữ dữ liệu và hỏi trước hành động xóa theo AGENTS.

## 4. Bằng chứng đã chạy ngày 21/10/2026

| Mục                                  | Kết quả thực tế                                                      | Bằng chứng/giới hạn                                                                                                                                                                                                                                            |
| ------------------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration dev                        | Áp dụng thành công; hai lần chạy lại báo đồng bộ                     | 9 bảng, 11 FK Restrict, 3 CHECK; giữ volume; status up-to-date, diff không khác biệt, deploy không có migration chờ                                                                                                                                            |
| MySQL tích hợp                       | **10/10 qua**                                                        | scripts/verify-database.mjs; trùng/FK/role/phạm vi/ngày/tín chỉ; fixture transaction rollback                                                                                                                                                                  |
| Validate/generate và check           | **Exit 0, 14/14 Vitest**                                             | 13 test schema/guard và 1 health; ERD khớp DMMF, ESLint và TypeScript qua; Prisma/client/helper 7.10.1                                                                                                                                                         |
| Prepare shadow                       | **6/6 tình huống qua**                                               | Sai cổng 3307, mật khẩu lệch, Docker endpoint override, shadow trùng DB và marker sai server bị chặn; cấu hình đúng chạy lại qua. Probe xác minh UUID server trước CREATE/GRANT, marker gắn server/mainDB/disposable                                           |
| Production build                     | **Exit 0**                                                           | Next.js 16.3.8; chỉ các route khung Tuần 1, không tạo giao diện chức năng tuần sau                                                                                                                                                                             |
| Sơ đồ                                | **13/13 Mermaid render thành công**                                  | [Gallery SVG](SO_DO_DA_RENDER.md), SHA nguồn/ảnh; đã xem ảnh thật. ERD rộng cần zoom, hoạt động khảo sát dài cần cuộn                                                                                                                                          |
| Wireframe                            | **18 màn kiểm ở 1440/390 px**                                        | Đã xem 10 ảnh; không tràn ngoài vùng bảng, control nghiệp vụ bị vô hiệu hóa. [Ảnh desktop](assets/tuan-02/wireframe-desktop.png), [điện thoại](assets/tuan-02/wireframe-mobile.png); không nhận là đã thử 360 px/bàn phím đầy đủ                               |
| HTTP cục bộ                          | **200 cho ba route và Mailpit**                                      | Production thử cổng 3001: /, /suc-khoe, /api/health; payload status=ok/application=available/database=not_checked, Cache-Control=no-store; Mailpit cổng 8025. Đã dừng server 3001 sau thử                                                                      |
| CI mã Tuần 2                         | **check và smoke thành công**                                        | [CI 39634835024](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39634835024) tại commit 723e165; Linux npm ci/Compose/prepare/deploy/status/diff/MySQL/check/build/HTTP dev. Commit 85de07a thêm tài liệu phân tích/SVG |
| Tiến độ chức năng                    | **1,8% (3/163 điểm)**                                                | npm run progress đã chạy; chỉ FR-102 được tick, không tính thiết kế thành FR đã hiện thực                                                                                                                                                                      |
| Kiểm thư viện                        | Production **0** cảnh báo; toàn bộ còn **5 high ở dev dependencies** | Prisma 7.10.1 và Vite 8.3.5 đã vá; còn chuỗi braces → micromatch → fast-glob → ESLint. npm audit đề nghị force downgrade ESLint; chưa áp dụng thay đổi major này                                                                                               |
| Test 5.6b/c/d và chức năng nghiệp vụ | Chưa triển khai, đúng phạm vi Tuần 2                                 | Tuần 8 nộp một lần/20 request và kiểm export, hoàn thiện định dạng xuất Tuần 12; không tick FR-53 từ test cấu trúc                                                                                                                                             |

Đã đạt các cổng nghiệm thu kỹ thuật Tuần 2. Việc nhóm/GVHD duyệt thiết kế, thông tin nhóm và sinh viên viết lại báo cáo vẫn cần người thật thực hiện. Bốn file sao chép nguồn không thay đổi; SHA-256 AGENTS.md vẫn là 51EFDF8AAF54DEC760416E61F161E1BC2801E5AF041DFCC99E7186B9432FB0F6.

## 5. Xem lại khung ứng dụng

```powershell
npm run dev
```

Mở [trang chủ](http://127.0.0.1:3000), [sức khỏe](http://127.0.0.1:3000/suc-khoe), [API health](http://127.0.0.1:3000/api/health), [Mailpit](http://127.0.0.1:8025). Kỳ vọng HTTP 200, API có `status: ok`, `application: available`, `database: not_checked`. DB được thử riêng bằng SQL, không nâng cấp health thành bằng chứng kết nối DB. Kết quả đã thử tại cổng 3001 được ghi ở Mục 4; cổng 3000 trong hướng dẫn là cổng dev mặc định.

## 6. Nhóm cần xác nhận

- Góp ý và duyệt thiết kế, lịch tuần chính thức, thông tin nhóm/GVHD và đóng góp thực tế.
- Sinh viên đọc/viết lại Chương 2–3 và đoạn báo cáo rút gọn trước khi nộp.
- Hiểu khác biệt ẩn danh phiếu và che tác giả Feedback; hiểu giới hạn trước DBA/log/nhóm nhỏ.
- Giữ các FR chức năng chưa tick; sau nghiệm thu Tuần 2 mới yêu cầu tiếp tục Tuần 3.
