# SlimeXlink — verification

Tiếp tục theo bản đồ đã duyệt và chỉ đạo người dùng “chạy tiếp đến khi hoàn thành dự án”. Quyết định triển khai nhỏ do agent chủ động; thay đổi phí/dữ liệu thật/quyền ngoài phạm vi vẫn cần thông tin người dùng.

## Mục tiêu
Mở từng nhiệm vụ sang tab mới, chờ ngẫu nhiên 4–8 giây, quay lại sớm thất bại và làm lại.

## Thiết kế và ranh giới
PostgreSQL giữ attempt ID, bắt đầu/thời gian yêu cầu/trạng thái. Client không đặt completed. POST return ràng buộc visitor/session/link revision/task/attempt; server so sánh thời gian. Visibility chỉ phục vụ UX và không chứng minh người dùng xem đúng tab hoặc follow.

## Nghiệm thu
Early return thất bại, đủ thời gian done, retry/doubleclick/concurrency; task đã done idempotent; link sửa/tắt/hết hạn chặn attempt.

## Lệnh kiểm tra
`npm run test:unit -- --run`, `npm run test:integration -- --run`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`. Không hạ quy tắc hoặc skip test để xanh.
