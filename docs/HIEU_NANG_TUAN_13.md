# Hiệu năng nộp phiếu — Tuần 13

Ngày thực hiện hồ sơ: 03/11/2026. Đây là phép đo cục bộ trên dữ liệu giả; không phải cam kết năng lực của một máy chủ triển khai. Kết quả chạy được bổ sung sau khi thực thi, không lấy số dự kiến làm số đo.

## Mục tiêu và phương pháp

Đặc tả nguồn Mục 8.8 yêu cầu tải nhẹ với hàng trăm yêu cầu đồng thời, không sinh phiếu trùng và ghi số liệu thật. NFR-16 trong `YEU_CAU.md` đặt **mục tiêu đề xuất**: 200 yêu cầu nộp đồng thời, p95 ≤ 3.000 ms, lỗi ngoài từ chối hợp lệ dưới 1%. Không có điều kiện 1.500 yêu cầu trong đặc tả nguồn; không nhận đã kiểm mức tải đó.

`scripts/verify-week13-load.ts` chạy hai đợt HTTP qua route ứng dụng thật, kết nối MySQL thật:

1. Khởi tạo dữ liệu giả: mẫu đã khóa với năm câu Likert bắt buộc, một đợt đang mở, một lớp và 202 sinh viên/nhiệm vụ khác nhau. Mẫu, trạng thái và phiên được chuẩn bị ngoài thời gian đo; bộ đo không thay cho nghiệm thu quy trình tạo/duyệt/mở đợt.
2. Cấp phiên bằng dịch vụ xác thực thật; mỗi sinh viên có access JWT và chữ ký CSRF riêng. Route vẫn kiểm JWT, phiên/quyền trong DB, Origin, CSRF, đầu vào và điều kiện nộp. Không đo bcrypt/đăng nhập hoặc tải trang.
3. Nộp một phiếu khởi động để nạp route, ORM và kết nối. Phiếu này được tách khỏi mẫu đo nhưng được tính rõ trong số bản ghi đối chiếu.
4. Khởi chạy **200 yêu cầu đồng thời** bằng `Promise.all`, mỗi yêu cầu thuộc một sinh viên và nhiệm vụ riêng. Đo từ trước `fetch` tới khi đọc xong thân phản hồi, gồm thời gian chờ hàng đợi. Giới hạn chờ mỗi yêu cầu là 120 giây; lỗi mạng được ghi status 0, không bị loại khỏi mẫu.
5. Gửi **20 yêu cầu đồng thời vào một nhiệm vụ mới**. Điều kiện BR-02/NFR-02: đúng một HTTP 200, 19 HTTP 409; MySQL chỉ tăng một phiếu và năm đáp án, nhiệm vụ thành DONE.
6. Đối chiếu số phiếu, đáp án và nhiệm vụ DONE bằng SQL/Prisma. Trong đợt 200 nhiệm vụ riêng, mọi status khác 200 đều được tính lỗi ngoài dự kiến. HTTP 409 chỉ được coi là từ chối hợp lệ trong đợt tranh chấp cùng nhiệm vụ.

Percentile sử dụng phương pháp nearest-rank; p50/p95/p99/max tính trên **toàn bộ lần thử**, kể cả HTTP lỗi hoặc timeout. Throughput bằng tổng lần thử chia tổng thời gian đợt, không suy ra số người dùng đồng thời từ request/giây. Bộ sinh tải và máy chủ cùng máy nên kết quả chịu tranh chấp CPU/RAM; không có mô phỏng độ trễ Internet.

## Môi trường và an toàn dữ liệu

