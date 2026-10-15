# Triển khai SlimeXlink lên Vercel

## Supabase

1. Tạo project production riêng với project disposable dùng test. Không sao chép user test hoặc seed sang production.
2. Áp dụng từng file SQL trong `supabase/migrations` theo thứ tự tên, chỉ một lần trên database mới, bằng Supabase SQL Editor hoặc CLI đã link đúng project. Mỗi file đã có transaction khi cần. Kiểm tra schema/RLS/RPC và chạy integration trên project test trước khi đưa migration lên production.
3. Project thử nghiệm hiện tại đã chạy các migration identity/avatar/core/departure bằng SQL Editor; không chạy lại CREATE trên project này. SQL Editor không tự ghi migration history của CLI. Trước chuyển sang `db push`, đối chiếu schema với source rồi dùng quy trình `migration repair --status applied` theo `supabase migration repair --help` cho các migration đã chạy; không reset database.
4. Authentication → URL Configuration: Site URL là origin HTTPS chính thức. Redirect URLs cho phép chính xác `https://<domain>/auth/callback` và `https://<domain>/auth/confirm`; local thêm các origin localhost đang sử dụng. Không dùng wildcard rộng cho production.
5. Email/password: bật Confirm email. Dùng Confirm sign up mặc định chứa liên kết, không cần template OTP. Cấu hình SMTP riêng trước gửi email công khai; kiểm tra domain, SPF/DKIM và hạn mức của nhà cung cấp. Không xem admin-confirmed fixtures là kiểm thử giao thư thật.
6. Google: tạo OAuth Web client trong Google Cloud, callback là `https://<project-ref>.supabase.co/auth/v1/callback`. Điền client ID/secret trong Supabase Google provider. Cấu hình consent screen/test users/publishing phù hợp. App chỉ cần `AUTH_GOOGLE_ENABLED=true` sau khi thử luồng; không đặt Google secret vào client.
7. Migrations tạo bucket avatars private và link-images public, giới hạn 1 MiB PNG/JPEG/WebP. Client không có quyền ghi storage; backend kiểm tra dữ liệu. Avatar owner đọc bằng signed URL 60 giây.
8. Admin đầu tiên: xác minh UUID từ Auth Users rồi đổi `account_access.role` thành admin bằng SQL riêng của chủ project. Không cấp admin dựa vào email request/user_metadata hay thứ tự đăng ký. Không tự cấp admin cho tài khoản thật trong quá trình kiểm thử.

## Vercel

1. Đưa source và lockfile lên repository của bạn; import vào Vercel, framework Next.js, Node 24, install `npm ci --ignore-scripts --strict-peer-deps`, build `npm run build`.
2. Điền biến từ `.env.example` vào môi trường tương ứng. Không điền TEST_* vào deployment production. `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_RATE_LIMIT_SECRET` và `CRON_SECRET` là server-only; hai secret ngẫu nhiên tối thiểu 32 ký tự. `NEXT_PUBLIC_SITE_URL` phải đúng origin deployment để kiểm tra Origin và email callback hoạt động. Sau đổi NEXT_PUBLIC_* cần rebuild.
3. Preview dùng Supabase test và origin preview riêng; production dùng Supabase production. Không dùng production DB cho CI/preview. Với URL preview thay đổi, cấu hình URL chính xác trước test Auth.
4. `vercel.json` chạy maintenance mỗi ngày 03:00 UTC, gọi RPC dọn dữ liệu. Đặt CRON_SECRET và kiểm tra invocation trong Vercel; gọi không có bearer phải trả 401.
5. Smoke test URL thật: `/api/health` 200 không secret; đăng nhập/email callback; tạo link; guest không có target trong HTML/network; early-return fail; đủ nhiệm vụ redirect; tắt/expire chặn link; admin/member phân quyền; mobile/keyboard/console.

## CI và secrets

`.github/workflows/quality.yml` chạy typecheck/lint/unit/build rồi integration + E2E trong GitHub Environment `test`. Tạo environment này với secrets TEST_SUPABASE_URL, TEST_SUPABASE_PUBLISHABLE_KEY, TEST_SUPABASE_SERVICE_ROLE_KEY và variable TEST_ALLOW_SUPABASE=true, chỉ dùng disposable project đã áp dụng migrations. Hạn chế quyền chạy job có secrets; không chạy mã PR không tin cậy với khóa đặc quyền. Thiếu cấu hình job thất bại rõ ràng, không skip hoặc giả backend. Workflow đã viết, chưa được xác nhận chạy trên GitHub.

## Backup và rollback

- Trước migration production, xuất logical backup bằng công cụ Supabase/Postgres chính thức và sao lưu Storage objects riêng; kiểm tra khả năng restore ở project biệt lập. Backup database không đồng nghĩa backup nội dung Storage. Chọn lịch theo mức dữ liệu chấp nhận mất; khuyến nghị xuất hằng ngày cho sử dụng cá nhân và giữ bản mã hóa ngoài tài khoản chính.
- Lỗi ứng dụng: rollback/promote deployment tốt trước đó trong Vercel, kiểm tra health/Auth/unlock. Không tự chạy SQL down làm mất dữ liệu để khớp app cũ.
- Migration: ưu tiên thay đổi cộng thêm tương thích ngược; sửa bằng migration bù mới. Nếu cần restore, dừng ghi, chụp snapshot hiện tại, restore vào project mới và xác minh trước đổi env. Không thử restore lần đầu trên production.
- Theo dõi log lỗi bằng request ID, status và event; không log mật khẩu/token/URL đích/email form. Cron giữ statistics 90 ngày, session hết hạn +1 ngày, resolved report 180 ngày, contact 90 ngày, audit 1 năm.
- Ảnh link cũ được giữ để không phá bản sao đang tham chiếu cùng object. Hiện cần dọn orphan Storage có kiểm tra tham chiếu bằng công cụ quản trị; chưa có tự động dọn ảnh link. Theo dõi dung lượng bucket.

## Điều kiện trước mở công khai

Kiểm tra giá/giới hạn gói hiện hành trên tài liệu chính thức: [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [email SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing). Không giả định free có backup, email không giới hạn hoặc SLA production. Không tự nâng gói.

Khóa service role từng bị nhập vào file example local đã được xóa; chủ project đã chọn hoãn xoay khóa. Cần xoay trước production và cập nhật môi trường server. Chưa nghiệm thu email delivery/PKCE thực từ hộp thư; Google local do chủ tài khoản xác nhận. Chưa có deployment SlimeXlink được xác nhận; project Vercel khác không được tái sử dụng.
