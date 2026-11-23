// =====================================================================
// מנוע הליכה משותף למטבח ולמפות (לפי אב-הטיפוסים kitchen_screen / world1_screen).
//   • מאי 24×36 (assets/kitchen/mai_walk.png): 4 כיוונים × 4 פריימים
//   • התנגשות לפי נקודת הרגליים (walkable(x,y) של המסך)
//   • חיצים, לחיצה על הרצפה = הולכת לשם, גרירה = הולכת אחרי האצבע,
//     לחיצה על חפץ = הולכת אליו ומשתמשת בו (גם כשהיא כבר לידו)
//   • חץ זהוב מעל החפץ הקרוב, תווית כשמרחפים עם העכבר, A/Enter = שימוש
//   • בועות דיבור, HUD, וחלון דיאלוג בסגנון art-ui
// =====================================================================

const DIRROW = { down: 0, left: 1, right: 2, up: 3 };

class Walker {
  // opt: { walkable(x,y), targets(), use(t), speed (px/s), noArrow(t), click(t) }
  constructor(opt) {
    this.o = opt;
    this.mai = { x: 0, y: 0, dir: 'down', f: 0, t: 0, path: null, onArrive: null };
    this.hover = null; this.T = 0; this.sparks = [];
  }
  place(x, y, dir) { Object.assign(this.mai, { x, y, path: null, onArrive: null }); if (dir) this.mai.dir = dir; }
  stop() { this.mai.path = null; this.mai.route = null; this.mai.onArrive = null; }

