# Rà soát bảo mật Tuần 13

**Chốt ngày 05/11/2026:** Check/build cục bộ, UC-GOLD kiểm tay đủ các bước và [CI 41904262769](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41904262769) check/e2e/smoke của nguồn `831d14decd9d6a562a1f9ecc0a53f6a4fadc8248` đều qua. Chốt 10 FR, thêm 23 điểm: **211/219=96,3%,78/84 FR**. Giữ các giới hạn p95, audit, axe và phạm vi quét; không bắt đầu Tuần 14/UI-n.

Thực hiện ngày **03–04/11/2026** trên dữ liệu giả, theo phạm vi Tuần 13. Giai đoạn nâng cấp UI vẫn tạm dừng. Các kết quả kiểm nguồn, kiểm tự động, HTTP và trình duyệt được phân biệt; tài liệu này không phải chứng nhận an toàn cho một hệ thống đã triển khai công khai.

## Phạm vi và bằng chứng

Lượt Codex Security Standard có mã `4177d4cb-5e10-49de-8306-4123765f0c29`, nguồn ban đầu `e05985625849818ce0aaabe41db6aecc80ca0e1f`. Báo cáo và ba tệp JSON chuẩn được plugin tạo, kiểm hợp đồng và niêm phong thành công. Lượt này rà toàn bộ **40 tệp nguồn/cấu hình** cùng các đường đọc hồ sơ/kết quả đại diện, ghi nhận **8 bề mặt và 1 lỗi mức thấp**. Độ bao phủ quét nguồn được ghi **partial**, không nhận đã kiểm hết 889 mục của kho. Những phần chưa rà hết được giữ trong `coverage.deferred`; không dùng số test xanh để đổi trạng thái này thành complete.

Thời điểm thiết lập, nhóm tác vụ đã dùng hết bốn vị trí nên không mở được kiểm tra độc lập ban đầu; lượt rà dùng cách kiểm tuần tự theo hướng dẫn của kỹ năng. Sau khi các tác vụ khác kết thúc, một tác vụ đọc độc lập đã kiểm bản vá và không tìm thấy đường vượt quyền hoặc hồi quy cụ thể. Lượt quét đã chốt trước khi sửa lỗi; kết quả khắc phục dưới đây là bằng chứng riêng. Plugin không đo được token của lượt quét, không ghi số ước lượng thay thế.

Không dùng dữ liệu thật, không reset database, không thay mật khẩu/khóa MFA của chủ dự án, không dò máy bên ngoài. Kiểm nguồn giữ ngoại tuyến; thông tin phiên và khóa không đưa vào ảnh hoặc bằng chứng. Lượt rà không kiểm toàn bộ mã phụ thuộc, các ảnh nhị phân, mọi script vận hành hoặc cấu hình hạ tầng production.

## Lỗi quyền ADMIN đa vai trò — BR-68

Ở nguồn đầu lượt rà, một tài khoản có `ADMIN` cùng `GIANG_VIEN`, `CAN_BO_DBCL`, `PHONG_KHAO_THI` hoặc vai trò kết quả phù hợp vẫn qua được `can("results:*")`. API và service đều kiểm policy này, nên đọc lại quyền từ database không khắc phục được điều kiện loại ADMIN còn thiếu. Đây là vi phạm tách quyền theo BR-68; không phải đường tự cấp vai trò hoặc bỏ qua MFA. ADMIN đơn vai trò vẫn bị chặn, và phạm vi/ngưỡng mẫu vẫn có hiệu lực, vì vậy mức độ được ghi **low**, độ tin cậy **high**, CWE-863.

Bản vá đặt điều kiện từ chối `ADMIN` cho toàn bộ miền `results:*` tại policy dùng chung, trước khi xét các gán nghiệp vụ bổ sung. Quyền quản lý tài khoản, danh mục và quyền xem lớp theo gán riêng không bị đổi. Các vai trò nghiệp vụ không có ADMIN tiếp tục dùng đúng phạm vi của mình. Báo cáo vẫn ép ADMIN về số liệu vận hành như trước.

