# Chia việc (cập nhật 13/10/2026)

Chủ game chốt: **Claude viết phần khung chính, Codex và Antigravity chỉ làm việc phụ.** Lối chơi là ưu tiên số 1.
Mỗi file chỉ có một người sở hữu. Các bên phụ chỉ được sửa những file ghi trong phần việc của mình.

| Ai | Sở hữu | Ghi chú |
|---|---|---|
| **Claude** (chính) | `src/**`, `tools/**`, `DESIGN.md`, cân bằng độ khó, Poki SDK, kiểm tra, đóng gói | Mọi thay đổi về luật chơi và màn chơi đều đi qua Claude |
| **Antigravity** (phụ) | `art/**`, `public/sprites/**`, `public/thumb/**` | Chỉ làm ảnh. Không đụng vào code |
| **Codex** (phụ) | Chỉ những việc Claude giao, kèm danh sách file được sửa | Ví dụ: thêm nhạc nền, bản dịch, công cụ kiểm tra |

## Đã xong (Claude)
- Luật chơi: `src/game/model.ts` + `config.ts`, gồm 8 chiêu tấn công, 6 chiêu bổ trợ, tiến hóa ở cấp 8 và 16,
  trùm ở phút 3/6/9, rương, hồi sinh, 3 vùng đất, 3 loài khủng long và trại nâng cấp.
- 21 bài test luật chơi (`tools/test-model.ts`) và bot chơi thử với 3 kiểu người chơi (`tools/balance-sim.ts`).
- Màn chơi: camera, cần điều khiển ảo, phím WASD, hiệu ứng từng chiêu, thanh trạng thái, thẻ lên cấp,
  màn tạm dừng, màn thua/thắng, menu, trại. Chạy được ở khung 16:9 lẫn 9:16.
- Poki SDK: `src/engine/poki.ts`. Gắn các mốc tải xong, bắt đầu chơi, dừng chơi, quảng cáo trước mỗi lần chơi lại,
  và 2 nút xem quảng cáo nhận thưởng (Revive, x2 Coins).
- Ảnh tạm vẽ bằng code theo kiểu vector viền đậm (`src/game/sprites.ts`). Bản build **221 KB**.

## Việc cho Antigravity: bộ ảnh thử phong cách [CHỜ DUYỆT]
```
Read ART-DIRECTION.md fully. Do ONLY section 4 (style test) — no other assets, no code changes.
Produce the same items twice: style (1) hand-drawn vector sticker, style (2) hand-painted.
Subjects: the orange raptor player (3/4 side view FACING RIGHT, transparent bg), one small enemy
(teal grub-like critter), one boss (big horned purple brute), a 1:1 thumbnail 628x628.
Match the in-game placeholder shapes in src/game/sprites.ts so the art drops in without code changes.
Save into art/style-test/{vector,painted}/ (PNG, transparent) and build art/style-test/compare.png
(rows = styles; columns = player, enemy, boss, thumbnail, thumbnail at 94x94).
Check each image against ART-DIRECTION.md section 5, write art/style-test/REPORT.md. Touch nothing outside art/.
```
Sau khi chủ game chọn kiểu vẽ: ảnh xuất ra WebP vào `public/sprites/` với **đúng tên** dưới đây.
Game tự lấy ảnh thật thay cho ảnh tạm, không phải sửa code:
`player-raptor-1..3`, `player-ankylo-1..3`, `player-ptero-1..3`,
`enemy-<grub|bat|beetle|wolf|shroom|brute|boss>-<0|1|2>` (số là vùng đất),
`pickup-amber-1..3`, `pickup-meat|coin|magnet|chest`, `proj-egg`, `proj-bone`, `fx-thorn`, `skill-<id>`,
rồi chạy `tools/prep_sprites.py` để cập nhật `manifest.json`. Mọi nhân vật quay mặt sang phải.

## Việc tiếp theo của Claude
1. Chủ game chơi thử, góp ý về cảm giác chơi. Claude sửa và chạy lại bot sau mỗi lần sửa.
2. Thử trên **inspector.poki.dev** bằng file `dino-swarm-poki.zip`.
3. Ghép ảnh thật khi Antigravity xong, rồi làm ảnh đại diện.
