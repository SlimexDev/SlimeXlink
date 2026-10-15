# Kế hoạch hoàn thiện core

Thực hiện theo yêu cầu tiếp tục đến khi hoàn thành, trong phạm vi bản đồ module đã duyệt. Giữ các checkpoint platform/identity còn thiếu email thật. Không dùng agent song song.

1. Avatar: storage private/read owner, upload server validation 1 MiB, CAS RPC kiểm tra active, cleanup; unit/direct API A/B/guest + browser upload/replace.
2. Creator links: schema + RLS + RPC nguyên tử, Zod contracts, CRUD editor/tasks/image + list/preview/copy/delete. Test DB/API trước UI.
3. Verification/unlock: phiên visitor/attempt/token/events SQL service-only; routes server và client tab flow. Kiểm thử early/replay/race/revision/leak trước nghiệm thu.
4. Public content: homepage, discovery search/filter/sort/page, docs/contact/report/policies, metadata/OG/sitemap/robots.
5. Analytics/moderation: thống kê thật, report/contact persistence, admin mutations kiểm quyền/audit cùng transaction.
6. Release: retention endpoint/cron, CI, fixtures/seed dev, docs deployment/rollback/backup, security review và full suites. Deploy Vercel khi có thông tin/quyền; không tự chuyển hosting.

Mỗi bước lưu kết quả thực chạy trong STATUS.md và docs/TEST-RESULTS.md; test DB chỉ project đã được người dùng xác nhận disposable. SQL Editor qua phiên Supabase được dùng để áp dụng migration có source trong repository; không đọc/copy secret từ browser. Thiếu quyền Vercel/production config chỉ chặn deploy, không dừng phần độc lập.

## Checkpoint 2026-10-16

- Đã triển khai các bước 1–5, schema/RLS/RPC thực chạy trong Supabase test.
- Bước 6: CI/cron/seed/docs đã có source; seed đã chạy trong transaction rollback rồi dọn fixture. Full E2E 29/29, unit 36/36, integration 8/8, lint/typecheck/build đạt. Bổ sung contact trong test quản trị 1/1 đạt.
- Còn ngoài môi trường local: CI GitHub thật; Vercel đúng account/team/repo; Supabase production riêng, SMTP/email delivery và OAuth domain; xoay khóa cũ trước production. Câu hỏi xác định Vercel/repo đã gửi, không yêu cầu secret trong chat.
- Ảnh link orphan hiện dọn có kiểm tra tham chiếu bằng quản trị; cron dọn database. Có giới hạn trong docs/DEPLOYMENT.md.
