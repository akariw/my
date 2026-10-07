"""« Le Dernier Signal » — court essai de science-fiction (~64 s), généré par code.

Usage : python3 render_sf.py [dossier_temporaire]
Produit le_dernier_signal.mp4 à côté de ce script.
"""
import numpy as np, subprocess, wave, math, random, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1280, 720, 24
DUR = 64.0
N = int(DUR * FPS)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "le_dernier_signal.mp4")
TMP = sys.argv[1] if len(sys.argv) > 1 else HERE
FD = "/usr/share/fonts/truetype/dejavu/"
font = lambda name, s: ImageFont.truetype(FD + name, s)
F_SUB = font("DejaVuSans.ttf", 30)
F_SMALL = font("DejaVuSans.ttf", 22)
F_MONO = font("DejaVuSansMono-Bold.ttf", 26)
F_MONO_S = font("DejaVuSansMono.ttf", 20)
F_BIG = font("DejaVuSans-Bold.ttf", 60)

random.seed(7)
rng = np.random.default_rng(7)

def clamp(v): return max(0.0, min(1.0, v))
def ease(t): t = clamp(t); return t * t * (3 - 2 * t)
def window(lt, a, b, f=0.5): return clamp((lt - a) / f) * clamp((b - lt) / f)
def typed(s, start, lt, cps=28): return s[:max(0, min(len(s), int((lt - start) * cps)))]

# ---------------------------------------------------------------- scènes
SCENES = [(0, 5), (5, 14), (14, 23), (23, 31), (31, 41), (41, 51), (51, 58), (58, 64)]

COCKPIT_LINES = [("> BALAYAGE LONGUE PORTÉE...", 0.6), ("> 100 % — RAS", 2.0), ("> SIGNAL INCONNU DÉTECTÉ", 3.4)]
RADAR_LINES = [("ANALYSE DU SIGNAL...", 0.5), ("FRÉQUENCE  : 1420,405 MHz", 1.6),
               ("DISTANCE   : 0,8 UA", 2.7), ("ORIGINE    : KEPLER-442b", 3.8),
               ("SIGNATURE  : HUMAINE", 5.0)]
BEACON_LINES = [("MESSAGE AUTOMATIQUE", 0.4), ("ÉMETTEUR : VAISSEAU AURORE", 1.3),
                ("ÉQUIPAGE : 1", 2.4), ("ÉMIS LE  : 14 MARS 2387", 3.0)]
SUBS = [("11 mars 2387.", 5.8, 8.8),
        ("Le vaisseau Aurore dérive aux confins du système.", 9.2, 13.6),
        ("— Ordinateur, d'où vient ce signal ?", 19.0, 22.6),
        ("— Une signature humaine... si loin d'ici ?", 28.6, 30.8),
        ("Cap sur Kepler-442b.", 32.0, 36.0),
        ("— Il y a quelqu'un ?", 47.5, 50.6),
        ("— Ce message... nous ne l'avons pas encore envoyé.", 55.6, 57.5)]

# ---------------------------------------------------------------- ressources précalculées
NS = 420
STX, STY, STZ = rng.uniform(0, W, NS), rng.uniform(0, H, NS), rng.uniform(0.15, 1, NS)
STA, STR = rng.uniform(0, 2 * np.pi, NS), rng.uniform(0, 800, NS)

def stars(d, t, speed=6.0, alpha=1.0):
    for x, y, z in zip(STX, STY, STZ):
        xx = (x - t * speed * z * 10) % W
        b = int((90 + 165 * z) * alpha * (0.85 + 0.15 * math.sin(t * 3 + x)))
        s = 1 if z < 0.7 else 2
        xi, yi = int(xx), int(y)
        d.rectangle([xi, yi, xi + s - 1, yi + s - 1], fill=(b, b, min(255, b + 20)))

def warp(d, t, v=160):
    cx, cy = W / 2, 290
    for a, r0, z in zip(STA, STR, STZ):
        r = (r0 + t * v * z) % 800
        L = 4 + r * 0.05 * z
        ca, sa = math.cos(a), math.sin(a)
        b = int(min(255, 60 + r * 0.3))
        d.line([(cx + ca * r, cy + sa * r), (cx + ca * (r + L), cy + sa * (r + L))], fill=(b, b, 255, 220), width=1)

