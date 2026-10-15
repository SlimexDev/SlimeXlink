# Kế hoạch identity — SlimeXlink

Trạng thái: người dùng đã duyệt bằng “tiến hành bước tiếp theo”; đang thực thi. Schema đã được người dùng áp dụng vào project test; xem STATUS.md và docs/TEST-RESULTS.md. Spec: ../SPEC-identity.md.
Giữ nguyên tasks/plan.md và tasks/todo.md của platform vì P09 vẫn còn mở; kế hoạch này có chỉ mục riêng, không ghi đè công việc chưa hoàn tất.

## Phạm vi

Email/password, Google đăng nhập, xác nhận email, reset mật khẩu, logout, profile/avatar và nền phân quyền member/admin. Admin UI đầy đủ thuộc moderation. Không tự cấp admin đầu tiên hoặc tạo tài khoản mạng xã hội để test.

## Quyết định và phụ thuộc

- Tái sử dụng Supabase clients, cookies HttpOnly, shared controls và vi/en dictionaries hiện có.
- Schema profiles và account_access tách riêng; role/status không nằm trong dữ liệu profile được phép sửa. RLS chặn cả request API trực tiếp.
- Guard xác minh identity và trạng thái khóa hiện tại, không tin user_metadata/JWT role cũ làm nguồn quyền duy nhất. Truy vấn người dùng chạy bằng session/RLS; admin client chỉ dùng nghiệp vụ đặc quyền đã kiểm tra quyền.
- Limiter dùng PostgreSQL transaction/atomic counter, không dùng RAM instance. Supabase Auth cần rate limits riêng để bảo vệ API trực tiếp.
- Callback allowlist nội bộ; SITE_URL cố định được validate; không dùng Host header tùy ý. Recovery intent ràng buộc session/user, hạn 15 phút, token chỉ lưu hash phía DB và cookie HttpOnly.
- Avatar bucket private, tối đa 1 MiB, PNG/JPEG/WebP kiểm tra byte signature; cập nhật đường dẫn dùng compare-and-swap hoặc khóa DB phù hợp trước dọn file cũ để tránh race.
- Google off mặc định. Bật sau khi provider Supabase có Client ID/Secret và callback được kiểm tra; chỉ openid/email/profile.
- Chưa có Supabase test env, service key, quyền SQL hoặc email sink được xác nhận. Có thể viết mã/migration/tests độc lập; áp dụng schema và test ghi dữ liệu chỉ vào môi trường test đã được xác nhận, không tự dùng project gắn nhãn production trong dashboard.

## Thứ tự thực thi

I01 schema/RLS → I02 guard → I03 limiter → I04 đăng nhập/logout → I05 đăng ký/xác nhận → I06 Google → I07 recovery → I08 profile → I09 avatar → I10 integration/E2E và bàn giao.

Mỗi đầu việc được chia thành lát cắt 3–5 file; migration chỉ dùng một luồng thực thi để tránh xung đột. Test logic viết trước, kiểm tra RED/GREEN; cập nhật tài liệu trạng thái sau mỗi checkpoint. Danh sách nghiệm thu: identity-todo.md.

## Các checkpoint

1. Schema/guard/limiter: A/B/guest không vượt quyền, member không tự nâng quyền, khóa tài khoản có hiệu lực với token cũ, race không vượt hạn mức.
2. Auth: đăng ký/xác nhận/login/logout/reset bằng email sink, Google thiếu cấu hình bị từ chối UI/server, return URL độc hại bị chặn.
3. Profile/avatar: chỉ đúng chủ sở hữu; lỗi upload/DB không làm mất file hiện tại; đường dẫn/MIME giả bị chặn.
4. Cuối module: typecheck/lint/unit/build/E2E + integration thật; giữ suite platform. Thiếu credential phải ghi BLOCKED, không skip để xanh.

## Rủi ro và xử lý

| Rủi ro | Cách xử lý |
|---|---|
| Chưa rõ project mới dùng test hay production | Chỉ đọc smoke hiện có; xác định môi trường trước migration/test ghi |
| Không có SQL/CLI/MCP credentials | Soạn migration và hướng dẫn áp dụng, không tuyên bố DB đã đổi |
| Email test dùng quota thật | Dùng SMTP sink hoặc local Mailpit; không gửi hàng loạt qua SMTP production |
| RLS lookup quyền bị recursion | Helper private hẹp, search_path cố định, grants tối thiểu; kiểm thử API trực tiếp |
| Logout không vô hiệu hóa JWT ngay | Session-aware checks cho thao tác nhạy cảm và test token/session bị thu hồi |
| Callback/recovery bị replay | PKCE, allowlist và recovery intent dùng một lần có expiry, gắn user/session |

## Bước duyệt

Kế hoạch mới này cần duyệt theo planning-and-task-breakdown trước implementation. Duyệt một lần cho I01–I10; không xin lại cho từng file hoặc lát cắt đã thuộc phạm vi. Thay đổi production/phí/quyền ngoài phạm vi vẫn cần xác nhận cụ thể.
