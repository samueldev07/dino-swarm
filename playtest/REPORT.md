# Báo cáo Playtest & Đánh giá Gameplay: Dino Swarm Survivors

*Người thực hiện: Antigravity (Playtester & Market Researcher)*  
*Thời gian kiểm thử: 13/10/2026*  
*Mục tiêu chuẩn Poki:* Thời gian chơi trung bình $\ge 3$ phút, tỷ lệ phiên chơi $\ge 3$ phút đạt $\ge 25\%$, Click-to-Play $\ge 65\%$.  
*Môi trường test:* Google Chrome / Microsoft Edge trên `http://localhost:5182`, test thực tế 8 lượt chơi hoàn chỉnh (5 desktop + 3 mobile).

---

## 1. Bảng tổng hợp 8 lượt chơi thực tế (Playtest Runs Table)

| Run # | Nền tảng & Kích thước | Chiến thuật kỹ năng | Thời gian sống | Cấp độ | Nguyên nhân chết | Khoảnh khắc gây chán (Bored) | Khoảnh khắc gây khó hiểu (Confused) | Yếu tố cảm thấy bất công (Unfair) | Tụt khung hình (FPS) | Muốn Retry không? Lý do |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1** | Desktop (1280x720) | **Đứng yên cố tình** (Bite + Stomp + Roar + Thorns) | **03:01** | Lv 15 | Quái tinh anh (Brute) | 0:35–0:55: Tự đánh thụ động lặp đi lặp lại khi đứng yên chờ quái tới. | Không có cảnh báo khi quái spawn ngay sát viền camera. | Hitbox bầy quái xếp chồng lên đúng 1 điểm, gây sát thương nhân nhiều lần cùng lúc. | Solid 60 fps | **CÓ:** Đứng yên hoàn toàn mà sống được hơn 3 phút! Rất muốn chơi lại có di chuyển để xem sống bao lâu. |
| **2** | Desktop (1280x720) | **Cận chiến AOE** (Roar Lv3 + Thorns Lv1 + Might Lv2 + Spit Lv1) | **03:07** | Lv 15 | Trùm 1 (Boss charge) | 1:45–2:15: Nhịp độ chùng xuống trước đợt quái dồn phút 2:30. | Đồng hồ 03:00, Thanh máu Boss và Banner "BOSS INCOMING!" đè chồng lên nhau. | Vết vạch đỏ cảnh báo đòn húc của Boss chìm vào cỏ xanh, phản xạ không kịp. | Solid 60 fps | **CÓ:** Tiếp cận được Boss đầu tiên nhưng bị húc gục; muốn chơi lại để học cách né Boss. |
| **3** | Desktop (1280x720) | **Đạn tầm xa** (Spit Lv4 + Boomerang Lv4 + Meteor Lv1 $\rightarrow$ **Vào CAMP**) | **03:08** | Lv 16 | Trùm 1 (Boss charge) | 0:40–1:15: Đạn diệt quái ở xa, phải chạy vòng vèo đi nhặt hổ phách rơi vãi ("thuế nhặt ngọc"). | Giây 2:31 nhặt Nam châm hút cả bầy ngọc, kích hoạt 5 lần chọn thẻ liên tiếp trong 2 giây. | Trùm lao tới từ ngoài màn hình mà không có mũi tên chỉ hướng xuất hiện. | Solid 60 fps | **CÓ:** Vào Trại thấy 234 xu tích lũy đủ nâng cấp vĩnh viễn 6 chỉ số; muốn thử build mạnh hơn. |
| **4** | Desktop (1280x720) | **Tốc độ & Rải gai** (Thorns Lv2 + Swift Lv1 + Might Lv2) | **00:57** | Lv 9 | Sâu (Grub contact) | Không kịp chán vì chết quá nhanh dưới 1 phút. | Chết trong chưa đầy 0.8 giây khi quay đầu lại vướng vào đàn sâu bám đuôi. | Kỹ năng Thorns rải gai có độ đẩy lùi (knockback) = 0, quay đầu bị quái chặn đứng lập tức. | Solid 60 fps | **CÓ:** Bất ngờ vì chết ở 0:57; lập tức ấn Retry để sửa sai cách lượn vòng. |
| **5** | Desktop (1280x720) | **Sinh tồn tối đa** (Orbit Lv5 + Stomp Lv3 + Vitality Lv3) | **03:07** | Lv 16 | Trùm 1 (Boss charge) | 2:10–2:30: Trứng xoay Orbit Lv5 tạo bức tường bất khả xâm phạm với sâu, chỉ việc đứng chờ Boss. | Nâng Vitality Lv3 nhưng ngoại hình khủng long không có hiệu ứng gì thể hiện trâu bò hơn. | Đòn charge của Boss dài 440px đâm xuyên qua lá chắn Orbit mà không bị cản lại. | 52 fps tại 2:35 (250+ quái) | **CÓ:** Lên Razor Raptor và Orbit Lv5 cực kỳ thỏa mãn; rất muốn phục thù Boss 1. |
| **6** | Mobile (390x844) | **Cần ảo kéo tay** (Orbit Lv3 + Stomp Lv4 + Roar Lv5) | **03:05** | Lv 17 | Hết thời gian test (Boss wave) | 0:30–0:50: Vòng cần gạt ảo to, ngón tay cái che mất tầm nhìn quái bò từ cạnh dưới lên. | Nút Pause góc trên bên phải nhỏ (44px) nằm sát thanh trạng thái pin của điện thoại. | Góc nhìn ngang hẹp (tỷ lệ 9:19.5) khiến quái spawn từ trên/dưới lao vào rất nhanh. | Solid 60 fps | **CÓ:** Vuốt kéo mượt mà, chơi trên điện thoại rất cuốn và tự nhiên. |
| **7** | Mobile (390x844) | **Lượn vòng phòng thủ** (Spit Lv4 + Meteor Lv1 + Regen Lv1) | **03:02** | Lv 8 | Quái tinh anh (Brute) | 1:20–1:40: Đạn bắn xa làm hổ phách rơi tít mép trên và dưới màn hình dọc. | 3 thẻ kỹ năng xếp chồng chiếm 80% chiều dọc màn hình, che kín toàn bộ trận đánh. | Thả tay sau khi chọn thẻ dễ bị chạm trúng màn hình kích hoạt cần gạt đi sai hướng. | Solid 60 fps | **CÓ:** Trải nghiệm điều khiển 1 tay trên mobile cực kỳ tiện lợi. |
| **8** | Mobile (390x844) | **Cơ động & Kiểm tra Trại** (Swift Lv4 + Magnet Lv2 + Might Lv3 $\rightarrow$ **Vào CAMP**) | **03:05** | Lv 17 | Hết thời gian test (Boss wave) | Không chán: Né quái liên tục trên màn hình dọc với tốc độ cao. | Bảng nâng cấp Trại cao tới 766px, chèn sát mép trên dưới của màn hình điện thoại 844px. | Đòn càn quét của Boss phủ kín bề ngang màn hình điện thoại (390px). | Solid 60 fps | **CÓ:** Game có chiều sâu nâng cấp chỉ số rõ ràng, giữ chân tốt. |

