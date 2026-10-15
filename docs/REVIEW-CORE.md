# Rà soát core — 2026-10-16

Đã rà các đường gọi creator Server Actions → RPC, guest session/task/grant → service-only RPC, redirect → consume, moderation → transaction/audit và Storage upload.

Các lỗi đã sửa có bằng chứng test: nhãn logo dư gây axe mismatch; revision editor cũ sau save gây xóa thất bại; range khám phá ngoài dữ liệu gây PGRST103; dynamic catch-all nội dung làm streaming 404 trả 200; prefetch các route động gây request hủy và truy vấn không cần thiết; URL thiếu // hoặc có backslash được URL parser chuẩn hóa ngoài ý muốn.

Ranh giới bảo mật được kiểm trực tiếp: A/B/guest ownership, member không tự nâng role, account suspended với JWT đang tồn tại, admin RPC và admin_directory, avatar private/read và CAS, link_targets không cho guest/client khác đọc, token sai hash/link/visitor/expiry/replay, concurrent consume, link disabled/revision đổi. Không có test skip/only hoặc ts-ignore/eslint-disable mới.

Giới hạn còn lại cần chủ dự án biết: kiểm tra visibility ở browser headless được phát sự kiện có kiểm soát; không chứng minh đúng tab ngoài. Chưa chạy signup/recovery nhận email thật hay Google trên domain deploy. CI workflow chưa chạy GitHub. Chưa đo Core Web Vitals trên deployment thật. Ảnh link orphan cần quản trị dọn sau kiểm tra tham chiếu. Runtime npm audit 0; dev ESLint chain còn 5 high từ braces, chưa có cập nhật tương thích được xác nhận; không downgrade Next/lint để làm xanh.

Không coi kiểm thử fixture admin-confirmed là nghiệm thu luồng gửi email. Không coi build local thành công là deployment Vercel thành công.
