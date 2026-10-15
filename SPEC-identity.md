# Spec: identity — tài khoản SlimeXlink

Trạng thái: người dùng duyệt và yêu cầu “tiến hành bước tiếp theo” sau khi xác nhận module có quyền user/admin. Ngày 2026-10-15, Asia/Saigon.
Phụ thuộc: platform đã có mã và các check độc lập đạt; kiểm thử Supabase thật còn chặn ở project thử nghiệm. Không triển khai schema/Auth production trước khi có môi trường riêng và được cấp quyền.

## Objective

Người dùng tạo tài khoản, xác nhận email, đăng nhập, khôi phục mật khẩu và quản lý hồ sơ. Google cung cấp đăng ký/đăng nhập khi đã cấu hình trong Supabase. Server và database bảo vệ tài khoản, ngăn tự nâng quyền và ngăn người bị khóa tiếp tục sử dụng dữ liệu cần đăng nhập.

Giả định giữ theo yêu cầu gốc và bản đồ đã duyệt: hỗ trợ email/mật khẩu **và** Google; đăng ký cho nhiều tài khoản, chưa tự đổi thành chỉ một chủ sở hữu. Mục đích website vẫn cá nhân và không kiếm tiền. Người truy cập link không cần tài khoản; luồng đó thuộc unlock.

## Stack, commands và cấu trúc

Dùng package versions hiện có trong package.json: Next.js 16.4.1, Supabase JS 2.118.0, SSR 0.12.7, Zod 4.6.7; TypeScript strict, Vitest và Playwright. Không thêm provider Auth hay dịch vụ dữ liệu thứ hai.

```sh
npm run dev -- --hostname 127.0.0.1
npm run test:unit -- --run
npm run test:integration -- --run
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Các lệnh trên đã tồn tại. Auth/RLS tests được bổ sung khi thực hiện; chưa được chạy chỉ vì spec được viết.

```text
src/app/[locale]/(auth)/     login, register, forgot-password, reset-password
src/app/[locale]/(account)/ dashboard entry + settings/profile
src/app/auth/               confirm + callback Route Handlers
src/app/api/profile/avatar/ upload own avatar, nếu cần Route Handler cho body limit
src/lib/auth/               schemas, actions, guards, error codes, safe return paths
src/lib/supabase/           factories hiện có; bổ sung typed schema sau migration
src/i18n/                  thông báo/form vi/en
supabase/migrations/       schema/policy/RPC versioned theo CLI
tests/integration/         A/B/guest, Auth, RLS, Storage, locked users
e2e/                       luồng email kiểm soát và dashboard protection
docs/                      thiết lập Auth/Google/SMTP, bằng chứng và giới hạn
```

## Luồng và tiêu chí chức năng

| Luồng | Kết quả cần có |
|---|---|
| Đăng ký email | Validate email/mật khẩu/tên; Supabase tạo user, hiển thị hướng dẫn xác nhận; không cho vào dashboard khi email chưa xác nhận |
| Xác nhận email | Template song ngữ dùng token hash, endpoint chỉ nhận loại token được hỗ trợ, verify phía server rồi chuyển về route an toàn; expired/reused/invalid có thông báo và đường khắc phục |
| Đăng nhập | Lỗi credentials chung, trường hợp chưa xác nhận có hướng dẫn gửi lại; loading/error/success được dịch; không lộ email/tokens vào log |
| Google | Nút “Tiếp tục với Google” hoạt động khi provider thực đã cấu hình; thiếu cấu hình bị vô hiệu hóa ở UI **và** server. Lần đầu tạo user, lần sau đăng nhập |
| Callback OAuth | PKCE/cookie do Supabase SSR quản lý, đổi code trên server; xử lý hủy consent, sai/thiếu code, phiên thất lạc; không chuyển token vào client props hoặc URL tiếp theo |
| Quên mật khẩu | Câu trả lời trung tính không tiết lộ email tồn tại; gửi qua email kiểm soát khi test, SMTP thật khi production |
| Đặt mật khẩu mới | Chỉ cho session được liên kết với recovery intent hợp lệ, có hạn và ràng buộc user/session; hết hạn/replay/sai phiên bị từ chối, xóa intent sau thành công |
| Đăng xuất | POST/Server Action, hủy phiên theo scope đã chọn và xóa cookies; browser back/direct URL không lấy được dữ liệu dashboard |
| Hồ sơ | Đọc/sửa tên hiển thị và avatar của chính mình; email chỉ đọc từ Supabase Auth, không tạo bản sao email không cần thiết trong bảng hồ sơ |
| Session hết hạn | Không render dữ liệu riêng, điều hướng về login kèm return path được allowlist; lỗi mạng Auth hiển thị lỗi khả dụng, không giả là đã xác thực |
| Tài khoản bị khóa | Kiểm tra trạng thái hiện tại từ database trên thao tác bảo vệ; JWT còn hạn không đủ để vượt khóa. Logout vẫn được phép |

Google chỉ dùng các quyền nhận diện cần thiết cho đăng nhập (openid/email/profile). Không bật YouTube Data API hay xin quyền đọc subscribe. Không tự đăng nhập Google thật để kiểm thử.

Đặt lại mật khẩu dùng recovery context có integrity server-side và expiry, không chỉ một query `recovery=true` hoặc boolean client. Các tham số Auth chỉ được xử lý ở callback, bị loại trước khi về trang bình thường. Callback đặt Referrer-Policy no-referrer và no-store.

## Hợp đồng module

Server Actions nhận FormData đã validate bằng Zod và trả kết quả có mã ổn định; dictionary chịu trách nhiệm dịch. Không trả nguyên raw provider error, stack trace hoặc giá trị đầu vào mật khẩu.

```ts
type AuthErrorCode =
  | 'VALIDATION_ERROR' | 'INVALID_CREDENTIALS' | 'EMAIL_CONFIRMATION_REQUIRED'
  | 'SESSION_EXPIRED' | 'ACCOUNT_SUSPENDED' | 'RATE_LIMITED'
  | 'PROVIDER_NOT_CONFIGURED' | 'INVALID_CALLBACK' | 'SERVICE_UNAVAILABLE';

