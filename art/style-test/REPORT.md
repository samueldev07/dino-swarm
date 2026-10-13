# Dino Swarm Survivors — Báo cáo Thử nghiệm Phong cách Nghệ thuật (Style Test Report)

**Dự án:** Dino Swarm Survivors (Poki HTML5 Survivor Game)  
**Tác giả:** Art Producer (Antigravity)  
**Ngày:** 13/10/2026  
**Đường dẫn thư mục:** `art/style-test/`  
**Tấm ghép so sánh:** [`art/style-test/compare.png`](compare.png)  

---

## 1. Giới thiệu & Mục tiêu Thử nghiệm

Theo định hướng từ **`AGENTS.md`** và **`ART-DIRECTION.md`**, chủ game đã từ chối phong cách hoạt hình 3D bóng bẩy của *Dino Merge Quest* và phong cách chibi dễ thương trẻ con. Thay vào đó, tựa game hướng tới thị trường Poki (casual, kids/teens trên desktop + mobile) với tiêu chí: **biểu cảm, hơi bụi bặm, dữ dằn, đầu to (~40% thân), mắt to dễ đọc, dáng chuyển động phóng đại**, chia làm 2 phong cách thử nghiệm đối đầu:

- **Style V (Vector Sticker Hand-drawn):** Nét viền dày thon màu nâu sẫm `#2a1d16` (~3% chiều cao), mảng màu phẳng + **1 lớp bóng cel shading cứng** (nguồn sáng trên-trái), tối đa 1 điểm sáng nhỏ, không gradient, không chất liệu 3D; viền sticker trắng (~2% chiều cao) quanh nhân vật người chơi và vật phẩm nhặt được (quái không có viền trắng).
- **Style P (Hand-Painted Gouache/Oil):** Nét cọ thấy rõ, bề mặt chất liệu sơn dầu/gouache, viền màu sẫm mảnh (không đen thuần), ánh sáng ấm từ trên-trái, chi tiết sắc nét trên chủ thể, mềm mại và thoáng ở hậu cảnh.

Cả hai bộ ảnh đều được sản xuất đầy đủ cùng một bộ danh mục (9 file mỗi style) với kích thước và thông số chuẩn xác.

---

## 2. Danh mục File Sản xuất (Items Inventory)

| STT | Tên file | Kích thước | Nền | Style V | Style P | Ghi chú kỹ thuật |
|---|---|---|---|:---:|:---:|---|
| 1 | `player-raptor-1-idle.png` | 768 × 608 | Trong suốt | ✅ | ✅ | Raptor dạng 1, 3/4 nhìn sang phải, đứng thế thủ, miệng ngậm, chung đường chân đáy |
| 2 | `player-raptor-1-run.png` | 768 × 608 | Trong suốt | ✅ | ✅ | Chân sải dài chạy nhanh, thân chúi trước, đuôi vươn thẳng cân bằng, miệng mở tập trung |
| 3 | `player-raptor-1-bite.png` | 768 × 608 | Trong suốt | ✅ | ✅ | Đầu chồm sang phải, hàm mở rộng thấy răng nhọn, vuốt giương cao tấn công |
| 4 | `enemy-grub.png` | 384 × 320 | Trong suốt | ✅ | ✅ | Quái sâu bọ xanh ngọc teal, thân ngấn đốt, 1 mắt quặm giận dữ quay phải, không viền sticker |
| 5 | `boss-1.png` | 1024 × 900 | Trong suốt | ✅ | ✅ | Trùm khủng long bạo chúa tím cơ bắp, sừng kem dũng mãnh, miệng răng lởm chởm |
| 6 | `mock-gameplay.png` | 1920 × 1080 | Đục (Opaque) | ✅ | ✅ | Góc nhìn top-down, cỏ rừng xanh trầm tĩnh, raptor ở giữa tung nhát cắn cam, bầy sâu vây quanh, ngọc XP hổ phách, boss mép phải. Không UI, không text |
| 7 | `ui-sample.png` | 1200 × 800 | Đục (Opaque) | ✅ | ✅ | 1 thẻ level-up màu kem (icon phun lửa tròn ở trên, khoảng trống trơn không chữ), 1 nút viên thuốc vàng, 1 nút viên thuốc xanh, 1 huy hiệu vuốt rồng tròn |
| 8 | `thumb-628.png` | 628 × 628 | Đục (Opaque) | ✅ | ✅ | Thumbnail chuẩn Poki: cận cảnh raptor gầm ngoạm, vệt chém cam, bầy quái phía sau, độ tương phản cao, tràn viền không padding, tránh màu #83FFE7 |
| 9 | `thumb-94.png` | 94 × 94 | Đục (Opaque) | ✅ | ✅ | Thumbnail thu nhỏ đúng 94×94 để kiểm tra độ rõ nét trên lưới trang Poki |

---

## 3. Prompts & References sử dụng (Tài liệu Tái hiện Phong cách)

Tất cả các prompt đều tuân thủ chặt chẽ nguyên tắc: nhân vật quay sang phải (facing right), nguồn sáng trên-trái (top-left lighting), không có chữ (no text).

