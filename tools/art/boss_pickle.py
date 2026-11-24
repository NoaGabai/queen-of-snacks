"""Boss of world 2: the Pickle (החמוץ), two looks.
Phase 1: a tall bumpy pickle, smug and bossy, gold-rimmed glasses on a gold chain (his seal), one hand pushing them up,
         a dill sprig on top, angry brows.
Phase 2 "hot pickle": suddenly furious - no glasses (they lie cracked at his feet), bloodshot red eyes, gritted teeth,
         red flush rising from the top, vinegar fumes puffing, fists up.
Outputs: world2/boss_pickle_1.png, world2/boss_pickle_2.png  (+ zoom previews)
Standalone (only PIL + numpy) so it runs without the map scripts.
"""
import math, random
import numpy as np
from PIL import Image, ImageDraw

OL = (0x3A, 0x26, 0x18, 255)


def hx(s, a=255):
    s = s.lstrip('#'); return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


def R(*c): return [hx(x) for x in c]


PICKLE = R('C4D274', '8CA544', '5E7A2E', '3A4E1C')   # art-bible 3.5
HOT    = R('E2C86A', 'B0943E', '7E6A2C', '4E3E1A')   # phase 2: pickle skin pushed warm toward red
DILL   = R('D6EC98', '9CC456', '66923A', '3E6326')
UMBEL  = R('FFF2A0', 'F2D652', 'C9A93A')
GOLD   = R('FFE58A', 'E8B730', 'A07C26', '6E5214')
GLASS  = R('F2FBF6', 'C9E8DE', '93C6BA', '5E948C')
BROW = hx('22180C'); PUP = hx('1A140A'); EYE_W = hx('FFF8EC')
RED = R('FF8A72', 'E2231A', 'A8161A', '6A0E10')
FUME = (226, 236, 196)

W_, H_ = 128, 136


def new(w, h): return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def outline(img, col=OL):
    a = np.array(img); m = a[:, :, 3] > 0
    d = np.zeros_like(m); d[1:] |= m[:-1]; d[:-1] |= m[1:]; d[:, 1:] |= m[:, :-1]; d[:, :-1] |= m[:, 1:]
    a[d & ~m] = col
    return Image.fromarray(a)


def body_geom(phase):
    """Centre line and half-width per row: a tall pickle with a gentle S-curve and rounded ends."""
    top, bot = 22, H_ - 14
    cx0 = 62
    rows = {}
    for y in range(top, bot + 1):
        t = (y - top) / (bot - top)
        cx = cx0 + 5 * math.sin(t * math.pi * 1.1 - .3) - (2 if phase == 2 else 0) * (1 - t)
        prof = (1 - abs(2 * t - 1) ** 2.6) ** .55          # rounded ends, nearly straight sides
        hw = 30 * prof + 3 * math.sin(t * 9.0) * prof          # gentle lumpy silhouette
        if hw > .8: rows[y] = (cx, hw)
    return rows


