# PROMPT NÂNG CẤP GIAO DIỆN (UI POLISH), BẢN MỞ RỘNG

Dùng cho dự án "Website quản lý khảo sát và phản hồi của sinh viên về môn học" (Next.js + MySQL, 10 vai trò). Mục tiêu: giao diện đẹp, giàu thị giác, nhất quán, dễ dùng với số đông, đủ chất lượng để trình bày cho giảng viên và đưa vào báo cáo tiểu luận chuyên ngành và khóa luận.

=== BẮT ĐẦU PROMPT NÂNG CẤP GIAO DIỆN ===

## 0\. VAI TRÒ, MỤC TIÊU VÀ TÓM TẮT CỐT LÕI

Bạn là kỹ sư front-end kiêm nhà thiết kế giao diện, nhận nhiệm vụ **nâng cấp thị giác** cho website khảo sát và phản hồi môn học. Hiện tại giao diện sạch, thân thiện, dễ dùng nhưng **đơn điệu**: gần như một màu, thiếu minh họa và chiều sâu, và năm vai trò nhìn gần giống hệt nhau. Mục tiêu: **đẹp hơn, giàu hơn, nhất quán hơn mà vẫn đơn giản, dễ dùng, nghiêm túc đúng môi trường giáo dục**. Đẹp hơn không có nghĩa là rối hơn.

Bạn làm việc theo `AGENTS.md` và các quy tắc của prompt chính (từng bước một, không bịa kết quả, báo cáo trung thực, không xin khóa bí mật, không commit `.env`, chỉ dùng dữ liệu giả, hỏi trước khi chi tiền, triển khai, xóa dữ liệu hoặc force push). Phần này **bổ sung**, không thay thế. Nếu xung đột, quy tắc bảo mật và quyền riêng tư của prompt chính thắng.

**0.1 Tóm tắt 10 điều cốt lõi (đọc lại khi bắt đầu mỗi phiên):**

1. Chỉ sửa lớp hiển thị. Không đụng nghiệp vụ, quyền, đăng nhập, ẩn danh, schema (Luật 1 đến 4).
2. Giữ teal `#005f5a` làm nhận diện; thêm màu nhấn ấm, màu theo nhóm vai trò, thang màu đầy đủ, dùng token, không viết màu cứng (Mục 3).
3. Thêm minh họa SVG tự vẽ, một bộ icon, chiều sâu bề mặt, chuyển động nhẹ tắt được (Mục 3).
4. Trang đích của mỗi vai trò thành **trang chủ theo vai trò**: "Việc cần làm" và thẻ chức năng, thay cho hàng nút dưới thẻ tài khoản (Mục 4.0).
5. Một khung chung (AppShell) cho mọi vai trò, sidebar là điều hướng thật (Mục 4.1).
6. Luồng sinh viên làm tốt nhất, ưu tiên điện thoại, vùng chạm lớn, Likert dễ bấm (Mục 4.4).
7. Biểu đồ đọc được, không dựa vào màu đơn thuần, không lộ dữ liệu dưới ngưỡng (Mục 4.5, Luật 7).
8. Truy cập WCAG 2.2 AA là tiêu chí cứng, kể cả **viền ô nhập ≥ 3:1** (Mục 7).
9. Dữ liệu minh họa đẹp và có kịch bản demo (giai đoạn UI-D).
10. Mọi số đo phải đo thật. Có ảnh trước/sau, có rubric, có đánh giá SUS do người dùng thu thập (Mục 8 đến 10).

**0.2 Chế độ chạy.** Đọc `docs/PROJECT\_STATE.md`. Nếu chưa xong tuần 15, bạn đang ở **chế độ B**: mỗi giai đoạn chỉ xử lý các route **đã tồn tại**; route chưa có ghi vào `docs/UI\_BACKLOG.md`, và khi tuần đó được làm, trang mới phải theo "Quy tắc cho trang mới" (Mục 5.3). Chỉ bắt đầu giai đoạn sau khi tuần hiện tại đã được người dùng nghiệm thu. Nếu đã xong tuần 15, bạn ở **chế độ A**: chạy tuần tự. Ghi chế độ vào `docs/PROJECT\_STATE.md` và `docs/KE\_HOACH\_15\_TUAN.md` (mục "Làm việc giao diện", ước lượng số phiên, đánh dấu là ước lượng).

## 1\. LUẬT BẤT BIẾN (KHÔNG ĐƯỢC ĐỤNG)

1. **Chỉ sửa lớp hiển thị:** CSS/Tailwind, bố cục JSX, component giao diện, tài nguyên tĩnh (SVG, font, ảnh). **Không sửa:** schema Prisma và migration, logic route handler và server action, hàm `can()` và chính sách quyền, xác thực (bcrypt, JWT, phiên, 2FA), thiết kế ẩn danh (tách SurveyTask với SurveyResponse/SurveyAnswer), Zod schema, máy trạng thái, quy tắc nghiệp vụ BR-xx, tên route.
**Ba ngoại lệ có kiểm soát:**

   * **E1, dữ liệu minh họa:** giai đoạn UI-D được sửa file seed theo đúng giới hạn ở Mục 8.
   * **E2, truy vấn đọc cho hiển thị:** khối "Việc cần làm" ở Mục 4.0 cần con số (ví dụ số phiếu chưa làm). Chỉ được **tái sử dụng hàm đọc đã có** (tách thành hàm dùng chung nếu cần). Nếu phải viết hàm đọc mới thì: (a) đi qua `can()`, (b) không trả thêm dữ liệu định danh, (c) có test, (d) được người dùng đồng ý ở UI-0. Không có đồng ý thì thẻ chỉ có tiêu đề và mô tả, không có con số.
   * **E3, thuộc tính HTML hỗ trợ trình duyệt và trợ năng:** `autocomplete`, `inputmode`, `enterkeyhint`, `aria-\*`, `lang`, thẻ `<title>`, `<meta>`. Được thêm nếu chưa có, không đổi hành vi nghiệp vụ.
