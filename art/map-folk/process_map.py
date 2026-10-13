import os
import sys
from PIL import Image, ImageOps, ImageFilter
import numpy as np

def make_seamless(input_path, output_path, size=1024, border_frac=0.12):
    """
    Takes an input texture image, crops to square, and creates a mathematically seamless tile
    by blending opposite borders with smooth cosine weighting.
    """
    im = Image.open(input_path).convert('RGB')
    # Center crop square
    w, h = im.size
    min_dim = min(w, h)
    left = (w - min_dim) // 2
    top = (h - min_dim) // 2
    im = im.crop((left, top, left + min_dim, top + min_dim))
    im = im.resize((size, size), Image.Resampling.LANCZOS)
    
    arr = np.array(im, dtype=np.float32)
    B = int(size * border_frac)
    
    # Horizontal blend: blend left border (x in [0, B]) with right border (x in [size-B, size])
    t = np.linspace(0, 1, B)
    # Smoothstep / cosine curve
    weight = 0.5 * (1 - np.cos(np.pi * t)) # 0 to 1
    weight_3d = weight[np.newaxis, :, np.newaxis] # (1, B, 1)
    
    # Left edge blends with right edge
    left_strip = arr[:, :B, :]
    right_strip = arr[:, -B:, :]
    blended = left_strip * (1 - weight_3d) + right_strip * weight_3d
    
    arr[:, :B, :] = blended
    arr[:, -B:, :] = blended
    
    # Vertical blend: blend top border with bottom border
    weight_v = 0.5 * (1 - np.cos(np.pi * t))
    weight_v_3d = weight_v[:, np.newaxis, np.newaxis] # (B, 1, 1)
    
    top_strip = arr[:B, :, :]
    bottom_strip = arr[-B:, :, :]
    blended_v = top_strip * (1 - weight_v_3d) + bottom_strip * weight_v_3d
    
    arr[:B, :, :] = blended_v
    arr[-B:, :, :] = blended_v
    
    res = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    res.save(output_path, quality=95)
    print(f"Saved seamless tile to {output_path} ({size}x{size})")
    
    # Save a 2x2 tiled check
    tiled = Image.new('RGB', (size * 2, size * 2))
    tiled.paste(res, (0, 0))
    tiled.paste(res, (size, 0))
    tiled.paste(res, (0, size))
    tiled.paste(res, (size, size))
    check_path = output_path.replace('.png', '-tiled2x2.jpg').replace('.webp', '-tiled2x2.jpg')
    tiled.save(check_path, quality=90)
    print(f"Saved 2x2 tiling check to {check_path}")
    return res

if __name__ == '__main__':
    print("Process map script ready")
