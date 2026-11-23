"""Realistic-proportion pixel sprites (64x96): Mai (3 poses) and Irit / Mom (2 poses).
מקור: assets/chars.py משיחת העיצוב (ללא שינוי בציור). פלט: mai3_*.png, irit_*.png ב-assets/.
"""
import sys
from PIL import Image
from mai import (Canvas, mask_from, hx, W, H, SKIN, HAIR, SWEAT, PANTS, SHOE, SOLE, GOLD,
                 FRAME, LENS, LENS_HI, EYE, EYE_DK, WHITE, LIP, BLUSH, BROW)

# ---------- Irit palette ----------
SKIN_I = [hx(c) for c in ('FAE0CA', 'F0C8A8', 'D9A284', 'B07A5E')]
HAIR_K = [hx(c) for c in ('5A5266', '2C2633', '1C1822', '110E15')]
CHEF   = [hx(c) for c in ('FFFFFF', 'EFEDE8', 'D0CBC2', 'A39D93')]
APRON  = [hx(c) for c in ('55505A', '312C33', '221F25', '161317')]
BLACKP = [hx(c) for c in ('4E4A55', '34303A', '25222A', '18161C')]
SILVER = [hx(c) for c in ('FFFFFF', 'CDD1D6', '9298A3', '676C78')]
WOOD   = [hx(c) for c in ('E8C088', 'C98F52', '9C6636', '6B4222')]
EYE_I = hx('6F98A0'); LIP_I = hx('D66E90'); LIP_I_HI = hx('F2A6BE'); LINER = hx('15121A')


