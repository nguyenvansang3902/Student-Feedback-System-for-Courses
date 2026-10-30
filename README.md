# Website quản lý khảo sát và phản hồi sinh viên về môn học

Tiểu luận chuyên ngành HK1 2026–2027, kế hoạch 15 tuần từ **30/09/2026**, khởi động thực tế **02/10/2026**. Tuần 3 thực hiện **21–22/10/2026**. Tuần 4 theo mốc giả định **21–27/10/2026**, bắt đầu thực tế **22/10/2026**; nhóm đối chiếu lịch trường, không ghi lùi ngày.

## Phạm vi hiện tại — Tuần 9: kết quả khảo sát

Bắt đầu và nghiệm thu **30/10/2026** theo yêu cầu người dùng: tổng hợp, công bố theo ngưỡng, kết quả theo vai trò/phạm vi, so sánh, kiểm duyệt tự luận, danh sách chưa hoàn thành/nhắc nhở và kết quả gộp Khảo thí. Đã qua **797 kiểm thử/50 tệp**, build Next16.4.3, HTTP/MySQL **12/12**, seed **15/15**, UI **14 nhóm/46 ảnh cuối đã xem** và [CI nguồn 5eb5a84](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41079971520). Tiến độ **138/219=63,0%, 49/84 FR**; CI main/tài liệu cuối đối chiếu riêng. Xem [nghiệm thu](docs/NGHIEM_THU_TUAN_09.md), [công thức](docs/CONG_THUC_TONG_HOP.md) và [báo cáo](docs/bao-cao-tien-do/tuan-09.md) để biết bằng chứng và giới hạn. Phản hồi liên tục, giải trình và xuất báo cáo làm theo các tuần sau. Giao diện dùng tên chức năng và hướng dẫn ngắn, hạn chế slogan; nội dung hướng tới sinh viên dùng danh xưng “sinh viên”; các ô nhập và tìm kiếm không có chữ gợi ý bên trong. Nhãn và hướng dẫn đặt bên ngoài ô.

### Xem và công bố kết quả

