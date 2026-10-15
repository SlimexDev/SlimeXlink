# Spec: platform — nền tảng SlimeXlink

Trạng thái: Phase 1 được chấp thuận qua chỉ thị người dùng “đổi tên dự án thành SlimeXlink và triên khai tiếp”. Ngày 2026-10-15, Asia/Saigon.
Module trong CAPABILITY-MAP.md đã được duyệt. Đây là đặc tả nền tảng, không phải đặc tả gộp toàn bộ sản phẩm.

## Objective

Cung cấp ứng dụng Next.js chạy được trên máy phát triển và có thể build cho Vercel, nền giao diện tối Việt/Anh, ranh giới Supabase server/browser rõ ràng và hạ tầng kiểm thử cho các module nghiệp vụ tiếp theo. Không xem bộ khung này là sản phẩm cốt lõi hoàn thành.

Giả định đã công khai: dùng npm; Node 24; một ứng dụng, một Supabase project cho mỗi môi trường; không module kiếm tiền. Giữ đăng ký email/mật khẩu và Google trong phạm vi identity như bản đồ được duyệt. OAuth Google để đăng nhập không yêu cầu quyền YouTube; xác minh nền tảng là module riêng.

## Tech stack và phiên bản

Các phiên bản stable trả về từ `npm view <package> version` trong phiên này:

| Package | Phiên bản đề xuất |
|---|---|
| next / eslint-config-next | 16.4.1 |
| react / react-dom | 19.3.1 |
| typescript | 6.0.3 (đã điều chỉnh theo peer dependencies) |
| tailwindcss / @tailwindcss/postcss | 4.3.3 |
| @supabase/supabase-js | 2.118.0 |
| @supabase/ssr | 0.12.7 |
| zod | 4.6.7 |
| vitest | 5.0.4 |
| @playwright/test | 1.64.1 |
| eslint | 9.39.5 (plugin React chưa hỗ trợ ESLint 10) |

Node `24.x` trên Vercel; local quan sát được 24.21.0, npm 11.19.0. Khi triển khai đã kiểm tra sâu plugin React/typescript-eslint và điều chỉnh ESLint/TypeScript tương thích; đã cài, typecheck, lint, unit, build và E2E thực tế. Phiên bản chính xác trong package.json/package-lock.json; không dùng `--force` hoặc `--legacy-peer-deps`. Xem docs/PLATFORM-SOURCES.md và docs/TEST-RESULTS.md.

## Phạm vi và hợp đồng cung cấp

### Cấu trúc và chạy ứng dụng

- App Router, `src/`, alias `@/*`, TypeScript strict, ESLint trực tiếp và Tailwind PostCSS theo tài liệu.
- Layout dùng HTML ngữ nghĩa, nền gần đen/nhấn xanh, responsive từ 320px; shared Button, Field, Alert và trạng thái loading/error/empty. Chưa tạo dashboard giả hoặc số liệu mẫu production.
- Chỉ dựng trang khởi đầu có thông báo nền tảng đang phát triển; nội dung trang chủ hoàn chỉnh thuộc discovery-content. Không công bố chức năng chưa hoạt động.
- Không thêm thư viện component nặng chỉ cho bộ khung; lựa chọn primitive cho dialog/menu được xác định khi module UI cần nó, ưu tiên phần tử native cho điều khiển đơn giản.

### i18n

- UI có đường dẫn `/vi/...` và `/en/...` qua `app/[locale]`. `/` chọn cookie hợp lệ trước, nếu không có dùng `/vi`; locale trong URL luôn ưu tiên cookie. Không tự đổi sang tiếng Anh theo trình duyệt khi chưa có lựa chọn vì yêu cầu mặc định tiếng Việt.
- Dictionary TypeScript/JSON tách khỏi component, kiểm tra bộ key tương đương, chỉ nạp bản dịch cần dùng. API trả mã lỗi ổn định, UI ánh xạ mã sang bản dịch.
- Bộ chọn ngôn ngữ có accessible name; ghi nhớ cookie không nhạy cảm SameSite=Lax, Secure trên HTTPS; giữ đường dẫn tương đương và query tìm kiếm/phân trang đã cho phép. Không sao chép OAuth code/token vào URL chuyển ngôn ngữ.
- Loại trừ `/api`, `/auth/callback`, static assets và `_next` khỏi redirect locale. Locale không hỗ trợ trong tuyến locale trả 404.
- `html lang`, format ngày/số theo locale; dữ liệu thời gian lưu UTC, giao diện nêu múi giờ khi có ý nghĩa. Nội dung link do người dùng nhập không tự dịch.
- Canonical/hreflang chỉ cho trang công khai có bản ngôn ngữ tương ứng; noindex/no-store với dữ liệu riêng. Metadata nghiệp vụ và sitemap đầy đủ thuộc discovery-content.

