// =====================================================================
// מלכת הנישנושים – המנוע (שלב 3: מעטפת חדשה)
// במה קבועה 1440×810 שמוקטנת למסך. בתוכה:
//   • קנבס עולם 480×270 (פיקסל-ארט, מוגדל ×3 בלי טשטוש)
//   • שכבת ממשק ב-HTML אמיתי (#ui) לפי art-ui.md
// כאן: לולאת משחק, מנהל מסכים וחלונות, טעינת תמונות, קלט (מקלדת + מגע),
// צלילים, הודעות קופצות ושמירה כשהדף נסגר.
// =====================================================================

const W = 480, H = 270, K = 3;   // עולם 480×270, במה ×3

const PAL = {
  outline: '#3A2618', paper: '#F2E8D5', primary: '#F28C38', secondary: '#7A4FB8',
  heart: '#E8445A', warm: '#FFD99A',
  salty: '#F7C531', sweet: '#8B5A2B', spicy: '#E2231A', plain: '#C9CBCE',
};

// ---------------------------------------------------------------------
// במה וקנבס
// ---------------------------------------------------------------------
const stage = document.getElementById('stage');
const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const UIROOT = document.getElementById('ui');
const Screen = { scale: 1 };

function fit() {
  const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const s = Math.min(vw / 1440, vh / 810);
  Screen.scale = s;
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
}
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 200));
if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);

// עזרים קטנים ל-HTML
const px = n => (n * K) + 'px';                 // פיקסל עולם ← פיקסל במה
function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ---------------------------------------------------------------------
// תמונות
// ---------------------------------------------------------------------
const Assets = {
  images: {},
  load(list) {
    return Promise.all(list.map(name => new Promise(res => {
      const img = new Image();
      img.onload = () => { this.images[name] = img; res(); };
      img.onerror = () => { console.warn('חסרה תמונה:', name); res(); };
      img.src = 'assets/' + name + '.png';
    })));
  },
  get(name) { return this.images[name]; },
};

// ציור תמונה במיקום שלם (כדי שהפיקסלים יישארו חדים)
function drawImg(name, x, y, flip = false) {
  const img = Assets.get(name);
  if (!img) return;
  x = Math.round(x); y = Math.round(y);
  if (flip) {
    ctx.save(); ctx.translate(x + img.width, y); ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0); ctx.restore();
  } else ctx.drawImage(img, x, y);
}
function rect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

// ---------------------------------------------------------------------
// צלילים (Web Audio) – נפתחים רק אחרי נגיעה ראשונה, כך דורשים הדפדפנים
// ---------------------------------------------------------------------
const Sound = {
  ac: null, on: true,
  unlock() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { }
  },
  tone(freq, dur = 0.08, type = 'square', vol = 0.06, slide = 0) {
    if (!this.on || !this.ac) return;
    const t = this.ac.currentTime, o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.ac.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  move() { this.tone(660, 0.05); },
  select() { this.tone(523, 0.07); setTimeout(() => this.tone(784, 0.1), 60); },
  back() { this.tone(392, 0.09, 'square', 0.05, -120); },
};
window.addEventListener('pointerdown', () => Sound.unlock(), true);

// ---------------------------------------------------------------------
// קלט: מקלדת + מגע
// פעולות: up/down/left/right, a (אישור), b (חזרה), phone (פתיחת הטלפון)
// ---------------------------------------------------------------------
const Input = {
  held: {}, pressed: {}, taps: [],
  isTouch: ('ontouchstart' in window) || navigator.maxTouchPoints > 0,
  pad: { active: false },   // הג'ויסטיק והכפתורים מוצגים רק כשמסך מבקש אותם
  _touchHeld: {},
  usedKeys: false,          // האם השתמשו במקלדת (ואז מציגים מיקוד על כפתורים)
  mouse: null,              // מיקום העכבר בעולם (רק עכבר, לא מגע)

  down(a) { if (!this.held[a]) this.pressed[a] = true; this.held[a] = true; },
  up(a) { this.held[a] = false; },
  tap(a) { this.pressed[a] = true; },          // לחיצה חד-פעמית (למשל מכפתור HTML)
  was(a) { return !!this.pressed[a]; },
  is(a) { return !!this.held[a] || !!this._touchHeld[a]; },
  endFrame() { this.pressed = {}; this.taps = []; },
};

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Enter: 'a', NumpadEnter: 'a', Space: 'a', KeyZ: 'a', Escape: 'b', Backspace: 'b', KeyX: 'b',
  KeyP: 'phone', Tab: 'phone',
};
window.addEventListener('keydown', e => {
  Sound.unlock();
  const a = KEYMAP[e.code]; if (!a) return;
  e.preventDefault(); Input.usedKeys = true;
  if (!e.repeat) Input.down(a);
  else if (['up', 'down', 'left', 'right'].includes(a)) Input.pressed[a] = true;   // חזרה בתפריטים כשמחזיקים חץ
});
window.addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) Input.up(a); });
window.addEventListener('blur', () => { Input.held = {}; });

// מיקום נגיעה ← קואורדינטות עולם 480×270
function toGame(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return { x: (clientX - r.left) / r.width * W, y: (clientY - r.top) / r.height * H };
}

