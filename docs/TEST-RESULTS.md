# Kết quả kiểm thử platform — SlimeXlink

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
