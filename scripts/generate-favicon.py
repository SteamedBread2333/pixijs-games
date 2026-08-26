#!/usr/bin/env python3
"""Generate a multi-resolution favicon.ico for the mini-game box."""
from PIL import Image, ImageDraw

SIZE = 256

# Palette matching the site's dark-blue theme
BG = (28, 35, 51)          # #1c2333
BG_LIGHT = (39, 54, 83)    # #273653
ACCENT = (124, 166, 255)   # #7ca6ff

# Game-bright squares (cyan, green, gold, pink)
COLORS = [
    (79, 195, 247),   # cyan
    (102, 187, 106),  # green
    (255, 202, 40),   # gold
    (236, 64, 122),   # pink
]

img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

radius = 56
# Background rounded rect with subtle gradient simulation
for i in range(radius, SIZE - radius):
    ratio = i / SIZE
    r = int(BG[0] * (1 - ratio) + BG_LIGHT[0] * ratio)
    g = int(BG[1] * (1 - ratio) + BG_LIGHT[1] * ratio)
    b = int(BG[2] * (1 - ratio) + BG_LIGHT[2] * ratio)
    draw.line([(i, radius), (i, SIZE - radius)], fill=(r, g, b, 255))

# Top and bottom rounded caps
draw.pieslice([0, 0, radius * 2, radius * 2], 180, 270, fill=BG)
draw.pieslice([SIZE - radius * 2, 0, SIZE, radius * 2], 270, 360, fill=BG_LIGHT)
draw.pieslice([0, SIZE - radius * 2, radius * 2, SIZE], 90, 180, fill=BG)
draw.pieslice([SIZE - radius * 2, SIZE - radius * 2, SIZE, SIZE], 0, 90, fill=BG_LIGHT)

# Inner accent border
draw.rounded_rectangle(
    [10, 10, SIZE - 10, SIZE - 10],
    radius=radius - 10,
    outline=(124, 166, 255, 80),
    width=3,
)

# 2x2 grid of colored squares (the "game box" motif)
grid_size = 144
cell_size = 56
gap = 12
start = (SIZE - grid_size) // 2 + 4
shadow_offset = 4

for row in range(2):
    for col in range(2):
        color = COLORS[row * 2 + col]
        x = start + col * (cell_size + gap)
        y = start + row * (cell_size + gap)

        # Soft drop shadow
        draw.rounded_rectangle(
            [x + shadow_offset, y + shadow_offset, x + cell_size + shadow_offset, y + cell_size + shadow_offset],
            radius=14,
            fill=(0, 0, 0, 60),
        )
        # Colored square
        draw.rounded_rectangle(
            [x, y, x + cell_size, y + cell_size],
            radius=14,
            fill=color,
        )
        # Top-left highlight
        draw.rounded_rectangle(
            [x + 4, y + 4, x + cell_size - 4, y + cell_size - 4],
            radius=12,
            outline=(255, 255, 255, 60),
            width=2,
        )

# Save multi-resolution ICO
sizes = [16, 32, 48, 64, 128, 256]
images = [img.resize((s, s), Image.Resampling.LANCZOS) for s in sizes]
img.save('/Users/derbysoft-i129/Documents/GitHub/pixijs-games/public/favicon.ico', format='ICO', sizes=[(s, s) for s in sizes])
print('Generated public/favicon.ico with sizes:', sizes)
