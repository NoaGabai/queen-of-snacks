// =====================================================================
// שלב 5: עולם 1 – גינת הבצל הירוק. מפה של 2×2 מסכים (art-bible 5.3, "מפות v1").
//   s3 פינת הפטרוזיליה (רוני)   | s4 שער הבצלים (ליזי 2 + הבוס)
//   s1 הכניסה (ליזי 1, 2 שקיות) | s2 מטע השרי (הפאוץ' בכיס הסודי)
// ירקות שהובסו לא חוזרים. נגיעה בירק / בשער = מסך הקרב (battle.js).
// =====================================================================

const W1_NAMES = { s1: 'הכניסה', s2: 'מטע השרי', s3: 'פינת הפטרוזיליה', s4: 'שער הבצלים' };
const VEG_NAMES = { tomato: 'עגבניית שרי', carrot: 'גזר' };
const W1_EXITS = {
  s1: [{ box: [468, 90, 480, 160], to: 's2', spawn: [16, 128] }, { box: [266, 0, 326, 34], to: 's3', spawn: [300, 256] },
       { box: [30, 264, 92, 270], msg: 'מכאן נכנסים לגינה. חזרה למטבח: "נישנוש אקספרס" בטלפון.' }],
  s2: [{ box: [0, 96, 8, 162], to: 's1', spawn: [462, 128] }, { box: [346, 0, 402, 34], to: 's4', spawn: [380, 256] }],
  s3: [{ box: [268, 264, 332, 270], to: 's1', spawn: [300, 40] }],
  s4: [{ box: [350, 264, 412, 270], to: 's2', spawn: [372, 40] }],
};
const W1_BAGS = {   // מה יש בכל שקית
  move:  { key: 'w1-move', title: 'שקית הפתעה!', body: 'מהלך חדש: <b>משקפיים על העיניים</b>. המהלך הבא חזק פי <bdi>1.5</bdi>.', line: 'רק שאני לא אאבד אותם' },
  pouch: { key: 'w1-pouch', title: 'שקית הפתעה!', body: 'אביזר חדש: <b>פאוץ׳</b>. מתחילים כל קרב עם עוד קראנץ׳ אחד, ורואים אותו על מאי.', line: 'סוף סוף פאוץ׳' },
  coin:  { key: 'w1-coin' },
};
const W1_LIZZY_SCREENS = ['s1', 's4'];

const WORLD1_IMAGES = () => {
  const list = ['kitchen/mai_walk', 'kitchen/friend_roni', 'world1/bag_move', 'world1/bag_coin', 'world1/bag_pouch',
    'world1/veg_tomato_map', 'world1/veg_carrot_map', 'world1/cloud_shadow'];
  for (const s in ART.world1) { list.push(`world1/${s}/ground`); for (const o of ART.world1[s].objects) list.push(`world1/${s}/obj_${o.id}`); }
  return list;
};

