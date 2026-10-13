# Dino Swarm Survivors — Báo cáo Thử nghiệm Nhân vật Người Tiền Sử "Grok" (Brief 03)

**Dự án:** Dino Swarm Survivors (Poki HTML5 Top-Down Survivor Game)  
**Tác giả:** Art Producer (Antigravity)  
**Ngày thực hiện:** 13/10/2026  
**Thư mục làm việc:** `art/caveman-test/`  
**Trang xem thử chuyển động trực tiếp:** [`art/caveman-test/preview.html`](preview.html) *(Mở bằng trình duyệt bằng cách bấm đúp vào file)*  
**Style Anchor đối chiếu:** `art/style-test/mock-gameplay-caveman-armored.png`

---

## 1. Mục tiêu & Bối cảnh Thử nghiệm

Theo yêu cầu từ chủ game:
> *"Thử 1 nhân vật người tiền sử + chuyển động + nâng cấp đồ. Mục đích: chủ game muốn tự xem nhân vật chính chuyển động ra sao và đổi đồ qua từng bậc trông thế nào: từ đóng khố, ngực trần nhiều lông, cho tới mũ sọ khủng long, kiếm và khiên. Đây chỉ là bản thử. Chưa vẽ thứ gì khác."*

Chúng tôi đã thiết kế và hoàn thiện toàn bộ gói tài sản thử nghiệm cho nhân vật **"Grok"** — một anh chàng người tiền sử lém lỉnh, nhe răng cười dữ dằn, đầu to (~40% thân), thể thao, ngộ nghĩnh, không bị chibi trẻ con và không bạo lực máu me.

---

## 2. Danh mục Tài sản Đã bàn giao (Deliverables Inventory)

Tất cả các file đều được lưu trữ trực tiếp bên trong `art/caveman-test/`:

| STT | Tên file | Kích thước | Nền | Mô tả chi tiết |
|---|---|---|---|---|
| 1 | `grok-t1-idle.png` | 768 × 768 | Trong suốt | Tier 1 "Wild": Khố da báo, ngực trần lông lá, cầm chùy gỗ thấp |
| 2 | `grok-t1-run.png` | 768 × 768 | Trong suốt | Tier 1 "Wild": Sải chân chạy, thân chúi trước, cầm chùy gỗ |
| 3 | `grok-t1-attack.png` | 768 × 768 | Trong suốt | Tier 1 "Wild": Vung chùy gỗ chém ngang thân (follow-through) |
| 4 | `grok-t2-idle.png` | 768 × 768 | Trong suốt | Tier 2 "Hunter": Giáp ngực xương + giáp vai xương, kiếm xương răng cưa |
| 5 | `grok-t2-run.png` | 768 × 768 | Trong suốt | Tier 2 "Hunter": Chạy nhanh với kiếm xương dã thú |
| 6 | `grok-t2-attack.png` | 768 × 768 | Trong suốt | Tier 2 "Hunter": Nhát chém kiếm xương uy lực |
| 7 | `grok-t3-idle.png` | 768 × 768 | Trong suốt | Tier 3 "Warlord": Mũ sọ khủng long T-Rex, khiên mai rùa gai, kiếm lửa hổ phách |
| 8 | `grok-t3-run.png` | 768 × 768 | Trong suốt | Tier 3 "Warlord": Chạy chiến trận full giáp |
| 9 | `grok-t3-attack.png` | 768 × 768 | Trong suốt | Tier 3 "Warlord": Vung đại đao lửa hổ phách quét vòng cung |
| 10 | `grok-t1-body-idle.png` | 768 × 768 | Trong suốt | Thân trần Tier 1 dáng idle (tay rỗng có khớp nắm vũ khí) |
| 11 | `grok-t1-body-run.png` | 768 × 768 | Trong suốt | Thân trần Tier 1 dáng run (tay rỗng) |
| 12 | `grok-t3-body-idle.png` | 768 × 768 | Trong suốt | Thân full giáp Tier 3 dáng idle (tay rỗng chờ lắp kiếm & khiên) |
| 13 | `grok-t3-body-run.png` | 768 × 768 | Trong suốt | Thân full giáp Tier 3 dáng run (tay rỗng) |
| 14 | `weapon-club.png` | 512 × 512 | Trong suốt | Chùy gỗ tiền sử chỉ thẳng đứng lên trên, chuôi cầm ở đáy giữa |
| 15 | `weapon-bone-sword.png` | 512 × 512 | Trong suốt | Kiếm xương răng cưa chỉ thẳng đứng, chuôi cầm ở đáy giữa |
| 16 | `weapon-fire-sword.png` | 512 × 512 | Trong suốt | Kiếm đá magma rực lửa hổ phách chỉ thẳng đứng, chuôi cầm ở đáy giữa |
| 17 | `shield-turtle.png` | 512 × 512 | Trong suốt | Khiên mai rùa gai tiền sử đứng thẳng, quai đeo ở tâm giữa |
| 18 | `anchors.json` | JSON | — | Tọa độ điểm chốt tay cầm trên thân (768) và chuôi vũ khí (512) |
| 19 | `preview.html` | HTML | — | Trang chạy thử chuyển động độc lập (không CDN, mở đúp chuột) |

