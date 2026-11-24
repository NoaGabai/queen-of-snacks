"""World 2 - Pickle Swamp ("ביצת החמוצים"), brine-swamp mode with jar moments. Screen 1 of 4, 480x270, 3/4 top-down.
Mai walks on mud banks, plank boardwalks, a floating jar lid and a floating pickle log; the brine itself is not walkable.

Outputs (./world2/):
  ground.png   flat layer: brine, mud banks, boardwalks, the floating lid + log, ripples, paw prints
  walk.png     1-bit walk mask (white = Mai's feet may stand here)
  obj_<id>.png standing objects, drawn back-to-front by foot line
  veg_cucumber_map.png, veg_olive_map.png, bag_move.png, bag_coin.png, fog.png
  layout.json
"""
import json, math, os, random
import numpy as np
from PIL import Image, ImageDraw
from world1 import W, H, OL, hx, R, new, outline, bag

OUT = 'world2'
os.makedirs(OUT, exist_ok=True)

# ---- palette: world 2 (art-bible 3.5)
BRINE  = R('A9D2B4', '6FA48C', '497C6C', '2D5550')   # murky olive-turquoise water
TEAL   = R('B8EDE4', '7FD3C8', '4FB3A9', '2F8580')   # accent: glints, jar glow
MUD    = R('A7A566', '84843F', '5F6D33', '3E4A24')   # olive mud banks
BOARD  = R('D9C69C', 'B29C6E', '86714A', '584830')   # weathered boardwalk
DILL   = R('D6EC98', '9CC456', '66923A', '3E6326')   # feathery dill reeds
UMBEL  = R('FFF2A0', 'F2D652', 'C9A93A')              # dill flower heads
PICKLE = R('C4D274', '8CA544', '5E7A2E', '3A4E1C')   # pickles: bumpy skin
GLASS  = R('F2FBF6', 'C9E8DE', '93C6BA', '5E948C')   # jar glass
GOLD   = R('FFE58A', 'E8B730', 'A07C26', '6E5214')   # jar lids
PEPPER = R('A6745A', '6E4632', '4A2C1E', '2C1A12')   # peppercorns
OLIVE  = R('7FA043', '41601E', '2C4414', '1A2A0C')   # Syrian olive: dark green, a bit battered
BRUISE = R('7A6A36', '5A4A26')                        # bruised / wrinkled patches
FOAM   = hx('DCEBD6')


# =============================================================== WALK AREAS (foot coordinates)
BANKS = [  # mud islands (cx, cy, rx, ry)
    (50, 246, 96, 42),      # A entrance bank (south-west)
    (292, 206, 62, 28),     # B centre island
    (304, 74, 66, 26),      # C north island (coin bag in the dill)
]
WALKS = [  # boardwalks (x0, y0, x1, y1); planks run across the walking direction
    (118, 214, 238, 230, 'h'),   # A -> B
    (284, 96, 300, 184, 'v'),    # B -> C
    (292, 0, 308, 56, 'v'),      # C -> north exit (screen 3)
    (348, 196, 480, 212, 'h'),   # B -> east exit (screen 2)
    (246, 124, 286, 136, 'h'),   # spur to Lizzy's floating lid
    (404, 212, 416, 246, 'v'),   # spur down onto the pickle log
]
LID = (222, 130, 26, 15)         # floating gold jar lid (cx, cy, rx, ry)
LOG = (380, 240, 444, 254)       # floating pickle log, walkable on top


def blob_mask(cx, cy, rx, ry, seed):
    """Ellipse with a gently wobbly rim (pixel mask)."""
    rnd = random.Random(seed)
    ph = [rnd.random() * 6 for _ in range(3)]
    yy, xx = np.mgrid[0:H, 0:W]
    ang = np.arctan2((yy - cy) / ry, (xx - cx) / rx)
    wob = 1 + .07 * np.sin(3 * ang + ph[0]) + .05 * np.sin(5 * ang + ph[1]) + .03 * np.sin(9 * ang + ph[2])
    return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 < wob ** 2


