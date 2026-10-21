# BÁO CÁO TIẾN ĐỘ TUẦN 2/15 — bản cập nhật ngày 21/10/2026

**Đề tài:** Xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học

**Tiểu luận chuyên ngành:** HK1 2026–2027

**Nhóm:** [Sinh viên tự điền] · **GVHD:** [Sinh viên tự điền]

**Mốc kế hoạch Tuần 2:** 07–13/10/2026 theo giả định 7 ngày/tuần từ 30/09; cần đối chiếu lịch trường. **Thời gian thực hiện ghi trong báo cáo:** 21/10/2026. Không ghi đã làm trong khoảng 07–13/10 khi chưa có bằng chứng. Đây là bản nháp AI hỗ trợ; kết quả kỹ thuật đã đối chiếu, nhóm cần rà soát và viết lại trước khi nộp.

## 1. Mục tiêu của tuần theo kế hoạch

Lập yêu cầu FR/NFR có mã; sơ đồ use case, hoạt động, máy trạng thái Mermaid; ma trận vai trò × chức năng; ERD và Prisma schema đầy đủ kèm ẩn danh Mục 5.6; quy ước kiến trúc; wireframe màn hình chính; migration nhóm người dùng/danh mục; test schema ẩn danh 5.6a. Soạn nháp Chương 2–3. Không triển khai giao diện chức năng, xác thực hay khảo sát của các tuần sau.

## 2. Kết quả đạt được và bằng chứng

- **Phân tích:** [YEU_CAU](../YEU_CAU.md) có 63 FR giữ nguyên mã/ưu tiên và NFR có mã; [SO_DO_NGHIEP_VU](../SO_DO_NGHIEP_VU.md) mô tả use case/hoạt động/trạng thái; [PHAN_QUYEN](../PHAN_QUYEN.md) bao phủ 7 vai trò, phạm vi và điều kiện xem dữ liệu. Theo yêu cầu người dùng, chỉ viết quy trình đề xuất, không quy trình hiện tại của trường.
- **Thiết kế:** [KIEN_TRUC](../KIEN_TRUC.md), [ERD](../ERD.md), [THIET_KE_CSDL](../THIET_KE_CSDL.md), [THIET_KE_AN_DANH](../THIET_KE_AN_DANH.md), ADR-002/003 và nháp Chương 2–3. Các chương có cảnh báo sinh viên đọc và viết lại, không tự xác nhận đóng góp.
- **Wireframe:** [18 màn HTML tĩnh](../wireframes/tuan-02.html) và [bảng ánh xạ](../WIREFRAME.md); đây là tài liệu bố cục, không có API/đăng nhập/nộp phiếu hay ảnh chức năng chạy thật. Đã xem 10 ảnh ở desktop 1440/mobile 390, cả 18 màn không tràn ngoài vùng bảng và control nghiệp vụ bị vô hiệu hóa; ảnh tại WIREFRAME.
- **Schema và migration:** blueprint `prisma/design.prisma` 39 model toàn hệ thống; runtime `prisma/schema.prisma` 9 model nền. Migration `20261021160354_week2_users_catalog` đã chạy trên MySQL thật, có 11 FK Restrict và 3 CHECK; `prisma migrate dev` chạy lần hai báo đồng bộ, giữ volume cũ. Không migrate các bảng phiên, TOTP, mẫu/đợt/phiếu hay phản hồi.
- **SQL:** `scripts/verify-database.mjs` qua **10/10 tình huống**, kiểm trùng, FK, role/phạm vi, ngày kỳ và tín chỉ; fixture transaction rollback, không để lại dữ liệu thử.
- **Kiểm thiết kế:** có test DMMF 5.6a, UUID/DATE, whitelist kind/type/quan hệ, đồng bộ nền và shadow guard. Sau vá phụ thuộc, check qua validate/generate/ERD/lint/typecheck và **14/14 Vitest**, build exit 0; prepare safety **6/6 qua**. Cả **13/13 sơ đồ Mermaid đã render**; [gallery](../SO_DO_DA_RENDER.md) có SVG và dấu vân tay nguồn. HTTP production ba route/Mailpit đều 200. Không có test 5.6b/c/d cho service nộp/export ở Tuần 2.
- **Git/CI:** mã nền `723e165` đã push và qua [CI 39634835024](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39634835024), cả check và smoke, gồm migration/MySQL/check/build/HTTP dev. Commit `85de07a` bổ sung phân tích/kiến trúc và SVG. Bản tài liệu nghiệm thu hoàn thiện được lưu cùng lịch sử tuần; CI Tuần 1 không được dùng thay bằng chứng mã mới.

