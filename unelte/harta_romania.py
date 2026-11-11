"""Construiește harta „oarbă” a unităților și subunităților de relief ale României.

Rulare:  python unelte/harta_romania.py date-brute harta-romania.js
Intrări:
  date-brute/ne_10m_admin_0_countries.geojson   granițe (Natural Earth, domeniu public)
  date-brute/ne_10m_rivers*.geojson             râuri (Natural Earth, domeniu public)
  date-brute/dem-z7/*.png                       altitudini (dale Terrarium/Mapzen, zoom 7)
  unelte/subunitati.json                        lista subunităților + contururi aproximative
Ieșire: harta-romania.js -> window.HARTA_RO = {granita, vecini, rauri, sub, unitati, mari}
  sub:     inelele fiecărei subunități (37)
  unitati: inelele unităților din caiet (data.js), compuse din subunități
  mari:    inelele marilor unități (13)
Metoda: pixelii primesc subunitatea din conturul aproximativ (sau cea mai apropiată), apoi
marginea munților se mută după altitudine, iar câmpiile se despart pe râuri."""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw

BR, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
LON0, LON1, LAT0, LAT1 = 20.0, 30.0, 43.4, 48.5
RES = 0.0125
NX, NY = int(round((LON1 - LON0) / RES)), int(round((LAT1 - LAT0) / RES))

def to_px(lon, lat):
    return ((lon - LON0) / RES, (LAT1 - lat) / RES)

def raster(rings, scale=1):
    img = Image.new("L", (NX * scale, NY * scale), 0)
    d = ImageDraw.Draw(img)
    for ring in rings:
        d.polygon([(x * scale, y * scale) for x, y in (to_px(*p) for p in ring)], fill=1)
    a = np.array(img, dtype=np.float32)
    if scale > 1:
        a = a.reshape(NY, scale, NX, scale).mean(axis=(1, 3))
    return a

def lines_raster(lines, width=2):
    img = Image.new("L", (NX, NY), 0)
    d = ImageDraw.Draw(img)
    for ln in lines:
        d.line([to_px(*p) for p in ln], fill=1, width=width)
    return np.array(img) > 0

# ---------- granițe ----------
ne = json.load(open(f"{BR}/ne_10m_admin_0_countries.geojson", encoding="utf-8"))
def rings_of(f):
    g = f["geometry"]
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    return [poly[0] for poly in polys]
ro = next(f for f in ne["features"] if f["properties"]["ADMIN"] == "Romania")
mask = raster(rings_of(ro), 4) >= 0.5

# ---------- râuri ----------
def river_lines(prefixes):
    out = []
    for fn in ("ne_10m_rivers.geojson", "ne_10m_rivers_europe.geojson"):
        for ft in json.load(open(f"{BR}/{fn}", encoding="utf-8"))["features"]:
            nm = str(ft["properties"].get("name") or "")
            if not any(nm.startswith(p) for p in prefixes):
                continue
            g = ft["geometry"]
            for ln in (g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]):
                if any(LON0 - 1 < lo < LON1 + 1 and LAT0 - 1 < la < LAT1 + 1 for lo, la in ln):
                    out.append(ln)
    return out

