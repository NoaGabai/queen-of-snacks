// =====================================================================
// פתיח הקומיקס – נקודת החיבור
//
// מסך הפתיחה קורא ל-startIntroComic() אחרי שמשחק חדש מוכן (Save.startNew).
// סיום הקומיקס וגם דילוג עליו קוראים ל-finishIntro() – אותה נקודת התחלה במטבח,
// וההדרכה של המטבח רצה פעם אחת (flags.kitchenIntro ב-KitchenScene).
//
// ⚠️ הקומיקס עצמו עוד לא קיים. כשהוא יהיה מוכן: להגדיר IntroComicScene
//    (מסך רגיל במנהל המסכים: enter/exit/update/draw) עם כפתור דילוג משלו,
//    ובסוף ובדילוג לקרוא ל-finishIntro(). אז ממלא המקום כאן לא יופיע יותר.
// =====================================================================

function startIntroComic() {
  if (typeof IntroComicScene !== 'undefined') { Game.goClean(IntroComicScene, titleFade()); return; }
  console.warn('פתיח הקומיקס עוד לא מחובר: מוצג מסך ממלא מקום (js/scenes/intro.js)');
  Game.goClean(IntroPlaceholderScene, titleFade());
}

let introFinishing = false;
function finishIntro() {
  if (introFinishing) return;                 // לחיצה כפולה / המשך מקש
  introFinishing = true;
  Game.goClean(KitchenScene, titleFade());
  setTimeout(() => { introFinishing = false; }, 600);
}

// ממלא מקום גלוי (לא דילוג שקט): מסביר שהפתיח עוד לא מחובר, עם "המשך" ו"דילוג"
const IntroPlaceholderScene = {
  id: 'introPlaceholder',
  enter() {
    this.L = Layer(`<div class="panel dialog center introPh" role="dialog" aria-label="פתיח הקומיקס">
        <h2>פתיח הקומיקס</h2>
        <p>כאן יופיע הפתיח בקומיקס: עולם בלי נישנושים, צבא האוכל הבריא, מאי חולמת על 5 הנישנושים האגדיים ומתעוררת במטבח של אמא.</p>
        <p class="dimtxt">ממלא מקום: הקומיקס עוד לא מחובר למשחק.</p>
        <div class="row">${act({ k: 'skip', title: 'דילוג' })}${act({ k: 'done', title: 'המשך' })}</div>
      </div>`, { screen: true, focus: 'done' }).mount();
    this.L.on('done', finishIntro).on('skip', finishIntro);
  },
  exit() { this.L.unmount(); },
  update() { this.L.focus.update(); },
  draw() { ctx.fillStyle = TITLE_BG; ctx.fillRect(0, 0, W, H); },
};
