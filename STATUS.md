# Trạng thái SlimeXlink

Cập nhật: 2026-10-16, Asia/Saigon. Các checkpoint lịch sử phía dưới không thay thế bảng hiện tại.

| Hạng mục | Trạng thái hiện tại |
|---|---|
| Auth email/password, Google local, hồ sơ/avatar | Backend thật; Google local do người dùng xác nhận; profile/avatar/recovery harness có E2E |
| Link CRUD, nhiệm vụ, sắp xếp, nhân bản, chia sẻ, bật/tắt, hết hạn | Đã triển khai RPC/RLS và UI; CRUD/unlock/disable/delete có E2E; đã kiểm thử thêm nhân bản/reorder/expire và early-return qua UI |
| Ảnh link | Upload server có validation/quota; ảnh public đã kiểm tra render trong E2E |
| Mở khóa | Server session, departure/time, fail/retry, token TTL/one-use/binding/revision; DB kiểm tra replay/race/disable |
| Khám phá | Search/filter/sort/pagination trên view service-only, owner active; UI public và empty/out-of-range có E2E |
| Nội dung công khai | Home/guide/contact/report/draft policies vi/en; metadata/OG/sitemap/robots |
| Analytics | 7/30/90 ngày, UTC visitor/link/day dedup; dữ liệu thật và trang thống kê có E2E |
| Quản trị | Users/links/reports/contacts/audit; server + DB roles, moderation atomic audit, khóa member; integration + report UI E2E |
| Kiểm thử | 36 unit; 8 integration (5 files); full E2E 29/29 đạt; contact/admin bổ sung 1/1 đạt |
| CI | Workflow quality + connected đã viết; chưa chạy trên GitHub, cần test Environment/secrets |
| Vercel | Chưa deploy SlimeXlink; connector chỉ thấy project khác, không tái sử dụng |
| Kiếm tiền | Loại khỏi phạm vi theo yêu cầu |

Chưa nghiệm thu production. Còn kiểm tra browser chuyển tab tự nhiên (headless dùng visibility event có kiểm soát), email delivery/PKCE từ hộp thư, OAuth trên domain triển khai, xoay service key đã từng nhập nhầm và cấu hình project production riêng. Link-image orphan Storage đang cần dọn có kiểm tra tham chiếu; cron hiện dọn dữ liệu database. Hướng dẫn ở docs/DEPLOYMENT.md, kiến trúc ở docs/CORE-ARCHITECTURE.md.

## Lịch sử checkpoint

## Tiếp tục phiên sau

Cập nhật identity sau khi người dùng chạy migration: Supabase thật đạt 4/4 integration (Auth/Data connectivity, A/B/guest ownership + role escalation + suspension, atomic limiter 10 concurrent requests cho đúng 3). Browser suite đạt 18/18 và thêm 1/1 luồng login → profile save/reload → logout → dashboard protection trên user test thật do admin tạo sẵn; user được dọn finally. Unit 17 đạt; production build đạt; callback Referrer-Policy đã sửa trong next.config.ts sau E2E bắt lỗi. Đây chưa phải nghiệm thu signup/email confirmation/recovery/avatar/Google thật. Bộ connected E2E cần .env.local/.env.test.local và test project disposable, không dùng trong CI không có secrets mà giả skip.

Người dùng đã duyệt identity plan. Schema migration 20261015152109_identity_foundation.sql được người dùng áp dụng; khóa app server đã cấu hình từ khóa test cùng project đã xác nhận (không in giá trị). AUTH_RATE_LIMIT_SECRET đã sinh cục bộ. CLI quản trị chưa đăng nhập nhưng không còn chặn test REST. Chưa cấp admin cho tài khoản người dùng thật.

Đã xác nhận `.env.test.local` có secret key hợp lệ bằng Auth Admin listUsers chỉ đọc: HTTP 200; không in khóa hoặc dữ liệu user. Project được người dùng xác nhận disposable test. Bảng account_access chưa tồn tại (Data API 404/PGRST205), nên cần áp dụng supabase/migrations/20261015152109_identity_foundation.sql bằng SQL Editor hoặc kết nối quản trị DB trước khi chạy test ghi. Secret key không thay thế quyền SQL. Không tự ghi đè khóa ứng dụng từ khóa test.

