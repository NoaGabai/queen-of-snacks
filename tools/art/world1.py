"""World 1 - Green Onion Garden, salad mode. Screen 1 of 4 (entrance + Lizzy 1), 480x270, 3/4 top-down.
מקור: assets/world1.py משיחת העיצוב (ללא שינוי בציור; הוסרו קובצי התצוגה המקדימה).
Mai (24x36) is tiny between giant salad plants: lettuce heads ~2.5x her height, onion stalks ~4x.

Outputs (./world1/, run from assets/ after kitchen.py):
  ground.png              flat layer: soil, path, dressing pond, cucumber stones, croutons, paw prints (no depth)
  obj_<id>.png            every standing object, cropped, drawn back-to-front by its foot line
  veg_tomato_map.png, veg_carrot_map.png   wandering map veggies
  bag_move.png, bag_coin.png               surprise bags
  layout.json             objects (x, y, foot), blockers, interactables, exits
"""
import json, math, os, random
import numpy as np
from PIL import Image, ImageDraw

W, H = 480, 270
OUT = 'world1'
OL = (0x3A, 0x26, 0x18, 255)
os.makedirs(OUT, exist_ok=True)
random.seed(7)


def hx(s, a=255):
    s = s.lstrip('#'); return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


def R(*c): return [hx(x) for x in c]


# ---- palette (art-bible 9.x / world 1)
SOIL    = R('B58A62', '93694A', '6E4C34', '4A3122')
PATH    = R('E9D3A6', 'D7B985', 'B8955F', '8C6C40')
CROUTON = R('F6DC9A', 'E3B65E', 'BE8A38', '8A5E22')
LETTUCE = R('EEF7C6', 'CFE79A', 'A6CB6C', '76A046')
ROMAINE = R('9CCF68', '6AAA44', '477F30', '2C5622')
ONION   = R('DDF2C4', '9FD07A', '5FA048', '36702E')
BULB    = R('FBF8EC', 'EAE3CA', 'CFC39C', 'A8946A')
CUKE_S  = R('BFDF8C', '4E8A3A', '2E5E26', '1E3E18')
CUKE_F  = R('F2FADC', 'E6F4BE', 'CFE6A0', 'A8C878')
DRESS   = R('FFF6C8', 'F6E08A', 'E2C04A', 'B8962E')
RADISH  = R('FBD2DC', 'F49AB0', 'D6587A', '9E3456')
TOMATO  = R('FF8A72', 'E8402E', 'B42A20', '7A1A14')
CARROT  = R('FFB060', 'F07A22', 'C25A14', '8A3E0C')
WOOD    = R('E2AE74', 'C08650', '93612F', '623E1D')


def new(w=W, h=H): return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def outline(img, col=OL):
    a = np.array(img); m = a[:, :, 3] > 0
    d = np.zeros_like(m); d[1:] |= m[:-1]; d[:-1] |= m[1:]; d[:, 1:] |= m[:, :-1]; d[:, :-1] |= m[:, 1:]
    a[d & ~m] = col
    return Image.fromarray(a)


def soft_shadow(img, cx, cy, rx, ry, a=55):
    s = new(img.width, img.height); ImageDraw.Draw(s).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(58, 38, 24, a))
    return Image.alpha_composite(img, s)


# =============================================================== GROUND
PATH_PTS = [(52, 290), (60, 240), (92, 206), (150, 186), (222, 176), (290, 168), (350, 150), (410, 132), (500, 126)]
NORTH_PTS = [(300, 166), (306, 120), (300, 70), (292, -20)]
SIDE_PTS = [(300, 172), (340, 204), (392, 226), (430, 238)]


def catmull(pts, n=24):
    out = []
    p = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(pts[-1]); return out


def path_mask(pts, width):
    m = Image.new('L', (W, H), 0); d = ImageDraw.Draw(m)
    for x, y in catmull(pts):
        d.ellipse((x - width, y - width * .62, x + width, y + width * .62), fill=255)
    return np.array(m) > 0