def make_planet(D, c1, c2, freq, light=(-0.6, -0.5), atmo=(120, 200, 255), seed=0):
    S = int(D * 1.16); o = (S - D) / 2
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    nx, ny = (xx - o - D / 2) / (D / 2), (yy - o - D / 2) / (D / 2)
    r2 = nx ** 2 + ny ** 2
    nz = np.sqrt(np.clip(1 - r2, 0, 1))
    lx, ly = light; lz = math.sqrt(max(0, 1 - lx * lx - ly * ly))
    shade = np.clip(nx * lx + ny * ly + nz * lz, 0, 1) ** 0.8 * 0.95 + 0.04
    r = np.random.default_rng(seed)
    band = np.zeros_like(nx)
    for k in range(5):
        band += np.sin(ny * freq * (k + 1) * 0.7 + np.sin(nx * (2 + k) + r.uniform(0, 6)) * 0.6 + r.uniform(0, 6)) / (k + 1)
    band = (band - band.min()) / (band.max() - band.min())
    col = np.array(c1)[None, None] * (1 - band[..., None]) + np.array(c2)[None, None] * band[..., None]
    col = col * shade[..., None]
    rr = np.sqrt(r2)
    a_body = np.clip((1 - rr) * D / 2, 0, 1)
    a_atmo = np.clip(1 - (rr - 1) / 0.08, 0, 1) * (rr > 0.97) * 0.55
    rim = np.clip((rr - 0.85) / 0.15, 0, 1) * (rr <= 1) * shade * 0.9
    col = col * (1 - rim[..., None]) + np.array(atmo)[None, None] * rim[..., None]
    alpha = np.maximum(a_body, a_atmo)
    col = np.where((rr > 1)[..., None], np.array(atmo)[None, None] * np.ones_like(col), col)
    rgba = np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")

GAS = make_planet(320, (40, 110, 140), (150, 210, 200), 9, seed=1)
DESERT = make_planet(1000, (150, 70, 40), (230, 150, 90), 6, light=(-0.3, -0.7), atmo=(255, 170, 120), seed=2)

def paste_scaled(img, src, cx, cy, diam):
    """Colle src redimensionné (diamètre de planète `diam`) centré en cx,cy, en ne traitant que la partie visible."""
    scale = diam * 1.16 / src.width
    S = src.width * scale
    x0, y0 = cx - S / 2, cy - S / 2
    bx0, by0 = max(0, -x0 / scale), max(0, -y0 / scale)
    bx1, by1 = min(src.width, (W - x0) / scale), min(src.height, (H - y0) / scale)
    if bx1 <= bx0 or by1 <= by0: return
    crop = src.crop((int(bx0), int(by0), int(math.ceil(bx1)), int(math.ceil(by1))))
    dw, dh = max(1, int(crop.width * scale)), max(1, int(crop.height * scale))
    crop = crop.resize((dw, dh), Image.BILINEAR)
    img.paste(crop, (int(x0 + int(bx0) * scale), int(y0 + int(by0) * scale)), crop)

def draw_ship(d, x, y, s, t, flame_back=1.0, flame_down=0.0):
    P = lambda pts: [(x + px * s, y + py * s) for px, py in pts]
    fl = 0.8 + 0.2 * math.sin(t * 40)
    if flame_back > 0:
        for k in range(6, 0, -1):
            L = (60 + 40 * k) * flame_back * fl
            d.ellipse([x - 120 * s - L * s, y - 6 * k * s, x - 110 * s, y + 6 * k * s], fill=(120, 200, 255, 30))
        d.ellipse([x - 140 * s, y - 10 * s, x - 112 * s, y + 10 * s], fill=(230, 250, 255, 255))
    if flame_down > 0:
        for k in range(6, 0, -1):
            L = (40 + 30 * k) * flame_down * fl
            for ex in (-60, 40):
                d.ellipse([x + (ex - 5 * k) * s, y + 20 * s, x + (ex + 5 * k) * s, y + (20 + L) * s], fill=(120, 200, 255, 32))
    d.polygon(P([(130, 0), (60, -18), (-60, -22), (-110, -40), (-122, -12), (-122, 12), (-110, 40), (-60, 22), (60, 18)]), fill=(150, 160, 178))
    d.polygon(P([(130, 0), (60, 18), (-60, 22), (-110, 40), (-122, 12), (-122, 0)]), fill=(95, 102, 118))
    d.polygon(P([(-20, -22), (-90, -60), (-105, -60), (-80, -22)]), fill=(110, 118, 135))
    d.polygon(P([(95, -4), (70, -14), (40, -14), (48, -3)]), fill=(80, 220, 255))
    d.line(P([(-50, -6), (40, -6)]), fill=(255, 150, 60), width=max(1, int(2 * s)))
    blink = 255 if int(t * 2) % 2 else 60
    d.ellipse(P([(-104, -44), (-98, -38)]), fill=(255, 60, 60, blink))

