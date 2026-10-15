# Kết quả kiểm thử platform — SlimeXlink

## Checkpoint core — 2026-10-16

- Unit 36/36, integration Supabase 7/7 (4 files), typecheck, lint và production build đạt.
- Integration mới: Storage avatar private A/B/guest, cấm upload/RPC từ client, CAS đồng thời chỉ một lần thắng, suspension; link CRUD ownership, guest không đọc target, session retry dedup, thời gian 4–8 giây, early failure/retry, attempt cũ bị từ chối, token concurrent một lần, events dedup, tắt link chặn grant hiện hữu.
- Browser core đã đạt tạo link/task/redirect/disable/delete/analytics/image và HTML không chứa target. Revision sau lưu được revalidate + remount đúng. Full suite 27/27 đạt trước bổ sung admin report; hai connected mới (image/analytics, report/admin/audit) 2/2 đạt, full 29/29 đã chạy đạt sau khi thêm pagination fixtures và extended CRUD; test contact/admin bổ sung 1/1 đạt.
- Axe phát hiện nhãn logo không khớp nội dung; bỏ nhãn dư tại layout chung, lần chạy sau đạt kiểm tra Axe trang unlock. Đã xem screenshot mobile 390px, không tràn ngang.
- Headless task test chủ động phát visibilitychange vì Chromium headless không chuyển focus tab ổn định; không coi đây là kiểm chứng chuyển tab tự nhiên trên thiết bị thật.

## Cập nhật identity sau migration thực tế

- Người dùng đã áp dụng migration `20261015152109_identity_foundation.sql` vào project được xác nhận chỉ dùng thử nghiệm.
- Unit: 17/17; TypeScript/lint và production build đạt sau bổ sung các route tài khoản.
- Integration thực chạy: 4/4 (2 files). Hai user A/B và một guest kiểm chứng ownership profile, update B bị chặn, tự nâng role bị từ chối, metadata role admin không cấp admin, token hiện hữu sau suspension không đọc/sửa profile. User test xóa trong finally.
- Limiter: guest không gọi RPC, 10 request đồng thời đến cùng bucket chỉ 3 kết quả true; bucket thử không có PII, tự hết hạn, cleanup theo migration.
- E2E giao diện/platform: 18/18; gồm guest dashboard redirects, form vi/en accessibility và callback an toàn. Header callback đã từng thất bại rồi sửa giữ `no-referrer`, không hạ assertion.
- E2E connected riêng: 1/1. Admin tạo user test đã confirmed → UI login → role member hiển thị → lưu tên profile → reload còn tên → logout → dashboard redirects. Lần đầu test có locator alert trùng Next route announcer; sửa locator xác định nội dung thông báo, giữ kiểm tra thành công.
- Không coi user confirmed bằng admin là đã test signup/confirmation email. Recovery, avatar và Google thật còn chưa triển khai/kiểm chứng đầy đủ.
- E2E connected đọc cấu hình test local, chỉ nhắm localhost và project disposable. Không public trace/screenshot chứa auth test state.

Ngày: 2026-10-15 (Asia/Saigon). Môi trường Windows, Node 24.21.0, npm 11.19.0. Đây là kết quả **nền tảng**, không phải nghiệm thu ứng dụng nghiệp vụ đầy đủ.

| Kiểm tra thực chạy | Kết quả |
|---|---|
| npm ci --ignore-scripts --strict-peer-deps | PASS; cài lại 400 packages từ lockfile |
| npm ls --depth=0 | PASS; dependency tree hợp lệ |
| npm run lint | PASS; 0 lỗi, 0 warning của ESLint |
| npm run typecheck | PASS; Next typegen + tsc --noEmit |
| npm run test:unit -- --run | PASS; 14 tests / 9 files, 0 skip |
| npm run build | PASS; Next.js 16.4.1, Webpack, TypeScript và route generation |
| npm run test:e2e | PASS; 15 tests, 0 skip, Chromium 156.0.8078.4; lần cuối 13.8 giây |
| Axe WCAG 2A/2AA/2.1AA | PASS; 0 violations trong 10 tổ hợp locale/viewport |
| npm run test:integration -- --run | BLOCKED/FAIL; 2 tests báo thiếu test project env; 0 skip lần cuối |
| npm audit --omit=dev --json | PASS; 0 vulnerabilities production tại thời điểm chạy |
| npm audit --json | Còn 5 high nodes của chuỗi dev/lint braces; xem PLATFORM-SOURCES.md |

Các check build/E2E cần chạy ngoài sandbox trên máy này: lần chạy server trong sandbox không mở được localhost; build cũng từng EPERM với output từ phiên khác. Không bỏ check để xử lý giới hạn môi trường.

## Phạm vi E2E đã chứng minh

- `/` mặc định vi; chuyển vi→en và reload/root giữ lựa chọn; URL locale ưu tiên cookie; chuyển locale loại bỏ query `code`.
- `html lang` và nội dung đúng locale; bàn phím tới skip link, main và select; focus hiển thị; chuyển locale bằng bàn phím.
- `/api/health` trả 200/no-store và chỉ `{status:"ok"}`; header nosniff hiện diện.
- CSP có nonce khác nhau giữa hai response; không unsafe-inline scripts; page no-store, X-Frame-Options DENY.
- `/fr` và `/en/does-not-exist` HTTP 404; đường dẫn sai có giao diện “Page not found”, link về `/en`.
- vi/en × 320, 390, 768, 1024, 1440px: không tràn ngang; 0 console error/warning, 0 requestfailed/HTTP >=400 trong các trang chính được quan sát; axe 0 violations.
- Đã mở xem screenshot vi desktop và mobile bằng công cụ xem ảnh. English screenshots được tạo và kiểm tra tự động bằng cùng suite.