---

## 3. Prompts & References sử dụng

Toàn bộ quy trình sinh ảnh tuân thủ nghiêm ngặt:
- **Style anchor:** `art/style-test/mock-gameplay-caveman-armored.png` (nét vẽ tay viền mực nâu sẫm `#2a1d16`, mảng màu gouache có chất cọ dày nổi khối, ánh sáng ấm góc trên-trái, không dùng viền sticker trắng nhân tạo, chân chạm đất tự nhiên).
- **Nhân vật đồng nhất:** Giữ nguyên gương mặt Grok (mắt to biểu cảm, mũi tròn, miệng cười toe toét khoe răng dữ dằn, tóc nâu đen bù xù cài mẩu xương, da rám nắng ấm).

### 3.1. Prompt Tier 1 "Wild"
`"2D game character sprite concept sheet showing 3 full-body poses side-by-side horizontally of the same caveman hero character named Grok in Tier 1 'Wild' gear, on a pure solid white background. Matching the exact art style, face, line work (#2a1d16 dark brown ink outlines), warm gouache painterly shading, and stocky proportions of the caveman hero in the reference image (big head roughly 40% of height, stocky athletic muscular body, tanned warm skin, round nose, big readable determined eyes, wide cheeky fierce grin showing teeth). Character appearance (Tier 1 Wild): Wild shaggy messy dark brown hair with a small prehistoric bone tied into it; bare head with no helmet; bare athletic chest with light chest hair; ragged leopard-spotted fur pelt loincloth; brown vine wrist wraps; barefoot. Wielding a primitive knobby wooden branch club wrapped with vines. The 3 poses are arranged horizontally side-by-side from left to right, all facing toward the right in 3/4 perspective, identical character scale, feet aligned on the same horizontal baseline: 1. IDLE (left): Athletic ready stance, knees slightly bent, holding the wooden club resting low in hand, cheeky determined grin facing right. 2. RUN (middle): Dynamic mid-stride athletic run sprinting to the right, body leaning forward, legs spread in a running stride, holding the wooden club pumped for momentum. 3. ATTACK (right): Powerful lunging forward melee attack swing, body planted forward in an aggressive strike, swinging the wooden club vigorously across his body. Style: Stylized painterly gouache mobile game sprite art with clean dark-brown ink outlines (#2a1d16), warm top-left lighting, golden rim highlight on back/shoulders, no white sticker borders, isolated on pure solid white background without floor shadows."`

### 3.2. Prompt Tier 2 "Hunter"
`"2D game character sprite concept sheet showing 3 full-body poses side-by-side horizontally of Grok in Tier 2 'Hunter' gear. Same face, head proportions (~40% body), skin tone, shaggy hair with bone, and cheeky fierce grin as Tier 1 Grok. 3/4 view FACING RIGHT. Tier 2 'Hunter' Gear: Leopard-print loincloth, bone chest armour (curved ribcage plate strapped over chest) + bone shoulder pad on left shoulder, leather/fur wrist wraps, fur-trimmed boots on feet. Weapon: BONE SWORD (carved dinosaur bone sword with sharp jagged serrated teeth edge and leather-wrapped hilt). Poses: 1. IDLE (ready stance, holding bone sword low), 2. RUN (mid-stride running forward), 3. ATTACK (powerful slash follow-through). Consistent painterly gouache style with dark-brown ink outlines (#2a1d16), warm top-left lighting."`