# cockpit : intérieur statique avec la vitre transparente
COCKPIT = Image.new("RGBA", (W, H), (16, 20, 28, 255))
cd = ImageDraw.Draw(COCKPIT)
WIN = [(170, 90), (1110, 90), (1240, 470), (40, 470)]
cd.polygon(WIN, fill=(0, 0, 0, 0))
cd.line(WIN + [WIN[0]], fill=(60, 75, 95, 255), width=8)
cd.line([(640, 90), (640, 470)], fill=(40, 50, 64, 255), width=10)
cd.polygon([(0, 470), (W, 470), (W, H), (0, H)], fill=(24, 30, 40, 255))
cd.line([(0, 470), (W, 470)], fill=(70, 90, 110, 255), width=3)
for sx in (120, 960):
    cd.rectangle([sx, 520, sx + 200, 640], fill=(8, 22, 30, 255), outline=(50, 120, 140, 255), width=2)
# pilote vu de dos
cd.ellipse([470, 500, 810, 820], fill=(9, 11, 15, 255))
cd.ellipse([575, 360, 705, 500], fill=(12, 14, 19, 255))
cd.arc([575, 360, 705, 500], 200, 330, fill=(70, 160, 190, 255), width=3)
LEDS = [(x, y, rng.uniform(0.5, 3), rng.integers(0, 3)) for x in range(360, 920, 28) for y in (560, 600, 640)]

# surface : ciel, montagnes, poussière
yy = np.linspace(0, 1, H)[:, None, None]
SKY = (np.array([30, 16, 54]) * (1 - yy ** 1.4) + np.array([245, 140, 80]) * yy ** 1.4) * np.ones((H, W, 3))
SKY_IMG = Image.fromarray(SKY.astype(np.uint8))
def ridge(base, amp, seed, step=8):
    r = np.random.default_rng(seed); xs = np.arange(-300, W + 300, step)
    h = np.zeros(len(xs)); v = 0
    for i in range(len(xs)): v = 0.85 * v + r.normal(0, 1); h[i] = v
    h = h / np.abs(h).max()
    h += sum(np.sin(xs * f + r.uniform(0, 6)) * a for f, a in ((0.004, 1.0), (0.011, 0.5)))
    return xs, base - h * amp
RIDGES = [(ridge(430, 70, 11), (125, 62, 88), 3), (ridge(500, 55, 12), (75, 36, 58), 8), (ridge(565, 18, 13), (36, 20, 30), 16)]
DUST = [(rng.uniform(-1, 1), rng.uniform(0.2, 1), rng.uniform(10, 30)) for _ in range(120)]

# titre avec halo
TITLE = Image.new("RGBA", (W, H), (0, 0, 0, 0))
td = ImageDraw.Draw(TITLE)
txt = "LE DERNIER SIGNAL"; sp = 14
tw = sum(td.textlength(c, font=F_BIG) + sp for c in txt) - sp
x = (W - tw) / 2
for c in txt:
    td.text((x, H / 2 - 60), c, font=F_BIG, fill=(170, 235, 255, 255)); x += td.textlength(c, font=F_BIG) + sp
GLOW = TITLE.filter(ImageFilter.GaussianBlur(14))

yy2, xx2 = np.mgrid[0:H, 0:W]
VIG = (1 - 0.5 * (((xx2 - W / 2) / (W / 2)) ** 2 + ((yy2 - H / 2) / (H / 2)) ** 2) / 2)[..., None].clip(0.35, 1).astype(np.float32)

