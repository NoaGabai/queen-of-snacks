// =====================================================================
// שמירות v1 – 3 משבצות שמירה לוקליות בדפדפן (localStorage), בלי שרת.
// לפי game-design.md: "שמירות v1".
// =====================================================================

const WORLD_NAMES = ['', 'גינת הבצל הירוק', 'ביצת החמוצים', 'שדות החציל השרוף', 'מפרץ הסושי', 'טירת הגוואקמולי'];
const FRIENDS = ['רוני', 'הדר', 'שי', 'אמבר', 'נועה'];
const SLOT_COUNT = 3;
const SAVE_VERSION = 1;

// המצב ההתחלתי של משחק חדש (לפי "התקדמות וכלכלה v1" ו"חוקי קרב v1")
function newGameState() {
  return {
    v: SAVE_VERSION,
    world: 1,                 // העולם הנוכחי
    unlockedWorlds: 1,        // כמה עולמות נפתחו
    level: 1, xp: 0,
    hp: CFG.mai.hpBase,       // חיים נוכחיים (המקסימום מחושב מהרמה ומהאביזרים)
    cigs: 0,                  // 🚬
    rugelach: CFG.rugelach.perTrip,
    moves: ['pretzel', 'cuddle'],        // ערכת הפתיחה: בייגלה + התכרבלות
    movesUnlocked: ['pretzel', 'cuddle'],
    accessories: [], accessoriesOwned: [],
    decor: [], oven: [], legendary: [],
    friends: [],              // שמות החברות שנמצאו
    bags: {},                 // { 'w1-move': true, ... }
    defeated: {},             // { 'w1-tomato-1': true, ... }
    flags: {},                // הדרכות שכבר הוצגו וכו'
    place: { scene: 'kitchen', x: 124, y: 222 },    // איפה מאי עומדת: kitchen / world1 (+ screen)
    lastLizzy: null,          // { world: 1, screen: 's1' } – לשם חוזרים מ"מפת הנישנושים"
    playTime: 0,              // בשניות
    createdAt: Date.now(), savedAt: Date.now(),
  };
}

const Save = {
  slot: null,       // מספר המשבצת הפעילה (0–2) או null
  state: null,      // המצב של המשחק הפעיל
  ok: true,         // האם הדפדפן מאפשר שמירה
  _mem: {},         // גיבוי בזיכרון אם localStorage חסום

  key(i) { return 'queen-of-snacks.slot.' + i; },

  _get(k) {
    try { return localStorage.getItem(k); } catch (e) { this.ok = false; return this._mem[k] ?? null; }
  },
  _set(k, v) {
    try { localStorage.setItem(k, v); } catch (e) { this.ok = false; this._mem[k] = v; }
  },
  _del(k) {
    try { localStorage.removeItem(k); } catch (e) { this.ok = false; delete this._mem[k]; }
  },

  // קריאת משבצת (או null אם ריקה / פגומה)
  read(i) {
    const raw = this._get(this.key(i));
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      const st = Object.assign(newGameState(), s);   // שדות חדשים מקבלים ערך ברירת מחדל
      if (!st.place || st.place.scene === 'testroom') st.place = newGameState().place;   // חדר הבדיקה הוסר בשלב 4
      return st;
    } catch (e) { console.warn('משבצת פגומה', i, e); return null; }
  },
  isEmpty(i) { return !this.read(i); },
  all() { return [...Array(SLOT_COUNT).keys()].map(i => this.read(i)); },
  any() { return this.all().some(Boolean); },

  write(i, state) {
    state.savedAt = Date.now();
    this._set(this.key(i), JSON.stringify(state));
  },
  remove(i) { this._del(this.key(i)); if (this.slot === i) { this.slot = null; this.state = null; } },

  // --- פעולות של המשחק הפעיל ---
  startNew(i) { this.slot = i; this.state = newGameState(); this.write(i, this.state); },
  load(i) { const s = this.read(i); if (!s) return false; this.slot = i; this.state = s; return true; },
  // שמירה למשבצת הפעילה (אוטומטית או ידנית)
  saveNow() { if (this.slot === null || !this.state) return false; this.write(this.slot, this.state); return true; },
  // עותק גיבוי של המשחק הנוכחי למשבצת אחרת (למשל לפני בוס).
  // ממשיכים לשחק במשבצת הפעילה; הגיבוי נשאר כמו שהוא.
  saveAs(i) {
    if (!this.state || i === this.slot) return false;
    this.saveNow();
    this.write(i, JSON.parse(JSON.stringify(this.state)));
    return true;
  },
  // מעבר למשחק שמור אחר: קודם שומרים את הנוכחי, כדי ששום דבר לא ילך לאיבוד
  switchTo(i) { this.saveNow(); return this.load(i); },
};

