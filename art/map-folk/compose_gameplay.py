import os
from PIL import Image, ImageOps, ImageDraw, ImageFont, ImageFilter
import numpy as np

def compose_preview():
    # 1. Base BG (Large Forest Clearing Arena)
    bg_path = 'D:/REMOTION/games/dino-swarm/art/ui-folk/raw/bg-forest-clearing.jpg'
    bg = Image.open(bg_path).convert('RGBA').resize((1920, 1080), Image.Resampling.LANCZOS)
    
    # 2. Extract HUD from user screenshot
    ss_path = 'C:/Users/84762/.gemini/antigravity/brain/975357cc-6d95-4794-aa06-0e8d91085e69/.user_uploaded/media_1791889359370_189697e0.png'
    ss = Image.open(ss_path).convert('RGBA')
    ss_w, ss_h = ss.size
    
    # Top HUD strip
    hud_h_orig = int(ss_h * 0.088) # top bar
    hud_crop = ss.crop((0, 0, ss_w, hud_h_orig)).resize((1920, int(1080 * 0.088)), Image.Resampling.LANCZOS)
    
    # Clean HUD bar: dark semi-transparent backing so grass doesn't bleed through
    hud_bar = Image.new('RGBA', (1920, int(1080 * 0.088)), (25, 20, 15, 230))
    # Extract only the UI elements (badge, timer, pause, kills, coins) by chroma/alpha or composite
    hud_comp = Image.alpha_composite(hud_bar, hud_crop)
    
    # 3. Load character sprites
    hero = Image.open('D:/REMOTION/games/dino-swarm/art/map-folk/hero-cutout.png').convert('RGBA')
    shroom = Image.open('D:/REMOTION/games/dino-swarm/public/sprites/enemy-grub.webp').convert('RGBA')
    bat = Image.open('D:/REMOTION/games/dino-swarm/public/sprites/enemy-bat.webp').convert('RGBA')
    goblin = Image.open('D:/REMOTION/games/dino-swarm/public/sprites/enemy-shroom.webp').convert('RGBA')
    orc = Image.open('D:/REMOTION/games/dino-swarm/public/sprites/enemy-brute.webp').convert('RGBA')
    
    # Scale sprites appropriately for 1080p
    hero_h = 165
    hero_w = int(hero.width * (hero_h / hero.height))
    hero_s = hero.resize((hero_w, hero_h), Image.Resampling.LANCZOS)
    
    shroom_h = 80
    shroom_w = int(shroom.width * (shroom_h / shroom.height))
    shroom_s = shroom.resize((shroom_w, shroom_h), Image.Resampling.LANCZOS)
    
    bat_h = 75
    bat_w = int(bat.width * (bat_h / bat.height))
    bat_s = bat.resize((bat_w, bat_h), Image.Resampling.LANCZOS)
    
    gob_h = 125
    gob_w = int(goblin.width * (gob_h / goblin.height))
    gob_s = goblin.resize((gob_w, gob_h), Image.Resampling.LANCZOS)
    
    orc_h = 175
    orc_w = int(orc.width * (orc_h / orc.height))
    orc_s = orc.resize((orc_w, orc_h), Image.Resampling.LANCZOS)
    
    canvas = bg.copy()
    
    def draw_shadow(img_canvas, cx, cy, rx, ry):
        shadow = Image.new('RGBA', img_canvas.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(shadow)
        draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(10, 15, 8, 90))
        shadow = shadow.filter(ImageFilter.GaussianBlur(radius=8))
        img_canvas.alpha_composite(shadow)
    
    # Place enemies closing in towards center (960, 560)
    enemies = []
    
    shroom_coords = [
        (650, 420), (700, 390), (760, 430), (620, 480),
        (1200, 400), (1260, 380), (1320, 420), (1240, 470),
        (580, 680), (640, 720), (710, 690), (670, 760),
        (1180, 680), (1250, 730), (1310, 690), (1220, 770),
        (850, 360), (1050, 350), (950, 340),
        (820, 800), (940, 820), (1060, 800),
    ]
    for x, y in shroom_coords:
        enemies.append(('shroom', x, y))
        
    gob_coords = [(520, 520), (1380, 510), (780, 840), (1120, 850)]
    for x, y in gob_coords:
        enemies.append(('goblin', x, y))
        
    bat_coords = [(800, 460), (1100, 450), (680, 580), (1250, 590)]
    for x, y in bat_coords:
        enemies.append(('bat', x, y))
        
    orc_coords = [(460, 440), (1450, 620)]
    for x, y in orc_coords:
        enemies.append(('orc', x, y))
        
    enemies.sort(key=lambda e: e[2])
    
    hero_cx, hero_cy = 960, 560
    
    # Draw enemies behind hero
    for kind, x, y in enemies:
        if y > hero_cy:
            continue
        if kind == 'shroom':
            draw_shadow(canvas, x, y, 28, 12)
            canvas.alpha_composite(shroom_s, (x - shroom_w//2, y - shroom_h + 10))
        elif kind == 'bat':
            draw_shadow(canvas, x, y + 25, 20, 8)
            canvas.alpha_composite(bat_s, (x - bat_w//2, y - bat_h))
        elif kind == 'goblin':
            draw_shadow(canvas, x, y, 36, 14)
            canvas.alpha_composite(gob_s, (x - gob_w//2, y - gob_h + 12))
        elif kind == 'orc':
            draw_shadow(canvas, x, y, 55, 20)
            canvas.alpha_composite(orc_s, (x - orc_w//2, y - orc_h + 15))
            
    # Draw Hero
    draw_shadow(canvas, hero_cx, hero_cy, 50, 18)
    canvas.alpha_composite(hero_s, (hero_cx - hero_w//2, hero_cy - hero_h + 15))
    
    # Hero HP Bar
    hp_draw = ImageDraw.Draw(canvas)
    hp_w, hp_h_bar = 90, 12
    hp_x = hero_cx - hp_w // 2
    hp_y = hero_cy + 25
    hp_draw.rounded_rectangle([hp_x-2, hp_y-2, hp_x+hp_w+2, hp_y+hp_h_bar+2], radius=4, fill=(20, 15, 10, 220))
    hp_draw.rounded_rectangle([hp_x, hp_y, hp_x+hp_w, hp_y+hp_h_bar], radius=3, fill=(90, 195, 80, 255))
    
    # Draw enemies in front
    for kind, x, y in enemies:
        if y <= hero_cy:
            continue
        if kind == 'shroom':
            draw_shadow(canvas, x, y, 28, 12)
            canvas.alpha_composite(shroom_s, (x - shroom_w//2, y - shroom_h + 10))
        elif kind == 'bat':
            draw_shadow(canvas, x, y + 25, 20, 8)
            canvas.alpha_composite(bat_s, (x - bat_w//2, y - bat_h))
        elif kind == 'goblin':
            draw_shadow(canvas, x, y, 36, 14)
            canvas.alpha_composite(gob_s, (x - gob_w//2, y - gob_h + 12))
        elif kind == 'orc':
            draw_shadow(canvas, x, y, 55, 20)
            canvas.alpha_composite(orc_s, (x - orc_w//2, y - orc_h + 15))
            
    # Top HUD
    canvas.alpha_composite(hud_comp, (0, 0))
    
    # Save preview
    out_preview = 'D:/REMOTION/games/dino-swarm/art/map-folk/mock-gameplay-folk-large-bg.png'
    canvas.save(out_preview)
    print(f"Saved mockup preview: {out_preview}")
    
    # 4. Side-by-Side Comparison
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
        
    # Title Left
    c_draw.text((panel_w // 2, 24), "HIEN TAI (Nen gach lap tho so - repetitive tile)", fill=(210, 180, 140), font=font, anchor="mm")
    c_draw.text((panel_w // 2, 52), "Gach lap 614px, vet cheo gay roi mat, mat san trong trai", fill=(140, 120, 100), font=font_sub, anchor="mm")
    
    # Title Right
    c_draw.text((panel_w + panel_w // 2, 24), "DE XUAT (BG Lon - Dau Truong Rung Reu Co Tich)", fill=(255, 215, 110), font=font, anchor="mm")
    c_draw.text((panel_w + panel_w // 2, 52), "Khong gian rong lon, re cay co thu, goc cay muc phong suong, mau reu tram am", fill=(160, 200, 130), font=font_sub, anchor="mm")
    
    out_comp = 'D:/REMOTION/games/dino-swarm/art/map-folk/compare-bg-upgrade.png'
    comp.save(out_comp)
    print(f"Saved comparison: {out_comp}")

if __name__ == '__main__':
    compose_preview()