type ActionResult =
  | { ok: true; code: 'EMAIL_SENT' | 'PROFILE_SAVED' | 'PASSWORD_UPDATED' }
  | { ok: false; code: AuthErrorCode; fieldErrors?: Record<string, string> };

type Actor = { id: string; role: 'member' | 'admin' };
// requireActor(): validates identity and current account status on every protected operation.
// requireAdmin(): adds a server-owned role check; UI visibility alone grants no access.
```

Redirect khi thành công do server chọn từ các route nội bộ đã allowlist; `next`/returnTo không chấp nhận absolute URL, `//`, backslash, control characters hoặc cách encode tương đương. Locale chỉ vi/en. SITE_URL là origin đã validate, không dựng callback theo Host header người dùng có thể giả.

REST upload trả `{data:{avatarPath}}` hoặc `{error:{code}}`; 401 khi chưa đăng nhập, 403 khi bị khóa, 413 khi quá giới hạn, 415 khi loại file không hợp lệ, 422 khi validation sai, 429 khi bị giới hạn tần suất. Endpoint chỉ thao tác chủ thể từ session, không tin userId trong request.

## Schema, RLS và quyền

| Dữ liệu | Quyền dự kiến |
|---|---|
| auth.users / sessions | Supabase quản lý; ứng dụng không lưu mật khẩu hoặc refresh token ở bảng tự tạo |
| profiles | id gắn auth.users, display_name, avatar_path, timestamps; RLS active owner SELECT/UPDATE; UPDATE có USING + WITH CHECK và column grants hạn chế |
| account_access | user_id, role member/admin, status active/suspended; dữ liệu server/database sở hữu. Người dùng có thể đọc trạng thái của mình khi cần; không có quyền tự INSERT/UPDATE/DELETE role/status |
| private.rate_limit_buckets | Bộ đếm theo bucket/định danh băm + thời hạn; chỉ server/RPC được cấp phép, RLS/grants không cho browser sửa |
| storage.objects: avatars | Bucket private; owner active chỉ đọc/ghi/xóa đúng thư mục UUID của mình; guest và người dùng B không đọc/sửa avatar riêng của A |