const World1Scene = {
  id: 'world1', countsTime: true,

  enter() {
    const st = Save.state, pl = st.place;
    this.w = new Walker({
      walkable: (x, y) => this.walkable(x, y), targets: () => this.targets(), use: t => this.use(t), speed: 70,
      click: t => this.click(t),
    });
    this.L = Layer(walkLayerHTML('<div class="panel secrets"></div><div class="panel where"></div>'), { screen: true }).mount();
    this._sec = null;                                   // שכבה חדשה: מציירים את מונה הסודות מחדש
    wirePhoneButton(this.L);
    this.clouds = [{ x: -120, y: 40, s: 1, v: 6 }, { x: 180, y: 150, s: 1.3, v: 5 }, { x: 420, y: 10, s: .9, v: 7 }];
    this.fade = 0; this.fadeTo = null; this.lock = World1Scene.returnLock ? performance.now() + 2500 : 0; this.heardAt = 0;
    World1Scene.returnLock = false; this.inBattle = false;
    // איפה מתחילים: המקום השמור, או ליזי האחרונה, או הכניסה
    if (pl.scene === 'world1' && ART.world1[pl.screen]) this.go(pl.screen, [pl.x, pl.y]);
    else if (st.lastLizzy && st.lastLizzy.world === 1) { const s = st.lastLizzy.screen, lz = ART.world1[s].lizzy; this.go(s, [lz.x, lz.foot + 16]); }
    else { this.go('s1', [60, 250]); this.w.mai.dir = 'up'; setTimeout(() => WalkUI.bubble(this.L, 'גינת הבצל הירוק', 30, 214, 2000), 500); }
    st.world = 1;
  },
  exit() { this.L.unmount(); canvas.style.cursor = 'default'; },

  // מעבר למסך אחר במפה
  go(sid, spawn) {
    this.cur = sid; this.Lay = ART.world1[sid];
    this.veg = (this.Lay.veggies || []).map((v, i) => ({ ...v, key: `w1:${sid}:${i}`, t: Math.random() * 1000, dir: 1, alive: !Save.state.defeated[`w1:${sid}:${i}`], poof: 0 }));
    this.w.place(spawn[0], spawn[1]);
    this.L.q('.where').innerHTML = `גינת הבצל הירוק · <span class="sub">${W1_NAMES[sid]}</span>`;
    this.L.el.querySelectorAll('.say.walk').forEach(e => e.remove());
  },

  walkable(x, y) {
    if (x < 6 || x > 474 || y < 30 || y > 268) return false;
    for (const o of this.Lay.objects) if (o.block) { const [x0, y0, x1, y1] = o.block; if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return false; }
    if (this.cur === 's1') { const [x0, y0, x1, y1] = [20, 38, 166, 106], cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; if (((x - cx) / ((x1 - x0) / 2)) ** 2 + ((y - cy) / ((y1 - y0) / 2)) ** 2 < 1) return false; }
    return true;
  },

  bagsLeft() { return Object.keys(this.Lay.bags || {}).filter(k => !Save.state.bags[W1_BAGS[k].key]); },
  roniFound() { return Save.state.friends.includes(FRIENDS[0]); },

  targets() {
    const st = Save.state, L = this.Lay, t = [];
    if (L.lizzy) t.push({ id: 'lizzy', box: [L.lizzy.x - 20, L.lizzy.foot - 18, L.lizzy.x + 20, L.lizzy.foot], label: 'ליזי', sub: 'שמירה ומילוי' });
    if (this.cur === 's1') {
      t.push({ id: 'sign', box: [16, 216, 44, 250], label: 'גינת הבצל הירוק', sub: 'עולם 1' });
      t.push({ id: 'pond', box: [24, 40, 160, 100], label: 'אגם רוטב', sub: 'שמן זית ולימון', passive: true, onBlocked: () => this.sayMai('אגם רוטב. לא נכנסים.', 1400) });
      t.push({ id: 'paws', box: L.paw_prints, label: 'עקבות של חתול', sub: 'לאן הן מובילות?', passive: true });
    }
    for (const kind of this.bagsLeft()) { const b = L.bags[kind]; t.push({ id: 'bag:' + kind, box: [b.x - 8, b.foot - (kind === 'move' ? 28 : 18), b.x + 8, b.foot], label: 'שקית הפתעה', sub: kind === 'move' ? 'מנצנצת' : 'חצי מוסתרת' }); }
    if (this.cur === 's2') t.push({ id: 'crack', box: [340, 150, 374, 206], label: 'סדק בקיר הבצלים', sub: 'עקבות חתול', passive: true });
    if (this.cur === 's3') {
      if (!this.roniFound()) t.push({ id: 'roni', box: [L.roni.x - 12, L.roni.foot - 31, L.roni.x + 12, L.roni.foot], label: 'רוני', sub: '' });
      t.push({ id: 'gap', box: L.gap, label: 'פרחים קטנים', sub: 'מעבר בגדר?', passive: true });
    }
    if (this.cur === 's4') t.push({ id: 'gate', box: L.gate, label: 'שער הבצלים', sub: 'הבצל הירוק הגדול' });
    this.veg.forEach((v, i) => { if (v.alive) t.push({ id: 'veg:' + i, box: [v.x - 8, v.foot - (v.kind === 'carrot' ? 24 : 16), v.x + 8, v.foot], label: VEG_NAMES[v.kind], sub: 'קרב' }); });
    return t;
  },

  // לחיצה על ירק = הולכים אליו (הקרב נפתח כשנוגעים); על רמז = הולכים לשם
  click(t) {
    const m = this.w.mai;
    if (t.id.startsWith('veg:')) { const v = this.veg[+t.id.split(':')[1]]; this.w.walkTo(v.x, v.foot + 2); return true; }
    if (['gap', 'crack', 'paws'].includes(t.id)) { const [x0, y0, x1, y1] = t.box; this.w.walkTo((x0 + x1) / 2, (y0 + y1) / 2); return true; }
    return false;
  },

  use(t) {
    const st = Save.state, L = this.Lay, [kind, arg] = t.id.split(':');
    if (kind === 'lizzy') this.lizzy();
    else if (kind === 'sign') WalkUI.bubble(this.L, 'גינת הבצל הירוק', 30, 214, 1800);
    else if (kind === 'bag') this.openBag(arg);
    else if (kind === 'roni') this.findRoni();
    else if (kind === 'gate') this.gate();
    else if (kind === 'veg') this.battle(this.veg[+arg]);
  },

  sayMai(text, ms) { WalkUI.bubble(this.L, text, this.w.mai.x, this.w.mai.y - 40, ms); },

  // ליזי = שמירה + מילוי חיים ורוגלך, וזוכרים לאן לחזור
  lizzy() {
    const st = Save.state, lz = this.Lay.lizzy;
    Stats.refill(st); st.lastLizzy = { world: 1, screen: this.cur };
    this.savePlace(); Save.saveNow();
    this.w.sparkle([lz.x - 12, lz.foot - 22, lz.x + 12, lz.foot - 6], ['#F29CC0', '#FFFFFF']);
    const first = !st.flags.lizzyTip; st.flags.lizzyTip = true;
    WalkUI.bubble(this.L, first ? 'פה שומרים ומתמלאים' : 'ליזי שמרה את המשחק', lz.x, lz.foot - 30, 2000);
    Game.say(`נשמר במשבצת <bdi>${Save.slot + 1}</bdi> · החיים והרוגלך התמלאו`);
  },

  openBag(kind) {
    const st = Save.state, B = W1_BAGS[kind], b = this.Lay.bags[kind];
    st.bags[B.key] = true;
    if (kind === 'coin') {
      gainCigs(CFG.bags.coinCigs, t => this.sayMai(t, 1800)); this.w.sparkle([b.x - 10, b.foot - 20, b.x + 10, b.foot]);
      Game.say(`שקית הפתעה: <bdi>${CFG.bags.coinCigs}</bdi> ${icon('cig')}`); this.savePlace(); Save.saveNow(); return;
    }
    if (kind === 'move' && !st.movesUnlocked.includes('glasses')) { st.movesUnlocked.push('glasses'); if (st.moves.length < 4) st.moves.push('glasses'); }
    if (kind === 'pouch' && !st.accessoriesOwned.includes('pouch')) { st.accessoriesOwned.push('pouch'); if (st.accessories.length < 2) st.accessories.push('pouch'); }
    this.savePlace(); Save.saveNow();
    this.w.sparkle([b.x - 10, b.foot - 28, b.x + 10, b.foot], ['#FFE066', '#FFFFFF', '#C6A0E0']);
    const first = !st.flags.firstBag; st.flags.firstBag = true;
    Dialog(`<div class="top"><div class="pv dark"><div class="pvimg" style="background-image:url(assets/world1/bag_${kind}.png);background-size:56px 68px;width:56px;height:68px"></div></div>
        <div><h2>${B.title}</h2><p>${B.body}</p>${first ? '<p class="dimtxt">בכל עולם מוחבאות 3 שקיות. המונה למעלה מראה כמה מצאת.</p>' : ''}</div></div>`,
      [{ k: 'ok', title: 'יש!', onPress: () => { Game.pop(); this.sayMai(B.line, 1800); } }]);
  },

  findRoni() {
    const st = Save.state, R = this.Lay.roni;
    st.friends.push(FRIENDS[0]); this.savePlace(); Save.saveNow();
    this.w.sparkle([R.x - 12, R.foot - 30, R.x + 12, R.foot], ['#F29CC0', '#FFE066', '#FFFFFF']);
    Dialog(`<div class="top"><div class="pv cream"><div class="pvimg" style="background-image:url(assets/kitchen/friend_roni.png);background-size:72px 93px;width:72px;height:93px"></div></div>
        <div><h2>מצאת את רוני!</h2><p>״אני לא נוגעת בסיגריות בכלל״</p><div class="price">רוני עוברת למרפסת של המטבח, ומחכה לך שם.</div></div></div>`,
      [{ k: 'ok', title: 'נתראה במרפסת' }]);
  },

  // שער הבצלים: קרב הבוס (פעם אחת)
  gate() {
    const st = Save.state;
    if (st.flags.w1Boss) {
      Dialog(`<h2>שער הבצלים</h2><p>השער פתוח והכיכר ריקה. הבצל הירוק הגדול כבר בכה את כל הדמעות שלו.</p>`, [{ k: 'ok', title: 'מה יש בזה?' }]);
      return;
    }
    Dialog(`<h2>שער הבצלים</h2><p>הבצל הירוק הגדול מחכה בכיכר שמאחורי השער. מבוס אי אפשר לברוח, אז כדאי לעבור קודם אצל ליזי.</p>`,
      [{ k: 'ok', title: 'מה יש בזה?', onPress: () => { Game.pop(); this.boss(); } }, { k: 'no', title: 'עוד לא' }], { focus: 'no' });
  },
  boss() {
    const st = Save.state; this.w.stop(); this.savePlace(); Save.saveNow();
    BattleScene.start('onion', {
      onWin: () => {
        if (!st.legendary.includes(0)) st.legendary.push(0);
        st.flags.w1Boss = true; st.unlockedWorlds = Math.max(st.unlockedWorlds, 2);
        st.place = { scene: 'travel' }; Save.saveNow();
        Game.go(KitchenScene);                                   // אחרי הבוס: חזרה אוטומטית למטבח, והנישנוש עולה למדף
        setTimeout(() => Game.say('הפופקורן עלה למדף · עולם 2 נפתח במפת הנישנושים', 3.2), 700);
      },
      onLose: () => this.lose(),
    });
  },

  // קרב (שלב 6): עוברים למסך הקרב, ובסוף חוזרים לכאן
  battle(v) {
    if (this.inBattle) return;
    this.inBattle = true; this.w.stop();
    const st = Save.state, m = this.w.mai;
    this.savePlace(); Save.saveNow();
    const a = Math.atan2(m.y - v.foot, m.x - v.x);
    let fx = m.x, fy = m.y; for (let i = 0; i < 14; i++) { if (this.walkable(fx + Math.cos(a), fy + Math.sin(a))) { fx += Math.cos(a); fy += Math.sin(a); } }
    const back = (place, lock) => { this.inBattle = false; st.place = place; World1Scene.returnLock = lock; Save.saveNow(); Game.go(World1Scene); };
    BattleScene.start(v.kind, {
      onWin: () => { st.defeated[v.key] = true; back({ scene: 'world1', screen: this.cur, x: Math.round(m.x), y: Math.round(m.y) }, false); },
      onFlee: () => back({ scene: 'world1', screen: this.cur, x: Math.round(fx), y: Math.round(fy) }, true),
      onLose: () => this.lose(),
    });
  },

  // הפסד: חוזרים לליזי האחרונה עם חיים מלאים וכל הניסיון (או לכניסה, אם עוד לא היינו אצל ליזי)
  lose() {
    const st = Save.state; this.inBattle = false; Stats.refill(st);
    const lz = st.lastLizzy && st.lastLizzy.world === 1 ? st.lastLizzy.screen : null;
    st.place = lz ? { scene: 'world1', screen: lz, x: ART.world1[lz].lizzy.x, y: ART.world1[lz].lizzy.foot + 16 } : { scene: 'world1', screen: 's1', x: 60, y: 250 };
    World1Scene.returnLock = true; Save.saveNow(); Game.go(World1Scene);
    setTimeout(() => Game.say('ליזי שמרה עלייך. החיים והרוגלך התמלאו.'), 600);
  },

  savePlace() { const m = this.w.mai; Save.state.place = { scene: 'world1', screen: this.cur, x: Math.round(m.x), y: Math.round(m.y) }; },

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
    for (const ex of W1_EXITS[this.cur]) {
      const [x0, y0, x1, y1] = ex.box;
      if (m.x >= x0 && m.x <= x1 && m.y >= y0 && m.y <= y1) {
        if (ex.to) { this.fadeTo = ex; this.w.stop(); }
        else if (now > this.lock) { Game.say(ex.msg); this.lock = now + 2500; m.y -= 8; this.w.stop(); }
      }
    }
    // ירקות מסתובבים; נגיעה = קרב
    for (const v of this.veg) {
      if (!v.alive) continue;
      if (now > this.lock && Math.hypot(v.x - m.x, (v.foot - m.y) * 1.4) < 13) { this.battle(v); break; }
      v.t += dt * 1000; const [x0, , x1] = v.range; v.x += v.dir * dt * 12;
      if (v.x < x0 || v.x > x1) { v.dir *= -1; v.x = Math.max(x0, Math.min(x1, v.x)); }
    }
    // שומעים את רוני מעבר לגדר לפני שמוצאים אותה
    if (this.cur === 's3' && !this.roniFound()) {
      const [x0, y0, x1, y1] = this.Lay.roni.hear;
      if (m.x >= x0 && m.x <= x1 && m.y >= y0 && m.y <= y1 && now > this.heardAt) { this.heardAt = now + 5000; WalkUI.bubble(this.L, '״אני לא נוגעת בסיגריות בכלל״', 110, 100, 2200, 'far'); }
    }
    for (const c of this.clouds) { c.x += c.v * dt; if (c.x > 520) c.x = -160; }
    this.savePlace();
    WalkUI.hud(this.L); WalkUI.label(this.L, this.w); this.secretsHUD();
    if (phoneButtonPressed()) { Sound.select(); Phone.open(); }
  },

  // מונה סודות: "שקיות x/3 · חברה ?/✓"
  secretsHUD() {
    const st = Save.state, n = ['w1-move', 'w1-coin', 'w1-pouch'].filter(k => st.bags[k]).length, f = this.roniFound();
    const key = n + '|' + f; if (this._sec === key) return; this._sec = key;
    this.L.q('.secrets').innerHTML = `<span>שקיות <bdi dir="ltr">${n}/3</bdi></span><span class="sep"></span><span>חברה ${f ? icon('heart') : '<bdi>?</bdi>'}</span>`;
  },

  draw(t) {
    const T = t * 1000, L = this.Lay, sid = this.cur;
    drawImg(`world1/${sid}/ground`, 0, 0);
    const dr = [];
    for (const o of L.objects) dr.push({ foot: o.foot, draw: () => { if (o.block) shadowAt(o.x + o.w / 2, o.foot - 1, o.w * .38); drawImg(`world1/${sid}/obj_${o.id}`, o.x, o.y); } });
    for (const kind of this.bagsLeft()) {
      const b = L.bags[kind];
      dr.push({ foot: b.foot + (kind === 'coin' ? -6 : 1), draw: () => {
        const lift = kind === 'move' ? 10 : 0, bob = kind === 'move' ? Math.round(Math.sin(T / 300)) : 0;
        drawImg('world1/bag_' + kind, b.x - 7, b.foot - 17 - lift + bob);
        if (kind !== 'coin') twinkle(b.x, b.foot - 17 - lift - 4, T);
      } });
    }
    if (sid === 's3' && !this.roniFound()) dr.push({ foot: L.roni.foot, draw: () => { const im = Assets.get('kitchen/friend_roni'); if (im) ctx.drawImage(im, L.roni.x - 12, L.roni.foot - im.height + (Math.floor(T / 700) % 2)); } });
    for (const v of this.veg) {
      if (!v.alive && v.poof <= 0) continue;
      dr.push({ foot: v.foot, draw: () => {
        if (!v.alive) { v.poof -= 16; ctx.globalAlpha = Math.max(0, v.poof / 600); }
        const im = Assets.get(`world1/veg_${v.kind}_map`); if (!im) return;
        const hop = Math.abs(Math.round(Math.sin(v.t / 160) * 2)); shadowAt(v.x, v.foot, 6);
        ctx.save(); if (v.dir < 0) { ctx.translate(Math.round(v.x) * 2, 0); ctx.scale(-1, 1); }
        ctx.drawImage(im, Math.round(v.x - im.width / 2), v.foot - im.height - hop); ctx.restore(); ctx.globalAlpha = 1;
      } });
    }
    dr.push({ foot: this.w.mai.y, draw: () => this.w.drawMai() });
    dr.sort((a, b) => a.foot - b.foot).forEach(d => d.draw());
    // צללי עננים בצורת עלה חסה (10%)
    const cl = Assets.get('world1/cloud_shadow');
    if (cl) for (const c of this.clouds) { ctx.globalAlpha = .10; ctx.drawImage(cl, Math.round(c.x), c.y, 120 * c.s, 70 * c.s); ctx.globalAlpha = 1; }
    this.w.drawMarks();
    if (Game.overlays.length) WalkUI.label(this.L, this.w);   // מסתירים את התווית כשחלון פתוח
    if (this.fade > 0) { ctx.fillStyle = `rgba(11,15,26,${this.fade})`; ctx.fillRect(0, 0, W, H); }
  },
};

function twinkle(x, y, T) { const p = (T / 120) % 8 | 0; ctx.fillStyle = '#FFF6C8'; if (p < 4) { ctx.fillRect(x - 1 + p % 2 * 6, y + p, 1, 3); ctx.fillRect(x - 2 + p % 2 * 6, y + 1 + p, 3, 1); } }