# ---------- altitudini ----------
Z, TX0, TY0 = 7, 71, 44
tiles = np.zeros((3 * 256, 4 * 256), dtype=np.float32)
for i, tx in enumerate(range(71, 75)):
    for j, ty in enumerate(range(44, 47)):
        a = np.array(Image.open(f"{BR}/dem-z7/{tx}_{ty}.png").convert("RGB"), dtype=np.float32)
        tiles[j*256:(j+1)*256, i*256:(i+1)*256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
lons = LON0 + (np.arange(NX) + 0.5) * RES
lats = LAT1 - (np.arange(NY) + 0.5) * RES
n = 2 ** Z * 256
px = ((lons + 180) / 360 * n - TX0 * 256).astype(int)
latr = np.radians(lats)
py = ((1 - np.log(np.tan(latr) + 1 / np.cos(latr)) / math.pi) / 2 * n - TY0 * 256).astype(int)
elev = tiles[np.clip(py, 0, tiles.shape[0]-1)][:, np.clip(px, 0, tiles.shape[1]-1)]

# ---------- semințe ----------
cfg = json.load(open(os.path.join(HERE, "subunitati.json"), encoding="utf-8"))
subs = cfg["sub"]
ids = [s["id"] for s in subs]
idx = {s: i + 1 for i, s in enumerate(ids)}
MOUNT = {s["id"] for s in subs if s["mare"] in ("CO", "CM", "CC")}
WEST_MT = {s["id"] for s in subs if s["mare"] == "CC"}
lab = np.zeros((NY, NX), dtype=np.int16)
for s in sorted(subs, key=lambda s: s["ordine"]):
    if s["seed"]:
        lab[raster([s["seed"]], 2) >= 0.5] = idx[s["id"]]
lab[~mask] = 0
seedlab = lab.copy()

SH = ((0, 1), (0, -1), (1, 0), (-1, 0))
def spread(lab, allowed, steps=400):
    lab = lab.copy()
    for _ in range(steps):
        empty = allowed & (lab == 0)
        if not empty.any():
            break
        for dy, dx in SH:
            sh = np.roll(np.roll(lab, dy, 0), dx, 1)
            take = empty & (sh > 0) & (lab == 0)
            lab[take] = sh[take]
    return lab

def nearest_of(lab, keep, steps=40):
    return spread(np.where(np.isin(lab, [idx[i] for i in keep]), lab, 0), mask, steps)

def dist_to(lab, keep, steps=40):
    src = np.isin(lab, [idx[i] for i in keep])
    d = np.full(lab.shape, 999, dtype=np.int16); d[src] = 0
    cur = src.copy()
    for k in range(1, steps + 1):
        nxt = cur.copy()
        for dy, dx in SH:
            nxt |= np.roll(np.roll(cur, dy, 0), dx, 1)
        d[nxt & (d == 999)] = k
        cur = nxt
    return d

lab = spread(lab, mask)

# 1) marginea munților după altitudine
NONM = [i for i in ids if i not in MOUNT]
for _ in range(8):
    near_m = nearest_of(lab, MOUNT); near_n = nearest_of(lab, NONM)
    dm = dist_to(lab, MOUNT, 20); dn = dist_to(lab, NONM, 12)
    is_m = np.isin(lab, [idx[i] for i in MOUNT]); west = np.isin(lab, [idx[i] for i in WEST_MT])
    up = (~is_m) & mask & (elev >= 850) & (dm <= 20) & (near_m > 0) & ~np.isin(lab, [idx["pm"]])
    down = is_m & (elev < np.where(west, 380, 560)) & (dn <= 10) & (near_n > 0)
    lab[up] = near_m[up]; lab[down] = near_n[down]

# 2) contactul câmpie – deal/podiș după altitudine
def swap(lowland, upland, lo, hi, reach=14):
    global lab
    near_l = nearest_of(lab, lowland); near_u = nearest_of(lab, upland)
    dl = dist_to(lab, lowland, reach); du = dist_to(lab, upland, reach)
    is_l = np.isin(lab, [idx[i] for i in lowland]); is_u = np.isin(lab, [idx[i] for i in upland])
    a = is_u & (elev < lo) & (dl <= reach) & (near_l > 0)
    b = is_l & (elev > hi) & (du <= reach) & (near_u > 0)
    lab[a] = near_l[a]; lab[b] = near_u[b]
CV = [s for s in ids if s.startswith("cv-")]; DV = [s for s in ids if s.startswith("dv-")]
CR = [s for s in ids if s.startswith("cr-")]
for _ in range(2):
    swap(CV, DV, 140, 200)
    swap(CR, ["pg", "sc-g", "sc-c", "pmd-b"], 170, 280)

# 3) netezire (filtru de majoritate 7x7)
def box(a, r):
    c = np.cumsum(np.cumsum(np.pad(a, ((r + 1, r), (r + 1, r))), 0), 1)
    return c[2*r+1:, 2*r+1:] - c[:-2*r-1, 2*r+1:] - c[2*r+1:, :-2*r-1] + c[:-2*r-1, :-2*r-1]
def majority(lab, r=3, times=3):
    for _ in range(times):
        best = np.zeros(lab.shape, dtype=np.float32); bl = lab.copy()
        for k in range(1, len(ids) + 1):
            s = box((lab == k).astype(np.float32), r)
            better = s > best
            best[better] = s[better]; bl[better] = k
        lab = np.where(mask, bl, 0)
    return spread(np.where(mask, lab, 0), mask)
lab = majority(lab)

# 4) câmpiile se despart pe râuri: zonele dintre râuri iau subunitatea majoritară din semințe
def components(m):
    comp = np.zeros(m.shape, dtype=np.int32); c = 0
    H, W = m.shape
    for y0, x0 in zip(*np.nonzero(m)):
        if comp[y0, x0]:
            continue
        c += 1; stack = [(y0, x0)]; comp[y0, x0] = c
        while stack:
            y, x = stack.pop()
            for dy, dx in SH:
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not comp[yy, xx]:
                    comp[yy, xx] = c; stack.append((yy, xx))
    return comp, c
for cut in cfg["rauri_taieturi"]:
    # râul e o barieră: semințele se întind doar pe partea lor de râu
    grp = [idx[i] for i in cut["grup"]]
    gm = np.isin(lab, grp)
    riv = lines_raster(river_lines(cut["rauri"]), 2)
    free = gm & ~riv
    g = np.where(free & np.isin(seedlab, grp), seedlab, 0)
    g = spread(g, free)
    lab[gm] = 0
    lab[free & (g > 0)] = g[free & (g > 0)]
    lab = spread(lab, mask)

# Dealurile și depresiunile peri-transilvane: marginea Depresiunii Transilvaniei, lângă munți
DTI = [i for i in ids if i.startswith("dt-") and i != "dt-per"]
band = np.isin(lab, [idx[i] for i in DTI]) & (dist_to(lab, MOUNT, 9) <= 8)
lab[band] = idx["dt-per"]

# fiecare subunitate păstrează doar bucata ei principală; restul trec la vecini
for k in range(1, len(ids) + 1):
    comp, nc = components(lab == k)
    if nc > 1:
        sizes = np.bincount(comp.ravel())[1:]
        keep = int(np.argmax(sizes)) + 1
        lab[(comp > 0) & (comp != keep)] = 0
lab = spread(lab, mask)

# ---------- vectorizare (marching squares) ----------
def contours(m):
    f = np.pad(box(m.astype(np.float32), 1) / 9.0, 1)
    def interp(a, b, pa, pb):
        t = (0.5 - a) / (b - a) if b != a else 0.5
        return (round(pa[0] + t * (pb[0] - pa[0]), 3), round(pa[1] + t * (pb[1] - pa[1]), 3))
    ys, xs = np.nonzero((f[:-1, :-1] > .5) | (f[1:, :-1] > .5) | (f[:-1, 1:] > .5) | (f[1:, 1:] > .5))
    out = []
    for y, x in zip(ys, xs):
        tl, tr, br, bl_ = f[y, x], f[y, x+1], f[y+1, x+1], f[y+1, x]
        c = (tl > .5) * 8 + (tr > .5) * 4 + (br > .5) * 2 + (bl_ > .5)
        if c in (0, 15):
            continue
        T = interp(tl, tr, (x, y), (x+1, y)); R = interp(tr, br, (x+1, y), (x+1, y+1))
        B = interp(bl_, br, (x, y+1), (x+1, y+1)); L = interp(tl, bl_, (x, y), (x, y+1))
        table = {1: [(L, B)], 2: [(B, R)], 3: [(L, R)], 4: [(T, R)], 5: [(L, T), (B, R)], 6: [(T, B)], 7: [(L, T)],
                 8: [(T, L)], 9: [(T, B)], 10: [(T, R), (B, L)], 11: [(T, R)], 12: [(R, L)], 13: [(R, B)], 14: [(B, L)]}
        out += table[c]
    adj = {}
    for a, b in out:
        if a != b:
            adj.setdefault(a, []).append(b); adj.setdefault(b, []).append(a)
    rings, used = [], set()
    for a, b in out:
        if a == b or frozenset((a, b)) in used:
            continue
        used.add(frozenset((a, b))); ring = [a, b]; cur = b
        while True:
            cands = [p for p in adj.get(cur, []) if frozenset((cur, p)) not in used]
            if not cands:
                break
            p = cands[0]; used.add(frozenset((cur, p))); ring.append(p); cur = p
            if cur == a:
                break
        if len(ring) > 8:
            rings.append([(x - 1, y - 1) for x, y in ring])
    return rings

def simplify(pts, tol):
    if len(pts) < 4:
        return pts
    a, b = np.array(pts[0]), np.array(pts[-1]); ab = b - a; L = math.hypot(*ab)
    P = np.array(pts)
    d = np.abs(ab[0] * (P[:, 1] - a[1]) - ab[1] * (P[:, 0] - a[0])) / L if L > 0 else np.hypot(*(P - a).T)
    i = int(np.argmax(d))
    if d[i] > tol:
        return simplify(pts[:i+1], tol)[:-1] + simplify(pts[i:], tol)
    return [pts[0], pts[-1]]

def to_ll(ring):
    return [[round(LON0 + x * RES, 3), round(LAT1 - y * RES, 3)] for x, y in ring]

def vec(m, tol=0.6, min_area=25):
    res = []
    for r in contours(m):
        s = simplify(r[: len(r)//2 + 1], tol)[:-1] + simplify(r[len(r)//2:], tol)
        area = abs(sum(x0*y1 - x1*y0 for (x0, y0), (x1, y1) in zip(s, s[1:] + s[:1]))) / 2
        if area >= min_area:
            res.append(to_ll(s))
    return res

def group_mask(keys, field):
    return np.isin(lab, [idx[s["id"]] for s in subs if s[field] in keys])

sub_out = {s: vec(lab == idx[s]) for s in ids}
lectii = sorted({s["lectie"] for s in subs})
unit_out = {u: vec(group_mask([u], "lectie")) for u in lectii}
mari_out = {m["id"]: vec(group_mask([m["id"]], "mare")) for m in cfg["mari"]}
granita = vec(mask, 0.5, 4)

vec_names = {"Hungary": "Ungaria", "Ukraine": "Ucraina", "Moldova": "R. Moldova", "Bulgaria": "Bulgaria", "Republic of Serbia": "Serbia"}
vecini = []
for f in ne["features"]:
    nm = f["properties"]["ADMIN"]
    if nm in vec_names:
        rs = []
        for ring in rings_of(f):
            if any(LON0 - 3 < lo < LON1 + 3 and LAT0 - 3 < la < LAT1 + 3 for lo, la in ring):
                step = max(1, len(ring) // 1500)
                rs.append([[round(lo, 3), round(la, 3)] for lo, la in ring[::step]])
        vecini.append({"n": vec_names[nm], "rings": rs})

def simp_line(ln, tol=0.004):
    pts = [tuple(p[:2]) for p in ln]
    return [[round(x, 3), round(y, 3)] for x, y in simplify(pts, tol)] if len(pts) > 3 else [[round(x, 3), round(y, 3)] for x, y in pts]
rauri = [simp_line(ln) for ln in river_lines(cfg["rauri_desen"])]
rauri = [ln for ln in rauri if any(LON0 < lo < LON1 and LAT0 < la < LAT1 for lo, la in ln)]

def label_point(m):
    """Punctul cel mai „din interior” al zonei (unde se pune eticheta)."""
    cur = m.copy(); last = m
    while cur.any():
        last = cur
        nxt = cur.copy()
        for dy, dx in SH:
            nxt &= np.roll(np.roll(cur, dy, 0), dx, 1)
        cur = nxt
    ys, xs = np.nonzero(last)
    k = len(ys) // 2
    return [round(LON0 + (xs[k] + 0.5) * RES, 3), round(LAT1 - (ys[k] + 0.5) * RES, 3)]
puncte = {s: label_point(lab == idx[s]) for s in ids}
puncte.update({m["id"]: label_point(group_mask([m["id"]], "mare")) for m in cfg["mari"]})
meta = {"sub": [{k: s[k] for k in ("id", "n", "scurt", "mare", "lectie")} for s in subs], "mari": cfg["mari"]}
data = {"meta": meta, "puncte": puncte, "granita": granita, "vecini": vecini, "rauri": rauri, "sub": sub_out, "unitati": unit_out, "mari": mari_out}
json.dump(data, open(f"{BR}/harta-romania.json", "w"))
with open(OUT, "w", encoding="utf-8") as fh:
    fh.write("/* Generat de unelte/harta_romania.py din unelte/subunitati.json, nu edita de mână. "
             "Surse: Natural Earth (granițe, râuri), altitudini Mapzen Terrarium. */\n")
    fh.write("window.HARTA_RO = " + json.dumps(data, separators=(",", ":")) + ";\n")
print("subunitati:", {s: int((lab == idx[s]).sum()) for s in ids})
print("rauri:", len(rauri))