- Chỉ chạy trên `127.0.0.1:3013`, không nhận URL hoặc cổng tùy ý. Nếu cổng đang được sử dụng thì dừng; không nối vào máy chủ có sẵn hoặc dừng tiến trình khác.
- Database tải có tiền tố `_w13load_`, hậu tố tám ký tự hex và marker riêng `.local/week13-load-database.json`. Guard kiểm máy chủ/credential trùng Compose cục bộ, database khác main/shadow/các database kiểm thử khác, UUID MySQL và tên database thực trước khi ghi fixture.
- `prepare-week13-load.mjs` chỉ tạo database riêng khi chưa có và áp dụng migration. Không sao chép/reset/xóa database, không sửa `.env`, tài khoản hoặc MFA của chủ dự án. Database đã tồn tại mà không có marker bị từ chối.
- Fixture và lịch sử được giữ trong database thử để đối chiếu. Cuối lượt, phiên fixture bị thu hồi và tài khoản fixture bị vô hiệu hóa; không mô tả database là trống hoặc đã xóa sạch.
- Chế độ `--production` dùng bản build riêng `.next-week13-load` và `next start`. APP_URL vẫn là HTTPS theo quy tắc production; HTTP loopback mô phỏng chặng nội bộ sau reverse proxy. Header Origin dùng canonical HTTPS. **Không đo TLS/reverse proxy và không dùng phép đo này để chứng nhận cookie Secure hoạt động trên trình duyệt.** Không nới guard HTTPS hoặc đặt `NEXT_PHASE` để bỏ qua guard.
- Chế độ mặc định dùng `next dev --webpack` đã khởi động route; phải ghi rõ là development và không so với production như cùng một môi trường.
- Bằng chứng riêng `.local/week13-load-result.json` và bản theo mã lượt chứa cấu hình máy, mode, SHA nguồn, trạng thái working tree, phiên bản MySQL, số đếm, mẫu độ trễ/status và kết quả. Không ghi cookie, JWT, CSRF, mật khẩu, URL kết nối, danh tính sinh viên hay nội dung phiếu. Log máy chủ giữ riêng; không tự commit toàn bộ log.

## Cách chạy lại

Sau khi cài phụ thuộc và generate Prisma, chạy lần lượt từ gốc kho:

```powershell
node scripts/prepare-week13-load.mjs
# Dùng bản build riêng .next-week13-load đã dựng từ đúng mã cần đo.
node node_modules/tsx/dist/cli.mjs scripts/verify-week13-load.ts --production
```

Nếu chưa có bản production riêng, có thể bỏ `--production` để đo development. Không gọi kết quả development là benchmark production. Chỉ chạy một bộ DB/tải tại một thời điểm và tránh build/generate trong khi máy chủ đang đo. Runner chỉ dừng cây tiến trình do chính lượt đo mở.

Mã thoát 0: đúng dữ liệu và đạt cả hai mục tiêu đề xuất. Mã 2: đã đo và kiểm dữ liệu nhưng chưa đạt ít nhất một mục tiêu hiệu năng. Mã 1: bộ đo hoặc điều kiện đúng dữ liệu chưa hoàn tất. Không đổi ngưỡng để biến kết quả chưa đạt thành đạt.

## Kết quả thực thi

### Lượt nền trước tối ưu — 03/11/2026

Đã chạy đúng một benchmark production lúc 23:01:36–23:02:01 (Asia/Ho_Chi_Minh), mã lượt `L13f7b02ad4e8`, build ID `N6kgSBsV5iD1AiWnNk9tH`. HEAD nền là `e05985625849818ce0aaabe41db6aecc80ca0e1f` và working tree **có thay đổi**; không gọi đây là benchmark nguyên trạng commit HEAD hoặc CI của nguồn đã commit.

Môi trường đo: Node **24.21.0**, Next **16.4.3**, Windows **10.0.26200 x64**, Intel Core **i5-12500H**, **16 logical CPU**, RAM máy **15,73 GiB**. Docker engine báo **16 CPU / 7,62 GiB**, MySQL **8.4.11**; Prisma pool **5** kết nối. Máy khách và máy chủ cùng máy. Chế độ canonical HTTPS + HTTP loopback nội bộ như giới hạn đã nêu.

