# Báo Cáo Nghiệm Thu UI Batch 1 - Dark Folk Fairy-Tale UI Kit

**Dự án:** Dino Swarm Survivors (Poki HTML5 Game)  
**Thư mục làm việc:** `D:\REMOTION\games\dino-swarm\art\ui-folk`  
**Vai trò:** UI Artist (Antigravity)  
**Tình trạng:** Hoàn thành Batch 1 (Core Kit) & Dừng chờ chủ game duyệt.

---

## 1. Phong Cách & Điểm Tựa Nghệ Thuật (Style Anchors)
Bộ UI tuân thủ tuyệt đối các nguyên tắc trong `docs/ui-rules.md` và 2 style anchors:
- `art/folk/ref-char.png`: Nét mực nâu đen vẽ tay không đều nét (`#201812`), mảng màu bẹt đất trầm kết hợp 1 sắc độ bóng nhẹ, chất truyện cổ tích dân gian huyền bí và quyến rũ (charming but slightly grim / Over the Garden Wall aesthetic).
- `art/folk/ref-scene.png`: Chất liệu gỗ mộc phong sương, giấy da dê cổ (parchment), sắt đen rèn thủ công tán đinh rivet, vải gai thô, không gradient bóng nhẫy, không hiệu ứng 3D CGI, không viền vàng bóng bẩy kiểu mobile generic.
- **Quy tắc Poki:** Nút xem quảng cáo (`ui-btn-ad.png`) sử dụng màu gỗ sơn xám lam trầm (muted blue-grey), **tuyệt đối không dùng màu xanh lá (green)**.
- **Chuẩn 9-Slice:** Hoa văn và khớp nối đinh tán chỉ đặt ở 4 góc; các cạnh ở giữa phẳng và trơn để co giãn (stretch) mượt mà mà không bị méo chi tiết.

---

## 2. Bảng Danh Mục Asset Batch 1 & Kết Quả Kiểm Tra Chất Lượng (Quality Gate)

| Asset | Kích thước | 9-Slice Insets `[L, T, R, B]` | Tình trạng | Mô tả chi tiết |
|---|---|---|---|---|
| `ui-panel.png` | 512 × 512 | `[72, 72, 72, 72]` | **PASS** | Khung gỗ thông già phong sương, 4 góc bọc bát sắt rèn tán đinh, lòng giấy da dê màu kem sạch sẽ, không text. |
| `ui-card.png` | 384 × 512 | `[56, 56, 56, 56]` | **PASS** | Thẻ chọn nâng cấp tỷ lệ 3:4. Phía trên có ổ tròn/vòm chừa sẵn cho icon kỹ năng, nửa dưới là giấy da phẳng ghi chỉ số. |
| `ui-btn-primary.png` | 512 × 160 | `[88, 24, 88, 24]` | **PASS** | Nút hành động chính bằng thanh gỗ sơn màu hổ phách ấm (`#c87520`), hai đầu bọc nẹp sắt rèn đinh tán, mặt gỗ trống. |
| `ui-btn-primary-pressed.png` | 512 × 160 | `[88, 24, 88, 24]` | **PASS** | Trạng thái nhấn: lún cơ học xuống 3px, độ sáng giảm nhẹ (86%), tăng tương phản trong rãnh gỗ, khớp 100% với bản nhả. |
| `ui-btn-ad.png` | 512 × 160 | `[88, 24, 88, 24]` | **PASS** | Nút xem video nhận thưởng: gỗ sơn xám lam trầm (`#5a6e82`), không xanh lá (Poki compliance), nẹp sắt 2 đầu. |
| `ui-btn-quiet.png` | 512 × 160 | `[88, 24, 88, 24]` | **PASS** | Nút phụ: thanh gỗ sồi sẫm màu tự nhiên phong sương (`#3b2e22`), nẹp sắt đinh tán đồng bộ form nút chính. |
| `ui-ribbon-win.png` | 768 × 192 | `[190, 48, 190, 48]` | **PASS** | Dải ruy băng banner vải rêu phong (`#4a6e38`), đuôi nheo gấp nếp 2 bên, thân giữa phẳng và trống để game render chữ. |
| `ui-ribbon-lose.png` | 768 × 192 | `[190, 48, 190, 48]` | **PASS** | Dải ruy băng banner vải đỏ huyết dụ sẫm (`#7d2a2a`), đuôi nheo gấp nếp 2 bên, thân giữa phẳng và trống. |
| `ui-medallion.png` | 192 × 192 | `[32, 32, 32, 32]` | **PASS** | Huy hiệu tròn viền sắt đen rèn tay tán đinh, lòng đĩa gỗ để in số cấp độ nhân vật (level). |
| `ui-bar-frame.png` | 512 × 64 | `[42, 16, 42, 16]` | **PASS** | Khung sắt đen mảnh rèn tay, đinh tán ở 4 góc, **lòng rỗng trong suốt 100%** để game vẽ thanh thanh nạp XP/Boss HP bên dưới. |
| `ui-iconbtn.png` | 160 × 160 | `[32, 32, 32, 32]` | **PASS** | Nút tiện ích hình vuông bo tròn viền sắt rèn tán đinh (khác biệt với huy hiệu tròn của kỹ năng gameplay theo ui-rules.md). |
| `slices.json` | JSON | — | **PASS** | Tệp định nghĩa pixel insets `[left, top, right, bottom]` cho toàn bộ bộ kit 9-slice. |

