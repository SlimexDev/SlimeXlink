# SlimeXlink — nền tảng giao diện

Tham chiếu công khai đã quan sát trong RESEARCH.md: trang chủ, browse desktop, unlock/login mobile. Lấy nhịp tối/xanh và độ tương phản; dùng thương hiệu và nội dung riêng, không lấy ảnh/số liệu của trang mẫu.

- Công việc màn hình hiện tại: giới thiệu không gian chia sẻ và thông báo tiến độ phát hành trung thực.
- Hành động chính: xem trạng thái; đổi Việt/Anh. Không có nút giả “tạo link thành công” khi backend chưa có.
- Desktop: header gọn, nội dung chính trái, một panel trạng thái phải; danh sách tiến độ dạng hàng dễ đọc.
- Mobile: nội dung một cột, navigation xuống dòng, select có label, không ẩn phần quan trọng.
- Palette semantic trong globals.css: nền gần đen, surface xanh đậm, text trắng ấm, muted xanh xám, accent mint. Font hệ thống hỗ trợ tiếng Việt; không tải font ngoài.
- State components: loading có role status/aria-busy, error có text và retry, not-found có link về đúng locale. Form Field gắn label và mô tả lỗi, không truyền trạng thái chỉ bằng màu.
- Focus rõ, skip link, reduced-motion, không animation chặn thao tác. Kiểm tra ở 320/390/768/1024/1440px.
- Tránh số liệu giả, card lặp chỉ để trang trí, UI doanh thu/kiếm tiền, dấu “verified” cho timer.

Screenshot và axe/browser evidence xem TEST-RESULTS.md. Thiết kế trang nghiệp vụ sẽ được mở rộng cùng từng luồng đã kết nối dữ liệu thật.