| Số đo | 200 nhiệm vụ riêng | 20 yêu cầu cùng một nhiệm vụ |
| --- | --- | --- |
| HTTP 200 | 196 | 1 |
| HTTP 409 hợp lệ | 0 | 19 |
| HTTP 500 | 4 | 0 |
| Lỗi mạng | 0 | 0 |
| Tổng thời gian đợt | 12.419,96 ms | 894,85 ms |
| Throughput theo lần thử | 16,10 request/s | 22,35 request/s |
| p50 | 7.338,21 ms | 646,59 ms |
| p95 | **12.092,56 ms** | 877,62 ms |
| p99 | 12.311,97 ms | 891,96 ms |
| Lỗi ngoài dự kiến | **4/200 = 2%** | 0/20 |

MySQL sau đợt riêng (gồm một phiếu khởi động): **197 phiếu, 985 đáp án, 197 nhiệm vụ DONE**. Đợt tranh chấp chỉ tăng **một phiếu, năm đáp án**, đúng một nhiệm vụ DONE. Không thấy phiếu trùng hoặc ghi nửa transaction trong số đếm đã kiểm. Các phiên fixture đã thu hồi và tài khoản fixture đã vô hiệu hóa; máy chủ 3013 đã dừng. Dữ liệu/lịch sử fixture được giữ trong database riêng.

**Lượt nền chưa đạt hai mục tiêu đề xuất**: p95 vượt 3.000 ms và lỗi 2% lớn hơn mức dưới 1%. Bằng chứng gốc cùng toàn bộ mẫu độ trễ/status: [load-baseline.json](assets/tuan-13/load-baseline.json). Không bỏ bốn lỗi khỏi mẫu số hoặc thay ngưỡng để ghi đạt. Server log chỉ có thông tin khởi động; chưa phân rã được nguyên nhân ORM cụ thể của bốn HTTP 500 do lỗi dịch vụ được che đúng quy tắc riêng tư.

### Điều chỉnh được kiểm ngày 04/11/2026

Rà mã chỉ ra đường nộp cũ luôn lấy khóa độc quyền `ADMIN_MUTATION_LOCK` hai transaction liên tiếp (lifecycle và nộp) kể cả khi đợt đang mở ổn định. Đây là điểm tuần tự hóa có căn cứ từ mã, chưa dùng riêng quan sát đó để khẳng định nguyên nhân của cả bốn HTTP 500.

Thay đổi có phạm vi: đọc/nộp nhiệm vụ của chính sinh viên được thử dưới `SELECT ... FOR SHARE`, là current read đầu tiên trước khi đọc lại phiên/quyền và snapshot. Chỉ khi đợt `DANG_MO`, học kỳ chưa khóa và thời gian còn trong cửa sổ, dịch vụ mới xử lý trực tiếp. Các thao tác quản trị/quyền/chính sách/danh mục/mẫu/đợt vẫn giữ khóa độc quyền; danh sách có thể chạy lifecycle vẫn giữ đường độc quyền. Không tăng pool hoặc kéo dài timeout để che lỗi.

Thiếu hàng guard, trạng thái chưa ổn định hoặc hết hạn sau đọc mẫu đều kết thúc transaction chia sẻ trước rồi dùng lifecycle độc quyền và đọc lại quyền. Không nâng khóa S thành X trong cùng transaction. CAS của task PENDING và phiếu/đáp án ẩn danh vẫn cùng giao dịch; chặn trùng và rollback giữ nguyên. Không tuyên bố guard này tuyến tính hóa mọi logout/reset mật khẩu vốn đi theo khóa phiên riêng từ trước, cũng không nhận hạn nộp được kiểm tại đúng thời điểm commit.

Đã qua 115 kiểm thử đơn vị/riêng tư/IDOR có liên quan, gồm 13 trường hợp mới của fast path, fallback, biên giờ, quyền thu hồi, CAS và rollback. TypeScript `--noEmit --incremental false` và ESLint các tệp thay đổi đều qua.