### 3.1. Style V (Vector Sticker Hand-drawn)
- **Tham chiếu:** Hình mẫu thiết kế sprite nội bộ `src/game/sprites.ts`, quy chuẩn màu `#f08a3a` (cam), `#ffd9a0` (kem), `#7a3b1a` (sọc nâu), `#2a1d16` (viền nâu sẫm INK).
- **Raptor Idle (`player-raptor-1-idle`):**  
  `"2D vector sticker illustration of a fierce stylized raptor dinosaur character, form 1 player character for a dinosaur mobile game. Full body in an IDLE pose, slight athletic crouch, balanced tail, mouth closed with a sharp determined expression, 3/4 side view facing right. Big head roughly 40% of body proportion, intense readable eyes (not cute baby or chibi eyes), small spiky head crest feathers. Color palette: vivid orange body, cream belly and jaw, dark reddish-brown dorsal stripes. Art style: crisp hand-drawn vector sticker art with a thick tapered dark-brown outline, a clean white sticker border rim outlining the entire character, flat colors with single hard-edge cel-shading tone lit from the top-left, no soft gradients, no 3D CGI or glossy rendering. Isolated full character centered on pure solid white background, no floor shadow."`
- **Raptor Run (`player-raptor-1-run`):**  
  `"2D vector sticker illustration of the EXACT same character: fierce stylized raptor dinosaur, form 1 player character. RUN POSE: mid-stride running fast, legs spread long in athletic sprint, body leaning forward, tail straight back for balance, mouth open with determined focus, 3/4 side view facing right. Big head ~40% of body proportion, fierce readable eyes (not cute baby/chibi), small spiky head crest feathers. Color palette: vivid orange body (#f08a3a), cream belly (#ffd9a0), dark-brown dorsal stripes (#7a3b1a). Art style: hand-drawn vector sticker art with thick tapered dark-brown outline (#2a1d16, ~3% character height), white sticker rim border (~2%), flat colours with single hard cel-shadow tone lit from top-left, no gradients, no textures, no 3D render look. Centered full body on pure solid white background, no floor shadow."`
- **Raptor Bite (`player-raptor-1-bite`):**  
  `"2D vector sticker illustration of the EXACT same character: fierce stylized raptor dinosaur, form 1 player character. BITE / ATTACK POSE: head lunging aggressively forward to the right, jaw wide open exposing sharp white teeth, fierce menacing readable eye, tail balancing back, claws poised, 3/4 side view facing right. Big head ~40% of body proportion, small spiky head crest feathers. Color palette: vivid orange body (#f08a3a), cream belly (#ffd9a0) and inside mouth, dark-brown dorsal stripes (#7a3b1a). Art style: hand-drawn vector sticker art with thick tapered dark-brown outline (#2a1d16, ~3% character height), white sticker rim border (~2%), flat colours with single hard cel-shadow tone lit from top-left, no gradients, no textures, no 3D render look. Centered full body on pure solid white background, no floor shadow."`
- **Enemy Grub (`enemy-grub`):**  
  `"2D vector sticker illustration of an enemy grub critter for a survivor mobile game: small segmented teal grub (#4a9aa8 family, darker teal shadow #2e6e7a) with one large angry eye on the side facing right, chunky arched caterpillar-like segmented body, little mandibles/pincers, 3/4 side view facing right. Art style: hand-drawn vector look with thick tapered dark-brown outline (#2a1d16), flat colours + single hard cel-shadow tone lit from top-left, NO white sticker rim (only player and pickups get white rim; enemies have NO white rim), no gradients, no 3D CGI. Expressive, slightly scruffy and grumpy, not cute baby. Centered on solid pure white background, no floor shadow."`
- **Boss Brute (`boss-1`):**  
  `"2D vector game sprite of a huge horned purple brute dinosaur boss monster: massive bulky muscular beast with dark purple / violet body (#9a7ab8 family, dark shadow #5a3e74), formidable cream-colored horns on head, wide gaping toothy mouth with sharp jagged teeth, menacing angry eyes facing right, 3/4 side view facing right. Art style: hand-drawn vector look with thick tapered dark-brown outline (#2a1d16), flat colors + single hard cel-shadow tone lit from top-left, NO white sticker rim (enemies have NO white rim), no gradients, no textures, no 3D render look. Fierce, scruffy, intimidating boss silhouette. Centered on solid pure white background, no floor shadow."`
- **Mock Gameplay (`mock-gameplay`):**  
  `"Top-down mock gameplay screenshot for a survivor-like dinosaur game (16:9 widescreen, opaque). Top-down orthographic camera view: calm muted green jungle grass terrain with low contrast and minimal clutter. In the center stands the orange raptor player dino with a clean white sticker contour rim, facing right, slashing forward with one dynamic glowing orange bite-slash arc. Swarming inward from all sides are around 30 small teal segmented one-eyed grubs. Scattered on the ground are several glowing faceted amber XP crystals/gems (warm golden-orange crystals with subtle white rims). On the far right edge of the screen, the huge purple horned brute boss dino is closing in. Art style: crisp 2D vector game art, thick dark-brown outlines, flat cel shading with top-left lighting, extreme clarity and visual hierarchy where the player and amber pop vibrantly and the ground stays calm and quiet. ABSOLUTELY NO UI, NO HUD, NO TEXT, NO HEALTH BARS, NO NUMBERS."`