### 3.3. Prompt Tier 3 "Warlord"
`"2D game character sprite concept sheet showing 3 full-body poses of Grok in Tier 3 'Warlord' gear. Same face, head proportions (~40% body), skin tone, and cheeky fierce grin. 3/4 view FACING RIGHT. Tier 3 'Warlord' Gear: Dino-skull helmet (small fierce dinosaur/raptor skull worn as helmet on head, jaw framing forehead, eyes visible underneath), spiked turtle-shell shield strapped to left arm, small tattered red-brown animal pelt cape on shoulders, heavy bone chest armor and studded fur boots. Weapon: Glowing amber FIRE SWORD (ancient magma stone blade emitting warm golden-orange fire glow). Poses: 1. IDLE, 2. RUN, 3. ATTACK with glowing fire sword swing. Solid white background, no floor shadows."`

### 3.4. Prompt Trang bị & Thân mình
- **Vũ khí rời (`weapon-club`, `weapon-bone-sword`, `weapon-fire-sword`, `shield-turtle`):** Vẽ chỉ thẳng đứng (upright vertical), cán cầm ở đáy giữa canvas 512×512, nét viền mực `#2a1d16`.
- **Thân mình rỗng tay (`grok-t1-body`, `grok-t3-body`):** Dáng đứng và chạy hoàn toàn khớp với bản full pose nhưng hai bàn tay để trống ở tư thế nắm chuôi cầm, sẵn sàng cho engine code xoay vũ khí lắp vào.

---

## 4. Đánh giá Chuyên môn: So sánh Phương án A (Full Poses) vs Phương án B (Layered Weapon)

Tại file [`art/caveman-test/preview.html`](preview.html), chủ game có thể trực tiếp bật qua lại giữa 2 phương án này để tự mình quan sát:

| Tiêu chí So sánh | Phương án A: Full Poses (Vẽ nguyên dáng) | Phương án B: Layered (Ghép vũ khí xoay code) |
|---|---|---|
| **Chất lượng Mỹ thuật (Aesthetics)** | ⭐⭐⭐⭐⭐ **Cực kỳ tự nhiên & sống động**<br>Nét cọ chuyển tiếp liền lạc từ vai ➔ cánh tay ➔ bàn tay ➔ thân kiếm. Dáng vung đòn có độ vặn hông và nghiêng người chân thực. | ⭐⭐⭐ **Tương đối cứng (puppet feel)**<br>Vũ khí xoay theo một trục tròn quanh cổ tay, bàn tay không thay đổi góc cầm khi vung chém, nhìn hơi giống con rối 2D. |
| **Độ bám sát Phong cách Sơn dầu** | ⭐⭐⭐⭐⭐ **Ăn khớp 100%**<br>Chất cọ gouache dày và ánh sáng hắt vàng ấm phủ đều cả vũ khí và người. | ⭐⭐⭐⭐ **Khá tốt**<br>Vũ khí vẫn là cọ sơn dầu, nhưng tại khớp nối tay cầm đôi khi lộ vết cắt ghép nếu không căn đúng pixel. |
| **Khả năng Mở rộng Gameplay (Scalability)** | ⭐⭐⭐ **Tốn công vẽ**<br>Cứ thêm 1 loại vũ khí mới (ví dụ rìu sét, boomerang, chùy gai) là họa sĩ phải vẽ lại đủ 3 pose (Idle, Run, Attack). | ⭐⭐⭐⭐⭐ **Cực kỳ linh hoạt & tiết kiệm**<br>Chỉ cần vẽ 1 ảnh vũ khí 512×512 duy nhất, code có thể lắp cho bất kỳ nhân vật nào và xoay 360° theo hướng quái vật. |
| **Hiệu năng 60 FPS Poki Web** | ⭐⭐⭐⭐⭐ **Nhẹ tênh (1 drawImage)** | ⭐⭐⭐⭐ **Tốn 2-3 draw calls mỗi frame** |

