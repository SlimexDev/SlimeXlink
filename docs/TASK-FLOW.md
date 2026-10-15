# Điều chỉnh luồng nhiệm vụ

Trạng thái 2026-10-16: đã triển khai client + Route Handlers + RPC và kiểm thử Supabase/E2E. Spec hiện hành: SPEC-verification.md và SPEC-unlock.md. Headless E2E phát visibility event có kiểm soát; chưa xác nhận chuyển tab tự nhiên trên thiết bị thật.

## Hành vi yêu cầu

1. Khách phải bấm từng nhiệm vụ; mỗi lần chỉ một nhiệm vụ đang thực hiện trong phiên mở khóa.
2. Bấm nhiệm vụ mở liên kết nhiệm vụ trong tab mới. Không mở URL đích nội dung bị khóa.
3. Mặc định thiết kế đề xuất: server chọn số giây nguyên ngẫu nhiên 4–8 cho mỗi attempt và UI thông báo số giây cần chờ trước khi rời trang. Đây là chi tiết mặc định cho khoảng 4–8 giây người dùng đưa ra.
4. Bắt đầu tính khoảng chờ khi nhận được sự kiện trang SlimeXlink chuyển sang hidden cho attempt đã mở. Chỉ bấm rồi ở nguyên trang không được tính hoàn thành.
5. Quay lại SlimeXlink trước thời hạn: nhiệm vụ chuyển đỏ kèm thông báo và nút làm lại. Reset nhiệm vụ đang thực hiện, giữ các nhiệm vụ đã hoàn thành.
6. Quay lại sau đủ thời gian: backend kiểm tra attempt và ghi hoàn thành; UI chuyển xanh. Chỉ khi mọi nhiệm vụ hoàn thành mới bật nút mở khóa cuối. Không tự chuyển URL đích trong tab nền.
7. Popup bị chặn, tab không rời trang, kết nối mất hoặc attempt hết hạn: thông báo rõ và cho thử lại, không tự cấp kết quả hoàn thành.

## Ranh giới kỹ thuật

- Server lưu attempt id, session/link/task/revision, khoảng chờ, timestamp, trạng thái và expiry. Đồng hồ client không quyết định đủ thời gian phía server; completion ghi nguyên tử, idempotent và có rate limit.
- Sự kiện quay lại sớm phải hủy attempt ở UI ngay, không để request hoàn thành chạy sau đó cho cùng attempt. Backend từ chối attempt đã thất bại; thứ tự sự kiện/retry và độ trễ mạng phải được giải quyết trong spec, tránh biến báo cáo quay lại sớm bị chậm thành thành công.
- Không dựa vào setTimeout chạy chính xác trong tab nền; trình duyệt có thể throttle hoặc suspend tab.
- Page Visibility chỉ báo trang SlimeXlink ẩn/hiện. Không chứng minh người dùng đang xem đúng tab nhiệm vụ, trang bên ngoài đã tải thành công, đã follow/subscribe/join hoặc tương tác thật.
- Visibility do client báo có thể bị giả mạo hoặc bỏ qua. Server có thể cưỡng chế thời gian tối thiểu và tính hợp lệ của attempt, không thể cưỡng chế tuyệt đối việc ở tab bên ngoài. Không mô tả đây là giải pháp chống bypass tuyệt đối.
- Tên UI: “Mở liên kết và chờ” / “Open link and wait”, kết quả “Hoàn thành bước truy cập” / “Visit step completed”. Không hiển thị “Đã xác minh đăng ký kênh”.
- Luồng này không dùng OAuth/API YouTube/Discord. OAuth đăng nhập Google vẫn là chức năng độc lập.

## Kiểm thử cần bổ sung khi triển khai

- Ngưỡng trước/đúng/sau thời hạn; 4 và 8 giây; bấm nhưng không rời tab; quay lại sớm nhiều lần; đủ thời gian; task hoàn thành không bị reset theo task thất bại.
- Popup bị chặn, mở tab nền, reload, đóng trang, mất mạng, browser suspend trên mobile.
- Hai tab SlimeXlink, request đồng thời/đảo thứ tự/retry, attempt cũ/sai phiên/sai task/sai revision; link bị tắt hoặc hết hạn.
- Báo lỗi có text/icon và aria-live, không chỉ màu đỏ; cả tiếng Việt/Anh và điều hướng bàn phím.

Nguồn trình duyệt đã đối chiếu: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API — sự kiện hidden/visible và giới hạn timer ở nền. Các điều kiện server ở trên là thiết kế của SlimeXlink, không phải bảo đảm do browser cung cấp.