Kiểm thêm trên **MySQL thật**, database marker riêng khác database tải nền, ngày 04/11/2026: **8/8 nhóm**, native exit code 0. [Bằng chứng](assets/tuan-13/survey-lock-result.json):

| Nhóm kiểm | Kết quả quan sát |
| --- | --- |
| Guard chưa tồn tại | Lượt đầu thật có 0 hàng guard; fallback tạo guard rồi nộp đúng một phiếu, không nâng S thành X trong transaction chia sẻ |
| Tương thích khóa | S thứ hai hoàn tất khi S thứ nhất còn giữ; X bị chặn ít nhất trong cửa sổ kiểm 150 ms và tiến tiếp sau khi S nhả |
| Hai sinh viên/nhiệm vụ khác nhau | Cả hai lời gọi dịch vụ thật cùng tới barrier đọc mẫu dưới S trước khi được nhả; cả hai nộp thành công, hai phiếu/hai đáp án |
| Quyền đổi trong X đang giữ | Actor cũ chờ S, sau X commit thì bị 403; không ghi phiếu |
| Thu hồi phiên trong X đang giữ | Actor cũ chờ S, sau X commit thì bị 401; không ghi phiếu |
| Hai mươi lần cùng task | Một thành công, 19 lỗi 409; một phiếu, một đáp án, một DONE |
| Lỗi insert đáp án | Lỗi có chủ ý trong transaction thật làm task về PENDING/ngày null và không còn phiếu/đáp án; bỏ lỗi rồi thử lại tạo đúng một phiếu |
| Hết hạn sau đọc mẫu | Delay có kiểm soát bắt đầu khi còn trong hạn; nhả S rồi fallback X commit đúng một AUTO_CLOSE, trả 409 và không ghi phiếu |

Hai phép kiểm cuối và barrier dùng proxy delegate **chỉ trong tiến trình kiểm thử** để trì hoãn đọc mẫu hoặc ném lỗi chèn đáp án; dữ liệu và transaction vẫn ở MySQL thật. Đây là fault injection và kiểm dịch vụ, không gọi là thao tác GUI hoặc HTTP E2E. Không thay đồng hồ hệ thống. Phiên/tài khoản fixture đã thu hồi/vô hiệu hóa; dữ liệu/hồ sơ thử được giữ. Chạy lại bằng `npm run test:survey-locks`: lệnh tự chuẩn bị marker/database tải riêng trước, rồi marker/database khóa riêng để bộ kiểm xác nhận hai nơi khác nhau, sau đó mới chạy verifier. Hai bước chuẩn bị giữ kiểm Compose, UUID máy chủ, database chính/shadow và marker; không reset/xóa database, không sửa `.env` hoặc sinh lại Prisma Client. Nếu guard đã có ở lượt sau thì không nhận là lặp lại phép kiểm cold-start.

Đã kiểm lệnh độc lập này lúc **02:47–02:48 ngày 05/11/2026** (Asia/Ho_Chi_Minh), bắt đầu khi marker tải chưa có và database khóa chưa tồn tại trên engine đã xác minh có 45 bảng ứng dụng chính: **exit 0, 8/8 nhóm**, gồm cold-start có guard ban đầu vắng mặt. Marker tải cũ đã lưu riêng, database cũ giữ nguyên; hai database fixture được chuẩn bị có marker riêng, khác nhau và cùng UUID máy chủ. Phiên/tài khoản fixture mới đã thu hồi/vô hiệu hóa. [Bằng chứng lệnh độc lập](assets/tuan-13/survey-lock-standalone-result.json) tách khỏi lượt 04/11; không cộng thành 16 nhóm độc lập hoặc thay phép đo tải. Chỉ sửa lệnh package và bước CI; `npm run check`/build đầy đủ của nguồn sau sửa còn chờ dừng máy chủ GUI, không chạy generate/build/check song song phiên đó.