def subtitle(d, t):
    for s, a, b in SUBS:
        al = window(t, a, b, 0.4)
        if al > 0:
            bw = d.textlength(s, font=F_SUB)
            d.text(((W - bw) / 2, H - 135), s, font=F_SUB, fill=(240, 238, 228, int(255 * al)),
                   stroke_width=2, stroke_fill=(0, 0, 0, int(220 * al)))

def title_card(img, d, lt, alpha):
    if alpha <= 0: return
    a = np.asarray(GLOW).copy(); a[..., 3] = (a[..., 3] * alpha * 0.9).astype(np.uint8)
    g = Image.fromarray(a); img.paste(g, (0, 0), g)
    a = np.asarray(TITLE).copy(); a[..., 3] = (a[..., 3] * alpha).astype(np.uint8)
    g = Image.fromarray(a); img.paste(g, (0, 0), g)

# ---------------------------------------------------------------- image par image
def frame(i):
    t = i / FPS
    img = Image.new("RGB", (W, H)); d = ImageDraw.Draw(img, "RGBA")
    si = next(k for k, (a, b) in enumerate(SCENES) if a <= t < b) if t < DUR else len(SCENES) - 1
    s0, s1 = SCENES[si]; lt = t - s0
    fade = clamp(lt / 0.4) * clamp((s1 - s0 - lt) / 0.4)
    glitch = 0.0; shake = (0, 0); red = 0

    if si == 0:  # titre
        stars(d, t, 2)
        title_card(img, d, lt, window(lt, 0.5, 4.6, 1.2))
        al = window(lt, 1.5, 4.6, 0.8)
        s = "un court essai de science-fiction"; bw = d.textlength(s, font=F_SMALL)
        if al > 0: d.text(((W - bw) / 2, H / 2 + 30), s, font=F_SMALL, fill=(150, 170, 190, int(220 * al)))

    elif si == 1:  # l'espace, le vaisseau passe
        stars(d, t, 3)
        cx, cy = 960, 250
        ring = [cx - 300, cy - 55, cx + 300, cy + 55]
        d.arc(ring, 180, 360, fill=(170, 200, 190, 150), width=10)
        paste_scaled(img, GAS, cx, cy, 320)
        d = ImageDraw.Draw(img, "RGBA")
        d.arc(ring, 0, 180, fill=(190, 220, 210, 190), width=10)
        p = ease((lt - 0.8) / 7.6)
        draw_ship(d, -300 + p * (W + 600), 450 + 15 * math.sin(lt * 0.8), 1.25, t)

    elif si == 2:  # cockpit
        warp(d, t, 90)
        img.paste(COCKPIT, (0, 0), COCKPIT); d = ImageDraw.Draw(img, "RGBA")
        for x, y, f, c in LEDS:
            on = math.sin(t * f * 3 + x) > 0
            col = [(80, 220, 255), (255, 170, 60), (120, 255, 140)][c]
            d.ellipse([x, y, x + 10, y + 10], fill=col + ((230 if on else 40),))
        for k in range(8):
            h = 20 + 70 * abs(math.sin(t * 2 + k))
            d.rectangle([135 + k * 23, 630 - h, 150 + k * 23, 630], fill=(60, 200, 230, 170))
        alarm = lt > 3.4
        for k, (s, st) in enumerate(COCKPIT_LINES):
            col = (255, 80, 80) if (alarm and k == 2) else (110, 230, 255)
            if k == 2 and alarm and int(t * 4) % 2 == 0 and lt > 4.3: continue
            d.text((230, 120 + k * 36), typed(s, st, lt), font=F_MONO, fill=col + (230,))
        if alarm: red = 0.25 + 0.25 * math.sin(t * 12)

    elif si == 3:  # radar
        img.paste((3, 14, 18), [0, 0, W, H])
        cx, cy, R = 400, 360, 250
        for k in range(1, 5): d.ellipse([cx - R * k / 4, cy - R * k / 4, cx + R * k / 4, cy + R * k / 4], outline=(40, 180, 160, 120), width=2)
        d.line([(cx - R, cy), (cx + R, cy)], fill=(40, 180, 160, 90)); d.line([(cx, cy - R), (cx, cy + R)], fill=(40, 180, 160, 90))
        sweep = math.degrees(lt * 2.2) % 360
        for k in range(30):
            d.pieslice([cx - R, cy - R, cx + R, cy + R], sweep - (k + 1) * 2.5, sweep - k * 2.5 + 0.5, fill=(60, 255, 200, int(70 * (1 - k / 30))))
        bdeg = 300; diff = (sweep - bdeg) % 360
        b = math.exp(-diff / 80)
        bx, by = cx + 150 * math.cos(math.radians(bdeg)), cy + 150 * math.sin(math.radians(bdeg))
        for k in range(4, 0, -1):
            r = 4 + k * 5 * b
            d.ellipse([bx - r, by - r, bx + r, by + r], fill=(255, 200, 80, int(255 * b / k)))
        for k, (s, st) in enumerate(RADAR_LINES):
            col = (255, 190, 80) if k == 4 else (120, 240, 210)
            if k == 4 and lt > 5.8 and int(t * 3) % 2 == 0: continue
            d.text((740, 130 + k * 42), typed(s, st, lt), font=F_MONO, fill=col + (235,))
        d.rectangle([740, 470, 1220, 600], outline=(40, 180, 160, 160), width=2)
        amp = clamp((lt - 0.5) / 2)
        pts = [(740 + x, 535 + amp * 45 * math.sin(x * 0.06 - t * 9) * math.sin(x * 0.011 + t) * (0.7 + 0.3 * math.sin(x * 0.3 + t * 30))) for x in range(0, 481, 3)]
        d.line(pts, fill=(255, 200, 90, 230), width=2)
        d.text((745, 476), "FORME D'ONDE", font=F_MONO_S, fill=(120, 240, 210, 160))

    elif si == 4:  # approche de la planète
        stars(d, t, 1.5, alpha=clamp(1 - lt / 9))
        diam = 150 * math.exp(0.29 * lt)
        paste_scaled(img, DESERT, W / 2, 360 + 0.4 * diam, diam)
        d = ImageDraw.Draw(img, "RGBA")
        heat = clamp((lt - 6.3) / 3)
        if heat > 0:
            shake = (int(rng.integers(-6, 7) * heat), int(rng.integers(-6, 7) * heat))
            for k in range(40):
                y = rng.uniform(0, H); x = rng.uniform(0, W)
                d.line([(x, y), (x - 120 * heat, y - 60 * heat)], fill=(255, 180, 90, int(160 * heat)), width=2)
            ov = np.zeros((H, W, 4), np.uint8)
            g = (np.linspace(0, 1, H) ** 1.5)[:, None] * 200 * heat
            ov[..., 0], ov[..., 1], ov[..., 2], ov[..., 3] = 255, 120, 40, g.astype(np.uint8)
            o = Image.fromarray(ov, "RGBA"); img.paste(o, (0, 0), o)

    elif si == 5:  # surface
        img.paste(SKY_IMG)
        for (sx, sy, r, col) in ((880, 440, 80, (255, 170, 90)), (1060, 380, 26, (255, 245, 230))):
            for k in range(8, 0, -1):
                rr = r * (1 + k * 0.5); d.ellipse([sx - rr, sy - rr, sx + rr, sy + rr], fill=col + (14,))
            d.ellipse([sx - r, sy - r, sx + r, sy + r], fill=col)
        for (xs, ys), col, par in RIDGES:
            off = -lt * par
            d.polygon([(x + off, y) for x, y in zip(xs, ys)] + [(W + 300, H), (-300, H)], fill=col)
        d.rectangle([0, 575, W, H], fill=(36, 20, 30))
        # balise
        bx = 990
        d.polygon([(bx - 26, 580), (bx + 26, 580), (bx + 10, 300), (bx - 10, 300)], fill=(20, 14, 22))
        pulse = (lt * 0.85) % 1
        gl = 0.5 + 0.5 * math.cos(pulse * 2 * math.pi)
        for k in range(6, 0, -1):
            r = 8 + k * 9 * gl; d.ellipse([bx - r, 296 - r, bx + r, 296 + r], fill=(90, 230, 255, 26))
        d.ellipse([bx - 7, 289, bx + 7, 303], fill=(200, 250, 255))
        rr = pulse * 260
        d.ellipse([bx - rr, 585 - rr * 0.12, bx + rr, 585 + rr * 0.12], outline=(90, 230, 255, int(150 * (1 - pulse))), width=2)
        # atterrissage
        p = ease(lt / 5.2)
        sy = -120 + p * (535 + 120)
        down = 1.0 if lt < 5.4 else clamp(1 - (lt - 5.4) / 0.6)
        if lt > 3.2:
            for (dx, sp, sz) in DUST:
                age = lt - 3.2; r = sz + age * 12 * sp
                x = 380 + dx * age * 140 * sp; y = 575 - sp * age * 25
                d.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=(170, 110, 90, int(70 * clamp(1 - age / 6))))
        draw_ship(d, 380, sy, 0.9, t, flame_back=0, flame_down=down)

    elif si == 6:  # gros plan sur la balise
        a = np.linspace(40, 18, H)[:, None, None] * np.ones((H, W, 3)) * np.array([1, 1, 1.15])
        img.paste(Image.fromarray(a.clip(0, 255).astype(np.uint8))); d = ImageDraw.Draw(img, "RGBA")
        for x in (250, 1030):
            for y in (110, 560): d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=(70, 70, 82))
        d.rectangle([280, 130, 1000, 540], fill=(4, 16, 22), outline=(80, 210, 240), width=3)
        for k in range(6): d.rectangle([280 - k * 3, 130 - k * 3, 1000 + k * 3, 540 + k * 3], outline=(80, 210, 240, 24 - k * 4), width=3)
        for k, (s, st) in enumerate(BEACON_LINES):
            d.text((330, 175 + k * 52), typed(s, st, lt), font=F_MONO, fill=(130, 235, 255, 240))
        if lt > 4.2 and int(t * 3) % 2 == 0:
            s = "( DANS 3 JOURS )"; d.text((330, 175 + 4 * 52 + 14), s, font=F_MONO, fill=(255, 90, 80, 250))
        if lt > 5.6: glitch = clamp((lt - 5.6) / 1.2)
        if lt > 6.5:
            d.rectangle([0, 0, W, H], fill=(255, 255, 255, int(255 * clamp((lt - 6.5) / 0.35))))
            fade = 1.0

    else:  # fin
        stars(d, t, 1, alpha=clamp(lt / 2) * 0.6)
        al = window(lt, 0.4, 2.6, 0.5)
        s = "À SUIVRE..."; bw = d.textlength(s, font=F_SUB)
        if al > 0: d.text(((W - bw) / 2, H / 2 - 20), s, font=F_SUB, fill=(200, 210, 220, int(255 * al)))
        title_card(img, d, lt, window(lt, 2.9, 5.6, 0.6))

    subtitle(d, t)

    arr = np.asarray(img).astype(np.float32)
    if shake != (0, 0): arr = np.roll(arr, shake, axis=(0, 1))
    if red > 0: arr[..., 0] += 45 * red; arr[..., 1:] *= 1 - 0.15 * red
    if glitch > 0:
        for _ in range(int(3 + 12 * glitch)):
            y = int(rng.integers(0, H - 40)); h = int(rng.integers(4, 40))
            arr[y:y + h] = np.roll(arr[y:y + h], int(rng.integers(-80, 80) * glitch), axis=1)
        arr[..., 0] = np.roll(arr[..., 0], int(8 * glitch), axis=1)
    arr += rng.integers(-6, 7, (H, W, 1)).astype(np.float32)
    arr = arr * VIG * fade
    arr = arr.clip(0, 255).astype(np.uint8)
    arr[:70] = 0; arr[-70:] = 0
    return arr