Ảnh: [vi desktop](screenshots/platform-vi-1440.png), [vi mobile](screenshots/platform-vi-390.png), [en desktop](screenshots/platform-en-1440.png), [en mobile](screenshots/platform-en-390.png).

## TDD, review và lỗi đã sửa

- Locale/dictionaries/routing/env/health/logger/security/session-response: viết test trước; đã quan sát RED khi chưa có module hoặc chưa đáp ứng điều kiện, sau đó GREEN.
- Refresh adapter: unit test dùng mock Supabase SDK để kiểm tra hợp đồng cookie. Không coi mock này là kiểm thử session Supabase thật.
- Mutation check: cố ý đổi locale hợp lệ `vi` thành `fr`; 2 locale tests thất bại. Đã phục hồi mã và suite cuối đạt.
- Boundary probe: tạo tạm Client Component import `createAdminClient`; production build thất bại do `server-only`. Đã xóa probe rồi build production thành công. Không giữ route thử trong sản phẩm.
- Canary build: đặt secret giả `slimex-server-canary-do-not-ship`; không tìm thấy trong `.next/static`. Đây là kiểm tra rò rỉ vào client bundle, không thay thế review quyền sử dụng admin client.
- E2E đầu 14/15 pass: unknown path dùng 404 mặc định. Thêm catch-all phát hiện thêm soft 404 (HTTP 200 do loading boundary stream). Tách trang và loading vào route group `(site)`; catch-all không nằm trong boundary đó. Suite cuối giữ nguyên assertion 404 và đạt 15/15.
- Lint/typecheck và React checklist đã review: interactive control có label; server render mặc định; client state giới hạn cho select/error; không waterfall dữ liệu nghiệp vụ hoặc thư viện state mới.

## Chưa kiểm thử / chưa hoàn tất

- Supabase thật: chưa có test env; Auth settings/Data API connectivity chưa gọi thành công. Chưa có truy vấn bảng thực hoặc migration nghiệp vụ.
- Auth email/Google, RLS A/B/khách, Storage policies, CRUD link, task attempts, token unlock, rate limit database, analytics/admin: thuộc các module tiếp theo, chưa triển khai và chưa có bằng chứng.
- Chưa kiểm tra luồng error recovery/loading bằng E2E với lỗi backend thật; nền tảng hiện có component dịch sẵn.
- Chưa có CI remote run, Vercel preview/production hoặc smoke trên URL thật. Không có chứng nhận toàn bộ ứng dụng production-ready.

## Điều kiện chạy tiếp integration

Tạo project Supabase thử nghiệm riêng, điền `.env.test.local` trên máy theo README và chạy lại integration. Không gửi secret vào chat. Cấu hình thiếu làm test fail có chủ đích; không dùng production làm fallback và không đánh dấu pass.

Người dùng đã xác nhận chưa có project thử nghiệm. Chưa có kiểm thử Supabase thật bổ sung sau xác nhận này.

## Cập nhật sau khi cấu hình project

Người dùng đã tạo project và điền cấu hình. Đã chuyển các giá trị từ `.env.example` sang `.env.local` được Git bỏ qua và khôi phục file mẫu; không in khóa ra log.

Kiểm tra chỉ đọc thực tế:
- Auth settings: HTTP 200, response có `external`.
- Data API root/schema: HTTP 401 `Secret API key required`. Test connectivity cũ kỳ vọng schema public trả 200 không phù hợp project này; chưa chạy lại suite đó thành PASS.
- SELECT qua Supabase SDK đến bảng probe không tồn tại: HTTP 404/PGRST205, xác nhận request đã tới PostgREST. Không tạo bảng hoặc sửa dữ liệu.

Đây là smoke kết nối, chưa phải kiểm thử bảng/Auth flow/RLS. Chưa có test database riêng được cấu hình; không chạy test ghi dữ liệu trên project này.


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

## Tổng hợp core mới nhất

2026-10-16: full E2E 29/29 (1.1 phút), integration 8/8, unit 36/36, lint/typecheck và production build đạt. Extended creator E2E bao gồm early return/fail/retry, ảnh render, analytics, disable/expire, duplicate/reorder/save/reload/delete. Discovery dùng 24 fixture: 21 đủ điều kiện công khai, trang 12+9; owner dashboard 20+4. Không skip test.

Seed development thực chạy qua SQL trong transaction, tạo đúng một link rồi rollback; user fixture đã xóa. Service-role validation privilege được bổ sung sau test bắt thiếu EXECUTE; discovery test sau migration đạt. Potential secret scan 167 files lúc kiểm tra không tìm thấy key/token thực theo mẫu, env local vẫn ignored. Runtime audit 0; dev audit còn 5 high trong chain ESLint/braces, chưa có fix tương thích được xác nhận.
