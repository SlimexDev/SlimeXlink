# SlimeXlink core

Next.js App Router xử lý UI vi/en, Server Actions cho creator/admin/feedback, Route Handlers cho phiên visitor và redirect. Supabase Auth cấp phiên HttpOnly; Postgres giữ quyền hiện hành trong account_access. Không dùng user_metadata để phân quyền. Storage avatars private; link-images public chỉ chứa ảnh raster đã kiểm tra phía server.

## Ranh giới dữ liệu

links chứa metadata; link_targets tách URL đích. Client chỉ được SELECT dữ liệu riêng qua RLS. CRUD đi qua RPC kiểm tra auth.uid, active account và revision. Guest không có quyền SELECT bảng nghiệp vụ; Next server tạo DTO allowlist cho trang công khai. discoverable_links chỉ service_role được SELECT và chỉ chứa link listed, enabled, chưa hết hạn, owner active.

unlock_sessions và task_results không có client policy/quyền trực tiếp. Cookie visitor ngẫu nhiên được HMAC theo từng link. RPC mở phiên dedup lượt xem theo link/visitor/ngày UTC. Task có attempt, departure timestamp, thời gian 4–8 giây và trạng thái nguyên tử. Chỉ một task running trong phiên. UI gửi fail khi quay về sớm; server không chấp nhận hoàn thành trước thời gian từ departure. Client visibility có thể giả mạo và không chứng minh hành vi trên website khác.

Khi mọi task hoàn thành, server cấp cookie HttpOnly chứa token 256 bit; database chỉ lưu SHA-256, TTL 60 giây. Redirect consume khóa row, kiểm tra visitor/link/revision/expiry/status/completion và token chưa dùng. Destination chỉ xuất hiện trong Location sau consume thành công. Hai request concurrent chỉ một thành công. Chủ sở hữu luôn có thể đọc destination của chính mình trong editor. Sau khi được cấp URL, người nhận có thể chia sẻ lại.

## Phân quyền quản trị

requireAdmin kiểm tra server; moderate_record kiểm tra private.is_admin trong database, cập nhật và ghi admin_audit cùng transaction. Không có endpoint tự nâng role. Cấp admin đầu tiên bằng thao tác SQL có chủ đích của chủ project sau khi xác minh đúng UUID; không tự cấp cho tài khoản đầu tiên đăng ký. Khóa member chặn RLS và link của member đó; UI không khóa admin.

## Rủi ro và vận hành

- Limiter nằm trong Postgres nên chia sẻ giữa Vercel instances. Cookie mới có thể tạo danh tính visitor mới; cần Vercel Firewall nếu bị lạm dụng quy mô lớn. Không triển khai Redis.
- Signed avatar URL còn hiệu lực tối đa 60 giây sau suspension; không cấp URL mới.
- Không tải metadata hoặc URL do người dùng cung cấp trên server; tránh bề mặt SSRF.
- Sổ thống kê 90 ngày, session hết hạn dọn sau 1 ngày, contacts 90 ngày, resolved reports 180 ngày, audit 1 năm. Cron gọi RPC service-only qua bearer CRON_SECRET.
- Security advisor báo ba bảng không policy là deny-by-default có chủ đích; ba RPC SECURITY DEFINER authenticated là API có kiểm quyền nội bộ và được test A/B/admin. Leaked password protection chưa bật trong project thử nghiệm.
- Không có kiếm tiền và không có xác minh follow/subscribe/join qua API xã hội.
