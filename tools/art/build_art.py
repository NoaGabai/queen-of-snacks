#!/usr/bin/env python3
"""
מייצר את כל התמונות של המטבח ועולמות 1–2 מתוך מחוללי העיצוב, ואת js/art-data.js.

הרצה (מתיקיית המשחק):  python3 tools/art/build_art.py
  • המחוללים רצים מתוך assets/, ולכן התוצאות נכתבות ל-assets/kitchen/, assets/world1/ ו-assets/world2/
  • מסכות ההליכה של עולם 2 (walk.png) נארזות לתוך art-data.js (בלי getImageData, כדי שיעבוד מ-file://)
  • שני חלקים קטנים שהיו רק בתוך אב-הטיפוס (שקית הפאוץ' וצל העננים) נוצרים כאן
  • כל קובצי layout.json מאוחדים ל-js/art-data.js (כי דפדפן לא טוען JSON מקובץ מקומי)
  • תמונות לקיר: לשים 4 תמונות ב-assets/photos/ ולהריץ שוב
"""
import json, os, subprocess, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ART = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(ROOT, 'assets')
env = dict(os.environ, PYTHONPATH=ART + os.pathsep + os.environ.get('PYTHONPATH', ''))

for script in ('kitchen.py', 'mai_walk.py', 'friends_map.py', 'world1.py', 'world1_screens.py',
               'chars.py', 'veggies.py', 'boss_onion.py', 'world2.py', 'world2_screens.py', 'boss_pickle.py'):
    r = subprocess.run([sys.executable, os.path.join(ART, script)], cwd=ASSETS, env=env, capture_output=True, text=True)
    sys.stdout.write(r.stdout); sys.stderr.write(r.stderr)
    if r.returncode: sys.exit(f'נכשל: {script}')

# ---- extras that only existed inside the design prototype
sys.path.insert(0, ART); os.chdir(ASSETS)
import numpy as np
from PIL import Image, ImageDraw
from world1 import bag, lettuce
bag('F29CC0', 'C86E96', 'heart').save('world1/bag_pouch.png')          # pink + heart = accessory (art-bible 5.3)
leaf = np.array(lettuce(116, 66, seed=3))                                # cloud shadow: soft lettuce-leaf silhouette
sil = np.zeros_like(leaf); sil[leaf[:, :, 3] > 0] = (40, 60, 20, 255)
Image.fromarray(sil).save('world1/cloud_shadow.png')

# ---- world 2: battle backgrounds, Hadar on the map, and tidy the design previews away
from boss_pickle import background
background('swamp').save('world2/bg_swamp.png'); background('jar').save('world2/bg_jar.png')
Image.open('kitchen/friend_hadar.png').crop((0, 0, 24, 22)).save('world2/hadar_top.png')
# עולם 2 מסך 1 נכתב ישר ל-world2/ – מעבירים ל-world2/s1/ כמו שאר המסכים
import shutil
os.makedirs('world2/s1', exist_ok=True)
for f in ['ground.png', 'walk.png', 'layout.json'] + [os.path.basename(p) for p in glob.glob('world2/obj_*.png')]:
    shutil.move(f'world2/{f}', f'world2/s1/{f}')
for junk in ['w2_preview_x3.png', 'w2_walk_check.png', 'w2_s2_x3.png', 'w2_s3_x3.png', 'w2_s4_x3.png', 'pickle_zoom.png',
             'world2/preview.png', 'world2/map_overview.png'] + glob.glob('world2/s*/preview.png'):
    if os.path.exists(junk): os.remove(junk)

# מסכת הליכה ← מחרוזת base64 של ביטים (480×270, שורה אחרי שורה; 1 = מותר לעמוד)
import base64
def pack_walk(path):
    a = (np.array(Image.open(path).convert('L')) > 127).astype(np.uint8).flatten()
    return base64.b64encode(np.packbits(a).tobytes()).decode()

# ---- layouts → js/art-data.js
data = {'kitchen': json.load(open('kitchen/layout.json')), 'world1': {}, 'world2': {}}
for s in ('s1', 's2', 's3', 's4'):
    data['world1'][s] = json.load(open(f'world1/{s}/layout.json'))
    L = json.load(open(f'world2/{s}/layout.json')); L['walk'] = pack_walk(f'world2/{s}/walk.png')
    data['world2'][s] = L
    os.remove(f'world2/{s}/walk.png')
out = os.path.join(ROOT, 'js', 'art-data.js')
with open(out, 'w', encoding='utf-8') as f:
    f.write('// נוצר אוטומטית ע"י tools/art/build_art.py – לא לערוך ידנית.\n')
    f.write('const ART = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('art-data.js נכתב ·', sum(len(data['world1'][s]['objects']) for s in data['world1']), 'אובייקטים בעולם 1 ·',
      sum(len(data['world2'][s]['objects']) for s in data['world2']), 'בעולם 2')
