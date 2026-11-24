// =====================================================================
// שלב 4: המטבח של אמא + המרפסת – לפי "מטבח v1" (game-design) ו-art-bible 5.2.
// הבסיס: נכנסים ← חיים ורוגלך מתמלאים + שמירה. קישוטים, תנור, ארון (זמני), מדף, מרפסת, קיר תמונות.
// התמונות ומיקומים: assets/kitchen/* + ART.kitchen (נוצרו ע"י tools/art/build_art.py).
// =====================================================================

const KITCHEN_DECOR = {
  yarn:    { he: 'חוט לליזי',  d: `עוד <bdi>${CFG.decor.yarn.hp}</bdi> חיים מקסימליים` },
  speaker: { he: 'רמקול',      d: 'נגן שירים במטבח, עם השירים של נועה' },
  lava:    { he: 'מנורת לבה',  d: `מד הנישנושים מתחיל כל קרב ב־<bdi>${CFG.decor.lava.snack}%</bdi>` },
  fridge:  { he: 'מקרר מלא',   d: CFG.decor.fridge.cigs === 1 ? 'עוד סיגריה אחת מכל קרב' : `עוד <bdi>${CFG.decor.fridge.cigs}</bdi> סיגריות מכל קרב` },
  photos:  { he: 'קיר תמונות', d: `עוד <bdi>${Math.round(CFG.decor.photos.xp * 100)}%</bdi> ניסיון, ותמונות אמיתיות על הקיר` },
  neon:    { he: 'שלט ניאון',  d: 'רק יופי: גביע לסוף, ו״נישנושיםםםם!״ בכל כניסה' },
};
const OVEN_UPGRADES = [
  { id: 'choc', he: 'רוגלך עם שוקולד כפול', d: `אכילה מרפאת <bdi>${CFG.oven.choc.eat}</bdi>, זריקה מכה <bdi>${CFG.oven.choc.throw}</bdi>`, price: CFG.oven.choc.price },
  { id: 'tray', he: 'מגש גדול', d: 'עוד רוגלך אחד לכל יציאה', price: CFG.oven.tray.price },
];
const IRIT_TIPS = ['הבצל לא סובל מלוח. תביאי משהו מלוח.', 'החמוץ שונא מלוח. קחי איתך משהו מלוח.', 'החציל נשרף ממתוק, תאמיני לי.', 'הדג הנא לא אוהב חריף.', 'האבוקדו… רק מתוק יעזור.'];
const FRIEND_KEYS = ['roni', 'hadar', 'shai', 'amber', 'noa'];
const FRIEND_LINES = ['אני לא נוגעת בסיגריות בכלל', 'שישי? אני עובדת', 'אפשר להיפגש אצלי ברחובות', 'תנשמי לזה', 'די מאמי די'];

const KITCHEN_IMAGES = () => {
  const L = ART.kitchen, list = ['kitchen/room', 'kitchen/seats', 'kitchen/mai_walk', 'kitchen/irit_map', 'kitchen/lizzy_sleep_map'];
  for (const n in L.decor) list.push('kitchen/' + n, 'kitchen/' + n + '_ghost');
  for (let i = 0; i < 5; i++) list.push('kitchen/snack_' + i, 'kitchen/snack_slot_' + i);
  for (const f of FRIEND_KEYS) list.push('kitchen/friend_' + f);
  return list;
};

