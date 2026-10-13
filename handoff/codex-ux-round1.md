# Bàn giao Codex — UX vòng 1

Ngày: 13/10/2026. Nhánh: `codex/ux-round1`. Nền: `5953b95` trên `main`.

## Thay đổi

| Vị trí | Nội dung |
|---|---|
| `src/game/game.ts:1072` | Màn kết quả hiện trước khi mời xem quảng cáo. RETRY lớn, vàng và pulse nhẹ; REVIVE xanh, ngang CAMP; x2 xu là nhãn nhỏ cạnh số xu. Có nguyên nhân thua, một mẹo theo nguyên nhân, kỷ lục mới và tiến độ đến nâng cấp rẻ nhất. CAMP thành liên kết chữ khi chưa đủ xu. |
| `src/game/game.ts:185` | Bank phần chênh lệch xu; mỗi vòng chỉ tăng `runs` một lần. Hồi sinh không cộng lại số xu cũ. Nếu đã x2, phần kiếm thêm cũng được x2. Thưởng nhiệm vụ không bị nhân đôi và không được nhận lặp. |
| `src/game/game.ts:309` | Lần chơi đầu: nhắc di chuyển cho đến đủ 2 giây di chuyển thực, fade 0,4 giây; banner sau lần hạ quái đầu, vòng sáng trên hổ phách gần nhất trong 3 giây và chữ XP trên thanh kinh nghiệm. |
| `src/game/game.ts:881` | REROLL/BANISH dưới thẻ, kèm số lượt còn lại và ẩn khi hết. Phím R đổi thẻ; banish có chế độ chọn/hủy và rung nhẹ. Giữ khóa nhập 0,35 giây. Sửa trạng thái nhấn bị xóa quá sớm khiến thẻ thứ hai/thứ ba không nhận click. |
| `src/game/game.ts:1036` | Mũi tên cho boss, brute và rương ngoài màn hình; đỏ/cam/vàng, nằm trong vùng an toàn dưới HUD; hạn chế các mũi tên đè lên nhau. |
| `src/game/missions.ts:1` | Danh mục nhiệm vụ với đủ 5 loại, thưởng 30–80 xu; chuẩn hóa dữ liệu lưu, tính tiến độ và nhận thưởng/thay nhiệm vụ ở màn kết quả. Nhiệm vụ thay mới bắt đầu từ vòng tiếp theo để tránh farm bằng hồi sinh. |
| `src/game/meta.ts:8` | Lưu 3 nhiệm vụ trong Meta. Save cũ không có trường mới được bổ sung mặc định; tiến độ lưu tối đa mỗi giây và khi blur/ẩn tab. |
| `src/game/game.ts:1222` | Menu hiển thị 3 nhiệm vụ bằng chữ và thanh tiến độ mảnh, không dùng thẻ hộp. |
| `src/game/game.ts:153` | Space tạm dừng/tiếp tục; blur khi mở thẻ không đặt paused; RETRY bỏ commercialBreak nếu vòng trước dưới 20 giây. Chặn phím khi đang chạy quảng cáo. |
| `src/game/game.ts:216` | Cập nhật `m.viewHalf` trước model update để meteor chọn mục tiêu đúng viewport. |
| `src/game/game.ts:347` | `weaponEvolve`: banner tên tiến hóa, âm thanh super, burst và shake. Thẻ vũ khí/bổ trợ hiện liên hệ tiến hóa từ EVOLUTIONS. |
| `src/game/game.ts:572` | Quái elite vẽ lớn hơn 30%, thêm viền sáng vàng mảnh. |

Chỉ sửa ba file được giao và thêm báo cáo này. Không sửa model, config, engine, tools, art hoặc main.

## Kiểm tra

- `npm run build`: PASS, TypeScript strict và Vite production build. Bundle JavaScript khoảng 111,23 kB trước gzip.
- `node --experimental-strip-types --no-warnings tools/test-model.ts`: 26 mục kiểm tra PASS, kết thúc bằng `all passed`.
- `git diff --check`: PASS.
- Chrome headless, viewport 1280×720 và 390×844: chụp màn hướng dẫn, hổ phách, chọn thẻ, banish, pause, kết quả thua, kết quả sau hồi sinh, thắng, menu, mũi tên/elite, tiến hóa vũ khí và toast.
- Đo các Rect qua chính hàm vẽ Canvas; các nút mới nằm trong viewport, kích thước tương tác tối thiểu 44 CSS px. Đọc ảnh để kiểm tra clipping và chồng chữ; banner được ẩn khi mở thẻ/kết quả/pause.
- Thao tác chuột/phím thật trong harness: R đổi thẻ, bấm thẻ thứ hai để banish, Space pause/resume, click x2 xu và REVIVE, RETRY dưới 20 giây không gọi commercial và từ 20 giây giữ commercial.
- Kiểm tra bank idempotent, hồi sinh chỉ nhận chênh lệch, không tăng runs lần hai, không trả lại thưởng nhiệm vụ; migration save cũ, dữ liệu nhiệm vụ hỏng, kill/level/evolve/survive/boss, đúng tier boss và đọc lại tiến độ đã lưu.
- Kiểm tra quảng cáo trả false: hiện toast và không cấp thưởng. Quảng cáo thành công dùng adapter dev; commercial dùng spy. Không có lỗi JavaScript trong trình duyệt.

Harness và ảnh kiểm tra được giữ ngoài Git trong thư mục `work/qa`, tránh sửa `tools/**` và `playtest/**` của agent khác. Bản báo cáo và ảnh tiêu biểu được sao chép vào outputs của chat.

## Chưa kiểm tra

Chưa chạy quảng cáo thật trên inspector.poki.dev, chưa chơi đủ vòng 10 phút bằng người thật, chưa đo hiệu năng trên điện thoại vật lý. Phần chơi thử và nghiên cứu đối thủ của Antigravity không thuộc phần việc này.

## Requests for Claude

- Không cần thay đổi model để ghép nhánh này. Có thể bổ sung `tier` hoặc `enemyId` vào sự kiện `bossDead` ở vòng sau: hiện view giữ tham chiếu boss trước/sau model update và đối chiếu tọa độ để xác định đúng boss #k. Cách hiện tại đã được kiểm tra, nhưng trường định danh trong event sẽ làm hợp đồng giữa model/view rõ hơn.
- README vẫn mô tả game merge và các file không có trong phiên bản survivor hiện tại; đề nghị cập nhật tài liệu thuộc phần sở hữu của Claude.
- Kiểm tra quảng cáo thật và cảm giác chơi sau khi ghép cùng thay đổi cân bằng mới nhất.