Đăng nhập tài khoản phù hợp rồi mở [Kết quả khảo sát](http://localhost:3000/ket-qua). Mật khẩu demo ban đầu theo bảng bên dưới; seed không đặt lại mật khẩu bạn đã đổi.

- **ĐBCL (`DBCL2026001`)**: chọn đợt đã đóng, tổng hợp; mở **Kiểm duyệt góp ý** và chọn hiện/ẩn kèm lý do. Chỉ công bố khi không còn TEXT có nội dung chờ duyệt. Mặc định chờ của câu không phải TEXT không chặn công bố.
- **Lãnh đạo (`LD2026001`)**: đọc kết quả từ khi đã tổng hợp. **Giảng viên/TBM/TK**: đọc sau công bố/lưu trữ, đúng lớp hoặc phạm vi được giao. Lớp thiếu số phiếu hoặc tỉ lệ hiện “Chưa đủ mẫu để công bố”, không có điểm/tự luận.
- **Khảo thí (`KT2026001`)**: chỉ nhóm đánh giá gộp theo môn/bộ môn/khoa sau công bố; cần ít nhất hai giảng viên đóng góp và đủ mẫu. Không có lớp, giảng viên hay góp ý tự luận. Thiếu điều kiện hiện “Chưa đủ dữ liệu gộp”.
- **ĐBCL/TBM/TK**: từ đợt mở danh sách **Chưa hoàn thành** trong phạm vi. Mỗi lần đọc được ghi nhật ký; nhắc chỉ khi đợt còn mở/hạn, tối đa một lần/ngày/SV/đợt, dùng chung với scheduler.
- **ADMIN đã MFA**: cấu hình xếp mức và từ khóa tại `/quan-tri/cau-hinh-ket-qua`, xác nhận mã TOTP mới khi lưu. Quyền cấu hình không cấp quyền đọc kết quả khảo sát.

So sánh gộp trên số liệu gốc của toàn bộ phiếu, chỉ khi cùng phiên bản mẫu; không có dữ liệu phù hợp thì hiện thông báo, không tự chuyển thang hay ánh xạ phiên bản. Khi học kỳ khóa, các thao tác ghi bị chặn và kết quả đã công bố được lưu trữ, vẫn đọc theo quyền cũ. Dữ liệu cũ không bị reset để tạo tình huống mới. Các bước trên áp dụng cho bản Tuần9 đã nghiệm thu; số kiểm thật và SHA được ghi tại nghiệm thu.

Seed mới thêm hai đợt **Kết quả khảo sát môn học (giả lập Tuần 9)** và **Kết quả học kỳ trước (giả lập)**: cùng môn có hai GV, hai lớp đủ mẫu/một lớp thiếu, tổng18phiếu/40nhiệm vụ. Chạy `npm.cmd run db:seed` như thường lệ; với máy đã có seed cũ đầy đủ có thể chạy `npm.cmd run db:seed:week9` để chỉ bổ sung bundle mới. Các lệnh đều chỉ dữ liệu giả cục bộ và không viết lại mẫu/phiếu/kết quả cũ. Seed lặp giữ nguyên những thao tác đã làm; không dùng để đặt lại mật khẩu hoặc công bố lại đợt.

## Mốc nghiệm thu Tuần 8: sinh viên làm khảo sát

Tuần 8 thực hiện **29–30/10/2026** theo yêu cầu người dùng, đã nghiệm thu FR-50–54: danh sách nhiệm vụ, form động, nháp trình duyệt, nộp ẩn danh một lần và xác nhận. Check **646/646 trong 39 tệp**, build Next 16.4.3, HTTP/MySQL **16/16**, UI **13 nhóm/34 lượt bố cục/34 PNG đã xem** và bảo toàn 27 tập dữ liệu main đã qua. [CI nguồn 6edad31](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40925339620) đã qua check/smoke đúng SHA. Tiến độ **117/219=53,4%, 41/84 FR**; xem [nghiệm thu Tuần 8](docs/NGHIEM_THU_TUAN_08.md). Tổng hợp/công bố là Tuần 9, FR-145 ImportBatch/hoàn tác vẫn P1 có điều kiện chưa thực hiện. CI main/tài liệu cuối được đối chiếu riêng.

Hệ thống có **10 vai trò** theo [prompt bổ sung](docs/BO_SUNG_01_TAC_NHAN.md) và [ma trận quyền](docs/MA_TRAN_QUYEN.md). Phòng Đào tạo quản lý dữ liệu đào tạo/import và khóa, mở khóa học kỳ; ADMIN có MFA quản lý khoa/bộ môn cùng tài khoản, vai trò, cấu hình và nhật ký. ĐBCL đọc danh mục, tiếp tục quản lý mẫu phiếu, không còn ghi danh mục/import chỉ bằng vai trò ĐBCL. Khảo thí và Thanh tra đã có vai trò, tài khoản và không gian riêng; các hàng đợi nghiệp vụ của họ còn theo lộ trình.

Trình soạn và xem trước có cờ **Nhóm tiêu chí kiểm tra, đánh giá**. Seed G1 tạo họ mẫu mặc định mới **3 nhóm/7 câu**, đủ năm loại câu và có đúng một nhóm “Kiểm tra, đánh giá” được đánh dấu; cây mẫu khóa cũ và dữ liệu phiếu/kết quả được giữ. Nếu đã chọn một mẫu tùy chỉnh làm mặc định, seed giữ lựa chọn đó. Runtime hiện có **34 model**, thiết kế đầy đủ **46 model**; các model thiết kế tương lai chưa được migrate thành chức năng.

Sau khi kéo mã mới, dừng web rồi chạy `npm.cmd ci`, `npm.cmd run db:deploy`, `npm.cmd run db:seed` và mở lại `npm.cmd run dev`. Xem phần [migration](#shadow-và-migration) về preflight bắt buộc. Kết quả kiểm G1 cập nhật tại [PROJECT_STATE](docs/PROJECT_STATE.md), [PROGRESS](docs/PROGRESS.md) và [TRUY_VET](docs/TRUY_VET.md). Những số liệu/CI Tuần 1–6 bên dưới là bằng chứng lịch sử trước điều chỉnh.

Nghiệm thu phần chính Tuần 7 ngày **29/10/2026**: **572/572 test**, build, HTTP19+13, seed14 và UI26viewport qua. [CI 40858131706](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40858131706) của nguồn 39d5648 xanh check/smoke. Tiến độ **103/219=47,0%**; FR-145 P1 có điều kiện chưa thực hiện. [Báo cáo](docs/bao-cao-tien-do/tuan-07.md).

Nghiệm thu G1 ngày **29/10/2026**: **346/346 test**, build qua; [CI 40750644805](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40750644805) của mã `023b619` xanh check/smoke. Tiến độ **71/219 = 32,4%** sau mở rộng phạm vi. Xem [báo cáo phiên](docs/NGHIEM_THU_BO_SUNG_01.md) và [QA giao diện](docs/QA_GIAO_DIEN_BO_SUNG_01.md); FR-160 chỉ phần đang có.

ĐBCL tạo/trình đợt tại [/dot-khao-sat](http://localhost:3000/dot-khao-sat), PĐT xác nhận dữ liệu theo RS-01–06, lãnh đạo duyệt. Đến giờ mở, hệ thống chốt nhiệm vụ theo đăng ký hiện tại; thay đổi sau mở không đổi task. ADMIN cấu hình ngưỡng tại /quan-tri/cau-hinh-khao-sat bằng MFA và mã TOTP mới. Bằng chứng tuần trước xem [nghiệm thu Tuần 7](docs/NGHIEM_THU_TUAN_07.md). Kết quả gộp Khảo thí và hồ sơ Thanh tra vẫn theo lịch sau.

### Mở giao diện khảo sát sinh viên

Để xem form có nhiệm vụ sẵn, đăng nhập sinh viên seed **`DEMO-SV00001`**, mật khẩu ban đầu **`Demo2026!HocTap`**, chọn **Khảo sát của tôi** từ trang tài khoản/không gian sinh viên hoặc mở [/khao-sat](http://localhost:3000/khao-sat). Tài khoản `SV2026001` phục vụ thử xác thực/bố cục, có thể chưa có nhiệm vụ khảo sát; không dùng tài khoản đó để kết luận form trống là lỗi.

Trang có môn/lớp, hạn chót, trạng thái và nút làm nhiệm vụ đang nhận bài. Chỉ task đã chốt của tài khoản mới hiện; thay đăng ký sau mở không tự sinh quyền. Đối chiếu DB chính ngày 30/10 cho thấy `DEMO-SV00001` có ba nhiệm vụ PENDING trong đợt mở đến05/11/2026; chọn đợt còn nhận bài. Seed còn giữ nhiệm vụ lịch sử ở đợt đã công bố, các nhiệm vụ đó không được nộp. Nếu ngày thử đã ngoài hạn hoặc bạn đã hoàn thành, cần tạo/xác nhận/duyệt một đợt mới theo workflow Tuần 7; không đổi đồng hồ, mở lại đợt hoặc reset dữ liệu để xem form. Danh sách trống có nghĩa tài khoản chưa có nhiệm vụ, không phải trang kết quả.

Form lấy đúng mẫu đã khóa; mẫu lịch sử có thể chỉ ba câu, mẫu mặc định hiện hành có đủ năm loại. Điền câu bắt buộc hoặc chọn **Không áp dụng** khi câu cho phép; thanh tiến trình hỗ trợ theo dõi. Nháp lưu trên thiết bị theo tài khoản/nhiệm vụ/phiên bản, tối đa20 nháp và7 ngày, không có token. Có thể xóa nháp; hạn chế dùng máy chung. Khi server xác nhận DONE/hết hạn/kỳ khóa hoặc đăng xuất, nháp được dọn và các tab khác nhận tín hiệu xóa.

Bấm nộp trong khoảng thời gian server cho phép; server kiểm lại toàn bộ điều kiện. Thành công chỉ hiện **Đã nộp** và ngày hoàn thành, không có bản sao hay ID phiếu; không sửa/nộp lại. Nếu mất kết nối sau bấm nộp, trang kiểm tra trạng thái trước khi cho thử tiếp, không tự gửi lại POST. localStorage là bản nháp trên máy, không phải bản sao phiếu đã nộp. Xem [thiết kế và giới hạn ẩn danh](docs/decisions/ADR-009-nop-phieu-an-danh.md).

### Mốc nghiệm thu lịch sử Tuần 6: mẫu phiếu khảo sát

Tuần 6 bắt đầu **22/10**, tiếp tục **28/10/2026**, sớm hơn mốc giả định **04–10/11** theo lệnh người dùng. ĐBCL GLOBAL có trình soạn nhóm/câu/thứ tự, năm loại câu, trọng số, bắt buộc/Không áp dụng, khóa/phiên bản mới, nhân bản, mặc định và xem trước. Các vai trò khác vẫn được kiểm quyền; ADMIN đơn vai trò không có quyền nghiệp vụ ngầm.

Mở [Mẫu phiếu khảo sát](http://localhost:3000/mau-phieu) bằng tài khoản demo `DBCL2026001`. Chọn **Dùng mẫu mặc định** để tạo bản nháp riêng, sửa và lưu, rồi **Xem trước**. Khóa mẫu là một chiều; muốn sửa nội dung đã khóa hãy tạo phiên bản mới. Xem trước chỉ thử trên trang hiện tại, không gửi phiếu hoặc tạo kết quả. Mỗi lần ghi kiểm tra lại quyền/trạng thái và phiên cập nhật; khi có người khác vừa sửa, tải lại bản mới trước khi lưu tiếp.

Seed tại mốc Tuần 6 thêm một họ mẫu mặc định riêng có hai nhóm/sáu câu, đủ năm loại và cả Likert 1–4/1–5. Mẫu ba câu cũ, câu hỏi/phiếu/kết quả và lựa chọn mặc định tùy chỉnh được giữ. Migration Tuần 6 thêm `revision`/`updatedAt`; tại mốc đó runtime31/blueprint39. Các thông tin này mô tả phiên bản lịch sử, không thay phạm vi G1 hiện tại.

Chi tiết và gate cuối: [nghiệm thu Tuần 6](docs/NGHIEM_THU_TUAN_06.md), [báo cáo](docs/bao-cao-tien-do/tuan-06.md), [QA giao diện](docs/QA_GIAO_DIEN_TUAN_06.md), [giải thích](docs/GIAI_THICH/tuan-06.md), [ADR-007](docs/decisions/ADR-007-mau-phieu-va-phien-ban.md), [ERD](docs/SO_DO_TUAN_06.md). Các kết quả Tuần 5 dưới đây là bằng chứng lịch sử.

Nghiệm thu Tuần6 ngày28/10: **279/279 test trong24file**, lint/typecheck/ERD và build16.4.3 qua; SQL10, HTTP mẫu20, hồi quyHTTP24+28+22/CLI5, seed11nhóm. UI14nhóm/10viewport,10PNG đã mở xem; dữ liệu seed giữ nguyên. Audit production/full0 tại lượt kiểm. Tiến độ **62/163=38,0%**, M4=16/16. [CI mã68087ed](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/40633183047) đã qua check/smoke; CI main/tài liệu cuối đối chiếu đúng SHA trong Actions.

### Mốc nghiệm thu lịch sử đến Tuần 5

Tuần 5 thực hiện ngày **22/10/2026**, sớm hơn mốc giả định **28/10–03/11/2026**, theo yêu cầu người dùng. Ở phiên bản nghiệm thu Tuần 5, ĐBCL có CRUD danh mục/import; quyền đó đã được điều chỉnh trong G1 thành PĐT ghi dữ liệu đào tạo/import, ADMIN ghi khoa/bộ môn, ĐBCL chỉ đọc danh mục. Bằng chứng dưới đây giữ đúng thời điểm Tuần 5.

- `prisma/schema.prisma`: **31 model đã migrate**, gồm 16 bảng nền/xác thực và 15 bảng phục vụ seed khảo sát/phản hồi được người dùng cho phép làm trước ngày 22/10. Có seed dữ liệu không đồng nghĩa đã có màn hình hoặc API khảo sát/phản hồi/kết quả; các chức năng đó triển khai đúng tuần sau.
- `prisma/design.prisma`: hiện có **46 model thiết kế**, output riêng, không dùng migrate/db push; số 39 model trong tài liệu nghiệm thu Tuần 5–6 là mốc lịch sử.
- [18 wireframe Tuần 2](docs/wireframes/tuan-02.html) là tài liệu HTML tĩnh. Web chức năng hiện tại chạy bằng Next.js.
- Trang `/suc-khoe` và `/api/health` dành cho kỹ thuật kiểm ứng dụng; không phải màn khảo sát và chưa kiểm kết nối database.

Nghiệm thu Tuần5: **219/219 test**, SQL10, HTTP24+28+22, CLI5, seed9nhóm, QA13nhóm/10viewport, build qua; **46/163=28,2%**. [CI 39775473219](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39775473219) của mã `a844f3f2f9fdcd8a71ef5587358c8446075b5294` đã qua cả `check` và `smoke`. Xem [nghiệm thu](docs/NGHIEM_THU_TUAN_05.md); CI main/tài liệu cuối đối chiếu đúng SHA trong Actions.

## Chạy lần đầu trên PowerShell

Cần Git, Node.js LTS 24+, npm và Docker Desktop Linux containers/WSL 2 đang chạy. Mở terminal tại thư mục gốc dự án có `package.json`; không chạy trong `C:\Windows\system32`.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd ci
npm.cmd run auth:key
docker compose up -d --wait --wait-timeout 180 db mailpit
npm.cmd run db:prepare
npm.cmd run db:deploy
npm.cmd run db:seed
npm.cmd run dev
```

Mở **[http://localhost:3000](http://localhost:3000)** hoặc [đăng nhập](http://localhost:3000/dang-nhap). Đợi terminal báo Ready, giữ terminal chạy; Ctrl+C dừng web. Mailpit: [http://localhost:8025](http://localhost:8025). Từ lần sau chỉ cần mở Docker, `docker compose up -d --wait db mailpit`, rồi `npm.cmd run dev`; sau khi kéo migration/dependency mới đọc lại bước cài tương ứng.

**Dùng đúng origin APP_URL.** Mặc định `APP_URL=http://localhost:3000`; thao tác ghi kiểm Origin và URL chính xác. Mở bằng `127.0.0.1:3000` hoặc tự đổi cổng mà chưa đổi APP_URL sẽ bị từ chối. Nếu cần đổi, cập nhật APP_URL trong `.env` riêng và khởi động lại server; liên kết email sinh theo giá trị đó.

### Tài khoản demo dev

Chạy `db:seed` trước. Tài khoản demo ACTIVE có mật khẩu ban đầu **`Demo2026!HocTap`**; tài khoản chờ kích hoạt chưa có mật khẩu. Chỉ dùng dữ liệu giả ở dev/demo:

| Mã định danh | Email                    | Trạng thái và cách thử                                          |
| ------------ | ------------------------ | --------------------------------------------------------------- |
| SV2026001    | sinhvien@demo.invalid    | ACTIVE, sinh viên; đăng nhập xem bố cục                         |
| DEMO-SV00001 | Đăng nhập bằng mã ở cột trái | Sinh viên trong dữ liệu seed, có nhiệm vụ đã chốt để thử form; chỉ làm đợt còn hạn |
| GV2026001    | giangvien@demo.invalid   | ACTIVE, giảng viên; đăng nhập xem bố cục                        |
| TEMP2026001  | tam@demo.invalid         | ACTIVE, mật khẩu tạm; bắt buộc đổi trước khi vào tài khoản      |
| NEW2026001   | moikichhoat@demo.invalid | PENDING_ACTIVATION; vào Kích hoạt, yêu cầu thư rồi đặt mật khẩu |
| DBCL2026001 | dbcl2026001@seed.demo.invalid | Cán bộ ĐBCL; quản lý mẫu phiếu và đọc danh mục, không ghi/import |
| TK2026001 | tk2026001@seed.demo.invalid | Trưởng khoa, phạm vi khoa minh họa 1 |
| TBM2026001 | tbm2026001@seed.demo.invalid | Trưởng bộ môn, phạm vi bộ môn minh họa 1 |
| LD2026001 | ld2026001@seed.demo.invalid | Lãnh đạo, phạm vi toàn trường |
| PDT2026001 | pdt2026001@seed.demo.invalid | Phòng Đào tạo; dữ liệu đào tạo/import và khóa, mở khóa kỳ |
| KT2026001 | kt2026001@seed.demo.invalid | Phòng Khảo thí; xem nhóm đánh giá gộp đã công bố; hàng đợi phản hồi thi theo Tuần 10 |
| TT2026001 | tt2026001@seed.demo.invalid | Phòng Thanh tra; tài khoản giả thứ nhất, chưa có luồng hồ sơ |
| TT2026002 | tt2026002@seed.demo.invalid | Phòng Thanh tra; tài khoản giả thứ hai phục vụ kiểm quyền theo lộ trình |

Seed chỉ tạo tài khoản demo còn thiếu, không phải công cụ đặt lại mật khẩu hoặc trạng thái đã đổi. Seed bị chặn production; không dùng ADMIN/demo cố định trong môi trường thật. Nếu thử đổi/reset/kích hoạt, giữ lại mật khẩu bạn vừa chọn để đăng nhập lần sau.

### Dùng danh mục/import theo G1 và chạy demo riêng

Đăng nhập `PDT2026001`, mở [Danh mục](http://localhost:3000/danh-muc) để quản lý học kỳ, môn, lớp và phân công. Khoa/bộ môn do ADMIN đã hoàn thành MFA tạo trước; PĐT chỉ đọc để chọn liên kết. ĐBCL cũng chỉ đọc danh mục. Tại **Nhập dữ liệu**, tải mẫu, thay dòng ví dụ bằng dữ liệu giả/mã danh mục đang có, chọn file, **Chạy thử**, xem lỗi từng dòng rồi mới **Xác nhận nhập**. Tài khoản nhập chờ kích hoạt; thư tới Mailpit. Xem [hướng dẫn nhập file](docs/HUONG_DAN_IMPORT.md).

PĐT khóa/mở khóa học kỳ tại danh sách học kỳ; cả hai cần lý do 10–500 ký tự. Khi mở khóa, hệ thống ghi audit rồi gửi email cho ĐBCL đang hoạt động. SMTP chạy sau commit: nếu gửi lỗi, học kỳ vẫn đã mở và giao diện báo thông báo chưa hoàn tất. Chưa có outbox hoặc tự gửi lại nền; kiểm trạng thái Mailpit/SMTP và biên nhận audit, không coi lỗi thư là đã rollback hoặc lặp thao tác mở khóa.

```powershell
npm.cmd run demo
```

Lệnh này cần `.env`, khóa auth, dependencies và Docker Compose đã chuẩn bị theo phần chạy lần đầu. Nó tạo **database demo mới riêng**, deploy migration, seed rồi chạy web tại **[http://127.0.0.1:3001](http://127.0.0.1:3001)**. Không đổi `DATABASE_URL` của ứng dụng chính, không DROP/reset dữ liệu cũ. Ctrl+C dừng web; database demo được giữ. Mỗi lần gọi tạo môi trường mới, nên dữ liệu của lần demo cũ vẫn chiếm dung lượng; không tự động xóa.

Phần danh mục `DEMO-*` trong kỳ `DEMO-HK1-2026`, mặc định `DEMO_SIZE=medium`: 3 khoa, 8 bộ môn, 40 môn, 120 lớp, 60 giảng viên, 1.500 sinh viên giả, 4.501 đăng ký (gồm sinh viên demo chính). Có mẫu mặc định G1 ba nhóm/bảy câu đủ năm loại và một nhóm đánh giá được đánh dấu; mẫu lịch sử hiện có được giữ. Có một đợt mở, một đợt đã đóng/công bố với phiếu/kết quả khớp toán học và sáu trạng thái phản hồi giả theo ngoại lệ seed đã được cho phép. Các tài khoản trên dùng được; ADMIN tạo riêng bằng CLI với mật khẩu riêng và TOTP. Seed không chứng minh chức năng xử lý đợt, phiếu hay phản hồi đã hoàn thành.

| DEMO_SIZE | Khoa / bộ môn / môn / lớp | Giảng viên / sinh viên | Đăng ký trong kỳ DEMO-HK1-2026 |
| --- | --- | --- | --- |
| small | 3 / 8 / 8 / 12 | 6 / 30 | 91 |
| medium | 3 / 8 / 40 / 120 | 60 / 1.500 | 4.501 |
| large | 3 / 8 / 80 / 240 | 120 / 3.000 | 9.001 |

Bundle W7 bổ sung riêng **1 môn, 2 học kỳ, 8 lớp, 26 đăng ký, 1 sinh viên chờ kích hoạt và 2 đợt nháp** vào mọi size. Các số trong bảng chỉ tính phần DEMO-*; không phải tổng toàn database sau bổ sung.

Đổi size trong `.env`, hoặc `$env:DEMO_SIZE='small'` trước lệnh demo. `npm.cmd run demo -- --prepare` chỉ chuẩn bị dữ liệu, không mở server. `db:seed` bổ sung vào DB đang cấu hình, không giảm/xóa dữ liệu khi đổi xuống size nhỏ, không cân lại đăng ký đã có hay danh sách khảo sát đã chốt; từ chối nếu học kỳ demo đã khóa. Dữ liệu đợt đang mở giữ mốc đã tạo khi seed lại, nên chạy demo mới khi cần mốc thời gian mới.

## Tạo ADMIN và dùng giao diện quản trị

Từ thư mục dự án, chạy:

```powershell
npm.cmd run admin:create
```

Nhập mã ADMIN, lý do, email, tên và mật khẩu riêng theo lời nhắc; mật khẩu không hiển thị và không truyền qua tham số dòng lệnh. Script ghi audit với danh tính máy chủ. Không có ADMIN seed hoặc API công khai tạo quản trị ban đầu.

1. Đăng nhập ADMIN tại [trang đăng nhập](http://localhost:3000/dang-nhap).
2. Quét QR hoặc nhập khóa thủ công vào Google Authenticator/Authy, nhập mã sáu chữ số đầu tiên để bật TOTP.
3. Lưu riêng mười mã khôi phục đang hiển thị; chỉ xuất hiện một lần. Không đưa QR/khóa/mã khôi phục vào GitHub, ảnh báo cáo hoặc localStorage.
4. Vào [quản trị](http://localhost:3000/quan-tri): tài khoản, nhật ký, chính sách MFA; mở [Danh mục](http://localhost:3000/danh-muc) để quản lý khoa/bộ môn. Tạo tài khoản mới sẽ ở trạng thái chờ kích hoạt; dùng email/Mailpit theo luồng Tuần 3. ADMIN không ghi dữ liệu đào tạo/import và không xem kết quả khảo sát, nội dung phản hồi hay hồ sơ Thanh tra chỉ nhờ quyền quản trị.

Đổi quyền, tạo tài khoản, sửa chính sách MFA hoặc đặt lại 2FA yêu cầu một mã TOTP mới. Mã vừa dùng bị chặn dùng lại, nên có thể cần chờ chu kỳ 30 giây tiếp theo. Mã khôi phục chỉ dùng để đăng nhập, không thay xác nhận thao tác nhạy cảm. ADMIN luôn bắt buộc MFA; có thể bật bắt buộc cho các vai trò khác.

Không tự khóa hoặc tự đổi vai trò của ADMIN hiện tại. ADMIN khác thực hiện thay đổi; service còn bảo vệ ADMIN ACTIVE cuối cùng. Mất thiết bị/mã khôi phục: ADMIN khác đặt lại 2FA trên web, hoặc người vận hành có quyền máy chủ chạy:

```powershell
npm.cmd run admin:reset-2fa
```

Script yêu cầu lý do và nhập lại chính xác mã ADMIN; thu hồi các phiên/mã khôi phục, lần đăng nhập sau phải đăng ký TOTP lại. Đây là công cụ máy chủ, không phải đường bỏ qua MFA trên web. Quyền chạy script/đọc `.env` phải giới hạn cho người vận hành.

### Khóa MFA và bảo trì

Giữ bản sao bảo vệ của `.env` cùng bản sao database. Không thay trực tiếp MFA_ENCRYPTION_KEY khi còn credential dùng khóa cũ: ciphertext sẽ không giải mã được. Bản này dùng một phiên bản khóa, chưa có công cụ chuyển ciphertext tự động. Xoay khóa cần dừng ứng dụng, chuyển ciphertext ngoại tuyến đã kiểm trên bản sao hoặc đặt lại/đăng ký TOTP có kiểm soát cho các tài khoản liên quan, thu hồi phiên, rồi kiểm lại trước mở ứng dụng. Thay JWT_SECRET chỉ làm access cũ vô hiệu; refresh vẫn cần được thu hồi khi xử lý sự cố. Xem [ADR-005](docs/decisions/ADR-005-totp-va-phan-quyen.md).

## Cấu hình riêng và bảo vệ dữ liệu

`.env.example` là mẫu dev. `auth:key` sinh JWT_SECRET và MFA_ENCRYPTION_KEY riêng, mỗi khóa 32 byte vào `.env`, không in khóa và không đổi khóa hợp lệ đã có. Khóa MFA dùng AES-256-GCM với MFA_KEY_VERSION mặc định v1; không dùng chung khóa JWT. `src/lib/env.ts` kiểm biến xác thực bằng Zod. Không commit/gửi `.env`, cookie, token hoặc ảnh chứa bí mật. Mỗi máy có khóa, volume và DB riêng; GitHub không chuyển dữ liệu MySQL từ máy này sang máy khác.

`src/instrumentation.ts` kiểm cấu hình ngay khi server Node.js khởi động. APP_URL chỉ dùng HTTP/HTTPS, khớp URL/Origin của request; production yêu cầu HTTPS. Thời hạn và ngưỡng được kiểm bằng Zod trong `src/server/auth/limits.ts`; `.env.example` ghi các mặc định đã dùng để nghiệm thu:

| Biến môi trường                                               | Mặc định                           |
| ------------------------------------------------------------- | ---------------------------------- |
| `LOGIN_MAX_FAILURES`                                          | 5 lần sai                          |
| `LOGIN_WINDOW_SECONDS`, `LOGIN_LOCK_SECONDS`                  | 900 giây (15 phút) cho mỗi giá trị |
| `PASSWORD_RESET_TTL_SECONDS`                                  | 1800 giây (30 phút)                |
| `ACTIVATION_TTL_SECONDS`                                      | 86400 giây (24 giờ)                |
| `RECOVERY_WINDOW_SECONDS`, `RECOVERY_LOCK_SECONDS`            | 900 giây cho mỗi giá trị           |
| `RECOVERY_REQUEST_IP_LIMIT`, `RECOVERY_REQUEST_ACCOUNT_LIMIT` | 10 lần/IP, 3 lần/tài khoản         |
| `RECOVERY_COMPLETE_IP_LIMIT`, `RECOVERY_COMPLETE_TOKEN_LIMIT` | 20 lần/IP, 5 lần/token             |

Access mặc định `ACCESS_TTL_SECONDS=900`, refresh `REFRESH_TTL_DAYS=30`, bcrypt `BCRYPT_COST=12`. Giữ các mặc định để tái hiện nghiệm thu; không tăng hạn hay tắt giới hạn để vượt kiểm thử. Thay cấu hình riêng cần khởi động lại server.

MySQL Compose công bố cổng 3306, Mailpit SMTP 1025/UI 8025 ở loopback. MYSQL_DATABASE/MYSQL_USER/MYSQL_PASSWORD phải khớp DATABASE_URL và tài khoản trong volume. Đổi `.env` không tự đổi mật khẩu MySQL đã tạo. Không dùng `down -v`, migrate reset hay xóa DB để vượt lỗi.

### Shadow và migration

`npm.cmd run db:prepare` tạo shadow riêng với marker identity trong `.local/` và lưu SHADOW_DATABASE_URL vào `.env`; cả hai bị Git bỏ qua. Guard kiểm cổng/tài khoản/endpoint/server identity và tên DB để tránh chấp nhận nhầm dữ liệu thật làm shadow. Không grant toàn server `*.*`. Shadow là DB tạm Prisma có thể làm rỗng; luôn khác DB chính.

Migrate dùng schema runtime mặc định; **không thêm `--schema prisma/design.prisma`**. Tuần 2 migration 9 bảng vẫn giữ; Tuần 3 thêm `20261021165346_week3_auth_sessions`, Tuần 4 thêm `20261022004129_week4_rbac_mfa`. Migration auth đã xử lý collation `utf8mb4_vi_0900_ai_ci` để FK CHAR(36) khớp bảng cũ. Gặp drift/lỗi migration phải đọc nguyên nhân và giữ volume, không reset.

G1 thêm migration `20261028220000_amendment_01_roles_assessment`: ba enum vai trò, cờ nhóm mặc định false và cập nhật enum đợt/loại phản hồi. Không thêm bảng workflow tương lai vào runtime. Khi chạy **`npm.cmd run db:deploy`**, prehook tự kiểm đúng `DATABASE_URL` trước mọi DDL. Database mới chưa có bảng Feedback được chấp nhận; database đã có phải không còn dòng `CSVC_LICH_HOC`. Nếu có, lệnh dừng để người dùng xác nhận phân loại từng phản hồi sang loại phù hợp; không tự đoán giữa lịch học và phòng học/thiết bị. Giữ dữ liệu, phân loại có kiểm soát rồi chạy lại. Dùng lệnh npm này để giữ preflight, không gọi tắt `prisma migrate deploy` khi nâng cấp bản G1.

## Vận hành đợt khảo sát Tuần 7

1. Đăng nhập ĐBCL (demo DBCL2026001), chọn Đợt khảo sát → Tạo đợt. Chọn kỳ mở, mẫu, một trong bốn phạm vi, lịch theo giờ Việt Nam và ngưỡng; lưu/trình.
2. Đăng nhập PĐT (PDT2026001), mở đợt đang chờ xác nhận. Sửa dữ liệu danh mục còn lỗi chặn trước, ghi chú nếu có cảnh báo rồi xác nhận; hoặc trả về kèm lý do.
3. Đăng nhập lãnh đạo (LD2026001), duyệt hoặc từ chối có lý do. Duyệt khóa phiên bản mẫu. Nếu đã đến giờ mở thì mở ngay; nếu chưa thì chờ lịch.
4. Mở terminal thứ hai ở cùng dự án và chạy scheduler. Giữ web và MySQL hoạt động. Mailpit tại http://localhost:8025 chỉ nhận thư giả cục bộ.

```powershell
npm.cmd run scheduler
# Hoặc một lượt cho kiểm tra/vận hành thủ công:
npm.cmd run scheduler -- --once
# Chu kỳ60giây mặc định; có thể chọn10..3600giây:
npm.cmd run scheduler -- --interval 30
```

Khi không có scheduler, lần truy cập đợt/danh sách tiếp theo sẽ gọi ensure để bắt kịp trạng thái; queue email chờ scheduler xử lý. Không cam kết mở đúng từng giây khi mọi tiến trình đều dừng. Học kỳ không khóa được khi còn đợt đã duyệt hoặc đang mở theo quyết định người dùng. ĐBCL gia hạn/đóng sớm/hủy theo trạng thái, có lý do; tiến độ chỉ đếm nhiệm vụ, không đọc nội dung phiếu. SMTP thử lại tối đa5lần; có thể gửi lặp nếu worker chết giữa SMTP và ghi SENT.

Seed mới thêm hai đợt nháp W7: một đợt cảnh báo có thể xác nhận và một đợt ở kỳ khóa để xem đủ RS-01–06; chưa trình/duyệt hộ người dùng. Chạy seed lặp giữ nguyên dữ liệu đã thao tác. FR-145 ImportBatch/hoàn tác là P1 có điều kiện, chưa nghiệm thu; import CSV/XLSX hiện có vẫn hoạt động theo Tuần5/G1.

## Kiểm tra

```powershell
npm.cmd run db:validate
npm.cmd run test:integration
npm.cmd run test:auth
npm.cmd run test:week4
npm.cmd run test:week5
npm.cmd run test:week6
npm.cmd run test:week7
npm.cmd run test:week7:settings
npm.cmd run test:week8
npm.cmd run test:week9
npm.cmd run test:demo
npm.cmd run check
npm.cmd run build
npm.cmd run progress
```

| Lệnh               | Phạm vi                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `test:integration` | MySQL thật 34 bảng; ràng buộc nền và phạm vi ba vai trò mới, dùng fixture transaction rồi rollback |
| `test:auth`        | HTTP/MySQL/Mailpit với fixture giả riêng, server thử cổng 3002; cleanup đúng fixture, không dùng tài khoản demo |
| `check`            | Validate/generate runtime+blueprint, ERD đồng bộ DMMF, ESLint, TypeScript, Vitest                               |
| `build`            | Next.js production build, không thay thử giao diện/HTTP                                                         |
| `progress`         | Tính FR từ checkbox có trọng số, không ước lượng khối lượng thiết kế                                            |
| `auth:key`         | Sinh khóa JWT riêng lần đầu, giữ khóa đã có                                                                     |
| `db:seed`          | Bổ sung dữ liệu giả và tài khoản còn thiếu, chặn production, không reset tài khoản đã thử                      |
| `test:week5` | HTTP/MySQL/Mailpit cổng 3004, output `.next-week5`, dùng lại DB thử có marker Tuần 4; chạy tuần tự các suite |
| `test:week6` | HTTP/MySQL cổng 3005/output `.next-week6`, dùng DB thử có marker; ma trận mười vai trò của G1, cờ nhóm, phiên bản/khóa/CAS/preview không ghi |
| `test:week7` | HTTP/MySQL cổng3006: duyệt, readiness, drift, chốt task,20 ensure đồng thời, lịch, gia hạn, tiến độ và scheduler/Mailpit; fixture riêng |
| `test:week7:settings` | HTTP/MySQL cổng3007: ngưỡng/TOTP thật, ma trận10vai trò, CAS, mặc định và queue/retry/lease/Mailpit |
| `test:week8` | HTTP/MySQL cổng3008/output `.next-week8`, DB thử có marker:10vai trò, task own/IDOR, năm loại,20POST đồng thời, duplicate, rollback chèn answer, DTO/log riêng tư; helper trigger chỉ giới hạn fixture |
| `test:week9` | HTTP/MySQL cổng3009/output `.next-week9`, DB thử có marker: tổng hợp/công bố,11nhóm quyền/ngưỡng/TEXT/KT/nhắc/audit;10POST đồngthời và rollback dữ liệu lớp cuối, fixture sạch |
| `db:seed:week9` | Chỉ thêm bundle E8 kết quả giả vào DB cục bộ đã có danh mục/tài khoản demo; không ghi lại lịch sử/mẫu/phiếu/kết quả cũ |
| `scheduler` | Mở/đóng đợt và chuyển email đã xếp hàng; chạy liên tục hoặc --once |
| `test:demo` | Tạo DB demo mới, kiểm seed/size/idempotent, dữ liệu khảo sát và phép tính thật; giữ DB sau kiểm |

`db:seed`, `test:auth` và `build` tự chạy `db:generate` qua npm prehook, nên máy clone mới không cần có Prisma client đã sinh sẵn trong Git. CI ban đầu ở `ed7ed60` từng lỗi vì chạy test auth trước generate; mã `43b937e` đã sửa thứ tự này.

### Kiểm thử Tuần 4 trên database riêng

`test:week4` tự chuẩn bị một database MySQL riêng có marker gắn server identity, lưu URL trong `.env` riêng. Nó khác main và shadow; không sao chép main, không DROP/reset database hoặc volume. Lệnh kiểm CLI qua stdin rồi chạy HTTP/TOTP/phân quyền trên cổng3003; chỉ fixture UUID được dọn. Giữ Docker chạy. Không chạy cùng lúc với `test:auth` vì cả hai dùng output `.next-auth`; ứng dụng đang mở cổng3000 dùng output riêng.

Nghiệm thu Tuần 4: Full check **121/121 test trong 13 file**, SQL MySQL **10/10**, CLI stdin **5/5**, HTTP hồi quy Tuần 3 **24/24**, HTTP/MySQL Tuần 4 **28/28** và build exit0. **Tiến độ 34/163 = 20,9%**. [CI 39733168348](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39733168348) của mã `578fd96622b341b0d94228de83c4c8994449e03b` đã qua check và smoke. UI 13 nhóm/6 viewport và 6 PNG qua. Kết quả và giới hạn được ghi tại [nghiệm thu Tuần 4](docs/NGHIEM_THU_TUAN_04.md). Lượt Tuần 3 dưới đây là bằng chứng lịch sử, không thay gate mới.

Nghiệm thu **Tuần 3** ngày **22/10/2026**: **61/61 Vitest** (27 core auth, 18 recovery, 13 schema/guard, 2 cấu hình limits, 1 health), lint/typecheck/ERD qua, **build exit 0**, **24/24 HTTP/MySQL/Mailpit**, **10/10 SQL nền**. HTTP đã kiểm reset đồng thời chỉ một lần thành công và refresh replay; race refresh đồng thời mới kiểm bằng unit mock, chưa kiểm đồng thời qua HTTP/MySQL. [CI 39642730208](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/39642730208) của mã **`43b937e`** qua cả `check` và `smoke`.

[QA giao diện](docs/QA_GIAO_DIEN_TUAN_03.md) kiểm 10 lượt trang/viewport, bàn phím, đăng nhập/đăng xuất và luồng email → reset → đăng nhập trên trình duyệt. Ba sơ đồ xác thực đã render, đối chiếu 6/6 hash nguồn/SVG. Tỷ lệ sau Tuần 3 là **20/163 = 12,3%**; tiến độ hiện tại và bằng chứng mới xem [PROGRESS](docs/PROGRESS.md) và [nghiệm thu Tuần 4](docs/NGHIEM_THU_TUAN_04.md). Khi lấy bản mới, đối chiếu CI đúng SHA trong lịch sử Actions của main.

Đăng nhập sai 5 lần trong 15 phút khóa tạm 15 phút. Request email/reset cũng bị giới hạn. Mặc định `AUTH_TRUST_PROXY=false`, IP ở Next Route Handler dùng bucket tổng `untrusted-client`; các tài khoản vẫn có bucket riêng. Chỉ bật trust proxy sau khi có proxy tin cậy ghi đè header và chặn truy cập trực tiếp. Xem [ADR-004](docs/decisions/ADR-004-xac-thuc.md) về JWT, refresh/replay, cookie, CSRF, xoay khóa và giới hạn SMTP timing.

Audit dependency cuối Tuần 3: **production 0**, full audit còn **5 high** trong dev chain; không áp dụng force downgrade hoặc tuyên bố hết lỗ hổng. DMMF chỉ chứng minh cấu trúc ẩn danh 5.6a; test nộp trùng/đồng thời/export 5.6b/c/d thuộc các tuần chức năng khảo sát.

## Chia sẻ cho bạn cùng nhóm

Gửi [kho GitHub](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses), dùng `git clone`, rồi làm các bước chạy lần đầu trên máy bạn ấy. Không gửi `.env` hoặc volume. Để push cùng kho, chủ kho thêm GitHub collaborator, bạn ấy chấp nhận lời mời.

Trước mỗi phần việc: `git switch main`, `git pull --ff-only`, tạo nhánh `feat/...`, đọc AGENTS và PROJECT_STATE, làm đúng tuần/phân công, chạy check rồi commit/push và tạo Pull Request. Chờ CI/kiểm tra trước khi nhập main; không force push. Nếu đã có thay đổi cục bộ, giữ lại/commit hợp lệ trước khi đổi nhánh.

## Tài liệu

- Điều chỉnh số 01/G1: [prompt nguyên văn](docs/BO_SUNG_01_TAC_NHAN.md), [ma trận 10 vai trò](docs/MA_TRAN_QUYEN.md), [đặc tả hiện tại](docs/DAC_TA_NGHIEP_VU.md), [kế hoạch có việc bù](docs/KE_HOACH_15_TUAN.md). Các tài liệu nghiệm thu theo tuần dưới đây giữ bằng chứng lịch sử trước điều chỉnh.

- Tuần 9 (đang tích hợp, chưa nghiệm thu): [nghiệm thu](docs/NGHIEM_THU_TUAN_09.md), [công thức](docs/CONG_THUC_TONG_HOP.md), [báo cáo 10 mục](docs/bao-cao-tien-do/tuan-09.md), [5 câu bảo vệ](docs/GIAI_THICH/tuan-09.md), [ADR010](docs/decisions/ADR-010-tong-hop-cong-bo-va-kiem-duyet.md), [sơ đồ](docs/SO_DO_TUAN_09.md).

- Tuần 8: [nghiệm thu](docs/NGHIEM_THU_TUAN_08.md), [báo cáo](docs/bao-cao-tien-do/tuan-08.md), [giải thích](docs/GIAI_THICH/tuan-08.md), [ADR-009](docs/decisions/ADR-009-nop-phieu-an-danh.md), [QA](docs/QA_GIAO_DIEN_TUAN_08.md), [sơ đồ](docs/SO_DO_TUAN_08.md).

- Tuần 7: [nghiệm thu](docs/NGHIEM_THU_TUAN_07.md), [báo cáo](docs/bao-cao-tien-do/tuan-07.md), [giải thích](docs/GIAI_THICH/tuan-07.md), [ADR-008](docs/decisions/ADR-008-dot-khao-sat-va-chot-danh-sach.md), [QA](docs/QA_GIAO_DIEN_TUAN_07.md), [sơ đồ](docs/SO_DO_TUAN_07.md).

- Tuần 6: [nghiệm thu](docs/NGHIEM_THU_TUAN_06.md), [báo cáo](docs/bao-cao-tien-do/tuan-06.md), [giải thích](docs/GIAI_THICH/tuan-06.md), [ADR-007](docs/decisions/ADR-007-mau-phieu-va-phien-ban.md), [sơ đồ](docs/SO_DO_TUAN_06.md).

- Tuần 5: [nghiệm thu](docs/NGHIEM_THU_TUAN_05.md), [hướng dẫn import](docs/HUONG_DAN_IMPORT.md), [ADR-006](docs/decisions/ADR-006-danh-muc-va-nhap-lieu.md), [giải thích](docs/GIAI_THICH/tuan-05.md), [báo cáo](docs/bao-cao-tien-do/tuan-05.md), [QA giao diện](docs/QA_GIAO_DIEN_TUAN_05.md), [sơ đồ](docs/SO_DO_TUAN_05.md).

- [Sơ đồ ERD Tuần 4 đã render và hash](docs/SO_DO_TUAN_04.md).

- Tuần 4: [nghiệm thu](docs/NGHIEM_THU_TUAN_04.md), [ma trận chạy thật](docs/PHAN_QUYEN_TUAN_04.md), [bảo mật](docs/BAO_MAT_TUAN_04.md), [ADR-005](docs/decisions/ADR-005-totp-va-phan-quyen.md), [giải thích](docs/GIAI_THICH/tuan-04.md), [báo cáo](docs/bao-cao-tien-do/tuan-04.md), [QA giao diện](docs/QA_GIAO_DIEN_TUAN_04.md).

- [Trạng thái](docs/PROJECT_STATE.md), [tiến độ FR](docs/PROGRESS.md), [truy vết](docs/TRUY_VET.md), [nhật ký AI](docs/AI_USAGE.md).
- [Đặc tả nguồn](docs/DAC_TA_NGHIEP_VU.md), [kế hoạch 15 tuần](docs/KE_HOACH_15_TUAN.md), [FR/NFR](docs/YEU_CAU.md), [ma trận thiết kế](docs/PHAN_QUYEN.md).
- [Sơ đồ xác thực](docs/SO_DO_XAC_THUC.md), [ADR-004](docs/decisions/ADR-004-xac-thuc.md), [giải thích và 5 câu bảo vệ](docs/GIAI_THICH/tuan-03.md), [báo cáo Tuần 3](docs/bao-cao-tien-do/tuan-03.md), [nghiệm thu Tuần 3](docs/NGHIEM_THU_TUAN_03.md).
- [ERD hiện tại](docs/ERD.md), [kiến trúc](docs/KIEN_TRUC.md), [thiết kế ẩn danh](docs/THIET_KE_AN_DANH.md), [gallery sơ đồ Tuần 2](docs/SO_DO_DA_RENDER.md).
- [Báo cáo Tuần 1](docs/bao-cao-tien-do/tuan-01.md), [Tuần 2](docs/bao-cao-tien-do/tuan-02.md) giữ nguyên bằng chứng tại thời điểm thực hiện.

AI hỗ trợ mã/tài liệu, sinh viên cần đọc, thử và viết lại bản nháp; không tự gán đóng góp cá nhân. Không viết quy trình hiện tại ở trường theo yêu cầu người dùng. Phạm vi hiện tại là Tuần 9 theo yêu cầu bắt đầu và tiếp tục trực tiếp; chỉ chốt khi đủ mã/test/nghiệm thu/tài liệu. Ngoại lệ seed cũ không cho phép làm trước workflow mới. Kiểm DTO/log của phiếu hiện có không thay kiểm export CSV/Excel/PDF kết quả ở Tuần 12.
