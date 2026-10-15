# Identity tasks

Checkpoint lịch sử; xem STATUS.md cho trạng thái 2026-10-16. Các checkbox dưới giữ nguyên khi acceptance gốc (generated types, email sink/production OAuth) chưa được chứng minh đầy đủ. Avatar/recovery/default signup link hiện đã có source và test thực; template OTP đã bỏ theo yêu cầu người dùng.

Kế hoạch đã duyệt; đang thực thi. Không thay checklist platform còn mở. Bằng chứng mới: 4 integration thật, 18 E2E giao diện + 1 connected E2E và 17 unit đạt. I01–I04/I08 đã có phần nền và luồng thật; chưa đánh dấu hoàn tất cả task vì typed schema, kiểm thử revocation/admin và các cạnh lỗi còn phải bổ sung. I05/I06 có mã callback/form, chưa nghiệm thu email/Google thật; I07/I09 chưa hoàn tất.

## I01 — Schema và ranh giới quyền
- [ ] Soạn profiles/account_access, provisioning member an toàn, GRANT/RLS và database types.
- Acceptance: role/status chỉ server/database sửa; mọi bảng exposed RLS; không copy role từ signup metadata.
- Verify: unit contract/schema; khi có test DB, kiểm tra trực tiếp A/B/guest và advisors.
- Slices: migration + generated types; policy tests + fixtures. Tạo migration bằng CLI sau khi kiểm tra --help; không tự chế lịch sử production.
- Dependencies: không; cần quyền DB test để chạy thật.

## I02 — Guards và trang tài khoản được bảo vệ
- [ ] requireActor/requireAdmin, dashboard entry, trạng thái hết phiên/bị khóa vi/en.
- Acceptance: kiểm tra server mỗi thao tác; thiếu role record fail closed; logout vẫn dùng được khi khóa.
- Verify: unit guard outcomes; integration token cũ/account suspended/admin/member; E2E dashboard guest.
- Slices: guards + tests; layout/dashboard + dictionary. Mỗi lát cắt tối đa khoảng 5 file.
- Dependencies: I01.

## I03 — Rate limit nhiều instance
- [ ] Atomic DB limiter, định danh băm không lưu IP/email thô, cleanup bucket hết hạn.
- Acceptance: client không sửa counter; request đồng thời không vượt quota; lỗi DB không mở cửa Auth mutation.
- Verify: unit key/window; integration concurrency/retry và permission RPC.
- Slices: migration/RPC; adapter/tests. Dependencies: I01.

## I04 — Đăng nhập và đăng xuất
- [ ] Form/login action, validation, lỗi được dịch và logout server.
- Acceptance: email/password dùng Supabase thật, session cookie an toàn, không lộ dữ liệu qua back/direct route; returnTo allowlist.
- Verify: RED/GREEN validation/redirect/error mapping; integration login/logout/revocation; E2E keyboard/vi/en.
- Slices: schemas + safe URL + tests; action/guard integration; form/page/dictionaries. Dependencies: I02/I03.

## I05 — Đăng ký và xác nhận email
- [ ] Signup/resend, template song ngữ, confirm handler.
- Acceptance: chưa xác nhận không vào dashboard; callback sai/hết hạn/reused báo lỗi rõ; provisioning không nhân đôi khi retry.
- Verify: integration/Auth thật và E2E qua email sink; fixture admin-created user không thay luồng xác nhận.
- Slices: signup action/tests; form; template + confirm handler/tests. Dependencies: I04, email sink.

## I06 — Google đăng ký/đăng nhập
- [ ] Provider config flag và server start action, callback PKCE, lỗi consent/callback vi/en.
- Acceptance: chưa cấu hình bị chặn cả UI/server; không yêu cầu quyền YouTube; callback chỉ route an toàn.
- Verify: unit thiếu config/sai callback; controlled harness; smoke Google thật ghi riêng khi có tài khoản test được cấp phép.
- Slices: config/action; callback; UI/docs. Dependencies: I04/I05.

## I07 — Khôi phục mật khẩu
- [ ] Forgot form/action và recovery context một lần, trang reset/password action.
- Acceptance: không tiết lộ email tồn tại, recovery ràng buộc user/session/expiry; replay hoặc query giả không cấp quyền reset.
- Verify: unit before/at/after expiry; integration sai phiên/retry/concurrency; E2E email sink → mật khẩu mới.
- Slices: migration/intent helpers; callback; forgot/reset UI/actions. Dependencies: I03/I05.