def wavy(x, y0, y1, amp=1, period=6, phase=0):
    """points down a vertical edge with a gentle wave."""
    pts = []
    for y in range(y0, y1 + 1, period // 2):
        k = ((y - y0) // (period // 2) + phase) % 2
        pts.append((x + (amp if k else -amp), y))
    return pts


# ---------- Mai palette v3 (from photos) ----------
HAIR_M  = [hx(c) for c in ('C98E58', '94603A', '6A4026', '442816')]
SWEAT_M = [hx(c) for c in ('7D7F89', '60626C', '4B4C56', '36373F')]
BLEACH  = [hx(c) for c in ('EEE6D6', 'D6CCBA', 'B8AC96', '8E836E')]
PANTS_M = [hx(c) for c in ('B8BABE', 'A0A2A7', '85878D', '66686E')]
TEE = hx('F2D98A'); FRECKLE = hx('C98A62')


def mai(variant='idle'):
    c = Canvas()
    cud = variant == 'cuddle'

    # back hair: long, straight, to mid-back
    if not cud:
        c.part(mask_from(lambda d: d.polygon([(32, 4), (39, 5), (42, 10), (43, 22), (44, 40), (42, 49),
                                               (22, 49), (20, 40), (21, 22), (22, 10), (25, 5)], fill=1)), HAIR_M, (2, 2))
        for x in (23, 41):
            c.px([(x, y) for y in range(24, 47)], HAIR_M[2])
        c.px([(22, y) for y in range(20, 44, 3)] + [(42, y) for y in range(18, 40, 4)], HAIR_M[0])

    # joggers
    c.part(mask_from(lambda d: d.polygon([(23, 61), (31, 61), (31, 85), (25, 85)], fill=1)), PANTS_M)
    c.part(mask_from(lambda d: d.polygon([(33, 61), (41, 61), (39, 85), (33, 85)], fill=1)), PANTS_M)
    c.px([(27, 68), (28, 69), (27, 75), (36, 70), (37, 71), (36, 77), (29, 80), (35, 81)], PANTS_M[2])
    c.px([(29, 66), (35, 66)], PANTS_M[0])
    for x0 in (25, 33):
        c.rect(x0, 83, x0 + 6, 85, PANTS_M[3]); c.px([(x, 84) for x in range(x0, x0 + 7, 2)], PANTS_M[2])

    # sneakers (3/4 view)
    for x0, x1 in ((23, 31), (33, 41)):
        c.part(mask_from(lambda d, a=x0, b=x1: d.rounded_rectangle((a, 85, b, 90), 2, fill=1)), SHOE, (2, 1))
        c.rect(x0, 90, x1, 91, SOLE[1]); c.rect(x0 + 1, 91, x1 - 1, 91, SOLE[2])
        c.px([(x0 + 3, 87), (x0 + 5, 87)], SHOE[2]); c.px([(x0 + 4, 88)], hx('F4A6C0'))

    # oversized sweatshirt
    c.part(mask_from(lambda d: d.polygon([(26, 28), (38, 28), (45, 31), (46, 59), (43, 63), (21, 63),
                                          (18, 59), (19, 31)], fill=1)), SWEAT_M, (3, 2))
    c.rect(20, 60, 44, 62, SWEAT_M[2]); c.px([(x, 61) for x in range(20, 45, 2)], SWEAT_M[3])
    c.px([(28, 38), (29, 39), (30, 40), (35, 44), (36, 45), (26, 47)], SWEAT_M[2])
    # crew neck: rib + yellow tee peeking
    c.part(mask_from(lambda d: d.rectangle((29, 25, 35, 30), fill=1)), SKIN, (1, 1), hi=False)
    c.px([(x, 26) for x in range(29, 36)], SKIN[2])
    c.px([(x, 30) for x in range(28, 37)] + [(27, 29), (37, 29)], TEE)
    c.px([(x, 31) for x in range(27, 38)] + [(26, 30), (38, 30)], SWEAT_M[3])
    c.px([(x, 32) for x in range(27, 38, 2)], SWEAT_M[2])
    # sleeves + hands
    if cud:
        c.part(mask_from(lambda d: d.polygon([(19, 32), (24, 32), (40, 42), (40, 47), (20, 44)], fill=1)), SWEAT_M, (2, 2))
        c.part(mask_from(lambda d: d.polygon([(45, 32), (40, 32), (24, 44), (25, 49), (44, 44)], fill=1)), SWEAT_M, (2, 2))
        c.px([(x, 45) for x in range(27, 35)], SWEAT_M[3])
    else:
        c.part(mask_from(lambda d: d.polygon([(23, 31), (19, 31), (15, 46), (15, 58), (20, 58), (21, 44)], fill=1)), SWEAT_M, (2, 2))
        c.rect(15, 56, 20, 58, SWEAT_M[2]); c.px([(x, 57) for x in range(15, 21, 2)], SWEAT_M[3])
        c.part(mask_from(lambda d: d.ellipse((16, 58, 20, 63), fill=1)), SKIN, (1, 1))
        if variant != 'glasses':
            c.part(mask_from(lambda d: d.polygon([(41, 31), (45, 31), (49, 46), (49, 58), (44, 58), (43, 44)], fill=1)), SWEAT_M, (2, 2))
            c.rect(44, 56, 49, 58, SWEAT_M[2]); c.px([(x, 57) for x in range(44, 50, 2)], SWEAT_M[3])
            c.part(mask_from(lambda d: d.ellipse((44, 58, 48, 63), fill=1)), SKIN, (1, 1))

    # face (slimmer, realistic)
    c.part(mask_from(lambda d: d.polygon([(25, 9), (39, 9), (40, 16), (39, 21), (36, 25), (33, 27), (31, 27),
                                          (28, 25), (25, 21), (24, 16)], fill=1)), SKIN, (2, 2))
    c.px([(x, 26) for x in range(30, 35)], SKIN[2]); c.px([(38, 21), (37, 23)], SKIN[2])

    # front hair: middle part, curtains framing face
    c.part(mask_from(lambda d: d.polygon([(32, 4), (31, 7), (27, 10), (25, 15), (24, 22), (23, 29), (21, 27),
                                          (21, 14), (24, 7), (28, 4)], fill=1)), HAIR_M, (1, 1))
    c.part(mask_from(lambda d: d.polygon([(32, 4), (33, 7), (37, 10), (39, 15), (40, 22), (41, 29), (43, 27),
                                          (43, 14), (40, 7), (36, 4)], fill=1)), HAIR_M, (1, 1))
    c.px([(32, 5), (32, 6)], SKIN[2])
    c.px([(26, 7), (27, 6), (28, 6), (36, 6), (37, 6)], HAIR_M[0]); c.px([(22, 14), (22, 15), (42, 15)], HAIR_M[0])
    if not cud:
        c.part(mask_from(lambda d: d.polygon([(21, 27), (24, 29), (25, 38), (23, 46), (20, 42)], fill=1)), HAIR_M, (1, 1))
        c.part(mask_from(lambda d: d.polygon([(43, 27), (40, 29), (39, 38), (41, 46), (44, 42)], fill=1)), HAIR_M, (1, 1))
        c.px([(22, 33), (22, 37), (42, 34)], HAIR_M[0])
        c.px([(21, 41), (22, 43), (23, 44), (21, 40), (43, 41), (42, 43), (41, 44), (43, 40)], hx('D9A86E'))

    # brows (thick)
    c.rect(26, 13, 30, 13, BROW); c.px([(27, 12), (28, 12), (25, 14)], BROW)
    c.rect(34, 13, 38, 13, BROW); c.px([(36, 12), (37, 12), (39, 14)], BROW)
    if variant == 'glasses':
        c.px([(27, 11), (28, 11)], BROW)

    # eyes
    if cud:
        c.px([(27, 17), (28, 16), (29, 17), (35, 17), (36, 16), (37, 17)], EYE_DK)
    elif variant != 'glasses':
        for x0 in (27, 35):
            c.px([(x0 - 1, 15), (x0, 15), (x0 + 1, 15), (x0 + 2, 15), (x0 + 3, 15)], EYE_DK)
            c.rect(x0, 16, x0 + 2, 18, EYE); c.px([(x0 + 1, 17), (x0 + 2, 17)], EYE_DK)
            c.px([(x0, 16)], WHITE); c.px([(x0 + 2, 18)], hx('A0704A')); c.px([(x0 + 3, 17)], hx('F4EEE6'))

    # nose, piercing, mouth
    c.px([(32, 19), (33, 20)], SKIN[2]); c.px([(31, 21)], SKIN[3]); c.px([(33, 21)], SILVER[1])
    if cud:
        c.px([(30, 23), (31, 24), (32, 24), (33, 24), (34, 23)], LIP)
    elif variant == 'glasses':
        c.px([(30, 24), (31, 24), (32, 24), (33, 23), (34, 23)], LIP)
    else:
        c.px([(30, 23), (31, 23), (32, 23), (33, 23), (34, 23)], LIP); c.px([(31, 24), (32, 24), (33, 24)], hx('A8524C'))
    c.px([(26, 20), (27, 20), (37, 20), (38, 20)], BLUSH)

    # hoops
    for ex in (22, 40):
        c.px([(ex, 21), (ex + 1, 20), (ex + 2, 21), (ex + 2, 22), (ex + 2, 23), (ex + 1, 24), (ex, 23), (ex, 22)], SILVER[1])
        c.px([(ex + 1, 20)], SILVER[0]); c.px([(ex + 1, 24)], SILVER[2])

    # raised arm for the glasses pose (viewer-right arm)
    if variant == 'glasses':
        c.part(mask_from(lambda d: d.polygon([(41, 31), (45, 31), (49, 30), (47, 20), (43, 20), (44, 28)], fill=1)), SWEAT_M, (2, 2))
        c.rect(43, 19, 47, 21, SWEAT_M[2]); c.px([(x, 20) for x in range(43, 48, 2)], SWEAT_M[3])
        c.part(mask_from(lambda d: d.ellipse((40, 14, 45, 19), fill=1)), SKIN, (1, 1))

    # sunglasses
    gy = None if cud else (15 if variant == 'glasses' else 6)
    if gy is not None:
        for lx in (25, 33):
            c.rect(lx, gy, lx + 5, gy + 3, hx('3A3A40')); c.rect(lx + 1, gy + 1, lx + 4, gy + 2, hx('5C5A66'))
            c.px([(lx + 1, gy + 1)], LENS_HI)
        c.px([(31, gy + 1), (32, gy + 1)], FRAME); c.px([(24, gy + 1), (39, gy + 1)], FRAME)

    # bleached sleeves (washed-out tie-dye bands)
    zones = [(13, 22, 42, 55), (42, 51, 42, 55)] if variant == 'idle' else \
            [(13, 22, 42, 55)] if variant == 'glasses' else [(18, 26, 34, 46), (38, 46, 34, 46)]
    m = {SWEAT_M[k]: BLEACH[k] for k in range(4)}
    for x0, x1, y0, y1 in zones:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if (y == y0 or y == y1) and (x + y) % 2:
                    continue
                t = tuple(int(v) for v in c.rgb[y, x])
                if c.a[y, x] and t in m:
                    c.rgb[y, x] = m[t]
    # heather speckle on the joggers
    for y in range(62, 84):
        for x in range(23, 42):
            if (x * 7 + y * 13) % 11 == 0 and c.a[y, x] and tuple(int(v) for v in c.rgb[y, x]) == PANTS_M[1]:
                c.rgb[y, x] = PANTS_M[0]
    # freckles
    c.px([(29, 20), (31, 19), (34, 19), (36, 20), (28, 21)], FRECKLE)
    c.outline()
    return c


def irit(variant='spoon'):
    c = Canvas()
    # big wavy black hair (back), past the shoulders
    back = [(32, 3), (40, 4), (44, 9)] + wavy(46, 12, 52, 1, 6) + [(43, 56), (38, 54), (26, 54), (21, 56)] + \
           list(reversed(wavy(18, 12, 52, 1, 6, 1))) + [(20, 9), (24, 4)]
    c.part(mask_from(lambda d: d.polygon(back, fill=1)), HAIR_K, (2, 2))
    for x, y0 in ((20, 20), (44, 22), (22, 40), (42, 38)):
        c.px([(x + (1 if (y // 3) % 2 else 0), y) for y in range(y0, y0 + 14)], HAIR_K[0])
    c.px([(21, y) for y in range(26, 50, 2)] + [(43, y) for y in range(28, 50, 2)], HAIR_K[2])

    # black pants + shoes
    c.part(mask_from(lambda d: d.polygon([(24, 70), (31, 70), (31, 85), (25, 85)], fill=1)), BLACKP)
    c.part(mask_from(lambda d: d.polygon([(33, 70), (40, 70), (39, 85), (33, 85)], fill=1)), BLACKP)
    for x0, x1 in ((23, 31), (33, 41)):
        c.part(mask_from(lambda d, a=x0, b=x1: d.rounded_rectangle((a, 85, b, 90), 2, fill=1)), SHOE, (2, 1))
        c.rect(x0, 90, x1, 91, SOLE[1])

    # chef jacket (white, double-breasted)
    c.part(mask_from(lambda d: d.polygon([(26, 28), (38, 28), (44, 31), (45, 52), (43, 70), (21, 70),
                                          (19, 52), (20, 31)], fill=1)), CHEF, (3, 2))
    for y in (35, 40, 45):
        c.px([(28, y), (36, y)], APRON[1]); c.px([(28, y - 1), (36, y - 1)], APRON[0])
    c.px([(32, y) for y in range(31, 46)], CHEF[2])
    # stand collar
    c.part(mask_from(lambda d: d.polygon([(27, 26), (37, 26), (38, 31), (32, 33), (26, 31)], fill=1)), CHEF, (1, 1))
    c.part(mask_from(lambda d: d.polygon([(29, 24), (35, 24), (35, 29), (32, 31), (29, 29)], fill=1)), SKIN_I, (1, 1), hi=False)
    c.px([(x, 25) for x in range(29, 36)], SKIN_I[2])
    # silver heart necklace
    c.px([(30, 28), (31, 29), (33, 29), (34, 28)], SILVER[2]); c.px([(32, 30), (31, 30), (33, 30)], SILVER[1]); c.px([(32, 31)], SILVER[0])

    # black apron from the waist
    c.part(mask_from(lambda d: d.polygon([(22, 48), (42, 48), (43, 76), (21, 76)], fill=1)), APRON, (2, 1))
    c.px([(x, 49) for x in range(22, 43)], APRON[0])
    c.rect(26, 56, 38, 61, APRON[2]); c.px([(x, 56) for x in range(26, 39)], APRON[0])  # pocket
    c.px([(30, 66), (31, 67), (35, 69), (36, 70)], APRON[2])
    c.px([(21, 48), (20, 49), (43, 48), (44, 49)], APRON[1])  # ties

    # arms
    c.part(mask_from(lambda d: d.polygon([(40, 30), (44, 31), (48, 46), (47, 58), (43, 58), (43, 44)], fill=1)), CHEF, (2, 2))
    c.rect(43, 55, 47, 57, CHEF[2])
    c.part(mask_from(lambda d: d.ellipse((43, 57, 47, 62), fill=1)), SKIN_I, (1, 1))
    if variant == 'spoon':
        c.part(mask_from(lambda d: d.polygon([(24, 30), (20, 31), (14, 42), (17, 46), (22, 40), (23, 34)], fill=1)), CHEF, (2, 2))
        c.part(mask_from(lambda d: d.polygon([(14, 42), (17, 46), (20, 38), (17, 35)], fill=1)), CHEF, (1, 1))
        spoon_h = mask_from(lambda d: d.line((17, 40, 12, 18), fill=1, width=2))
        c.part(spoon_h, WOOD, (1, 1))
        c.part(mask_from(lambda d: d.ellipse((8, 8, 16, 19), fill=1)), WOOD, (2, 2))
        c.px([(11, 12), (13, 12), (10, 13), (11, 13), (12, 13), (13, 13), (14, 13), (11, 14), (12, 14), (13, 14), (12, 15)], WOOD[3])
        c.part(mask_from(lambda d: d.ellipse((15, 36, 20, 42), fill=1)), SKIN_I, (1, 1))
    else:
        c.part(mask_from(lambda d: d.polygon([(24, 30), (20, 31), (16, 46), (18, 52), (24, 50), (22, 42)], fill=1)), CHEF, (2, 2))
        c.part(mask_from(lambda d: d.rectangle((12, 49, 36, 52), fill=1)), SILVER, (2, 1))
        rug = [hx('F0C27A'), hx('C8843A'), hx('9A5A24'), hx('5A3420')]
        for rx in (14, 20, 26, 31):
            c.part(mask_from(lambda d, a=rx: d.ellipse((a, 45, a + 5, 49), fill=1)), rug, (1, 1))
            c.px([(rx + 2, 47), (rx + 3, 46)], rug[3])
        c.px([(17, 43), (24, 42), (30, 43)], hx('FFFFFF'))  # sparkle
        c.part(mask_from(lambda d: d.ellipse((16, 50, 20, 54), fill=1)), SKIN_I, (1, 1))

    # face
    c.part(mask_from(lambda d: d.polygon([(25, 9), (39, 9), (40, 16), (39, 21), (36, 25), (33, 26), (31, 26),
                                          (28, 25), (25, 21), (24, 16)], fill=1)), SKIN_I, (2, 2))
    c.px([(x, 25) for x in range(30, 35)], SKIN_I[2])

    # side-swept bangs + volume on top
    c.part(mask_from(lambda d: d.polygon([(22, 6), (30, 4), (38, 5), (42, 8), (41, 13), (36, 11), (31, 13),
                                          (27, 16), (24, 18), (23, 24), (21, 20)], fill=1)), HAIR_K, (1, 1))
    c.part(mask_from(lambda d: d.polygon([(40, 10), (43, 14), (42, 24), (43, 30), (40, 28), (39, 18)], fill=1)), HAIR_K, (1, 1))
    c.px([(28, 6), (29, 5), (30, 5), (34, 5), (35, 6), (25, 9), (24, 11)], HAIR_K[0])
    c.px([(31, 10), (32, 10), (28, 12)], HAIR_K[2])
    # locks over the shoulders
    c.part(mask_from(lambda d: d.polygon([(21, 22), (24, 26), (23, 36), (21, 44), (18, 38)], fill=1)), HAIR_K, (1, 1))
    c.part(mask_from(lambda d: d.polygon([(43, 26), (41, 30), (42, 40), (44, 46), (46, 38)], fill=1)), HAIR_K, (1, 1))
    c.px([(20, 30), (21, 34), (44, 34), (45, 38)], HAIR_K[0])

    # brows (soft, arched)
    c.px([(27, 14), (28, 13), (29, 13), (30, 13), (35, 13), (36, 13), (37, 13), (38, 14)], hx('3A3036'))
    # eyes: blue-grey with dark liner
    for x0 in (27, 35):
        c.px([(x0 - 1, 16), (x0, 15), (x0 + 1, 15), (x0 + 2, 15), (x0 + 3, 16)], LINER)
        c.rect(x0, 16, x0 + 2, 17, EYE_I); c.px([(x0 + 1, 17)], LINER); c.px([(x0, 16)], WHITE)
        c.px([(x0, 18), (x0 + 1, 18), (x0 + 2, 18)], SKIN_I[2])
    # nose + smile (pink lips, soft closed smile)
    c.px([(33, 19), (33, 20)], SKIN_I[2]); c.px([(32, 21)], SKIN_I[3])
    c.px([(29, 22), (30, 23), (31, 23), (32, 23), (33, 23), (34, 23), (35, 22)], LIP_I); c.px([(31, 22), (32, 22)], LIP_I_HI)
    c.px([(26, 20), (27, 20), (37, 20), (38, 20)], hx('F0A8A0'))
    # silver hoops
    for ex in (22, 40):
        c.px([(ex, 21), (ex + 1, 20), (ex + 2, 21), (ex + 2, 22), (ex + 2, 23), (ex + 2, 24), (ex + 1, 25), (ex, 24), (ex, 23), (ex, 22)], SILVER[1])
        c.px([(ex + 1, 20)], SILVER[0]); c.px([(ex + 1, 25)], SILVER[2])

    c.outline()
    return c


if __name__ == '__main__':
    out = {}
    for v in ('idle', 'glasses', 'cuddle'):
        out[f'mai3_{v}'] = mai(v).image()
    for v in ('spoon', 'tray'):
        out[f'irit_{v}'] = irit(v).image()
    for k, im in out.items():
        im.save(f'{k}.png')
    print('chars ok')
