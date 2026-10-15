# SlimeXlink — moderation

Tiếp tục theo bản đồ đã duyệt và chỉ đạo người dùng “chạy tiếp đến khi hoàn thành dự án”. Quyết định triển khai nhỏ do agent chủ động; thay đổi phí/dữ liệu thật/quyền ngoài phạm vi vẫn cần thông tin người dùng.

## Mục tiêu
Báo cáo link, admin danh sách người/link/báo cáo, tìm kiếm/lọc/khóa và audit.

## Thiết kế và ranh giới
Quyền admin từ account_access đang active, kiểm tra trong RPC và RLS; không tự cấp admin đầu tiên. Không cho khóa tài khoản admin qua UI này. Thao tác link tăng revision. Audit actor/action/target/reason/time cùng transaction. Report guest có quota.

## Nghiệm thu
Member không gọi được admin RPC hoặc đọc report/audit; khóa member chặn dữ liệu và mở khóa link; mỗi hành động có audit; report có trạng thái.

## Lệnh kiểm tra
`npm run test:unit -- --run`, `npm run test:integration -- --run`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`. Không hạ quy tắc hoặc skip test để xanh.
