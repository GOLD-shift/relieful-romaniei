"""Desenează contururile din harta-romania.js.json peste harta de relief, pentru verificare."""
import json, sys
from PIL import Image, ImageDraw
d = json.load(open(sys.argv[1])); im = Image.open(sys.argv[2]).convert("RGB").resize((1612, 1152))
W, H = im.size; dr = ImageDraw.Draw(im)
P = lambda p: ((p[0] - 20) / 10 * W, (48.5 - p[1]) / 5.1 * H)
for u, rings in d[sys.argv[4] if len(sys.argv) > 4 else "sub"].items():
    for r in rings:
        dr.line([P(p) for p in r] + [P(r[0])], fill=(20, 20, 20), width=3)
    if rings:
        r = max(rings, key=len); cx = sum(p[0] for p in r) / len(r); cy = sum(p[1] for p in r) / len(r)
        dr.text(P((cx, cy)), u, fill=(200, 0, 0))
im.save(sys.argv[3])