// --- תצוגה (מחזירות HTML קטן עם <bdi> למספרים, לפי art-ui) ---
function formatPlayTime(sec) {
  const m = Math.floor(sec / 60), h = Math.floor(m / 60);
  if (h > 0) return `<bdi dir="ltr">${h}:${String(m % 60).padStart(2, '0')}</bdi> ש׳`;
  return `<bdi>${m}</bdi> דק׳`;
}
function formatDate(ms) {
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// =====================================================================
// חישובים מהשמירה (לפי "התקדמות וכלכלה v1")
// =====================================================================
const LEVEL_XP = CFG.levels.xp;   // ניסיון מצטבר לכל רמה (אינדקס = רמה) – ב-config.js
const MOVE_NAMES = {
  pretzel: 'בייגלה', cuddle: 'התכרבלות בסווטשירט', seeds: 'מטר גרעינים', glasses: 'משקפיים על העיניים',
  choc_bite: 'ביס שוקולד', cracker: 'קרקר שובר', salt_wave: 'גל מלח', choc_syrup: 'סירופ שוקולד',
  chili: 'רוטב צ׳ילי', pancake: 'פנקייק', tabasco: 'טבסקו', chili_gross: 'צ׳ילי גרוס',
};
const MOVE_UNLOCKS = Object.entries(CFG.levels.moves).map(([level, move]) => ({ level: +level, move }));   // מהלכים שנפתחים ברמות
const ACCESSORY_NAMES = { pouch: 'פאוץ׳', slippers: 'נעלי בית פרוותיות', choc_bracelet: 'צמיד שוקולד', red_polish: 'לק אדום', salt_shaker: 'מלחייה', snack_bag: 'תיק נישנושים' };
const LEGENDARY_NAMES = ['פופקורן', 'תפוצ׳יפס', 'אצבעות קינדר', 'צ׳יטוס', 'סופגניה בלי כלום'];

const Stats = {
  levelFor(xp) { let l = 1; for (let i = 1; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) l = i; return l; },
  // חיים מקסימליים: בסיס + לכל רמה, + חוט לליזי, + נעלי בית (המספרים ב-config.js)
  maxHp(st) {
    return CFG.mai.hpBase + CFG.mai.hpPerLevel * (st.level - 1) + (st.decor.includes('yarn') ? CFG.decor.yarn.hp : 0) +
      (st.accessories.includes('slippers') ? CFG.accessories.slippers.hp : 0);
  },
  // רוגלך לכל יציאה: בסיס, + מגש גדול, + מהרמה של CFG.levels.rugelachLevel, + תיק נישנושים
  maxRoga(st) {
    return CFG.rugelach.perTrip + (st.oven.includes('tray') ? CFG.oven.tray.rugelach : 0) + (st.level >= CFG.levels.rugelachLevel ? 1 : 0) +
      (st.accessories.includes('snack_bag') ? CFG.accessories.snack_bag.rugelach : 0);
  },
  // מילוי (ליזי / מטבח)
  refill(st) { st.hp = this.maxHp(st); st.rugelach = Math.max(st.rugelach, this.maxRoga(st)); },
};
