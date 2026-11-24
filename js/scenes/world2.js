// =====================================================================
// עולם 2 – ביצת החמוצים. מפה של 2×2 מסכים (art-bible 5.4, "מפות v1", world2_screen.html).
//   s3 הדוכן בערפל (הדר)             | s4 הצנצנת הענקית (ליזי 2 + הבוס)
//   s1 הכניסה (ליזי 1, 2 שקיות)       | s2 קיר הפלפל השחור (נעלי הבית בכיס הסודי)
// הולכים רק על גדות, קרשים, מכסה צף וחמוץ צף (מסכת הליכה מ-ART.world2[s].walk). במי המלח לא נכנסים.
// ירקות שהובסו לא חוזרים. נגיעה בירק / במכסה הצנצנת = מסך הקרב (battle.js).
// =====================================================================

const W2_NAMES = { s1: 'הכניסה לביצה', s2: 'קיר הפלפל השחור', s3: 'הדוכן בערפל', s4: 'הצנצנת הענקית' };
const W2_VEG_NAMES = { cucumber: 'מלפפון', olive: 'זית סורי' };
const W2_EXITS = {
  s1: [{ box: [472, 190, 480, 216], to: 's2', spawn: [10, 204] }, { box: [288, 0, 312, 6], to: 's3', spawn: [300, 256] },
       { box: [0, 262, 96, 270], msg: 'מכאן נכנסים לביצה. חזרה למטבח: "נישנוש אקספרס" בטלפון.' }],
  s2: [{ box: [0, 190, 8, 216], to: 's1', spawn: [468, 204] }, { box: [288, 0, 312, 6], to: 's4', spawn: [300, 256] }],
  s3: [{ box: [288, 265, 312, 270], to: 's1', spawn: [300, 14] }],
  s4: [{ box: [288, 265, 312, 270], to: 's2', spawn: [300, 14] }],
};
const W2_BAGS = {   // מה יש בכל שקית
  move:     { key: 'w2-move', title: 'שקית הפתעה!', body: () => `מהלך חדש: <b>קרקר שובר</b>. מלוח, עולה <bdi>${MOVES.cracker.cost}</bdi> קראנץ׳, כוח <bdi>${MOVES.cracker.pow}</bdi>, ועובר דרך הגנה.`, line: 'קראנץ׳' },
  slippers: { key: 'w2-slippers', title: 'שקית הפתעה!', body: () => `אביזר חדש: <b>נעלי בית פרוותיות</b>. <bdi>+${CFG.accessories.slippers.hp}</bdi> חיים מקסימליים, ורואים אותן על מאי.`, line: 'סוף סוף חם ברגליים' },
  coin:     { key: 'w2-coin' },
};
const W2_BAG_KEYS = ['w2-move', 'w2-coin', 'w2-slippers'];
const W2_BUBBLES = [[60, 150], [190, 120], [380, 120], [150, 250], [460, 140], [250, 40], [110, 40], [350, 250]];

const WORLD2_IMAGES = () => {
  const list = ['kitchen/mai_walk', 'kitchen/friend_hadar', 'world2/hadar_top', 'world2/bag_move', 'world2/bag_coin', 'world2/bag_slippers',
    'world2/veg_cucumber_map', 'world2/veg_olive_map', 'world2/fog'];
  for (const s in ART.world2) {
    const L = ART.world2[s];
    list.push(`world2/${s}/ground`);
    for (const o of L.objects) list.push(`world2/${s}/obj_${o.id}`);
    for (const f in (L.fogbanks || {})) list.push(`world2/${s}/${f}`);
  }
  return list;
};

