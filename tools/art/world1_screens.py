"""World 1 screens 2-4 (the map is 2x2 screens):
   S3 (NW)  Roni's hidden picnic   |  S4 (NE)  Lizzy 2 + the onion gate (boss)
   S1 (SW)  entrance + Lizzy 1     |  S2 (SE)  tomato orchard + secret pocket (pouch)
מקור: assets/world1_screens.py משיחת העיצוב (ללא שינוי בציור; הוסרו קובצי התצוגה המקדימה).
Main path: S1 -> east -> S2 -> north -> S4 gate.  Side path: S1 -> north -> S3 (dead end, Roni).
Output: world1/s2, world1/s3, world1/s4 (same files as screen 1).
"""
import json, math, os, random
import numpy as np
from PIL import Image, ImageDraw
from world1 import (W, H, OL, hx, R, SOIL, PATH, CROUTON, LETTUCE, ROMAINE, ONION, BULB, CUKE_S, CUKE_F, DRESS, RADISH,
                    TOMATO, CARROT, WOOD, new, outline, catmull, lettuce, onion_cluster, tomato_bush, carrot_tops,
                    radish_patch, crouton, lizzy_nest, bag)

PARSLEY = R('8FD05A', '5AA83A', '377C2A', '22521C')
GOLD = R('FFE58A', 'E8B730', 'A07C26', '6E5214')