### Supabase và môi trường

- Factory browser chỉ dùng URL + publishable key. Factory server cho mỗi request nhận cookie; không dùng singleton chứa session.
- Factory đặc quyền tách module `server-only`; secret/service-role không có tiền tố NEXT_PUBLIC, không được re-export qua entrypoint client.
- Proxy dùng mẫu SSR được tài liệu Supabase khuyến nghị, giữ cookies/cache headers khi chuyển response; không cache dùng chung response có phiên. Proxy không thay thế kiểm tra quyền ở server/database.
- identity chịu trách nhiệm quyết định quyền bằng danh tính đã xác minh và trạng thái khóa hiện tại. Không tin user object từ getSession để cấp quyền.
- `.env.example` chỉ có placeholder: NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY; cấu hình test có namespace riêng, không dùng production làm fallback. Kiểm tra env với Zod, thông báo tên biến thiếu mà không lộ giá trị.
- Thiếu Supabase: trang khung công khai vẫn render; chức năng phụ thuộc trả lỗi chưa cấu hình, không trả dữ liệu giả. Môi trường production phải hoàn tất kiểm tra cấu hình trước phát hành.
- Chuẩn bị thư mục migrations và tài liệu quy tắc forward-only, generated database types. Không tạo trước tất cả schema nghiệp vụ trong module này; mỗi module sở hữu migration/RLS tương ứng.
- Không thêm tải metadata URL bên ngoài, telemetry bên thứ ba hoặc dịch vụ mới. File người dùng về sau lưu Supabase Storage, không lưu filesystem Vercel.

### Health và logging

- `GET /api/health`: liveness, HTTP 200 `{ "status": "ok" }`, no-store; không tuyên bố database khỏe chỉ từ endpoint này.
- Lỗi server có request id, mã lỗi, duration và trạng thái; không log request body, cookie, authorization header, secret hoặc URL có token.
- Kiểm tra kết nối DB nằm trong integration/smoke test có kiểm soát; chưa thêm public endpoint chẩn đoán chi tiết.

## Commands

Các lệnh sau là giao diện script cần được triển khai, **chưa tồn tại/chưa chạy**:

```sh
npm ci
npm run dev -- --hostname 127.0.0.1
npm run typecheck
npm run lint
npm run test:unit -- --run
npm run test:integration -- --run
npm run build
npm run start -- --hostname 127.0.0.1
npm run test:e2e
```

Typecheck dùng `next typegen` trước `tsc --noEmit` nếu phiên bản cài yêu cầu generated route types. Lint dùng `eslint . --max-warnings=0`, tách khỏi build. Integration thiếu test env phải báo lỗi cấu hình rõ ràng, không đánh dấu pass hoặc tự skip. Trong platform chỉ tạo integration tests cho hợp đồng thực sự được cung cấp; không tạo test rỗng để xanh.

## Project structure

```text
src/app/[locale]/      layout, 404 và state components
src/app/[locale]/(site)/ shell/page + loading; tách khỏi catch-all để 404 không stream thành HTTP 200
src/app/api/health/    liveness handler
src/components/ui/    shared controls
src/i18n/             locale, dictionaries, URL helpers
src/lib/env/          public/server environment validation
src/lib/supabase/     browser/server/admin factories
src/proxy.ts          locale routing và cookie refresh
tests/unit/           logic locale, env, URL helpers
tests/integration/    kiểm tra kết nối và ranh giới thật khi có test project
e2e/                  browser smoke, i18n, keyboard, accessibility
supabase/migrations/  migrations theo module
docs/                 nguồn kỹ thuật, vận hành, bằng chứng kiểm thử
```

## Code style

Function nhỏ, tên rõ nghĩa, không `any` hoặc non-null assertion để che dữ liệu thiếu; dữ liệu ngoài dùng `unknown` rồi validate. Server Component mặc định, Client Component chỉ cho tương tác. Ví dụ logic thuần (minh họa trong spec, chưa phải mã đã triển khai):

