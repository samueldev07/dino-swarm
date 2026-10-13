import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def process_v3_tile():
    raw_tile = 'D:/REMOTION/games/dino-swarm/art/map-folk/raw/ground-v4-subtle-dirt.jpg'
    if not os.path.exists(raw_tile):
        return
    img = cv2.imread(raw_tile)
    h, w, c = img.shape
    S = min(h, w)
    img = cv2.resize(img, (1024, 1024))
    S = 1024
    half = S // 2
    
    # Offset wrap
    offset = np.zeros_like(img)
    offset[:half, :half] = img[half:, half:]
    offset[:half, half:] = img[half:, :half]
    offset[half:, :half] = img[:half, half:]
    offset[half:, half:] = img[:half, :half]
    
    # 4px inpaint mask along hairline seam
    mask = np.zeros((S, S), dtype=np.uint8)
    mask[:, half - 3 : half + 3] = 255
    mask[half - 3 : half + 3, :] = 255
    
    inpainted = cv2.inpaint(offset, mask, inpaintRadius=3, flags=cv2.INPAINT_TELEA)
    
    res = np.zeros_like(inpainted)
    res[:half, :half] = inpainted[half:, half:]
    res[:half, half:] = inpainted[half:, :half]
    res[half:, :half] = inpainted[:half, half:]
    res[half:, half:] = inpainted[:half, :half]
    
    res_rgb = cv2.cvtColor(res, cv2.COLOR_BGR2RGB)
    res_pil = Image.fromarray(res_rgb)
    out_webp = 'D:/REMOTION/games/dino-swarm/art/map-folk/ground-tile-v3.webp'
    res_pil.save(out_webp, quality=92, method=6)
    res_pil.save('D:/REMOTION/games/dino-swarm/art/map-folk/ground-tile-v3.png')
    
    tiled = Image.new('RGB', (S * 2, S * 2))
    tiled.paste(res_pil, (0, 0))
    tiled.paste(res_pil, (S, 0))
    tiled.paste(res_pil, (0, S))
    tiled.paste(res_pil, (S, S))
    tiled.save('D:/REMOTION/games/dino-swarm/art/map-folk/check-tiled-v3-2x2.jpg', quality=90)
    print("Tile v3 processed & saved")