# ------------------------------------------------------------------ ground
def ground(paths, ponds=(), cukes=(), paws=(), flowers=(), clearings=(), blanket=None, seed=3):
    rng = np.random.default_rng(seed)
    a = np.zeros((H, W, 4), np.uint8); a[:] = SOIL[1]
    yy, xx = np.mgrid[0:H, 0:W]
    blot = np.sin((xx + seed * 40) / 37.0) * np.cos((yy + seed * 17) / 29.0) + np.sin((xx + yy) / 53.0)
    a[blot > .9] = hx('A47A54'); a[blot < -1.1] = hx('84603F')
    sp = rng.random((H, W)); a[sp > .985] = SOIL[2]; a[sp < .006] = SOIL[0]
    pm = np.zeros((H, W), bool)
    for pts, width in paths:
        m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
        for x, y in catmull(pts): d.ellipse((x - width, y - width * .62, x + width, y + width * .62), fill=255)
        pm |= np.array(m) > 0
    for cx, cy, rx, ry in clearings:
        pm |= ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 < 1
    edge = np.zeros_like(pm); edge[1:] |= pm[:-1] & ~pm[1:]; edge[:-1] |= pm[1:] & ~pm[:-1]; edge[:, 1:] |= pm[:, :-1] & ~pm[:, 1:]; edge[:, :-1] |= pm[:, 1:] & ~pm[:, :-1]
    a[pm] = PATH[1]; inner = pm.copy(); inner[2:] &= pm[:-2]; inner[:-2] &= pm[2:]
    a[pm & ~inner] = PATH[2]; a[edge] = PATH[3]; a[pm & (sp > .97)] = PATH[0]; a[pm & (sp < .015)] = PATH[2]
    im = Image.fromarray(a); d = ImageDraw.Draw(im)
    for blobs in ponds:
        for cx, cy, rx, ry in blobs: d.ellipse((cx - rx, cy - ry + 3, cx + rx, cy + ry + 3), fill=DRESS[3])
        for cx, cy, rx, ry in blobs: d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=DRESS[2])
        for cx, cy, rx, ry in blobs: d.ellipse((cx - rx + 5, cy - ry + 4, cx + rx - 5, cy + ry - 3), fill=DRESS[1])
        cx, cy, rx, ry = blobs[0]
        d.line((cx - rx // 2, cy - ry + 6, cx - rx // 2 + 14, cy - ry + 6), fill=DRESS[0])
    for cx, cy in cukes:
        d.ellipse((cx - 9, cy - 5, cx + 9, cy + 6), fill=CUKE_S[2]); d.ellipse((cx - 9, cy - 6, cx + 9, cy + 4), fill=CUKE_S[1])
        d.ellipse((cx - 7, cy - 5, cx + 7, cy + 2), fill=CUKE_F[1]); d.ellipse((cx - 4, cy - 3, cx + 4, cy), fill=CUKE_F[2])
        for k in range(6):
            ang = k / 6 * math.tau; d.point((round(cx + 2.6 * math.cos(ang)), round(cy - 1.5 + 1.4 * math.sin(ang))), CUKE_F[0])
    for (x, y) in paws:
        c = SOIL[3]; d.ellipse((x, y, x + 2, y + 2), fill=c)
        for dx, dy in ((-1, -2), (1, -3), (3, -2)): d.point((x + dx, y + dy), c)
    for (x, y) in flowers:   # tiny white 4-petal flowers = "something is here"
        for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)): d.point((x + dx, y + dy), hx('FFFFFF'))
        d.point((x, y), hx('F7C531'))
    if blanket:
        x0, y0, x1, y1 = blanket
        d.rectangle((x0, y0 + 2, x1, y1 + 2), fill=hx('8A3E30'))
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                c = ((x - x0) // 4 + (y - y0) // 4) % 2; cc = ((x - x0) // 4) % 2 and ((y - y0) // 4) % 2
                d.point((x, y), hx('E8402E') if cc else hx('F7EFE2') if not c else hx('F29A8C'))
        d.rectangle((x0, y0, x1, y1), outline=hx('B42A20'))
    return im


# ------------------------------------------------------------------ new sprites
def parsley_hedge(w, h=30, seed=0):
    rnd = random.Random(seed); im = new(w, h + 2); d = ImageDraw.Draw(im)
    for layer, (ramp_i, y0) in enumerate(((3, h * .55), (2, h * .4), (1, h * .25))):
        for k in range(int(w / 3)):
            x = rnd.random() * w; y = y0 + rnd.random() * h * .45; r = 3 + rnd.random() * 3
            d.ellipse((x - r, y - r, x + r, y + r), fill=PARSLEY[ramp_i])
    for k in range(int(w / 5)):
        x = rnd.random() * w; y = h * .2 + rnd.random() * h * .3; d.point((int(x), int(y)), PARSLEY[0]); d.point((int(x) + 1, int(y)), PARSLEY[0])
    d.rectangle((0, h - 3, w - 1, h), fill=PARSLEY[3])
    return outline(im)


def vine_fence(w=260, seed=0):
    rnd = random.Random(seed); im = new(w, 40); d = ImageDraw.Draw(im)
    for x in range(4, w, 32):
        d.rectangle((x, 6, x + 3, 39), fill=WOOD[2]); d.line((x, 6, x, 39), fill=WOOD[1])
    d.line((0, 10, w, 12), fill=hx('CFC39C')); d.line((0, 24, w, 25), fill=hx('CFC39C'))
    for k in range(int(w / 4)):
        x = rnd.random() * w; y = 6 + rnd.random() * 26; r = 2 + rnd.random() * 3
        d.ellipse((x - r, y - r * .8, x + r, y + r * .8), fill=ROMAINE[2] if k % 3 else ROMAINE[1])
    for k in range(int(w / 26)):
        x = 10 + rnd.random() * (w - 20); y = 14 + rnd.random() * 10
        d.rounded_rectangle((x - 2, y, x + 2, y + 12), 2, fill=CUKE_S[1]); d.line((x - 1, y + 2, x - 1, y + 10), fill=CUKE_S[0])
        d.point((int(x), int(y) - 1), hx('F7C531'))   # cucumber flower
    return outline(im)


def boss_gate():
    """Onion pillars bending into an arch, a crowned onion bulb on top, and crossed salad servers closing it."""
    w, h = 140, 128; im = new(w, h); d = ImageDraw.Draw(im)
    base = h - 4
    for px in (18, w - 18):
        for k, dx in enumerate((-10, -4, 2, 8)):
            x = px + dx
            for y in range(28, base - 14):
                t = (y - 28) / (base - 42); bend = (1 - t) ** 2 * (16 if px < w / 2 else -16) * (0.6 + k * .15)
                xx = round(x + bend); d.line((xx - 3, y, xx + 3, y), fill=ONION[1]); d.point((xx - 3, y), ONION[0]); d.point((xx + 3, y), ONION[2]); d.point((xx + 2, y), ONION[2])
            d.ellipse((x - 7, base - 18, x + 7, base), fill=BULB[1]); d.ellipse((x - 6, base - 17, x + 1, base - 6), fill=BULB[0])
            d.arc((x - 7, base - 18, x + 7, base), 10, 170, fill=BULB[2])
            for r in (-3, 0, 3): d.line((x + r, base, x + r + random.randint(-1, 1), base + 3), fill=BULB[3])
    # arch: a thick green stalk bridging the pillars
    for t in np.linspace(0, 1, 120):
        x = 30 + (w - 60) * t; y = 30 - math.sin(t * math.pi) * 14
        d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=ONION[1]); d.point((int(x), int(y) - 3), ONION[0]); d.point((int(x), int(y) + 3), ONION[3])
    # crowned bulb at the top
    cx, cy = w // 2, 18
    d.ellipse((cx - 12, cy - 6, cx + 12, cy + 14), fill=BULB[1]); d.ellipse((cx - 10, cy - 5, cx + 2, cy + 7), fill=BULB[0]); d.arc((cx - 12, cy - 6, cx + 12, cy + 14), 15, 165, fill=BULB[2])
    d.polygon([(cx - 10, cy - 4), (cx - 10, cy - 14), (cx - 5, cy - 8), (cx, cy - 16), (cx + 5, cy - 8), (cx + 10, cy - 14), (cx + 10, cy - 4)], fill=GOLD[1])
    d.line((cx - 10, cy - 5, cx + 10, cy - 5), fill=GOLD[2]); d.point((cx, cy - 10), hx('E2231A')); d.point((cx - 7, cy - 9), GOLD[0]); d.point((cx + 7, cy - 9), GOLD[0])
    d.line((cx - 6, cy + 3, cx - 2, cy + 5), fill=hx('2A1A10')); d.line((cx + 2, cy + 5, cx + 6, cy + 3), fill=hx('2A1A10'))   # stern brows on the emblem
    # crossed wooden salad servers (spoon + fork) closing the arch
    def server(x0, y0, x1, y1, fork):
        L = math.hypot(x1 - x0, y1 - y0); ux, uy = (x1 - x0) / L, (y1 - y0) / L; nx, ny = -uy, ux
        for s in np.linspace(0, L * .72, 140):
            x, y = x0 + ux * s, y0 + uy * s
            d.ellipse((x - 2.5, y - 2.5, x + 2.5, y + 2.5), fill=WOOD[1]); d.point((int(x + nx * 1.5), int(y + ny * 1.5)), WOOD[0])
        hx0, hy0 = x0 + ux * L * .72, y0 + uy * L * .72
        if fork:
            for k in (-6, -2, 2, 6):
                d.line((hx0 + nx * k, hy0 + ny * k, hx0 + nx * k + ux * 22, hy0 + ny * k + uy * 22), fill=WOOD[1], width=3)
            d.line((hx0 + nx * -7, hy0 + ny * -7, hx0 + nx * 7, hy0 + ny * 7), fill=WOOD[2], width=4)
        else:
            d.ellipse((hx0 + ux * 12 - 11, hy0 + uy * 12 - 11, hx0 + ux * 12 + 11, hy0 + uy * 12 + 11), fill=WOOD[1])
            d.ellipse((hx0 + ux * 12 - 7, hy0 + uy * 12 - 7, hx0 + ux * 12 + 7, hy0 + uy * 12 + 7), fill=WOOD[0])
    server(34, base - 2, w - 30, 36, fork=False)
    server(w - 34, base - 2, 30, 36, fork=True)
    return outline(im)


