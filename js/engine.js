// =====================================================================
// מלכת הנישנושים – המנוע (שלב 1: שלד)
// מסך פנימי 480×270 (לפי art-bible), מוגדל לגודל המסך בלי טשטוש.
// כאן: לולאת משחק, מנהל מסכים, טעינת תמונות, קלט (מקלדת + מגע),
// כפתורים, טקסט בעברית וצלילים קטנים.
// =====================================================================

const W = 480, H = 270;

const PAL = {
  outline: '#3A2618', paper: '#FFF4E0', primary: '#F28C38', secondary: '#7A4FB8',
  heart: '#E8445A', warm: '#FFD99A',
  salty: '#F7C531', sweet: '#8B5A2B', spicy: '#E2231A', plain: '#C9CBCE',
  w1: '#5E8F3A', w1accent: '#F4F1DE',
};

const FONT = '"Rubik", "Arial Hebrew", "Arial", sans-serif';

// ---------------------------------------------------------------------
// מסך וקנבס
// ---------------------------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const Screen = { scale: 1 };

function resize() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  const dpr = window.devicePixelRatio || 1;
  Screen.scale = s;
  canvas.style.width = Math.round(W * s) + 'px';
  canvas.style.height = Math.round(H * s) + 'px';
  canvas.width = Math.round(W * s * dpr);
  canvas.height = Math.round(H * s * dpr);
  ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));

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

// ---------------------------------------------------------------------
// טקסט בעברית, עם קו מתאר וצל לפי art-bible
// ---------------------------------------------------------------------
function text(str, x, y, opt = {}) {
  const size = opt.size || 12;
  ctx.save();
  ctx.font = `${opt.bold ? 'bold ' : ''}${size}px ${FONT}`;
  ctx.direction = 'rtl';
  ctx.textAlign = opt.align || 'center';
  ctx.textBaseline = 'middle';
  if (opt.shadow) { ctx.fillStyle = opt.shadow; ctx.fillText(str, x + 1.5, y + 2); }
  if (opt.stroke) {
    ctx.lineJoin = 'round'; ctx.lineWidth = opt.strokeWidth || 3;
    ctx.strokeStyle = opt.stroke; ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = opt.color || PAL.paper;
  ctx.fillText(str, x, y);
  ctx.restore();
}

function rect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); }

// מסגרת "חרוטה": קצוות מוארים למעלה-שמאל וכהים למטה-ימין
function panel(x, y, w, h, fill, opt = {}) {
  x = Math.round(x); y = Math.round(y);
  rect(x - 1, y - 1, w + 2, h + 2, PAL.outline);
  rect(x, y, w, h, fill);
  rect(x, y, w, 1, opt.light || 'rgba(255,255,255,0.45)');
  rect(x, y, 1, h, opt.light || 'rgba(255,255,255,0.45)');
  rect(x, y + h - 2, w, 2, opt.dark || 'rgba(0,0,0,0.25)');
  rect(x + w - 1, y, 1, h, opt.dark || 'rgba(0,0,0,0.25)');
}

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

// ---------------------------------------------------------------------
// קלט: מקלדת + מגע
// פעולות: up/down/left/right, a (אישור), b (חזרה)
// ---------------------------------------------------------------------
const Input = {
  held: {}, pressed: {}, taps: [],
  isTouch: ('ontouchstart' in window) || navigator.maxTouchPoints > 0,
  pad: { active: false },   // הג'ויסטיק/הכפתורים על המסך מוצגים רק כשמסך מבקש אותם
  _touchHeld: {},

  down(a) { if (!this.held[a]) this.pressed[a] = true; this.held[a] = true; },
  up(a) { this.held[a] = false; },
  was(a) { return !!this.pressed[a]; },
  is(a) { return !!this.held[a] || !!this._touchHeld[a]; },
  endFrame() { this.pressed = {}; this.taps = []; },
};

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Enter: 'a', Space: 'a', KeyZ: 'a', Escape: 'b', Backspace: 'b', KeyX: 'b',
};
window.addEventListener('keydown', e => {
  Sound.unlock();
  const a = KEYMAP[e.code]; if (!a) return;
  e.preventDefault(); if (!e.repeat) Input.down(a);
});
window.addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) Input.up(a); });

// מיקום נגיעה ← קואורדינטות פנימיות 480×270
function toGame(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return { x: (clientX - r.left) / r.width * W, y: (clientY - r.top) / r.height * H };
}