# ---------------------------------------------------------------- son
SR = 44100; n = int(DUR * SR); tt = np.arange(n) / SR
mix = np.zeros(n)
def seg(a, b, f=0.6): return np.clip(np.minimum((tt - a) / f, (b - tt) / f), 0, 1)
CHORDS = [(110, 164.8, 220, 261.6), (87.3, 130.8, 174.6, 220), (146.8, 174.6, 220, 293.7), (82.4, 123.5, 196, 246.9),
          (130.8, 196, 261.6, 329.6), (110, 164.8, 220, 277.2), (116.5, 174.6, 233.1, 277.2), (110, 164.8, 220, 329.6)]
for (a, b), ch in zip(SCENES, CHORDS):
    e = seg(a - 0.3, b + 0.3, 1.0) * (0.85 + 0.15 * np.sin(tt * 0.7))
    for f in ch:
        mix += e * 0.035 * (np.sin(2 * np.pi * f * tt) + np.sin(2 * np.pi * f * 1.004 * tt) + 0.3 * np.sin(4 * np.pi * f * tt))
def lowpass(x, k): return np.convolve(x, np.ones(k) / k, "same")
noise = rng.standard_normal(n)
def blip(t0, f, dur, amp, decay=None):
    i0 = int(t0 * SR); m = min(int(dur * SR), n - i0)
    if m <= 0: return
    tl = np.arange(m) / SR
    env = np.exp(-tl * (decay or 5 / dur))
    mix[i0:i0 + m] += amp * env * np.sin(2 * np.pi * f * tl)
