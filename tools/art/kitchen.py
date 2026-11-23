"""Mom's kitchen + balcony (3/4 top-down), 480x270, built as separate layers.
מקור: assets/kitchen.py משיחת העיצוב. שינוי בפיתוח: התמונות לקיר נקראות מ-assets/photos/
(אם אין שם תמונות – מסגרות זמניות בצבעים רכים, והמשחק מסתיר את חלון התמונות).

Outputs (in ./kitchen/, run from assets/):
  room.png            walls, floor, fixed furniture, balcony (no decor, no characters)
  <decor>.png         each buyable decoration, drawn in place on a 480x270 transparent layer
  <decor>_ghost.png   the dashed "empty spot" silhouette for that decoration
  snack_<n>.png / snack_slot_<n>.png   legendary-snack shelf items and their empty slots
  mai_map.png, irit_map.png, lizzy_sleep_map.png   map-scale characters (24x36 / 18x12)
  layout.json         positions + hit boxes
"""
import json, os, math, random, glob
import numpy as np
from PIL import Image, ImageDraw

W, H = 480, 270
OUT = 'kitchen'
OL = (0x3A, 0x26, 0x18, 255)


def hx(s, a=255):
    s = s.lstrip('#'); return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), a)


def ramp(*cs): return [hx(c) for c in cs]


WOOD  = ramp('E2AE74', 'C08650', '93612F', '623E1D')
SAGE  = ramp('B4C8A0', '93AD82', '748F66', '55704C')
CREAM = ramp('FBF5E8', 'EFE6D2', 'D3C6A8', 'A89A7C')
MARBLE = ramp('FAF9F5', 'E8E6DF', 'CFCBC0', 'A8A396')
DARK  = ramp('5A5350', '3E3834', '2C2724', '1C1816')
LEAF  = ramp('9CD060', '5E9A34', '3E7024', '264A16')
DECK  = ramp('D6AE7E', 'BF9465', 'A27A4F', '7C5A38')
WALL  = hx('F2E2C2'); WALL_SH = hx('E6D2AC'); WALL_HI = hx('F8EBD2')

os.makedirs(OUT, exist_ok=True)


def new(): return Image.new('RGBA', (W, H), (0, 0, 0, 0))


def outline(img, col=OL):
    a = np.array(img)
    m = a[:, :, 3] > 0
    d = np.zeros_like(m)
    d[1:, :] |= m[:-1, :]; d[:-1, :] |= m[1:, :]; d[:, 1:] |= m[:, :-1]; d[:, :-1] |= m[:, 1:]
    e = d & ~m
    a[e] = col
    return Image.fromarray(a)


def box(d, x0, y0, x1, y1, r, top=6, side=True):
    """3/4 furniture block against the wall: lighter top face + shaded front."""
    d.rectangle((x0, y0, x1, y0 + top - 1), fill=r[0])           # top face
    d.rectangle((x0, y0 + top, x1, y1), fill=r[1])               # front
    d.line((x0, y0 + top, x1, y0 + top), fill=r[2])              # top edge shadow
    if side: d.rectangle((x1 - 1, y0 + top, x1, y1), fill=r[2])  # right edge
    d.line((x0, y1, x1, y1), fill=r[3])


def shadow(img, cx, cy, rx, ry, a=60):
    s = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(s)
    sd.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(58, 38, 24, a))
    return Image.alpha_composite(img, s)


