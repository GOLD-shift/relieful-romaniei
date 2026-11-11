"""Construiește harta politică „oarbă” a Europei din Natural Earth 1:50m (domeniu public).
Proiecție Lambert azimutală echivalentă, centrată pe 15°E, 52°N.
Ieșire: harta-europa.js -> window.HARTA_EU = {w, h, fundal: [d], tari: [{id, n, cap, d, mic: [x, y]}]}"""
import json, math, sys

SRC, OUT = sys.argv[1], sys.argv[2]
L0, P0 = math.radians(15), math.radians(52)

def proj(lon, lat):
    l, p = math.radians(lon), math.radians(lat)
    k = math.sqrt(2 / (1 + math.sin(P0) * math.sin(p) + math.cos(P0) * math.cos(p) * math.cos(l - L0)))
    return k * math.cos(p) * math.sin(l - L0), -k * (math.cos(P0) * math.sin(p) - math.sin(P0) * math.cos(p) * math.cos(l - L0))

frame = [proj(*pt) for pt in [(-25, 64), (-10, 35), (-25, 67), (36, 33.5), (48, 57), (45, 41), (30, 71.5), (-12, 36), (14, 34.2)]]
xs, ys = [p[0] for p in frame], [p[1] for p in frame]
X0, X1, Y0, Y1 = min(xs), max(xs), min(ys), max(ys)
W = 1000.0
S = W / (X1 - X0)
H = (Y1 - Y0) * S
M = 40  # cât poate ieși un contur în afara cadrului (în unități SVG)

def to_svg(lon, lat):
    x, y = proj(lon, lat)
    return (min(max((x - X0) * S, -M), W + M), min(max((y - Y0) * S, -M), H + M))

def path(rings):
    out = []
    for ring in rings:
        pts, last = [], None
        for lon, lat in ring:
            p = to_svg(lon, lat)
            q = (round(p[0], 1), round(p[1], 1))
            if q != last:
                pts.append(q); last = q
        if len(pts) < 3:
            continue
        xs_, ys_ = [p[0] for p in pts], [p[1] for p in pts]
        if max(xs_) < -M + 1 or min(xs_) > W + M - 1 or max(ys_) < -M + 1 or min(ys_) > H + M - 1:
            continue
        out.append("M" + "L".join(f"{x:g} {y:g}" for x, y in pts) + "Z")
    return "".join(out)

def rings_of(f):
    g = f["geometry"]
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    return [r for poly in polys for r in poly]

RO = {"AL": ("Albania", "Tirana"), "AD": ("Andorra", "Andorra la Vella"), "AT": ("Austria", "Viena"), "BY": ("Belarus", "Minsk"),
      "BE": ("Belgia", "Bruxelles"), "BA": ("Bosnia și Herțegovina", "Sarajevo"), "BG": ("Bulgaria", "Sofia"), "HR": ("Croația", "Zagreb"),
      "CY": ("Cipru", "Nicosia"), "CZ": ("Cehia", "Praga"), "DK": ("Danemarca", "Copenhaga"), "EE": ("Estonia", "Tallinn"),
      "FI": ("Finlanda", "Helsinki"), "FR": ("Franța", "Paris"), "DE": ("Germania", "Berlin"), "GR": ("Grecia", "Atena"),
      "HU": ("Ungaria", "Budapesta"), "IS": ("Islanda", "Reykjavik"), "IE": ("Irlanda", "Dublin"), "IT": ("Italia", "Roma"),
      "XK": ("Kosovo", "Priștina"), "LV": ("Letonia", "Riga"), "LI": ("Liechtenstein", "Vaduz"), "LT": ("Lituania", "Vilnius"),
      "LU": ("Luxemburg", "Luxemburg"), "MT": ("Malta", "Valletta"), "MD": ("Republica Moldova", "Chișinău"), "MC": ("Monaco", "Monaco"),
      "ME": ("Muntenegru", "Podgorica"), "NL": ("Țările de Jos", "Amsterdam"), "MK": ("Macedonia de Nord", "Skopje"), "NO": ("Norvegia", "Oslo"),
      "PL": ("Polonia", "Varșovia"), "PT": ("Portugalia", "Lisabona"), "RO": ("România", "București"), "RU": ("Rusia", "Moscova"),
      "SM": ("San Marino", "San Marino"), "RS": ("Serbia", "Belgrad"), "SK": ("Slovacia", "Bratislava"), "SI": ("Slovenia", "Ljubljana"),
      "ES": ("Spania", "Madrid"), "SE": ("Suedia", "Stockholm"), "CH": ("Elveția", "Berna"), "UA": ("Ucraina", "Kiev"),
      "GB": ("Regatul Unit", "Londra"), "VA": ("Vatican", "Vatican")}
SMALL = {"AD", "LI", "MC", "SM", "VA", "MT", "LU"}

ne = json.load(open(SRC, encoding="utf-8"))
tari, fundal = [], []
for f in ne["features"]:
    pr = f["properties"]; iso = pr["ISO_A2_EH"]
    d = path(rings_of(f))
    if not d:
        continue
    if iso in RO:
        t = {"id": iso, "n": RO[iso][0], "cap": RO[iso][1], "d": d}
        if iso in SMALL:
            pts = [to_svg(lo, la) for r in rings_of(f) for lo, la in r]
            t["mic"] = [round(sum(p[0] for p in pts) / len(pts), 1), round(sum(p[1] for p in pts) / len(pts), 1)]
        tari.append(t)
    else:
        fundal.append(d)
tari.sort(key=lambda t: t["n"])
data = {"w": W, "h": round(H, 1), "fundal": fundal, "tari": tari}
with open(OUT, "w", encoding="utf-8") as fh:
    fh.write("/* Generat de unelte/harta_europa.py — nu edita de mână. Sursa: Natural Earth 1:50m (domeniu public). */\n")
    fh.write("window.HARTA_EU = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(len(tari), "tari,", len(fundal), "contururi de fundal, H =", round(H))
missing = set(RO) - {t["id"] for t in tari}
print("lipsa:", missing)