```ts
export const locales = ['vi', 'en'] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: unknown): value is Locale {
  return value === 'vi' || value === 'en';
}
```

## Testing strategy / success criteria

1. **Nền tảng chạy:** npm ci từ lockfile; typecheck/lint/unit/build thực chạy thành công, không hạ rule. npm start phục vụ trang shell và health. Ghi lệnh, kết quả và môi trường thật vào docs.
2. **i18n:** unit cho locale hợp lệ/sai, URL ưu tiên cookie, mặc định vi, parity key và loại query nhạy cảm. E2E vi/en: chuyển ngôn ngữ, reload giữ lựa chọn, deep link không mất ngữ cảnh, locale sai 404; kiểm tra loading/error được dịch khi có trạng thái đó.
3. **Ranh giới:** env invalid trả lỗi có thể xử lý, log không lộ secret; kiểm tra client bundle không chứa giá trị canary server secret. Không thay RLS bằng kiểm tra client.
4. **Supabase:** smoke kết nối project test riêng khi có cấu hình; trường hợp thiếu env phải phân biệt với thành công. Kiểm tra Auth/RLS A/B/khách đầy đủ thuộc identity/creator-links, chưa thể nghiệm thu ở platform.
5. **UI:** screenshot 390×844 và 1440×900, thêm kiểm tra overflow 320px; bàn phím đến bộ chọn locale/link, focus rõ. Axe không có vi phạm serious/critical, xử lý mọi phát hiện trước chốt. Không có console errors hoặc request thất bại ngoài trường hợp lỗi chủ động đang test.

Unit kiểm tra logic thuần bằng Vitest; E2E bằng Playwright trên build production. Không giả lập SSR framework bằng unit tests thay cho browser. Không gửi email thật hoặc OAuth tài khoản thật trong smoke nền tảng.

## Boundaries

- Always: kiểm tra tài liệu phiên bản đang dùng, giữ lockfile, validate đầu vào, tách secret, kiểm thử thay đổi và cập nhật trạng thái trung thực.
- Ask first: dịch vụ phát sinh phí, thay đổi production, quyền tài khoản ngoài chưa được cấp, thay đổi phạm vi đáng kể. Dependency/schema/CI cần cho phạm vi đã duyệt không mặc nhiên phải xin lại quyền.
- Never: commit secret; dùng production làm test; xóa/skip test để xanh; quảng cáo đã có Auth/RLS khi chỉ có factory; tự chuyển hosting khỏi Vercel.

## Open questions và phụ thuộc ngoài

- Không có câu hỏi chặn việc duyệt platform. Quyền tạo link chỉ chủ sở hữu hay nhiều tài khoản sẽ chốt khi đặc tả identity; hiện giữ ranh giới nhiều người dùng trong map đã duyệt.
- Chưa có Supabase test project được xác nhận. Docker không trên PATH nên chưa thể hứa chạy local Supabase. Có thể hoàn thành build/unit/UI trước; integration thật cần môi trường riêng. Không yêu cầu dán secret vào chat.
- Google OAuth client cấu hình qua Supabase thuộc identity; không cần để xây platform.

## Nguồn đã đối chiếu

- https://nextjs.org/docs/app/getting-started/installation — App Router, Node tối thiểu, scripts; lint độc lập từ Next 16.
- https://nextjs.org/docs/app/guides/internationalization — locale segment và dictionary phía server. Chọn default vi là quyết định sản phẩm.
- https://supabase.com/docs/guides/auth/server-side/creating-a-client — SSR clients/cookies/Proxy, verified identity và tránh cache chéo phiên.
- https://tailwindcss.com/docs/installation/framework-guides/nextjs — plugin PostCSS và import CSS.
- https://vitest.dev/guide/ — yêu cầu Node và chạy tests một lần.
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions — Node 24.x/22.x; dùng 24.x.
- npm registry, `npm view`: phiên bản và peer dependencies ghi ở trên. Đây là bằng chứng metadata, không thay cho install/build/tests.

Các nguồn web đọc qua agent-reach/Jina ngày 2026-10-15. Đọc thêm API reference cụ thể khi triển khai, ưu tiên tài liệu đi kèm phiên bản cài nếu có khác biệt.