Đã chạy một phép tái hiện trước bản vá: `tests/rbac-policy.test.ts` có **6 failed, 33 passed / 39**, đúng sáu tổ hợp có đường đọc kết quả. Sau bản vá, bộ kiểm tập trung gồm policy, service, API, tổng hợp/kiểm duyệt, policy báo cáo và header/proxy qua **160/160 trong 8 tệp**; ESLint các tệp sửa qua. Test mới kiểm cả chín tổ hợp ADMIN với các vai trò còn lại, bảy action kết quả, scope/capability rỗng và API từ chối trước khi gọi service. Đây là test policy/route/service có mock; kiểm MySQL và toàn bộ `npm run check` được đối chiếu trong hồ sơ nghiệm thu Tuần 13, không suy từ 160 test này.

## Header và nonce CSP

`src/proxy.ts` sinh nonce ngẫu nhiên mới cho mỗi request trang, ghi đè nonce/CSP do client gửi, chuyển cùng CSP vào request SSR và response. Root layout dùng render động để HTML không dùng lại nonce từ bản dựng tĩnh. Script production dùng nonce và `đủ các bước trong kịch bản-dynamic`; `unsafe-eval` và WebSocket chỉ mở cho development. Kiểu inline được giữ để thanh tiến trình/biểu đồ đang có hoạt động; không gọi chính sách này là đã loại bỏ mọi inline style.

