# usage: py vstack.py out.jpg in1.jpg in2.jpg ...  (stack images vertically, left-aligned)
import sys
from PIL import Image
ims = [Image.open(p).convert("RGB") for p in sys.argv[2:]]
W = max(i.width for i in ims); H = sum(i.height for i in ims)
o = Image.new("RGB", (W, H)); y = 0
for i in ims: o.paste(i, (0, y)); y += i.height
o.save(sys.argv[1], quality=90)
