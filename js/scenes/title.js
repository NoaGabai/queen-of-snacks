// =====================================================================
// מסך הפתיחה – לפי malkat-hanishnushim-title-screen-spec.md (המוקאפ המאושר).
//   • האיור (title-scene) והכותרת המפוקסלת (title-wordmark) מצוירים בקנבס העולם, בלי החלקה.
//   • "משחק חדש", "משחק שמור" ו"למאי, מנועה" הם HTML אמיתי (RTL, Heebo) בשכבה #titleRoot.
//     השכבה יושבת מחוץ לבמה המוקטנת, כדי שהמידות המינימליות (44px מגע, 16px טקסט)
//     יחושבו בפיקסלי CSS אמיתיים. המיקומים מחושבים מהבמה: יחידת עולם × u.
//   • מקלדת: Tab / Shift+Tab / Enter / Space הרגילים של הדפדפן (nativeKeys).
//   • "משחק חדש" ← בחירת משבצת (הקיימת) ← פתיח הקומיקס (js/scenes/intro.js) ← המטבח.
//   • "משחק שמור" ← בחירת משבצת (הקיימת) ← נקודת השמירה, בלי הקומיקס.
// =====================================================================

const TITLE_IMAGES = ['title/title-scene', 'title/title-wordmark'];
const TITLE_BG = '#1D1520';
// מעבר מהפתיחה: דעיכה של 180ms לצבע הרקע, או מיידי כשמבקשים להפחית תנועה
function titleFade() {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reduce ? { instant: true } : { ms: 180, color: TITLE_BG };
}