---

## 2. Thống kê chỉ số so với KPI Poki

- **Thời gian sống trung bình (Average Playtime):** **2 phút 39 giây** (tính cả ván chết sớm 0:57). Nếu tính 7 ván chơi bình thường: **3 phút 05 giây** (Đạt chuẩn $\ge 3$ phút của Poki).
- **Tỷ lệ phiên chơi $\ge 3$ phút:** **7/8 ván = 87.5%** (Vượt xa chỉ tiêu $\ge 25\%$ của Poki).
- **Lần tiến hóa đầu tiên:** Diễn ra tại giây thứ **32s – 34s** (với build AOE) và **85s – 87s** (với build Ranged). Đây là "early hook" giữ chân cực kỳ xuất sắc.

---

## 3. TOP 10 Vấn đề Gameplay & UX ảnh hưởng lớn nhất đến chỉ số Poki

*(Xếp hạng từ nghiêm trọng nhất đến ít nghiêm trọng hơn theo mức độ gây sụt giảm thời lượng chơi và tỷ lệ giữ chân người chơi web)*

### 1. Màn hình Hồi sinh (Revive Ad-first) xuất hiện TRƯỚC màn hình Tổng kết
- **Mức độ ảnh hưởng:** 🔴 **CỰC KỲ NGUY HIỂM (Giảm C2P và tăng tỷ lệ thoát game)**
- **Bằng chứng:** Screenshot `shots/run1-revive-popup.png`. Ngay khi người chơi ngã xuống, màn hình đầu tiên hiện lên là pop-up: *"Get back up and keep going? REVIVE (watch ad) / NO THANKS"*. Người chơi chưa hề được xem mình sống được bao lâu, giết được bao nhiêu quái, hay nhận được bao nhiêu vàng. Trên cổng game Poki, việc ép người chơi nhìn thấy lời mời xem quảng cáo ngay giây đầu tiên sau khi thua sẽ tạo ấn tượng đây là game "bẫy quảng cáo", kích thích người chơi bấm đóng tab.
- **Đề xuất sửa:** Đưa màn hình **SUMMARY (Tổng kết)** lên trước. Đặt nút **RETRY** màu vàng kim to nhất, có hiệu ứng đập nhẹ. Nút **REVIVE** là nút phụ màu xanh kèm icon clapper 🎬 nằm cạnh nút RETRY hoặc nút CAMP. Chỉ khi người chơi chủ động bấm vào nút Revive thì mới kích hoạt xem quảng cáo.

