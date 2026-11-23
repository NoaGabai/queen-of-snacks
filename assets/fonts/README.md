# הגופן של המשחק: Heebo (400 + 700)

המשחק משתמש בגופן אחד, Heebo, במשקלים 400 ו-700 (לפי `art-ui.md`). הוא נארז בתוך המשחק כדי שיעבוד בלי אינטרנט וגם מ-`file://`.

## איך מוסיפים אותו (פעם אחת)
1. נכנסים ל-https://fonts.google.com/specimen/Heebo ולוחצים **Get font ← Download all**.
2. פותחים את ה-ZIP ומעתיקים לתיקייה הזו (`assets/fonts/`) את `static/Heebo-Regular.ttf` ואת `static/Heebo-Bold.ttf`.
   (אפשר גם רק את `Heebo-VariableFont_wght.ttf`.)
3. מריצים (או מבקשים משיחת הפיתוח): `python3 tools/build_fonts.py`
   זה יוצר מחדש את `heebo.css` עם הגופן בתוכו.

רישיון: SIL Open Font License 1.1 – מותר לארוז ולהפיץ עם המשחק.