def picnic_basket():
    im = new(18, 16); d = ImageDraw.Draw(im)
    d.arc((3, 0, 15, 12), 180, 360, fill=WOOD[2], width=2)
    d.rectangle((1, 6, 16, 15), fill=hx('C99A5A'))
    for y in (8, 11, 14): d.line((1, y, 16, y), fill=hx('A07840'))
    for x in (4, 9, 14): d.line((x, 6, x, 15), fill=hx('A07840'))
    d.rectangle((3, 4, 7, 6), fill=TOMATO[1]); d.rectangle((10, 3, 13, 6), fill=hx('E0A45A'))   # a tomato... and rugelach
    return outline(im)


def mug():
    im = new(8, 8); d = ImageDraw.Draw(im)
    d.rectangle((1, 2, 5, 7), fill=hx('F7F4EC')); d.rectangle((1, 2, 5, 3), fill=hx('6A4026')); d.arc((4, 3, 7, 6), 270, 90, fill=hx('F7F4EC'))
    return outline(im)


# ------------------------------------------------------------------ screens
def build(name, gimg, objs, layout):
    out = f'world1/{name}'; os.makedirs(out, exist_ok=True)
    gimg.save(f'{out}/ground.png')
    L = []
    for oid, img, fx, fy, block in objs:
        x = int(fx - img.width / 2); y = int(fy - img.height)
        img.save(f'{out}/obj_{oid}.png')
        L.append(dict(id=oid, x=x, y=y, foot=fy, w=img.width, h=img.height, block=[round(v) for v in block] if block else None))
    layout.update(size=[W, H], objects=L)
    json.dump(layout, open(f'{out}/layout.json', 'w'), indent=1)


