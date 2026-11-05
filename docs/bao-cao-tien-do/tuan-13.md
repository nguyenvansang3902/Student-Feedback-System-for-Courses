# BÁO CÁO TIẾN ĐỘ TUẦN 13/15

**Đề tài:** Xây dựng website quản lý khảo sát và phản hồi của sinh viên về môn học.

**Nhóm/GVHD:** [sinh viên tự điền]. **Kế hoạch giả định:** 23–29/12/2026. **Thực hiện:**03–05/11/2026 theo yêu cầu, không ghi lùi ngày.

**Trạng thái ngày 05/11:** Đã chốt Tuần 12–13. Check/build cục bộ, UC-GOLD kiểm tay đủ các bước và [CI 41904262769](https://github.com/nguyenvansang3902/Student-Feedback-System-for-Courses/actions/runs/41904262769) check/e2e/smoke của nguồn `831d14decd9d6a562a1f9ecc0a53f6a4fadc8248` đều qua. Tiến độ 211/219 điểm,78/84 FR; giữ các giới hạn ở mục 5.

## 1. Mục tiêu của tuần

Kiểm chức năng đã có tới Tuần 12: độ phủ service, quyền 10 vai trò/IDOR, chín mã Mục F, bảo mật/header/cookie/rate limit/upload, đồng thời/tải nộp phiếu, responsive và khả năng tiếp cận. Sửa lỗi trong phạm vi này, không thêm tính năng; không bắt đầu Tuần 14/UI-n.

## 2. Kết quả và bằng chứng

| Nhóm kiểm | Kết quả đã chạy | Giới hạn |
| --- | --- | --- |
| Check ngày 05/11 | **2.155 passed,1 skipped/2.156 trong 93 tệp; exit 0** | Symlink Windows bị EPERM, không tính skip là passed |
| Coverage | **78,49/73,48/82,22/79,69%** statements/branches/functions/lines | Vượt 75/70/75/75; mẫu số tại [nghiệm thu](../NGHIEM_THU_TUAN_13.md) |
| Build | **Exit 0; 101 route động**, ID `Q1SY2ZcIAr3Do--HbL1SZ` | [Manifest check/build](../assets/tuan-13/check-build-after-calendar.json), hash được ghi khi tổng hợp sau check/build; không có snapshot bất biến trước chạy |
| Quyền/IDOR | **801/801 test**,2 tệp |700 ô 70 action×10 vai trò+41 tình huống+60 test tài nguyên |
| Runtime/xuất tệp | **227 nhóm/15 bộ +demo 19/19** | Chín mã có bằng chứng; [manifest](../assets/tuan-13/runtime-regression.json) giữ nguồn/lượt kế thừa |
| E2E/axe | **6/6; 34 trạng thái; 0 vi phạm; 17 PNG đã xem** | **7 incomplete/168 node** cần kiểm tay khả năng tiếp cận |
| UC-GOLD qua GUI | **Đã qua đủ các bước; 8 PNG đã xem** | [Manifest kiểm tay](../assets/tuan-13/manual-uc-gold.json); chỉ CUA browser UI trên demo giả |
| CSV GUI Lãnh đạo/ĐBCL | **3.745/3.011 byte** | BOM, vai trò/phạm vi,5 phiếu/100%/mean số 2, không định danh; [kiểm byte](../assets/tuan-13/manual-export-verification.json) |
| Khóa MySQL/tải | **8/8 nhóm; 200/200 nộp; race 20 đúng 1 phiếu** |0 HTTP 500/lỗi mạng, nhưng **p95 3.595,91 ms>3.000 ms** |
| Main/bản sao riêng | **45 bảng/9.709 bản ghi cũ giữ hash; 1.575 người dùng** | Restore mới độc lập khớp 46 bảng/9.722 dòng gồm Prisma; [bằng chứng](../assets/tuan-13/main-data-verification.json) |
| CI đúng nguồn | **Check/e2e/smoke thành công; Linux2.156/2.156 trong93 tệp, E2E 6/6** | [Bằng chứng CI](../assets/tuan-13/ci-source-831d14d.json), khôngskip; lượt lỗi harness lịch giữ riêng là lịch sử |

Đã sửa quyền ADMIN đa vai trò đọc kết quả, header/nonce CSP, budget nộp 30 request/60 giây, khóa chia sẻ cho nộp ổn định và tên truy cập nhãn thương hiệu/vùng bảng cuộn. Không nới ngưỡng, pool hoặc timeout để ghi đạt.

## 3. Đối chiếu kế hoạch

Ma trận và chín mã Mục F có bằng chứng runtime. GUI đã đủ các bước công bố sau kiểm duyệt, GV xem kết quả lớp mình/giải trình, TBM xác nhận, phản hồi/đánh giá 4/5, Khảo thí xử lý thi/xem nhóm đánh giá, Thanh tra thông báo/đóng, cả Lãnh đạo/ĐBCL xem và xuất báo cáo. Nhánh chờ hếtSLA kiểm runtime riêng, không nhận chờ bằng tay. Check/build và CI đúng nguồn qua; FR-160 đã chốt.

## 4. Tiến độ lũy kế

Đã nghiệm thu **211/219=96,3%,78/84 FR**. Tuần 12 thêm 20 điểm từ chín FR, Tuần 13 thêm 3 điểm FR-160. Kế hoạch lũy kế 213/219, chênh 2 điểm FR-145 còn backlog. Sáu FR 09/103/110/111/112/145 chưa hoàn tất; không tự cắt hoặc tính sốtest/ảnh/bảng thành điểm.

## 5. Khó khăn, rủi ro và giới hạn

p95 **3.595,91 ms** cao hơn mục tiêu 3.000 ms **595,91 ms**; NFR-16 chưa đạt toàn bộ. Audit 24 moderate tổng/tám production, scan partial 40 tệp/8 bề mặt và licenseNOASSERTION được giữ; 0 high/critical không chứng nhận an toàn. Axe 7 incomplete/168 node chưa được giải quyết chỉ vì kiểm tay nghiệp vụ đã xong.

Khác biệt 31 bảng ban đầu thuộc ngữ cảnh Docker/AppData, đã mở đúng qua shortcut Explorer sau giữ bản sao ngoại tuyến/hash haiVHDX. Main guard cuối qua 03:01:13 ngày 05/11, trước mở scheduler 03:03. Không áp dụng migration mới, không seed/reset hoặc đổi credential/MFA; HTTP trang chủ/đăng nhập/health 200, health database:not_checked tách khỏi SQL. Runtime bình thường có thể ghi audit/email/trạng thái; không nhận hash bất biến sau khởi động hoặc đã kiểm reboot.

HTTP production 7/7 trước đó không thay kiểm build mới. Lượt lỗi cấu hìnhAPP_URL/guardHTTPS và automatic approval review từ chối thử lại không nêu lý do giữ riêng trong manifest. Không nới guard.

## 6. Kế hoạch tiếp theo

Hồ sơ kiểm thử Tuần 13 đã chốt. Theo dõi p95, cảnh báo phụ thuộc và các mục khả năng tiếp cận đã ghi; chỉ bắt đầuTuần 14/UI-n khi có lệnh riêng. Công việc thống nhất một kho Docker dùng lâu dài cho mọi cách mở là yêu cầu vận hành riêng đang thực hiện, chưa ghi đã hoàn tất.

## 7. Phân công và đóng góp thành viên

**[SINH VIÊN TỰ ĐIỀN]** Họ tên, phần thực làm, commit, kiểm thử và thuyết minh. AI hỗ trợ mã/rà soát/tài liệu, không tự gán công việc agent thành đóng góp cá nhân hoặc số giờ.

## 8. Các bước kiểm tra nhanh cho giảng viên

1. Đọc [nghiệm thu Tuần 13](../NGHIEM_THU_TUAN_13.md), đối chiếu manifest nguồn/check/build/CI đúng SHA.
2. Đối chiếu 227 nhóm/15 bộ, demo 19, ma trận 801 và chín mã; không cộng nhóm/request/assertion thành tổng test.
3. Xem tám PNG kiểm tay, 17 PNG tự động và hai CSV; mean trong CSV là số 2, hiển thị UI là 2,00.
4. Đọc mẫu tải trước/sau và số đếm MySQL; giữ p95 chưa đạt, race 20 đúng một phiếu.
5. Kiểm riêng bảy mục axe incomplete/168 node; UC-GOLD đã qua không chứng nhậnWCAG. Đối chiếu CI đúng nguồn và tiến độ đã chốt 211/219,78/84 FR.

## 9. Bản rút gọn để dán vào hệ thống của trường

Tuần này, nhóm kiểm thử các chức năng đã xây dựng và hoàn tất UC-GOLD trên giao diện. Nhóm sửa lỗi quyền ADMIN đa vai trò, thêm giới hạn nộp phiếu và sửa cách kiểm SLA theo ngày làm việc. Bộ kiểm tra đạt 2.155 test, một test bị bỏ qua trên Windows; build và sáu kịch bản E2E đều qua. Thử tải 200 lượt nộp đều thành công; kiểm nộp trùng chỉ tạo một phiếu. p95 còn 3,60 giây, chưa đạt mục tiêu 3 giây. Các giới hạn bảo mật và khả năng tiếp cận được ghi rõ. CI đúng nguồn đã qua; tiến độ nghiệm thu đạt 211/219 điểm, 78/84 FR.

## 10. Điều chỉnh so với kế hoạch

**Ngày/tên người yêu cầu/lý do GVHD:** [sinh viên tự xác minh và điền]. Tuần 13 được yêu cầu khi kiểm tay Tuần 12 còn chờ; đã hoàn tất phần này ngày 05/11 bằng GUI, không lấy E2E thay kiểm tay. Mã và CI được đối chiếu nguồn riêng. Không tự cắt FR-145, thêm chức năng ngoài kế hoạch hoặc gán đóng góp. Giữ giới hạn Khảo thí không thay phúc khảo, Thanh tra không thay quy trình chính thức và ẩn danh ở mức ứng dụng.