2. **Giữ nguyên định danh dùng cho test và form:** `name`, `id`, `data-testid`, `aria-label` mà test đang dùng; thứ tự và mã câu hỏi trong phiếu. Nếu buộc đổi vì giao diện, sửa test tối thiểu và ghi rõ trong báo cáo.
3. **Không thêm chức năng, không thêm trang nghiệp vụ.** Chỉ được thêm: trang lỗi (403, 404, 500), trạng thái rỗng, màn hình tải, trang `/dev/style-guide` (Mục 5). Nếu thấy cần đổi hành vi để giao diện hợp lý hơn, **ghi đề xuất vào `docs/UI\_DE\_XUAT.md`**, không tự làm.
4. **Test phải xanh sau mỗi giai đoạn** (`npm run check`: lint, typecheck, unit, e2e). Test hỏng do bộ chọn giao diện thì sửa test tối thiểu và báo. Test hỏng do hành vi thì **hoàn tác thay đổi gây ra**, không sửa test cho qua.
5. **Ẩn danh và lời hứa ẩn danh:** trang điền phiếu không hiển thị thêm bất kỳ thông tin nào về người dùng hiện tại (tên, mã, avatar) so với trước khi nâng cấp. Khối thông báo ẩn danh phải nổi bật nhưng **nội dung đúng thực tế** theo phần thiết kế ẩn danh trong `docs/DAC\_TA\_NGHIEP\_VU.md` và mục hạn chế (ẩn danh ở mức ứng dụng). Không viết lời cam kết mạnh hơn những gì hệ thống làm được.
6. **Hồ sơ Thanh tra là tài liệu mật:** giao diện trầm, ít màu, dải "TÀI LIỆU MẬT" cố định; không hiện thông tin định danh ngoài hồ sơ; không hiệu ứng vui tươi; không đưa nội dung hồ sơ vào tiêu đề tab, thumbnail hay thông báo.
7. **Dữ liệu ngưỡng:** khi dữ liệu bị ẩn vì chưa đủ ngưỡng phản hồi tối thiểu, chỉ hiển thị khối giải thích (icon khóa và câu chữ). **Không vẽ biểu đồ, không hiện con số gợi ý, không hiện khoảng, không hiện "ít hơn N"** từ dữ liệu chưa đủ ngưỡng. Nhóm "kiểm tra, đánh giá" của Phòng Khảo thí chỉ hiển thị dạng gộp theo luật hiện có.
8. **Quyền riêng tư:** không tải font, ảnh, script từ máy chủ bên thứ ba lúc chạy (CDN, Google Fonts trực tiếp, analytics). Font tự lưu trữ qua `next/font` (tải lúc build). Mọi request của trang đăng nhập và trang điền phiếu chỉ đến cùng nguồn gốc.
9. **Bản quyền:** không dùng ảnh stock có mặt người, không sao chép minh họa hoặc logo của bên khác, không dùng logo trường nếu chưa có phép. Minh họa tự vẽ bằng SVG. Icon dùng một bộ duy nhất có giấy phép mở (ưu tiên `lucide-react`, giấy phép ISC). Ghi nguồn và giấy phép vào `docs/THIRD\_PARTY.md`.
10. **Thư viện mới:** ưu tiên **không thêm**. Được dùng: `lucide-react` (nếu chưa có), `@axe-core/playwright` và `lighthouse` (chỉ devDependency). Thêm gì khác phải hỏi, nêu lý do, dung lượng, giấy phép. Không thêm thư viện hoạt ảnh nặng; dùng CSS transition. Giữ thư viện biểu đồ đang dùng.
11. **Văn bản:** được viết lại câu chữ cho thân thiện nếu đúng nghĩa; **ghi mọi thay đổi chữ** vào báo cáo. Không đổi tên chức năng, nhãn pháp lý, nội dung giải thích ẩn danh nếu không được yêu cầu.
12. **An toàn front-end:** không dùng `dangerouslySetInnerHTML` cho minh họa (import SVG thành component); liên kết ra ngoài có `rel="noopener noreferrer"`; **không nới lỏng CSP và header bảo mật** (không thêm `unsafe-inline`, `unsafe-eval` hay tên miền ngoài). Nếu một hiệu ứng đòi nới, dừng và hỏi.
13. **Không làm trễ nghiệp vụ:** ở chế độ B, phạm vi P0 của tuần đang chạy luôn thắng. Giao diện chỉ chen vào giữa các tuần đã nghiệm thu, và không chiếm quá khoảng một phần ba thời gian của tuần đó. Nếu vượt, báo người dùng và dời.

## 2\. HIỆN TRẠNG THỊ GIÁC (quan sát ở tuần 10 trên 8 màn hình; bạn phải tự kiểm toán toàn bộ)

**Màn hình đã xem:** trang chủ công khai, đăng nhập, danh sách người dùng (quản trị), và trang "Tài khoản của tôi" của 5 vai trò (Sinh viên, Cán bộ ĐBCL, Phòng Đào tạo, Giảng viên, Phòng Khảo thí).

**Bảng thiết kế đang dùng (đo từ ảnh):** nền trang `#f7faf9`, bề mặt thẻ `#ffffff`, chủ đạo teal `#005f5a`, teal đậm cho khối nổi `#0b4f4a`, thang chữ slate (`#0f172b`, `#314158`, `#45556c`, `#62748e`), nút bo tròn, phông sans-serif không chân. Toàn bộ chữ đo được đạt WCAG AA.

**Điểm mạnh, phải giữ:** bố cục thoáng, thứ bậc chữ rõ, một màu chủ đạo nhất quán, nút chính nổi bật, nhãn trường luôn hiển thị, nút "Hiện" mật khẩu, tiếng Việt đúng dấu, thẻ thông tin chia lớp gọn (có dải nền riêng cho phần "Bảo mật tài khoản"), huy hiệu vai trò màu mint, nút đặc/nút viền phân biệt chính/phụ, năm vai trò dùng chung một khuôn nên dễ bảo trì.

**Vấn đề đã quan sát (đánh dấu P0 là bắt buộc xử lý):**

* **(P0) Viền ô nhập quá nhạt:** màu viền đo được `#cad5e2` trên nền trắng chỉ đạt **1,49:1**, dưới chuẩn **3:1** của WCAG 1.4.11 cho ranh giới thành phần nhập liệu. Người có thị lực kém khó thấy ô nhập.
* **(P0) Năm vai trò nhìn gần như giống hệt nhau:** cùng một khuôn "Xin chào, …", chỉ khác nhãn nhỏ ở sidebar và vài nút ở dưới.
* **(P0) Chức năng chính nằm kém nổi:** "Khảo sát của tôi", "Hàng đợi phản hồi" chỉ là nút dưới thẻ tài khoản, có khi phải cuộn mới thấy. Trong khi các chức năng "chưa mở" lại có thẻ đẹp hơn (đánh số, huy hiệu).
* **(P0) Ký hiệu ↗ trên liên kết nội bộ** gợi ý "mở trang ngoài" nhưng đây là điều hướng nội bộ. Một số nhãn nút trùng tên vai trò ("Sinh viên", "Giảng viên", "Phòng Đào tạo") nên không cho biết bấm vào làm gì.
* **(P0) Hai khung trang khác nhau:** sidebar của khung "không gian vai trò" có icon và thanh nền mint cho mục đang chọn, còn khung quản trị chỉ có chữ, không dấu hiệu "trang hiện hành".
* **(P1) Tiêu đề lớn bị tên dữ liệu mẫu phá:** "Xin chào, Tài khoản minh họa PHONG\_DAO\_TAO." tràn gần hết bề ngang, chuỗi không có khoảng trắng sẽ không xuống dòng. Nhãn "KHÔNG GIAN PHÒNG KHẢO THÍ" bị rớt chữ "THÍ" xuống một mình.
* **(P1) Gần như chỉ có một màu** (teal) trên trắng và xám nhạt; thiếu màu phụ, thiếu lớp chiều sâu, thiếu minh họa; nửa trái trang đăng nhập gần như trống; hình tròn trang trí trong khối xanh ở trang chủ quá mờ, chưa có chủ đích.
* **(P1) Bảng quản trị:** trạng thái và vai trò là chữ thường chưa có huy hiệu; chưa có avatar chữ cái đầu; ô tìm kiếm không có icon và gợi ý.
* **(P1) Đầu trang chưa hiện ai đang đăng nhập** (tên, vai trò); chưa có breadcrumb.
* **(P1) Chữ phụ** `#62748e` trên `#f7faf9` chỉ đạt **4,54:1**, sát ngưỡng AA 4,5:1. Mục "Các khu vực sắp mở" trông rất nhạt.
* **Chưa xem được:** form điền phiếu, dashboard và biểu đồ, hàng đợi phản hồi, hồ sơ Thanh tra. Đây là những màn quan trọng nhất, phải kiểm toán kỹ ở UI-0.

## 3\. ĐỊNH HƯỚNG THIẾT KẾ: "GIÁO DỤC HIỆN ĐẠI, ẤM ÁP VÀ ĐÁNG TIN"

**Tính cách:** thân thiện, rõ ràng, đáng tin, trẻ trung vừa phải. **Tránh:** gradient cầu vồng, neon, glassmorphism nặng, bóng đổ đậm, hoa văn dày, hiệu ứng làm chậm thao tác.

### 3.1 Chữ ký thị giác (làm cho sản phẩm có bản sắc, không giống mẫu có sẵn)

1. **Bong bóng phản hồi:** hình bong bóng thoại bo góc (một góc vuông) làm họa tiết thương hiệu: trong biểu tượng "KS", trong minh họa, trong trạng thái rỗng, làm dấu mục. Đúng với chủ đề "phản hồi".
2. **Vạch màu vai trò:** thanh 4 px màu theo nhóm vai trò ở đầu `PageHeader` và huy hiệu vai trò (bảng nhóm vai trò ở Mục 3.2).
3. **Nền chấm lưới** (dot grid 24 px, độ mờ khoảng 6%) ở dải đầu trang và hero, bằng CSS hoặc SVG vài KB.
4. **Số liệu lớn** dạng `tabular-nums` trong thẻ thống kê, kèm nhãn nhỏ và xu hướng.
5. **Ngôn ngữ hình khối:** thẻ bo 14 đến 16 px, ô nhập và nút bo 10 px, huy hiệu bo tròn hoàn toàn. Không trộn nhiều kiểu bo.