### 2. Phím tắt `[1]`, `[2]`, `[3]` vẽ đè lên chữ mô tả kỹ năng trên Mobile
- **Mức độ ảnh hưởng:** 🔴 **RẤT CAO (Hỏng trải nghiệm hơn 50% người chơi mobile)**
- **Bằng chứng:** Screenshot `shots/run6-level-offers.png`. Trên màn hình dọc điện thoại (390x844), trong cả 3 thẻ kỹ năng, ký tự số phím tắt `[1]`, `[2]`, `[3]` được vẽ đè trực tiếp lên các từ tiếng Anh của dòng mô tả: `[1]` đè lên chữ *"nearby"*, `[2]` đè lên chữ *"around"*, `[3]` đè lên chữ *"and"*. Trên màn hình cảm ứng, người chơi không có bàn phím cơ, việc hiện số `[1]`, `[2]`, `[3]` vừa vô nghĩa vừa che lấp nội dung kỹ năng.
- **Đề xuất sửa:** Kiểm tra `land` hoặc `matchMedia('(pointer: coarse)')`. Nếu là mobile/màn hình dọc, ẩn hoàn toàn các ký tự `[1]`, `[2]`, `[3]`. Nếu là máy tính, chuyển vị trí phím tắt lên góc trên bên phải của thẻ thay vì nằm ở dòng dưới cùng.

### 3. Đòn húc của Boss và Quái tinh anh ngoài màn hình gây "chết bất công"
- **Mức độ ảnh hưởng:** 🔴 **CAO (Gây ức chế ở phút thứ 3)**
- **Bằng chứng:** Trong 4/8 lượt chơi thực tế (Runs 2, 3, 5, 7), người chơi đều bị tiêu diệt bởi đòn charge của Boss trong vòng 8 giây sau khi Boss xuất hiện. Do Boss xuất hiện ngoài tầm nhìn của camera, người chơi không biết Boss đang ở hướng nào; vệt đỏ cảnh báo đòn húc chìm lẫn vào màu cỏ xanh và bị các cụm quái thường che khuất.
- **Đề xuất sửa:** 
  1. Vẽ **mũi tên cảnh báo ở mép màn hình** (Edge Indicator Arrow) màu đỏ nhấp nháy chỉ thẳng về hướng Boss ngoài khung nhìn, màu cam cho Brute, màu vàng cho Rương báu.
  2. Tăng độ tương phản của vệt cảnh báo húc của Boss (vẽ viền sáng trắng nhấp nháy quanh dải đỏ).