Cập nhật mới nhất: người dùng đã tạo project và cấu hình vào `.env.example`; đã chuyển sang `.env.local` (gitignored) và khôi phục mẫu. Smoke network thực chạy: Auth 200; Data API root 401 yêu cầu secret, SDK SELECT tên bảng probe không tồn tại trả 404/PGRST205. Không có dữ liệu bị ghi. Cần sửa thiết kế test schema connectivity ở chặng integration, không dùng secret chỉ để biến phép thử root schema thành xanh. Chưa được coi smoke này là test RLS hoặc CRUD.

Tên dự án SlimeXlink; giữ thư mục workspace UnlockLink. Bản đồ, SPEC-platform và kế hoạch platform đều đã được người dùng cho tiếp tục. Không hỏi duyệt lại phần đã được chấp thuận.

Yêu cầu nhiệm vụ được ghi tại docs/TASK-FLOW.md và cập nhật CAPABILITY-MAP.md. Timer là điều kiện truy cập theo yêu cầu người dùng, không phải xác minh tương tác thật. Không cần OAuth nhiệm vụ cho luồng này.

Website dùng cho mục đích cá nhân. Theo điều chỉnh của người dùng, module kiếm tiền đã bị loại khỏi phạm vi, kể cả trạng thái “chưa kích hoạt”; không cần nhà cung cấp doanh thu/thanh toán để bàn giao.

Yêu cầu bổ sung: giao diện tiếng Việt và tiếng Anh, mặc định tiếng Việt; bộ chọn ngôn ngữ và bản dịch cho các trạng thái/thông báo. Nội dung link do người dùng nhập không tự dịch. Câu hỏi còn mở: chỉ chủ website được tạo link hay vẫn cho người khác đăng ký tạo link? Người dùng chưa trả lời; không tự suy ra chế độ một chủ sở hữu.

Đọc docs/TEST-RESULTS.md và tasks/todo.md trước khi tiếp tục. Không chạy lại các check đã đạt trên mã không đổi. Người dùng đã trả lời câu hỏi async: **chưa có project Supabase thử nghiệm**. P09 cần tạo môi trường test riêng trước khi chạy lại integration; không dùng production hoặc yêu cầu dán secret vào chat. Chưa có tool Supabase/Vercel callable hoặc CLI/Docker trên PATH trong phiên này. Có skill nhưng chưa có kết nối tài khoản. Chưa được phép suy ra rằng người dùng đã duyệt SPEC-identity.md từ câu trả lời về project test.

SPEC-identity.md đã được người dùng duyệt qua “tiến hành bước tiếp theo” sau khi xác nhận quyền user/admin. Đã lập tasks/identity-plan.md và tasks/identity-todo.md, chờ duyệt kế hoạch trước implementation. Giữ nguyên plan/todo platform vì P09 còn mở. Chưa có mã identity hoặc migrations nghiệp vụ. Không gọi sản phẩm cốt lõi hoàn thành khi chưa có luồng nghiệp vụ và kiểm thử quyền/URL đích thật.

Checkpoint Git nền tảng: db5b2c9 (mã/tests), d0bb84f (tài liệu/bằng chứng). Bản production local được khởi động tại http://127.0.0.1:3000/vi để xem giao diện; không phải URL Vercel. Nếu tiến trình đã dừng, chạy npm run start sau npm run build.


## Checkpoint 2026-10-15 — Google và gửi lại xác nhận

- Người dùng xác nhận Google đăng nhập → dashboard → đăng xuất → đăng nhập lại thành công trên local. Đây là smoke do người dùng thực hiện; chưa kiểm thử Vercel.
- Thêm /vi/confirm-email và /en/confirm-email, liên kết từ login/register; dùng Supabase auth.resend với callback cố định. Limiter PostgreSQL 3 lần/email/15 phút; không tiết lộ email tồn tại/đã xác nhận qua phản hồi provider.
- RED: 3 unit resend thất bại trước implementation. GREEN: toàn bộ 20 unit đạt; 4 integration Supabase đạt; 3 E2E identity đạt (vi/en, guest guard, callback, axe cho form mới). Typecheck, lint và production build đạt. Test E2E Google button theo cờ cấu hình thay vì luôn đòi disabled.
- Unit resend dùng provider mock, không phải bằng chứng email đã gửi. Chưa kiểm thử SMTP/email sink, resend → xác nhận qua hộp thư; recovery/avatar còn mở. Không có migration mới trong lát cắt này.
- Nguồn API: https://supabase.com/docs/reference/javascript/auth-resend (đọc qua agent-reach/Jina).