def lett(oid, x, fy, w, h, seed):
    return (oid, lettuce(w, h, seed=seed), x, fy, (x - w * .42, fy - 22, x + w * .42, fy - 2))


def onions(oid, x, fy, n, h, seed, spread=11):
    img = onion_cluster(n, h, seed=seed, spread=spread)
    return (oid, img, x, fy, (x - img.width / 2 + 5, fy - 16, x + img.width / 2 - 5, fy + 2))


def croutons(prefix, pts):
    return [(f'{prefix}{i}', crouton(s, i + len(prefix) * 7), x, y, None) for i, (x, y, s) in enumerate(pts)]


def screen2():
    main = [(-20, 128), (40, 128), (120, 134), (200, 128), (280, 116), (336, 96), (370, 56), (378, -20)]
    side = [(330, 102), (346, 150), (356, 186), (358, 204)]
    paws = [(352, 160), (356, 170), (350, 178), (355, 188), (358, 198)]
    flowers = [(346, 196), (368, 194), (342, 190), (372, 200)]
    g = ground([(main, 19), (side, 8)], paws=paws, flowers=flowers, seed=5)
    objs = []
    objs.append(('fence', vine_fence(250, 1), 130, 46, (6, 30, 254, 46)))
    for i, (x, y) in enumerate(((64, 196), (118, 196), (172, 196), (226, 196), (64, 258), (118, 258), (172, 258), (226, 258))):
        objs.append((f'tbush{i}', tomato_bush(20 + i), x, y, (x - 16, y - 12, x + 16, y)))
    objs.append(('carrots', carrot_tops(4, 7), 110, 92, (82, 82, 140, 92)))
    objs.append(lett('lettuce0', 440, 118, 96, 76, 21))
    objs.append(lett('lettuce1', 262, 64, 70, 56, 22))
    # the onion wall that hides the pocket; the crack is between the first two clusters (x 344-372)
    objs.append(onions('wall0', 318, 200, 3, 120, 31))
    objs.append(onions('wall1', 404, 200, 4, 130, 32))
    objs.append(onions('wall2', 462, 200, 3, 116, 33))
    objs.append(onions('wall3', 296, 268, 3, 110, 34))
    objs.append(('radish', radish_patch(9), 300, 160, (276, 148, 324, 160)))
    objs += croutons('c', ((70, 154, 6), (150, 110, 7), (232, 150, 6), (300, 132, 8), (352, 74, 6), (20, 150, 5)))
    objs.append(('pocketlettuce', lettuce(36, 28, seed=29), 460, 262, (446, 252, 474, 262)))
    layout = dict(bags={'pouch': dict(x=420, foot=246)},
                  veggies=[dict(kind='tomato', x=140, foot=228, range=[70, 214, 226, 240]), dict(kind='carrot', x=200, foot=96, range=[160, 82, 240, 104])],
                  paw_prints=[340, 150, 372, 206], start=dict(x=12, y=128))
    return build('s2', g, objs, layout)


