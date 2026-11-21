"""Tile QA stills into labelled contact sheets: python sheet.py <stills dir> <out prefix> [cols] [per_sheet] [width]"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

src, prefix = Path(sys.argv[1]), sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
per = int(sys.argv[4]) if len(sys.argv) > 4 else 20
cw = int(sys.argv[5]) if len(sys.argv) > 5 else 270
files = sorted(src.glob('t*.jpg'), key=lambda p: float(p.stem[1:])) + sorted(src.glob('t*.png'), key=lambda p: float(p.stem[1:]))
font = ImageFont.truetype('arial.ttf', 20)
for n in range(0, len(files), per):
    chunk = files[n:n + per]
    ims = [Image.open(f).convert('RGB') for f in chunk]
    ch = int(cw * ims[0].height / ims[0].width)
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cw, rows * (ch + 26)), (30, 30, 30))
    d = ImageDraw.Draw(sheet)
    for i, (f, im) in enumerate(zip(chunk, ims)):
        x, y = (i % cols) * cw, (i // cols) * (ch + 26)
        sheet.paste(im.resize((cw, ch)), (x, y + 26))
        d.text((x + 6, y + 2), f.stem[1:] + 's', fill=(255, 220, 90), font=font)
    out = f'{prefix}_{n // per + 1}.jpg'
    sheet.save(out, quality=88)
    print(out)
