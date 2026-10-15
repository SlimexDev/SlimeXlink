# SlimeXlink — creator-links

Tiếp tục theo bản đồ đã duyệt và chỉ đạo người dùng “chạy tiếp đến khi hoàn thành dự án”. Quyết định triển khai nhỏ do agent chủ động; thay đổi phí/dữ liệu thật/quyền ngoài phạm vi vẫn cần thông tin người dùng.

## Mục tiêu
Tạo, sửa, sao chép, xóa link và nhiệm vụ; đích riêng tư; slug, ảnh, niêm yết, bật/tắt, hết hạn.

## Thiết kế và ranh giới
Mọi ghi qua RPC kiểm tra auth.uid/status, row lock và revision; client không có quyền ghi bảng. links metadata tách link_targets. Tasks là mảng 1–10 theo thứ tự. URL chỉ http/https, không credentials; không server-fetch URL. Ảnh raster upload có giới hạn, bucket link-images public chỉ đọc.

## Nghiệm thu
A/B/guest không đọc/sửa đích người khác; CRUD thật; CAS conflict; nhiệm vụ reorder; xóa có xác nhận; copy tạo slug mới.

## Lệnh kiểm tra
`npm run test:unit -- --run`, `npm run test:integration -- --run`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`. Không hạ quy tắc hoặc skip test để xanh.