def boss(phase=1):
    rnd = random.Random(7 + phase)
    ramp = PICKLE
    im = new(W_, H_); px = im.load()
    rows = body_geom(phase)
    ys = sorted(rows); top, bot = ys[0], ys[-1]
    mask = np.zeros((H_, W_), bool)
    # --- body: per-pixel lighting from the top-left (4-tone ramp, ordered dither between bands)
    for y in ys:
        cx, hw = rows[y]; t = (y - top) / (bot - top)
        for x in range(int(cx - hw), int(cx + hw) + 1):
            u = (x - cx) / hw
            if abs(u) > 1: continue
            mask[y, x] = True
            v = -u * .95 + (.35 - t) * .7 + (.25 if u < -.45 else 0)
            if u > .78: v -= .6
            dth = ((x + y) % 2) * .12
            if v + dth > .9: c = ramp[0]
            elif v + dth > -.35: c = ramp[1]
            elif v + dth > -.95: c = ramp[2]
            else: c = ramp[3]
            if phase == 2:   # red flush rising from the top (anger)
                f = min(.8, max(0, .46 - t) * 2.2)
                if f > 0:
                    c = tuple(int(c[i] * (1 - f) + RED[1][i] * f) for i in range(3)) + (255,)
            px[x, y] = c
    d = ImageDraw.Draw(im)
    # long soft ridges along the body
    for k, off in enumerate((-.5, .1, .62)):
        for y in range(top + 10, bot - 8):
            cx, hw = rows[y]; x = round(cx + off * hw + math.sin(y / 11 + k) * 1.2)
            if mask[y, x] and (y + k) % 3: px[x, y] = ramp[2] if off > 0 else ramp[1]
    # warts / bumps (the bumpy pickle skin), skip the face area
    face_y = top + 34
    bumps = 0
    while bumps < 46:
        y = rnd.randint(top + 6, bot - 6); cx, hw = rows[y]
        x = round(cx + rnd.uniform(-.85, .85) * hw)
        if abs(y - face_y) < 22 and abs(x - cx) < 22: continue
        if not (mask[y - 1, x - 1] and mask[y + 2, x + 2]): continue
        u = (x - cx) / hw; lit = u < .2
        hi = ramp[0] if lit else ramp[1]
        px[x, y] = hi; px[x + 1, y] = hi if lit else ramp[2]; px[x, y + 1] = ramp[2]; px[x + 1, y + 1] = ramp[3] if not lit else ramp[2]
        if rnd.random() < .4: px[x - 1, y] = ramp[1]
        bumps += 1
    # wet shine streak down the lit side
    for y in range(top + 12, top + 52):
        cx, hw = rows[y]; x = round(cx - hw * .62)
        if (y // 3) % 4 != 3: px[x, y] = hx('EEF3C0') if phase == 1 else hx('FFF0B0')
    # stem nub at the top
    tcx, _ = rows[top + 2]
    d.rectangle((tcx - 2, top - 5, tcx + 2, top + 1), fill=hx('7E8A3A')); d.point((tcx - 2, top - 5), hx('A6B456'))
    # --- dill sprig plume on top (frazzled in phase 2)
    plume = []
    for k, (ang, ln) in enumerate(((-2.2, 12), (-1.75, 16), (-1.35, 14), (-1.0, 11))):
        if phase == 2: ang += (-.5 if k < 2 else .6)
        sx, sy = tcx + 1, top - 4
        pts = []
        for j in range(ln):
            bend = .02 * j * (1 if k > 1 else -1)
            x = sx + math.cos(ang + bend) * j; y = sy + math.sin(ang + bend) * j
            pts.append((x, y))
            d.point((round(x), round(y)), DILL[2])
            if j > 3 and j % 2 == 0:
                for s in (-1, 1):
                    nx = x + math.cos(ang + s * 1.2) * 3; ny = y + math.sin(ang + s * 1.2) * 3
                    d.line((x, y, nx, ny), fill=DILL[1] if j < ln - 4 else DILL[0])
        plume.append(pts[-1])
    if phase == 1:
        ex, ey = plume[1]
        for k in range(7):
            a = math.pi + k / 6 * math.pi; ux, uy = ex + 7 * math.cos(a), ey - 2 + 4 * math.sin(a)
            d.line((ex, ey + 1, ux, uy), fill=DILL[2]); d.ellipse((ux - 1.5, uy - 1.5, ux + 1.5, uy + 1), fill=UMBEL[1]); d.point((round(ux - 1), round(uy - 1)), UMBEL[0])
    # --- stubby legs + feet
    for sx in (-1, 1):
        lx = round(rows[bot - 4][0] + sx * 11)
        d.rectangle((lx - 3, bot - 2, lx + 3, bot + 8), fill=ramp[2]); d.line((lx - 3, bot - 2, lx - 3, bot + 8), fill=ramp[1])
        d.ellipse((lx - 6 + sx * 2, bot + 6, lx + 6 + sx * 2, bot + 12), fill=ramp[2]); d.line((lx - 4 + sx * 2, bot + 7, lx + 2 + sx * 2, bot + 7), fill=ramp[1])
    # --- arms
    ay = top + 64; L = rows[ay]; lx, rx = L[0] - L[1], L[0] + L[1]
    if phase == 1:
        # left arm on the hip (akimbo), right arm up, finger pushing the glasses up the nose
        d.line((lx + 1, ay, lx - 10, ay + 10), fill=ramp[2], width=5); d.line((lx - 10, ay + 10, lx - 1, ay + 20), fill=ramp[2], width=5)
        d.line((lx + 1, ay - 1, lx - 9, ay + 8), fill=ramp[1], width=2)
        d.ellipse((lx - 4, ay + 16, lx + 4, ay + 24), fill=ramp[1])
    else:
        # both fists raised, shaking
        for sx, base_x in ((-1, lx + 1), (1, rx - 1)):
            ex_, ey_ = base_x + sx * 13, ay - 8
            fx, fy = base_x + sx * 10, ay - 24
            d.line((base_x, ay, ex_, ey_), fill=ramp[2], width=5); d.line((ex_, ey_, fx, fy), fill=ramp[2], width=5)
            d.line((base_x, ay - 1, ex_, ey_ - 1), fill=ramp[1], width=2)
            d.ellipse((fx - 6, fy - 6, fx + 6, fy + 5), fill=ramp[1]); d.ellipse((fx - 5, fy - 6, fx + 1, fy - 1), fill=ramp[0])
            for k in range(3): d.line((fx - 4 + k * 3, fy + 1, fx - 4 + k * 3, fy + 3), fill=ramp[3])
    # --- face
    fcx = round(rows[face_y][0]); ey = face_y
    if phase == 1:
        for sx in (-1, 1):
            ex_ = fcx + sx * 11
            d.ellipse((ex_ - 6, ey - 5, ex_ + 6, ey + 5), fill=EYE_W)
            d.rectangle((ex_ - 2 + sx, ey - 2, ex_ + 2 + sx, ey + 3), fill=PUP); d.point((ex_ - 1 + sx, ey - 1), EYE_W)
            d.line((ex_ - 6, ey - 4, ex_ + 6, ey - 4), fill=ramp[3])                       # heavy half-lid: smug
            d.line((ex_ - 5, ey - 3, ex_ + 5, ey - 3), fill=ramp[2])
            ix, ox = ex_ - sx * 7, ex_ + sx * 8
            d.polygon([(ox, ey - 13), (ix, ey - 8), (ix, ey - 5), (ox, ey - 10)], fill=BROW)
        # smug lopsided frown
        my = ey + 16
        d.line((fcx - 9, my + 1, fcx - 3, my - 1), fill=ramp[3], width=2); d.line((fcx - 3, my - 1, fcx + 7, my + 2), fill=ramp[3], width=2)
        d.point((fcx + 8, my + 3), ramp[3])
    else:
        for sx in (-1, 1):
            ex_ = fcx + sx * 11
            d.ellipse((ex_ - 7, ey - 6, ex_ + 7, ey + 6), fill=hx('FFE2DA'))
            d.ellipse((ex_ - 4, ey - 4, ex_ + 4, ey + 4), fill=RED[1]); d.ellipse((ex_ - 2, ey - 2, ex_ + 2, ey + 2), fill=RED[3])
            d.point((ex_ - 2, ey - 2), hx('FFFFFF')); d.point((ex_ - 1, ey - 2), RED[0])
            for vx, vy in ((-6, 0), (-5, 2), (6, -1), (5, 2), (-4, -4)):      # bloodshot veins
                d.point((ex_ + vx * sx, ey + vy), RED[2])
            ix, ox = ex_ - sx * 6, ex_ + sx * 9
            d.polygon([(ox, ey - 16), (ix, ey - 7), (ix, ey - 4), (ox, ey - 12)], fill=BROW)
        # gritted teeth, wide snarl
        my = ey + 14
        d.rounded_rectangle((fcx - 11, my, fcx + 11, my + 9), 3, fill=hx('5A1414'))
        d.rectangle((fcx - 9, my + 2, fcx + 9, my + 7), fill=hx('FBF5E4'))
        d.line((fcx - 9, my + 4, fcx + 9, my + 4), fill=hx('C9BFA6'))
        for x in range(fcx - 6, fcx + 9, 4): d.line((x, my + 2, x, my + 7), fill=hx('C9BFA6'))
    img = outline(im)
    e = ImageDraw.Draw(img)
    if phase == 1:
        # --- gold glasses (his seal) + chain, drawn after the outline so they sit on top
        for sx in (-1, 1):
            gx = fcx + sx * 11
            e.ellipse((gx - 8, ey - 7, gx + 8, ey + 7), outline=OL, width=1)
            e.ellipse((gx - 7, ey - 6, gx + 7, ey + 6), outline=GOLD[1], width=2)
            e.arc((gx - 7, ey - 6, gx + 7, ey + 6), 200, 290, fill=GOLD[0], width=1)
            e.arc((gx - 7, ey - 6, gx + 7, ey + 6), 20, 110, fill=GOLD[2], width=1)
            e.line((gx - 3, ey - 3, gx - 1, ey - 5), fill=(255, 255, 255, 230))       # lens glint
            e.point((gx + 3, ey + 3), GLASS[1])
        e.line((fcx - 3, ey - 2, fcx + 3, ey - 2), fill=OL); e.line((fcx - 3, ey - 3, fcx + 3, ey - 3), fill=GOLD[1])  # bridge
        # chain: from each temple, drooping down the belly and round the sides
        for sx in (-1, 1):
            x0, y0 = fcx + sx * 19, ey - 1
            for k in range(30):
                t = k / 29; x = x0 + sx * 4 * math.sin(t * math.pi) - sx * t * 12; y = y0 + t * 44 + math.sin(t * math.pi) * 6
                if k % 2 == 0: e.point((round(x), round(y)), GOLD[1] if k % 4 else GOLD[0])
                else: e.point((round(x), round(y)), GOLD[2])
        # right hand up at the frame's side, holding the glasses (like adjusting them)
        tx_, ty_ = fcx + 20, ey + 2
        ex_, ey2 = rx + 9, ay - 8
        for a_, b_ in (((rx - 1, ay + 2), (ex_, ey2)), ((ex_, ey2), (tx_ + 3, ty_ + 4))):
            e.line((*a_, *b_), fill=OL, width=7)
        for a_, b_ in (((rx - 1, ay + 2), (ex_, ey2)), ((ex_, ey2), (tx_ + 3, ty_ + 4))):
            e.line((*a_, *b_), fill=ramp[2], width=5)
        e.line((rx, ay, ex_ - 1, ey2 + 1), fill=ramp[1], width=2)
        e.ellipse((tx_ - 3, ty_ - 3, tx_ + 7, ty_ + 7), fill=OL); e.ellipse((tx_ - 2, ty_ - 2, tx_ + 6, ty_ + 6), fill=ramp[1])
        e.point((tx_, ty_ - 1), ramp[0]); e.point((tx_ + 1, ty_ - 1), ramp[0])
        e.line((tx_ - 1, ty_ - 2, tx_ - 3, ty_ - 6), fill=OL, width=3); e.line((tx_ - 1, ty_ - 3, tx_ - 2, ty_ - 5), fill=ramp[0])
    else:
        # cracked glasses lying at his feet
        gx, gy = 30, H_ - 6
        for k, sx in enumerate((-1, 1)):
            cx_ = gx + sx * 6
            e.ellipse((cx_ - 5, gy - 3, cx_ + 5, gy + 3), outline=OL); e.ellipse((cx_ - 4, gy - 2, cx_ + 4, gy + 2), outline=GOLD[1])
        e.line((gx - 1, gy - 2, gx + 1, gy - 2), fill=GOLD[1])
        e.line((gx + 3, gy - 2, gx + 8, gy + 1), fill=(255, 255, 255, 220)); e.line((gx + 6, gy - 1, gx + 4, gy + 2), fill=(255, 255, 255, 220))
        e.line((gx - 11, gy, gx - 15, gy + 2), fill=GOLD[2]); e.line((gx + 11, gy, gx + 17, gy - 1), fill=GOLD[2])
        # vinegar fumes puffing off the top
        for x, y, r in ((tcx - 26, top + 4, 6), (tcx + 24, top - 2, 7), (tcx - 14, top - 14, 5), (tcx + 12, top - 18, 5), (tcx + 34, top + 14, 4)):
            e.ellipse((x - r, y - r * .8, x + r, y + r * .8), fill=FUME + (170,)); e.ellipse((x - r * .5, y - r * 1.3, x + r * .6, y - r * .2), fill=FUME + (130,))
            e.point((round(x - r * .4), round(y - r * .3)), (255, 255, 255, 200))
        # anger marks next to the head (the classic four-bracket vein)
        for bx, by in ((fcx + 31, ey - 24), (fcx - 33, ey - 20)):
            for qx, qy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
                pts = [(bx + qx * 2, by + qy * 5), (bx + qx * 2, by + qy * 2), (bx + qx * 5, by + qy * 2)]
                e.line(pts, fill=OL, width=3); e.line(pts, fill=RED[1], width=1)
    return img


if __name__ == '__main__':
    import os; os.makedirs('world2', exist_ok=True)
    b1, b2 = boss(1), boss(2)
    b1.save('world2/boss_pickle_1.png'); b2.save('world2/boss_pickle_2.png')
    z = Image.new('RGBA', (W_ * 2 + 12, H_ + 8), hx('A7A566')); z.alpha_composite(b1, (4, 4)); z.alpha_composite(b2, (W_ + 8, 4))
    z.resize((z.width * 4, z.height * 4), Image.NEAREST).save('pickle_zoom.png')
    print('ok', b1.getbbox(), b2.getbbox())


# =============================================================== BATTLE BACKGROUNDS (480x270)
def _gold_lid(d, x, y, rx, ry):
    """Floating gold jar lid used as a battle stage (slightly muted so the fighters stay on top)."""
    d.ellipse((x - rx - 2, y - ry + 5, x + rx + 2, y + ry + 6), fill=hx('497C6C'))            # dark water under it
    d.ellipse((x - rx, y - ry + 3, x + rx, y + ry + 3), fill=hx('8E7234'))
    d.ellipse((x - rx, y - ry, x + rx, y + ry), fill=hx('C9A24A'))
    d.ellipse((x - rx + 5, y - ry + 2, x + rx - 5, y + ry - 2), fill=hx('E6C766'))
    d.ellipse((x - rx * .7, y - ry + 3, x - rx * .05, y - ry * .2), fill=hx('F2DC8E'))
    for k in range(36):   # ridged rim
        a = k / 36 * math.tau
        if math.sin(a) > -.2:
            px_, py_ = x + (rx - 2) * math.cos(a), y + (ry - 1) * math.sin(a) + 2
            d.point((round(px_), round(py_)), hx('A88A3C'))
    # engraved glasses seal on the lid (very faint)
    for sx in (-1, 1): d.ellipse((x + sx * 7 - 5, y - 3, x + sx * 7 + 5, y + 3), outline=hx('D2B05A'))
    d.line((x - 2, y - 1, x + 2, y - 1), fill=hx('D2B05A'))
    d.line((x - rx - 6, y + ry + 5, x + rx + 6, y + ry + 5), fill=hx('DCEBD6'))                # foam ring


def _pickle_slice(d, x, y, rx, ry):
    """Giant pickle slice used as a stage inside the jar."""
    d.ellipse((x - rx, y - ry + 4, x + rx, y + ry + 4), fill=hx('5E7A2E'))
    d.ellipse((x - rx, y - ry, x + rx, y + ry), fill=hx('8CA544'))
    d.ellipse((x - rx + 5, y - ry + 3, x + rx - 5, y + ry - 3), fill=hx('DCE6A6'))
    d.ellipse((x - rx + 18, y - ry + 6, x + rx - 18, y + ry - 6), fill=hx('C8D88E'))
    for k in range(10):
        a = k / 10 * math.tau
        d.ellipse((x + (rx - 26) * math.cos(a) - 2, y + (ry - 7) * math.sin(a) - 1, x + (rx - 26) * math.cos(a) + 2, y + (ry - 7) * math.sin(a) + 1), fill=hx('EEF3CC'))


def background(kind='swamp'):
    W, H = 480, 270
    im = Image.new('RGBA', (W, H)); d = ImageDraw.Draw(im); rnd = random.Random(5)
    if kind == 'swamp':
        for y in range(120):   # misty sky
            t = y / 120; d.line((0, y, W, y), fill=(int(206 + 24 * t), int(226 + 14 * t), int(212 + 14 * t), 255))
        # far: giant jars + dill reeds as soft silhouettes
        for x, h, w in ((52, 70, 44), (410, 84, 52), (300, 46, 30)):
            d.rounded_rectangle((x - w // 2, 118 - h, x + w // 2, 118), 6, fill=hx('BCD6C8'))
            d.rectangle((x - w // 2 + 3, 118 - h - 6, x + w // 2 - 3, 118 - h + 1), fill=hx('D6CFA2'))
            d.line((x - w // 2 + 4, 122 - h, x - w // 2 + 4, 112), fill=hx('D4E6DA'))
        for x in (110, 124, 136, 196, 214, 250, 346, 360, 466):
            top = 40 + (x * 13) % 34
            d.line((x, top, x + 2, 118), fill=hx('AFC9A4'), width=2)
            for k in range(6):
                a = math.pi + k / 5 * math.pi; d.point((round(x + 6 * math.cos(a)), round(top + 2 * math.sin(a))), hx('D9DDA8'))
        # fog band on the horizon
        for k in range(14):
            x = rnd.randrange(-20, W); w = rnd.randrange(50, 110)
            d.ellipse((x, 98 + rnd.randrange(0, 12), x + w, 122 + rnd.randrange(0, 8)), fill=hx('E8F1E8'))
        # brine (quiet, lighter than the map)
        for y in range(116, H):
            t = (y - 116) / (H - 116); d.line((0, y, W, y), fill=(int(150 - 34 * t), int(196 - 30 * t), int(176 - 26 * t), 255))
        for _ in range(70):
            x, y = rnd.randrange(W), rnd.randrange(124, H); ln = rnd.choice((6, 10, 14))
            d.line((x, y, x + ln, y), fill=hx('B6DAC2')); d.line((x + 2, y + 1, x + ln - 2, y + 1), fill=hx('7AAE96'))
        for x, y in ((40, 150), (200, 146), (250, 236), (440, 200), (300, 172)):   # floating cucumber slices
            d.ellipse((x - 9, y - 4, x + 9, y + 5), fill=hx('6E9A58')); d.ellipse((x - 9, y - 5, x + 9, y + 3), fill=hx('DDE8B4'))
            d.ellipse((x - 5, y - 3, x + 5, y + 1), fill=hx('C9DC9A'))
        _gold_lid(d, 360, 126, 62, 13); _gold_lid(d, 100, 202, 72, 14)
    else:   # 'jar': inside the boss's giant jar
        for y in range(H):
            t = y / H; d.line((0, y, W, y), fill=(int(206 - 50 * t), int(232 - 38 * t), int(214 - 40 * t), 255))
        ov = Image.new('RGBA', (W, H)); o = ImageDraw.Draw(ov)
        for k in range(5):   # light shafts from the mouth of the jar
            x0 = 120 + k * 70
            o.polygon([(x0, 0), (x0 + 22, 0), (x0 - 30, 200), (x0 - 64, 200)], fill=(255, 248, 214, 26))
        for side in (0, 1):  # curved glass walls on both sides
            for k in range(22):
                x = k if side == 0 else W - 1 - k
                o.line((x, 14, x, H), fill=(240, 252, 246, int(110 * (1 - k / 22) ** 2)))
            hx0 = 12 if side == 0 else W - 15
            o.line((hx0, 30, hx0, 230), fill=(255, 255, 255, 110)); o.line((hx0 + 3, 40, hx0 + 3, 150), fill=(255, 255, 255, 60))
        im.alpha_composite(ov); d = ImageDraw.Draw(im)
        # the gold lid seen from inside, along the top: threads
        d.rectangle((0, 0, W, 12), fill=hx('A07C26')); d.rectangle((0, 0, W, 4), fill=hx('C9A24A'))
        for x in range(0, W, 6): d.line((x, 5, x + 3, 12), fill=hx('7E621E'))
        d.line((0, 13, W, 13), fill=hx('6E5214'))
        # far pickles floating in the brine + dill sprigs
        for x, y, w, ang in ((70, 70, 30, .3), (420, 60, 34, -.25), (210, 40, 22, .1), (300, 90, 26, -.4)):
            pts = []
            for k in range(20):
                t = k / 19 * math.tau; px_, py_ = w * math.cos(t) * .5, w * .18 * math.sin(t) * 1.2
                pts.append((x + px_ * math.cos(ang) - py_ * math.sin(ang), y + px_ * math.sin(ang) + py_ * math.cos(ang)))
            d.polygon(pts, fill=hx('A7C08C'))
        for x, y in ((160, 100), (380, 120), (40, 140)):
            d.line((x, y, x + 14, y - 8), fill=hx('9CB884'))
            for k in range(4): d.line((x + 3 + k * 3, y - 2 - k * 2, x + 6 + k * 3, y - 6 - k * 2), fill=hx('B4CC98'))
        # jar floor: settled brine sediment, a few muted peppercorns
        for y in range(160, H):
            t = (y - 160) / (H - 160); d.line((0, y, W, y), fill=(int(168 - 18 * t), int(196 - 20 * t), int(170 - 18 * t), 255))
        d.line((0, 160, W, 160), fill=hx('C6DECC'))
        for _ in range(16):
            x, y = rnd.randrange(W), rnd.randrange(166, H); r = rnd.choice((2, 3))
            d.ellipse((x - r, y - r, x + r, y + r), fill=hx('8E8270')); d.point((x - 1, y - 1), hx('A89C88'))
        ov = Image.new('RGBA', (W, H)); o = ImageDraw.Draw(ov)
        for _ in range(26):   # rising bubbles
            x, y, r = rnd.randrange(30, W - 30), rnd.randrange(30, 220), rnd.choice((1, 2, 2, 3))
            o.ellipse((x - r, y - r, x + r, y + r), outline=(236, 250, 244, 170)); o.point((x - r // 2, y - r // 2), (255, 255, 255, 210))
        im.alpha_composite(ov); d = ImageDraw.Draw(im)
        _pickle_slice(d, 360, 128, 66, 13); _pickle_slice(d, 100, 202, 76, 14)
    return im