  // הליכה לנקודה מסביב למכשולים (חיפוש על רשת של 4px, ואחר כך קיצור לקווים ישרים)
  walkTo(tx, ty, cb = null) {
    const m = this.mai, pts = this.findPath(m.x, m.y, tx, ty);
    m.route = pts.slice(1); m.path = pts[0]; m.onArrive = cb;
  }
  clearLine(x0, y0, x1, y1) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2);
    for (let i = 1; i <= n; i++) if (!this.o.walkable(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)) return false;
    return true;
  }
  findPath(sx, sy, tx, ty) {
    if (this.clearLine(sx, sy, tx, ty)) return [[tx, ty]];
    const G = 4, cw = Math.ceil(W / G), ch = Math.ceil(H / G), ok = new Uint8Array(cw * ch), prev = new Int32Array(cw * ch).fill(-1);
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) ok[j * cw + i] = this.o.walkable(i * G + G / 2, j * G + G / 2) ? 1 : 0;
    const cell = (x, y) => clamp(Math.floor(y / G), 0, ch - 1) * cw + clamp(Math.floor(x / G), 0, cw - 1);
    const start = cell(sx, sy), goal = cell(tx, ty);
    // חיפוש לרוחב, ושומרים את התא הכי קרוב ליעד (אם היעד עצמו לא נגיש)
    const q = [start]; prev[start] = start; let best = start, bd = 1e9;
    for (let h = 0; h < q.length; h++) {
      const c = q[h], ci = c % cw, cj = (c / cw) | 0;
      const d = Math.hypot(ci * G + G / 2 - tx, cj * G + G / 2 - ty); if (d < bd) { bd = d; best = c; }
      if (c === goal) { best = c; break; }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= cw || nj >= ch) continue;
        const n = nj * cw + ni; if (prev[n] >= 0 || !ok[n]) continue;
        if (di && dj && !(ok[cj * cw + ni] && ok[nj * cw + ci])) continue;   // לא חותכים פינות
        prev[n] = c; q.push(n);
      }
    }
    const cells = []; for (let c = best; c !== start; c = prev[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map(c => [(c % cw) * G + G / 2, ((c / cw) | 0) * G + G / 2]);
    if (best === goal || this.o.walkable(tx, ty)) pts.push([tx, ty]);
    if (!pts.length) return [[tx, ty]];
    // קיצור: מכל נקודה קופצים לנקודה הכי רחוקה שרואים בקו ישר
    const out = []; let cx = sx, cy = sy, i = 0;
    while (i < pts.length) {
      let j = pts.length - 1; while (j > i && !this.clearLine(cx, cy, pts[j][0], pts[j][1])) j--;
      out.push(pts[j]); [cx, cy] = pts[j]; i = j + 1;
    }
    return out;
  }

  step(dx, dy) {
    const m = this.mai, W_ = this.o.walkable, nx = m.x + dx, ny = m.y + dy;
    if (W_(nx, ny)) { m.x = nx; m.y = ny; return true; }
    if (dx && W_(nx, m.y)) { m.x = nx; return true; }
    if (dy && W_(m.x, ny)) { m.y = ny; return true; }
    return false;
  }

  // --- חפצים
  hitAt(x, y) {
    let best = null, area = 1e9;
    for (const o of this.o.targets()) {
      const [x0, y0, x1, y1] = o.box;
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) { const a = (x1 - x0) * (y1 - y0); if (a < area) { area = a; best = o; } }
    }
    return best;
  }
  approach(t) {
    if (t.stand) return t.stand;
    const [x0, y0, x1, y1] = t.box; const ax = Math.round((x0 + x1) / 2), ay = Math.round(y1 + 6);
    for (let r = 0; r < 60; r++) for (const dx of [0, -r, r]) for (const dy of [r, -r]) if (this.o.walkable(ax + dx, ay + dy)) return [ax + dx, ay + dy];
    return [this.mai.x, this.mai.y];
  }
  nearest() {
    let best = null, bd = 26;
    for (const t of this.o.targets()) {
      if (t.passive) continue;
      const [ax, ay] = this.approach(t); const d = Math.hypot(ax - this.mai.x, ay - this.mai.y);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }
  face(t) {
    const [x0, y0, x1] = t.box, cx = (x0 + x1) / 2, m = this.mai;
    if (Math.abs(cx - m.x) < 10) m.dir = y0 < m.y ? 'up' : 'down'; else m.dir = cx < m.x ? 'left' : 'right';
  }
  use(t) { if (!t) return; this.stop(); this.face(t); this.o.use(t); }

  // --- עדכון
  update(dt) {
    this.T += dt * 1000;
    const m = this.mai;
    // לחיצה/נגיעה בעולם
    for (const p of Input.taps) {
      const t = this.hitAt(p.x, p.y);
      if (t && this.o.click && this.o.click(t)) continue;      // למסך יש טיפול מיוחד (למשל ירק = הולכים אליו)
      if (t && !t.passive) { const [ax, ay] = this.approach(t); this.walkTo(ax, ay, () => this.use(t)); }
      else if (this.o.walkable(p.x, p.y)) this.walkTo(p.x, p.y);
      else if (t && t.onBlocked) t.onBlocked();
      else if (p.x >= 0 && p.y >= 0 && p.x <= W && p.y <= H) this.walkTo(p.x, p.y);   // קיר/קצה: הולכת הכי קרוב שאפשר
    }
    if (Input.was('a')) { const t = this.nearest(); if (t) this.use(t); }

    let dx = 0, dy = 0;
    if (Input.is('left')) dx -= 1; if (Input.is('right')) dx += 1;
    if (Input.is('up')) dy -= 1; if (Input.is('down')) dy += 1;
    if (dx || dy) { m.path = null; m.route = null; }
    // גרירה: הולכת לכיוון האצבע (מבטלת הליכה לחפץ שנלחץ בתחילת הגרירה)
    const D = Input.drag;
    if (!dx && !dy && D && D.moved) {
      m.path = null; m.route = null; m.onArrive = null;
      const ex = D.x - m.x, ey = D.y - m.y, d = Math.hypot(ex, ey);
      if (d > 3) { dx = ex / d; dy = ey / d; }
    }
    if (!dx && !dy && m.path) {
      const [tx, ty] = m.path, ex = tx - m.x, ey = ty - m.y, d = Math.hypot(ex, ey);
      if (d < 1.2) { if (m.route && m.route.length) { m.path = m.route.shift(); } else { m.path = null; const cb = m.onArrive; m.onArrive = null; if (cb) cb(); } }
      else { dx = ex / d; dy = ey / d; }
    }
    if (dx || dy) {
      const sp = (this.o.speed || 66) * dt, n = Math.hypot(dx, dy);
      const moved = this.step(dx / n * sp, dy / n * sp);
      if (Math.abs(dx) > Math.abs(dy)) m.dir = dx < 0 ? 'left' : 'right'; else m.dir = dy < 0 ? 'up' : 'down';
      if (!moved && m.path) { m.path = null; m.route = null; const cb = m.onArrive; m.onArrive = null; if (cb) cb(); }
      if (moved) { m.t += dt * 1000; m.f = Math.floor(m.t / 130) % 4; } else { m.f = 0; m.t = 0; }
    } else { m.f = 0; m.t = 0; }
    // ריחוף עכבר
    this.hover = Input.mouse ? this.hitAt(Input.mouse.x, Input.mouse.y) : null;
    canvas.style.cursor = this.hover && !this.hover.passive ? 'pointer' : (Input.mouse && this.o.walkable(Input.mouse.x, Input.mouse.y) ? 'crosshair' : 'default');
  }

  // --- ציור
  drawMai() {
    const m = this.mai, img = Assets.get('kitchen/mai_walk');
    shadowAt(m.x, m.y, 9, 0.25);
    if (img) ctx.drawImage(img, m.f * 24, DIRROW[m.dir] * 36, 24, 36, Math.round(m.x - 12), Math.round(m.y - 36), 24, 36);
  }
  drawMarks() {
    for (const s of this.sparks) {
      s.t += 16; const p = s.t / 600; if (p > 1) continue;
      ctx.globalAlpha = 1 - p; ctx.fillStyle = s.c; ctx.fillRect(Math.round(s.x + s.vx * s.t), Math.round(s.y + s.vy * s.t), 1, 1); ctx.globalAlpha = 1;
    }
    this.sparks = this.sparks.filter(s => s.t <= 600);
    if (Game.overlays.length) return;                 // חלון פתוח: בלי חץ
    const mark = (this.hover && !this.hover.passive) ? this.hover : this.nearest();
    if (mark) { const [x0, y0, x1] = mark.box; goldArrow(Math.round((x0 + x1) / 2), Math.round(Math.max(10, y0 - 9) + Math.sin(this.T / 160) * 2)); }
  }
  sparkle(box, cols = ['#FFE066', '#FFFFFF', '#F29CC0']) {
    const [x0, y0, x1, y1] = box;
    for (let i = 0; i < 40; i++) this.sparks.push({ x: x0 + Math.random() * (x1 - x0), y: y0 + Math.random() * (y1 - y0), vx: (Math.random() * 2 - 1) * .02, vy: -.01 - Math.random() * .03, c: cols[i % cols.length], t: 0 });
  }
}