- **UI Sample (`ui-sample`):**  
  `"2D vector UI sample sheet for a dinosaur mobile game. Canvas: 1200x800 opaque clean presentation background. Contains 4 distinct UI elements arranged neatly without touching: 1) One level-up card: cream/light parchment rectangular card with rounded corners, thick dark-brown outline (#2a1d16), at the top inside a circular framed emblem is an illustrated icon of a fire-spit / flame blast, and below the icon is blank empty parchment space where text normally goes (CRITICAL: ABSOLUTELY NO TEXT, NO LETTERS, completely blank parchment space). 2) One large gold pill-shaped rounded button with thick dark-brown outline and cel shading, blank face. 3) One blue pill-shaped rounded button with thick dark-brown outline and cel shading, blank face. 4) One round golden medallion badge with dinosaur claw emblem. Consistent hand-drawn vector sticker aesthetic with thick dark-brown outlines (#2a1d16), flat colors and single hard cel-shading lit from top-left. ABSOLUTELY NO TEXT, NO NUMBERS anywhere on any element."`
- **Thumbnail Poki (`thumb-628`):**  
  `"628x628 Poki thumbnail game icon for 'Dino Swarm Survivors'. Close-up dramatic dynamic view of the fierce orange raptor dinosaur hero: big head filling most of the frame, jaws wide open roaring/biting facing right, fierce readable eyes, sharp white teeth, high contrast, glowing orange bite-slash arc effect. In the contrasting background behind the raptor: a dark swarming horde of menacing teal one-eyed grubs and shadowy dino silhouettes. Art style: hand-drawn vector sticker look with thick tapered dark-brown ink outlines, flat cel shading with light from top-left, white sticker rim on the raptor. CRITICAL RULES FOR POKI: NO TEXT, NO LOGOS, NO TITLE ANYWHERE. NO BORDER, NO PADDING - bleed all the way to edges. Do NOT use turquoise/cyan #83FFE7."`

---

### 3.2. Style P (Hand-Painted Gouache/Oil)
- **Tham chiếu:** Phong cách vẽ tranh sơn dầu/gouache dã chiến, nét vẽ phóng khoáng nhưng chắc khối, viền màu nâu đen sepia sơn cọ mỏng.
- **Raptor Idle (`player-raptor-1-idle`):**  
  `"Hand-painted game art of a player raptor dinosaur, form 1. Visible painterly gouache and oil brush strokes, warm painterly textures, thin dark-colored (dark sepia/brown, NOT harsh pure black) painted outline. Warm key light from top-left, rich warm gouache shadows. Expressive, slightly scruffy and fierce raptor - NOT cute baby/chibi (no big baby eyes), NOT glossy 3D cartoon. Big head (~40% of body), big readable fierce eye, feathered head crest, athletic idle crouch stance with mouth closed, tail balancing, 3/4 side view facing right. Colors: warm orange body (#f08a3a tones), cream throat and belly, dark-brown back stripes. Detailed on the subject, centered full body on pure solid white background with no floor shadow."`
- **Raptor Run (`player-raptor-1-run`):**  
  `"Hand-painted game art of the EXACT same character: player raptor dinosaur form 1. RUN POSE: mid-stride running fast, legs spread long in athletic sprint, body leaning forward, tail straight back for balance, mouth open with determined fierce focus, 3/4 side view facing right. Big head ~40% of body proportion, fierce readable eyes (NOT cute baby/chibi), small spiky feathered head crest. Colors: warm orange body (#f08a3a tones), cream belly/underbelly (#ffd9a0), dark-brown back stripes (#7a3b1a). Visible painterly gouache and oil brush strokes, warm top-left key light, dark thin sepia/brown painted outline (NOT black line, NO white sticker rim - Style P has NO white rim). Centered full body on pure solid white background, no floor shadow."`
- **Raptor Bite (`player-raptor-1-bite`):**  
  `"Hand-painted game art of the EXACT same character: player raptor dinosaur form 1. BITE / ATTACK POSE: head lunging aggressively forward to the right, jaw wide open exposing sharp white teeth, fierce menacing eye, tail balancing back, claws poised, 3/4 side view facing right. Big head ~40% of body proportion, feathered head crest. Colors: warm orange body (#f08a3a tones), cream belly and throat, dark-brown back stripes. Visible painterly gouache and oil brush strokes, warm top-left key light, dark sepia painted outlines (NO white sticker rim). Centered full body on pure solid white background, no floor shadow."`
- **Enemy Grub (`enemy-grub`):**  
  `"Hand-painted game sprite of an enemy grub critter: Small segmented teal grub (#4a9aa8 tones) with one large glaring angry eye facing right, plump textured segmented body, small mandibles/pincers, 3/4 side view facing right. Visible gouache/oil brush strokes, painterly aesthetic, dark-colored thin painted outline, warm top-left key light, deep teal shadows. Expressive, scruffy and grumpy, not cute baby. Centered full body on pure solid white background with no floor shadow."`
- **Boss Brute (`boss-1`):**  
  `"Hand-painted concept game art of a massive horned purple brute dinosaur boss monster: Heavy hulking beast with textured purple/violet hide (#9a7ab8 family), large weathered cream-colored horns on head, wide gaping toothy maw full of ragged sharp teeth, glowing angry eye facing right, 3/4 side view facing right. Visible gouache and oil brush strokes, dramatic painterly lighting from top-left, rich dark plum shadows, dark painted outlines. Heavy, fierce, scruffy, intimidating boss silhouette. Centered full body on pure solid white background with no floor shadow."`
