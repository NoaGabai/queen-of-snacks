"""Boss of world 1: the Great Green Onion (הבצל הירוק הגדול), two looks + the two world-1 battle backgrounds.
מקור: assets/boss_onion.py משיחת העיצוב (ללא שינוי בציור; הוסרו קובצי התצוגה המקדימה).
Outputs: world1/boss_onion_1.png, boss_onion_2.png, bg_garden.png, bg_plaza.png
"""
import math, random
import numpy as np
from PIL import Image, ImageDraw
from world1 import hx, R, ONION, BULB, ROMAINE, LETTUCE, CUKE_S, CUKE_F, SOIL, new, outline

GOLD = R('FFE58A', 'E8B730', 'A07C26', '6E5214')
CHIVE = R('E6C8F2', 'C08AE0', '8C58B8', '5E3488')
EYE = hx('2A1A10')


def boss(phase=1):
    W_, H_ = 124, 136
    im = new(W_, H_); d = ImageDraw.Draw(im)
    rnd = random.Random(4)
    cx, base = 62, H_ - 6
    # --- mohawk of leaves (behind the bulb)
    leaves = [(-16, 92, -0.30), (-8, 106, -0.14), (0, 114, 0.0), (8, 106, 0.14), (16, 94, 0.30), (-22, 78, -0.45), (22, 80, 0.45)]
    for dx, hgt, lean in leaves:
        if phase == 2: lean *= 2.2; hgt *= .86            # frazzled, flopping
        top_y = base - 52 - hgt * .62; x0 = cx + dx * .55
        for k in range(60):
            t = k / 59; y = base - 50 - (base - 50 - top_y) * t
            x = x0 + lean * 40 * t * t + (math.sin(t * 9) * 1.2 if phase == 2 else 0)
            w = 4.2 * (1 - t * .75)
            d.ellipse((x - w, y - 2, x + w, y + 2), fill=ONION[1])
            d.point((round(x - w + 1), round(y)), ONION[0]); d.point((round(x + w - 1), round(y)), ONION[2])
        d.point((round(x0 + lean * 40), round(top_y) - 1), ONION[3])
    # --- neck
    d.rounded_rectangle((cx - 13, base - 74, cx + 13, base - 44), 6, fill=ONION[1])
    d.rectangle((cx - 13, base - 74, cx - 9, base - 44), fill=ONION[0]); d.rectangle((cx + 8, base - 74, cx + 13, base - 44), fill=ONION[2])
    for y in range(base - 70, base - 46, 5): d.line((cx - 6, y, cx + 6, y + 1), fill=ONION[0])
    # --- bulb
    body = BULB if phase == 1 else R('FFE4DC', 'F6C2B4', 'DE9A88', 'B06C5C')
    d.ellipse((cx - 40, base - 62, cx + 40, base - 2), fill=body[2])
    d.ellipse((cx - 40, base - 64, cx + 38, base - 6), fill=body[1])
    d.ellipse((cx - 32, base - 60, cx + 8, base - 26), fill=body[0])
    for k in (-24, -10, 6, 20):   # papery onion lines
        d.arc((cx + k - 26, base - 62, cx + k + 26, base - 4), 70 if k < 0 else 100, 110 if k < 0 else 140, fill=body[2])
    # --- roots: little legs + the famous root moustache
    for rx in (-22, -12, -2, 8, 18):
        x = cx + rx
        for k in range(6): d.point((x + (k % 2) * (1 if rx < 0 else -1), base - 4 + k), BULB[3])
    # --- face
    ey = base - 40
    if phase == 1:
        for sx in (-1, 1):
            ex = cx + sx * 13
            d.ellipse((ex - 6, ey - 5, ex + 6, ey + 5), fill=hx('FFFFFF')); d.ellipse((ex - 3 + sx, ey - 3, ex + 3 + sx, ey + 3), fill=EYE)
            d.point((ex - 1 + sx, ey - 2), hx('FFFFFF'))
            ix, ox = ex - sx * 8, ex + sx * 9
            d.polygon([(ox, ey - 14), (ix, ey - 7), (ix, ey - 4), (ox, ey - 11)], fill=hx('3A2A20'))   # angry brows: inner ends down
        d.arc((cx - 9, ey + 15, cx + 9, ey + 23), 200, 340, fill=hx('7A3A2A'), width=2)   # frown
    else:
        for sx in (-1, 1):
            ex = cx + sx * 13
            d.line((ex - 6, ey + 1, ex + 6, ey - 1 if sx < 0 else ey + 1), fill=EYE, width=2)   # squeezed shut
            ix, ox = ex - sx * 8, ex + sx * 9
            d.polygon([(ox, ey - 16), (ix, ey - 6), (ix, ey - 3), (ox, ey - 13)], fill=hx('3A2A20'))
        d.ellipse((cx - 9, ey + 11, cx + 9, ey + 25), fill=hx('7A2A2A')); d.ellipse((cx - 6, ey + 17, cx + 6, ey + 24), fill=hx('E8707A'))   # wailing
        for x in (cx - 7, cx - 3, cx + 1, cx + 5): d.point((x, ey + 12), hx('FFFFFF'))
        for sx in (-1, 1):   # cheek flush
            d.ellipse((cx + sx * 24 - 5, ey + 4, cx + sx * 24 + 5, ey + 9), fill=hx('F08A8A'))
    # root moustache under the nose (curly beige strands)
    mo_y = ey + 10
    for sx in (-1, 1):
        for k in range(9):
            t = k / 8; x = cx + sx * (2 + t * 16); y = mo_y + math.sin(t * math.pi) * 4 - t * (6 if phase == 1 else -2)
            d.ellipse((x - 1.6, y - 1.2, x + 1.6, y + 1.2), fill=BULB[3] if k % 2 else hx('C9B48A'))
    d.ellipse((cx - 3, ey + 4, cx + 3, ey + 9), fill=body[2])   # nose
    # --- arms (thin leaves) + chive-blossom sceptre
    d.line((cx - 38, base - 34, cx - 52, base - 46), fill=ONION[2], width=4); d.ellipse((cx - 56, base - 50, cx - 48, base - 42), fill=ONION[1])
    d.line((cx + 38, base - 34, cx + 50, base - 40), fill=ONION[2], width=4); d.ellipse((cx + 47, base - 44, cx + 55, base - 36), fill=ONION[1])
    d.line((cx + 51, base - 30, cx + 54, base - 96), fill=ONION[2], width=3)
    for k in range(26):
        a = rnd.random() * math.tau; r = rnd.random() * 9
        x, y = cx + 55 + r * math.cos(a), base - 102 + r * math.sin(a) * .9
        d.ellipse((x - 2, y - 2, x + 2, y + 2), fill=CHIVE[k % 3])
    # --- tiny gold crown, perched on the top of the bulb (tilted when crying)
    crx, cry = cx - 4 + (6 if phase == 2 else 0), base - 70
    pts = [(-10, 0), (-10, -9), (-5, -4), (0, -11), (5, -4), (10, -9), (10, 0)]
    tilt = .25 if phase == 2 else 0
    P = [(crx + x * math.cos(tilt) - y * math.sin(tilt), cry + x * math.sin(tilt) + y * math.cos(tilt)) for x, y in pts]
    d.polygon(P, fill=GOLD[1]); d.line([P[0], P[-1]], fill=GOLD[2], width=2); d.point((round(P[3][0]), round(P[3][1]) + 3), hx('E2231A'))
    img = outline(im)
    if phase == 2:   # tears + steam drawn after the outline so they read as effects
        e = ImageDraw.Draw(img)
        for sx in (-1, 1):
            x0 = cx + sx * 19
            for k in range(9):          # a stream down each cheek, ending in drops that fly off
                x = x0 + sx * (k * .8); y = ey + 3 + k * 4
                e.rectangle((round(x) - 1, round(y), round(x) + 1, round(y) + 4), fill=hx('8FD0F2')); e.point((round(x) - 1, round(y)), hx('DDF2FF'))
            for k, (dx, dy) in enumerate(((10, 30), (16, 24), (20, 34))):
                x, y = x0 + sx * dx, ey + dy; e.ellipse((x - 2, y - 2, x + 2, y + 3), fill=hx('8FD0F2')); e.point((x - 1, y - 1), hx('FFFFFF'))
        for x, y in ((cx - 30, base - 88), (cx + 26, base - 92), (cx - 20, base - 98)):
            e.ellipse((x - 5, y - 4, x + 5, y + 4), fill=(255, 255, 255, 170)); e.ellipse((x - 2, y - 7, x + 4, y - 2), fill=(255, 255, 255, 140))
    return img