# passage du vaisseau
mix += lowpass(noise, 120) * 9 * np.exp(-((tt - 9.3) / 1.6) ** 2)
mix += np.sin(2 * np.pi * 45 * tt) * 0.25 * np.exp(-((tt - 9.3) / 1.8) ** 2)
# cockpit : ronronnement + bips de frappe + alarme
mix += np.sin(2 * np.pi * 58 * tt) * 0.08 * seg(14, 23, 0.4)
for lines, s0 in ((COCKPIT_LINES, 14), (RADAR_LINES, 23), (BEACON_LINES, 51)):
    for s, st in lines:
        for k, c in enumerate(s):
            if c != " ": blip(s0 + st + k / 28, 1800 + 300 * (k % 3), 0.03, 0.05)
al = (tt > 17.4) & (tt < 22.6)
mix += al * 0.07 * np.sign(np.sin(2 * np.pi * np.where((tt * 4).astype(int) % 2, 880, 660) * tt))
# radar : ping quand le balayage passe sur le point
prev = None
for k in range(int(8 * 240)):
    lt = k / 240; sw = math.degrees(lt * 2.2) % 360
    if prev is not None and prev < 300 <= sw: blip(23 + lt, 1320, 0.9, 0.16, decay=6)
    prev = sw
# entrée atmosphérique
heat = np.clip((tt - 37.3) / 3.5, 0, 1) * (tt < 41)
mix += lowpass(noise, 40) * 5 * heat + np.sin(2 * np.pi * 38 * tt) * 0.3 * heat
# surface : vent, propulseurs, balise
mix += lowpass(noise, 400) * 6 * seg(41, 51, 1.0)
mix += lowpass(noise, 25) * 2.2 * np.clip(1 - np.abs(tt - 44) / 2.6, 0, 1) * (tt > 41) * (tt < 47)
for k in range(12):
    t0 = 41 + k / 0.85
    if t0 < 51: blip(t0, 330, 0.8, 0.12)