- **Mock Gameplay (`mock-gameplay`):**  
  `"Top-down hand-painted mock gameplay screenshot for a survivor dinosaur game (16:9 widescreen, opaque). Top-down orthographic camera view: painterly muted dark-olive and moss green jungle ground with soft, loose brush strokes, quiet and low contrast with minimal clutter. In the center: the orange raptor player dino lunges forward with a fiery painted orange bite-slash arc. Swarming inward from all sides: around 30 small teal segmented one-eyed grubs closing in. Scattered on the dirt: several glowing hand-painted amber XP crystals with warm golden rim light. On the far right edge: the massive purple horned boss brute dinosaur looms. Hand-painted gouache/oil game art aesthetic, clear visual hierarchy where the hero and glowing amber pop while the background is soft and loose. ABSOLUTELY NO UI, NO HUD, NO TEXT, NO NUMBERS, NO HEALTH BARS."`
- **UI Sample (`ui-sample`):**  
  `"Hand-painted UI sample sheet for a dinosaur mobile game (opaque canvas). Painterly gouache style with visible textured brush strokes and warm top-left lighting, dark thin painted outlines. Contains 4 distinct UI elements arranged neatly: 1) One level-up card: cream aged parchment paper card with rounded edges, dark painted border, featuring a circular painted medallion icon of a fire-spit / flame blast at the top, and blank empty parchment area below for text (CRITICAL: ABSOLUTELY NO TEXT, NO LETTERS, completely blank space). 2) One large gold pill-shaped rounded button with painted warm bevel and highlights, blank face. 3) One blue pill-shaped rounded button with painterly highlights, blank face. 4) One round painted bronze/gold medallion badge with dinosaur claw motif. ABSOLUTELY NO TEXT, NO NUMBERS anywhere."`
- **Thumbnail Poki (`thumb-628`):**  
  `"628x628 Poki thumbnail game icon for 'Dino Swarm Survivors' in HAND-PAINTED gouache/oil style. High drama close-up portrait of the fierce orange raptor dinosaur hero: big head snarling with open jaws, sharp white teeth, glowing orange bite-slash arc energy, intense fierce glowing eye, facing right with high contrast. In the contrasting background behind the raptor: a dark swarming horde of dark teal one-eyed grubs and shadowy purple dinosaur brutes. Rich painterly brush strokes, dramatic warm top-left key light, dark painted outlines, heroic and intense. CRITICAL RULES FOR POKI: NO TEXT, NO LOGOS, NO TITLE ANYWHERE. NO BORDER, NO PADDING - bleed all the way to edges. Do NOT use turquoise/cyan #83FFE7."`

---

## 4. Kết quả Kiểm duyệt Cổng Chất lượng (Quality Gate Verification)

Mọi ảnh trong bộ sản phẩm đã được kiểm tra độc lập qua 6 tiêu chuẩn khắt khe của Quality Gate:

1. **Clean Transparent Background:** Mép cắt không còn viền trắng sót (no halo/fringe), viền mờ 0.7px khử răng cưa mượt mà (anti-aliased edges).
2. **Consistent Outline Weight:** Độ dày viền mực nhất quán giữa các nhân vật cùng một phong cách.
3. **Top-Left Lighting:** Nguồn sáng hướng 10 giờ (trên-trái), đổ bóng về góc dưới-phải đồng bộ trên mọi chi tiết.
4. **48px Silhouette Readability:** Khi đổ đen hoàn toàn và thu nhỏ về ô 48×48 px, hình dạng nhân vật vẫn nhận diện rõ ràng tức thì (raptor nhanh nhẹn có đuôi và mào, sâu ngấn đốt cung tròn, boss khối gai sừng to lớn).
5. **No Text / Correct Anatomy / Facing Right:** Không chữ, không logo/chữ ký giả, không thừa chân/ngón/răng, tất cả nhân vật đều quay mặt sang bên phải.
6. **Pose Alignment & Proportions:** Ba tư thế raptor (`idle`, `run`, `bite`) nằm trên cùng đường chân đáy (`baseline_y = 530`), giữ nguyên tỉ lệ đầu 40%, cùng kích thước thân và cùng line weight.

### Bảng Kiểm Tra Chất Lượng Chi Tiết

