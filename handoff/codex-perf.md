# Codex — vòng 3: hiệu năng Pitchfork & Pot

Nhánh `codex/perf`, gốc `a19be07`. Đã giảm chi phí render trong bài stress test. Mục tiêu 60 FPS với 300 quái, CPU 4× **chưa đạt**; đây là bản tối ưu bước đầu để Claude review, không phải xác nhận game đã hết lag.

## Kết quả đo

Chrome 154.0.8037.98, Windows, headless, ANGLE/GTX 1070, GPU canvas bật. CPU throttling 4×. Hai viewport: 390×844/DPR 2 và 1280×720/DPR 1. Đo 12 giây sau 2,5 giây warm-up; trace/CPU profile ghi ở 4 giây riêng. Dùng cùng font đóng gói, cùng 300 quái của 6 loại, 10% elite, 4 vũ khí cấp 3. Fixture giữ mọi quái trong camera, HP lớn và tắt sinh quái để tránh chết/level-up; model và va chạm vẫn chạy. Không phải số FPS của điện thoại thật hoặc bài test balance.

| Viewport | Frame avg trước → sau | Frame P95 trước → sau | Draw avg trước → sau |
|---|---:|---:|---:|
| 390×844 | 328.3 → 242.5 ms | 383.2 → 283.3 ms | 301.8 → 226.3 ms |
| 1280×720 | 241.9 → 178.9 ms | 283.4 → 200.0 ms | 206.1 → 159.2 ms |

Frame avg giảm khoảng 26% ở cả hai viewport. 390×844 vẫn chỉ khoảng 4,1 FPS trong môi trường đo này, xa ngân sách 16,7 ms/frame. Các lần chạy có dao động; số trên là cặp trước/sau được lưu trong `tools/perf/results.json`.

Profile trước sửa: native `drawImage` ở clip animation chiếm nhiều thời gian nhất (khoảng 3,68 giây mẫu CPU của trace điện thoại), tiếp theo là fill nền (~0,67 giây). Update model bình quân khoảng 7–11 ms, nhỏ hơn render rất nhiều. Sau sửa, native draw/flush canvas vẫn là điểm nghẽn; một số profile tính thời gian flush vào `scale`/`restore`, không nên hiểu toàn bộ thời gian đó là phép toán transform của JavaScript. Props/HUD/gradient thấp hơn nhiều nên không thể đạt 60 FPS chỉ bằng tối ưu các phần này.

## Thay đổi

- `src/game/perf/frames.ts:11`: decode tất cả WebP trước khi sẵn sàng, ghép atlas lúc tải ở nguyên độ phân giải, gutter trong suốt, tạo hit-mask sẵn. Một texture chung cho các frame của mỗi clip; dùng ImageBitmap, có canvas fallback. Asset trên đĩa giữ nguyên.
- `src/game/clips.ts:21` và `src/game/hero.ts:30`: dùng atlas, giữ fps/kích thước/điểm neo và clock cũ. File hỏng/thiếu tiếp tục dùng sprite dự phòng; không tạo silhouette trên khung hình trúng đòn.
- `src/game/clips.ts:41`: clip đi bình thường vẽ trực tiếp; wind-up vẫn dùng transform squash cũ. Flash khôi phục đúng alpha, hướng trái giữ đúng điểm neo.
- `src/game/game.ts:569`: tái sử dụng mảng visible/y-sort, comparator cố định, lấy metadata sprite mỗi loại một lần/frame. Thứ tự vẽ theo y giữ nguyên.
- `src/game/perf/props.ts:44` và `src/game/game.ts:619`: chỉ tính scatter khi camera qua ranh giới ô. Cache chỉ giữ vùng nhìn hiện tại, vẫn nhận asset tải muộn.
- `src/game/game.ts:464`: cache gradient vignette theo viewport và mật độ canvas, tái tạo khi resize.
- `src/engine/assets.ts:46`: chờ decode trước khi đưa ảnh vào ready cache.
- `src/game/perf/meter.ts:2`, `src/main.ts:37`: FPS, frame avg/P95, update/draw phía trên khi có `?debug`; đường chạy thường không tạo meter hay lấy mẫu.
- `tools/perf/`: harness đo, Chrome timeline/CPU profile, ảnh so sánh, smoke test, README chạy lại và JSON kết quả.

## Kiểm chứng

- `npm install` đã chạy; `npm run build` qua (tsc strict + Vite).
- `node --experimental-strip-types --no-warnings tools/test-model.ts`: **all passed** (26 checks).
- Smoke test: ImageBitmap và canvas fallback, di chuyển bằng phím, resize portrait→desktop, camera đi xa/quay lại, thiếu art, debug tắt đều qua; không có pageerror.
- 12 ảnh trước/sau: gameplay, flash, offers, pause, menu, camp tại hai viewport. Bố cục, art, kích thước và neo nhìn giữ nguyên. Camp giống từng pixel. Atlas có sai khác nội suy/alpha tại cạnh: MAE từ 0,006 tới 0,609 trên thang 0–255; đây không phải kết quả pixel-identical. Số cụ thể nằm trong JSON.
- `git diff --check` sạch. Phần rules/balance, public art, cấu hình DPR, UI và FX không đổi.

## Giới hạn và Requests for Claude

- Chưa đạt 60 FPS; cần chạy cùng harness trên Chrome có cửa sổ và máy/điện thoại mục tiêu, đối chiếu GPU trace, rồi tiếp tục xử lý native canvas raster/flush. Đừng đánh dấu nhiệm vụ hiệu năng xong khi merge bản này.
- Atlas màu + hit-mask chiếm khoảng 72,8 MiB pixel backing cho 8 bộ animation (chưa gồm GPU copy, ảnh UI/nền, overhead). Tải/chuẩn bị làm sớm có thể tăng đỉnh RAM và thời gian ready. Cần đo RAM và startup trên điện thoại thật trước khi phát hành; phương án tiếp theo là atlas theo kích thước render hoặc chia tải theo loại quái, có kiểm tra chất lượng.
- Phần fill nền/soft-light, shadowBlur elite, text và rules vẫn theo đường cũ. Cache ring thử nghiệm không cho lợi ích ổn định và có sai khác cạnh nên không đưa vào. Hạ DPR/pre-scale chưa áp dụng vì yêu cầu giữ chất lượng.
- Claude chạy balance bot theo quy trình review/merge. Codex chỉ push `codex/perf`.
