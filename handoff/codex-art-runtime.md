# Bàn giao Codex — Art runtime, vòng 2

Ngày: 13/10/2026. Nhánh: `codex/art-runtime`. Nền: `f1cf8ca` trên main.

## Thay đổi

| File:line | Nội dung |
|---|---|
| `tools/art-ingest/ingest.py:55` | PNG đã duyệt → WebP quality 88 + manifest. Chung union crop/canvas cho mọi tư thế cùng form; UI giữ kích thước gốc; boss/mảnh giữ canvas đầy đủ và cùng tỉ lệ. Kích thước theo brief. Kiểm tra ảnh rỗng, alpha mềm, độ sáng mép, hướng mặt (cảnh báo cần xem tay), tile 2×2, rig và tổng ngân sách 3 MB. Lỗi budget xảy ra trước khi ghi sprite. |
| `tools/art-ingest/README.md:1` | Cách chạy, keys, nhóm tư thế, sidecar slices/rig, giới hạn của kiểm tra seam/viền và cách dùng viewer. |
| `src/engine/assets.ts:20` | Giữ manifest cũ tương thích; thêm slices, rig JSON tải lười và warm/decode. JSON/ảnh thiếu hoặc hỏng không chặn game. |
| `src/game/sprites.ts:306` | Cache ảnh thô/white flash, cache rig đã kiểm tra, chỉ dùng rig đủ mảnh. Pose → ảnh player đầy đủ → hình tạm. Ảnh player giữ đúng tỉ lệ; canvas/anchor thống nhất giữa các pose. |
| `src/game/anim.ts:3` | Idle/run/bite; nhịp chân 6–8 Hz theo tốc độ; bite giữ 0,14 giây, bob/squash/lean nhẹ. Hỗ trợ reduced motion cho các chuyển động thêm mới của player. |
| `src/game/game.ts:364` | Event fire/bite kích hoạt tư thế bite, kể cả bite đã tiến hóa. |
| `src/game/game.ts:623` | Chọn pose trong drawPlayer, giữ white flash và blink khi miễn sát thương. Không có art thì dùng đúng chuyển động cũ. |
| `src/game/rig.ts:1` | Schema rig được mô tả ở đầu file. Kiểm tra canvas, phần tử, parent và chu trình; transform pivot/parent, z-order; idle/walk/windup/charge/roar/hit/death. Thiếu mảnh thì không vẽ rig dở dang. |
| `src/game/game.ts:585` | Boss dùng rig đủ mảnh, nếu không dùng ảnh đầy đủ/hình tạm. mode 1/2 → windup/charge; vòng spore mới → roar; hit flash và death topple/fade. |
| `tools/rig-viewer/index.html:1` | Trang dev tại `/tools/rig-viewer/`; chọn clip, tải JSON/ảnh, kéo pivot, copy JSON. |
| `tools/rig-viewer/test-rig.ts:1` | Tách boss tạm hiện có thành 6 mảnh full-canvas bằng code, dùng để chứng minh pipeline; không thêm ảnh vào public. |
| `src/game/ui.ts:14` | 9-slice giữ góc, kéo giãn cạnh/trung tâm; hỗ trợ panel, fancyPanel, button, ribbon và bar frame; nút có scale .96 + darken khi nhấn, chữ vẫn vẽ bằng code. Fallback giữ nguyên hình cũ. |
| `src/game/game.ts:728` | Ground tile thật thay mẫu procedural ở run/menu/camp khi đã tải. |
| `src/game/game.ts:797` | Kit UI cho XP frame và medallion. |
| `src/game/game.ts:975` | Thẻ level-up dùng ui-card khi có ảnh; thiếu ảnh giữ đúng thẻ cũ. |

Đã rebase lên main mới nhất f1cf8ca, giữ nguyên cân bằng và test của Claude. Hỗ trợ thêm hợp đồng art/BRIEF-ANTIGRAVITY-02.md: boss-1/2/3 theo tier và rig tương ứng; enemy-<kind> không hậu tố với tint cache theo vùng; ground-0/1/2 thay mẫu nền; logo/thumbnail giữ native khi ingest. Các tên cũ vẫn hoạt động. Đã kiểm tra tên mới và đúng tier/facing ở clip chết của boss.

Chỉ sửa/tạo các file được giao trong vòng 2 và báo cáo này. Không sửa model, config, test-model, balance-sim, art, public/sprites, playtest hoặc meta/missions.

