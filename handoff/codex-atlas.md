# Codex atlas — vòng 4

Nhánh `codex/atlas`, tạo từ `folk-version` tại `9763597`. Cập nhật ngày 14/10/2026 theo lựa chọn trực tiếp của chủ repo: **WebP quality 88**, chấp nhận sai khác màu nhỏ để đạt build dưới 5 MB.

Atlas và tải hai đợt đã hoàn tất. Build cuối **4.478.899 byte = 4,48 MB = 4,271 MiB**, giảm từ bản lossless 13,922 MiB. Trên Fast 4G, hero + grub/bat + jab của vùng được chọn sẵn sàng sau 4,6–5,2 giây, trước đây 9–12 giây. Boot chỉ ẩn khi nhóm art mở đầu hoàn tất.

## Thay đổi

- `tools/pack-atlas.mjs:85`, `package.json`: prebuild đóng 18 clip + 1 hero thành 19 atlas WebP quality 88, alphaQuality 100, effort 6, smartSubsample; gutter 2 px, cạnh tối đa 4096. Encode từ frame gốc, không nén lại atlas lossy cũ. SHA-256 nguồn bao gồm cấu hình encoder, nên cache lossless tự hết hiệu lực. JSON thêm rect/hash/encoding, giữ nguyên frame order/fps/cx/foot/k.
- `tools/pack-atlas.mjs:34`: `npm run pack:atlas -- --verify` kiểm tra cả atlas đã cache. **Tất cả alpha khớp ảnh gốc**, giữ silhouette của white hit-flash và glow. RGB thay đổi theo lựa chọn quality 88; MAE ở pixel nhìn thấy khoảng 2,05–3,38/255 tùy clip, max 66/255 tại pixel riêng lẻ.
- `tools/pack-atlas.mjs:196`, `package.json:12`: postbuild bỏ 284 bản sao frame rời khỏi **dist**. Kiểm tra metadata với public, checksum atlas, kích thước/rect và đường dẫn thật trong dist cho mọi folder trước khi xóa bất kỳ file nào. Atlas hỏng thì dừng; chạy lặp lại an toàn. Giữ đủ frame gốc trong public cho dev pipeline; animation chưa có atlas giữ ảnh rời trong dist.
- `src/game/perf/frames.ts:101`: đọc rect và dùng atlas chung; giữ phép thu nhỏ từng frame của sprite nhỏ. Fallback ảnh rời hoạt động ở dev; thiếu createImageBitmap thì dùng canvas. Bản production đã prune cần phát hành đầy đủ dist, gồm atlas và JSON.
- `src/game/clips.ts:35`: chia sẻ promise và texture đã chuẩn bị; clip Zone 2 tạo khi vẽ lần đầu nhận cache ngay, tránh một frame stand-in.
- `src/game/perf/loading.ts:35`: ưu tiên hero, jab, grub/bat của vùng đang chọn; tải nhóm critical tối đa 6 job, nhóm nền 1 job. Các quái còn lại theo thứ tự wolf, beetle, brute, shroom, boss rồi effects. Clip của vùng chưa chọn chưa tải.
- `src/engine/assets.ts:16`, `src/main.ts:20`: chờ font, UI/HUD, props/pickups, ground vùng, hero, quái mở đầu, jab và vũ khí ban đầu trước boot/Poki loadingFinished. Nhóm sau bắt đầu 50 ms sau khi mở màn hình. Asset đã decode mới được đánh dấu ready; có timeout để không treo boot khi tài nguyên lỗi.
- `src/main.ts:144`, `src/game/perf/requirements.ts:6`: đổi vùng hoặc lựa chọn kỹ năng sớm có thể ưu tiên art chưa xong, dùng boot hiện có và dừng vòng update trong lúc chờ. Token tránh đổi vùng nhanh mở boot quá sớm. Offer icon/player selection là hook qua Assets; không sửa game/model/config.
- `src/game/hero.ts:44`: chuẩn bị 4 glow mở đầu thay vì cả 36; 32 glow còn lại làm từng frame lúc idle, có lazy fallback. Padding 10, blur 4, màu và alpha cũ được giữ. White/glow canvas dùng software context để tránh readback GPU lớn. Vẽ cảnh đầu dưới boot để làm nóng cache view có sẵn; không update model.

## Số đo trước/sau

Chrome 154, GTX 1070/ANGLE D3D11, production preview. Fresh browser context cho từng ca; cache tắt, Fast 4G (8,1 Mbps download, 1,35 Mbps upload, latency 165 ms), CPU throttle 4×. Điện thoại 390×844 DPR 2 (canvas áp cap hiện có); desktop 1280×720 DPR 1. Mỗi ca một lần, không phải p95 thiết bị thật. Chặn Poki CDN ở cả hai bản để đo tài nguyên cùng origin ổn định.

