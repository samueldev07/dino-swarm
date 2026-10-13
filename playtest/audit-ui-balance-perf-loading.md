# Báo Cáo Tổng Hợp: Kiểm Toán UI, Độ Cân Bằng, Hiệu Năng Web & Tốc Độ Tải Game

**Dự án:** Dino Swarm Survivors (*Pitchfork & Pot*) — `D:\REMOTION\games\dino-swarm`  
**Ngày kiểm tra:** 14/10/2026  
**Phạm vi:** Giao diện (UI/UX), Độ cân bằng & Độ khó (Balance/Pacing), Hiệu năng Render trên Web (Desktop FPS), và Tốc độ tải trang / Khởi động (Loading & Boot Pipeline).

---

## Phần 1: Báo Cáo Các Lỗi Giao Diện (UI/UX Audit)

Đối chiếu trực tiếp mã nguồn ([`src/game/game.ts`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts), [`src/game/ui.ts`](file:///D:/REMOTION/games/dino-swarm/src/game/ui.ts), [`src/game/draw.ts`](file:///D:/REMOTION/games/dino-swarm/src/game/draw.ts)) với bộ quy chuẩn [`docs/ui-rules.md`](file:///D:/REMOTION/games/dino-swarm/docs/ui-rules.md):

### 1.1. Lỗi tràn khung hình & che khuất bố cục (Layout & Viewport Overflow)

| Mã lỗi | Màn hình | Vị trí code | Hiện tượng & Nguyên nhân toán học | Hướng khắc phục |
|---|---|---|---|---|
| **UI-01** | **Menu Chính (Portrait)** | [`src/game/game.ts#L1787-L1807`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L1787-L1807) | **Mất hoàn toàn danh sách Nhiệm vụ (MISSIONS) trên điện thoại dọc:** Với chiều cao ảo `v.h = 980`, nút `PLAY` đặt ở `by ≈ 710`, nút `CAMP` kết thúc ở `y = 916`. Tiêu đề `MISSIONS` bắt đầu ở `my = by + 245 = 955` và 3 dòng nhiệm vụ nằm ở `y = 1000, 1082, 1164` — rơi hoàn toàn ra ngoài đáy màn hình (`980px`). | Đẩy cụm nhân vật (`dy = v.h * 0.36`) và nút `PLAY`/`CAMP` lên cao hơn, hoặc gom 3 nhiệm vụ thành 1 khung cuộn/compact (`54px/dòng`) nằm gọn trên mốc `940px`. |
| **UI-02** | **Lên Cấp (Level-Up Portrait)** | [`src/game/game.ts#L1338-L1358`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L1338-L1358) | **Nút `REROLL` & `BANISH` bị cắt ở đáy màn hình dọc:** 3 thẻ kỹ năng (`ch = 190`, `gap = 22`) đẩy đáy thẻ thứ 3 xuống `y = 877`. Hai nút phụ đặt tại `y = 905` với chiều cao `bh ≥ 78` làm đáy nút chạm `y = 983 > 980`, đè vào thanh Home Indicator (`v.safe.b`) trên iPhone/Android. | Giảm chiều cao thẻ dọc `ch` từ `190` xuống `168`, dịch tâm khối thẻ lên `40px` để chừa vùng đệm đáy `≥ 110px`. |
| **UI-03** | **Thẻ Kỹ Năng Dọc (Card Text)** | [`src/game/game.ts#L1420-L1434`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L1420-L1434) | **Chữ gợi ý Tiến hóa (`Evolves with...`) đè lên mô tả kỹ năng:** Mô tả bắt đầu ở `y = 128` (dòng 2 ở `y = 157`, dòng 3 ở `y = 185`), nhưng dòng tiến hóa gán cứng ở `ey = r.h - 30 = 160`, gây chồng chữ khi mô tả dài hơn 1 dòng. | Cho hàm `wrapBalanced` trả về tọa độ `y` của dòng cuối cùng, rồi đặt `ey = Math.max(lastY + 26, r.h - 26)`. |
| **UI-04** | **HUD Trong Trận (In-Game HUD)** | [`src/game/game.ts#L1209-L1253`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L1209-L1253) | **Khay kỹ năng đè lên Đồng hồ & Thanh máu Boss:** Khay kỹ năng xếp 5 cột (`S = 60, gap = 8`), cột thứ 5 vươn tới `x = 348`. Trên màn dọc `v.w = 720`, đồng hồ ở giữa (`x = 300..420`) và thanh máu Boss (`x = 137..583`, `y = top + 118..144`) bị cột 5 (hàng 1) và các ô hàng 2 (`y = top + 142`) vẽ đè trực tiếp lên. | Giảm số cột mỗi hàng trên màn dọc xuống `3` hoặc `4` cột, thu nhỏ icon HUD về `48px` khi `v.w < 900`, hoặc đẩy thanh máu Boss xuống dưới `NEXT BOSS`. |
| **UI-05** | **Toast & Banner** | [`src/game/game.ts#L508`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L508) & [`#L1286`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L1286) | **Thông báo Toast trùng tọa độ với Banner sự kiện:** Cả hai cùng vẽ ở `y = v.safe.t + 230`, chồng chữ lên nhau nếu xuất hiện cùng lúc. | Đổi tọa độ Toast lên `v.safe.t + 145` hoặc chờ Banner tắt. |

### 1.2. Lỗi vi phạm quy chuẩn thiết kế [`docs/ui-rules.md`](file:///D:/REMOTION/games/dino-swarm/docs/ui-rules.md) & Poki

1. **Dùng nhầm `ui-panel` thay vì `ui-card` cho thẻ chọn kỹ năng ([`src/game/game.ts#L1380`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L1380)):**
   - Bộ asset đã có [`public/sprites/ui-card.webp`](file:///D:/REMOTION/games/dino-swarm/public/sprites/ui-card.webp) (`384×512`, viền mảnh `56px`), nhưng hàm `card()` lại gọi `nine(ctx, 'ui-panel', ...)` (khung gỗ dày `72px` của bảng popup lớn), vi phạm **Quy tắc §2** (*"Heavy painted frames only on anchors... if every rectangle has the same thick frame it looks heavy and cheap"*).
2. **Thanh máu Boss chưa dùng `ui-bar-frame` ([`src/game/game.ts#L1249-L1252`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L1249-L1252)):**
   - Thanh XP đã dùng khung sắt `ui-bar-frame`, nhưng thanh máu Boss ngay bên dưới vẫn vẽ bằng `rrect` phẳng thủ công, gây lệch tông thẩm mỹ.
3. **Lặp thông tin HUD phía sau Popup (Vi phạm Quy tắc §12):**
   - Tại [`src/game/game.ts#L497-L505`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L497-L505), `drawHud()` và `drawEdgeArrows()` luôn chạy trước khi vẽ `drawOffers()`, `drawPause()`, `drawResult()`. Khi bảng kết quả hoặc tạm dừng hiện lên, các con số thời gian, cấp độ, số xu trên HUD vẫn hiện mờ phía sau lớp scrim, lặp lại chính các con số trong bảng.
4. **Bộ đếm số bị rung lắc ngang (Thiếu `tabular-nums` — Vi phạm Quy tắc §4):**
   - Trong [`src/game/draw.ts#L8-L10`](file:///D:/REMOTION/games/dino-swarm/src/game/draw.ts#L8-L10), đồng hồ đếm giây và bộ đếm Kills/Coins dùng font `Alegreya SC` với độ rộng ký tự biến thiên (số `1` hẹp hơn số `8`), làm chuỗi số dịch chuyển nhẹ mỗi giây.
5. **Vùng chạm (Hit Target) của nút Pause / Fullscreen / Sound bị nhỏ trên điện thoại màn hẹp (Vi phạm Quy tắc §8):**
   - Kích thước gán cứng `64×64` đơn vị ảo tại [`src/game/game.ts#L1164-L1165`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L1164-L1165). Trên màn hình `375px` (`v.scale = 0.52`), vùng chạm thực tế chỉ đạt **`33.3 × 33.3 px`** (thấp hơn chuẩn tối thiểu `44×44 pt`). Cần tính cạnh nút theo `Math.max(64, Math.ceil(44 / v.scale))`.

---

## Phần 2: Báo Cáo Độ Cân Bằng & Độ Khó (Balance & Difficulty Audit)

Kết quả chạy mô phỏng thực tế trên Engine của game (`100+` lượt chơi qua [`tools/balance-sim.ts`](file:///D:/REMOTION/games/dino-swarm/tools/balance-sim.ts)):

### 2.1. Thống kê chỉ số sinh tồn (Vùng 0 — Nhân vật mặc định Pip)

| Hồ sơ người chơi | Sống trung bình | Tỉ lệ > 3 phút | Tỉ lệ thắng (10:00) | Nhận xét so với chuẩn Poki ([`DESIGN.md`](file:///D:/REMOTION/games/dino-swarm/DESIGN.md)) |
|---|---|---|---|---|
| **Idle (Đứng yên)** | **2:50** (170s) | **80%** | **0%** | **Đạt** (Yêu cầu sống $\ge 75\text{s}$). |
| **Novice (Người mới)** | **4:24** (264s) | **95%** | **5%** | **Đạt** (Yêu cầu sống TB $\sim 4$ phút, $>3$ phút $\ge 25\%$). |
| **Decent (Chơi khá - 0 nâng cấp)** | **6:26** (386s) | **95%** | **30%** | Hợp lý cho lượt chơi đầu chưa nâng trại. |
| **Decent (Trại Cấp 2/5)** | **9:23** (563s) | **100%** | **85%** | Tăng tiến sức mạnh hơi gắt (thắng quá dễ ở Vùng 0). |
| **Decent (Trại Max 5/5)** | **10:00** (600s) | **100%** | **100%** | Tuyệt đối ở Vùng 0. |

### 2.2. 4 Điểm nghẽn cân bằng cần điều chỉnh

1. **Bức tường độ khó đột biến ở Phút 3:00 (Minute-3 Boss Crowd Spike):**
   - **Hiện tượng:** 80% lượt Idle và 90% lượt Novice thất bại trong khung `3:00 – 4:15`.
   - **Nguyên nhân ([`src/game/config.ts#L10-L105`](file:///D:/REMOTION/games/dino-swarm/src/game/config.ts#L10-L105)):** Ở `t = 180s`, Boss 1 (`3600 HP`) xuất hiện ngay sau chuỗi sự kiện dồn dập (`t = 150s`: 24 dơi nhanh, `t = 165s`: Troll Brute `260 HP`, `t = 170s`: Orc Shieldbearer `46 HP`), cộng thêm tốc độ sinh quái nền đã tăng lên `5.82 con/giây`. Người chơi mới bị quái con vây kín đường chạy khi đang né Boss.
   - **Đề xuất:** Giảm máu Boss 1 xuống `2800–3000 HP` hoặc giảm 25% tốc độ sinh quái thường trong thời gian Boss đang có mặt trên sân.
2. **Vũ khí `Loyal Mutt` (`thorns`) yếu hơn hẳn mặt bằng chung:**
   - **Số liệu (50 trận):** `Stomp` (51.6% win), `Meteor` (51.7% win), `Spit` (48.1% win), `Bite` (46.0% win), `Orbit` (45.5% win), nhưng **`Loyal Mutt` chỉ đạt 35.7% win** (sống TB thấp nhất `7.0 phút`).
   - **Nguyên nhân ([`src/game/config.ts#L183`](file:///D:/REMOTION/games/dino-swarm/src/game/config.ts#L183)):** `PET_SHARE = 0.1` khiến mỗi cú cắn của chó chỉ bằng 10% sát thương đòn đánh chính (`~1.4 dmg` ở cấp 1), lại chỉ đánh đơn mục tiêu.
   - **Đề xuất:** Tăng `PET_SHARE` lên `0.22 – 0.25` và giảm nhẹ `cooldown` ở cấp 1–2.
3. **Nhân vật khởi đầu Pip (`raptor`) khó chơi hơn 2 nhân vật khóa (`ankylo`, `ptero`):**
   - Ở mức 0 nâng cấp: Pip chỉ thắng **13%** (sống TB `5.9 phút`), trong khi `ankylo` và `ptero` đều thắng **33%** (sống TB `7.0–7.2 phút`).
   - **Đề xuất:** Tăng tầm quét `area` cấp 1 của `Pitchfork Jab` (`bite`) từ `115` lên `128` trong [`src/game/config.ts#L135`](file:///D:/REMOTION/games/dino-swarm/src/game/config.ts#L135).
4. **Độ chênh lệch giữa Vùng 0 và Vùng 2 (`Frostfang Hills`):**
   - Với Trại Cấp 2, tỉ lệ thắng ở Vùng 0 là **53%**, Vùng 1 là **13%**, nhưng Vùng 2 rơi xuống **0%** (sống TB chỉ `4.6 phút`) do `enemyHp: 2.0` và `enemyDmg: 1.45` nhân kép với tăng trưởng thời gian `hpGrowth`. Nên hạ `enemyHp` Vùng 2 từ `2.0` xuống `1.75–1.8`.

---

## Phần 3: Báo Cáo Hiện Tượng Lag Trên Bản Web (Desktop Performance Audit)

Mặc dù điện thoại (`390×844`) chạy mượt, bản Web trên PC/Laptop lại bị tụt FPS nặng (đo trong [`tools/perf/results.json#L600-L676`](file:///D:/REMOTION/games/dino-swarm/tools/perf/results.json#L600-L676) cho thấy thời gian vẽ trung bình lên tới `159 ms/frame` khi stress-test) do **5 nguyên nhân kỹ thuật**:

1. **Độ phân giải Canvas không giới hạn trần ([`src/engine/canvas.ts#L58-L75`](file:///D:/REMOTION/games/dino-swarm/src/engine/canvas.ts#L58-L75)):**
   - Màn hình PC Full HD/2K với Windows Scaling `125%–150%` (`dpr = 1.25–1.5`) tạo ra Canvas `2880×1620` (**4.67 MP**) đến `3840×2160` (**8.3 MP**) — **lớn gấp 6 đến 11 lần số điểm ảnh trên điện thoại (`0.74 MP`)**.
   - Mỗi frame lại tô đè toàn màn hình 3–4 lần (`fillRect` xóa nền tại `#L467`, `fillRect` pattern mặt đất tại `#L578`, `drawImage` lớp `lightLayer` tại `#L550`, và `hurtLayer` tại `#L493`), tiêu tốn 15–30 triệu điểm ảnh/frame.
2. **Màn hình ngang (16:9) mở rộng vùng nhìn `vis()` gấp 2.5 lần màn hình dọc ([`src/game/game.ts#L256`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L256), [`#L573`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L573)):**
   - Do `MIN_H = 980`, chiều ngang ảo `v.w` trên màn 16:9 phình ra tới `1742–2050` đơn vị, khiến `vis(x, y)` bao phủ gần trọn bán kính sinh quái (`820–980`). Bản Web phải vẽ gần như toàn bộ 250–300 con quái và hàng trăm viên XP cùng lúc, thay vì 60–90 con như điện thoại.
3. **Nghẽn `ctx.scale(-1, 1)` và trộn lẫn `HTMLCanvasElement` với `ImageBitmap` ([`src/game/clips.ts#L44-L53`](file:///D:/REMOTION/games/dino-swarm/src/game/clips.ts#L44-L53), [`src/game/perf/frames.ts#L53-L66`](file:///D:/REMOTION/games/dino-swarm/src/game/perf/frames.ts#L53-L66)):**
   - Trong `results.json`, riêng hàm `ctx.scale` chiếm **4.132 ms** trong 4 giây đo trên màn `1280×720`. Ngoài ra, ảnh chớp trắng `fr.white` vẫn là `HTMLCanvasElement` trong khi `fr.raster` là `ImageBitmap`, gây flush pipeline Direct3D11/ANGLE trên Windows mỗi khi quái trúng đòn.
4. **Phá vỡ GPU Batching trong vòng lặp Ngọc XP & Quái ([`src/game/game.ts#L620-L624`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L620-L624), [`#L781-L815`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L781-L815), [`#L935-L947`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L935-L947)):**
   - Mỗi viên ngọc XP vẽ xen kẽ `ellipse()` (vector) $\rightarrow$ `drawImage()` (texture) $\rightarrow$ `stroke()` (vector). Tương tự, vòng lặp quái vẽ xen kẽ vòng vàng Elite (`ellipse`), sao choáng (`arc`) và thanh máu Brute (`9-slice`) ngay giữa các lệnh `drawImage`, làm mất khả năng gom batch của trình duyệt.
5. **Biến đổi ma trận lẻ `DOMMatrix().scale(0.8)` trên `CanvasPattern` mặt đất ([`src/game/game.ts#L1110`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L1110)):**
   - Bắt trình duyệt phải lọc bilinear ma trận kép trên diện tích hàng triệu pixel mỗi frame (`fillRect` tốn `796 ms` trong profile).

---

## Phần 4: Báo Cáo Chuyên Sâu Về Tốc Độ Tải Game & Khởi Động (Loading Speed & Boot Audit)

### 4.1. Thống kê dung lượng & số lượng file thực tế khi tải game

Qua đo đạc trực tiếp thư mục `public/` và bản build `dist/`:

| Nhóm tài nguyên | Số lượng file (HTTP Requests) | Dung lượng (KB) | Cách tải hiện tại |
|---|---|---|---|
| **HTML + JS Bundle + CSS** (`dist/`) | 3 files | **140.9 KB** *(49 KB gzip)* | Tải ngay lúc mở trang |
| **Webfonts** (`Alegreya` 500/700, `Alegreya SC` 800) | 3 files (`.woff2`) | **79.2 KB** | Tải lúc khởi động (`document.fonts.load`) |
| **Sprites tĩnh, UI Folk Kit, Props, Icons** (`public/sprites/`) | 64 files | **772.0 KB** | Tải đồng loạt qua `assets.preload()` (62 ảnh) |
| **Animation Nhân vật chính** (`public/hero/grok-1/`) | **37 files** (`hero.json` + 36 `.webp`) | **418.0 KB** | Tải đồng loạt các frame rời lúc `new Game()` |
| **Animation Quái & Vũ khí** (`public/anim/*/` — 12 thư mục) | **189 files** (12 `clip.json` + 177 `.webp`) | **1,554.7 KB** | Tải đồng loạt các frame rời lúc `new Game()` |
| **TỔNG CỘNG TOÀN GAME** | **296 Requests** | **~3,184 KB (~3.11 MB)** | **Bắn toàn bộ ~290 requests ngay ở giây thứ 0!** |

> [!TIP]
> **Điểm sáng về dung lượng tổng:** Tổng dung lượng bản build đạt **~3.11 MB**, hoàn toàn nằm dưới mức trần **5 MB** của Poki ([`DESIGN.md#L56`](file:///D:/REMOTION/games/dino-swarm/DESIGN.md#L56)). Tuy nhiên, **cách thức tải (296 HTTP requests rời rạc + xử lý hậu kỳ trên Main Thread)** đang gây ra nghẽn cổ chai nghiêm trọng về tốc độ tải và độ mượt những giây đầu tiên.

---

### 4.2. 5 Lỗi kiến trúc làm chậm tốc độ tải và gây giật lúc mới vào trận

#### Lỗi Tải 1: "Bão Request" — 213 file ảnh frame lẻ tẻ thay vì Sprite Sheet Atlas đóng gói sẵn
- **Vị trí:** [`src/game/clips.ts#L20-L29`](file:///D:/REMOTION/games/dino-swarm/src/game/clips.ts#L20-L29), [`src/game/hero.ts#L28-L49`](file:///D:/REMOTION/games/dino-swarm/src/game/hero.ts#L28-L49) & [`src/game/perf/frames.ts#L19-L68`](file:///D:/REMOTION/games/dino-swarm/src/game/perf/frames.ts#L19-L68)
- **Thực trạng:**
  - Mỗi cử động của nhân vật và quái đang được lưu thành **10 đến 36 file `.webp` rời rạc** (`00.webp`, `01.webp`, ..., `17.webp`).
  - Ngay khi khởi tạo `new Game()`, trình duyệt phải bắn **13 request `.json` + 213 request `.webp` rời**, cộng thêm **63 request** trong `assets.preload()` $\rightarrow$ tổng cộng **~290 HTTP requests cùng lúc**!
  - Trên mạng di động 4G hoặc Wi-Fi thông thường, 290 requests gây nghẽn hàng đợi kết nối (Connection Queueing / Head-of-Line Blocking), mất rất nhiều thời gian chờ round-trip (RTT).
  - Nghiêm trọng hơn: Sau khi tải 213 file lẻ về, hàm `loadAtlas()` trong [`frames.ts`](file:///D:/REMOTION/games/dino-swarm/src/game/perf/frames.ts) lại dùng CPU của trình duyệt để ghép chúng vào `<canvas>` động mỗi lần người chơi mở trang!

#### Lỗi Tải 2: Thẻ `<script>` Poki SDK đặt đồng bộ (Render-Blocking) trong `<head>`
- **Vị trí:** [`index.html#L10`](file:///D:/REMOTION/games/dino-swarm/index.html#L10)
- **Thực trạng:**
  ```html
  <script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>
  ```
- **Tác hại:** Thẻ `<script>` không có `defer` hay `async` nằm ngay trên đầu `<head>` sẽ **chặn hoàn toàn việc vẽ màn hình chờ `<div id="boot">` và chặn luôn `<script type="module" src="/src/main.ts">`** cho đến khi tải xong file từ `game-cdn.poki.com`. Nếu mạng chập chờn hoặc người chơi dùng trình chặn quảng cáo (AdBlock) làm treo kết nối CDN, người chơi sẽ nhìn thấy màn hình trắng/đen trống rỗng trong nhiều giây trước khi mã timeout `2500ms` trong [`src/main.ts#L18`](file:///D:/REMOTION/games/dino-swarm/src/main.ts#L18) kịp chạy!

#### Lỗi Tải 3: Tải toàn bộ quái cuối trận (Boss, Troll, Goblin, Orc) ngay ở giây thứ 0 (Không phân tầng ưu tiên)
- **Vị trí:** [`src/game/game.ts#L68-L125`](file:///D:/REMOTION/games/dino-swarm/src/game/game.ts#L68-L125) & [`src/main.ts#L27`](file:///D:/REMOTION/games/dino-swarm/src/main.ts#L27)
- **Thực trạng:**
  - Khi trận đấu bắt đầu (`t = 0s`), trên màn hình **chỉ có nhân vật `hero`, quái `grub` (`gnome`), đòn đánh `bite` (`arc`), và mặt đất `ground-0`**.
  - Thế nhưng ở giây thứ 0, game tải luôn:
    - `boss` (`ogre` — phút thứ 3 mới xuất hiện)
    - `shroom` (`goblin` — phút 4:20 mới xuất hiện)
    - `beetle` (`orc` — phút 2:50 mới xuất hiện)
    - `brute` (`troll` — phút 2:45 mới xuất hiện)
    - `wolf` (`boarorc` — phút 1:40 mới xuất hiện)
    - Toàn bộ hiệu ứng vũ khí chưa sở hữu (`meteor`, `flask`, `slam`, `dog`).
  - Các tài nguyên cuối trận này tranh giành băng thông mạng và CPU giải mã ảnh với những tài nguyên thiết yếu của giây đầu tiên (`hero`, `gnome`, `ground-0`, `ui-*`).

#### Lỗi Tải 4: Khóa bộ nhớ đệm bằng `{ cache: 'no-cache' }` và tạo 36 Canvas `blur(4px)` trên Main Thread
- **Vị trí:**
  - `cache: 'no-cache'`: [`src/engine/assets.ts#L25`](file:///D:/REMOTION/games/dino-swarm/src/engine/assets.ts#L25), [`src/game/clips.ts#L21`](file:///D:/REMOTION/games/dino-swarm/src/game/clips.ts#L21), [`src/game/hero.ts#L30`](file:///D:/REMOTION/games/dino-swarm/src/game/hero.ts#L30)
  - Blur 36 frames: [`src/game/hero.ts#L39-L47`](file:///D:/REMOTION/games/dino-swarm/src/game/hero.ts#L39-L47)
- **Tác hại:**
  - Dùng `{ cache: 'no-cache' }` bắt trình duyệt luôn phải gửi request kiểm tra lại lên server cho 14 file JSON mỗi lần F5 hoặc mở lại game.
  - Trong `Hero.load()`, ngay khi 36 frame của nhân vật tải xong (thường rơi vào giây thứ 1–2 khi người chơi vừa bắt đầu di chuyển), vòng lặp `for (const fr of frames)` tạo **36 thẻ `<canvas>` riêng biệt và chạy bộ lọc `x.filter = 'blur(4px)'` 36 lần liên tiếp đồng bộ trên Main Thread**, gây ra một cú giật (hitch) rõ rệt ngay đầu trận!

#### Lỗi Tải 5: Tắt màn hình `#boot` và báo `poki.loadingFinished()` trước khi tài nguyên màn đầu tải xong
- **Vị trí:** [`src/main.ts#L27-L52`](file:///D:/REMOTION/games/dino-swarm/src/main.ts#L27-L52)
- **Thực trạng:**
  - `assets.preload([...])` không trả về Promise, và `new Game(...)` cũng không chờ `hero` hay `ground-0` tải xong.
  - Do đó, chỉ sau khi `manifest.json` và Font tải xong (~150ms), `#boot` đã bị gỡ bỏ ngay lập tức. Trên mạng thực tế, người chơi vào trận sẽ thấy nhân vật khủng long vẽ bằng hình kỷ hà (procedural fallback) và nền cỏ phẳng trong 1–3 giây đầu, sau đó hình vẽ thật mới đột ngột "nhảy" đè vào từng món một.

---

### 4.3. Giải pháp tối ưu tốc độ tải game (Đưa thời gian Cold Load về < 0.8 giây)

1. **Đóng gói sẵn (Pre-pack) 13 thư mục Animation thành 13 file Atlas `.webp` duy nhất lúc Build:**
   - Viết script trong `tools/` ghép các frame `00.webp .. N.webp` của từng thư mục (`hero/grok-1`, `anim/gnome`, `anim/bat`...) thành 1 file `atlas.webp` duy nhất kèm tọa độ trong `clip.json`.
   - **Hiệu quả:** Giảm số lượng HTTP requests từ **296 xuống còn ~80 requests (-73%)**, giảm dung lượng animation thêm **~40% (tiết kiệm ~800 KB)** nhờ nén ghép chung bảng màu WebP, và bỏ hoàn toàn bước ghép atlas bằng CPU lúc runtime.
2. **Chia tải tài nguyên làm 2 giai đoạn (Two-Stage Progressive Loading):**
   - **Giai đoạn 1 (Critical Boot — ~350 KB, chờ tối đa 800ms trước khi tắt `#boot`):** Chỉ tải `ground-0`, `logo-plate`, bộ `ui-*`, `hero/grok-1`, `anim/gnome`, `anim/arc`, `pickup-amber-1`. Khi nhóm này sẵn sàng mới tắt `#boot` và gọi `poki.loadingFinished()` — đảm bảo khung hình đầu tiên đẹp hoàn chỉnh 100%, không bao giờ lộ hình vẽ tạm.
   - **Giai đoạn 2 (Background Deferred Load — sau khi vào trận 1 giây):** Tải tuần tự theo thứ tự thời gian xuất hiện trong trận (`bat` $\rightarrow$ `boarorc` $\rightarrow$ `troll` $\rightarrow$ `orc` $\rightarrow$ `ogre` $\rightarrow$ `goblin` và các hiệu ứng vũ khí phụ).
3. **Thêm `defer` cho Poki SDK trong [`index.html#L10`](file:///D:/REMOTION/games/dino-swarm/index.html#L10) và `<link rel="preload">` cho `logo-plate.webp` + font chính:**
   - Giúp màn hình `#boot` hiển thị tức thì ở `< 50ms` ngay cả khi mạng chậm hoặc bị chặn quảng cáo.
4. **Gộp 36 lần `blur(4px)` trong [`src/game/hero.ts#L39-L47`](file:///D:/REMOTION/games/dino-swarm/src/game/hero.ts#L39-L47) thành 1 lần duy nhất trên toàn Atlas:**
   - Thay vì tạo 36 canvas con và gọi `filter = 'blur(4px)'` 36 lần, chỉ cần chạy `blur(4px)` **đúng 1 lần trên canvas `white` của cả Atlas** trong `loadAtlas()` (với khoảng cách gutter giữa các frame tăng từ `4px` lên `12px`). Thời gian xử lý giảm từ ~90ms xuống còn < 4ms!
5. **Bỏ `{ cache: 'no-cache' }` trong Production:**
   - Cho phép trình duyệt và CDN của Poki lưu cache toàn bộ `manifest.json`, `clip.json` và `hero.json`, giúp lần mở game thứ 2 tải trong **0ms**.
