"""World 2 screens 2-4 (the map is 2x2 screens, like world 1):
   S3 (NW)  Hadar's pickle stand in the fog   |  S4 (NE)  Lizzy 2 + the giant tilted jar (boss gate)
   S1 (SW)  entrance + Lizzy 1                |  S2 (SE)  peppercorn wall + secret pocket (slippers)
Main path: S1 -> east -> S2 -> north -> S4.  Side path: S1 -> north -> S3 (dead end, Hadar).
Boardwalk joints line up: S1/S2 at y 196-212, S1/S3 and S2/S4 at x 292-308.
"""
import json, math, os, random
import numpy as np
from PIL import Image, ImageDraw
from world2 import (W, H, hx, new, outline, bag, swamp_ground, dill_reeds, giant_pickle, jar, lily_cuke,
                    BRINE, TEAL, MUD, BOARD, DILL, UMBEL, PICKLE, GLASS, GOLD, PEPPER, FOAM)

random.seed(9)


# ------------------------------------------------------------------ new pieces
def peppercorn_wall(w=60, rows=3, seed=0):
    """A wall of giant black peppercorns (each ~11px): wrinkled, dark, with a dull shine."""
    rnd = random.Random(seed); h = rows * 9 + 8
    PC = [hx('9A877C'), hx('54433C'), hx('34282A'), hx('1C1416')]   # peppercorn: near-black, grey-brown shine
    im = new(w, h); d = ImageDraw.Draw(im)
    for r in range(rows):
        y = h - 7 - r * 9; off = 0 if r % 2 == 0 else 5
        for x in range(4 + off, w - 4, 10):
            cx, cy = x + rnd.randint(-1, 1), y + rnd.randint(-1, 1); rr = 5 + rnd.randint(0, 1)
            d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=PC[3])
            d.ellipse((cx - rr, cy - rr, cx + rr - 1, cy + rr - 1), fill=PC[2])
            d.ellipse((cx - rr + 1, cy - rr + 1, cx + rr - 3, cy + rr - 3), fill=PC[1])
            for k in range(4):          # wrinkly net
                a0 = rnd.random() * math.tau; r1 = rnd.uniform(1, 3)
                d.line((cx + r1 * math.cos(a0), cy + r1 * math.sin(a0), cx + (r1 + 2) * math.cos(a0 + .9), cy + (r1 + 2) * math.sin(a0 + .9)), fill=PC[3])
            d.point((cx - 2, cy - 3), PC[0]); d.point((cx - 3, cy - 2), PC[0]); d.point((cx - 2, cy - 2), hx('C8B8AC'))
    return outline(im)


def pickle_stand(part="back"):
    """Hadar's little pickle stand: plank counter, jar shelf, turquoise-cream awning, chalk pickle sign."""
    im = new(72, 58); d = ImageDraw.Draw(im)
    # posts + awning
    for x in (4, 65): d.rectangle((x, 8, x + 2, 56), fill=BOARD[2]); d.line((x, 8, x, 56), fill=BOARD[1])
    for i, x in enumerate(range(1, 71, 7)):
        d.rectangle((x, 2, x + 6, 11), fill=TEAL[2] if i % 2 == 0 else hx('F2E8D5'))
        d.polygon([(x, 11), (x + 6, 11), (x + 3, 15)], fill=TEAL[3] if i % 2 == 0 else hx('D8CCB4'))
    d.line((1, 2, 70, 2), fill=TEAL[1])
    if part == 'front':
        im = new(72, 58); d = ImageDraw.Draw(im)
    else:
        # back shelves with jars, left and right of Hadar
        d.rectangle((8, 26, 22, 28), fill=BOARD[2]); d.rectangle((50, 26, 63, 28), fill=BOARD[2])
    for i, x in enumerate((9, 15, 51, 57) if part == 'back' else ()):
        x = x; d.rectangle((x, 19, x + 4, 26), fill=GLASS[1]); d.rectangle((x, 18, x + 4, 19), fill=GOLD[1])
        d.rectangle((x + 1, 21, x + 3, 25), fill=PICKLE[1] if i % 2 == 0 else hx('D9C24A'))
    if part == 'back': return outline(im)
    for i, x in enumerate(()):
        d.rectangle((x, 15, x + 6, 22), fill=GLASS[1]); d.rectangle((x, 14, x + 6, 15), fill=GOLD[1])
        d.rectangle((x + 2, 17, x + 4, 21), fill=PICKLE[1] if i % 2 == 0 else hx('D9C24A'))
    # counter (front) - leaves the space above it for Hadar
    d.rectangle((2, 38, 69, 56), fill=BOARD[1])
    for x in range(2, 70, 5): d.line((x, 39, x, 56), fill=BOARD[3] if x % 10 == 2 else BOARD[0])
    d.rectangle((0, 35, 71, 39), fill=BOARD[0]); d.line((0, 39, 71, 39), fill=BOARD[3])
    # chalk sign hanging on the counter: a pickle drawn in chalk
    d.rectangle((24, 43, 46, 53), fill=hx('2E3A34')); d.rectangle((24, 43, 46, 44), fill=BOARD[2])
    d.rounded_rectangle((29, 46, 41, 50), radius=2, outline=hx('DDEBD6')); d.point((33, 48), hx('DDEBD6')); d.point((37, 47), hx('DDEBD6'))
    return outline(im)


