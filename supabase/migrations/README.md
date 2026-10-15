# Migrations SlimeXlink

Có identity, Storage avatar, links/targets/tasks, phiên mở khóa/events, reports/contact/audit và các RPC/RLS. Seed chỉ ở supabase/seed.sql, yêu cầu opt-in development và owner @example.test; không áp dụng production.

Mỗi module tiếp theo thêm schema, RLS, GRANT và tests A/B/khách trong cùng lát cắt.
URL đích nằm ở vùng dữ liệu riêng, không xuất hiện trong DTO công khai.

Khi có CLI: kiểm tra `supabase --version`, `supabase --help` và subcommand `--help` trước dùng.
Tạo file bằng `supabase migration new <name>`; phát triển trên DB test/local riêng, kiểm tra advisors rồi lưu migration đã review.
Không sửa migration đã áp dụng production. Dùng migration bù và backup trước thay đổi dữ liệu.
Không chạy reset/push vào production để kiểm thử. Seed chỉ chứa dữ liệu phát triển được ghi nhãn.

Xem docs/DEPLOYMENT.md trước dùng CLI với project đã áp dụng SQL Editor: cần đối chiếu và repair migration history, không chạy lại CREATE hoặc reset.
