"""Mai walking on the map: 24x36, 4 directions x 4 frames (contact, pass, contact, pass).
מקור: assets/mai_walk.py משיחת העיצוב (ללא שינוי, חוץ מקובץ התצוגה המקדימה שהוסר).
Output: kitchen/mai_walk.png  (rows: down, left, right, up; 4 frames each, 24x36 per cell)
"""
import numpy as np
from PIL import Image
from kitchen import MAI_ROWS, MAI_PAL, OL, sprite, hx

W, H = 24, 36
MAI_PAL = dict(MAI_PAL); MAI_PAL['L'] = hx('C98E58')
P, p, Wt, w = MAI_PAL['P'], MAI_PAL['p'], MAI_PAL['W'], MAI_PAL['w']


def strip_outline(im):
    """Remove the outer outline ring so the whole figure can be re-outlined after legs are added."""
    a = np.array(im); m = a[:, :, 3] > 0
    t = ~m; adj = np.zeros_like(m)
    adj[1:] |= t[:-1]; adj[:-1] |= t[1:]; adj[:, 1:] |= t[:, :-1]; adj[:, :-1] |= t[:, 1:]
    adj[0, :] = True; adj[-1, :] = True; adj[:, 0] = True; adj[:, -1] = True
    ol = np.all(a == np.array(OL, np.uint8), axis=2)
    a[ol & adj] = 0
    return a


def outline(a):
    m = a[:, :, 3] > 0
    d = np.zeros_like(m); d[1:] |= m[:-1]; d[:-1] |= m[1:]; d[:, 1:] |= m[:, :-1]; d[:, :-1] |= m[:, 1:]
    a = a.copy(); a[d & ~m] = OL
    return Image.fromarray(a)


def put(a, x, y, c):
    if 0 <= x < W and 0 <= y < H: a[y, x] = c


FRONT_UP = MAI_ROWS[:23]

BACK_UP = [
    "........oooooooo........",
    ".......oHHHHHHHHo.......",
    "......oggggggggggo......",
    "......oHHHHhhHHHHo......",
    "......oHHHHhHHHHHo......",
    "......oHHHHHhHHHHo......",
    "......oHHHHHhHHHHo......",
    "......oHHHHhHHHHHo......",
    "......oHHHHHhHHHHo......",
    ".....oHHHHHhHHHHHHo.....",
    ".....oHHHHHHhHHHHHo.....",
    "...oQQHHHHHhHHHHHQQo....",
    "..oQQQHHHHHHhHHHHQQQo...",
    "..oQQqHHHHHhHHHHHqQQo...",
    "..oQQqCHHHHHhHHHCqQQo...",
    "..oQqqoCTHHhHHTCoqqQo...",
    "..oQqooCCTTTTTCcooqQo...",
    "..oQqooCCCCCCCCcooqQo...",
    "..oQqooCCCCCCCCcooqQo...",
    "..oQqooCCCCCCCCcooqQo...",
    "..oSsooCCCCCCCCcoosSo...",
    "...ooo.oCCCCCCCCo.ooo...",
    ".......oCcCcCcCco.......",
]

SIDE_UP = [  # facing left
    ".........ooooo..........",
    "........oHHHHHo.........",
    ".......oggggHHHHo.......",
    ".......oHHHHHhHHo.......",
    "......oSSSHHHHHHHo......",
    "......oeeSSHHHHHHo......",
    ".....oSeSSSHHHhHHo......",
    ".....oSSSSsHHHHHHo......",
    "......omSSsHHHHHHHo.....",
    ".......oSSsHHHHHHHo.....",
    "........oSYHHHHHHTo.....",
    ".......oCCYCCHHHHTo.....",
    "......oCCCCCCCHHHTo.....",
    "......oCQQCCCCCHHTo.....",
    "......oCQQCCCCCcTTo.....",
    "......oCQQqCCCCco.......",
    "......oCQQqCCCCco.......",
    "......oCQqqCCCCco.......",
    "......oCQqqCCCCco.......",
    "......oCSsoCCCCco.......",
    "......oCCCCCCCCco.......",
    "......oCcCcCcCcCo.......",
    ".......ooooooooo........",
]