### 3.2 Màu sắc: dùng token, không viết màu cứng trong component

**Giữ teal `#005f5a` làm nhận diện** (nút chính, liên kết, mục đang chọn). Thêm màu nhấn ấm dùng thưa (tối đa khoảng 10% diện tích), màu theo nhóm vai trò, màu ngữ nghĩa. Quy tắc 60-30-10: 60% nền và bề mặt trung tính, 30% teal, 10% nhấn.

|Nhóm token|Giá trị gợi ý (hex)|Ghi chú|
|-|-|-|
|Nền trang / bề mặt / bề mặt dịu|`#f7faf9` / `#ffffff` / `#f1f5f9`|giữ nền hiện tại|
|Viền trang trí / **viền ô nhập**|`#e2e8f0` / **`#75859b`**|viền ô nhập đo được 3,76:1 trên trắng (đạt ≥ 3:1)|
|Chữ đậm / chữ nội dung / **chữ phụ**|`#0f172b` / `#334155` / **`#475569`**|chữ phụ mới 7,22:1 trên nền trang (thay cho `#62748e`)|
|primary 50 / 100 / 200 / 300|`#f0fbf9` / `#d5f5f0` / `#aeeae1` / `#7cd8cd`|nền nhạt, huy hiệu, Likert|
|primary 400 / 500 / 600|`#46bfb2` / `#22a195` / `#118277`|minh họa, biểu đồ, vòng focus phụ|
|primary 700 / **800 (nhận diện)** / 900 / 950|`#0b706a` / **`#005f5a`** / `#0b4f4a` / `#07322f`|nút, liên kết, khối nổi|
|amber (nhấn ấm và cảnh báo) 50 / 100 / 400 / 600 / 800 / 950|`#fffbeb` / `#fef3c7` / `#fbbf24` / `#d97706` / `#92400e` / `#451a03`|điểm nhấn, nhắc hạn, cảnh báo|
|success 100 / 800|`#dcfce7` / `#166534`||
|danger 100 / 700|`#fee2e2` / `#b91c1c`||
|info (sky) 50 / 800|`#f0f9ff` / `#075985`||
|indigo (nhóm học thuật, vòng focus) 50 / 600 / 700|`#eef2ff` / `#4f46e5` / `#4338ca`||
|violet (nhóm phòng ban) 50 / 700|`#f5f3ff` / `#6d28d9`||
|slate đậm (Thanh tra, Admin) 800 / 900|`#1e293b` / `#0f172a`||

**Cặp màu đã được tính tỉ lệ tương phản (chữ/nền, cần ≥ 4,5:1; thành phần giao diện cần ≥ 3:1):**
trắng trên `#005f5a` 7,54 · trắng trên `#0b706a` 5,93 · `#005f5a` trên `#f0fbf9` 7,14 · `#0b4f4a` trên `#d5f5f0` 8,13 · `#92400e` trên `#fef3c7` 6,37 · `#451a03` trên `#fbbf24` 8,97 · `#b91c1c` trên `#fee2e2` 5,30 · trắng trên `#b91c1c` 6,47 · `#166534` trên `#dcfce7` 6,49 · `#075985` trên `#f0f9ff` 7,09 · `#4338ca` trên `#eef2ff` 7,07 · `#6d28d9` trên `#f5f3ff` 6,48 · `#334155` trên `#f1f5f9` 9,45 · trắng trên `#1e293b` 14,63 · `#fef3c7` trên `#0f172a` 16,03 · viền `#75859b` trên trắng 3,76 · vòng focus `#4f46e5` trên nền trang 5,99. **Các giá trị ở bảng là gợi ý khởi đầu, chưa phải quyết định cuối:** bạn phải tự viết script kiểm tra mọi cặp màu thực tế, và người dùng chốt bảng màu ở UI-0. Màu chữ trên bề mặt tint nào chưa nằm trong danh sách trên thì phải tự tính trước khi dùng.

**Màu theo nhóm vai trò** (chỉ dùng ở thanh 4 px đầu `PageHeader`, huy hiệu vai trò, nhãn nhỏ phía trên tiêu đề, nền mục sidebar đang chọn; **không** đổi cả giao diện):

|Nhóm|Vai trò|Màu|
|-|-|-|
|Người học|SINH\_VIEN|teal|
|Học thuật|GIANG\_VIEN, TRUONG\_BO\_MON, TRUONG\_KHOA|indigo|
|Đảm bảo chất lượng và lãnh đạo|CAN\_BO\_DBCL, LANH\_DAO|sky|
|Phòng ban|PHONG\_DAO\_TAO, PHONG\_KHAO\_THI|violet|
|Giám sát và hệ thống|THANH\_TRA, ADMIN|slate đậm|

**Màu biểu đồ:**

* **Phân loại (tối đa 5 màu cùng lúc):** `#118277` (teal), `#4f46e5` (chàm), `#d97706` (hổ phách đậm), `#0072b2` (xanh dương), `#d55e00` (cam đỏ); phân biệt thêm bằng nhãn trực tiếp, kiểu nét (liền/đứt) và ký hiệu điểm. Gợi ý lấy cảm hứng từ bảng Okabe-Ito (an toàn cho người mù màu). **Không dùng** `#f59e0b`, `#e69f00`, `#56b4e9` làm màu đổ cột trên nền trắng vì chỉ đạt 2,15 đến 2,31:1 (dưới 3:1); nếu cần màu nhạt, thêm viền đậm 1 px. Phải chạy mô phỏng mù màu (deuteranopia, protanopia) trên biểu đồ chính và ghi kết quả.
* **Thang Likert 5 bậc (tuần tự một màu):** `#d5f5f0` → `#aeeae1` → `#7cd8cd` → `#0b706a` → `#005f5a`; chữ trong ô bậc 1 đến 3 dùng `#0b4f4a`, bậc 4 và 5 dùng trắng. **Không dùng cặp đỏ-xanh lá** cho thang đồng ý/không đồng ý.
* Luôn có nhãn số và chú giải bằng chữ; không dùng màu làm tín hiệu duy nhất.

### 3.3 Chữ

* `next/font` với subset `vietnamese` và `latin`. Đề xuất: **Be Vietnam Pro** (thiết kế chú trọng tiếng Việt; font tĩnh nên khai báo rõ các độ đậm 400, 500, 600, 700) cho tiêu đề và Inter (biến thiên) cho nội dung; hoặc một font cho tất cả nếu đẹp hơn. Tối đa 2 họ chữ, 4 tệp font. Quyết định ghi vào `docs/decisions/`.
* Thang cỡ chữ 12/14/16/18/20/24/30/36/48 px; H1 dùng `clamp()` để co theo màn hình; độ cao dòng nội dung ≥ 1,5, tiêu đề ≥ 1,2 (không cắt dấu ặ, ể, ữ).
* Số liệu dùng `font-variant-numeric: tabular-nums`. Tiêu đề dùng `text-wrap: balance`, đoạn văn dùng `text-wrap: pretty` (nếu trình duyệt hỗ trợ). Nhãn nhỏ viết hoa (eyebrow) tối đa 1 dòng: rút gọn chữ, ví dụ "PHÒNG KHẢO THÍ" thay cho "KHÔNG GIAN PHÒNG KHẢO THÍ".
* Mọi chuỗi do người dùng hoặc dữ liệu cung cấp (tên, mã, tên môn) phải **xuống dòng được hoặc cắt có dấu "…" kèm tooltip**; dùng `overflow-wrap: anywhere` cho chuỗi không có khoảng trắng.

### 3.4 Chiều sâu, khoảng cách