const KitchenScene = {
  id: 'kitchen', countsTime: true,
  IRIT: { x: 244, foot: 134 }, LIZZY: { x: 42, foot: 222 },

  enter() {
    const st = Save.state, pl = st.place;
    this.w = new Walker({
      walkable: (x, y) => this.walkable(x, y), targets: () => this.targets(), use: t => this.use(t), speed: 65,
    });
    if (pl.scene === 'kitchen') this.w.place(pl.x, pl.y, 'down'); else this.w.place(124, 222, 'up');
    this.L = Layer(walkLayerHTML(), { screen: true }).mount();
    wirePhoneButton(this.L);
    // נכנסים ← החיים והרוגלך מתמלאים, ושמירה אוטומטית
    Stats.refill(st);
    st.place = { scene: 'kitchen', x: Math.round(this.w.mai.x), y: Math.round(this.w.mai.y) };
    Save.saveNow();
    setTimeout(() => this.greet(), 450);
  },
  exit() { this.L.unmount(); canvas.style.cursor = 'default'; },

  greet() {
    const st = Save.state;
    if (!st.flags.kitchenIntro) {
      st.flags.kitchenIntro = true; Save.saveNow();
      this.sayIrit('מילאתי לך 3 רוגלך, מאמי', 2200);
      setTimeout(() => { if (Game.scene === this) this.sayIrit('בטלפון יש מפה. משם יוצאים לגינה.', 2800); }, 2400);
    } else if (st.decor.includes('neon')) this.sayMai('נישנושיםםםם!', 1800);
    else this.sayIrit('מילאתי לך רוגלך, מאמי', 2000);
  },

  // --- דמויות
  friendIdx() { return FRIENDS.map((n, i) => Save.state.friends.includes(n) ? i : -1).filter(i => i >= 0); },
  friendPos(i) {
    const [x, y] = ART.kitchen.seats[i], img = Assets.get('kitchen/friend_' + FRIEND_KEYS[i]);
    const h = img ? img.height : 30;
    return i < 3 ? { x, top: y - 27, foot: y + 3, h } : { x, top: y - 22, foot: y + 3, h };
  },

  // --- הליכה: רצפת המטבח, המעבר בקיר והמרפסת, בלי רהיטים
  walkable(x, y) {
    const inKitchen = x >= 8 && x <= 346 && y >= 118 && y <= 266;
    const inDoor = x >= 340 && x <= 366 && y >= 158 && y <= 196;
    const inBalcony = x >= 362 && x <= 468 && y >= 136 && y <= 266;
    if (!(inKitchen || inDoor || inBalcony)) return false;
    const b = [[160, 148, 240, 198], [14, 198, 70, 234], [324, 116, 344, 138], [398, 140, 436, 170], [440, 194, 478, 238], [356, 224, 378, 250], [230, 120, 258, 138]];
    const f = Save.state.friends;
    if (f.includes(FRIENDS[3])) b.push([372, 168, 404, 192]);
    if (f.includes(FRIENDS[4])) b.push([428, 168, 460, 192]);
    for (const [x0, y0, x1, y1] of b) if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return false;
    return true;
  },

  // --- חפצים שאפשר לגעת בהם
  targets() {
    const st = Save.state, L = ART.kitchen, t = [];
    for (const n in KITCHEN_DECOR) {
      const has = st.decor.includes(n);
      t.push({ id: 'decor:' + n, box: L.decor[n].bbox, label: KITCHEN_DECOR[n].he, sub: has ? '' : `${icon('cig')}<bdi>${CFG.decor[n].price}</bdi>` });
    }
    if (st.decor.includes('photos')) L.photo_frames.forEach((b, i) => t.push({ id: 'photo:' + i, box: b, label: 'תמונה', sub: 'לחיצה פותחת' }));
    t.push({ id: 'irit', box: [this.IRIT.x - 12, this.IRIT.foot - 32, this.IRIT.x + 12, this.IRIT.foot], label: 'אמא', sub: 'טיפ ושדרוגי תנור' });
    t.push({ id: 'oven', box: L.stations.oven, label: 'התנור של אמא', sub: '' });
    t.push({ id: 'wardrobe', box: L.stations.wardrobe, label: 'הארון של מאי', sub: 'מהלכים ואביזרים' });
    t.push({ id: 'shelf', box: L.stations.shelf, label: 'מדף הנישנושים האגדיים', sub: `<bdi dir="ltr">${st.legendary.length}/5</bdi>` });
    t.push({ id: 'lizzy', box: [18, 202, 66, 230], label: 'ליזי', sub: '' });
    t.push({ id: 'table', box: L.stations.table, label: 'רוגלך של אמא', sub: '' });
    L.seats.forEach((p, i) => {
      if (st.friends.includes(FRIENDS[i])) { const f = this.friendPos(i); t.push({ id: 'friend:' + i, box: [f.x - 12, f.top, f.x + 12, f.foot], label: FRIENDS[i], sub: '' }); }
      else t.push({ id: 'seat:' + i, box: [p[0] - 13, p[1] - 12, p[0] + 13, p[1] + 4], label: 'מקום פנוי במרפסת', sub: 'עוד לא נמצאה' });
    });
    return t;
  },

  use(t) {
    const st = Save.state, L = ART.kitchen, [kind, arg] = t.id.split(':');
    if (kind === 'decor') {
      if (arg === 'photos' && st.decor.includes('photos')) this.openPhoto(0);
      else if (st.decor.includes(arg)) this.sayAt(KITCHEN_DECOR[arg].d.replace(/<[^>]+>/g, ''), L.decor[arg].bbox, 2200);
      else this.buyDecor(arg);
    }
    else if (kind === 'photo') this.openPhoto(+arg);
    else if (kind === 'irit' || kind === 'oven') this.ovenPanel();
    else if (kind === 'wardrobe') this.wardrobe();
    else if (kind === 'shelf') this.sayAt(st.legendary.length ? st.legendary.map(i => LEGENDARY_NAMES[i]).join(' · ') : 'כאן יעמדו 5 הנישנושים האגדיים', L.stations.shelf, 2400);
    else if (kind === 'friend') { const i = +arg, f = this.friendPos(i); WalkUI.bubble(this.L, `״${FRIEND_LINES[i]}״`, f.x, f.top - 4, 2200); }
    else if (kind === 'seat') { const p = L.seats[+arg]; this.sayAt('מישהי מחכה שתמצאי אותה', [p[0] - 10, p[1] - 14, p[0] + 10, p[1]]); }
    else if (kind === 'lizzy') this.sayAt(st.decor.includes('yarn') ? 'ליזי חולמת על החוט' : 'ליזי ישנה', [18, 202, 66, 214]);
    else if (kind === 'table') this.sayIrit('רוגלך טרי, קחי', 1600);
  },

  // --- בועות
  sayIrit(text, ms, shout) { WalkUI.bubble(this.L, text, this.IRIT.x, this.IRIT.foot - 38, ms, shout ? 'shout' : ''); },
  sayMai(text, ms) { WalkUI.bubble(this.L, text, this.w.mai.x, this.w.mai.y - 40, ms); },
  sayAt(text, box, ms = 2000) { WalkUI.bubble(this.L, text, (box[0] + box[2]) / 2, box[1] - 6, ms); },

  // --- קנייה: "לקנות ב-20?" ← נצנוץ ← אמא: "תפסיקי לעשן!!!"
  buyDecor(n) {
    const st = Save.state, D = KITCHEN_DECOR[n], price = CFG.decor[n].price, short = price - st.cigs;
    const scale = n === 'neon' ? 2 : n === 'fridge' ? 1.6 : n === 'photos' ? 2.2 : 3;
    const bb = ART.kitchen.decor[n].bbox, cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2 + (n === 'neon' ? 0 : 0);
    Dialog(`<div class="top"><div class="pv"><div class="pvimg" style="background-image:url(assets/kitchen/${n}.png);background-position:${-cx * scale + 72}px ${-cy * scale + 52}px;background-size:${480 * scale}px ${270 * scale}px"></div></div>
        <div><h2>${D.he}</h2><p>${D.d}</p><div class="price">${icon('cig')}<bdi>${price}</bdi>${short > 0 ? `<span class="short">חסרות עוד <bdi>${short}</bdi></span>` : ''}</div></div></div>`,
      [{ k: 'yes', title: 'לקנות', disabled: short > 0, onPress: () => {
          Game.pop(); st.cigs -= price; st.decor.push(n);
          if (n === 'yarn') st.hp += 4;
          Save.saveNow(); this.w.sparkle(ART.kitchen.decor[n].bbox);
          setTimeout(() => this.sayIrit('תפסיקי לעשן!!!', 1800, true), 250);
        } },
       { k: 'no', title: 'לא עכשיו' }],
      { focus: short > 0 ? 'no' : 'yes' });
  },

  // --- אמא / התנור: טיפ לעולם הבא + 2 שדרוגים
  ovenPanel() {
    const st = Save.state, tip = IRIT_TIPS[Math.min(st.legendary.length, IRIT_TIPS.length - 1)];
    Dialog(`<h2>אמא</h2><div class="tip">${tip}</div>`,
      OVEN_UPGRADES.map(o => ({
        k: 'ov_' + o.id, ic: 'rugelach', title: o.he, desc: o.d,
        side: st.oven.includes(o.id) ? '<span class="tag adv">נקנה</span>' : `<span class="price">${icon('cig')}<bdi>${o.price}</bdi></span>`,
        disabled: st.oven.includes(o.id) || st.cigs < o.price,
        onPress: () => {
          Game.pop(); st.cigs -= o.price; st.oven.push(o.id);
          if (o.id === 'tray') st.rugelach = Math.max(st.rugelach, Stats.maxRoga(st));
          Save.saveNow(); this.w.sparkle([226, 97, 262, 110]);
          setTimeout(() => this.sayIrit('תפסיקי לעשן!!!', 1800, true), 250);
        },
      })),
      { list: true, foot: act({ k: 'close', title: 'סגירה' }), onFoot: { close: () => Game.pop() } });
  },

  // --- הארון של מאי (זמני, עד שיעוצב): מה יש לה
  wardrobe() {
    const st = Save.state;
    const moves = st.movesUnlocked.map(m => `<span class="tag${st.moves.includes(m) ? ' adv' : ''}">${MOVE_NAMES[m] || m}</span>`).join('');
    const acc = st.accessoriesOwned.length ? st.accessoriesOwned.map(a => `<span class="tag">${ACCESSORY_NAMES[a] || a}</span>`).join('') : '<span class="dimtxt">עוד אין. הם מוחבאים בשקיות.</span>';
    Dialog(`<h2>הארון של מאי</h2>
      <p>מהלכים (<bdi dir="ltr">${st.moves.length}/4</bdi> בתיק):</p><div class="tags">${moves}</div>
      <p>אביזרים:</p><div class="tags">${acc}</div>
      <p class="dimtxt">בחירת 4 מהלכים ו-2 אביזרים תגיע כשהמסך הזה יעוצב.</p>`,
      [{ k: 'close', title: 'סגירה' }], { width: 700 });
  },

  // --- קיר התמונות: חלון עם התמונה המלאה
  openPhoto(i) {
    const n = PHOTO_COUNT;
    if (!n) { this.sayAt('התמונות יגיעו בקרוב', [72, 50, 117, 80], 2000); return; }
    i = (i + n) % n;
    const L = Layer(`<div class="panel lightbox center"><img src="assets/kitchen/photo_${i}.jpg" alt="">
        <div class="row">${act({ k: 'prev', title: 'הקודמת' })}<span class="count"><bdi dir="ltr">${i + 1}/${n}</bdi></span>${act({ k: 'close', title: 'סגירה' })}${act({ k: 'next', title: 'הבאה' })}</div></div>`,
      { focus: 'close' });
    Game.push(L);
    L.on('close', () => Game.pop()).on('prev', () => { Game.pop(); this.openPhoto(i - 1); }).on('next', () => { Game.pop(); this.openPhoto(i + 1); });
  },

  update(dt) {
    this.w.update(dt);
    const st = Save.state, m = this.w.mai;
    st.place = { scene: 'kitchen', x: Math.round(m.x), y: Math.round(m.y) };
    WalkUI.hud(this.L); WalkUI.label(this.L, this.w);
    if (phoneButtonPressed()) { Sound.select(); Phone.open(); }
  },

  draw(t) {
    const st = Save.state, L = ART.kitchen, T = t * 1000;
    drawImg('kitchen/room', 0, 0);
    for (const n in L.decor) {
      const has = st.decor.includes(n), real = n === 'photos' && has && Assets.get('kitchen/photos_real');
      drawImg('kitchen/' + n + (real ? '_real' : has ? '' : '_ghost'), 0, 0);
    }
    for (let i = 0; i < 5; i++) drawImg(st.legendary.includes(i) ? 'kitchen/snack_' + i : 'kitchen/snack_slot_' + i, 0, 0);
    drawImg('kitchen/seats', 0, 0);
    const dr = [];
    dr.push({ foot: this.LIZZY.foot, draw: () => {
      const im = Assets.get('kitchen/lizzy_sleep_map'); if (im) ctx.drawImage(im, this.LIZZY.x - (im.width >> 1), this.LIZZY.foot - im.height);
      const z = Math.floor(T / 700) % 3; ctx.fillStyle = '#7A4FB8'; for (let i = 0; i <= z; i++) drawZ(this.LIZZY.x + 10 + i * 4, this.LIZZY.foot - 14 - i * 5);
    } });
    dr.push({ foot: this.IRIT.foot, draw: () => {
      const im = Assets.get('kitchen/irit_map'); shadowAt(this.IRIT.x, this.IRIT.foot, 10);
      if (im) ctx.drawImage(im, this.IRIT.x - (im.width >> 1), this.IRIT.foot - im.height + (Math.floor(T / 650) % 2));
    } });
    for (const i of this.friendIdx()) {
      const f = this.friendPos(i);
      dr.push({ foot: f.foot, draw: () => { const im = Assets.get('kitchen/friend_' + FRIEND_KEYS[i]); if (im) ctx.drawImage(im, f.x - 12, f.top); } });
    }
    dr.push({ foot: this.w.mai.y, draw: () => this.w.drawMai() });
    dr.sort((a, b) => a.foot - b.foot).forEach(d => d.draw());
    this.w.drawMarks();
    if (Game.overlays.length) WalkUI.label(this.L, this.w);   // מסתירים את התווית כשחלון פתוח
  },
};
