# SlimeXlink — discovery-content

Tiếp tục theo bản đồ đã duyệt và chỉ đạo người dùng “chạy tiếp đến khi hoàn thành dự án”. Quyết định triển khai nhỏ do agent chủ động; thay đổi phí/dữ liệu thật/quyền ngoài phạm vi vẫn cần thông tin người dùng.

## Mục tiêu
Trang chủ, khám phá search/filter/sort/pagination; hướng dẫn/liên hệ/report/chính sách; SEO vi/en.

## Thiết kế và ranh giới
Khám phá server chỉ lấy listed+enabled+chưa hết hạn+owner active với DTO trường allowlist. Unlisted vẫn truy cập nếu biết URL, noindex. Chính sách source là bản nháp chỉnh sửa được; form liên hệ ghi DB không tự gửi email.

## Nghiệm thu
URL search/filter/page hoạt động; guest không thấy disabled/unlisted trong discovery; keyboard/mobile/axe; sitemap chỉ trang public hợp lệ; dashboard noindex.

## Lệnh kiểm tra
`npm run test:unit -- --run`, `npm run test:integration -- --run`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`. Không hạ quy tắc hoặc skip test để xanh.