- Mọi bảng exposed bật RLS và GRANT đúng thao tác; không dựa vào defaults của project. Không tin `user_metadata` để phân quyền.
- Tạo hồ sơ/quyền member mặc định theo trigger được giới hạn rõ hoặc transaction provisioning server idempotent; không copy role/status từ metadata đăng ký. Không tự cấp admin cho người đăng ký đầu tiên.
- Nếu RLS cần đọc bảng quyền mà client không được SELECT, dùng helper hẹp trong schema không expose, chỉ kiểm tra auth.uid() hiện tại, search_path cố định và grants tối thiểu; SECURITY DEFINER chỉ dùng khi có lý do và review, không dùng để lờ lỗi permission.
- Tài khoản admin đầu tiên được cấp bằng thao tác database có chủ đích cho UUID do chủ website chọn, không qua endpoint đăng ký công khai. Giao diện quản trị đầy đủ thuộc moderation.
- Bộ limiter shared PostgreSQL dùng thao tác nguyên tử và quyền server, hoạt động nhiều instance Vercel. Supabase Auth rate limits vẫn phải cấu hình vì người dùng có thể gọi trực tiếp Auth API.
- Policy và session guard không coi claim role cũ là trạng thái khóa mới nhất. Các thao tác nhạy cảm kiểm tra phiên còn hợp lệ; kiểm thử revocation thực tế, không hứa JWT biến mất ngay sau logout.

## Avatar và validation

- Tên hiển thị trim, 1–80 ký tự, render bằng React escaping; không nhận HTML. Mật khẩu đăng ký/reset 12–128 ký tự, không trim hoặc biến đổi mật khẩu; policy Supabase phải tương ứng.
- Avatar chỉ PNG/JPEG/WebP, tối đa 1 MiB; server kiểm tra kích thước/body cap và magic bytes, gán MIME đúng, UUID filename do server tạo. Không SVG, không HTML, không tải URL tùy ý để lấy ảnh.
- Google avatar bên ngoài không tự tải về backend; dùng initials đến khi chủ tài khoản upload hoặc có thiết kế URL hiển thị được review.
- Private avatar hiển thị bằng signed URL ngắn hạn sau kiểm tra quyền, không lưu signed URL vào hồ sơ. Cập nhật DB thành công mới dọn file cũ; thất bại không làm mất avatar đang dùng. Xử lý upload đồng thời/retry và file mồ côi.
- Public author avatar cho discovery được quyết định trong module công khai, không vô tình mở private bucket toàn cục.

## Abuse cases và kiểm thử nghiệm thu

1. **Unit/TDD:** validation email/name/password/file, return URL/callback locale, mapping lỗi, expiry/binding recovery, cấu hình provider và limiter key. Test trước, quan sát RED rồi GREEN.
2. **Integration Supabase test thật:** ít nhất A/B/guest; A không đọc/sửa hồ sơ/avatar B, guest không lấy dữ liệu riêng; request đổi id/role/status bị chặn; account suspended bị chặn kể cả access token còn hạn; privileged helper không cho chọn user khác.
3. **Auth integration:** đăng ký/login chưa xác nhận, verify hợp lệ/hết hạn/reused token, reset đúng/sai session và callback, logout/revocation, refresh cookie và cache headers. Không giả pass bằng unit mocks.
4. **RLS/Storage:** kiểm tra trực tiếp Data/Storage API cho SELECT/INSERT/UPDATE/DELETE, không chỉ UI; upsert nếu dùng phải có đủ SELECT/INSERT/UPDATE policy owner. Test oversized/wrong MIME/polyglot header và đường dẫn giả.
5. **Concurrency:** provisioning/retry không nhân đôi hồ sơ; limiter hai instance/concurrent requests không vượt quota; avatar retry không xóa file hiện đang tham chiếu.
6. **E2E:** đăng ký → xác nhận qua email sink kiểm soát → login → profile/avatar → logout → dashboard bị bảo vệ; reset qua email sink → mật khẩu mới; cả vi/en, desktop/mobile, bàn phím/axe/console.
7. **Google:** cấu hình thiếu và provider errors được test tự động. Callback được kiểm tra bằng harness kiểm soát; login Google thật chỉ smoke khi có tài khoản test và người dùng chủ động cấp quyền. Báo riêng phần chưa thực hiện; không gọi stub là đã xác minh Google production.