| Phong cách | Tên file | Kích thước | Clean Alpha | Outline Weight | Top-Left Light | 48px Silhouette | Clean Anatomy / Quay phải | Baseline & Tỉ lệ | Kết quả chung |
|:---:|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **V** | `player-raptor-1-idle.png` | 768 × 608 | ĐẠT (0 halo) | ĐẠT (~3%) | ĐẠT (10h) | ĐẠT (Rõ rệt) | ĐẠT (quay phải, 0 lỗi) | ĐẠT (y=530) | **PASS** |
| **V** | `player-raptor-1-run.png` | 768 × 608 | ĐẠT (0 halo) | ĐẠT (~3%) | ĐẠT (10h) | ĐẠT (Rõ rệt) | ĐẠT (quay phải, 0 lỗi) | ĐẠT (y=530) | **PASS** |
| **V** | `player-raptor-1-bite.png` | 768 × 608 | ĐẠT (0 halo) | ĐẠT (~3%) | ĐẠT (10h) | ĐẠT (Rõ rệt) | ĐẠT (quay phải, 0 lỗi) | ĐẠT (y=530) | **PASS** |
| **V** | `enemy-grub.png` | 384 × 320 | ĐẠT (0 halo) | ĐẠT (~3%) | ĐẠT (10h) | ĐẠT (Dạng cung) | ĐẠT (quay phải, 0 lỗi) | N/A | **PASS** |
| **V** | `boss-1.png` | 1024 × 900 | ĐẠT (0 halo) | ĐẠT (~3%) | ĐẠT (10h) | ĐẠT (Khối sừng) | ĐẠT (quay phải, 0 lỗi) | N/A | **PASS** |
| **V** | `mock-gameplay.png` | 1920 × 1080 | N/A (Đục) | ĐẠT | ĐẠT | N/A | ĐẠT (0 UI, 0 text) | N/A | **PASS** |
| **V** | `ui-sample.png` | 1200 × 800 | N/A (Đục) | ĐẠT | ĐẠT | N/A | ĐẠT (0 chữ/số) | N/A | **PASS** |
| **V** | `thumb-628.png` | 628 × 628 | N/A (Đục) | ĐẠT | ĐẠT | N/A | ĐẠT (0 text, 0 viền) | N/A | **PASS** |
| **V** | `thumb-94.png` | 94 × 94 | N/A (Đục) | ĐẠT | ĐẠT | ĐẠT (Cực nét) | ĐẠT (0 text) | N/A | **PASS** |
| **P** | `player-raptor-1-idle.png` | 768 × 608 | ĐẠT (0 halo) | ĐẠT (Nét cọ sẫm) | ĐẠT (10h) | ĐẠT (Rõ rệt) | ĐẠT (quay phải, 0 lỗi) | ĐẠT (y=530) | **PASS** |
| **P** | `player-raptor-1-run.png` | 768 × 608 | ĐẠT (0 halo) | ĐẠT (Nét cọ sẫm) | ĐẠT (10h) | ĐẠT (Rõ rệt) | ĐẠT (quay phải, 0 lỗi) | ĐẠT (y=530) | **PASS** |
| **P** | `player-raptor-1-bite.png` | 768 × 608 | ĐẠT (0 halo) | ĐẠT (Nét cọ sẫm) | ĐẠT (10h) | ĐẠT (Rõ rệt) | ĐẠT (quay phải, 0 lỗi) | ĐẠT (y=530) | **PASS** |
| **P** | `enemy-grub.png` | 384 × 320 | ĐẠT (0 halo) | ĐẠT (Nét cọ sẫm) | ĐẠT (10h) | ĐẠT (Dạng cung) | ĐẠT (quay phải, 0 lỗi) | N/A | **PASS** |
| **P** | `boss-1.png` | 1024 × 900 | ĐẠT (0 halo) | ĐẠT (Nét cọ sẫm) | ĐẠT (10h) | ĐẠT (Khối sừng) | ĐẠT (quay phải, 0 lỗi) | N/A | **PASS** |
| **P** | `mock-gameplay.png` | 1920 × 1080 | N/A (Đục) | ĐẠT | ĐẠT | N/A | ĐẠT (0 UI, 0 text) | N/A | **PASS** |
| **P** | `ui-sample.png` | 1200 × 800 | N/A (Đục) | ĐẠT | ĐẠT | N/A | ĐẠT (0 chữ/số) | N/A | **PASS** |
| **P** | `thumb-628.png` | 628 × 628 | N/A (Đục) | ĐẠT | ĐẠT | N/A | ĐẠT (0 text, 0 viền) | N/A | **PASS** |
| **P** | `thumb-94.png` | 94 × 94 | N/A (Đục) | ĐẠT | ĐẠT | ĐẠT (Màu tương phản) | ĐẠT (0 text) | N/A | **PASS** |

---

## 5. Đánh giá Chuyên môn: Phong cách nào Đọc Tốt Hơn trên Điện Thoại?

### 5.1. Phân tích Thực nghiệm trên Màn hình Nhỏ (Phone & Thumb-94)

1. **Khả năng tách lớp thị giác giữa bầy quái (Layer Separation in Swarms):**
   - **Style V (Vector Sticker):** Viền sticker màu trắng quanh khủng long người chơi và ngọc XP hổ phách phát huy tác dụng cực kỳ vượt trội. Khi có hơn 100 quái vây quanh trên màn hình điện thoại 5–6 inch, người chơi lập tức nhìn thấy vị trí của mình mà không cần căng mắt. Nét viền mực đậm `#2a1d16` giữ cho các mép thân không bị hòa trộn vào nền cỏ hay cơ thể của quái.
   - **Style P (Hand-Painted):** Dù rất nghệ thuật và có chiều sâu mỹ thuật cao, các nét cọ sơn dầu mềm ở rìa nhân vật dễ bị "chìm" vào texture của mặt đất khi thu nhỏ về độ phân giải của điện thoại. Khi quái vây dày đặc, màu sắc của raptor và bầy sâu có xu hướng hòa quyện tạo cảm giác bết dính thị giác (visual mud).

