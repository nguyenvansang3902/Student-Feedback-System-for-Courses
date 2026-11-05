# Phụ thuộc và giấy phép — Tuần 13

Đối chiếu ngày 03/11/2026 bằng `package.json`, lockfile, các gói đang cài và advisory/registry chính thức. Đây là kiểm kê kỹ thuật tại thời điểm kiểm, không phải chứng nhận ứng dụng không còn lỗ hổng hoặc mọi giấy phép đều đã được thẩm định.

## Kết quả npm audit

| Phép kiểm đã chạy | Kết quả |
| --- | --- |
| `npm audit --json` | 24 mục moderate; 0 high, 0 critical |
| `npm audit --omit=dev --json` | 8 mục moderate; 0 high, 0 critical |
| Advisory gốc trong các mục trên | Một mã: GHSA-g3hv-75wg-m249 / CVE-2026-118764 của minimatch |

24 mục là số gói và phụ thuộc cha bị lan truyền trạng thái audit, **không phải 24 lỗ hổng độc lập**. Tám mục khi bỏ dev là archiver, archiver-utils, exceljs, glob, minimatch, readdir-glob, rimraf, zip-stream. Thông tin phụ thuộc trong metadata audit gồm cả các nhánh tùy chọn/peer; không dùng con số đó làm số gói thực có trong bản triển khai.

