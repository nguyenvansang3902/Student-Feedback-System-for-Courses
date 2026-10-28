# Nghiệm thu Tuần 6 — mẫu phiếu khảo sát

**Kế hoạch giả định:** 04–10/11/2026. **Thực hiện:** bắt đầu 22/10/2026, tiếp tục 28/10/2026 sau gián đoạn, Asia/Saigon; làm sớm theo lệnh người dùng, không ghi lùi ngày. **Đã nghiệm thu FR-30–35 trong phạm vi Tuần 6** bằng kiểm máy chủ, MySQL, giao diện và CI mã. CI main sau chốt tài liệu đối chiếu đúng SHA trong Actions.

## 1. Phạm vi

| FR | Nội dung Tuần 6 | Tiêu chí cần kiểm |
| --- | --- | --- |
| FR-30 [P0] | Soạn mẫu, nhóm tiêu chí, câu hỏi, thứ tự | Tạo/sửa/lưu/đọc lại đúng cấu trúc và thứ tự |
| FR-31 [P0] | Đủ năm loại, bắt buộc, Không áp dụng, trọng số | Likert 1–4/1–5; chọn một/nhiều/tự luận/Có-Không; cấu hình sai bị server chặn |
| FR-32 [P0] | Phiên bản, khóa một chiều | Mẫu khóa/đã dùng không sửa; tạo v tiếp theo giữ nguyên câu hỏi/phiếu/kết quả bản cũ |
| FR-33 [P0] | Xem trước cấu hình mẫu | Hiển thị và tương tác đúng, không ghi nhiệm vụ/phiếu/câu trả lời thật |
| FR-34 [P1] | Nhân bản độc lập | Họ mới/v1/ID con mới, sửa bản sao không đổi nguồn |
| FR-35 [P1] | Mẫu mặc định | Seed thêm họ tiếng Việt đủ năm loại, dùng thành bản nháp độc lập; chọn mặc định chỉ metadata, giữ lựa chọn tùy chỉnh khi seed lại |

BR-05/30/34 áp dụng trong các service này. Tuần 6 không làm đợt khảo sát; sự kiện phê duyệt đợt tự khóa mẫu thuộc Tuần 7, không coi kiểm guard với dữ liệu seed là nghiệm thu workflow duyệt. Không nộp phiếu sinh viên hoặc tổng hợp kết quả mới.

## 2. Chuẩn bị

Giữ `.env`, khóa MFA, volume và DB đang dùng; không reset/DROP để nghiệm thu. Theo [README](../README.md), bật Docker db/mailpit và áp dụng migration bổ sung cột. Nếu cần môi trường riêng, `npm.cmd run demo` tạo DB mới có marker/cổng riêng, không xóa DB chính. Chỉ dùng dữ liệu giả.

Đăng nhập `DBCL2026001`, mật khẩu demo trong README. ADMIN đơn vai trò không được vận hành mẫu; nếu có ADMIN+ĐBCL vẫn bắt buộc MFA. API không tự bootstrap dữ liệu mặc định; thiếu seed cần người vận hành chạy lệnh seed theo README.

## 3. Sáu bước nghiệm thu nhìn thấy được

