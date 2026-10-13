# Dino Swarm Survivors: định hướng hình ảnh

Cập nhật 13/10/2026. Chủ game **không dùng** phong cách hoạt hình 3D bóng bẩy của Dino Merge Quest
(toàn bộ ảnh trong `public/sprites/` hiện tại chỉ để chạy thử, sẽ thay hết).
Chỉ chấp nhận một trong hai kiểu: **(1) vẽ tay dạng vector** hoặc **(2) vẽ tay kiểu sơn màu (hand-painted)**.

## 0. Chốt chặn chống làm ra ảnh vô giá trị
Chưa được sinh hàng loạt khi chủ game chưa duyệt **bộ ảnh thử phong cách** (mục 4).
Mỗi lô ảnh sau đó phải được xem cùng lúc trên một tấm ghép (contact sheet) và đối chiếu với
danh sách kiểm tra ở mục 5. Ảnh nào trượt dù chỉ một mục thì làm lại ảnh đó, không sửa bằng code.

## 1. Chuẩn rút ra từ Poki (sdk.poki.com/game-thumbnail)
- Ảnh đại diện: **một nhân vật hoặc vật thể chính ở tiền cảnh**, bố cục đơn giản, độ tương phản cao.
- **Không có chữ**, không viền và không chừa lề (ảnh được hiển thị ở rất nhiều kích thước).
- Chi tiết vụn sẽ thành rác khi ô hiển thị nhỏ, nên phải **thử ở 94×94 px**.
- Tránh màu gần với nền trang Poki (**#83FFE7**, màu xanh ngọc).
- Nhân vật trên ảnh đại diện phải đúng là nhân vật trong game.
- Ảnh đại diện tĩnh là bắt buộc trước chặng web fit test. Ảnh động làm sau: 1080×1080, dài 4–6 giây.
- Trên trang Poki, mọi ảnh đại diện xung quanh đều rực màu và bóng bẩy. Nét vẽ tay viền đậm
  chính là cách để **nổi bật giữa đám đông**, nhưng vẫn phải đủ sáng và đủ tương phản.

## 2. Kiểu (1) – Vẽ tay vector, kiểu sticker (KHUYÊN DÙNG)
Tham chiếu: ảnh hai nhân vật cầm chĩa ba chủ game gửi (nét hoạt hình viền đậm, đổ bóng hai tông).
- **Nét viền**: viền ngoài đậm màu nâu đen `#2a1d16`, dày khoảng 3% chiều cao nhân vật. Nét bên trong
  mảnh hơn khoảng 40%. Đầu nét thon như vẽ bằng bút, không phải nét đều tăm tắp như đồ họa máy.
- **Tô màu**: mảng màu phẳng + **một lớp bóng tối cứng** (cel shading, ánh sáng từ trên-trái)
  + tối đa một điểm sáng nhỏ. Không chuyển màu mượt, không bóng 3D, không vân chất liệu.
- **Viền sticker trắng** (dày khoảng 2% chiều cao) quanh **nhân vật người chơi, vật phẩm nhặt được
  và ảnh đại diện**. Quái **không** có viền trắng, nhờ vậy người chơi luôn nổi bật giữa bầy quái.
- **Tỉ lệ**: đầu to (khoảng 40% thân), mắt to, biểu cảm phóng đại, dáng hơi lom khom.
  Đây là kiểu "hơi lầy, hơi bụi", **không phải kiểu em bé dễ thương** (chủ game đã chê kiểu chibi trẻ con).
- **Bảng màu**: nền đất ấm, hơi đục (xanh rêu, nâu, be). Màu bão hòa chỉ dành cho người chơi
  (cam hoặc đỏ), XP (hổ phách) và hiệu ứng chiêu. Mỗi nhân vật dùng tối đa 5 màu chính.
- **Hình khối nhận diện**: mỗi loại quái có một bóng đen riêng (tròn, nhọn, dẹt, cao).
  Thử bằng cách tô đen kín ở 48 px: nếu vẫn phân biệt được thì đạt.
- **Ưu điểm**: dễ đọc ở kích thước nhỏ, file nhẹ (tải dưới 10 giây), và dễ giữ đồng bộ giữa hàng chục ảnh.

## 3. Kiểu (2) – Hand-painted (dự phòng)
- Nét cọ thấy được, màu chuyển kiểu sơn dầu hoặc gouache, viền màu sẫm mảnh (không phải đen thuần).
- Ánh sáng ấm từ trên-trái, đổ bóng ấm. Vật thể chính có chi tiết; nền thì nét cọ thưa và nhòe.
- **Rủi ro**: dễ trông giống ảnh AI, dễ bị đục khi thu nhỏ, file nặng hơn, khó đồng bộ giữa các ảnh.

## 4. Bộ ảnh thử phong cách (bước BẮT BUỘC đầu tiên)
Làm cho **cả hai kiểu**, cùng một nội dung, cùng một khung hình, để chủ game so sánh rồi chọn:
1. Khủng long người chơi (raptor cam, 3/4 nghiêng, đứng gầm), nền trong suốt.
2. Một quái thường (đá dung nham nhỏ) và một trùm.
3. Một khung hình gameplay 16:9 giả lập: nền đất nhìn từ trên xuống, người chơi ở giữa, 30 quái,
   vài viên XP, một chiêu đang nổ, thanh HUD.
4. Ảnh đại diện 1:1 (628×628) và chính ảnh đó thu nhỏ còn 94×94.

Ghép tất cả vào `art/style-test/compare.png`. Chủ game chọn xong mới sinh hàng loạt.

## 5. Danh sách kiểm tra mỗi ảnh
- [ ] Nền trong suốt sạch: không viền đen hoặc viền xanh dư, mép mềm (mép có điểm ảnh bán trong suốt).
- [ ] Nét viền dày giống các ảnh khác cùng cỡ (đo bằng mắt trên tấm ghép).
- [ ] Ánh sáng từ trên-trái, giống mọi ảnh khác.
- [ ] Bóng đen tô kín ở 48 px vẫn nhận ra được.
- [ ] Không có chữ, không chữ ký hoặc logo giả, không thừa ngón hay thừa chân.
- [ ] Nhân vật quay **sang phải** (game tự lật ảnh khi đi sang trái).
- [ ] Xuất WebP, cạnh dài 256 px (quái thường) / 384 px (người chơi, trùm), mỗi file dưới 40 KB.

## 6. Chuyển động (không cần vẽ nhiều khung hình)
Mỗi nhân vật chỉ cần **một ảnh**. Code tạo chuyển động: nhún co giãn khi đi, nghiêng theo hướng chạy,
nháy trắng khi trúng đòn, bẹp rồi tan khi chết. AI vẽ nhiều khung liên tiếp rất khó khớp nhau,
nên cách này vừa đẹp vừa tiết kiệm. Riêng người chơi có thể thêm ảnh thứ hai "há miệng cắn".

## 7. Danh sách ảnh cần làm (sau khi chủ game duyệt)
| Nhóm | Số lượng | Ghi chú |
|---|---|---|
| Khủng long người chơi | 3 dạng tiến hóa × 3 loài = 9 | raptor, ankylo, ptero; lớn dần, thêm gai/sừng |
| Quái thường | 6 | slime đá, bọ lửa, dơi tro, sói băng, nấm độc, quạ |
| Trùm | 3 | xuất hiện ở phút 3, 6, 9 |
| Vật phẩm | 5 | hổ phách XP (3 cỡ), thịt hồi máu, nam châm, rương, xu |
| Biểu tượng kỹ năng | 12 | tròn, cùng một kiểu khung |
| Nền đất lát gạch | 3 vùng | ô lặp liền mạch 512×512, **sạch, ít chi tiết** |
| Ảnh đại diện | 1 tĩnh, sau đó 1 động | theo mục 1 |