// כפתורי המגע על המסך (בצד שמאל כיוונים, בצד ימין A/B)
const TouchPad = {
  dpad: { x: 52, y: 214, r: 34 },
  a: { x: 440, y: 222, r: 18 },
  b: { x: 404, y: 242, r: 14 },
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
  draw() {
    const d = this.dpad;
    ctx.save(); ctx.globalAlpha = 0.55;
    ctx.fillStyle = PAL.outline; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.paper;
    const arrow = (ang) => {
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(d.r - 8, 0); ctx.lineTo(d.r - 18, -8); ctx.lineTo(d.r - 18, 8); ctx.fill();
      ctx.restore();
    };
    [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(arrow);
    for (const [k, b, label] of [['a', this.a, 'A'], ['b', this.b, 'B']]) {
      ctx.fillStyle = Input.is(k) ? PAL.warm : (k === 'a' ? PAL.primary : PAL.secondary);
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    text('A', this.a.x, this.a.y + 1, { size: 14, bold: true });
    text('B', this.b.x, this.b.y + 1, { size: 11, bold: true });
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
  Sound.unlock(); e.preventDefault();
  const p = toGame(e.clientX, e.clientY);
  activeTouches.set(e.pointerId, p);
  Input.taps.push(p);
  refreshTouchHeld();
});
canvas.addEventListener('pointermove', e => {
  if (!activeTouches.has(e.pointerId)) return;
  activeTouches.set(e.pointerId, toGame(e.clientX, e.clientY)); refreshTouchHeld();
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
  canvas.addEventListener(ev, e => { activeTouches.delete(e.pointerId); refreshTouchHeld(); });
}

// ---------------------------------------------------------------------
// תפריט כפתורים: נגיעה ישירה, או חיצים + Enter במקלדת
// ---------------------------------------------------------------------
class Menu {
  constructor(items, opt = {}) {
    this.items = items;           // [{label, x, y, w, h, onPress, disabled}]
    this.focus = opt.focus || 0;
    this.showFocus = !Input.isTouch;
  }
  update() {
    const n = this.items.length;
    if (Input.was('down')) { this.focus = (this.focus + 1) % n; this.showFocus = true; Sound.move(); }
    if (Input.was('up')) { this.focus = (this.focus - 1 + n) % n; this.showFocus = true; Sound.move(); }
    if (Input.was('a') && this.showFocus) return this.press(this.items[this.focus]);
    if (Input.was('a')) { this.showFocus = true; return; }
    for (const t of Input.taps) {
      const it = this.items.find(i => t.x >= i.x && t.x <= i.x + i.w && t.y >= i.y && t.y <= i.y + i.h);
      if (it) { this.focus = this.items.indexOf(it); return this.press(it); }
    }
  }
  press(it) { if (it.disabled) { Sound.back(); return; } Sound.select(); it.onPress && it.onPress(); }
  draw(t) {
    this.items.forEach((it, i) => {
      const f = this.showFocus && i === this.focus;
      const bob = f ? Math.round(Math.sin(t * 6)) : 0;
      panel(it.x, it.y + bob, it.w, it.h, it.disabled ? '#8a7f74' : (f ? PAL.warm : PAL.primary));
      text(it.label, it.x + it.w / 2, it.y + it.h / 2 + bob + 1, {
        size: it.size || 14, bold: true, color: PAL.outline,
      });
      if (f) text('◀', it.x - 10, it.y + it.h / 2 + bob, { size: 10, color: PAL.warm });
    });
  }
}

// ---------------------------------------------------------------------
// מנהל מסכים + מעבר בהאפלה
// ---------------------------------------------------------------------
const Game = {
  scene: null, next: null, fade: 0, fadeDir: 0, time: 0, toast: null,
  go(scene) {                         // מעבר רך למסך אחר
    if (!this.scene) { this.scene = scene; scene.enter && scene.enter(); return; }
    this.next = scene; this.fadeDir = 1;
  },
  say(msg, secs = 2.2) { this.toast = { msg, t: secs }; },
  update(dt) {
    this.time += dt;
    if (this.fadeDir) {
      this.fade += this.fadeDir * dt * 4;
      if (this.fade >= 1 && this.fadeDir === 1) {
        this.fade = 1; this.scene.exit && this.scene.exit();
        this.scene = this.next; this.next = null; this.scene.enter && this.scene.enter();
        this.fadeDir = -1;
      } else if (this.fade <= 0 && this.fadeDir === -1) { this.fade = 0; this.fadeDir = 0; }
    } else if (this.scene) {
      Input.pad.active = !!(this.scene.usesPad && Input.isTouch);
      this.scene.update(dt);
    }
    if (this.toast && (this.toast.t -= dt) <= 0) this.toast = null;
  },
  draw() {
    ctx.clearRect(0, 0, W, H);
    if (this.scene) this.scene.draw(this.time);
    if (Input.pad.active) TouchPad.draw();
    if (this.toast) {
      const w = 260;
      panel(W / 2 - w / 2, 40, w, 26, PAL.paper);
      text(this.toast.msg, W / 2, 54, { size: 12, color: PAL.outline, bold: true });
    }
    if (this.fade > 0) { ctx.fillStyle = `rgba(27,18,48,${this.fade})`; ctx.fillRect(0, 0, W, H); }
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
