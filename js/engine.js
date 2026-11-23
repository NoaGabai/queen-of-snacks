// =====================================================================
// מלכת הנישנושים – המנוע (שלב 3: מעטפת חדשה)
// המסך מתמלא כולו, בכל יחס מסך (מחשב / טלפון):
//   • קנבס עולם 480×270 (פיקסל-ארט, ×3 = במה 1440×810), הכי גדול שנכנס, באמצע
//   • מסביבו (#amb) הרחבה מטושטשת של העולם, במקום פסים שחורים
//   • שכבת ממשק ב-HTML אמיתי (#ui) לפי art-ui.md, על כל המסך, בקנה מידה משלה:
//     במסכים קטנים (טלפון) הממשק גדל ביחס לעולם, כדי שהטקסט יהיה קריא (מצב compact)
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

// שטח שימושי = החלון פחות מרווחי הבטיחות של המכשיר (מגרעת, פס מערכת)
const safeProbe = (() => {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  document.body.appendChild(d); return d;
})();
function safeArea() {
  const c = getComputedStyle(safeProbe);
  return { t: parseFloat(c.paddingTop) || 0, r: parseFloat(c.paddingRight) || 0, b: parseFloat(c.paddingBottom) || 0, l: parseFloat(c.paddingLeft) || 0 };
}
const AMB = document.getElementById('amb'), actx = AMB.getContext('2d');
function fit() {
  const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const a = safeArea(), uw = Math.max(1, vw - a.l - a.r), uh = Math.max(1, vh - a.t - a.b);
  // העולם: הכי גדול שנכנס בשטח השימושי, באמצע
  const s = Math.min(uw / 1440, uh / 810);
  Screen.scale = s; Screen.u = s * K;                         // u = פיקסלי CSS ליחידת עולם
  Screen.area = { x: a.l, y: a.t, w: uw, h: uh };
  Screen.rect = { x: a.l + (uw - 1440 * s) / 2, y: a.t + (uh - 810 * s) / 2, w: 1440 * s, h: 810 * s };
  stage.style.left = Screen.rect.x + 'px'; stage.style.top = Screen.rect.y + 'px';
  stage.style.transform = `scale(${s})`;
  // הממשק: מכסה את כל השטח השימושי. קנה המידה שלו לא יורד מתחת ל-0.62 (טקסט קריא בטלפון),
  // אבל הגובה הלוגי שלו לא יורד מתחת ל-540 (כדי שהחלונות ייכנסו)
  const su = Math.max(s, Math.min(0.62, uh / 540));
  Screen.su = su; Screen.uw = uw / su; Screen.uh = uh / su;
  Screen.k = K * s / su;                                      // פיקסלי ממשק ליחידת עולם
  Screen.wx0 = (Screen.rect.x - a.l) / su; Screen.wy0 = (Screen.rect.y - a.t) / su;
  Screen.compact = su > s * 1.04;
  Object.assign(UIROOT.style, { left: a.l + 'px', top: a.t + 'px', width: Screen.uw + 'px', height: Screen.uh + 'px', transform: `scale(${su})` });
  const R = UIROOT.style;
  R.setProperty('--wx', Screen.wx0 + 'px'); R.setProperty('--wy', Screen.wy0 + 'px');
  R.setProperty('--ww', W * Screen.k + 'px'); R.setProperty('--wh', H * Screen.k + 'px');
  document.body.classList.toggle('compact', Screen.compact);
  // הרקע המטושטש: רק כשיש שוליים סביב העולם
  Screen.gutter = Screen.rect.w < vw - 2 || Screen.rect.h < vh - 2;
  AMB.hidden = !Screen.gutter;
  AMB.width = 64; AMB.height = Math.max(8, Math.round(64 * vh / vw));
  fitPanels();
  if (Screen.onFit) Screen.onFit();
}
// עולם ← ממשק: מיקום (בפיקסלי ממשק) של נקודה בעולם 480×270
const ux = x => Screen.wx0 + x * Screen.k;
const uy = y => Screen.wy0 + y * Screen.k;
// מסך (clientX/Y) ← פיקסלי ממשק
Screen.toUI = (cx, cy) => ({ x: (cx - Screen.area.x) / Screen.su, y: (cy - Screen.area.y) / Screen.su });
// מגבילים מספר לטווח
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// הרקע המטושטש סביב העולם: עותק קטן של הקנבס, מוגדל ומטושטש (CSS)
let ambT = 0;
function drawAmbient() {
  if (!Screen.gutter || (ambT++ % 4)) return;
  const aw = AMB.width, ah = AMB.height, c = Math.max(aw / W, ah / H) * 1.08;
  actx.drawImage(canvas, (aw - W * c) / 2, (ah - H * c) / 2, W * c, H * c);
}

