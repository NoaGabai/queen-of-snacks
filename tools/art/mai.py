"""Shared pixel-art helpers for the 64x96 sprites (Canvas, mask_from, palettes).
מקור: assets/mai.py משיחת העיצוב. כאן נשארו רק הכלים והפלטות שמשמשים את chars.py ו-veggies.py
(הציור של מאי גרסה 1 הוסר – מאי גרסה 3 נמצאת ב-chars.py).
"""
import numpy as np
from PIL import Image, ImageDraw

W, H = 64, 96
OUTLINE = (0x3A, 0x26, 0x18)


def hx(s):
    s = s.lstrip('#'); return tuple(int(s[i:i+2], 16) for i in (0, 2, 4))


# ramps: (highlight, base, shadow, deep)
SKIN  = [hx(c) for c in ('F7D6B2', 'EDBB8E', 'D3956B', 'A8694A')]
HAIR  = [hx(c) for c in ('A2633A', '6B3E26', '4E2B1A', '341A0F')]
SWEAT = [hx(c) for c in ('C9CBCE', 'A7A9AC', '85878E', '62646C')]
PANTS = [hx(c) for c in ('878A90', '6E7075', '55575E', '3F4148')]
SHOE  = [hx(c) for c in ('FFFFFF', 'F2F0E8', 'C8C3B6', '9A9383')]
SOLE  = [hx(c) for c in ('E9E2D2', 'D9CFBA', 'B7AA90', '8E826B')]
GOLD  = [hx(c) for c in ('FBE38A', 'E8B730', 'B9861E', '7E5A12')]
FRAME = hx('2A1C12'); LENS = hx('4A3B5C'); LENS_HI = hx('9C8CC4')
EYE = hx('5A3A22'); EYE_DK = hx('24140B'); WHITE = hx('FFFFFF')
LIP = hx('C46A62'); BLUSH = hx('EEA58C'); BROW = hx('3E2214')


def mask_from(draw_fn):
    im = Image.new('L', (W, H), 0)
    draw_fn(ImageDraw.Draw(im))
    return np.array(im) > 0


def shift(m, dx, dy):
    """value at (x,y) = m[y-dy, x-dx] (out of range = False)."""
    out = np.zeros_like(m)
    ys, xs = slice(max(dy, 0), H + min(dy, 0)), slice(max(dx, 0), W + min(dx, 0))
    ys2, xs2 = slice(max(-dy, 0), H + min(-dy, 0)), slice(max(-dx, 0), W + min(-dx, 0))
    out[ys, xs] = m[ys2, xs2]
    return out


class Canvas:
    def __init__(self):
        self.rgb = np.zeros((H, W, 3), np.uint8)
        self.a = np.zeros((H, W), bool)

    def part(self, m, ramp, shade=(3, 2), hi=True, edge=True):
        hl, base, sh, deep = ramp
        col = np.zeros((H, W, 3), np.uint8); col[:] = base
        sdx, sdy = shade
        shadow = m & ~shift(m, -sdx, -sdy)
        col[shadow] = sh
        if hi:
            light = m & ~shift(m, 1, 1) & ~shadow
            col[light] = hl
        if edge:
            e = m & ~(shift(m, 1, 0) & shift(m, -1, 0) & shift(m, 0, 1) & shift(m, 0, -1))
            e_sd = m & ~(shift(m, -1, 0) & shift(m, 0, -1))
            col[e & e_sd] = deep
        self.rgb[m] = col[m]; self.a |= m
        return m

    def px(self, pts, c):
        for x, y in pts:
            if 0 <= x < W and 0 <= y < H:
                self.rgb[y, x] = c; self.a[y, x] = True

    def rect(self, x0, y0, x1, y1, c):
        self.px([(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)], c)

    def outline(self):
        m = self.a
        ring = ~m & (shift(m, 1, 0) | shift(m, -1, 0) | shift(m, 0, 1) | shift(m, 0, -1))
        self.rgb[ring] = OUTLINE; self.a = m | ring

    def image(self, bg_shadow=True):
        img = np.zeros((H, W, 4), np.uint8)
        if bg_shadow:
            sh = mask_from(lambda d: d.ellipse((15, 90, 48, 95), fill=1))
            img[sh] = (0x3A, 0x26, 0x18, 70)
        img[self.a, :3] = self.rgb[self.a]; img[self.a, 3] = 255
        return Image.fromarray(img, 'RGBA')