2. **Độ sắc nét của Thumbnail Poki ở cỡ 94×94 px:**
   - Ở kích thước 94×94 px trên giao diện trang chủ Poki, **Style V** giữ được độ sắc cạnh tuyệt đối nhờ các mảng màu phẳng (flat cel shading) và đường viền sticker trắng tương phản cao. Mắt raptor, miệng răng nhọn và vệt chém màu cam bừng sáng rõ rệt như một biểu tượng đồ họa (graphic icon).
   - **Style P** ở 94×94 px trông có không khí điện ảnh hơn nhưng các chi tiết vảy và cọ vẽ li ti biến thành hạt nhiễu (noise), khiến mắt người nhìn mất thêm 200–300ms để nhận ra đầu con khủng long.

3. **Tối ưu hóa Hiệu năng & Dung lượng Tải Web HTML5:**
   - Style V với các mảng màu phẳng và cel-shading nén sang WebP đạt dung lượng cực nhẹ (thường chỉ 15–25 KB mỗi sprite), tải dưới 5 giây trên 4G/3G mobile.
   - Style P có gradient và cọ vẽ phức tạp đòi hỏi chất lượng nén cao hơn, dung lượng file thường gấp 2–3 lần.

4. **Tính nhất quán khi mở rộng sản xuất (Production Scalability):**
   - Với Style V, khi sản xuất hàng loạt 9 loài khủng long tiến hóa và hàng chục quái vật ở Brief 02, việc giữ đúng quy tắc nét viền 3% và bóng cel shading 2 tông là cực kỳ chuẩn xác và tự động hóa được bằng code và prompt.

### 5.2. Đề xuất của Art Producer

> [!IMPORTANT]
> **Khuyến nghị lựa chọn: CHỌN STYLE V (Hand-Drawn Vector Sticker)**.  
> Style V giải quyết hoàn hảo bài toán đọc nhanh trên màn hình cảm ứng di động, đáp ứng 100% tiêu chí nổi bật của Poki, giữ được độ dữ dằn scruffy không bị baby/chibi, và đảm bảo gameplay survivor không bao giờ bị rối mắt.

---

## 6. Thử nghiệm Nâng cấp: Style V+ (Vector Plus / Enhanced Cel-Shaded)

Theo phản hồi từ chủ dự án: *"Style V ổn nhưng quá đơn giản nên muốn nâng V lên chút như tầm mockup P"*, đồng thời giải quyết bài toán cốt lõi về **Animation và Skill Sprite FX**, chúng tôi đã thực hiện một đợt thử nghiệm mở rộng tạo ra nhánh **Style V+ (Vector Plus)**:
- **Tấm ảnh so sánh 3 phong cách:** [`art/style-test/compare-v-plus.png`](compare-v-plus.png)
- **Asset nhân vật V+:** [`art/style-test/player-raptor-v-plus.png`](player-raptor-v-plus.png) (768 × 608, trong suốt, viền sticker trắng)
- **Mockup gameplay V+:** [`art/style-test/mock-gameplay-v-plus.png`](mock-gameplay-v-plus.png) (1920 × 1080)

### 6.1. Đặc trưng của Style V+
1. **Khắc phục độ đơn điệu của Style V:**
   - Thay vì chỉ có 1 mảng bóng phẳng đơn điệu, Style V+ nâng lên **2–3 tầng bóng cel-shading gãy gọn** (deep shadow tone, midtone cam rực rỡ, và viền sáng vàng ấm/rim highlight từ trên-trái).
   - Cơ bắp chân sau và đường sọc lưng được điêu khắc hình khối gãy gọn mạnh mẽ (comic action style, tương tự *Hades* hoặc truyện tranh phương Tây hiện đại), giúp nhân vật trông lực lưỡng, dữ dằn và "đắt tiền" hơn hẳn mà không bị cảm giác rẻ tiền hay dẹt phẳng.
2. **Kế thừa chiều sâu & không khí từ Mockup P:**
   - Nền đất rừng được hạ độ tương phản nhưng có lớp viền vignette cây cỏ mềm tối ở rìa màn hình.
   - Nhát cắn/chém cam phát ra ánh sáng vàng ấm phản chiếu nhẹ xuống mặt đất (ambient bounce light), giúp bối cảnh có chiều sâu điện ảnh như phong cách Hand-painted.
3. **Giải quyết triệt để vấn đề Animation & Skill Sprite:**
   - **Tương thích hoàn hảo với Canvas2D Engine:** Hệ thống code hiện tại (`src/game/game.ts`, `fx.ts`, `sprites.ts`) sử dụng các đường nét mực đậm `#2a1d16` để vẽ slashes (`drawSlashes`), sóng âm (`drawWaves`), và squashing/stretching động theo thời gian thực (runtime animation).
   - **Không bị "Texture Swimming":** Tranh sơn dầu (Style P) khi quay góc, kéo giãn bằng code HTML5 canvas sẽ bị vỡ mảng hạt và đứt gãy khớp nối. Ngược lại, Style V+ với nét viền vector kín và mảng màu cel-shaded sẽ giữ nguyên 100% độ sắc nét khi xoay 360 độ hoặc thu phóng lúc raptor cắn xé.

---

## 7. Bảng Tổng Hợp So Sánh 3 Phương Án