def lettuce_cloud(d, cx, cy, w, h, seed):
    rnd = random.Random(seed)
    L0, L1, L2 = hx('F6FBE4'), hx('E6F3C4'), hx('D4E9A8')
    d.ellipse((cx - w / 2, cy - h / 2 + 3, cx + w / 2, cy + h / 2 + 3), fill=L2)
    d.ellipse((cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), fill=L1)
    for k in range(int(w / 5)):   # ruffled lettuce edge
        a = k / (w / 5) * math.tau; x = cx + w / 2 * .95 * math.cos(a); y = cy + h / 2 * .9 * math.sin(a)
        r = 3 + rnd.random() * 2; d.ellipse((x - r, y - r * .8, x + r, y + r * .8), fill=L1 if math.sin(a) < .2 else L2)
    d.ellipse((cx - w * .3, cy - h * .3, cx + w * .1, cy + h * .05), fill=L0)
    for k in range(4):   # soft veins
        a = -math.pi / 2 + (k - 1.5) * .5
        d.line((cx, cy + h * .25, cx + w * .38 * math.cos(a), cy + h * .4 * math.sin(a)), fill=L0)


def background(kind='garden'):
    W_, H_ = 480, 270
    im = Image.new('RGBA', (W_, H_)); d = ImageDraw.Draw(im)
    for y in range(120):
        t = y / 120; d.line((0, y, W_, y), fill=(int(191 + 30 * t), int(230 + 11 * t), int(242 - 6 * t), 255))
    for i, (x, y, w, h) in enumerate(((70, 26, 86, 30), (250, 44, 110, 34), (420, 20, 70, 24), (160, 74, 60, 18))):
        lettuce_cloud(d, x, y, w, h, i)
    # distant giant salad plants, muted so they stay quiet
    far = hx('B9D6A8'); far2 = hx('A9CB98')
    for x, r in ((30, 34), (120, 26), (330, 40), (452, 30)): d.ellipse((x - r, 112 - r * .9, x + r, 118), fill=far)
    for x in (190, 206, 214, 286, 296, 398, 408):
        top = 46 + (x * 7) % 26; d.rectangle((x - 2, top, x + 2, 116), fill=far2); d.ellipse((x - 4, 108, x + 4, 118), fill=hx('DCE6CC'))
    if kind == 'plaza':   # the onion gate behind the boss, as a soft silhouette
        g = hx('A3C690')
        for px in (300, 420):
            for k in range(4): d.rectangle((px - 8 + k * 5, 30, px - 6 + k * 5, 116), fill=g)
        for t in np.linspace(0, 1, 80):
            x = 302 + 116 * t; y = 34 - math.sin(t * math.pi) * 12; d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=g)
        d.ellipse((352, 8, 368, 22), fill=hx('E6EADA'))
    # ground: soft garden soil
    d.rectangle((0, 116, W_, H_), fill=hx('C9A27C'))
    rng = random.Random(2)
    for _ in range(140): x, y = rng.randrange(W_), rng.randrange(122, H_); d.point((x, y), hx('B48C66') if rng.random() < .7 else hx('D8B892'))
    if kind == 'plaza':   # cucumber-slice paving
        for (x, y) in ((40, 150), (110, 140), (200, 150), (90, 210), (170, 238), (430, 220), (300, 250), (460, 150)):
            d.ellipse((x - 16, y - 7, x + 16, y + 8), fill=hx('9CBF7E')); d.ellipse((x - 16, y - 8, x + 16, y + 6), fill=hx('D9EAB8'))
            d.ellipse((x - 11, y - 5, x + 11, y + 3), fill=hx('E8F2CE'))
    # platforms: big cucumber slices for Mai and the enemy
    def plat(x, y, rx, ry):
        d.ellipse((x - rx, y - ry + 3, x + rx, y + ry + 3), fill=hx('5E8A48'))
        d.ellipse((x - rx, y - ry, x + rx, y + ry), fill=hx('7EA860'))
        d.ellipse((x - rx + 5, y - ry + 3, x + rx - 5, y + ry - 3), fill=hx('DCEDB8'))
        d.ellipse((x - rx + 18, y - ry + 6, x + rx - 18, y + ry - 6), fill=hx('C9E09E'))
        for k in range(10):
            a = k / 10 * math.tau; d.ellipse((x + (rx - 26) * math.cos(a) - 2, y + (ry - 7) * math.sin(a) - 1, x + (rx - 26) * math.cos(a) + 2, y + (ry - 7) * math.sin(a) + 1), fill=hx('F2F8E2'))
    plat(360, 126, 66, 13); plat(100, 202, 76, 14)
    return im


if __name__ == '__main__':
    boss(1).save('world1/boss_onion_1.png'); boss(2).save('world1/boss_onion_2.png')
    background('garden').save('world1/bg_garden.png'); background('plaza').save('world1/bg_plaza.png')
    print('boss_onion ok')
