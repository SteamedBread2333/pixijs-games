#!/usr/bin/env python3
"""Generate favicon.ico from the meme image."""
from PIL import Image, ImageDraw, ImageOps

SRC = '/Users/derbysoft-i129/Downloads/f9ac35bd954741df92926e43494f177e.png'
OUT = '/Users/derbysoft-i129/Documents/GitHub/pixijs-games/public/favicon.ico'

img = Image.open(SRC).convert('RGBA')

# 保留完整画面（含底部文字），仅补成正方形
img = ImageOps.pad(img, (512, 512), method=Image.Resampling.LANCZOS, color=(255, 255, 255, 255))

# Rounded-corner mask
mask = Image.new('L', (512, 512), 0)
d = ImageDraw.Draw(mask)
d.rounded_rectangle([0, 0, 511, 511], radius=96, fill=255)
img.putalpha(mask)

# Save multi-resolution ICO (Pillow downscales from the full-res image)
sizes = [16, 32, 48, 64, 128, 256]
img.save(OUT, format='ICO', sizes=[(s, s) for s in sizes])
print('Saved', OUT, 'sizes:', sizes)