def counter_items():
    """What stands on the counter, drawn after Hadar: a paper coffee cup + a bowl of pickles."""
    im = new(72, 12); d = ImageDraw.Draw(im)
    d.polygon([(45, 5), (48, 5), (48, 10), (45, 10)], fill=hx('F7F4EC')); d.line((45, 4, 48, 4), fill=hx('6A4026'))
    d.line((45, 7, 48, 7), fill=hx('C9A06A'))   # cup sleeve
    d.point((46, 2), hx('ECF4EC')); d.point((47, 1), hx('ECF4EC'))   # steam
    d.ellipse((14, 6, 26, 11), fill=hx('B8956A')); d.ellipse((15, 5, 25, 8), fill=PICKLE[1])
    for x in (17, 20, 23): d.point((x, 5), PICKLE[0])
    pad = new(72, 34); pad.alpha_composite(outline(im), (0, 0))   # transparent padding: sorts in front of the counter
    return pad


def tilted_jar_gate():
    """The boss gate: a giant pickle jar lying tilted on its side, mouth toward Mai, sealed by a huge gold lid.
    A pair of glasses is engraved on the lid (the Pickle's seal)."""
    im = new(170, 132); d = ImageDraw.Draw(im)
    # jar body seen from the front-left, tilted: big glass cylinder going back up-right
    body = [(40, 46), (150, 6), (168, 52), (164, 92), (60, 126)]
    d.polygon(body, fill=GLASS[2])
    d.polygon([(48, 52), (148, 14), (160, 52), (157, 86), (62, 116)], fill=hx('9CCBB4'))   # brine inside
    for i, (x, y) in enumerate(((80, 70), (104, 58), (128, 46), (92, 94), (120, 80), (146, 64))):   # giant pickles inside
        d.rounded_rectangle((x - 7, y - 4, x + 15, y + 6), radius=5, fill=PICKLE[1])
        d.line((x - 4, y - 3, x + 12, y - 3), fill=PICKLE[0])
        for j in range(3): d.point((x + j * 6 - 2, y + 2), PICKLE[3])
    for k in range(8): d.point((70 + k * 11, 108 - k * 6 + (k % 2) * 5), PEPPER[2])
    d.line((50, 56, 146, 18), fill=GLASS[0]); d.line((54, 62, 120, 36), fill=GLASS[1])   # shine
    d.line((64, 122, 162, 88), fill=GLASS[3])
    d.ellipse((146, 4, 169, 92), outline=GLASS[3]); d.arc((148, 8, 167, 88), 200, 330, fill=GLASS[0])
    # the gold lid (mouth of the jar facing Mai), a big ellipse standing up
    cx, cy, rx, ry = 44, 86, 30, 42
    d.ellipse((cx - rx - 2, cy - ry + 2, cx + rx + 2, cy + ry + 4), fill=GOLD[3])
    d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=GOLD[2])
    d.ellipse((cx - rx + 4, cy - ry + 4, cx + rx - 4, cy + ry - 4), fill=GOLD[1])
    for k in range(24):     # ridged rim
        a0 = k / 24 * math.tau; d.point((round(cx + (rx - 2) * math.cos(a0)), round(cy + (ry - 2) * math.sin(a0))), GOLD[3])
    d.ellipse((cx - 18, cy - 30, cx - 4, cy - 14), fill=GOLD[0])
    # engraved glasses seal
    for ex in (-10, 10):
        d.ellipse((cx + ex - 7, cy - 4, cx + ex + 7, cy + 8), outline=GOLD[3])
        d.arc((cx + ex - 6, cy - 3, cx + ex + 6, cy + 7), 200, 300, fill=GOLD[0])
    d.line((cx - 3, cy + 1, cx + 3, cy + 1), fill=GOLD[3])
    d.line((cx - 17, cy, cx - 22, cy - 3), fill=GOLD[3]); d.line((cx + 17, cy, cx + 22, cy - 3), fill=GOLD[3])
    # small bumps on the seal so it reads as "pickle"
    for x, y in ((cx - 14, cy + 22), (cx - 4, cy + 26), (cx + 8, cy + 24), (cx + 16, cy + 18), (cx - 18, cy + 14)): d.point((x, y), GOLD[0]); d.point((x, y + 1), GOLD[3])
    im = outline(im); d = ImageDraw.Draw(im)
    # sunk into the mud at the bottom
    d.ellipse((6, 118, 120, 131), fill=MUD[2]); d.ellipse((10, 118, 116, 128), fill=MUD[1])
    return im