def screen3():
    path = [(300, 300), (300, 232), (284, 186), (246, 158), (196, 146)]
    g = ground([(path, 16)], clearings=[(206, 150, 34, 18)],
               flowers=[(98, 128), (110, 131), (122, 127), (104, 124), (116, 135)], blanket=(40, 62, 100, 92), seed=9)
    objs = []
    # parsley hedge around Roni's picnic (top-left), with a gap at x 96-124 marked by flowers
    objs.append(('hedge0', parsley_hedge(96, 30, 1), 48, 126, (0, 104, 96, 126)))
    objs.append(('hedge1', parsley_hedge(40, 30, 2), 152, 126, (132, 104, 172, 126)))
    for i, y in enumerate((30, 48, 66, 84, 102)):
        objs.append((f'hedgev{i}', parsley_hedge(24, 30, 3 + i), 160, y + 2, (148, y - 14, 172, y + 2)))
    objs.append(('basket', picnic_basket(), 92, 70, (84, 60, 100, 70)))
    objs.append(('mug', mug(), 58, 90, None))
    objs.append(lett('lettuce0', 404, 104, 96, 78, 41))
    objs.append(lett('lettuce1', 392, 236, 90, 70, 42))
    objs.append(lett('lettuce2', 210, 262, 80, 62, 43))
    objs.append(lett('lettuce3', 300, 92, 60, 48, 44))
    objs.append(onions('on0', 238, 60, 3, 120, 51))
    objs.append(onions('on1', 462, 64, 4, 140, 52))
    objs.append(onions('on2', 24, 268, 3, 120, 53))
    objs.append(('tbush', tomato_bush(9), 100, 214, (84, 200, 116, 214)))
    objs += croutons('c', ((262, 210, 6), (322, 260, 7), (170, 168, 6), (240, 128, 5)))
    layout = dict(veggies=[dict(kind='tomato', x=330, foot=170, range=[312, 160, 360, 180]), dict(kind='carrot', x=150, foot=210, range=[130, 196, 180, 226])],
                  roni=dict(x=70, foot=88, hear=[0, 30, 230, 200]), gap=[96, 112, 124, 132], start=dict(x=300, y=262))
    return build('s3', g, objs, layout)


def screen4():
    path = [(380, 300), (378, 240), (352, 204), (306, 176), (266, 156), (246, 144)]
    g = ground([(path, 18)], clearings=[(244, 146, 42, 14)], cukes=[(244, 34), (214, 50), (274, 50), (244, 66), (226, 84), (262, 84)], seed=13)
    objs = []
    objs.append(('gate', boss_gate(), 244, 134, (172, 114, 316, 134)))
    objs.append(onions('on0', 140, 128, 4, 130, 61))
    objs.append(onions('on1', 348, 128, 4, 130, 62))
    objs.append(onions('on2', 52, 110, 5, 150, 63))
    objs.append(onions('on3', 436, 108, 5, 146, 64))
    objs.append(onions('on4', 140, 40, 3, 100, 65))
    objs.append(onions('on5', 350, 40, 3, 100, 66))
    objs.append(('nest', lizzy_nest(), 296, 222, (274, 208, 318, 222)))
    objs.append(lett('lettuce0', 96, 214, 96, 76, 71))
    objs.append(lett('lettuce1', 448, 232, 84, 66, 72))
    objs.append(('radish', radish_patch(5), 56, 266, (32, 254, 80, 266)))
    objs.append(('carrots', carrot_tops(4, 8), 200, 264, (172, 254, 230, 264)))
    objs += croutons('c', ((330, 240, 7), (404, 196, 6), (214, 176, 6), (290, 150, 8), (196, 210, 5)))
    layout = dict(veggies=[dict(kind='carrot', x=400, foot=170, range=[384, 156, 440, 180])],
                  lizzy=dict(x=296, foot=222), gate=[176, 6, 312, 136], start=dict(x=380, y=262))
    return build('s4', g, objs, layout)


if __name__ == '__main__':
    random.seed(5)
    screen2(); screen3(); screen4()
    print('world1 s2-s4 ok')
