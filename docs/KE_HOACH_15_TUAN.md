## 9\. KẾ HOẠCH 15 TUẦN

Mỗi tuần: **Làm** (phạm vi), **Không làm** (tránh chạy trước), **Nghiệm thu** (người dùng tự kiểm được), **Tài liệu** (cập nhật trong tuần). Mỗi tuần kết thúc bằng bản chạy được trên nhánh chính và báo cáo tuần. Lưu mục này vào `docs/KE\_HOACH\_15\_TUAN.md`.

**Tuần 1. Khởi động và hiểu nghiệp vụ.**

* Làm: tạo AGENTS.md và các tài liệu nền (Mục 14); dựng khung Next.js + TypeScript + Prisma + MySQL (Docker Compose `db` + `mailpit`); ESLint/Prettier/Vitest; CI GitHub Actions; trang chủ và trang kiểm tra sức khỏe; `npm run check` chạy qua; viết `docs/NGHIEP\_VU.md` v1 (quy trình hiện tại ở trường, vai trò, thuật ngữ, bảng mã BR).
* Không làm: đăng nhập, bảng dữ liệu nghiệp vụ.
* Nghiệm thu: `docker compose up -d db mailpit` rồi `npm run dev` mở được trang chủ; `npm run check` xanh.
* Tài liệu: nghiệp vụ v1; nháp Chương 1 báo cáo.

**Tuần 2. Phân tích và thiết kế.**

* Làm: danh sách yêu cầu FR/NFR có mã; sơ đồ use case, hoạt động và máy trạng thái (Mermaid); ma trận vai trò × chức năng; ERD và Prisma schema đầy đủ (kèm thiết kế ẩn danh 5.6); quy ước kiến trúc; wireframe các màn hình chính; migration cho nhóm bảng người dùng và danh mục.
* Không làm: giao diện chức năng.
* Nghiệm thu: mở được các sơ đồ trong `docs/`; `npx prisma migrate dev` chạy sạch; test kiểm tra schema ẩn danh (5.6a) đã có và xanh.
* Tài liệu: nháp Chương 2 (khảo sát nghiệp vụ, yêu cầu) và Chương 3 (thiết kế).

**Tuần 3. Xác thực (bcrypt + JWT).**

* Làm: đăng nhập/đăng xuất, băm bcrypt, access + refresh token, bảng UserSession, cookie httpOnly, đổi mật khẩu, kích hoạt lần đầu, quên/đặt lại mật khẩu (Mailpit), giới hạn tần suất và khóa tạm, khung AuditLog, layout theo vai trò.
* Không làm: 2FA, phân quyền chi tiết.
* Nghiệm thu: đăng nhập bằng tài khoản demo; sai 5 lần bị khóa; refresh xoay vòng; đăng xuất thì token cũ vô hiệu; thư đặt lại mật khẩu hiện trong Mailpit.
* Tài liệu: sơ đồ tuần tự đăng nhập và làm mới phiên; ADR về JWT/bcrypt.

**Tuần 4. Phân quyền và 2FA cho ADMIN.**

* Làm: gán vai trò + phạm vi, module `can()`, lọc theo phạm vi, quản lý người dùng (ADMIN), TOTP đầy đủ theo 8.4, mã khôi phục, `admin:create`, `admin:reset-2fa`, trang nhật ký kiểm toán.
* Không làm: nghiệp vụ khảo sát.
* Nghiệm thu: ADMIN lần đầu bị buộc đăng ký 2FA bằng ứng dụng xác thực; không có mã thì không vào được trang quản trị; các vai trò khác không vào được trang của vai trò khác.
* Tài liệu: ma trận quyền (bản chạy thật), nháp mục bảo mật của báo cáo.

**Tuần 5. Danh mục và nhập liệu.**

* Làm: CRUD học kỳ (khóa sổ), khoa, bộ môn, môn học, lớp học phần, phân công giảng viên; import Excel/CSV có chạy thử và báo lỗi từng dòng; tải file mẫu; hoàn thiện seed demo.
* Không làm: mẫu phiếu, đợt khảo sát.
* Nghiệm thu: import file mẫu đúng và file cố tình sai (thấy rõ lỗi từng dòng); `npm run demo` ra hệ thống có dữ liệu đầy đủ.
* Tài liệu: hướng dẫn import.

**Tuần 6. Mẫu phiếu khảo sát.**

* Làm: trình soạn mẫu (nhóm tiêu chí, câu hỏi, loại câu, trọng số, bắt buộc, không áp dụng), phiên bản, khóa, xem trước, nhân bản, mẫu mặc định.
* Không làm: đợt khảo sát.
* Nghiệm thu: tạo mẫu với đủ loại câu hỏi, xem trước đúng; mẫu đã khóa không sửa được, phải tạo phiên bản mới (BR-05).
* Tài liệu: ERD cập nhật, ảnh chụp màn hình.

**Tuần 7. Đợt khảo sát và phê duyệt.**

* Làm: tạo đợt, phạm vi, thời gian, ngưỡng; máy trạng thái 5.2; trình duyệt/duyệt/từ chối; chốt danh sách và tạo SurveyTask khi mở; scheduler và các hàm `ensure\*`; gia hạn, đóng sớm, hủy; trang theo dõi tiến độ.
* Không làm: giao diện sinh viên làm bài.
* Nghiệm thu: CAN\_BO\_DBCL trình, LANH\_DAO duyệt, đến giờ mở thì có đủ task; sửa đăng ký sau khi mở không đổi danh sách (BR-01); từ chối thiếu lý do bị chặn.
* Tài liệu: sơ đồ trạng thái bản chạy thật, nháp chương hiện thực.