function goldArrow(x, y) {
  ctx.fillStyle = '#3A2618'; for (let i = 0; i < 6; i++) ctx.fillRect(x - 5 + i, y + i, 11 - 2 * i, 1); ctx.fillRect(x - 5, y - 1, 11, 1);
  ctx.fillStyle = '#F2C54A'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 3 + i, y + i, 7 - 2 * i, 1);
}
function shadowAt(x, y, rx, a = 0.22) {
  ctx.fillStyle = `rgba(58,38,24,${a})`; ctx.beginPath(); ctx.ellipse(x, y, rx, Math.max(2, rx * .18), 0, 0, 7); ctx.fill();
}
function drawZ(x, y) { ctx.fillRect(x, y, 3, 1); ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x, y + 2, 3, 1); }

// ---------------------------------------------------------------------
// HTML של מסך הליכה: HUD, תווית ריחוף, בועות
// ---------------------------------------------------------------------
function walkLayerHTML(extra = '') {
  return `<div class="panel hud"></div>${extra}${phoneButtonHTML()}<div class="wlabel" hidden></div>`;
}

const WalkUI = {
  // HUD: חיים · סיגריות · רוגלך (מתעדכן רק כשמשהו משתנה)
  hud(L) {
    const st = Save.state; if (!st) return;
    const key = [st.hp, Stats.maxHp(st), st.cigs, st.rugelach].join('|');
    if (L._hud === key) return; L._hud = key;
    L.q('.hud').innerHTML =
      `<span>${icon('heart')}<bdi dir="ltr">${st.hp}/${Stats.maxHp(st)}</bdi></span>` +
      `<span>${icon('cig')}<bdi>${st.cigs}</bdi></span>` +
      `<span>${icon('rugelach', 'ic-s')}נותרו <bdi>${st.rugelach}</bdi></span>`;
  },
  // תווית מעל חפץ כשמרחפים עם העכבר
  label(L, w) {
    const el = L.q('.wlabel'), h = Game.overlays.length ? null : w.hover;
    const key = h ? h.id + '|' + (h.sub || '') : '';
    if (key === L._lab) return; L._lab = key;
    if (!h) { el.hidden = true; return; }
    el.innerHTML = `${h.label}${h.sub ? `<span class="sub">${h.sub}</span>` : ''}`; el.hidden = false;
    const [x0, y0, x1] = h.box;
    el.style.left = clamp(ux((x0 + x1) / 2), 110, Screen.uw - 110) + 'px'; el.style.top = Math.max(100, uy(y0 - 14)) + 'px';
  },
  // בועת דיבור (אחת בכל פעם). cls: '' · 'shout' (אדומה) · 'far' (מקווקוות, שומעים מרחוק)
  bubble(L, text, x, y, ms = 1800, cls = '') {
    L.el.querySelectorAll('.say.walk').forEach(e => e.remove());
    const b = document.createElement('div'); b.className = 'say walk ' + cls; b.textContent = text;
    b.style.left = clamp(ux(x), 160, Screen.uw - 160) + 'px'; b.style.top = Math.max(110, uy(y)) + 'px';
    L.el.appendChild(b); if (ms) setTimeout(() => b.remove(), ms);
  },
};