def fog_bank(w, h, seed=0):
    """Static dense fog (a soft dithered blob); drawn semi-transparent above the objects."""
    rnd = random.Random(seed); m = Image.new('L', (w, h), 0); d = ImageDraw.Draw(m)
    for _ in range(12):
        cx, cy = rnd.uniform(.15, .85) * w, rnd.uniform(.3, .7) * h; rx, ry = rnd.uniform(.12, .28) * w, rnd.uniform(.22, .38) * h
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
    a = np.array(m) > 0
    core = a.copy()
    for k in range(1, 6): core &= np.roll(a, k, 0) & np.roll(a, -k, 0) & np.roll(a, k, 1) & np.roll(a, -k, 1)
    yy, xx = np.mgrid[0:h, 0:w]
    out = np.zeros((h, w, 4), np.uint8)
    out[a & ~core & ((xx + yy) % 2 == 0)] = (236, 244, 236, 255); out[core] = (236, 244, 236, 255)
    return Image.fromarray(out)


def lid_lizzy():
    from world2 import lizzy_lid
    return lizzy_lid()


# ------------------------------------------------------------------ build helpers
def build(name, gimg, walk, objs, layout, extra_prev=()):
    out = f'world2/{name}'; os.makedirs(out, exist_ok=True)
    gimg.save(f'{out}/ground.png')
    Image.fromarray((walk * 255).astype(np.uint8)).save(f'{out}/walk.png')
    L = []
    for oid, img, fx, fy, block in objs:
        x = int(fx - img.width / 2); y = int(fy - img.height)
        img.save(f'{out}/obj_{oid}.png')
        L.append(dict(id=oid, x=x, y=y, foot=fy, w=img.width, h=img.height, block=[round(v) for v in block] if block else None))
    layout.update(size=[W, H], objects=L)
    json.dump(layout, open(f'{out}/layout.json', 'w'), indent=1)
    prev = gimg.copy()
    items = [(o['foot'], img, o['x'], o['y']) for o, (oid, img, fx, fy, block) in zip(L, objs)] + list(extra_prev)
    for foot, img, x, y in sorted(items, key=lambda t: t[0]): prev.alpha_composite(img, (int(x), int(y)))
    for fid, (fx, fy, fw, fh, alpha) in (layout.get('fogbanks') or {}).items():
        f = np.array(Image.open(f'{out}/{fid}.png')); f[:, :, 3] = (f[:, :, 3] * alpha).astype(np.uint8); prev.alpha_composite(Image.fromarray(f), (fx, fy))
    prev.save(f'{out}/preview.png')
    from scipy import ndimage
    print(name, 'objects', len(L), 'walk components', ndimage.label(walk)[1])
    return prev


def dill(oid, x, fy, n, h, seed, spread=9):
    img = dill_reeds(n, h, seed=seed, spread=spread)
    return (oid, img, x, fy, (x - img.width / 2 + 8, fy - 8, x + img.width / 2 - 8, fy + 2))


MAI = lambda: Image.open('kitchen/mai_walk.png').crop((0, 108, 24, 144))