**Tuần 8. Sinh viên làm khảo sát (ẩn danh).**

* Làm: danh sách khảo sát của sinh viên, form động, tiến trình, kiểm tra hợp lệ, nháp phía trình duyệt, nộp một lần trong transaction, màn hình xác nhận.
* Không làm: tổng hợp kết quả.
* Nghiệm thu: sinh viên chỉ thấy khảo sát của lớp mình; nộp lần 2 bị chặn; ngoài thời hạn bị chặn; chạy các test ẩn danh 5.6 (a)-(d) đều xanh.
* Tài liệu: giải thích thiết kế ẩn danh bằng lời thường (phục vụ bảo vệ).

**Tuần 9. Tổng hợp, công bố, kiểm duyệt.**

* Làm: dịch vụ tổng hợp theo 5.7 (có TC-AGG-01), ngưỡng công bố, trạng thái DA\_TONG\_HOP/DA\_CONG\_BO, trang kết quả theo vai trò, so sánh bộ môn/khoa, hàng đợi kiểm duyệt góp ý, danh sách sinh viên chưa hoàn thành và nhắc nhở.
* Không làm: phản hồi/góp ý, giải trình.
* Nghiệm thu: bộ dữ liệu mẫu cho kết quả đúng như tính tay; lớp thiếu mẫu hiển thị "chưa đủ mẫu"; giảng viên chỉ thấy lớp mình và chỉ sau khi công bố.
* Tài liệu: bảng công thức, ví dụ tính tay.

**Tuần 10. Phản hồi/góp ý (phần lõi).**

* Làm: gửi phản hồi (loại, mức độ, ẩn danh), định tuyến 5.8, hàng đợi xử lý, máy trạng thái 5.3, trao đổi qua lại, đính kèm an toàn (BR-28), chuyển tiếp/từ chối có lý do, lịch sử.
* Không làm: SLA, leo thang, đánh giá hài lòng.
* Nghiệm thu: gửi phản hồi ẩn danh → đúng giảng viên nhận mà không thấy danh tính → trả lời → sinh viên thấy; tệp đổi đuôi giả bị chặn.
* Tài liệu: sơ đồ tuần tự phản hồi.

**Tuần 11. Phản hồi nâng cao, giải trình cải tiến, thông báo.**

* Làm: SLA và cờ quá hạn, leo thang bằng job idempotent, đánh giá hài lòng và mở lại, chống spam, giải trình cải tiến (5.4, BR-10), thông báo trong ứng dụng và email, nhắc hạn.
* Không làm: báo cáo tổng hợp.
* Nghiệm thu: chỉnh đồng hồ/dữ liệu để phản hồi quá hạn thì tự leo thang; lớp điểm thấp sinh yêu cầu giải trình; trưởng bộ môn xác nhận được.
* Tài liệu: bảng SLA, nháp chương hiện thực.

**Tuần 12. Báo cáo, dashboard, xuất file.**

* Làm: dashboard theo vai trò, biểu đồ, so sánh theo kỳ, báo cáo xử lý phản hồi, xuất Excel/CSV và PDF, bảo đảm file xuất không chứa định danh. Chạy trọn UC-GOLD (5.1) và viết E2E Playwright.
* Không làm: tính năng mới ngoài kế hoạch.
* Nghiệm thu: làm trọn kịch bản UC-GOLD bằng tay và bằng E2E.
* Tài liệu: ảnh chụp màn hình các dashboard.

**Tuần 13. Kiểm thử, bảo mật, hiệu năng.**

* Làm: bổ sung test tới ngưỡng độ phủ hợp lý ở service nghiệp vụ; ma trận quyền và IDOR đầy đủ; kiểm tra OWASP Top 10; test tải nộp phiếu; rà soát header, cookie, rate limit, upload; sửa lỗi; chỉnh responsive và khả năng tiếp cận.
* Không làm: tính năng mới.
* Nghiệm thu: `npm run check` và `test:e2e` xanh; báo cáo kiểm thử có số liệu thật; danh sách lỗi còn tồn đọng trung thực.
* Tài liệu: Chương kiểm thử và đánh giá (nháp).

**Tuần 14. Triển khai và tài liệu sử dụng.**

* Làm: Dockerfile nhiều giai đoạn, compose cho demo/triển khai, biến môi trường production, script sao lưu/khôi phục, README, hướng dẫn sử dụng cho từng vai trò (có ảnh), kịch bản demo, video demo dự phòng. Chỉ deploy công khai khi người dùng đồng ý và duyệt chi phí; nếu không thì đảm bảo chạy được cục bộ bằng một lệnh.
* Nghiệm thu: người ngoài nhóm làm theo README chạy được hệ thống.
* Tài liệu: hướng dẫn cài đặt, vận hành, sao lưu.

**Tuần 15. Báo cáo, bảo vệ, đóng băng.**

* Làm: ghép và hoàn thiện báo cáo tiểu luận từ `docs/`, slide, kịch bản demo 7-10 phút, bộ câu hỏi phản biện kèm đáp án ngắn cho cả nhóm, đóng băng phiên bản v1.0 (git tag), tổng kết tiến độ và hạn chế.
* Nghiệm thu: demo trọn UC-GOLD không lỗi; mỗi thành viên giải thích được phần mình.

Nếu chậm, cắt theo thứ tự: P2 → các mục P1 ít giá trị nhất (bạn đề xuất, người dùng quyết) → không bao giờ cắt: nghiệp vụ lõi P0, bảo mật (bcrypt, JWT, 2FA admin, phân quyền), kiểm thử, báo cáo tiến độ.