---

## 3. Kiểm Tra Thông Số Kỹ Thuật (Numerical Quality Gate)
- **Độ trong suốt viền (Alpha Border):** Toàn bộ 11 sprite có dải viền ngoài ít nhất 6–12px trong suốt hoàn toàn (`alpha = 0`), không chạm mép canvas.
- **Khử Halo Trắng (Edge Luminance Check):** Độ sáng trung bình của vùng chuyển tiếp viền (semi-transparent zone) đều < 90/255 (trong đó đa phần < 20/255), triệt tiêu hoàn toàn viền trắng (white halo) bằng phương pháp bóc tách alpha kết hợp morphological erosion & feathering.
- **Không nhúng text tĩnh:** Toàn bộ sprite nguyên liệu là mặt phôi sạch sẽ, không có bất kỳ ký tự hay con số nào bị vẽ cố định.

---

## 4. Bản Dựng Trực Quan (Mockups Đã Xuất Xưởng)
1. **`art/ui-folk/mock-landscape.png` (1920 × 1080):**
   - Không gian gameplay rừng rêu cổ tích: Chú bé nông dân cầm chĩa ba cùng đàn nấm gặm nhấm tinh nghịch đứng trên nền rừng.
   - **HUD trên cùng:** Thanh XP bar viền sắt đen lồng huy hiệu cấp 12, lõi thanh nạp vàng hổ phách phát sáng, đồng hồ sinh tồn `05:42`, số quái hạ gục `1,248 SLAIN`, nút tạm dừng Pause ở góc phải.
   - **Màn hình Level-Up (bên trái):** Banner `ui-ribbon-win` "LEVEL UP!" cùng 3 thẻ nâng cấp `ui-card` ("Pitchfork Sweep", "Angry Geese", "Hearty Stew") mang huy hiệu cấp độ và icon vẽ tay đồng phong cách.
   - **Thẻ Kết Quả / Bảng Thua (bên phải):** Bảng `ui-panel` 9-slice với banner `ui-ribbon-lose` "DEFEAT", bảng chỉ số sinh tồn và bộ 3 nút bấm kích thước đầy đặn: "RETRY" (nút chính hổ phách), "REVIVE (WATCH AD)" (nút phụ xám lam + icon cuộn phim Poki), "GIVE UP" (nút gỗ tối màu).

2. **`art/ui-folk/mock-portrait.png` (1080 × 1920):**
   - Bản dựng giao diện di động màn hình dọc chuẩn 9:16.
   - Bố cục HUD trên cùng, 3 thẻ Level-Up ở nửa trên, nhân vật đứng giữa khoảng thở tự nhiên, và bảng kết quả kèm 3 nút bấm to bản đạt chuẩn chạm cảm ứng (touch target ≥ 48dp) ở nửa dưới.

---

## 5. Dừng Chờ Chủ Game Duyệt
Theo chỉ thị: *"Mỗi lô xong phải dừng lại chờ chủ game duyệt. Không làm Batch 2 khi chưa được duyệt."*  
Antigravity đã dừng lại, xin mời chủ game kiểm tra bộ ảnh trong `art/ui-folk/` và cho ý kiến phản hồi!