# ------------------------------------------------------------------ S2: peppercorn wall
def screen2():
    banks = [(232, 204, 54, 26),    # D, where the east boardwalk lands
             (300, 112, 50, 24),    # E, under the north boardwalk
             (444, 116, 34, 16),    # F, little bank in front of the wall
             (440, 34, 54, 30)]     # P, the secret pocket behind the peppercorns (north-east)
    walks = [(0, 196, 186, 212, 'h'),     # from S1
             (262, 124, 278, 184, 'v'),   # D -> E
             (292, 0, 308, 92, 'v'),      # E -> S4
             (334, 106, 414, 120, 'h'),   # E -> F (overlaps the bank)
             (430, 64, 442, 104, 'v')]    # F -> through the gap -> pocket
    paws = [(436, 112), (440, 104), (434, 96), (439, 88), (435, 80), (440, 72), (436, 62)]
    g, walk = swamp_ground(banks, walks, logs=[(150, 236, 214, 250)], slices=((96, 150), (360, 190), (140, 120), (400, 230), (60, 250)),
                           sprigs=((330, 170), (180, 160), (200, 60)), paws=paws, seed=33)
    objs = []
    # the wall: two segments with a narrow gap at x 428-444, standing on bank F's north edge
    objs.append(('wall0', peppercorn_wall(64, 3, 1), 394, 84, (362, 74, 426, 84)))
    objs.append(('wall1', peppercorn_wall(36, 3, 2), 464, 84, (446, 74, 480, 84)))
    objs.append(('wall2', peppercorn_wall(30, 4, 3), 380, 60, (366, 44, 394, 60)))
    objs.append(dill('dill0', 120, 270, 4, 110, 61))
    objs.append(dill('dill1', 186, 150, 3, 96, 62))
    objs.append(dill('dill2', 360, 230, 3, 104, 63))
    objs.append(dill('dill3', 236, 60, 3, 88, 64))
    objs.append(dill('dill4', 470, 270, 3, 100, 65))
    objs.append(('pickle0', giant_pickle(70, 11), 330, 262, None))
    objs.append(('pickle1', giant_pickle(52, 12, flip=True), 70, 150, None))
    objs.append(('jar0', jar(70, 21, sunk=.42, pickles=3), 60, 80, None))
    objs.append(('jar1', jar(54, 22, sunk=.5, pickles=2), 156, 50, None))
    objs.append(('lily0', lily_cuke(3), 268, 160, None)); objs.append(('lily1', lily_cuke(4), 400, 172, None))
    fb = fog_bank(120, 70, 7); fb.save('world2/s2/fog_pocket.png') if os.path.isdir('world2/s2') else None
    layout = dict(bags={'slippers': dict(x=452, foot=40, at=[446, 46])},
                  veggies=[dict(kind='cucumber', x=100, foot=204, range=[40, 200, 170, 210]), dict(kind='olive', x=300, foot=116, range=[272, 108, 330, 124])],
                  paw_prints=[426, 56, 448, 116], gap=[428, 66, 444, 84], fogbanks={'fog_pocket': [380, 0, 120, 70, .55]},
                  start=dict(x=12, y=204))
    os.makedirs('world2/s2', exist_ok=True); fb.save('world2/s2/fog_pocket.png')
    return build('s2', g, walk, objs, layout, extra_prev=[(40, Image.open('world2/bag_slippers.png'), 452 - 7, 40 - 17)])