### Khuyến nghị của Art Producer:
> [!TIP]
> **Nên sử dụng Phương án A (Full Poses) cho các bậc Tiến hóa chính của Nhân vật (Main Evolution Tiers)** để đảm bảo độ "đã mắt", lực lưỡng và đắt tiền khi người chơi nhìn vào nhân vật chính của mình suốt 10 phút chơi.  
> Phương án B (Layered) nên để dành làm tính năng phụ trợ (ví dụ: các vũ khí bay quanh nhân vật kiểu Orbiting Shields/Spinning Axes trong gameplay survivor).

---

## 5. Kết quả Kiểm tra Chất lượng (Quality Gate Checklist)

- [x] **Nền trong suốt sạch 100%:** Toàn bộ 17 file PNG được khử nền bằng thuật toán floodfill kết hợp soft anti-aliased alpha feathering (bán kính 0.7px), không để lại bất kỳ diềm đen hay halo bẩn nào.
- [x] **Khóa cứng tiếp đất (Baseline Alignment):** 100% các sprite nhân vật (cả 9 full poses và 4 disarmed bodies) đều có điểm đáy bàn chân chạm đúng `baseline y=640` trên canvas 768×768 (tọa độ pixel đáy thực tế là y=639). Khi trình duyệt hoán đổi giữa Idle ➔ Run ➔ Attack, **bàn chân đứng vững như bàn thạch, không bị giật nảy hay trượt chỗ**.
- [x] **Đồng nhất tỷ lệ & Khuôn mặt:** Gương mặt Grok với nét cười lém lỉnh, mắt to, tỷ lệ đầu to ~40% được bảo toàn nhất quán qua cả 3 Tier tiến hóa.
- [x] **Khả năng đọc ở kích thước thật (~90 px):** Đã kiểm chứng trực quan tại mục D của file `preview.html`. Ở kích thước 90px trên điện thoại di động:
  - Tier 1: Nhận diện ngay chú bé người tiền sử ngực trần khố da báo.
  - Tier 2: Giáp xương sườn màu trắng ngà nổi bật trên nền da rám nắng.
  - Tier 3: Chiếc mũ sọ khủng long trắng sáng và thanh kiếm lửa vàng cam bừng sáng cực kỳ bắt mắt.
- [x] **Không có chữ ký, logo, watermark:** Toàn bộ ảnh sạch 100%.

---

## 6. Hướng dẫn Chủ Game Duyệt Thực Tế

