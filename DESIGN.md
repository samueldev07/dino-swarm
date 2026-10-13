# Dino Swarm Survivors: thiết kế (v0.1, 13/10/2026)

Game làm để test trên Poki. Chỉ tiêu: thời gian chơi trung bình **≥ 3 phút** (nhắm tới 6 phút),
**≥ 25%** lượt chơi kéo dài quá 3 phút, tỉ lệ người vào trang bắt đầu chơi (C2P) **≥ 65%**.
Chữ trong game bằng tiếng Anh (thị trường Mỹ).

## Vòng chơi chính
- Bấm **PLAY** là vào chơi ngay, không có màn giới thiệu. Hướng dẫn nằm luôn trong màn chơi:
  "Drag to move" trên điện thoại, "WASD / Arrows" trên máy tính, biến mất sau khi người chơi di chuyển 2 giây.
- Người chơi chỉ **di chuyển**. Khủng long **tự đánh** con quái gần nhất.
- Quái chết rơi **hổ phách (XP)**. Đầy thanh XP thì lên cấp: game dừng, hiện **3 thẻ kỹ năng**
  để chọn 1 (kỹ năng mới hoặc nâng cấp kỹ năng đang có, tối đa cấp 5).
- **Tiến hóa** ở cấp 8 và cấp 16: khủng long đổi sang ảnh lớn hơn và mạnh hơn,
  có màn ăn mừng ngắn khoảng 1,2 giây. Đây là "phần thưởng sớm" giữ chân người chơi trong 3 phút đầu.
- Mỗi vòng dài **10 phút**. Trùm xuất hiện ở phút 3, 6, 9. Sống hết 10 phút là thắng
  (STAGE CLEAR), mở vùng đất tiếp theo.
- Thua thì hiện thẻ KNOCKED OUT: thời gian sống, số quái hạ, xu nhận được, và hai nút **RETRY** / **CAMP**.

## Tiến trình giữa các vòng (để người chơi quay lại)
- Xu nhặt trong vòng được giữ lại. Ở **CAMP** dùng xu nâng 6 chỉ số vĩnh viễn:
  Might, Vitality, Speed, Magnet, Greed, Armor (mỗi chỉ số 5 cấp).
- Mở khóa loài mới: Ankylo (khỏe, chậm) khi thắng vùng 1, Ptero (nhanh, máu ít) khi thắng vùng 2.
- 3 vùng đất: Jungle → Lava Fields → Frost Peaks.

## Kỹ năng (8 tấn công + 6 bổ trợ)
Tấn công: Bite Slash (có sẵn từ đầu, chém vòng cung phía trước), Fire Spit (bắn quái gần nhất),
Bone Boomerang, Tail Spin (vật thể quay quanh người), Stomp Quake (sóng chấn động quanh người),
Meteor Rain (thiên thạch rơi ngẫu nhiên), Thorn Trail (để lại gai dọc đường đi),
Roar Burst (đẩy lùi quái; **vẽ thành vụ nổ răng cưa, KHÔNG vẽ vòng cung đồng tâm** vì chủ game từng chê là "khủng long wifi").
Bổ trợ: +máu tối đa, +tốc độ, +sát thương, −thời gian hồi chiêu, +tầm hút XP, +hồi máu.

## Nhịp độ (sẽ chỉnh lại bằng mô phỏng)
- Phút 0–1: quái đi chậm, chết sau 1 đòn. Người chơi lên cấp khoảng 15 giây một lần.
- Phút 1–3: số quái tăng dần. Tiến hóa lần 1 vào khoảng phút 2,5. Trùm 1 xuất hiện ở phút 3.
- Một người chơi đứng yên phải sống được **ít nhất 75 giây**. Người mới nhưng có di chuyển
  phải sống được **khoảng 4 phút**. Cả hai mức này được đo bằng bot mô phỏng.
- Giới hạn trên màn hình: tối đa 300 quái, 400 viên đạn, 200 hạt hiệu ứng. Giữ 60 fps trên điện thoại tầm trung.

## Poki SDK (lớp bọc `src/engine/poki.ts`; nếu không có SDK thì không làm gì)
| Thời điểm | Gọi |
|---|---|
| Lúc khởi động | `PokiSDK.init()`. Nếu lỗi vẫn cho chạy game |
| Tải xong ảnh cho màn đầu | `gameLoadingFinished()` |
| Lần đầu thật sự bắt đầu chơi, và mỗi khi quay lại chơi | `gameplayStart()` |
| Tạm dừng, thua, thắng, về CAMP | `gameplayStop()` |
| Bấm RETRY hoặc PLAY từ menu | `commercialBreak()`: tắt tiếng, chạy quảng cáo xong mới vào chơi |
| Nút "🎬 Revive" khi thua (1 lần mỗi vòng), "🎬 x2 coins" ở thẻ kết quả | `rewardedBreak()` |
- Nút xem quảng cáo **không dùng màu xanh lá**, luôn có biểu tượng 🎬 và luôn đi kèm nút thường
  to bằng hoặc to hơn. Không gọi cùng một sự kiện hai lần liên tiếp. **Không tự hẹn giờ quảng cáo.**
- Lần lên cấp **không** gọi `gameplayStop()`, vì chỉ là chọn thẻ trong vài giây.
- ESC / P để tạm dừng. Tự tạm dừng khi chuyển tab. Mọi `localStorage` đều bọc `try/catch` (đã có sẵn).

## Kỹ thuật
TypeScript + Vite + Canvas2D, dựng từ khung Dino Merge Quest (`src/engine/*`, âm thanh tự tổng hợp, `ui.ts`, `fx.ts`).
Luật chơi nằm hết ở `src/game/model.ts`: thuần logic, không đụng tới DOM, có test và bot mô phỏng.
Phần hiển thị là `game.ts`. Mục tiêu bản build dưới **5 MB**.

## Số đo từ bot chơi thử (13/10/2026, 6 lượt mỗi kiểu, vùng 1, raptor, chưa nâng cấp ở trại)
| Kiểu người chơi | Sống trung bình | Lượt chơi > 3 phút | Thắng |
|---|---|---|---|
| Đứng yên | 2:34 | 33% | 0/6 |
| Người mới (phản xạ chậm, hay khựng lại) | **5:08** | **100%** | 0/6 |
| Chơi khá | 6:00 | 100% | 1/6 |

Lần tiến hóa đầu tiên rơi vào khoảng phút 2:15–2:40. Muốn thắng vùng 1 cần nâng cấp ở trại vài lần, như dự định.
Hiệu năng: 277 quái trên màn hình tốn khoảng 3 ms mỗi khung hình trên máy tính. Bản build nặng 221 KB.
Các thông số chỉnh so với bản nháp: XP lên cấp rẻ hơn, quái ra dày hơn ngay từ đầu (2,4 con/giây),
sâu và dơi đánh nhẹ hơn, thời gian miễn sát thương sau khi trúng đòn là 0,5 giây, tầm hút XP 120.
