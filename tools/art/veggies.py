"""Battle enemies (pixel art, drawn on the shared 64x96 canvas and cropped).
מקור: assets/veggies.py משיחת העיצוב. פלט: world1/veg_tomato.png, world1/veg_carrot.png, world2/veg_cucumber.png, world2/veg_olive.png
"""
from mai import Canvas, mask_from, hx, WHITE

TOMATO = [hx(c) for c in ('FF8A72', 'E8402E', 'B42A20', '7A1A14')]
LEAF   = [hx(c) for c in ('9CD060', '5E9A34', '3E7024', '264A16')]
CARROT = [hx(c) for c in ('FFB060', 'F07A22', 'C25A14', '8A3E0C')]
# world 2 (art-bible 3.5)
PICKLE = [hx(c) for c in ('C4D274', '8CA544', '5E7A2E', '3A4E1C')]
DILL   = [hx(c) for c in ('D6EC98', '9CC456', '66923A', '3E6326')]
OLIVE  = [hx(c) for c in ('7FA043', '41601E', '2C4414', '1A2A0C')]
BRUISE = [hx(c) for c in ('7A6A36', '5A4A26')]
BROW = hx('2A1210'); EYE_W = hx('FFF8F0'); PUP = hx('1A0E0A')


def _face(c, cx, ey, angry=True):
    for dx in (-5, 3):
        c.rect(cx + dx, ey, cx + dx + 2, ey + 2, EYE_W); c.px([(cx + dx + 1, ey + 1), (cx + dx + 1, ey + 2)], PUP)
    if angry:
        c.px([(cx - 6, ey - 2), (cx - 5, ey - 2), (cx - 4, ey - 1), (cx - 3, ey - 1)], BROW)
        c.px([(cx + 5, ey - 2), (cx + 6, ey - 2), (cx + 3, ey - 1), (cx + 4, ey - 1)], BROW)
    c.px([(cx - 2, ey + 6), (cx - 1, ey + 5), (cx, ey + 5), (cx + 1, ey + 5), (cx + 2, ey + 6)], BROW)   # frown


def tomato():
    c = Canvas()
    # little legs + arms
    for x in (25, 36):
        c.rect(x, 74, x + 2, 79, LEAF[2]); c.rect(x - 1, 79, x + 3, 80, LEAF[3])
    c.px([(13, 58), (12, 59), (11, 60), (50, 58), (51, 59), (52, 60)], LEAF[2])
    # round body
    c.part(mask_from(lambda d: d.ellipse((14, 44, 49, 76), fill=1)), TOMATO, (4, 3))
    c.px([(20, 50), (21, 49), (22, 49), (21, 51)], hx('FFD2C4'))                    # shine
    # leafy star cap + stem
    c.part(mask_from(lambda d: d.polygon([(31, 41), (37, 44), (42, 43), (38, 47), (40, 51), (33, 48), (28, 51),
                                          (27, 47), (21, 45), (27, 43)], fill=1)), LEAF, (1, 1))
    c.rect(31, 37, 32, 41, LEAF[2])
    _face(c, 31, 57)
    c.outline()
    img = c.image(bg_shadow=False)
    return img.crop(img.getbbox())


def carrot():
    c = Canvas()
    for x in (26, 34):
        c.rect(x, 78, x + 2, 82, CARROT[3])
    c.part(mask_from(lambda d: d.polygon([(20, 40), (44, 40), (40, 66), (34, 80), (30, 80), (24, 66)], fill=1)), CARROT, (3, 2))
    for y, x0, x1 in ((48, 21, 26), (56, 38, 42), (64, 25, 29), (71, 34, 37)):
        c.px([(x, y) for x in range(x0, x1)], CARROT[2])
    c.px([(23, 44), (23, 45), (24, 46)], CARROT[0])
    # leafy top
    for pts in ([(28, 40), (24, 26), (30, 34)], [(31, 40), (32, 22), (34, 36)], [(35, 40), (41, 27), (37, 36)]):
        c.part(mask_from(lambda d, p=pts: d.polygon(p, fill=1)), LEAF, (1, 1))
    c.px([(17, 54), (16, 55), (15, 56), (46, 54), (47, 55), (48, 56)], CARROT[3])
    _face(c, 32, 49)
    c.outline()
    img = c.image(bg_shadow=False)
    return img.crop(img.getbbox())