## I08 — Hồ sơ chủ sở hữu
- [ ] Settings/profile đọc và sửa tên hiển thị bằng session.
- Acceptance: không nhận role/status/email trong profile mutation; B/guest không sửa A; lỗi mạng không báo success.
- Verify: direct API RLS và unit validation; E2E lưu/reload/vi/en. Slices: server action + tests; page/form + dictionaries.
- Dependencies: I02/I04.

## I09 — Avatar private
- [ ] Bucket/policies, upload handler cap 1 MiB/MIME/byte signature, signed display và cleanup an toàn.
- Acceptance: đúng owner path; request giả userId vô hiệu; race không xóa avatar đang tham chiếu; không SVG/fetch URL ngoài.
- Verify: unit file validation, direct Storage API A/B/guest; oversized/path spoof/concurrency; E2E upload/replace.
- Slices: policies; file validation/tests; handler; profile display/cleanup. Dependencies: I08.

## I10 — Nghiệm thu module
- [ ] Chạy lint/typecheck/unit/build, integration thật và E2E; review security/React, docs cài đặt và trạng thái.
- Acceptance: đủ evidence quyền user/admin, locked user, recovery/callback, email sink; không gọi mock là xác minh provider thật.
- Verify: giữ toàn bộ test platform; desktop/mobile/axe/keyboard; secret scan và audit; chưa có dữ liệu thì không công bố thành công.
- Slices: integration suites; E2E suites; docs/review. Dependencies: I01–I09.

## Điều kiện môi trường trước test ghi dữ liệu
- [ ] Xác nhận project test riêng và không chứa dữ liệu thật.
- [ ] Cấu hình TEST_* và service credential trực tiếp local/CI, không trong chat/Git.
- [ ] Có quyền áp dụng SQL/migrations hoặc người dùng chạy migration đã review.
- [ ] Email sink hoạt động; Google smoke chỉ khi provider/tài khoản test được cấu hình.


## Checkpoint 2026-10-15 — Google và gửi lại xác nhận

- Người dùng xác nhận Google đăng nhập → dashboard → đăng xuất → đăng nhập lại thành công trên local. Đây là smoke do người dùng thực hiện; chưa kiểm thử Vercel.
- Thêm /vi/confirm-email và /en/confirm-email, liên kết từ login/register; dùng Supabase auth.resend với callback cố định. Limiter PostgreSQL 3 lần/email/15 phút; không tiết lộ email tồn tại/đã xác nhận qua phản hồi provider.
- RED: 3 unit resend thất bại trước implementation. GREEN: toàn bộ 20 unit đạt; 4 integration Supabase đạt; 3 E2E identity đạt (vi/en, guest guard, callback, axe cho form mới). Typecheck, lint và production build đạt. Test E2E Google button theo cờ cấu hình thay vì luôn đòi disabled.
- Unit resend dùng provider mock, không phải bằng chứng email đã gửi. Chưa kiểm thử SMTP/email sink, resend → xác nhận qua hộp thư; recovery/avatar còn mở. Không có migration mới trong lát cắt này.
- Nguồn API: https://supabase.com/docs/reference/javascript/auth-resend (đọc qua agent-reach/Jina).


## Recovery checkpoint — 2026-10-15
- Thêm forgot/reset vi/en và liên kết từ login. Dùng Reset password email mặc định, callback PKCE chỉ cấp quyền khi SDK phát PASSWORD_RECOVERY. Cookie có chữ ký, gắn user/session, hạn 15 phút; PostgreSQL limiter đã có làm kho nonce tiêu thụ một lần, không thêm migration/dịch vụ. Quyết định và giới hạn: docs/RECOVERY.md.
- 30/30 unit đạt; 5/5 integration thật đạt (8 request đồng thời max1 chỉ một thắng); 25/25 toàn bộ E2E đạt; typecheck, lint và production build đạt. Đã xem ảnh forgot-password-vi-390.png và reset-password-1440.png.
- Browser harness thật dùng Admin API tạo recovery OTP không gửi email, mint cookie test ở phía test, thực hiện reset qua form ứng dụng rồi xác minh mật khẩu cũ bị từ chối/mật khẩu mới hoạt động/replay bị chặn. Không coi harness là test email delivery hoặc callback PKCE end-to-end.
- I07 chưa nghiệm thu toàn bộ: cần email sink/hộp thư test để đi qua email → callback thật. I09 avatar là việc kế tiếp. Google smoke trước đó do người dùng xác nhận, không tự động tương tác tài khoản Google thật.