3 lớp bề mặt (nền trang, thẻ, thẻ nổi cho hộp thoại và menu); viền mảnh cộng bóng nhẹ, 3 mức bóng; lưới khoảng cách 4/8 px; vùng nhấn dùng nền tint nhạt thay vì chỉ trắng; chuyển tiếp mềm giữa các khối bằng khoảng trống, không dùng đường kẻ dày.

### 3.5 Minh họa (bộ SVG tự vẽ, phẳng, hình khối hình học, dùng token màu)

Phong cách: không khuôn mặt, không viền nét lẫn lộn, 2 đến 3 sắc tint của teal cộng một điểm nhấn hổ phách, góc bo 12 px, có bong bóng phản hồi làm họa tiết. **Không nhúng chữ trong SVG.** Mỗi SVG ≤ 10 KB, tổng ≤ 150 KB; trang trí thì `aria-hidden="true"`, có nghĩa thì `role="img"` và `<title>`. Kiểm tra từng hình ở 3 kích cỡ và ảnh chụp để chắc không bị cắt.

|Minh họa|Dùng ở|Gợi ý nội dung hình|
|-|-|-|
|Hero|trang chủ|điện thoại có phiếu khảo sát, bong bóng phản hồi, vài cột biểu đồ, tấm khiên|
|Đăng nhập|cột trái đăng nhập|bong bóng thoại và ổ khóa nhỏ|
|Bảo mật 2FA|kích hoạt, 2FA|điện thoại và tấm khiên có dấu tích|
|Trống: chưa có nhiệm vụ|trang chủ sinh viên|tờ lịch và dấu tích|
|Trống: chưa có phản hồi|danh sách phản hồi|hộp thư và bong bóng|
|Trống: chưa có kết quả|trang kết quả|biểu đồ rỗng và kính lúp|
|Khóa ngưỡng|kết quả dưới ngưỡng|ổ khóa và nhóm người đang tăng dần|
|Không tìm thấy|tìm kiếm rỗng và 404|kính lúp|
|Thành công|sau nộp phiếu, sau gửi phản hồi|dấu tích tròn, vài chấm tĩnh|
|403|không đủ quyền|ổ khóa và biển báo|
|500, ngoại tuyến, bảo trì|lỗi hệ thống|cờ lê, đám mây|
|Biểu tượng "KS"|logo, favicon|**2 phương án** SVG (bong bóng chứa dấu tích, bong bóng chứa 3 cột) để người dùng chọn|

### 3.6 Icon

Một bộ duy nhất (`lucide-react`), nét đồng nhất, kích cỡ 16/20/24 px. Icon đi kèm nhãn chữ, **không thay thế nhãn**. Không dùng emoji làm icon chức năng. Liên kết **nội bộ** dùng mũi tên phải hoặc chevron; **chỉ liên kết ra ngoài** mới dùng ký hiệu mũi tên chéo, kèm chữ ẩn cho trình đọc màn hình ("mở trong tab mới").

### 3.7 Chuyển động (tinh tế, có chủ đích)

Hàm làm mượt đề xuất: `cubic-bezier(0.2, 0.8, 0.2, 1)`. Chỉ hoạt ảnh `transform` và `opacity`, không hoạt ảnh làm đổi bố cục.

* Hover thẻ: nâng 2 px cộng đổi bóng (150 ms). Nhấn nút: thu 0,98 (100 ms). Chuyển mục sidebar: thanh nhấn trượt (200 ms).
* Vào trang: mờ dần cộng dịch 8 px (250 ms); các thẻ trong lưới vào lệch nhau 40 ms, tối đa 6 thẻ.
* Thanh tiến độ và vòng tỉ lệ phản hồi chạy tới giá trị (500 ms). Số trên thẻ thống kê đếm lên một lần khi lần đầu thấy (≤ 700 ms).
* Màn thành công: dấu tích vẽ nét (600 ms). Skeleton lóe nhẹ (1,4 s). Toast trượt vào và tự đóng.
* **Tắt mọi chuyển động khi `prefers-reduced-motion: reduce`.** Không hoạt ảnh lặp vô hạn (trừ spinner), không parallax, không video nền, không particles, không carousel tự chạy.
* Tương tác không bị chậm quá 300 ms vì hoạt ảnh.

### 3.8 Chế độ tối (tùy chọn, ưu tiên thấp nhất)

Chỉ làm nếu người dùng chọn ở UI-0 và hệ token đã chuẩn. Nếu làm: kiểm lại toàn bộ tương phản, màu biểu đồ, minh họa SVG (dùng biến CSS), và có nút chuyển rõ nhãn.

## 4\. THIẾT KẾ THEO TỪNG LOẠI MÀN HÌNH

**4.0 Trang chủ theo vai trò (thay đổi có tác động lớn nhất).** Giữ nguyên route `/tai-khoan` (và đích sau đăng nhập hiện tại); trình bày lại thành trang chủ của vai trò. **Cấu trúc:**

1. **Dải chào gọn:** "Xin chào, {tên}" cỡ vừa (H1 `clamp` khoảng 28 đến 40 px, tối đa 2 dòng, tên dài cắt có tooltip), dòng phụ gồm huy hiệu vai trò và đơn vị; bên phải minh họa nhỏ theo nhóm vai trò (ẩn trên điện thoại); thanh 4 px màu nhóm vai trò ở trên cùng.
2. **"Việc cần làm" (ưu tiên số 1):** tối đa 4 thẻ hành động, mỗi thẻ gồm icon, tiêu đề dạng động từ ("Làm phiếu khảo sát"), một dòng mô tả, và **con số hoặc trạng thái** nếu có hàm đọc (Luật 1 ngoại lệ E2). Khi chưa có con số, chỉ hiển thị tiêu đề và mô tả. Gợi ý theo vai trò (**chỉ đưa lên các thẻ có trang đích thật trong dự án**):

|Vai trò|Thẻ gợi ý|
|-|-|
|Sinh viên|phiếu khảo sát chưa làm (hạn gần nhất); phản hồi của tôi (đang xử lý)|
|Giảng viên|kết quả khảo sát mới công bố; phản hồi cần xử lý; giải trình (nếu chưa mở thì thẻ mờ "Sắp mở")|
|Trưởng bộ môn, Trưởng khoa, Lãnh đạo|kết quả của đơn vị; phản hồi chuyển lên|
|Cán bộ ĐBCL|đợt khảo sát đang chạy; mẫu phiếu; hàng đợi phản hồi|
|Phòng Đào tạo|đợt chờ xác nhận dữ liệu; danh mục và nhập dữ liệu; hàng đợi phản hồi|
|Phòng Khảo thí|kết quả nhóm kiểm tra đánh giá (dạng gộp); hàng đợi phản hồi|
|Thanh tra|hồ sơ được giao; hồ sơ sắp đến hạn|
|Quản trị|người dùng; nhật ký kiểm toán; chính sách hai bước|

3. **"Chức năng":** lưới thẻ (icon, tên, mô tả một dòng), thay cho hàng nút. Chức năng chưa mở là thẻ mờ gắn nhãn "Sắp mở", gom ở cuối; **bỏ mục "Các khu vực sắp mở" trong sidebar** khi chức năng đã xong. Nhãn nút theo mẫu động từ cộng đối tượng; **không để nhãn trùng tên vai trò**. Với các nút viền mang tên vai trò hiện nay ("Sinh viên", "Giảng viên", "Phòng Đào tạo", "Cán bộ đảm bảo chất lượng"): tìm trang đích thật, đặt tên theo nội dung trang (ví dụ "Tổng quan sinh viên"), hoặc gộp nếu trùng chức năng; ghi vào báo cáo.
4. **"Tài khoản và bảo mật":** chuyển thành cột phụ trên máy tính (cuối trang trên điện thoại): avatar chữ cái đầu, họ tên, mã, email, huy hiệu vai trò, **trạng thái hai bước** (nếu trang hiện đã có dữ liệu này), nút đổi mật khẩu. Giữ đủ chức năng đang có.

**4.1 Khung chung (AppShell) cho mọi vai trò, hợp nhất hai khung hiện có:**