## Kiểm tra

- `npm run build`: PASS.
- `node --experimental-strip-types --no-warnings tools/test-model.ts`: 26 kiểm tra PASS, `all passed`.
- Type-check riêng `tools/rig-viewer/viewer.ts` với strict/noUnusedLocals/noUnusedParameters: PASS. Viewer nằm ngoài include của tsconfig chính nên kiểm tra riêng.
- `git diff --check`: PASS.
- Không art mới: 7 màn × 2 viewport (1280×720, 390×844): ready, run/boss, offers, pause, result, menu, camp. Cố định thời gian và trạng thái model, chụp main trước sửa và bản mới. So sánh pixel RGB bằng Pillow: **14/14 ảnh khác biệt bằng 0 (font được cố định bằng cùng các file font local trong cả hai bản)**.
- Có art thử: tải từ thư mục QA qua harness, không ghi public/sprites. Kiểm tra ba pose cùng canvas/anchor, bite 0,14 giây, nhịp chân theo tốc độ, pose thiếu → ảnh player đầy đủ → procedural, blink .55 vẫn giữ khi dùng bite pose.
- Rig: đủ 7 clip có đầu ra khác nhau; hierarchy chu trình/canvas lỗi bị từ chối; thiếu mảnh không vẽ bất kỳ pixel rig nào trước fallback; game dùng full boss khi thiếu mảnh. Ảnh lỗi và JSON lỗi tiếp tục dùng procedural/full fallback.
- UI: góc 9-slice giữ màu khi kéo khung 96×96 thành 500×300; trạng thái nhấn có transform .96 và brightness. Chụp game với kit thử ở cả hai viewport; không có lỗi JavaScript.
- Viewer: tải fixture procedural, thao tác chuột kéo pivot làm JSON thay đổi; chụp đủ 7 clip, upload JSON/parts đã ingest và kiểm tra nút Copy JSON bằng clipboard adapter thử. Viewer/fixture không nằm trong dist và không có chuỗi test-boss/rig-viewer trong bundle production.
- Ingest: kiểm tra kích thước bảng, UI native, canvas/feet của pose, full-canvas parts và pivot scale, seam tile, ảnh rỗng, sai canvas pose, tile không liền mạch, budget 3 MB gồm cả file cũ. Lỗi budget không đổi manifest đã có.

Harness, PNG/WebP thử, ảnh và log nằm ngoài Git trong `work/qa`. Bản báo cáo và bằng chứng tiêu biểu được sao chép vào outputs của chat.

## Dung lượng shipped

| Bản | Tổng dist, chưa gzip | JavaScript, chưa gzip |
|---|---:|---:|
| Main `f1cf8ca` (build riêng trong QA) | 214.648 bytes | khoảng 111,25 kB |
| Art runtime | 222.924 bytes | khoảng 119,53 kB |

Tăng 8.276 bytes (~3,9%). Không thêm sprite thật; manifest hiện vẫn rỗng. Bộ fixture ngoài production sau ingest là 139.269 bytes, dưới ngân sách 3.000.000 bytes; không tính bộ này vào dist đã giao.

## Chưa làm / giới hạn

- Chưa nhận art đã duyệt từ Antigravity; không sinh hoặc chỉnh bộ art thật. Các góc màu trong harness là dấu đo 9-slice, không phải phong cách UI được đề xuất.
- Chưa kiểm tra điện thoại vật lý hoặc Poki Inspector với art thật. Rig thử là các vùng tách từ hình tạm; artist vẫn cần vẽ vùng khớp chồng lấp để các clip đẹp trên rig thật.
- Kiểm tra mép tối không phân biệt được nét mực cố ý với fringe; hướng mặt luôn cần xem tay. Độ khớp mép tile chưa chứng minh được sự liên tục của các họa tiết lớn, cần xem preview 2×2.

## Requests for Claude

- Không cần sửa model để ghép nhánh. Nên thêm event spore-ring kèm enemyId sau này: hiện roar suy ra từ ít nhất 8 spore mới gần boss trong phần vẽ, không thay luật chơi. Event rõ ràng sẽ ổn định hơn khi đổi cách boss bắn.
- Phối hợp Antigravity theo keys/schema trong README của tool; chỉ chạy ingest mặc định vào public/sprites khi art đã duyệt.
- Sau ghép, kiểm tra cảm giác hoạt ảnh với ảnh thật và trên thiết bị/Poki.
