# Khảo sát ban đầu — 2026-10-15

## Công cụ và môi trường

- Workspace trống; không tìm thấy AGENTS.md trong workspace hoặc các thư mục cha đã kiểm tra đến C:/.
- Đã đọc using-agent-skills, spec-driven-development, planning-and-task-breakdown, agent-reach và web reference, browser-testing-with-devtools, computer-use.
- `agent-reach doctor --json`: web active_backend = Jina Reader. Một số backend khác không cài hoặc timeout; không cần đăng nhập các nền tảng để khảo sát này.
- Jina trong sandbox lỗi DNS; chạy lại với quyền mạng được cấp thành công. `agent-reach check-update` cũng thử lại ngoài sandbox: v1.5.0, hiện mới nhất theo kết quả công cụ.
- Không có Chrome DevTools MCP được công bố trong tool inventory. Dùng cua_repl với Codex In-app Browser; xem screenshot và accessibility tree. Đặt viewport desktop 1440×900 và mobile 390×844 rồi reset. Screenshot ngay sau thay viewport desktop chưa phản ánh kích thước mới; screenshot trang browse tiếp theo thể hiện bố cục desktop.
- Node v24.21.0, npm 11.19.0, Git 2.56.0.windows.2. Docker không nằm trên PATH; không tìm được lệnh Supabase CLI trên PATH. Chưa cài dependency, chưa có lockfile, chưa chạy test/build.

## Quan sát thực tế

| Trang | Đã quan sát | Giới hạn |
|---|---|---|
| [Trang chủ](https://linkunlocker.com/) | Jina + trình duyệt: nền gần đen, nhấn xanh mint, sans-serif đậm, hero giữa trang, CTA tạo link/khám phá; ba bước, hình dashboard, danh mục link, footer | Chưa xác định tên font; hình dashboard không chứng minh backend thực hoạt động |
| [Khám phá](https://linkunlocker.com/browse) | Jina + screenshot desktop: navigation ngang, ô tìm kiếm, tab Trending/Latest/Most unlocked, lưới bốn cột; thẻ ảnh/tác giả/số nhiệm vụ | Chưa thao tác tìm kiếm/sort, chưa chứng minh phân trang; số liệu chỉ là nội dung trang mẫu, không dùng cho SlimeXlink |
| [Hướng dẫn](https://linkunlocker.com/docs) | Jina + browser, browser chuyển tới /docs/anti-bypass; tài liệu mô tả token ngắn hạn và API mã hóa/validate | Đây là tài liệu do nhà cung cấp viết; chưa gọi API hay kiểm thử chống bypass |
| [Trang mở khóa](https://linkunlocker.com/parallax-script-AxX2H) | Browser + screenshot mobile: ảnh, tiêu đề, tác giả, tiến trình, nhiệm vụ, nút unlock disabled; có bước quảng cáo tài trợ và Join server | Chỉ xem trang; không bấm nhiệm vụ, quảng cáo, join hay tải nội dung; chưa xác minh cơ chế kiểm tra bên ngoài |
| [Đăng nhập](https://linkunlocker.com/login) | Browser + screenshot mobile: Google, email magic link, label, focus xanh, CTA; không mật khẩu trên form quan sát | Không nhập/gửi email, không đăng ký/đăng nhập; SlimeXlink vẫn theo yêu cầu email/mật khẩu/reset của người dùng |

Không truy cập dashboard có xác thực. Không sao chép branding, tài nguyên, doanh thu, số người dùng hoặc lời chứng thực. Các screenshot xem trong công cụ chưa lưu thành artifact repository. Chưa kiểm tra console/network hoặc accessibility tự động; đây là khảo sát, không phải nghiệm thu ứng dụng.

## Điều suy luận / quyết định riêng cho SlimeXlink

- Mượn nhịp bố cục và tương phản tối/xanh; dùng nội dung tiếng Việt, thương hiệu riêng và ví dụ phát triển được ghi nhãn.
- Không suy ra rằng nút nhiệm vụ hoặc dấu hoàn thành đồng nghĩa nền tảng đã xác minh follow.
- Không sao chép cơ chế truyền token bí mật qua query trong ví dụ tài liệu trang mẫu.
- Theo điều chỉnh của người dùng sau khảo sát, SlimeXlink dùng cho mục đích cá nhân: loại bỏ kiếm tiền, trạng thái kiếm tiền và quảng cáo tài trợ khỏi phạm vi.

## Tài liệu tích hợp đã đọc

[YouTube subscriptions.list](https://developers.google.com/youtube/v3/docs/subscriptions/list), đọc qua Jina: `mine=true` yêu cầu request được cấp quyền; `forChannelId` lọc kênh đích. Đây là ứng viên kỹ thuật kiểm tra subscription của người đã OAuth, không phải khả năng xác minh mọi người bằng API key. Chưa khảo sát đủ chính sách khuyến khích subscribe, consent verification và hạn mức để kích hoạt tính năng.

## Nghiên cứu còn phải làm ở giai đoạn spec

- Tài liệu chính thức Next.js/Supabase SSR, Auth, RLS, Storage; Vercel runtime, gói và điều kiện thương mại; xác nhận phiên bản tương thích từ nguồn chính thức.
- Discord OAuth scopes và endpoint membership; YouTube chính sách và yêu cầu phê duyệt; chỉ chọn adapter được phép thực tế.
- Test search/sort và các trạng thái công khai bổ sung nếu cần, không thực hiện nhiệm vụ thật.
- Xác định Supabase thử nghiệm riêng (local cần Docker hoặc hosted test project), email sink, OAuth sandbox và quyền deploy Vercel. Không yêu cầu gửi secret vào chat.
