"""Battle enemies (pixel art, drawn on the shared 64x96 canvas and cropped).
מקור: assets/veggies.py משיחת העיצוב. פלט: world1/veg_tomato.png, world1/veg_carrot.png
"""
from mai import Canvas, mask_from, hx, WHITE

TOMATO = [hx(c) for c in ('FF8A72', 'E8402E', 'B42A20', '7A1A14')]
LEAF   = [hx(c) for c in ('9CD060', '5E9A34', '3E7024', '264A16')]
CARROT = [hx(c) for c in ('FFB060', 'F07A22', 'C25A14', '8A3E0C')]
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
    for x in (25, 36):
        c.rect(x, 74, x + 2, 79, LEAF[2]); c.rect(x - 1, 79, x + 3, 80, LEAF[3])
    c.px([(13, 58), (12, 59), (11, 60), (50, 58), (51, 59), (52, 60)], LEAF[2])
    c.part(mask_from(lambda d: d.ellipse((14, 44, 49, 76), fill=1)), TOMATO, (4, 3))
    c.px([(20, 50), (21, 49), (22, 49), (21, 51)], hx('FFD2C4'))                    # shine
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
    for pts in ([(28, 40), (24, 26), (30, 34)], [(31, 40), (32, 22), (34, 36)], [(35, 40), (41, 27), (37, 36)]):
        c.part(mask_from(lambda d, p=pts: d.polygon(p, fill=1)), LEAF, (1, 1))
    c.px([(17, 54), (16, 55), (15, 56), (46, 54), (47, 55), (48, 56)], CARROT[3])
    _face(c, 32, 49)
    c.outline()
    img = c.image(bg_shadow=False)
    return img.crop(img.getbbox())


if __name__ == '__main__':
    tomato().save('world1/veg_tomato.png'); carrot().save('world1/veg_carrot.png')
    print('veggies ok')
