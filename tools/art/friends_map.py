"""Map-scale balcony poses for the 5 friends (24 px wide, ~30 tall), same palettes as art-friends.md.
מקור: assets/friends_map.py משיחת העיצוב (ללא שינוי, חוץ מקובץ התצוגה המקדימה שהוסר).
Roni, Hadar, Shai sit on the bench (legs down); Amber and Noa sit cross-legged on the floor cushions.
Outputs kitchen/friend_<name>.png
"""
import numpy as np
from PIL import Image

OL = (0x3A, 0x26, 0x18, 255)


def hx(s):
    s = s.lstrip('#'); return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), 255)


class G:
    def __init__(self, h):
        self.a = np.zeros((h, 24, 4), np.uint8); self.h = h

    def px(self, x, y, c):
        if 0 <= x < 24 and 0 <= y < self.h: self.a[y, x] = hx(c) if isinstance(c, str) else c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): self.px(x, y, c)

    def image(self):
        a = self.a.copy(); m = a[:, :, 3] > 0
        d = np.zeros_like(m); d[1:] |= m[:-1]; d[:-1] |= m[1:]; d[:, 1:] |= m[:, :-1]; d[:, :-1] |= m[:, 1:]
        a[d & ~m] = OL
        return Image.fromarray(a)


def body(g, top, top_sh, arm, arm_sh, pants, pants_sh, shoe, legs='bench', bare_arms=None, sleeve_rows=0):
    # torso
    g.rect(7, 11, 16, 20, top); g.rect(6, 11, 17, 12, top)
    g.rect(15, 13, 16, 20, top_sh)
    # arms (sleeve colour, optionally bare skin below the sleeve)
    for x0 in (5, 17):
        g.rect(x0, 12, x0 + 1, 19, arm)
        g.px(x0 + 1 if x0 == 17 else x0, 19, arm_sh)
        if bare_arms:
            g.rect(x0, 12 + sleeve_rows, x0 + 1, 19, bare_arms)
    # hands resting on the lap
    skin = bare_arms or arm
    g.rect(7, 19, 8, 20, HAND); g.rect(15, 19, 16, 20, HAND)
    if legs == 'bench':
        g.rect(7, 21, 16, 23, pants); g.rect(7, 23, 16, 23, pants_sh); g.rect(8, 21, 15, 21, LAP_HI.get(pants, pants))
        for x0 in (8, 13):
            g.rect(x0, 24, x0 + 2, 28, pants); g.px(x0 + 2, 25, pants_sh); g.px(x0 + 2, 26, pants_sh)
            g.rect(x0 - 1, 29, x0 + 2, 30, shoe)
    else:  # cross-legged on the floor
        g.rect(5, 21, 18, 21, pants); g.rect(3, 22, 20, 23, pants); g.rect(3, 24, 20, 24, pants_sh)
        g.rect(9, 22, 10, 23, shoe); g.rect(13, 22, 14, 23, shoe)
        g.px(11, 23, pants_sh); g.px(12, 23, pants_sh)


HAND = hx('EDBB8E')
LAP_HI = {'2A272E': '4A4650', '2A2A30': '5A5A64', 'B6CDE2': 'D6E5F1'}


def face(g, skin, skin_sh, eye='2C1A12', brow='2C1A12', thick_brows=False, blush='EEA58C', mouth='C46A62'):
    g.rect(9, 3, 14, 8, skin); g.rect(10, 9, 13, 9, skin); g.rect(10, 10, 13, 10, skin_sh)   # face, chin, neck
    g.px(14, 7, skin_sh); g.px(13, 9, skin_sh)
    g.px(10, 5, eye); g.px(13, 5, eye)
    g.px(10, 4, brow); g.px(13, 4, brow)
    if thick_brows: g.px(9, 4, brow); g.px(14, 4, brow)
    g.px(9, 6, blush); g.px(14, 6, blush)
    g.px(11, 6, skin_sh)
    g.px(11, 8, mouth); g.px(12, 8, mouth); g.px(10, 7, skin); g.px(13, 7, skin)