def upper(rows):
    if rows is BACK_UP:
        rows = [r if i < 4 else r.replace('h', 'H') for i, r in enumerate(rows)]
        out = []
        for i, r in enumerate(rows):
            r = list(r)
            if 3 <= i <= 14:
                hs = [x for x, ch in enumerate(r) if ch == 'H']
                if hs:
                    a, b = hs[0], hs[-1]
                    r[b] = 'h'; r[b - 1] = 'h' if i > 4 else r[b - 1]   # shade on the right
                    if 4 <= i <= 13: r[a + 2] = 'L'                  # straight light strand on the lit side
                    if 6 <= i <= 12: r[(a + b) // 2 + 2] = 'h'       # one soft shadow strand
            out.append(''.join(r))
        rows = out
    rows = [r.ljust(W, '.')[:W] for r in rows]
    return strip_outline(sprite(rows, MAI_PAL).crop((0, 0, W, len(rows))))


def legs_front(a, lift_left=0, lift_right=0):
    for x0, lift, col in ((8, lift_left, P), (13, lift_right, P)):
        bottom = 31 - lift
        for y in range(23, bottom + 1):
            for x in range(x0, x0 + 3): put(a, x, y, col)
            put(a, x0 + 2, y, p)
        for y in (bottom + 1, bottom + 2):
            for x in range(x0 - 1, x0 + 3): put(a, x, y, Wt)
        for x in range(x0 - 1, x0 + 3): put(a, x, bottom + 3, w)


def leg_side(a, hip_x, foot_x, lift, col, sh):
    top, bottom = 22, 31 - lift
    for y in range(top, bottom + 1):
        t = (y - top) / max(1, bottom - top); cx = round(hip_x + (foot_x - hip_x) * t)
        for x in range(cx - 1, cx + 2): put(a, x, y, col)
        put(a, cx + 1, y, sh)
    for y in (bottom + 1, bottom + 2):
        for x in range(foot_x - 2, foot_x + 2): put(a, x, y, Wt)
    for x in range(foot_x - 2, foot_x + 2): put(a, x, bottom + 3, w)


def frame(direction, f):
    a = np.zeros((H, W, 4), np.uint8)
    bob = 1 if f in (1, 3) else 0          # body rises on the passing frames
    if direction in ('down', 'up'):
        legs_front(a, lift_left=2 if f == 1 else 0, lift_right=2 if f == 3 else 0)
        up = upper(FRONT_UP if direction == 'down' else BACK_UP)
    else:
        hip = 12
        far = {0: (hip + 3, 0), 1: (hip, 2), 2: (hip - 3, 0), 3: (hip, 0)}[f]
        near = {0: (hip - 3, 0), 1: (hip, 0), 2: (hip + 3, 0), 3: (hip, 2)}[f]
        leg_side(a, hip + 1, far[0] + 1, far[1], p, MAI_PAL['c'])
        leg_side(a, hip, near[0], near[1], P, p)
        up = upper(SIDE_UP)
    m = up[:, :, 3] > 0
    ys, xs = np.nonzero(m)
    for y, x in zip(ys, xs):
        if 0 <= y - bob < H: a[y - bob, x] = up[y, x]
    im = outline(a)
    if direction == 'right': im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im


DIRS = ['down', 'left', 'right', 'up']

if __name__ == '__main__':
    sheet = Image.new('RGBA', (W * 4, H * 4), (0, 0, 0, 0))
    for r, d in enumerate(DIRS):
        for f in range(4): sheet.alpha_composite(frame(d, f), (f * W, r * H))
    sheet.save('kitchen/mai_walk.png')
    print('mai_walk ok')
