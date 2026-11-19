# Key-frame board: one still per beat with its line underneath.
# usage: py -3.13 board.py <stilldir> out.png "sec|line" "sec|line" ...   (stills from snap.sh: <stilldir>/t<sec>.png)
# (The animated-video template's board.py asked for a macOS font path and silently fell back to
#  PIL's tiny bitmap font on Windows; this one tries Windows Arial first.)
import os, sys, textwrap
from PIL import Image, ImageDraw, ImageFont
d0, items = sys.argv[1], [a.split('|', 1) for a in sys.argv[3:]]
w0, h0 = Image.open(f'{d0}/t{items[0][0]}.png').size
W, cols, TH = 360, 5, 120
H = round(W * h0 / w0)
rows = (len(items) + cols - 1) // cols
sheet = Image.new('RGB', (cols * W, rows * (H + TH)), (18, 18, 20))
font = None
for cand in ('arial.ttf', os.path.join(os.environ.get('WINDIR', ''), 'Fonts', 'arial.ttf'), '/System/Library/Fonts/Supplemental/Arial.ttf', 'DejaVuSans.ttf'):
    try: font = ImageFont.truetype(cand, 19); break
    except Exception: pass
if font is None: font = ImageFont.load_default(size=19)
for i, (sec, line) in enumerate(items):
    x, y = (i % cols) * W, (i // cols) * (H + TH)
    sheet.paste(Image.open(f'{d0}/t{sec}.png').convert('RGB').resize((W, H)), (x, y))
    d = ImageDraw.Draw(sheet)
    d.text((x + 10, y + H + 8), f'{i + 1}  ·  {float(sec):.1f}s', fill=(150, 150, 150), font=font)
    for j, l in enumerate(textwrap.wrap(line, 34)[:4]):
        d.text((x + 10, y + H + 34 + j * 22), l, fill=(230, 230, 230), font=font)
sheet.save(sys.argv[2])