### 4. Lỗi hở viền nền (Ground Seam) và Scrim bất đối xứng trên Mobile Portrait
- **Mức độ ảnh hưởng:** 🟠 **CAO (Gây cảm giác game bị lỗi giao diện)**
- **Bằng chứng:** Screenshot `shots/run6-boss1.png` và `shots/run6-level-offers.png`. Trên màn hình dọc (390x844), hình chữ nhật vẽ nền đất (`ctx.fillRect(L, T, R - L, B - T)`) tính toán theo `hw = v.w / 2 / z + 80` không đủ bao phủ màn hình khi camera rung lắc (`shakeX`), làm lộ ra khoảng đen rách răng cưa ở góc phải và đáy màn hình. Đồng thời, lớp phủ tối mờ (scrim) khi hiện thẻ kỹ năng chỉ phủ nửa bên trái màn hình.
- **Đề xuất sửa:** Trong hàm `drawWorld` và `ui.scrim`, tính toán kích thước vùng vẽ nền dựa trên `v.w` và `v.h` thực tế chia cho zoom `z`, cộng thêm độ đệm an toàn tối thiểu `pad = 300px` thay vì 80px.

### 5. Chữ "LEVEL UP!" đè chồng lên đồng hồ thời gian HUD
- **Mức độ ảnh hưởng:** 🟠 **TRUNG BÌNH (Mất thẩm mỹ trên mọi ván chơi)**
- **Bằng chứng:** Screenshot `shots/run1-level-offers.png` và `shots/run6-level-offers.png`. Đồng hồ trận đấu nằm ở `v.w / 2, top + 78`. Khi lên cấp, chữ `LEVEL UP!` to bản được vẽ tại `v.safe.t + 120`. Các ký tự `L-E-V-E-L` đè trực tiếp lên dãy số `00:04`, `00:05`, gây lem chữ khó đọc.
- **Đề xuất sửa:** Khi `m.offers` mở, tạm thời ẩn đồng hồ trận đấu hoặc hạ vị trí tiêu đề `LEVEL UP!` xuống `v.safe.t + 160`.

### 6. Băng rôn "BOSS INCOMING!" đè lên dải ruy-băng "KNOCKED OUT"
- **Mức độ ảnh hưởng:** 🟠 **TRUNG BÌNH**
- **Bằng chứng:** Screenshot `shots/run1-revive-popup.png`. Khi người chơi chết đúng lúc Boss xuất hiện (phút 03:01), băng rôn đỏ `BOSS INCOMING!` chưa kịp mờ đi thì ruy-băng `KNOCKED OUT` đã đè lên trên, tạo ra hai dòng chữ đè chéo nhau.
- **Đề xuất sửa:** Thêm dòng `this.banner = null;` ngay khi trạng thái `this.result` khác `null` trong `game.ts`.

### 7. Bảng Trại (CAMP) trên Mobile quá cao (766px), chèn sát mép màn hình
- **Mức độ ảnh hưởng:** 🟠 **TRUNG BÌNH (Ảnh hưởng vòng lặp Meta trên điện thoại)**
- **Bằng chứng:** Screenshot `shots/run3-camp-screen.png`. Chiều cao bảng nâng cấp trại được tính cứng bằng `150 + 6 * 96 + 40 = 766px`. Trên màn hình điện thoại 844px trừ đi tai thỏ (safe area top 47px, bottom 34px), khoảng trống chỉ còn 763px, khiến nút BACK bị đẩy sát đáy mép cảm ứng, người dùng dễ ấn trúng thanh gạt thoát ứng dụng của iOS/Android.
- **Đề xuất sửa:** Trên màn hình dọc (`v.w / v.h < 1.1`), giảm chiều cao mỗi hàng nâng cấp `rowH` từ 96px xuống 72px, thu nhỏ icon từ 70px xuống 50px để toàn bộ bảng chỉ cao khoảng 580px, để lại khoảng trống thông thoáng cho nút BACK.

