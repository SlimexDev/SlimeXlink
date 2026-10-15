# SlimeXlink — analytics

Tiếp tục theo bản đồ đã duyệt và chỉ đạo người dùng “chạy tiếp đến khi hoàn thành dự án”. Quyết định triển khai nhỏ do agent chủ động; thay đổi phí/dữ liệu thật/quyền ngoài phạm vi vẫn cần thông tin người dùng.

## Mục tiêu
Thống kê thực lượt xem và mở khóa theo ngày/khoảng 7/30/90 ngày.

## Thiết kế và ranh giới
Mỗi link/visitor-cookie/event-kind/ngày UTC đếm một lần bằng unique constraint. Không gọi đây là người dùng duy nhất. View ghi khi tạo/khôi phục phiên, unlock chỉ khi consume redirect thành công. Events giữ 90 ngày; sessions hết hạn dọn sau 1 ngày.

## Nghiệm thu
Retry/race không đếm trùng; owner chỉ xem của mình; range hữu hạn và timezone UTC được ghi rõ; không số liệu mẫu production.

## Lệnh kiểm tra
`npm run test:unit -- --run`, `npm run test:integration -- --run`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`. Không hạ quy tắc hoặc skip test để xanh.