1. Mở `/mau-phieu`, tìm kiếm/lọc/chuyển trang, bấm tạo mới. Thêm ít nhất hai nhóm và đủ năm loại câu hỏi; dùng cả Likert 1–4/1–5, bắt buộc/Không áp dụng và trọng số khác nhau. Sắp xếp nhóm/câu, lưu rồi mở lại phải đúng nội dung/thứ tự.
2. Thử nhãn rỗng, trọng số không dương, thang sai, lựa chọn thiếu hoặc cấu hình thừa theo loại. UI/server phải chỉ lỗi, không lưu cấu trúc không hợp lệ. Xem trước thấy đúng loại, lựa chọn, thang và cờ; điền thử/tải lại không tạo dữ liệu phiếu.
3. Mở cùng mẫu nháp ở hai cửa sổ. Lưu cửa sổ A rồi lưu dữ liệu cũ ở B phải nhận xung đột, không ghi đè A; UI giữ dữ liệu đang sửa để người dùng xem xét rồi tải bản hiện tại.
4. Khóa mẫu giả vừa tạo. Không sửa/khóa lại/mở khóa được; request trực tiếp cũng bị chặn. Bấm tạo phiên bản mới được bản nháp v tiếp theo, sửa bản mới không đổi nguồn; ID câu hỏi cũ và dữ liệu lịch sử không đổi.
5. Nhân bản mẫu thành họ mới v1, sửa tên/cấu trúc rồi đối chiếu nguồn. Dùng mẫu mặc định đủ năm loại do seed Tuần 6 bổ sung để tạo nháp riêng. Đổi mặc định rồi seed lại phải giữ lựa chọn tùy chỉnh; nội dung/ID/câu hỏi/phiếu/kết quả của mẫu seed khóa Tuần 5 giữ nguyên. Chọn mẫu vào đợt nháp chờ Tuần 7.
6. Thử sinh viên, giảng viên, lãnh đạo và ADMIN đơn vai trò: page/API mẫu bị chặn theo phạm vi Tuần 6. Đối chiếu AuditLog chỉ có metadata phù hợp, không có nội dung thử; xem kết quả gate/ảnh và CI đúng commit.

Đây là hướng dẫn cho người nghiệm thu. Danh sách thao tác không tự chứng minh mọi bước đã được chạy qua UI; bằng chứng thật phải ghi riêng.

## 4. Lệnh kiểm và an toàn fixture

```powershell
npm.cmd run check
npm.cmd run test:integration
npm.cmd run test:auth
npm.cmd run test:week4
npm.cmd run test:week5
npm.cmd run test:week6
npm.cmd run test:demo
npm.cmd run build
npm.cmd audit --omit=dev
npm.cmd audit
npm.cmd run progress
```

`test:week6` chuẩn bị lại DB thử có marker của Tuần 4 rồi chạy `scripts/verify-week6.ts` trên cổng 3005, output `.next-week6`; DB này khác main/shadow và các bộ HTTP chạy tuần tự. `test:demo` tạo DB demo mới riêng để kiểm seed. Chỉ dọn fixture UUID do lần thử tạo, không xóa DB/volume. Targeted test thuộc full check không cộng lần hai vào tổng.

## 5. Bằng chứng gate trên mã Tuần 6