## Inline email confirmation
- Login vi/en: send code beside email, OTP field below, confirm action. Supabase signup OTP only; does not create new accounts or replace Google login. Code validation 6–10 digits, DB limiter 10 verify attempts/email/15min and 3 sends/email/15min; provider expiry/reuse enforced.
- Tests: 21 unit, 5 real integration (controlled generateLink signup code verifies once, replay denied, fixture deleted; no email sent), 5 identity E2E including 390/1440 screenshots and axe. Build/typecheck/lint passed.
- External requirement: Supabase Authentication → Email Templates → Confirm signup must include {{ .Token }}; use supabase/templates/confirmation.html. Existing dashboard template not changed automatically. Email delivery remains unverified.


## Correction — confirmation belongs to registration
- User clarified: only registration has Send code beside email and OTP below. Login remains email/password plus Google; no inline confirmation or resend link.
- Send code validates display name/email/password, creates pending Supabase signup and sends its confirmation. Create account verifies signup OTP then redirects through protected dashboard. Fields retained between actions. Supabase pending user record necessarily exists before email verification; access guard requires confirmed email.
- Regression RED: 4/5 browser tests failed on old UI. GREEN: 5/5 identity E2E vi/en + 390/1440, 21 unit, production build (TypeScript included), lint passed. Existing real OTP integration unchanged, previously 5/5. SMTP delivery not tested.


## Quyết định mới nhất — email mặc định Supabase
- Người dùng chọn Confirm sign up mặc định vì hosted Free project khóa chỉnh sửa template khi chưa có custom SMTP. Các checkpoint OTP ở trên là lịch sử, đã được thay thế. UI đăng ký nay chỉ nhập tên/email/mật khẩu và bấm Tạo tài khoản, sau đó bấm liên kết trong email. Login chỉ email/mật khẩu hoặc Google. Không cần sửa template hay dịch vụ SMTP để thử với địa chỉ được Supabase cho phép.
- signUp/resend redirect về `/auth/callback?locale=vi|en`, đã có trong Auth Redirect URLs; callback trao đổi PKCE code. Bỏ signOut sau signUp để giữ code verifier; /auth/confirm vẫn nhận token hash cũ.
- Integration Supabase dùng generateLink (không gửi email): liên kết thật xác nhận tài khoản, chuyển về /auth/callback, dùng lại bị từ chối. Email delivery đến hộp thư chưa được kiểm thử.
- Kiểm tra .env.example từng chứa service key ngoài ý muốn trong working tree; đã xóa, bản commit trước đó không chứa key. Cần rotate key ở Supabase và cập nhật local env.


## Kiểm tra chốt luồng liên kết mặc định
- 21/21 unit, 5/5 integration Supabase và 6/6 identity E2E đạt; lint, build (bao gồm TypeScript) đạt. Ảnh mobile/desktop mới là register-link-390.png và register-link-1440.png.
- Mẫu email hosted Free vẫn mặc định. Chưa chứng minh email tới hộp thư thật hoặc toàn bộ PKCE browser qua email. Key server từng xuất hiện trong .env.example working tree, đã xóa; Git HEAD trước đó không chứa key, cần rotate key trong Supabase.


## Recovery checkpoint — 2026-10-15
- Thêm forgot/reset vi/en và liên kết từ login. Dùng Reset password email mặc định, callback PKCE chỉ cấp quyền khi SDK phát PASSWORD_RECOVERY. Cookie có chữ ký, gắn user/session, hạn 15 phút; PostgreSQL limiter đã có làm kho nonce tiêu thụ một lần, không thêm migration/dịch vụ. Quyết định và giới hạn: docs/RECOVERY.md.
- 30/30 unit đạt; 5/5 integration thật đạt (8 request đồng thời max1 chỉ một thắng); 25/25 toàn bộ E2E đạt; typecheck, lint và production build đạt. Đã xem ảnh forgot-password-vi-390.png và reset-password-1440.png.
- Browser harness thật dùng Admin API tạo recovery OTP không gửi email, mint cookie test ở phía test, thực hiện reset qua form ứng dụng rồi xác minh mật khẩu cũ bị từ chối/mật khẩu mới hoạt động/replay bị chặn. Không coi harness là test email delivery hoặc callback PKCE end-to-end.
- I07 chưa nghiệm thu toàn bộ: cần email sink/hộp thư test để đi qua email → callback thật. I09 avatar là việc kế tiếp. Google smoke trước đó do người dùng xác nhận, không tự động tương tác tài khoản Google thật.