Advisory của tác giả mô tả khuếch đại xử lý pattern ở minimatch 10.2.6 khi `optimizationLevel >= 2`, bản vá 11.0.1. Bản ghi GitHub Reviewed có miền ảnh hưởng rộng hơn là `<11.0.1`. Phải giữ cả hai thông tin khi đánh giá, không tự xóa cảnh báo do khác biệt miền phiên bản. Nguồn: [advisory của tác giả](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249), [GitHub Advisory Database](https://github.com/advisories/GHSA-g3hv-75wg-m249), [commit vá 77a0f5c](https://github.com/isaacs/minimatch/commit/77a0f5c).

### Đường gọi thực tế đã đọc

| Gói đang cài | Đường sử dụng và kết luận có giới hạn |
| --- | --- |
| minimatch 3.1.5, glob 7.2.3 | Nhánh archiver-utils/ExcelJS và một số công cụ. Mã cài không có `firstPhasePreProcess` hoặc tùy chọn `optimizationLevel` được mô tả trong advisory mới. Chưa thấy đường khai thác đúng cơ chế này; vẫn giữ cảnh báo theo audit thay vì nhận phiên bản đã có bản vá 11.x. |
| minimatch 5.1.9 | Qua readdir-glob 1.1.3. Mã cài cũng không có cơ chế tối ưu nêu trên. Đây là đánh giá trên mã cài và cơ chế cụ thể, không kết luận miễn mọi lỗi DoS. |
| minimatch 10.2.6 | Chỉ thấy dưới typescript-eslint của eslint-config-next, thuộc dev. Caller `useProgramFromProjectService.js` truyền `{ dot: true }`; minimatch mặc định mức tối ưu 1. Chưa thấy dữ liệu HTTP trở thành glob pattern tại đường này. Công cụ lint vẫn là một bề mặt xử lý mã/config, không coi dev là tự động an toàn. |
| ExcelJS 4.4.0 | Ứng dụng dùng `new ExcelJS.Workbook()`, `.xlsx.load(buffer)` và `.xlsx.writeBuffer()`. Mã `lib/xlsx/xlsx.js` dùng JSZip; ZipWriter dùng JSZip. Archiver thuộc streaming WorkbookWriter. Không thấy ứng dụng gọi streaming writer, `.glob()`, `.directory()` hoặc nhận glob pattern từ người dùng. Vì vậy chưa chứng minh advisory minimatch này đi từ tệp Excel upload tới nhánh pattern dễ tổn thương. |

Các điểm ứng dụng đã đối chiếu: `src/server/services/import-file.ts` gọi `inspectXlsxZip` trước khi ExcelJS đọc nội dung, giới hạn kích thước/tổng giải nén/số dòng/cột; `reports-export.ts` dùng workbook trong bộ nhớ, tên tệp cố định, không glob hệ thống tệp. Các giới hạn đó không được dùng làm bằng chứng rằng mọi ZIP bomb, lỗi parser hoặc advisory khác đều đã bị loại trừ. Kiểm thử upload/định dạng được báo riêng trong hồ sơ kiểm thử.

### Hướng xử lý an toàn

1. **Không chạy `npm audit fix --force`.** Audit gợi ý hạ ESLint xuống 4.0.0, eslint-config-next xuống 0.2.4 hoặc ExcelJS xuống 4.1.1. Những lựa chọn đó khác API/đời công cụ đang dùng; không được nhận là cách vá an toàn chỉ vì audit đưa ra.
2. Metadata từ registry chính thức tại thời điểm đọc cho thấy: nhánh 3 mới nhất 3.1.5, nhánh 5 là 5.1.9, nhánh 9 là 9.0.9, nhánh 10 là 10.2.6; nhánh 11 là **11.0.4**. Chưa thấy bản backport mới hơn trong cùng nhánh 3/5/9/10 có thể cài để thỏa miền `<11.0.1`. ExcelJS mới nhất vẫn 4.4.0 và khai báo archiver `^5.0.0`. Nguồn phiên bản: [registry minimatch](https://registry.npmjs.org/minimatch), [registry ExcelJS](https://registry.npmjs.org/exceljs), [registry archiver](https://registry.npmjs.org/archiver); snapshot chỉ chứa trường cần thiết được lưu cùng bằng chứng.
3. Không ép toàn bộ cây sang minimatch 11 bằng override chung: minimatch 3/5 xuất hàm CommonJS gọi trực tiếp, trong khi API đời mới có named exports; một số caller cũ có thể hỏng. Tương tự, archiver 8/glob 14 là nâng major, không phải bản vá thay thế tương thích mặc định cho cây ExcelJS hiện tại.
4. Nếu cần thử xử lý nhánh dev 10.x trước khi upstream cập nhật, có thể thử **override hẹp riêng nhánh minimatch 10.x sang bản 11.x đã vá**, trên thay đổi riêng và chạy lại lint/typecheck/test/build/E2E. Đây là phương án cần kiểm chứng tương thích, **chưa được áp dụng hoặc nghiệm thu**. Không tuyên bố đã hết audit khi nhánh 3/5 vẫn bị miền cảnh báo bao phủ.
5. Giữ lockfile, tránh nhận glob pattern từ HTTP, theo dõi advisory và cập nhật các gói cha khi có bản phù hợp. Hiện tại giữ tám cảnh báo production và 24 cảnh báo tổng trong danh sách tồn tại có đánh giá đường gọi; chưa tìm được bản nâng cùng major giải quyết toàn bộ miền audit. Không cắt tính năng import/export để che cảnh báo.

## Kiểm kê giấy phép thực tế

Snapshot đọc **677 đường dẫn gói thực có trên Windows**, trong đó 412 đường dẫn có cờ dev=false và 265 dev=true theo lockfile. Có 36 phụ thuộc trực tiếp. 644/677 đường dẫn có tệp LICENSE/LICENCE/COPYING/NOTICE ở gốc gói theo phép tìm tên. Không có tệp trùng tên không đồng nghĩa gói không có giấy phép; giấy phép có thể được nhúng ở thư mục hoặc tài liệu khác chưa duyệt.

Một gói không có trường khai báo license trong package.json: **buffers 0.1.1**, qua binary trong cây phụ thuộc cũ. Gói cài không có tệp LICENSE ở gốc và README đã đọc không có phần license; ghi `NOASSERTION`, không tự gán MIT theo suy đoán. Tệp kiểm kê máy đọc được lưu tại [license-inventory.json](assets/tuan-13/license-inventory.json), gồm tên/phiên bản/đường dẫn tương đối, khai báo và hash tệp license tìm được.

| Phụ thuộc trực tiếp | Phiên bản | Loại | Khai báo license đang cài |
| --- | --- | --- | --- |
| @pdf-lib/fontkit | 1.1.1 | production | MIT |
| @prisma/adapter-mariadb | 7.10.1 | production | Apache-2.0 |
| @prisma/client | 7.10.1 | production | Apache-2.0 |
| bcryptjs | 3.0.3 | production | BSD-3-Clause |
| dotenv | 18.0.5 | production | BSD-2-Clause |
| exceljs | 4.4.0 | production | MIT |
| jose | 6.2.13 | production | MIT |
| next | 16.4.3 | production | MIT |
| nodemailer | 10.1.7 | production | MIT-0 |
| otplib | 13.5.0 | production | MIT |
| pdf-lib | 1.17.1 | production | MIT |
| qrcode | 1.5.4 | production | MIT |
| react | 19.3.0 | production | MIT |
| react-dom | 19.3.0 | production | MIT |
| zod | 4.6.7 | production | MIT |
| @axe-core/playwright | 4.14.0 | development | MPL-2.0 |
| @faker-js/faker | 10.6.0 | development | MIT |
| @playwright/test | 1.64.1 | development | Apache-2.0 |
| @prisma/generator-helper | 7.10.1 | development | Apache-2.0 |
| @tailwindcss/postcss | 4.3.3 | development | MIT |
| @types/node | 24.19.1 | development | MIT |
| @types/nodemailer | 8.0.2 | development | MIT |
| @types/qrcode | 1.5.6 | development | MIT |
| @types/react | 19.3.0 | development | MIT |
| @types/react-dom | 19.3.0 | development | MIT |
| @vitest/coverage-v8 | 5.0.3 | development | MIT |
| eslint | 9.39.5 | development | MIT |
| eslint-config-next | 16.4.3 | development | MIT |
| eslint-config-prettier | 10.1.8 | development | MIT |
| postcss | 8.5.28 | development | MIT |
| prettier | 3.9.9 | development | MIT |
| prisma | 7.10.1 | development | Apache-2.0 |
| tailwindcss | 4.3.3 | development | MIT |
| tsx | 4.23.15 | development | MIT |
| typescript | 6.0.3 | development | Apache-2.0 |
| vitest | 5.0.3 | development | MIT |

Các nhánh gián tiếp cần đối chiếu khi đóng gói/phân phối, không gom tất cả thành MIT:

- `mariadb 3.5.4`: LGPL-2.1-or-later, có LICENSE đã kiểm; được adapter MySQL dùng thật.
- `@img/sharp-win32-x64 0.35.5`: khai báo Apache-2.0 AND LGPL-3.0-or-later; đây là gói binary tùy chọn theo nền tảng, không suy giấy phép Linux từ binary Windows.
- `elkjs 0.11.1`: EPL-2.0, qua Prisma Studio; cờ dev trong lock không phải bằng chứng gói đó được đưa vào route chạy thật.
- JSZip 3.10.2: `(MIT OR GPL-3.0-or-later)`; LICENSE.markdown nêu lựa chọn giấy phép, không đọc chữ OR thành bắt buộc dùng cả hai.
- minimatch 10.2.6 và một lru-cache: BlueOak-1.0.0; axe-core và các gói lightningcss: MPL-2.0. Có nhiều biểu thức license kết hợp khác trong snapshot; giữ nguyên chuỗi khai báo, không tự chuẩn hóa thành một loại.
- Noto Sans của PDF có OFL-1.1 trong `resources/fonts/OFL.txt`, được giữ riêng ngoài cây npm.

Đã đọc package.json của mọi đường dẫn kiểm kê, tìm/hash tệp license ở gốc và đọc trực tiếp một số tệp trọng yếu (bcryptjs, axe, mariadb, JSZip, sharp, OFL). **Chưa đọc toàn văn mọi giấy phép hoặc đối chiếu từng tệp mã/binary, chưa rà đủ gói optional của Linux/macOS và chưa xác nhận bộ đóng gói production cuối.** Giữ tệp bản quyền/notice khi đóng gói; bước phát hành cần đối chiếu lại inventory với đúng artifact thực tế. Không có kết luận pháp lý về tương thích giấy phép của toàn bộ sản phẩm trong lượt kiểm này.

## Dấu vết kiểm tra

- Audit tổng: `.local/week13-npm-audit.json`; SHA256 `c0cf8cb4842a189aedff18d056d37551e85cf5e6da7093c4149eba925bf1203b`.
- Audit production: `.local/week13-npm-audit-production.json`; là lượt gọi registry riêng, không sửa lockfile.
- Inventory tại 15:56 UTC ngày 03/11/2026: package SHA256 `dd880ff994bbace831e87b88a697107a65ce1f75db46a304b33a5ccd0b089066`; lock SHA256 `6970f434863fff1aec256a57c1c4686296b14cb308b73baf7c4b7c3cebd2f525`.
- Metadata registry chỉ đọc: [registry-metadata.json](assets/tuan-13/registry-metadata.json). Không cài/gỡ hoặc sửa phụ thuộc trong phần phân tích này; mọi thay đổi package/lock sau snapshot phải được kiểm lại riêng.
