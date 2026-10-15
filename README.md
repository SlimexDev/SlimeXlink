# SlimeXlink

Website chia sẻ liên kết cá nhân, giao diện tiếng Việt (mặc định) và tiếng Anh. Đích triển khai: Vercel; dữ liệu, Auth và Storage: Supabase.

**Website:** https://slimexlink.vercel.app — đã deploy Vercel với Supabase production riêng và kiểm tra các trang công khai trên desktop/mobile. CRUD/mở khóa/phân quyền có integration/E2E trên Supabase test; Google và SMTP production cần cấu hình riêng, chưa nghiệm thu email delivery hoặc luồng có đăng nhập trên production. Không có module kiếm tiền. Xem [STATUS.md](STATUS.md) và [kết quả kiểm thử](docs/TEST-RESULTS.md).

## Chạy local

Cần Node.js 24.x và npm 11.19.0. Một package manager duy nhất: npm, dùng package-lock.json.

```sh
npm ci --ignore-scripts --strict-peer-deps
npm run dev -- --hostname 127.0.0.1
```

Mở http://127.0.0.1:3000. `/` chuyển đến `/vi` hoặc ngôn ngữ đã chọn. Các UI route có tiền tố `/vi` hoặc `/en`; API không có tiền tố locale.

Webpack được chọn vì Turbopack gặp lỗi subprocess CSS trong môi trường Windows này. Đây là chế độ được Next.js hỗ trợ, không bỏ qua typecheck hay lint. Thêm `NEXT_TELEMETRY_DISABLED=1` vào env local để tắt telemetry Next.js.

`.npmrc` tắt lifecycle install scripts và bật strict peer dependencies. Các native package Windows cần dùng hiện cung cấp binary qua optional dependencies, đã chạy được mà không bật scripts. Không tự bật scripts cho toàn bộ dependency.

## Cấu hình Supabase

Sao chép `.env.example` thành `.env.local`, nhập giá trị trực tiếp trên máy; không commit hoặc gửi secret vào chat.

| Biến | Mục đích |
|---|---|
| NEXT_PUBLIC_SITE_URL | Origin website; localhost khi phát triển, HTTPS khi triển khai |
| NEXT_PUBLIC_SUPABASE_URL | Project URL từ Supabase Connect |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable key bắt đầu `sb_publishable_`, có thể dùng ở browser |
| SUPABASE_SERVICE_ROLE_KEY | Khóa đặc quyền server; không dùng trong client hoặc truy vấn người dùng thông thường |

Shell công khai chạy khi chưa có Supabase. Factory phụ thuộc backend sẽ trả lỗi chưa cấu hình; không có dữ liệu giả thay thế. Key legacy anon không được chấp nhận bởi validator hiện tại; dùng publishable key mới. Không nhập secret key vào biến NEXT_PUBLIC, vì mọi giá trị mang tiền tố đó được coi là công khai ngay từ build.

Kiến trúc phiên: Auth sẽ chạy qua server, cookie HttpOnly/SameSite=Lax/Secure trên HTTPS. Browser client hiện dành cho dữ liệu công khai, không lưu phiên. Proxy làm mới phiên, giữ cookies/cache headers. Route handlers và server actions vẫn phải kiểm tra danh tính/quyền riêng; Proxy không cấp quyền quản trị. Factory admin có `server-only` và bỏ qua RLS nên chỉ dùng sau kiểm tra quyền rõ ràng.

Schema nghiệp vụ và RLS/RPC nằm trong migrations. Quy trình áp dụng ở [supabase/migrations/README.md](supabase/migrations/README.md). Không có dữ liệu seed production. Integration trực tiếp API kiểm tra RLS A/B/guest, role escalation, suspension và các RPC mở khóa.

## Kiểm thử

```sh
npm run test:unit -- --run
npm run typecheck
npm run lint
npm run build
```

E2E chạy trên build production, tự khởi động và dừng server localhost, không tái sử dụng server có sẵn. Cài Chromium chính thức vào cache riêng của repository trước:

PowerShell:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) '.cache/ms-playwright'
npm exec -- playwright install chromium
npm run test:e2e
```

macOS/Linux:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/.cache/ms-playwright" npm exec -- playwright install chromium
npm run test:e2e
```

Trên Linux cần system dependencies của Chromium nếu máy/CI chưa có. Báo cáo HTML ở `playwright-report/`, trace lỗi ở `test-results/`, screenshot bàn giao ở `docs/screenshots/`. Hai thư mục report và browser cache không commit.

Integration **không dùng backend giả**. Tạo Supabase project thử nghiệm riêng và file `.env.test.local` với TEST_SUPABASE_URL, TEST_SUPABASE_PUBLISHABLE_KEY, TEST_ALLOW_SUPABASE=true. Không dùng production; không fallback sang NEXT_PUBLIC_*.