// חלון דיאלוג (מעל המסך). html בתוך .dialog; buttons: [{k, title, onPress, disabled, ic, desc, side}]
function Dialog(html, buttons = [], opt = {}) {
  const row = buttons.length ? `<div class="${opt.list ? 'list' : 'row'}">${buttons.map(b => act({ k: b.k, title: b.title, ic: b.ic, desc: b.desc, side: b.side, disabled: b.disabled })).join('')}</div>` : '';
  const L = Layer(`<div class="panel dialog center" style="width:${opt.width || 640}px">${html}${row}${opt.foot ? `<div class="row">${opt.foot}</div>` : ''}</div>`,
    { focus: opt.focus, onBack: opt.onBack });
  Game.push(L);
  for (const b of buttons) L.on(b.k, b.onPress || (() => Game.pop()));
  if (opt.onFoot) for (const k in opt.onFoot) L.on(k, opt.onFoot[k]);
  return L;
}

// ---------------------------------------------------------------------
// אירועים משותפים: סיגריות ("נישנושיםםםם!" כל 10), ניסיון ורמות
// ---------------------------------------------------------------------
function gainCigs(n, sayFn) {
  const st = Save.state, before = st.cigs; st.cigs += n;
  if (Math.floor(st.cigs / 10) > Math.floor(before / 10) && sayFn) sayFn('נישנושיםםםם!');
}
function gainXp(n) {
  const st = Save.state, before = st.level;
  st.xp += n; st.level = Stats.levelFor(st.xp);
  if (st.level > before) {
    const newMoves = MOVE_UNLOCKS.filter(u => u.level > before && u.level <= st.level).map(u => u.move);
    for (const mv of newMoves) { if (!st.movesUnlocked.includes(mv)) st.movesUnlocked.push(mv); if (st.moves.length < 4 && !st.moves.includes(mv)) st.moves.push(mv); }
    st.hp = Stats.maxHp(st);
    return { level: st.level, moves: newMoves };
  }
  return null;
}
