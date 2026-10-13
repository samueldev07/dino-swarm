# STYLE LOCK — chủ game chốt ngày 13/10/2026

Mọi hình mới của game **bắt buộc** dùng các ảnh trong thư mục này làm ảnh tham chiếu.
Không tự đổi phong cách. Muốn đổi gì phải hỏi chủ game trước.

## Ảnh chuẩn
- `hero-master.png`: **nhân vật chính, bản chính thức.** Cậu bé đội nồi sắt gỉ, tóc cam rối, tàn nhang,
  áo vải xanh xám rách vá, thắt dây thừng, cầm chĩa ba. Dáng khom nhẹ, đầu chúi tới trước, mặt cau có quyết chiến.
- `enemy-*.jpg`: bộ quái đã duyệt, gồm nấm lùn, dơi hang, orc cưỡi heo, orc khiên gỗ, yêu tinh ném đuốc, troll rừng, ogre (trùm).
- `ref-char2.png`, `ref-crop-*.png`: ảnh mẫu kỹ thuật vẽ của chủ game. **Chỉ lấy cách vẽ, không chép thiết kế nhân vật.**

## Quy tắc phong cách
1. **Nét viền:** mực nâu đen, dày, độ dày không đều như bút lông vẽ tay, đầu nét tròn. Ít nét bên trong (chỉ nếp áo, ngón tay, miếng vá).
2. **Tô màu:** màu nền phẳng, đổ **một lớp bóng mờ mềm** (tối dần xuống dưới). Má ửng hồng.
   Không gạch bóng, không vệt cọ rõ, không bóng 3D, không đèn viền.
3. **Chất liệu:** hạt nhiễu mịn trên da, vệt bẩn sọc dọc và mảng sần trên vải, mép áo sờn rách, kim loại gỉ xỉn.
4. **Bảng màu:** trầm, bụi, ngả nâu xám, nhìn nghèo khổ, vất vả.
   Mỗi loại quái giữ **một màu nhận diện ở mức trầm** (nấm đỏ bụi, orc xanh rêu, yêu tinh xanh úa, troll nâu rêu, ogre nâu xám).
5. **Tỉ lệ:** đầu to, thân ngắn, chân ngắn, tay nhỏ. Mắt tròn trắng, con ngươi nhỏ. Mũi là một nét nhỏ, miệng là một vạch.
   Mặt thon, không phúng phính trẻ con.
6. **Tinh thần:** cổ tích dân gian u tối nhưng có duyên. Nhân vật nghiêm túc, không cười toe, không dễ thương kiểu chibi bóng bẩy.
7. **Hướng nhìn:** mọi nhân vật quay **sang phải**, góc 3/4 hơi nhìn từ trên xuống. Nền ảnh trắng phẳng, không có bóng đổ dưới chân.
8. **Bản quyền:** không dùng khăn trùm, tóc vàng dài hay áo choàng nâu giống nhân vật trong *Little Old One*.

## Cách tạo hình mới (đã kiểm chứng)
- **Biến thể của nhân vật đã có** (tư thế mới, bậc đồ mới): dùng G-Labs ở chế độ sửa ảnh, đưa **đúng một ảnh gốc** vào,
  rồi ghi "keep EXACTLY ... change ONLY ...". Cách này giữ dáng và khuôn mặt gần như tuyệt đối.
- **Nhân vật mới:** đưa `hero-master.png` và 1–2 ảnh `enemy-*.jpg` làm ảnh chuẩn phong cách.
- **Chuyển động:** dùng ảnh tĩnh đã duyệt làm khung đầu, tạo video bằng G-Labs (omni, start_image), rồi chạy
  `tools/anim-lab/cut_video.py` hoặc `cut_loop.py`, sau đó `outline.py`.
- **Tên và hình phải là thiết kế riêng.** Không dùng sinh vật hay nhân vật có thật trong phim hoặc game khác
  (G-Labs đã chặn một con raptor vì nghi vi phạm bản quyền).

## Bảng màu (khóa 13/10/2026)
- `palette.json` + `palette.png`: 16 màu chủ đạo lấy từ bộ ảnh đã duyệt, cùng bảng màu theo vai trò
  (mực viền, da, vải, gỉ sắt, màu nhận diện từng quái...).
- **Da người phải nằm trong dải đã khóa** (HSV: độ bão hòa 0,34–0,48, độ sáng 0,60–0,72).
  Kiểm tra: `python tools/anim-lab/palette.py check <ảnh>`. Sửa tự động: `palette.py fixskin <vào> <ra>`.
- `hero-master-skinfix.png` là **bản dùng trong game** (da đã kéo về dải trầm). `hero-master.png` giữ làm gốc vẽ.
- Không dùng trắng tinh hay đen tinh. Độ bão hòa tối đa 0,55, trừ lửa và hiệu ứng phép.

## Thang kích thước trên màn hình (chiều cao, đơn vị thế giới game)
| Nhân vật | Cao | So với nhân vật chính |
|---|---|---|
| Nhân vật chính | ~145 | 1 |
| Dơi hang | 62 | nhỏ, bay |
| Nấm lùn | 70 | ~½, quái đông |
| Yêu tinh ném đuốc | 92 | ~⅔ |
| Orc cưỡi heo | 118 | gần bằng |
| Orc khiên gỗ | 120 | gần bằng |
| Troll rừng | 215 | ~1,5 lần |
| Ogre (trùm) | 320 | ~2,2 lần |
Kích thước nằm trong `enemyScale` (`src/game/game.ts`), tính theo chiều cao, không theo chiều rộng.