def compose_v3():
    bg_path = 'D:/REMOTION/games/dino-swarm/art/map-folk/raw/bg-forest-arena-v3.jpg'
    if not os.path.exists(bg_path):
        print("bg-forest-arena-v3.jpg not found yet")
        return
        
    bg = Image.open(bg_path).convert('RGBA').resize((1920, 1080), Image.Resampling.LANCZOS)
    canvas = bg.copy()
    
    # 1. HUD from user screenshot
    ss_path = 'C:/Users/84762/.gemini/antigravity/brain/975357cc-6d95-4794-aa06-0e8d91085e69/.user_uploaded/media_1791889359370_189697e0.png'
    ss = Image.open(ss_path).convert('RGBA')
    ss_w, ss_h = ss.size
    hud_h = int(ss_h * 0.088)
    hud_crop = ss.crop((0, 0, ss_w, hud_h)).resize((1920, int(1080 * 0.088)), Image.Resampling.LANCZOS)
    hud_bar = Image.new('RGBA', (1920, int(1080 * 0.088)), (22, 18, 14, 230))
    hud_comp = Image.alpha_composite(hud_bar, hud_crop)
    
    # 2. Sprites
    hero = Image.open('D:/REMOTION/games/dino-swarm/art/map-folk/hero-cutout.png').convert('RGBA')
    shroom = Image.open('D:/REMOTION/games/dino-swarm/public/sprites/enemy-grub.webp').convert('RGBA')
    bat = Image.open('D:/REMOTION/games/dino-swarm/public/sprites/enemy-bat.webp').convert('RGBA')
    goblin = Image.open('D:/REMOTION/games/dino-swarm/public/sprites/enemy-shroom.webp').convert('RGBA')
    orc = Image.open('D:/REMOTION/games/dino-swarm/public/sprites/enemy-brute.webp').convert('RGBA')
    
    hero_h = 165
    hero_s = hero.resize((int(hero.width * (hero_h / hero.height)), hero_h), Image.Resampling.LANCZOS)
    
    shroom_h = 80
    shroom_s = shroom.resize((int(shroom.width * (shroom_h / shroom.height)), shroom_h), Image.Resampling.LANCZOS)
    
    bat_h = 75
    bat_s = bat.resize((int(bat.width * (bat_h / bat.height)), bat_h), Image.Resampling.LANCZOS)
    
    gob_h = 125
    gob_s = goblin.resize((int(goblin.width * (gob_h / goblin.height)), gob_h), Image.Resampling.LANCZOS)
    
    orc_h = 175
    orc_s = orc.resize((int(orc.width * (orc_h / orc.height)), orc_h), Image.Resampling.LANCZOS)
    
    def draw_shadow(img_canvas, cx, cy, rx, ry):
        shadow = Image.new('RGBA', img_canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(shadow)
        draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(10, 15, 8, 95))
        shadow = shadow.filter(ImageFilter.GaussianBlur(radius=8))
        img_canvas.alpha_composite(shadow)
        
    enemies = [
        ('shroom', 650, 420), ('shroom', 700, 390), ('shroom', 760, 430), ('shroom', 620, 480),
        ('shroom', 1200, 400), ('shroom', 1260, 380), ('shroom', 1320, 420), ('shroom', 1240, 470),
        ('shroom', 580, 680), ('shroom', 640, 720), ('shroom', 710, 690), ('shroom', 670, 760),
        ('shroom', 1180, 680), ('shroom', 1250, 730), ('shroom', 1310, 690), ('shroom', 1220, 770),
        ('shroom', 850, 360), ('shroom', 1050, 350), ('shroom', 950, 340),
        ('shroom', 820, 800), ('shroom', 940, 820), ('shroom', 1060, 800),
        ('goblin', 520, 520), ('goblin', 1380, 510), ('goblin', 780, 840), ('goblin', 1120, 850),
        ('bat', 800, 460), ('bat', 1100, 450), ('bat', 680, 580), ('bat', 1250, 590),
        ('orc', 460, 440), ('orc', 1450, 620)
    ]
    enemies.sort(key=lambda e: e[2])
    
    hero_cx, hero_cy = 960, 560
    
    for kind, x, y in enemies:
        if y > hero_cy:
            continue
        s_img = {'shroom': shroom_s, 'bat': bat_s, 'goblin': gob_s, 'orc': orc_s}[kind]
        s_rx = {'shroom': 28, 'bat': 20, 'goblin': 36, 'orc': 55}[kind]
        s_ry = {'shroom': 12, 'bat': 8, 'goblin': 14, 'orc': 20}[kind]
        draw_shadow(canvas, x, y if kind != 'bat' else y + 25, s_rx, s_ry)
        canvas.alpha_composite(s_img, (x - s_img.width // 2, y - s_img.height + (10 if kind != 'bat' else 0)))
        
    draw_shadow(canvas, hero_cx, hero_cy, 50, 18)
    canvas.alpha_composite(hero_s, (hero_cx - hero_s.width // 2, hero_cy - hero_s.height + 15))
    
    # Hero HP Bar
    hp_draw = ImageDraw.Draw(canvas)
    hp_w, hp_h_bar = 90, 12
    hp_x = hero_cx - hp_w // 2
    hp_y = hero_cy + 25
    hp_draw.rounded_rectangle([hp_x-2, hp_y-2, hp_x+hp_w+2, hp_y+hp_h_bar+2], radius=4, fill=(20, 15, 10, 220))
    hp_draw.rounded_rectangle([hp_x, hp_y, hp_x+hp_w, hp_y+hp_h_bar], radius=3, fill=(90, 195, 80, 255))
    
    for kind, x, y in enemies:
        if y <= hero_cy:
            continue
        s_img = {'shroom': shroom_s, 'bat': bat_s, 'goblin': gob_s, 'orc': orc_s}[kind]
        s_rx = {'shroom': 28, 'bat': 20, 'goblin': 36, 'orc': 55}[kind]
        s_ry = {'shroom': 12, 'bat': 8, 'goblin': 14, 'orc': 20}[kind]
        draw_shadow(canvas, x, y if kind != 'bat' else y + 25, s_rx, s_ry)
        canvas.alpha_composite(s_img, (x - s_img.width // 2, y - s_img.height + (10 if kind != 'bat' else 0)))
        
    # Top HUD
    canvas.alpha_composite(hud_comp, (0, 0))
    
    out_preview = 'D:/REMOTION/games/dino-swarm/art/map-folk/mock-gameplay-arena-v3.png'
    canvas.save(out_preview)
    print(f"Saved: {out_preview}")
    
    # Side-by-side comparison with original user screenshot
    comp_w, comp_h = 2400, 720
    panel_w = comp_w // 2
    header_h = 75
    
    ss_fit = ss.resize((panel_w, comp_h), Image.Resampling.LANCZOS)
    new_fit = canvas.resize((panel_w, comp_h), Image.Resampling.LANCZOS)
    
    comp = Image.new('RGB', (comp_w, comp_h + header_h), (20, 16, 13))
    comp.paste(ss_fit, (0, header_h))
    comp.paste(new_fit, (panel_w, header_h))
    
    c_draw = ImageDraw.Draw(comp)
    c_draw.line([(panel_w, 0), (panel_w, comp_h + header_h)], fill=(65, 50, 35), width=4)
    
    try:
        font = ImageFont.truetype("arial.ttf", 26)
        font_sub = ImageFont.truetype("arial.ttf", 18)
    except:
        font = ImageFont.load_default()
        font_sub = font
        
    c_draw.text((panel_w // 2, 24), "HIEN TAI (Nen gach lap tho so - repetitive tile)", fill=(210, 180, 140), font=font, anchor="mm")
    c_draw.text((panel_w // 2, 52), "Gach lap vet cheo, mat san trong trai, de gay roi mat", fill=(140, 120, 100), font=font_sub, anchor="mm")
    
    c_draw.text((panel_w + panel_w // 2, 24), "MAP MOI V3 (80% Reu tram tu nhien + Vang dat nhe + Khong vung nuoc)", fill=(255, 215, 110), font=font, anchor="mm")
    c_draw.text((panel_w + panel_w // 2, 52), "Chu dao la tham reu tram em diu, chut dat thoang nhe nhang, khong vung nuoc roi mat", fill=(160, 200, 130), font=font_sub, anchor="mm")
    
    out_comp = 'D:/REMOTION/games/dino-swarm/art/map-folk/compare-arena-v3.png'
    comp.save(out_comp)
    print(f"Saved: {out_comp}")

if __name__ == '__main__':
    process_v3_tile()
    compose_v3()