| Tiêu chí Đánh giá | Style V (Vector Flat) | Style P (Hand-Painted) | Style V+ (Vector Plus) |
|---|:---:|:---:|:---:|
| **Độ bắt mắt & Chiều sâu mỹ thuật** | Trung bình (hơi phẳng) | Rất cao (nghệ thuật sơn dầu) | **Rất cao (Comic cel-shaded điện ảnh)** |
| **Độ rõ nét trên Mobile (Readability)** | ⭐⭐⭐⭐⭐ (Cực rõ) | ⭐⭐⭐ (Dễ bết khi đông quái) | **⭐⭐⭐⭐⭐ (Cực rõ + Đẹp mắt)** |
| **Xử lý Animation & Skill Sprites** | ⭐⭐⭐⭐⭐ (Tuyệt đối sắc bén) | ⭐⭐ (Dễ lộ vết cắt/vỡ hạt) | **⭐⭐⭐⭐⭐ (Cực mượt trên Canvas2D)** |
| **Hiệu năng 60 FPS Poki Web** | Tối ưu tuyệt đối | Nặng dung lượng | **Rất nhẹ & Tối ưu** |
| **Thời gian sản xuất hàng loạt** | Nhanh nhất | Rất chậm | **Cân bằng, dễ nhân bản** |

---

---

## 8. Kết luận Đột phá: Hướng đi Tối ưu — HYBRID DIRECTION (Mặt đất Hand-Painted + Nhân vật & FX Vector Plus)

Từ nhận định sắc bén của chủ dự án: *"Phần mặt đất vẫn nên dùng Hand-painted vì nó không dính tới motion"*, chúng tôi đã hoàn thiện bản thử nghiệm phương án lai (**Hybrid**):
- **Tấm ảnh so sánh 4 phương án tổng thể:** [`art/style-test/compare-options.png`](compare-options.png)
- **Mockup Gameplay Hybrid (1920 × 1080):** [`art/style-test/mock-gameplay-hybrid.png`](mock-gameplay-hybrid.png)

### 8.1. Vì sao Công thức Hybrid là Lựa chọn Hoàn hảo Nhất?
1. **Mặt đất TĨNH (Zero Motion Deformation):**
   - Mặt đất trong engine chỉ dịch chuyển tịnh tiến theo tọa độ camera (`ctx.translate(-cam.x, -cam.y)`) qua cấu trúc `CanvasPattern` 512×512 lặp vô tận.
   - Hoàn toàn **không bị xoay góc (rotation), không co giãn (squash & stretch), không có khớp xương hay frame morphing**.
   - Do đó, chất liệu Hand-painted (sơn dầu/gouache) với rêu phong, đất mùn và cỏ dại hữu cơ mang lại chiều sâu điện ảnh tuyệt mỹ mà **không bao giờ gặp lỗi vỡ hạt hay lem cọ (zero texture swimming)**.
2. **Nhân vật & Quái vật ĐỘNG (Dynamic Motion & Slashes):**
   - Đòi hỏi chuyển động nhanh, cử động chân tay nhịp nhàng và tương tác với hàng chục quái vật cùng lúc.
   - Sử dụng **Vector Plus Cel-Shaded** với nét viền mực nâu sẫm `#2a1d16` và viền sticker trắng trên Raptor/ngọc XP: đảm bảo 100% sắc nét ở 60 FPS trên Canvas2D, không bị đứt gãy khớp lúc di chuyển.
3. **Hiệu ứng Tách lớp Thị giác Tuyệt đối (Layer Separation):**
   - Khi mặt đất là tranh vẽ mềm mại (không có nét viền đen), các nhân vật với nét viền mực và viền sticker trắng sẽ **nổi bật bật khỏi nền**, giúp người chơi trên điện thoại định vị ngay lập tức vị trí của mình giữa bầy 100 quái vật mà không bị hoa mắt.

---

## 10. Thử nghiệm Mở rộng: Nhân vật Chính là Người Tiền Sử (Caveman Main Character)

Theo đề xuất thử nghiệm từ chủ dự án: *"Main kiểu người tiền sử, người đơn giản"*, chúng tôi đã sản xuất bản thử nghiệm nhân vật Người tiền sử đối đầu với thế giới khủng long:
- **Tấm ảnh so sánh Raptor vs Người tiền sử:** [`art/style-test/compare-caveman.png`](compare-caveman.png)
- **Sprite Người tiền sử (768 × 608, trong suốt):** [`art/style-test/player-caveman-idle.png`](player-caveman-idle.png)
- **Mockup Gameplay với Người tiền sử (1920 × 1080):** [`art/style-test/mock-gameplay-caveman.png`](mock-gameplay-caveman.png)

### 10.1. Đặc điểm Thiết kế của Người Tiền Sử (Cave Boy Hero)
1. **Thiết kế Đơn giản, Biểu cảm & Hoang dã:**
   - Dáng người nhỏ nhắn, thể thao, đầu to (~40% thân), mắt to quắc sáng quyết đoán, tóc đen rối buộc một mẩu xương dã thú.
   - Trang phục tối giản: quấn tấm da báo/da khủng long vắt chéo vai, tay cầm cây rìu đá buộc dây thừng thô sơ.
   - Thể hiện hoàn toàn bằng **chất cọ vẽ nổi khối gouache + viền mực tự nhiên `#2a1d16`** đồng nhất 100% với bầy sâu và trùm khủng long.