# ------------------------------------------------------------------ S3: Hadar's stand in the fog
def screen3():
    banks = [(300, 196, 58, 26),    # G, where Mai comes up from S1
             (120, 110, 86, 38)]     # H, Hadar's bank, hidden in fog (north-west)
    walks = [(292, 214, 308, 270, 'v'),   # from S1
             (160, 168, 266, 182, 'h'),   # G -> west
             (160, 118, 174, 168, 'v')]   # -> up onto H
    paws = []
    g, walk = swamp_ground(banks, walks, lids=[], slices=((380, 120), (420, 220), (230, 250), (360, 60), (200, 110)),
                           sprigs=((260, 120), (420, 160), (60, 200)), paws=paws, seed=45)
    objs = []
    objs.append(('standback', pickle_stand('back'), 120, 98, None))
    objs.append(('stand', pickle_stand('front'), 120, 110, (86, 98, 156, 110)))
    objs.append(('counter', counter_items(), 120, 111, None))
    objs.append(dill('dill0', 214, 150, 4, 104, 71, spread=8))      # thicket that screens the stand
    objs.append(dill('dill1', 250, 160, 3, 92, 72))
    objs.append(dill('dill2', 20, 160, 3, 110, 73))
    objs.append(dill('dill3', 420, 110, 4, 118, 74))
    objs.append(dill('dill4', 380, 262, 3, 96, 75))
    objs.append(dill('dill5', 160, 268, 3, 100, 76))
    objs.append(('jar0', jar(66, 31, sunk=.4, pickles=3), 440, 220, None))
    objs.append(('jar1', jar(50, 32, sunk=.5, pickles=1), 300, 70, None))
    objs.append(('pickle0', giant_pickle(64, 21), 240, 228, None))
    objs.append(('lily0', lily_cuke(5), 380, 170, None))
    os.makedirs('world2/s3', exist_ok=True); fog_bank(220, 120, 11).save('world2/s3/fog_stand.png')
    hadar = Image.open('kitchen/friend_hadar.png').crop((0, 0, 24, 22))
    layout = dict(veggies=[dict(kind='olive', x=300, foot=196, range=[268, 186, 336, 208]), dict(kind='cucumber', x=210, foot=176, range=[186, 174, 252, 178])],
                  hadar=dict(x=120, foot=102, top=67, at=[124, 122], hear=[150, 110, 290, 220]),
                  fogbanks={'fog_stand': [14, 40, 220, 120, .5]}, start=dict(x=300, y=262))
    return build('s3', g, walk, objs, layout, extra_prev=[(102, hadar, 120 - 12, 67)])


# ------------------------------------------------------------------ S4: the giant tilted jar
def screen4():
    banks = [(300, 196, 70, 28),    # I, landing from S2
             (250, 118, 100, 34)]   # J, the plaza in front of the jar
    walks = [(292, 214, 308, 270, 'v'),   # from S2
             (300, 140, 316, 176, 'v'),   # I -> J
             (150, 196, 236, 208, 'h')]   # spur west to Lizzy's lid
    g, walk = swamp_ground(banks, walks, lids=[(124, 202, 26, 15)], slices=((420, 220), (60, 250), (440, 150), (40, 120)),
                           sprigs=((380, 250), (200, 250)), seed=57)
    objs = []
    gate = tilted_jar_gate()
    objs.append(('gate', gate, 250, 120, (164, 92, 340, 120)))
    objs.append(('lizzylid', lid_lizzy(), 124, 206, (111, 199, 135, 206)))
    objs.append(dill('dill0', 120, 120, 4, 120, 81))
    objs.append(dill('dill1', 380, 128, 4, 124, 82))
    objs.append(dill('dill2', 30, 220, 3, 100, 83))
    objs.append(dill('dill3', 462, 220, 3, 108, 84))
    objs.append(dill('dill4', 400, 270, 3, 92, 85))
    objs.append(('jar0', jar(60, 41, sunk=.45, pickles=2), 440, 70, None))
    objs.append(('jar1', jar(48, 42, sunk=.5, pickles=2), 40, 60, None))
    objs.append(('pickle0', giant_pickle(60, 31), 200, 262, None))
    objs.append(('lily0', lily_cuke(6), 70, 170, None))
    layout = dict(veggies=[dict(kind='cucumber', x=360, foot=196, range=[336, 188, 362, 210])],
                  lizzy=dict(x=124, foot=206, at=[148, 202]), gate=[166, 2, 336, 120], gate_at=[250, 140], start=dict(x=300, y=262))
    return build('s4', g, walk, objs, layout)


if __name__ == '__main__':
    bag('F29CC0', 'C86E96', 'heart').save('world2/bag_slippers.png')
    p2, p3, p4 = screen2(), screen3(), screen4()
    p1 = Image.open('world2/preview.png')
    m = Image.new('RGBA', (W * 2 + 4, H * 2 + 4), (20, 27, 46, 255))
    m.paste(p3, (0, 0)); m.paste(p4, (W + 4, 0)); m.paste(p1, (0, H + 4)); m.paste(p2, (W + 4, H + 4))
    m.save('world2/map_overview.png')
    for n, p in (('s2', p2), ('s3', p3), ('s4', p4)): p.resize((W * 3, H * 3), Image.NEAREST).save(f'w2_{n}_x3.png')
    print('ok')