# glitch, flash et impact
gl = (tt > 56.6) & (tt < 57.6)
mix += gl * 0.15 * np.sign(np.sin(2 * np.pi * (300 + 900 * (np.floor(tt * 30) % 7) / 7) * tt))
i0 = int(57.55 * SR); m = n - i0; tl = np.arange(m) / SR
mix[i0:] += 0.9 * np.exp(-tl * 1.5) * np.sin(2 * np.pi * (30 + 90 * np.exp(-tl * 3)) * tl) + lowpass(noise[i0:], 30) * 4 * np.exp(-tl * 4)
mix *= np.clip((DUR - tt) / 1.5, 0, 1)
mix = mix / np.abs(mix).max() * 0.85
apath = os.path.join(TMP, "audio_sf.wav")
with wave.open(apath, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())

# ---------------------------------------------------------------- encodage
if __name__ == "__main__":
    if "--stills" in sys.argv:
        for s in (3, 10, 18, 27, 36, 46, 54.5, 61):
            Image.fromarray(frame(int(s * FPS))).save(os.path.join(TMP, f"sf_{s}.png"))
        sys.exit()
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-i", apath, "-c:v", "libx264", "-preset", "slow", "-crf", "24",
                          "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", OUT], stdin=subprocess.PIPE)
    for i in range(N): p.stdin.write(frame(i).tobytes())
    p.stdin.close(); p.wait()
    print("ok", OUT)