// כפתורי המגע (בקואורדינטות עולם; הציור ב-HTML, ב-#pad)
const TouchPad = {
  dpad: { x: 52, y: 214, r: 34 },
  a: { x: 440, y: 222, r: 18 },
  b: { x: 404, y: 242, r: 14 },
  el: document.getElementById('pad'),
  _shown: null, _key: '',
  actionsAt(p) {
    const out = [];
    const d = this.dpad, dx = p.x - d.x, dy = p.y - d.y;
    if (Math.hypot(dx, dy) < d.r * 1.5 && Math.hypot(dx, dy) > 6) {
      if (Math.abs(dx) > Math.abs(dy) * 0.5) out.push(dx < 0 ? 'left' : 'right');
      if (Math.abs(dy) > Math.abs(dx) * 0.5) out.push(dy < 0 ? 'up' : 'down');
    }
    if (Math.hypot(p.x - this.a.x, p.y - this.a.y) < this.a.r * 1.4) out.push('a');
    if (Math.hypot(p.x - this.b.x, p.y - this.b.y) < this.b.r * 1.4) out.push('b');
    return out;
  },
  // מעדכן את ה-HTML רק כשמשהו משתנה
  sync() {
    const show = Input.pad.active;
    if (show !== this._shown) { this.el.hidden = !show; this._shown = show; }
    if (!show) return;
    const h = Input._touchHeld, key = ['up', 'down', 'left', 'right', 'a', 'b'].map(k => h[k] ? 1 : 0).join('');
    if (key === this._key) return;
    this._key = key;
    const q = s => this.el.querySelector(s);
    q('.u').classList.toggle('on', !!h.up); q('.d').classList.toggle('on', !!h.down);
    q('.l').classList.toggle('on', !!h.left); q('.r').classList.toggle('on', !!h.right);
    q('.btn.a').classList.toggle('on', !!h.a); q('.btn.b').classList.toggle('on', !!h.b);
  },
};

const activeTouches = new Map();
function refreshTouchHeld() {
  const held = {};
  if (Input.pad.active) for (const p of activeTouches.values()) for (const a of TouchPad.actionsAt(p)) held[a] = true;
  for (const a of ['a', 'b']) if (held[a] && !Input._touchHeld[a]) Input.pressed[a] = true;
  Input._touchHeld = held;
}
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  try { canvas.setPointerCapture(e.pointerId); } catch (_) { }
  const p = toGame(e.clientX, e.clientY);
  activeTouches.set(e.pointerId, p);
  Input.taps.push(p);
  refreshTouchHeld();
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') Input.mouse = toGame(e.clientX, e.clientY);   // לתוויות ריחוף
  if (!activeTouches.has(e.pointerId)) return;
  activeTouches.set(e.pointerId, toGame(e.clientX, e.clientY)); refreshTouchHeld();
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  canvas.addEventListener(ev, e => { activeTouches.delete(e.pointerId); refreshTouchHeld(); });
}
canvas.addEventListener('pointerleave', () => { Input.mouse = null; });

// ---------------------------------------------------------------------
// מנהל מסכים + חלונות מעל המסך + מעבר בהאפלה
// מסך/חלון = { enter, exit, update(dt), draw(t), usesPad?, countsTime? }
// ---------------------------------------------------------------------
const fadeEl = document.getElementById('fade');
const toastEl = document.getElementById('toast');

const Game = {
  scene: null, next: null, fade: 0, fadeDir: 0, time: 0, toast: null,
  overlays: [],                       // חלונות מעל המסך (טלפון, אישור) – רק העליון מקבל קלט
  push(o) { this.overlays.push(o); o.enter && o.enter(); },
  pop() { const o = this.overlays.pop(); o && o.exit && o.exit(); },
  top() { return this.overlays[this.overlays.length - 1] || this.scene; },
  go(scene) {                         // מעבר רך למסך אחר
    if (!this.scene) { this.scene = scene; scene.enter && scene.enter(); return; }
    this.next = scene; this.fadeDir = 1;
  },
  goClean(scene) { while (this.overlays.length) this.pop(); this.go(scene); },
  // הודעה קופצת בתחתית. אפשר להעביר HTML (למשל אייקון)
  say(html, secs = 2.4) {
    this.toast = { t: secs };
    toastEl.innerHTML = html; toastEl.hidden = false;
  },
  update(dt) {
    this.time += dt;
    if (this.fadeDir) {
      this.fade += this.fadeDir * dt * 4;
      if (this.fade >= 1 && this.fadeDir === 1) {
        this.fade = 1; this.scene.exit && this.scene.exit();
        while (this.overlays.length) this.pop();
        this.scene = this.next; this.next = null; this.scene.enter && this.scene.enter();
        this.fadeDir = -1;
      } else if (this.fade <= 0 && this.fadeDir === -1) { this.fade = 0; this.fadeDir = 0; }
    } else if (this.scene) {
      const top = this.top();
      Input.pad.active = !!(top.usesPad && Input.isTouch);
      top.update(dt);
      // זמן משחק נספר רק במסכי משחק (לא בתפריטים), כולל כשהטלפון פתוח
      if (this.scene.countsTime && Save.state) Save.state.playTime += dt;
    }
    if (this.toast && (this.toast.t -= dt) <= 0) { this.toast = null; toastEl.hidden = true; }
  },
  draw() {
    ctx.clearRect(0, 0, W, H);
    if (this.scene) this.scene.draw(this.time);
    for (const o of this.overlays) o.draw && o.draw(this.time);
    TouchPad.sync();
    fadeEl.style.opacity = this.fade;
    fadeEl.classList.toggle('on', this.fade > 0);
  },
};

function startLoop() {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    Game.update(dt); Game.draw(); Input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// שמירה כשסוגרים / ממזערים את הדף בזמן משחק (כדי שלא יאבד התקדמות)
function saveOnHide() { if (Game.scene && Game.scene.countsTime && Save.state) Save.saveNow(); }
window.addEventListener('pagehide', saveOnHide);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveOnHide(); });