* Đầu trang dính (có bóng nhẹ khi cuộn): biểu tượng, tên hệ thống, **tên người dùng cộng huy hiệu vai trò**, avatar chữ cái đầu, menu tài khoản, đăng xuất.
* Sidebar là **điều hướng thật** (cùng các route hiện có): icon cộng nhãn, nhóm có tiêu đề, mục hiện hành có nền nhạt theo màu nhóm vai trò cộng thanh nhấn bên trái cộng `aria-current="page"`. Màn hình nhỏ: thu thành ngăn kéo; với sinh viên có thể thêm **thanh tab dưới** (3 đến 4 mục) ở màn dưới 768 px (ưu tiên P1).
* Breadcrumb, `PageHeader` (tiêu đề, mô tả, nút hành động chính, thanh màu vai trò, nền chấm lưới nhẹ), liên kết "Bỏ qua tới nội dung", chân trang thống nhất. Phần tử dính (đầu trang) **không được che ô đang focus** (WCAG 2.4.11): dùng `scroll-margin-top`.

**4.2 Trang chủ công khai:** hero có minh họa và hai nút (Đăng nhập, Kích hoạt tài khoản); mục "Chức năng" dạng thẻ có icon màu; mục "Cách hoạt động" các bước có đường nối; mục "Quyền riêng tư và bảo mật" **đúng thực tế**; CTA; chân trang. **Không số liệu bịa, không lời chứng thực giả.**

**4.3 Đăng nhập, kích hoạt, quên mật khẩu, 2FA:**

* Bố cục hai cột (cột trái minh họa và một câu giá trị, ẩn trên điện thoại); thẻ form nổi nhẹ; **viền ô nhập đạt ≥ 3:1**; lỗi có icon và chữ, vùng `aria-live`; mật khẩu có nút Hiện/Ẩn.
* Thuộc tính trình duyệt (E3): `autocomplete="username"`, `current-password`, `new-password`, `one-time-code`; `inputmode="numeric"` cho mã 2FA.
* Ô mã 2FA: **giữ một ô input thật**, tạo kiểu bằng CSS (chữ cách đều, cỡ lớn); không tách 6 ô vì dễ hỏng dán mã, tự điền và bàn phím (cũng phù hợp WCAG 3.3.8). Mã QR trong khung rõ ràng; mã khôi phục dạng lưới có nút sao chép nếu đã có.
* Thanh yêu cầu mật khẩu dạng danh sách tick trực tiếp (P1), chỉ khi dùng chung hàm kiểm tra đang có.

**4.4 Luồng sinh viên (ưu tiên cao nhất, chủ yếu dùng trên điện thoại):**

* **Danh sách nhiệm vụ khảo sát:** thẻ có môn, giảng viên, hạn; huy hiệu "Còn X ngày" đổi màu theo mức khẩn cấp (kèm icon và chữ); trạng thái Chưa làm/Đã nộp; trạng thái rỗng có minh họa.
* **Điền phiếu (mobile-first):** thanh tiến độ dính đầu trang (số câu đã trả lời trên tổng, tính phía trình duyệt từ trạng thái form, không gửi gì thêm); mỗi nhóm tiêu chí một thẻ; mục lục nhóm dính trên máy tính; **thang Likert thành nút phân đoạn có nhãn chữ** ("Rất không đồng ý" đến "Rất đồng ý"), vùng chạm ≥ 44 px, trạng thái chọn rõ (màu cộng dấu tích); ô nhận xét có bộ đếm ký tự nếu đã có giới hạn; khi có lỗi: tóm tắt lỗi ở đầu form với liên kết nhảy tới câu lỗi, focus chuyển đúng; nút Gửi trong thanh dính dưới trên điện thoại. **Chỉ trình bày lại**; nếu hiện là một trang dài thì giữ một lần gửi, không biến thành nhiều bước.
* **Khối ẩn danh nổi bật** theo Luật 5; **màn nộp thành công** có minh họa và lời cảm ơn, không hiển thị thông tin định danh.
* **Gửi và theo dõi phản hồi:** chọn loại bằng thẻ có icon và mô tả ngắn; cảnh báo loại nghiêm trọng bằng khối màu nhạt có icon; theo dõi trạng thái bằng stepper hoặc timeline dọc.

**4.5 Giảng viên, Trưởng bộ môn, Trưởng khoa, Lãnh đạo, Cán bộ ĐBCL (xem kết quả):**

* Thẻ thống kê: số lớn, nhãn, xu hướng (mũi tên kèm chữ), sparkline SVG nhỏ. Điểm trung bình định dạng kiểu Việt Nam: **dấu phẩy thập phân** ("4,2/5"), ngày `dd/MM/yyyy`, dùng `Intl` với `vi-VN` và múi giờ `Asia/Ho\_Chi\_Minh`.
* **Biểu đồ nên có:** phân bố Likert (thanh xếp chồng 100% nằm ngang với nhãn %), điểm theo tiêu chí (thanh ngang có đường tham chiếu đơn vị nếu có dữ liệu), xu hướng theo đợt (đường), tỉ lệ phản hồi (vòng tiến độ với n/N). Hạn chế biểu đồ radar và 3D.
* Mỗi biểu đồ có tiêu đề nói lên điều cần thấy, chú giải rõ, tooltip dùng được bằng bàn phím, nút **"Xem dạng bảng"** (cùng dữ liệu) cho trợ năng, trạng thái rỗng, trạng thái khóa ngưỡng.
* Bảng dữ liệu: tiêu đề dính, hàng hover, cột số căn phải và `tabular-nums`, huy hiệu trạng thái, phân trang, bộ lọc dạng chip, tìm kiếm có icon.
* Nhận xét của sinh viên: thẻ trích dẫn gọn có nhãn chủ đề; không hiển thị thông tin định danh. Áp dụng **Luật 7 (ngưỡng)**.

**4.6 Phòng Đào tạo, Phòng Khảo thí:**

* Thanh trạng thái ngang (stepper) cho vòng đời đợt khảo sát (trong đó nổi bật `CHO\_XAC\_NHAN\_DL`), hiển thị đúng máy trạng thái hiện có.
* Màn xác nhận dữ liệu: checklist RS-01 đến RS-06 với icon đạt/cảnh báo/lỗi **kèm chữ**, nút xác nhận và trả về rõ ràng.
* Hàng đợi phản hồi: huy hiệu hạn xử lý đổi màu theo mức (còn hạn, sắp đến hạn, quá hạn), kèm chữ.
* Thống kê gộp của Khảo thí tuân thủ **Luật 7**.

**4.7 Phòng Thanh tra (áp dụng Luật 6):** giao diện trầm (nền tối nhẹ ở dải đầu hoặc slate đậm), dải "TÀI LIỆU MẬT" cố định, stepper 5 bước (TIEP\_NHAN, XAC\_MINH, KET\_LUAN, THONG\_BAO, DONG), timeline dọc cho nhật ký hồ sơ, huy hiệu mức bảo mật và mức danh tính, thông báo xung đột lợi ích dạng khối cảnh báo rõ, không hoạt ảnh vui tươi, không thumbnail.

**4.8 Quản trị:** bảng người dùng có avatar chữ cái đầu, huy hiệu vai trò và trạng thái (màu cộng chữ), ô tìm kiếm có icon, chip lọc; hộp thoại xác nhận thao tác nguy hiểm (khóa tài khoản, tắt 2FA) màu nguy hiểm và nêu hậu quả bằng chữ; nhật ký kiểm toán có bộ lọc và dạng timeline hoặc bảng gọn; trang cấu hình dạng thẻ theo nhóm với mô tả ngắn cho từng thiết lập.

**4.9 Trạng thái hệ thống:** skeleton khớp bố cục (`loading.tsx` theo từng nhánh), rỗng (0 mục), lỗi, 403, 404, 500, hết phiên đăng nhập, ngoại tuyến, toast. Mỗi trạng thái có minh họa nhỏ và **câu hướng dẫn bước tiếp theo**.

**4.10 In và xuất báo cáo (P2):** `@media print` cho trang kết quả: ẩn sidebar, nền trắng, ngắt trang hợp lý, hiển thị tiêu đề, đợt khảo sát, ngày xuất.