Baseline là `9763597`; chỉ thêm debug expose `__ds` trong bản QA baseline, không đổi loader/render. Run đầu, HP cao trong fixture để tránh chết. Tổng request/KB tính đến khi art của vùng và effects tải xong + mạng idle, không phải tổng của tất cả vùng. KiB gồm HTTP encodedDataLength, không bao gồm CDN bị chặn.

| Vùng / viewport | Art mở đầu trước → sau (ms) | Request trước → sau | KiB trước → sau |
| --- | ---: | ---: | ---: |
| Zone 1 / 390×844 | 8951,5 → 5173,2 | 294 → 94 | 3079,2 → 3051,7 |
| Zone 1 / 1280×720 | 9094,2 → 5070,0 | 294 → 94 | 3079,2 → 3051,7 |
| Zone 2 / 390×844 | 12176,6 → 4628,0 | 369 → 93 | 4179,6 → 3330,1 |
| Zone 2 / 1280×720 | 11823,8 → 4620,3 | 369 → 93 | 4179,6 → 3330,1 |

Baseline ẩn boot sau 1,5–1,8 giây khi animation chưa sẵn sàng. Bản mới ẩn sau 4,6–5,2 giây với art hoàn tất, khoảng 61–62 request / 1358–1411 KiB. Thời gian tới art thật giảm 42–62%. Các ca đo mới ghi **0 hero/enemy fallback**; baseline có 46–186 lần hero và 623–5199 lần enemy fallback trong cửa sổ đo.

Glow ở thời điểm mở boot: 4/36. Vẫn có long task 130–207 ms trong giây đầu trên CPU throttle 4×; chưa khẳng định xóa mọi hitch. Cần profiling thiết bị thật nếu tối ưu tiếp.

## Kiểm tra và ảnh

- `npm run build`: TypeScript strict + Vite + postbuild qua; build lặp lại dùng cache, vẫn bỏ đúng 284 frame copies.
- `node --experimental-strip-types --no-warnings tools/test-model.ts`: 27 kiểm tra, **all passed**.
- `node tools/pack-atlas.mjs --verify`: 19 atlas alpha exact. JSON sau khi bỏ atlas và tất cả 347 WebP gốc đối chiếu với baseline: không đổi. Game/model/config/test/balance/art không sửa; git diff --check qua.
- Packaging QA: dist dưới 5.000.000 byte, đủ 284 frame nguồn trong public, không còn bản sao frame đã pack trong dist; prune lặp lại xóa 0 file. Cố ý làm hỏng atlas hero và phục hồi hai frame copies: prune báo lỗi trước khi xóa cả hai; phục hồi atlas rồi prune xóa đúng 2 file. Artifact được phục hồi và build lại trước khi đo.
- Smoke production: SDK stub báo loadingFinished đúng 1 lần; thiếu createImageBitmap/requestIdleCallback; save ptero cũ với spit; viewport 0×0; đổi vùng nhanh, dừng clock khi chờ art, Zone 2 grub/bat sẵn ngay khi tạo clip, offer spit sớm, bat giây 50. Smoke **dev**: chặn toàn bộ atlas và rect hero lỗi đều fallback sang ảnh rời. Không có lỗi JavaScript.
- Chạy đủ phút đầu trên build quality 88 đã prune, riêng từng vùng ở 390×844, cache tắt, Fast 4G, CPU bình thường: Zone 1 tới 61,48 giây và Zone 2 tới 61,13 giây model; cả hai **0 hero fallback, 0 enemy fallback, 0 lỗi JavaScript**, có grub và bat thực sự xuất hiện. Fixture tăng HP để tránh chết và tự chọn offer. Không tính lượt này vào bảng đo loading CPU 4× ở trên.
- Ảnh menu, boss 3:00, Zone 2, white flash ở cả hai viewport; cùng seed/clock/camera/font và canvas state. So quality 88 với bản atlas lossless: RGB MAE PNG 0,028–0,114/255, max 16/255. Bố cục/anchor/silhouette giữ nguyên; màu có sai khác nhỏ đã được chủ repo chấp nhận. Không tuyên bố PNG byte-identical.

Ảnh ghép thu nhỏ để tiện xem; cột trái baseline, phải quality 88; lần lượt menu, boss, Zone 2:

![390×844 trước/sau](codex-atlas-390.png)

![1280×720 trước/sau](codex-atlas-1280.png)

Ảnh gốc, trace JSON và script QA trên PC làm việc: `C:/Users/PC/Documents/Codex/2026-10-13/te/outputs/codex-atlas/`. Thư mục lossless giữ bằng chứng bản trước; after chứa bản quality 88 cuối. QA nằm ngoài repo, không sửa test/balance tool hiện có.

## Requests for Claude

Quyết định nén đã được chủ repo chốt: quality 88, build dưới 5 MB. Không cần hook game/model/config để tích hợp. Khi review, kiểm tra Poki CDN thật và điện thoại thật; số đo hiện tại dùng mạng/CPU giả lập trên desktop và SDK lifecycle có stub riêng. Phát hành toàn bộ dist cùng atlas/JSON; fallback ảnh rời được giữ trong dev pipeline.
