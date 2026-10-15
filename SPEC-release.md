# SlimeXlink — release

Tiếp tục theo bản đồ đã duyệt và chỉ đạo người dùng “chạy tiếp đến khi hoàn thành dự án”. Quyết định triển khai nhỏ do agent chủ động; thay đổi phí/dữ liệu thật/quyền ngoài phạm vi vẫn cần thông tin người dùng.

## Mục tiêu
CI, tài liệu cài đặt/migrations/Storage/Auth/Vercel/backup/rollback, health, retention cron và bàn giao.

## Thiết kế và ranh giới
npm lockfile, typecheck/lint/unit/integration/build/E2E. E2E/integration chỉ disposable DB với TEST_ALLOW_SUPABASE; không tự gửi thư thật hàng loạt. Vercel là hosting duy nhất. Preview/production DB tách biệt; secrets chỉ local/Vercel.

## Nghiệm thu
Tất cả checks thực chạy, kết quả/bất cập ghi STATUS; không coi email harness là delivery thật; deploy URL chỉ khi có quyền và smoke thành công.

## Lệnh kiểm tra
`npm run test:unit -- --run`, `npm run test:integration -- --run`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`. Không hạ quy tắc hoặc skip test để xanh.