def curls(g, ramp, tip, rx, bottom, seed):
    rng = np.random.default_rng(seed); cx = 11.5
    for y in range(0, bottom + 1):
        if y <= 3: half = rx - (3 - y) * 0.9
        elif y <= 10: half = rx + 0.4
        else: half = rx - (y - 10) * 0.25
        for x in range(24):
            if abs(x + 0.5 - cx - 0.0) <= half:
                in_face = 9 <= x <= 14 and 3 <= y <= 9
                in_body = 7 <= x <= 16 and y >= 11 and abs(x + 0.5 - cx) < half - 2.2
                if in_face or in_body: continue
                r = rng.random()
                c = ramp[1] if r < .45 else ramp[2] if r < .75 else ramp[0] if r < .9 else tip
                if y > bottom - 3 and rng.random() < .5: c = tip
                g.px(x, y, c)
    # little fringe curls over the forehead
    for x in (9, 11, 13): g.px(x, 3, ramp[1])


def straight(g, ramp, rx, bottom, part=11):
    cx = 11.5
    for y in range(0, bottom + 1):
        half = rx - (3 - y) * 1.0 if y <= 3 else rx
        for x in range(24):
            if abs(x + 0.5 - cx) <= half:
                if 9 <= x <= 14 and 3 <= y <= 9: continue
                if 7 <= x <= 16 and y >= 11 and abs(x + 0.5 - cx) < half - 1.6: continue
                c = ramp[1]
                if x in (int(cx - half) + 1, int(cx + half) - 1): c = ramp[2]
                if y == 1 and x < part: c = ramp[0]
                g.px(x, y, c)
    g.px(part, 1, ramp[2]); g.px(part, 2, ramp[2])
    g.rect(9, 3, 11, 3, ramp[1]); g.px(12, 3, ramp[2])   # side-swept fringe


def roni():
    g = G(31)
    SK = ['FAD9BE', 'F0BE9A', 'D69A78']; global HAND; HAND = hx(SK[1])
    body(g, '2A272E', '1C1A20', SK[1], SK[2], '2A272E', '1C1A20', 'F4F4F0', bare_arms=SK[1], sleeve_rows=0)
    g.rect(6, 11, 6, 12, SK[1]); g.rect(17, 11, 17, 12, SK[1])          # tank top straps leave shoulders bare
    for y in range(24, 29): g.px(8, y, 'F4F4F0'); g.px(15, y, 'F4F4F0')  # side stripes on the pants
    curls(g, ['9A6238', '6A3C22', '4A2716'], 'C08850', 6.2, 13, 1)
    face(g, SK[1], SK[2])
    for x in (9, 11, 12, 14): g.px(x, 5, 'E2B850')                      # round gold glasses
    g.px(11, 7, 'C8CDD4')                                                 # septum
    g.rect(10, 11, 13, 11, 'E2B850'); g.px(11, 13, 'E2B850'); g.px(12, 13, 'E2B850')  # gold layered chains
    return g.image()


def hadar():
    g = G(31)
    SK = ['F7D4B6', 'EBB693', 'CF916E']; global HAND; HAND = hx(SK[1])
    body(g, '7E6048', '5E4634', '7E6048', '5E4634', 'B6CDE2', '94AEC8', '34343A')
    g.rect(10, 11, 13, 20, 'A8A9AC'); g.rect(13, 12, 13, 20, '8A8B90')   # grey hoodie under the work jacket
    g.rect(8, 11, 9, 12, '2A2420'); g.rect(14, 11, 15, 12, '2A2420')     # corduroy collar
    for x in (8, 15): g.px(x, 29, 'FFFFFF')                               # white laces
    straight(g, ['54444A', '2C201E', '1C1412'], 4.2, 8)
    face(g, SK[1], SK[2])
    g.px(12, 7, 'C8CDD4')                                                 # nose ring
    # orange bucket hat with sunglasses resting on it
    g.rect(8, 0, 15, 2, 'F26A28'); g.rect(6, 3, 17, 3, 'C8501A'); g.rect(9, 0, 14, 0, 'FF9A5A')
    g.rect(9, 1, 14, 1, '2E2E36'); g.px(11, 1, 'F26A28'); g.px(12, 1, 'F26A28')
    return g.image()