### Lượt HTTP production sau thay đổi — 04/11/2026

Đã dựng lại production từ nguồn có tối ưu khóa và đo một lượt, mã `L136954f82e58`, build ID `U4gfXxiSSrhNoZev0uDYX`, lúc 16:17:18–16:17:35 (Asia/Ho_Chi_Minh). Các bộ DB khác được tạm dừng trong thời gian đo. Môi trường/phương pháp/pool và timeout giữ như bảng nền; working tree vẫn có thay đổi, không nhận là benchmark một SHA nguồn đã commit hoặc là kết quả CI.

| Số đo | 200 nhiệm vụ riêng | 20 yêu cầu cùng một nhiệm vụ |
| --- | --- | --- |
| HTTP 200 | **200** | 1 |
| HTTP 409 hợp lệ | 0 | 19 |
| HTTP 500 / lỗi mạng | **0 / 0** | 0 / 0 |
| Tổng thời gian đợt | 3.693,75 ms | 389,92 ms |
| Throughput theo lần thử | 54,15 request/s | 51,29 request/s |
| p50 | 2.735,16 ms | 354,52 ms |
| p95 | **3.595,91 ms** | 388,31 ms |
| p99 | 3.675,08 ms | 389,56 ms |
| Lỗi ngoài dự kiến | **0/200 = 0%** | 0/20 |

SQL sau đợt riêng, gồm một phiếu khởi động: **201 phiếu, 1.005 đáp án, 201 nhiệm vụ DONE**. Đợt cùng nhiệm vụ tiếp tục chỉ tăng **một phiếu và năm đáp án**, đúng một DONE. Cuối lượt đã thu hồi phiên, vô hiệu hóa các tài khoản fixture và dừng máy chủ riêng. Không lặp lại cùng nguồn để chọn một lượt nhanh hơn.

Kết quả sau sửa đạt đủ 200 lần nộp hợp lệ, không lỗi ngoài dự kiến và không sinh phiếu trùng trong các số đếm đã kiểm. p95 quan sát giảm từ 12.092,56 ms xuống 3.595,91 ms; tuy nhiên vẫn vượt mục tiêu đề xuất 3.000 ms **595,91 ms**. Vì vậy **NFR-16 chưa đạt toàn bộ mục tiêu đề xuất**, không đánh dấu benchmark là xanh hoàn toàn hoặc thay ngưỡng. Đây là hai phép đo cục bộ tại hai thời điểm, không phải thí nghiệm thống kê chứng minh mức cải thiện trên mọi môi trường.

Bằng chứng có toàn bộ 200+20 mẫu độ trễ/status: [load-after-shared-guard.json](assets/tuan-13/load-after-shared-guard.json). Mã thoát native của lượt đo là **2**, phù hợp trạng thái `measured-target-not-met`; kiểm dữ liệu ghi `correctnessPassed=true`, mục tiêu lỗi đạt và mục tiêu thời gian chưa đạt.

Một lượt chuẩn bị ngay trước đó (`L131dde70c310`) dừng ở truy vấn danh tính database với P2010, **trước khi tạo fixture, mở server hoặc đo tải**. Đã chạy lại `prepare-week13-load.mjs` để kiểm Compose/marker, áp migration và cấp lại quyền đúng database thử sau Docker khởi động lại, rồi mới chạy lượt đo nêu trên. [Dấu vết readiness](assets/tuan-13/load-readiness-failure.json) được giữ riêng; không tính lượt kết nối này thành mẫu tải hoặc mô tả thành 200 yêu cầu ứng dụng bị lỗi.

Giới hạn cần giữ trong báo cáo: một mẫu phiếu năm câu, một lớp/đợt, một tiến trình máy chủ, một máy khách sinh tải, không đăng nhập đồng thời, không mạng WAN/TLS; không suy ra mức tải tối đa hoặc bảo đảm mọi cấu hình production đều đạt.