def ground():
    rng = np.random.default_rng(3)
    a = np.zeros((H, W, 4), np.uint8); a[:] = SOIL[1]
    # quiet soil texture: big soft blotches + sparse specks
    yy, xx = np.mgrid[0:H, 0:W]
    blot = np.sin(xx / 37.0) * np.cos(yy / 29.0) + np.sin((xx + yy) / 53.0)
    a[blot > .9] = hx('A47A54'); a[blot < -1.1] = hx('84603F')
    sp = rng.random((H, W))
    a[(sp > .985)] = SOIL[2]; a[(sp < .006)] = SOIL[0]
    # paths
    main = path_mask(PATH_PTS, 19); north = path_mask(NORTH_PTS, 15); side = path_mask(SIDE_PTS, 11)
    pm = main | north | side
    edge = np.zeros_like(pm); edge[1:] |= pm[:-1] & ~pm[1:]; edge[:-1] |= pm[1:] & ~pm[:-1]; edge[:, 1:] |= pm[:, :-1] & ~pm[:, 1:]; edge[:, :-1] |= pm[:, 1:] & ~pm[:, :-1]
    a[pm] = PATH[1]
    inner = pm.copy(); inner[2:] &= pm[:-2]; inner[:-2] &= pm[2:]
    a[pm & ~inner] = PATH[2]
    a[edge] = PATH[3]
    hi = pm & (sp > .97); a[hi] = PATH[0]
    lo = pm & (sp < .015); a[lo] = PATH[2]
    im = Image.fromarray(a); d = ImageDraw.Draw(im)
    # dressing pond (top-left), glossy, with oil drops
    blobs = [(60, 66, 44, 30), (116, 64, 50, 28), (92, 88, 46, 20), (40, 82, 22, 16)]
    for cx, cy, rx, ry in blobs: d.ellipse((cx - rx, cy - ry + 3, cx + rx, cy + ry + 3), fill=DRESS[3])
    for cx, cy, rx, ry in blobs: d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=DRESS[2])
    for cx, cy, rx, ry in blobs: d.ellipse((cx - rx + 5, cy - ry + 4, cx + rx - 5, cy + ry - 3), fill=DRESS[1])
    for cx, cy, r in ((60, 60, 6), (98, 52, 4), (128, 74, 5), (76, 86, 3), (140, 56, 3)):
        d.ellipse((cx - r, cy - r * .6, cx + r, cy + r * .6), outline=DRESS[3]); d.point((cx - r // 2, int(cy - r * .3)), DRESS[0])
    for x0 in (40, 84, 118):
        d.line((x0, 44, x0 + 14, 44), fill=DRESS[0]); d.line((x0 + 4, 46, x0 + 9, 46), fill=DRESS[0])
    # herb bits floating on the dressing
    for cx, cy in ((70, 72), (112, 90), (138, 66)): d.rectangle((cx, cy, cx + 1, cy), fill=ONION[3]); d.point((cx + 2, cy + 1), ONION[2])
    # cucumber stepping stones crossing to the pond's edge
    for cx, cy in ((150, 120), (170, 134), (192, 146), (128, 110)):
        d.ellipse((cx - 9, cy - 5, cx + 9, cy + 6), fill=CUKE_S[2])
        d.ellipse((cx - 9, cy - 6, cx + 9, cy + 4), fill=CUKE_S[1])
        d.ellipse((cx - 7, cy - 5, cx + 7, cy + 2), fill=CUKE_F[1])
        d.ellipse((cx - 4, cy - 3, cx + 4, cy), fill=CUKE_F[2])
        for k in range(6):
            ang = k / 6 * math.tau; d.point((round(cx + 2.6 * math.cos(ang)), round(cy - 1.5 + 1.4 * math.sin(ang))), CUKE_F[0])
    # cat paw prints heading to the onion wall (hint of the secret passage, top-right)
    for i, (x, y) in enumerate(((396, 118), (404, 108), (414, 100), (424, 90), (436, 82), (446, 72))):
        c = SOIL[3]
        d.ellipse((x, y, x + 2, y + 2), fill=c)
        for dx, dy in ((-1, -2), (1, -3), (3, -2)): d.point((x + dx, y + dy), c)
    return im, pm


# =============================================================== OBJECTS
OBJS = []    # dict(id, img, x, y, foot, block=(x0,y0,x1,y1) or None)


def add(oid, img, foot_x, foot_y, block=None, shadow=None):
    """img is a local sprite; its bottom-centre sits on (foot_x, foot_y)."""
    x = int(foot_x - img.width / 2); y = int(foot_y - img.height)
    OBJS.append(dict(id=oid, img=img, x=x, y=y, foot=foot_y, block=block, shadow=shadow))


def lettuce(w=90, h=74, seed=0, ramp=LETTUCE, outer=ROMAINE):
    rnd = random.Random(seed)
    im = new(w + 4, h + 4); d = ImageDraw.Draw(im); cx, cy = w / 2 + 2, h * .54 + 2
    # outer ruffled leaves (darker), then lighter inner layers, ruffles via small circles on the rim
    layers = [(w * .50, h * .48, outer[2], outer[1]), (w * .43, h * .41, ramp[3], ramp[2]), (w * .33, h * .32, ramp[2], ramp[1]), (w * .20, h * .20, ramp[1], ramp[0])]
    for li, (rx, ry, dark, base) in enumerate(layers):
        oy = -li * h * .05
        d.ellipse((cx - rx, cy - ry + oy + 2, cx + rx, cy + ry + oy + 2), fill=dark)
        d.ellipse((cx - rx, cy - ry + oy, cx + rx, cy + ry + oy - 1), fill=base)
        n = int(rx * .55)
        for k in range(n):
            ang = k / n * math.tau + rnd.random() * .2
            px, py = cx + rx * .93 * math.cos(ang), cy + oy + ry * .9 * math.sin(ang)
            r = 3 + rnd.random() * 2.5
            d.ellipse((px - r, py - r * .8, px + r, py + r * .8), fill=base if math.sin(ang) < .3 else dark)
        # veins
        for k in range(5):
            ang = -math.pi / 2 + (k - 2) * .55
            d.line((cx, cy + oy + ry * .2, cx + rx * .8 * math.cos(ang), cy + oy + ry * .75 * math.sin(ang)), fill=ramp[0] if li > 1 else ramp[1])
    # top-left highlight
    d.ellipse((cx - w * .14, cy - h * .34, cx - w * .02, cy - h * .26), fill=ramp[0])
    return outline(im)


def onion_cluster(n=3, h=130, seed=0, spread=10):
    rnd = random.Random(seed)
    w = spread * (n - 1) + 30
    im = new(w, h + 6); d = ImageDraw.Draw(im)
    stalks = []
    for i in range(n):
        bx = 15 + i * spread + rnd.randint(-2, 2); hh = int(h * (0.7 + rnd.random() * 0.3)); lean = rnd.choice([-1, 0, 1]) * rnd.randint(2, 6)
        stalks.append((bx, hh, lean))
    stalks.sort(key=lambda s: -s[1])
    for bx, hh, lean in stalks:
        base_y = h - 2
        # green stalks (2 per bulb, fanning a bit)
        for k, (dx, frac) in enumerate(((-2, 1.0), (3, .82))):
            top = base_y - int(hh * frac); tx = bx + dx + lean * (1 if k == 0 else -0.6)
            for y in range(top, base_y - 12):
                t = (y - top) / max(1, base_y - 12 - top); x = round(tx + (bx + dx - tx) * t)
                wdt = 2 if y - top < 6 else 3
                d.line((x - wdt, y, x + wdt, y), fill=ONION[1]); d.point((x - wdt, y), ONION[0]); d.point((x + wdt, y), ONION[2]); d.point((x + wdt - 1, y), ONION[2])
            d.point((round(tx), top - 1), ONION[2])
        # white bulb + roots
        d.ellipse((bx - 7, base_y - 16, bx + 7, base_y), fill=BULB[1]); d.ellipse((bx - 6, base_y - 15, bx + 2, base_y - 4), fill=BULB[0])
        d.arc((bx - 7, base_y - 16, bx + 7, base_y), 10, 170, fill=BULB[2])
        d.rectangle((bx - 3, base_y - 20, bx + 3, base_y - 14), fill=ONION[0])
        for rx in (-4, -1, 2, 5): d.line((bx + rx, base_y, bx + rx + rnd.randint(-2, 2), base_y + 4), fill=BULB[3])
    return outline(im)


def tomato_bush(seed=0):
    rnd = random.Random(seed); im = new(46, 38); d = ImageDraw.Draw(im)
    for k in range(9):
        x, y = 8 + rnd.random() * 30, 6 + rnd.random() * 20; r = 7 + rnd.random() * 4
        d.ellipse((x - r, y - r * .8, x + r, y + r * .8), fill=ROMAINE[2] if k < 4 else ROMAINE[1])
    for k in range(7):
        x, y = 8 + rnd.random() * 30, 10 + rnd.random() * 18
        d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=TOMATO[1]); d.point((int(x) - 1, int(y) - 1), TOMATO[0]); d.point((int(x) - 2, int(y) - 1), TOMATO[0])
        d.point((int(x), int(y) - 3), ROMAINE[3])
    d.rectangle((21, 30, 24, 37), fill=ROMAINE[3])
    return outline(im)


def carrot_tops(n=5, seed=0):
    rnd = random.Random(seed); im = new(16 * n, 34); d = ImageDraw.Draw(im)
    for i in range(n):
        x = 8 + i * 15 + rnd.randint(-2, 2); y = 28
        for k in range(5):
            ang = -math.pi / 2 + (k - 2) * .35
            ex, ey = x + 14 * math.cos(ang), y - 4 + 18 * math.sin(ang)
            d.line((x, y - 3, ex, ey), fill=ROMAINE[2])
            for t in (.4, .65, .9):
                fx, fy = x + (ex - x) * t, y - 3 + (ey - y + 3) * t
                d.ellipse((fx - 2, fy - 1, fx + 2, fy + 1), fill=ROMAINE[1] if t < .8 else ROMAINE[0])
        d.ellipse((x - 4, y - 3, x + 4, y + 2), fill=CARROT[1]); d.ellipse((x - 3, y - 3, x + 1, y - 1), fill=CARROT[0])
    return outline(im)


def radish_patch(seed=0, hide_bag=False):
    rnd = random.Random(seed); im = new(54, 30); d = ImageDraw.Draw(im)
    for i in range(4):
        x = 8 + i * 12 + rnd.randint(-2, 2); y = 24
        d.ellipse((x - 4, y - 3, x + 4, y + 3), fill=RADISH[2]); d.ellipse((x - 3, y - 3, x + 1, y), fill=RADISH[1])
        for k in (-1, 0, 1):
            ex, ey = x + k * 8, y - 16 + abs(k) * 4
            d.polygon([(x, y - 2), (ex - 4, ey + 4), (ex, ey - 2), (ex + 4, ey + 4)], fill=ROMAINE[2 if k else 1])
            d.line((x, y - 2, ex, ey), fill=ROMAINE[3])
    return outline(im)


def crouton(s=7, seed=0):
    rnd = random.Random(seed); im = new(s + 3, s + 3); d = ImageDraw.Draw(im)
    d.rectangle((1, 2, s, s + 1), fill=CROUTON[2]); d.rectangle((1, 1, s, s - 1), fill=CROUTON[1]); d.rectangle((1, 1, s, 2), fill=CROUTON[0])
    d.point((s - 1, s - 1), CROUTON[3]); d.point((2, 3), hx('FFFFFF')); d.point((s - 2, 2), hx('FFFFFF'))   # toasted corner + salt grains
    return outline(im)


def sign():
    im = new(30, 34); d = ImageDraw.Draw(im)
    d.rectangle((13, 14, 16, 33), fill=WOOD[2]); d.line((13, 14, 13, 33), fill=WOOD[1])
    d.rectangle((1, 2, 28, 16), fill=WOOD[1]); d.rectangle((1, 2, 28, 4), fill=WOOD[0]); d.line((1, 16, 28, 16), fill=WOOD[3])
    # a tiny green-onion pictogram instead of text (the name shows in the label)
    d.line((14, 6, 14, 12), fill=ONION[2]); d.line((16, 5, 16, 12), fill=ONION[1]); d.ellipse((12, 11, 18, 14), fill=BULB[0])
    d.polygon([(22, 8), (26, 9), (22, 11)], fill=WOOD[3])   # arrow into the garden
    return outline(im)


def lizzy_nest():
    im = new(48, 26); d = ImageDraw.Draw(im)
    d.ellipse((2, 6, 46, 25), fill=ROMAINE[2]); d.ellipse((4, 6, 44, 22), fill=LETTUCE[2]); d.ellipse((9, 8, 39, 20), fill=LETTUCE[1])
    for k in range(8):
        ang = math.pi + k / 7 * math.pi; x, y = 24 + 21 * math.cos(ang), 15 + 9 * math.sin(ang)
        d.ellipse((x - 5, y - 4, x + 5, y + 3), fill=LETTUCE[2] if k % 2 else LETTUCE[1])
    liz = Image.open('kitchen/lizzy_sleep_map.png')
    im.alpha_composite(liz, (15, 6))
    for k in range(5):   # front leaves curl over her a little
        x = 8 + k * 8; d.ellipse((x - 5, 18, x + 5, 25), fill=LETTUCE[2] if k % 2 else LETTUCE[1])
    return outline(im)


def bag(main, dark, mark):
    """Surprise bag: a little crinkly snack pouch, no brand - just a star / coin mark."""
    im = new(14, 17); d = ImageDraw.Draw(im)
    d.polygon([(2, 3), (11, 3), (12, 15), (1, 15)], fill=hx(main))
    d.rectangle((2, 1, 11, 3), fill=hx(dark)); d.point((3, 2), hx('FFFFFF')); d.point((5, 2), hx('FFFFFF')); d.point((7, 2), hx('FFFFFF')); d.point((9, 2), hx('FFFFFF'))
    d.line((10, 5, 11, 14), fill=hx(dark)); d.line((3, 5, 3, 9), fill=hx('FFFFFF', 200))
    if mark == 'star':
        for x, y in ((6, 7), (7, 7), (5, 8), (6, 8), (7, 8), (8, 8), (6, 9), (7, 9), (5, 10), (8, 10)): d.point((x, y), hx('FFE066'))
    elif mark == 'heart':
        for x, y in ((5, 7), (8, 7), (4, 8), (5, 8), (6, 8), (7, 8), (8, 8), (9, 8), (5, 9), (6, 9), (7, 9), (8, 9), (6, 10), (7, 10)): d.point((x, y), hx('FFFFFF'))
    else:
        d.ellipse((4, 7, 9, 12), fill=hx('FFE066')); d.point((6, 9), hx('B8962E')); d.point((7, 9), hx('B8962E'))
    return outline(im)


def map_tomato():
    im = new(16, 16); d = ImageDraw.Draw(im)
    d.ellipse((1, 3, 14, 15), fill=TOMATO[1]); d.ellipse((2, 3, 9, 9), fill=TOMATO[0]); d.arc((1, 3, 14, 15), 20, 160, fill=TOMATO[2])
    d.polygon([(7, 1), (9, 1), (11, 4), (8, 3), (5, 4)], fill=ROMAINE[1])
    d.point((5, 8), hx('FFFFFF')); d.point((10, 8), hx('FFFFFF')); d.point((5, 9), hx('2A1A10')); d.point((10, 9), hx('2A1A10'))
    d.line((4, 7, 6, 8), fill=hx('2A1A10')); d.line((9, 8, 11, 7), fill=hx('2A1A10')); d.line((6, 12, 9, 12), fill=TOMATO[3])
    return outline(im)


def map_carrot():
    im = new(14, 24); d = ImageDraw.Draw(im)
    d.polygon([(2, 7), (11, 7), (8, 22), (5, 22)], fill=CARROT[1]); d.line((3, 8, 6, 20), fill=CARROT[0])
    for y in (11, 15, 18): d.line((4 + (y - 11) // 4, y, 6 + (y - 11) // 4, y), fill=CARROT[2])
    for k in (-1, 0, 1): d.line((6, 7, 6 + k * 4, 1), fill=ROMAINE[1])
    d.point((5, 10), hx('FFFFFF')); d.point((8, 10), hx('FFFFFF')); d.point((5, 11), hx('2A1A10')); d.point((8, 11), hx('2A1A10'))
    d.line((4, 9, 5, 10), fill=hx('2A1A10')); d.line((8, 10, 9, 9), fill=hx('2A1A10')); d.line((5, 14, 8, 14), fill=CARROT[3])
    return outline(im)


# =============================================================== BUILD
if __name__ == '__main__':
    g, pm = ground()
    # --- big plants: (id, sprite, foot x, foot y, blocker around the base)
    for i, (x, fy, w, h) in enumerate(((112, 158, 92, 76), (392, 102, 100, 80), (186, 270, 92, 68), (24, 200, 70, 60))):
        img = lettuce(w, h, seed=i)
        add(f'lettuce{i}', img, x, fy, block=(x - w * .42, fy - 22, x + w * .42, fy - 2))
    for i, (x, fy, n, h) in enumerate(((326, 64, 4, 140), (444, 56, 5, 150), (232, 62, 3, 120), (470, 268, 3, 130), (12, 120, 3, 110))):
        img = onion_cluster(n, h, seed=10 + i, spread=11)
        add(f'onions{i}', img, x, fy, block=(x - img.width / 2 + 6, fy - 16, x + img.width / 2 - 6, fy + 2))
    add('tomatobush0', tomato_bush(1), 438, 200, block=(420, 186, 456, 200))
    add('tomatobush1', tomato_bush(2), 262, 266, block=(244, 252, 280, 266))
    add('carrots', carrot_tops(5, 3), 342, 262, block=(306, 250, 378, 262))
    add('radish', radish_patch(4), 448, 250, block=(424, 238, 472, 250))
    add('sign', sign(), 30, 250, block=(22, 240, 38, 250))
    add('nest', lizzy_nest(), 238, 158, block=(216, 144, 260, 158))
    for i, (x, y, s) in enumerate(((84, 222, 7), (128, 206, 6), (186, 200, 8), (262, 194, 7), (330, 176, 6), (366, 142, 8), (318, 128, 6), (270, 150, 5), (200, 160, 6))):
        add(f'crouton{i}', crouton(s, i), x, y)
    add('crouton_bag', crouton(10, 99), 300, 204, block=(294, 196, 306, 204))
    add('smalllettuce', lettuce(40, 32, seed=9), 300, 238, block=(284, 228, 316, 238))
    bag_move = bag('7A4FB8', '4E2E8A', 'star'); bag_coin = bag('E8B730', 'A07C26', 'coin')
    bag_move.save(f'{OUT}/bag_move.png'); bag_coin.save(f'{OUT}/bag_coin.png')
    map_tomato().save(f'{OUT}/veg_tomato_map.png'); map_carrot().save(f'{OUT}/veg_carrot_map.png')
    os.makedirs(f'{OUT}/s1', exist_ok=True)
    g.save(f'{OUT}/s1/ground.png')
    objs = []
    for o in OBJS:
        o['img'].save(f"{OUT}/s1/obj_{o['id']}.png")
        objs.append(dict(id=o['id'], x=o['x'], y=o['y'], foot=o['foot'], w=o['img'].width, h=o['img'].height, block=[round(v) for v in o['block']] if o['block'] else None))
    layout = dict(size=[W, H], objects=objs,
                  bags={'move': dict(x=300, foot=194), 'coin': dict(x=452, foot=246)},
                  veggies=[dict(kind='tomato', x=356, foot=186, range=[330, 170, 392, 206]), dict(kind='carrot', x=108, foot=226, range=[96, 208, 136, 236])],
                  lizzy=dict(x=238, foot=158), sign=dict(x=30, foot=250),
                  pond=[18, 34, 166, 108], exits={'east': [470, 100, 480, 150], 'north': [270, 0, 320, 10], 'south': [30, 262, 80, 270]},
                  start=dict(x=60, y=250), paw_prints=[396, 70, 450, 120])
    json.dump(layout, open(f'{OUT}/s1/layout.json', 'w'), indent=1)
    print('world1 s1 ok', len(OBJS))