**4.11 Nhận diện trình duyệt (P1):** favicon (SVG cộng PNG 180 px), `theme-color`, tiêu đề tab theo mẫu "Tên trang | Khảo sát \& phản hồi" (Luật 1 E3), ảnh chia sẻ `og:image` tĩnh cho trang công khai.

## 5\. HỆ THỐNG THÀNH PHẦN TRONG CODE

**5.1 Nền tảng:** đọc cấu hình đang dùng (phiên bản Tailwind, shadcn/ui, `cva`, `clsx`, `tailwind-merge`) và **theo đúng cấu trúc hiện có**. Tập trung token vào một nơi (biến CSS cộng cấu hình Tailwind): màu, cỡ chữ, khoảng cách, bo góc, bóng đổ, thời lượng, z-index. Component **không được chứa mã màu hex**; script kiểm tra ở TC-UI-13.

**5.2 Thành phần dùng lại:** `Button` (chính/phụ/ẩn/nguy hiểm, kích cỡ, trạng thái đang tải), `StatusBadge`, `RoleBadge`, `Card`, `StatCard`, `ActionCard`, `PageHeader`, `NavItem`, `DataTable`, `EmptyState`, `Alert`, `Toast`, `Skeleton`, `FormField`, `Stepper`, `Timeline`, `ProgressBar`, `ProgressRing`, `Avatar`, `Dialog`, `Breadcrumb`, `Illustration`. **Tái dùng thành phần đang có (shadcn/ui), không viết lại từ đầu. Thay đổi nhỏ nhất có thể.** Không refactor logic, không đổi cấu trúc thư mục lớn.

**5.3 Quy tắc cho trang mới (có hiệu lực từ khi hoàn tất UI-1; ghi vào `AGENTS.md` mục "Quy tắc giao diện"):**

1. Dùng `AppShell`, `PageHeader` và thành phần chung; không tự viết kiểu riêng, không dùng màu cứng.
2. Mỗi trang có đủ trạng thái: tải (skeleton), rỗng (minh họa cộng hướng dẫn), lỗi, không đủ quyền.
3. Kiểm ở 360 px, bằng bàn phím, và chạy axe; không có lỗi serious/critical.
4. Liên kết nội bộ không dùng ký hiệu mũi tên chéo. Nhãn nút là động từ cộng đối tượng.
5. Chuỗi dữ liệu dài phải xuống dòng hoặc cắt có tooltip.
6. Số, ngày theo định dạng `vi-VN`.
7. Thêm vào định nghĩa hoàn thành (DoD) của mỗi tuần: "trang mới đạt Quy tắc giao diện". Cập nhật `docs/KE\_HOACH\_15\_TUAN.md` và mục nghiệm thu tương ứng.

**5.4 Trang `/dev/style-guide`:** hiển thị token và mọi thành phần ở mọi trạng thái (thường, hover, focus, tắt, tải, lỗi). **Chỉ chạy khi `NODE\_ENV !== "production"`, bản production trả 404** (có test).

## 6\. NỘI DUNG VÀ VI MÔ (MICROCOPY)

* **Giọng văn:** thân thiện, ngắn, rõ; xưng "bạn" với người dùng; viết hoa đầu câu (sentence case), không viết hoa toàn bộ câu trừ nhãn nhỏ.
* **Thuật ngữ thống nhất** (lập `docs/UI\_MICROCOPY.md`): đợt khảo sát, phiếu khảo sát, phản hồi, giải trình, hồ sơ, hạn xử lý, đơn vị. Không lẫn tiếng Anh ("session", "submit"...) trong giao diện.
* **Thông báo lỗi:** nói rõ chuyện gì xảy ra và cách xử lý tiếp ("Mật khẩu chưa đúng. Kiểm tra lại hoặc dùng 'Quên mật khẩu'"). Không đổ lỗi cho người dùng, không hiển thị mã lỗi kỹ thuật.
* **Nút:** động từ cộng đối tượng ("Gửi phiếu", "Xem kết quả"); hành động nguy hiểm nêu hậu quả ("Khóa tài khoản này").
* **Trạng thái rỗng:** một câu giải thích cộng một nút hành động nếu có.
* Mọi thay đổi chữ ghi vào báo cáo (Luật 11).

## 7\. TRUY CẬP VÀ HIỆU NĂNG (TIÊU CHÍ NGHIỆM THU CỨNG)

* **WCAG 2.2 mức AA:** tương phản chữ thường ≥ 4,5:1, chữ lớn ≥ 3:1; **thành phần giao diện, kể cả viền ô nhập, ≥ 3:1 (1.4.11)**; focus nhìn thấy rõ (vòng 2 px, có offset) và **không bị che** bởi phần tử dính (2.4.11); vùng chạm ≥ 24 px (thao tác chính trên điện thoại ≥ 44 px, 2.5.8); không dùng màu làm tín hiệu duy nhất; nhãn gắn đúng input; lỗi thông báo qua `aria-live`; thứ tự Tab hợp lý; phân cấp heading đúng, mỗi trang một H1; `lang="vi"`; phóng to 200% không vỡ; không cuộn ngang ở 320 px (1.4.10); không chặn dán vào ô mật khẩu và mã 2FA (3.3.8).
* **Hiệu năng (đo trên `next build` rồi `next start`, không đo ở chế độ dev):** Lighthouse mobile trên trang công khai: Accessibility ≥ 95, Performance ≥ 90, LCP < 2,5 s, CLS < 0,1. JS mỗi route không tăng quá 10% so với baseline UI-0. Ảnh dùng SVG hoặc `next/image`; chỉ tải các độ đậm font cần dùng, `display: swap`.
* **Kích thước màn hình:** 360×800, 390×844, 768×1024, 1280×800, 1440×900. **Trình duyệt:** Chrome, Edge, Firefox, Safari bản mới nhất.
* Số đo phải **đo thật và dán đầu ra lệnh**. Nếu không đạt, ghi nguyên nhân và đề xuất; không tự điều chỉnh con số.

## 8\. QUY TRÌNH THEO GIAI ĐOẠN (MỖI GIAI ĐOẠN DỪNG VÀ CHỜ LỆNH)

**Khung mỗi giai đoạn:** (1) đọc docs liên quan và code; (2) nêu kế hoạch tối đa 10 dòng, gồm danh sách file sẽ đụng; (3) thực hiện, commit nhỏ trên nhánh với tiền tố `ui:`; (4) chạy `npm run check`, axe, chụp ảnh "sau" vào `docs/ui/sau/UI-n/`; (5) tự chấm **rubric** (bên dưới) có dẫn chứng; (6) viết **BÁO CÁO UI-n**; (7) dừng, chờ `NGHIỆM THU UI-n` hoặc yêu cầu sửa. Không gộp vào `main`. Hết giai đoạn tạo tag `ui-n-xong`; `HOÀN TÁC UI-n` nghĩa là hướng dẫn `git revert` (không dùng force push). Ảnh lưu dạng nén, tổng `docs/ui/` ≤ 20 MB (chỉ giữ ảnh P0 và ảnh dùng cho báo cáo).

**UI-0. Chuẩn bị và kiểm toán (không sửa giao diện)**

