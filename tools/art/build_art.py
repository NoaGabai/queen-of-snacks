#!/usr/bin/env python3
"""
מייצר את כל התמונות של המטבח ועולם 1 מתוך מחוללי העיצוב, ואת js/art-data.js.

הרצה (מתיקיית המשחק):  python3 tools/art/build_art.py
  • המחוללים רצים מתוך assets/, ולכן התוצאות נכתבות ל-assets/kitchen/ ול-assets/world1/s1..s4/
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
               'chars.py', 'veggies.py', 'boss_onion.py'):
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

# ---- layouts → js/art-data.js
data = {'kitchen': json.load(open('kitchen/layout.json')), 'world1': {}}
for s in ('s1', 's2', 's3', 's4'):
    data['world1'][s] = json.load(open(f'world1/{s}/layout.json'))
out = os.path.join(ROOT, 'js', 'art-data.js')
with open(out, 'w', encoding='utf-8') as f:
    f.write('// נוצר אוטומטית ע"י tools/art/build_art.py – לא לערוך ידנית.\n')
    f.write('const ART = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('art-data.js נכתב ·', sum(len(data['world1'][s]['objects']) for s in data['world1']), 'אובייקטים בעולם 1')
