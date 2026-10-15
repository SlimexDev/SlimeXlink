# SlimeXlink — bản đồ module đề xuất

Ngày: 2026-10-15 (Asia/Saigon). Trạng thái: **người dùng đã duyệt Phase 0** trong chat: “tôi đã duyệt bản đồ module này r”.
Bản đồ module đã duyệt; đặc tả từng module vẫn có bước duyệt riêng. Chưa có mã ứng dụng hay cam kết chức năng hoạt động.

## Phạm vi và phụ thuộc

Điều chỉnh theo người dùng: website phục vụ mục đích cá nhân. Loại bỏ hoàn toàn module kiếm tiền khỏi phạm vi hiện tại, bao gồm cả trang/trạng thái “chưa kích hoạt”, doanh thu, số dư, rút tiền, thanh toán và quảng cáo tài trợ. Các yêu cầu tài khoản, quản lý link, khám phá và quản trị còn lại giữ nguyên; mục đích cá nhân chưa đồng nghĩa chỉ một tài khoản được tạo link.

Điều chỉnh ngôn ngữ: hỗ trợ tiếng Việt (`vi`, mặc định) và tiếng Anh (`en`). Có bộ chọn ngôn ngữ, ghi nhớ lựa chọn và giữ ngữ cảnh trang khi chuyển. Toàn bộ giao diện, validation, thông báo, trạng thái, hướng dẫn và chính sách bản nháp có bản dịch tương ứng. Nội dung link do người dùng nhập giữ nguyên, không tự dịch. Tách bản dịch khỏi component để có thể bổ sung ngôn ngữ sau này; định dạng ngày giờ/số theo locale. Metadata, thuộc tính `lang`, canonical/hreflang và sitemap phải nhất quán với chiến lược URL đa ngôn ngữ được chốt trong spec. Email Auth dùng nội dung song ngữ Việt/Anh ban đầu; không hứa tự chọn locale cho từng email trước khi kiểm chứng khả năng cấu hình Supabase.

| Module id | Trách nhiệm | Phụ thuộc |
|---|---|---|
| platform | Next.js App Router, TypeScript strict, npm/lockfile, Supabase clients, migrations, UI nền tối, nền tảng i18n Việt/Anh và chọn ngôn ngữ, môi trường và bộ test | — |
| identity | Đăng ký, xác nhận email, mật khẩu, phiên, Google có điều kiện, hồ sơ/avatar; trạng thái khóa và quyền quản trị chỉ server/database được sửa | platform |
| creator-links | CRUD/sao chép link, slug, ảnh, URL đích riêng tư, công khai/không niêm yết, bật/tắt/hết hạn, cấu hình và sắp xếp nhiệm vụ, preview | identity |
| verification | Nhiệm vụ mở liên kết và chờ 4–8 giây; theo dõi rời/quay lại tab SlimeXlink, quay lại sớm phải làm lại; server quản lý attempt/thời hạn/kết quả. Không coi là xác minh follow/subscribe | creator-links |
| unlock | Phiên khách phía server, tiến trình, cấp/tiêu thụ token, kiểm tra điều kiện tại redirect, chống retry/trùng và rate limit dùng database | verification |
| discovery-content | Trang chủ, khám phá/tìm kiếm/lọc/sắp xếp/phân trang, hướng dẫn/liên hệ/chính sách bản nháp chỉnh sửa trong source, metadata/OG/sitemap/robots | creator-links |
| analytics | Lượt xem/mở khóa từ sự kiện server, chống đếm trùng, khoảng thời gian, lưu giữ và tổng hợp | unlock |
| moderation | Báo cáo vi phạm, quản trị người dùng/link/báo cáo, khóa tài khoản, tắt link và audit log | identity, creator-links |
| release | CI, kiểm thử tổng hợp, hướng dẫn Supabase/Vercel/email/OAuth/Storage, health check, backup/rollback và nghiệm thu triển khai | tất cả module trên |

Thứ tự: platform → identity → creator-links → verification → unlock → discovery-content → analytics → moderation → release.

Kiểm thử và bảo mật đi cùng từng module; release tổng hợp bằng chứng, không phải đợi đến cuối mới kiểm thử. Không dùng agent song song ở giai đoạn này.

## Hướng kiến trúc để duyệt ranh giới

