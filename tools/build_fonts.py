#!/usr/bin/env python3
"""
אורז את הגופן Heebo בתוך המשחק: assets/fonts/heebo.css עם הגופן מוטמע (base64).

למה מוטמע ולא קובץ רגיל? Chrome חוסם טעינת גופנים מקבצים מקומיים (file://),
וככה המשחק עובד גם בלי אינטרנט וגם בלחיצה כפולה על index.html.

מה צריך בתיקייה assets/fonts/ (אחת מהאפשרויות, הסקריפט מוצא לבד):
  • Heebo-Regular + Heebo-Bold  (‎.woff2 או ‎.ttf)
  • או הגופן המשתנה Heebo-VariableFont_wght.ttf (מכסה 400 ו-700)
הגופן ברישיון SIL OFL – מותר לארוז אותו במשחק.

הרצה:  python3 tools/build_fonts.py
"""
import base64, glob, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, 'assets', 'fonts')
OUT = os.path.join(FONTS, 'heebo.css')
FMT = {'.woff2': 'woff2', '.woff': 'woff', '.ttf': 'truetype', '.otf': 'opentype'}


def find(*names):
    for name in names:
        for ext in ('.woff2', '.woff', '.ttf', '.otf'):
            hits = glob.glob(os.path.join(FONTS, '**', name + ext), recursive=True)
            if hits:
                return hits[0]
    return None


def face(path, weight):
    ext = os.path.splitext(path)[1].lower()
    data = base64.b64encode(open(path, 'rb').read()).decode('ascii')
    mime = 'font/' + {'.woff2': 'woff2', '.woff': 'woff', '.ttf': 'ttf', '.otf': 'otf'}[ext]
    return ("@font-face {\n  font-family: 'Heebo';\n  font-style: normal;\n  font-weight: %s;\n  font-display: block;\n"
            "  src: url(data:%s;base64,%s) format('%s');\n}\n" % (weight, mime, data, FMT[ext]))


regular = find('Heebo-Regular', 'heebo-hebrew-400-normal', 'Heebo-400')
bold = find('Heebo-Bold', 'heebo-hebrew-700-normal', 'Heebo-700')
var = find('Heebo-VariableFont_wght', 'Heebo[wght]', 'Heebo-Variable')

css = '/* נוצר אוטומטית ע"י tools/build_fonts.py – לא לערוך ידנית. Heebo, SIL Open Font License. */\n'
if regular and bold:
    css += face(regular, 400) + face(bold, 700)
    used = [regular, bold]
elif var:
    css += face(var, '400 700')
    used = [var]
else:
    sys.exit('לא נמצאו קובצי Heebo ב-assets/fonts/ (ראו assets/fonts/README.md)')

open(OUT, 'w', encoding='utf-8').write(css)
print('נכתב', os.path.relpath(OUT, ROOT), '(%d KB) מתוך:' % (len(css) // 1024))
for u in used:
    print('  ', os.path.relpath(u, ROOT))