| Gate | Trạng thái hiện tại |
| --- | --- |
| Schema/migration/ERD | Migration additive `20261022125000_week6_template_revision` thêm `revision`/`updatedAt`, không xóa dữ liệu. Ngày28/10: status 5 migration đồng bộ, diff **No difference detected**, SQL nền MySQL thật **10/10 qua**. [ERD Tuần 6](SO_DO_TUAN_06.md):31 runtime / 39 blueprint, bốn SVG tổng quan và Mermaid khảo sát mới đã render/xem ở lượt 22/10; ba thân Mermaid khác giữ nguyên |
| Unit/policy/CSRF | Đã nằm trong full **279/279**: core 38 mới, CSRF/body 8, audit 2, helper seed 12. Có BR-05, ma trận bảy vai trò, cấu hình năm loại, fresh guard, stale revision, copy độc lập, CSRF khác miền/phiên và giới hạn stream. Không cộng targeted lần hai |
| HTTP/MySQL Tuần 6 | **20/20 nhóm qua ngày 28/10** trên Next.js 16.4.3, fixture dọn. Đủ bảy vai trò/IDOR mọi route mới, CSRF/Origin, 256 KiB, cấu hình sai không ghi, list/count/paging, CAS lưu chỉ một thắng, khóa–sửa chỉ một thắng, hai phiên bản mới nhận 2/3, giữ câu/phiếu cũ, ba lần SSR preview không ghi task/response/answer/audit, một mặc định, thu hồi quyền và redaction |
| Hồi quy | Ngày28/10 trên bản Next/eslint-config-next 16.4.3: auth HTTP **24/24**, CLI **5/5**, HTTP Tuần 4 **28/28**, HTTP Tuần 5 **22/22** đều qua và dọn fixture; `.local/week6-regression-summary.json` là bằng chứng cục bộ bị Git bỏ qua |
| Seed/demo | MySQL thật **11/11 nhóm qua** ngày 28/10, gồm hai kiểm FR-35 mới: họ mặc định đủ năm loại/hai thang và seed lại giữ lựa chọn đã đổi/cây cũ. Nâng cấp DB chính ngày 28/10 giữ nguyên cây/ID mẫu khóa Tuần 5, **78 phiếu/3 kết quả/4 tài khoản auth**, có mặc định đủ năm loại. Kết quả riêng `.local/week6-seed-upgrade-result.json` bị Git bỏ qua. Unit helper12 đã nằm trong full, không thay MySQL |
| Full check/build | **279/279 test trong 24 file qua** ngày 28/10 ở lượt chạy tuần tự sau cập nhật phụ thuộc; validate/generate hai schema, ERD, ESLint/TypeScript qua. **Next.js 16.4.3 production build exit0**. Các lượt267/279 trước cập nhật không thay lượt cuối |
| Phụ thuộc/audit | `next`/`eslint-config-next` **16.4.3**, lockfile fast-uri **3.1.9** sau đối chiếu advisory/bản phát hành chính thức; xem [ADR-007](decisions/ADR-007-mau-phieu-va-phien-ban.md). Audit **production 0/full 0** ngày 28/10; không coi audit 0 là đã quét bảo mật toàn repository hoặc hết lỗ hổng |
| Giao diện/ảnh | Lượt cuối ngày 28/10 **14 nhóm kiểm/10 viewport qua**, 10 PNG desktop1440/mobile390; không lỗi JavaScript, không tràn ngang hoặc ô thiếu nhãn trong phép đo. `cleaned: true`, `seedUnchanged: true`. Đã thử tạo/sửa/đổi thứ tự đủ loại, preview bắt buộc/NA không ghi dữ liệu, khóa/phiên bản/nhân bản/mặc định, tìm kiếm/phân trang và chặn sinh viên. Ca xung đột UI tăng revision của fixture trong DB rồi gửi bản đang mở, không phải thao tác hai cửa sổ; tranh chấp hai request thật đã kiểm riêng bằng HTTP/MySQL. Xem [QA và ảnh](QA_GIAO_DIEN_TUAN_06.md) |
| CI/commit | [CI mã Tuần 6 40633183047](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40633183047) của commit `68087ed7ecc68028ac78475696f4ee69a5d2e056` đã **success** cả check/smoke ngày 28/10; đây là bằng chứng cho mã trên nhánh tính năng. CI của main sau chốt tài liệu phải đối chiếu đúng SHA riêng |
| Progress | FR-30–35 thêm 16 điểm, lũy kế **62/163 = 38,0%**, M4 **16/16 = 100%**. [Checklist](PROGRESS.md) và `npm run progress` đối chiếu sau khi đủ bằng chứng |

## 6. Giới hạn và phần tiếp theo

- Lãnh đạo xem mẫu đính kèm và phê duyệt đợt tự khóa mẫu chờ Tuần 7; không có workflow đợt trong Tuần 6.
- Preview không kiểm chứng nộp ẩn danh thật, chặn trùng hoặc tính điểm/công bố. Các nội dung này vẫn theo tuần tương ứng.
- Mutex toàn cục làm lệnh ghi chờ nhau; chưa có kiểm tải production. Revision không thay việc kiểm quyền và trạng thái mới nhất.
- Chỉ dữ liệu giả; không bí mật trong Git/ảnh/log, không thay khóa MFA hoặc reset dữ liệu để thử.
- Giữ nguyên bốn file nguồn. Nhóm đọc/thử/viết lại nháp và tự điền đóng góp thực tế.

## 7. Tài liệu liên quan

[ADR-007](decisions/ADR-007-mau-phieu-va-phien-ban.md), [giải thích và năm câu bảo vệ](GIAI_THICH/tuan-06.md), [báo cáo Tuần 6](bao-cao-tien-do/tuan-06.md), [ERD](ERD.md), [đối chiếu sơ đồ Tuần 6](SO_DO_TUAN_06.md), [truy vết](TRUY_VET.md), [tiến độ](PROGRESS.md).