## 3. Đối chiếu kế hoạch

| Hạng mục                               | Trạng thái khi soạn            | Bằng chứng / phần còn lại                                                                     |
| -------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------- |
| FR/NFR có mã, sơ đồ, ma trận quyền     | Hoàn thành bản nháp thiết kế   | File docs và 13/13 SVG render đã kiểm; nhóm cần đọc/duyệt thiết kế                            |
| ERD/schema đầy đủ, thiết kế ẩn danh    | Hoàn thành bản nháp thiết kế   | Blueprint 39 model, runtime 9 model; không coi blueprint là chức năng đã chạy                 |
| Kiến trúc và wireframe                 | Hoàn thành và kiểm bố cục      | Service/actor/policy, 18 màn tĩnh; không giao diện chức năng                                  |
| Migration nhóm người dùng/danh mục     | Đã áp dụng và chạy lại đồng bộ | 9 bảng, 11 FK Restrict, 3 CHECK; SQL 10/10 qua, fixture rollback                              |
| Test schema ẩn danh và chất lượng cuối | Đã qua cổng kỹ thuật           | 14/14 test, lint/typecheck/ERD/build qua; prepare 6/6 qua                                     |
| Bản chạy trên nhánh chính/CI Tuần 2    | Mã nền đã qua CI feature       | 723e165, CI 39634835024 check/smoke thành công; bản hoàn thiện được đưa lên main sau kiểm tra |
| Nháp Chương 2–3, báo cáo tuần          | Đã có bản nháp                 | Đủ 9 phần; thông tin nhóm và đóng góp do sinh viên điền                                       |

Tuần 2 được thực hiện ngày 21/10, sau mốc kết thúc giả định 13/10 là **8 ngày**. Không cắt P0 hay làm trước Tuần 3 để che chậm tiến độ; lịch chính thức vẫn cần nhóm xác nhận.

## 4. Tiến độ lũy kế

Checkbox FR giữ **3/163 điểm = 1,8%**, duy nhất FR-102. Bảng này dùng trọng số P0=3, P1=2, P2=1, không chấm theo cảm tính. Lệnh `npm run progress` đã chạy ngày 21/10 và trả đúng 3/163; không thêm tick. Mục tiêu có trọng số lũy kế đến Tuần 2 cũng là 3/163 do các FR chức năng tiếp theo bắt đầu Tuần 3. Chỉ số FR không đo đầy đủ khối lượng thiết kế, và đạt điểm FR không xóa chậm mốc lịch.

| Module                               | Điểm đạt / tổng | Tỷ lệ |
| ------------------------------------ | --------------: | ----: |
| M1 Xác thực và phiên                 |            0/23 |  0,0% |
| M2 Người dùng, phân quyền, kiểm toán |             0/9 |  0,0% |
| M3 Danh mục và nhập liệu             |             0/9 |  0,0% |
| M4 Mẫu phiếu                         |            0/16 |  0,0% |
| M5 Đợt khảo sát                      |            0/22 |  0,0% |
| M6 Làm khảo sát                      |            0/14 |  0,0% |
| M7 Kết quả                           |            0/18 |  0,0% |
| M8 Phản hồi                          |            0/19 |  0,0% |
| M9 Thông báo                         |             0/7 |  0,0% |
| M10 Báo cáo                          |            0/12 |  0,0% |
| M11 Hệ thống                         |            3/11 | 27,3% |
| M12 Mở rộng                          |             0/3 |  0,0% |

## 5. Khó khăn, rủi ro và hướng xử lý

- Làm Tuần 2 ngày 21/10 thay vì mốc 07–13/10; báo cáo giữ cả lịch kế hoạch và ngày thật, cần nhóm/GVHD thống nhất việc nộp và điều chỉnh kế hoạch.
- Yêu cầu schema đầy đủ nhưng migration chỉ nhóm nền dễ dẫn tới làm trước. Tách runtime/blueprint, output riêng và test parity/DMMF; tuyệt đối không migrate blueprint.
- Shadow có thể bị Prisma reset. Chuẩn bị DB riêng, guard tên khác/server identity/marker, giới hạn quyền database; 6/6 tình huống bảo vệ đã qua sau sửa cuối. Không reset volume/DB chính khi gặp drift.
- Không FK metadata phiếu để cắt mọi đường quan hệ tới User/SurveyTask; service Tuần 8 phải kiểm metadata trong transaction. Test cấu trúc chưa chứng minh nộp trùng/đồng thời/export, còn giới hạn trước DBA/log/nhóm nhỏ.
- Nhóm cần tự đọc/viết lại nháp, kiểm lịch và thông tin thành viên; không để AI xác nhận đóng góp. Check/build/CI đã có bằng chứng nêu trên; không ghi việc nhóm duyệt hoặc đóng góp cá nhân là đã hoàn tất.