```sh
npm run test:integration -- --run
```

Thiếu cấu hình làm lệnh thất bại rõ ràng. Bộ test hiện kiểm tra Auth, RLS A/B/guest, Storage private, CAS, limiter đồng thời, link CRUD, task timing/retry, token binding/replay, moderation và audit. Fixture được dọn trong finally; không gửi email hàng loạt.

## Chuẩn bị Vercel

Hướng dẫn đầy đủ: [DEPLOYMENT.md](docs/DEPLOYMENT.md). Kiến trúc và giới hạn: [CORE-ARCHITECTURE.md](docs/CORE-ARCHITECTURE.md). CI ở `.github/workflows/quality.yml`; chưa xác nhận chạy từ GitHub.


Chỉ nên tạo preview để xem nền tảng hiện tại; ứng dụng nghiệp vụ chưa đủ điều kiện phát hành.

1. Đẩy repository lên Git provider của bạn, import vào Vercel, chọn preset Next.js và Node.js 24.x.
2. Install command: `npm ci --ignore-scripts --strict-peer-deps`; build command: `npm run build`. Vercel tự phục vụ output Next.js, không cấu hình static export.
3. Đặt environment variables đúng từng Development/Preview/Production. Preview và test cần Supabase riêng; service role là Secret, NEXT_PUBLIC_* là cấu hình công khai.
4. Redeploy sau khi thay biến public vì chúng được đóng vào bundle lúc build. Không chạy E2E/seed vào database production.
5. Kiểm tra `/api/health` trả `{ "status": "ok" }`, `/vi`, `/en`, CSP, console và chuyển locale trên URL preview. Health chỉ thể hiện tiến trình ứng dụng đang trả lời, không xác nhận database khỏe.

Đăng ký email/mật khẩu dùng email **Confirm sign up mặc định** của Supabase: điền form, mở email, bấm liên kết, website nhận mã xác nhận tại `/auth/callback` và cấp phiên. Thêm `http://localhost:3000/auth/callback?locale=vi` và `?locale=en` vào Supabase Auth Redirect URLs; Google dùng cùng callback. Giữ nguyên mẫu mặc định, không cần `{{ .Token }}` hay custom SMTP chỉ để thử liên kết. Supabase có thể giới hạn địa chỉ nhận và số email trên dịch vụ gửi mặc định; xem [hướng dẫn email](https://supabase.com/docs/guides/auth/passwords). Để phát hành, cấu hình SMTP riêng và kiểm thử gửi/nhận email thật.

Khôi phục mật khẩu bắt đầu ở `/vi/forgot-password` hoặc `/en/forgot-password`, dùng email Reset password mặc định và cùng callback allowlist. Trang đặt lại chỉ mở sau khi Supabase xác nhận recovery, với quyền 15 phút gắn người dùng/phiên và dùng một lần. Sau khi lưu, người dùng về đăng nhập với mật khẩu mới. Xem [cấu hình, thiết kế và giới hạn kiểm thử](docs/RECOVERY.md). Việc nhận email thật vẫn cần nghiệm thu riêng.

Không khẳng định hạn mức/gói miễn phí từ bộ khung này; kiểm tra tài liệu hiện hành khi chuẩn bị phát hành. Chưa có Vercel project được liên kết hoặc URL triển khai được xác nhận.

## Vận hành và giới hạn

- `/api/health`: liveness HTTP 200, no-store, không lộ secret. Log JSON chỉ gồm event/requestId/status/durationMs.
- Trang có nonce CSP riêng theo request và no-store để tránh cache chéo phiên. Không dùng CDN cache cho dữ liệu tài khoản.
- Rollback ứng dụng bằng deployment Vercel trước đó, sau đó smoke test health và các luồng chính. Rollback ứng dụng không tự rollback database.
- Trước migration dữ liệu thật phải có backup đã kiểm tra restore; dùng migration bù tương thích với phiên bản trước. Chưa có schema nghiệp vụ hoặc chiến lược retention/backup được áp dụng; các điều kiện đó vẫn thuộc chặng dữ liệu/release.
- Luồng nhiệm vụ dự kiến: [TASK-FLOW.md](docs/TASK-FLOW.md). Mở link/chờ 4–8 giây và quay lại sớm làm lại không chứng minh đã follow/subscribe hoặc xem đúng tab bên ngoài. Khi nhận được URL đích, người nhận có thể chia sẻ lại URL đó.

## Tài liệu dự án

- [Bản đồ module](CAPABILITY-MAP.md)
- [Đặc tả platform](SPEC-platform.md)
- [Kế hoạch](tasks/plan.md) và [đầu việc](tasks/todo.md)
- [Nguồn kỹ thuật và quyết định](docs/PLATFORM-SOURCES.md)
- [Khảo sát tham chiếu](docs/RESEARCH.md)

