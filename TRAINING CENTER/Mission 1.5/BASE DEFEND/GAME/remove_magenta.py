import os
import shutil
import numpy as np
from PIL import Image, ImageFilter
from collections import deque
import scipy.ndimage as ndi

def clean_chroma_key(input_path, output_path, tolerance=65):
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img)
    h, w, _ = arr.shape
    
    corners = [
        arr[0, 0, :3].astype(float),
        arr[0, w - 1, :3].astype(float),
        arr[h - 1, 0, :3].astype(float),
        arr[h - 1, w - 1, :3].astype(float)
    ]
    bg_ref = np.median(corners, axis=0)
    
    diff = arr[:, :, :3].astype(float) - bg_ref
    dist = np.sqrt(np.sum(diff ** 2, axis=2))
    
    is_bg_candidate = (dist < tolerance)
    
    visited = np.zeros((h, w), dtype=bool)
    bg_mask = np.zeros((h, w), dtype=bool)
    queue = deque()
    
    for x in range(w):
        if is_bg_candidate[0, x]: queue.append((0, x)); visited[0, x] = True
        if is_bg_candidate[h - 1, x]: queue.append((h - 1, x)); visited[h - 1, x] = True
    for y in range(h):
        if is_bg_candidate[y, 0]: queue.append((y, 0)); visited[y, 0] = True
        if is_bg_candidate[y, w - 1]: queue.append((y, w - 1)); visited[y, w - 1] = True
        
    while queue:
        cy, cx = queue.popleft()
        bg_mask[cy, cx] = True
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                visited[ny, nx] = True
                if is_bg_candidate[ny, nx]:
                    queue.append((ny, nx))
                    
    dilated_bg = ndi.binary_dilation(bg_mask, iterations=1)
    
    r = arr[:, :, 0].astype(float)
    g = arr[:, :, 1].astype(float)
    b = arr[:, :, 2].astype(float)
    is_magenta_fringe = (r > 120) & (b > 120) & (g < 100) & (abs(r - b) < 60)
    
    final_bg = dilated_bg | (ndi.binary_dilation(dilated_bg, iterations=1) & is_magenta_fringe)
    
    alpha = np.where(final_bg, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.6))
    
    res_arr = arr.copy()
    res_arr[:, :, 3] = np.array(alpha_img)
    
    out_img = Image.fromarray(res_arr, "RGBA")
    bbox = out_img.getbbox()
    if bbox:
        pad = 12
        cropped_bbox = (
            max(0, bbox[0] - pad),
            max(0, bbox[1] - pad),
            min(w, bbox[2] + pad),
            min(h, bbox[3] + pad)
        )
        out_img = out_img.crop(cropped_bbox)
        
    out_img.save(output_path, "PNG")
    print(f"[OK] Cleaned and saved: {output_path} (Size: {out_img.size})")

# 1. Process Robots
robots_dir = r"d:\AI\SET OUT\GAMES\be_a_hacker\TRAINING CENTER\Mission 1.5\BASE DEFEND\ART\robots"

targets = [
    ("robot3.jpeg", "robot3.png"),
    ("robot4.jpeg", "robot4.png"),
    ("robot5-text.jpeg", "robot5-text.png")
]

for inp_name, out_name in targets:
    inp_file = os.path.join(robots_dir, inp_name)
    out_file = os.path.join(robots_dir, out_name)
    clean_chroma_key(inp_file, out_file)

# 2. Setup Explosion Blue Frames
src_explosion_dir = r"d:\AI\SET OUT\GAMES\be_a_hacker\TRAINING CENTER\Mission 1.5\BASE DEFEND\ART\destruction frames\craftpix-net-840730-free-animated-explosion-sprite-pack\PNG\Explosion_8"
dst_explosion_dir = r"d:\AI\SET OUT\GAMES\be_a_hacker\TRAINING CENTER\Mission 1.5\BASE DEFEND\ART\destruction frames\explosion blue"
os.makedirs(dst_explosion_dir, exist_ok=True)

for i in range(1, 11):
    src_file = os.path.join(src_explosion_dir, f"Explosion_{i}.png")
    dst_file = os.path.join(dst_explosion_dir, f"frame{i}.png")
    if os.path.exists(src_file):
        shutil.copy2(src_file, dst_file)
        print(f"[OK] Copied Explosion_{i}.png -> frame{i}.png")

print("All asset preparations complete!")
