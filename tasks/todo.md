# SlimeXlink — platform tasks

Trạng thái: đã duyệt và thực thi. Kết quả thực chạy trong docs/TEST-RESULTS.md. P09 còn thiếu project thử nghiệm; chưa nghiệm thu Supabase thật.

## P01 — Toolchain tái lập được
- [x] Cài package đúng phiên bản đã kiểm tra, npm lockfile, TypeScript strict và scripts; không ghi đè tài liệu hiện có.
- Acceptance: package `slimexlink`, Node 24, không peer conflict; scripts dev/build/start/typecheck/lint có thật.
- Verify: `npm ls --depth=0`; kiểm tra lockfile và engines. Chạy typecheck/build sau P02 khi có entrypoint.
- Dependencies: không.
- Files (~5): package.json, package-lock.json, tsconfig.json, eslint.config.mjs, .gitignore.

## P02 — Ứng dụng khởi động với nhận diện SlimeXlink
- [x] Dựng layout, trang shell, Tailwind và metadata ban đầu.
- Acceptance: trang render với brand SlimeXlink, nền tối/xanh, không số liệu/chức năng giả.
- Verify: `npm run typecheck`, `npm run lint`, `npm run build`, mở localhost.
- Dependencies: P01.
- Files (5): src/app/[locale]/layout.tsx, src/app/[locale]/page.tsx, src/app/globals.css, postcss.config.mjs, next-env.d.ts.

## P03 — Bộ unit tests có thể chạy
- [x] Cấu hình Vitest và scripts; viết test locale mong đợi trước khi thêm logic.
- Acceptance: test mới thất bại vì logic chưa có (RED), không lỗi toolchain; tách unit/integration projects để lệnh unit không phụ thuộc secrets.
- Verify: `npm run test:unit -- --run`, lưu kết quả RED làm bằng chứng TDD; checkpoint xanh chỉ sau P04.
- Dependencies: P01.
- Files (4): vitest.config.ts, tests/unit/locale.test.ts, package.json, package-lock.json nếu có dependency phụ.

## Checkpoint A — Khung ứng dụng
- [x] Build/lint/typecheck P02 đạt; RED của P03 có nguyên nhân đúng, không coi test pass.

## P04 — Locale và dictionary
- [x] Viết logic locale/dictionary đáp ứng test; đủ bản dịch nền tảng vi/en.
- Acceptance: mặc định vi, chỉ nhận vi/en, dictionary key parity, query nhạy cảm không đi qua helper chuyển locale.
- Verify: unit trước/sau (RED/GREEN), typecheck.
- Dependencies: P03.
- Files (5): src/i18n/config.ts, src/i18n/dictionaries.ts, src/i18n/vi.json, src/i18n/en.json, tests/unit/locale.test.ts.

## P05 — Chuyển ngôn ngữ từ giao diện
- [x] Locale routing, bộ chọn ngôn ngữ, cookie lựa chọn và `html lang`.
- Acceptance: URL thắng cookie, root mặc định vi khi chưa chọn; chuyển giữ đường dẫn/query an toàn; unsupported locale trả 404; API/static không redirect.
- Verify: unit routing, `npm run build`; browser chuyển vi→en→reload và back.
- Dependencies: P02/P04.
- Files (5): src/proxy.ts, src/components/language-switcher.tsx, src/app/[locale]/layout.tsx, src/app/[locale]/page.tsx, tests/unit/routing.test.ts.

## P06 — Shared controls và trạng thái
- [x] Thêm Button/Field/Alert có label/focus, loading/error/not-found đã dịch. Loading/page chuyển vào `(site)` để catch-all 404 không bị streaming thành 200.
- Acceptance: tái sử dụng style; lỗi có text không chỉ màu; không render link tính năng chưa tồn tại.
- Verify: typecheck/lint/build; browser Tab/Shift+Tab, thông báo lỗi và màn hình hẹp.
- Dependencies: P05.
- Files (5): src/components/ui/controls.tsx, src/app/[locale]/loading.tsx, src/app/[locale]/error.tsx, src/app/[locale]/not-found.tsx, src/app/globals.css.

## Checkpoint B — UI song ngữ
- [x] Unit/typecheck/lint/build đạt; kiểm tra thực chuyển locale và 404; cập nhật STATUS.md. Error/loading có component, chưa E2E với lỗi backend thật.

