# Khôi phục mật khẩu

Luồng Việt/Anh: đăng nhập → Quên mật khẩu → email **Reset password** mặc định của Supabase → callback → nhập mật khẩu mới hai lần → đăng xuất toàn bộ phiên và về trang đăng nhập. Không cần sửa mẫu email hoặc cài thêm dịch vụ để dùng luồng mặc định với các địa chỉ được Supabase cho phép.

## Cấu hình

- Dùng đúng `NEXT_PUBLIC_SITE_URL` trong suốt luồng, ví dụ `http://localhost:3000`; không đổi sang `127.0.0.1` giữa chừng.
- Supabase Auth Redirect URLs phải có `/auth/callback?locale=vi` và `/auth/callback?locale=en` trên origin này, giống Google và xác nhận đăng ký.
- Bật email provider; giữ nguyên mẫu Reset password mặc định. Dịch vụ gửi mặc định có giới hạn địa chỉ và quota; để phát hành cần SMTP riêng.
- `AUTH_RATE_LIMIT_SECRET` có ít nhất 32 ký tự, chỉ ở server, dùng chung giữa các instance. Thay secret sẽ hủy các quyền khôi phục đang chờ.
- Email PKCE phải được mở bằng trình duyệt đã gửi yêu cầu. Luồng sai trình duyệt, liên kết cũ hoặc dùng lại phải yêu cầu email mới.

## Ranh giới quyền

Query `type=recovery`, đường dẫn reset hoặc phiên đăng nhập bình thường không cấp quyền đổi mật khẩu trong ứng dụng. Callback chỉ cấp cookie khôi phục khi Supabase SDK phát sự kiện `PASSWORD_RECOVERY` sau khi trao đổi code PKCE thành công. Cookie HttpOnly/SameSite=Lax/Secure chứa grant có chữ ký HMAC, gắn user ID/session ID, nonce ngẫu nhiên 256 bit và hạn 15 phút. Quyền được kiểm tra lại cùng Auth user, role/status trong database và JWT claims đã xác minh trước khi cập nhật.

Quyết định triển khai thay bảng intent riêng trong kế hoạch ban đầu: tận dụng RPC `consume_auth_limit` đã có. Grant có chữ ký chứng minh việc cấp; khi sử dụng, server lưu digest HMAC của nonce vào bảng private và tiêu thụ atomically với `max_attempts=1`. Không lưu grant, cookie hay token Auth trong database/log. Cookie hết hạn trước khi bucket có thể được dùng lại. Các instance Vercel dùng chung PostgreSQL nên hai request đồng thời chỉ một request thắng.

Tiêu thụ quyền trước khi gọi Auth updateUser để tránh cập nhật đồng thời. Nếu Auth lỗi sau khi quyền đã tiêu thụ, phải yêu cầu liên kết mới; không tự khôi phục quyền vì kết quả giao dịch ngoài database có thể chưa chắc chắn. Không có giao dịch phân tán giữa PostgreSQL limiter và Supabase Auth.

Gửi yêu cầu tối đa 3 lần/email/15 phút, định danh chỉ lưu băm trong limiter. Phản hồi không phân biệt tài khoản tồn tại; lỗi provider ghi diagnostic không chứa email/token/mật khẩu. Rate limits trực tiếp của Supabase Auth vẫn cần cấu hình riêng. Proxy kiểm tra Auth user từ server để dọn phiên đã bị thu hồi trước khi Server Components đọc phiên.

Sau đổi mật khẩu, Auth signOut(global) thu hồi refresh sessions; access JWT đã phát có thể còn hạn. Ứng dụng kiểm tra getUser phía server và phân quyền database, không hứa mọi API bên ngoài vô hiệu hóa JWT ngay lập tức.

## Bằng chứng và giới hạn

- Unit: chữ ký, user/session, đúng thời điểm hết hạn, giả query/callback, nonce đã dùng, lỗi provider/database và điều kiện mật khẩu.
- Integration database: 8 request cùng nonce với hạn mức một lần chỉ đúng một request được chấp nhận.
- Browser harness dùng tài khoản disposable và recovery OTP thật do Admin API tạo, không gửi email. Test khởi tạo cookie phiên và grant có chữ ký ở phía test, rồi dùng form ứng dụng để đổi mật khẩu, kiểm tra mật khẩu cũ/mới và thử replay. Đây là bằng chứng cho reset action/guard/RPC/Auth, không thay thế kiểm thử nhận email hoặc callback PKCE qua email thật.
- Gửi email → nhận email → bấm link recovery thật chưa nghiệm thu vì chưa có email sink hoặc hộp thư test được xác nhận. Không đánh dấu toàn bộ I07 hoàn tất.

Nguồn: [Supabase resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow). Đã đọc tài liệu chính thức và kiểm tra SDK đang cài; dùng API sự kiện công khai thay vì trường `redirectType` nội bộ không có trong type contract.
