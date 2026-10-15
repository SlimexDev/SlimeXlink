# Migrations SlimeXlink

Chưa có bảng nghiệp vụ ở module platform. Không có seed production hoặc schema giả.

Mỗi module tiếp theo thêm schema, RLS, GRANT và tests A/B/khách trong cùng lát cắt.
URL đích nằm ở vùng dữ liệu riêng, không xuất hiện trong DTO công khai.

Khi có CLI: kiểm tra `supabase --version`, `supabase --help` và subcommand `--help` trước dùng.
Tạo file bằng `supabase migration new <name>`; phát triển trên DB test/local riêng, kiểm tra advisors rồi lưu migration đã review.
Không sửa migration đã áp dụng production. Dùng migration bù và backup trước thay đổi dữ liệu.
Không chạy reset/push vào production để kiểm thử. Seed chỉ chứa dữ liệu phát triển được ghi nhãn.