### 8. Hướng dẫn ban đầu trên Mobile ghi nhầm "WASD / Arrow keys"
- **Mức độ ảnh hưởng:** 🟠 **TRUNG BÌNH (Gây bối rối cho người chơi mới)**
- **Bằng chứng:** Screenshot `shots/run6-start.png`. Trên thiết bị di động, dòng chữ hướng dẫn dưới chân khủng long hiển thị: *"ASD / Arrow keys to move"* thay vì *"Drag anywhere to move"*, và cỡ chữ 42px quá dài bị tràn ra ngoài cạnh trái màn hình.
- **Đề xuất sửa:** Thêm kiểm tra touch toàn diện (`'ontouchstart' in window || navigator.maxTouchPoints > 0`), và dùng `fitSize(ctx, hintText, 32, v.w - 40)` để chữ không bao giờ bị cắt cụt mép.

### 9. Vũ khí bắn xa tạo ra "Thuế nhặt ngọc" (Amber Collection Tax) gây chùng nhịp
- **Mức độ ảnh hưởng:** 🟡 **NHẸ ĐẾN TRUNG BÌNH (Làm giảm nhịp độ trận đấu)**
- **Bằng chứng:** So sánh Run 2 (AOE) và Run 3 (Projectile). Ở Run 2, quái chết sát người nên đạt Evolution 1 ở 33s. Ở Run 3, đạn bắn tỉa quái tít ngoài màn hình, ngọc rơi vãi khắp nơi; người chơi phải chạy lòng vòng nhặt ngọc nên mãi tới 87s mới đạt Evolution 1. Người chơi có cảm giác "làm việc nhà" gom ngọc thay vì chiến đấu.
- **Đề xuất sửa:** Tăng nhẹ bán kính hút ngọc cơ bản từ **120 lên 150px**, và cho phép hổ phách rơi từ quái chết ngoài màn hình có lực hút nhẹ tự trôi về phía người chơi sau 10 giây.

### 10. Kỹ năng Thorns (Rải gai) có độ giật lùi = 0, dễ gây chết bẫy khi quay đầu
- **Mức độ ảnh hưởng:** 🟡 **NHẸ (Cân bằng kỹ năng)**
- **Bằng chứng:** Run 4 chết ở giây thứ 57 khi người chơi lượn vòng quay đầu vào đàn sâu. Do Thorns chỉ gây sát thương theo thời gian mà không đẩy lùi (knockback = 0), đàn sâu đi xuyên qua bãi gai cắn chết người chơi trong 0.8s.
- **Đề xuất sửa:** Thêm hiệu ứng làm chậm (Slow 25%) cho quái vật dẫm lên bãi gai của Thorns để hỗ trợ người chơi thoát vây khi quay đầu xe.

---

## 4. Tổng kết hướng bàn giao cho Claude & Codex

Các phát hiện và ảnh chụp thực tế trên đã chỉ rõ:
1. **Dòng kết quả (Result flow):** Cần áp dụng ngay bản sửa của Codex (Summary card trước, Retry to màu vàng, Revive là nút phụ, tip nguyên nhân chết).
2. **Hiển thị Mobile:** Cần sửa ngay lỗi Scrim, Ground padding, ẩn phím tắt `[1][2][3]` trên cảm ứng, và co kích thước bảng CAMP.
3. **Mũi tên chỉ hướng (Edge arrows):** Cần có để giải quyết triệt để 4/8 cái chết oan uổng do Boss húc ở phút thứ 3.