- Prisma/client/helper đã vá 7.10.1 và Vite 8.3.5; audit production 0 cảnh báo, full audit còn 5 high trong dev chain braces/micromatch/fast-glob/ESLint. Chưa áp dụng đề nghị force downgrade ESLint; ghi rõ tồn tại thay vì tuyên bố hết lỗ hổng.

## 6. Kế hoạch Tuần 3

Sau nghiệm thu và lệnh tiếp tục của người dùng: xác thực bcrypt/JWT, access ngắn hạn và refresh xoay vòng lưu hash, bảng UserSession/AuthToken, cookie httpOnly, đổi mật khẩu, kích hoạt/quên/reset qua Mailpit, rate limit và khóa tạm, khung AuditLog, layout theo vai trò. Viết sơ đồ tuần tự đăng nhập/refresh và ADR JWT/bcrypt. Nghiệm thu đăng nhập demo, sai 5 lần bị khóa, refresh rotation/reuse, logout token cũ vô hiệu và email reset. 2FA/phân quyền chi tiết vẫn theo Tuần 4.

## 7. Phân công và đóng góp từng thành viên

**[SINH VIÊN TỰ ĐIỀN]** Tên, phần việc, commit/tài liệu hoặc bằng chứng và mức đóng góp. AI không ghi hay xác nhận đóng góp cá nhân thay nhóm.

## 8. Các bước kiểm tra nhanh cho giảng viên

1. Mở `docs/YEU_CAU.md`, `SO_DO_NGHIEP_VU.md`, `PHAN_QUYEN.md` bằng trình xem hỗ trợ Mermaid; kỳ vọng đủ yêu cầu và 7 vai trò, chuyển trạng thái đúng đặc tả.
2. Mở `docs/wireframes/tuan-02.html`, chọn mục lục WF-01–18, xem điện thoại/desktop; kỳ vọng thấy nhãn bản thiết kế, điều kiện đủ/thiếu mẫu, ADMIN không tự xem nghiệp vụ; các nút không chạy thật.
3. Đối chiếu ERD với hai schema: blueprint 39 model, runtime 9 model; vùng Response–Answer không có đường quan hệ tới User/Task, không timestamp nộp chính xác.
4. Tại gốc dự án, chạy Compose, `npm run db:prepare`, `npm run db:migrate`, `npm run test:integration` theo README; kỳ vọng đúng 9 bảng và SQL 10/10 qua, fixture rollback, không reset DB.
5. Chạy `npm run check`, `npm run build`, `npm run progress`; kỳ vọng không lỗi và tiến độ 3/163. Đối chiếu **kết quả thật đã điền** tại [nghiệm thu Tuần 2](../NGHIEM_THU_TUAN_02.md), không xem kỳ vọng này là log đã chạy.
6. Chạy `npm run dev`, mở trang chủ/sức khỏe/API và Mailpit; kỳ vọng khung Tuần 1 vẫn chạy, health có `database: not_checked`. Không tìm tài khoản demo vì xác thực chưa triển khai.

## 9. Bản rút gọn để dán vào hệ thống của trường — bản nháp dưới 150 từ

Tuần 2 của chúng em thực hiện ngày 21/10/2026, muộn hơn kế hoạch 07–13/10. Chúng em đã phân tích yêu cầu, sơ đồ nghiệp vụ, ma trận quyền, kiến trúc, ERD, thiết kế ẩn danh và 18 wireframe tĩnh; soạn nháp Chương 2–3. Schema đầy đủ có 39 model, chỉ migration 9 bảng người dùng/danh mục. Migration chạy lại đồng bộ, 10/10 kiểm tra SQL qua và dữ liệu thử được rollback. Check 14/14 test, build và CI qua. Tiến độ chức năng giữ 3/163 điểm (1,8%); chưa triển khai đăng nhập hoặc khảo sát. Nhóm sẽ rà soát thiết kế và tự bổ sung đóng góp từng thành viên trước khi nộp.

> Sinh viên cần đọc, xác minh, điền thông tin/đóng góp thực tế và viết lại bằng lời của mình trước khi nộp.