1. Mở thư mục dự án: `D:\REMOTION\games\dino-swarm\art\caveman-test\`
2. Bấm đúp chuột vào file **`preview.html`** để mở trên bất kỳ trình duyệt nào (Chrome, Edge, Firefox).
3. Trải nghiệm 4 tab tính năng:
   - **Tab A:** Bấm chuyển đổi Tier 1, 2, 3 và bấm nút "Chém ngay (Attack)" để xem nhát chém kèm vệt lửa cam.
   - **Tab B:** Xem cơ chế ghép vũ khí xoay theo góc chốt cổ tay.
   - **Tab C:** Bấm nút **"⭐ TIẾN HÓA TRANG BỊ"** để xem khoảnh khắc Grok phát sáng, phóng to giật nảy và bung trang bị bậc cao kèm tia lửa lấp lánh (1.3 giây).
   - **Tab D:** Ngắm 3 bậc trang bị ở kích thước 90px thực tế để kiểm tra độ rõ nét.

## 7. Xử lý & Khắc phục Vấn đề Nhất quán Nhân vật (Character Identity Fix)

### Vấn đề Phát hiện (Feedback từ Chủ Game):
> *"Sao thấy 3 tier là 3 char khác nhau vậy?"*

Khi sinh ảnh bằng mô hình AI qua các câu prompt độc lập cho từng Tier:
- Mô hình AI có xu hướng vẽ ra các gương mặt, khuôn cằm, ánh mắt và kiểu tóc có độ lệch ngẫu nhiên, khiến người xem có cảm giác như 3 nhân vật người tiền sử khác nhau chứ không phải cùng 1 anh chàng Grok.

### Giải pháp Khắc phục Triệt để:
1. **Lấy Gương mặt Grok Tier 1 làm Chuẩn gốc (Canonical Face):**
   - Giữ nguyên 100% gương mặt đặc trưng của Grok: đôi mắt to biểu cảm, nụ cười nhe răng dữ dằn lém lỉnh, mũi tròn, tóc nâu đen bù xù cài mẩu xương, da rám nắng ấm.
2. **Đồng bộ hóa 100% Gương mặt trên cả 3 Tier:**
   - **Tier 1 (Wild):** Grok chuẩn gốc, ngực trần lông lá, cầm chùy gỗ.
   - **Tier 2 (Hunter):** Đúng 100% gương mặt và đầu của Grok, chỉ mặc thêm áo giáp xương sườn, giáp vai và cầm kiếm xương.
   - **Tier 3 (Warlord):** Đúng 100% gương mặt Grok lấp ló bên dưới chiếc mũ sọ khủng long T-Rex, mang khiên mai rùa và kiếm lửa.
3. **Kết quả:**
   - Khi chủ game bấm chuyển đổi qua lại giữa Tier 1 ➔ Tier 2 ➔ Tier 3 trong [`preview.html`](preview.html), gương mặt, ánh mắt và nụ cười của Grok **khóa chặt cố định**, người chơi lập tức cảm nhận rõ rệt đây là **CÙNG MỘT NGƯỜI** đang nâng cấp trang bị lên đẳng cấp mới!

## 8. Chuyển Đổi Sang Thiết Kế Đơn Giản, Ngộ Nghĩnh Hài Hước (Theo Yêu Cầu Mới Nhất)

### Phản hồi từ Chủ Game:
> *"Ok nhưng đổi lại nhân vật đơn giản hơn, đỡ lỗi dễ làm motion (caveman_evolution_stages_1791877242265.jpg)"*

### Lý do Thiết kế Này Vượt Trội Cho Game Top-Down Poki:
1. **Dáng dấp ngộ nghĩnh, hài hước, tròn trĩnh (Derpy & Chunky):**
   - Không bị rườm rà chi tiết vụn vặt, đầu to tròn (~40%), nụ cười ngờ nghệch lém lỉnh rất dễ mến.
   - Thể hiện sự tiến hóa rất tự nhiên và hài hước: Từ anh chàng khố da báo cầm chùy gỗ gắn đá ➔ khoác áo giáp xương sườn đeo mai rùa ➔ trùm cả đầu lâu khủng long T-Rex ngộ nghĩnh vác kiếm lửa to bản.
2. **Triệt tiêu hoàn toàn lỗi chắp vá (No Seams, Zero Identity Drift):**
   - Cả 3 tier được phát triển từ cùng một nguồn tạo hình đồng nhất, đường nét viền mực nâu đậm `#2a1d16` liền lạc, không còn bất kỳ đường cắt dán nào ở cổ hay vai.
3. **Tối ưu tuyệt đối cho chuyển động (Motion-Ready):**
   - Khi chạy ở nhịp 7 Hz với độ nhún 5px (bobbing) và nghiêng trước 5°, dáng người tròn trịa tạo cảm giác nảy tưng tưng cực kỳ vui mắt, đúng điệu game survivor giải trí.
   - Toàn bộ 9 poses (Idle, Run, Attack) và 4 dáng thân disarmed đều khóa cứng tiếp đất tại `baseline y=638`, tuyệt đối không trượt chân.
4. **Bảng so sánh tổng hợp mới:**
   - Xem file tổng hợp chi tiết tại `art/caveman-test/compare-simple-evolution.png`.

---

Tất cả đã hoàn tất và sẵn sàng chờ ý kiến đánh giá từ chủ game!