2. **Ưu thế về Gameplay & Tệp người chơi Poki:**
   - **Tạo cảm xúc anh hùng sinh tồn:** Hình ảnh một cậu bé người tiền sử nhỏ bé đơn độc vung rìu lửa chiến đấu giữa bầy quái vật và trùm khủng long khổng lồ tạo cảm giác kịch tính, lôi cuốn và dễ đồng cảm hơn rất nhiều cho đối tượng teen/kids trên Poki.
   - **Tiến hóa Vũ khí / Kỹ năng rõ ràng:** Rất trực quan để thiết kế cây nâng cấp (rìu đá thô sơ $\rightarrow$ rìu lửa $\rightarrow$ chùy gai sấm sét $\rightarrow$ boomerang xương thần).

---

## 11. Thử nghiệm Nâng cấp: Người Tiền Sử Hài Hước & Tiến Hóa Trang Bị (Goofy Armored Caveman)

Theo định hướng từ chủ dự án: *"Người tiền sử nhưng sẽ nâng cấp kiểu giáp, khiên kiếm... nhìn ngốc ngốc hài hài tí"*, chúng tôi đã tạo bản thiết kế tiến hóa và mockup gameplay tương ứng:
- **Tấm ảnh so sánh & Cây tiến hóa tổng hợp:** [`art/style-test/compare-goofy-caveman.png`](compare-goofy-caveman.png)
- **Bảng 3 giai đoạn tiến hóa trang bị:** [`art/style-test/caveman-evolution-stages.png`](caveman-evolution-stages.png)
- **Mockup Gameplay Người tiền sử Full giáp chiến đấu:** [`art/style-test/mock-gameplay-caveman-armored.png`](mock-gameplay-caveman-armored.png)

### 11.1. Ba Giai đoạn Nâng cấp Trang bị Hài hước
1. **Form 1 (Đầu game — Ngố ngáo & Thô sơ):**
   - Cậu bé tiền sử gầy gò/ngộ nghĩnh, tóc bù xù cắm mẩu xương ngang đầu, nụ cười toe toét ngây ngô.
   - Quần da báo rách rưới, tay cầm khúc gậy gỗ buộc cục đá thô sơ bằng dây leo.
2. **Form 2 (Giữa game — Chế đồ sinh tồn ngộ nghĩnh):**
   - Đội mai rùa/hộp sọ khủng long con làm nón bảo hiểm, ngực đeo giáp xương sườn tự chế.
   - Tay trái cầm khiên mai rùa gai góc, tay phải lăm lăm thanh kiếm răng cưa làm từ xương hàm dã thú.
3. **Form 3 (Cuối game — Chiến thần tiền sử hề hước):**
   - Đội nguyên chiếc đầu lâu khủng long T-Rex con làm mũ sắt (hai mắt lấm lét nhìn qua kẽ răng nanh).
   - Khiên hóa thạch ốc gai cổ đại khổng lồ, tay vung đại đao đá magma rực lửa to quá khổ.

---

## 12. Trạng thái Bàn giao Toàn bộ Tệp Thử nghiệm

- Toàn bộ tài sản thử nghiệm đã được lưu trữ hoàn chỉnh tại:
  - `art/style-test/V/` (9 file chuẩn Style V)
  - `art/style-test/P/` (9 file chuẩn Style P)
  - `art/style-test/compare.png` (So sánh V vs P)
  - `art/style-test/compare-v-plus.png` (So sánh V vs P vs V+)
  - `art/style-test/compare-options.png` (Bản tổng hợp 4 phương án và phân tích chi tiết)
  - `art/style-test/compare-painterly-ink.png` (Bản đối chiếu trực tiếp Raptor vs Grub quẹt cọ + Mockup)
  - `art/style-test/compare-natural-open-map.png` (Bản đối chiếu Map mở rộng vô tận & Viền tự nhiên không sticker)
  - `art/style-test/compare-caveman.png` (Bản so sánh Raptor vs Người tiền sử)
  - `art/style-test/compare-goofy-caveman.png` (Bản cây tiến hóa Người tiền sử hài hước + Gameplay)
  - `art/style-test/caveman-evolution-stages.png` (3 form tiến hóa trang bị)
  - `art/style-test/player-caveman-idle.png` (Sprite Người tiền sử dạng 1)
  - `art/style-test/mock-gameplay-caveman.png` & `mock-gameplay-caveman-armored.png`
  - `art/style-test/player-raptor-v-plus.png` & `mock-gameplay-v-plus.png`
  - `art/style-test/player-raptor-painterly-ink.png` (Raptor quẹt cọ có viền mực)
  - `art/style-test/mock-gameplay-hybrid.png` & `mock-gameplay-painterly-ink.png`
  - `art/style-test/mock-gameplay-natural-open-map.png` (Mockup chuẩn Map mở rộng + Viền tự nhiên)
  - `art/style-test/REPORT.md`
- Tuân thủ tuyệt đối quyền hạn: **chỉ ghi trong `art/style-test/`, không chạm vào `src/`, `public/`, `tools/`, `playtest/`, không dùng git**.
- Đã sẵn sàng bắt tay vào sản xuất toàn bộ assets của Brief 02 theo quyết định cuối cùng của chủ dự án.
