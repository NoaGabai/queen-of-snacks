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
    hp: 20,                   // חיים נוכחיים (המקסימום מחושב מהרמה ומהאביזרים)
    cigs: 0,                  // 🚬
    rugelach: 3,
    moves: ['pretzel', 'cuddle'],        // ערכת הפתיחה: בייגלה + התכרבלות
    movesUnlocked: ['pretzel', 'cuddle'],
    accessories: [], accessoriesOwned: [],
    decor: [], oven: [], legendary: [],
    friends: [],              // שמות החברות שנמצאו
    bags: {},                 // { 'w1-move': true, ... }
    defeated: {},             // { 'w1-tomato-1': true, ... }
    flags: {},                // הדרכות שכבר הוצגו וכו'
    place: { scene: 'testroom', x: 120, y: 150 },   // איפה מאי עומדת
    lastLizzy: null,
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
      return Object.assign(newGameState(), s);   // שדות חדשים מקבלים ערך ברירת מחדל
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

// --- תצוגה ---
function formatPlayTime(sec) {
  const m = Math.floor(sec / 60), h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')} ש׳`;
  return `${m} דק׳`;
}
function formatDate(ms) {
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
