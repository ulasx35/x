"""Contact sheet of review stills: python3 scripts/sheet.py 0.5,1.8,... out.png [cols]"""
import sys
from PIL import Image, ImageDraw
ts = [float(x) for x in sys.argv[1].split(',')]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
w, h = 216, 384
rows = -(-len(ts) // cols)
sheet = Image.new('RGB', (cols * w, rows * (h + 22)), (20, 20, 24))
d = ImageDraw.Draw(sheet)
for k, t in enumerate(ts):
    im = Image.open(f'output/stills/t_{t:.2f}.png').convert('RGB').resize((w, h), Image.LANCZOS)
    x, y = (k % cols) * w, (k // cols) * (h + 22)
    sheet.paste(im, (x, y + 22)); d.text((x + 6, y + 4), f'{t:.2f}s', fill=(230, 230, 240))
sheet.save(sys.argv[2])