Các check npm lint/typecheck/unit/build phải đạt và giữ suite platform hiện có. Không xóa tests hoặc nới rule để xanh. Report tách PASS/FAIL/BLOCKED/NOT RUN.

## Cấu hình ngoài và email test

- Cần project test tách production, publishable key và service key test chỉ ở local/CI secret store. Hiện chưa có môi trường đó được xác nhận.
- E2E email cần Supabase local + Mailpit (cần Docker) hoặc hosted project nối SMTP test sink có kiểm soát. Tạo user đã xác nhận bằng admin chỉ phù hợp fixture RLS, không thay thế E2E đăng ký/xác nhận email.
- Google cần OAuth Web Client ID/Secret trong Supabase provider, consent screen và redirect URI chính xác; SITE_URL/callback allowlist riêng dev/preview/prod. Không bật provider chỉ vì có nút UI.
- SMTP thật, templates Việt/Anh, hạn mức gửi và chính sách domain cần cấu hình trước phát hành. Không gửi email hàng loạt hoặc tạo tài khoản xã hội thật để test.
- Chưa có dữ liệu production để migrate; migration chỉ áp dụng test trước, có advisors/checks rồi mới xét môi trường thật. CLI được tra `--help`, migration filename tạo bằng CLI.

## Boundaries và điều kiện hoàn thành

- Always: validate phía server, kiểm tra quyền từng thao tác, RLS từng bảng, cookies HttpOnly/Secure trên HTTPS, CSRF protection của Server Actions hoặc Origin kiểm tra rõ ở Route Handlers, rate limit shared, log không token/email/password.
- Ask first: dịch vụ phát sinh phí, quyền tài khoản ngoài hoặc tác động production chưa được cấp. Không xin lại các sửa đổi nhỏ trong module đã duyệt.
- Never: service role ở client, cho sửa role qua profile, tùy ý redirect/fetch URL người dùng, dùng DB production cho test, giả báo test email/OAuth/RLS đã chạy.

Chỉ đánh dấu identity hoạt động khi các luồng và RLS/Storage được chứng minh với Supabase test thật. Module không hoàn tất chỉ vì có form đăng nhập đẹp. Spec này cần được duyệt trước khi lập kế hoạch và viết mã identity theo workflow hiện tại.

## Nguồn chính thức đã đối chiếu

- https://supabase.com/docs/guides/auth/passwords — PKCE email confirmation token hash, signUp/signInWithPassword, recovery và SMTP/Mailpit.
- https://supabase.com/docs/guides/auth/social-login/auth-google — Google credentials, provider configuration và OAuth callback.
- https://supabase.com/docs/guides/auth/server-side/creating-a-client — request-scoped clients, getClaims/getUser và cookie/cache boundaries.
- https://supabase.com/docs/guides/database/postgres/row-level-security — RLS + grants, ownership, USING/WITH CHECK.
- https://supabase.com/docs/guides/storage/security/access-control — owner/bucket policies; upsert cần SELECT/INSERT/UPDATE.

Tài liệu đọc ngày 2026-10-15; API cụ thể, limiter SQL và callback test harness phải được đối chiếu thêm khi triển khai. Các quota/thời hạn nội bộ trong spec là quyết định sản phẩm, không phải lời hứa từ nhà cung cấp.
