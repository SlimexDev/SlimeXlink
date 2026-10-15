# Kế hoạch triển khai platform — SlimeXlink

Trạng thái: người dùng đã duyệt qua “tiếp tục”; đã thực thi phần độc lập của P01–P12. P09 còn chặn ở project Supabase thử nghiệm. Spec: ../SPEC-platform.md. Bằng chứng: ../docs/TEST-RESULTS.md.

## Phạm vi

Triển khai nền tảng chạy được: Next.js/TypeScript/Tailwind, UI shell Việt/Anh, cấu hình Supabase an toàn, health check và bộ kiểm thử. Đây là chặng đầu của toàn bộ ứng dụng; không thay thế các module tài khoản, link, nhiệm vụ, mở khóa, khám phá, thống kê và quản trị đã duyệt. Không có module kiếm tiền.

Tên giao diện: **SlimeXlink**; tên package: `slimexlink`. Giữ đường dẫn workspace UnlockLink hiện tại để không làm mất liên kết tài liệu hay thay đổi môi trường người dùng.

## Quyết định kỹ thuật

- Một ứng dụng Node 24/Next.js trên Vercel, npm với package-lock.json. Phiên bản theo spec đã đối chiếu; kiểm tra dependency phụ trước cài đặt, cài không bỏ qua peer conflicts.
- TypeScript strict, ESLint chạy độc lập, không suppression để vượt check.
- Locale URL `/vi` và `/en`; `/` ưu tiên cookie đã chọn, mặc định vi. Dictionary có kiểm tra key; nội dung nhập bởi người dùng không tự dịch.
- Server Components mặc định. Chỉ dùng Client Components cho chuyển ngôn ngữ/tương tác cần thiết. Chưa cần thư viện state toàn cục.
- Supabase browser/server/admin factories riêng. Không dùng service role trong đường truy vấn thông thường, không expose secret. Proxy hợp nhất refresh cookie và locale redirect, giữ cookies/cache headers.
- Build thiếu Supabase vẫn dựng được shell; thao tác phụ thuộc dữ liệu phải báo chưa cấu hình. Không giả lập backend để báo thành công.
- UI tối/xanh, nhận diện riêng; font hệ thống hỗ trợ tiếng Việt ở giai đoạn nền tảng để build không phụ thuộc tải font từ mạng.
- Luồng nhiệm vụ sau này theo docs/TASK-FLOW.md: mở tab/chờ 4–8 giây/quay lại sớm làm lại. Không triển khai timer trong module platform và không gắn timer với OAuth.

## Dependency graph và thứ tự

1. P01 toolchain → P02 shell/styles.
2. P03 test runner phụ thuộc P01; kiểm thử logic được viết trước phần logic P04.
3. P04 dictionaries/locale helpers → P05 locale routing/switcher.
4. P06 shared UI và trạng thái phụ thuộc P02/P05.
5. P07 env validation → P08 Supabase clients → P09 Proxy refresh integration.
6. P10 health/logging → P11 browser verification → P12 hướng dẫn và tổng hợp kết quả.

Tasks cụ thể và các mốc nghiệm thu trong [todo.md](todo.md). Thực hiện tuần tự, chưa cần agent song song. Sau mỗi lát cắt chạy check liên quan; không đợi cuối mới build. Tasks thiết lập chỉ tạo cấu hình phục vụ lát cắt kế tiếp, không dựng toàn bộ schema trước nghiệp vụ.

## Rủi ro và xử lý

| Rủi ro | Xử lý |
|---|---|
| Dependency mới có peer/runtime conflict | Kiểm tra engines/peers; sửa lựa chọn tương thích và ghi lý do; không --force/legacy-peer-deps |
| Thiếu Docker/Supabase test project | Hoàn thành unit/build/browser độc lập; integration thật ghi blocked với bước cấu hình cụ thể, không skip giả pass |
| Locale redirect làm mất refreshed cookies | Test helper response merge và tích hợp session khi có test project; giữ Cache-Control/Set-Cookie |
| Client bundle chứa secret | Module server-only; build với canary secret an toàn rồi kiểm tra output client |
| UI dịch tiếng Anh dài gây tràn | Kiểm tra 320px, 390px, 1440px cả hai ngôn ngữ; screenshot và keyboard |
| Trình duyệt background timer không đáng tin | Giữ giới hạn trong TASK-FLOW; chi tiết state machine thuộc verification, không hứa xác minh tương tác |

## Kiểm tra cuối chặng

Typecheck, ESLint zero warnings, unit, production build, Playwright smoke/i18n, axe và keyboard. Integration Supabase phải có bằng chứng thực trên môi trường riêng; thiếu cấu hình không coi platform kết nối thật đã hoàn tất. Ghi kết quả vào docs/TEST-RESULTS.md. Đọc code-review-and-quality trước review và shipping-and-launch khi chuẩn bị phát hành thực.

## Cấu hình bên ngoài

Không cần secret để bắt đầu cài và kiểm thử shell. Supabase thử nghiệm riêng cần trước kiểm thử kết nối; Google OAuth thuộc identity. Chưa triển khai Vercel production trong chặng nền tảng này.

## Bước duyệt

Người dùng đã duyệt bản đồ, spec và kế hoạch bằng chỉ thị tiếp tục sau mỗi artifact. Không xin lại quyền cho từng thay đổi nhỏ nằm trong phạm vi này. Kết nối Supabase và các module nghiệp vụ chưa hoàn tất chỉ vì shell/build/E2E nền tảng đạt.