def cucumber():
    """World 2: an upright bumpy cucumber (pickle ramp), slight lean, dill sprig on top. Smaller and plainer than the boss."""
    c = Canvas()
    for x in (27, 35):                                   # stubby legs + feet
        c.rect(x, 82, x + 2, 86, PICKLE[2]); c.rect(x - 1, 86, x + 3, 87, PICKLE[3])
    c.px([(19, 58), (18, 59), (17, 60), (16, 61), (45, 58), (46, 59), (47, 60), (48, 61)], PICKLE[2])   # arms
    c.px([(15, 61), (16, 62), (48, 62), (49, 61)], PICKLE[1])
    c.part(mask_from(lambda d: d.rounded_rectangle((20, 30, 44, 84), radius=11, fill=1)), PICKLE, (3, 2))
    # long ridge + bumps (lit side light, shadow side dark)
    c.px([(25, y) for y in range(36, 78) if y % 3], PICKLE[0])
    c.px([(39, y) for y in range(38, 78) if y % 4], PICKLE[2])
    for x, y in ((23, 40), (29, 34), (36, 35), (41, 42), (22, 52), (41, 54), (28, 58), (36, 57), (23, 64), (40, 66),
                 (31, 66), (27, 72), (35, 73), (41, 76), (23, 78), (31, 80), (38, 81), (22, 46), (29, 76), (37, 64)):
        lit = x < 32   # each wart: a lit cap on top, a dark pocket under it
        c.px([(x, y), (x + 1, y)], PICKLE[0] if lit else PICKLE[1]); c.px([(x, y + 1), (x + 1, y + 1)], PICKLE[2] if lit else PICKLE[3])
    c.px([(42, y) for y in range(36, 80)], PICKLE[2])
    c.px([(23, 34), (23, 35), (22, 37)], hx('EEF3C0'))   # wet shine
    # stem nub + dill sprig
    c.rect(31, 26, 33, 30, hx('7E8A3A'))
    for x, y in ((33, 25), (35, 23), (37, 21), (39, 20), (29, 24), (27, 22)):
        c.px([(x, y)], DILL[2])
    for x, y in ((36, 20), (38, 22), (40, 19), (34, 22), (28, 21), (26, 23)):
        c.px([(x, y)], DILL[1])
    c.px([(41, 18), (39, 18)], DILL[0])
    _face(c, 32, 44)
    c.outline()
    img = c.image(bg_shadow=False)
    return img.crop(img.getbbox())


def olive():
    """World 2: Syrian olive - dark green, oval, lopsided (one side dented), bruised and wrinkled, little brown stem,
    tired-grumpy face (droopy lids over the shared angry face)."""
    c = Canvas()
    for x in (26, 35):
        c.rect(x, 80, x + 2, 84, OLIVE[2]); c.rect(x - 1, 84, x + 3, 85, OLIVE[3])
    c.px([(14, 60), (13, 61), (12, 62), (11, 63), (49, 60), (50, 61), (51, 62), (52, 63)], OLIVE[2])
    body = mask_from(lambda d: d.ellipse((14, 38, 49, 82), fill=1)) & ~mask_from(lambda d: d.ellipse((45, 52, 58, 66), fill=1))   # dent
    c.part(body, OLIVE, (3, 2))
    c.part(mask_from(lambda d: d.ellipse((19, 43, 30, 54), fill=1)), [OLIVE[0], OLIVE[0], OLIVE[1], OLIVE[1]], (2, 2), hi=False, edge=False)
    c.px([(21, 45), (22, 45), (22, 44), (21, 46)], hx('D6E89A')); c.px([(23, 44), (20, 47)], hx('A8C462'))   # shine
    c.px([(45, 51), (46, 52), (46, 66), (45, 67)], OLIVE[3])   # crease around the dent
    # bruises + wrinkles
    c.px([(18, 68), (19, 68), (20, 69), (19, 70), (20, 70), (21, 70)], BRUISE[0]); c.px([(19, 69), (20, 71)], BRUISE[1])
    c.px([(38, 76), (39, 76), (40, 75), (39, 77)], BRUISE[0]); c.px([(40, 76)], BRUISE[1])
    c.px([(37, 42), (38, 43), (39, 45)], OLIVE[2]); c.px([(42, 70), (43, 72), (43, 73)], OLIVE[2]); c.px([(25, 76), (27, 77)], OLIVE[2])
    # stem stub
    c.rect(30, 34, 31, 38, hx('6E5A34')); c.px([(32, 33), (33, 32)], hx('6E5A34')); c.px([(30, 34)], hx('8A7448'))
    cx, ey = 31, 56
    _face(c, cx, ey)
    # tired: heavy lids cover the top half of each eye; brows lifted to read against the dark skin
    for dx in (-5, 3):   # droopy lids: top row of each eye + the outer corner, in the olive's light green
        c.px([(cx + dx + k, ey) for k in range(3)], OLIVE[0]); c.px([(cx + dx + k, ey - 1) for k in range(3)], OLIVE[3])
        c.px([(cx + dx + (0 if dx < 0 else 2), ey + 1)], OLIVE[0])
    c.px([(cx - 6, ey - 2), (cx - 5, ey - 2), (cx + 5, ey - 2), (cx + 6, ey - 2)], hx('120A06'))
    c.px([(cx - 2, ey + 7), (cx + 2, ey + 7)], OLIVE[3])   # bags under the frown
    c.outline()
    img = c.image(bg_shadow=False)
    return img.crop(img.getbbox())


if __name__ == '__main__':
    tomato().save('world1/veg_tomato.png'); carrot().save('world1/veg_carrot.png')
    import os; os.makedirs('world2', exist_ok=True)
    cucumber().save('world2/veg_cucumber.png'); olive().save('world2/veg_olive.png')
    print('veggies ok')