const TitleScene = {
  nativeKeys: true,

  enter() {
    // במסך הפתיחה אין משחק פעיל (הוא כבר נשמר לפני שהגענו לכאן)
    Save.slot = null; Save.state = null;
    this.busy = false; this.starting = false;
    this.build();
    document.body.classList.add('title-on');
    Screen.onFit = () => this.layout();
    this.layout();
    // בירור השמירות "ברקע": עד שהוא מסתיים, "משחק שמור" מושבת
    requestAnimationFrame(() => this.refreshSaves());
    if (!Save.ok) Game.say('הדפדפן הזה לא מאפשר לשמור. המשחק יישמר רק עד שסוגרים את הדף.', 5);
  },
  exit() {
    if (Screen.onFit && this.root) Screen.onFit = null;
    if (this.root) { this.root.remove(); this.root = null; }
    document.body.classList.remove('title-on', 'title-fallback', 'title-picker');
  },

  build() {
    const button = (k, cls, img, label, arrow) => `
      <button type="button" class="tbtn ${cls}" data-k="${k}">
        <span class="face"><img class="bg" src="assets/title/${img}" alt="" draggable="false">${arrow ? '<img class="arrow" src="assets/title/title-arrow.png" alt="" draggable="false">' : ''}<span class="lbl">${label}</span></span>
      </button>`;
    this.root = el(`<div id="titleRoot" lang="he" dir="rtl">
        <h1 class="sr-only">מלכת הנישנושים</h1>
        <canvas class="art" width="${W}" height="${H}" aria-hidden="true"></canvas>
        <div class="tmenu">
          ${button('new', 'primary', 'title-button-primary.png', 'משחק חדש', true)}
          ${button('load', 'secondary', 'title-button-secondary.png', 'משחק שמור', false)}
        </div>
        <p class="ded">למאי, מנועה</p>
      </div>`);
    document.body.appendChild(this.root);
    this.btnNew = this.root.querySelector('[data-k="new"]');
    this.btnLoad = this.root.querySelector('[data-k="load"]');
    this.btnLoad.disabled = true;
    // רק אירוע click (מגע, עכבר, Enter ו-Space על כפתור ממוקד) – בלי מאזינים כפולים
    this.btnNew.addEventListener('click', () => this.newGame());
    this.btnLoad.addEventListener('click', () => this.loadGame());
    this.root.addEventListener('click', e => { if (e.target.closest('.tbtn:not(:disabled)')) Sound.select(); });
    this.drawArt(this.root.querySelector('.art').getContext('2d'));
  },

  refreshSaves() {
    if (!this.root) return;
    let ok = false;
    try { ok = Save.any(); } catch (e) { ok = false; }
    this.btnLoad.disabled = !ok;
  },

  // ---------------------------------------------------------------- פריסה
  layout() {
    if (!this.root || !Screen.rect) return;
    const R = Screen.rect, u = Screen.u, A = Screen.area;
    // גיבוי: במה נמוכה מ-240px, או תצוגת אורך (אין מקום לתפריט בצד)
    const fallback = R.h < 240 || A.h > A.w;
    this.fallback = fallback;
    this.root.classList.toggle('fallback', fallback);
    document.body.classList.toggle('title-fallback', fallback);
    if (fallback) return this.layoutFallback();

    const fs = Math.max(16, 11.5 * u);                 // טקסט הכפתורים
    const hit = Math.max(25 * u, 44);                  // גובה אזור הלחיצה
    const c1 = 145.5 * u, c2 = c1 + Math.max(31 * u, 44);   // מרכזי הכפתורים (ממרכז הפאה)
    const place = (b, cy) => {
      Object.assign(b.style, { left: (R.x + 318 * u) + 'px', top: (R.y + cy - hit / 2) + 'px', width: (128 * u) + 'px', height: hit + 'px' });
      const f = b.querySelector('.face');
      Object.assign(f.style, { top: (hit / 2 - 12.5 * u) + 'px', width: (128 * u) + 'px', height: (25 * u) + 'px' });
      f.style.setProperty('--u', u + 'px');
      const l = b.querySelector('.lbl');
      Object.assign(l.style, { fontSize: fs + 'px', paddingRight: (12 * u) + 'px' });
    };
    place(this.btnNew, c1); place(this.btnLoad, c2);
    // הקדשה: קצה ימני ב-445, מרכז ב-223 – או לפחות 18px מתחת לאזור הלחיצה השני
    const dfs = Math.max(14, 9.5 * u), dlh = dfs * 1.25;
    const dc = Math.max(223 * u, c2 + hit / 2 + 18 + dlh / 2);
    const ded = this.root.querySelector('.ded'), dw = 200 * u;
    Object.assign(ded.style, { left: (R.x + 445 * u - dw) + 'px', width: dw + 'px', top: (R.y + dc - dlh / 2) + 'px', fontSize: dfs + 'px' });
  },

  layoutFallback() {
    // טור נגלל: האיור למעלה, ומתחתיו שני הכפתורים וההקדשה. אותן פעולות, בלי לכפות סיבוב.
    const A = Screen.area, wArt = Math.min(A.w - 24, 720), uf = wArt / W;
    const art = this.root.querySelector('.art');
    Object.assign(art.style, { width: wArt + 'px', height: (wArt * H / W) + 'px' });
    const bw = Math.min(A.w - 24, 128 * Math.max(2, Math.min(uf, 3))), ub = bw / 128;
    const fs = Math.max(16, 11.5 * ub), hit = Math.max(25 * ub, 44);
    for (const b of [this.btnNew, this.btnLoad]) {
      Object.assign(b.style, { left: '', top: '', width: bw + 'px', height: hit + 'px' });
      const f = b.querySelector('.face');
      Object.assign(f.style, { top: (hit / 2 - 12.5 * ub) + 'px', width: bw + 'px', height: (25 * ub) + 'px' });
      f.style.setProperty('--u', ub + 'px');
      Object.assign(b.querySelector('.lbl').style, { fontSize: fs + 'px', paddingRight: (12 * ub) + 'px' });
    }
    this.root.querySelector('.tmenu').style.gap = Math.max(6 * ub, 8) + 'px';
    const ded = this.root.querySelector('.ded');
    Object.assign(ded.style, { left: '', top: '', width: bw + 'px', fontSize: Math.max(14, 9.5 * ub) + 'px' });
  },

  // ---------------------------------------------------------------- פעולות
  lock() { if (this.busy) return false; this.busy = true; return true; },
  // פתיחת בורר המשבצות הקיים מעל המסך; בביטול חוזרים לכפתור שפתח אותו
  openPicker(opt, from) {
    this.root.classList.add('covered');
    document.body.classList.add('title-picker');
    const P = SlotPicker(opt);
    const exit = P.exit;
    P.exit = () => {
      exit();
      if (!this.root || this.starting) return;   // יוצאים מהמסך (המשחק מתחיל)
      this.root.classList.remove('covered');
      document.body.classList.remove('title-picker');
      this.busy = false;
      this.refreshSaves();
      const back = from && !from.disabled ? from : this.btnNew;
      back.focus({ preventScroll: true });
    };
    return P;
  },

  // "משחק חדש": בוחרים משבצת (משבצת מלאה נדרסת רק אחרי אישור), ואז הפתיח בקומיקס
  newGame() {
    if (!this.lock()) return;
    this.openPicker({
      title: 'משחק חדש: באיזו משבצת?',
      isEnabled: () => true,
      onPick: (i, d) => {
        const start = () => {
          if (this.starting) return; this.starting = true;
          try { Save.startNew(i); }
          catch (e) { this.starting = false; Game.say('לא הצלחנו להתחיל משחק חדש.'); return; }
          this.root.classList.add('leaving');
          startIntroComic();                    // js/scenes/intro.js
        };
        if (d) Confirm('בטוחה? המשחק הזה יימחק', start, {
          sub: `משבצת <bdi>${i + 1}</bdi> · רמה <bdi>${d.level}</bdi> · ${formatPlayTime(d.playTime)}`, yes: 'כן, למחוק',
        });
        else start();
      },
    }, this.btnNew);
  },

  // "משחק שמור": רשימת המשבצות, גם כשיש רק אחת. טוענים רק אחרי בחירה, ובלי הקומיקס.
  loadGame() {
    if (this.btnLoad.disabled || !this.lock()) return;
    this.openPicker({
      title: 'מאיפה ממשיכים?',
      isEnabled: (i, d) => !!d,
      canDelete: true,
      onPick: (i) => {
        if (this.starting) return;
        let ok = false;
        try { ok = Save.load(i); } catch (e) { ok = false; }
        if (!ok) { Game.say('לא הצלחנו לטעון את השמירה.'); return; }   // נשארים בבחירה, שום דבר לא נמחק
        this.starting = true; this.root.classList.add('leaving');
        Game.goClean(sceneFor(Save.state), titleFade());
      },
    }, this.btnLoad);
  },

  update() {
    // חיצים מזיזים את המיקוד בין הכפתורים (לא מפעילים כלום)
    if (!this.root || this.fallback === undefined) return;
    for (const [k, d] of [['down', 1], ['up', -1]]) if (Input.was(k)) {
      const it = [this.btnNew, this.btnLoad].filter(b => !b.disabled);
      const i = it.indexOf(document.activeElement);
      const n = it[i < 0 ? 0 : (i + d + it.length) % it.length];
      if (n) n.focus({ preventScroll: true });
    }
  },

  // האיור והכותרת: נכסי תמונה בקנה מידה אחיד, בלי החלקה
  drawArt(c) {
    c.imageSmoothingEnabled = false;
    const bg = Assets.get('title/title-scene'), wm = Assets.get('title/title-wordmark');
    if (bg) c.drawImage(bg, 0, 0); else { c.fillStyle = TITLE_BG; c.fillRect(0, 0, W, H); }
    if (wm) c.drawImage(wm, 290, 52);
  },
  draw() { ctx.imageSmoothingEnabled = false; this.drawArt(ctx); },
};