- Một ứng dụng Next.js trên Vercel; PostgreSQL/Auth/Storage của Supabase. Không Redis, queue hay microservice.
- Dữ liệu hiển thị link và URL đích tách riêng. DTO công khai chỉ lấy trường được phép; không đưa URL đích vào HTML, RSC payload, JS, localStorage, metadata hay URL chia sẻ.
- RLS trên bảng liên quan; quyền quản trị/trạng thái khóa tách khỏi trường hồ sơ người dùng có thể sửa. UI không phải ranh giới phân quyền.
- Thay đổi cấu hình link tăng revision; phiên và token gắn với link, revision, thời hạn và cookie phiên. Redirect kiểm tra lại link, chủ sở hữu bị khóa và nhiệm vụ trong giao dịch phù hợp.
- Rate limit, unique constraints và thao tác nguyên tử trong PostgreSQL để hoạt động trên nhiều instance Vercel. Chi tiết hợp đồng/RPC được xác định trong spec từng module.
- Theo yêu cầu điều chỉnh mới, nhiệm vụ cơ sở dùng thao tác mở link và thời gian chờ 4–8 giây, thay yêu cầu trước đây không dùng timer cho luồng này. Không gọi kết quả timer là xác minh theo dõi, đăng ký kênh hay tham gia server. Xem docs/TASK-FLOW.md.
- Luồng nhiệm vụ mới không cần OAuth nền tảng. Adapter tương tác xác minh thật được hoãn khỏi triển khai hiện tại; OAuth Google đăng nhập trong identity vẫn giữ nguyên.
- Không niêm yết vẫn có thể truy cập bằng URL. Sau khi nhận URL đích, người nhận có thể chia sẻ lại; không hứa chống bypass tuyệt đối.
- npm là package manager đề xuất; phiên bản package chưa chọn, phải đối chiếu tài liệu chính thức và registry trước cài đặt.

## Điểm nghiệm thu theo module (đề xuất)

| Module | Bằng chứng bắt buộc trước khi ghi hoạt động |
|---|---|
| platform | Typecheck/lint/unit/build thực chạy; biến môi trường được kiểm tra; không secret trong client; bản dịch vi/en đủ key, mặc định vi, chuyển và ghi nhớ ngôn ngữ đúng |
| identity | Test đăng ký/xác nhận/reset/logout; phiên hết hạn; A/B/khách không vượt quyền; avatar đúng chủ sở hữu |
| creator-links | CRUD và nhiệm vụ lưu DB thật; A không đọc/sửa URL đích B; validation URL/slug/expiry; xác nhận xóa |
| verification | Từng nhiệm vụ phải mở riêng; quay lại sớm báo lỗi và reset attempt đó; đủ thời gian được server ghi hoàn thành; không có endpoint cho client tự đặt completed; test retry/race/expiry và ghi rõ visibility không phải bằng chứng tin cậy về tab bên ngoài |
| unlock | Không lộ đích trước mở khóa; token hết hạn/sai link/sai phiên/replay thất bại; race/retry không ghi trùng; tắt/sửa link chặn redirect cũ |
| discovery-content | Chỉ link cho phép niêm yết; tìm kiếm/lọc/sort/page hoạt động; noindex dashboard và trang không niêm yết; trạng thái lỗi/rỗng/loading |
| analytics | Định nghĩa view/unlock và khoảng thời gian; test dedup/concurrency; số liệu thực, không suy ra người dùng duy nhất từ cookie |
| moderation | Quyền admin kiểm tra server/database; chống tự nâng quyền; tài khoản khóa không tiếp tục thao tác; audit đầy đủ |
| release | Supabase test thật, E2E email kiểm soát, desktop/mobile/keyboard/a11y, CI/build đạt; luồng chính kiểm tra ở cả vi/en, không lộ translation key và không tràn layout do bản dịch; hướng dẫn deploy và rollback; smoke test URL nếu có quyền |

## Các bước duyệt theo skill

1. Duyệt bản đồ module này trước khi viết spec module.
2. Viết và duyệt `SPEC-<module-id>.md` theo thứ tự phụ thuộc.
3. Sau spec được duyệt, lập `tasks/plan.md`, `tasks/todo.md` với lát cắt nhỏ và kiểm tra cụ thể; duyệt trước thực thi.
4. Triển khai từng luồng, cập nhật trạng thái và bằng chứng thực chạy.

Phase 0 hoàn tất. Đặc tả đầu tiên: SPEC-platform.md. Kế hoạch thực thi chi tiết được lập sau khi đặc tả này được duyệt.