Header chung gồm `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, chính sách tắt camera/microphone/vị trí/thanh toán/USB. HSTS chỉ bật production. CSP trang không áp vào API, để route tải tệp giữ CSP `sandbox` riêng. Xác thực/phân quyền vẫn ở route và service; proxy không cấp quyền nghiệp vụ.

Kiểm HTTP development ngày 03/11 trên origin loopback riêng qua **7/7 đường dẫn**: trang chủ, đăng nhập, kích hoạt, trang 404 và ba API công khai/chưa đăng nhập. Mọi script trong bytes HTML đều có nonce khớp response; nonce khác nhau theo request, không nhận nonce client; API vẫn có header chung và không bị ghi đè CSP tải tệp. [Bằng chứng development](assets/tuan-13/security-http-development.json) được giữ riêng.

Kiểm tiếp trên bản dựng production `U4gfXxiSSrhNoZev0uDYX` ngày 04/11 qua **7/7 đường dẫn**. Cả **43/43 script** trong bốn response HTML có nonce khớp CSP; chính sách không có `unsafe-eval` cho script hoặc WebSocket phát triển, có HSTS và `upgrade-insecure-requests`. Ba API vẫn có header chung và không bị áp CSP trang. [Bằng chứng production](assets/tuan-13/security-http-production.json) được sao chép nguyên byte từ lượt kiểm, SHA 256 `c14d19fecb9c268f91c5461e726587f805475dfcce195baacad5c12fe98337e4`.

Lượt production dùng `next start` trên máy chủ/database thử riêng, origin ứng dụng chuẩn là HTTPS; HTTP loopback mô phỏng chặng nội bộ sau reverse proxy. Không nới guard HTTPS. Phép kiểm này không đo TLS/reverse proxy và không chứng nhận cookie Secure đã hoạt động trên trình duyệt. Kiểm bytes HTML không chứng minh JavaScript đã hydrate hoặc không có lỗi CSP trong trình duyệt; E2E và phần kiểm trực tiếp được ghi riêng tại [QA giao diện](QA_GIAO_DIEN_TUAN_13.md).

Lệnh tái lập, dùng máy chủ thử riêng đã được chuẩn bị:

```powershell
node scripts/verify-week13-security-http.mjs --base-url http://127.0.0.3:3006
node scripts/verify-week13-security-http.mjs --base-url <origin-loopback-production> --production
```

Script chỉ GET trang công khai, không thử mật khẩu sai hoặc thay trạng thái tài khoản. Tham số production chỉ chọn điều kiện kiểm header, không sửa môi trường hoặc bỏ kiểm HTTPS của ứng dụng.

Bộ `tests/auth-http-security.test.ts` qua **7/7**: kiểm bytes `Set-Cookie` thật do `NextResponse` tạo ở development/production, phạm vi access/refresh, xóa refresh của phiên MFA hạn chế/đăng xuất, từ chối Origin/Host sai và không tin IP tự khai. Còn kiểm body UTF-8 vượt 8.192 byte dù Content-Length khai nhỏ và lỗi JSON được chuẩn hóa. Hồi quy auth/MFA/reset/tệp qua **132 passed, 1 skipped / 133 trong 11 tệp**; mục skip là thử symlink bị Windows từ chối, không tính là passed. Hai bộ này không đăng nhập hoặc đổi khóa tài khoản thật.

## Nộp phiếu: budget và khóa transaction

Route nộp có budget băm theo user, mặc định 30 request/60 giây và khóa 60 giây khi vượt. Origin, phiên, quyền và CSRF được kiểm trước budget; budget được tiêu trước đọc body và service, kể cả yêu cầu sai/trùng. Chín test tập trung đã qua. Kiểm HTTP/MySQL thật ngày 04/11 trong nhóm 16 của hồi quy Tuần 8 quan sát đủ 30 request được xử lý, request 31 có JSON hỏng trả 429 trước parser; task lạ cũng nhận cùng lỗi, Origin/CSRF sai không tạo bucket. Số phiếu vẫn là một, sáu đáp án. Cả bộ hồi quy này qua **17/17**; phạm vi chi tiết xem [ma trận kiểm thử](MA_TRAN_KIEM_THU_TUAN_13.md). Không suy một lần nộp thành giới hạn request hoặc dùng limiter để bỏ kiểm quyền/CAS.

Đường đọc/nộp task đang mở ổn định được tối ưu dưới khóa chia sẻ, các mutator quyền/chính sách/danh mục/đợt vẫn giữ khóa độc quyền. Review độc lập và [8/8 nhóm MySQL](assets/tuan-13/survey-lock-result.json) kiểm current read trước snapshot, tương thích S/S, X phải chờ S, quyền/phiên đổi khi đang chờ, fallback thiếu guard/hết hạn, CAS 20 và rollback. Không nâng S thành X trong cùng transaction. Logout/reset vẫn có cơ chế khóa phiên riêng từ trước; không nhận guard này tuần tự hóa mọi thao tác xác thực hoặc kiểm hạn tại đúng thời điểm commit.

[Đo HTTP sau sửa](HIEU_NANG_TUAN_13.md) ghi 200/200 nhiệm vụ riêng nộp thành công, không HTTP 500/lỗi mạng; 20 request cùng task có một thành công/19 lỗi 409 và đúng một phiếu. p95 **3.595,91 ms** vẫn vượt mục tiêu đề xuất **3.000 ms**, nên NFR-16 chưa đạt toàn bộ mục tiêu. Không đổi ngưỡng, pool hoặc timeout để ghi đạt.

## Đối chiếu OWASP Top 10:2025

Dùng danh mục chính thức [OWASP Top 10:2025](https://top10.owasp.org/2025/). Tên nhóm là cách phân loại rủi ro, không có nghĩa mọi kiểu tấn công trong nhóm đều đã được thử. Các mã NFR tham chiếu [yêu cầu của dự án](YEU_CAU.md); TOTP mới theo điều chỉnh 60 giây của người dùng, không tự đổi khóa 30 giây đang dùng.

| Nhóm | Nội dung đã rà hoặc kiểm | Kết quả và giới hạn |
| --- | --- | --- |
| A 01 Broken Access Control | Policy 10 vai trò, current session/grants, task ownership, hồ sơ Thanh tra, IDOR đọc/tải/xuất; BR-61/62/67/68 | Phát hiện lỗi ADMIN đa vai trò và thêm bản vá/test ở trên. Ma trận MySQL/API toàn hệ thống được đối chiếu riêng trong Tuần 13. Không dùng kiểm một route để nhận đã kiểm tất cả IDOR. |
| A 02 Security Misconfiguration | Header, nonce, iframe, MIME, referrer, quyền thiết bị, cookie production, localhost Compose | HTTP development 7/7 và production 7/7 qua; 43 script HTML production khớp nonce. Đây là kiểm chặng HTTP nội bộ, không chứng nhận TLS/proxy hoặc cookie Secure trên trình duyệt. |
| A 03 Software Supply Chain Failures | Lockfile, phụ thuộc trực tiếp/gián tiếp, audit theo advisory hiện hành | Còn 24 mục moderate tổng, tám khi bỏ dev, 0 high/critical; đều quy về cùng advisory minimatch, không phải 24 lỗ hổng độc lập. Mã/caller hiện có chưa chứng minh đường khai thác cơ chế optimizationLevel≥2 từ HTTP; vẫn giữ cảnh báo, không ép major override hoặc hạ công cụ để che audit. [Chi tiết phụ thuộc](PHU_THUOC_TUAN_13.md). |
| A 04 Cryptographic Failures | bcrypt cost≥12/giới hạn byte, HS 256 cố định, refresh băm, TOTP secret AES-256-GCM gắn user/key version, recovery code một lần | Kiểm nguồn các helper và caller xác nhận có các kiểm soát này. Không khẳng định đã xoay khóa production, kiểm entropy khóa đang triển khai hoặc chống DBA. |
| A 05 Injection | Zod đủ các bước trong kịch bản/giới hạn body, Prisma tham số hóa, nội dung React, CSV/XLSX formula, parser import | Các đường đã rà không có sink SQL/HTML động chưa bảo vệ; export trung hòa chuỗi công thức và không xuất trường định danh. Không coi tìm kiếm từ khóa là kiểm hết mọi sink trong kho. |
| A 06 Insecure Design | Ẩn danh tách task/response, ngưỡng mẫu, tổng có thể suy ngược, xung đột lợi ích, revision/idempotency | Khóa chia sẻ có 8/8 nhóm MySQL; tải riêng 200/200 thành công và CAS 20 một phiếu. p95 còn vượt mục tiêu đề xuất. Chưa chứng minh chống suy luận qua mọi chuỗi truy vấn/thay đổi tập mẫu. |
| A 07 Authentication Failures | Session mục đích hạn chế/FULL, MFA bắt buộc ADMIN, token replay/rotation, reset/activation, rate bucket | `AUTH_TRUST_PROXY=false` gộp IP chưa tin cậy thành một bucket; phải có proxy đáng tin ghi đè header trước khi bật. Budget nộp theo user có chín test và nhóm HTTP/MySQL thật xác nhận request 31 trả 429 trước parser; Origin/CSRF sai không tiêu budget. Không gộp nộp một lần với giới hạn request. |
| A 08 Software or Data Integrity Failures | Hash tệp tải, path UUID ngoài public, import ZIP và ô nguy hiểm, transaction nộp, requestId/revision | Có kiểm soát tại các đường đã rà; magic bytes chỉ kiểm định dạng cơ bản, không phải quét mã độc/EXIF. Không kiểm chuỗi ký artifact hoặc bảo mật tài khoản CI bên ngoài. |
| A 09 Security Logging and Alerting Failures | Audit nhạy cảm, truy cập hồ sơ/tệp, DTO/log không chứa secret/phiếu, ORM log tắt | Kiểm nguồn log/audit và các nhánh đọc/xuất đã xem; không chứng minh cơ chế giám sát hạ tầng hoặc thời gian phản ứng sự cố ở trường. |
| A 10 Mishandling of Exceptional Conditions | Lỗi tiếng Việt không stack/SQL, giới hạn JSON/multipart/ZIP, rollback, hàng đợi/cursor, lỗi tải tệp | Bộ kiểm lỗi và transaction thuộc check/MySQL riêng. Tải giới hạn và p95 được ghi từ lượt chạy thật; không dùng test chức năng để khẳng định khả năng chịu mọi kiểu DoS. |

Hướng dẫn nonce được đối chiếu với [tài liệu CSP chính thức của Next.js](https://nextjs.org/docs/app/guides/content-security-policy). Kiểm đọc độc lập còn đối chiếu mã Next đang cài: request CSP được parse để truyền nonce cho runtime preload và inline Flight script.

## Hồi quy đã đối chiếu và các giới hạn

- [Manifest runtime](assets/tuan-13/runtime-regression.json) đã tổng hợp **227 nhóm qua/15 bộ**, gồm 217 MySQL/HTTP/service và 10 parser tệp, thêm **demo 19/19**; chín mã Mục F có bằng chứng runtime. Ma trận bổ sung **801/801**. Manifest ghi fingerprint khi tổng hợp và giới hạn các lượt kế thừa; không nhận mọi bộ chạy cùng snapshot bất biến.
- E2E 6/6; axe 34 trạng thái,0 vi phạm,7 incomplete/168 node,17 PNG đã xem. GUI UC-GOLD theo đầy đủ kịch bản 05/11 đã qua,8 PNG riêng đã xem; [manifest](assets/tuan-13/manual-uc-gold.json), [CSV](assets/tuan-13/manual-export-verification.json). Không nhận chờ hết SLA bằng tay hoặc chứng nhận WCAG; giữ CSP/guard.
- [Check/build cuối ngày 05/11](assets/tuan-13/check-build-after-calendar.json) đã qua: check exit 0,93/93 tệp,2.155 passed+1 symlink skipped/2.156; coverage statements 78,49%, branches 73,48%, functions 82,22%, lines 79,69%, vượt 75/70/75/75; build exit 0,101 route động, ID `Q1SY2ZcIAr3Do--HbL1SZ`. CI đúng nguồn đã qua check/e2e/smoke.
- Database chính đã xác minh đúng ngữ cảnh sau sao chép ngoại tuyến/mở độc quyền/đối chiếu hash cả hai VHDX và mở shortcut Docker Desktop qua Windows Explorer. Compose `db`/`mailpit` healthy; chỉ đọc 45 bảng/1.575 người dùng, migration mới nhất Tuần 12, chủ dự án tồn tại; guard sau kiểm 45 bảng/9.709 bản ghi cũ giữ hash. Không áp dụng migration mới, không seed/reset/đổi credential/MFA, chưa kiểm reboot. [Bằng chứng main](assets/tuan-13/main-data-verification.json); không công khai dump logic.
- HTTP production build cuối chưa xác minh: APP_URL HTTP bị guard HTTPS từ chối và trả 500 ở lượt đầu,0/7 đường dẫn xác minh. Khởi động lại loopback với `APP_URL=https://localhost:3013` chỉ trong process bị automatic approval review từ chối, công cụ không nêu lý do. Bằng chứng production 7/7 trước đó cùng mã chức năng vẫn giữ nguyên, **không phải bằng chứng HTTP cho build cuối**; không thay `.env` hoặc nới guard.
- Giữ 24 mục audit moderate tổng/tám production cùng đánh giá đường gọi; cập nhật lại khi dependency hoặc lockfile thay đổi, chưa gọi là hết cảnh báo.
- Giữ mục tiêu p95 3.000 ms ở trạng thái chưa đạt. Budget nộp và khóa chia sẻ đã có bằng chứng riêng; không tắt bảo vệ để cải thiện số đo tải.

Các giới hạn này được giữ trong báo cáo kiểm thử; không tự ghi tất cả OWASP hoặc WCAG đã đạt.