## P07 — Environment validation an toàn
- [x] Test trước rồi triển khai env public/server, .env.example an toàn.
- Acceptance: thiếu/sai biến báo lỗi rõ không lộ giá trị; config test tách production; shell vẫn build khi chưa cấu hình backend.
- Verify: unit env, typecheck, build không có secret.
- Dependencies: P03.
- Files (4): src/lib/env/public.ts, src/lib/env/server.ts, tests/unit/env.test.ts, .env.example.

## P08 — Supabase factories tách quyền
- [x] Browser client, request-scoped server client và server-only admin client; tài liệu migration ownership. Boundary đã kiểm tra bằng compile probe thực tế thay vì test đọc source.
- Acceptance: browser chỉ publishable key; không lưu session trong singleton; schema nghiệp vụ chưa được tạo giả.
- Verify: typecheck/build; kiểm tra client output không chứa server canary secret; ghi giới hạn chưa có backend test.
- Dependencies: P07.
- Files (5): src/lib/supabase/browser.ts, src/lib/supabase/server.ts, src/lib/supabase/admin.ts, supabase/migrations/README.md, tests/unit/server-boundary.test.ts.

## P09 — Refresh cookie không phá locale
- [ ] Ghép mẫu Supabase SSR refresh với proxy locale; thêm integration connectivity và cấu hình test.
- Đã có adapter + unit cookie/cache headers + integration connectivity tests. **Chưa đánh dấu xong:** hai integration tests fail rõ do thiếu `.env.test.local`; chưa có phiên Auth/database thật để nghiệm thu.
- Acceptance: response giữ refreshed cookies/cache headers; route dữ liệu riêng no-store; integration thiếu env báo fail rõ, không fallback production.
- Verify: unit helpers; integration với Supabase test nếu đã cấu hình; nếu thiếu ghi blocked và tiếp tục P10–P12 độc lập.
- Dependencies: P05/P08.
- Files (5): src/lib/supabase/update-session.ts, src/proxy.ts, tests/integration/connectivity.test.ts, tests/integration/setup.ts, tests/unit/session-response.test.ts.

## P10 — Liveness và log giới hạn dữ liệu
- [x] Thêm health handler và logger nhận whitelist fields.
- Acceptance: health 200/no-store chỉ status, không giả DB healthy; log không body/token/cookie.
- Verify: unit health/logger; gọi health khi chạy production local.
- Dependencies: P07.
- Files (4): src/app/api/health/route.ts, src/lib/logger.ts, tests/unit/health.test.ts, tests/unit/logger.test.ts.

## Checkpoint C — Ranh giới backend
- [x] Kiểm tra env/server-only/cookie handling; unit/typecheck/lint/build đạt. Kết nối Supabase vẫn blocked, không đánh dấu pass.

## P11 — Nghiệm thu browser nền tảng
- [x] Playwright smoke, locale, keyboard/overflow và axe ở vi/en. 15/15 pass, 0 skip; screenshots desktop/mobile đã lưu và xem.
- Acceptance: production server chạy; 390×844/1440×900 screenshots, thêm overflow 320px; lỗi console/request được xử lý; serious/critical axe = 0.
- Verify: `npm run build`, `npm run test:e2e`; lưu report/screenshot, không thay kết quả thật bằng mock browser.
- Dependencies: P06/P09/P10; nếu P09 thiếu cấu hình, kiểm tra shell độc lập và nêu rõ integration chưa hoàn tất.
- Files (5): playwright.config.ts, e2e/platform.spec.ts, e2e/accessibility.spec.ts, package.json, package-lock.json.

## P12 — Bàn giao chặng và ghi trạng thái
- [x] README chạy local/config/tests; tổng hợp nguồn, kết quả, blockers; review code bằng skill tương ứng.
- Acceptance: lệnh tài liệu đúng với scripts; báo riêng pass/fail/blocked/not-run; không công bố ứng dụng hoàn thành toàn bộ.
- Verify: đọc lại README đối chiếu package.json, kết quả thực và diff; chạy lại check chỉ khi có thay đổi liên quan.
- Dependencies: P11.
- Files (4): README.md, docs/TEST-RESULTS.md, docs/PLATFORM-SOURCES.md, STATUS.md.

## Checkpoint D — Kết thúc platform
- [x] Tất cả check độc lập đạt, integration thật ghi blocker rõ; review artifact trước chuyển sang spec identity theo workflow.
- [x] Không đổi tiêu chí hay xóa test chỉ để xanh. Mọi thiếu sót tiếp tục là công việc chưa hoàn tất.