// מסכת ההליכה: base64 של ביטים (480×270, שורה אחרי שורה), נפרסת פעם אחת לכל מסך
const W2_WALK = {};
function w2Walk(sid) {
  if (W2_WALK[sid]) return W2_WALK[sid];
  const bin = atob(ART.world2[sid].walk), m = new Uint8Array(W * H);
  for (let i = 0; i < m.length; i++) m[i] = (bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
  return (W2_WALK[sid] = m);
}

const World2Scene = {
  id: 'world2', countsTime: true,

  enter() {
    const st = Save.state, pl = st.place;
    this.w = new Walker({
      walkable: (x, y) => this.walkable(x, y), targets: () => this.targets(), use: t => this.use(t), speed: 70,
      click: t => this.click(t), blocked: p => this.tapWater(p),
    });
    this.L = Layer(walkLayerHTML('<div class="panel secrets"></div><div class="panel where"></div>'), { screen: true }).mount();
    this._sec = null;                                   // שכבה חדשה: מציירים את מונה הסודות מחדש
    wirePhoneButton(this.L);
    this.fogs = [{ x: -80, y: 100, s: 1, v: 4 }, { x: 220, y: 20, s: 1.2, v: 3 }, { x: 380, y: 170, s: .9, v: 5 }];
    this.bub = W2_BUBBLES.map(([x, y], i) => ({ x, y, t: i * 700 }));
    this.fade = 0; this.fadeTo = null; this.lock = World2Scene.returnLock ? performance.now() + 2500 : 0; this.heardAt = 0;
    World2Scene.returnLock = false; this.inBattle = false;
    // איפה מתחילים: המקום השמור, או ליזי האחרונה בעולם הזה, או הכניסה
    if (pl.scene === 'world2' && ART.world2[pl.screen]) this.go(pl.screen, [pl.x, pl.y]);
    else if (st.lastLizzy && st.lastLizzy.world === 2) { const s = st.lastLizzy.screen; this.go(s, ART.world2[s].lizzy.at); }
    else { this.go('s1', [40, 258]); this.w.mai.dir = 'up'; setTimeout(() => { if (Game.scene === this) WalkUI.bubble(this.L, 'ביצת החמוצים', 30, 200, 2000); }, 500); }
    st.world = 2;
  },
  exit() { this.L.unmount(); canvas.style.cursor = 'default'; },

  // מעבר למסך אחר במפה
  go(sid, spawn) {
    this.cur = sid; this.Lay = ART.world2[sid]; this.mask = w2Walk(sid);
    this.veg = (this.Lay.veggies || []).map((v, i) => ({ ...v, key: `w2:${sid}:${i}`, t: Math.random() * 1000, dir: 1, alive: !Save.state.defeated[`w2:${sid}:${i}`], poof: 0 }));
    this.w.place(spawn[0], spawn[1]);
    this.L.q('.where').innerHTML = `ביצת החמוצים · <span class="sub">${W2_NAMES[sid]}</span>`;
    this.L.el.querySelectorAll('.say.walk').forEach(e => e.remove());
  },

  walkable(x, y) {
    if (x < 2 || x > 478 || y < 2 || y > 268) return false;
    if (!this.mask[Math.round(y) * W + Math.round(x)]) return false;
    for (const o of this.Lay.objects) if (o.block) { const [x0, y0, x1, y1] = o.block; if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return false; }
    return true;
  },
  // לחיצה על המים: אם יש קרשים ממש ליד – הולכים לשם, ואם לא – "איכ לא, מי מלח"
  tapWater(p) {
    for (let r = 2; r <= 10; r += 2) for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (this.walkable(p.x + dx, p.y + dy)) { this.w.walkTo(p.x + dx, p.y + dy); return; }
    this.sayMai('איכ לא, מי מלח', 1300);
  },

  bagsLeft() { return Object.keys(this.Lay.bags || {}).filter(k => !Save.state.bags[W2_BAGS[k].key]); },
  hadarFound() { return Save.state.friends.includes(FRIENDS[1]); },

  targets() {
    const L = this.Lay, t = [];
    if (L.lizzy) t.push({ id: 'lizzy', box: [L.lizzy.x - 16, L.lizzy.foot - 16, L.lizzy.x + 16, L.lizzy.foot], stand: L.lizzy.at, label: 'ליזי', sub: 'שמירה ומילוי' });
    if (this.cur === 's1') {
      t.push({ id: 'sign', box: [16, 200, 46, 236], label: 'ביצת החמוצים', sub: 'עולם 2' });
      t.push({ id: 'jar', box: [14, 16, 70, 90], label: 'צנצנת ענקית', sub: 'מי השאיר את זה פה?', passive: true, onBlocked: () => this.sayMai('מה יש בזה?', 1600) });
      t.push({ id: 'paws', box: L.paw_prints, label: 'עקבות של חתול', sub: 'לאן הן מובילות?', passive: true });
    }
    if (this.cur === 's2') t.push({ id: 'gap', box: L.gap, label: 'רווח בין גרגרי הפלפל', sub: 'עקבות חתול', passive: true });
    if (this.cur === 's3' && !this.hadarFound()) t.push({ id: 'hadar', box: [L.hadar.x - 12, L.hadar.top, L.hadar.x + 12, L.hadar.top + 22], stand: L.hadar.at, label: 'הדר', sub: '' });
    if (this.cur === 's4') t.push({ id: 'gate', box: L.gate, stand: L.gate_at, label: 'הצנצנת הענקית', sub: 'החמוץ' });
    for (const kind of this.bagsLeft()) {
      const b = L.bags[kind];
      t.push({ id: 'bag:' + kind, box: [b.x - 8, b.foot - 20, b.x + 8, b.foot], stand: b.at, label: 'שקית הפתעה', sub: kind === 'move' ? 'על חמוץ צף' : kind === 'slippers' ? 'בתוך הערפל' : 'חצי מוסתרת בשמיר' });
    }
    this.veg.forEach((v, i) => { if (v.alive) t.push({ id: 'veg:' + i, box: [v.x - 8, v.foot - (v.kind === 'cucumber' ? 24 : 16), v.x + 8, v.foot], label: W2_VEG_NAMES[v.kind], sub: 'קרב' }); });
    return t;
  },

  // לחיצה על ירק = הולכים אליו (הקרב נפתח כשנוגעים); על רמז = הולכים לשם
  click(t) {
    if (t.id.startsWith('veg:')) { const v = this.veg[+t.id.split(':')[1]]; this.w.walkTo(v.x, v.foot + 2); return true; }
    if (['gap', 'paws'].includes(t.id)) { const [x0, y0, x1, y1] = t.box; this.w.walkTo((x0 + x1) / 2, (y0 + y1) / 2); return true; }
    if (t.id === 'jar') { this.sayMai('מה יש בזה?', 1600); return true; }
    return false;
  },

  use(t) {
    const [kind, arg] = t.id.split(':');
    if (kind === 'lizzy') this.lizzy();
    else if (kind === 'sign') WalkUI.bubble(this.L, 'ביצת החמוצים', 30, 200, 1800);
    else if (kind === 'bag') this.openBag(arg);
    else if (kind === 'hadar') this.findHadar();
    else if (kind === 'gate') this.gate();
    else if (kind === 'veg') this.battle(this.veg[+arg]);
  },

  sayMai(text, ms) { WalkUI.bubble(this.L, text, this.w.mai.x, this.w.mai.y - 40, ms); },

  // ליזי = שמירה + מילוי חיים ורוגלך, וזוכרים לאן לחזור
  lizzy() {
    const st = Save.state, lz = this.Lay.lizzy;
    Stats.refill(st); st.lastLizzy = { world: 2, screen: this.cur };
    this.savePlace(); Save.saveNow();
    this.w.sparkle([lz.x - 12, lz.foot - 22, lz.x + 12, lz.foot - 6], ['#F29CC0', '#FFFFFF']);
    WalkUI.bubble(this.L, 'ליזי ישנה על מכסה של צנצנת', lz.x, lz.foot - 30, 2000);
    Game.say(`נשמר במשבצת <bdi>${Save.slot + 1}</bdi> · החיים והרוגלך התמלאו`);
  },

  openBag(kind) {
    const st = Save.state, B = W2_BAGS[kind], b = this.Lay.bags[kind];
    st.bags[B.key] = true;
    if (kind === 'coin') {
      gainCigs(CFG.bags.coinCigs, t => this.sayMai(t, 1800)); this.w.sparkle([b.x - 10, b.foot - 20, b.x + 10, b.foot]);
      Game.say(`שקית הפתעה: <bdi>${CFG.bags.coinCigs}</bdi> ${icon('cig')}`); this.savePlace(); Save.saveNow(); return;
    }
    if (kind === 'move' && !st.movesUnlocked.includes('cracker')) { st.movesUnlocked.push('cracker'); if (st.moves.length < 4) st.moves.push('cracker'); }
    if (kind === 'slippers' && !st.accessoriesOwned.includes('slippers')) {
      st.accessoriesOwned.push('slippers');
      if (st.accessories.length < 2) { st.accessories.push('slippers'); st.hp += CFG.accessories.slippers.hp; }
    }
    this.savePlace(); Save.saveNow();
    this.w.sparkle([b.x - 10, b.foot - 28, b.x + 10, b.foot], ['#FFE066', '#FFFFFF', '#C6A0E0']);
    const first = !st.flags.firstBag; st.flags.firstBag = true;
    Dialog(`<div class="top"><div class="pv dark"><div class="pvimg" style="background-image:url(assets/world2/bag_${kind}.png);background-size:56px 68px;width:56px;height:68px"></div></div>
        <div><h2>${B.title}</h2><p>${B.body()}</p>${first ? '<p class="dimtxt">בכל עולם מוחבאות 3 שקיות. המונה למעלה מראה כמה מצאת.</p>' : ''}</div></div>`,
      [{ k: 'ok', title: 'יש!', onPress: () => { Game.pop(); this.sayMai(B.line, 1800); } }]);
  },

  findHadar() {
    const st = Save.state, R = this.Lay.hadar;
    st.friends.push(FRIENDS[1]); this.savePlace(); Save.saveNow();
    this.w.sparkle([R.x - 12, R.top, R.x + 12, R.top + 22], ['#F26A28', '#FFE066', '#FFFFFF']);
    Dialog(`<div class="top"><div class="pv cream"><div class="pvimg" style="background-image:url(assets/kitchen/friend_hadar.png);background-size:72px 93px;width:72px;height:93px"></div></div>
        <div><h2>מצאת את הדר!</h2><p>״${FRIEND_LINES[1]}״</p><div class="price">הדר סוגרת את הדוכן ועוברת למרפסת של המטבח.</div></div></div>`,
      [{ k: 'ok', title: 'נתראה במרפסת' }]);
  },

  // הצנצנת הענקית: המכסה הזהוב הוא שער הבוס (פעם אחת)
  gate() {
    const st = Save.state;
    if (st.flags.w2Boss) {
      Dialog(`<h2>הצנצנת הענקית</h2><p>המכסה פתוח והצנצנת ריקה. החמוץ כבר לא חם על אף אחד.</p>`, [{ k: 'ok', title: 'מה יש בזה?' }]);
      return;
    }
    Dialog(`<h2>הצנצנת הענקית</h2><p>מאחורי המכסה הזהוב מחכה החמוץ. מבוס אי אפשר לברוח, אז כדאי לעבור קודם אצל ליזי.</p>`,
      [{ k: 'ok', title: 'מה יש בזה?', onPress: () => { Game.pop(); this.boss(); } }, { k: 'no', title: 'עוד לא' }], { focus: 'no' });
  },
  boss() {
    const st = Save.state; this.w.stop(); this.savePlace(); Save.saveNow();
    BattleScene.start('pickle', {
      onWin: () => {
        if (!st.legendary.includes(1)) st.legendary.push(1);
        st.flags.w2Boss = true; st.unlockedWorlds = Math.max(st.unlockedWorlds, 3);
        st.place = { scene: 'travel' }; Save.saveNow();
        Game.go(KitchenScene);                                   // אחרי הבוס: חזרה אוטומטית למטבח, והנישנוש עולה למדף
        setTimeout(() => Game.say('התפוצ׳יפס עלה למדף · עולם 3 נפתח במפת הנישנושים', 3.2), 700);
      },
      onLose: () => this.lose(),
    });
  },

  // קרב: עוברים למסך הקרב, ובסוף חוזרים לכאן
  battle(v) {
    if (this.inBattle) return;
    this.inBattle = true; this.w.stop();
    const st = Save.state, m = this.w.mai;
    this.savePlace(); Save.saveNow();
    const a = Math.atan2(m.y - v.foot, m.x - v.x);
    let fx = m.x, fy = m.y; for (let i = 0; i < 14; i++) { if (this.walkable(fx + Math.cos(a), fy + Math.sin(a))) { fx += Math.cos(a); fy += Math.sin(a); } }
    const back = (place, lock) => { this.inBattle = false; st.place = place; World2Scene.returnLock = lock; Save.saveNow(); Game.go(World2Scene); };
    BattleScene.start(v.kind, {
      onWin: () => { st.defeated[v.key] = true; back({ scene: 'world2', screen: this.cur, x: Math.round(m.x), y: Math.round(m.y) }, false); },
      onFlee: () => back({ scene: 'world2', screen: this.cur, x: Math.round(fx), y: Math.round(fy) }, true),
      onLose: () => this.lose(),
    });
  },

  // הפסד: חוזרים לליזי האחרונה של העולם עם חיים מלאים וכל הניסיון (או לכניסה)
  lose() {
    const st = Save.state; this.inBattle = false; Stats.refill(st);
    const lz = st.lastLizzy && st.lastLizzy.world === 2 ? st.lastLizzy.screen : null;
    st.place = lz ? { scene: 'world2', screen: lz, x: ART.world2[lz].lizzy.at[0], y: ART.world2[lz].lizzy.at[1] } : { scene: 'world2', screen: 's1', x: 40, y: 258 };
    World2Scene.returnLock = true; Save.saveNow(); Game.go(World2Scene);
    setTimeout(() => Game.say('ליזי שמרה עלייך. החיים והרוגלך התמלאו.'), 600);
  },

  savePlace() { const m = this.w.mai; Save.state.place = { scene: 'world2', screen: this.cur, x: Math.round(m.x), y: Math.round(m.y) }; },

  update(dt) {
    if (this.fadeTo) {
      this.fade = Math.min(1, this.fade + dt / 0.18);
      if (this.fade >= 1) { const ex = this.fadeTo; this.fadeTo = null; this.go(ex.to, ex.spawn); }
      return;
    }
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt / 0.18);
    this.w.update(dt);
    const m = this.w.mai, now = performance.now();
    // יציאות
    for (const ex of W2_EXITS[this.cur]) {
      const [x0, y0, x1, y1] = ex.box;
      if (m.x >= x0 && m.x <= x1 && m.y >= y0 && m.y <= y1) {
        if (ex.to) { this.fadeTo = ex; this.w.stop(); Input.drag = null; }
        else if (now > this.lock) { Game.say(ex.msg); this.lock = now + 2500; m.y -= 8; this.w.stop(); }
      }
    }
    // ירקות מקפצים בטווח שלהם; נגיעה = קרב
    for (const v of this.veg) {
      if (!v.alive) continue;
      if (now > this.lock && Math.hypot(v.x - m.x, (v.foot - m.y) * 1.4) < 13) { this.battle(v); break; }
      v.t += dt * 1000; const [x0, , x1] = v.range; v.x += v.dir * dt * 12;
      if (v.x < x0 || v.x > x1) { v.dir *= -1; v.x = Math.max(x0, Math.min(x1, v.x)); }
    }
    // שקית שמאי עומדת עליה נפתחת לבד (גם אם היא מתחת לכפתורי המסך ואי אפשר ללחוץ עליה)
    if (!Game.overlays.length) for (const kind of this.bagsLeft()) {
      const b = this.Lay.bags[kind], [sx, sy] = b.at || [b.x, b.foot + 6];
      if (Math.hypot(m.x - sx, m.y - sy) < 7) { this.w.stop(); this.openBag(kind); break; }
    }
    // שומעים את הדר מתוך הערפל לפני שמוצאים אותה
    if (this.cur === 's3' && !this.hadarFound()) {
      const [x0, y0, x1, y1] = this.Lay.hadar.hear;
      if (m.x >= x0 && m.x <= x1 && m.y >= y0 && m.y <= y1 && now > this.heardAt) { this.heardAt = now + 5000; WalkUI.bubble(this.L, `״${FRIEND_LINES[1]}״`, 120, 64, 2200, 'far'); }
    }
    for (const c of this.fogs) { c.x += c.v * dt; if (c.x > 500) c.x = -170; }
    this.savePlace();
    WalkUI.hud(this.L); WalkUI.label(this.L, this.w); this.secretsHUD();
    if (phoneButtonPressed()) { Sound.select(); Phone.open(); }
  },

  // מונה סודות: "שקיות x/3 · חברה ?/✓"
  secretsHUD() {
    const st = Save.state, n = W2_BAG_KEYS.filter(k => st.bags[k]).length, f = this.hadarFound();
    const key = n + '|' + f; if (this._sec === key) return; this._sec = key;
    this.L.q('.secrets').innerHTML = `<span>שקיות <bdi dir="ltr">${n}/3</bdi></span><span class="sep"></span><span>חברה ${f ? icon('heart') : '<bdi>?</bdi>'}</span>`;
  },

  draw(t) {
    const T = t * 1000, L = this.Lay, sid = this.cur;
    drawImg(`world2/${sid}/ground`, 0, 0);
    // בועות שעולות ממי המלח ומתפוצצות
    for (const b of this.bub) {
      const p = ((T + b.t) % 2600) / 2600; if (p >= .55) continue;
      const yy = Math.round(b.y - p * 10); ctx.fillStyle = '#A9D2B4'; ctx.fillRect(b.x, yy, 1, 1); ctx.fillRect(b.x + 2, yy + 3, 1, 1);
      if (p > .45) { ctx.fillStyle = '#DCEBD6'; ctx.fillRect(b.x - 1, yy - 1, 3, 1); }
    }
    const dr = [];
    for (const o of L.objects) {
      const bob = o.id.startsWith('lily') ? Math.round(Math.sin(T / 600 + o.x)) : 0;
      dr.push({ foot: o.foot, draw: () => { if (o.block && !o.id.startsWith('dill') && o.id !== 'lizzylid') shadowAt(o.x + o.w / 2, o.foot - 1, o.w * .38); drawImg(`world2/${sid}/obj_${o.id}`, o.x, o.y + bob); } });
    }
    for (const kind of this.bagsLeft()) {
      const b = L.bags[kind];
      dr.push({ foot: b.foot + (kind === 'coin' ? -6 : 1), draw: () => {
        const bob = b.float ? Math.round(Math.sin(T / 420)) : 0;
        drawImg('world2/bag_' + kind, b.x - 7, b.foot - 17 + bob);
        if (kind !== 'coin') twinkle(b.x, b.foot - 21, T);
      } });
    }
    if (sid === 's3' && !this.hadarFound()) dr.push({ foot: L.hadar.foot, draw: () => drawImg('world2/hadar_top', L.hadar.x - 12, L.hadar.top + (Math.floor(T / 900) % 2)) });
    for (const v of this.veg) {
      if (!v.alive && v.poof <= 0) continue;
      dr.push({ foot: v.foot, draw: () => {
        if (!v.alive) { v.poof -= 16; ctx.globalAlpha = Math.max(0, v.poof / 600); }
        const im = Assets.get(`world2/veg_${v.kind}_map`); if (!im) return;
        const hop = v.kind === 'olive' ? Math.abs(Math.round(Math.sin(v.t / 120) * 3)) : Math.abs(Math.round(Math.sin(v.t / 200)));
        shadowAt(v.x, v.foot, 6);
        ctx.save(); if (v.dir < 0) { ctx.translate(Math.round(v.x) * 2, 0); ctx.scale(-1, 1); }
        ctx.drawImage(im, Math.round(v.x - im.width / 2), v.foot - im.height - hop); ctx.restore(); ctx.globalAlpha = 1;
      } });
    }
    dr.push({ foot: this.w.mai.y, draw: () => this.w.drawMai() });
    dr.sort((a, b) => a.foot - b.foot).forEach(d => d.draw());
    // ערפל סמיך מעל הסודות (נושם לאט), וכתמי ערפל שנעים על כל המפה
    for (const id in (L.fogbanks || {})) {
      const [fx, fy, , , al] = L.fogbanks[id], im = Assets.get(`world2/${sid}/${id}`); if (!im) continue;
      ctx.globalAlpha = al * (.85 + .15 * Math.sin(T / 1400)); ctx.drawImage(im, fx + Math.round(Math.sin(T / 2200) * 3), fy); ctx.globalAlpha = 1;
    }
    const fog = Assets.get('world2/fog');
    if (fog) for (const c of this.fogs) { ctx.globalAlpha = .26; ctx.drawImage(fog, Math.round(c.x), c.y, Math.round(150 * c.s), Math.round(60 * c.s)); ctx.globalAlpha = 1; }
    this.w.drawMarks();
    if (Game.overlays.length) WalkUI.label(this.L, this.w);   // מסתירים את התווית כשחלון פתוח
    if (this.fade > 0) { ctx.fillStyle = `rgba(11,15,26,${this.fade})`; ctx.fillRect(0, 0, W, H); }
  },
};