* Xác minh repo sạch; tạo nhánh; đề nghị người dùng tạo tag trước nâng cấp (không tự đẩy lên GitHub khi chưa hỏi).
* Chạy `npm run check` làm baseline. Dùng Playwright (dùng lại cấu hình e2e nếu có; nếu chưa có thì hỏi trước khi thêm) để **chụp mọi route theo từng vai trò bằng tài khoản seed** ở 390, 768, 1440 px, lưu `docs/ui/truoc/`. Không in mật khẩu seed ra báo cáo.
* Lập `docs/UI\_KIEM\_TOAN.md`: bảng route, vai trò, ưu tiên (P0/P1/P2), vấn đề thị giác, đề xuất. Đo baseline axe, Lighthouse, kích thước JS, **tương phản viền và chữ phụ thực tế**. Lập `docs/UI\_BACKLOG.md` cho route chưa có.
* Tạo `docs/ui/bang-mau-de-xuat.html` (một file, mở trực tiếp): **2 phương án bảng màu** (cùng giữ teal; khác ở màu nhấn, ví dụ hổ phách và san hô) kèm thẻ mẫu, nút, huy hiệu, ô nhập, mini biểu đồ Likert, mini trang chủ vai trò, và bảng tương phản đã tính. Nêu phương án khuyến nghị và lý do.
* **Hỏi người dùng đúng 5 câu rồi dừng:** (1) chọn bảng màu; (2) chọn font; (3) có làm chế độ tối không; (4) có đồng ý thêm hàm đọc mới cho các thẻ "Việc cần làm" không (liệt kê từng con số cần thêm); (5) chọn phương án biểu tượng "KS" (nếu đã có bản nháp) hoặc cho phép đề xuất ở UI-2.

**UI-1. Nền tảng thiết kế, khung chung và trang chủ theo vai trò (P0)**
Token, font, icon, thang chữ; thành phần nền; trang `/dev/style-guide`; hợp nhất AppShell và sidebar điều hướng thật; **trang chủ theo vai trò (Mục 4.0)** cho mọi vai trò đã có, **sửa viền ô nhập và màu chữ phụ**, bỏ ký hiệu mũi tên chéo ở liên kết nội bộ; ghi "Quy tắc giao diện" vào `AGENTS.md` (Mục 5.3). Đây là bước đổi diện mạo nhiều nhất với ít việc nhất.

**UI-D. Dữ liệu minh họa cho demo (ngoại lệ E1)**
Mục tiêu: demo trông thật, không còn "Tài khoản minh họa PHONG\_DAO\_TAO".

* **Được sửa:** file seed ở các điểm sau: họ tên hiển thị (tên Việt giả hợp lý, không trùng người nổi tiếng hay người thật), tên môn học, lớp, học kỳ, khoa, bộ môn (dùng tên chung, không dùng tên trường thật), số lượng bản ghi vừa đủ, nội dung nhận xét mẫu (lịch sự, không công kích cá nhân, không chứa thông tin cá nhân thật). Dùng bộ sinh ngẫu nhiên có hạt giống cố định để ảnh chụp lặp lại được.
* **Không được đổi:** mã tài khoản seed (ví dụ `DEMO-SV00001`, `ADMIN2026001`), mật khẩu seed, miền email `.invalid`, cấu trúc dữ liệu, ràng buộc, quy tắc nghiệp vụ; **không tạo liên kết giữa SurveyTask và SurveyResponse** (giữ đúng thiết kế ẩn danh). Mọi bản ghi mang tiền tố hoặc cờ `DEMO`. `npm run seed` phải chạy lại được nhiều lần (idempotent).
* **Kịch bản demo cần có** (đủ 10 vai trò, tối thiểu khoảng 60 sinh viên, 8 giảng viên, 12 môn): S1 đợt đang mở với tỉ lệ phản hồi khoảng 60%, có lớp gần đủ và lớp dưới 30%; S2 đợt đã đóng và công bố với điểm đa dạng (khoảng 3,2 đến 4,7), có giảng viên điểm thấp để minh họa giải trình; S3 lớp dưới ngưỡng tối thiểu (hiển thị khóa); S4 đợt `CHO\_XAC\_NHAN\_DL` với một cảnh báo sẵn sàng; S5 phản hồi đủ 8 loại và nhiều trạng thái, có cái sắp quá hạn, quá hạn, đã leo thang; S6 hồ sơ Thanh tra ở từng bước, có một hồ sơ đã loại người xử lý do xung đột lợi ích; S7 cờ bất thường khảo sát; S8 mỗi vai trò có ít nhất một tài khoản.
* Ghi `docs/DEMO\_KICH\_BAN.md`: mỗi kịch bản, vai trò nào xem ở đâu, thứ tự trình bày đề xuất cho buổi bảo vệ (không in mật khẩu, chỉ trỏ tới nơi đã ghi). Nếu test đang khẳng định tên seed cũ thì sửa test tối thiểu và báo.

**UI-2. Trang công khai và xác thực (P0)**
Trang chủ công khai, đăng nhập, kích hoạt tài khoản, quên mật khẩu, 2FA, trang lỗi 403/404/500, bộ minh họa SVG (Mục 3.5), biểu tượng "KS" (2 phương án nếu chưa chọn), favicon và nhận diện trình duyệt (Mục 4.11).

**UI-3. Luồng sinh viên (P0, ưu tiên cao nhất)**
Danh sách nhiệm vụ khảo sát, điền phiếu mobile-first, màn nộp thành công, gửi và theo dõi phản hồi, thanh tab dưới (nếu chọn làm). Phải thử ở 360 px và trên điện thoại thật.

**UI-4. Luồng quản lý và xem kết quả (P1)**
Dashboard và biểu đồ (Mục 4.5) cho Giảng viên, Trưởng bộ môn, Trưởng khoa, Lãnh đạo, ĐBCL; màn của Phòng Đào tạo, Phòng Khảo thí, Phòng Thanh tra; hàng đợi và chi tiết phản hồi, hồ sơ Thanh tra.

**UI-5. Quản trị, hoàn thiện và hồ sơ báo cáo (P1/P2)**
Bảng người dùng, nhật ký kiểm toán, các trang cấu hình; chuyển động tinh tế; in báo cáo; chế độ tối (nếu chọn); rà soát toàn bộ route, axe, Lighthouse; chụp "sau" mọi route; **báo cáo so sánh trước/sau**; chụp lại ảnh trong tài liệu hướng dẫn sử dụng (làm ở tuần 14) và slide nếu có; **`docs/UI\_THIET\_KE.md`** (Mục 10); biểu mẫu đánh giá SUS (Mục 10).

**Nếu thiếu thời gian, cắt theo thứ tự (người dùng quyết):** chế độ tối, in ấn, thanh tab dưới, chuyển động nâng cao, minh họa phụ, rồi UI-5 (giữ AppShell). **Không cắt UI-0, UI-1, UI-D, UI-2, UI-3.**

**Rubric tự chấm (1 đến 5, mỗi trang P0 phải đạt ≥ 4 ở mọi tiêu chí; có ảnh dẫn chứng):** R1 thứ bậc thị giác (mắt biết nhìn đâu trước); R2 nhịp khoảng cách và căn lề; R3 màu và tương phản; R4 nhất quán thành phần; R5 đủ trạng thái (rỗng, tải, lỗi); R6 phản hồi tương tác (hover, focus, nhấn); R7 responsive; R8 độ giàu thị giác có chừng mực (minh họa, icon, chiều sâu); R9 vi mô văn bản; R10 cảm nhận tốc độ. Kèm **"phép thử 5 giây"**: sau 5 giây nhìn, người xem phải nói được trang dùng để làm gì và hành động chính là gì. Nếu bạn xem được ảnh thì tự đánh giá dựa trên ảnh; nếu không xem được, nói rõ và dựa vào số đo; **điểm do người dùng duyệt mới là quyết định cuối.**

**Mẫu BÁO CÁO UI-n:** (a) đã đổi gì (thật, theo file); (b) đường dẫn ảnh trước và sau; (c) kết quả `npm run check` (dán đầu ra thật); (d) số đo axe và Lighthouse (dán đầu ra thật); (e) điểm rubric kèm lý do; (f) thay đổi câu chữ giao diện; (g) rủi ro, điều chưa làm; (h) đề xuất đổi hành vi đã ghi vào `docs/UI\_DE\_XUAT.md`; (i) việc người dùng cần tự kiểm trên điện thoại thật.

## 9\. TEST BẮT BUỘC (đặt tên theo mã, ghi vào `docs/TRUY\_VET.md`)

