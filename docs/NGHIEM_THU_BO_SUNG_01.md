# Báo cáo phiên — Điều chỉnh số 01, việc bù G1

Thực hiện kỹ thuật **28–29/10/2026 (Asia/Saigon)**, sau khi xác minh Tuần 1–6 đã hoàn thành ở `5346de9`. Đây là **việc bù sau Tuần 6**, chưa bắt đầu Tuần 7. Nguồn: [prompt nguyên văn](BO_SUNG_01_TAC_NHAN.md), [ma trận quyền](MA_TRAN_QUYEN.md). Ngày GVHD yêu cầu và tên người yêu cầu: **[sinh viên tự điền]**; ngày chạy kỹ thuật không thay ngày yêu cầu.

## Tệp và kết quả thay đổi

| Nhóm tệp | Kết quả G1 |
| --- | --- |
| AGENTS.md; DAC_TA_NGHIEP_VU, KE_HOACH_15_TUAN, BAO_CAO_TIEN_DO_MAU, PROGRESS, TRUY_VET, PROJECT_STATE, AI_USAGE trong docs | Thêm 10 vai trò, 21 FR/19 BR, 9 mã TC; phân tuần và mục báo cáo điều chỉnh. Giữ mục 5.6/8.3–8.6 và báo cáo lịch sử; AGENTS chỉ thêm 3 dòng |
| prisma/schema.prisma, design.prisma, migration mới | Role 10, cờ nhóm false, enum đợt và 8 loại phản hồi; SQL CHECK vai trò GLOBAL mới. Runtime 31, blueprint 46; 7 bảng bổ sung chỉ thiết kế |
| policies/can.ts, services/catalog.ts, auth/csrf.ts, catalog API/UI, mail.ts | PĐT ghi dữ liệu đào tạo/import, ADMIN MFA chỉ khoa/bộ môn, ĐBCL chỉ đọc; mở khóa có lý do, audit, CAS và email sau commit |
| services/users.ts, mfa-policy.ts, audit.ts; admin API; nhãn tài khoản/không gian | Nhận ba role mới, scope đúng; cấu hình MFA đủ 10 vai trò; ADMIN vẫn bắt buộc 2FA |
| template-input.ts, templates.ts, template-editor.tsx, template-preview.tsx | isAssessmentGroup lưu, hiển thị, giữ khi clone/version; mẫu khóa không sửa được |
| demo-seed.ts, seed-template-default.ts, verify-demo.ts | Bốn tài khoản mới; family mặc định 3 nhóm/7 câu, đúng 1 nhóm Kiểm tra, đánh giá; giữ cây cũ và lựa chọn mặc định tùy chỉnh |
| scripts/amendment-preflight.mjs, package.json | npm db:deploy tự kiểm enum cũ trước DDL và đúng Docker/cổng database đích; dừng khi còn CSVC_LICH_HOC |
| tests/*; verify-week4/5/6.ts, verify-database.mjs | Ma trận 10 vai trò/IDOR của chức năng hiện có, SQL scope, unlock/Mailpit, cờ nhóm và tính bất biến |
| ERD.md, export-erd.mjs, assets/bo-sung-01, SO_DO_BO_SUNG_01, QA_GIAO_DIEN_BO_SUNG_01 | Thiết kế và ảnh mới; giữ tài sản Tuần 6. [QA giao diện](QA_GIAO_DIEN_BO_SUNG_01.md), [sơ đồ](SO_DO_BO_SUNG_01.md) |
| README.md, HUONG_DAN_IMPORT.md, scripts/demo.mjs | Hướng dẫn đúng tài khoản/quyền hiện tại, nâng cấp có bảo toàn dữ liệu |

## Mâu thuẫn đã đối chiếu

G1/FR-140 nói chuyển quyền danh mục từ ADMIN, nhưng code Tuần 5 thực tế do **CAN_BO_DBCL** ghi. Đã báo người dùng và áp dụng kết quả đích nêu rõ ở D1/E1: PĐT ghi dữ liệu đào tạo, ADMIN ghi khoa/bộ môn, ĐBCL đọc danh mục và soạn mẫu. Không suy quyền ADMIN xem nghiệp vụ từ thay đổi này.

E8 có seed cho luồng tương lai, còn A/G1 cấm làm trước. Phiên này chỉ thêm tài khoản và nhóm mặc định; readiness, phản hồi mới, hồ sơ Thanh tra, cảnh báo và kết quả gộp được seed khi triển khai tuần tương ứng. “QuestionGroup” trong prompt tương ứng model hiện có **CriterionGroup**, không tạo bảng trùng.

Loại phản hồi cũ trộn lịch học/cơ sở vật chất không có ánh xạ tự động an toàn. Main có **0 dòng CSVC_LICH_HOC**, 6 phản hồi đều GIANG_DAY, nên đã migrate. Máy khác còn loại cũ bị npm db:deploy chặn trước DDL để người dùng quyết định phân loại. Migration cũ giữ nguyên byte.

## Kiểm tra chạy thật

`npm run check` chạy thật lúc **02:00 ngày 29/10/2026** đã qua **346/346 test trong 25 file**, gồm validate/generate hai schema, ERD, ESLint và TypeScript. `npm run build` qua trên Next.js 16.4.3; chưa có kết quả CI mới tại thời điểm ghi đoạn này. Các bộ sau cũng đã hoàn thành:

| Bộ kiểm | Kết quả và phạm vi |
| --- | --- |
| MySQL | **16/16**, gồm 3 role GLOBAL hợp lệ và 3 trường hợp chặn scope FACULTY; fixture rollback |
| HTTP/MySQL/Mailpit danh mục/import | **23/23**; TC-PDT-01, FR-141, TC-ALL-01 một phần; audit và thư mở khóa thật |
| HTTP/MySQL mẫu phiếu | **20/20**, 10 vai trò; cờ/clone/version/khóa/CAS, preview không tạo phiếu |
| CLI và HTTP quản trị | **5/5 + 28/28**, gồm cấu hình đủ 10 vai trò MFA qua API/step-up TOTP; fixture dọn |
| HTTP auth/MySQL/Mailpit | **24/24**, login/refresh/replay/reset/kích hoạt/rate limit; fixture dọn |
| Demo riêng | **12/12** nhóm; small/medium/large, tài khoản mới, cờ nhóm, giữ cây/UUID/mật khẩu/trạng thái/default tùy chỉnh |
| UI | **7/7** nhóm, **16/16** viewport desktop 1440/mobile 390; 0 pageerror/overflow/thiếu nhãn; fixture dọn, seed không đổi |
| ERD | Khớp DMMF **46/31**, 4 Mermaid render qua; 4 SVG thẻ và 9 PNG kiểm sơ đồ đã xem |
| Main | Migration đã deploy; migrate diff **No difference detected**; hash 16 tập trước/sau khớp |

Đối chiếu main gồm **1.568 tài khoản cũ**, cây 2 mẫu cũ, đợt/task, **78 phiếu/234 đáp án/3 tổng hợp**, phản hồi/lịch sử. Seed chỉ thêm 4 tài khoản và family mới; cho phép đổi metadata chọn mặc định của family dựng sẵn, cây khóa không đổi.

HTTP mẫu/danh mục dùng phiên fixture hợp lệ để kiểm API/service; login/TOTP kiểm riêng. UI import kiểm trang/form, commit file thật kiểm bằng HTTP/MySQL/Mailpit. Các lượt UI đầu chưa hoàn thành vì harness đọc body login sau navigation và HMR khi chạy build đồng thời; đã sửa thứ tự bộ kiểm, chạy lại đầy đủ. Không sửa sản phẩm để bỏ gate.

## Giới hạn, tiến độ và điểm dừng

FR-140/141/148 chỉ tick sau gate cuối. **FR-160/TC-ALL-01 vẫn một phần**: ma trận/IDOR 10 vai trò cho chức năng hiện có đã kiểm; kết quả/hồ sơ/dashboard/thống kê/tệp xuất chờ tuần 9–13. Không tick FR-142–147/149–159 hoặc nhận đã chạy các TC readiness, Khảo thí, Thanh tra chưa hiện thực.

Thông báo mở khóa gửi SMTP sau commit với SENT/FAILED/NO_RECIPIENT và audit biên nhận; chưa có outbox/retry bền vững. Lỗi gửi được báo rõ, không lùi giao dịch khóa kỳ hoặc nhận thành công giả. Hai tài khoản Thanh tra mới chỉ là nền, chưa chứng minh workflow/xung đột lợi ích.

**Ước lượng**, không phải giờ làm hay đóng góp thực tế của sinh viên: G1 tương đương **1–2 ngày công**; các phần bổ sung còn lại có thể tăng **8–12 ngày công**, tập trung Tuần 7 và 9–13. Giữ kế hoạch 15 tuần, không tự cắt P0/P1; nếu thiếu thời gian, trình người dùng thứ tự cắt P1 ở G3 trước khi thay phạm vi. Nhóm tự đối chiếu lịch trường và điền báo cáo tuần.

Sau G1 **dừng**. Chỉ triển khai đợt/readiness/xác nhận khi người dùng gõ **BẮT ĐẦU TUẦN 7**.
