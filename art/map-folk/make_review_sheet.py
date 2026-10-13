import os
from PIL import Image, ImageDraw, ImageFont

def make_review_sheet():
    arena_img = Image.open('D:/REMOTION/games/dino-swarm/art/map-folk/mock-gameplay-arena-v2.png').convert('RGB')
    bg_clean = Image.open('D:/REMOTION/games/dino-swarm/art/map-folk/raw/bg-forest-arena-v2.jpg').convert('RGB')
    tile_2x2 = Image.open('D:/REMOTION/games/dino-swarm/art/map-folk/check-tiled-sand-moss-2x2.jpg').convert('RGB')
    
    # 2 rows layout:
    # Row 1: Full Arena Gameplay Mockup (1920 x 1080 -> scaled to 1600 x 900)
    # Row 2: Left: Clean Arena BG (800 x 450), Right: Seamless Tile 2x2 (800 x 800)
    
    W = 1640
    H = 920 + 820 + 120
    canvas = Image.new('RGB', (W, H), (18, 14, 11))
    draw = ImageDraw.Draw(canvas)
    
    try:
        font_title = ImageFont.truetype("arial.ttf", 28)
        font_sub = ImageFont.truetype("arial.ttf", 20)
    except:
        font_title = ImageFont.load_default()
        font_sub = font_title
        
    # Header Top
    draw.text((W // 2, 35), "BANG TONG HOP MAP V2 - CO MANG CAT CAN BANG & KHU HOAN TOAN LOI BLEND LA", fill=(255, 215, 110), font=font_title, anchor="mm")
    
    # Item 1: In-game mockup
    arena_resized = arena_img.resize((1600, 900), Image.Resampling.LANCZOS)
    canvas.paste(arena_resized, (20, 70))
    
    # Section 2 header
    y2 = 70 + 900 + 40
    draw.text((410, y2), "1. BG NGUYEN TAM DAU TRUONG (Khong lap gach, 1 vung nuoc duy nhat)", fill=(210, 180, 140), font=font_sub, anchor="mm")
    draw.text((1230, y2), "2. GACH SEAMLESS REPEAT (Khong loi la ma - Zero Ghosting)", fill=(210, 180, 140), font=font_sub, anchor="mm")
    
    bg_resized = bg_clean.resize((780, 439), Image.Resampling.LANCZOS)
    canvas.paste(bg_resized, (20, y2 + 25))
    
    tile_resized = tile_2x2.resize((780, 780), Image.Resampling.LANCZOS)
    canvas.paste(tile_resized, (840, y2 + 25))
    
    out_p = 'D:/REMOTION/games/dino-swarm/art/map-folk/review-map-v2-options.png'
    canvas.save(out_p, quality=90)
    print(f"Saved review sheet: {out_p}")

if __name__ == '__main__':
    make_review_sheet()