def edge_of(m):
    e = np.zeros_like(m)
    e[1:] |= m[1:] & ~m[:-1]; e[:-1] |= m[:-1] & ~m[1:]; e[:, 1:] |= m[:, 1:] & ~m[:, :-1]; e[:, :-1] |= m[:, :-1] & ~m[:, 1:]
    return e


def shift(m, dy=0, dx=0):
    o = np.zeros_like(m)
    ys = slice(max(dy, 0), H + min(dy, 0)); yd = slice(max(-dy, 0), H + min(-dy, 0))
    xs = slice(max(dx, 0), W + min(dx, 0)); xd = slice(max(-dx, 0), W + min(-dx, 0))
    o[ys, xs] = m[yd, xd]; return o


# =============================================================== GROUND
def swamp_ground(banks, walks, lids=(), logs=(), slices=(), sprigs=(), paws=(), seed=21):
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:H, 0:W]
    a = np.zeros((H, W, 4), np.uint8); a[:] = BRINE[1]
    # deep murky patches + lighter drifting streaks (quiet, low contrast)
    blot = np.sin(xx / 41.0 + 1) * np.cos(yy / 23.0) + np.sin((xx - yy) / 61.0)
    a[blot > 1.0] = hx('64987F'); a[blot < -1.15] = hx('5A8C78')
    sp = rng.random((H, W)); a[sp > .992] = BRINE[2]

    land = np.zeros((H, W), bool)
    for i, (cx, cy, rx, ry) in enumerate(banks): land |= blob_mask(cx, cy, rx, ry, seed + 9 + i)
    walk_boards = np.zeros((H, W), bool)
    for x0, y0, x1, y1, _ in walks: walk_boards[max(0,y0):y1, max(0,x0):x1] = True
    lid = np.zeros((H, W), bool)
    for LID in lids: lid |= ((xx - LID[0]) / LID[2]) ** 2 + ((yy - LID[1]) / LID[3]) ** 2 < 1
    log = np.zeros((H, W), bool)
    for LOG in logs:
        lg = np.zeros((H, W), bool); lg[LOG[1]:LOG[3], LOG[0]:LOG[2]] = True
        log |= lg & (((xx - (LOG[0] + LOG[2]) / 2) / ((LOG[2] - LOG[0]) / 2)) ** 8 + ((yy - (LOG[1] + LOG[3]) / 2) / ((LOG[3] - LOG[1]) / 2)) ** 2 < 1)

    # water shading: darker band just south of everything that floats or stands (reflection / depth)
    solid = land | walk_boards | lid | log
    for k, col in ((4, BRINE[2]), (2, BRINE[3])):
        sh = np.zeros_like(solid)
        for d in range(1, k + 1): sh |= shift(solid, d, 0)
        a[sh & ~solid] = col if k == 2 else a[sh & ~solid]
        if k == 4: a[sh & ~solid & (sp > .3)] = BRINE[2]
    # foam lip around banks
    ring = np.zeros_like(land)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1)): ring |= shift(land, dy, dx)
    a[ring & ~land & (sp > .35)] = FOAM

    # mud banks
    a[land] = MUD[1]
    mblot = np.sin(xx / 9.0) * np.cos(yy / 7.0) + np.sin((xx + 2 * yy) / 13.0)
    a[land & (mblot > 1.1)] = MUD[0]; a[land & (mblot < -1.2)] = MUD[2]
    inner = land & shift(land, 2, 0) & shift(land, -2, 0)
    a[land & ~inner] = MUD[2]; a[edge_of(land)] = MUD[3]
    a[land & (sp < .02)] = MUD[2]; a[land & (sp > .985)] = MUD[0]

    # floating pickle log (flat, walkable)
    a[log] = PICKLE[1]
    top = np.zeros((H, W), bool); bot = np.zeros((H, W), bool); mid = np.zeros((H, W), bool)
    for LOG in logs: top[LOG[1]:LOG[1] + 4] = True; bot[LOG[3] - 4:LOG[3]] = True; mid[LOG[1] + 2:LOG[3] - 3] = True
    a[log & top] = PICKLE[0]; a[log & bot & ~top] = PICKLE[2]
    bumps = log & ((xx * 7 + yy * 3) % 11 == 0) & mid
    a[bumps] = PICKLE[0]; a[shift(bumps, 1, 0) & log] = PICKLE[2]
    a[edge_of(log)] = PICKLE[3]

    # floating jar lid (gold, flat disc with ridged rim)
    for LID in lids:
        one = ((xx - LID[0]) / LID[2]) ** 2 + ((yy - LID[1]) / LID[3]) ** 2 < 1
        a[one] = GOLD[1]
        rim = one & (((xx - LID[0]) / (LID[2] - 3)) ** 2 + ((yy - LID[1]) / (LID[3] - 2)) ** 2 > 1)
        a[rim & (xx % 3 == 0)] = GOLD[2]
        a[one & (((xx - LID[0] + 7) / 9) ** 2 + ((yy - LID[1] + 4) / 4) ** 2 < 1)] = GOLD[0]
        a[one & (yy > LID[1] + LID[3] - 3)] = GOLD[2]
        a[edge_of(one)] = GOLD[3]

    # boardwalks: planks + gaps + nails + posts
    for x0, y0, x1, y1, o in walks:
        x0, y0 = max(0, x0), max(0, y0)
        m = np.zeros((H, W), bool); m[y0:y1, x0:x1] = True
        a[m] = BOARD[1]
        if o == 'h':     # walking east-west: planks are vertical strips 4px wide
            for x in range(x0, x1):
                if (x - x0) % 5 == 4: a[y0:y1, x] = BOARD[3]
                elif (x - x0) % 5 == 0: a[y0:y1, x] = BOARD[0]
            a[y1 - 2:y1, x0:x1] = BOARD[2]; a[y1 - 1, x0:x1] = BOARD[3]
            for x in range(x0 + 2, x1, 15): a[y0 + 2, x] = BOARD[3]; a[y1 - 4, x] = BOARD[3]
        else:            # walking north-south: planks are horizontal strips
            for y in range(y0, y1):
                if (y - y0) % 4 == 3: a[y, x0:x1] = BOARD[3]
                elif (y - y0) % 4 == 0: a[y, x0:x1] = BOARD[0]
            a[y0:y1, x1 - 2:x1] = BOARD[2]; a[y0:y1, x1 - 1] = BOARD[3]; a[y0:y1, x0] = BOARD[2]
        # weathered planks: a few missing-colour boards
        r = random.Random(x0 * 7 + y0)
        for _ in range(3):
            if o == 'h':
                px = x0 + 5 * r.randrange(max(1, (x1 - x0) // 5)) + 1; a[y0:y1 - 2, px:px + 3] = BOARD[2]
            else:
                py = y0 + 4 * r.randrange(max(1, (y1 - y0) // 4)) + 1; a[py:py + 3, x0 + 1:x1 - 2] = BOARD[2]
    im = Image.fromarray(a); d = ImageDraw.Draw(im)
    # posts poking out of the water beside the boardwalks
    for x0, y0, x1, y1, o in walks:
        pts = ([(x, y1) for x in range(x0 + 8, x1 - 4, 30)] if o == 'h' else [(x1, y) for y in range(y0 + 10, y1 - 4, 26)])
        for px, py in pts:
            if land[min(H - 1, py + 1), min(W - 1, px)]: continue
            d.rectangle((px - 1, py - 3, px + 2, py + 2), fill=BOARD[2]); d.line((px - 1, py - 3, px + 2, py - 3), fill=BOARD[0])
            d.line((px - 3, py + 3, px + 4, py + 3), fill=BRINE[0])

    # ripples on the open brine
    rr = random.Random(seed)
    for _ in range(46):
        x, y = rr.randrange(8, W - 8), rr.randrange(8, H - 6)
        if solid[max(0, y - 4):y + 5, max(0, x - 8):x + 9].any(): continue
        ln = rr.choice((4, 6, 8)); d.line((x, y, x + ln, y), fill=BRINE[0]); d.line((x + 2, y + 1, x + ln - 2, y + 1), fill=BRINE[2])
    # floating cucumber slices + dill sprigs on the water
    for cx, cy in slices:
        if solid[max(0, cy - 4):cy + 5, max(0, cx - 6):cx + 7].any(): continue
        d.ellipse((cx - 5, cy - 3, cx + 5, cy + 3), fill=PICKLE[2]); d.ellipse((cx - 4, cy - 3, cx + 4, cy + 2), fill=hx('DDE8A8'))
        d.point((cx - 1, cy - 1), PICKLE[1]); d.point((cx + 1, cy), PICKLE[1]); d.point((cx, cy - 2), PICKLE[1])
    for cx, cy in sprigs:
        if solid[max(0, cy - 3):cy + 4, max(0, cx - 5):cx + 6].any(): continue
        d.line((cx, cy, cx + 5, cy - 2), fill=DILL[2])
        for k in range(3): d.point((cx + 1 + k * 2, cy - 1 - k // 2), DILL[1])
    for x, y in paws:
        c = BOARD[3] if walk_boards[y, x] else MUD[3]; d.ellipse((x, y, x + 2, y + 2), fill=c)
        for dx, dy in ((-1, -2), (1, -3), (3, -2)): d.point((x + dx, y + dy), c)

    walk = land | walk_boards | lid | log
    # keep the feet a pixel away from the water's edge
    pad = np.pad(walk, 2, mode='edge')     # erode without eating the screen edges (exits)
    walk = walk & pad[2:-2, 4:] & pad[2:-2, :-4] & pad[:-4, 2:-2]
    return im, walk


def ground():
    return swamp_ground(BANKS, WALKS, [LID], [LOG], slices=((168, 168), (196, 104), (402, 140), (452, 80), (120, 150), (70, 140)),
                        sprigs=((140, 190), (240, 168), (360, 120), (90, 120)), paws=((432, 204), (442, 202), (452, 205), (462, 202), (472, 205)), seed=21)


# =============================================================== OBJECTS
def dill_reeds(n=4, h=110, seed=0, spread=9):
    """Tall feathery dill: thin stalks, wispy fronds, yellow umbrella flower heads."""
    rnd = random.Random(seed)
    w = spread * (n - 1) + 40
    im = new(w, h + 4); d = ImageDraw.Draw(im)
    stalks = sorted([(20 + i * spread + rnd.randint(-2, 2), int(h * (.6 + rnd.random() * .4)), rnd.randint(-6, 6)) for i in range(n)], key=lambda s: -s[1])
    for bx, hh, lean in stalks:
        base = h; top = base - hh; tx = bx + lean
        for y in range(top, base):
            t = (y - top) / max(1, hh); x = round(tx + (bx - tx) * t)
            d.point((x, y), DILL[2]); d.point((x + 1, y), DILL[3] if t > .5 else DILL[2])
        # fronds: little feathery fans along the lower 2/3
        for k in range(rnd.randint(3, 5)):
            fy = top + int(hh * rnd.uniform(.3, .85)); t = (fy - top) / hh; fx = round(tx + (bx - tx) * t)
            side = rnd.choice((-1, 1)); ln = 6 + rnd.randint(0, 8)
            for j in range(ln):
                px, py = fx + side * j, fy - j // 3 + (j * j) // 14
                d.point((px, py), DILL[2] if j < 3 else DILL[1])
                if j > 2 and j % 2 == 1:   # needle-like leaflets fanning out
                    d.point((px, py - 1 - (j % 4 == 1)), DILL[1]); d.point((px + side, py + 1), DILL[0] if j > ln - 4 else DILL[1])
        # umbel on top: spokes + yellow dots
        for k in range(7):
            ang = math.pi + k / 6 * math.pi; ex, ey = tx + 8 * math.cos(ang), top - 2 + 3 * math.sin(ang)
            d.line((tx, top + 2, ex, ey), fill=DILL[2])
            d.ellipse((ex - 1.5, ey - 1.5, ex + 1.5, ey + 1), fill=UMBEL[1]); d.point((round(ex - 1), round(ey - 1)), UMBEL[0])
        d.point((tx, top + 1), UMBEL[2])
    # muddy clump at the base
    d.ellipse((6, h - 6, w - 6, h + 3), fill=MUD[2]); d.ellipse((10, h - 6, w - 10, h), fill=MUD[1])
    return outline(im)


def giant_pickle(w=72, seed=0, flip=False):
    """A giant pickle lying half-sunk in the brine (like a log): curved, bumpy, wet waterline."""
    rnd = random.Random(seed); h = int(w * .22)
    im = new(w + 8, h + 8); d = ImageDraw.Draw(im); ox, oy = 4, 3
    for x in range(w):
        t = x / (w - 1); prof = max(0, 1 - abs(2 * t - 1) ** 3.5) ** .5; top = oy + h * (1 - prof * .95) + .8 * math.sin(t * 7 + seed)
        bot = oy + h
        if bot - top < 2: continue
        d.line((ox + x, round(top), ox + x, bot), fill=PICKLE[1])
        d.line((ox + x, round(top), ox + x, round(top) + 2), fill=PICKLE[0])
        d.line((ox + x, bot - 4, ox + x, bot), fill=PICKLE[2])
    for _ in range(int(w * .8)):
        x = rnd.randint(4, w - 5); t = x / (w - 1); top = oy + h * (1 - max(0, 1 - abs(2 * t - 1) ** 3.5) ** .5 * .95)
        if int(top) + 3 > oy + h - 4: continue
        y = rnd.randint(int(top) + 3, oy + h - 4)
        d.point((ox + x, y), PICKLE[0]); d.point((ox + x + 1, y), PICKLE[0]); d.point((ox + x, y + 1), PICKLE[3]); d.point((ox + x + 1, y + 1), PICKLE[2])
    d.line((ox + w * .2, oy + 3, ox + w * .55, oy + 2), fill=hx('DCE7A0')); d.line((ox + w * .25, oy + 4, ox + w * .4, oy + 4), fill=PICKLE[0])
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im = outline(im); d = ImageDraw.Draw(im)
    d.line((0, oy + h + 1, im.width - 1, oy + h + 1), fill=BRINE[2]); d.line((1, oy + h, im.width - 2, oy + h), fill=FOAM)
    for x in range(2, im.width - 2, 5): d.point((x, oy + h - 1), BRINE[0])
    return im


def jar(h=70, seed=0, sunk=.35, pickles=3, lid_off=False):
    """Giant pickle jar half-sunk in the brine: glass, brine inside, pickles, gold lid."""
    rnd = random.Random(seed)
    w = int(h * .62); im = new(w + 10, h + 8); d = ImageDraw.Draw(im); ox = 5
    body = (ox, 8, ox + w, h)
    d.rounded_rectangle(body, radius=6, fill=GLASS[2])
    d.rounded_rectangle((ox + 2, 12, ox + w - 2, h - 2), radius=5, fill=hx('A6D2BC'))   # brine inside
    for k in range(pickles):     # pickles floating inside
        px = ox + 6 + k * (w - 12) // max(1, pickles - 1 if pickles > 1 else 1) + rnd.randint(-2, 2); py = 20 + rnd.randint(0, h - 40)
        d.rounded_rectangle((px - 4, py, px + 4, py + 20), radius=4, fill=PICKLE[1]); d.line((px - 3, py + 3, px - 3, py + 16), fill=PICKLE[0])
        for j in range(3): d.point((px + 1, py + 5 + j * 5), PICKLE[3])
    for k in range(4):           # peppercorns + a dill sprig in the brine
        d.point((ox + 5 + rnd.randint(0, w - 10), h - 6 - rnd.randint(0, 6)), PEPPER[2])
    d.line((ox + w - 8, 16, ox + w - 12, 34), fill=DILL[2])
    # glass shine
    d.line((ox + 3, 14, ox + 3, h - 8), fill=GLASS[0]); d.line((ox + 5, 16, ox + 5, h * .55), fill=GLASS[1]); d.line((ox + w - 3, 14, ox + w - 3, h - 6), fill=GLASS[3])
    # neck + gold lid
    if not lid_off:
        d.rectangle((ox + 3, 5, ox + w - 3, 11), fill=GOLD[2])
        for x in range(ox + 4, ox + w - 3, 3): d.line((x, 6, x, 11), fill=GOLD[3])
        d.ellipse((ox + 3, 0, ox + w - 3, 9), fill=GOLD[1]); d.ellipse((ox + 7, 1, ox + w * .55, 5), fill=GOLD[0])
    im = outline(im); d = ImageDraw.Draw(im)
    # sink it: water covers the lower part (murky overlay) + ripple
    sy = int(h - h * sunk)
    over = new(im.width, im.height); od = ImageDraw.Draw(over); od.rectangle((0, sy, im.width, im.height), fill=(73, 124, 108, 150))
    a = np.array(im); m = a[:, :, 3] > 0; ov = np.array(over)
    a[m & (ov[:, :, 3] > 0)] = (a[m & (ov[:, :, 3] > 0)] * .3 + np.array([73, 124, 108, 255]) * .7).astype(np.uint8)
    im = Image.fromarray(a); d = ImageDraw.Draw(im)
    d.line((0, sy, im.width, sy), fill=BRINE[0]); d.line((2, sy + 1, im.width - 3, sy + 1), fill=FOAM)
    return im


def jar_sign():
    im = new(32, 36); d = ImageDraw.Draw(im)
    d.rectangle((14, 14, 17, 35), fill=BOARD[2]); d.line((14, 14, 14, 35), fill=BOARD[1])
    d.rectangle((1, 2, 30, 17), fill=BOARD[1]); d.rectangle((1, 2, 30, 4), fill=BOARD[0]); d.line((1, 17, 30, 17), fill=BOARD[3])
    # pictogram: a tiny jar with a pickle
    d.rectangle((11, 7, 19, 15), fill=GLASS[1]); d.rectangle((11, 5, 19, 7), fill=GOLD[1]); d.rectangle((14, 9, 16, 14), fill=PICKLE[1])
    d.polygon([(23, 9), (27, 10), (23, 12)], fill=BOARD[3])
    # a little dill tied to the post
    d.line((18, 24, 22, 20), fill=DILL[2]); d.point((22, 19), UMBEL[1]); d.point((21, 19), UMBEL[1])
    return outline(im)


def peppercorn_pile(n=9, seed=0):
    rnd = random.Random(seed); im = new(30, 18); d = ImageDraw.Draw(im)
    for _ in range(n):
        x, y = rnd.randint(4, 24), rnd.randint(6, 13)
        d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=PEPPER[1]); d.point((x - 1, y - 1), PEPPER[0]); d.point((x + 1, y + 1), PEPPER[3])
    return outline(im)


def lily_cuke(seed=0):
    """A big cucumber slice floating like a lily pad, with a tiny dill 'flower'."""
    im = new(26, 14); d = ImageDraw.Draw(im)
    d.ellipse((1, 2, 24, 13), fill=PICKLE[2]); d.ellipse((2, 1, 23, 11), fill=hx('DDE8A8')); d.ellipse((5, 3, 20, 9), fill=hx('C9DC8E'))
    for k in range(6):
        ang = k / 6 * math.tau; d.point((round(12 + 4 * math.cos(ang)), round(6 + 2 * math.sin(ang))), hx('EFF6CF'))
    return outline(im)


def lizzy_lid():
    """Lizzy asleep on a little cushion of dill on her floating lid."""
    im = new(34, 18); d = ImageDraw.Draw(im)
    d.ellipse((2, 7, 32, 17), fill=DILL[2]); d.ellipse((4, 6, 30, 14), fill=DILL[1])
    for k in range(7): x = 5 + k * 4; d.line((x, 8, x + 2, 5), fill=DILL[0])
    liz = Image.open('kitchen/lizzy_sleep_map.png'); im.alpha_composite(liz, (8, 2))
    return outline(im)


def map_cucumber():
    im = new(12, 24); d = ImageDraw.Draw(im)
    d.rounded_rectangle((2, 2, 9, 22), radius=4, fill=PICKLE[1]); d.line((3, 5, 3, 19), fill=PICKLE[0]); d.line((8, 5, 8, 20), fill=PICKLE[2])
    for y in (6, 13, 18): d.point((5, y), PICKLE[3])
    d.point((4, 9), hx('FFFFFF')); d.point((7, 9), hx('FFFFFF')); d.point((4, 10), hx('2A1A10')); d.point((7, 10), hx('2A1A10'))
    d.line((3, 8, 4, 8), fill=hx('2A1A10')); d.line((7, 8, 8, 8), fill=hx('2A1A10')); d.line((4, 13, 7, 13), fill=PICKLE[3])
    d.point((6, 1), DILL[2])
    return outline(im)


def map_olive():
    """Syrian olive: dark green, oval, a bit wrinkled and bruised, slightly lopsided, with a stub of stem."""
    im = new(14, 17); d = ImageDraw.Draw(im)
    d.ellipse((1, 2, 12, 16), fill=OLIVE[1])                     # body, taller than wide
    d.ellipse((2, 3, 6, 8), fill=OLIVE[0])                       # soft top-left shine
    d.point((3, 4), hx('D6E89A')); d.point((4, 4), hx('A8C462'))
    d.arc((1, 2, 12, 16), 0, 180, fill=OLIVE[2]); d.arc((2, 3, 12, 16), 20, 150, fill=OLIVE[3])
    d.point((11, 7), OLIVE[2]); d.point((11, 8), OLIVE[2])       # flattened, dented right side
    d.line((2, 12, 4, 13), fill=BRUISE[0]); d.point((3, 11), BRUISE[1])          # bruise
    d.line((9, 3, 10, 5), fill=OLIVE[2]); d.line((10, 12, 11, 14), fill=OLIVE[2])  # wrinkles
    d.point((8, 14), BRUISE[0]); d.point((9, 15), BRUISE[1])
    d.line((6, 0, 7, 2), fill=hx('6E5A34')); d.point((7, 0), hx('8A7448'))      # stem stub
    # face: tired, grumpy
    d.point((4, 8), hx('FFFFFF')); d.point((8, 8), hx('FFFFFF')); d.point((4, 9), hx('1E2410')); d.point((8, 9), hx('1E2410'))
    d.line((3, 6, 5, 7), fill=hx('1E2410')); d.line((7, 7, 9, 6), fill=hx('1E2410'))
    d.line((4, 12, 7, 12), fill=OLIVE[3]); d.point((8, 11), OLIVE[3])
    return outline(im)


def fog_puff(w=150, h=60, seed=0):
    """Soft fog patch (dithered edge). Drawn in the prototype at low alpha, drifting."""
    rnd = random.Random(seed); m = Image.new('L', (w, h), 0); d = ImageDraw.Draw(m)
    for _ in range(9):
        cx, cy = rnd.uniform(.2, .8) * w, rnd.uniform(.35, .65) * h; rx, ry = rnd.uniform(.15, .3) * w, rnd.uniform(.25, .4) * h
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
    a = np.array(m) > 0
    core = a & shift_any(a, 5)
    yy, xx = np.mgrid[0:h, 0:w]; dith = ((xx + yy) % 2 == 0)
    out = np.zeros((h, w, 4), np.uint8)
    out[a & ~core & dith] = (236, 244, 236, 255); out[core] = (236, 244, 236, 255)
    return Image.fromarray(out)


def shift_any(m, k):
    o = m.copy()
    for d in range(1, k + 1):
        o &= np.roll(m, d, 0) & np.roll(m, -d, 0) & np.roll(m, d, 1) & np.roll(m, -d, 1)
    return o


# =============================================================== BUILD
OBJS = []
def add(oid, img, fx, fy, block=None):
    OBJS.append(dict(id=oid, img=img, x=int(fx - img.width / 2), y=int(fy - img.height), foot=fy, block=block))


if __name__ == '__main__':
    g, walk = ground()
    # dill reeds: the "big plants" of the swamp (on bank edges and standing in the brine)
    for i, (x, fy, n, h) in enumerate(((246, 274, 3, 84), (24, 196, 3, 104), (396, 100, 4, 120), (250, 70, 3, 96),
                                        (470, 268, 3, 112), (180, 204, 3, 76), (452, 176, 3, 100))):
        img = dill_reeds(n, h, seed=40 + i)
        add(f'dill{i}', img, x, fy, block=(x - img.width / 2 + 8, fy - 8, x + img.width / 2 - 8, fy + 2))
    # giant pickles standing in the brine + half-sunk jars
    add('pickle0', giant_pickle(84, 1), 104, 128)
    add('pickle1', giant_pickle(60, 2, flip=True), 404, 150)
    add('pickle2', giant_pickle(46, 3), 326, 266)
    add('jar0', jar(78, 1, sunk=.38, pickles=3), 40, 92)
    add('jar1', jar(58, 2, sunk=.45, pickles=2), 168, 66)
    add('jar2', jar(50, 3, sunk=.5, pickles=2), 446, 46)
    add('lily0', lily_cuke(0), 70, 172); add('lily1', lily_cuke(1), 214, 252); add('lily2', lily_cuke(2), 456, 236)
    add('sign', jar_sign(), 30, 236, block=(22, 228, 40, 236))
    add('lizzylid', lizzy_lid(), LID[0], LID[1] + 4, block=(LID[0] - 13, LID[1] - 3, LID[0] + 11, LID[1] + 4))
    # the coin bag hides among dill on island C, a short dill clump stands in front of it
    add('dillhide', dill_reeds(3, 44, seed=77, spread=6), 356, 92, block=(340, 84, 372, 92))
    for k, im in (('bag_move', bag('7A4FB8', '4E2E8A', 'star')), ('bag_coin', bag('E8B730', 'A07C26', 'coin')),
                  ('veg_cucumber_map', map_cucumber()), ('veg_olive_map', map_olive()), ('fog', fog_puff(150, 60, 3))):
        im.save(f'{OUT}/{k}.png')
    g.save(f'{OUT}/ground.png')
    Image.fromarray((walk * 255).astype(np.uint8)).save(f'{OUT}/walk.png')
    objs = []
    for o in OBJS:
        o['img'].save(f"{OUT}/obj_{o['id']}.png")
        objs.append(dict(id=o['id'], x=o['x'], y=o['y'], foot=o['foot'], w=o['img'].width, h=o['img'].height,
                         block=[round(v) for v in o['block']] if o['block'] else None))
    layout = dict(size=[W, H], objects=objs,
                  bags={'move': dict(x=430, foot=248, float=True, at=[418, 250]), 'coin': dict(x=334, foot=88, at=[334, 96])},
                  veggies=[dict(kind='cucumber', x=176, foot=224, range=[146, 214, 214, 230]),
                           dict(kind='olive', x=296, foot=212, range=[262, 200, 328, 220])],
                  lizzy=dict(x=LID[0], foot=LID[1] + 4, at=[250, 130]), sign=dict(x=30, foot=236),
                  exits={'east': [470, 192, 480, 214], 'north': [290, 0, 310, 10], 'south': [0, 262, 90, 270]},
                  start=dict(x=40, y=258), paw_prints=[426, 194, 464, 210])
    json.dump(layout, open(f'{OUT}/layout.json', 'w'), indent=1)
    # preview
    prev = g.copy()
    mai = Image.open('kitchen/mai_walk.png').crop((0, 108, 24, 144))
    items = [(o['foot'], o['img'], o['x'], o['y']) for o in OBJS]
    items += [(226, mai, 140 - 12, 226 - 36), (248, Image.open(f'{OUT}/bag_move.png'), 430 - 7, 248 - 17 - 4),
              (88, Image.open(f'{OUT}/bag_coin.png'), 334 - 7, 88 - 17),
              (224, map_cucumber(), 176 - 6, 224 - 24), (212, map_olive(), 296 - 7, 212 - 17)]
    for foot, img, x, y in sorted(items, key=lambda t: t[0]): prev.alpha_composite(img, (int(x), int(y)))
    fog = Image.open(f'{OUT}/fog.png'); fa = np.array(fog); fa[:, :, 3] = (fa[:, :, 3] * .28).astype(np.uint8)
    fog = Image.fromarray(fa); prev.alpha_composite(fog, (60, 110)); prev.alpha_composite(fog, (300, 20))
    prev.save(f'{OUT}/preview.png'); prev.resize((W * 3, H * 3), Image.NEAREST).save('w2_preview_x3.png')
    wm = Image.fromarray((walk * 255).astype(np.uint8)).convert('RGBA'); wm.putalpha(90)
    chk = g.copy(); chk.alpha_composite(Image.new('RGBA', (W, H), (255, 0, 0, 0))); chk.alpha_composite(wm)
    chk.resize((W * 2, H * 2), Image.NEAREST).save('w2_walk_check.png')
    print('ok', len(OBJS))
