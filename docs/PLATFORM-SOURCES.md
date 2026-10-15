# Platform — quyết định và nguồn

Ngày đối chiếu: 2026-10-15, Asia/Saigon.

## Quyết định

- App Router, TypeScript strict, npm lockfile. Package versions kiểm tra bằng `npm view`, không chọn theo trí nhớ. Next.js 16.4.1 / React 19.3.1 / Tailwind 4.3.3 / Supabase JS 2.118.0 + SSR 0.12.7.
- Spec ban đầu chọn TypeScript 7/ESLint 10 theo stable registry, nhưng kiểm tra dependency sâu phát hiện plugin React chỉ hỗ trợ ESLint đến 9 và typescript-eslint yêu cầu TS <6.1. Chọn TypeScript 6.0.3 và ESLint 9.39.5; `npm ls --depth=0` hợp lệ, strict peer resolution bật. ESLint 9 có thông báo hết hỗ trợ; theo dõi plugin để nâng cùng nhau, không tắt rule.
- Webpack thay Turbopack: lỗi tạo/kết nối subprocess xử lý CSS tái hiện cả trong và ngoài sandbox. Webpack compile thành công. Trên Vercel vẫn dùng cùng build command để kết quả nhất quán.
- URL locale `/vi` và `/en`; cookie lựa chọn ưu tiên cho `/`, mặc định vi. Không auto chọn en từ trình duyệt. Query chuyển locale chỉ giữ q/page/sort/category; OAuth code/token không đi theo.
- Server factories dùng SSR cookie; phiên HttpOnly, browser client chỉ public/stateless. Không dùng browser Auth lưu localStorage. Quyền và trạng thái khóa phải được kiểm tra ở module identity/database sau này.
- CSP nonce per request, dynamic rendering và no-store; bảo vệ XSS, frame embedding và cache chéo session. Không remote font, telemetry hoặc thư viện state ngoài nhu cầu.
- URL đích/task attempts chưa có schema. Không dựng DB giả để đánh dấu kết nối thật hoàn tất.

## Nguồn chính thức đã đọc

| Nguồn | Dùng cho |
|---|---|
| https://nextjs.org/docs/app/getting-started/installation | App Router, scripts, lint độc lập, Webpack flag |
| https://nextjs.org/docs/app/guides/internationalization | Locale segment, server dictionaries |
| https://nextjs.org/docs/app/guides/content-security-policy | Proxy nonce, dynamic rendering, CSP propagation |
| https://nextjs.org/docs/app/api-reference/file-conventions/not-found | Scoped 404 và trạng thái HTTP khi streaming |
| https://supabase.com/changelog.md | Kiểm tra breaking changes; TLS cipher cũ bị ngừng hỗ trợ không yêu cầu dùng client cũ; framework adapter deprecation không thuộc @supabase/ssr đang dùng |
| https://supabase.com/docs/guides/auth/server-side/creating-a-client | Server/request-scoped clients, getClaims, cookie writes/cache headers |
| https://tailwindcss.com/docs/installation/framework-guides/nextjs | PostCSS setup |
| https://vitest.dev/guide/ | Projects, unit runner và Node engines |
| https://playwright.dev/docs/test-configuration | Web server, browser tests và artifacts |
| https://vercel.com/docs/functions/runtimes/node-js/node-js-versions | Node 24.x |
| https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API | Giới hạn hidden/visible và timer nền cho nhiệm vụ tương lai |

Nguồn local theo version cài: `node_modules/next/dist/docs/`, `node_modules/@supabase/ssr/src/createServerClient.ts`, `types.ts`, `createBrowserClient.ts`. Đã kiểm tra chữ ký `setAll(cookies, headers)`; headers cache bắt buộc đi cùng cookie khi response được thay bằng redirect.

## Supply chain / audit

`.npmrc` giữ ignore-scripts=true. Hai dependency có install script quan sát được: fsevents (không cần trên Windows), unrs-resolver (napi-postinstall). Không bật script nào; native optional binary hiện đủ cho lint/build.

`npm audit` ban đầu báo 5 high nodes do một advisory braces (GHSA-vfj7-8cjw-p6xm), lan qua micromatch → fast-glob → @next/eslint-plugin-next → eslint-config-next. Đây là chuỗi dev/lint, input glob từ repository kiểm soát, chưa nhận glob từ HTTP. Không xuất vào runtime ứng dụng. Không dùng audit fix --force vì đề xuất hạ eslint-config-next sang Next 14 có thể phá bộ rule/version đang dùng.

Đây là rủi ro dependency còn mở, không khẳng định audit toàn bộ xanh. Kiểm tra lại trước release và muộn nhất 2026-10-29; nếu xuất hiện bản vá tương thích thì nâng, chạy lại lint/build/tests. Không cho input không tin cậy thành glob của công cụ này. Xem docs/TEST-RESULTS.md cho audit production thực chạy.