* **TC-UI-01:** toàn bộ test cũ (unit và e2e) xanh.
* **TC-UI-02:** axe-core không có lỗi mức serious hoặc critical trên mọi route trong danh sách kiểm toán, đăng nhập bằng tài khoản seed của từng vai trò.
* **TC-UI-03:** không cuộn ngang ở 360 px (`document.documentElement.scrollWidth <= window.innerWidth`) trên mọi route P0 và P1.
* **TC-UI-04:** hoàn thành luồng đăng nhập và điền phiếu chỉ bằng bàn phím; focus luôn nhìn thấy.
* **TC-UI-05:** với `prefers-reduced-motion: reduce`, không còn hoạt ảnh chuyển động.
* **TC-UI-06:** `/dev/style-guide` trả 404 ở bản production.
* **TC-UI-07:** trên trang đăng nhập và trang điền phiếu, mọi request mạng đều cùng nguồn gốc.
* **TC-UI-08:** nội dung chữ của trang điền phiếu sau nâng cấp không chứa thêm thông tin người dùng nào so với trước (so với baseline UI-0).
* **TC-UI-09:** Lighthouse mobile trên trang công khai đạt ngưỡng ở Mục 7 (số đo thật).
* **TC-UI-10:** chuỗi tiếng Việt dài và nhiều dấu (ví dụ "Nguyễn Thị Thủy Tiên", "Quản trị viên hệ thống đảm bảo chất lượng", tên môn rất dài) không bị cắt dấu, không tràn hay chồng dòng trong thẻ, huy hiệu, bảng, sidebar.
* **TC-UI-11:** giao diện không vỡ với 0, 1 và 500 mục (có phân trang); tên rất dài; lỗi mạng; phiên hết hạn.
* **TC-UI-12:** viền ô nhập, ô chọn, ô tích có tương phản ≥ 3:1 so với nền liền kề (script đọc computed style); chữ phụ ≥ 4,5:1.
* **TC-UI-13:** trong thư mục component không còn mã màu hex ngoài tệp token và SVG (script quét).
* **TC-UI-14:** mỗi trang có đúng một H1 và `<title>` theo mẫu; liên kết nội bộ không dùng ký hiệu mũi tên chéo; liên kết ra ngoài có `rel="noopener noreferrer"` và chữ ẩn "mở trong tab mới".
* **TC-UI-15:** tên hiển thị 80 ký tự và chuỗi 40 ký tự không có khoảng trắng (như `PHONG\_DAO\_TAO\_PHONG\_DAO\_TAO\_…`) không làm tràn tiêu đề trang chủ vai trò.
* **TC-UI-16:** phần tử dính (đầu trang) không che ô đang focus khi Tab qua form dài (kiểm vị trí).
* **TC-UI-17:** số và ngày hiển thị đúng định dạng `vi-VN` (dấu phẩy thập phân, `dd/MM/yyyy`).
* **TC-UI-18:** sau UI-D, `npm run seed` chạy lặp hai lần cho cùng kết quả và đủ kịch bản S1 đến S8; không có liên kết SurveyTask với SurveyResponse.
* **TC-UI-19:** trang chủ của từng vai trò hiển thị đúng các thẻ chức năng theo quyền (vai trò không có quyền không thấy thẻ; kiểm bằng ma trận quyền hiện có).

## 10\. ĐÁNH GIÁ VỚI NGƯỜI DÙNG VÀ TÀI LIỆU CHO BÁO CÁO

**10.1 Đánh giá khả dụng (người dùng tự thực hiện, bạn chỉ chuẩn bị công cụ):**

* Tạo `docs/danh\_gia/KICH\_BAN\_NHIEM\_VU.md`: 4 đến 5 nhiệm vụ cho sinh viên (đăng nhập, tìm phiếu cần làm, điền và gửi phiếu, gửi một phản hồi, xem trạng thái phản hồi) và 3 nhiệm vụ cho một vai trò quản lý (xem kết quả đợt khảo sát, xử lý một phản hồi, xác nhận dữ liệu đợt khảo sát). Cho mỗi nhiệm vụ: mục tiêu, tiêu chí thành công, ô ghi thời gian, số lỗi, ghi chú.
* **Bảng câu hỏi SUS (System Usability Scale):** dịch trung thành 10 câu chuẩn sang tiếng Việt, thang 1 đến 5. Công thức: câu lẻ lấy (điểm − 1), câu chẵn lấy (5 − điểm), cộng lại rồi nhân 2,5 (thang 0 đến 100). Mức tham chiếu thường được trích dẫn khoảng 68; chỉ dùng như tham chiếu và ghi nguồn nếu trích.
* Tạo bảng tính hoặc script nhỏ (`docs/danh\_gia/tinh\_sus.\*`) nhận dữ liệu CSV và in điểm từng người, trung bình, độ lệch chuẩn; **dữ liệu mẫu phải ghi rõ là dữ liệu thử để kiểm công thức, không phải kết quả đánh giá.**
* Hướng dẫn người dùng: 5 đến 10 bạn cùng lớp là đủ cho một vòng đánh giá nhỏ (khoảng 5 người thường đã phát hiện phần lớn lỗi dễ thấy); lưu ý hạn chế (mẫu nhỏ, thiên lệch vì là bạn bè).
* **AI không được điền, ước lượng hay bịa kết quả đánh giá.** Chỗ nào chưa có dữ liệu thật thì ghi "chưa thu thập".

**10.2 `docs/UI\_THIET\_KE.md` (viết như một chương báo cáo, văn phong học thuật, tiếng Việt):** (1) nguyên tắc thiết kế và lý do chọn; (2) hệ thống thiết kế: màu (kèm bảng tương phản đã đo), chữ, thành phần, minh họa; (3) truy cập: tiêu chuẩn WCAG 2.2 AA đã áp dụng và kết quả axe, Lighthouse đã đo; (4) trước và sau (bảng ảnh, rubric); (5) đánh giá người dùng (SUS, nhiệm vụ) sau khi người dùng thu thập; (6) hạn chế và hướng phát triển. **Chỉ trích dẫn nguồn có thể kiểm chứng** (ví dụ WCAG 2.2 của W3C; Brooke, 1996 cho SUS; Okabe và Ito cho bảng màu an toàn mù màu); không bịa tài liệu tham khảo.

## 11\. NHỮNG ĐIỀU KHÔNG LÀM (CHỐNG "LÀM MÀU")

* Không parallax, video nền, particles, carousel tự chạy, con trỏ tùy chỉnh, âm thanh, cửa sổ chào mừng, hiệu ứng gõ chữ.
* Không số liệu giả, lời chứng thực giả, đánh giá giả trên giao diện thật. Dữ liệu demo chỉ ở môi trường seed và gắn nhãn `DEMO`.
* Không giảm tương phản hoặc cỡ chữ để "trông tinh tế".
* Không hứa quá thực tế về ẩn danh hay bảo mật.
* Không đụng vào `.env`, khóa bí mật, cấu hình triển khai.
* Không làm trước giai đoạn sau; không gộp nhiều giai đoạn vào một phiên.
* Không tự điền kết quả đánh giá người dùng; không cắt xén ảnh chụp để che lỗi.

## 12\. VIỆC LÀM NGAY KHI NHẬN PROMPT NÀY

1. Trả lời tối đa 5 dòng: xác nhận hiểu, nêu chế độ (A hoặc B), nhánh và tag hiện tại, nói rõ chưa sửa gì.
2. Lưu nguyên văn prompt này vào `docs/UI\_NANG\_CAP\_PROMPT.md`; thêm vào `AGENTS.md` mục "Giai đoạn nâng cấp giao diện" tóm tắt **Mục 0.1, các Luật 1 đến 13 và Mục 11**; ghi vào `docs/AI\_USAGE.md`; cập nhật `docs/KE\_HOACH\_15\_TUAN.md` theo Mục 0.2.
3. Thực hiện **UI-0**, rồi **dừng** và hỏi 5 câu. Không bắt đầu UI-1 cho tới khi người dùng gõ `BẮT ĐẦU GIAI ĐOẠN UI-1`.
4. Kết thúc bằng BÁO CÁO UI-0 theo mẫu ở Mục 8.

=== HẾT PROMPT NÂNG CẤP GIAO DIỆN ===

