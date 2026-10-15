# SlimeXlink — unlock

Tiếp tục theo bản đồ đã duyệt và chỉ đạo người dùng “chạy tiếp đến khi hoàn thành dự án”. Quyết định triển khai nhỏ do agent chủ động; thay đổi phí/dữ liệu thật/quyền ngoài phạm vi vẫn cần thông tin người dùng.

## Mục tiêu
Phiên khách và chuyển hướng chỉ khi backend xác nhận đủ nhiệm vụ.

## Thiết kế và ranh giới
Cookie visitor/token HttpOnly; chỉ digest nằm DB. Phiên 30 phút, grant 60 giây và dùng một lần. Consume trong transaction khóa link/session, kiểm tra lại revision/enabled/expiry/owner active/all tasks. Đích không nằm HTML/RSC/JS/localStorage hoặc share URL. Shared SQL rate limits.

## Nghiệm thu
Token sai/hết hạn/sai phiên/sai link/replay bị từ chối; concurrent redirect chỉ một thắng; bản HTML không chứa đích; disabled/expired có trang rõ.

## Lệnh kiểm tra
`npm run test:unit -- --run`, `npm run test:integration -- --run`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`. Không hạ quy tắc hoặc skip test để xanh.
