import cv2
import numpy as np
from PIL import Image

def clean_seamless_tile(input_path, output_webp, check_jpg, mask_width=6):
    img = cv2.imread(input_path)
    h, w, c = img.shape
    assert h == w, "Must be square"
    S = h
    half = S // 2
    
    # 1. Offset wrap by half so seams are in center cross
    offset = np.zeros_like(img)
    offset[:half, :half] = img[half:, half:]
    offset[:half, half:] = img[half:, :half]
    offset[half:, :half] = img[:half, half:]
    offset[half:, half:] = img[:half, :half]
    
    # 2. Create inpaint mask only along the 1-2 pixel seam cross
    mask = np.zeros((S, S), dtype=np.uint8)
    half_m = mask_width // 2
    # Vertical seam line
    mask[:, half - half_m : half + half_m] = 255
    # Horizontal seam line
    mask[half - half_m : half + half_m, :] = 255
    
    # 3. Telea inpainting (repairs only the thin hairline without ghosting any leaves)
    inpainted = cv2.inpaint(offset, mask, inpaintRadius=4, flags=cv2.INPAINT_TELEA)
    
    # 4. Offset wrap back to original position
    result = np.zeros_like(inpainted)
    result[:half, :half] = inpainted[half:, half:]
    result[:half, half:] = inpainted[half:, :half]
    result[half:, :half] = inpainted[:half, half:]
    result[half:, half:] = inpainted[:half, :half]
    
    # 5. Save output WebP (and PNG)
    res_rgb = cv2.cvtColor(result, cv2.COLOR_BGR2RGB)
    res_pil = Image.fromarray(res_rgb)
    res_pil.save(output_webp, quality=92, method=6)
    png_out = output_webp.replace('.webp', '.png')
    res_pil.save(png_out)
    print(f"Saved clean seamless tile: {output_webp} and {png_out}")
    
    # 6. Test 2x2 tiling to verify 0 ghosting and 0 seams
    tiled = Image.new('RGB', (S * 2, S * 2))
    tiled.paste(res_pil, (0, 0))
    tiled.paste(res_pil, (S, 0))
    tiled.paste(res_pil, (0, S))
    tiled.paste(res_pil, (S, S))
    tiled.save(check_jpg, quality=90)
    print(f"Saved 2x2 tiling verification: {check_jpg}")
    return res_pil

if __name__ == '__main__':
    # Process both options:
    # Option 1: with 1 subtle puddle
    clean_seamless_tile(
        'D:/REMOTION/games/dino-swarm/art/map-folk/raw/ground-v3-with-puddle.jpg',
        'D:/REMOTION/games/dino-swarm/art/map-folk/ground-tile-puddle.webp',
        'D:/REMOTION/games/dino-swarm/art/map-folk/check-tiled-puddle-2x2.jpg',
        mask_width=6
    )
    # Option 2: clean organic sand + moss (no puddle)
    clean_seamless_tile(
        'D:/REMOTION/games/dino-swarm/art/map-folk/raw/ground-v3-organic-sand-moss.jpg',
        'D:/REMOTION/games/dino-swarm/art/map-folk/ground-tile-sand-moss.webp',
        'D:/REMOTION/games/dino-swarm/art/map-folk/check-tiled-sand-moss-2x2.jpg',
        mask_width=6
    )