// חלונות באמצע (.center) שלא נכנסים במסך מוקטנים כדי להיכנס (משתנה --fit)
function fitPanel(p) {
  const w = p.offsetWidth, h = p.offsetHeight; if (!w || !h) return;
  const f = Math.min(1, (Screen.uw - 24) / w, (Screen.uh - 24) / h);
  p.style.setProperty('--fit', f.toFixed(4));
}
function fitPanels() { UIROOT.querySelectorAll('.center').forEach(fitPanel); }
const panelRO = window.ResizeObserver ? new ResizeObserver(es => es.forEach(e => fitPanel(e.target))) : null;
new MutationObserver(ms => {
  for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) {
    const list = n.matches('.center') ? [n] : [];
    list.push(...n.querySelectorAll('.center'));
    for (const p of list) { fitPanel(p); panelRO && panelRO.observe(p); }
  }
}).observe(UIROOT, { childList: true, subtree: true });
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 200));
if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);

// עזרים קטנים ל-HTML
function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ---------------------------------------------------------------------
// תמונות
// ---------------------------------------------------------------------
const Assets = {
  images: {},
  // optional = קבצים שקיימים רק במחשב של נועה (התמונות האמיתיות) – בלי אזהרה כשהם חסרים
  load(list, optional = false, ext = '.png') {
    return Promise.all(list.map(name => new Promise(res => {
      const img = new Image();
      img.onload = () => { this.images[name] = img; res(true); };
      img.onerror = () => { if (!optional) console.warn('חסרה תמונה:', name); res(false); };
      img.src = 'assets/' + name + ext;
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
// קלט: מקלדת + עכבר/מגע
// פעולות: up/down/left/right, a (אישור), b (חזרה), phone (פתיחת הטלפון)
// מגע/עכבר: לחיצה על העולם = Input.taps; לחיצה וגרירה = Input.drag (מאי הולכת אחרי האצבע)
// ---------------------------------------------------------------------
const Input = {
  held: {}, pressed: {}, taps: [],
  isTouch: ('ontouchstart' in window) || navigator.maxTouchPoints > 0,
  drag: null,               // { id, x, y, moved } – אצבע/עכבר שמוחזקים על העולם
  usedKeys: false,          // האם השתמשו במקלדת (ואז מציגים מיקוד על כפתורים)
  mouse: null,              // מיקום העכבר בעולם (רק עכבר, לא מגע)

  down(a) { if (!this.held[a]) this.pressed[a] = true; this.held[a] = true; },
  up(a) { this.held[a] = false; },
  tap(a) { this.pressed[a] = true; },          // לחיצה חד-פעמית (למשל מכפתור HTML)
  was(a) { return !!this.pressed[a]; },
  is(a) { return !!this.held[a]; },
  endFrame() { this.pressed = {}; this.taps = []; },
};

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Enter: 'a', NumpadEnter: 'a', Space: 'a', KeyZ: 'a', Escape: 'b', Backspace: 'b', KeyX: 'b',
  KeyP: 'phone', Tab: 'phone',
};
// מסך עם nativeKeys (מסך הפתיחה) משאיר ל-Tab / Enter / Space את ההתנהגות הרגילה של כפתורי HTML
const NATIVE_KEYS = ['Tab', 'Enter', 'NumpadEnter', 'Space'];
window.addEventListener('keydown', e => {
  Sound.unlock();
  const top = Game.top();
  if (top && top.nativeKeys && NATIVE_KEYS.includes(e.code)) return;
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

// לחיצה / גרירה על העולם (הקנבס, או השוליים המטושטשים סביבו)
function onPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  try { e.target.setPointerCapture(e.pointerId); } catch (_) { }
  const p = toGame(e.clientX, e.clientY);
  Input.taps.push(p);
  Input.drag = { id: e.pointerId, x: p.x, y: p.y, cx: e.clientX, cy: e.clientY, moved: false };
}
function onPointerMove(e) {
  if (e.pointerType === 'mouse') Input.mouse = e.target === canvas ? toGame(e.clientX, e.clientY) : null;   // לתוויות ריחוף
  const d = Input.drag; if (!d || d.id !== e.pointerId) return;
  const p = toGame(e.clientX, e.clientY); d.x = p.x; d.y = p.y;
  if (!d.moved && Math.hypot(e.clientX - d.cx, e.clientY - d.cy) > 12) d.moved = true;   // מעבר ל-12px = גרירה, לא לחיצה
}
function onPointerUp(e) { if (Input.drag && Input.drag.id === e.pointerId) Input.drag = null; }
for (const t of [canvas, AMB]) {
  t.addEventListener('pointerdown', onPointerDown);
  t.addEventListener('pointermove', onPointerMove);
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) t.addEventListener(ev, onPointerUp);
  t.addEventListener('pointerleave', () => { Input.mouse = null; });
}

// ---------------------------------------------------------------------
// מנהל מסכים + חלונות מעל המסך + מעבר בהאפלה
// מסך/חלון = { enter, exit, update(dt), draw(t), countsTime? }
// ---------------------------------------------------------------------
const fadeEl = document.getElementById('fade');
const toastEl = document.getElementById('toast');

const Game = {
  scene: null, next: null, fade: 0, fadeDir: 0, time: 0, toast: null,
  overlays: [],                       // חלונות מעל המסך (טלפון, אישור) – רק העליון מקבל קלט
  push(o) { Input.drag = null; this.overlays.push(o); o.enter && o.enter(); },
  pop() { const o = this.overlays.pop(); o && o.exit && o.exit(); },
  top() { return this.overlays[this.overlays.length - 1] || this.scene; },
  // מעבר רך למסך אחר. opt: { ms, color } לדעיכה מותאמת, או { instant } (למשל כשמבקשים להפחית תנועה)
  go(scene, opt = {}) {
    if (!this.scene) { this.scene = scene; scene.enter && scene.enter(); return; }
    if (opt.instant) {
      this.scene.exit && this.scene.exit();
      while (this.overlays.length) this.pop();
      this.scene = scene; this.next = null; this.fade = 0; this.fadeDir = 0; scene.enter && scene.enter(); return;
    }
    this.next = scene; this.fadeDir = 1;
    this.fadeSpeed = opt.ms ? 1000 / opt.ms : 4;
    fadeEl.style.background = opt.color || '';
  },
  goClean(scene, opt) { while (this.overlays.length) this.pop(); this.go(scene, opt); },
  // הודעה קופצת בתחתית. אפשר להעביר HTML (למשל אייקון)
  say(html, secs = 2.4) {
    this.toast = { t: secs };
    toastEl.innerHTML = html; toastEl.hidden = false;
  },
  update(dt) {
    this.time += dt;
    if (this.fadeDir) {
      this.fade += this.fadeDir * dt * (this.fadeSpeed || 4);
      if (this.fade >= 1 && this.fadeDir === 1) {
        this.fade = 1; this.scene.exit && this.scene.exit();
        while (this.overlays.length) this.pop();
        this.scene = this.next; this.next = null; this.scene.enter && this.scene.enter();
        this.fadeDir = -1;
      } else if (this.fade <= 0 && this.fadeDir === -1) { this.fade = 0; this.fadeDir = 0; this.fadeSpeed = 4; fadeEl.style.background = ''; }
    } else if (this.scene) {
      const top = this.top();
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
    drawAmbient();
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