def shai():
    g = G(31)
    SK = ['F4CFAE', 'E6B08A', 'C98C66']; global HAND; HAND = hx(SK[1])
    body(g, '2A2A30', '1A1A1E', '2A2A30', '1A1A1E', '2A2A30', '1A1A1E', '1A1A1E')
    g.px(9, 14, '5A5A64'); g.px(9, 15, '5A5A64')                         # leather sheen
    straight(g, ['8A4634', '4E2820', '341A16'], 4.8, 17, part=9)
    # grey fluffy scarf with cream fringe
    g.rect(8, 10, 15, 12, '7A7480'); g.rect(9, 10, 14, 10, 'ABA3AE'); g.rect(10, 13, 13, 15, '7A7480')
    for x in (10, 12): g.px(x, 16, 'DCD4C8')
    for x in (11, 13): g.px(x, 16, 'DCD4C8') if x == 13 else None
    face(g, SK[1], SK[2], eye='1E0E0C')
    g.px(15, 5, '1E0E0C')                                                 # winged liner
    g.px(8, 7, 'C8CDD4'); g.px(15, 7, 'C8CDD4')                          # silver drop earrings
    return g.image()


def amber():
    g = G(26)
    SK = ['F7D6B8', 'EAB994', 'CD966F']; global HAND; HAND = hx(SK[1])
    body(g, '2A272E', '1C1A20', '2A272E', '1C1A20', '2A272E', '1C1A20', '1C1A20', legs='cross', bare_arms=SK[1], sleeve_rows=2)
    g.rect(7, 19, 16, 19, 'A0623A'); g.px(11, 19, 'E2C178')             # brown leather belt
    for i, y in enumerate(range(11, 19)): g.px(15 - i, y, '74401F')      # crossbody strap
    g.rect(5, 18, 7, 20, '74401F'); g.px(6, 18, 'A0623A')                # the bag at her hip
    g.px(11, 13, 'C8CDD4'); g.px(11, 14, 'C8CDD4'); g.px(11, 15, '8FB8C8')  # long silver chain + oval stone
    curls(g, ['B07A44', '6E4426', '4A2A16'], 'DCA85A', 5.4, 18, 4)
    face(g, SK[1], SK[2])
    g.px(12, 7, 'C8CDD4')
    return g.image()


def noa():
    g = G(26)
    SK = ['F4CBA4', 'E2AA7C', 'C2875C']; global HAND; HAND = hx(SK[1])
    body(g, 'F0EEE8', 'D6D2C8', 'F0EEE8', 'D6D2C8', '2A272E', '1C1A20', 'F4F4F0', legs='cross', bare_arms=SK[1], sleeve_rows=2)
    g.rect(7, 15, 16, 15, '3A9A8C'); g.rect(7, 17, 16, 17, '2A3040')     # teal + navy stripes
    g.rect(5, 13, 6, 13, '3A9A8C'); g.rect(17, 13, 18, 13, '3A9A8C')
    g.px(10, 11, 'D9AE4A'); g.px(11, 12, 'D9AE4A'); g.px(12, 12, 'D9AE4A'); g.px(13, 11, 'D9AE4A')  # gold Cuban chain
    curls(g, ['6A4A3E', '3A2620', '261814'], '4E342A', 5.4, 18, 7)
    face(g, SK[1], SK[2], brow='1E120C', thick_brows=True)
    g.px(11, 7, 'D9AE4A'); g.px(12, 7, 'D9AE4A')                          # gold septum
    g.px(9, 7, 'A86A48'); g.px(14, 6, 'A86A48')                           # freckles
    # cream woven cowboy hat with a dark band
    g.rect(8, 0, 15, 1, 'EEE2C2'); g.rect(9, 0, 14, 0, 'FFF6DE'); g.rect(8, 2, 15, 2, '3A2A22')
    g.rect(4, 3, 19, 3, 'CFC09A'); g.px(4, 2, 'CFC09A'); g.px(19, 2, 'CFC09A')
    return g.image()


FRIENDS = [('roni', roni), ('hadar', hadar), ('shai', shai), ('amber', amber), ('noa', noa)]

if __name__ == '__main__':
    for n, fn in FRIENDS:
        fn().save(f'kitchen/friend_{n}.png')
    print('friends ok')