def dashed_rect(d, x0, y0, x1, y1, col, dash=2):
    for x in range(x0, x1 + 1):
        if (x // dash) % 2 == 0: d.point((x, y0), col); d.point((x, y1), col)
    for y in range(y0, y1 + 1):
        if (y // dash) % 2 == 0: d.point((x0, y), col); d.point((x1, y), col)


def sprite(rows, pal):
    h = len(rows); w = max(len(r) for r in rows)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); p = im.load()
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch in pal: p[x, y] = pal[ch]
    return im


# =============================================================== ROOM
def room():
    im = Image.new('RGBA', (W, H), hx('000000')); d = ImageDraw.Draw(im)
    KX = 352   # kitchen right wall (balcony starts after it)
    # ---- back wall
    d.rectangle((0, 0, KX, 100), fill=WALL)
    d.rectangle((0, 0, KX, 3), fill=hx('C9AE86'))                     # ceiling line
    d.rectangle((0, 4, KX, 5), fill=WALL_SH)
    for x in range(0, KX, 22):                                         # very soft wallpaper stripe
        d.line((x, 6, x, 92), fill=WALL_HI)
    # mint backsplash behind counter + oven
    d.rectangle((132, 44, 270, 66), fill=hx('CFE3DA'))
    for y in range(44, 67, 6): d.line((132, y, 270, y), fill=hx('B7D0C6'))
    for y in range(44, 66, 6):
        off = 0 if (y // 6) % 2 else 6
        for x in range(132 + off, 271, 12): d.line((x, y, x, y + 5), fill=hx('B7D0C6'))
    d.rectangle((0, 93, KX, 99), fill=WOOD[2]); d.line((0, 93, KX, 93), fill=WOOD[1])   # baseboard
    # ---- floor: warm checker tiles, quiet
    for ty in range(100, H, 16):
        for tx in range(0, KX, 16):
            c = hx('F1D7B4') if ((tx // 16 + ty // 16) % 2) else hx('E7C49B')
            d.rectangle((tx, ty, tx + 15, ty + 15), fill=c)
    fl = Image.new('RGBA', (W, H), (0, 0, 0, 0)); fd = ImageDraw.Draw(fl)
    for i in range(10): fd.line((0, 100 + i, KX, 100 + i), fill=(120, 80, 40, 46 - i * 4))   # contact shadow by wall
    im = Image.alpha_composite(im, fl); d = ImageDraw.Draw(im)
    # left wall edge (top view)
    d.rectangle((0, 0, 3, H), fill=hx('C9AE86'))

    # ---- wall clock + crown moulding (fills the now-taller free wall)
    d.rectangle((0, 18, KX, 19), fill=WALL_SH); d.line((0, 17, KX, 17), fill=WALL_HI)
    d.ellipse((288, 26, 302, 40), fill=CREAM[0]); d.ellipse((288, 26, 302, 40), outline=WOOD[2])
    d.line((295, 33, 295, 28), fill=DARK[2]); d.line((295, 33, 299, 33), fill=DARK[2])
    # ---- wardrobe (Mai's closet) x10..58, y60..112  (a bit taller than a person)
    box(d, 10, 60, 58, 112, WOOD, top=5)
    d.line((34, 65, 34, 111), fill=WOOD[3])
    for x0, x1 in ((14, 31), (37, 54)):
        d.rectangle((x0, 69, x1, 87), outline=WOOD[2]); d.rectangle((x0, 91, x1, 108), outline=WOOD[2])
        d.line((x0 + 1, 70, x1 - 1, 70), fill=WOOD[0]); d.line((x0 + 1, 92, x1 - 1, 92), fill=WOOD[0])
    d.rectangle((31, 88, 32, 89), fill=hx('E8B730')); d.rectangle((36, 88, 37, 89), fill=hx('E8B730'))
    for y, c in ((76, 'D6CCBA'), (77, 'D6CCBA'), (78, '60626C'), (79, '60626C'), (80, 'D6CCBA'), (81, '60626C')):   # hoodie sleeve peeking out
        d.line((34, y, 36, y), fill=hx(c))
    d.rectangle((15, 55, 31, 59), fill=hx('C9A27A')); d.rectangle((16, 53, 30, 55), fill=hx('E2C29A'))      # shoebox on top
    # ---- sideboard x64..128 (speaker + lava lamp sit on it)
    box(d, 64, 92, 128, 112, WOOD, top=4)
    d.rectangle((68, 99, 124, 109), outline=WOOD[2]); d.line((96, 99, 96, 109), fill=WOOD[2])
    d.rectangle((90, 103, 92, 104), fill=hx('E8B730')); d.rectangle((100, 103, 102, 104), fill=hx('E8B730'))
    # ---- mint backsplash
    d.rectangle((132, 70, 270, 86), fill=hx('CFE3DA'))
    for y in range(70, 87, 6): d.line((132, y, 270, y), fill=hx('B7D0C6'))
    for y in range(70, 86, 6):
        off = 0 if (y // 6) % 2 else 6
        for x in range(132 + off, 271, 12): d.line((x, y, x, y + 5), fill=hx('B7D0C6'))
    # ---- counter + sink x134..214 (waist height)
    box(d, 134, 86, 214, 112, MARBLE, top=6, side=False)
    d.rectangle((134, 92, 214, 112), fill=SAGE[1]); d.line((134, 92, 214, 92), fill=SAGE[3])
    for x0 in (136, 162, 188):
        d.rectangle((x0, 95, x0 + 23, 109), outline=SAGE[2]); d.line((x0 + 1, 96, x0 + 22, 96), fill=SAGE[0])
        d.rectangle((x0 + 10, 98, x0 + 13, 98), fill=hx('E8E6DF'))
    d.rectangle((134, 110, 214, 112), fill=SAGE[3])
    d.rounded_rectangle((158, 87, 186, 90), 1, fill=MARBLE[2]); d.line((159, 88, 185, 88), fill=MARBLE[3])
    d.rectangle((171, 81, 173, 87), fill=hx('9298A3')); d.rectangle((168, 80, 176, 81), fill=hx('CDD1D6'))
    # upper cabinets + window
    for x0 in (134, 196):
        d.rectangle((x0, 38, x0 + 18, 64), fill=SAGE[1]); d.rectangle((x0, 62, x0 + 18, 64), fill=SAGE[3])
        d.rectangle((x0 + 2, 41, x0 + 16, 59), outline=SAGE[2]); d.line((x0 + 3, 42, x0 + 15, 42), fill=SAGE[0])
        d.rectangle((x0 + 8, 57, x0 + 10, 58), fill=hx('E8E6DF'))
    d.rectangle((156, 36, 192, 68), fill=hx('F7F4EC'))
    d.rectangle((159, 39, 189, 65), fill=hx('A9D8EE'))
    d.rectangle((159, 56, 189, 65), fill=hx('BFE3D0'))
    d.ellipse((163, 43, 177, 48), fill=hx('EAF6F0'))
    d.line((174, 39, 174, 65), fill=hx('F7F4EC'))
    for x in range(159, 190, 3): d.line((x, 39, x, 45), fill=hx('F4C6C0') if (x // 3) % 2 else hx('FBE0DA'))
    d.rectangle((156, 68, 192, 70), fill=hx('E2D8C2'))
    d.rectangle((180, 63, 186, 68), fill=hx('C8734A')); d.ellipse((178, 58, 188, 64), fill=LEAF[1]); d.point((181, 59), LEAF[0])
    # ---- Irit's oven x220..268 (same height as the counter)
    d.polygon([(226, 38), (262, 38), (270, 58), (218, 58)], fill=CREAM[1])
    d.rectangle((218, 56, 270, 59), fill=CREAM[2]); d.line((226, 38, 262, 38), fill=CREAM[0])
    for x in range(226, 263, 4): d.line((x, 50, x, 54), fill=CREAM[3])
    box(d, 220, 84, 268, 112, CREAM, top=7)
    d.rectangle((220, 84, 268, 90), fill=DARK[1])
    for cx in (230, 258): d.ellipse((cx - 6, 85, cx + 6, 89), outline=DARK[3], fill=DARK[2])
    d.rectangle((250, 79, 266, 86), fill=hx('C25A3A')); d.rectangle((250, 79, 266, 80), fill=hx('E2805E')); d.rectangle((248, 81, 249, 82), fill=DARK[2])
    for i, x in enumerate((254, 258, 262)):
        for k in range(3): d.point((x + (k % 2), 75 - k * 2 - i), hx('FFFFFF', 150))
    for x in (228, 238, 250, 260): d.rectangle((x - 1, 92, x, 93), fill=DARK[1])
    d.rectangle((226, 95, 262, 95), fill=hx('CDD1D6'))
    d.rectangle((226, 97, 262, 110), fill=DARK[2]); d.rectangle((229, 99, 259, 108), fill=hx('B55A24'))
    d.rectangle((229, 99, 259, 100), fill=hx('F6A24A'))
    for x in (233, 242, 251):
        d.ellipse((x, 102, x + 6, 105), fill=hx('E0A45A')); d.line((x + 2, 103, x + 4, 104), fill=hx('5A3420'))
    # ---- legendary shelf x312..350
    for y in (62, 88):
        d.rectangle((312, y, 350, y + 3), fill=WOOD[1]); d.line((312, y, 350, y), fill=WOOD[0]); d.line((312, y + 3, 350, y + 3), fill=WOOD[3])
        for bx in (316, 346): d.polygon([(bx - 1, y + 4), (bx + 1, y + 4), (bx, y + 8)], fill=WOOD[3])
    d.rectangle((318, 32, 344, 40), fill=hx('2B2240')); d.rectangle((319, 33, 343, 39), outline=hx('E8B730'))
    for x, y in ((322, 35), (326, 34), (330, 35), (334, 34), (338, 35)): d.point((x, y), hx('F2C54A')); d.point((x, y + 2), hx('F2C54A'))

    # ---- dining area: rug, table, chairs
    rug = Image.new('RGBA', (W, H), (0, 0, 0, 0)); rd = ImageDraw.Draw(rug)
    rd.ellipse((146, 140, 254, 210), fill=hx('D9937A')); rd.ellipse((151, 144, 249, 206), outline=hx('E8B19A'))
    rd.ellipse((156, 148, 244, 202), outline=hx('C47E66'))
    im = Image.alpha_composite(im, rug)
    im = shadow(im, 200, 194, 38, 6)
    fur = Image.new('RGBA', (W, H), (0, 0, 0, 0)); f = ImageDraw.Draw(fur)
    for cx in (184, 216):   # back chairs
        f.rectangle((cx - 8, 132, cx + 8, 150), fill=WOOD[1]); f.rectangle((cx - 8, 132, cx + 8, 134), fill=WOOD[0])
        for x in range(cx - 6, cx + 7, 4): f.line((x, 136, x, 149), fill=WOOD[2])
    f.rectangle((166, 152, 234, 174), fill=WOOD[0]); f.rectangle((166, 175, 234, 180), fill=WOOD[2])
    f.line((166, 180, 234, 180), fill=WOOD[3])
    for x in range(170, 232, 9): f.line((x, 153, x + 3, 173), fill=hx('D9A46A'))
    for x in (169, 231): f.rectangle((x - 1, 181, x + 1, 194), fill=WOOD[2])
    # table things: plate of rugelach, tea glass, sugar bowl
    f.ellipse((174, 157, 200, 167), fill=hx('F7F4EC')); f.ellipse((177, 159, 197, 165), fill=hx('E8E2D2'))
    for x, y in ((180, 159), (187, 158), (184, 162), (191, 161)):
        f.ellipse((x, y, x + 6, y + 3), fill=hx('E0A45A')); f.point((x + 2, y + 1), hx('5A3420')); f.point((x + 4, y + 2), hx('5A3420'))
    f.rectangle((210, 157, 215, 165), fill=hx('C2662E')); f.rectangle((210, 157, 215, 158), fill=hx('E8E2D2'))
    f.ellipse((219, 159, 229, 165), fill=hx('F7F4EC')); f.ellipse((221, 158, 227, 161), fill=hx('FFFFFF'))
    fur = outline(fur); im = Image.alpha_composite(im, fur); d = ImageDraw.Draw(im)
    # ---- Lizzy's bed (bottom-left)
    im = shadow(im, 42, 230, 24, 5)
    bed = Image.new('RGBA', (W, H), (0, 0, 0, 0)); b = ImageDraw.Draw(bed)
    b.ellipse((18, 202, 66, 230), fill=hx('E59AAE')); b.ellipse((22, 205, 62, 226), fill=hx('F6C9D4'))
    b.ellipse((26, 208, 58, 224), fill=hx('FBE3E8'))
    bed = outline(bed); im = Image.alpha_composite(im, bed); d = ImageDraw.Draw(im)
    # plant in the corner by the balcony door
    im = shadow(im, 334, 132, 10, 3)
    pl = Image.new('RGBA', (W, H), (0, 0, 0, 0)); p = ImageDraw.Draw(pl)
    p.rectangle((327, 118, 341, 131), fill=hx('C8734A')); p.rectangle((327, 118, 341, 120), fill=hx('E0905E'))
    for ang in range(-80, 260, 40):
        r = math.radians(ang); x = 334 + int(10 * math.cos(r)); y = 108 + int(8 * math.sin(r))
        p.ellipse((x - 5, y - 3, x + 5, y + 3), fill=LEAF[1]); p.point((x - 2, y - 1), LEAF[0])
    p.ellipse((329, 102, 339, 112), fill=LEAF[2])
    pl = outline(pl); im = Image.alpha_composite(im, pl); d = ImageDraw.Draw(im)

    # ================= BALCONY x352..480
    d.rectangle((KX, 0, W, 100), fill=hx('A9D8EE'))
    sky = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sky)
    for y in range(0, 100):
        t = y / 100; sd.line((KX, y, W, y), fill=(int(169 + t * 60), int(216 + t * 20), int(238 - t * 10), 255))
    sd.ellipse((380, 18, 420, 30), fill=hx('F4FAF6')); sd.ellipse((440, 30, 470, 38), fill=hx('F4FAF6'))
    # far rooftops (soft, low contrast)
    for x0, x1, top, c in ((356, 392, 60, 'C9C2BC'), (388, 420, 52, 'BDB4AC'), (418, 452, 64, 'C9C2BC'), (448, 480, 56, 'B6ADA5')):
        sd.rectangle((x0, top, x1, 100), fill=hx(c))
        for wx in range(x0 + 4, x1 - 3, 7):
            for wy in range(top + 5, 96, 9): sd.rectangle((wx, wy, wx + 2, wy + 3), fill=hx('E6E0D8'))
    sd.ellipse((452, 40, 476, 66), fill=hx('8DB879')); sd.ellipse((458, 34, 474, 52), fill=hx('9CC48A'))
    im = Image.alpha_composite(im, sky); d = ImageDraw.Draw(im)
    # deck
    for y in range(100, H, 8):
        d.rectangle((KX, y, W, y + 7), fill=DECK[1] if (y // 8) % 2 else DECK[0]); d.line((KX, y + 7, W, y + 7), fill=DECK[2])
        off = (y * 7) % 37
        for x in range(KX + off, W, 37): d.line((x, y, x, y + 6), fill=DECK[2])
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); shd = ImageDraw.Draw(sh)
    for i in range(8): shd.line((KX, 100 + i, W, 100 + i), fill=(90, 60, 30, 40 - i * 5))
    im = Image.alpha_composite(im, sh); d = ImageDraw.Draw(im)
    # back railing (metal, dark green)
    RAIL = hx('47594A'); RAIL_HI = hx('6E826E')
    d.rectangle((KX, 70, W, 72), fill=RAIL_HI); d.rectangle((KX, 73, W, 74), fill=RAIL)
    for x in range(KX + 4, W, 6): d.rectangle((x, 75, x + 1, 99), fill=RAIL)
    d.rectangle((KX, 98, W, 100), fill=RAIL)
    # right railing (top view)
    d.rectangle((474, 100, 479, H), fill=RAIL); d.line((474, 100, 474, H), fill=RAIL_HI)
    # fairy lights
    for x in range(KX + 6, W - 2):
        y = int(10 + 7 * math.sin((x - KX) / (W - KX) * math.pi)); d.point((x, y), hx('3A2618'))
        if (x - KX) % 9 == 0:
            c = ('FFD27A', 'F29CC0', 'A6E3C8', 'FFF4C2')[((x - KX) // 9) % 4]
            d.rectangle((x - 1, y + 1, x + 1, y + 3), fill=hx(c))
    # ---- dividing wall + doorway (top view)
    d.rectangle((KX, 0, KX + 6, H), fill=hx('E6D2AC')); d.rectangle((KX, 0, KX + 1, H), fill=hx('F8EBD2'))
    d.rectangle((KX + 5, 0, KX + 6, H), fill=hx('C9AE86'))
    d.rectangle((KX, 150, KX + 6, 200), fill=hx('D6C7AE'))          # threshold
    for y in range(152, 199, 4): d.line((KX + 1, y, KX + 5, y), fill=hx('C4B497'))
    d.rectangle((KX - 1, 146, KX + 7, 149), fill=hx('C9AE86')); d.rectangle((KX - 1, 201, KX + 7, 204), fill=hx('C9AE86'))
    # ---- balcony furniture: bench along the railing, 2 floor cushions, little table, plants
    im = shadow(im, 416, 128, 46, 5)
    bf = Image.new('RGBA', (W, H), (0, 0, 0, 0)); bd = ImageDraw.Draw(bf)
    bd.rectangle((370, 100, 462, 108), fill=WOOD[1]); bd.line((370, 100, 462, 100), fill=WOOD[0])   # bench back
    bd.rectangle((370, 108, 462, 120), fill=WOOD[0]); bd.rectangle((370, 120, 462, 125), fill=WOOD[2])
    for x in (372, 460): bd.rectangle((x - 1, 125, x + 1, 130), fill=WOOD[3])
    bd.ellipse((400, 146, 432, 158), fill=hx('F7F4EC')); bd.rectangle((400, 152, 432, 156), fill=hx('E8E2D2'))   # round table
    bd.rectangle((414, 157, 418, 166), fill=hx('BDB4AC'))
    bd.rectangle((408, 146, 412, 151), fill=hx('C2662E')); bd.rectangle((420, 147, 424, 152), fill=hx('8FB8E8'))
    # big leafy pot
    bd.rectangle((452, 218, 468, 234), fill=hx('C8734A')); bd.rectangle((452, 218, 468, 220), fill=hx('E0905E'))
    for (x, y) in ((452, 206), (468, 206), (460, 198), (446, 213), (474, 213), (460, 210)):
        bd.ellipse((x - 8, y - 6, x + 8, y + 6), fill=LEAF[1]); bd.point((x - 3, y - 3), LEAF[0]); bd.point((x - 2, y - 3), LEAF[0]); bd.point((x + 3, y + 2), LEAF[2])
    bd.rectangle((362, 236, 372, 246), fill=hx('D9937A')); bd.ellipse((360, 228, 374, 238), fill=LEAF[2]); bd.point((364, 230), LEAF[0])
    bf = outline(bf); im = Image.alpha_composite(im, bf)
    return im


# =============================================================== SEATS (balcony, 5 friends)
SEATS = [  # (x, y) where each friend sits; bench: 3, floor cushions: 2
    (384, 120), (416, 120), (448, 120), (388, 184), (444, 184)]


def seats_layer():
    im = new(); d = ImageDraw.Draw(im)
    cols = ['F28C38', '8FB8E8', 'A6E3C8', 'C6A0E0', 'F29CC0']    # one soft colour per friend
    for i, (x, y) in enumerate(SEATS):
        c = hx(cols[i])
        if i < 3: d.rounded_rectangle((x - 12, y - 8, x + 12, y - 1), 2, fill=c)
        else: d.ellipse((x - 13, y - 6, x + 13, y + 4), fill=c); d.ellipse((x - 9, y - 4, x + 9, y + 1), fill=hx(cols[i], 255))
        d.line((x - 8, y - 6, x + 8, y - 6), fill=(255, 255, 255, 120))
    return outline(im)


# =============================================================== DECOR (6) + ghosts
GHOST = hx('8A6A48', 200)
DECOR = {}


DY = {'neon': 18, 'speaker': 14, 'lava': 14}


def decor(name, price, bbox):
    def wrap(fn):
        def placed():
            im = fn(); dy = DY.get(name, 0)
            if dy:
                out = Image.new('RGBA', (W, H), (0, 0, 0, 0)); out.paste(im, (0, dy)); return out
            return im
        DECOR[name] = dict(fn=placed, price=price, bbox=bbox); return fn
    return wrap


@decor('neon', 60, (66, 26, 126, 48))
def neon():
    im = new(); d = ImageDraw.Draw(im)
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
    g.rounded_rectangle((62, 5, 130, 33), 8, fill=(255, 120, 200, 40)); g.rounded_rectangle((66, 8, 126, 30), 6, fill=(255, 140, 210, 40))
    d.rounded_rectangle((68, 10, 124, 28), 3, fill=hx('2B2240'))
    P, Y = hx('FF8AD0'), hx('FFE066')
    # neon crown + a little chip-bag shape, joined by a heart
    d.line([(74, 24), (74, 15), (79, 20), (84, 13), (89, 20), (94, 15), (94, 24), (74, 24)], fill=Y)
    for x in (74, 84, 94): d.point((x, 12 if x == 84 else 14), Y)
    d.point((106, 15), P); d.point((108, 15), P); d.point((105, 16), P); d.point((107, 16), P); d.point((109, 16), P)
    d.point((106, 17), P); d.point((108, 17), P); d.point((107, 18), P); d.point((106, 17), P)
    d.line([(112, 14), (120, 14), (119, 25), (113, 25), (112, 14)], fill=P); d.line((114, 18, 118, 18), fill=P)
    return Image.alpha_composite(glow, outline(im))


# Photo wall: real photos from Noa (assets/photos/), shrunk into tiny "pixel photos".
# פרטיות: התמונות האמיתיות לא עולות ל-GitHub. photos.png = מסגרות זמניות (במאגר),
# photos_real.png + photo_*.jpg = התמונות (רק במחשב של נועה, ב-.gitignore).
PHOTO_DIR = 'photos/'
PHOTOS = [
    dict(frame=(72, 53, 84, 68), col='E8B730', src='a7b0edf1-image.jpg', crop=(380, 560, 1659, 2000)),   # Mai + Noa, sunset selfie
    dict(frame=(87, 51, 99, 66), col='F7F4EC', src='291a707c-image.jpg', crop=(560, 640, 1659, 2150)),   # Mai winking
    dict(frame=(102, 50, 117, 65), col='C08650', src='1740de96-image.png', crop=(0, 120, 856, 872)),     # the family, festive
    dict(frame=(92, 69, 105, 80), col='E8B730', src='db4d6b2a-image.png', crop=(0, 600, 1320, 1700)),   # childhood photo
]
LIGHTBOX_CROP = {'db4d6b2a-image.png': (0, 452, 1320, 2416)}
PLACEHOLDER = ['F2B8A0', 'B8D8E8', 'E8D4A0', 'C8E0B0']


def photo_files():
    """The 4 photos, in order. Uses the design file names when present, otherwise the first 4 images in photos/ (by name)."""
    exts = ('.jpg', '.jpeg', '.png', '.webp')
    found = sorted(f for f in glob.glob(PHOTO_DIR + '*') if f.lower().endswith(exts))
    out = []
    for i, p in enumerate(PHOTOS):
        if os.path.exists(PHOTO_DIR + p['src']): out.append((PHOTO_DIR + p['src'], p['crop']))
        elif i < len(found): out.append((found[i], None))
        else: out.append((None, None))
    return out


def fit_crop(src, iw, ih):
    """Centre crop to the frame's aspect (a bit higher than centre - faces are usually in the upper half)."""
    w, h = src.size; ar = iw / ih
    if w / h > ar: nw = int(h * ar); x0 = (w - nw) // 2; return src.crop((x0, 0, x0 + nw, h))
    nh = int(w / ar); y0 = max(0, int((h - nh) * .35)); return src.crop((0, y0, w, y0 + nh))


def photo_thumb(p, path, crop):
    from PIL import ImageEnhance
    x0, y0, x1, y1 = p['frame']; iw, ih = x1 - x0 - 1, y1 - y0 - 1
    if not path:
        return None
    src = Image.open(path).convert('RGB')
    src = src.crop(crop) if crop else fit_crop(src, iw, ih)
    t = src.resize((iw, ih), Image.BOX)
    t = ImageEnhance.Color(t).enhance(1.25); t = ImageEnhance.Contrast(t).enhance(1.15)
    return t.convert('RGBA')


def photo_wall(real):
    """real=False: frames with soft placeholder colours (goes into the public repo).
    real=True: the tiny pixel versions of Noa's photos (photos_real.png – stays only on her computer, see .gitignore)."""
    im = new(); d = ImageDraw.Draw(im)
    files = photo_files() if real else [(None, None)] * len(PHOTOS)
    for i, (p, (path, crop)) in enumerate(zip(PHOTOS, files)):
        x0, y0, x1, y1 = p['frame']
        d.rectangle((x0, y0, x1, y1), fill=hx(p['col']))
        t = photo_thumb(p, path, crop)
        if t is not None: im.alpha_composite(t, (x0 + 1, y0 + 1))
        else: d.rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), fill=hx(PLACEHOLDER[i]))
    return outline(im)


@decor('photos', 35, (72, 50, 117, 80))
def photos():
    return photo_wall(False)


def export_photos():
    n = 0
    for i, (path, crop) in enumerate(photo_files()):
        if not path: continue
        im = Image.open(path).convert('RGB')
        c = LIGHTBOX_CROP.get(os.path.basename(path))
        if c: im = im.crop(c)
        im.thumbnail((1100, 1100), Image.LANCZOS); im.save(f'{OUT}/photo_{i}.jpg', quality=80, optimize=True); n += 1
    return n


@decor('speaker', 15, (70, 72, 84, 92))
def speaker():
    im = new(); d = ImageDraw.Draw(im)
    d.rectangle((70, 58, 84, 61), fill=DARK[0]); d.rectangle((70, 62, 84, 78), fill=DARK[1]); d.line((84, 62, 84, 78), fill=DARK[2])
    d.ellipse((73, 64, 81, 72), fill=DARK[3]); d.ellipse((75, 66, 79, 70), fill=hx('6A6878')); d.point((76, 67), hx('9AA4B0'))
    d.ellipse((76, 73, 78, 75), fill=DARK[3]); d.point((82, 60), hx('7CF07C'))
    for i, (x, y) in enumerate(((88, 62), (91, 58), (87, 55))):     # music notes
        d.line((x, y, x, y + 4), fill=hx('7A4FB8')); d.point((x - 1, y + 4), hx('7A4FB8')); d.point((x + 1, y), hx('7A4FB8'))
    return outline(im)


@decor('lava', 25, (110, 66, 122, 92))
def lava():
    im = new(); d = ImageDraw.Draw(im)
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(glow)
    g.ellipse((100, 46, 132, 82), fill=(190, 120, 255, 45))
    d.polygon([(112, 72), (120, 72), (122, 78), (110, 78)], fill=hx('CDD1D6'))
    d.polygon([(113, 56), (119, 56), (121, 71), (111, 71)], fill=hx('B98CF0'))
    d.ellipse((114, 59, 117, 62), fill=hx('FF8AD0')); d.ellipse((115, 64, 119, 68), fill=hx('FF8AD0')); d.point((113, 58), hx('E6D6FF'))
    d.polygon([(113, 52), (119, 52), (119, 55), (113, 55)], fill=hx('CDD1D6'))
    return Image.alpha_composite(glow, outline(im))


@decor('fridge', 30, (274, 58, 306, 112))
def fridge():
    im = new(); d = ImageDraw.Draw(im)
    d.rounded_rectangle((276, 62, 304, 112), 3, fill=hx('CFE6DA')); d.rectangle((276, 62, 304, 66), fill=hx('E6F4EC'))
    d.line((303, 66, 303, 110), fill=hx('A8C8B6')); d.line((276, 78, 304, 78), fill=hx('8FAF9E'))
    d.rectangle((298, 69, 300, 75), fill=hx('CDD1D6')); d.rectangle((298, 82, 300, 96), fill=hx('CDD1D6'))
    for x, y, c in ((280, 82, 'E2231A'), (287, 86, 'F7C531'), (281, 92, '7A4FB8'), (291, 99, '5E9A34')): d.rectangle((x, y, x + 2, y + 2), fill=hx(c))
    d.rectangle((282, 96, 292, 106), fill=hx('FFFFFF')); d.line((284, 99, 290, 99), fill=hx('F29CC0')); d.line((284, 101, 289, 101), fill=hx('8FB8E8')); d.point((287, 104), hx('E2231A'))
    # snacks stacked on top: popcorn tub + chip bowl
    d.rectangle((279, 54, 286, 61), fill=hx('E2231A')); d.rectangle((280, 54, 281, 61), fill=hx('FFFFFF')); d.rectangle((284, 54, 285, 61), fill=hx('FFFFFF'))
    d.ellipse((278, 50, 287, 56), fill=hx('FFF6D6'))
    d.ellipse((289, 57, 303, 62), fill=hx('8FB8E8')); d.ellipse((291, 54, 301, 59), fill=hx('F7C531'))
    return outline(im)


@decor('yarn', 20, (64, 212, 78, 226))
def yarn():
    im = new(); d = ImageDraw.Draw(im)
    d.ellipse((65, 214, 77, 226), fill=hx('C86E96')); d.ellipse((66, 215, 75, 223), fill=hx('F29CC0'))
    for i in range(4): d.arc((66 + i, 215 + i, 76 - i, 225 - i), 200, 340, fill=hx('C86E96'))
    d.line([(77, 222), (82, 226), (86, 223), (90, 227)], fill=hx('C86E96'))
    return outline(im)


def ghost(name):
    """Dashed silhouette of the real item + faint fill, so an empty spot already hints at what goes there."""
    a = np.array(DECOR[name]['fn']())
    m = a[:, :, 3] > 150
    er = m.copy()
    er[1:, :] &= m[:-1, :]; er[:-1, :] &= m[1:, :]; er[:, 1:] &= m[:, :-1]; er[:, :-1] &= m[:, 1:]
    edge = m & ~er
    yy, xx = np.mgrid[0:H, 0:W]
    out = np.zeros_like(a)
    out[m] = (255, 250, 240, 60)
    dash = edge & (((xx + yy) // 2) % 2 == 0)
    out[dash] = GHOST
    return Image.fromarray(out)


# =============================================================== LEGENDARY SNACK SHELF
SNACK_SLOTS = [(314, 49), (326, 49), (338, 49), (320, 75), (334, 75)]   # top-left of 11x12 slots


def snack(i):
    im = new(); d = ImageDraw.Draw(im); x, y = SNACK_SLOTS[i]
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); g = ImageDraw.Draw(glow); g.ellipse((x - 2, y - 2, x + 12, y + 13), fill=(255, 214, 102, 70))
    if i == 0:   # popcorn bowl
        d.polygon([(x + 1, y + 6), (x + 9, y + 6), (x + 8, y + 12), (x + 2, y + 12)], fill=hx('E2231A'))
        d.line((x + 4, y + 7, x + 4, y + 11), fill=hx('FFFFFF')); d.line((x + 6, y + 7, x + 6, y + 11), fill=hx('FFFFFF'))
        for px, py in ((2, 4), (4, 3), (6, 4), (8, 4), (3, 5), (5, 5), (7, 5), (5, 2)): d.rectangle((x + px, y + py, x + px + 1, y + py + 1), fill=hx('FFF6D6'))
    elif i == 1: # chips pile
        for px, py in ((1, 9), (4, 8), (7, 9), (2, 6), (6, 6), (4, 4)): d.ellipse((x + px, y + py, x + px + 4, y + py + 3), fill=hx('F2C54A')); d.point((x + px + 1, y + py + 1), hx('FFE58A'))
    elif i == 2: # chocolate fingers
        for k in range(3): d.rectangle((x + 2 + k * 3, y + 3 + k, x + 3 + k * 3, y + 12), fill=hx('7A4A2A')); d.point((x + 2 + k * 3, y + 6 + k), hx('FFFFFF'))
    elif i == 3: # cheese puffs
        for px, py in ((1, 8), (5, 9), (3, 5), (7, 6)): d.arc((x + px, y + py, x + px + 5, y + py + 4), 180, 360, fill=hx('F28C38')); d.point((x + px + 2, y + py), hx('FFB060'))
    else:        # plain sufganiya (the biggest)
        d.ellipse((x - 1, y + 3, x + 11, y + 12), fill=hx('E0A45A')); d.ellipse((x, y + 3, x + 10, y + 8), fill=hx('F2C68A'))
        for px in (2, 5, 8): d.point((x + px, y + 5), hx('FFFFFF')); d.point((x + px - 1, y + 6), hx('FFFFFF'))
    return Image.alpha_composite(glow, outline(im))


def snack_slot(i):
    im = new(); d = ImageDraw.Draw(im); x, y = SNACK_SLOTS[i]
    dashed_rect(d, x, y + 1, x + 10, y + 12, hx('A07A4E', 190)); return im


# =============================================================== MAP-SCALE CHARACTERS (24x36)
MAI_PAL = {'o': OL, 'H': hx('94603A'), 'h': hx('6A4026'), 'T': hx('D9A86E'), 'g': hx('3A3A40'), 'G': hx('5C5A66'),
           'S': hx('EDBB8E'), 's': hx('D3956B'), 'e': hx('3E2214'), 'm': hx('C46A62'), 'k': hx('EEA58C'), 'i': hx('CDD1D6'),
           'C': hx('60626C'), 'c': hx('4B4C56'), 'Q': hx('D6CCBA'), 'q': hx('B8AC96'), 'Y': hx('F2D98A'),
           'P': hx('A0A2A7'), 'p': hx('85878D'), 'W': hx('F4F4F0'), 'w': hx('C9C9C4')}
MAI_ROWS = [
    "........oooooooo........",
    ".......oHHHHHHHHo.......",
    "......oggGgggGgggo......",
    "......oHHHHhhHHHHo......",
    "......oHHSSSSSSHHo......",
    "......oHSeeSSeeSHo......",
    "......oHSSeSSeSSHo......",
    "......oHkSSssSSkHo......",
    "......oHHSSmmSSHHo......",
    ".....oHHHHsSSsHHHHo.....",
    ".....oHHHHYSSYHHHHo.....",
    "...oQQHCCCYYCCCHQQo.....",
    "..oQQQHCCCCCCCCHQQQo....",
    "..oQQqTCCCCCCCCTqQQo....",
    "..oQQqTCCCCCCCcTqQQo....",
    "..oQqqoCCCCCCCcoqqQo....",
    "..oQqooCCCCCCCcooqQo....",
    "..oQqooCCCCCCCcooqQo....",
    "..oQqooCCCCCCCcooqQo....",
    "..oQqooCCCCCCCcooqQo....",
    "..oSsooCCCCCCCcoosSo....",
    "...ooo.oCCCCCCCCo.ooo...",
    ".......oCcCcCcCco.......",
    ".......oPPPPPPPpo.......",
    ".......oPPPPPPPpo.......",
    ".......oPPPPPPPpo.......",
    ".......oPPpooPPpo.......",
    ".......oPPpooPPpo.......",
    ".......oPPpooPPpo.......",
    ".......oPPpooPPpo.......",
    ".......oPPpooPPpo.......",
    ".......oPPpooPPpo.......",
    "......oWWWwooWWWwo......",
    "......oWWWWooWWWWo......",
    "......owwwwoowwwwo......",
    ".......oooo..oooo.......",
]
IRIT_PAL = {'o': OL, 'K': hx('2C2633'), 'k': hx('5A5266'), 'S': hx('F0C8A8'), 's': hx('D9A284'), 'e': hx('1C1822'),
            'l': hx('D66E90'), 'J': hx('F4F2EC'), 'j': hx('D0CBC2'), 'A': hx('312C33'), 'a': hx('221F25'),
            'b': hx('1C1822'), 'i': hx('CDD1D6'), 'D': hx('3E3842'), 'F': hx('1C1822'), 'w': hx('C98F52'), 'v': hx('9C6636')}
IRIT_ROWS = [
    ".......oooooooooo.......",
    "......oKKKKkKKKKKo......",
    ".....oKKKKKKKkKKKKo.....",
    ".....oKKKKKSSSSSKKo.....",
    ".....oKKSSSSSSSSKKo.....",
    ".....oKKSeeSSeeSKKo.....",
    ".....oKKSSSSsSSSKKo.....",
    ".....oKKSSSllSSSKKo.....",
    ".....oKKKsSSSSsKKKo.....",
    "....oKKKKKoSSoKKKKKo....",
    "....oKKKKJJiiJJKKKKo....",
    "..wwoJKKJJJJJJJJKKJo....",
    "..wwJJJKKJbJJJJbJKKJo...",
    "..ovJJjKKAAAAAAAAKKjJo..",
    "..ovJjoAAAAAAAAAAAojJo..",
    "..ovjjoAAAAAAAAAaAojjo..",
    "..ovjjoAAAAAAAAAaAojjo..",
    "..ovjjoAAAAAAAAAaAojjo..",
    "..oSsoAAAAAAAAAAaAosSo..",
    "...oo.oAAAAAAAAAaAo.oo..",
    ".....oAAAAAAAAAAaAAo....",
    ".....oAAAAAAAAAAaAAo....",
    ".....oAAAAAAAAAAaAAo....",
    ".....oAAAAAAAAAAaAAo....",
    ".....oooooooooooooooo...",
    "......oDDDDooDDDDo......",
    "......oDDDDooDDDDo......",
    "......oDDDDooDDDDo......",
    "......oDDDDooDDDDo......",
    "......oFFFFooFFFFo......",
    "......oFFFFooFFFFo......",
    ".......oooo..oooo.......",
]
LIZZY_PAL = {'o': OL, 'F': hx('977046'), 'f': hx('6C4F30'), 'L': hx('C29A68'), 'X': hx('2A1C10'), 'W': hx('FBF1E2'), 'P': hx('F29CC0'), 'B': hx('1E1E22')}
LIZZY_ROWS = [
    "...oo.oo..........",
    "..oFFoFFo.........",
    ".oFLXLXLFoooooo...",
    ".oFLLLLLLFFXFFXFo.",
    ".oWXoLLoXWFFXFFXFo",
    ".oWWWWWWWFFFXFFFFo",
    "..oPPBPPoLLLLLLFFo",
    "..oWWWWWFLLLLLLFo.",
    "...oWWWoFFXFFXFFo.",
    "....ooooFFFFFFFoFFo",
    "........ooooooo.ooo",
]


def chars():
    mai = sprite(MAI_ROWS, MAI_PAL); irit = sprite(IRIT_ROWS, IRIT_PAL); liz = sprite(LIZZY_ROWS, LIZZY_PAL)
    mai.save(f'{OUT}/mai_map.png'); irit.save(f'{OUT}/irit_map.png'); liz.save(f'{OUT}/lizzy_sleep_map.png')
    return mai, irit, liz


# =============================================================== BUILD
if __name__ == '__main__':
    r = room(); r.save(f'{OUT}/room.png')
    seats_layer().save(f'{OUT}/seats.png')
    for n, v in DECOR.items():
        v['fn']().save(f'{OUT}/{n}.png'); ghost(n).save(f'{OUT}/{n}_ghost.png')
    for i in range(5): snack(i).save(f'{OUT}/snack_{i}.png'); snack_slot(i).save(f'{OUT}/snack_slot_{i}.png')
    mai, irit, liz = chars()
    n_photos = export_photos()
    # the real photo wall is a separate, local-only file (the game uses it when it exists)
    real = f'{OUT}/photos_real.png'
    if n_photos: photo_wall(True).save(real)
    elif os.path.exists(real): os.remove(real)
    layout = {
        'size': [W, H],
        'decor': {n: {'price': v['price'], 'bbox': v['bbox']} for n, v in DECOR.items()},
        'snack_slots': SNACK_SLOTS, 'seats': SEATS, 'photo_frames': [p['frame'] for p in PHOTOS], 'photos': n_photos,
        'chars': {'irit': {'x': 244, 'foot': 134}, 'mai': {'x': 124, 'foot': 222}, 'lizzy': {'x': 42, 'foot': 222}},
        'stations': {'wardrobe': [10, 53, 58, 112], 'oven': [218, 38, 270, 112], 'shelf': [312, 32, 350, 92],
                     'balcony': [352, 100, 480, 270], 'table': [166, 152, 234, 180]},
    }
    json.dump(layout, open(f'{OUT}/layout.json', 'w'), indent=1)
    print('kitchen ok · photos:', n_photos)
